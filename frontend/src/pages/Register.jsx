/**
 * Register Page - User Registration
 */
import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function Register() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { role: 'ap_executive' }
  });

  const password = watch('password');

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authAPI.register(data);
      toast.success('Registration successful! Please sign in.');
      navigate('/login');
    } catch (err) {
      const msg = err?.response?.data?.errors?.non_field_errors?.[0]
        || err?.response?.data?.message
        || 'Registration failed. Please check the form fields.';
      toast.error(msg);
      // For detailed field errors, we could iterate and setFormError, but a toast is ok for now.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)',
    }}>
      {/* Left Panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', padding: 40,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'rgba(37,99,235,0.1)', top: -100, left: -100,
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'rgba(124,58,237,0.1)', bottom: -50, right: -50,
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 400, width: '100%' }}>
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 900, fontSize: 22,
              margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
            }}>AP</div>
            <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              AP Automation
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: 6 }}>
              Enterprise Accounts Payable Suite
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div style={{
        width: 480, background: 'white', display: 'flex',
        flexDirection: 'column', justifyContent: 'center', padding: '48px 40px',
        overflowY: 'auto'
      }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            Create an account
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Join the AP Automation platform
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">First Name <span>*</span></label>
              <input
                type="text"
                className={`form-control ${errors.first_name ? 'error' : ''}`}
                placeholder="John"
                {...register('first_name', { required: 'Required' })}
              />
              {errors.first_name && <p className="form-error">{errors.first_name.message}</p>}
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Last Name <span>*</span></label>
              <input
                type="text"
                className={`form-control ${errors.last_name ? 'error' : ''}`}
                placeholder="Doe"
                {...register('last_name', { required: 'Required' })}
              />
              {errors.last_name && <p className="form-error">{errors.last_name.message}</p>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address <span>*</span></label>
            <input
              type="email"
              className={`form-control ${errors.email ? 'error' : ''}`}
              placeholder="john@company.com"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
              })}
            />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Role <span>*</span></label>
              <select className="form-control" {...register('role')}>
                <option value="admin">Admin</option>
                <option value="ap_executive">AP Executive</option>
                <option value="manager">Manager</option>
                <option value="finance">Finance Team</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Department</label>
              <input
                type="text"
                className="form-control"
                placeholder="Finance"
                {...register('department')}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password <span>*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                className={`form-control ${errors.password ? 'error' : ''}`}
                placeholder="••••••••"
                style={{ paddingRight: 44 }}
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Minimum 8 characters' }
                })}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none',
                }}
              >
                {showPass
                  ? <EyeSlashIcon style={{ width: 18, height: 18 }} />
                  : <EyeIcon style={{ width: 18, height: 18 }} />
                }
              </button>
            </div>
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password <span>*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass2 ? 'text' : 'password'}
                className={`form-control ${errors.password2 ? 'error' : ''}`}
                placeholder="••••••••"
                style={{ paddingRight: 44 }}
                {...register('password2', { 
                  required: 'Please confirm password',
                  validate: value => value === password || 'Passwords do not match'
                })}
              />
              <button
                type="button"
                onClick={() => setShowPass2(!showPass2)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'none', border: 'none',
                }}
              >
                {showPass2
                  ? <EyeSlashIcon style={{ width: 18, height: 18 }} />
                  : <EyeIcon style={{ width: 18, height: 18 }} />
                }
              </button>
            </div>
            {errors.password2 && <p className="form-error">{errors.password2.message}</p>}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center', padding: '12px', marginTop: 8, fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? (
              <><div className="spinner" style={{ borderTopColor: 'white' }} /> Creating account...</>
            ) : 'Sign Up'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 24 }}>
          Already have an account? <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 24 }}>
          AP Automation System v1.0 — Enterprise Edition
        </p>
      </div>
    </div>
  );
}
