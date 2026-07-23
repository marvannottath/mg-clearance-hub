// Pre-seeded database for Marble Gallery Clearance Sales Hub (MG Luxe Bath & Tile Clearance Hub)
// Stores initial values and provides storage helper functions

export const LEGACY_MOCK_IDS = [
  'SA42322', 'SA42141', 'FT55648', 'FT55636', 'SA42140', 'SA41709', 
  'KAJ-1200-2400', 'MONO-MUR-GRI', 'COLOR-OCEAN', 'SIM-1200-2400', 
  'NIV-MAIN-ENT', 'SPAN-BATH-ACC'
];

export const INITIAL_PRODUCTS = [
  {
    id: "LANG-BOOST-SAGE",
    name: "Langrace Boost Sage Tile",
    brand: "LANGRACE",
    category: "Floor/Wall Tiles",
    description: "Sage color premium vitrified floor and wall tile 600x1200 mm.",
    stock: 90,
    mrp: 380,
    mgPrice: 304,
    specialPrice: 108,
    landingCost: 80,
    division: "Tiles",
    size: "600x1200 mm",
    finishing: "Satin",
    location: "Rack C-4",
    inStockSince: "2025-07-20",
    imageCode: "linea"
  },
  {
    id: "LANG-BOOST-CITD",
    name: "Langrace Boost Sage Citadel D Highlighter",
    brand: "LANGRACE",
    category: "Highlighter Tiles",
    description: "Geometric carved highlighter wall tile 600x1200 mm in Sage Citadel D finish.",
    stock: 40,
    mrp: 420,
    mgPrice: 336,
    specialPrice: 118,
    landingCost: 90,
    division: "Tiles",
    size: "600x1200 mm",
    finishing: "Carving",
    location: "Rack C-5",
    inStockSince: "2025-07-22",
    imageCode: "veil"
  },
  {
    id: "KAJ-HORIZON-WALL",
    name: "Kajaria Horizon Grey Wall Tile",
    brand: "KAJARIA",
    category: "Wall Tiles",
    description: "Horizon Grey wall tile 600x1200 mm.",
    stock: 75,
    mrp: 410,
    mgPrice: 328,
    specialPrice: 115,
    landingCost: 92,
    division: "Tiles",
    size: "600x1200 mm",
    finishing: "Glossy",
    location: "Rack A-5",
    inStockSince: "2025-08-15",
    imageCode: "statuario"
  },
  {
    id: "KAJ-ELTON-CARVE",
    name: "Kajaria Elton Beige Carving Floor Tile",
    brand: "KAJARIA",
    category: "Floor Tiles",
    description: "Elton Beige floor tile 600x1200 mm in carved finish.",
    stock: 50,
    mrp: 430,
    mgPrice: 344,
    specialPrice: 127,
    landingCost: 100,
    division: "Tiles",
    size: "600x1200 mm",
    finishing: "Carving",
    location: "Rack A-6",
    inStockSince: "2026-01-20",
    imageCode: "royaloak"
  }
];

export const INITIAL_EXECUTIVES = [
  { id: "exec-001", name: "Rajesh Kumar", email: "rajesh.k@marblegallery.com", target: 8000000, cleared: 0, salesCount: 0, username: "rajesh", password: "rajesh123" },
  { id: "exec-002", name: "Anjali Menon", email: "anjali.m@marblegallery.com", target: 8000000, cleared: 0, salesCount: 0, username: "anjali", password: "anjali123" },
  { id: "exec-003", name: "Vikram Sethi", email: "vikram.s@marblegallery.com", target: 8000000, cleared: 0, salesCount: 0, username: "vikram", password: "vikram123" },
  { id: "exec-004", name: "Sandeep Pillai", email: "sandeep.p@marblegallery.com", target: 6000000, cleared: 0, salesCount: 0, username: "sandeep", password: "sandeep123" }
];

export const INITIAL_QUOTATIONS = [];

export const INITIAL_SALES_LEDGER = [];

export const INITIAL_NOTIFICATIONS = [
  {
    id: "notif-001",
    targetRole: "executive",
    targetUserId: "exec-001",
    title: "Incentive Credited",
    message: "Invoice #MG-INV-8831 verified by Checker. ₹1,250 credited to your wallet.",
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    read: false,
    type: "success"
  },
  {
    id: "notif-002",
    targetRole: "manager",
    title: "New Quotation Generated",
    message: "Rajesh Kumar generated Quotation MG-QT-752780 for Walk-in Showroom Client (₹11,115).",
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    read: false,
    type: "info"
  },
  {
    id: "notif-003",
    targetRole: "md",
    title: "Campaign Target Milestone",
    message: "Cleared stock sales revenue crossed ₹15,00,000 milestone for Bathing Division!",
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    read: false,
    type: "warning"
  },
  {
    id: "notif-004",
    targetRole: "checker",
    title: "Invoice Verification Pending",
    message: "New invoice #MG-INV-9921 submitted by Rajesh Kumar for clearance audit.",
    timestamp: new Date(Date.now() - 180 * 60000).toISOString(),
    read: false,
    type: "info"
  }
];

const LOCAL_STORAGE_KEY = "mg_clearance_db_v7";

// Fail-safe wrapper to prevent security exceptions in Brave, Safari Private, and chrome Incognito mode
export const safeLocalStorage = (() => {
  const memoryStore = {};
  return {
    getItem: (key) => {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return memoryStore[key] || null;
      }
    },
    setItem: (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        memoryStore[key] = String(value);
      }
    },
    removeItem: (key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        delete memoryStore[key];
      }
    },
    clear: () => {
      try {
        localStorage.clear();
      } catch (e) {
        for (const k in memoryStore) delete memoryStore[k];
      }
    }
  };
})();

export const INITIAL_SYSTEM_LOGS = [
  {
    id: "LOG-1001",
    timestamp: new Date().toISOString(),
    level: "INFO",
    category: "AUTH_EVENT",
    message: "System Admin initialized campaign portal",
    details: "System audit & error tracking active",
    user: "System Admin"
  },
  {
    id: "LOG-1002",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    level: "INFO",
    category: "SYSTEM",
    message: "Salesforce SAP Stock Sync service running clean",
    details: "Endpoint: ClearanceStockAPI | Polling interval: active",
    user: "System"
  }
];

export function getProductActiveHoldQty(productId, quotations = []) {
  if (!productId || !Array.isArray(quotations)) return 0;
  return quotations
    .filter(q => q.status === 'draft' || q.status === 'pending_verification')
    .reduce((sum, q) => {
      const item = (q.items || []).find(i => i.id === productId);
      return sum + (item ? (item.qty || 1) : 0);
    }, 0);
}

export function logSystemEvent(db, { level = 'INFO', category = 'RUNTIME_ERROR', message = '', details = '', user = 'System' }) {
  if (!db) return db;
  const newLog = {
    id: `LOG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message: String(message || 'System Event'),
    details: String(details || ''),
    user: user || 'Anonymous'
  };
  const currentLogs = Array.isArray(db.systemLogs) ? db.systemLogs : INITIAL_SYSTEM_LOGS;
  const updatedLogs = [newLog, ...currentLogs].slice(0, 100);
  return { ...db, systemLogs: updatedLogs };
}

export function loadDatabase() {
  const data = safeLocalStorage.getItem(LOCAL_STORAGE_KEY);
  let db = null;
  if (data) {
    try {
      db = JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse localStorage data, seeding fresh database", e);
    }
  }

  if (!db || typeof db !== 'object') {
    // Fresh install — load seed data once
    db = {
      products: INITIAL_PRODUCTS,
      productsInitialized: true,
      executives: INITIAL_EXECUTIVES,
      salesLedger: INITIAL_SALES_LEDGER,
      notifications: INITIAL_NOTIFICATIONS,
      quotations: INITIAL_QUOTATIONS,
      systemLogs: INITIAL_SYSTEM_LOGS,
      initialTargetValue: calculateStockValue(INITIAL_PRODUCTS)
    };
  }

  let migrated = false;

  // Auto-purge any legacy sample mock items (Toto, Almar, Kajaria mock items)
  if (Array.isArray(db.products)) {
    db.products = db.products.filter(p => p && !LEGACY_MOCK_IDS.includes(p.id));
  }
  db.deletedProductIds = [...new Set([...(db.deletedProductIds || []), ...LEGACY_MOCK_IDS])];

  // Ensure base collections exist and are valid arrays
  if (!db.productsInitialized) {
    if (!Array.isArray(db.products) || db.products.length === 0) {
      db.products = INITIAL_PRODUCTS.filter(p => !LEGACY_MOCK_IDS.includes(p.id));
    }
    db.productsInitialized = true;
    migrated = true;
  } else {
    if (!Array.isArray(db.products)) db.products = [];
  }

  if (!Array.isArray(db.executives) || db.executives.length === 0) db.executives = INITIAL_EXECUTIVES;
  if (!Array.isArray(db.salesLedger)) db.salesLedger = INITIAL_SALES_LEDGER;
  if (!Array.isArray(db.notifications)) db.notifications = INITIAL_NOTIFICATIONS;
  if (!Array.isArray(db.quotations)) db.quotations = INITIAL_QUOTATIONS;
  if (!Array.isArray(db.systemLogs)) db.systemLogs = INITIAL_SYSTEM_LOGS;

  if (!Array.isArray(db.quotations)) db.quotations = INITIAL_QUOTATIONS;

  // 1. Ensure executives have username/password, walletBalance, and walletLedger
  if (db.executives) {
    db.executives = db.executives.map(e => {
      let updated = { ...e };
      let updatedStatus = false;
      if (!updated.username) {
        const initial = INITIAL_EXECUTIVES.find(ie => ie.id === e.id);
        if (initial) {
          updated.username = initial.username;
          updated.password = initial.password;
          updatedStatus = true;
        }
      }
      if (updated.walletBalance === undefined) {
        updated.walletBalance = 0;
        updatedStatus = true;
      }
      if (updated.walletLedger === undefined) {
        updated.walletLedger = [];
        updatedStatus = true;
      }
      if (updatedStatus) {
        migrated = true;
      }
      return updated;
    });
  }

  // 2. Ensure products have distinct MRP, landingCost, stickerStatus, etc.
  if (db.products) {
    db.products = db.products.map(p => {
      let updated = { ...p };
      let updatedStatus = false;

      const specialP = p.specialPrice || p.mrp || 0;
      let mrpP = p.mrp || 0;

      // Fix corrupt MRPs where product code digits (e.g. 41560 from SA41560) were saved as MRP
      const idDigits = (p.id || '').replace(/\D/g, '');
      if ((idDigits.length >= 4 && String(mrpP) === idDigits) || mrpP > (specialP * 3.5)) {
        mrpP = Math.round(specialP / (1 - 0.40)); // Standard 40% margin calculation for MRP
        updated.mrp = mrpP;
        updatedStatus = true;
      }

      // Auto-correct corrupt clearance prices mistakenly saved as 5% incentive rate (e.g. 53, 389 when landing is 715, 5278)
      if (updated.landingCost > 0 && updated.specialPrice > 0 && updated.specialPrice < (updated.landingCost * 0.4)) {
        updated.specialPrice = updated.landingCost;
        updated.mrp = Math.max(updated.mrp || 0, updated.landingCost);
        updatedStatus = true;
      }

      // Ensure landingCost is initialized
      if (updated.landingCost === undefined || updated.landingCost <= 0) {
        updated.landingCost = Math.round((updated.specialPrice || updated.mrp || 0) * 0.8);
        updatedStatus = true;
      }
      if (updated.stickerStatus === undefined) {
        updated.stickerStatus = 'printed';
        updatedStatus = true;
      }
      if (updated.isWeeklySpecial === undefined) {
        updated.isWeeklySpecial = false;
        updatedStatus = true;
      }
      if (updated.extraCustomerDiscount === undefined) {
        updated.extraCustomerDiscount = 0;
        updatedStatus = true;
      }
      if (updated.weeklySpecialIncentive === undefined) {
        updated.weeklySpecialIncentive = 0;
        updatedStatus = true;
      }
      if (updated.weeklySpecialUntil === undefined) {
        updated.weeklySpecialUntil = '';
        updatedStatus = true;
      }
      if (updated.division === undefined) {
        const idLower = (p.id || '').toLowerCase();
        const brandLower = (p.brand || '').toLowerCase();
        if (
          idLower.includes("sim") || idLower.includes("kaj") || idLower.includes("som") || idLower.includes("nit") || idLower.includes("lat") ||
          brandLower === 'simpolo' || brandLower === 'kajaria' || brandLower === 'somany' || brandLower === 'nitco' || brandLower === 'laticrete'
        ) {
          updated.division = 'Tiles';
        } else {
          updated.division = 'Bathing';
        }
        updatedStatus = true;
      }
      if (updated.division === 'Tiles') {
        if (updated.size === undefined) {
          updated.size = p.size || '60x120 cm';
          updatedStatus = true;
        }
        if (updated.finishing === undefined) {
          updated.finishing = p.finishing || 'Matt';
          updatedStatus = true;
        }
        if (updated.location === undefined) {
          updated.location = p.location || 'Casette A-1';
          updatedStatus = true;
        }
      }
      if (updatedStatus) {
        migrated = true;
      }
      return updated;
    });
  }

  // 3. Ensure brands list exists and contains Tile brands
  const defaultBrands = [
    { name: "TOTO", maxMargin: 55, customerDiscount: 50, executiveIncentive: 5 },
    { name: "ALMAR", maxMargin: 55, customerDiscount: 50, executiveIncentive: 5 },
    { name: "REGINOX", maxMargin: 50, customerDiscount: 45, executiveIncentive: 4 },
    { name: "FRANKE", maxMargin: 50, customerDiscount: 45, executiveIncentive: 4 },
    { name: "KAJARIA", maxMargin: 45, customerDiscount: 40, executiveIncentive: 3 },
    { name: "MONOLITH", maxMargin: 45, customerDiscount: 40, executiveIncentive: 3 },
    { name: "COLORTILE", maxMargin: 45, customerDiscount: 40, executiveIncentive: 3 },
    { name: "LANGRACE", maxMargin: 45, customerDiscount: 40, executiveIncentive: 3 }
  ];

  if (!db.brands) {
    db.brands = defaultBrands;
    migrated = true;
  } else {
    defaultBrands.forEach(dbb => {
      if (!db.brands.some(b => b.name === dbb.name)) {
        db.brands.push(dbb);
        migrated = true;
      }
    });
  }

  // 4. Ensure quotations list exists
  if (!db.quotations || db.quotations.length === 0) {
    db.quotations = INITIAL_QUOTATIONS;
    migrated = true;
  }

  // Always save sanitized database to browser storage
  saveDatabase(db);

  return db;
}

export function saveDatabase(db) {
  safeLocalStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
}

export function calculateStockValue(products) {
  // Sum of (Special price * Stock) representing current stock value on hand
  return products.reduce((acc, p) => acc + (p.specialPrice * p.stock), 0);
}

export function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isWeeklySpecialActive(product) {
  if (!product || !product.isWeeklySpecial) return false;
  if (!product.weeklySpecialUntil) return true;
  return product.weeklySpecialUntil >= getLocalDateString();
}

// Default URL points to your public Salesforce Sandbox guest Site endpoint containing live SAP data
export function getSapApiUrl() {
  return safeLocalStorage.getItem('mg_sap_api_url') || "https://momentum-computing-8775--sbox5.sandbox.my.salesforce-sites.com/services/apexrest/ClearanceStockAPI";
}

// Salesforce Sandbox Connection Settings
const SF_LOGIN_URL = "https://momentum-computing-8775--sbox5.sandbox.my.salesforce.com";

export function getSfClientId() {
  return safeLocalStorage.getItem('mg_sf_client_id') || "3MVG9feZg_c.1018.xWzL5Kk2jL_r9_sbox5_OAuth_Connected_App_Client_Id";
}

export function getSfClientSecret() {
  return safeLocalStorage.getItem('mg_sf_client_secret') || "2A9D57C58BD934E2F1E4EAEE76E4B1F3";
}

// Obtain Salesforce OAuth Token dynamically using Client Credentials Flow or fallback session
export async function getSalesforceAccessToken() {
  const cachedToken = safeLocalStorage.getItem('mg_sf_access_token');
  const tokenExpiry = safeLocalStorage.getItem('mg_sf_token_expiry');
  
  if (cachedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
    return cachedToken;
  }

  try {
    // Attempting to fetch a fresh server-side session token via proxy
    const tokenUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
      `${SF_LOGIN_URL}/services/oauth2/token?grant_type=client_credentials&client_id=${getSfClientId()}&client_secret=${getSfClientSecret()}`
    )}`;
    
    const response = await fetch(tokenUrl, { method: 'POST' });
    if (response.ok) {
      const data = await response.json();
      if (data.access_token) {
        safeLocalStorage.setItem('mg_sf_access_token', data.access_token);
        // Expire in 1 hour
        safeLocalStorage.setItem('mg_sf_token_expiry', (Date.now() + 3500000).toString());
        return data.access_token;
      }
    }
  } catch (err) {
    // Silent fallback for manual offline build
  }
  
  // Return current local token if exists, otherwise empty string
  return cachedToken || "";
}

export async function syncProductsFromSAP() {
  let products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));

  try {
    let targetUrl = getSapApiUrl();
    
    // Reroute via local Vite proxy to bypass CORS
    if (targetUrl.startsWith('https://momentum-computing-8775--sbox5.sandbox.my.salesforce-sites.com')) {
      targetUrl = targetUrl.replace('https://momentum-computing-8775--sbox5.sandbox.my.salesforce-sites.com', '/sf-api');
    } else if (targetUrl.startsWith('https://momentum-computing-8775--sbox5.sandbox.my.salesforce.com')) {
      targetUrl = targetUrl.replace('https://momentum-computing-8775--sbox5.sandbox.my.salesforce.com', '/sf-instance');
    }
    
    const isPublicSite = targetUrl.includes('salesforce-sites.com') || targetUrl.startsWith('/sf-api');
    
    let response = null;
    const headers = { 'Accept': 'application/json' };
    
    // Bypass OAuth entirely if it's the public Guest REST API
    if (!isPublicSite) {
      const accessToken = await getSalesforceAccessToken().catch(() => null);
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    try {
      // Try direct fetch first
      response = await fetch(targetUrl, {
        method: 'GET',
        headers: headers
      });
    } catch (corsErr) {
      console.warn("Direct fetch failed (likely CORS), trying CORS proxy...", corsErr);
      // Fallback to CORS proxy
      const proxiedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      response = await fetch(proxiedUrl, {
        method: 'GET',
        headers: headers
      });
    }

    if (response && response.ok) {
      const sapProducts = await response.json();
      if (sapProducts && sapProducts.length > 0) {
        products = sapProducts.map(sap => ({
          id: sap.ProductCode || sap.ItemCode || sap.id || sap.Id,
          name: sap.Name || sap.ItemName || sap.name || "Unnamed SAP Product",
          brand: (sap.Brand__c || sap.Brand || sap.brand || "OTHER").toUpperCase(),
          category: sap.Product_Category__c || sap.Category || sap.category || "Bathing",
          division: sap.Division__c || sap.Division || sap.division || ((sap.Product_Category__c || sap.Category || '').toLowerCase().includes('tiles') ? 'Tiles' : 'Bathing'),
          description: sap.Description || sap.description || "",
          stock: parseInt(sap.In_Stock__c) || parseInt(sap.Stock_Quantity__c) || parseInt(sap.OnHand) || parseInt(sap.stock) || 0,
          mrp: parseFloat(sap.MRP__c) || parseFloat(sap.MRP) || parseFloat(sap.mrp) || parseFloat(sap.MSP__c || sap.Price || 0),
          mgPrice: parseFloat(sap.MSP__c) || parseFloat(sap.Price) || parseFloat(sap.mgPrice) || 0,
          specialPrice: parseFloat(sap.Clearance_Price__c) || parseFloat(sap.ClearancePrice) || parseFloat(sap.specialPrice) || (parseFloat(sap.MSP__c || sap.Price) * 0.5) || 0,
          landingCost: parseFloat(sap.Cost_Price__c) || parseFloat(sap.Cost) || parseFloat(sap.landingCost) || (parseFloat(sap.MSP__c || sap.Price) * 0.4) || 0,
          imageCode: (sap.Brand__c || sap.Brand || sap.brand || '').toLowerCase(),
          inStockSince: sap.In_Stock_Since__c || sap.InStockSince__c || sap.InStockSince || sap.inStockSince || "2025-11-20"
        }));
      }
    }
  } catch (err) {
    console.warn("Direct Salesforce products list fetch failed, falling back to INITIAL_PRODUCTS:", err);
  }

  // Fetch actual real-time stock directly from SAP B1 via Vite proxy for each product
  try {
    const stockPromises = products.map(async (p) => {
      try {
        const body = {
          ApiKey: "SKYHSTskb2h82yhdc76512rgsv",
          ProductCode: p.id
        };
        const stockRes = await fetch("/sap-api/salesforce/api/Get_BatchStock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (stockRes.ok) {
          const data = await stockRes.json();
          if (data && data.oMBatchStockLsts && data.oMBatchStockLsts.length > 0) {
            let totalStock = 0;
            for (const batch of data.oMBatchStockLsts) {
              totalStock += parseFloat(batch.Stock) || 0;
            }
            p.stock = totalStock;
          } else if (data && data.oMBatchStockLsts) {
            // If oMBatchStockLsts is empty array, it means stock is 0
            p.stock = 0;
          }
        }
      } catch (err) {
        console.error(`Failed to fetch live SAP stock for ${p.id}:`, err);
      }
    });

    await Promise.all(stockPromises);
    return products;
  } catch (err) {
    console.warn("Live SAP stock fetch via proxy failed, using simulated stock:", err);
  }

  // Simulated Live SAP Stock updates for demo purposes (1.5s delay to show loading state)
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate real-time stock and price adjustments synced from SAP
      const baseProducts = (products && products.length > 0) ? products : INITIAL_PRODUCTS;
      const simulatedUpdates = baseProducts.map(p => {
        let updatedStock = p.stock;
        let updatedSpecialPrice = p.specialPrice;
        
        // Mocking stock levels changing inside SAP warehouse:
        if (p.id === 'SA42322') {
          updatedStock = 18; // Increased in SAP
          updatedSpecialPrice = 160000; // Special discount adjusted!
        }
        if (p.id === 'FT55648') {
          updatedStock = 8;  // Decreased (sales logged in other branch)
        }
        if (p.id === 'KAJ-1200-2400') {
          updatedStock = 55; // Newly loaded batch
        }
        return {
          ...p,
          stock: updatedStock,
          specialPrice: updatedSpecialPrice,
          image: p.image || ''
        };
      });
      resolve(simulatedUpdates);
    }, 1500);
  });
}

export function getProductStockAgeMonths(product) {
  if (!product) return 0;
  // If no date is set, Toto and Almar smart items, Kajaria, Monolith, and Colortile are mock-set to >1yr, others are recent.
  const isOldMock = ['SA42322', 'FT55648', 'KAJ-1200-2400', 'MONO-MUR-GRI', 'COLOR-OCEAN'].includes(product.id);
  const inStockSince = product.inStockSince || (isOldMock ? "2025-01-10" : "2025-11-20");
  
  const since = new Date(inStockSince);
  const now = new Date();
  const diffTime = Math.abs(now - since);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.round(diffDays / 30.5); // Age in months
}


