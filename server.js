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

// Helper to sanitize database products (only fix exact corruptions where product code digits were saved as MRP or clearance price was mistakenly read as 5% incentive)
function sanitizeDatabase(data) {
  if (!data || !data.products) return { db: data, modified: false };
  let modified = false;

  const cleanedProducts = data.products.map(p => {
    let specP = p.specialPrice || 0;
    let mrpP = p.mrp || 0;
    const landingP = p.landingCost || 0;
    const idDigits = (p.id || '').replace(/\D/g, '');

    // 1. Auto-correct corrupt clearance prices mistakenly saved as 5% incentive rate (e.g. 53, 389 when landing is 715, 5278)
    if (landingP > 0 && specP > 0 && specP < (landingP * 0.4)) {
      specP = landingP;
      mrpP = Math.max(mrpP, specP);
      modified = true;
      return { ...p, specialPrice: specP, mrp: mrpP };
    }

    // 2. Only fix if product code digits (e.g. 41560 from SA41560) were mistakenly saved as MRP
    if (idDigits.length >= 4 && String(mrpP) === idDigits && specP > 0 && mrpP > specP * 4) {
      mrpP = Math.round(specP * 1.5);
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

const DEFAULT_PRODUCTS = [
  {
    id: "SA42322",
    name: "TOTO Washlet SW Bidet Seat",
    brand: "TOTO",
    category: "Intelligent Toilets",
    description: "Premium bidet toilet seat featuring Actilight UV sanitation, ewater+ misting, heated seat, and auto flush.",
    stock: 8,
    mrp: 350000,
    mgPrice: 280000,
    specialPrice: 175000,
    landingCost: 140000,
    division: "Bathing",
    inStockSince: "2025-01-15",
    imageCode: "veil"
  },
  {
    id: "SA42141",
    name: "TOTO Wall Hung Toilet CW522",
    brand: "TOTO",
    category: "Toilets",
    description: "Minimalist wall-hung toilet suite with CEFIONTECT glaze and Tornado flushing system.",
    stock: 14,
    mrp: 95000,
    mgPrice: 76000,
    specialPrice: 47500,
    landingCost: 38000,
    division: "Bathing",
    inStockSince: "2025-03-20",
    imageCode: "neorest"
  },
  {
    id: "FT55648",
    name: "Almar Temptation Velvet 500 Shower",
    brand: "ALMAR",
    category: "Showers",
    description: "Ceiling shower head with velvet spray, chromotherapy LED lighting, and Italian polished nickel finish.",
    stock: 5,
    mrp: 290000,
    mgPrice: 232000,
    specialPrice: 145000,
    landingCost: 116000,
    division: "Bathing",
    inStockSince: "2025-02-10",
    imageCode: "euphoria"
  },
  {
    id: "FT55649",
    name: "Almar Spa Rain Head Ceiling Flush",
    brand: "ALMAR",
    category: "Showers",
    description: "Italian designed flush mount rain shower with water-saving aerator and anti-scale silicone nozzles.",
    stock: 7,
    mrp: 185000,
    mgPrice: 148000,
    specialPrice: 92500,
    landingCost: 74000,
    division: "Bathing",
    inStockSince: "2025-05-18",
    imageCode: "duschpanel"
  },
  {
    id: "KAJ-1200-2400",
    name: "Kajaria Royal Onyx Polished Slab",
    brand: "KAJARIA",
    category: "Tiles Slabs",
    description: "Premium large format vitrified slab with high-definition onyx marble printing, mirror gloss finish.",
    stock: 60,
    mrp: 14000,
    mgPrice: 9800,
    specialPrice: 8400,
    landingCost: 6720,
    division: "Tiles",
    size: "1200x2400 mm",
    finishing: "High Gloss",
    location: "Slab Gallery Box 3",
    inStockSince: "2025-06-02",
    imageCode: "tileslab"
  },
  {
    id: "MONO-MUR-GRI",
    name: "Monolith Mura Grigio Terrazzo Slab",
    brand: "MONOLITH",
    category: "Slabs",
    description: "Engineered terrazzo porcelain slab for feature walls, matte finish, grey stone aggregate pattern.",
    stock: 22,
    mrp: 16500,
    mgPrice: 11550,
    specialPrice: 9900,
    landingCost: 7920,
    division: "Tiles",
    size: "800x2400 mm",
    finishing: "Satin Matte",
    location: "Rack B-8",
    inStockSince: "2025-04-10",
    imageCode: "terrazzoslab"
  },
  {
    id: "COLOR-OCEAN",
    name: "Colortile Ocean Blue Polish Tiles",
    brand: "COLORTILE",
    category: "Floor Tiles",
    description: "Vibrant ocean blue glazed vitrified tile with deep wave vein details, scratch-resistant nanotechnology coating.",
    stock: 120,
    mrp: 280,
    mgPrice: 196,
    specialPrice: 168,
    landingCost: 134,
    division: "Tiles",
    size: "600x600 mm",
    finishing: "Super Gloss",
    location: "Pallet T-12",
    inStockSince: "2025-10-05",
    imageCode: "oceanblue"
  },
  {
    id: "LANGRACE-GLAM",
    name: "Langrace Glamour Gold Basin Mixer",
    brand: "LANGRACE",
    category: "Faucets & Mixers",
    description: "Luxury deck-mounted brass basin mixer with physical vapor deposition (PVD) gold finish, water-saving aerator.",
    stock: 18,
    mrp: 45000,
    mgPrice: 36000,
    specialPrice: 22500,
    landingCost: 18000,
    division: "Bathing",
    inStockSince: "2026-01-20",
    imageCode: "royaloak"
  }
];

const DEFAULT_EXECUTIVES = [
  { id: "exec-001", name: "Rajesh Kumar", email: "rajesh.k@marblegallery.com", target: 8000000, cleared: 0, salesCount: 0, username: "rajesh", password: "rajesh123", walletBalance: 0, walletLedger: [] },
  { id: "exec-002", name: "Anjali Menon", email: "anjali.m@marblegallery.com", target: 8000000, cleared: 0, salesCount: 0, username: "anjali", password: "anjali123", walletBalance: 0, walletLedger: [] },
  { id: "exec-003", name: "Vikram Sethi", email: "vikram.s@marblegallery.com", target: 8000000, cleared: 0, salesCount: 0, username: "vikram", password: "vikram123", walletBalance: 0, walletLedger: [] },
  { id: "exec-004", name: "Sandeep Pillai", email: "sandeep.p@marblegallery.com", target: 6000000, cleared: 0, salesCount: 0, username: "sandeep", password: "sandeep123", walletBalance: 0, walletLedger: [] }
];

const DEFAULT_BRANDS = [
  { name: "TOTO", maxMargin: 55, customerDiscount: 50, executiveIncentive: 5 },
  { name: "ALMAR", maxMargin: 55, customerDiscount: 50, executiveIncentive: 5 },
  { name: "REGINOX", maxMargin: 50, customerDiscount: 45, executiveIncentive: 4 },
  { name: "FRANKE", maxMargin: 50, customerDiscount: 45, executiveIncentive: 4 },
  { name: "KAJARIA", maxMargin: 45, customerDiscount: 40, executiveIncentive: 3 },
  { name: "MONOLITH", maxMargin: 45, customerDiscount: 40, executiveIncentive: 3 },
  { name: "COLORTILE", maxMargin: 45, customerDiscount: 40, executiveIncentive: 3 },
  { name: "LANGRACE", maxMargin: 45, customerDiscount: 40, executiveIncentive: 3 }
];

const DEFAULT_NOTIFICATIONS = [
  {
    id: "notif-001",
    targetRole: "executive",
    targetUserId: "exec-001",
    title: "Incentive Credited",
    message: "Invoice #MG-INV-8831 verified by Checker. ₹1,250 credited to your wallet.",
    timestamp: new Date().toISOString(),
    read: false,
    type: "success"
  }
];

const SEED_DB = {
  products: DEFAULT_PRODUCTS,
  executives: DEFAULT_EXECUTIVES,
  salesLedger: [],
  quotations: [],
  brands: DEFAULT_BRANDS,
  notifications: DEFAULT_NOTIFICATIONS,
  initialTargetValue: 4627680
};

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
    } else {
      // Seed Database file if missing
      await saveDb(SEED_DB);
      return SEED_DB;
    }
  } catch (err) {
    console.error("Error reading database file:", err);
  }
  return SEED_DB;
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

// POST /api/reset-products - Clear all products and reset campaign stats
app.post('/api/reset-products', async (req, res) => {
  const db = await readDb();
  if (db) {
    db.products = [];
    db.salesLedger = [];
    db.quotations = [];
    db.notifications = [];
    if (db.executives) {
      db.executives = db.executives.map(exec => ({
        ...exec,
        cleared: 0,
        salesCount: 0,
        walletBalance: 0,
        walletLedger: []
      }));
    }
    await saveDb(db);
  }
  res.json({ success: true, message: "All products and campaign sales history cleared successfully" });
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
