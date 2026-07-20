import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Helper to read database
function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading database file:", err);
  }
  return null;
}

// Helper to save database
function saveDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Error saving database file:", err);
    return false;
  }
}

// GET /api/db - Fetch live database
app.get('/api/db', (req, res) => {
  const db = readDb();
  res.json({ success: true, data: db });
});

// POST /api/db - Update live database
app.post('/api/db', (req, res) => {
  const data = req.body;
  if (!data) {
    return res.status(400).json({ success: false, error: "No data provided" });
  }
  const ok = saveDb(data);
  res.json({ success: ok });
});

// POST /api/reset-products - Clear all sample products
app.post('/api/reset-products', (req, res) => {
  const db = readDb();
  if (db) {
    db.products = [];
    saveDb(db);
  }
  res.json({ success: true, message: "All products cleared successfully" });
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
