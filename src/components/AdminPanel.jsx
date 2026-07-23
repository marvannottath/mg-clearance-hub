import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Edit, Trash2, Download, Upload, UploadCloud, 
  Printer, Users, CheckCircle, FileSpreadsheet, PlusCircle, 
  CheckSquare, Square, DollarSign, AlertCircle, Percent, Star, 
  Volume2, RefreshCw, Eye, FileText, Zap, ShieldAlert, Globe, Database, KeyRound
} from 'lucide-react';
import MDDashboard from './MDDashboard';
import { isWeeklySpecialActive, getLocalDateString, syncProductsFromSAP, getProductStockAgeMonths, getSapApiUrl, getSfClientId, getSfClientSecret, getProductActiveHoldQty } from '../data/mockData';

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

function AdminPanel({ 
  currentUser = { role: 'admin' },
  products, executives, salesLedger = [], brands = [], quotations = [],
  remainingLandingCost = 0, totalClearedLandingCost = 0,
  dynamicTargetLandingCost = 0, totalClearedRevenue = 0,
  onUpdateStock, onAddProduct, onEditProduct, onDeleteProduct, 
  onBulkUpdateStock, onAddExecutive, onDeleteExecutive, onUpdateDb, db
}) {
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState(() => currentUser.role === 'manager' ? 'reports' : 'executives');
  const [logLevelFilter, setLogLevelFilter] = useState('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const divisionsList = Array.from(new Set(products.map(p => p.division || 'Bathing')));
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncSAPStock = async () => {
    setIsSyncing(true);
    try {
      const syncedProducts = await syncProductsFromSAP();
      
      const currentBrands = db.brands ? [...db.brands] : [];
      let brandUpdated = false;
      syncedProducts.forEach(p => {
        if (p.brand) {
          const brandName = p.brand.toUpperCase();
          if (!currentBrands.some(b => b.name === brandName)) {
            currentBrands.push({
              name: brandName,
              maxMargin: 50,
              customerDiscount: 45,
              executiveIncentive: 4
            });
            brandUpdated = true;
          }
        }
      });

      onUpdateDb({
        ...db,
        products: syncedProducts,
        ...(brandUpdated ? { brands: currentBrands } : {})
      });
      showToast("Live stock and pricing successfully synced from SAP Business One!");
    } catch (err) {
      console.error("SAP Stock sync failed: ", err);
      showToast("SAP Stock sync failed. Please check SAP API endpoint connectivity.");
    } finally {
      setIsSyncing(false);
    }
  };

  
  // Modal & form select states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAddProductMode, setIsAddProductMode] = useState(true);
  
  // Stickers search & filter states
  const [selectedStickerIds, setSelectedStickerIds] = useState([]);
  const [stickerBrandFilter, setStickerBrandFilter] = useState('ALL');
  const [stickerStatusFilter, setStickerStatusFilter] = useState('ALL');
  const [stickerSearch, setStickerSearch] = useState('');

  // Brand catalog filter state
  const [inventoryBrandFilter, setInventoryBrandFilter] = useState('ALL');
  const [inventoryDivisionFilter, setInventoryDivisionFilter] = useState('ALL');
  const [inventoryAgeFilter, setInventoryAgeFilter] = useState('ALL');

  // Bulk liquidation states
  const [bulkDiscount, setBulkDiscount] = useState('');
  const [bulkIncentive, setBulkIncentive] = useState('');

  // Salesforce API & OAuth configuration states
  const [sapApiUrl, setSapApiUrl] = useState(() => getSapApiUrl());
  const [sfAccessToken, setSfAccessToken] = useState(() => safeLocalStorage.getItem('mg_sf_access_token') || '');
  const [sfClientId, setSfClientId] = useState(() => getSfClientId());
  const [sfClientSecret, setSfClientSecret] = useState(() => getSfClientSecret());

  // Main Admin password state
  const [adminPassword, setAdminPassword] = useState(() => safeLocalStorage.getItem('mg_admin_password') || 'admin123');
  const [adminPassSuccess, setAdminPassSuccess] = useState('');

  const handleUpdateAdminPassword = (e) => {
    e.preventDefault();
    if (!adminPassword.trim()) return;
    safeLocalStorage.setItem('mg_admin_password', adminPassword.trim());
    setAdminPassSuccess("Main Admin password updated successfully!");
    setTimeout(() => setAdminPassSuccess(''), 4000);
  };

  const handleSaveSfCredentials = () => {
    safeLocalStorage.setItem('mg_sap_api_url', sapApiUrl.trim());
    safeLocalStorage.setItem('mg_sf_access_token', sfAccessToken.trim());
    safeLocalStorage.setItem('mg_sf_client_id', sfClientId.trim());
    safeLocalStorage.setItem('mg_sf_client_secret', sfClientSecret.trim());
    
    // Wipes cached token expiry so it re-authenticates if Client ID/Secret changed
    if (sfClientId.trim()) {
      safeLocalStorage.removeItem('mg_sf_token_expiry');
    } else {
      safeLocalStorage.setItem('mg_sf_token_expiry', (Date.now() + 3500000).toString());
    }
    
    showToast("Salesforce API & OAuth configurations saved!");
    handleSyncSAPStock(); // Sync automatically on save
  };

  const handleBulkLiquidationSubmit = (e) => {
    e.preventDefault();
    const discPct = parseFloat(bulkDiscount);
    const incPct = parseFloat(bulkIncentive);
    if (isNaN(discPct) || discPct < 0 || discPct > 100 || isNaN(incPct) || incPct < 0 || incPct > 100) {
      showToast("Please provide valid percentage values between 0 and 100.");
      return;
    }

    window.customConfirm(
      "Apply Bulk Pricing Scheme",
      `Are you sure you want to apply a ${discPct}% clearance price discount and a ${incPct}% sales executive incentive to all ${filteredInventoryProducts.length} filtered aging products?`,
      false,
      () => {
        const updatedProducts = db.products.map(p => {
          const isFiltered = filteredInventoryProducts.some(f => f.id === p.id);
          if (isFiltered) {
            const newSpecialPrice = Math.round(p.mrp * (1 - discPct / 100));
            return {
              ...p,
              specialPrice: newSpecialPrice,
              isWeeklySpecial: true,
              weeklySpecialUntil: "2026-12-31", // Valid for current clearance campaign
              extraCustomerDiscount: 0,
              weeklySpecialIncentive: incPct
            };
          }
          return p;
        });

        onUpdateDb({
          ...db,
          products: updatedProducts
        });

        showToast(`Bulk clearance scheme applied successfully to ${filteredInventoryProducts.length} aging items!`);
        setBulkDiscount('');
        setBulkIncentive('');
      }
    );
  };

  // Product Form States
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [productBrand, setProductBrand] = useState('KOHLER');
  const [productCategory, setProductCategory] = useState('Faucets & Mixers');
  const [productDivision, setProductDivision] = useState('Bathing');
  const [productSize, setProductSize] = useState('');
  const [productFinishing, setProductFinishing] = useState('');
  const [productLocation, setProductLocation] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productStock, setProductStock] = useState(0);
  const [productMrp, setProductMrp] = useState(0);
  const [productMgPrice, setProductMgPrice] = useState(0);
  const [productSpecialPrice, setProductSpecialPrice] = useState(0);
  const [productLandingCost, setProductLandingCost] = useState(0);
  const [productImage, setProductImage] = useState('');

  // Executive Form & Editing States
  const [execName, setExecName] = useState('');
  const [execEmail, setExecEmail] = useState('');
  const [execUsername, setExecUsername] = useState('');
  const [execPassword, setExecPassword] = useState('');
  const [execTarget, setExecTarget] = useState(8000000);

  const [editingExec, setEditingExec] = useState(null);
  const [isEditExecModalOpen, setIsEditExecModalOpen] = useState(false);
  const [editExecName, setEditExecName] = useState('');
  const [editExecEmail, setEditExecEmail] = useState('');
  const [editExecUsername, setEditExecUsername] = useState('');
  const [editExecPassword, setEditExecPassword] = useState('');
  const [editExecTarget, setEditExecTarget] = useState(8000000);

  const openEditExecModal = (exec) => {
    setEditingExec(exec);
    setEditExecName(exec.name);
    setEditExecEmail(exec.email);
    setEditExecUsername(exec.username || '');
    setEditExecPassword(exec.password || '');
    setEditExecTarget(exec.target || 8000000);
    setIsEditExecModalOpen(true);
  };

  const handleSaveExecDetails = (e) => {
    e.preventDefault();
    if (!editingExec) return;

    const updatedExecutives = db.executives.map(exec => {
      if (exec.id === editingExec.id) {
        return {
          ...exec,
          name: editExecName,
          email: editExecEmail,
          username: editExecUsername.trim().toLowerCase(),
          password: editExecPassword.trim() || exec.password,
          target: parseInt(editExecTarget) || exec.target
        };
      }
      return exec;
    });

    onUpdateDb({ ...db, executives: updatedExecutives });
    setIsEditExecModalOpen(false);
    showToast(`Executive account details & password updated for ${editExecName}!`);
  };
  
  // Brand Margin Form / Editing States
  const [editingBrandName, setEditingBrandName] = useState(null);
  const [editMaxMargin, setEditMaxMargin] = useState(55);
  const [editCustomerDiscount, setEditCustomerDiscount] = useState(50);
  const [editExecutiveIncentive, setEditExecutiveIncentive] = useState(5);

  // Weekly specials adding states
  const [specSelectedId, setSpecSelectedId] = useState('');
  const [isSpecDropdownOpen, setIsSpecDropdownOpen] = useState(false);
  const [specExtraDiscount, setSpecExtraDiscount] = useState(0);
  const [specIncentiveOverride, setSpecIncentiveOverride] = useState(0);
  const [specExpiryDate, setSpecExpiryDate] = useState('');

  // Invoice Detail view state
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);

  // CSV Import States
  const [importStatus, setImportStatus] = useState(null);

  // Toast alert states
  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Format currency
  const formatRupee = (value) => {
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Initialize selectedStickers with visible product IDs when products list changes
  useEffect(() => {
    if (products.length > 0 && selectedStickerIds.length === 0) {
      setSelectedStickerIds(products.map(p => p.id));
    }
  }, [products]);

  // Click outside to close specials product search dropdown
  useEffect(() => {
    const handleSpecClickOutside = (e) => {
      if (isSpecDropdownOpen && !e.target.closest('#spec-search-container')) {
        setIsSpecDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleSpecClickOutside);
    return () => document.removeEventListener('mousedown', handleSpecClickOutside);
  }, [isSpecDropdownOpen]);

  // Toggle selection of sticker print
  const toggleStickerSelection = (id) => {
    setSelectedStickerIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Select all stickers
  const selectAllStickers = () => {
    setSelectedStickerIds(products.map(p => p.id));
  };

  // Deselect all stickers
  const deselectAllStickers = () => {
    setSelectedStickerIds([]);
  };

  // Open modal to add product
  const openAddProductModal = () => {
    setIsAddProductMode(true);
    setSelectedProduct(null);
    setProductId('');
    setProductName('');
    setProductBrand(brands.length > 0 ? brands[0].name : 'KOHLER');
    setProductCategory('Faucets & Mixers');
    setProductDivision('Bathing');
    setProductSize('');
    setProductFinishing('');
    setProductLocation('');
    setProductDescription('');
    setProductStock('');
    setProductMrp('');
    setProductMgPrice('');
    setProductSpecialPrice('');
    setProductLandingCost('');
    setProductImage('');
    setIsProductModalOpen(true);
  };

  // Open modal to edit product
  const openEditProductModal = (product) => {
    setIsAddProductMode(false);
    setSelectedProduct(product);
    setProductId(product.id);
    setProductName(product.name);
    setProductBrand(product.brand);
    setProductCategory(product.category);
    setProductDivision(product.division || 'Bathing');
    setProductSize(product.size || '');
    setProductFinishing(product.finishing || '');
    setProductLocation(product.location || '');
    setProductDescription(product.description || '');
    setProductStock(product.stock);
    setProductMrp(product.mrp);
    setProductMgPrice(product.mgPrice);
    setProductSpecialPrice(product.specialPrice);
    setProductLandingCost(product.landingCost || Math.round(product.specialPrice * 0.8));
    setProductImage(product.image || '');
    setIsProductModalOpen(true);
  };

  // Handle Product Submit
  const handleProductSubmit = (e) => {
    e.preventDefault();
    const finalLandingCost = parseInt(productLandingCost) || Math.round((parseInt(productSpecialPrice) || 0) * 0.8);
    
    const productPayload = {
      id: productId,
      name: productName,
      brand: productBrand,
      category: productCategory,
      division: productDivision,
      size: productDivision === 'Tiles' ? productSize : '',
      finishing: productDivision === 'Tiles' ? productFinishing : '',
      location: productDivision === 'Tiles' ? productLocation : '',
      description: productDescription,
      stock: parseInt(productStock) || 0,
      mrp: parseInt(productMrp) || 0,
      mgPrice: parseInt(productMgPrice) || 0,
      specialPrice: parseInt(productSpecialPrice) || 0,
      landingCost: finalLandingCost,
      image: productImage,
      imageCode: isAddProductMode ? 'new' : selectedProduct.imageCode,
      stickerStatus: isAddProductMode ? 'new' : selectedProduct.stickerStatus || 'printed',
      isWeeklySpecial: isAddProductMode ? false : selectedProduct.isWeeklySpecial || false,
      extraCustomerDiscount: isAddProductMode ? 0 : selectedProduct.extraCustomerDiscount || 0,
      weeklySpecialIncentive: isAddProductMode ? 0 : selectedProduct.weeklySpecialIncentive || 0
    };

    if (isAddProductMode) {
      onAddProduct(productPayload);
      setSelectedStickerIds(prev => [...prev, productId]);
    } else {
      onEditProduct(productId, productPayload);
    }
    setIsProductModalOpen(false);
  };

  // Handle Executive Submit
  const handleExecSubmit = (e) => {
    e.preventDefault();
    if (!execName || !execEmail || !execUsername || !execPassword) {
      showToast("All fields are required.");
      return;
    }
    onAddExecutive({
      name: execName,
      email: execEmail,
      username: execUsername.trim().toLowerCase(),
      password: execPassword.trim(),
      target: parseInt(execTarget) || 5000000,
      walletBalance: 0,
      walletLedger: []
    });
    setExecName('');
    setExecEmail('');
    setExecUsername('');
    setExecPassword('');
    setExecTarget(8000000);
    showToast(`Account created successfully for ${execName}!`);
  };

  // Approve Salesforce Invoice Verification
  const handleApproveInvoice = async (quote) => {
    if (!(await window.customConfirm(
      "Approve Quotation & Credit Incentive",
      `Approve quotation ${quote.id} and credit ${formatRupee(quote.incentiveAmount)} to executive wallet?`,
      false
    ))) {
      return;
    }

    // 1. Only deduct stock if it wasn't already deducted upon invoice upload
    let updatedProducts = [...(db.products || [])];
    if (!quote.stockDeducted) {
      updatedProducts = updatedProducts.map(p => {
        const item = quote.items.find(i => i.id === p.id || i.productId === p.id);
        if (item) {
          return { ...p, stock: Math.max(0, (p.stock || 0) - item.qty) };
        }
        return p;
      });
    }

    // 2. Credit Wallet Ledger
    const walletTx = {
      id: `TX-${Date.now().toString().slice(-4)}`,
      type: 'incentive',
      amount: quote.incentiveAmount,
      description: `Incentive credited for Salesforce Invoice #${quote.invoiceNo} (Quote #${quote.id})`,
      date: new Date().toISOString()
    };

    const updatedExecutives = db.executives.map(e => {
      if (e.id === quote.executiveId) {
        const currentCleared = e.cleared || 0;
        const quoteTotalCleared = quote.items.reduce((sum, item) => sum + (item.specialPrice * item.qty), 0);
        return {
          ...e,
          walletBalance: (e.walletBalance || 0) + quote.incentiveAmount,
          walletLedger: [walletTx, ...(e.walletLedger || [])],
          cleared: currentCleared + quoteTotalCleared,
          salesCount: (e.salesCount || 0) + 1
        };
      }
      return e;
    });

    // 3. Register Sales Ledger entry for reporting
    const newSalesLedgerEntry = {
      billNo: quote.invoiceNo,
      executiveId: quote.executiveId,
      executiveName: quote.executiveName,
      date: new Date().toISOString(),
      customerMobile: quote.customerMobile,
      items: quote.items.map(item => ({
        productId: item.id || item.productId,
        name: item.name,
        qty: item.qty,
        pricePaid: item.specialPrice,
        mrp: item.mrp
      })),
      totalPaid: quote.items.reduce((sum, item) => sum + (item.specialPrice * item.qty), 0),
      totalMrp: quote.items.reduce((sum, item) => sum + (item.mrp * item.qty), 0)
    };

    // 4. Update Quotations status
    const updatedQuotations = db.quotations.map(q => {
      if (q.id === quote.id) {
        return { ...q, status: 'approved', stockDeducted: true };
      }
      return q;
    });

    // 5. Send Notification to Executive
    const newNotif = {
      id: `notif-${Date.now()}`,
      targetRole: 'executive',
      targetUserId: quote.executiveId,
      title: 'Incentive Credited',
      message: `Invoice #${quote.invoiceNo} verified! ${formatRupee(quote.incentiveAmount)} incentive credited to your wallet.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'success'
    };

    onUpdateDb({
      ...db,
      products: updatedProducts,
      executives: updatedExecutives,
      salesLedger: [newSalesLedgerEntry, ...(db.salesLedger || [])],
      quotations: updatedQuotations,
      notifications: [newNotif, ...(db.notifications || [])]
    });

    showToast(`Quotation verified! ${formatRupee(quote.incentiveAmount)} credited to executive wallet.`);
    setSelectedInvoiceDetail(null);
  };

  // State for Custom Rejection Modal
  const [rejectionModalQuote, setRejectionModalQuote] = useState(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  // Reject Salesforce Invoice (Opens custom rejection modal)
  const handleRejectInvoice = (quote) => {
    setRejectionModalQuote(quote);
    setRejectionReasonText('');
  };

  const confirmRejection = () => {
    if (!rejectionModalQuote) return;
    const quote = rejectionModalQuote;
    const reason = rejectionReasonText.trim() || "Rejection details not specified by Manager";
    
    let updatedProducts = [...(db.products || [])];
    if (quote.stockDeducted) {
      quote.items.forEach(item => {
        updatedProducts = updatedProducts.map(p => {
          if (p.id === item.productId || p.id === item.id) {
            return { ...p, stock: (p.stock || 0) + item.qty };
          }
          return p;
        });
      });
    }

    const updatedQuotations = db.quotations.map(q => {
      if (q.id === quote.id) {
        return { ...q, status: 'rejected', rejectionReason: reason, stockDeducted: false };
      }
      return q;
    });

    // Send Notification to Executive
    const newNotif = {
      id: `notif-${Date.now()}`,
      targetRole: 'executive',
      targetUserId: quote.executiveId,
      title: 'Invoice Verification Rejected',
      message: `Verification for Invoice #${quote.invoiceNo} was rejected. Reason: ${reason}`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'warning'
    };

    onUpdateDb({ 
      ...db, 
      products: updatedProducts, 
      quotations: updatedQuotations,
      notifications: [newNotif, ...(db.notifications || [])]
    });
    showToast("Verification rejected. Stock released back to clearance inventory & Executive notified.");
    setRejectionModalQuote(null);
    setSelectedInvoiceDetail(null);
  };

  // Brand Margin Setup updates
  const startEditingBrand = (brand) => {
    setEditingBrandName(brand.name);
    setEditMaxMargin(brand.maxMargin);
    setEditCustomerDiscount(brand.customerDiscount);
    setEditExecutiveIncentive(brand.executiveIncentive);
  };

  const handleSaveBrandMargins = (brandName) => {
    const updatedBrands = db.brands.map(b => {
      if (b.name === brandName) {
        return {
          ...b,
          maxMargin: parseInt(editMaxMargin) || 0,
          customerDiscount: parseInt(editCustomerDiscount) || 0,
          executiveIncentive: parseInt(editExecutiveIncentive) || 0
        };
      }
      return b;
    });

    onUpdateDb({ ...db, brands: updatedBrands });
    setEditingBrandName(null);
    showToast(`Brand margins for ${brandName} updated.`);
  };

  // Weekly Special Pickers
  const handleAddWeeklySpecial = (e) => {
    e.preventDefault();
    if (!specSelectedId) {
      showToast("Please select a product first.");
      return;
    }

    const updatedProducts = products.map(p => {
      if (p.id === specSelectedId) {
        return {
          ...p,
          isWeeklySpecial: true,
          extraCustomerDiscount: parseInt(specExtraDiscount) || 0,
          weeklySpecialIncentive: parseInt(specIncentiveOverride) || 0,
          weeklySpecialUntil: specExpiryDate || ''
        };
      }
      return p;
    });

    onUpdateDb({ ...db, products: updatedProducts });
    setSpecSelectedId('');
    setSpecExtraDiscount(0);
    setSpecIncentiveOverride(0);
    setSpecExpiryDate('');
    showToast("Product added to Weekly Specials!");
  };

  const handleRemoveWeeklySpecial = (productId) => {
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          isWeeklySpecial: false,
          extraCustomerDiscount: 0,
          weeklySpecialIncentive: 0,
          weeklySpecialUntil: ''
        };
      }
      return p;
    });

    onUpdateDb({ ...db, products: updatedProducts });
    showToast("Product removed from Weekly Specials.");
  };

  // Cash Payout Disbursement
  const handleAdminPayout = async (exec) => {
    const balance = exec.walletBalance || 0;
    if (balance <= 0) {
      showToast("No balance to pay out.");
      return;
    }

    if (!(await window.customConfirm(
      "Confirm Cash Payout",
      `Confirm cash disbursement of ${formatRupee(balance)} to ${exec.name}? Wallet balance will reset to zero.`,
      false
    ))) {
      return;
    }

    const payoutTx = {
      id: `TX-${Date.now().toString().slice(-4)}`,
      type: 'payout',
      amount: -balance,
      description: `Disbursed cash payout by Manager/Admin`,
      date: new Date().toISOString()
    };

    const updatedExecutives = db.executives.map(e => {
      if (e.id === exec.id) {
        return {
          ...e,
          walletBalance: 0,
          walletLedger: [payoutTx, ...(e.walletLedger || [])]
        };
      }
      return e;
    });

    onUpdateDb({ ...db, executives: updatedExecutives });
    showToast(`Paid out ${formatRupee(balance)} to ${exec.name}!`);
  };

  // Campaign DB Reset helper
  const handleResetDatabase = async () => {
    if (await window.customConfirm(
      "Factory Reset Database",
      "WARNING: This will reset the showroom campaign database to its initial defaults. All verified invoices, quotations, and wallet ledger logs will be wiped. Proceed?",
      true,
      "Factory Reset"
    )) {
      // Save a clean DB with productsInitialized:true so seed data doesn't reload
      const cleanDb = {
        products: [],
        productsInitialized: true,
        executives: (db.executives || []).map(exec => ({
          ...exec,
          cleared: 0,
          salesCount: 0,
          walletBalance: 0,
          walletLedger: []
        })),
        salesLedger: [],
        quotations: [],
        notifications: [],
        brands: db.brands || [],
        weeklySpecials: []
      };
      if (onUpdateDb) onUpdateDb(cleanDb);
      try {
        await fetch('/api/reset-db', { method: 'POST' });
      } catch (e) {
        console.error("Failed to reset server database:", e);
      }
      showToast('Factory reset complete. All products and history cleared.');
    }
  };

  const handleClearAllProducts = async () => {
    if (await window.customConfirm(
      "Clear Clearance Inventory & Stats",
      "⚠️ ARE YOU SURE YOU WANT TO CLEAR ALL CLEARANCE INVENTORY PRODUCTS?\nThis will erase all clearance products and wipe all sales ledger, quotations, and executive incentives so you can start a fresh campaign from scratch.",
      true,
      "Clear All Data"
    )) {
      const updatedExecutives = (db.executives || []).map(exec => ({
        ...exec,
        cleared: 0,
        salesCount: 0,
        walletBalance: 0,
        walletLedger: []
      }));
      const updatedDb = { 
        ...db, 
        products: [],
        productsInitialized: true,  // Prevent seed data from reloading on next page load
        deletedProductIds: [],       // Reset tracked deletes - fresh start
        salesLedger: [], 
        quotations: [], 
        notifications: [],
        executives: updatedExecutives 
      };
      if (onUpdateDb) onUpdateDb(updatedDb);
      try {
        await fetch('/api/reset-products', { method: 'POST' });
      } catch (e) {
        console.error("Failed to clear products on server:", e);
      }
      showToast("All clearance inventory and campaign history cleared! Ready for new CSV import.");
    }
  };

  // Filter states
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStockFilter, setInventoryStockFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Quotation Audit filter states
  const [quoteExecFilter, setQuoteExecFilter] = useState('ALL');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('ALL');
  const [quoteSearch, setQuoteSearch] = useState('');
  const [specSearchQuery, setSpecSearchQuery] = useState('');

  // Auto-select matching product when typing search in Weekly Specials
  useEffect(() => {
    if (specSearchQuery.trim()) {
      const matching = products.filter(p => !isWeeklySpecialActive(p) && (p.id + p.name + p.brand).toLowerCase().includes(specSearchQuery.trim().toLowerCase()));
      if (matching.length > 0) {
        setSpecSelectedId(matching[0].id);
      }
    }
  }, [specSearchQuery, products]);

  const filteredAuditQuotations = (quotations || []).filter(q => {
    const matchesExec = quoteExecFilter === 'ALL' || (q.executiveName || '').toLowerCase().includes(quoteExecFilter.toLowerCase()) || q.executiveId === quoteExecFilter;
    const matchesStatus = quoteStatusFilter === 'ALL' || q.status === quoteStatusFilter;
    const searchStr = quoteSearch.trim().toLowerCase();
    const matchesSearch = !searchStr || 
      (q.id || '').toLowerCase().includes(searchStr) ||
      (q.customerName || '').toLowerCase().includes(searchStr) ||
      (q.customerMobile || '').toLowerCase().includes(searchStr) ||
      (q.executiveName || '').toLowerCase().includes(searchStr);
    return matchesExec && matchesStatus && matchesSearch;
  });

  const handleCancelAuditQuotation = async (quoteId) => {
    const targetQuote = (quotations || []).find(q => q.id === quoteId);
    if (!targetQuote) return;

    if (await window.customConfirm(
      "Cancel Quotation",
      `Cancel quotation ${quoteId} and release reserved stock back to clearance inventory?`,
      false
    )) {
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

      const updatedQuotes = (quotations || []).map(q => 
        q.id === quoteId ? { ...q, status: 'cancelled', stockDeducted: false } : q
      );
      if (onUpdateDb) {
        onUpdateDb({ ...db, products: updatedProducts, quotations: updatedQuotes });
      }
      showToast(`Quotation ${quoteId} cancelled & stock released back to inventory!`);
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [inventoryBrandFilter, inventoryDivisionFilter, inventoryAgeFilter, inventoryStockFilter, inventorySearch]);

  // Filter products list in stock tab
  const filteredInventoryProducts = products.filter(p => {
    const matchesBrand = inventoryBrandFilter === 'ALL' || p.brand.toUpperCase() === inventoryBrandFilter.toUpperCase();
    const matchesDivision = inventoryDivisionFilter === 'ALL' || (p.division || 'Bathing').toLowerCase() === inventoryDivisionFilter.toLowerCase();
    
    const age = getProductStockAgeMonths(p);
    let matchesAge = true;
    if (inventoryAgeFilter === '6') {
      matchesAge = age > 6;
    } else if (inventoryAgeFilter === '12') {
      matchesAge = age >= 12;
    }

    let matchesStock = true;
    if (inventoryStockFilter === 'INSTOCK') {
      matchesStock = p.stock > 0;
    } else if (inventoryStockFilter === 'OUTOFSTOCK') {
      matchesStock = p.stock <= 0;
    }

    const searchStr = inventorySearch.trim().toLowerCase();
    let matchesSearch = true;
    if (searchStr) {
      matchesSearch = (p.id || '').toLowerCase().includes(searchStr) ||
        (p.name || '').toLowerCase().includes(searchStr) ||
        (p.brand || '').toLowerCase().includes(searchStr) ||
        (p.category || '').toLowerCase().includes(searchStr) ||
        (p.division || '').toLowerCase().includes(searchStr) ||
        (p.description || '').toLowerCase().includes(searchStr) ||
        (p.location || '').toLowerCase().includes(searchStr) ||
        (p.size || '').toLowerCase().includes(searchStr);
    }
    
    return matchesBrand && matchesDivision && matchesAge && matchesStock && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredInventoryProducts.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventoryProducts = filteredInventoryProducts.slice(startIndex, startIndex + itemsPerPage);

  // Filter stickers checklist
  const filteredStickerProducts = products.filter(p => {
    const matchesBrand = stickerBrandFilter === 'ALL' || p.brand.toUpperCase() === stickerBrandFilter.toUpperCase();
    const matchesStatus = stickerStatusFilter === 'ALL' || 
      (stickerStatusFilter === 'new' && p.stickerStatus === 'new') || 
      (stickerStatusFilter === 'printed' && p.stickerStatus === 'printed');
    const matchesSearch = p.id.toLowerCase().includes(stickerSearch.toLowerCase()) || 
      p.name.toLowerCase().includes(stickerSearch.toLowerCase());
    return matchesBrand && matchesStatus && matchesSearch;
  });

  // Print stickers handler (Marks new stickers as printed in database)
  const handlePrintStickers = () => {
    window.print();
    
    // Mark the unprinted stickers in selection as printed
    const updatedProducts = products.map(p => {
      if (selectedStickerIds.includes(p.id) && p.stickerStatus === 'new') {
        return { ...p, stickerStatus: 'printed' };
      }
      return p;
    });

    onUpdateDb({ ...db, products: updatedProducts });
    showToast("Stickers status updated to printed.");
  };

  // Sticker print selector rendering list
  const stickersToPrint = products.filter(p => selectedStickerIds.includes(p.id));

  // CSV downloads via Blob
  const downloadCSVSample = () => {
    let rows = ["id,name,brand,category,division,description,stock,mrp,mgPrice,specialPrice,landingCost,size,finishing,location,inStockSince,image"];
    
    products.forEach(p => {
      const desc = p.description ? p.description.replace(/"/g, '""').replace(/\n/g, ' ') : "";
      const img = p.image ? p.image : "";
      const div = p.division || ((p.category || '').toLowerCase().includes('tiles') ? 'Tiles' : 'Bathing');
      const sz = p.size || "";
      const fin = p.finishing || "";
      const loc = p.location || "";
      const since = p.inStockSince || "2025-11-20";
      rows.push(`"${p.id}","${(p.name || '').replace(/"/g, '""')}","${p.brand}","${p.category}","${div}","${desc}",${p.stock},${p.mrp},${p.mgPrice},${p.specialPrice},${p.landingCost || Math.round(p.specialPrice * 0.8)},"${sz}","${fin}","${loc}","${since}","${img}"`);
    });

    const csvString = rows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "mg_clearance_inventory_sheet.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Current Inventory CSV downloaded successfully!");
  };

  // Parse CSV file upload supporting dynamic headers and smart upsert
  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split("\n");
      if (lines.length < 1) {
        setImportStatus({ success: false, message: "Invalid CSV. The file is empty." });
        return;
      }

      const delimiter = lines[0].includes(';') ? ';' : ',';

      const parseCSVLine = (lineStr) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < lineStr.length; i++) {
          const char = lineStr[i];
          if (char === '"') {
            if (inQuotes && lineStr[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === delimiter && !inQuotes) {
            result.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current);
        return result.map(val => val.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      };


      const safeParseInt = (val, fallback = 0) => {
        if (!val) return fallback;
        const clean = val.replace(/,/g, '').trim();
        const parsed = parseInt(clean, 10);
        return isNaN(parsed) ? fallback : parsed;
      };

      const safeParseFloat = (val, fallback = 0) => {
        if (!val) return fallback;
        const clean = String(val).replace(/,/g, '').trim();
        const parsed = parseFloat(clean);
        return isNaN(parsed) ? fallback : Math.round(parsed); // round to nearest rupee
      };

      const headersRow = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      
      const getIndex = (possibleNames, fallbackIndex) => {
        const isPriceSearch = possibleNames.some(n => ['mrp', 'specialprice', 'clearanceprice', 'landingcost'].includes(n.replace(/[\s_-]/g, '').toLowerCase()));
        
        // 1. Try exact cleaned match (ignoring spaces, underscores, dashes)
        for (const name of possibleNames) {
          const cleanName = name.replace(/[\s_-]/g, '').toLowerCase();
          const idx = headersRow.findIndex(h => {
            const cleanH = h.replace(/[\s_-]/g, '').toLowerCase();
            if (isPriceSearch && (cleanH.includes('incentive') || cleanH.includes('inective') || cleanH.includes('commission') || cleanH.includes('reward'))) {
              return false;
            }
            return cleanH === cleanName;
          });
          if (idx !== -1) return idx;
        }
        // 2. Try substring cleaned match
        for (const name of possibleNames) {
          const cleanName = name.replace(/[\s_-]/g, '').toLowerCase();
          const idx = headersRow.findIndex(h => {
            const cleanH = h.replace(/[\s_-]/g, '').toLowerCase();
            if (isPriceSearch && (cleanH.includes('incentive') || cleanH.includes('inective') || cleanH.includes('commission') || cleanH.includes('reward'))) {
              return false;
            }
            return cleanH.includes(cleanName);
          });
          if (idx !== -1) return idx;
        }
        return fallbackIndex;
      };

      // ── Column Index Detection ───────────────────────────────────────────
      // Supports Watero/clearance spreadsheet format:
      //   Item No. | Item Description | brand | In Stock | lc | mrp | selling rate(lc+25%) | 5% incentive
      // and also generic CSV exports from the app itself.

      const idIdx = getIndex(['id', 'code', 'productcode', 'product_code', 'itemno', 'item_no', 'item_code', 'itemno.', 'sno'], 0);
      const nameIdx = getIndex(['name', 'productname', 'product_name', 'itemname', 'item_name', 'itemdescription', 'item_description', 'description'], 1);
      const brandIdx = getIndex(['brand'], 2);
      const catIdx = getIndex(['category', 'product_category', 'division'], 3);
      const divIdx = getIndex(['division', 'dept', 'department'], 4);
      const descIdx = getIndex(['description', 'remarks', 'details'], 5);

      // 'In Stock' column — header may be 'In Stock', 'instock', 'stock', 'qty'
      const stockIdx = getIndex(['instock', 'in_stock', 'stock', 'quantity', 'qty', 'stockqty', 'stock_qty', 'available'], 3);

      // 'lc' = Landing Cost (column E in Watero sheet, index 4)
      const landingIdx = getIndex(['lc', 'landingcost', 'landing_cost', 'cost', 'costprice', 'cost_price', 'purchaseprice', 'purchase_price', 'itemprice', 'item_price'], 4);

      // 'mrp' column (column F in Watero sheet, index 5)
      const mrpIdx = getIndex(['mrp', 'mrprate', 'mrp_rate', 'msp', 'retailprice', 'retail_price'], 5);

      const mgPriceIdx = getIndex(['mgprice', 'mg_price', 'galleryprice', 'gallery_price'], -1);

      // 'selling rate(lc +25%)' or 'sellingrate' = clearance/special price (column G, index 6)
      let specIdx = getIndex([
        'sellingrate', 'selling_rate', 'sellingprice', 'selling_price',
        'specialprice', 'clearanceprice', 'clearance_price', 'special_price',
        'clearancerate', 'clearance_rate', 'offerprice', 'offer_price',
        'netprice', 'net_price', 'finalprice', 'final_price',
        'saleprice', 'sale_price', 'clearance', 'offer'
      ], -1);

      if (specIdx === -1) {
        // If header has 'lc+25%' or 'incentive' nearby, column before incentive = selling rate
        const incentiveIdx = headersRow.findIndex(h => {
          const n = h.replace(/[\s_\-().]/g, '').toLowerCase();
          return n.includes('incentive') || n.includes('inective') || n.includes('%incentive');
        });
        if (incentiveIdx > 0) {
          specIdx = incentiveIdx - 1;
        } else {
          // fallback: 7th column (index 6) = selling rate
          specIdx = 6;
        }
      }

      const sizeIdx = getIndex(['size', 'dimension'], 11);
      const finishIdx = getIndex(['finishing', 'finish', 'surface'], 12);
      const locIdx = getIndex(['location', 'rack', 'pallet', 'bin', 'firstbinloc'], 13);
      const sinceIdx = getIndex(['instocksince', 'in_stock_since', 'since', 'date'], 14);
      const imgIdx = getIndex(['image', 'img', 'photo'], 15);

      const parsedItems = [];
      let updatedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (!line) continue;

        const row = parseCSVLine(line);
        if (row.length < 2) continue;

        const idValue = row[idIdx]?.trim();
        if (!idValue || idValue.toLowerCase() === 'id' || idValue.toLowerCase() === 'productcode' || idValue.toLowerCase() === 'item no.') continue;

        // Smart Brand Extraction from parentheses or text (e.g. "(WATERO)")
        const fullText = (row[nameIdx] || '') + ' ' + (row[descIdx] || '') + ' ' + line;
        let extractedBrand = row[brandIdx]?.trim() || '';

        const parenthesizedMatch = fullText.match(/\(([^)]+)\)/);
        if (parenthesizedMatch && parenthesizedMatch[1]) {
          extractedBrand = parenthesizedMatch[1].trim();
        }

        if (!extractedBrand || extractedBrand.toUpperCase() === 'OTHER') {
          if (fullText.toUpperCase().includes('WATERO')) extractedBrand = 'WATERO';
          else if (fullText.toUpperCase().includes('TOTO')) extractedBrand = 'TOTO';
          else if (fullText.toUpperCase().includes('ALMAR')) extractedBrand = 'ALMAR';
          else if (fullText.toUpperCase().includes('KAJARIA')) extractedBrand = 'KAJARIA';
          else if (fullText.toUpperCase().includes('FRANKE')) extractedBrand = 'FRANKE';
          else if (fullText.toUpperCase().includes('REGINOX')) extractedBrand = 'REGINOX';
          else if (fullText.toUpperCase().includes('SIMPOLO')) extractedBrand = 'SIMPOLO';
          else extractedBrand = 'WATERO';
        }

        extractedBrand = extractedBrand.toUpperCase();

        // 1. Extract exact numerical rates directly from CSV columns
        let mrpValue = safeParseInt(row[mrpIdx], 0);
        let specValue = specIdx >= 0 ? safeParseInt(row[specIdx], 0) : 0;
        let landingValue = landingIdx >= 0 ? safeParseFloat(row[landingIdx], 0) : 0;

        // 2. KEY LOGIC: If lc (landing cost) is present, auto-calculate selling rate as lc * 1.25
        //    This matches the Watero spreadsheet formula: selling rate = lc + 25%
        if (landingValue > 0 && specValue <= 0) {
          specValue = Math.round(landingValue * 1.25);
        }

        // 3. Fallback only if values are completely missing in CSV row
        if (specValue <= 0 || mrpValue <= 0) {
          const lineWithoutIds = line.replace(/[A-Z]{2,}\d+/gi, '');
          const linePrices = (lineWithoutIds.match(/\d+(?:\.\d+)?/g) || [])
            .map(n => Math.round(parseFloat(n)))
            .filter(n => n > 25);

          if (specValue <= 0 && linePrices.length > 0) {
            specValue = linePrices[linePrices.length - 1];
          }
          if (mrpValue <= 0 && linePrices.length >= 2) {
            const sorted = [...linePrices].sort((a, b) => b - a);
            mrpValue = sorted[0];
          }
        }

        // 4. Final fallbacks
        if (mrpValue <= 0 && specValue > 0) {
          mrpValue = Math.round(specValue * 1.5);
        }
        if (landingValue <= 0 && specValue > 0) {
          landingValue = Math.round(specValue * 0.8);
        }

        parsedItems.push({
          id: idValue,
          name: row[nameIdx] || `Product ${idValue}`,
          brand: extractedBrand,
          category: row[catIdx] || 'Sanitaryware Clearance',
          division: row[divIdx] || ((row[catIdx] || '').toLowerCase().includes('tiles') ? 'Tiles' : 'Bathing'),
          description: row[descIdx] || row[nameIdx] || '',
          stock: safeParseInt(row[stockIdx], 1) || 1,
          mrp: mrpValue,
          mgPrice: safeParseInt(row[mgPriceIdx], Math.round(mrpValue * 0.8)),
          specialPrice: specValue,
          landingCost: landingValue,
          size: row[sizeIdx] || '',
          finishing: row[finishIdx] || '',
          location: row[locIdx] || '',
          inStockSince: row[sinceIdx] || '2025-11-20',
          image: row[imgIdx] || '',
          stickerStatus: 'new'
        });
        updatedCount++;
      }

      onBulkUpdateStock(parsedItems, true);

      const newProductIds = parsedItems.map(item => item.id);
      setSelectedStickerIds(prev => [...new Set([...prev, ...newProductIds])]);

      setImportStatus({
        success: true,
        message: `Successfully processed ${updatedCount} products from CSV. All brand tags (WATERO) and inventory registered!`
      });
      setTimeout(() => setImportStatus(null), 6000);
    };

    reader.readAsText(file);
  };

  // Get active pending invoices list
  const pendingQuotes = quotations.filter(q => q.status === 'pending_verification');

  // Earned leaderboard
  const topEarners = [...executives].map(exec => {
    const totalEarned = exec.walletLedger
      ? exec.walletLedger.filter(l => l.type === 'incentive').reduce((sum, l) => sum + l.amount, 0)
      : 0;
    return { ...exec, totalEarned };
  }).sort((a, b) => b.totalEarned - a.totalEarned);

  return (
    <div className="fade-in">
      
      {/* Toast Announcement */}
      {toast && (
        <div className="toast-notification">
          <span>{toast}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {currentUser.role === 'admin' ? 'System Admin Controller' : 'Manager Stock Controller'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {currentUser.role === 'admin' 
              ? 'System configurations, user account credentials & security controls' 
              : 'Manage clearance stock, executive quotation audit, brand margins, weekly offers & invoice verification'}
          </p>
        </div>
      </div>



      <div className="admin-panel-layout" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Sidebar Navigation */}
        <aside className="admin-sidebar" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Manager Operations Sidebar - ONLY shown for Manager role */}
          {currentUser.role === 'manager' && (
            <>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem', paddingLeft: '0.5rem' }}>
                  Main Operations
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <button 
                    type="button"
                    className={`sidebar-nav-btn ${activeTab === 'inventory' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('inventory')}
                  >
                    Clearance Stock Inventory
                  </button>
                  <button 
                    type="button"
                    className={`sidebar-nav-btn ${activeTab === 'verify' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('verify')}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span>Verify Invoices</span>
                    {pendingQuotes.length > 0 && (
                      <span className="badge badge-rose" style={{ padding: '0.1rem 0.35rem', fontSize: '0.65rem', borderRadius: '10px' }}>
                        {pendingQuotes.length}
                      </span>
                    )}
                  </button>
                  <button 
                    type="button"
                    className={`sidebar-nav-btn ${activeTab === 'quotes_audit' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('quotes_audit')}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span>Quotation & Stock Audit</span>
                    {quotations.filter(q => q.status === 'draft' || q.status === 'pending_verification').length > 0 && (
                      <span className="badge badge-cyan" style={{ padding: '0.1rem 0.35rem', fontSize: '0.65rem', borderRadius: '10px' }}>
                        {quotations.filter(q => q.status === 'draft' || q.status === 'pending_verification').length}
                      </span>
                    )}
                  </button>
                  <button 
                    type="button"
                    className={`sidebar-nav-btn ${activeTab === 'reports' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('reports')}
                  >
                    Campaign Stock Analytics
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem', paddingLeft: '0.5rem' }}>
                  Stock Management
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <button 
                    type="button"
                    className={`sidebar-nav-btn ${activeTab === 'stickers' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('stickers')}
                  >
                    Showroom QR Stickers
                  </button>
                  <button 
                    type="button"
                    className={`sidebar-nav-btn ${activeTab === 'import' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('import')}
                  >
                    Bulk Stock Import
                  </button>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem', paddingLeft: '0.5rem' }}>
                  Campaign Config
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <button 
                    type="button"
                    className={`sidebar-nav-btn ${activeTab === 'specials' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('specials')}
                  >
                    Weekly Specials
                  </button>
                  <button 
                    type="button"
                    className={`sidebar-nav-btn ${activeTab === 'brands_margins' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('brands_margins')}
                  >
                    Brand Setup & Margins
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Admin Only Root System Operations - ONLY shown for Admin role */}
          {currentUser.role === 'admin' && (
            <div>
              <span style={{ fontSize: '0.65rem', color: 'var(--accent-emerald)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem', paddingLeft: '0.5rem' }}>
                System Administration
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button 
                  type="button"
                  className={`sidebar-nav-btn ${activeTab === 'executives' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('executives')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <KeyRound size={15} color="var(--accent-emerald)" />
                  <span>Team Passwords & Security</span>
                </button>
                <button 
                  type="button"
                  className={`sidebar-nav-btn ${activeTab === 'dns' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('dns')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Globe size={15} color="var(--accent-emerald)" />
                  <span>DNS & Custom Domain</span>
                </button>
                <button 
                  type="button"
                  className={`sidebar-nav-btn ${activeTab === 'db_tools' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('db_tools')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Database size={15} color="var(--accent-emerald)" />
                  <span>Database Reset & Backup</span>
                </button>
                <button 
                  type="button"
                  className={`sidebar-nav-btn ${activeTab === 'system_logs' ? 'active' : ''}`} 
                  onClick={() => setActiveTab('system_logs')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <ShieldAlert size={15} color="var(--accent-rose)" />
                  <span>System Error & Security Logs</span>
                  {((db.systemLogs || []).filter(l => l.level === 'CRITICAL' || l.level === 'SECURITY').length) > 0 && (
                    <span className="badge badge-rose" style={{ marginLeft: 'auto', fontSize: '0.6rem', padding: '0.1rem 0.35rem', fontWeight: 800 }}>
                      {(db.systemLogs || []).filter(l => l.level === 'CRITICAL' || l.level === 'SECURITY').length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}


        </aside>

        {/* Right Main Content Panel */}
        <div className="glass-panel dashboard-panel" style={{ minWidth: 0 }}>

        {/* Tab 1: Clearance Stock Table */}
        {activeTab === 'inventory' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 className="panel-title" style={{ marginBottom: 0 }}>
                Showroom Clearance Inventory ({products.length} Products)
              </h3>
              
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="🔍 Search code, name, brand, location..." 
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', width: '100%' }}
                  />
                </div>

                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Division:</label>
                <select 
                  className="filter-select"
                  value={inventoryDivisionFilter} 
                  onChange={(e) => setInventoryDivisionFilter(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
                >
                  <option value="ALL">All Divisions</option>
                  {divisionsList.map(div => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>

                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Brand:</label>
                <select 
                  className="filter-select"
                  value={inventoryBrandFilter} 
                  onChange={(e) => setInventoryBrandFilter(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
                >
                  <option value="ALL">All Brands</option>
                  {brands.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>

                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Availability:</label>
                <select 
                  className="filter-select"
                  value={inventoryStockFilter} 
                  onChange={(e) => setInventoryStockFilter(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
                >
                  <option value="ALL">All Items</option>
                  <option value="INSTOCK">In Stock Only</option>
                  <option value="OUTOFSTOCK">Out of Stock</option>
                </select>

                <button className="btn btn-primary" onClick={openAddProductModal}>
                  <Plus size={16} />
                  Add Product
                </button>
              </div>
            </div>
            {/* Bulk Liquidation Action for Filtered Aging Stock */}
            {inventoryAgeFilter !== 'ALL' && filteredInventoryProducts.length > 0 && (
              <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem', border: '1px dashed var(--accent-rose)', background: 'rgba(239, 68, 68, 0.02)', borderRadius: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--accent-rose)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle size={16} />
                  <span>Bulk Liquidation Action ({filteredInventoryProducts.length} Aging Items Selected)</span>
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: '1rem' }}>
                  Quickly assign clearance offer prices and executive sales commission percentages for all {filteredInventoryProducts.length} filtered products.
                </p>
                <form onSubmit={handleBulkLiquidationSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ marginBottom: 0, width: '150px' }}>
                    <label className="form-label">Clearance Disc. %</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 50" 
                      value={bulkDiscount} 
                      onChange={(e) => setBulkDiscount(e.target.value)} 
                      style={{ height: '36px', fontSize: '0.85rem' }}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, width: '150px' }}>
                    <label className="form-label">Exec. Incentive %</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 10" 
                      value={bulkIncentive} 
                      onChange={(e) => setBulkIncentive(e.target.value)} 
                      style={{ height: '36px', fontSize: '0.85rem' }}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-rose" style={{ height: '36px', padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, background: 'var(--accent-rose)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <Percent size={14} />
                    Apply Clearance Scheme in Bulk
                  </button>
                </form>
              </div>
            )}

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>SL No.</th>
                    <th>ID / Code</th>
                    <th>Image</th>
                    <th>Product Details</th>
                    <th>Brand</th>
                    <th>Stock</th>
                    <th>Landing Cost</th>
                    <th>MRP Rate</th>
                    <th>Clearance Price</th>
                    <th>Weekly Special</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInventoryProducts.length === 0 ? (
                    <tr>
                      <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No clearance products found matching the selected search or filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedInventoryProducts.map((p, index) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{p.id}</td>
                        <td>
                          {p.image ? (
                            <img src={p.image} alt={p.name} style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No Image</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.description?.slice(0, 60)}...</div>
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', fontSize: '0.65rem', flexWrap: 'wrap' }}>
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                              {p.division || 'Bathing'}
                            </span>
                            {p.division === 'Tiles' && (
                              <>
                                <span style={{ color: 'var(--text-muted)' }}>Size: {p.size || 'N/A'}</span>
                                <span style={{ color: 'var(--text-muted)' }}>Finish: {p.finishing || 'N/A'}</span>
                                <span style={{ color: 'var(--accent-cyan)' }}>Loc: {p.location || 'N/A'}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td><span className={`brand-pill ${p.brand.toLowerCase()}`}>{p.brand}</span></td>
                        <td>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={p.stock} 
                            onChange={(e) => onUpdateStock(p.id, e.target.value)}
                            style={{ width: '65px', padding: '0.25rem 0.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}
                          />
                        </td>
                        <td>{formatRupee(p.landingCost || Math.round(p.specialPrice * 0.8))}</td>
                        <td style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatRupee(p.mrp)}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent-rose)' }}>{formatRupee(p.specialPrice)}</td>
                        <td>
                          {isWeeklySpecialActive(p) ? (
                            <span className="badge badge-warning" title={p.weeklySpecialUntil ? `Valid until ${p.weeklySpecialUntil}` : 'Indefinite duration'}>Special</span>
                          ) : p.isWeeklySpecial ? (
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '0.1rem 0.3rem', borderRadius: '4px' }} title={`Expired on ${p.weeklySpecialUntil}`}>Expired</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => openEditProductModal(p)}>
                              <Edit size={14} />
                            </button>
                             <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', border: 'none' }} onClick={async () => { if (await window.customConfirm("Remove Product", "Are you sure you want to remove this item from clearance?", true, "Remove")) onDeleteProduct(p.id); }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredInventoryProducts.length > 0 ? startIndex + 1 : 0}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(startIndex + itemsPerPage, filteredInventoryProducts.length)}</strong> of <strong style={{ color: 'var(--accent-cyan)' }}>{filteredInventoryProducts.length}</strong> clearance items
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Items per page:</span>
                <select 
                  className="filter-select" 
                  value={itemsPerPage} 
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  style={{ width: '70px', padding: '0.2rem 0.4rem', fontSize: '0.75rem', borderRadius: '6px' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginLeft: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                  >
                    ← Prev
                  </button>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0 0.6rem', color: 'var(--accent-cyan)' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    className="btn btn-secondary" 
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Verify Invoices & Credit Incentives */}
        {activeTab === 'verify' && (
          <div className="fade-in">
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={20} color="var(--accent-emerald)" />
              Salesforce Invoice Verification Queue ({pendingQuotes.length} Pending)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Sales executives save quotations and submit Salesforce receipt attachments. Review receipt files against Salesforce IDs below. Approving will decrement clearance stock, register sales logs, and credit wallet incentives.
            </p>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Quote ID</th>
                    <th>Date Filed</th>
                    <th>Sales Executive</th>
                    <th>Client Details</th>
                    <th>Showroom Invoice No</th>
                    <th>Quoted Value</th>
                    <th>Calculated Incentive</th>
                    <th>Receipt File</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingQuotes.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        Verification queue is empty. No pending uploads.
                      </td>
                    </tr>
                  ) : (
                    pendingQuotes.map(quote => (
                      <tr key={quote.id}>
                        <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{quote.id}</td>
                        <td>{new Date(quote.date).toLocaleDateString('en-IN')}</td>
                        <td><strong>{quote.executiveName}</strong></td>
                        <td>
                          <div>{quote.customerName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{quote.customerMobile}</div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{quote.invoiceNo}</td>
                        <td style={{ fontWeight: 600 }}>{formatRupee(quote.items.reduce((s,i)=>s+(i.specialPrice*i.qty),0))}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{formatRupee(quote.incentiveAmount)}</td>
                        <td>
                          {quote.uploadedBill ? (
                            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }} onClick={() => setSelectedInvoiceDetail(quote)}>
                              <Eye size={10} />
                              Preview Receipt
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>No File</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button className="btn btn-emerald" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }} onClick={() => handleApproveInvoice(quote)}>
                              Approve
                            </button>
                            <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: 'none' }} onClick={() => handleRejectInvoice(quote)}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2.5: Quotation & Reserved Stock Audit */}
        {activeTab === 'quotes_audit' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <FileText size={20} color="var(--accent-cyan)" />
                  Executive Quotation Audit & Reserved Stock ({quotations.length} Total)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Audit unbilled quotations created by sales executives. Quotations hold items as reserved stock without deducting physical inventory. Managers can filter by executive, audit unbilled deals, or cancel quotations to release blocked stock.
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="🔍 Search Quote ID, client, mobile..." 
                  value={quoteSearch}
                  onChange={(e) => setQuoteSearch(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', width: '100%' }}
                />
              </div>

              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Executive Filter:</label>
              <select 
                className="filter-select"
                value={quoteExecFilter} 
                onChange={(e) => setQuoteExecFilter(e.target.value)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
              >
                <option value="ALL">All Executives</option>
                {executives.map(e => (
                  <option key={e.id} value={e.name}>{e.name}</option>
                ))}
              </select>

              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status Filter:</label>
              <select 
                className="filter-select"
                value={quoteStatusFilter} 
                onChange={(e) => setQuoteStatusFilter(e.target.value)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px' }}
              >
                <option value="ALL">All Quotations</option>
                <option value="draft">Pending Billing (Draft)</option>
                <option value="pending_verification">Submitted Receipt</option>
                <option value="approved">Billed & Stock Deducted</option>
                <option value="cancelled">Cancelled / Stock Released</option>
              </select>
            </div>

            {/* Audit Table */}
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Quote ID</th>
                    <th>Date Created</th>
                    <th>Sales Executive</th>
                    <th>Customer Name & Mobile</th>
                    <th>Reserved Items</th>
                    <th>Quoted Value</th>
                    <th>Status</th>
                    <th>Manager Audit Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditQuotations.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No quotations found matching the selected executive or status filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditQuotations.map(quote => {
                      const isPending = quote.status === 'draft' || quote.status === 'pending_verification';
                      const totalVal = quote.items.reduce((s, i) => s + ((i.specialPrice || i.pricePaid || 0) * i.qty), 0);
                      const totalQty = quote.items.reduce((s, i) => s + i.qty, 0);

                      return (
                        <tr key={quote.id}>
                          <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{quote.id}</td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {new Date(quote.date).toLocaleDateString('en-IN')}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                              👤 {quote.executiveName}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{quote.customerName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>📱 {quote.customerMobile}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{totalQty} items reserved</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {quote.items.map(i => `${i.name} (${i.qty})`).join(', ').slice(0, 45)}...
                            </div>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{formatRupee(totalVal)}</td>
                          <td>
                            {quote.status === 'approved' ? (
                              <span className="badge badge-emerald">Billed & Deducted</span>
                            ) : quote.status === 'cancelled' ? (
                              <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>Cancelled & Released</span>
                            ) : quote.status === 'pending_verification' ? (
                              <span className="badge badge-warning">Submitted Receipt</span>
                            ) : (
                              <span className="badge badge-cyan">Stock Reserved (Draft)</span>
                            )}
                          </td>
                          <td>
                            {isPending ? (
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', border: 'none' }}
                                onClick={() => handleCancelAuditQuotation(quote.id)}
                              >
                                Cancel & Release
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed</span>
                            )}
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

        {/* Tab 3: Weekly Special Offers Config */}
        {activeTab === 'specials' && (
          <div className="fade-in">
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Volume2 size={20} color="var(--accent-amber)" />
              Weekly Special Offers & Incentives Setup
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Publish high-priority clearance offers with extra customer discounts and executive commission overrides.
            </p>
            
            {/* Top Form Panel to add special */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={16} />
                <span>Publish New Weekly Offer</span>
              </h4>
              
              <form onSubmit={handleAddWeeklySpecial} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', alignItems: 'flex-end' }}>
                <div id="spec-search-container" className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                  <label className="form-label">Select Clearance Product</label>
                  
                  {specSelectedId ? (
                    (() => {
                      const selectedProd = products.find(p => p.id === specSelectedId);
                      if (!selectedProd) return null;
                      return (
                        <div style={{ 
                          background: 'rgba(14, 165, 233, 0.05)', 
                          border: '1px solid var(--accent-cyan)', 
                          padding: '0.65rem 0.85rem', 
                          borderRadius: '8px', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginTop: '0.25rem',
                          minHeight: '46px'
                        }}>
                          <div style={{ marginRight: '1rem', overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              <span style={{ color: 'var(--accent-cyan)' }}>{selectedProd.id}</span> - {selectedProd.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              Brand: <strong>{selectedProd.brand}</strong> • Stock: <strong>{selectedProd.stock}</strong> • Special: <strong>{formatRupee(selectedProd.specialPrice)}</strong>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            className="btn btn-ghost" 
                            onClick={() => {
                              setSpecSelectedId('');
                              setSpecSearchQuery('');
                            }}
                            style={{ 
                              padding: '0.25rem 0.6rem', 
                              fontSize: '0.7rem', 
                              fontWeight: 700,
                              color: 'var(--accent-rose)', 
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.05)',
                              cursor: 'pointer'
                            }}
                          >
                            Change
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Type code or name (e.g. SA41495, WATERO)..." 
                        value={specSearchQuery}
                        onChange={(e) => {
                          setSpecSearchQuery(e.target.value);
                          setIsSpecDropdownOpen(true);
                        }}
                        onFocus={() => setIsSpecDropdownOpen(true)}
                        style={{ fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </div>
                  )}

                  {/* Interactive Floating Dropdown Results */}
                  {isSpecDropdownOpen && !specSelectedId && (
                    <div 
                      className="search-results-list"
                      style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        minWidth: '420px', 
                        maxHeight: '240px', 
                        overflowY: 'auto', 
                        zIndex: 9999,
                        background: '#121824',
                        border: '1px solid var(--accent-cyan)',
                        borderRadius: '8px',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                        marginTop: '6px'
                      }}
                    >
                      {(() => {
                        const matching = products.filter(p => !isWeeklySpecialActive(p) && p.stock > 0 && (!specSearchQuery.trim() || (p.id + p.name + p.brand).toLowerCase().includes(specSearchQuery.trim().toLowerCase())));
                        if (matching.length === 0) {
                          return (
                            <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                              No matching products found.
                            </div>
                          );
                        }
                        return matching.map(p => (
                          <div 
                            key={p.id}
                            onClick={() => {
                              setSpecSelectedId(p.id);
                              setSpecSearchQuery(`${p.id} - ${p.name}`);
                              setIsSpecDropdownOpen(false);
                            }}
                            style={{
                              padding: '0.6rem 0.85rem',
                              borderBottom: '1px solid var(--border-color)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: specSelectedId === p.id ? 'rgba(14, 165, 233, 0.15)' : 'transparent',
                              transition: 'background 0.2s ease'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                <strong style={{ color: 'var(--accent-cyan)' }}>{p.id}</strong> - {p.name}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                Brand: <strong>{p.brand}</strong> • Stock: <strong>{p.stock}</strong>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                                {formatRupee(p.specialPrice)}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                                {formatRupee(p.mrp)}
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Extra Customer Disc %</label>
                  <input 
                    type="number"
                    className="form-input"
                    value={specExtraDiscount}
                    onChange={(e) => setSpecExtraDiscount(e.target.value)}
                    placeholder="e.g. 5%"
                    min="0"
                    max="40"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Exec. Incentive Override %</label>
                  <input 
                    type="number"
                    className="form-input"
                    value={specIncentiveOverride}
                    onChange={(e) => setSpecIncentiveOverride(e.target.value)}
                    placeholder="e.g. 10%"
                    min="0"
                    max="25"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Offer Valid Until (Optional)</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={specExpiryDate}
                    onChange={(e) => setSpecExpiryDate(e.target.value)}
                    min={getLocalDateString()}
                  />
                </div>

                <button type="submit" className="btn btn-emerald" style={{ height: '42px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <Volume2 size={16} />
                  Publish Offer
                </button>
              </form>
            </div>

            {/* Active Specials list table - Full Width */}
            <div className="custom-table-container">
              <div style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Active Weekly Offers ({products.filter(p => p.isWeeklySpecial).length})
                </h4>
              </div>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Product Code</th>
                    <th>Product Details</th>
                    <th>Brand</th>
                    <th>Base Special</th>
                    <th>Extra Discount</th>
                    <th>Weekly Price</th>
                    <th>Incentive Rate</th>
                    <th>Valid Until</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.filter(p => p.isWeeklySpecial).length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No weekly special products active. Select a product in the form above to publish an offer.
                      </td>
                    </tr>
                  ) : (
                    products.filter(p => p.isWeeklySpecial).map(p => {
                      const finalOfferPrice = Math.round(p.specialPrice * (1 - (p.extraCustomerDiscount || 0) / 100));
                      return (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{p.id}</td>
                          <td><strong>{p.name}</strong></td>
                          <td><span className={`brand-pill ${p.brand.toLowerCase()}`}>{p.brand}</span></td>
                          <td>{formatRupee(p.specialPrice)}</td>
                          <td style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>
                            {p.extraCustomerDiscount > 0 ? `${p.extraCustomerDiscount}% Extra Off` : 'None'}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{formatRupee(finalOfferPrice)}</td>
                          <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                            {p.weeklySpecialIncentive > 0 ? `${p.weeklySpecialIncentive}% Override` : 'Brand standard'}
                          </td>
                          <td style={{ fontSize: '0.75rem', color: isWeeklySpecialActive(p) ? 'var(--text-secondary)' : 'var(--accent-rose)' }}>
                            {p.weeklySpecialUntil ? (
                              <>
                                {new Date(p.weeklySpecialUntil).toLocaleDateString('en-IN')}
                                {!isWeeklySpecialActive(p) && ' (Expired)'}
                              </>
                            ) : 'Indefinite'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} 
                                onClick={() => {
                                  setSelectedOfferProductId(p.id);
                                  setExtraCustomerDiscount(p.extraCustomerDiscount || 0);
                                  setExecIncentiveOverride(p.weeklySpecialIncentive || 0);
                                  setWeeklySpecialUntil(p.weeklySpecialUntil || '');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                              >
                                Edit
                              </button>
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: 'none' }} 
                                onClick={() => handleRemoveWeeklySpecial(p.id)}
                              >
                                Remove
                              </button>
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

        {/* Tab 3.5: Bulk Stock CSV Import */}
        {activeTab === 'import' && (
          <div className="fade-in">
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={20} color="var(--accent-cyan)" />
              Bulk Clearance Stock CSV Import
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Upload your showroom clearance CSV or Excel sheet to bulk import products. Supports automatic mapping of Product Code, Brand, Stock, MRP Rate, Clearance Price, and Landing Cost directly from your uploaded columns.
            </p>

            {/* Clickable Drag & Drop Upload Box */}
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{ 
                  border: '2px dashed var(--accent-cyan)', 
                  borderRadius: '16px', 
                  padding: '2.5rem 1.5rem', 
                  textAlign: 'center', 
                  background: 'rgba(6, 182, 212, 0.03)', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Upload size={44} color="var(--accent-cyan)" style={{ marginBottom: '0.75rem' }} />
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                  Click to Browse or Drag & Drop CSV File Here
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Upload clearance inventory spreadsheet (.csv or .txt file)
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button 
                    type="button"
                    className="btn btn-cyan" 
                    style={{ padding: '0.65rem 1.5rem', fontWeight: 700, pointerEvents: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Upload size={16} /> Select & Upload CSV File
                  </button>

                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      const sampleContent = "Product Code,Product Name,Brand,Category,Division,Description,Stock,MRP Rate,Clearance Price,Landing Cost\nSA41560,CORNIA CORNER WASH BASIN,WATERO,Sanitaryware,Bathing,Corner basin,5,1760,1056,715\nSA41557,CUTE BLACK WITH UF SEAT COVER EWC,WATERO,Sanitaryware,Bathing,Black EWC toilet,3,12977,7786,5278";
                      const blob = new Blob([sampleContent], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = "mg_clearance_stock_template.csv";
                      a.click();
                    }}
                    style={{ padding: '0.65rem 1.25rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Download size={16} /> Download Sample CSV Template
                  </button>
                </div>

                <input 
                  type="file" 
                  accept=".csv, .txt" 
                  ref={fileInputRef} 
                  onChange={handleCSVImport} 
                  style={{ display: 'none' }} 
                />
              </div>

              {importStatus && (
                <div style={{ 
                  marginTop: '1.25rem', 
                  padding: '1rem', 
                  borderRadius: '10px', 
                  background: importStatus.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${importStatus.success ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
                  color: importStatus.success ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}>
                  {importStatus.message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Brands & Margins Setup */}
        {activeTab === 'brands_margins' && (
          <div className="fade-in">
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Percent size={20} color="var(--accent-cyan)" />
              Showroom Brand Margins & Incentives Manager
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Set margin baseline setups for each brand. Standard product incentives will default to these commission rates unless overridden by Weekly Special promotions.
            </p>

            <div className="custom-table-container" style={{ maxWidth: '800px' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Brand Name</th>
                    <th>Max margin % (Showroom)</th>
                    <th>Customer Discount %</th>
                    <th>Executive Incentive %</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map(brand => {
                    const isEditing = editingBrandName === brand.name;
                    return (
                      <tr key={brand.name}>
                        <td style={{ fontWeight: 'bold' }}>
                          <span className={`brand-pill ${brand.name.toLowerCase()}`}>{brand.name}</span>
                        </td>
                        <td>
                          {isEditing ? (
                            <input 
                              type="number"
                              className="form-input"
                              value={editMaxMargin}
                              onChange={(e) => setEditMaxMargin(e.target.value)}
                              style={{ width: '80px', padding: '0.25rem' }}
                            />
                          ) : (
                            `${brand.maxMargin}%`
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input 
                              type="number"
                              className="form-input"
                              value={editCustomerDiscount}
                              onChange={(e) => setEditCustomerDiscount(e.target.value)}
                              style={{ width: '80px', padding: '0.25rem' }}
                            />
                          ) : (
                            `${brand.customerDiscount}%`
                          )}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                          {isEditing ? (
                            <input 
                              type="number"
                              className="form-input"
                              value={editExecutiveIncentive}
                              onChange={(e) => setEditExecutiveIncentive(e.target.value)}
                              style={{ width: '80px', padding: '0.25rem' }}
                            />
                          ) : (
                            `${brand.executiveIncentive}%`
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button className="btn btn-emerald" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleSaveBrandMargins(brand.name)}>Save</button>
                              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setEditingBrandName(null)}>Cancel</button>
                            </div>
                          ) : (
                            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => startEditingBrand(brand)}>
                              Edit Margins
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}





        {/* Tab 6: Showroom QR Stickers */}
        {activeTab === 'stickers' && (
          <div className="fade-in">
            <div className="sticker-print-controls" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
              
              {/* Sticker print filters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Brand</label>
                  <select className="form-input text-xs" style={{ height: '36px', padding: '0.2rem 0.5rem' }} value={stickerBrandFilter} onChange={(e)=>setStickerBrandFilter(e.target.value)}>
                    <option value="ALL">All Brands</option>
                    {brands.map(b=><option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Print Status</label>
                  <select className="form-input text-xs" style={{ height: '36px', padding: '0.2rem 0.5rem' }} value={stickerStatusFilter} onChange={(e)=>setStickerStatusFilter(e.target.value)}>
                    <option value="ALL">All Statuses</option>
                    <option value="new">New (Unprinted) only</option>
                    <option value="printed">Printed only</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Search items</label>
                  <input type="text" className="form-input" style={{ height: '36px' }} placeholder="Filter by name/code" value={stickerSearch} onChange={(e)=>setStickerSearch(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Select Stickers to Print</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    Only selected items ({stickersToPrint.length}) will print. Unprinted stickers display with a <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>green border</span>.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={selectAllStickers}>Select All</button>
                  <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={deselectAllStickers}>Deselect All</button>
                  <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={handlePrintStickers} disabled={stickersToPrint.length === 0}>
                    <Printer size={14} />
                    Print Selected ({stickersToPrint.length})
                  </button>
                </div>
              </div>

              {/* Checklist Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                {filteredStickerProducts.map(p => {
                  const isChecked = selectedStickerIds.includes(p.id);
                  const isNew = p.stickerStatus === 'new';
                  return (
                    <div 
                      key={p.id} 
                      className="sticker-checkbox-container" 
                      onClick={() => toggleStickerSelection(p.id)}
                      style={{ 
                        border: isNew ? '1px dashed var(--accent-emerald)' : '1px solid transparent',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px'
                      }}
                    >
                      <span className="custom-checkbox" style={{ borderColor: isChecked ? 'var(--accent-cyan)' : 'var(--border-color)', color: 'var(--accent-cyan)' }}>
                        {isChecked ? <CheckSquare size={14} /> : <Square size={14} style={{ opacity: 0.3 }} />}
                      </span>
                      <span style={{ fontSize: '0.8rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }} title={`${p.id} - ${p.name}`}>
                        {isNew && <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.25rem', background: 'var(--accent-emerald-glow)', color: 'var(--accent-emerald)', borderRadius: '3px', fontWeight: 'bold' }}>NEW</span>}
                        <strong>{p.id}</strong> - {p.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sticker Grid Sheet */}
            <div className="sticker-sheet-grid print-area">
              {stickersToPrint.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No stickers selected for printing. Check products above.
                </div>
              ) : (
                stickersToPrint.map(p => {
                  const scanLink = `${window.location.origin}${window.location.pathname}#/scan/${p.id}`;
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(scanLink)}`;
                  const isNew = p.stickerStatus === 'new';
                  return (
                    <div 
                      key={p.id} 
                      className={`qr-sticker ${isNew ? 'new-sticker-print' : ''}`}
                      style={{
                        border: isNew ? '3px solid var(--accent-emerald)' : '1.5px solid #0f172a'
                      }}
                    >
                      <div className="qr-sticker-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>MARBLE GALLERY</span>
                        {isNew && <span style={{ fontSize: '8px', background: 'var(--accent-emerald)', color: '#fff', padding: '1px 4px', borderRadius: '3px' }}>NEW TAG</span>}
                      </div>
                      <div className="qr-sticker-desc">LUXE BATHROOM</div>
                      
                      <img src={qrUrl} alt={`QR Code for ${p.id}`} className="qr-code-placeholder" />

                      <div className="qr-sticker-name">{p.name}</div>
                      <div className="qr-sticker-code">{p.id}</div>
                      
                      <div className="qr-sticker-prices">
                        <div className="qr-sticker-price">MRP: <span style={{ textDecoration: 'line-through' }}>{formatRupee(p.mrp)}</span></div>
                        <div className="qr-sticker-price special" style={{ color: '#0284c7', fontWeight: 800 }}>OFFER PRICE: {formatRupee(p.specialPrice)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 7: Team Accounts & Password Security Center */}
        {activeTab === 'executives' && (
          <div className="fade-in">
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <ShieldAlert size={22} color="var(--accent-emerald)" />
              Team Accounts & Password Security Administration
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.85rem 1.25rem', borderRadius: '10px' }}>
              As System Admin, you hold full root authority to manage credentials and reset passwords for all roles across Marble Gallery (MD, Showroom Manager, Salesforce Checker, System Admin, and Sales Executives).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              
              {/* Card 1: Core System Roles Passwords */}
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem' }}>
                  <Users size={18} />
                  Core System Accounts Password Reset
                </h4>

                {/* Manager Password Reset */}
                <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.01)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Showroom Manager Account (`manager`)</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Role: manager</span>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const newP = e.target.managerPass.value;
                    if (newP) {
                      localStorage.setItem('mg_manager_password', newP);
                      showToast("Showroom Manager password updated successfully!");
                      e.target.reset();
                    }
                  }} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="password" name="managerPass" className="form-input text-xs" placeholder="New Manager Password" required style={{ height: '34px' }} />
                    <button type="submit" className="btn btn-cyan" style={{ padding: '0.2rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Reset Password</button>
                  </form>
                </div>

                {/* Checker Password Reset */}
                <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.01)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Salesforce Billing Checker (`checker`)</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'rgba(14, 165, 233, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Role: checker</span>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const newP = e.target.checkerPass.value;
                    if (newP) {
                      localStorage.setItem('mg_checker_password', newP);
                      showToast("Salesforce Checker password updated successfully!");
                      e.target.reset();
                    }
                  }} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="password" name="checkerPass" className="form-input text-xs" placeholder="New Checker Password" required style={{ height: '34px' }} />
                    <button type="submit" className="btn btn-cyan" style={{ padding: '0.2rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Reset Password</button>
                  </form>
                </div>

                {/* MD Password Reset */}
                <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.01)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Managing Director Account (`md`)</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Role: md</span>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const newP = e.target.mdPass.value;
                    if (newP) {
                      localStorage.setItem('mg_md_password', newP);
                      showToast("MD Account password updated successfully!");
                      e.target.reset();
                    }
                  }} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="password" name="mdPass" className="form-input text-xs" placeholder="New MD Password" required style={{ height: '34px' }} />
                    <button type="submit" className="btn btn-cyan" style={{ padding: '0.2rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>Reset Password</button>
                  </form>
                </div>

                {/* Main Admin Password Security Panel */}
                <div style={{ background: 'rgba(255,255,255,0.01)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--accent-emerald)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-emerald)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><ShieldAlert size={16} color="var(--accent-emerald)" /> System Admin Account (`admin`)</span>
                    <span style={{ fontSize: '0.7rem', color: '#fff', background: 'var(--accent-emerald)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>Role: admin</span>
                  </div>
                  <form onSubmit={handleUpdateAdminPassword} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="password" 
                      className="form-input text-xs" 
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="New System Admin Password"
                      required
                      style={{ height: '34px' }}
                    />
                    <button type="submit" className="btn btn-emerald" style={{ padding: '0.2rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      Update Admin Password
                    </button>
                  </form>
                </div>

              </div>

              {/* Card 2: Add New Sales Executive */}
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.5rem' }}>
                  <PlusCircle size={18} />
                  Add New Sales Executive Account
                </h4>
                <form onSubmit={handleExecSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Full Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={execName}
                      onChange={(e) => setExecName(e.target.value)}
                      placeholder="e.g. Ramesh Nair"
                      required
                      style={{ height: '36px' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Email Address</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      value={execEmail}
                      onChange={(e) => setExecEmail(e.target.value)}
                      placeholder="e.g. ramesh.n@mggroupin.com"
                      required
                      style={{ height: '36px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Login Username</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={execUsername}
                        onChange={(e) => setExecUsername(e.target.value)}
                        placeholder="e.g. ramesh"
                        required
                        style={{ height: '36px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Login Password</label>
                      <input 
                        type="password" 
                        className="form-input" 
                        value={execPassword}
                        onChange={(e) => setExecPassword(e.target.value)}
                        placeholder="Set password"
                        required
                        style={{ height: '36px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Target (₹)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={execTarget}
                        onChange={(e) => setExecTarget(e.target.value)}
                        placeholder="Target Amount"
                        required
                        style={{ height: '36px' }}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', fontWeight: 700 }}>
                    + Register Executive Account
                  </button>
                </form>
              </div>

            </div>

            {/* Sales Executive Accounts Table */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="var(--accent-cyan)" />
                Active Sales Executive Team Accounts ({executives.length})
              </h4>
              <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Executive Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Target</th>
                    <th>Wallet Balance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {executives.map(exec => (
                    <tr key={exec.id}>
                      <td style={{ fontWeight: 700 }}>{exec.name}</td>
                      <td><code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{exec.username}</code></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{exec.email}</td>
                      <td>{formatRupee(exec.target || 8000000)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{formatRupee(exec.walletBalance || 0)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button 
                            className="btn btn-icon btn-cyan" 
                            title="Edit Account Details & Reset Password" 
                            onClick={() => openEditExecModal(exec)}
                          >
                            <Edit size={16} />
                          </button>
                           <button 
                            className="btn btn-icon btn-danger" 
                            title="Delete Account" 
                            onClick={async () => { if (await window.customConfirm("Delete Executive Account", `Delete executive account for ${exec.name}?`, true, "Delete")) onDeleteExecutive(exec.id); }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal for Editing Executive Details & Resetting Password */}
            {isEditExecModalOpen && editingExec && (
              <div className="modal-overlay" onClick={() => setIsEditExecModalOpen(false)}>
                <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '92%', padding: '1.5rem', borderRadius: '16px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
                    <Edit size={18} />
                    Edit Executive Account & Password
                  </h3>

                  <form onSubmit={handleSaveExecDetails} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Full Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editExecName}
                        onChange={(e) => setEditExecName(e.target.value)}
                        required 
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Email Address</label>
                      <input 
                        type="email" 
                        className="form-input" 
                        value={editExecEmail}
                        onChange={(e) => setEditExecEmail(e.target.value)}
                        required 
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Username</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={editExecUsername}
                          onChange={(e) => setEditExecUsername(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Reset Password</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={editExecPassword}
                          onChange={(e) => setEditExecPassword(e.target.value)}
                          placeholder="New password"
                          required 
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Campaign Target (₹)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={editExecTarget}
                        onChange={(e) => setEditExecTarget(e.target.value)}
                        required 
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditExecModalOpen(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-cyan" style={{ flex: 1, fontWeight: 700 }}>
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab 8: System DNS & Custom Domain Config */}
        {activeTab === 'dns' && (
          <div className="fade-in">
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <Globe size={22} color="var(--accent-cyan)" />
              System DNS & Custom Domain Network Configuration
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              
              {/* Domain Overview */}
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle size={18} />
                  Live Production Domain Status
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Custom Subdomain:</span>
                    <strong style={{ color: 'var(--accent-cyan)' }}>clearance.mggroupin.com</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Hostinger VPS IP:</span>
                    <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>187.127.189.139</code>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>SSL Encryption:</span>
                    <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>Active (HTTPS / Let's Encrypt)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Node.js Server Port:</span>
                    <span>Port 3000 (PM2 Managed)</span>
                  </div>
                </div>
              </div>

              {/* GoDaddy DNS Records Instructions */}
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Globe size={18} />
                  GoDaddy DNS A-Record Setup
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Your primary domain <strong>mggroupin.com</strong> is configured on GoDaddy DNS zone with the following routing record:
                </p>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  <div><strong>Type:</strong> A Record</div>
                  <div><strong>Name (Host):</strong> clearance</div>
                  <div><strong>Value (Points to):</strong> 187.127.189.139</div>
                  <div><strong>TTL:</strong> 600 seconds (10 mins)</div>
                </div>
              </div>

            </div>

            {/* Network Latency Tester */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={18} color="var(--accent-amber)" />
                Domain Connectivity & Latency Monitor
              </h4>
              <button className="btn btn-cyan" onClick={() => {
                const t0 = performance.now();
                fetch('/api/db')
                  .then(() => {
                    const t1 = performance.now();
                    showToast(`Domain latency response: ${Math.round(t1 - t0)} ms (Status 200 OK)`);
                  })
                  .catch(() => showToast("Domain test ping failed. Verify network connectivity."));
              }} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}>
                Test Live Server Latency
              </button>
            </div>

          </div>
        )}

        {/* Tab 9: System Database Backup & Reset Controls */}
        {activeTab === 'db_tools' && currentUser.role === 'admin' && (
          <div className="fade-in">
            <h3 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <Database size={22} color="var(--accent-amber)" />
              Database Reset & System Backup Management
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              
              {/* JSON Backup Download */}
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Download size={18} />
                  Export System DB Backup (.json)
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Download a complete structured JSON backup containing all inventory items, brand setups, sales ledger, and executive account logs.
                </p>
                <button className="btn btn-emerald" onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `mg_clearance_db_backup_${new Date().toISOString().slice(0,10)}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                  showToast("Full database backup downloaded successfully!");
                }} style={{ padding: '0.55rem 1.1rem', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Download size={15} /> Download DB Backup (.json)
                </button>
              </div>

              {/* JSON Backup Restore */}
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <UploadCloud size={18} />
                  Restore DB from JSON Backup
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Upload a previously saved `.json` database file to restore system parameters.
                </p>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      try {
                        const parsed = JSON.parse(evt.target.result);
                        if (parsed && parsed.products && parsed.executives) {
                          onUpdateDb(parsed);
                          showToast("Database successfully restored from JSON backup!");
                        } else {
                          alert("Invalid backup file format.");
                        }
                      } catch (err) {
                        alert("Failed to parse JSON backup file.");
                      }
                    };
                    reader.readAsText(file);
                  }}
                  className="form-input text-xs" 
                  style={{ height: '38px' }}
                />
              </div>

            </div>

            {/* Reset Database and Inventory Triggers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Clear Products Only */}
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--accent-rose)', background: 'rgba(239, 68, 68, 0.02)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Trash2 size={18} />
                  Clear Clearance Stock Inventory
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  This will erase all product items from the system so you can upload a fresh CSV. Executive accounts and ledger logs will NOT be affected.
                </p>
                <button className="btn btn-danger" onClick={handleClearAllProducts} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Trash2 size={15} /> Clear All Products Only
                </button>
              </div>

              {/* Full Factory Reset */}
              <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--accent-rose)', background: 'rgba(239, 68, 68, 0.03)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldAlert size={18} />
                  Reset Database to Showroom Defaults
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  This action wipes all data (verified invoices, wallet ledgers, sales history, etc.) and resets stock inventory to campaign initial defaults.
                </p>
                <button className="btn btn-danger" onClick={handleResetDatabase} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldAlert size={15} /> Factory Reset Database
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Tab: System Error & Security Logs */}
        {activeTab === 'system_logs' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert color="var(--accent-rose)" size={22} />
                  System Error & Security Audit Tracker
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  Real-time system diagnostics, runtime error tracebacks, API failures, and security audit logs.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8," + 
                      ["ID,Timestamp,Level,Category,Message,User,Details"]
                        .concat((db.systemLogs || []).map(l => `"${l.id}","${l.timestamp}","${l.level}","${l.category}","${(l.message||'').replace(/"/g, '""')}","${l.user||''}","${(l.details||'').replace(/"/g, '""')}"`))
                        .join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `system_audit_logs_${new Date().toISOString().slice(0,10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download size={14} /> Export Diagnostic CSV
                </button>
                <button 
                  className="btn btn-danger" 
                  style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
                  onClick={async () => {
                    if (await window.customConfirm("Clear System Logs", "Clear all system error & security audit logs?", true, "Clear Logs")) {
                      onUpdateDb({ ...db, systemLogs: [] });
                      showToast("System logs cleared successfully.");
                    }
                  }}
                >
                  <Trash2 size={14} /> Clear Logs
                </button>
              </div>
            </div>

            {/* Metrics cards */}
            {(() => {
              const logs = db.systemLogs || [];
              const criticalCount = logs.filter(l => l.level === 'CRITICAL').length;
              const securityCount = logs.filter(l => l.level === 'SECURITY').length;
              const warningCount = logs.filter(l => l.level === 'WARNING').length;

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-rose)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CRITICAL ERRORS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: criticalCount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                      {criticalCount}
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-amber)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SECURITY THREATS / ALERTS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: securityCount > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                      {securityCount}
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-cyan)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>WARNINGS & API ISSUES</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                      {warningCount}
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid var(--accent-emerald)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SYSTEM AUDIT STATUS</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.2rem' }}>
                      {criticalCount === 0 ? '🟢 Operational' : '🔴 Action Needed'}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Filters */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['ALL', 'CRITICAL', 'SECURITY', 'WARNING', 'INFO'].map(lvl => (
                  <button
                    key={lvl}
                    className={`btn ${logLevelFilter === lvl ? 'btn-cyan' : 'btn-secondary'}`}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '20px' }}
                    onClick={() => setLogLevelFilter(lvl)}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <div style={{ position: 'relative', width: '260px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Search log messages, user..."
                  value={logSearchQuery}
                  onChange={e => setLogSearchQuery(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                />
              </div>
            </div>

            {/* Log Table */}
            <div className="custom-table-container">
              <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Level</th>
                    <th>Category</th>
                    <th>Message & Location</th>
                    <th>User</th>
                    <th>Technical Details</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const logs = db.systemLogs || [];
                    const filteredLogs = logs.filter(l => {
                      const matchLevel = logLevelFilter === 'ALL' || l.level === logLevelFilter;
                      const q = logSearchQuery.trim().toLowerCase();
                      const matchQuery = !q || (l.message || '').toLowerCase().includes(q) || (l.details || '').toLowerCase().includes(q) || (l.user || '').toLowerCase().includes(q);
                      return matchLevel && matchQuery;
                    });

                    if (filteredLogs.length === 0) {
                      return (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No system error or security logs matching filter.
                          </td>
                        </tr>
                      );
                    }

                    return filteredLogs.map(l => (
                      <tr key={l.id}>
                        <td style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                          {new Date(l.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge ${l.level === 'CRITICAL' ? 'badge-rose' : l.level === 'SECURITY' ? 'badge-warning' : l.level === 'WARNING' ? 'badge-info' : 'badge-success'}`} style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                            {l.level}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                          {l.category}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {l.message}
                        </td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {l.user || 'System'}
                        </td>
                        <td>
                          <details style={{ cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            <summary style={{ outline: 'none' }}>View Trace</summary>
                            <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.3rem', fontSize: '0.65rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {l.details || 'No detailed stack trace'}
                            </pre>
                          </details>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}



        {/* Tab 8: Campaign Analytics MD dashboard */}
        {activeTab === 'reports' && (
          <div className="fade-in">
            <MDDashboard 
              products={products}
              executives={executives}
              salesLedger={salesLedger}
              brands={brands}
              quotations={quotations}
              remainingLandingCost={remainingLandingCost}
              totalClearedLandingCost={totalClearedLandingCost}
              dynamicTargetLandingCost={dynamicTargetLandingCost}
              totalClearedRevenue={totalClearedRevenue}
              isAdminView={true}
              db={db}
              onUpdateDb={onUpdateDb}
            />
          </div>
        )}

      </div>
      </div>

      {/* Product Add/Edit Modal */}
      {isProductModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProductModalOpen(false)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{isAddProductMode ? 'Add Clearance Product' : `Edit Product Details - ${productId}`}</span>
              <button className="close-btn" style={{ position: 'relative', top: 0, right: 0 }} onClick={() => setIsProductModalOpen(false)}>X</button>
            </h3>

            <form onSubmit={handleProductSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Product ID Code</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={productId}
                    onChange={(e) => setProductId(e.target.value.toUpperCase())}
                    disabled={!isAddProductMode}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Kohler Smart Faucet"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Division</label>
                  <select 
                    className="filter-select form-input" 
                    value={productDivision} 
                    onChange={(e) => {
                      setProductDivision(e.target.value);
                      if (e.target.value === 'Tiles') {
                        if (productBrand === 'KOHLER' || productBrand === 'GROHE' || productBrand === 'JAQUAR' || productBrand === 'TOTO') {
                          setProductBrand('SIMPOLO');
                        }
                        setProductCategory('Ceramic Tiles');
                      } else {
                        if (productBrand === 'SIMPOLO' || productBrand === 'KAJARIA' || productBrand === 'SOMANY' || productBrand === 'NITCO' || productBrand === 'LATICRETE') {
                          setProductBrand('KOHLER');
                        }
                        setProductCategory('Faucets & Mixers');
                      }
                    }}
                  >
                    <option value="Bathing">Bathing</option>
                    <option value="Tiles">Tiles</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Brand</label>
                  <select 
                    className="filter-select form-input" 
                    value={productBrand} 
                    onChange={(e) => setProductBrand(e.target.value)}
                  >
                    {brands.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    placeholder="e.g. Intelligent Toilets"
                    required
                  />
                </div>
              </div>

              {productDivision === 'Tiles' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tile Size (e.g. 60x120 cm)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={productSize}
                      onChange={(e) => setProductSize(e.target.value)}
                      placeholder="e.g. 60x120 cm"
                      required={productDivision === 'Tiles'}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tile Finishing (e.g. Matt)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={productFinishing}
                      onChange={(e) => setProductFinishing(e.target.value)}
                      placeholder="e.g. Matt, Glossy"
                      required={productDivision === 'Tiles'}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Display Location / Casette</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={productLocation}
                      onChange={(e) => setProductLocation(e.target.value)}
                      placeholder="e.g. Casette A-4"
                      required={productDivision === 'Tiles'}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Short Description</label>
                <textarea 
                  className="form-input" 
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Provide technical specifications and showroom features..."
                  style={{ height: '70px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Stock Quantity</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Original MRP (₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={productMrp}
                    onChange={(e) => setProductMrp(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">MG Standard (₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={productMgPrice}
                    onChange={(e) => setProductMgPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Landing Cost (₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={productLandingCost}
                    onChange={(e) => setProductLandingCost(e.target.value)}
                    style={{ border: '1px solid var(--accent-cyan)' }}
                    placeholder="Defaults to 80% of special price"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>Clearance Special Price (₹)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={productSpecialPrice}
                    onChange={(e) => setProductSpecialPrice(e.target.value)}
                    style={{ border: '1px solid var(--accent-rose)' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Product Image (Upload File or Paste Web Link)</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={productImage}
                    onChange={(e) => setProductImage(e.target.value)}
                    placeholder="Paste image URL (e.g., https://...)"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Or upload from device:</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (uploadEvent) => {
                            setProductImage(uploadEvent.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                  {productImage && (
                    <div style={{ position: 'relative', display: 'inline-block', width: '60px', height: '60px', marginTop: '0.5rem' }}>
                      <img 
                        src={productImage} 
                        alt="Preview" 
                        style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <button 
                        type="button" 
                        style={{ 
                          position: 'absolute', 
                          top: '-5px', 
                          right: '-5px', 
                          background: 'var(--accent-rose)', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: '50%', 
                          width: '18px', 
                          height: '18px', 
                          fontSize: '10px', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onClick={() => setProductImage('')}
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsProductModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isAddProductMode ? 'Add Product' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal for Verification previews */}
      {selectedInvoiceDetail && (
        <div className="modal-overlay" onClick={() => setSelectedInvoiceDetail(null)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Verification Receipt Preview - Quote {selectedInvoiceDetail.id}</span>
              <button className="close-btn" style={{ position: 'relative', top: 0, right: 0 }} onClick={() => setSelectedInvoiceDetail(null)}>X</button>
            </h3>

            <div style={{ marginBottom: '1rem', fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '6px' }}>
              <div>
                <strong>Executive:</strong> {selectedInvoiceDetail.executiveName}<br/>
                <strong>Client:</strong> {selectedInvoiceDetail.customerName} ({selectedInvoiceDetail.customerMobile})<br/>
                <strong>Clearance Quote Total:</strong> {formatRupee(selectedInvoiceDetail.items.reduce((s,i)=>s+(i.specialPrice*i.qty),0))}
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>Salesforce Invoice:</strong> <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{selectedInvoiceDetail.invoiceNo}</span><br/>
                <strong>Calculated Commission:</strong> <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{formatRupee(selectedInvoiceDetail.incentiveAmount)}</span>
              </div>
            </div>

            {/* Receipt Image / PDF Preview Panel */}
            <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              {selectedInvoiceDetail.uploadedBill ? (
                selectedInvoiceDetail.uploadedBill.startsWith('data:application/pdf') || selectedInvoiceDetail.uploadedBill.includes('pdf') ? (
                  <iframe 
                    src={selectedInvoiceDetail.uploadedBill} 
                    title="Uploaded Invoice PDF Receipt" 
                    style={{ width: '100%', height: '420px', border: 'none', borderRadius: '8px' }} 
                  />
                ) : (
                  <img 
                    src={selectedInvoiceDetail.uploadedBill} 
                    alt="Salesforce Receipt Attachment" 
                    style={{ maxWidth: '100%', maxHeight: '380px', objectFit: 'contain', borderRadius: '4px' }} 
                  />
                )
              ) : (
                <div style={{ padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  No receipt image or PDF file attached for invoice <strong>{selectedInvoiceDetail.invoiceNo}</strong>.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedInvoiceDetail(null)}>Close Preview</button>
              <button className="btn btn-danger" style={{ border: 'none' }} onClick={() => { setSelectedInvoiceDetail(null); handleRejectInvoice(selectedInvoiceDetail); }}>Reject</button>
              <button className="btn btn-emerald" onClick={() => { setSelectedInvoiceDetail(null); handleApproveInvoice(selectedInvoiceDetail); }}>Approve Verification</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Rejection Reason Glass Modal */}
      {rejectionModalQuote && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) setRejectionModalQuote(null); }}
        >
          <div className="glass-panel fade-in" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--accent-rose)', boxShadow: '0 20px 50px rgba(239, 68, 68, 0.25)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-rose)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={20} />
              Reject Invoice Verification
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Invoice #{rejectionModalQuote.invoiceNo} ({rejectionModalQuote.customerName}). Please specify a clear rejection reason for the executive:
            </p>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. Invoice amount doesn't match quote total, or invalid receipt document uploaded."
              value={rejectionReasonText}
              onChange={(e) => setRejectionReasonText(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', marginBottom: '1.25rem', borderRadius: '8px' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" style={{ padding: '0.55rem 1.1rem', fontSize: '0.8rem' }} onClick={() => setRejectionModalQuote(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" style={{ padding: '0.55rem 1.1rem', fontSize: '0.8rem', fontWeight: 700 }} onClick={confirmRejection}>
                Reject & Release Stock
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminPanel;
