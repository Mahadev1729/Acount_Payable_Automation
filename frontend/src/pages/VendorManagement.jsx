/**
 * Vendor Management Page - Full CRUD with modal
 */
import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';
import { vendorAPI } from '../api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  PlusIcon, MagnifyingGlassIcon, PencilIcon,
  BuildingOfficeIcon, CheckIcon
} from '@heroicons/react/24/outline';

function VendorForm({ vendor, onSuccess, onCancel }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: vendor || {
      status: 'active', account_type: 'current', payment_terms: 30, country: 'India'
    }
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (vendor?.id) {
        await vendorAPI.update(vendor.id, data);
        toast.success('Vendor updated');
      } else {
        await vendorAPI.create(data);
        toast.success('Vendor created');
      }
      onSuccess();
    } catch (err) {
      const errs = err?.response?.data?.errors;
      if (errs) {
        Object.values(errs).forEach(msgs => toast.error(msgs[0]));
      } else {
        toast.error('Operation failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, name, required, type = 'text', placeholder }) => (
    <div className="form-group">
      <label className="form-label">{label} {required && <span>*</span>}</label>
      <input
        id={`vendor-${name}`}
        type={type}
        className={`form-control ${errors[name] ? 'error' : ''}`}
        placeholder={placeholder}
        {...register(name, required ? { required: `${label} is required` } : {})}
      />
      {errors[name] && <p className="form-error">{errors[name].message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Field name="vendor_name" label="Vendor Name" required placeholder="ABC Supplies Ltd" />
        <Field name="company_name" label="Company Name" required placeholder="ABC Supplies Private Limited" />
        <Field name="email" label="Email" required type="email" placeholder="accounts@vendor.com" />
        <Field name="phone" label="Phone" required placeholder="+91 9876543210" />
        <Field name="gstin" label="GSTIN" placeholder="22AAAAA0000A1Z5" />
        <Field name="pan" label="PAN" placeholder="ABCDE1234F" />
        <Field name="bank_name" label="Bank Name" required placeholder="State Bank of India" />
        <Field name="account_number" label="Account Number" required placeholder="1234567890" />
        <Field name="ifsc_code" label="IFSC Code" required placeholder="SBIN0001234" />
        <div className="form-group">
          <label className="form-label">Account Type</label>
          <select className="form-control" {...register('account_type')}>
            <option value="current">Current</option>
            <option value="savings">Savings</option>
            <option value="cash_credit">Cash Credit</option>
          </select>
        </div>
        <Field name="address_line1" label="Address Line 1" required placeholder="123, MG Road" />
        <Field name="city" label="City" required placeholder="Bangalore" />
        <Field name="state" label="State" required placeholder="Karnataka" />
        <Field name="pincode" label="Pincode" required placeholder="560001" />
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-control" {...register('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <Field name="payment_terms" label="Payment Terms (Days)" type="number" placeholder="30" />
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : <><CheckIcon style={{ width: 16, height: 16 }} /> {vendor ? 'Update' : 'Create'} Vendor</>}
        </button>
      </div>
    </form>
  );
}

export default function VendorManagement() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorAPI.getAll({ page, search, ...(statusFilter && { status: statusFilter }) });
      setVendors(res.data.results || res.data.data || []);
      setTotal(res.data.count || 0);
    } catch { toast.error('Failed to load vendors'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const openCreate = () => { setEditVendor(null); setShowModal(true); };
  const openEdit = (v) => { setEditVendor(v); setShowModal(true); };
  const onSuccess = () => { setShowModal(false); fetchVendors(); };

  return (
    <Layout title="Vendor Management" subtitle={`${total} vendors registered`}>
      {/* Filters */}
      <div className="filters-bar">
        <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
          <MagnifyingGlassIcon style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
          <input
            placeholder="Search vendor name, GST, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="form-control" style={{ width: 160 }} value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
        <div style={{ marginLeft: 'auto' }}>
          <button id="create-vendor-btn" className="btn btn-primary" onClick={openCreate}>
            <PlusIcon style={{ width: 16, height: 16 }} /> Add Vendor
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
          ) : vendors.length === 0 ? (
            <div className="empty-state">
              <BuildingOfficeIcon className="empty-state-icon" />
              <p className="empty-state-title">No vendors found</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
                <PlusIcon style={{ width: 16, height: 16 }} /> Add First Vendor
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Vendor Name</th>
                  <th>Contact</th>
                  <th>GSTIN</th>
                  <th>Bank</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id}>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem', color: 'var(--primary)' }}>{v.vendor_code}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{v.vendor_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.company_name}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>{v.email}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.phone}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{v.gstin || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{v.bank_name || '—'}</td>
                    <td>{v.city}, {v.state}</td>
                    <td><StatusBadge status={v.status} /></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(v)}>
                        <PencilIcon style={{ width: 15, height: 15 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Vendor Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editVendor ? `Edit Vendor — ${editVendor.vendor_name}` : 'Add New Vendor'}
        size="lg"
      >
        <VendorForm vendor={editVendor} onSuccess={onSuccess} onCancel={() => setShowModal(false)} />
      </Modal>
    </Layout>
  );
}
