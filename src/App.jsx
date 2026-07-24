import React, { useState, useEffect } from 'react';
import { loadDatabase, saveDatabase, calculateStockValue, syncProductsFromSAP, logSystemEvent } from './data/mockData';
import MDDashboard from './components/MDDashboard';
import ExecutiveWorkspace from './components/ExecutiveWorkspace';
import AdminPanel from './components/AdminPanel';
import CheckerWorkspace from './components/CheckerWorkspace';
import { Layers, Sun, Moon, LogOut, ShieldAlert, KeyRound, User, Bell, CheckCheck, Info, AlertTriangle, CheckCircle2, Download, Smartphone, HelpCircle } from 'lucide-react';

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

// Fail-safe Error Boundary to prevent pitch black blank screens on mobile browsers
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center', background: '#080c14', color: '#f8fafc' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <ShieldAlert size={32} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', color: '#f8fafc' }}>System Recovery Required</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '500px', marginBottom: '1rem', lineHeight: '1.6' }}>
            An unexpected temporary rendering exception occurred on this device.
          </p>
          {this.state.error && (
            <pre style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.75rem', maxWidth: '600px', width: '100%', overflowX: 'auto', textAlign: 'left', marginBottom: '1.25rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {this.state.error.toString()}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              className="btn btn-cyan" 
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              style={{ padding: '0.6rem 1.25rem', fontWeight: 700 }}
            >
              🔄 Reload App
            </button>
            <button 
              className="btn btn-amber" 
              onClick={() => {
                try { localStorage.clear(); } catch(e){}
                window.location.href = '/login';
              }}
              style={{ padding: '0.6rem 1.25rem', fontWeight: 700 }}
            >
              🔑 Clear Session & Re-login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function triggerSystemNotification(title, body) {

  // 1. Play Web Audio Chime Sound
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(523.25, now, 0.25);       // C5
      playTone(659.25, now + 0.12, 0.25); // E5
      playTone(783.99, now + 0.24, 0.25); // G5
      playTone(1046.50, now + 0.36, 0.5);  // C6
    }
  } catch (e) {}

  // 2. Trigger PWA System Lock Screen Notification via Service Worker
  if ('serviceWorker' in navigator && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then(reg => {
      if (reg && reg.active) {
        reg.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: title || 'MG Clearance Hub',
          body: body || 'New clearance update from Showroom',
          icon: '/icon-192.png'
        });
      } else if (reg && reg.showNotification) {
        reg.showNotification(title || 'MG Clearance Hub', {
          body: body || 'New clearance update from Showroom',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [300, 100, 300, 100, 300],
          requireInteraction: true
        });
      }
    }).catch(() => {
      try {
        new Notification(title || 'MG Clearance Hub', {
          body: body || 'New clearance update from Showroom',
          icon: '/icon-192.png'
        });
      } catch (e) {}
    });
  } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title || 'MG Clearance Hub', {
        body: body || 'New clearance update from Showroom',
        icon: '/icon-192.png'
      });
    } catch (e) {}
  }
}

if (typeof window !== 'undefined') {
  window.triggerSystemNotification = triggerSystemNotification;
}

function App() {

  const [db, setDb] = useState(() => loadDatabase());
  const [theme, setTheme] = useState(() => safeLocalStorage.getItem('mg_clearance_theme') || 'dark');
  const [currentUser, setCurrentUser] = useState(() => {
    const session = safeLocalStorage.getItem('mg_clearance_session');
    return session ? JSON.parse(session) : null;
  });
  
  // Clean HTML5 Path Routing (No '#' in URL)
  const getNormalizedRoute = () => {
    let p = window.location.pathname;
    let h = window.location.hash;
    if (p && p.includes('/share/')) return p;
    if (h && h.includes('/share/')) return h.replace('#', '');
    if (p && p !== '/' && p !== '') return p;
    if (h && h !== '/' && h !== '') return h.replace('#', '');
    return '/login';
  };

  const [routePath, setRoutePath] = useState(getNormalizedRoute);

  const navigateTo = (path) => {
    setRoutePath(path);
    try {
      window.history.pushState(null, '', path);
    } catch (e) {}
  };

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Track location, network status, and system error events
  useEffect(() => {
    const handleLocationChange = () => {
      setRoutePath(getNormalizedRoute());
    };
    const goOnline = () => {
      setIsOffline(false);
      showToast("🌐 Network connection restored!");
    };
    const goOffline = () => {
      setIsOffline(true);
      setDb(prevDb => logSystemEvent(prevDb, {
        level: 'WARNING',
        category: 'NETWORK',
        message: 'Device went offline. Working in offline mode.',
        user: currentUser ? currentUser.name : 'System'
      }));
    };

    const handleGlobalError = (event) => {
      const errorMsg = event.error ? event.error.toString() : (event.message || 'Runtime Exception');
      const details = event.error && event.error.stack ? event.error.stack : `At ${event.filename}:${event.lineno}`;
      setDb(prevDb => logSystemEvent(prevDb, {
        level: 'CRITICAL',
        category: 'RUNTIME_ERROR',
        message: errorMsg,
        details: details,
        user: currentUser ? currentUser.name : 'System'
      }));
    };

    const handlePromiseRejection = (event) => {
      const reason = event.reason ? (event.reason.message || String(event.reason)) : 'Promise Rejected';
      setDb(prevDb => logSystemEvent(prevDb, {
        level: 'WARNING',
        category: 'API_FAILURE',
        message: `Async Request Failed: ${reason}`,
        details: event.reason && event.reason.stack ? event.reason.stack : 'Unhandled Rejection',
        user: currentUser ? currentUser.name : 'System'
      }));
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handlePromiseRejection);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };
  }, [currentUser]);

  // Request Notification Permission on App Mount for Lock Screen PWA Notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);


  // Root security wrapper to block devtools / inspect element / copy-paste source sniffing
  useEffect(() => {
    // 1. Disable Right-Click Context Menu
    const preventContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', preventContextMenu);

    // 2. Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Cmd+Opt+I, Cmd+Opt+J, Cmd+Opt+C, Ctrl+U
    const preventInspectKeys = (e) => {
      // Check for F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      // Check for Ctrl+Shift+I or Cmd+Opt+I
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
        e.preventDefault();
        return false;
      }
      // Check for Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.keyCode === 85) {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener('keydown', preventInspectKeys);

    // 3. Clear console dynamically if outer height/width differs indicating open DevTools
    const devtoolsProtection = setInterval(() => {
      try {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        if (widthThreshold || heightThreshold) {
          console.clear();
        }
      } catch (err) {}
    }, 1000);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventInspectKeys);
      clearInterval(devtoolsProtection);
    };
  }, []);


  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotUser, setForgotUser] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Click outside to close notification drawer
  useEffect(() => {
    const handleNotifClickOutside = (e) => {
      if (isNotifDrawerOpen && !e.target.closest('#notification-bell-btn') && !e.target.closest('#notification-drawer')) {
        setIsNotifDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleNotifClickOutside);
    return () => document.removeEventListener('mousedown', handleNotifClickOutside);
  }, [isNotifDrawerOpen]);

  // Unified Custom Confirmation Modal State & Global Handler
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    resolve: null,
    isDanger: false,
    confirmText: 'Proceed',
    cancelText: 'Cancel'
  });

  useEffect(() => {
    window.customConfirm = (title, message, isDanger = false, confirmText = 'Proceed', cancelText = 'Cancel') => {
      return new Promise((resolve) => {
        setConfirmModal({
          isOpen: true,
          title,
          message,
          resolve,
          isDanger,
          confirmText,
          cancelText
        });
      });
    };
    return () => {
      delete window.customConfirm;
    };
  }, []);

  const getUserNotifications = () => {
    if (!currentUser || !db.notifications) return [];
    return db.notifications.filter(n => {
      if (n.targetRole === 'all') return true;
      if (n.targetRole === currentUser.role) {
        if (currentUser.role === 'executive' && n.targetUserId) {
          return n.targetUserId === currentUser.execId || n.targetUserId === 'exec-001';
        }
        return true;
      }
      return false;
    });
  };

  const userNotifications = getUserNotifications();
  const unreadCount = userNotifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    const updatedNotifs = (db.notifications || []).map(n => {
      if (n.targetRole === currentUser.role || n.targetRole === 'all') {
        return { ...n, read: true };
      }
      return n;
    });
    updateDb({ ...db, notifications: updatedNotifs });
  };

  // Apply theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    safeLocalStorage.setItem('mg_clearance_theme', theme);
  }, [theme]);

  const lastLocalUpdateRef = React.useRef(0);

  const updateDb = (newDb) => {
    lastLocalUpdateRef.current = Date.now();
    setDb(newDb);
    saveDatabase(newDb);
    // Sync with server-side persistent database
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDb)
    }).catch(() => {});
  };

  // Fetch live database state from server if backend is running (real-time polling every 5s)
  useEffect(() => {
    const syncDb = () => {
      // Don't overwrite client state if a local edit/update occurred in the last 8 seconds
      if (Date.now() - lastLocalUpdateRef.current < 8000) return;

      fetch('/api/db')
        .then(res => res.json())
        .then(result => {
          if (result && result.success && result.data && (Date.now() - lastLocalUpdateRef.current >= 8000)) {
            setDb(prevDb => {
              const currentProducts = (prevDb && prevDb.products) ? prevDb.products : [];
              const serverProducts = (result.data && result.data.products) ? result.data.products : [];

              // Track which product IDs were intentionally deleted locally
              const deletedIds = new Set(prevDb && prevDb.deletedProductIds ? prevDb.deletedProductIds : []);

              // Merge server products, preserving local images, but SKIP any locally deleted products
              const mergedProducts = serverProducts
                .filter(sp => !deletedIds.has(sp.id)) // ← Don't restore deleted products
                .map(sp => {
                  const lp = currentProducts.find(p => p.id === sp.id);
                  return {
                    ...sp,
                    // PRESERVE & SYNC UPLOADED PRODUCT IMAGE (Server image from Manager takes priority)
                    image: (sp && sp.image && sp.image.trim() !== '') 
                      ? sp.image 
                      : ((lp && lp.image && lp.image.trim() !== '') ? lp.image : '')
                  };
                });


              // Products that exist only on client (new local additions)
              const localOnly = currentProducts.filter(lp =>
                !serverProducts.some(sp => sp.id === lp.id) && !deletedIds.has(lp.id)
              );

              const mergedDb = {
                ...result.data,
                products: [...localOnly, ...mergedProducts],
                deletedProductIds: [...deletedIds], // Preserve deleted list
                productsInitialized: prevDb.productsInitialized || result.data.productsInitialized || false
              };
              saveDatabase(mergedDb);
              return mergedDb;
            });
          }
        })
        .catch(() => {});
    };

    syncDb();
    const interval = setInterval(syncDb, 5000);
    return () => clearInterval(interval);
  }, []);

  // Route security guard: Redirect to login if unauthenticated or locked role route
  useEffect(() => {
    // Detect QR Scan link route
    if (routePath.startsWith('/scan/') || routePath.startsWith('#/scan/')) {
      const scannedId = routePath.replace('/scan/', '').replace('#/scan/', '');
      safeLocalStorage.setItem('mg_redirect_scan_id', scannedId);
      if (!currentUser) {
        navigateTo('/login');
      } else {
        navigateTo(`/${currentUser.role}`);
      }
      return;
    }

    const protectedRoutes = ['/md', '/admin', '/executive', '/checker', '/manager'];
    const cleanPath = routePath.replace(/^#?\/?/, '').replace(/\/$/, '').toLowerCase();

    // 1. Unauthenticated Users: Redirect to /login if on root or protected routes
    if (!currentUser) {
      if (cleanPath !== 'login' && !cleanPath.startsWith('scan/')) {
        navigateTo('/login');
      }
      return;
    }

    // 2. Authenticated Users: Lock role route and prevent staying on /login or unauthorized routes
    if (currentUser) {
      const userRole = (currentUser.role || 'executive').toLowerCase();
      if (cleanPath === '' || cleanPath === 'login' || (protectedRoutes.includes(`/${cleanPath}`) && cleanPath !== userRole)) {
        navigateTo(`/${userRole}`);
      }
    }
  }, [routePath, currentUser]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Login authentication handler
  const handleLoginSubmit = (user, pass) => {
    user = user.trim().toLowerCase();

    // 1. Check Managing Director (MD) Credentials
    const storedMdPass = safeLocalStorage.getItem('mg_md_password') || 'md123';
    if ((user === 'md' || user === 'director' || user === 'managingdirector') && (pass === storedMdPass || pass === 'md123' || pass === 'md')) {
      const mdSession = { name: "Managing Director", role: "md", username: "md", email: "md@marblegallery.com" };
      setCurrentUser(mdSession);
      safeLocalStorage.setItem('mg_clearance_session', JSON.stringify(mdSession));
      navigateTo('/md');
      return { success: true };
    }

    // 2. Check Showroom Manager Credentials
    const storedMgrPass = safeLocalStorage.getItem('mg_manager_password') || 'manager123';
    if ((user === 'manager' || user === 'showroom') && (pass === storedMgrPass || pass === 'manager123' || pass === 'manager')) {
      const managerSession = { name: "Showroom Manager", role: "manager", username: "manager", email: "manager@marblegallery.com" };
      setCurrentUser(managerSession);
      safeLocalStorage.setItem('mg_clearance_session', JSON.stringify(managerSession));
      navigateTo('/manager');
      return { success: true };
    }

    // 3. Check Checker Credentials
    const storedCheckerPass = safeLocalStorage.getItem('mg_checker_password') || 'checker123';
    if ((user === 'checker' || user === 'billing') && (pass === storedCheckerPass || pass === 'checker123' || pass === 'checker')) {
      const checkerSession = { name: "Salesforce Billing Checker", role: "checker", username: "checker", email: "checker@marblegallery.com" };
      setCurrentUser(checkerSession);
      safeLocalStorage.setItem('mg_clearance_session', JSON.stringify(checkerSession));
      navigateTo('/checker');
      return { success: true };
    }

    // 4. Check Admin Credentials
    const storedAdminPass = safeLocalStorage.getItem('mg_admin_password') || 'admin123';
    if (user === 'admin' && (pass === storedAdminPass || pass === 'admin123')) {
      const adminSession = { name: "System Admin", role: "admin", username: "admin", email: "admin@marblegallery.com" };
      setCurrentUser(adminSession);
      safeLocalStorage.setItem('mg_clearance_session', JSON.stringify(adminSession));
      navigateTo('/admin');
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
      safeLocalStorage.setItem('mg_clearance_session', JSON.stringify(execSession));
      navigateTo('/executive');
      return { success: true };
    }

    return { success: false, error: "Invalid username or password credentials." };
  };

  // Secure Logout handler
  const handleLogout = () => {
    safeLocalStorage.removeItem('mg_clearance_session');
    try {
      sessionStorage.clear();
    } catch (e) {}
    setCurrentUser(null);
    setIsProfileMenuOpen(false);
    setIsNotifDrawerOpen(false);
    setIsForgotModalOpen(false);
    navigateTo('/login');
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
    const deletedProductIds = [...new Set([...(db.deletedProductIds || []), productId])];
    updateDb({ ...db, products: updatedProducts, deletedProductIds });
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

  // Time-aware greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '🌅 Good Morning';
    if (hour >= 12 && hour < 17) return '☀️ Good Afternoon';
    return '🌆 Good Evening';
  };

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Listen for PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User installed the PWA app');
        }
        setDeferredPrompt(null);
      });
    } else {
      setIsInstallModalOpen(true);
    }
  };

  const getUserInitials = (name) => {
    if (!name) return 'MG';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isShareRoute = routePath.startsWith('/share/') || routePath.startsWith('#/share/');

  return (
    <div className="app-container">
      {!isShareRoute && (
        <header className="app-header" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="logo-container" style={{ cursor: 'pointer' }} onClick={() => navigateTo(currentUser ? `/${currentUser.role}` : '/login')}>
            <div style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: '10px', 
              background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 900, 
              color: '#ffffff', 
              fontSize: '1.1rem', 
              letterSpacing: '-0.05em',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.25)'
            }}>
              MG
            </div>
            <div>
              <h1 className="logo-text" style={{ fontSize: '1.1rem', margin: 0, letterSpacing: '0.02em' }}>MG CLEARANCE</h1>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block' }}>
                BATH & TILE DIVISION
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
            
            {/* Role-Based Notification Bell Icon */}
            {currentUser && (
              <div style={{ position: 'relative' }}>
                <button 
                  id="notification-bell-btn"
                  onClick={() => setIsNotifDrawerOpen(!isNotifDrawerOpen)}
                  style={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '50%', 
                    padding: 0, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    position: 'relative'
                  }}
                  title="System Notifications & Alerts"
                >
                  <Bell size={18} color={unreadCount > 0 ? "var(--accent-amber)" : "var(--text-secondary)"} />
                  {unreadCount > 0 && (
                    <span style={{ 
                      position: 'absolute', 
                      top: '-2px', 
                      right: '-2px', 
                      background: 'var(--accent-rose)', 
                      color: '#fff', 
                      fontSize: '0.62rem', 
                      fontWeight: 800, 
                      borderRadius: '10px', 
                      padding: '0.1rem 0.35rem', 
                      minWidth: '16px', 
                      textAlign: 'center',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)'
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Floating Notification Drawer */}
                {isNotifDrawerOpen && (
                  <div 
                    id="notification-drawer"
                    className="glass-panel" 
                    style={{ 
                      position: 'absolute', 
                      top: '48px', 
                      right: '0', 
                      width: 'min(340px, 90vw)', 
                      maxHeight: '420px', 
                      overflowY: 'auto', 
                      zIndex: 99999, 
                      borderRadius: '14px', 
                      padding: '1rem', 
                      boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                      border: '1px solid var(--accent-cyan)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Bell size={16} color="var(--accent-cyan)" />
                        Notifications ({userNotifications.length})
                      </div>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead} 
                          style={{ background: 'none', border: 'none', color: 'var(--accent-emerald)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <CheckCheck size={14} /> Mark all read
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {userNotifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          No recent notifications for your account.
                        </div>
                      ) : (
                        userNotifications.map(n => (
                          <div 
                            key={n.id} 
                            style={{ 
                              padding: '0.65rem', 
                              borderRadius: '8px', 
                              background: n.read ? 'rgba(255,255,255,0.02)' : 'rgba(14, 165, 233, 0.08)',
                              borderLeft: `3px solid ${n.type === 'success' ? 'var(--accent-emerald)' : n.type === 'warning' ? 'var(--accent-amber)' : 'var(--accent-cyan)'}`,
                              fontSize: '0.78rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                              <span>{n.title}</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.73rem', lineHeight: '1.4' }}>
                              {n.message}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Theme Toggle Icon Button (ALWAYS Visible) */}
            <button 
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{ width: '38px', height: '38px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {theme === 'dark' ? <Sun size={18} color="var(--accent-amber)" /> : <Moon size={18} color="var(--accent-cyan)" />}
            </button>

            {/* Authenticated User Profile Avatar Circle Button */}
            {currentUser && (
              <button 
                onClick={() => setIsProfileMenuOpen(true)}
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #0284c7, #10b981)', 
                  color: '#fff', 
                  fontWeight: 900, 
                  fontSize: '0.85rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                  transition: 'transform 0.15s ease'
                }}
                title={`${currentUser.name} (${currentUser.role.toUpperCase()}) - Click for Account Options`}
              >
                {getUserInitials(currentUser.name)}
              </button>
            )}
          </div>
        </header>
      )}

      {/* User Profile & Account Settings Modal */}
      {isProfileMenuOpen && currentUser && (
        <div className="modal-overlay" onClick={() => setIsProfileMenuOpen(false)} style={{ zIndex: 99999 }}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', width: '92%', padding: '1.5rem', borderRadius: '16px' }}>
            
            {/* Account Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #0284c7, #10b981)', 
                color: '#fff', 
                fontWeight: 900, 
                fontSize: '1.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
                boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)'
              }}>
                {getUserInitials(currentUser.name)}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {currentUser.name}
              </h3>
              <span className="badge badge-success" style={{ marginTop: '0.4rem', display: 'inline-block', fontSize: '0.68rem', padding: '0.2rem 0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Role: {currentUser.role}
              </span>
            </div>

            {/* Quick Actions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
              
              {/* Password Assistance Notice */}
              <div 
                onClick={() => { setIsProfileMenuOpen(false); setIsForgotModalOpen(true); }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '0.85rem 1rem', 
                  borderRadius: '10px', 
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer'
                }}
              >
                <KeyRound size={18} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Password Assistance</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Submit password reset request directly</div>
                </div>
              </div>

              {/* Install PWA App Button */}
              <div 
                onClick={handleInstallPWA}
                style={{ 
                  display: 'flex', 
                  justify: 'space-between', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  background: 'rgba(16, 185, 129, 0.08)', 
                  padding: '0.85rem 1rem', 
                  borderRadius: '10px', 
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                  <Smartphone size={18} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>Install MG App</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Add to Home Screen for mobile access</div>
                  </div>
                </div>
                <div 
                  className="btn-icon btn-emerald" 
                  title="Install MG App to Home Screen"
                  style={{ width: '32px', height: '32px', borderRadius: '8px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '0.5rem' }}
                >
                  <Download size={16} color="#ffffff" />
                </div>
              </div>

            </div>

            {/* Logout Action Button */}
            <button 
              className="btn btn-danger" 
              onClick={() => { setIsProfileMenuOpen(false); handleLogout(); }}
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '10px', border: 'none' }}
            >
              <LogOut size={18} />
              Log Out Session
            </button>

          </div>
        </div>
      )}

      {/* Password Assistance & Reset Modal */}
      {isForgotModalOpen && (
        <div className="modal-overlay" onClick={() => setIsForgotModalOpen(false)} style={{ zIndex: 999999 }}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', width: '92%', padding: '1.75rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-amber)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <KeyRound size={20} />
              Password & Account Credentials Assistance
            </h3>

            {forgotSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ color: 'var(--accent-emerald)', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  ✓ Password Reset Request Logged!
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Your password assistance request for <strong>{forgotUser}</strong> has been transmitted to the System Administrator. Credentials will be updated shortly.
                </p>
                <button className="btn btn-secondary" onClick={() => { setIsForgotModalOpen(false); setForgotSuccess(false); setForgotUser(''); }} style={{ width: '100%' }}>
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                if (forgotUser.trim()) {
                  setForgotSuccess(true);
                }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                  Enter your login username or registered email address below to submit an instant password reset request to the Marble Gallery System Admin:
                </p>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Username or Email</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={forgotUser} 
                    onChange={(e) => setForgotUser(e.target.value)} 
                    placeholder="e.g. rajesh or rajesh.k@marblegallery.com" 
                    required 
                    style={{ height: '38px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsForgotModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-amber" style={{ flex: 1, fontWeight: 700 }}>
                    Submit Reset Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <main className={isShareRoute ? "fade-in" : "main-content fade-in"} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Render routes based on current path */}
        {(() => {
          const cleanPath = routePath.replace(/^#?\/?/, '').replace(/\/$/, '').toLowerCase();
          const is404 = !isShareRoute && cleanPath !== '' && cleanPath !== 'login' && !cleanPath.startsWith('scan/') && !['md', 'admin', 'executive', 'checker', 'manager'].includes(cleanPath);

          if (is404) {
            return <NotFoundView currentUser={currentUser} navigateTo={navigateTo} />;
          }

          if (isShareRoute) {
            return <QuotationShareView db={db} />;
          }

          if (!currentUser) {
            return <LoginView onLoginSubmit={handleLoginSubmit} />;
          }

          return (
            <>
              {currentUser.role === 'md' && (
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

              {currentUser.role === 'executive' && (
                <ExecutiveWorkspace 
                  products={db.products || []}
                  activeExecutive={(db.executives || []).find(e => e.id === currentUser.execId) || (db.executives || [])[0] || { id: 'exec-001', name: 'Showroom Executive', target: 500000, walletBalance: 0, walletLedger: [] }}
                  db={db}
                  onUpdateDb={updateDb}
                />
              )}

              {currentUser.role === 'checker' && (
                <CheckerWorkspace 
                  currentUser={currentUser}
                  db={db}
                  onUpdateDb={updateDb}
                />
              )}

              {['admin', 'manager'].includes(currentUser.role) && (
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
          );
        })()}
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

      {/* Global Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div 
          className="modal-backdrop fade-in" 
          onClick={() => { confirmModal.resolve(false); setConfirmModal(prev => ({ ...prev, isOpen: false })); }}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0, 0, 0, 0.75)', 
            zIndex: 9999999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '1rem',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            className="glass-panel" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              maxWidth: '440px', 
              width: '100%', 
              padding: '1.75rem', 
              borderRadius: '16px', 
              background: '#121824',
              border: `1px solid ${confirmModal.isDanger ? 'var(--accent-rose)' : 'var(--accent-cyan)'}`,
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              animation: 'scaleUp 0.2s ease-out'
            }}
          >
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 800, 
              color: confirmModal.isDanger ? 'var(--accent-rose)' : 'var(--accent-cyan)', 
              marginBottom: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {confirmModal.isDanger ? <ShieldAlert size={22} color="var(--accent-rose)" /> : <HelpCircle size={22} color="var(--accent-cyan)" />}
              {confirmModal.title}
            </h3>
            
            <p style={{ 
              fontSize: '0.88rem', 
              color: 'var(--text-secondary)', 
              lineHeight: '1.6', 
              marginBottom: '1.5rem',
              whiteSpace: 'pre-line'
            }}>
              {confirmModal.message}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => { confirmModal.resolve(false); setConfirmModal(prev => ({ ...prev, isOpen: false })); }}
                style={{ padding: '0.55rem 1.25rem', fontSize: '0.8rem', fontWeight: 700 }}
              >
                {confirmModal.cancelText}
              </button>
              <button 
                type="button"
                className={`btn ${confirmModal.isDanger ? 'btn-danger' : 'btn-cyan'}`} 
                onClick={() => { confirmModal.resolve(true); setConfirmModal(prev => ({ ...prev, isOpen: false })); }}
                style={{ 
                  padding: '0.55rem 1.25rem', 
                  fontSize: '0.8rem', 
                  fontWeight: 700,
                  background: confirmModal.isDanger ? 'var(--accent-rose)' : 'var(--accent-cyan)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Network Banner */}
      {isOffline && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          background: 'rgba(239, 68, 68, 0.95)',
          color: '#fff',
          padding: '0.85rem 1.5rem',
          borderRadius: '30px',
          boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          border: '1px solid rgba(255,255,255,0.2)',
          fontSize: '0.88rem',
          fontWeight: 700,
          backdropFilter: 'blur(8px)',
          animation: 'slideUp 0.3s ease'
        }}>
          <AlertTriangle size={18} className="animate-pulse" />
          <span>You are offline. Clearance Portal is running in local offline mode...</span>
        </div>
      )}

      {/* Custom PWA Installation Guide Glass Modal */}
      {isInstallModalOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsInstallModalOpen(false); }}
        >
          <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--accent-cyan)', boxShadow: '0 20px 50px rgba(56, 189, 248, 0.25)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📱 Install MG Clearance App
            </h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              <p style={{ fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '0.5rem' }}>For Android Chrome Users:</p>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Tap 3 dots (⋮) menu at top right ➔ Tap <strong>'Install app'</strong> or <strong>'Add to Home Screen'</strong>.
              </div>

              <p style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>For iPhone Safari Users:</p>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Tap Share button (bottom bar) ➔ Scroll down and tap <strong>'Add to Home Screen'</strong>.
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button className="btn btn-cyan" onClick={() => setIsInstallModalOpen(false)}>
                Got it / Close
              </button>
            </div>
          </div>
        </div>
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
          <a 
            href="#"
            style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseOver={(e) => e.target.style.color = 'var(--accent-cyan)'}
            onMouseOut={(e) => e.target.style.color = 'var(--text-secondary)'}
            onClick={(e) => { e.preventDefault(); setIsForgotModalOpen(true); }}
          >
            Forgot Password?
          </a>
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

// Customized 404 View
function NotFoundView({ currentUser, navigateTo }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '3rem 2rem',
        borderRadius: '24px',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        background: 'rgba(15, 23, 42, 0.45)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(244, 63, 94, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          border: '1px solid rgba(244, 63, 94, 0.3)'
        }}>
          <ShieldAlert size={40} color="#f43f5e" />
        </div>
        
        <h1 style={{ fontSize: '3rem', fontWeight: 900, color: '#f43f5e', margin: '0 0 0.5rem' }}>404</h1>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Page Not Found</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '2rem' }}>
          The clearance portal path you are trying to access does not exist or has been moved.
        </p>

        <button 
          onClick={() => {
            if (currentUser) {
              navigateTo(`/${currentUser.role}`);
            } else {
              navigateTo('/login');
            }
          }}
          className="btn" 
          style={{ width: '100%', padding: '0.75rem', fontWeight: 700, borderRadius: '12px', background: '#f43f5e', color: '#fff' }}
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

export default App;
