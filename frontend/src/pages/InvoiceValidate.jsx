/**
 * Invoice Validate Page - Run validation checks and submit for approval workflow
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import StatusBadge from '../components/ui/StatusBadge';
import { invoiceAPI, approvalAPI } from '../api';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon,
  ClipboardDocumentCheckIcon, ArrowLeftIcon
} from '@heroicons/react/24/outline';

const SEVERITY_ICON = {
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
};

const SEVERITY_COLOR = {
  error: 'var(--danger)',
  warning: 'var(--warning)',
};

export default function InvoiceValidate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [errors, setErrors] = useState([]);
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasPendingApproval, setHasPendingApproval] = useState(false);

  const checkPendingApproval = async () => {
    try {
      const res = await approvalAPI.getAll({ invoice: id, action: 'pending' });
      const items = res.data.results || res.data.data || [];
      setHasPendingApproval(items.length > 0);
    } catch {
      setHasPendingApproval(false);
    }
  };

  const runValidation = async () => {
    setValidating(true);
    try {
      const res = await invoiceAPI.validate(id);
      const inv = res.data.data || res.data;
      setInvoice(inv);
      setErrors(res.data.errors || []);
      setIsValid(res.data.is_valid);
      if (res.data.is_valid) {
        toast.success('Invoice passed all validation checks');
      } else {
        toast.error('Validation failed — fix errors before submitting for approval');
      }
    } catch {
      toast.error('Validation check failed');
    } finally {
      setValidating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const res = await invoiceAPI.getById(id);
        setInvoice(res.data.data || res.data);
      } catch {
        toast.error('Failed to load invoice');
        navigate('/invoices');
      }
    };
    loadInvoice().then(async () => {
      await runValidation();
      await checkPendingApproval();
    });
  }, [id]);

  const handleSubmitForApproval = async () => {
    if (!isValid) {
      toast.error('Fix validation errors before submitting for approval');
      return;
    }
    setSubmitting(true);
    try {
      await approvalAPI.initiateWorkflow(Number(id));
      toast.success('Invoice submitted for approval workflow');
      navigate('/approvals');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to start approval workflow');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = isValid && ['validated', 'po_matched'].includes(invoice?.status) && !hasPendingApproval;
  const inWorkflow = hasPendingApproval || (invoice?.status && !['validated', 'po_matched', 'draft', 'ocr_complete', 'pending', 'rejected'].includes(invoice.status));

  if (loading && !invoice) {
    return (
      <Layout title="Validate Invoice">
        <div className="loading-overlay"><div className="spinner spinner-lg" /><span>Loading...</span></div>
      </Layout>
    );
  }

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return (
    <Layout
      title="Validate Invoice"
      subtitle={invoice?.invoice_number ? `Invoice ${invoice.invoice_number}` : `Invoice #${id}`}
    >
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Summary Card */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Vendor</div>
                <div style={{ fontWeight: 600 }}>{invoice?.vendor_detail?.vendor_name || invoice?.vendor_name_raw || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Total Amount</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  ₹{Number(invoice?.total_amount || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Status</div>
                <StatusBadge status={invoice?.status} />
              </div>
            </div>

            {/* Validation Result Banner */}
            <div style={{
              padding: '14px 18px', borderRadius: 'var(--radius-md)',
              background: isValid ? 'var(--success-50, #ecfdf5)' : 'var(--danger-50, #fef2f2)',
              border: `1px solid ${isValid ? 'var(--success)' : 'var(--danger)'}`,
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              {isValid
                ? <CheckCircleIcon style={{ width: 24, height: 24, color: 'var(--success)', flexShrink: 0 }} />
                : <XCircleIcon style={{ width: 24, height: 24, color: 'var(--danger)', flexShrink: 0 }} />
              }
              <div>
                <div style={{ fontWeight: 700, color: isValid ? 'var(--success)' : 'var(--danger)' }}>
                  {isValid ? 'Validation Passed' : 'Validation Failed'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {isValid
                    ? 'All mandatory checks passed. You can submit this invoice for approval.'
                    : `${errorCount} error(s) and ${warningCount} warning(s) found. Errors must be fixed.`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3 className="card-title">Validation Results</h3>
              <span className="badge badge-amber">{errors.length} issue(s)</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {errors.map((err, i) => {
                const Icon = SEVERITY_ICON[err.severity] || ExclamationTriangleIcon;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 18px',
                    borderBottom: i < errors.length - 1 ? '1px solid var(--border)' : 'none'
                  }}>
                    <Icon style={{ width: 18, height: 18, color: SEVERITY_COLOR[err.severity], flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>
                        {err.field?.replace(/_/g, ' ')}
                        <span className={`badge ${err.severity === 'error' ? 'badge-red' : 'badge-amber'}`}
                          style={{ marginLeft: 8, fontSize: '0.68rem' }}>
                          {err.severity}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {err.message}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {inWorkflow && (
          <div className="card" style={{ marginBottom: 20, border: '1px solid var(--primary-light)' }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ClipboardDocumentCheckIcon style={{ width: 28, height: 28, color: 'var(--primary)' }} />
              <div>
                <div style={{ fontWeight: 700 }}>Already in Approval Workflow</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  This invoice is currently at stage: <StatusBadge status={invoice?.status} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/invoices/${id}`)}>
            <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to Invoice
          </button>
          <button className="btn btn-secondary" onClick={runValidation} disabled={validating}>
            {validating ? 'Re-checking...' : 'Re-run Validation'}
          </button>
          {!inWorkflow && (
            <button
              className="btn btn-primary"
              onClick={handleSubmitForApproval}
              disabled={!canSubmit || submitting}
              title={!isValid ? 'Fix validation errors first' : 'Submit for AP approval workflow'}
            >
              <ClipboardDocumentCheckIcon style={{ width: 18, height: 18 }} />
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
          {inWorkflow && (
            <button className="btn btn-primary" onClick={() => navigate('/approvals')}>
              <ClipboardDocumentCheckIcon style={{ width: 18, height: 18 }} /> View Approvals
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
