// Pre-seeded database for Marble Gallery Clearance Sales Hub (MG Luxe Bath & Tile Clearance Hub)
// Stores initial values and provides storage helper functions

export const INITIAL_PRODUCTS = [
  // Bathing Division Items (From Almar & Toto web downloads history)
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
    id: "FT55636",
    name: "Almar Temotion Mist Shower Column",
    brand: "ALMAR",
    category: "Showers",
    description: "Designer freestanding thermostatic shower column featuring micro-mist jets and cascading waterfall.",
    stock: 4,
    mrp: 420000,
    mgPrice: 336000,
    specialPrice: 210000,
    landingCost: 168000,
    division: "Bathing",
    inStockSince: "2025-05-18",
    imageCode: "aquasymphony"
  },
  {
    id: "SA42140",
    name: "Reginox New York 1.5 Sink",
    brand: "REGINOX",
    category: "Sinks",
    description: "Deep integrated kitchen sink featuring 1.5 bowls with sound dampening pads in brushed stainless steel.",
    stock: 12,
    mrp: 65000,
    mgPrice: 52000,
    specialPrice: 32500,
    landingCost: 26000,
    division: "Bathing",
    inStockSince: "2025-10-05",
    imageCode: "veil-tub"
  },
  {
    id: "SA41709",
    name: "Franke Turbo Elite TE-125 Disposer",
    brand: "FRANKE",
    category: "Kitchen Appliances",
    description: "High-speed 1.25 HP food waste disposer with continuous feed and permanent magnet motor.",
    stock: 20,
    mrp: 48000,
    mgPrice: 38400,
    specialPrice: 24000,
    landingCost: 19200,
    division: "Bathing",
    inStockSince: "2026-02-15",
    imageCode: "linea"
  },
  // Tiles Division Items (From actual Salesforce import CSV)
  {
    id: "KAJ-1200-2400",
    name: "Kajaria Premium Main Flooring Tile",
    brand: "KAJARIA",
    category: "Flooring Tiles",
    description: "High-gloss vitrified tile 1200x2400 mm for luxury main living area flooring.",
    stock: 60,
    mrp: 1200,
    mgPrice: 960,
    specialPrice: 318,
    landingCost: 250,
    division: "Tiles",
    size: "1200x2400 mm",
    finishing: "High Gloss",
    location: "Rack A-3",
    inStockSince: "2025-01-10",
    imageCode: "statuario"
  },
  {
    id: "MONO-MUR-GRI",
    name: "Monolith Murrano Grigio Floor Tile",
    brand: "MONOLITH",
    category: "Floor Tiles",
    description: "Designer floor tile 800x1600 mm in Murrano Grigio finish.",
    stock: 45,
    mrp: 450,
    mgPrice: 360,
    specialPrice: 120,
    landingCost: 95,
    division: "Tiles",
    size: "800x1600 mm",
    finishing: "Matte",
    location: "Pallet C-1",
    inStockSince: "2025-02-15",
    imageCode: "royaloak"
  },
  {
    id: "COLOR-OCEAN",
    name: "Colortile Oceanic Gris Glossy Wall Tile",
    brand: "COLORTILE",
    category: "Wall Tiles",
    description: "Glossy wall highlighter tile 800x1600 mm in Oceanic Gris finish.",
    stock: 80,
    mrp: 400,
    mgPrice: 320,
    specialPrice: 108,
    landingCost: 85,
    division: "Tiles",
    size: "800x1600 mm",
    finishing: "Glossy",
    location: "Rack B-2",
    inStockSince: "2025-03-01",
    imageCode: "slipshield"
  },
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

  if (!db) {
    db = {
      products: INITIAL_PRODUCTS,
      executives: INITIAL_EXECUTIVES,
      salesLedger: INITIAL_SALES_LEDGER,
      notifications: INITIAL_NOTIFICATIONS,
      initialTargetValue: calculateStockValue(INITIAL_PRODUCTS)
    };
  }

  // Perform Migrations for V5
  let migrated = false;

  // Ensure base collections exist
  if (!db.products) {
    db.products = INITIAL_PRODUCTS;
    migrated = true;
  }
  if (!db.executives) {
    db.executives = INITIAL_EXECUTIVES;
    migrated = true;
  }
  if (!db.salesLedger) {
    db.salesLedger = INITIAL_SALES_LEDGER;
    migrated = true;
  }
  if (!db.notifications) {
    db.notifications = INITIAL_NOTIFICATIONS;
    migrated = true;
  }

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
      const simulatedUpdates = INITIAL_PRODUCTS.map(p => {
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
          specialPrice: updatedSpecialPrice
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


