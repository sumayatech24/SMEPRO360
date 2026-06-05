import React, { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../api/client';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const Dashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/dashboard/'), api.get('/dashboard/kpis')]).then(([d, k]) => {
      setData(d.data); setKpis(k.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const financials = data?.financials || {};
  const leadStatus = data?.lead_by_status || {};
  const revenueTrend = data?.revenue_trend || [];
  const recentOrders = data?.recent_orders || [];

  const pieData = Object.entries(leadStatus).map(([k, v]) => ({ name: k, value: v as number }));

  const formatCurrency = (val: number) => `₹${(val / 100000).toFixed(1)}L`;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm">Welcome to SMEPRO360 Enterprise ERP</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <button className="px-4 py-2 gradient-bg text-white rounded-xl text-sm font-medium">+ Quick Add</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <StatCard title="Total Leads" value={summary.total_leads || 0} change={`${kpis?.lead_growth || 0}%`}
          changeType={kpis?.lead_growth >= 0 ? 'up' : 'down'} icon="🎯" color="indigo"
          subtitle={`${summary.new_leads_this_month || 0} this month`} />
        <StatCard title="Customers" value={summary.total_customers || 0} icon="🤝" color="cyan" />
        <StatCard title="Revenue (Month)" value={formatCurrency(financials.monthly_revenue || 0)}
          change={`${kpis?.revenue_growth || 0}%`} changeType={kpis?.revenue_growth >= 0 ? 'up' : 'down'}
          icon="💰" color="green" />
        <StatCard title="Pipeline Value" value={formatCurrency(financials.pipeline_value || 0)} icon="📈" color="purple" />
        <StatCard title="Employees" value={summary.total_employees || 0} icon="👥" color="blue" />
        <StatCard title="Active Projects" value={summary.active_projects || 0} icon="🚀" color="orange" />
        <StatCard title="Open Tickets" value={summary.open_tickets || 0} icon="🎫" color="red" />
        <StatCard title="Outstanding" value={formatCurrency(financials.outstanding_invoices || 0)} icon="📄" color="pink" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Revenue Trend</h3>
              <p className="text-sm text-slate-500">Last 6 months</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} />
              <YAxis tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} />
              <Tooltip formatter={(v: any) => [`₹${(v/100000).toFixed(2)}L`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Status Pie */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-base font-semibold text-slate-800 mb-2">Lead Pipeline</h3>
          <p className="text-sm text-slate-500 mb-4">By status breakdown</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map((entry, i) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600 capitalize">{entry.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Recent Sales Orders</h3>
            <p className="text-sm text-slate-500">Latest transactions</p>
          </div>
          <a href="/sales/orders" className="text-sm text-indigo-600 hover:underline">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {['Order #', 'Customer', 'Status', 'Total', 'Date'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No orders yet</td></tr>
              ) : recentOrders.map((order: any) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-sm font-medium text-indigo-600">{order.order_number}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">Customer #{order.customer_id}</td>
                  <td className="px-5 py-3"><Badge label={order.status} /></td>
                  <td className="px-5 py-3 text-sm font-semibold text-slate-800">₹{order.total_amount?.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-sm text-slate-500">{order.created_at?.substring(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: '🎯', title: 'Add Lead', desc: 'Capture new prospect', link: '/leads' },
          { icon: '🛒', title: 'New Order', desc: 'Create sales order', link: '/sales/orders' },
          { icon: '👤', title: 'Add Employee', desc: 'Onboard team member', link: '/hr/employees' },
          { icon: '🎫', title: 'Raise Ticket', desc: 'Support request', link: '/helpdesk/tickets' },
        ].map(item => (
          <a key={item.title} href={item.link}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all group card-hover">
            <div className="text-3xl mb-3">{item.icon}</div>
            <div className="font-semibold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{item.title}</div>
            <div className="text-xs text-slate-500 mt-1">{item.desc}</div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
