/**
 * OCR Results Page - View and manually correct OCR-extracted fields
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Layout from '../components/layout/Layout';
import { invoiceAPI, vendorAPI } from '../api';
import toast from 'react-hot-toast';
import { CheckIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function OCRResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningOCR, setRunningOCR] = useState(false);

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, venRes] = await Promise.all([
          invoiceAPI.getById(id),
          vendorAPI.getAll({ page_size: 200 }),
        ]);
        const inv = invRes.data.data || invRes.data;
        setInvoice(inv);
        setVendors(venRes.data.results || venRes.data.data || []);
        reset({
          invoice_number: inv.invoice_number || '',
          invoice_date: inv.invoice_date || '',
          payment_due_date: inv.payment_due_date || '',
          vendor: inv.vendor || '',
          vendor_name_raw: inv.vendor_name_raw || '',
          vendor_gstin: inv.vendor_gstin || '',
          po_number: inv.po_number || '',
          subtotal: inv.subtotal || 0,
          tax_amount: inv.tax_amount || 0,
          tax_percentage: inv.tax_percentage || 0,
          total_amount: inv.total_amount || 0,
          currency: inv.currency || 'INR',
          notes: inv.notes || '',
        });
      } catch {
        toast.error('Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleRunOCR = async () => {
    setRunningOCR(true);
    try {
      const res = await invoiceAPI.runOCR(id);
      const inv = res.data.data;
      setInvoice(inv);
      reset({
        invoice_number: inv.invoice_number || '',
        invoice_date: inv.invoice_date || '',
        vendor_name_raw: inv.vendor_name_raw || '',
        vendor_gstin: inv.vendor_gstin || '',
        po_number: inv.po_number || '',
        subtotal: inv.subtotal || 0,
        tax_amount: inv.tax_amount || 0,
        total_amount: inv.total_amount || 0,
      });
      toast.success('OCR re-processed successfully!');
    } catch {
      toast.error('OCR processing failed. Check Tesseract installation.');
    } finally {
      setRunningOCR(false);
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Clean up empty strings that should be null for backend validation
      const payload = { ...data };
      if (payload.vendor === '') payload.vendor = null;
      if (payload.invoice_date === '') payload.invoice_date = null;
      if (payload.payment_due_date === '') payload.payment_due_date = null;

      await invoiceAPI.correctOCR(id, payload);
      toast.success('Invoice data saved successfully!');
      navigate(`/invoices/${id}/validate`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <Layout title="OCR Results">
      <div className="loading-overlay"><div className="spinner spinner-lg" /><span>Loading...</span></div>
    </Layout>
  );

  const confidence = invoice?.ocr_confidence ? (invoice.ocr_confidence * 100).toFixed(0) : 0;

  return (
    <Layout
      title="OCR Results"
      subtitle={`Invoice extraction results — Confidence: ${confidence}%`}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, maxWidth: 1100 }}>
        {/* Main Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3 className="card-title">📋 Extracted Invoice Fields</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* OCR Confidence Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>OCR Accuracy</span>
                  <div className="progress-bar" style={{ width: 80 }}>
                    <div className="progress-fill" style={{
                      width: `${confidence}%`,
                      background: confidence >= 80 ? 'linear-gradient(90deg, #059669, #34d399)' :
                                  confidence >= 60 ? 'linear-gradient(90deg, #d97706, #fbbf24)' :
                                                     'linear-gradient(90deg, #dc2626, #f87171)'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: confidence >= 80 ? 'var(--success)' : 'var(--danger)' }}>
                    {confidence}%
                  </span>
                </div>
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={handleRunOCR} disabled={runningOCR}>
                  <ArrowPathIcon style={{ width: 15, height: 15, animation: runningOCR ? 'spin 1s linear infinite' : 'none' }} />
                  {runningOCR ? 'Processing...' : 'Re-run OCR'}
                </button>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Invoice Number <span>*</span></label>
                  <input className="form-control" {...register('invoice_number', { required: true })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice Date</label>
                  <input type="date" className="form-control" {...register('invoice_date')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Due Date</label>
                  <input type="date" className="form-control" {...register('payment_due_date')} />
                </div>
                <div className="form-group">
                  <label className="form-label">PO Number</label>
                  <input className="form-control" placeholder="e.g., PO-2024-001" {...register('po_number')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Vendor (Master)</label>
                  <select className="form-control" {...register('vendor')}>
                    <option value="">— Select Vendor —</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.vendor_name} ({v.gstin || 'No GSTIN'})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Vendor Name (from Invoice)</label>
                  <input className="form-control" {...register('vendor_name_raw')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Vendor GSTIN</label>
                  <input className="form-control" placeholder="22AAAAA0000A1Z5" {...register('vendor_gstin')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-control" {...register('currency')}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              {/* Amounts */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>
                  AMOUNT DETAILS
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Subtotal <span>*</span></label>
                    <input type="number" step="0.01" className="form-control" {...register('subtotal')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tax %</label>
                    <input type="number" step="0.01" className="form-control" {...register('tax_percentage')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tax Amount</label>
                    <input type="number" step="0.01" className="form-control" {...register('tax_amount')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Amount <span>*</span></label>
                    <input type="number" step="0.01" className="form-control" {...register('total_amount', { required: true })} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={2} {...register('notes')} />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/invoices')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? <><div className="spinner" style={{ borderTopColor: 'white', width: 16, height: 16 }} /> Saving...</>
                : <><CheckIcon style={{ width: 18, height: 18 }} /> Save & Validate</>
              }
            </button>
          </div>
        </form>

        {/* Right Sidebar - Raw OCR Text */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📄 Raw OCR Text</h3>
            </div>
            <div className="card-body">
              {invoice?.ocr_data?.raw_text ? (
                <pre style={{
                  fontSize: '0.72rem', color: 'var(--text-secondary)',
                  background: '#f8fafc', padding: 10, borderRadius: 8,
                  maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap',
                  fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.5
                }}>
                  {invoice.ocr_data.raw_text}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <ExclamationTriangleIcon style={{ width: 32, height: 32, margin: '0 auto 8px' }} />
                  <p>No OCR text available.</p>
                  <p>Run OCR processing first.</p>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          {invoice?.line_items?.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">
                <h3 className="card-title">📦 Line Items</h3>
                <span className="badge badge-blue">{invoice.line_items.length}</span>
              </div>
              <div className="card-body" style={{ padding: '0' }}>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.line_items.map((item, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: '0.78rem' }}>{item.description || '—'}</td>
                          <td>{item.quantity || '—'}</td>
                          <td>{item.rate ? `₹${item.rate}` : '—'}</td>
                          <td style={{ fontWeight: 600 }}>{item.amount ? `₹${item.amount}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
