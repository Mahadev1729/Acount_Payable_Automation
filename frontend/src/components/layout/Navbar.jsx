/**
 * Navbar Component - Top navigation bar with breadcrumbs and actions
 */
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

export default function Navbar({ title, subtitle }) {
  const { user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="navbar">
      <div>
        <h1 className="navbar-title">{title || 'Dashboard'}</h1>
        {subtitle && <p className="navbar-subtitle">{subtitle}</p>}
      </div>

      <div className="navbar-right">
        {/* Search */}
        {showSearch ? (
          <div className="search-bar" style={{ width: 240 }}>
            <MagnifyingGlassIcon style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
            <input
              placeholder="Search invoices, vendors..."
              autoFocus
              onBlur={() => setShowSearch(false)}
            />
          </div>
        ) : (
          <button className="navbar-btn" onClick={() => setShowSearch(true)}>
            <MagnifyingGlassIcon style={{ width: 18, height: 18 }} />
          </button>
        )}

        {/* Notifications */}
        <button className="navbar-btn">
          <BellIcon style={{ width: 18, height: 18 }} />
          <span className="notification-dot" />
        </button>

        {/* User Avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
        }}>
          {user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` : 'AP'}
        </div>
      </div>
    </header>
  );
}
