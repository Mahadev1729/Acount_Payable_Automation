/**
 * Approvals Page - Workflow queue with approve/reject/send-back actions
 */
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { approvalAPI } from '../api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import {
  CheckCircleIcon, XCircleIcon, ArrowUturnLeftIcon,
  ClipboardDocumentCheckIcon, ChatBubbleLeftIcon
} from '@heroicons/react/24/outline';

const STAGE_LABELS = {
  ap_review: 'AP Review', manager_review: 'Manager Review',
  finance_review: 'Finance Review', payment: 'Payment'
};

const STAGE_REQUIRED_ROLES = {
  ap_review: ['ap_executive', 'admin'],
  manager_review: ['manager', 'admin'],
  finance_review: ['finance', 'admin'],
  payment: ['finance', 'admin'],
};

function canUserActOnStage(userRole, stage) {
  return STAGE_REQUIRED_ROLES[stage]?.includes(userRole);
}

export default function Approvals() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [actionModal, setActionModal] = useState(null);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState('');

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, pendingRes] = await Promise.all([
        approvalAPI.getAll(filter ? { stage: filter } : {}),
        approvalAPI.getPending(),
      ]);
      setApprovals(allRes.data.results || allRes.data.data || []);
      setPendingApprovals(pendingRes.data.data || []);
    } catch { toast.error('Failed to load approvals'); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const handleAction = async (action) => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      await approvalAPI.takeAction(actionModal.id, { action, comments });
      toast.success(`Invoice ${action} successfully!`);
      setActionModal(null);
      setComments('');
      fetchApprovals();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const list = tab === 'pending' ? pendingApprovals : approvals;

  const formatDate = (d) => {
    try { return d ? format(new Date(d), 'dd MMM yyyy HH:mm') : '—'; }
    catch { return d || '—'; }
  };

  return (
    <Layout title="Approvals" subtitle="Invoice approval workflow queue">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {[
          { key: 'pending', label: `My Pending (${pendingApprovals.length})` },
          { key: 'all', label: 'All Approvals' },
        ].map(t => (
          <button
            key={t.key}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        {tab === 'all' && (
          <select className="form-control" style={{ width: 200, marginLeft: 8 }}
            value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All Stages</option>
            <option value="ap_review">AP Review</option>
            <option value="manager_review">Manager Review</option>
            <option value="finance_review">Finance Review</option>
            <option value="payment">Payment</option>
          </select>
        )}
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
          ) : list.length === 0 ? (
            <div className="empty-state">
              <ClipboardDocumentCheckIcon className="empty-state-icon" />
              <p className="empty-state-title">
                {tab === 'pending' ? 'No pending approvals for your role' : 'No approvals found'}
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Vendor</th>
                  <th>Amount</th>
                  <th>Stage</th>
                  <th>Status</th>
                  <th>Approver</th>
                  <th>Assigned</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--primary)', fontFamily: 'monospace' }}>
                        {a.invoice_detail?.invoice_number || `INV-${a.invoice}`}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{a.invoice_detail?.vendor_name || '—'}</td>
                    <td style={{ fontWeight: 700 }}>
                      {a.invoice_detail?.total_amount
                        ? `₹${Number(a.invoice_detail.total_amount).toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td>
                      <span className="badge badge-purple">{STAGE_LABELS[a.stage] || a.stage}</span>
                    </td>
                    <td><StatusBadge status={a.action} /></td>
                    <td style={{ fontSize: '0.82rem' }}>{a.approver_name || 'Unassigned'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(a.assigned_at)}</td>
                    <td>
                      {a.action === 'pending' && canUserActOnStage(user?.role, a.stage) && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => { setActionModal(a); setComments(''); }}
                        >
                          <ChatBubbleLeftIcon style={{ width: 14, height: 14 }} /> Review
                        </button>
                      )}
                      {a.action === 'pending' && !canUserActOnStage(user?.role, a.stage) && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting reviewer</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => setActionModal(null)}
        title={`Review Invoice — ${actionModal?.invoice_detail?.invoice_number || ''}`}
        size="md"
      >
        {actionModal && (
          <div>
            {/* Invoice Summary */}
            <div style={{
              padding: '12px 16px', background: 'var(--primary-50)',
              borderRadius: 'var(--radius-md)', marginBottom: 20,
              border: '1px solid var(--primary-light)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Stage:</span> <strong>{STAGE_LABELS[actionModal.stage]}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Vendor:</span> <strong>{actionModal.invoice_detail?.vendor_name || '—'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                  <strong> ₹{Number(actionModal.invoice_detail?.total_amount || 0).toLocaleString('en-IN')}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <StatusBadge status={actionModal.invoice_detail?.status} /></div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Comments / Remarks</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Add your comments or reasons for this action..."
                value={comments}
                onChange={e => setComments(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                id="approve-btn"
                className="btn btn-success"
                onClick={() => handleAction('approved')}
                disabled={processing}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <CheckCircleIcon style={{ width: 17, height: 17 }} />
                Approve
              </button>
              <button
                id="sendback-btn"
                className="btn btn-warning"
                onClick={() => handleAction('sent_back')}
                disabled={processing}
                style={{ flex: 1, justifyContent: 'center', background: 'var(--warning)', color: 'white', border: 'none' }}
              >
                <ArrowUturnLeftIcon style={{ width: 17, height: 17 }} />
                Send Back
              </button>
              <button
                id="reject-btn"
                className="btn btn-danger"
                onClick={() => handleAction('rejected')}
                disabled={processing}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <XCircleIcon style={{ width: 17, height: 17 }} />
                Reject
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
