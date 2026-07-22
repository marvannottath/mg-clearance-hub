import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  QrCode, ShoppingCart, Plus, Minus, Search, 
  Send, Printer, CheckCircle, PlayCircle, XCircle, X,
  Award, TrendingUp, IndianRupee, Bell, Volume2, 
  Wallet, History, FileText, RefreshCw, BarChart2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { isWeeklySpecialActive } from '../data/mockData';

// Fail-safe wrapper to prevent security exceptions in Brave, Safari Private, and chrome Incognito mode
const safeLocalStorage = (() => {
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

function ExecutiveWorkspace({ products = [], activeExecutive = {}, db = {}, onUpdateDb }) {
  const safeProducts = products || [];
  const safeExecutive = activeExecutive || { id: 'exec-001', name: 'Showroom Executive', target: 500000, walletBalance: 0, walletLedger: [] };
  const activeExecutiveObj = safeExecutive.name ? safeExecutive : { id: 'exec-001', name: 'Showroom Executive', target: 500000, walletBalance: 0, walletLedger: [] };
  const divisionsList = ['ALL', ...Array.from(new Set(safeProducts.map(p => p.division || 'Bathing')))];
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Client Details States
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [activeMobileTab, setActiveMobileTab] = useState('catalog');
  const [mobileTab, setMobileTab] = useState('overview'); // 'overview' | 'catalog' | 'cart' | 'quotes' | 'wallet'

  // Executive Dashboard Tab States
  const [activePortalTab, setActivePortalTab] = useState('dashboard');
  const [selectedCatalogBrand, setSelectedCatalogBrand] = useState('ALL');
  const [selectedCatalogDivision, setSelectedCatalogDivision] = useState('ALL');
  const [catalogViewMode, setCatalogViewMode] = useState('list'); // 'list' | 'grid'
  
  // Salesforce Invoice Upload Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedQuoteToUpload, setSelectedQuoteToUpload] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiptFile, setReceiptFile] = useState('');

  // Quote detail modal
  const [isQuoteDetailOpen, setIsQuoteDetailOpen] = useState(false);
  const [selectedQuoteDetail, setSelectedQuoteDetail] = useState(null);

  // In-App Notification States
  const [inAppNotification, setInAppNotification] = useState(null);
  
  // Track currently edited quotation
  const [editingQuoteId, setEditingQuoteId] = useState(null);

  // Print preview states
  const [isSaleLoggerOpen, setIsSaleLoggerOpen] = useState(false);
  const [previewQuoteId, setPreviewQuoteId] = useState('');

  const [isMobile, setIsMobile] = useState(false);
  const [walletSubTab, setWalletSubTab] = useState('history'); // 'history' | 'brands'

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle redirect scanned product ID auto-selection
  useEffect(() => {
    const scanId = safeLocalStorage.getItem('mg_redirect_scan_id');
    if (scanId && products.length > 0) {
      safeLocalStorage.removeItem('mg_redirect_scan_id');
      const targetProduct = products.find(p => p.id === scanId);
      if (targetProduct) {
        if (targetProduct.stock > 0) {
          // Navigate to cart tab on mobile to display the added item
          setMobileTab('cart');
          // Add to selection
          addProductToCartDirect(targetProduct);
          showToast(`🔍 Scanned QR: ${targetProduct.name} added to Quote!`);
        } else {
          showToast(`${targetProduct.name} is currently out of clearance stock.`);
        }
      }
    }
  }, [products]);


  // Formatting currency
  const formatRupee = (value) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // V5 Price & Incentive Calculators
  const getProductFinalPrice = (product) => {
    if (isWeeklySpecialActive(product) && product.extraCustomerDiscount > 0) {
      return Math.round(product.specialPrice * (1 - product.extraCustomerDiscount / 100));
    }
    return product.specialPrice;
  };

  const getProductIncentivePct = (product, brandsTable = []) => {
    if (isWeeklySpecialActive(product) && product.weeklySpecialIncentive > 0) {
      return product.weeklySpecialIncentive;
    }
    const brandObj = brandsTable.find(b => b.name.toUpperCase() === product.brand.toUpperCase());
    return brandObj ? brandObj.executiveIncentive : 5; // default 5%
  };

  const getProductIncentiveAmount = (product, qty, brandsTable = []) => {
    const price = getProductFinalPrice(product);
    const pct = getProductIncentivePct(product, brandsTable);
    return Math.round(qty * price * (pct / 100));
  };

  // Perform autocomplete search as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.id.toLowerCase().includes(query) || 
      p.brand.toLowerCase().includes(query)
    );
    setSearchResults(filtered.slice(0, 8)); // limit to 8 suggestions
  }, [searchQuery, products]);

  // Show temporary toast message
  const showToast = (msg) => {
    setToast(msg);
  };

  // Auto-clear toast after 3s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Web Audio Chime Synthesizer
  const playNotificationChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = ctx.currentTime;
      playTone(523.25, now, 0.25);       // C5
      playTone(659.25, now + 0.12, 0.25); // E5
      playTone(783.99, now + 0.24, 0.25); // G5
      playTone(1046.50, now + 0.36, 0.5);  // C6
    } catch (e) {
      console.warn("Web Audio chime could not be played:", e);
    }
  };

  // Notification Trigger
  const triggerNotification = (type) => {
    let msg = "";
    const name = activeExecutive.name.split(' ')[0];
    
    // Sum total cleared sales from salesLedger for this executive
    const execSales = db.salesLedger || [];
    const execTodaySales = execSales.filter(s => s.executiveId === activeExecutive.id);
    const todayLiquidity = execTodaySales.reduce((sum, s) => sum + s.totalPaid, 0);
    
    if (type === 'morning') {
      msg = `Good morning, ${name}! Thank you for your support. Today we planned special clearance items. Let's start strong!`;
    } else if (type === 'afternoon') {
      msg = `Good afternoon, ${name}! You have generated ₹${todayLiquidity.toLocaleString('en-IN')} in stock liquidity today. Keep it up, do more!`;
    } else if (type === 'evening') {
      msg = `Good evening, ${name}! Thank you for your support. Total liquidity achieved today is ₹${todayLiquidity.toLocaleString('en-IN')}. Excellent work!`;
    }
    
    setInAppNotification({
      message: msg,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    });
    playNotificationChime();
  };

  // Close toast notification after 8 seconds
  useEffect(() => {
    if (inAppNotification) {
      const timer = setTimeout(() => setInAppNotification(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [inAppNotification]);

  // Real-time notifications check (once per time slot per day)
  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const hours = now.getHours();
      const mins = now.getMinutes();
      const todayStr = now.toDateString(); // e.g. "Wed Jun 24 2026"
      
      let sent = {};
      try {
        sent = JSON.parse(safeLocalStorage.getItem('mg_sent_notifications') || '{}');
      } catch (e) {
        sent = {};
      }
      
      let triggeredType = null;
      
      // Target time slots:
      // Morning announcement around 9:30 AM (9:30 - 10:00)
      // Midday update around 2:00 PM (14:00 - 14:30)
      // Evening support message around 7:00 PM (19:00 - 19:30)
      if (hours === 9 && mins >= 30 && sent.morning !== todayStr) {
        triggeredType = 'morning';
      } else if (hours === 14 && mins >= 0 && sent.afternoon !== todayStr) {
        triggeredType = 'afternoon';
      } else if (hours === 19 && mins >= 0 && sent.evening !== todayStr) {
        triggeredType = 'evening';
      }
      
      if (triggeredType) {
        triggerNotification(triggeredType);
        sent[triggeredType] = todayStr;
        safeLocalStorage.setItem('mg_sent_notifications', JSON.stringify(sent));
      }
    };

    // Run check immediately on mount
    checkNotifications();
    
    // Check every 30 seconds
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [db.salesLedger, activeExecutive]);

  // Start selection customer session
  const startSession = () => {
    setIsSessionActive(true);
    setCart([]);
    setCustomerName('');
    setCustomerMobile('');
    setActiveMobileTab('catalog');
    setMobileTab('catalog');
  };

  // End/Cancel customer session
  const endSession = async () => {
    if (cart.length > 0 && !(await window.customConfirm(
      "End Customer Session",
      "Discard current selection and end customer session?",
      true,
      "Discard"
    ))) {
      return;
    }
    setIsSessionActive(false);
    setCart([]);
    setSearchQuery('');
    setSearchResults([]);
    setCustomerName('');
    setCustomerMobile('');
    setActiveMobileTab('catalog');
    setMobileTab('overview');
  };

  // Add to cart directly (qty +1)
  const addProductToCartDirect = (product) => {
    if (product.stock === 0) {
      showToast(`${product.name} is currently out of clearance stock.`);
      return;
    }

    let success = true;
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        const combinedQty = existingItem.qty + 1;
        if (combinedQty > product.stock) {
          showToast(`Insufficient stock. Only ${product.stock} units available in showroom clearance.`);
          success = false;
          return prevCart;
        }
        return prevCart.map(item => 
          item.id === product.id ? { ...item, qty: combinedQty } : item
        );
      }
      return [...prevCart, { ...product, qty: 1 }];
    });

    if (success) {
      showToast(`Added ${product.name} (${product.id}) to selection.`);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const updateCartQty = (productId, newQty, maxStock) => {
    const qty = parseInt(newQty) || 0;
    if (qty > maxStock) {
      showToast(`Insufficient stock. Only ${maxStock} units available.`);
      return;
    }
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart => 
      prevCart.map(item => item.id === productId ? { ...item, qty } : item)
    );
  };

  const removeFromCart = (productId) => {
    const item = cart.find(i => i.id === productId);
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
    if (item) {
      showToast(`Removed ${item.name} from selection.`);
    }
  };

  // QR Code Scanner Logic using Html5Qrcode directly (programmatic startup, no built-in UI buttons)
  useEffect(() => {
    let html5QrCode = null;
    if (isScannerOpen) {
      setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode("qr-reader-element");
          
          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              const cleanText = (decodedText || '').trim().toUpperCase();
              const skuMatch = cleanText.match(/SA\d+/i) || cleanText.match(/PROD-\d+/i) || cleanText.match(/MG-[A-Z]+-\d+/i);
              const extractedCode = skuMatch ? skuMatch[0].toUpperCase() : cleanText;

              const product = products.find(p => {
                const pId = p.id.toUpperCase();
                
                // 1. Direct match or either string is a substring of the other
                if (cleanText.includes(pId) || pId.includes(cleanText) || extractedCode === pId) {
                  return true;
                }
                
                // 2. Name or Code substring match
                if (p.name && cleanText.includes(p.name.toUpperCase())) {
                  return true;
                }
                
                return false;
              });
              
              if (product) {
                addProductToCartDirect(product);
                setIsScannerOpen(false);
                try {
                  html5QrCode.stop().catch(() => {});
                } catch (e) {}
              } else {
                showToast(`Scanned code: "${decodedText}". Item SKU not found in clearance catalog.`);
              }
            },
            (errorMessage) => {
              // silence scan failure errors
            }
          ).catch((err) => {
            console.error("Failed to start camera", err);
          });
        } catch (e) {
          console.error("Scanner failed to mount", e);
        }
      }, 300);
    }

    return () => {
      if (html5QrCode) {
        try {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().catch(e => console.warn(e));
          }
        } catch (e) {
          // ignore
        }
      }
    };
  }, [isScannerOpen, products]);

  // Simulate scanning of product
  const handleSimulateScan = (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      addProductToCartDirect(product);
    }
  };

  // Cart Calculations
  const cartTotalPaid = cart.reduce((sum, item) => sum + (getProductFinalPrice(item) * item.qty), 0);
  const cartTotalMrp = cart.reduce((sum, item) => sum + (item.mrp * item.qty), 0);
  const totalSavings = cartTotalMrp - cartTotalPaid;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // Generate WhatsApp compressed Base64 URL link
  // Generate WhatsApp clean short URL link
  const generateWhatsAppLink = () => {
    if (!customerMobile) {
      showToast("Please enter the customer's WhatsApp/Mobile number first.");
      return;
    }

    const currentQuoteId = editingQuoteId || `MG-QT-${Date.now().toString().slice(-6)}`;

    // Ensure quote exists in db.quotations for short URL lookup
    const newQuote = {
      id: currentQuoteId,
      customerName: customerName.trim() || 'Walk-in Showroom Client',
      customerMobile: customerMobile || 'N/A',
      customerAddress: customerAddress || '',
      customerLocation: (customerAddress || '').trim() || 'N/A',
      executiveId: activeExecutive.id,
      executiveName: activeExecutive.name,
      items: cart.map(item => ({
        id: item.id,
        productId: item.id,
        name: item.name,
        brand: item.brand,
        qty: item.qty,
        mrp: item.mrp,
        specialPrice: getProductFinalPrice(item),
        division: item.division || 'Bathing',
        size: item.division === 'Tiles' ? item.size : undefined,
        finishing: item.division === 'Tiles' ? item.finishing : undefined,
        location: item.division === 'Tiles' ? item.location : undefined
      })),
      status: 'draft',
      date: new Date().toISOString(),
      invoiceNo: '',
      uploadedBill: '',
      incentiveAmount: cart.reduce((sum, item) => sum + getProductIncentiveAmount(item, item.qty, db.brands), 0)
    };

    const existingQuotes = db.quotations || [];
    const quoteExists = existingQuotes.some(q => q.id === currentQuoteId);
    const updatedQuotes = quoteExists 
      ? existingQuotes.map(q => q.id === currentQuoteId ? { ...q, ...newQuote } : q)
      : [...existingQuotes, newQuote];

    onUpdateDb({ ...db, quotations: updatedQuotes });

    const shortShareUrl = `${window.location.origin}/#/share/${currentQuoteId}`;
    
    let cleanMobile = customerMobile.replace(/\D/g, '');
    if (cleanMobile.length === 10) {
      cleanMobile = '91' + cleanMobile;
    }

    let messageText = `*MARBLE GALLERY SPECIAL OFFERS* 💎🛁\n`;
    messageText += `-----------------------------------------\n`;
    messageText += `Hi ${customerName.trim() || 'Valued Client'}!\n`;
    messageText += `Here is your special price quotation. Click the link below to view/download your PDF sheet:\n\n`;
    messageText += `${shortShareUrl}\n\n`;
    messageText += `*Offer Total: ${formatRupee(cartTotalPaid)}*\n`;
    messageText += `🎉 *Your Net Savings: ${formatRupee(totalSavings)}* (Save ${cartTotalMrp > 0 ? ((totalSavings/cartTotalMrp)*100).toFixed(0) : 0}%)\n`;
    messageText += `-----------------------------------------\n`;
    messageText += `Shared by: *${activeExecutive.name}* (Marble Gallery)\n`;

    const encodedText = encodeURIComponent(messageText);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanMobile}&text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  // Save Quotation as Draft
  const handleSaveQuotation = () => {
    let updatedQuotes;
    let quoteId = editingQuoteId;
    
    if (editingQuoteId) {
      // Edit existing quotation
      updatedQuotes = (db.quotations || []).map(q => {
        if (q.id === editingQuoteId) {
          return {
            ...q,
            customerName: customerName.trim() || 'Walk-in Showroom Client',
            customerMobile: customerMobile || 'N/A',
            items: cart.map(item => ({
              id: item.id,
              productId: item.id,
              name: item.name,
              brand: item.brand,
              qty: item.qty,
              mrp: item.mrp,
              specialPrice: getProductFinalPrice(item),
              incentivePct: getProductIncentivePct(item, db.brands),
              division: item.division || 'Bathing',
              size: item.division === 'Tiles' ? item.size : undefined,
              finishing: item.division === 'Tiles' ? item.finishing : undefined,
              location: item.division === 'Tiles' ? item.location : undefined
            })),
            status: q.status === 'rejected' || q.status === 'pending_verification' ? 'draft' : q.status, // reset to draft if edited from rejected/pending
            date: new Date().toISOString(),
            incentiveAmount: cart.reduce((sum, item) => sum + getProductIncentiveAmount(item, item.qty, db.brands), 0)
          };
        }
        return q;
      });
      showToast(`Quotation ${editingQuoteId} updated successfully.`);
      setEditingQuoteId(null);
    } else {
      // Create new quotation
      quoteId = `MG-QT-${Date.now().toString().slice(-6)}`;
      const newQuote = {
        id: quoteId,
        customerName: customerName.trim() || 'Walk-in Showroom Client',
        customerMobile: customerMobile || 'N/A',
        executiveId: activeExecutive.id,
        executiveName: activeExecutive.name,
        items: cart.map(item => ({
          id: item.id,
          productId: item.id,
          name: item.name,
          brand: item.brand,
          qty: item.qty,
          mrp: item.mrp,
          specialPrice: getProductFinalPrice(item),
          incentivePct: getProductIncentivePct(item, db.brands),
          division: item.division || 'Bathing',
          size: item.division === 'Tiles' ? item.size : undefined,
          finishing: item.division === 'Tiles' ? item.finishing : undefined,
          location: item.division === 'Tiles' ? item.location : undefined
        })),
        status: 'draft',
        date: new Date().toISOString(),
        invoiceNo: '',
        uploadedBill: '',
        incentiveAmount: cart.reduce((sum, item) => sum + getProductIncentiveAmount(item, item.qty, db.brands), 0)
      };
      updatedQuotes = [...(db.quotations || []), newQuote];
      showToast(`Quotation ${quoteId} saved as draft.`);
    }

    onUpdateDb({ ...db, quotations: updatedQuotes });
    setIsSessionActive(false);
    setCart([]);
    setCustomerName('');
    setCustomerMobile('');
    setActivePortalTab('quotes');
    setMobileTab('quotes');
  };

  // Reload Draft/Pending/Rejected Quotation to active cart
  const handleReloadDraft = (quote) => {
    setCustomerName(quote.customerName);
    setCustomerMobile(quote.customerMobile === 'N/A' ? '' : quote.customerMobile);
    
    // Load products mapping quantities
    const reloadedCart = [];
    quote.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId || p.id === item.id);
      if (prod) {
        reloadedCart.push({ ...prod, qty: item.qty });
      }
    });

    setCart(reloadedCart);
    setEditingQuoteId(quote.id);
    
    // If the quote was pending_verification or rejected, reset its status to draft in the database
    if (quote.status !== 'draft') {
      const updatedQuotes = (db.quotations || []).map(q => {
        if (q.id === quote.id) {
          return { ...q, status: 'draft' };
        }
        return q;
      });
      onUpdateDb({ ...db, quotations: updatedQuotes });
    }

    setIsSessionActive(true);
    setActivePortalTab('dashboard'); // Switch to active cart tab
    setActiveMobileTab('cart');
    setMobileTab('cart');
  };

  // Clear Cart & reset edit session
  const handleClearCart = () => {
    setCart([]);
    setEditingQuoteId(null);
    setCustomerName('');
    setCustomerMobile('');
    setIsSessionActive(false);
    showToast("Active cart and selection cleared.");
    setMobileTab('overview');
  };

  const handleDeleteQuotation = async (quoteId) => {
    const targetQuote = (db.quotations || []).find(q => q.id === quoteId);
    if (!targetQuote) return;

    if (!(await window.customConfirm(
      "Delete Quotation",
      `Are you sure you want to delete quotation ${quoteId}?`,
      true,
      "Delete"
    ))) {
      return;
    }

    let updatedProducts = [...(db.products || [])];
    if (targetQuote.stockDeducted) {
      targetQuote.items.forEach(item => {
        updatedProducts = updatedProducts.map(p => {
          if (p.id === item.productId || p.id === item.id) {
            return { ...p, stock: (p.stock || 0) + item.qty };
          }
          return p;
        });
      });
    }

    const updatedQuotes = (db.quotations || []).filter(q => q.id !== quoteId);
    onUpdateDb({
      ...db,
      products: updatedProducts,
      quotations: updatedQuotes
    });
    showToast(targetQuote.stockDeducted ? `Quotation ${quoteId} deleted & stock released back to inventory!` : `Quotation ${quoteId} deleted successfully.`);
  };

  // Print preview functions
  const handlePrintQuotation = () => {
    window.print();
  };

  const handleOpenPrintPreview = () => {
    if (editingQuoteId) {
      setPreviewQuoteId(editingQuoteId);
    } else {
      setPreviewQuoteId(`MG-QT-${Date.now().toString().slice(-6)}`);
    }
    setIsSaleLoggerOpen(true);
  };

  // Open Salesforce Upload modal
  const openUploadModal = (quote) => {
    setSelectedQuoteToUpload(quote);
    setInvoiceNumber('');
    setReceiptFile('');
    setIsUploadModalOpen(true);
  };

  // Submit Salesforce Invoice (Deducts Main Stock immediately)
  const handleInvoiceSubmit = (e) => {
    e.preventDefault();
    if (!invoiceNumber.trim() || !receiptFile) {
      showToast("Please provide the Salesforce Invoice number and receipt file.");
      return;
    }

    // Deduct stock for items in this quotation immediately upon invoice upload
    let updatedProducts = [...(db.products || [])];
    selectedQuoteToUpload.items.forEach(item => {
      updatedProducts = updatedProducts.map(p => {
        if (p.id === item.productId || p.id === item.id) {
          const currentStock = p.stock || 0;
          return { ...p, stock: Math.max(0, currentStock - item.qty) };
        }
        return p;
      });
    });

    const updatedQuotes = (db.quotations || []).map(q => {
      if (q.id === selectedQuoteToUpload.id) {
        return {
          ...q,
          invoiceNo: invoiceNumber.trim().toUpperCase(),
          uploadedBill: receiptFile,
          status: 'pending_verification',
          stockDeducted: true,
          date: new Date().toISOString()
        };
      }
      return q;
    });

    // Send Notification to Manager & Checker
    const newNotif = {
      id: `notif-${Date.now()}`,
      targetRole: 'manager',
      title: 'Invoice Submitted & Stock Deducted',
      message: `${activeExecutive.name} uploaded invoice #${invoiceNumber.trim().toUpperCase()} for ${selectedQuoteToUpload.customerName}. Stock deducted from inventory.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'info'
    };

    onUpdateDb({ 
      ...db, 
      products: updatedProducts, 
      quotations: updatedQuotes,
      notifications: [newNotif, ...(db.notifications || [])]
    });
    
    setIsUploadModalOpen(false);
    setSelectedQuoteToUpload(null);
    showToast("Salesforce bill uploaded! Stock deducted & submitted to Manager for incentive verification.");
  };

  // Payout request payout handler
  const handleRequestPayout = async () => {
    const currentBalance = activeExecutive.walletBalance || 0;
    if (currentBalance <= 0) {
      showToast("No cleared earnings available in your wallet to disburse.");
      return;
    }

    if (!(await window.customConfirm(
      "Request Cash Payout",
      `Are you sure you want to request payout for ${formatRupee(currentBalance)}?`,
      false
    ))) {
      return;
    }

    const transaction = {
      id: `TX-${Date.now().toString().slice(-4)}`,
      type: 'payout',
      amount: -currentBalance,
      description: `Wallet withdrawal request filed by executive`,
      date: new Date().toISOString()
    };

    const updatedExecutives = db.executives.map(e => {
      if (e.id === activeExecutive.id) {
        return {
          ...e,
          walletBalance: 0,
          walletLedger: [transaction, ...(e.walletLedger || [])]
        };
      }
      return e;
    });

    onUpdateDb({ ...db, executives: updatedExecutives });
    showToast("Withdrawal requested! Balance cleared from wallet.");
  };

  // Filter visual catalog by selected brand
  const filteredProducts = products.filter(p => {
    const matchesBrand = selectedCatalogBrand === 'ALL' || p.brand.toUpperCase() === selectedCatalogBrand.toUpperCase();
    const matchesDivision = selectedCatalogDivision === 'ALL' || (p.division || 'Bathing').toLowerCase() === selectedCatalogDivision.toLowerCase();
    return matchesBrand && matchesDivision;
  });

  // Calculate Brand Performance Graph data for this executive
  const getBrandSalesData = () => {
    const brandMap = {};
    (db.brands || []).forEach(b => {
      brandMap[b.name.toUpperCase()] = 0;
    });
    brandMap['OTHER'] = 0;

    const execSales = db.salesLedger.filter(s => s.executiveId === activeExecutive.id);
    execSales.forEach(sale => {
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const brand = prod ? prod.brand.toUpperCase() : 'OTHER';
        if (brandMap[brand] !== undefined) {
          brandMap[brand] += item.pricePaid * item.qty;
        }
      });
    });

    return Object.keys(brandMap).map(key => ({
      name: key,
      Sales: brandMap[key]
    }));
  };

  if (!activeExecutive) {
    return (
      <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', margin: '2rem auto', maxWidth: '500px' }}>
        <h2 style={{ color: 'var(--accent-rose)', fontSize: '1.5rem', marginBottom: '1rem' }}>Session Error</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          We could not load your executive workspace details. Please try logging out and logging back in.
        </p>
      </div>
    );
  }

  // Calculate remaining target and liquidity generated
  const execSalesLogs = db.salesLedger.filter(s => s.executiveId === activeExecutive.id);
  const clearedLiquidityVal = execSalesLogs.reduce((sum, s) => sum + s.totalPaid, 0);
  const remainingTarget = Math.max(0, activeExecutive.target - clearedLiquidityVal);

  const weeklySpecials = products.filter(p => isWeeklySpecialActive(p));

  // Mobile UI Helper Render Functions
  const renderMobileOverview = () => {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Profile / Greeting Card */}
        <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
            {(() => {
              const hour = new Date().getHours();
              if (hour >= 5 && hour < 12) return '🌅 Good Morning';
              if (hour >= 12 && hour < 17) return '☀️ Good Afternoon';
              return '🌆 Good Evening';
            })()}, {activeExecutive.name.split(' ')[0]}!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            Showroom floor clearance helper. Select products and generate quick customer quotes.
          </p>
          
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            {isSessionActive ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ACTIVE CLIENT SESSION</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-emerald)' }}>
                    {customerName || 'Walk-in Client'}
                  </div>
                </div>
                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={endSession}>
                  Cancel Session
                </button>
              </div>
            ) : (
              <div>
                <button className="btn btn-cyan" style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem', fontWeight: 700, display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center', borderRadius: '8px' }} onClick={startSession}>
                  <ShoppingCart size={16} />
                  Start Customer Session
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Target and KPI progress - Premium Visual Upgrade */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Award size={18} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>Target Progress</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {((clearedLiquidityVal / activeExecutive.target) * 100) >= 100 ? (
                <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', fontWeight: 800 }}>🏆 Target Achieved!</span>
              ) : (
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'var(--accent-cyan-glow)', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 700 }}>
                  🎯 In Progress
                </span>
              )}
              <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--accent-cyan)', letterSpacing: '-0.03em' }}>
                {activeExecutive.target > 0 ? ((clearedLiquidityVal / activeExecutive.target) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
          
          {/* Animated Gradient Progress Bar */}
          <div style={{ position: 'relative', width: '100%', height: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', overflow: 'hidden', padding: '2px', border: '1px solid var(--border-color)' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${Math.max(1.5, Math.min(100, (clearedLiquidityVal / activeExecutive.target) * 100))}%`,
                background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 100%)',
                borderRadius: '8px',
                boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)',
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>CLEARED REVENUE</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--accent-emerald)', marginTop: '0.1rem' }}>{formatRupee(clearedLiquidityVal)}</div>
            </div>
            <div style={{ background: 'rgba(6, 182, 212, 0.05)', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>CAMPAIGN TARGET</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: '0.1rem' }}>{formatRupee(activeExecutive.target)}</div>
            </div>
          </div>
        </div>

        {/* Weekly Specials Showcase */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Volume2 size={16} color="var(--accent-amber)" />
            <span>Weekly Clearance Deals</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {weeklySpecials.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                No weekly specials configured.
              </div>
            ) : (
              weeklySpecials.map(p => {
                const finalPrice = getProductFinalPrice(p);
                const incentivePct = getProductIncentivePct(p, db.brands);
                const isInCart = cart.some(item => item.id === p.id);
                
                return (
                  <div key={p.id} className="glass-panel" style={{ padding: '0.9rem', border: '1px solid rgba(245,158,11,0.2)', background: 'var(--bg-card)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span className={`brand-pill ${p.brand.toLowerCase()}`} style={{ fontSize: '0.6rem' }}>{p.brand}</span>
                      <span className="badge badge-warning" style={{ fontSize: '0.55rem', padding: '0.1rem 0.35rem', fontWeight: 700 }}>
                        {p.extraCustomerDiscount > 0 ? `${p.extraCustomerDiscount}% EXTRA OFF` : `${incentivePct}% INCENTIVE`}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Code: {p.id} | Stock: {p.stock}</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-rose)' }}>{formatRupee(finalPrice)}</span>
                        <span style={{ fontSize: '0.7rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatRupee(p.mrp)}</span>
                      </div>
                      
                      {isInCart ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <CheckCircle size={14} /> Added
                        </span>
                      ) : (
                        <button className="btn btn-emerald" style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, borderRadius: '6px' }} onClick={() => {
                          if (!isSessionActive) {
                            setIsSessionActive(true);
                            setCustomerName('Walk-in Client');
                            setCustomerMobile('N/A');
                            showToast("Started session for Walk-in Client.");
                          }
                          addProductToCartDirect(p);
                        }}>
                          + Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    );
  };

  const renderMobileCatalog = () => {
    const brandsList = ['ALL', ...new Set(products.map(p => p.brand))];
    
    const activeProducts = products.filter(p => {
      const matchBrand = selectedCatalogBrand === 'ALL' || p.brand === selectedCatalogBrand;
      const matchDivision = selectedCatalogDivision === 'ALL' || (p.division || 'Bathing').toLowerCase() === selectedCatalogDivision.toLowerCase();
      const matchSearch = !searchQuery.trim() || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.brand.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBrand && matchDivision && matchSearch;
    });

    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Search & Scan Row */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by code, brand..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2rem', height: '40px', fontSize: '0.85rem' }}
            />
            {searchQuery && (
              <button style={{ position: 'absolute', right: '10px', top: '10px', border: 'none', background: 'transparent', color: 'var(--text-muted)' }} onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>
          
          <button className="btn btn-emerald" style={{ padding: '0', width: '40px', height: '40px', minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }} onClick={() => setIsScannerOpen(true)}>
            <QrCode size={20} />
          </button>
        </div>

        {/* Division Selector */}
        <div style={{ display: 'flex', gap: '0.25rem', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '2px', background: 'rgba(0,0,0,0.2)', width: 'fit-content' }}>
          {divisionsList.map(divOpt => (
            <button
              key={divOpt}
              className={`brand-pill`}
              style={{ 
                fontSize: '0.7rem', 
                padding: '0.25rem 0.75rem', 
                background: selectedCatalogDivision === divOpt ? 'var(--accent-cyan)' : 'transparent',
                color: selectedCatalogDivision === divOpt ? '#000' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '20px',
                fontWeight: selectedCatalogDivision === divOpt ? 700 : 500,
                cursor: 'pointer'
              }}
              onClick={() => setSelectedCatalogDivision(divOpt)}
            >
              {divOpt === 'ALL' ? 'All' : divOpt}
            </button>
          ))}
        </div>

        {/* Brand filters */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'none' }} className="no-scrollbar">
          {brandsList.map(b => (
            <button 
              key={b} 
              className={`brand-pill ${b.toLowerCase()} ${selectedCatalogBrand === b ? 'active' : ''}`}
              style={{ 
                flexShrink: 0, 
                fontSize: '0.7rem', 
                padding: '0.35rem 0.75rem', 
                border: '1px solid var(--border-color)',
                background: selectedCatalogBrand === b ? 'var(--accent-cyan-glow)' : 'var(--bg-card)',
                color: selectedCatalogBrand === b ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: selectedCatalogBrand === b ? 700 : 500,
                borderRadius: '20px',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedCatalogBrand(b)}
            >
              {b}
            </button>
          ))}
        </div>

        {/* QR Scanner Box */}
        {isScannerOpen && (
          <div className="glass-panel" style={{ padding: '1rem', border: '2px solid var(--accent-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Scanner Active</span>
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => setIsScannerOpen(false)}>
                Close
              </button>
            </div>
            <div id="qr-reader-element" style={{ width: '100%', background: '#000', borderRadius: '8px', overflow: 'hidden' }}></div>
          </div>
        )}

        {/* Product Catalog list */}
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Showing {activeProducts.length} showroom clearance items
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeProducts.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No matching clearance products found.
              </div>
            ) : (
              activeProducts.map(p => {
                const finalPrice = getProductFinalPrice(p);
                const incentivePct = getProductIncentivePct(p, db.brands);
                const cartItem = cart.find(item => item.id === p.id);
                
                return (
                  <div key={p.id} className="glass-panel" style={{ padding: '0.85rem', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`brand-pill ${p.brand.toLowerCase()}`} style={{ fontSize: '0.6rem' }}>{p.brand}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Stock: <strong>{p.stock}</strong></span>
                    </div>
                    
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      Code: {p.id}
                      {p.division === 'Tiles' && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', background: 'rgba(255,255,255,0.02)', padding: '0.35rem 0.5rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                          <span>📏 Size: <strong>{p.size || 'N/A'}</strong></span>
                          <span>✨ Finish: <strong>{p.finishing || 'N/A'}</strong></span>
                          <span style={{ color: 'var(--accent-cyan)' }}>📍 Loc: <strong>{p.location || 'N/A'}</strong></span>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-rose)' }}>{formatRupee(finalPrice)}</span>
                          <span style={{ fontSize: '0.7rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatRupee(p.mrp)}</span>
                        </div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--accent-cyan)', marginTop: '0.1rem' }}>
                          Incentive: {incentivePct}% ({formatRupee(getProductIncentiveAmount(p, 1, db.brands))}/unit)
                        </div>
                      </div>

                      {cartItem ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.5rem', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                          <button 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.2rem' }}
                            onClick={() => updateCartQty(p.id, cartItem.qty - 1, p.stock)}
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', minWidth: '16px', textAlign: 'center' }}>
                            {cartItem.qty}
                          </span>
                          <button 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.2rem' }}
                            onClick={() => updateCartQty(p.id, cartItem.qty + 1, p.stock)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-cyan" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: '6px' }} onClick={() => {
                          if (!isSessionActive) {
                            setIsSessionActive(true);
                            setCustomerName('Walk-in Client');
                            setCustomerMobile('N/A');
                            showToast("Started session for Walk-in Client.");
                          }
                          addProductToCartDirect(p);
                        }}>
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    );
  };

  const renderMobileCart = () => {
    const totalIncentive = cart.reduce((sum, item) => sum + getProductIncentiveAmount(item, item.qty, db.brands), 0);

    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Client details */}
        <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-card)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
            Client Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.65rem' }}>Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (!isSessionActive && e.target.value.trim()) {
                      setIsSessionActive(true);
                    }
                  }}
                  style={{ height: '36px', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.65rem' }}>WhatsApp Mobile</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="10-digit number"
                  value={customerMobile}
                  onChange={(e) => {
                    setCustomerMobile(e.target.value);
                    if (!isSessionActive && e.target.value.trim()) {
                      setIsSessionActive(true);
                    }
                  }}
                  style={{ height: '36px', fontSize: '0.8rem' }}
                />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.65rem' }}>Client Location / Address</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Calicut, Kerala"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  style={{ height: '36px', fontSize: '0.8rem' }}
                />
              </div>
            </div>
            
            {editingQuoteId && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                  Editing Quote: {editingQuoteId}
                </span>
                <button 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 700 }}
                  onClick={() => setEditingQuoteId(null)}
                >
                  Clear Edit Mode
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cart items list */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Selected Items ({cart.length})</span>
            {cart.length > 0 && (
              <button 
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={handleClearCart}
              >
                Clear Cart
              </button>
            )}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cart.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <ShoppingCart size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>No products added to customer quote sheet.</p>
                <button className="btn btn-cyan" style={{ padding: '0.45rem 1rem', fontSize: '0.75rem' }} onClick={() => setMobileTab('catalog')}>
                  Browse Catalog
                </button>
              </div>
            ) : (
              cart.map(item => {
                const itemTotal = getProductFinalPrice(item) * item.qty;
                return (
                  <div key={item.id} className="glass-panel" style={{ padding: '0.75rem', background: 'var(--bg-card)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.brand} | {item.id}</div>
                        {item.division === 'Tiles' && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            📏 {item.size || 'N/A'} | ✨ {item.finishing || 'N/A'} | 📍 Loc: {item.location || 'N/A'}
                          </div>
                        )}
                      </div>
                      <button 
                        style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }} 
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button 
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}
                          onClick={() => updateCartQty(item.id, item.qty - 1, item.stock)}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, width: '16px', textAlign: 'center' }}>{item.qty}</span>
                        <button 
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}
                          onClick={() => updateCartQty(item.id, item.qty + 1, item.stock)}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-rose)' }}>{formatRupee(itemTotal)}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                          Inc: {formatRupee(getProductIncentiveAmount(item, item.qty, db.brands))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Calculation summary */}
        {cart.length > 0 && (
          <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>Total MRP Value</span>
              <span style={{ textDecoration: 'line-through' }}>{formatRupee(cartTotalMrp)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>Special Discount Savings</span>
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>-{formatRupee(totalSavings)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span>Quote Total Clearance Price</span>
              <span style={{ color: 'var(--accent-rose)', fontSize: '0.95rem' }}>{formatRupee(cartTotalPaid)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'var(--accent-cyan-glow)', padding: '0.4rem', borderRadius: '4px', marginTop: '0.25rem' }}>
              <span>Estimated incentive earned:</span>
              <strong>{formatRupee(totalIncentive)}</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
              {editingQuoteId ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-cyan" style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', fontWeight: 700 }} onClick={handleSaveQuotation}>
                    Update Quote
                  </button>
                  <button className="btn btn-emerald" style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', fontWeight: 700 }} onClick={() => { setEditingQuoteId(null); handleSaveQuotation(); }}>
                    Save as New
                  </button>
                </div>
              ) : (
                <button className="btn btn-cyan" style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', fontWeight: 700 }} onClick={handleSaveQuotation}>
                  Save Draft Quote
                </button>
              )}
              
              <button className="btn btn-emerald" style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', fontWeight: 700, display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }} onClick={generateWhatsAppLink}>
                <Send size={14} />
                Share Quote on WhatsApp
              </button>
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderMobileQuotes = () => {
    const quotes = (db.quotations || []).filter(q => q.executiveId === activeExecutive.id);

    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          My Quotation Sheets ({quotes.length})
        </h3>

        {quotes.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <FileText size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <p style={{ fontSize: '0.8rem' }}>No quotation sheets saved yet. Start customer session to build quotes.</p>
          </div>
        ) : (
          quotes.map(q => {
            const totalValue = q.items.reduce((s,i) => s + (i.specialPrice * i.qty), 0);
            
            let statusColor = 'var(--text-secondary)';
            if (q.status === 'draft') statusColor = 'var(--accent-amber)';
            else if (q.status === 'pending_verification') statusColor = 'var(--accent-cyan)';
            else if (q.status === 'verified') statusColor = 'var(--accent-emerald)';
            else if (q.status === 'rejected') statusColor = 'var(--accent-rose)';

            return (
              <div key={q.id} className="glass-panel" style={{ padding: '0.9rem', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{q.id}</span>
                  <span style={{ 
                    fontSize: '0.6rem', 
                    padding: '0.15rem 0.4rem', 
                    borderRadius: '4px', 
                    background: 'rgba(255,255,255,0.03)', 
                    color: statusColor, 
                    fontWeight: 700,
                    border: `1px solid ${statusColor}40`
                  }}>
                    {q.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', margin: '0.5rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <div>
                    <strong>Client:</strong> {q.customerName}<br/>
                    <strong>Date:</strong> {new Date(q.date).toLocaleDateString('en-IN')}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>Value:</strong> <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>{formatRupee(totalValue)}</span><br/>
                    <strong>Inc:</strong> <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{formatRupee(q.incentiveAmount)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: '0.35rem', fontSize: '0.7rem', display: 'flex', gap: '0.2rem', alignItems: 'center', justifyContent: 'center' }} 
                    onClick={() => {
                      setSelectedQuoteDetail(q);
                      setIsQuoteDetailOpen(true);
                    }}
                  >
                    View Details
                  </button>

                  <button 
                    className="btn btn-cyan" 
                    style={{ flex: 1, padding: '0.35rem', fontSize: '0.7rem', display: 'flex', gap: '0.2rem', alignItems: 'center', justifyContent: 'center' }} 
                    onClick={() => {
                      if (q.status === 'pending_verification' || q.status === 'rejected') {
                        if (confirm("Editing this quotation will cancel its pending/rejected status and set it back to Draft. Proceed?")) {
                          handleReloadDraft(q);
                          setMobileTab('cart');
                        }
                      } else {
                        handleReloadDraft(q);
                        setMobileTab('cart');
                      }
                    }}
                  >
                    Edit / Load
                  </button>

                  {(q.status === 'draft' || q.status === 'rejected') && (
                    <button 
                      className="btn btn-emerald" 
                      style={{ flex: 1, padding: '0.35rem', fontSize: '0.7rem', display: 'flex', gap: '0.2rem', alignItems: 'center', justifyContent: 'center' }} 
                      onClick={() => openUploadModal(q)}
                    >
                      Verify
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderMobileWallet = () => {
    const ledger = activeExecutive.walletLedger || [];
    const brandsSalesData = getBrandSalesData();

    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Wallet Credit Card */}
        <div className="glass-panel" style={{
          padding: '1.25rem',
          background: 'linear-gradient(135deg, #091a3c 0%, #06b6d4 100%)',
          borderRadius: '16px',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(6,182,212,0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', right: '1.25rem', top: '1.25rem', opacity: 0.25 }}>
            <Wallet size={48} />
          </div>
          
          <div style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Showroom Executive Balance Card
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.5rem 0' }}>
            {formatRupee(activeExecutive.walletBalance || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
            Card Holder: {activeExecutive.name}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.55rem', opacity: 0.7, textTransform: 'uppercase' }}>Cleared Earnings</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                {formatRupee(ledger.filter(t => t.type === 'commission').reduce((s,t) => s + t.amount, 0))}
              </div>
            </div>
            
            <button className="btn btn-emerald" style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, background: '#fff', color: '#0f172a', border: 'none', borderRadius: '8px' }} onClick={handleRequestPayout}>
              Payout Cashout
            </button>
          </div>
        </div>

        {/* Sub-tabs switch */}
        <div className="panel-tabs" style={{ background: 'var(--bg-secondary)', padding: '0.2rem', borderRadius: '8px', display: 'flex' }}>
          <button 
            className={`panel-tab ${walletSubTab === 'history' ? 'active' : ''}`} 
            style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', textAlign: 'center', justifyContent: 'center' }} 
            onClick={() => setWalletSubTab('history')}
          >
            Ledger Logs
          </button>
          <button 
            className={`panel-tab ${walletSubTab === 'brands' ? 'active' : ''}`} 
            style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', textAlign: 'center', justifyContent: 'center' }} 
            onClick={() => setWalletSubTab('brands')}
          >
            Brand Sales
          </button>
        </div>

        {walletSubTab === 'history' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Transaction Ledger Logs</h4>
            
            {ledger.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                No wallet transactions logged yet.
              </div>
            ) : (
              [...ledger].reverse().map((t, idx) => {
                const date = new Date(t.date).toLocaleDateString('en-IN');
                const isComm = t.type === 'commission';
                
                return (
                  <div key={idx} className="glass-panel" style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>{t.description}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{date} | Ref: {t.referenceId || 'N/A'}</div>
                    </div>
                    <div style={{ 
                      fontWeight: 800, 
                      fontSize: '0.85rem', 
                      color: isComm ? 'var(--accent-emerald)' : 'var(--accent-rose)' 
                    }}>
                      {isComm ? '+' : '-'}{formatRupee(t.amount)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-card)' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem' }}>Brand Clearance Performance</h4>
            {brandsSalesData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                No clearance sales recorded.
              </div>
            ) : (
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brandsSalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} 
                      contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.75rem' }} 
                    />
                    <Bar dataKey="Sales" radius={[4, 4, 0, 0]}>
                      {brandsSalesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--accent-cyan)' : 'var(--accent-emerald)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

      </div>
    );
  };

  const renderMobileModals = () => {
    return (
      <>
        {isUploadModalOpen && selectedQuoteToUpload && (
          <div className="modal-overlay" onClick={() => setIsUploadModalOpen(false)}>
            <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%' }}>
              <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Submit Invoice Details</span>
                <button className="close-btn" style={{ position: 'relative', top: 0, right: 0 }} onClick={() => setIsUploadModalOpen(false)}>X</button>
              </h3>

              <form onSubmit={handleInvoiceSubmit}>
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8rem' }}>
                  <strong>Quote ID:</strong> {selectedQuoteToUpload.id}<br/>
                  <strong>Client:</strong> {selectedQuoteToUpload.customerName}<br/>
                  <strong>Clearance Value:</strong> {formatRupee(selectedQuoteToUpload.items.reduce((s,i) => s + (i.specialPrice * i.qty), 0))}
                </div>

                <div className="form-group">
                  <label className="form-label">SAP Invoice Number *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. SAP-2026-94821" 
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Upload Receipt/Invoice Image *</label>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    required
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (uploadEvent) => {
                          setReceiptFile(uploadEvent.target.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  />
                  {receiptFile && (
                    <div style={{ marginTop: '0.5rem', color: 'var(--accent-emerald)', fontSize: '0.8rem', fontWeight: 600 }}>
                      ✓ File loaded successfully
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsUploadModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-emerald">Submit Verification</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isQuoteDetailOpen && selectedQuoteDetail && (
          <div className="modal-overlay" onClick={() => setIsQuoteDetailOpen(false)}>
            <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%' }}>
              <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Quotation Details</span>
                <button className="close-btn" style={{ position: 'relative', top: 0, right: 0 }} onClick={() => setIsQuoteDetailOpen(false)}>X</button>
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '6px' }}>
                <div><strong>Quote ID:</strong> {selectedQuoteDetail.id}</div>
                <div><strong>Client Name:</strong> {selectedQuoteDetail.customerName}</div>
                <div><strong>Mobile:</strong> {selectedQuoteDetail.customerMobile}</div>
                {(selectedQuoteDetail.customerLocation || selectedQuoteDetail.customerAddress) && (
                  <div><strong>Location:</strong> {selectedQuoteDetail.customerLocation || selectedQuoteDetail.customerAddress}</div>
                )}
                <div><strong>Date:</strong> {new Date(selectedQuoteDetail.date).toLocaleDateString('en-IN')}</div>
                <div><strong>Status:</strong> <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{selectedQuoteDetail.status.replace('_', ' ').toUpperCase()}</span></div>
                {selectedQuoteDetail.invoiceNo && <div><strong>SAP Invoice:</strong> {selectedQuoteDetail.invoiceNo}</div>}
                <div><strong>Est. Incentive:</strong> {formatRupee(selectedQuoteDetail.incentiveAmount)}</div>
              </div>

              <div className="custom-table-container" style={{ marginBottom: '1rem' }}>
                <table className="custom-table" style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuoteDetail.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <div>{item.name}</div>
                          {item.division === 'Tiles' && (
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                              📏 {item.size || 'N/A'} | ✨ {item.finishing || 'N/A'} | 📍 Loc: {item.location || 'N/A'}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>{formatRupee(item.specialPrice)}</td>
                        <td style={{ fontWeight: 700 }}>{formatRupee(item.specialPrice * item.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedQuoteDetail.uploadedBill && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>Receipt:</strong>
                  {selectedQuoteDetail.uploadedBill.startsWith('data:image/') ? (
                    <img 
                      src={selectedQuoteDetail.uploadedBill} 
                      alt="Uploaded Receipt" 
                      style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', border: '1px solid var(--border-color)', borderRadius: '4px' }} 
                    />
                  ) : (
                    <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', border: '1px dotted var(--border-color)', fontSize: '0.75rem', textAlign: 'center' }}>
                      📄 Invoice PDF File Uploaded
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button className="btn btn-primary" onClick={() => setIsQuoteDetailOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="fade-in" style={{ position: 'relative' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification">
          <span>{toast}</span>
        </div>
      )}

      {/* In-App Sliding Notification Toast */}
      {inAppNotification && (
        <div className="in-app-notification-toast">
          <div style={{ display: 'inline-flex', padding: '0.4rem', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)' }}>
            <Bell size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Showroom Announcement</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{inAppNotification.time}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem', lineHeight: '1.4' }}>{inAppNotification.message}</p>
          </div>
          <button style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setInAppNotification(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {isMobile ? (
        <div className="mobile-app-layout" style={{ paddingBottom: '80px' }}>
          <header className="mobile-header" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            position: 'sticky',
            top: 0,
            zIndex: 1000
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} color="var(--accent-cyan)" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>MARBLE CLEARANCE</span>
            </div>
            <span className="badge badge-cyan" style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem' }}>
              {activeExecutive.name.split(' ')[0]}
            </span>
          </header>

          <main style={{ padding: '1rem 1rem 2rem 1rem' }}>
            {mobileTab === 'overview' && renderMobileOverview()}
            {mobileTab === 'catalog' && renderMobileCatalog()}
            {mobileTab === 'cart' && renderMobileCart()}
            {mobileTab === 'quotes' && renderMobileQuotes()}
            {mobileTab === 'wallet' && renderMobileWallet()}
          </main>

          <nav className="mobile-bottom-nav">
            <button className={`mobile-bottom-nav-item ${mobileTab === 'overview' ? 'active' : ''}`} onClick={() => setMobileTab('overview')}>
              <Award size={20} />
              <span>Overview</span>
            </button>
            <button className={`mobile-bottom-nav-item ${mobileTab === 'catalog' ? 'active' : ''}`} onClick={() => setMobileTab('catalog')}>
              <Search size={20} />
              <span>Catalog</span>
            </button>
            <button className={`mobile-bottom-nav-item ${mobileTab === 'cart' ? 'active' : ''}`} onClick={() => setMobileTab('cart')}>
              <ShoppingCart size={20} />
              {totalItemsCount > 0 && <span className="mobile-cart-badge">{totalItemsCount}</span>}
              <span>Cart</span>
            </button>
            <button className={`mobile-bottom-nav-item ${mobileTab === 'quotes' ? 'active' : ''}`} onClick={() => setMobileTab('quotes')}>
              <FileText size={20} />
              <span>Quotes</span>
            </button>
            <button className={`mobile-bottom-nav-item ${mobileTab === 'wallet' ? 'active' : ''}`} onClick={() => setMobileTab('wallet')}>
              <Wallet size={20} />
              <span>Wallet</span>
            </button>
          </nav>

          {renderMobileModals()}
        </div>
      ) : (
        <div>
          {/* Active Workspace or Portal Landing Dashboard */}
          {!isSessionActive ? (
            <div className="portal-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Executive Header Greeting */}
              <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-card) 100%)' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-cyan-glow)', color: 'var(--accent-cyan)' }}>
                <Award size={32} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Good day, {activeExecutive.name.split(' ')[0]}!
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2' }}>
                  Thank you for your support. Today we planned special clearance items. Let's hit the showroom floor!
                </p>
              </div>
            </div>
            <button className="btn btn-cyan" style={{ padding: '0.8rem 1.75rem', fontSize: '1rem', fontWeight: 700, display: 'flex', gap: '0.5rem', alignItems: 'center', borderRadius: '10px' }} onClick={startSession}>
              <ShoppingCart size={18} />
              Start Customer Session
            </button>
          </div>

          {/* Portal Sub-Navigation Tabs */}
          <div className="panel-tabs">
            <button className={`panel-tab ${activePortalTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActivePortalTab('dashboard')}>
              <Bell size={14} style={{ marginRight: '0.25rem' }} />
              Overview Dashboard
            </button>
            <button className={`panel-tab ${activePortalTab === 'quotes' ? 'active' : ''}`} onClick={() => setActivePortalTab('quotes')}>
              <FileText size={14} style={{ marginRight: '0.25rem' }} />
              Quotations Manager
            </button>
            <button className={`panel-tab ${activePortalTab === 'wallet' ? 'active' : ''}`} onClick={() => setActivePortalTab('wallet')}>
              <Wallet size={14} style={{ marginRight: '0.25rem' }} />
              My Wallet ({formatRupee(activeExecutive.walletBalance || 0)})
            </button>
            <button className={`panel-tab ${activePortalTab === 'reports' ? 'active' : ''}`} onClick={() => setActivePortalTab('reports')}>
              <BarChart2 size={14} style={{ marginRight: '0.25rem' }} />
              Brand Performance
            </button>
          </div>

          {/* Tab 1: Overview Dashboard */}
          {activePortalTab === 'dashboard' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Target & KPI metrics */}
              <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                
                <div className="glass-panel stat-card cyan" style={{ padding: '1.25rem' }}>
                  <div className="stat-header">
                    <span>July 2026 Monthly Target</span>
                    <TrendingUp className="stat-icon" size={18} />
                  </div>
                  <div className="stat-value">{formatRupee(activeExecutive.target)}</div>
                  <div className="stat-subtext">Sales target assigned for July 2026</div>
                </div>

                <div className="glass-panel stat-card emerald" style={{ padding: '1.25rem' }}>
                  <div className="stat-header">
                    <span>Company Liquidity Generated</span>
                    <IndianRupee className="stat-icon" size={18} />
                  </div>
                  <div className="stat-value">{formatRupee(clearedLiquidityVal)}</div>
                  <div className="stat-subtext" style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>
                    {activeExecutive.target > 0 ? ((clearedLiquidityVal / activeExecutive.target) * 100).toFixed(0) : 0}% target achieved
                  </div>
                  <div className="progress-container" style={{ marginTop: '0.5rem' }}>
                    <div className="progress-bar emerald" style={{ width: `${(clearedLiquidityVal / activeExecutive.target) * 100}%` }}></div>
                  </div>
                </div>

                <div className="glass-panel stat-card rose" style={{ padding: '1.25rem' }}>
                  <div className="stat-header">
                    <span>Remaining Target to Clear</span>
                    <ShoppingCart className="stat-icon" size={18} />
                  </div>
                  <div className="stat-value">{formatRupee(remainingTarget)}</div>
                  <div className="stat-subtext">Liquidity to bring down to meet target</div>
                </div>

              </div>

              {/* Weekly Special Products */}
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Volume2 size={18} color="var(--accent-amber)" />
                  <span>This Week's Special Showcase Offers</span>
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {weeklySpecials.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No weekly specials configured by the admin yet.
                    </div>
                  ) : (
                    weeklySpecials.map(p => {
                      const finalPrice = getProductFinalPrice(p);
                      const incentivePct = getProductIncentivePct(p, db.brands);
                      
                      return (
                        <div key={p.id} className="glass-panel" style={{ padding: '1rem', border: '1.5px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.01)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className={`brand-pill ${p.brand.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>{p.brand}</span>
                            <span className="badge badge-warning" style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem', fontWeight: 700 }}>
                              {p.extraCustomerDiscount > 0 ? `${p.extraCustomerDiscount}% EXTRA OFF` : `${incentivePct}% INCENTIVE override`}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={p.name}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.2rem 0' }}>Code: {p.id}</div>
                          
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-rose)' }}>{formatRupee(finalPrice)}</span>
                            {p.extraCustomerDiscount > 0 && (
                              <span style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatRupee(p.specialPrice)}</span>
                            )}
                            <span style={{ fontSize: '0.7rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatRupee(p.mrp)}</span>
                          </div>

                          <div style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '4px', marginTop: '0.5rem', color: 'var(--accent-cyan)' }}>
                            💼 Executive Incentive: <strong>{incentivePct}%</strong> on clearance sale
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>



            </div>
          )}

          {/* Tab 2: Saved Quotations Manager */}
          {activePortalTab === 'quotes' && (
            <div className="glass-panel fade-in" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <FileText size={18} color="var(--accent-cyan)" />
                <span>My Saved Quotations ({ (db.quotations || []).filter(q => q.executiveId === activeExecutive.id).length } Sheets)</span>
              </h3>
              
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Quote No</th>
                      <th>Date Saved</th>
                      <th>Client Details</th>
                      <th>Items Count</th>
                      <th>Clearance Total</th>
                      <th>Est. Incentive</th>
                      <th>Status</th>
                      <th>SAP Info</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    { (db.quotations || []).filter(q => q.executiveId === activeExecutive.id).length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                          No saved quotations found. Start a session to build a quotation.
                        </td>
                      </tr>
                    ) : (
                      (db.quotations || [])
                        .filter(q => q.executiveId === activeExecutive.id)
                        .sort((a,b) => new Date(b.date) - new Date(a.date))
                        .map(quote => {
                          const itemsCount = quote.items.reduce((sum, i) => sum + i.qty, 0);
                          const totalVal = quote.items.reduce((sum, i) => sum + (i.specialPrice * i.qty), 0);
                          
                          return (
                            <tr key={quote.id}>
                              <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{quote.id}</td>
                              <td>{new Date(quote.date).toLocaleDateString('en-IN')}</td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{quote.customerName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{quote.customerMobile}</div>
                              </td>
                              <td style={{ textAlign: 'center' }}>{itemsCount} items</td>
                              <td style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{formatRupee(totalVal)}</td>
                              <td style={{ color: 'var(--accent-cyan)' }}>{formatRupee(quote.incentiveAmount)}</td>
                              <td>
                                <span className={`badge ${
                                  quote.status === 'draft' ? 'badge-warning' :
                                  quote.status === 'pending_verification' ? 'badge-info' :
                                  quote.status === 'verified' ? 'badge-success' : 'badge-danger'
                                }`}>
                                  {quote.status === 'draft' && 'Draft Quote'}
                                  {quote.status === 'pending_verification' && 'Pending Verification'}
                                  {quote.status === 'verified' && 'Verified & Credited'}
                                  {quote.status === 'rejected' && 'Rejected'}
                                </span>
                              </td>
                              <td>
                                {quote.invoiceNo ? (
                                  <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Invoice: {quote.invoiceNo}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>File Attached</div>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None</span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => { setSelectedQuoteDetail(quote); setIsQuoteDetailOpen(true); }}>
                                    View
                                  </button>
                                  {(quote.status === 'draft' || quote.status === 'pending_verification' || quote.status === 'rejected') && (
                                    <button 
                                      className="btn btn-cyan" 
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} 
                                      onClick={() => {
                                        if (quote.status === 'pending_verification') {
                                          if (confirm("Editing this quotation will cancel its pending verification status. You will need to resubmit it. Proceed?")) {
                                            handleReloadDraft(quote);
                                          }
                                        } else {
                                          handleReloadDraft(quote);
                                        }
                                      }}
                                    >
                                      {quote.status === 'rejected' ? 'Re-edit Rejected' : quote.status === 'pending_verification' ? 'Edit / Cancel Pending' : 'Edit / Reload'}
                                    </button>
                                  )}
                                  {quote.status === 'draft' && (
                                    <button className="btn btn-emerald" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => openUploadModal(quote)}>
                                      Submit Bill
                                    </button>
                                  )}
                                  {(quote.status === 'draft' || quote.status === 'pending_verification' || quote.status === 'rejected') && (
                                    <button 
                                      className="btn btn-rose" 
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: 'var(--accent-rose)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }} 
                                      onClick={() => handleDeleteQuotation(quote.id)}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* Tab 3: Wallet Ledger */}
          {activePortalTab === 'wallet' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              <div className="glass-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, var(--accent-emerald-glow) 0%, var(--bg-card) 100%)', border: '1.5px solid rgba(16,185,129,0.2)' }}>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '50%', background: 'var(--accent-emerald-glow)', color: 'var(--accent-emerald)' }}>
                    <Wallet size={34} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Wallet Balance</span>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.15rem' }}>
                      {formatRupee(activeExecutive.walletBalance || 0)}
                    </h2>
                  </div>
                </div>
                <button className="btn btn-emerald" style={{ padding: '0.75rem 1.5rem', fontWeight: 700 }} onClick={handleRequestPayout}>
                  Disburse Earnings Payout
                </button>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <History size={18} color="var(--accent-cyan)" />
                  <span>Wallet Transaction Ledger</span>
                </h3>
                
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Date</th>
                        <th>Ledger Details</th>
                        <th>Type</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      { !activeExecutive.walletLedger || activeExecutive.walletLedger.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No wallet transactions recorded yet. Completed sales verified by manager will credit commission here.
                          </td>
                        </tr>
                      ) : (
                        activeExecutive.walletLedger.map((ledger) => (
                          <tr key={ledger.id}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{ledger.id}</td>
                            <td>{new Date(ledger.date).toLocaleDateString('en-IN')}</td>
                            <td>{ledger.description}</td>
                            <td>
                              <span className={`badge ${ledger.type === 'incentive' ? 'badge-success' : 'badge-warning'}`}>
                                {ledger.type === 'incentive' ? 'Incentive Earned' : 'Payout Disbursed'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: ledger.amount >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                              {ledger.amount >= 0 ? `+${formatRupee(ledger.amount)}` : `-${formatRupee(Math.abs(ledger.amount))}`}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Tab 4: Brand Performance Reports */}
          {activePortalTab === 'reports' && (
            <div className="glass-panel fade-in" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <BarChart2 size={18} color="var(--accent-cyan)" />
                <span>My Showroom Brand Performance</span>
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                Tracks clearance sales revenue generated by you for different brands.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem' }} className="dashboard-grid">
                
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getBrandSalesData()} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                      <YAxis stroke="var(--text-secondary)" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                        labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                        formatter={(value) => [formatRupee(value), 'Cleared Revenue']} 
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      />
                      <Bar dataKey="Sales" radius={[4, 4, 0, 0]}>
                        {getBrandSalesData().map((entry, index) => {
                          const colors = ['#f59e0b', '#06b6d4', '#10b981', '#ef4444'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                    Sales Clearance Breakdown
                  </h4>
                  {getBrandSalesData().map(b => (
                    <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span className={`brand-pill ${b.name.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>{b.name}</span>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{formatRupee(b.Sales)}</strong>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

        </div>
      ) : (
        <div>
          {/* Active Workspace Header */}
          <div className="session-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Customer Selection Session</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Executive: <strong style={{ color: 'var(--accent-emerald)' }}>{activeExecutive.name}</strong>
              </p>
            </div>
            <button className="btn btn-danger" style={{ border: 'none' }} onClick={endSession}>
              <XCircle size={16} />
              Cancel Session
            </button>
          </div>

          {/* Mobile Navigation Tabs */}
          <div className="mobile-tabs-container no-print">
            <button 
              type="button" 
              className={`mobile-tab-btn ${activeMobileTab === 'catalog' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab('catalog')}
            >
              <QrCode size={16} />
              <span>Scan & Browse</span>
            </button>
            <button 
              type="button" 
              className={`mobile-tab-btn ${activeMobileTab === 'cart' ? 'active' : ''}`}
              onClick={() => setActiveMobileTab('cart')}
            >
              <ShoppingCart size={16} />
              <span>Selected ({totalItemsCount})</span>
            </button>
          </div>

          <div className={`workspace-layout ${activeMobileTab === 'catalog' ? 'show-mobile-catalog' : 'show-mobile-cart'}`}>
            
            {/* Left side: Discovery (Scan, Search, Catalog) */}
            <div className="workspace-discovery">
              
              {/* Sleek Unified Search & Quick Action Header Bar */}
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1rem', alignItems: 'center' }}>
                  {/* Scan Button */}
                  <button 
                    type="button"
                    className="btn btn-emerald" 
                    style={{ 
                      height: '44px', 
                      fontSize: '0.88rem', 
                      fontWeight: 700, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      padding: '0 1.25rem',
                      borderRadius: '10px',
                      whiteSpace: 'nowrap'
                    }} 
                    onClick={() => setIsScannerOpen(true)}
                  >
                    <QrCode size={18} />
                    Scan QR / Code
                  </button>

                  {/* Universal Search Input */}
                  <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-cyan)' }} />
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Search catalog by code, brand, specs, or product name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: '2.75rem', height: '44px', fontSize: '0.9rem', borderRadius: '10px', width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                    />
                    {searchQuery && (
                      <button 
                        type="button"
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        onClick={() => setSearchQuery('')}
                      >
                        ✕
                      </button>
                    )}

                    {searchResults.length > 0 && (
                      <div className="search-results-list" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '6px', zIndex: 99, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.3)', maxHeight: '320px', overflowY: 'auto' }}>
                        {searchResults.map(p => {
                          const finalPrice = getProductFinalPrice(p);
                          return (
                            <div 
                              key={p.id} 
                              className="search-result-row"
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                              onClick={() => { addProductToCartDirect(p); setSearchQuery(''); }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {p.image ? (
                                  <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }} />
                                ) : (
                                  <div className="brand-pill" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>{p.brand}</div>
                                )}
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.name}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Code: <strong style={{ color: 'var(--accent-cyan)' }}>{p.id}</strong></div>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 800, color: 'var(--accent-rose)', fontSize: '0.9rem' }}>{formatRupee(finalPrice)}</div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>+ Click to Add</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Direct Code Input Form */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const code = e.target.elements.manualCode.value.trim().toUpperCase();
                      if (!code) return;
                      const product = products.find(p => 
                        p.id.toUpperCase() === code || 
                        p.name.toUpperCase().includes(code) || 
                        p.id.toUpperCase().includes(code)
                      );
                      if (product) {
                        addProductToCartDirect(product);
                        e.target.reset();
                      } else {
                        alert(`Product "${code}" not found.`);
                      }
                    }}
                    style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}
                  >
                    <input 
                      type="text" 
                      name="manualCode"
                      className="form-input" 
                      placeholder="Quick Code..."
                      style={{ height: '44px', fontSize: '0.85rem', width: '130px', borderRadius: '10px' }}
                    />
                    <button 
                      type="submit" 
                      className="btn btn-cyan" 
                      style={{ height: '44px', padding: '0 1rem', borderRadius: '10px', fontWeight: 700 }}
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>

              {/* Showroom Visual Product Catalog - Elegant Redesign */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                {/* Header Title + View Mode Switcher + Division & Brand Filters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sliders size={20} color="var(--accent-cyan)" />
                        Showroom Clearance Catalog
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 600 }}>
                        {filteredProducts.length} Items Available
                      </span>
                    </div>

                    {/* View Switcher: List vs Grid Tiles */}
                    <div style={{ display: 'flex', gap: '0.25rem', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '3px', background: 'rgba(0,0,0,0.15)' }}>
                      <button
                        type="button"
                        className={`btn ${catalogViewMode === 'list' ? 'btn-cyan' : ''}`}
                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem', borderRadius: '8px', fontWeight: catalogViewMode === 'list' ? 700 : 500 }}
                        onClick={() => setCatalogViewMode('list')}
                      >
                        ☰ List Model
                      </button>
                      <button
                        type="button"
                        className={`btn ${catalogViewMode === 'grid' ? 'btn-cyan' : ''}`}
                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem', borderRadius: '8px', fontWeight: catalogViewMode === 'grid' ? 700 : 500 }}
                        onClick={() => setCatalogViewMode('grid')}
                      >
                        ⊞ Grid Tiles
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {/* Brand Pill Buttons with Horizontal Scroll Bar */}
                    <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.2rem', maxWidth: '65%', scrollbarWidth: 'none' }}>
                      <button 
                        type="button" 
                        className={`btn ${selectedCatalogBrand === 'ALL' ? 'btn-cyan' : 'btn-secondary'}`}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '20px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
                        onClick={() => setSelectedCatalogBrand('ALL')}
                      >
                        All Brands ({products.length})
                      </button>
                      {(db.brands || []).map(b => {
                        const count = products.filter(p => p.brand === b.name).length;
                        return (
                          <button 
                            key={b.name}
                            type="button"
                            className={`btn ${selectedCatalogBrand === b.name ? 'btn-cyan' : 'btn-secondary'}`}
                            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '20px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
                            onClick={() => setSelectedCatalogBrand(b.name)}
                          >
                            {b.name} {count > 0 ? `(${count})` : ''}
                          </button>
                        );
                      })}
                    </div>

                    {/* Division Switchers */}
                    <div style={{ display: 'flex', gap: '0.25rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2px', background: 'rgba(0,0,0,0.1)' }}>
                      {divisionsList.map(divOpt => (
                        <button
                          key={divOpt}
                          type="button"
                          className={`btn ${selectedCatalogDivision === divOpt ? 'btn-cyan' : ''}`}
                          style={{ 
                            padding: '0.2rem 0.6rem', 
                            fontSize: '0.75rem', 
                            background: selectedCatalogDivision === divOpt ? 'var(--accent-cyan)' : 'transparent',
                            color: selectedCatalogDivision === divOpt ? '#000' : 'var(--text-secondary)',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: selectedCatalogDivision === divOpt ? 700 : 500
                          }}
                          onClick={() => setSelectedCatalogDivision(divOpt)}
                        >
                          {divOpt === 'ALL' ? 'All Divisions' : divOpt}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {catalogViewMode === 'list' ? (
                  <div style={{ overflowX: 'auto', maxHeight: '520px' }}>
                    <table className="table" style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'left' }}>
                          <th style={{ padding: '0.6rem' }}>Product & Code</th>
                          <th style={{ padding: '0.6rem' }}>Brand / Specs</th>
                          <th style={{ padding: '0.6rem', textAlign: 'center' }}>Stock</th>
                          <th style={{ padding: '0.6rem', textAlign: 'right' }}>MRP</th>
                          <th style={{ padding: '0.6rem', textAlign: 'right' }}>Clearance Price</th>
                          <th style={{ padding: '0.6rem', textAlign: 'center' }}>Incentive</th>
                          <th style={{ padding: '0.6rem', textAlign: 'center' }}>Cart Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                              No clearance products matching criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map(p => {
                            const isOutOfStock = p.stock === 0;
                            const finalPrice = getProductFinalPrice(p);
                            const singleIncentive = getProductIncentiveAmount(p, 1, db.brands || []);
                            const isWeeklySpecial = isWeeklySpecialActive(p);
                            const cartItem = cart.find(i => i.id === p.id);

                            return (
                              <tr 
                                key={p.id} 
                                style={{ 
                                  borderBottom: '1px solid rgba(255,255,255,0.05)', 
                                  opacity: isOutOfStock ? 0.5 : 1, 
                                  background: cartItem ? 'rgba(16, 185, 129, 0.06)' : (isWeeklySpecial ? 'rgba(245,158,11,0.02)' : 'transparent'),
                                  cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                                  transition: 'background 0.2s ease'
                                }}
                                onClick={() => {
                                  if (!isOutOfStock && !cartItem) {
                                    addProductToCartDirect(p);
                                  }
                                }}
                              >
                                <td style={{ padding: '0.65rem 0.6rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    {p.image ? (
                                      <img src={p.image} alt={p.name} style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)', flexShrink: 0 }} />
                                    ) : (
                                      <div style={{ width: '44px', height: '44px', background: 'var(--bg-secondary)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                                        {p.brand}
                                      </div>
                                    )}
                                    <div>
                                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        {p.name}
                                        {isWeeklySpecial && <span className="badge badge-warning" style={{ fontSize: '0.55rem', padding: '0.05rem 0.3rem' }}>⚡ Offer</span>}
                                        {cartItem && <span className="badge badge-success" style={{ fontSize: '0.55rem', padding: '0.05rem 0.35rem' }}>In Cart ({cartItem.qty})</span>}
                                      </div>
                                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Code: <strong style={{ color: 'var(--accent-cyan)' }}>{p.id}</strong></div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: '0.6rem' }}>
                                  <span className={`brand-pill ${p.brand.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{p.brand}</span>
                                  {p.division === 'Tiles' && (
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                      <span>📏 {p.size || 'N/A'}</span> • <span>✨ {p.finishing || 'N/A'}</span> • <span style={{ color: 'var(--accent-cyan)' }}>📍 {p.location || 'N/A'}</span>
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '0.6rem', textAlign: 'center', fontWeight: 700, color: p.stock > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                                  {p.stock > 0 ? `${p.stock} units` : 'Out of Stock'}
                                </td>
                                <td style={{ padding: '0.6rem', textAlign: 'right', textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                                  {formatRupee(p.mrp)}
                                </td>
                                <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-rose)', fontSize: '0.92rem' }}>
                                  {formatRupee(finalPrice)}
                                </td>
                                <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                                  <span style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: 700, background: 'rgba(6, 182, 212, 0.1)', padding: '0.2rem 0.45rem', borderRadius: '4px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                                    💰 Earn ₹{singleIncentive}
                                  </span>
                                </td>
                                <td style={{ padding: '0.6rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                  {cartItem ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16,185,129,0.12)', padding: '0.25rem 0.6rem', borderRadius: '20px', border: '1px solid var(--accent-emerald)' }}>
                                      <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '2px' }} onClick={() => updateCartQty(p.id, cartItem.qty - 1, p.stock)}>
                                        <Minus size={13} />
                                      </button>
                                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent-emerald)', minWidth: '18px', textAlign: 'center' }}>{cartItem.qty}</span>
                                      <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '2px' }} onClick={() => updateCartQty(p.id, cartItem.qty + 1, p.stock)}>
                                        <Plus size={13} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      type="button" 
                                      className="btn btn-cyan" 
                                      style={{ padding: '0.35rem 0.85rem', fontSize: '0.72rem', fontWeight: 700 }}
                                      disabled={isOutOfStock}
                                      onClick={() => addProductToCartDirect(p)}
                                    >
                                      + Add to Quote
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="executive-catalog-scroll">
                    {filteredProducts.map(p => {
                      const isOutOfStock = p.stock === 0;
                      const finalPrice = getProductFinalPrice(p);
                      const isWeeklySpecial = isWeeklySpecialActive(p);
                      const cartItem = cart.find(i => i.id === p.id);

                      return (
                        <div 
                          key={p.id} 
                          className={`glass-panel executive-catalog-card ${isWeeklySpecial ? 'weekly-special-card' : ''}`}
                          style={{ 
                            opacity: isOutOfStock ? 0.5 : 1,
                            border: cartItem ? '2px solid var(--accent-emerald)' : (isWeeklySpecial ? '1.5px solid rgba(245,158,11,0.4)' : '1px solid var(--border-color)'),
                            background: cartItem ? 'rgba(16, 185, 129, 0.04)' : (isWeeklySpecial ? 'rgba(245,158,11,0.01)' : 'rgba(255,255,255,0.01)'),
                            cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                            padding: '0.85rem'
                          }}
                          onClick={() => {
                            if (!isOutOfStock && !cartItem) {
                              addProductToCartDirect(p);
                            }
                          }}
                        >
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            {p.image ? (
                              <img 
                                src={p.image} 
                                alt={p.name} 
                                className="catalog-card-img"
                                style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)', flexShrink: 0 }} 
                              />
                            ) : (
                              <div className="catalog-card-placeholder" style={{ width: '60px', height: '60px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                                {p.brand}
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                <span className={`brand-pill ${p.brand.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>{p.brand}</span>
                                {cartItem ? (
                                  <span className="badge badge-success" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>In Cart ({cartItem.qty})</span>
                                ) : (
                                  isWeeklySpecial && <span className="badge badge-warning" style={{ fontSize: '0.55rem', padding: '0.05rem 0.35rem' }}>⚡ Offer</span>
                                )}
                              </div>

                              <div style={{ fontSize: '0.82rem', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={p.name}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Code: <strong style={{ color: 'var(--accent-cyan)' }}>{p.id}</strong></div>

                              {p.division === 'Tiles' && (
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.15rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>📏 {p.size || 'N/A'}</span>
                                    <span>✨ {p.finishing || 'N/A'}</span>
                                  </div>
                                  <div style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                                    📍 Loc: {p.location || 'N/A'}
                                  </div>
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', alignItems: 'center' }}>
                                <div>
                                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-rose)' }}>{formatRupee(finalPrice)}</span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: '0.35rem' }}>{formatRupee(p.mrp)}</span>
                                </div>
                                
                                <span style={{ fontSize: '0.65rem', color: p.stock > 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontWeight: 600 }}>
                                  {p.stock > 0 ? `${p.stock} in stock` : 'Out of Stock'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }} onClick={(e) => e.stopPropagation()}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 700, background: 'rgba(6, 182, 212, 0.08)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                                  💰 Earn ₹{getProductIncentiveAmount(p, 1, db.brands || [])}
                                </span>

                                {cartItem ? (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16,185,129,0.12)', padding: '0.2rem 0.5rem', borderRadius: '20px', border: '1px solid var(--accent-emerald)' }}>
                                    <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '2px' }} onClick={() => updateCartQty(p.id, cartItem.qty - 1, p.stock)}>
                                      <Minus size={13} />
                                    </button>
                                    <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--accent-emerald)', minWidth: '16px', textAlign: 'center' }}>{cartItem.qty}</span>
                                    <button type="button" style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '2px' }} onClick={() => updateCartQty(p.id, cartItem.qty + 1, p.stock)}>
                                      <Plus size={13} />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    type="button" 
                                    className="btn btn-cyan" 
                                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.68rem', fontWeight: 700 }}
                                    disabled={isOutOfStock}
                                    onClick={() => addProductToCartDirect(p)}
                                  >
                                    + Add to Cart
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>



            </div>

            {/* Column 2: Active Customer Cart & Checkout */}
            <div className="workspace-cart glass-panel" style={{ padding: '1.25rem', position: 'sticky', top: '1rem' }}>
              <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700 }}>
                  <ShoppingCart color="var(--accent-emerald)" size={18} />
                  <span>Selection List ({totalItemsCount})</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {editingQuoteId && (
                    <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem' }}>
                      Editing {editingQuoteId}
                    </span>
                  )}
                  {cart.length > 0 && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--accent-rose)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      onClick={handleClearCart}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </h3>

              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <ShoppingCart size={32} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                  <div>No items selected yet.</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Scan showroom stickers or click products in the catalog to add.</div>
                </div>
              ) : (
                <div>
                  <div className="cart-list" style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '1rem' }}>
                    {cart.map(item => {
                      const finalPrice = getProductFinalPrice(item);
                      return (
                        <div key={item.id} className="cart-item" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '0.5rem', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          {item.image ? (
                            <img src={item.image} alt={item.name} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
                          ) : (
                            <div className="brand-pill" style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', padding: 0 }}>{item.brand[0]}</div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={item.name}>{item.name}</div>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.brand} ({item.id})</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginLeft: '0.5rem', background: 'rgba(6,182,212,0.05)', padding: '1px 4px', borderRadius: '3px' }}>
                              💰 Comm: {formatRupee(getProductIncentiveAmount(item, item.qty, db.brands || []))}
                            </span>
                            {item.division === 'Tiles' && (
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                                📏 {item.size || 'N/A'} | ✨ {item.finishing || 'N/A'} | 📍 Loc: {item.location || 'N/A'}
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.1rem 0.25rem', height: '24px' }} onClick={() => updateCartQty(item.id, item.qty - 1, item.stock)}>
                              <Minus size={8} />
                            </button>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '22px', textAlign: 'center' }}>{item.qty}</span>
                            <button className="btn btn-secondary" style={{ padding: '0.1rem 0.25rem', height: '24px' }} onClick={() => updateCartQty(item.id, item.qty + 1, item.stock)}>
                              <Plus size={8} />
                            </button>
                          </div>

                          <div style={{ textAlign: 'right', minWidth: '70px' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>{formatRupee(finalPrice * item.qty)}</div>
                          </div>

                          <button 
                            className="btn" 
                            style={{ 
                              padding: '0.2rem', 
                              background: 'transparent', 
                              border: 'none', 
                              color: 'var(--accent-rose)', 
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }} 
                            onClick={() => removeFromCart(item.id)}
                            title="Remove item"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="cart-total-section" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <div className="cart-total-row" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>MRP Total:</span>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatRupee(cartTotalMrp)}</span>
                    </div>
                    <div className="cart-total-row" style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Clearance Total:</span>
                      <span style={{ color: 'var(--accent-emerald)' }}>{formatRupee(cartTotalPaid)}</span>
                    </div>
                    <div className="cart-total-row cart-savings" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', color: 'var(--accent-rose)' }}>
                      <span>Net Savings:</span>
                      <span>{formatRupee(totalSavings)} ({((totalSavings / cartTotalMrp)*100).toFixed(0)}% Off)</span>
                    </div>
                    <div className="cart-total-row" style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', color: 'var(--accent-cyan)', fontWeight: 700, borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                      <span>Est. Commission:</span>
                      <span>{formatRupee(cart.reduce((sum, item) => sum + getProductIncentiveAmount(item, item.qty, db.brands || []), 0))}</span>
                    </div>
                  </div>

                  <div>
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label">Client Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Customer name" 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        style={{ height: '36px', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label">Client WhatsApp Mobile</label>
                      <input 
                        type="tel" 
                        className="form-input" 
                        placeholder="10 digit number" 
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                        style={{ height: '36px', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label">Client Location / Site Address</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Kozhikode, Calicut, Kochi" 
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        style={{ height: '36px', fontSize: '0.85rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <button className="btn btn-emerald" style={{ fontSize: '0.85rem', padding: '0.6rem 0', fontWeight: 700 }} onClick={generateWhatsAppLink}>
                        <Send size={14} />
                        Share URL on WhatsApp
                      </button>
                      <div style={{ display: 'grid', gridTemplateColumns: editingQuoteId ? '1fr' : '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {editingQuoteId ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.55rem 0', fontWeight: 'bold' }} onClick={handleSaveQuotation}>
                              Update Quote ({editingQuoteId})
                            </button>
                            <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.55rem 0', fontWeight: 'bold' }} onClick={() => {
                              setEditingQuoteId(null);
                              setTimeout(handleSaveQuotation, 50);
                            }}>
                              Save as New
                            </button>
                          </div>
                        ) : (
                          <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 0', fontWeight: 'bold' }} onClick={handleSaveQuotation}>
                            Save Quotation Draft
                          </button>
                        )}
                        {!editingQuoteId && (
                          <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 0' }} onClick={handleOpenPrintPreview}>
                            Print / Preview PDF
                          </button>
                        )}
                      </div>
                      {editingQuoteId && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                          <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 0' }} onClick={handleOpenPrintPreview}>
                            Print / Preview PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal Overlay */}
      {isScannerOpen && (
        <div className="modal-overlay" onClick={() => setIsScannerOpen(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span>Showroom Camera QR Scanner</span>
              <button className="close-btn" style={{ position: 'relative', top: 0, right: 0 }} onClick={() => setIsScannerOpen(false)}>X</button>
            </h3>
            
            <div className="scanner-container">
              <div className="camera-preview">
                <div className="camera-scanline"></div>
                <div id="qr-reader-element" style={{ width: '100%', height: '100%' }}></div>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Align the QR code sticker of the sanitary showroom display within the scan box frame.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Printable Clearance Quotation Preview Modal Overlay */}
      {isSaleLoggerOpen && (
        <div className="modal-overlay invoice-modal" onClick={() => setIsSaleLoggerOpen(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
            <div>
              {/* Top Action Controls (Not printed) */}
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Showroom Clearance Quotation Sheet</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => setIsSaleLoggerOpen(false)}>
                    Close Preview
                  </button>
                  <button className="btn btn-emerald" onClick={handlePrintQuotation}>
                    Download PDF / Print
                  </button>
                </div>
              </div>

              {/* Printable Quotation Paper */}
              <div className="print-invoice-sheet" style={{ background: '#fff', color: '#000', padding: '2rem', borderRadius: '8px', fontFamily: '"Outfit", "Inter", sans-serif' }}>
                
                {/* Company Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em', margin: 0 }}>MARBLE GALLERY</h2>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.15em' }}>MG LUXE BATH & TILE DIVISION</span>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', lineHeight: '1.4' }}>
                      MG Group Premium Showroom<br/>
                      Luxe Bath & Tile Floor Stock Liquidation
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>CLEARANCE QUOTATION</h3>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', lineHeight: '1.4' }}>
                      <strong>Quote No:</strong> {previewQuoteId}<br/>
                      <strong>Date:</strong> {new Date().toLocaleDateString('en-IN')}<br/>
                      <strong>Time:</strong> {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Customer / Executive Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.75rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', color: '#334155', border: '1px solid #e2e8f0' }}>
                  <div>
                    <strong>Prepared By:</strong> {activeExecutive.name} (Showroom Sales)<br/>
                    <strong>Client Name:</strong> {customerName.trim() || 'Walk-in Showroom Client'}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong>Client Mobile:</strong> {customerMobile || 'N/A'}<br/>
                    <strong>Quotation Status:</strong> Clearance Offer Price
                  </div>
                </div>

                {/* Itemized Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', marginBottom: '1.25rem' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: '#fff', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem', borderRadius: '4px 0 0 4px' }}>Item Description</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Original MRP</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Clearance Rate</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', borderRadius: '0 4px 4px 0' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => {
                      const finalPrice = getProductFinalPrice(item);
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.65rem 0.5rem' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                              Code: {item.id} | Brand: {item.brand}
                              {item.division === 'Tiles' && ` | Size: ${item.size || 'N/A'} | Finish: ${item.finishing || 'N/A'} | Loc: ${item.location || 'N/A'}`}
                            </div>
                          </td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{item.qty}</td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', color: '#94a3b8', textDecoration: 'line-through' }}>{formatRupee(item.mrp)}</td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>{formatRupee(finalPrice)}</td>
                          <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatRupee(finalPrice * item.qty)}</td>
                        </tr>
                      );
                    })}
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
                      <div style={{ width: '290px', fontSize: '0.75rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                          <span>Total Items:</span>
                          <span style={{ fontWeight: 700 }}>{totalItemsCount} units</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                          <span>Original MRP Value:</span>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', paddingBottom: '0.4rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                          <span>Clearance Total (Incl. GST):</span>
                          <span style={{ color: '#10b981' }}>{formatRupee(cartTotalPaid)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444', fontWeight: 700 }}>
                          <span>Net Savings:</span>
                          <span>{formatRupee(totalSavings)} ({((totalSavings/cartTotalMrp)*100).toFixed(0)}% Off)</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Terms and Conditions */}
                <div style={{ fontSize: '0.6rem', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', lineHeight: '1.4' }}>
                  <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#475569' }}>Terms & Conditions:</strong>
                  1. This is a special clearance campaign price valid only for concept showroom floor display stocks.<br/>
                  2. Items once sold under the clearance deal cannot be returned or exchanged.<br/>
                  3. Quotation prices are valid for 7 days or until available display stocks last.<br/>
                  4. Transportation, delivery, and display fitting/installation charges are extra.
                </div>

                {/* Footer Message */}
                <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.7rem', color: '#94a3b8', borderTop: '1px dashed #e2e8f0', paddingTop: '0.5rem' }}>
                  Thank you for choosing Marble Gallery Group. We value your business.
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Salesforce Invoice modal overlay */}
      {isUploadModalOpen && selectedQuoteToUpload && (
        <div className="modal-overlay" onClick={() => setIsUploadModalOpen(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Submit Salesforce Invoice Details</span>
              <button className="close-btn" style={{ position: 'relative', top: 0, right: 0 }} onClick={() => setIsUploadModalOpen(false)}>X</button>
            </h3>

            <form onSubmit={handleInvoiceSubmit}>
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8rem' }}>
                <strong>Quote ID:</strong> {selectedQuoteToUpload.id}<br/>
                <strong>Client:</strong> {selectedQuoteToUpload.customerName}<br/>
                <strong>Clearance Value:</strong> {formatRupee(selectedQuoteToUpload.items.reduce((s,i) => s + (i.specialPrice * i.qty), 0))}
              </div>

              <div className="form-group">
                <label className="form-label">Salesforce Invoice / Receipt Number *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. SF-2026-94821" 
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Upload Customer Invoice / Bank Receipt *</label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  required
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (uploadEvent) => {
                        setReceiptFile(uploadEvent.target.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
                />
                {receiptFile && (
                  <div style={{ marginTop: '0.5rem', color: 'var(--accent-emerald)', fontSize: '0.8rem', fontWeight: 600 }}>
                    ✓ File uploaded successfully (Base64 saved)
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsUploadModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-emerald">Submit for Verification</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Quote Detail Modal overlay */}
      {isQuoteDetailOpen && selectedQuoteDetail && (
        <div className="modal-overlay" onClick={() => setIsQuoteDetailOpen(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Quotation Details - {selectedQuoteDetail.id}</span>
              <button className="close-btn" style={{ position: 'relative', top: 0, right: 0 }} onClick={() => setIsQuoteDetailOpen(false)}>X</button>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '6px' }}>
              <div>
                <strong>Client:</strong> {selectedQuoteDetail.customerName}<br/>
                <strong>Mobile:</strong> {selectedQuoteDetail.customerMobile}<br/>
                <strong>Date:</strong> {new Date(selectedQuoteDetail.date).toLocaleDateString('en-IN')}
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>Status:</strong> <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{selectedQuoteDetail.status.replace('_', ' ').toUpperCase()}</span><br/>
                {selectedQuoteDetail.invoiceNo && (
                  <>
                    <strong>Salesforce Invoice:</strong> {selectedQuoteDetail.invoiceNo}<br/>
                  </>
                )}
                <strong>Estimated Incentive:</strong> {formatRupee(selectedQuoteDetail.incentiveAmount)}
              </div>
            </div>

            <div className="custom-table-container" style={{ marginBottom: '1rem' }}>
              <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th>MRP Rate</th>
                    <th>Clearance Rate</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedQuoteDetail.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div>{item.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          Code: {item.id} | Brand: {item.brand}
                          {item.division === 'Tiles' && ` | Size: ${item.size || 'N/A'} | Finish: ${item.finishing || 'N/A'} | Loc: ${item.location || 'N/A'}`}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{item.qty}</td>
                      <td style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatRupee(item.mrp)}</td>
                      <td style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>{formatRupee(item.specialPrice)}</td>
                      <td style={{ fontWeight: 700 }}>{formatRupee(item.specialPrice * item.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedQuoteDetail.uploadedBill && (
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Uploaded Invoice Receipt:</strong>
                {selectedQuoteDetail.uploadedBill.startsWith('data:image/') ? (
                  <img 
                    src={selectedQuoteDetail.uploadedBill} 
                    alt="Uploaded Receipt" 
                    style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', border: '1px solid var(--border-color)', borderRadius: '4px' }} 
                  />
                ) : (
                  <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--accent-cyan)', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <FileText size={18} color="var(--accent-cyan)" />
                      <span>Uploaded Invoice Receipt PDF Document</span>
                    </div>
                    <button 
                      className="btn btn-cyan" 
                      onClick={() => {
                        const win = window.open();
                        if (win) {
                          win.document.write(`<iframe src="${selectedQuoteDetail.uploadedBill}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                        }
                      }}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Eye size={14} /> View PDF Receipt
                    </button>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => setIsQuoteDetailOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

        </div>
      )}
    </div>
  );
}

export default ExecutiveWorkspace;
