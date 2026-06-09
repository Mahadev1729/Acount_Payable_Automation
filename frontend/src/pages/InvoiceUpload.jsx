/**
 * Invoice Upload Page - Drag & Drop, Bulk Upload, Multi-format
 */
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { invoiceAPI } from '../api';
import toast from 'react-hot-toast';
import {
  CloudArrowUpIcon, DocumentIcon, XMarkIcon,
  CheckCircleIcon, ExclamationCircleIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/tiff': ['.tiff', '.tif'],
};

function FileCard({ file, status, onRemove, onOCR, invoiceId }) {
  const icons = {
    pending:    { icon: DocumentIcon,         color: 'var(--text-muted)',   bg: '#f1f5f9' },
    uploading:  { icon: ArrowPathIcon,        color: 'var(--primary)',      bg: 'var(--primary-50)' },
    uploaded:   { icon: CheckCircleIcon,      color: 'var(--success)',      bg: 'var(--success-light)' },
    error:      { icon: ExclamationCircleIcon,color: 'var(--danger)',       bg: 'var(--danger-light)' },
  };

  const cfg = icons[status] || icons.pending;
  const Icon = cfg.icon;
  const ext = file.name.split('.').pop().toUpperCase();
  const size = (file.size / 1024).toFixed(0);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
      background: 'white', transition: 'var(--transition)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: cfg.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Icon style={{ width: 20, height: 20, color: cfg.color,
          animation: status === 'uploading' ? 'spin 1s linear infinite' : 'none'
        }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}
          className="truncate">{file.name}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ext} • {size} KB</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {status === 'uploaded' && invoiceId && (
          <button className="btn btn-primary btn-sm" onClick={() => onOCR(invoiceId)}>
            Run OCR
          </button>
        )}
        <span className={`badge badge-${
          status === 'uploaded' ? 'green' : status === 'error' ? 'red' :
          status === 'uploading' ? 'blue' : 'gray'
        }`}>
          {status === 'uploading' ? 'Uploading...' :
           status === 'uploaded' ? 'Uploaded' :
           status === 'error' ? 'Failed' : 'Ready'}
        </span>
        {status !== 'uploading' && (
          <button
            onClick={() => onRemove(file.name)}
            style={{ color: 'var(--text-muted)', padding: 4 }}
          >
            <XMarkIcon style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function InvoiceUpload() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [fileStatuses, setFileStatuses] = useState({});
  const [invoiceIds, setInvoiceIds] = useState({});
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    rejectedFiles.forEach(({ file, errors }) => {
      toast.error(`${file.name}: ${errors.map(e => e.message).join(', ')}`);
    });
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const newFiles = acceptedFiles.filter(f => !existing.has(f.name));
      return [...prev, ...newFiles];
    });
    setFileStatuses(prev => {
      const next = { ...prev };
      acceptedFiles.forEach(f => { if (!next[f.name]) next[f.name] = 'pending'; });
      return next;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024,
  });

  const removeFile = (name) => {
    setFiles(prev => prev.filter(f => f.name !== name));
    setFileStatuses(prev => { const n = { ...prev }; delete n[name]; return n; });
    setInvoiceIds(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const runOCR = async (invoiceId) => {
    const loadId = toast.loading('Running OCR...');
    try {
      await invoiceAPI.runOCR(invoiceId);
      toast.success('OCR complete! Redirecting to results...', { id: loadId });
      setTimeout(() => navigate(`/invoices/${invoiceId}/ocr`), 1500);
    } catch {
      toast.error('OCR failed.', { id: loadId });
    }
  };

  const uploadAll = async () => {
    const pendingFiles = files.filter(f => fileStatuses[f.name] === 'pending');
    if (!pendingFiles.length) return toast.error('No files to upload.');

    setUploading(true);

    for (const file of pendingFiles) {
      setFileStatuses(prev => ({ ...prev, [file.name]: 'uploading' }));
      try {
        const fd = new FormData();
        fd.append('invoice_file', file);
        const res = await invoiceAPI.upload(fd);
        const invId = res.data.data.id;
        setFileStatuses(prev => ({ ...prev, [file.name]: 'uploaded' }));
        setInvoiceIds(prev => ({ ...prev, [file.name]: invId }));
      } catch {
        setFileStatuses(prev => ({ ...prev, [file.name]: 'error' }));
      }
    }

    setUploading(false);
    const uploaded = files.filter(f => fileStatuses[f.name] === 'uploaded').length;
    toast.success(`Upload complete!`);
  };

  const uploadCount = Object.values(fileStatuses).filter(s => s === 'uploaded').length;
  const totalCount = files.length;

  return (
    <Layout title="Invoice Upload" subtitle="Upload invoices for OCR processing">
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* Dropzone */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">📂 Upload Invoices</h3>
            <span className="badge badge-blue">PDF • JPG • PNG • TIFF</span>
          </div>
          <div className="card-body">
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'active' : ''}`}
            >
              <input {...getInputProps()} id="file-upload-input" />
              <CloudArrowUpIcon className="dropzone-icon" />
              <p className="dropzone-text">
                {isDragActive
                  ? 'Drop your invoices here...'
                  : <><strong style={{ color: 'var(--primary)' }}>Click to upload</strong> or drag & drop</>
                }
              </p>
              <p className="dropzone-hint">PDF, JPG, PNG, TIFF up to 50MB each • Multiple files supported</p>
            </div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h3 className="card-title">
                Files ({uploadCount}/{totalCount} uploaded)
              </h3>
              {uploadCount > 0 && (
                <div className="progress-bar" style={{ width: 120 }}>
                  <div className="progress-fill" style={{ width: `${(uploadCount/totalCount)*100}%` }} />
                </div>
              )}
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {files.map(file => (
                <FileCard
                  key={file.name}
                  file={file}
                  status={fileStatuses[file.name] || 'pending'}
                  onRemove={removeFile}
                  onOCR={runOCR}
                  invoiceId={invoiceIds[file.name]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/invoices')}>
            View All Invoices
          </button>
          {files.length > 0 && (
            <button
              id="upload-all-btn"
              className="btn btn-primary"
              onClick={uploadAll}
              disabled={uploading || !files.some(f => fileStatuses[f.name] === 'pending')}
            >
              {uploading ? (
                <><div className="spinner" style={{ borderTopColor: 'white', width: 16, height: 16 }} />
                Uploading...</>
              ) : (
                <><CloudArrowUpIcon style={{ width: 18, height: 18 }} />
                Upload {files.filter(f => fileStatuses[f.name] === 'pending').length} File(s)</>
              )}
            </button>
          )}
        </div>

        {/* Info */}
        <div style={{
          marginTop: 20, padding: '14px 16px',
          background: 'var(--primary-50)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--primary-light)', fontSize: '0.8rem',
          color: 'var(--primary-dark)'
        }}>
          <strong>💡 Tip:</strong> After upload, click "Run OCR" to automatically extract invoice data.
          You can then review and correct the extracted fields before saving.
        </div>
      </div>
    </Layout>
  );
}
