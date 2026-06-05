import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api, { downloadExcel } from '../api/client';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];

export default function ReportsPage() {
  const [tab, setTab] = useState<'sales'|'hr'|'finance'|'leads'>('sales');
  const [salesData, setSalesData] = useState<any>(null);
  const [hrData, setHrData] = useState<any>(null);
  const [finData, setFinData] = useState<any>(null);
  const [leadsData, setLeadsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, eRes, aRes, lRes] = await Promise.all([
        api.get('/sales/orders/stats'),
        api.get('/hr/employees', {params:{limit:100}}),
        api.get('/finance/reports/pl'),
        api.get('/leads/stats'),
      ]);
      setSalesData(sRes.data);
      setHrData(eRes.data);
      setFinData(aRes.data);
      setLeadsData(lRes.data);
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const StatCard = ({label, value, color='text-slate-800'}:{label:string,value:any,color?:string}) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );

  const SalesReport = () => {
    const byStatus = salesData?.by_status || {};
    const chartData = Object.entries(byStatus).map(([name, count]) => ({ name, count }));
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={()=>downloadExcel('/sales/orders/export','sales_orders.xlsx')} className="text-sm px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50">📥 Export Sales</button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Orders" value={salesData?.total||0} />
          <StatCard label="Total Revenue" value={`₹${((salesData?.total_revenue||0)/100000).toFixed(1)}L`} color="text-green-600" />
          <StatCard label="Confirmed" value={salesData?.by_status?.confirmed||0} color="text-blue-600" />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Orders by Status</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{fontSize:12}} />
              <YAxis tick={{fontSize:12}} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const LeadsReport = () => {
    const byStatus = leadsData?.by_status || {};
    const bySource = leadsData?.by_source || {};
    const statusData = Object.entries(byStatus).map(([name, value]) => ({name, value}));
    const sourceData = Object.entries(bySource).map(([name, value]) => ({name, value}));
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={()=>downloadExcel('/leads/export','leads.xlsx')} className="text-sm px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50">📥 Export Leads</button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Leads" value={leadsData?.total||0} />
          <StatCard label="Won" value={byStatus['won']||0} color="text-green-600" />
          <StatCard label="Win Rate" value={`${leadsData?.total?Math.round(((byStatus['won']||0)/leadsData.total)*100):0}%`} />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Leads by Status</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,value}:any)=>`${name}: ${value}`}>
                  {statusData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Leads by Source</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sourceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{fontSize:11}} />
                <YAxis dataKey="name" type="category" tick={{fontSize:11}} width={90} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const FinanceReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Revenue" value={`₹${((finData?.revenue||0)/100000).toFixed(1)}L`} color="text-green-600" />
        <StatCard label="Expenses" value={`₹${((finData?.expense||0)/100000).toFixed(1)}L`} color="text-red-500" />
        <StatCard label="Net Profit" value={`₹${((finData?.net_profit||0)/100000).toFixed(1)}L`} color={(finData?.net_profit||0)>=0?'text-green-600':'text-red-500'} />
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4">P&L Summary</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={[{name:'Revenue',amount:finData?.revenue||0},{name:'Expenses',amount:finData?.expense||0},{name:'Net Profit',amount:finData?.net_profit||0}]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{fontSize:12}} />
            <YAxis tick={{fontSize:11}} tickFormatter={(v:any)=>`₹${(v/100000).toFixed(0)}L`} />
            <Tooltip formatter={(v:any)=>`₹${Number(v).toLocaleString('en-IN')}`} />
            <Bar dataKey="amount" radius={[6,6,0,0]}>
              {['#10b981','#ef4444','#6366f1'].map((fill,i)=><Cell key={i} fill={fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const HRReport = () => {
    const employees = hrData?.items || [];
    const total = hrData?.total || 0;
    const salaryData = employees.slice(0,8).map((e:any)=>({
      name:`${e.first_name} ${(e.last_name||'').split(' ')[0]}`, salary:e.basic_salary
    }));
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={()=>downloadExcel('/hr/employees/export','employees.xlsx')} className="text-sm px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50">📥 Export HR</button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Employees" value={total} />
          <StatCard label="Active" value={employees.filter((e:any)=>e.status==='active').length} color="text-green-600" />
          <StatCard label="Avg Salary" value={`₹${employees.length?Math.round(employees.reduce((s:number,e:any)=>s+(e.basic_salary||0),0)/employees.length).toLocaleString('en-IN'):0}`} />
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-800 mb-4">Basic Salary by Employee</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salaryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{fontSize:11}} />
              <YAxis tick={{fontSize:11}} tickFormatter={(v:any)=>`₹${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v:any)=>`₹${Number(v).toLocaleString('en-IN')}`} />
              <Bar dataKey="salary" fill="#ec4899" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1><p className="text-slate-500 text-sm mt-1">Business intelligence across all modules</p></div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([['sales','📊 Sales'],['leads','🎯 Leads'],['finance','💰 Finance'],['hr','👥 HR']] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t as any)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab===t?'bg-white text-indigo-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i=><div key={i} className="bg-white rounded-2xl h-28 animate-pulse shadow-sm" />)}</div>
      ) : (
        <>
          {tab==='sales' && <SalesReport />}
          {tab==='leads' && <LeadsReport />}
          {tab==='finance' && <FinanceReport />}
          {tab==='hr' && <HRReport />}
        </>
      )}
    </div>
  );
}
