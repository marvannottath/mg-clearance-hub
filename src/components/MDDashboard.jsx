import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, Users, Award, FileText, IndianRupee, 
  ChevronRight, Calendar, ShoppingBag, Eye, Download 
} from 'lucide-react';
import { getProductStockAgeMonths } from '../data/mockData';
function MDDashboard({ 
  products = [], executives = [], salesLedger = [], brands = [], quotations = [],
  remainingLandingCost, totalClearedLandingCost, dynamicTargetLandingCost,
  totalClearedRevenue, isAdminView = false, onUpdateDb, db
}) {
  const [activeSubTab, setActiveSubTab] = useState('progress'); // 'progress' | 'brands' | 'executives' | 'journal'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedBrand, setSelectedBrand] = useState('ALL');

  // Formatting currency
  const formatRupee = (value) => {
    const isNegative = value < 0;
    const absVal = Math.abs(value);
    let str = "";
    if (absVal >= 10000000) {
      str = `₹${(absVal / 10000000).toFixed(2)} Cr`;
    } else if (absVal >= 100000) {
      str = `₹${(absVal / 100000).toFixed(2)} L`;
    } else {
      str = `₹${absVal.toLocaleString('en-IN')}`;
    }
    return isNegative ? `-${str}` : str;
  };

  // Brand Filtering Logic
  const filteredProducts = selectedBrand === 'ALL' 
    ? products 
    : products.filter(p => p.brand.toUpperCase() === selectedBrand.toUpperCase());

  const filteredSalesLedger = salesLedger.map(sale => {
    const brandItems = sale.items.filter(item => {
      const prod = products.find(p => p.id === item.productId);
      const b = prod ? prod.brand.toUpperCase() : 'OTHER';
      return selectedBrand === 'ALL' || b === selectedBrand.toUpperCase();
    });
    
    if (brandItems.length === 0) return null;
    
    const brandTotalPaid = brandItems.reduce((sum, i) => sum + (i.pricePaid * i.qty), 0);
    const brandTotalMrp = brandItems.reduce((sum, i) => sum + (i.mrp * i.qty), 0);
    
    return {
      ...sale,
      items: brandItems,
      totalPaid: brandTotalPaid,
      totalMrp: brandTotalMrp
    };
  }).filter(Boolean);

  // Brand specific calculations (Landing Cost focus)
  const stuckLandingCost = filteredProducts.reduce((sum, p) => sum + ((p.landingCost || Math.round(p.specialPrice * 0.8)) * p.stock), 0);
  
  const soldLandingCost = filteredSalesLedger.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      const prod = products.find(p => p.id === item.productId);
      const itemLanding = prod ? (prod.landingCost || Math.round(prod.specialPrice * 0.8)) : Math.round(item.pricePaid * 0.8);
      return itemSum + (itemLanding * item.qty);
    }, 0);
  }, 0);

  const targetLandingCost = stuckLandingCost + soldLandingCost;
  const clearedRevenue = filteredSalesLedger.reduce((sum, sale) => sum + sale.totalPaid, 0);
  const recoveryMargin = clearedRevenue - soldLandingCost; // Revenue vs Cost

  const completionPercentage = targetLandingCost > 0 ? ((soldLandingCost / targetLandingCost) * 100).toFixed(1) : '0.0';
  const remainingPercentage = (100 - parseFloat(completionPercentage)).toFixed(1);

  // 1. Data Prep: Cumulative Clearance Progress (Timeline)
  const getTimelineData = () => {
    if (filteredSalesLedger.length === 0) {
      return [{ date: 'Start', Cleared: 0, RemainingInventory: targetLandingCost, TargetLine: targetLandingCost }];
    }
    
    const sortedSales = [...filteredSalesLedger].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let cumulative = 0;
    const chartData = sortedSales.map((sale) => {
      cumulative += sale.totalPaid;
      const formattedDate = new Date(sale.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      return {
        date: formattedDate,
        Cleared: cumulative,
        RemainingInventory: Math.max(0, targetLandingCost - cumulative),
        TargetLine: targetLandingCost
      };
    });

    return [{ date: 'Launch', Cleared: 0, RemainingInventory: targetLandingCost, TargetLine: targetLandingCost }, ...chartData];
  };

  // 2. Data Prep: Brand-wise distribution
  const getBrandData = () => {
    const brandMap = {};
    const brandsList = brands.length > 0 ? brands.map(b => b.name) : ['KOHLER', 'GROHE', 'JAQUAR', 'TOTO'];
    brandsList.forEach(b => {
      brandMap[b] = { brand: b, remaining: 0, cleared: 0, aging12m: 0, aging6_12m: 0 };
    });

    products.forEach(p => {
      const b = p.brand.toUpperCase();
      if (!brandMap[b]) {
        brandMap[b] = { brand: b, remaining: 0, cleared: 0, aging12m: 0, aging6_12m: 0 };
      }
      const val = ((p.landingCost || Math.round(p.specialPrice * 0.8)) * p.stock);
      brandMap[b].remaining += val;
      
      const age = getProductStockAgeMonths(p);
      if (age >= 12) {
        brandMap[b].aging12m += val;
      } else if (age >= 6) {
        brandMap[b].aging6_12m += val;
      }
    });

    salesLedger.forEach(sale => {
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const b = prod ? prod.brand.toUpperCase() : 'OTHER';
        if (!brandMap[b]) {
          brandMap[b] = { brand: b, remaining: 0, cleared: 0, aging12m: 0, aging6_12m: 0 };
        }
        const itemLanding = prod ? (prod.landingCost || Math.round(prod.specialPrice * 0.8)) : Math.round(item.pricePaid * 0.8);
        brandMap[b].cleared += (itemLanding * item.qty);
      });
    });

    return Object.values(brandMap);
  };

  // 3. Data Prep: Executive Leaderboard
  const getSortedExecutives = () => {
    return [...executives].map(exec => {
      // Sum the clearance revenue generated by this executive in the filtered brand
      const execClearedRevenue = filteredSalesLedger
        .filter(sale => sale.executiveId === exec.id)
        .reduce((sum, sale) => sum + sale.totalPaid, 0);
      return {
        ...exec,
        clearedRevenue: execClearedRevenue
      };
    }).sort((a, b) => b.clearedRevenue - a.clearedRevenue);
  };

  const getSortedExecutivesByIncentive = () => {
    return [...executives].map(exec => {
      const totalEarned = exec.walletLedger
        ? exec.walletLedger.filter(l => l.type === 'incentive').reduce((sum, l) => sum + l.amount, 0)
        : 0;
      return { ...exec, totalEarned };
    }).sort((a, b) => b.totalEarned - a.totalEarned);
  };

  const getLeaderboardChartData = () => {
    return getSortedExecutives().map(exec => ({
      name: exec.name.split(' ')[0],
      Cleared: exec.clearedRevenue,
      Target: exec.target
    }));
  };

  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Export Sales Ledger Report as CSV for the MD
  const downloadSalesReportCSV = () => {
    if (filteredSalesLedger.length === 0) {
      showToast("No sales data available to download.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Invoice Number,Date Logged,Sales Executive,Customer Contact,Items Count,Clearance Amount Paid,Original MRP Value,Client Net Savings\n";
    
    filteredSalesLedger.forEach(sale => {
      const dateStr = new Date(sale.date).toLocaleString('en-IN').replace(/,/g, '');
      const itemsCount = sale.items.reduce((acc, item) => acc + item.qty, 0);
      const savings = sale.totalMrp - sale.totalPaid;
      csvContent += `"${sale.billNo}","${dateStr}","${sale.executiveName}","${sale.customerMobile}",${itemsCount},${sale.totalPaid},${sale.totalMrp},${savings}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mg_clearance_sales_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Executive Leaderboard Report as CSV
  const downloadExecutiveReportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Executive ID,Name,Email,Sales Target (INR),Amount Cleared (INR),Sales Counts,Target Met %,Incentive Balance\n";
    
    executives.forEach(e => {
      const pct = e.target > 0 ? ((e.cleared / e.target) * 100).toFixed(0) : 0;
      csvContent += `"${e.id}","${e.name}","${e.email}",${e.target},${e.cleared},${e.salesCount},${pct}%,${e.walletBalance}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "mg_executive_performance_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const BRAND_COLORS = {
    'KOHLER': '#a855f7',
    'GROHE': '#06b6d4',
    'JAQUAR': '#10b981',
    'TOTO': '#ef4444',
    'SIMPOLO': '#f59e0b',
    'KAJARIA': '#e11d48',
    'SOMANY': '#3b82f6',
    'NITCO': '#14b8a6',
    'LATICRETE': '#84cc16',
    'OTHER': '#64748b'
  };

  return (
    <div className="fade-in">
      {/* Target Clearance Summary Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>{isAdminView ? 'Admin Campaign Analytics' : 'Managing Director Dashboard'}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Luxe Bath & Tile Showroom Floor Stock Clearance & Liquidations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Brand Filter:</label>
          <select 
            className="filter-select"
            value={selectedBrand} 
            onChange={(e) => setSelectedBrand(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <option value="ALL">All Brands</option>
            {brands.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
          <span className="badge badge-success" style={{ padding: '0.4rem 0.65rem', fontSize: '0.7rem' }}>Campaign Live</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stat-grid">
        <div className="glass-panel stat-card cyan">
          <div className="stat-header">
            <span>Campaign Stock Landing Cost</span>
            <IndianRupee className="stat-icon" size={18} />
          </div>
          <div className="stat-value">{formatRupee(targetLandingCost)}</div>
          <div className="stat-subtext">
            <span>Baseline cost of liquidated items</span>
          </div>
        </div>

        <div className="glass-panel stat-card emerald">
          <div className="stat-header">
            <span>Clearance Revenue Generated</span>
            <TrendingUp className="stat-icon" size={18} />
          </div>
          <div className="stat-value">{formatRupee(clearedRevenue)}</div>
          <div className="stat-subtext">
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{completionPercentage}% of cost cleared</span>
          </div>
          <div className="progress-container">
            <div className="progress-bar emerald" style={{ width: `${completionPercentage}%` }}></div>
          </div>
        </div>

        <div className="glass-panel stat-card rose">
          <div className="stat-header">
            <span>Stuck Stock Landing Cost</span>
            <ShoppingBag className="stat-icon" size={18} />
          </div>
          <div className="stat-value">{formatRupee(stuckLandingCost)}</div>
          <div className="stat-subtext">
            <span style={{ color: 'var(--accent-rose)', fontWeight: 600 }}>{remainingPercentage}% stuck value</span>
          </div>
          <div className="progress-container">
            <div className="progress-bar cyan" style={{ width: `${remainingPercentage}%` }}></div>
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ borderLeft: `4px solid ${recoveryMargin >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}` }}>
          <div className="stat-header">
            <span>Net Recovery Margin</span>
            <IndianRupee className="stat-icon" size={18} style={{ color: recoveryMargin >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }} />
          </div>
          <div className="stat-value" style={{ color: recoveryMargin >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
            {formatRupee(recoveryMargin)}
          </div>
          <div className="stat-subtext">
            <span>{recoveryMargin >= 0 ? 'Surplus above landing cost' : 'Campaign liquidation loss'}</span>
          </div>
        </div>
      </div>

      {/* Detail Analysis Tabs */}
      <div className="glass-panel dashboard-panel">
        <div className="panel-tabs">
          <button 
            className={`panel-tab ${activeSubTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('progress')}
          >
            Clearance Timeline
          </button>
          <button 
            className={`panel-tab ${activeSubTab === 'brands' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('brands')}
          >
            Brand Analytics
          </button>
          <button 
            className={`panel-tab ${activeSubTab === 'executives' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('executives')}
          >
            Executive Performance
          </button>
          <button 
            className={`panel-tab ${activeSubTab === 'journal' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('journal')}
          >
            Sales Ledger Journal
          </button>
        </div>

        {/* Tab 1: Progress Timeline */}
        {activeSubTab === 'progress' && (
          <div className="fade-in">
            <h3 className="panel-title">
              <TrendingUp size={18} color="var(--accent-cyan)" />
              Cumulative Revenue Cleared vs Remaining Inventory
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
              Tracks total liquidations registered from bill uploads against the dynamically calculated stock target.
            </p>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={getTimelineData()}
                  margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCleared" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-emerald)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--accent-emerald)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-cyan)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--accent-cyan)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis 
                    stroke="var(--text-secondary)" 
                    fontSize={11}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(0)} L`}
                  />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                    formatter={(value) => [formatRupee(value), null]}
                    cursor={{ stroke: 'rgba(255, 255, 255, 0.15)', strokeWidth: 1 }}
                  />
                  <Legend />
                  <Area type="monotone" name="Total Cleared Revenue" dataKey="Cleared" stroke="var(--accent-emerald)" fillOpacity={1} fill="url(#colorCleared)" strokeWidth={2} />
                  <Area type="monotone" name="Remaining Inventory" dataKey="RemainingInventory" stroke="var(--accent-cyan)" fillOpacity={1} fill="url(#colorRemaining)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 2: Brand Performance */}
        {activeSubTab === 'brands' && (
          <div className="fade-in">
            <h3 className="panel-title">
              <ShoppingBag size={18} color="var(--accent-amber)" />
              Brand Stock Clearance Status
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
              Comparison of value cleared (sales) versus remaining value on showroom floor for key brands.
            </p>
            <div className="dashboard-grid" style={{ gridTemplateColumns: '3fr 2fr' }}>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getBrandData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="brand" stroke="var(--text-secondary)" fontSize={11} />
                    <YAxis 
                      stroke="var(--text-secondary)" 
                      fontSize={11}
                      tickFormatter={(val) => `₹${(val / 100000).toFixed(0)} L`}
                    />
                    <Tooltip 
                      contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                      labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                      formatter={(value) => [formatRupee(value), null]}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    />
                    <Legend />
                    <Bar name="Cleared Revenue" dataKey="cleared" fill="var(--accent-emerald)" radius={[4, 4, 0, 0]} />
                    <Bar name="Remaining Inventory" dataKey="remaining" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                  Brand Stock Cleared Share
                </h4>
                {getBrandData().map(brandInfo => {
                  const brandTotal = brandInfo.cleared + brandInfo.remaining;
                  const brandProgress = brandTotal > 0 ? ((brandInfo.cleared / brandTotal) * 100).toFixed(1) : 0;
                  return (
                    <div key={brandInfo.brand} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '0.55rem 0.75rem', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                        <span className={`brand-pill ${brandInfo.brand.toLowerCase()}`} style={{ fontSize: '0.6rem' }}>{brandInfo.brand}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>{brandProgress}% Cleared</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        <span>Sales: {formatRupee(brandInfo.cleared)}</span>
                        <span>Stock: {formatRupee(brandInfo.remaining)}</span>
                      </div>
                      <div className="progress-container" style={{ height: '4px', marginTop: '0.4rem' }}>
                        <div 
                          className="progress-bar emerald" 
                          style={{ 
                            width: `${brandProgress}%`,
                            background: BRAND_COLORS[brandInfo.brand] || 'var(--text-muted)'
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Brand-Wise Stock Aging & Sales Report Table */}
            <div className="glass-panel" style={{ padding: '1.25rem', marginTop: '1.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <TrendingUp size={16} color="var(--accent-cyan)" />
                Detailed Brand-Wise Stock Aging & Sales Report
              </h4>
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Brand</th>
                      <th style={{ textAlign: 'right' }}>Total Sold (Cleared)</th>
                      <th style={{ textAlign: 'right' }}>Total Remaining Stock</th>
                      <th style={{ textAlign: 'right' }}>Aging Stock (6-12 Months)</th>
                      <th style={{ textAlign: 'right' }}>Aging Stock (&gt; 1 Year / 12m+)</th>
                      <th style={{ textAlign: 'right' }}>Recent Stock (&lt; 6 Months)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getBrandData().map(brandInfo => {
                      const totalRemaining = brandInfo.remaining;
                      const age12m = brandInfo.aging12m || 0;
                      const age6_12m = brandInfo.aging6_12m || 0;
                      const recent = Math.max(0, totalRemaining - age12m - age6_12m);

                      return (
                        <tr key={brandInfo.brand}>
                          <td style={{ fontWeight: 'bold' }}>
                            <span className={`brand-pill ${brandInfo.brand.toLowerCase()}`}>{brandInfo.brand}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                            {formatRupee(brandInfo.cleared)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                            {formatRupee(totalRemaining)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--accent-amber)' }}>
                            {formatRupee(age6_12m)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--accent-rose)', fontWeight: 700 }}>
                            {formatRupee(age12m)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {formatRupee(recent)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab 3: Executive Performance */}
        {activeSubTab === 'executives' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 className="panel-title" style={{ marginBottom: 0 }}>
                <Award size={18} color="var(--accent-amber)" />
                Sales Executive Performance & Incentives
              </h3>
              <button className="btn btn-secondary" onClick={downloadExecutiveReportCSV} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                <Download size={12} />
                Download Performance Report
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
              Comparison of sales clearance performance (revenue generated) and wallet incentives earned (commission credits approved by Manager).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', marginBottom: '1.5rem' }} className="dashboard-grid">
              
              {/* Left Column: Horizontal Sales Executive Performance Chart */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                  <TrendingUp size={16} color="var(--accent-cyan)" />
                  Sales Executive Performance
                </h4>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={getLeaderboardChartData()}
                      margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" stroke="var(--text-secondary)" fontSize={11} tickFormatter={(val) => `₹${(val / 100000).toFixed(0)} L`} />
                      <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                        labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                        formatter={(value) => [formatRupee(value), 'Cleared Revenue']}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      />
                      <Legend />
                      <Bar name="Cleared Revenue" dataKey="Cleared" radius={[0, 4, 4, 0]}>
                        {getLeaderboardChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Column: Revenue Leaderboard List */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                  <TrendingUp size={16} color="var(--accent-cyan)" />
                  Sales Clearance Leaderboard (Revenue)
                </h4>
                <div className="leaderboard-list">
                  {getSortedExecutives().map((exec, index) => {
                    const percentage = exec.target > 0 ? ((exec.clearedRevenue / exec.target) * 100).toFixed(0) : 0;
                    return (
                      <div key={exec.id} className="leaderboard-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <div className="leaderboard-profile" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <span className={`leaderboard-rank rank-${index + 1}`} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700,
                            background: index === 0 ? 'var(--accent-amber)' : 'rgba(255,255,255,0.05)', color: index === 0 ? '#000' : 'var(--text-primary)'
                          }}>{index + 1}</span>
                          <div>
                            <div className="leaderboard-name" style={{ fontWeight: 600, fontSize: '0.85rem' }}>{exec.name}</div>
                            <div className="leaderboard-target" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target: {formatRupee(exec.target)}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.85rem' }}>{formatRupee(exec.clearedRevenue)}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{percentage}% Met ({exec.salesCount} Sales)</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Section 2: Wallet & Incentive Earnings Performance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem' }} className="dashboard-grid">
              
              {/* Left Column: Horizontal Incentives Chart */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                  <Award size={16} color="var(--accent-amber)" />
                  Incentive Commission Overview
                </h4>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={getSortedExecutivesByIncentive().map(exec => ({
                        name: exec.name.split(' ')[0],
                        Incentive: exec.totalEarned
                      }))}
                      margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" stroke="var(--text-secondary)" fontSize={11} tickFormatter={(val) => `₹${(val / 100000).toFixed(2)} L`} />
                      <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                        labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                        formatter={(value) => [formatRupee(value), 'Total Incentive Paid']}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                      />
                      <Legend />
                      <Bar name="Total Incentive Paid" dataKey="Incentive" radius={[0, 4, 4, 0]}>
                        {getSortedExecutivesByIncentive().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--accent-amber)' : 'var(--accent-cyan)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Column: Incentive Earnings Leaderboard List */}
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                  <Award size={16} color="var(--accent-amber)" />
                  Campaign Wallet Earnings (Incentives)
                </h4>
                <div className="leaderboard-list">
                  {getSortedExecutivesByIncentive().map((exec, index) => {
                    return (
                      <div key={exec.id} className="leaderboard-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <div className="leaderboard-profile" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <span className={`leaderboard-rank rank-${index + 1}`} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700,
                            background: index === 0 ? 'var(--accent-amber)' : 'rgba(255,255,255,0.05)', color: index === 0 ? '#000' : 'var(--text-primary)'
                          }}>{index + 1}</span>
                          <div>
                            <div className="leaderboard-name" style={{ fontWeight: 600, fontSize: '0.85rem' }}>{exec.name}</div>
                            <div className="leaderboard-target" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Wallet Balance: {formatRupee(exec.walletBalance || 0)}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '0.85rem' }}>{formatRupee(exec.totalEarned)}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Total Incentive Paid</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 4: Sales Ledger Journal (Detail Reports and Exports) */}
        {activeSubTab === 'journal' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 className="panel-title" style={{ marginBottom: 0 }}>
                <FileText size={18} color="var(--accent-cyan)" />
                Sales Transaction Journal
              </h3>
              <button 
                className="btn btn-emerald"
                onClick={downloadSalesReportCSV}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Download size={14} />
                Download Sales Report (CSV)
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
              Historical list of all bill uploads and clearance items logged. Use the button above to export reports for analysis.
            </p>

            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Bill Number</th>
                    <th>Date</th>
                    <th>Logged By</th>
                    <th>Customer Mobile</th>
                    <th>Items Sold</th>
                    <th>Total Clearance Paid</th>
                    <th>Original MRP</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesLedger.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No transactions logged yet.
                      </td>
                    </tr>
                  ) : (
                    salesLedger.map((sale) => (
                      <tr key={sale.billNo}>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{sale.billNo}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={12} className="icon-muted" />
                            {new Date(sale.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td>{sale.executiveName}</td>
                        <td>{sale.customerMobile}</td>
                        <td>{sale.items.reduce((acc, item) => acc + item.qty, 0)} items</td>
                        <td style={{ fontWeight: '600', color: 'var(--accent-emerald)' }}>{formatRupee(sale.totalPaid)}</td>
                        <td style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatRupee(sale.totalMrp)}</td>
                        <td>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                            onClick={() => setSelectedInvoice(sale)}
                          >
                            <Eye size={10} />
                            View Items
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal overlay */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Transaction Items - {selectedInvoice.billNo}</span>
              <button className="close-btn" style={{ position: 'relative', top: 0, right: 0 }} onClick={() => setSelectedInvoice(null)}>X</button>
            </h3>
            
            <div style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)' }}>Executive:</div>
                <div style={{ fontWeight: 600 }}>{selectedInvoice.executiveName}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)' }}>Date/Time:</div>
                <div style={{ fontWeight: 600 }}>{new Date(selectedInvoice.date).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="custom-table-container" style={{ marginBottom: '1rem' }}>
              <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th>Rate Paid</th>
                    <th>MRP</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>
                        <div>{item.name}</div>
                        {item.division === 'Tiles' && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            📏 {item.size || 'N/A'} | ✨ {item.finishing || 'N/A'} | 📍 Loc: {item.location || 'N/A'}
                          </div>
                        )}
                      </td>
                      <td>{item.qty}</td>
                      <td style={{ color: 'var(--accent-emerald)' }}>{formatRupee(item.pricePaid)}</td>
                      <td style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatRupee(item.mrp)}</td>
                      <td style={{ fontWeight: 600 }}>{formatRupee(item.pricePaid * item.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Total MRP: <span style={{ textDecoration: 'line-through' }}>{formatRupee(selectedInvoice.totalMrp)}</span>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                Total Amount Paid: <span style={{ color: 'var(--accent-emerald)' }}>{formatRupee(selectedInvoice.totalPaid)}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                Total Campaign Clearance Saving: {formatRupee(selectedInvoice.totalMrp - selectedInvoice.totalPaid)}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setSelectedInvoice(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MDDashboard;
