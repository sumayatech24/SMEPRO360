import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface QC { id: number; product_id: number; check_type: string; reference_type: string; result: string; inspector: string; check_date: string; remarks: string; }
interface Product { id: number; sku: string; name: string; }

const resultColor:Record<string,string> = {pass:'green',fail:'red',conditional_pass:'yellow',pending:'gray'};

export default function QualityPage() {
  const [checks, setChecks] = useState<QC[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ product_id:'', check_type:'incoming', reference_type:'purchase_order', reference_id:'', inspector:'QA Team', result:'pass', remarks:'', check_date:new Date().toISOString().split('T')[0] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, pRes] = await Promise.all([
        api.get('/quality/checks', {params:{limit:100}}),
        api.get('/inventory/products', {params:{limit:100}}),
      ]);
      setChecks(qRes.data.items || qRes.data || []);
      setProducts(pRes.data.items || pRes.data || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const prodName = (id:number) => products.find(p=>p.id===id)?.name || `PRD-${id}`;

  const submit = async () => {
    if (!form.product_id) return toast.error('Select a product');
    try {
      await api.post('/quality/checks', { ...form, product_id:Number(form.product_id), reference_id:Number(form.reference_id)||1 });
      toast.success('Quality check recorded!'); setModalOpen(false); load();
      setForm({ product_id:'', check_type:'incoming', reference_type:'purchase_order', reference_id:'', inspector:'QA Team', result:'pass', remarks:'', check_date:new Date().toISOString().split('T')[0] });
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const filtered = checks.filter(c => !filter || prodName(c.product_id).toLowerCase().includes(filter.toLowerCase()) || c.inspector?.toLowerCase().includes(filter.toLowerCase()));
  const passRate = checks.length ? Math.round(checks.filter(c=>c.result==='pass').length/checks.length*100) : 0;

  const columns = [
    { key:'product_id', title:'Product', render:(r:QC) => <span className="font-medium">{prodName(r.product_id)}</span> },
    { key:'check_type', title:'Type', render:(r:QC) => <span className="capitalize text-sm">{r.check_type?.replace('_',' ')}</span> },
    { key:'reference_type', title:'Reference', render:(r:QC) => <span className="text-xs text-slate-500">{r.reference_type?.replace('_',' ')}</span> },
    { key:'inspector', title:'Inspector', render:(r:QC) => r.inspector||'-' },
    { key:'check_date', title:'Date', render:(r:QC) => r.check_date?new Date(r.check_date).toLocaleDateString('en-IN'):'-' },
    { key:'result', title:'Result', render:(r:QC) => <Badge label={r.result?.replace('_',' ')} color={resultColor[r.result] as any} /> },
    { key:'remarks', title:'Remarks', render:(r:QC) => <span className="text-sm text-slate-500 max-w-xs truncate block">{r.remarks||'-'}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Quality Control</h1><p className="text-slate-500 text-sm mt-1">Incoming, in-process and outgoing quality checks</p></div>
        <button onClick={()=>setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ New Check</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total Checks', value:checks.length, color:'text-indigo-600' },
          { label:'Passed', value:checks.filter(c=>c.result==='pass').length, color:'text-green-600' },
          { label:'Failed', value:checks.filter(c=>c.result==='fail').length, color:'text-red-500' },
          { label:'Pass Rate', value:`${passRate}%`, color:passRate>=90?'text-green-600':passRate>=70?'text-yellow-600':'text-red-500' },
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} title="Quality Checks"
        onSearch={setFilter} searchPlaceholder="Search checks..."
        onAdd={()=>setModalOpen(true)} addLabel="New Check" />

      <Modal isOpen={modalOpen} onClose={()=>setModalOpen(false)} title="Record Quality Check" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Product *</label>
              <select value={form.product_id} onChange={e=>setForm(f=>({...f,product_id:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select Product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Check Date</label>
              <input type="date" value={form.check_date} onChange={e=>setForm(f=>({...f,check_date:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Check Type</label>
              <select value={form.check_type} onChange={e=>setForm(f=>({...f,check_type:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['incoming','in_process','outgoing'].map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Reference Type</label>
              <select value={form.reference_type} onChange={e=>setForm(f=>({...f,reference_type:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['purchase_order','work_order','sales_order','inventory'].map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Inspector</label>
              <input value={form.inspector} onChange={e=>setForm(f=>({...f,inspector:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Result</label>
              <select value={form.result} onChange={e=>setForm(f=>({...f,result:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['pass','fail','conditional_pass','pending'].map(r=><option key={r} value={r}>{r.replace('_',' ')}</option>)}
              </select></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <textarea value={form.remarks} onChange={e=>setForm(f=>({...f,remarks:e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={()=>setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Record Check</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
