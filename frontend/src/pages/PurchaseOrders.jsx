/**
 * Purchase Orders Page
 */
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { purchaseOrderAPI, vendorAPI, invoiceAPI } from '../api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { PlusIcon, MagnifyingGlassIcon, LinkIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

export default function PurchaseOrders() {
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showMatch, setShowMatch] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [matchResult, setMatchResult] = useState(null);
  const [matching, setMatching] = useState(false);

  const { register: regPO, handleSubmit: handlePO, reset: resetPO } = useForm({ defaultValues: { status: 'approved' } });
  const { register: regMatch, handleSubmit: handleMatch } = useForm({ defaultValues: { match_type: '2way' } });

  const fetchPOs = useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, venRes, invRes] = await Promise.all([
        purchaseOrderAPI.getAll({ search }),
        vendorAPI.getAll({ status: 'active', page_size: 200 }),
        invoiceAPI.getAll({ page_size: 200 }),
      ]);
      setPOs(poRes.data.results || poRes.data.data || []);
      setVendors(venRes.data.results || venRes.data.data || []);
      setInvoices(invRes.data.results || invRes.data.data || []);
    } catch { toast.error('Failed to load purchase orders'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchPOs(); }, [fetchPOs]);

  const createPO = async (data) => {
    try {
      await purchaseOrderAPI.create(data);
      toast.success('PO created');
      setShowCreate(false);
      resetPO();
      fetchPOs();
    } catch { toast.error('Failed to create PO'); }
  };

  const runMatch = async (data) => {
    setMatching(true);
    setMatchResult(null);
    try {
      const res = await purchaseOrderAPI.matchInvoice(showMatch.id, data);
      setMatchResult(res.data);
      toast.success(`Match complete: ${res.data.match_status}`);
      fetchPOs();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Match failed');
    } finally {
      setMatching(false);
    }
  };

  const formatDate = (d) => { try { return d ? format(new Date(d), 'dd MMM yyyy') : '—'; } catch { return d || '—'; } };

  return (
    <Layout title="Purchase Orders" subtitle="Manage POs and invoice matching">
      <div className="filters-bar">
        <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
          <MagnifyingGlassIcon style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          <input placeholder="Search PO number, vendor..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <PlusIcon style={{ width: 16, height: 16 }} /> New PO
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
          ) : pos.length === 0 ? (
            <div className="empty-state">
              <ShoppingCartIcon className="empty-state-icon" />
              <p className="empty-state-title">No purchase orders found</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>PO Number</th><th>Vendor</th><th>PO Date</th><th>Total Amount</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pos.map(po => (
                  <tr key={po.id}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{po.po_number}</span></td>
                    <td>{po.vendor_name || '—'}</td>
                    <td>{formatDate(po.po_date)}</td>
                    <td style={{ fontWeight: 700 }}>₹{Number(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td><StatusBadge status={po.status} /></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setShowMatch(po); setMatchResult(null); }}>
                        <LinkIcon style={{ width: 14, height: 14 }} /> Match Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create PO Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Purchase Order" size="md">
        <form onSubmit={handlePO(createPO)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group">
              <label className="form-label">PO Number <span>*</span></label>
              <input className="form-control" placeholder="PO-2024-001" {...regPO('po_number', { required: true })} />
            </div>
            <div className="form-group">
              <label className="form-label">PO Date <span>*</span></label>
              <input type="date" className="form-control" {...regPO('po_date', { required: true })} />
            </div>
            <div className="form-group">
              <label className="form-label">Vendor <span>*</span></label>
              <select className="form-control" {...regPO('vendor', { required: true })}>
                <option value="">— Select —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Total Amount <span>*</span></label>
              <input type="number" step="0.01" className="form-control" {...regPO('total_amount', { required: true })} />
            </div>
            <div className="form-group">
              <label className="form-label">Tax Amount</label>
              <input type="number" step="0.01" className="form-control" {...regPO('tax_amount')} />
            </div>
            <div className="form-group">
              <label className="form-label">Delivery Date</label>
              <input type="date" className="form-control" {...regPO('delivery_date')} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create PO</button>
          </div>
        </form>
      </Modal>

      {/* Match Modal */}
      <Modal isOpen={!!showMatch} onClose={() => { setShowMatch(null); setMatchResult(null); }}
        title={`Match Invoice — ${showMatch?.po_number}`} size="md">
        {showMatch && (
          <form onSubmit={handleMatch(runMatch)}>
            <div className="form-group">
              <label className="form-label">Invoice <span>*</span></label>
              <select className="form-control" {...regMatch('invoice_id', { required: true })}>
                <option value="">— Select Invoice —</option>
                {invoices.map(i => (
                  <option key={i.id} value={i.id}>{i.invoice_number || `#${i.id}`} — ₹{i.total_amount}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Match Type</label>
              <select className="form-control" {...regMatch('match_type')}>
                <option value="2way">2-Way Match (PO vs Invoice)</option>
                <option value="3way">3-Way Match (PO vs GRN vs Invoice)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center', marginBottom: 16 }} disabled={matching}>
              {matching ? <><div className="spinner" style={{ borderTopColor: 'white', width: 16, height: 16 }} /> Matching...</> : 'Run Match'}
            </button>

            {matchResult && (
              <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)',
                background: matchResult.match_status.includes('mismatch') ? 'var(--danger-light)' : 'var(--success-light)',
                border: `1px solid ${matchResult.match_status.includes('mismatch') ? '#fca5a5' : '#6ee7b7'}`
              }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  Result: <StatusBadge status={matchResult.match_status} />
                </div>
                {matchResult.match_details?.mismatches?.map((m, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    ⚠️ {m.check}: {m.message || m.status}
                  </div>
                ))}
              </div>
            )}
          </form>
        )}
      </Modal>
    </Layout>
  );
}
