/**
 * Dashboard Page - KPI Cards + Charts
 */
import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import {
  DocumentTextIcon, ClockIcon, CheckCircleIcon,
  XCircleIcon, CreditCardIcon, BuildingOfficeIcon, CpuChipIcon, CurrencyRupeeIcon
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import { invoiceAPI, vendorAPI, paymentAPI, approvalAPI } from '../api';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2'];

function KPICard({ icon: Icon, value, label, color, trend }) {
  return (
    <div className={`kpi-card ${color}`}>
      <div className={`kpi-icon ${color}`}>
        <Icon style={{ width: 22, height: 22 }} />
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {trend && (
        <div className="kpi-trend" style={{ color: trend > 0 ? 'var(--success)' : 'var(--danger)' }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [vendorStats, setVendorStats] = useState(null);
  const [paymentStats, setPaymentStats] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [invRes, venRes, payRes, appRes] = await Promise.allSettled([
          invoiceAPI.getStats(),
          vendorAPI.getStats(),
          paymentAPI.getStats(),
          approvalAPI.getPending(),
        ]);
        if (invRes.status === 'fulfilled') setStats(invRes.value.data.data);
        if (venRes.status === 'fulfilled') setVendorStats(venRes.value.data.data);
        if (payRes.status === 'fulfilled') setPaymentStats(payRes.value.data.data);
        if (appRes.status === 'fulfilled') setPendingCount(appRes.value.data.count || 0);
      } catch (e) {
        console.error('Dashboard fetch error', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Sample data for charts when no real data
  const monthlyData = stats?.monthly_trend || [
    { month: 'Jan', count: 45 }, { month: 'Feb', count: 62 }, { month: 'Mar', count: 58 },
    { month: 'Apr', count: 71 }, { month: 'May', count: 84 }, { month: 'Jun', count: 93 },
  ];

  const statusData = stats?.status_breakdown?.length
    ? stats.status_breakdown.map(s => ({ name: s.status.replace('_', ' '), value: s.count }))
    : [
        { name: 'Pending', value: 24 }, { name: 'Approved', value: 45 },
        { name: 'Paid', value: 38 }, { name: 'Rejected', value: 7 },
      ];

  const paymentStatusData = paymentStats?.status_breakdown?.length
    ? paymentStats.status_breakdown.map(s => ({ name: s.status, value: s.count }))
    : [
        { name: 'Paid', value: 62 }, { name: 'Pending', value: 18 },
        { name: 'Failed', value: 5 }, { name: 'Processing', value: 9 },
      ];

  return (
    <Layout title="Dashboard" subtitle="AP Automation System Overview">
      {loading ? (
        <div className="loading-overlay">
          <div className="spinner spinner-lg" />
          <span>Loading dashboard...</span>
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="kpi-grid">
            <KPICard icon={DocumentTextIcon} value={stats?.total || 0}
              label="Total Invoices" color="blue" trend={12} />
            <KPICard icon={ClockIcon} value={stats?.pending || pendingCount || 0}
              label="Pending Approvals" color="amber" />
            <KPICard icon={CheckCircleIcon} value={stats?.approved || 0}
              label="Approved Invoices" color="green" trend={8} />
            <KPICard icon={XCircleIcon} value={stats?.rejected || 0}
              label="Rejected" color="red" />
            <KPICard icon={CreditCardIcon} value={stats?.paid || 0}
              label="Paid Invoices" color="purple" trend={15} />
            <KPICard icon={BuildingOfficeIcon} value={vendorStats?.total || 0}
              label="Total Vendors" color="cyan" />
            <KPICard icon={CpuChipIcon}
              value={`${stats?.ocr_accuracy || 0}%`}
              label="OCR Accuracy" color="slate" />
            <KPICard icon={CurrencyRupeeIcon}
              value={`₹${((stats?.total_amount || 0) / 100000).toFixed(1)}L`}
              label="Total Invoice Value" color="blue" />
          </div>

          {/* Charts Grid */}
          <div className="charts-grid">
            {/* Monthly Invoice Trend */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📈 Monthly Invoice Trend</h3>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5} fill="url(#blueGrad)" name="Invoices" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Invoice Status Distribution */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">🥧 Invoice Status Distribution</h3>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      dataKey="value" paddingAngle={3}>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '0.78rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Status */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">💳 Payment Status</h3>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={paymentStatusData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                      {paymentStatusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary Info */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📋 Quick Summary</h3>
              </div>
              <div className="card-body">
                {[
                  { label: 'Pending Amount', value: `₹${((stats?.pending_amount||0)/100000).toFixed(2)}L`, color: 'var(--warning)' },
                  { label: 'Total Paid', value: `₹${((paymentStats?.total_paid||0)/100000).toFixed(2)}L`, color: 'var(--success)' },
                  { label: 'Active Vendors', value: vendorStats?.active || 0, color: 'var(--primary)' },
                  { label: 'This Month', value: stats?.this_month || 0, color: 'var(--accent)' },
                  { label: 'Pending Approvals', value: pendingCount, color: 'var(--danger)' },
                  { label: 'Failed Payments', value: paymentStats?.failed_count || 0, color: 'var(--danger)' },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid var(--border-light)'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ fontWeight: 700, color: item.color, fontSize: '0.9rem' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
