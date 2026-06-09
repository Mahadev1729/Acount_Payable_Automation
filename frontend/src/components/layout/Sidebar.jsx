/**
 * Sidebar Navigation Component
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HomeIcon, DocumentTextIcon, BuildingOfficeIcon,
  ShoppingCartIcon, ClipboardDocumentCheckIcon,
  CreditCardIcon, ChartBarIcon, Cog6ToothIcon,
  UserCircleIcon, ArrowRightOnRectangleIcon,
  DocumentArrowUpIcon, BellIcon
} from '@heroicons/react/24/outline';

const NAV_SECTIONS = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard',         path: '/dashboard',  icon: HomeIcon },
      { label: 'Invoice Upload',    path: '/invoices/upload', icon: DocumentArrowUpIcon },
      { label: 'Invoices',          path: '/invoices',   icon: DocumentTextIcon },
    ]
  },
  {
    title: 'Operations',
    items: [
      { label: 'Purchase Orders',   path: '/purchase-orders', icon: ShoppingCartIcon },
      { label: 'Approvals',         path: '/approvals',  icon: ClipboardDocumentCheckIcon },
      { label: 'Payments',          path: '/payments',   icon: CreditCardIcon },
    ]
  },
  {
    title: 'Management',
    items: [
      { label: 'Vendors',           path: '/vendors',    icon: BuildingOfficeIcon },
      { label: 'Reports',           path: '/reports',    icon: ChartBarIcon },
    ]
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile',           path: '/profile',    icon: UserCircleIcon },
      { label: 'Settings',          path: '/settings',   icon: Cog6ToothIcon },
    ]
  }
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : 'AP';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0
          }}>AP</div>
          <div>
            <div className="sidebar-logo-text">AP Automation</div>
            <div className="sidebar-logo-sub">Enterprise Suite</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="sidebar-section">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              >
                <item.icon className="sidebar-icon" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => navigate('/profile')}>
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">
              {user ? `${user.first_name} ${user.last_name}` : 'User'}
            </div>
            <div className="sidebar-user-role">
              {user?.role?.replace('_', ' ') || 'Role'}
            </div>
          </div>
        </div>
        <button
          className="sidebar-item"
          onClick={handleLogout}
          style={{ width: '100%', marginTop: 4, color: '#f87171' }}
        >
          <ArrowRightOnRectangleIcon className="sidebar-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
