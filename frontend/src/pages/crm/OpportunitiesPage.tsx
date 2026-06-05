import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Opp { id: number; opportunity_number: string; name: string; customer_id: number; stage: string; probability: number; expected_revenue: number; description: string; created_at: string; }
interface Customer { id: number; company_name: string; }

const stageColor: Record<string,string> = { prospecting:'gray', qualification:'blue', proposal:'indigo', negotiation:'yellow', closed_won:'green', closed_lost:'red' };

export default function OpportunitiesPage() {
  const [items, setItems] = useState<Opp[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ name:'', customer_id:'', stage:'prospecting', probability:'10', expected_revenue:'', description:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, c] = await Promise.all([api.get('/crm/opportunities', {params:{limit:100}}), api.get('/crm/customers', {params:{limit:100}})]);
      setItems(r.data.items || r.data); setCustomers(c.data.items || c.data);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.name || !form.customer_id) return toast.error('Fill required fields');
    try {
      await api.post('/crm/opportunities', { name:form.name, customer_id:Number(form.customer_id), stage:form.stage, probability:Number(form.probability), expected_revenue:Number(form.expected_revenue)||0, description:form.description });
      toast.success('Opportunity created!'); setModalOpen(false); load();
      setForm({ name:'', customer_id:'', stage:'prospecting', probability:'10', expected_revenue:'', description:'' });
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const custName = (id:number) => customers.find(c=>c.id===id)?.company_name || `CUS-${id}`;
  const filtered = items.filter(i => !filter || i.name?.toLowerCase().includes(filter.toLowerCase()) || custName(i.customer_id).toLowerCase().includes(filter.toLowerCase()));
  const totalValue = items.reduce((s,i) => s+(i.expected_revenue||0),0);
  const wonValue = items.filter(i=>i.stage==='closed_won').reduce((s,i)=>s+(i.expected_revenue||0),0);

  const columns = [
    { key:'name', title:'Opportunity', render:(r:Opp) => <span className="font-medium text-slate-800">{r.name}</span> },
    { key:'customer_id', title:'Customer', render:(r:Opp) => custName(r.customer_id) },
    { key:'stage', title:'Stage', render:(r:Opp) => <Badge label={r.stage?.replace('_',' ')} color={stageColor[r.stage] as any} /> },
    { key:'probability', title:'Probability', render:(r:Opp) => <div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-slate-100 rounded-full"><div className="h-1.5 bg-indigo-500 rounded-full" style={{width:`${r.probability||0}%`}} /></div><span className="text-xs text-slate-600">{r.probability||0}%</span></div> },
    { key:'expected_revenue', title:'Expected Value', render:(r:Opp) => <span className="font-semibold text-green-600">₹{(r.expected_revenue||0).toLocaleString('en-IN')}</span> },
    { key:'created_at', title:'Created', render:(r:Opp) => r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '-' },
  ];

  const STAGES = ['prospecting','qualification','proposal','negotiation','closed_won','closed_lost'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Opportunities</h1><p className="text-slate-500 text-sm mt-1">Track your sales pipeline</p></div>
        <button onClick={()=>setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ New Opportunity</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STAGES.map(stage => (
          <div key={stage} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500 capitalize mb-1">{stage.replace('_',' ')}</div>
            <div className="text-xl font-bold text-slate-800">{items.filter(i=>i.stage===stage).length}</div>
            <div className="text-xs text-green-600 mt-1">₹{(items.filter(i=>i.stage===stage).reduce((s,i)=>s+(i.expected_revenue||0),0)/100000).toFixed(1)}L</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Total Pipeline', value:`₹${(totalValue/100000).toFixed(1)}L`, color:'text-indigo-600' },
          { label:'Won Value', value:`₹${(wonValue/100000).toFixed(1)}L`, color:'text-green-600' },
          { label:'Win Rate', value:`${items.length ? Math.round(items.filter(i=>i.stage==='closed_won').length/items.length*100) : 0}%`, color:'text-blue-600' },
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} title="All Opportunities"
        onSearch={setFilter} searchPlaceholder="Search opportunities..."
        onAdd={()=>setModalOpen(true)} addLabel="New Opportunity" />

      <Modal isOpen={modalOpen} onClose={()=>setModalOpen(false)} title="New Opportunity" size="lg">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Opportunity Name *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. ERP Implementation for TCS"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Customer *</label>
              <select value={form.customer_id} onChange={e=>setForm(f=>({...f,customer_id:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select Customer</option>
                {customers.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Stage</label>
              <select value={form.stage} onChange={e=>setForm(f=>({...f,stage:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {STAGES.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Expected Revenue (₹)</label>
              <input type="number" value={form.expected_revenue} onChange={e=>setForm(f=>({...f,expected_revenue:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Probability (%)</label>
              <input type="number" min="0" max="100" value={form.probability} onChange={e=>setForm(f=>({...f,probability:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={()=>setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create Opportunity</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
