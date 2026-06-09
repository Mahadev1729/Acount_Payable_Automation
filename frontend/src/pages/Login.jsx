/**
 * Login Page - JWT Authentication
 */
import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: 'admin@apautomation.com', password: 'Admin@123' }
  });

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.errors?.non_field_errors?.[0]
        || err?.response?.data?.message
        || 'Login failed. Check your credentials.';
      toast.error(msg);
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

          {/* Features list */}
          {[
            '🔍 AI-Powered OCR Invoice Extraction',
            '✅ Multi-Stage Approval Workflows',
            '🔗 2-Way & 3-Way PO Matching',
            '📊 Real-Time Analytics & Reports',
          ].map((f) => (
            <div key={f} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', marginBottom: 8,
              background: 'rgba(255,255,255,0.05)', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div style={{
        width: 440, background: 'white', display: 'flex',
        flexDirection: 'column', justifyContent: 'center', padding: '48px 40px',
      }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            Sign in
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Access your AP automation dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Email Address <span>*</span></label>
            <input
              id="email"
              type="email"
              className={`form-control ${errors.email ? 'error' : ''}`}
              placeholder="admin@company.com"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
              })}
            />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Password <span>*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className={`form-control ${errors.password ? 'error' : ''}`}
                placeholder="••••••••"
                style={{ paddingRight: 44 }}
                {...register('password', { required: 'Password is required' })}
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

          <button
            type="submit"
            id="login-btn"
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center', padding: '12px', marginTop: 8, fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? (
              <><div className="spinner" style={{ borderTopColor: 'white' }} /> Signing in...</>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Default credentials hint */}
        <div style={{
          marginTop: 24, padding: '12px 16px',
          background: '#f0f9ff', borderRadius: 10,
          border: '1px solid #bae6fd', fontSize: '0.78rem', color: '#0369a1'
        }}>
          <strong>Default credentials:</strong><br />
          Email: admin@apautomation.com<br />
          Password: Admin@123
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 24 }}>
          Don't have an account? <Link to="/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Sign up</Link>
        </p>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 24 }}>
          AP Automation System v1.0 — Enterprise Edition
        </p>
      </div>
    </div>
  );
}
