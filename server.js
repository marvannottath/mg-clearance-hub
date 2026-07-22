import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Setup PostgreSQL Pool if DATABASE_URL or PGHOST is set
let pgPool = null;
const dbUrl = process.env.DATABASE_URL || (process.env.PGHOST ? `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || ''}@${process.env.PGHOST}:5432/${process.env.PGDATABASE || 'mg_clearance'}` : null);

if (dbUrl) {
  try {
    pgPool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.DATABASE_URL && !dbUrl.includes('localhost') ? { rejectUnauthorized: false } : false
    });

    // Initialize PostgreSQL Tables
    pgPool.query(`
      CREATE TABLE IF NOT EXISTS system_store (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `).then(() => {
      console.log("🐘 PostgreSQL Database Connected & Initialized!");
    }).catch(err => {
      console.error("PostgreSQL Init Notice:", err.message);
    });
  } catch (err) {
    console.error("PostgreSQL Connection Warning:", err.message);
  }
}

// Helper to sanitize database products (only fix exact corruptions where product code digits were saved as MRP)
function sanitizeDatabase(data) {
  if (!data || !data.products) return { db: data, modified: false };
  let modified = false;

  const cleanedProducts = data.products.map(p => {
    const specialP = p.specialPrice || 0;
    let mrpP = p.mrp || 0;
    const idDigits = (p.id || '').replace(/\D/g, '');

    // Only fix if product code digits (e.g. 41560 from SA41560) were mistakenly saved as MRP
    if (idDigits.length >= 4 && String(mrpP) === idDigits && specialP > 0 && mrpP > specialP * 4) {
      mrpP = Math.round(specialP * 1.5);
      modified = true;
      return { ...p, mrp: mrpP };
    }
    return p;
  });

  if (modified) {
    data.products = cleanedProducts;
  }
  return { db: data, modified };
}

// Helper to read database
async function readDb() {
  if (pgPool) {
    try {
      const res = await pgPool.query("SELECT data FROM system_store WHERE id = 'mg_clearance_master'");
      if (res.rows.length > 0) {
        const { db: cleanDb, modified } = sanitizeDatabase(res.rows[0].data);
        if (modified) {
          saveDb(cleanDb).catch(() => {});
        }
        return cleanDb;
      }
    } catch (err) {
      console.error("PostgreSQL Read Error, falling back to disk:", err.message);
    }
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      let parsed = JSON.parse(raw);
      const { db: cleanDb, modified } = sanitizeDatabase(parsed);
      if (modified) {
        fs.writeFileSync(DB_FILE, JSON.stringify(cleanDb, null, 2), 'utf8');
      }
      return cleanDb;
    }
  } catch (err) {
    console.error("Error reading database file:", err);
  }
  return null;
}

// Helper to save database
async function saveDb(data) {
  let pgSuccess = false;
  if (pgPool) {
    try {
      await pgPool.query(`
        INSERT INTO system_store (id, data, updated_at) 
        VALUES ('mg_clearance_master', $1, NOW())
        ON CONFLICT (id) 
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
      `, [JSON.stringify(data)]);
      pgSuccess = true;
    } catch (err) {
      console.error("PostgreSQL Save Error:", err.message);
    }
  }

  // Backup to disk
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Error saving database file:", err);
    return pgSuccess;
  }
}

// GET /api/db - Fetch live database
app.get('/api/db', async (req, res) => {
  const db = await readDb();
  res.json({ success: true, data: db, engine: pgPool ? 'PostgreSQL' : 'DiskJSON' });
});

// POST /api/db - Update live database
app.post('/api/db', async (req, res) => {
  const data = req.body;
  if (!data) {
    return res.status(400).json({ success: false, error: "No data provided" });
  }
  const ok = await saveDb(data);
  res.json({ success: ok, engine: pgPool ? 'PostgreSQL' : 'DiskJSON' });
});

// POST /api/reset-products - Clear all sample products
app.post('/api/reset-products', async (req, res) => {
  const db = await readDb();
  if (db) {
    db.products = [];
    await saveDb(db);
  }
  res.json({ success: true, message: "All products cleared successfully" });
});

// POST /api/reset-db - Factory reset system database to campaign defaults
app.post('/api/reset-db', async (req, res) => {
  if (pgPool) {
    try {
      await pgPool.query("DELETE FROM system_store WHERE id = 'mg_clearance_master'");
    } catch (err) {
      console.error("PostgreSQL Master Reset Error:", err.message);
    }
  }
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
  } catch (err) {
    console.error("Disk DB Delete Error:", err.message);
  }
  res.json({ success: true, message: "Server-side database reset to factory defaults successfully" });
});

// Serve static frontend build in production mode
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MG Clearance Hub Server running on http://0.0.0.0:${PORT}`);
});
