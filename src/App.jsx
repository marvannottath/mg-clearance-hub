import React, { useState, useEffect } from 'react';
import { loadDatabase, saveDatabase, calculateStockValue, syncProductsFromSAP } from './data/mockData';
import MDDashboard from './components/MDDashboard';
import ExecutiveWorkspace from './components/ExecutiveWorkspace';
import AdminPanel from './components/AdminPanel';
import CheckerWorkspace from './components/CheckerWorkspace';
import { Layers, Sun, Moon, LogOut, ShieldAlert, KeyRound, User } from 'lucide-react';

function App() {
  const [db, setDb] = useState(() => loadDatabase());
  const [theme, setTheme] = useState(() => localStorage.getItem('mg_clearance_theme') || 'dark');
  
  // Routing and Session State
  const [hash, setHash] = useState(() => window.location.hash || '#/login');
  const [currentUser, setCurrentUser] = useState(() => {
    const session = localStorage.getItem('mg_clearance_session');
    return session ? JSON.parse(session) : null;
  });

  // Track hash changes for routing
  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash || '#/login');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Apply theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mg_clearance_theme', theme);
  }, [theme]);

  // Fetch live database state from server if backend is running (real-time polling every 4s)
  useEffect(() => {
    const syncDb = () => {
      fetch('/api/db')
        .then(res => res.json())
        .then(result => {
          if (result && result.success && result.data) {
            setDb(result.data);
            saveDatabase(result.data);
          }
        })
        .catch(() => {});
    };

    syncDb();
    const interval = setInterval(syncDb, 4000);
    return () => clearInterval(interval);
  }, []);

  const updateDb = (newDb) => {
    setDb(newDb);
    saveDatabase(newDb);
    // Sync with server-side persistent database
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDb)
    }).catch(() => {});
  };

  // Route security guard: Redirect to login if unauthenticated
  useEffect(() => {
    // Detect QR Scan link route
    if (hash.startsWith('#/scan/')) {
      const scannedId = hash.replace('#/scan/', '');
      localStorage.setItem('mg_redirect_scan_id', scannedId);
      if (!currentUser) {
        window.location.hash = '#/login';
      } else if (currentUser.role === 'executive') {
        window.location.hash = '#/executive';
      } else {
        window.location.hash = `#/${currentUser.role}`;
      }
      return;
    }

    const protectedRoutes = ['#/md', '#/admin', '#/executive', '#/checker'];
    if (protectedRoutes.includes(hash) && !currentUser) {
      window.location.hash = '#/login';
      return;
    }

    // Role specific guards
    if (currentUser) {
      if (hash === '#/md' && currentUser.role !== 'md') {
        window.location.hash = `#/${currentUser.role}`;
      } else if (hash === '#/admin' && currentUser.role !== 'admin') {
        window.location.hash = `#/${currentUser.role}`;
      } else if (hash === '#/executive' && currentUser.role !== 'executive') {
        window.location.hash = `#/${currentUser.role}`;
      } else if (hash === '#/checker' && currentUser.role !== 'checker') {
        window.location.hash = `#/${currentUser.role}`;
      } else if (hash === '#/login' || hash === '#/') {
        // Logged in user hitting login or root -> redirect to dashboard
        window.location.hash = `#/${currentUser.role}`;
      }
    } else {
      if (hash !== '#/login' && !hash.startsWith('#/share/')) {
        window.location.hash = '#/login';
      }
    }
  }, [hash, currentUser]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Login handler
  const handleLoginSubmit = (username, password) => {
    const user = username.trim().toLowerCase();
    const pass = password.trim();

    // 1. Check MD Credentials
    if (user === 'md' && pass === 'md123') {
      const mdSession = { name: "MD", role: "md", username: "md", email: "md@marblegallery.com" };
      setCurrentUser(mdSession);
      localStorage.setItem('mg_clearance_session', JSON.stringify(mdSession));
      window.location.hash = '#/md';
      return { success: true };
    }

    // 2. Check Manager Credentials
    const storedManagerPass = localStorage.getItem('mg_manager_password') || 'manager123';
    if ((user === 'manager' || user === 'stockmanager') && pass === storedManagerPass) {
      const managerSession = { name: "Showroom Manager", role: "manager", username: "manager", email: "manager@marblegallery.com" };
      setCurrentUser(managerSession);
      localStorage.setItem('mg_clearance_session', JSON.stringify(managerSession));
      window.location.hash = '#/manager';
      return { success: true };
    }

    // 3. Check Checker Credentials
    if ((user === 'checker' || user === 'billing') && (pass === 'checker123' || pass === 'checker')) {
      const checkerSession = { name: "Salesforce Billing Checker", role: "checker", username: "checker", email: "checker@marblegallery.com" };
      setCurrentUser(checkerSession);
      localStorage.setItem('mg_clearance_session', JSON.stringify(checkerSession));
      window.location.hash = '#/checker';
      return { success: true };
    }

    // 4. Check Admin Credentials (supports dynamic custom admin password)
    const storedAdminPass = localStorage.getItem('mg_admin_password') || 'admin123';
    if (user === 'admin' && pass === storedAdminPass) {
      const adminSession = { name: "System Admin", role: "admin", username: "admin", email: "admin@marblegallery.com" };
      setCurrentUser(adminSession);
      localStorage.setItem('mg_clearance_session', JSON.stringify(adminSession));
      window.location.hash = '#/admin';
      return { success: true };
    }

    // 4. Check Executive Credentials from dynamic DB
    const matchedExec = db.executives.find(e => 
      e.username?.toLowerCase() === user && 
      e.password === pass
    );

    if (matchedExec) {
      const execSession = { 
        name: matchedExec.name, 
        role: "executive", 
        username: matchedExec.username, 
        email: matchedExec.email, 
        execId: matchedExec.id 
      };
      setCurrentUser(execSession);
      localStorage.setItem('mg_clearance_session', JSON.stringify(execSession));
      window.location.hash = '#/executive';
      return { success: true };
    }

    return { success: false, error: "Invalid username or password credentials." };
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('mg_clearance_session');
    window.location.hash = '#/login';
  };

  // Log a sale: subtract stock, add to ledger, update executive statistics
  const logSale = (invoiceNo, execId, customerMobile, cartItems) => {
    const totalPaid = cartItems.reduce((sum, item) => sum + (item.specialPrice * item.qty), 0);
    const totalMrp = cartItems.reduce((sum, item) => sum + (item.mrp * item.qty), 0);

    const updatedProducts = db.products.map(product => {
      const cartItem = cartItems.find(item => item.id === product.id);
      if (cartItem) {
        const newStock = Math.max(0, product.stock - cartItem.qty);
        return { ...product, stock: newStock };
      }
      return product;
    });

    const executive = db.executives.find(e => e.id === execId);
    const execName = executive ? executive.name : "Unknown Executive";

    const updatedExecutives = db.executives.map(e => {
      if (e.id === execId) {
        return {
          ...e,
          cleared: e.cleared + totalPaid,
          salesCount: e.salesCount + 1
        };
      }
      return e;
    });

    const newLedgerEntry = {
      billNo: invoiceNo || `MG-CS-${Date.now().toString().slice(-4)}`,
      executiveId: execId,
      executiveName: execName,
      date: new Date().toISOString(),
      customerMobile: customerMobile || "N/A",
      items: cartItems.map(item => ({
        productId: item.id,
        name: item.name,
        qty: item.qty,
        pricePaid: item.specialPrice,
        mrp: item.mrp,
        division: item.division || 'Bathing',
        size: item.division === 'Tiles' ? item.size : undefined,
        finishing: item.division === 'Tiles' ? item.finishing : undefined,
        location: item.division === 'Tiles' ? item.location : undefined,
      })),
      totalPaid,
      totalMrp
    };

    updateDb({
      ...db,
      products: updatedProducts,
      executives: updatedExecutives,
      salesLedger: [newLedgerEntry, ...db.salesLedger]
    });
  };

  const handleUpdateStock = (productId, newQty) => {
    const updatedProducts = db.products.map(p => {
      if (p.id === productId) {
        return { ...p, stock: Math.max(0, parseInt(newQty) || 0) };
      }
      return p;
    });
    updateDb({ ...db, products: updatedProducts });
  };

  const handleAddProduct = (newProduct) => {
    updateDb({ ...db, products: [newProduct, ...db.products] });
  };

  const handleEditProduct = (productId, updatedDetails) => {
    const updatedProducts = db.products.map(p => {
      if (p.id === productId) {
        return { ...p, ...updatedDetails };
      }
      return p;
    });
    updateDb({ ...db, products: updatedProducts });
  };

  const handleDeleteProduct = (productId) => {
    const updatedProducts = db.products.filter(p => p.id !== productId);
    updateDb({ ...db, products: updatedProducts });
  };

  const handleBulkUpdateStock = (updatedList, replaceMode = true) => {
    // Auto register any new brands in db.brands if not present
    const updatedBrands = [...(db.brands || [])];
    updatedList.forEach(item => {
      if (item.brand && !updatedBrands.some(b => b.name.toUpperCase() === item.brand.toUpperCase())) {
        updatedBrands.push({
          name: item.brand.toUpperCase(),
          maxMargin: 45,
          customerDiscount: 40,
          executiveIncentive: 4
        });
      }
    });

    if (replaceMode) {
      updateDb({
        ...db,
        products: updatedList,
        brands: updatedBrands
      });
      return;
    }

    const updatedProducts = db.products.map(p => {
      const match = updatedList.find(u => u.id === p.id);
      if (match) {
        return { 
          ...p, 
          name: match.name || p.name,
          brand: match.brand || p.brand,
          category: match.category || p.category,
          division: match.division || p.division,
          description: match.description !== undefined ? match.description : p.description,
          stock: match.stock !== undefined ? match.stock : p.stock,
          specialPrice: match.specialPrice !== undefined ? match.specialPrice : p.specialPrice,
          mgPrice: match.mgPrice !== undefined ? match.mgPrice : p.mgPrice,
          mrp: match.mrp !== undefined ? match.mrp : p.mrp,
          landingCost: match.landingCost !== undefined ? match.landingCost : p.landingCost,
          size: match.size || p.size,
          finishing: match.finishing || p.finishing,
          location: match.location || p.location,
          inStockSince: match.inStockSince || p.inStockSince,
          image: match.image !== undefined ? match.image : p.image
        };
      }
      return p;
    });

    const newItems = updatedList.filter(u => !db.products.some(p => p.id === u.id)).map(n => ({
      id: n.id,
      name: n.name || `Product ${n.id}`,
      brand: n.brand || "OTHER",
      category: n.category || "Bathing",
      division: n.division || ((n.category || '').toLowerCase().includes('tiles') ? 'Tiles' : 'Bathing'),
      description: n.description || "",
      stock: n.stock || 0,
      mrp: n.mrp || 0,
      mgPrice: n.mgPrice || 0,
      specialPrice: n.specialPrice || 0,
      landingCost: n.landingCost || Math.round((n.specialPrice || n.mrp || 0) * 0.8),
      size: n.size || "",
      finishing: n.finishing || "",
      location: n.location || "",
      inStockSince: n.inStockSince || "2025-11-20",
      image: n.image || "",
      imageCode: "bulk",
      stickerStatus: 'new'
    }));

    updateDb({ ...db, products: [...newItems, ...updatedProducts], brands: updatedBrands });
  };

  const handleAddExecutive = (newExec) => {
    updateDb({
      ...db,
      executives: [...db.executives, {
        id: `exec-${Date.now().toString().slice(-4)}`,
        cleared: 0,
        salesCount: 0,
        ...newExec
      }]
    });
  };

  const handleDeleteExecutive = (execId) => {
    const updatedExecutives = db.executives.filter(e => e.id !== execId);
    updateDb({ ...db, executives: updatedExecutives });
  };

  // Dynamic calculations based on Landing Cost
  const remainingValue = db.products.reduce((sum, p) => sum + ((p.landingCost || Math.round(p.specialPrice * 0.8)) * p.stock), 0);
  
  const totalClearedLandingCost = db.salesLedger.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      const prod = db.products.find(p => p.id === item.productId);
      const itemLanding = prod ? (prod.landingCost || Math.round(prod.specialPrice * 0.8)) : Math.round(item.pricePaid * 0.8);
      return itemSum + (itemLanding * item.qty);
    }, 0);
  }, 0);

  const dynamicTargetValue = remainingValue + totalClearedLandingCost; // Target = current stock landing cost + sold landing cost
  const totalClearedValue = db.salesLedger.reduce((sum, sale) => sum + sale.totalPaid, 0);

  // LoginView sub-component is defined statically outside the App component

  const isShareRoute = hash.startsWith('#/share/');

  return (
    <div className="app-container">
      {!isShareRoute && (
        <header className="app-header">
          <div className="logo-container">
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '8px', 
              background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 900, 
              color: '#ffffff', 
              fontSize: '1.05rem', 
              letterSpacing: '-0.05em',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              MG
            </div>
            <div>
              <h1 className="logo-text">MG CLEARANCE</h1>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em' }}>
                BATH & TILE DIVISION
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Theme Toggler */}
            <button 
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Authenticated user session display */}
            {currentUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="user-profile-tag">
                  <User size={14} color="var(--accent-cyan)" />
                  <span style={{ color: 'var(--text-secondary)' }}>Logged in:</span>
                  <strong>{currentUser.name}</strong>
                  <span className="badge badge-success" style={{ marginLeft: '0.25rem', fontSize: '0.65rem', padding: '0.15rem 0.35rem' }}>
                    {currentUser.role.toUpperCase()}
                  </span>
                </div>

                <button 
                  className="btn btn-secondary" 
                  onClick={handleLogout}
                  style={{ padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  title="Log Out Session"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      <main className={isShareRoute ? "fade-in" : "main-content fade-in"}>
        {/* Render routes based on current hash */}
        {isShareRoute ? (
          <QuotationShareView db={db} />
        ) : (!currentUser || hash === '#/login') ? (
          <LoginView onLoginSubmit={handleLoginSubmit} />
        ) : (
          <>
            {hash === '#/md' && currentUser.role === 'md' && (
              <MDDashboard 
                products={db.products} 
                executives={db.executives} 
                salesLedger={db.salesLedger}
                brands={db.brands}
                quotations={db.quotations}
                remainingLandingCost={remainingValue}
                totalClearedLandingCost={totalClearedLandingCost}
                dynamicTargetLandingCost={dynamicTargetValue}
                totalClearedRevenue={totalClearedValue}
                onUpdateDb={updateDb}
                db={db}
              />
            )}

            {hash === '#/executive' && currentUser.role === 'executive' && (
              <ExecutiveWorkspace 
                products={db.products}
                activeExecutive={db.executives.find(e => e.id === currentUser.execId) || db.executives[0]}
                db={db}
                onUpdateDb={updateDb}
              />
            )}

            {hash === '#/checker' && currentUser.role === 'checker' && (
              <CheckerWorkspace 
                currentUser={currentUser}
                db={db}
                onUpdateDb={updateDb}
              />
            )}

            {(hash === '#/admin' || hash === '#/manager') && ['admin', 'manager'].includes(currentUser.role) && (
              <AdminPanel 
                currentUser={currentUser}
                products={db.products}
                executives={db.executives}
                salesLedger={db.salesLedger}
                brands={db.brands}
                quotations={db.quotations}
                remainingLandingCost={remainingValue}
                totalClearedLandingCost={totalClearedLandingCost}
                dynamicTargetLandingCost={dynamicTargetValue}
                totalClearedRevenue={totalClearedValue}
                onUpdateStock={handleUpdateStock}
                onAddProduct={handleAddProduct}
                onEditProduct={handleEditProduct}
                onDeleteProduct={handleDeleteProduct}
                onBulkUpdateStock={handleBulkUpdateStock}
                onAddExecutive={handleAddExecutive}
                onDeleteExecutive={handleDeleteExecutive}
                onUpdateDb={updateDb}
                db={db}
              />
            )}
          </>
        )}
      </main>

      {!isShareRoute && (
        <footer style={{ 
          textAlign: 'center', 
          padding: '1.5rem', 
          color: 'var(--text-muted)', 
          fontSize: '0.75rem', 
          borderTop: '1px solid var(--border-color)',
          marginTop: 'auto',
          background: 'rgba(8, 12, 20, 0.4)'
        }}>
          © 2026 Marble Gallery (MG) Group. All rights reserved. • Clearance Liquidation Dashboard (MG Luxe Bath & Tile)
        </footer>
      )}
    </div>
  );
}

// Render Clean Unified Login View
function LoginView({ onLoginSubmit }) {
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    const res = onLoginSubmit(loginUser, loginPass);
    if (!res.success) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="login-view-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '75vh', padding: '1rem' }}>
      <div className="glass-panel login-card" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem', borderRadius: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '14px', 
            background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)', 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontWeight: 900, 
            color: '#ffffff', 
            fontSize: '1.6rem', 
            letterSpacing: '-0.05em',
            boxShadow: '0 6px 20px rgba(2, 132, 199, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            marginBottom: '0.85rem'
          }}>
            MG
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>MG Clearance Hub</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Showroom Inventory & Liquidation System
          </p>
        </div>

        {errorMsg && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem', fontSize: '0.8rem', padding: '0.65rem' }}>
            <ShieldAlert size={14} style={{ marginRight: '0.4rem', flexShrink: 0 }} />
            <div>{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={13} />
              Username
            </label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Username / Staff ID" 
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <KeyRound size={13} />
              Password
            </label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="Password" 
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', fontWeight: 700, fontSize: '1rem' }}
          >
            Login
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <button 
            type="button" 
            className="btn btn-ghost" 
            style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'underline' }}
            onClick={() => setIsForgotModalOpen(true)}
          >
            🔑 Forgot Password / Reset Assistance?
          </button>
        </div>
      </div>

      {/* Password Recovery Assistance Modal */}
      {isForgotModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '2rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={22} color="var(--accent-amber)" />
              System Account Password Recovery Notice
            </h3>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              <p style={{ marginBottom: '0.75rem' }}>
                For enterprise security and audit compliance, account passwords can <strong>only be reset or updated via System Admin authorization</strong> in the System Admin Control Panel.
              </p>
              <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)', padding: '0.85rem', borderRadius: '10px', color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  📩 Password Assistance Contact Email:
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--accent-emerald)' }}>
                  projects@mggroupin.com
                </div>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Please send an email to <strong>projects@mggroupin.com</strong> with your Username / Staff ID and reason for password reset. The System Admin will verify your request and issue a new password.
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => setIsForgotModalOpen(false)}>
                Understood / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Standalone Quotation View for shared URLs and Base64 links
function QuotationShareView({ db }) {
  const hash = window.location.hash;
  const param = hash.replace('#/share/', '');
  
  let quote = null;

  // 1. Try finding quotation directly by Quote ID from database
  if (db && db.quotations && param) {
    const found = db.quotations.find(q => q.id === param || q.id === decodeURIComponent(param));
    if (found) {
      quote = found;
    }
  }

  // 2. Fallback to decoding Base64 string if not found in live DB
  if (!quote && param) {
    try {
      const decodedStr = decodeURIComponent(escape(atob(param)));
      quote = JSON.parse(decodedStr);
    } catch (e) {
      console.error("Failed to decode quotation data", e);
    }
  }

  if (!quote) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '60vh', justifyContent: 'center' }}>
        <h2 style={{ color: 'var(--accent-rose)', fontSize: '1.75rem', fontWeight: 700 }}>Invalid or Expired Quotation Link</h2>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Please verify the shared link and try again.</p>
      </div>
    );
  }

  // Formatting helper
  const formatRupee = (value) => `₹${(value || 0).toLocaleString('en-IN')}`;

  const totalItemsCount = quote.items.reduce((sum, item) => sum + item.qty, 0);
  const cartTotalMrp = quote.items.reduce((sum, item) => sum + (item.mrp * item.qty), 0);
  const cartTotalPaid = quote.items.reduce((sum, item) => sum + (item.specialPrice * item.qty), 0);
  const totalSavings = cartTotalMrp - cartTotalPaid;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1rem' }} className="share-quotation-wrapper">
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Marble Gallery Shared Quotation Sheet</span>
        <button className="btn btn-emerald" onClick={handlePrint}>Download PDF / Print Sheet</button>
      </div>

      <div className="print-invoice-sheet" style={{ background: '#fff', color: '#000', padding: '2.5rem', borderRadius: '8px', boxShadow: '0 4px 25px rgba(0,0,0,0.15)', fontFamily: '"Outfit", "Inter", sans-serif' }}>
        {/* Company Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em', margin: 0 }}>MARBLE GALLERY</h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.15em' }}>MG LUXE BATH & TILE DIVISION</span>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', lineHeight: '1.4' }}>
              MG Group Premium Showroom<br/>
              Luxe Bath & Tile Special Offer Collection
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>SPECIAL PRICE QUOTATION</h3>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', lineHeight: '1.4' }}>
              <strong>Quote No:</strong> {quote.id || `MG-QT-${Date.now().toString().slice(-6)}`}<br/>
              <strong>Date:</strong> {quote.date ? new Date(quote.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}<br/>
              <strong>Time:</strong> {quote.date ? new Date(quote.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Customer / Executive Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', color: '#334155', border: '1px solid #e2e8f0' }}>
          <div>
            <strong>Prepared By:</strong> {quote.executiveName || 'Marble Gallery Showroom Sales'}<br/>
            <strong>Client Name:</strong> {quote.customerName || 'Walk-in Showroom Client'}
            {quote.customerAddress && <><br/><strong>Location:</strong> {quote.customerAddress}</>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong>Client Mobile:</strong> {quote.customerMobile || 'N/A'}<br/>
            <strong>Price Scheme:</strong> Showroom Discount Offer
          </div>
        </div>

        {/* Itemized Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#fff', textAlign: 'left' }}>
              <th style={{ padding: '0.65rem 0.5rem', borderRadius: '4px 0 0 4px' }}>Item Description</th>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>MRP</th>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Special Rate</th>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right', borderRadius: '0 4px 4px 0' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Code: {item.id} | Brand: {item.brand}
                    {item.division === 'Tiles' && ` | Size: ${item.size || 'N/A'} | Finish: ${item.finishing || 'N/A'} | Loc: ${item.location || 'N/A'}`}
                  </div>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{item.qty}</td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: '#94a3b8', textDecoration: 'line-through' }}>{formatRupee(item.mrp)}</td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>{formatRupee(item.specialPrice)}</td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatRupee(item.specialPrice * item.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summaries */}
        {(() => {
          const taxableValue = Math.round(cartTotalPaid / 1.18);
          const totalTax = cartTotalPaid - taxableValue;
          const cgst = Math.round(totalTax / 2);
          const sgst = totalTax - cgst;
          
          return (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <div style={{ width: '290px', fontSize: '0.8rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span>Total Items:</span>
                  <span style={{ fontWeight: 700 }}>{totalItemsCount} units</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span>MRP Value:</span>
                  <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{formatRupee(cartTotalMrp)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.3rem' }}>
                  <span>Taxable Value (Excl. GST):</span>
                  <span>{formatRupee(taxableValue)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span>CGST (9.0%):</span>
                  <span>{formatRupee(cgst)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span>SGST (9.0%):</span>
                  <span>{formatRupee(sgst)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', paddingBottom: '0.4rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  <span>Offer Total (Incl. GST):</span>
                  <span style={{ color: '#0284c7' }}>{formatRupee(cartTotalPaid)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 700 }}>
                  <span>Discount Savings:</span>
                  <span>{formatRupee(totalSavings)} ({cartTotalMrp > 0 ? ((totalSavings / cartTotalMrp) * 100).toFixed(0) : 0}% Off)</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Terms and Conditions */}
        <div style={{ fontSize: '0.65rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', lineHeight: '1.4' }}>
          <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#475569' }}>Terms & Conditions:</strong>
          Thank you for choosing Marble Gallery Group. We value your business.
        </div>
      </div>
    </div>
  );
}

export default App;
