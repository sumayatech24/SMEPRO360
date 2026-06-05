import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface TaxType { id: number; name: string; code: string; tax_category: string; description: string; slab_count: number; }
interface TaxSlab { id: number; name: string; rate: number; tax_type_id: number; cgst_rate: number; sgst_rate: number; igst_rate: number; cess_rate: number; is_inclusive: boolean; tax_type_name: string; }
interface HSNCode { id: number; code: string; description: string; code_type: string; chapter: string; default_slab_id: number; default_rate: number; }

const catColor: Record<string,string> = { indirect:'blue', direct:'red', withholding:'yellow' };

export default function TaxPage() {
  const [types, setTypes] = useState<TaxType[]>([]);
  const [slabs, setSlabs] = useState<TaxSlab[]>([]);
  const [hsn, setHsn] = useState<HSNCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'types'|'slabs'|'hsn'>('types');
  const [typeModal, setTypeModal] = useState(false);
  const [slabModal, setSlabModal] = useState(false);
  const [hsnModal, setHsnModal] = useState(false);
  const [hsnSearch, setHsnSearch] = useState('');
  const [calcModal, setCalcModal] = useState(false);
  const [calcForm, setCalcForm] = useState({ amount:'', slab_id:'', is_interstate:false });
  const [calcResult, setCalcResult] = useState<any>(null);
  const [typeForm, setTypeForm] = useState({ name:'', code:'', tax_category:'indirect', description:'' });
  const [slabForm, setSlabForm] = useState({ tax_type_id:'', name:'', rate:'', cgst_rate:'', sgst_rate:'', igst_rate:'', cess_rate:'0', is_inclusive:false });
  const [hsnForm, setHsnForm] = useState({ code:'', description:'', code_type:'HSN', default_slab_id:'', chapter:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, sRes, hRes] = await Promise.all([
        api.get('/tax/types'), api.get('/tax/slabs'), api.get('/tax/hsn'),
      ]);
      setTypes(tRes.data); setSlabs(sRes.data); setHsn(hRes.data);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const createType = async () => {
    if (!typeForm.name || !typeForm.code) return toast.error('Fill required fields');
    try {
      await api.post('/tax/types', typeForm);
      toast.success('Tax type created!'); setTypeModal(false); load();
      setTypeForm({ name:'', code:'', tax_category:'indirect', description:'' });
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const createSlab = async () => {
    if (!slabForm.tax_type_id || !slabForm.name || !slabForm.rate) return toast.error('Fill required fields');
    try {
      await api.post('/tax/slabs', {
        tax_type_id:Number(slabForm.tax_type_id), name:slabForm.name, rate:Number(slabForm.rate),
        cgst_rate:Number(slabForm.cgst_rate||0), sgst_rate:Number(slabForm.sgst_rate||0),
        igst_rate:Number(slabForm.igst_rate||0), cess_rate:Number(slabForm.cess_rate||0),
        is_inclusive:slabForm.is_inclusive,
      });
      toast.success('Tax slab created!'); setSlabModal(false); load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const createHSN = async () => {
    if (!hsnForm.code || !hsnForm.description) return toast.error('Fill required fields');
    try {
      await api.post('/tax/hsn', { ...hsnForm, default_slab_id: hsnForm.default_slab_id ? Number(hsnForm.default_slab_id) : undefined });
      toast.success('HSN/SAC code added!'); setHsnModal(false); load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const calculate = async () => {
    if (!calcForm.amount) return toast.error('Enter amount');
    try {
      const res = await api.post('/tax/calculate', {
        amount: Number(calcForm.amount),
        slab_id: calcForm.slab_id ? Number(calcForm.slab_id) : undefined,
        is_interstate: calcForm.is_interstate,
      });
      setCalcResult(res.data);
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const filteredHSN = hsn.filter(h => !hsnSearch || h.code.includes(hsnSearch) || h.description.toLowerCase().includes(hsnSearch.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Tax Module</h1>
          <p className="text-slate-500 text-sm mt-1">Manage tax types, slabs, HSN/SAC codes</p></div>
        <div className="flex gap-2">
          <button onClick={()=>setCalcModal(true)} className="px-4 py-2.5 border border-indigo-200 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50">🧮 Tax Calculator</button>
          {tab==='types' && <button onClick={()=>setTypeModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Tax Type</button>}
          {tab==='slabs' && <button onClick={()=>setSlabModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Tax Slab</button>}
          {tab==='hsn' && <button onClick={()=>setHsnModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ HSN/SAC Code</button>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{label:'Tax Types',value:types.length,icon:'📋'},{label:'Tax Slabs',value:slabs.length,icon:'📊'},{label:'HSN/SAC Codes',value:hsn.length,icon:'🏷️'}].map(s=>(
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
            <span className="text-3xl">{s.icon}</span>
            <div><div className="text-sm text-slate-500">{s.label}</div><div className="text-2xl font-bold text-slate-800">{s.value}</div></div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([['types','📋 Tax Types'],['slabs','📊 Tax Slabs'],['hsn','🏷️ HSN / SAC']] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab===t?'bg-white text-indigo-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab==='types' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {types.map(t=>(
            <div key={t.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-bold text-slate-800 text-lg">{t.name}</span>
                  <div className="font-mono text-xs text-slate-400 mt-0.5">{t.code}</div>
                </div>
                <Badge label={t.tax_category} color={catColor[t.tax_category] as any || 'gray'} />
              </div>
              <p className="text-sm text-slate-500 mb-3">{t.description||'—'}</p>
              <div className="text-xs text-indigo-600 font-medium">{t.slab_count} slabs configured</div>
            </div>
          ))}
        </div>
      )}

      {tab==='slabs' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{['Slab Name','Tax Type','Total Rate','CGST','SGST','IGST','CESS','Inclusive'].map(h=>(
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {slabs.map(s=>(
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3"><Badge label={s.tax_type_name||'—'} color="blue" /></td>
                  <td className="px-4 py-3 font-bold text-indigo-600">{s.rate}%</td>
                  <td className="px-4 py-3 text-slate-600">{s.cgst_rate||0}%</td>
                  <td className="px-4 py-3 text-slate-600">{s.sgst_rate||0}%</td>
                  <td className="px-4 py-3 text-slate-600">{s.igst_rate||0}%</td>
                  <td className="px-4 py-3 text-slate-600">{s.cess_rate||0}%</td>
                  <td className="px-4 py-3"><Badge label={s.is_inclusive?'Yes':'No'} color={s.is_inclusive?'green':'gray'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab==='hsn' && (
        <div className="space-y-3">
          <input value={hsnSearch} onChange={e=>setHsnSearch(e.target.value)} placeholder="Search HSN/SAC code or description..."
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['Code','Type','Chapter','Description','Default GST'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredHSN.map(h=>(
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{h.code}</td>
                    <td className="px-4 py-3"><Badge label={h.code_type} color={h.code_type==='SAC'?'purple':'blue'} /></td>
                    <td className="px-4 py-3 text-slate-500">{h.chapter||'—'}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs">{h.description}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{h.default_rate!=null?`${h.default_rate}%`:'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tax Calculator Modal */}
      <Modal isOpen={calcModal} onClose={()=>{setCalcModal(false);setCalcResult(null);}} title="GST Tax Calculator" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Base Amount (₹)</label>
            <input type="number" value={calcForm.amount} onChange={e=>setCalcForm(f=>({...f,amount:e.target.value}))} placeholder="Enter amount"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Tax Slab</label>
            <select value={calcForm.slab_id} onChange={e=>setCalcForm(f=>({...f,slab_id:e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select slab</option>
              {slabs.map(s=><option key={s.id} value={s.id}>{s.name} — {s.rate}%</option>)}
            </select></div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={calcForm.is_interstate} onChange={e=>setCalcForm(f=>({...f,is_interstate:e.target.checked}))} className="w-4 h-4 rounded text-indigo-600" />
            <span className="text-sm text-slate-700">Inter-state supply (apply IGST instead of CGST+SGST)</span>
          </label>
          <button onClick={calculate} className="w-full gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Calculate Tax</button>

          {calcResult && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="text-sm font-semibold text-slate-700 mb-3">Tax Breakdown</div>
              {[
                {label:'Base Amount', value:`₹${Number(calcResult.subtotal).toLocaleString('en-IN')}`, bold:false},
                {label:'CGST', value:`₹${Number(calcResult.cgst||0).toLocaleString('en-IN')}`, bold:false},
                {label:'SGST', value:`₹${Number(calcResult.sgst||0).toLocaleString('en-IN')}`, bold:false},
                {label:'IGST', value:`₹${Number(calcResult.igst||0).toLocaleString('en-IN')}`, bold:false},
                {label:'CESS', value:`₹${Number(calcResult.cess||0).toLocaleString('en-IN')}`, bold:false},
                {label:'Total Tax', value:`₹${Number(calcResult.total_tax).toLocaleString('en-IN')}`, bold:true},
                {label:'Grand Total', value:`₹${Number(calcResult.total).toLocaleString('en-IN')}`, bold:true},
              ].map(row=>(
                <div key={row.label} className={`flex justify-between text-sm ${row.bold?'font-bold text-slate-800 border-t border-slate-200 pt-2 mt-1':''}`}>
                  <span className={row.bold?'':'text-slate-500'}>{row.label}</span>
                  <span className={row.bold?'text-indigo-600':''}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Create Tax Type */}
      <Modal isOpen={typeModal} onClose={()=>setTypeModal(false)} title="Add Tax Type" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input value={typeForm.name} onChange={e=>setTypeForm(f=>({...f,name:e.target.value}))} placeholder="e.g. GST"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
              <input value={typeForm.code} onChange={e=>setTypeForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="e.g. GST"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select value={typeForm.tax_category} onChange={e=>setTypeForm(f=>({...f,tax_category:e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {['indirect','direct','withholding'].map(c=><option key={c} value={c}>{c}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input value={typeForm.description} onChange={e=>setTypeForm(f=>({...f,description:e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={()=>setTypeModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={createType} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create</button>
          </div>
        </div>
      </Modal>

      {/* Create Tax Slab */}
      <Modal isOpen={slabModal} onClose={()=>setSlabModal(false)} title="Add Tax Slab" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Tax Type *</label>
              <select value={slabForm.tax_type_id} onChange={e=>setSlabForm(f=>({...f,tax_type_id:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select</option>{types.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Slab Name *</label>
              <input value={slabForm.name} onChange={e=>setSlabForm(f=>({...f,name:e.target.value}))} placeholder="e.g. GST 18%"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[['Total Rate %','rate'],['CGST %','cgst_rate'],['SGST %','sgst_rate'],['IGST %','igst_rate'],['CESS %','cess_rate']].map(([label,field])=>(
              <div key={field}><label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                <input type="number" value={(slabForm as any)[field]} onChange={e=>setSlabForm(f=>({...f,[field]:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300" /></div>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={slabForm.is_inclusive} onChange={e=>setSlabForm(f=>({...f,is_inclusive:e.target.checked}))} className="w-4 h-4 rounded text-indigo-600" />
            <span className="text-sm text-slate-700">Tax inclusive in price</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={()=>setSlabModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={createSlab} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create Slab</button>
          </div>
        </div>
      </Modal>

      {/* Create HSN */}
      <Modal isOpen={hsnModal} onClose={()=>setHsnModal(false)} title="Add HSN / SAC Code" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
              <input value={hsnForm.code} onChange={e=>setHsnForm(f=>({...f,code:e.target.value}))} placeholder="e.g. 8471"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={hsnForm.code_type} onChange={e=>setHsnForm(f=>({...f,code_type:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="HSN">HSN (Goods)</option><option value="SAC">SAC (Services)</option>
              </select></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
            <input value={hsnForm.description} onChange={e=>setHsnForm(f=>({...f,description:e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Default Tax Slab</label>
              <select value={hsnForm.default_slab_id} onChange={e=>setHsnForm(f=>({...f,default_slab_id:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">None</option>{slabs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Chapter</label>
              <input value={hsnForm.chapter} onChange={e=>setHsnForm(f=>({...f,chapter:e.target.value}))} placeholder="e.g. 84"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={()=>setHsnModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={createHSN} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Add Code</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
