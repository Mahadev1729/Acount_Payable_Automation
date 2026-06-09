/**
 * Reports Page - AP Aging, Invoice Status, Vendor, Payment, GST, Audit Logs
 * Exports: PDF, Excel, CSV
 */
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import { reportsAPI } from '../api';
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const REPORTS = [
  {
    key: 'aging', title: 'AP Aging Report',
    desc: 'Outstanding invoices categorized by age (0-30, 31-60, 61-90, 90+ days)',
    icon: '📅', color: 'var(--warning)',
    endpoint: '/reports/aging/',
  },
  {
    key: 'invoice-status', title: 'Invoice Status Report',
    desc: 'All invoices with their current status, amounts, and workflow stage',
    icon: '📋', color: 'var(--primary)',
    endpoint: '/reports/invoice-status/',
  },
  {
    key: 'vendor', title: 'Vendor Report',
    desc: 'Vendor-wise invoice count, total invoiced amount, and payment summary',
    icon: '🏢', color: 'var(--accent)',
    endpoint: '/reports/vendors/',
  },
  {
    key: 'payment', title: 'Payment Report',
    desc: 'All payment records with status, reference numbers, and bank details',
    icon: '💳', color: 'var(--success)',
    endpoint: '/reports/payments/',
  },
  {
    key: 'gst', title: 'GST / Tax Report',
    desc: 'GST-wise tax summary for compliance and filing purposes',
    icon: '🧾', color: 'var(--info)',
    endpoint: '/reports/gst/',
  },
  {
    key: 'audit', title: 'Audit Log Report',
    desc: 'Complete audit trail of all system actions, approvals, and changes',
    icon: '🔍', color: '#64748b',
    endpoint: '/reports/audit-logs/',
  },
];

export default function Reports() {
  const [loading, setLoading] = useState({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleExport = async (report, format) => {
    const key = `${report.key}-${format}`;
    setLoading(prev => ({ ...prev, [key]: true }));
    const tid = toast.loading(`Generating ${format.toUpperCase()}...`);
    try {
      const params = { export: format, date_from: dateFrom, date_to: dateTo };
      const res = await reportsAPI.exportReport(report.endpoint, params);

      const ext = format === 'excel' ? 'xlsx' : format;
      const mimeTypes = {
        pdf: 'application/pdf',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv'
      };

      const url = URL.createObjectURL(new Blob([res.data], { type: mimeTypes[format] }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} downloaded!`, { id: tid });
    } catch {
      toast.error(`Export failed. Ensure backend is running.`, { id: tid });
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <Layout title="Reports" subtitle="Generate and export AP reports in multiple formats">
      {/* Date Filter */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            📅 Date Range Filter:
          </span>
          <div className="form-group" style={{ margin: 0 }}>
            <input type="date" className="form-control" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)} placeholder="From" />
          </div>
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <div className="form-group" style={{ margin: 0 }}>
            <input type="date" className="form-control" value={dateTo}
              onChange={e => setDateTo(e.target.value)} placeholder="To" />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>
            Clear
          </button>
        </div>
      </div>

      {/* Report Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {REPORTS.map(report => (
          <div key={report.key} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '20px',
              borderLeft: `4px solid ${report.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{report.icon}</div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {report.title}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                    {report.desc}
                  </p>
                </div>
              </div>

              {/* Export Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {['pdf', 'excel', 'csv'].map(fmt => (
                  <button
                    key={fmt}
                    id={`export-${report.key}-${fmt}`}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => handleExport(report, fmt)}
                    disabled={loading[`${report.key}-${fmt}`]}
                  >
                    {loading[`${report.key}-${fmt}`] ? (
                      <div className="spinner" style={{ width: 14, height: 14 }} />
                    ) : (
                      <ArrowDownTrayIcon style={{ width: 14, height: 14 }} />
                    )}
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div style={{
        marginTop: 24, padding: '14px 20px',
        background: 'var(--primary-50)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--primary-light)', fontSize: '0.82rem', color: 'var(--primary-dark)'
      }}>
        <strong>💡 Export Options:</strong> PDF (formatted report with headers), Excel (editable spreadsheet), CSV (raw data for analysis).
        Use the date filter above to limit report data to a specific period.
      </div>
    </Layout>
  );
}
