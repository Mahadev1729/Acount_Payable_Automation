/**
 * Profile Page - View and edit current user profile
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import toast from 'react-hot-toast';
import { UserCircleIcon, KeyIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const { register: regProfile, handleSubmit: handleProfile } = useForm({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      department: user?.department || '',
      phone: user?.phone || '',
    }
  });

  const { register: regPass, handleSubmit: handlePass, reset: resetPass, formState: { errors: passErrors } } = useForm();

  const onProfileSubmit = async (data) => {
    setSavingProfile(true);
    try {
      const res = await authAPI.updateProfile(data);
      updateUser({ ...user, ...res.data.data });
      toast.success('Profile updated successfully!');
    } catch { toast.error('Failed to update profile'); }
    finally { setSavingProfile(false); }
  };

  const onPassSubmit = async (data) => {
    setSavingPass(true);
    try {
      await authAPI.changePassword(data);
      toast.success('Password changed!');
      resetPass();
    } catch (err) {
      const msg = err?.response?.data?.errors?.old_password?.[0] || 'Password change failed';
      toast.error(msg);
    } finally { setSavingPass(false); }
  };

  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : 'AP';
  const roleBadgeColor = {
    admin: 'badge-red', ap_executive: 'badge-blue', manager: 'badge-purple',
    finance: 'badge-green', vendor: 'badge-gray'
  }[user?.role] || 'badge-gray';

  return (
    <Layout title="My Profile" subtitle="Manage your account information">
      <div style={{ maxWidth: 700 }}>
        {/* Profile Header */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '1.5rem', fontWeight: 800, flexShrink: 0
            }}>{initials}</div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {user?.first_name} {user?.last_name}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 2 }}>{user?.email}</p>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <span className={`badge ${roleBadgeColor}`}>{user?.role?.replace('_', ' ')}</span>
                {user?.department && <span className="badge badge-gray">{user.department}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title"><UserCircleIcon style={{ width: 18, height: 18, display: 'inline', marginRight: 6 }} />Profile Information</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleProfile(onProfileSubmit)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div className="form-group">
                  <label className="form-label">First Name <span>*</span></label>
                  <input className="form-control" {...regProfile('first_name', { required: true })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-control" {...regProfile('last_name')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-control" placeholder="Finance" {...regProfile('department')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" placeholder="+91 9876543210" {...regProfile('phone')} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : <><CheckIcon style={{ width: 16, height: 16 }} /> Save Profile</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Change Password */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><KeyIcon style={{ width: 18, height: 18, display: 'inline', marginRight: 6 }} />Change Password</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handlePass(onPassSubmit)}>
              <div className="form-group">
                <label className="form-label">Current Password <span>*</span></label>
                <input type="password" className="form-control" {...regPass('old_password', { required: true })} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password <span>*</span></label>
                <input type="password" className="form-control"
                  {...regPass('new_password', { required: true, minLength: { value: 8, message: 'Min 8 characters' } })} />
                {passErrors.new_password && <p className="form-error">{passErrors.new_password.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password <span>*</span></label>
                <input type="password" className="form-control" {...regPass('new_password2', { required: true })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={savingPass}>
                  {savingPass ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
