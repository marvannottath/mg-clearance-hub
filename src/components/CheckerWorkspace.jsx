import React, { useState } from 'react';
import { 
  CheckCircle, FileText, Upload, ShieldAlert, Eye, 
  Search, Clock, RefreshCw, AlertCircle, ArrowRight, UserCheck
} from 'lucide-react';

function CheckerWorkspace({ currentUser, db, onUpdateDb }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('UNBILLED'); // 'ALL' | 'UNBILLED' | 'BILLED'
  
  // Salesforce Upload Modal State
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [uploadedBill, setUploadedBill] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Preview Receipt Modal
  const [previewQuote, setPreviewQuote] = useState(null);

  // Quote Inspection Modal State
  const [selectedQuoteDetail, setSelectedQuoteDetail] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const formatRupee = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;

  const quotations = db.quotations || [];

  // Filter logic
  const filteredQuotes = quotations.filter(q => {
    const isDraft = q.status === 'draft';
    const isPending = q.status === 'pending_verification';
    const isVerified = q.status === 'verified';

    let matchesFilter = true;
    if (filter === 'UNBILLED') {
      matchesFilter = isDraft && !q.invoiceNo;
    } else if (filter === 'BILLED') {
      matchesFilter = isPending || isVerified || Boolean(q.invoiceNo);
    }

    const searchStr = search.trim().toLowerCase();
    const matchesSearch = !searchStr || 
      (q.id || '').toLowerCase().includes(searchStr) ||
      (q.customerName || '').toLowerCase().includes(searchStr) ||
      (q.customerMobile || '').toLowerCase().includes(searchStr) ||
      (q.executiveName || '').toLowerCase().includes(searchStr);

    return matchesFilter && matchesSearch;
  });

  // Handle File Upload to Base64
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 8 * 1024 * 1024) {
      showToast("File size exceeds 8MB. Please choose a smaller file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedBill(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Submit Salesforce Invoice by Checker (Deducts Main Stock immediately)
  const handleSaveSalesforceEntry = (e) => {
    e.preventDefault();
    if (!invoiceNo.trim()) {
      showToast("Please enter the Salesforce Invoice Number.");
      return;
    }

    // Deduct stock for items in this quotation immediately upon invoice upload
    let updatedProducts = [...(db.products || [])];
    selectedQuote.items.forEach(item => {
      updatedProducts = updatedProducts.map(p => {
        if (p.id === item.productId || p.id === item.id) {
          const currentStock = p.stock || 0;
          return { ...p, stock: Math.max(0, currentStock - item.qty) };
        }
        return p;
      });
    });

    const updatedQuotations = quotations.map(q => {
      if (q.id === selectedQuote.id) {
        return {
          ...q,
          status: 'pending_verification',
          invoiceNo: invoiceNo.trim().toUpperCase(),
          uploadedBill: uploadedBill || q.uploadedBill || '',
          billedBy: 'checker',
          checkerName: currentUser.name || 'Showroom Checker',
          billedDate: new Date().toISOString(),
          stockDeducted: true
        };
      }
      return q;
    });

    // Send Notification to Manager
    const newNotif = {
      id: `notif-${Date.now()}`,
      targetRole: 'manager',
      title: 'Invoice Submitted & Stock Deducted',
      message: `Checker ${currentUser.name || 'Showroom Checker'} uploaded invoice #${invoiceNo.trim().toUpperCase()} for ${selectedQuote.customerName}. Stock deducted from inventory.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'info'
    };

    onUpdateDb({ 
      ...db, 
      products: updatedProducts, 
      quotations: updatedQuotations,
      notifications: [newNotif, ...(db.notifications || [])]
    });

    showToast(`Quote ${selectedQuote.id} billed as ${invoiceNo.trim().toUpperCase()} and stock deducted!`);
    setSelectedQuote(null);
    setInvoiceNo('');
    setUploadedBill('');
  };

  return (
    <div className="fade-in" style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="alert alert-emerald" style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 9999, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', padding: '0.85rem 1.25rem' }}>
          <CheckCircle size={18} style={{ marginRight: '0.5rem' }} />
          <strong>{toastMsg}</strong>
        </div>
      )}

      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(13, 148, 136, 0.12) 100%)', borderRadius: '16px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <UserCheck size={26} color="var(--accent-cyan)" />
              Salesforce Invoice Billing & Verification Queue
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
              Process executive quotations by entering Salesforce invoice numbers and uploading receipt documents for manager audit and wallet incentive disbursement.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '0.6rem 1rem', borderRadius: '10px', textAlign: 'center', minWidth: '130px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>UNBILLED QUOTES</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                {quotations.filter(q => q.status === 'draft' && !q.invoiceNo).length}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '0.6rem 1rem', borderRadius: '10px', textAlign: 'center', minWidth: '130px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>SUBMITTED TO MANAGER</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {quotations.filter(q => q.status === 'pending_verification').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className={`btn ${filter === 'UNBILLED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('UNBILLED')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
          >
            ⚡ Pending Salesforce Entry ({quotations.filter(q => q.status === 'draft' && !q.invoiceNo).length})
          </button>
          <button 
            className={`btn ${filter === 'BILLED' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('BILLED')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
          >
            ✅ Billed / Under Verification ({quotations.filter(q => q.status === 'pending_verification' || q.status === 'verified').length})
          </button>
          <button 
            className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter('ALL')}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
          >
            All Quotes ({quotations.length})
          </button>
        </div>

        <div style={{ width: '280px', position: 'relative' }}>
          <input 
            type="text" 
            className="form-input"
            placeholder="🔍 Search Quote ID, client, executive..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
          />
        </div>
      </div>

      {/* Quotations Table Container */}
      <div className="custom-table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Quote ID</th>
              <th>Date</th>
              <th>Sales Executive</th>
              <th>Client Details</th>
              <th>Quoted Value</th>
              <th>Salesforce Status</th>
              <th>Receipt</th>
              <th>Checker Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotes.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No quotations match the selected filter.
                </td>
              </tr>
            ) : (
              filteredQuotes.map(quote => {
                const totalValue = quote.items.reduce((s,i) => s + (i.specialPrice * i.qty), 0);
                const isBilled = Boolean(quote.invoiceNo);
                const isBilledByExec = quote.invoiceNo && quote.billedBy !== 'checker';

                return (
                  <tr key={quote.id}>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setSelectedQuoteDetail(quote)}
                        style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        title="Click to view full quotation items & rates"
                      >
                        <Eye size={12} />
                        {quote.id}
                      </button>
                    </td>
                    <td>{new Date(quote.date).toLocaleDateString('en-IN')}</td>
                    <td><strong>{quote.executiveName}</strong></td>
                    <td>
                      <div>{quote.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{quote.customerMobile}</div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatRupee(totalValue)}</td>
                    <td>
                      {isBilled ? (
                        <div>
                          <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                            {quote.invoiceNo}
                          </span>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {isBilledByExec ? 'Submitted by Executive' : 'Billed by Checker'}
                          </div>
                        </div>
                      ) : (
                        <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                          Pending Salesforce Entry
                        </span>
                      )}
                    </td>
                    <td>
                      {quote.uploadedBill ? (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}
                          onClick={() => setPreviewQuote(quote)}
                        >
                          <Eye size={12} />
                          Preview
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No Receipt</span>
                      )}
                    </td>
                    <td>
                      {!isBilled ? (
                        <button 
                          className="btn btn-primary"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: '0.3rem', alignItems: 'center' }}
                          onClick={() => {
                            setSelectedQuote(quote);
                            setInvoiceNo('');
                            setUploadedBill('');
                          }}
                        >
                          <Upload size={12} />
                          Enter Salesforce Invoice
                        </button>
                      ) : (
                        <span style={{ color: 'var(--accent-emerald)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle size={14} />
                          Already Submitted
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Salesforce Billing Modal */}
      {selectedQuote && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '560px', width: '100%', padding: '2rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={22} color="var(--accent-cyan)" />
              Salesforce Invoice Entry - Quote #{selectedQuote.id}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Executive: <strong>{selectedQuote.executiveName}</strong> | Client: <strong>{selectedQuote.customerName} ({selectedQuote.customerMobile})</strong>
            </p>

            {/* Quoted Items Summary */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>ITEMS IN QUOTATION ({selectedQuote.items.length}):</div>
              {selectedQuote.items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>{item.qty}x {item.name}</span>
                  <span style={{ fontWeight: 600 }}>{formatRupee(item.specialPrice * item.qty)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem' }}>
                <span>Total Quoted Amount:</span>
                <span style={{ color: 'var(--accent-cyan)' }}>
                  {formatRupee(selectedQuote.items.reduce((s,i)=>s+(i.specialPrice*i.qty),0))}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveSalesforceEntry} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Salesforce Invoice Number *
                </label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. INV-SF-2026-8890"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Upload Downloaded Receipt PDF / Image (Optional)
                </label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setSelectedQuote(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-emerald"
                  style={{ fontWeight: 700 }}
                >
                  Submit to Manager for Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {previewQuote && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '650px', width: '100%', padding: '1.5rem', borderRadius: '16px', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                Receipt Document - Quote #{previewQuote.id} ({previewQuote.invoiceNo})
              </h4>
              <button className="btn btn-secondary" onClick={() => setPreviewQuote(null)}>Close</button>
            </div>
            {previewQuote.uploadedBill ? (
              previewQuote.uploadedBill.startsWith('data:application/pdf') ? (
                <iframe src={previewQuote.uploadedBill} title="PDF Receipt" style={{ width: '100%', height: '400px', border: 'none', borderRadius: '8px' }} />
              ) : (
                <img src={previewQuote.uploadedBill} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain', borderRadius: '8px' }} />
              )
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No receipt image uploaded.</p>
            )}
          </div>
        </div>
      )}

      {/* Full Quotation & Items Inspection Modal */}
      {selectedQuoteDetail && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel fade-in" style={{ maxWidth: '820px', width: '100%', padding: '1.75rem', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} />
                  Quotation Inspection — {selectedQuoteDetail.id}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Created on {new Date(selectedQuoteDetail.date).toLocaleString('en-IN')} by <strong>{selectedQuoteDetail.executiveName}</strong>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedQuoteDetail(null)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}>Close</button>
            </div>

            {/* Client Info Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>CLIENT NAME</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedQuoteDetail.customerName || 'Walk-in Client'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>WHATSAPP MOBILE</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedQuoteDetail.customerMobile || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>LOCATION / ADDRESS</div>
                <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{selectedQuoteDetail.customerLocation || selectedQuoteDetail.customerAddress || 'Showroom Walk-in'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>SALESFORCE STATUS</div>
                <div>
                  {selectedQuoteDetail.invoiceNo ? (
                    <span className="badge badge-emerald" style={{ fontSize: '0.75rem' }}>Invoice #{selectedQuoteDetail.invoiceNo}</span>
                  ) : (
                    <span className="badge badge-amber" style={{ fontSize: '0.75rem' }}>Pending Billing Entry</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quoted Line Items Table */}
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Itemized Clearance Products ({selectedQuoteDetail.items.reduce((sum, i) => sum + i.qty, 0)} Items)</h4>
            <div className="custom-table-container" style={{ marginBottom: '1.25rem' }}>
              <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product Code</th>
                    <th>Product Details</th>
                    <th>Brand</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>MRP</th>
                    <th style={{ textAlign: 'right' }}>Clearance Price</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedQuoteDetail.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{item.productId || item.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {item.division || 'Bathing'} {item.size ? `• ${item.size}` : ''} {item.location ? `• Loc: ${item.location}` : ''}
                        </div>
                      </td>
                      <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.7rem' }}>{item.brand}</span></td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.qty}</td>
                      <td style={{ textAlign: 'right', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatRupee(item.mrp)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-rose)' }}>{formatRupee(item.specialPrice)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>{formatRupee(item.specialPrice * item.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Summary Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(56, 189, 248, 0.05)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Total MRP Value: <span style={{ textDecoration: 'line-through' }}>{formatRupee(selectedQuoteDetail.items.reduce((sum, i) => sum + (i.mrp * i.qty), 0))}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                  Client Clearance Savings: {formatRupee(selectedQuoteDetail.items.reduce((sum, i) => sum + ((i.mrp - i.specialPrice) * i.qty), 0))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL BILLABLE AMOUNT</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                  {formatRupee(selectedQuoteDetail.items.reduce((sum, i) => sum + (i.specialPrice * i.qty), 0))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => window.open(`#/share/${selectedQuoteDetail.id}`, '_blank')}
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <FileText size={14} /> Open Printable PDF Quote Sheet
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedQuoteDetail(null)}>
                  Close
                </button>
                {!selectedQuoteDetail.invoiceNo && (
                  <button 
                    className="btn btn-emerald"
                    style={{ fontWeight: 700 }}
                    onClick={() => {
                      setSelectedQuote(selectedQuoteDetail);
                      setSelectedQuoteDetail(null);
                    }}
                  >
                    Enter Salesforce Invoice & Upload
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default CheckerWorkspace;
