/**
 * Settings Page - Application Configuration
 */
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Cog6ToothIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function Settings() {
  const { user } = useAuth();
  const [tesseractPath, setTesseractPath] = useState('C:\\Program Files\\Tesseract-OCR\\tesseract.exe');
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoMatch, setAutoMatch] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    toast.success('Settings saved (local only — restart backend to apply)');
    setTimeout(() => setSaved(false), 2000);
  };

  const Toggle = ({ label, desc, value, onChange }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
      </div>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
          background: value ? 'var(--primary)' : 'var(--border)',
          position: 'relative', transition: 'var(--transition)', flexShrink: 0
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 3,
          left: value ? 23 : 3, transition: 'var(--transition)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
      </div>
    </div>
  );

  return (
    <Layout title="Settings" subtitle="Application configuration">
      <div style={{ maxWidth: 640 }}>
        {/* OCR Settings */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">🔍 OCR Configuration</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Tesseract OCR Path</label>
              <input className="form-control" value={tesseractPath}
                onChange={e => setTesseractPath(e.target.value)}
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Path to tesseract.exe on Windows. Update in backend/apautomation/settings.py
              </p>
            </div>
            <Toggle label="Enable Auto OCR" desc="Automatically run OCR after invoice upload"
              value={ocrEnabled} onChange={setOcrEnabled} />
          </div>
        </div>

        {/* Workflow Settings */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">⚙️ Workflow Settings</h3>
          </div>
          <div className="card-body">
            <Toggle label="Auto PO Matching" desc="Automatically match invoices to POs on upload"
              value={autoMatch} onChange={setAutoMatch} />
            <Toggle label="Email Notifications" desc="Send email reminders for pending approvals"
              value={emailNotifications} onChange={setEmailNotifications} />
          </div>
        </div>

        {/* System Info */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">ℹ️ System Information</h3>
          </div>
          <div className="card-body">
            {[
              { label: 'Application', value: 'AP Automation System v1.0' },
              { label: 'Backend', value: 'Django 4.2 + DRF' },
              { label: 'Database', value: 'PostgreSQL (localhost:5432/apautomation)' },
              { label: 'Frontend', value: 'React 18 + Vite' },
              { label: 'OCR Engine', value: 'Tesseract OCR + OpenCV' },
              { label: 'Logged In As', value: `${user?.email} (${user?.role})` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? <><CheckIcon style={{ width: 16, height: 16 }} /> Saved!</> : 'Save Settings'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
