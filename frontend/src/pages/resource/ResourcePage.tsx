import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Allocation {
  id: number; allocation_number: string; product_id: number; project_id: number; employee_id: number;
  item_type: string; quantity_allocated: number; quantity_returned: number; quantity_consumed: number;
  quantity_outstanding: number; unit: string; status: string; purpose: string; allocation_date: string;
  expected_return_date: string; condition_out: string; condition_in: string; total_cost: number;
}
interface PeopleAlloc { id: number; project_id: number; employee_id: number; role: string; allocation_percent: number; start_date: string; end_date: string; status: string; }
interface Product { id: number; sku: string; name: string; unit: string; cost_price: number; }
interface Project { id: number; name: string; }
interface Employee { id: number; first_name: string; last_name: string; employee_number: string; }

const statusColor: Record<string,string> = { requested:'gray', approved:'blue', issued:'indigo', partially_returned:'yellow', fully_returned:'green', lost:'red' };
const itemTypeColor: Record<string,string> = { consumable:'red', reusable:'green' };

export default function ResourcePage() {
  const [tab, setTab] = useState<'items'|'people'|'returns'>('items');
  const [itemAllocs, setItemAllocs] = useState<Allocation[]>([]);
  const [peopleAllocs, setPeopleAllocs] = useState<PeopleAlloc[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemModal, setItemModal] = useState(false);
  const [peopleModal, setPeopleModal] = useState(false);
  const [returnModal, setReturnModal] = useState<Allocation|null>(null);
  const [returnForm, setReturnForm] = useState({ quantity_returned:'', condition:'good', notes:'' });
  const [itemForm, setItemForm] = useState({ product_id:'', project_id:'', employee_id:'', item_type:'consumable', quantity_allocated:'', unit:'pcs', expected_return_date:'', purpose:'', notes:'', condition_out:'good' });
  const [peopleForm, setPeopleForm] = useState({ project_id:'', employee_id:'', role:'', allocation_percent:'100', start_date:'', end_date:'', hourly_rate:'', notes:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, pRes, prRes, eRes, prodRes] = await Promise.all([
        api.get('/resource/items'),
        api.get('/resource/people'),
        api.get('/projects/', { params: { limit: 50 } }),
        api.get('/hr/employees', { params: { limit: 100 } }),
        api.get('/inventory/products', { params: { limit: 200 } }),
      ]);
      setItemAllocs(iRes.data.items || []);
      setPeopleAllocs(pRes.data || []);
      setProjects(prRes.data.items || prRes.data || []);
      setEmployees(eRes.data.items || eRes.data || []);
      setProducts(prodRes.data.items || prodRes.data || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const prodName = (id: number) => products.find(p=>p.id===id)?.name || `PRD-${id}`;
  const projName = (id: number) => projects.find(p=>p.id===id)?.name || `PRJ-${id}`;
  const empName = (id: number) => { const e=employees.find(e=>e.id===id); return e?`${e.first_name} ${e.last_name}`:`EMP-${id}`; };

  const allocateItem = async () => {
    if (!itemForm.product_id || !itemForm.quantity_allocated) return toast.error('Fill required fields');
    if (!itemForm.project_id && !itemForm.employee_id) return toast.error('Select project or employee');
    try {
      await api.post('/resource/items', {
        product_id:Number(itemForm.product_id),
        project_id: itemForm.project_id ? Number(itemForm.project_id) : undefined,
        employee_id: itemForm.employee_id ? Number(itemForm.employee_id) : undefined,
        item_type: itemForm.item_type,
        quantity_allocated: Number(itemForm.quantity_allocated),
        unit: itemForm.unit || products.find(p=>p.id===Number(itemForm.product_id))?.unit || 'pcs',
        expected_return_date: itemForm.item_type==='reusable' && itemForm.expected_return_date ? itemForm.expected_return_date : undefined,
        purpose: itemForm.purpose,
        notes: itemForm.notes,
        condition_out: itemForm.condition_out,
      });
      toast.success('Item allocated!'); setItemModal(false); load();
      setItemForm({ product_id:'', project_id:'', employee_id:'', item_type:'consumable', quantity_allocated:'', unit:'pcs', expected_return_date:'', purpose:'', notes:'', condition_out:'good' });
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const allocatePeople = async () => {
    if (!peopleForm.project_id || !peopleForm.employee_id) return toast.error('Fill required fields');
    try {
      await api.post('/resource/people', {
        project_id: Number(peopleForm.project_id),
        employee_id: Number(peopleForm.employee_id),
        role: peopleForm.role,
        allocation_percent: Number(peopleForm.allocation_percent),
        start_date: peopleForm.start_date || undefined,
        end_date: peopleForm.end_date || undefined,
        hourly_rate: Number(peopleForm.hourly_rate) || 0,
        notes: peopleForm.notes,
      });
      toast.success('Resource allocated!'); setPeopleModal(false); load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const processReturn = async () => {
    if (!returnModal || !returnForm.quantity_returned) return toast.error('Enter quantity');
    if (Number(returnForm.quantity_returned) > returnModal.quantity_outstanding) return toast.error(`Max returnable: ${returnModal.quantity_outstanding}`);
    try {
      await api.post('/resource/returns', {
        allocation_id: returnModal.id,
        quantity_returned: Number(returnForm.quantity_returned),
        condition: returnForm.condition,
        notes: returnForm.notes,
      });
      toast.success('Return processed!'); setReturnModal(null); setReturnForm({quantity_returned:'',condition:'good',notes:''}); load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const onProductChange = (prodId: string) => {
    const p = products.find(p=>p.id===Number(prodId));
    setItemForm(f=>({...f, product_id:prodId, unit:p?.unit||'pcs'}));
  };

  const itemColumns = [
    { key:'allocation_number', title:'Alloc #', render:(r:Allocation) => <span className="font-mono text-xs text-indigo-600">{r.allocation_number}</span> },
    { key:'product_id', title:'Item', render:(r:Allocation) => <span className="font-medium">{prodName(r.product_id)}</span> },
    { key:'item_type', title:'Type', render:(r:Allocation) => <Badge label={r.item_type} color={itemTypeColor[r.item_type] as any} /> },
    { key:'project_id', title:'Allocated To', render:(r:Allocation) => (
      <div>
        {r.project_id && <div className="text-xs text-indigo-600">📁 {projName(r.project_id)}</div>}
        {r.employee_id && <div className="text-xs text-slate-600">👤 {empName(r.employee_id)}</div>}
      </div>
    )},
    { key:'quantity_allocated', title:'Qty', render:(r:Allocation) => (
      <div className="text-sm">
        <div>Issued: <span className="font-bold">{r.quantity_allocated} {r.unit}</span></div>
        {r.item_type==='reusable' && <div className="text-xs text-slate-400">Returned: {r.quantity_returned} · Outstanding: <span className="text-orange-500 font-medium">{r.quantity_outstanding}</span></div>}
      </div>
    )},
    { key:'status', title:'Status', render:(r:Allocation) => <Badge label={r.status?.replace('_',' ')} color={statusColor[r.status] as any || 'gray'} /> },
    { key:'condition_out', title:'Condition', render:(r:Allocation) => <span className="text-xs capitalize">{r.condition_out}→{r.condition_in||'—'}</span> },
  ];

  const peopleColumns = [
    { key:'employee_id', title:'Employee', render:(r:PeopleAlloc) => <span className="font-medium">{empName(r.employee_id)}</span> },
    { key:'project_id', title:'Project', render:(r:PeopleAlloc) => <span className="text-indigo-600">{projName(r.project_id)}</span> },
    { key:'role', title:'Role', render:(r:PeopleAlloc) => r.role||'—' },
    { key:'allocation_percent', title:'Allocation', render:(r:PeopleAlloc) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-slate-100 rounded-full"><div className="h-1.5 bg-indigo-500 rounded-full" style={{width:`${r.allocation_percent||0}%`}} /></div>
        <span className="text-sm font-medium">{r.allocation_percent||0}%</span>
      </div>
    )},
    { key:'start_date', title:'Duration', render:(r:PeopleAlloc) => (
      <div className="text-xs text-slate-500">
        {r.start_date?new Date(r.start_date).toLocaleDateString('en-IN'):'—'}
        {r.end_date && ` → ${new Date(r.end_date).toLocaleDateString('en-IN')}`}
      </div>
    )},
    { key:'status', title:'Status', render:(r:PeopleAlloc) => <Badge label={r.status} color={r.status==='active'?'green':'gray'} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Resource Management</h1>
          <p className="text-slate-500 text-sm mt-1">Allocate people and inventory items to projects</p></div>
        <div className="flex gap-2">
          {tab==='people' && <button onClick={()=>setPeopleModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Allocate People</button>}
          {tab==='items' && <button onClick={()=>setItemModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Allocate Item</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {label:'Item Allocations',value:itemAllocs.length,color:'text-indigo-600'},
          {label:'Active (Issued)',value:itemAllocs.filter(a=>a.status==='issued').length,color:'text-blue-600'},
          {label:'Reusable Outstanding',value:itemAllocs.filter(a=>a.item_type==='reusable'&&a.quantity_outstanding>0).length,color:'text-orange-600'},
          {label:'People Allocations',value:peopleAllocs.length,color:'text-purple-600'},
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([['items','📦 Item Allocations'],['people','👥 People Allocation'],['returns','↩️ Returns']] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab===t?'bg-white text-indigo-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab==='items' && (
        <DataTable columns={itemColumns} data={itemAllocs} loading={loading} title="Item Allocations"
          onAdd={()=>setItemModal(true)} addLabel="Allocate Item"
          actions={(row:Allocation) => (
            row.item_type==='reusable' && row.quantity_outstanding > 0 ? (
              <button onClick={()=>{setReturnModal(row);setReturnForm({quantity_returned:String(row.quantity_outstanding),condition:'good',notes:''}); }}
                className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                Return Items
              </button>
            ) : null
          )}
        />
      )}

      {tab==='people' && (
        <DataTable columns={peopleColumns} data={peopleAllocs} loading={loading} title="People Allocations"
          onAdd={()=>setPeopleModal(true)} addLabel="Allocate Person" />
      )}

      {tab==='returns' && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800">Reusable Items — Pending Returns</h3>
          {itemAllocs.filter(a=>a.item_type==='reusable'&&a.quantity_outstanding>0).length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-slate-500">No items pending return</div>
            </div>
          ) : (
            itemAllocs.filter(a=>a.item_type==='reusable'&&a.quantity_outstanding>0).map(a=>(
              <div key={a.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{prodName(a.product_id)}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {a.project_id && <span>📁 {projName(a.project_id)} · </span>}
                    {a.employee_id && <span>👤 {empName(a.employee_id)} · </span>}
                    {a.allocation_number}
                  </div>
                  {a.expected_return_date && (
                    <div className={`text-xs mt-1 ${new Date(a.expected_return_date)<new Date()?'text-red-500 font-medium':'text-slate-400'}`}>
                      Expected return: {new Date(a.expected_return_date).toLocaleDateString('en-IN')}
                      {new Date(a.expected_return_date)<new Date() && ' ⚠️ OVERDUE'}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-500">{a.quantity_outstanding} {a.unit}</div>
                  <div className="text-xs text-slate-400">of {a.quantity_allocated} issued · {a.quantity_returned} returned</div>
                  <button onClick={()=>{setReturnModal(a);setReturnForm({quantity_returned:String(a.quantity_outstanding),condition:'good',notes:''}); tab!=='items' && setTab('items');}}
                    className="mt-2 text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                    Process Return
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Item Allocation Modal */}
      <Modal isOpen={itemModal} onClose={()=>setItemModal(false)} title="Allocate Inventory Item" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Item / Product *</label>
              <select value={itemForm.product_id} onChange={e=>onProductChange(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select product</option>
                {products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.sku}) — ₹{Number(p.cost_price).toLocaleString()}/{p.unit}</option>)}
              </select></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Item Type *</label>
              <div className="flex gap-2">
                {['consumable','reusable'].map(t=>(
                  <button key={t} onClick={()=>setItemForm(f=>({...f,item_type:t}))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${itemForm.item_type===t?'border-indigo-500 bg-indigo-50 text-indigo-700':'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    {t==='consumable'?'🔴 Consumable':'♻️ Reusable'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">{itemForm.item_type==='consumable'?'Item will be used up (not returned)':'Item must be returned after use'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity * ({itemForm.unit})</label>
              <input type="number" value={itemForm.quantity_allocated} onChange={e=>setItemForm(f=>({...f,quantity_allocated:e.target.value}))} min="0.01"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Allocate to Project</label>
              <select value={itemForm.project_id} onChange={e=>setItemForm(f=>({...f,project_id:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">None</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Allocate to Employee</label>
              <select value={itemForm.employee_id} onChange={e=>setItemForm(f=>({...f,employee_id:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">None</option>{employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select></div>
          </div>

          {itemForm.item_type==='reusable' && (
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Expected Return Date</label>
              <input type="date" value={itemForm.expected_return_date} onChange={e=>setItemForm(f=>({...f,expected_return_date:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Condition when Issued</label>
              <select value={itemForm.condition_out} onChange={e=>setItemForm(f=>({...f,condition_out:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['new','good','fair','damaged'].map(c=><option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
              <input value={itemForm.purpose} onChange={e=>setItemForm(f=>({...f,purpose:e.target.value}))} placeholder="What is this item for?"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={()=>setItemModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={allocateItem} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Issue Item</button>
          </div>
        </div>
      </Modal>

      {/* People Allocation Modal */}
      <Modal isOpen={peopleModal} onClose={()=>setPeopleModal(false)} title="Allocate Person to Project" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Project *</label>
            <select value={peopleForm.project_id} onChange={e=>setPeopleForm(f=>({...f,project_id:e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
            <select value={peopleForm.employee_id} onChange={e=>setPeopleForm(f=>({...f,employee_id:e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select employee</option>{employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_number})</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <input value={peopleForm.role} onChange={e=>setPeopleForm(f=>({...f,role:e.target.value}))} placeholder="Lead Developer, QA..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Allocation %</label>
              <input type="number" min="10" max="100" value={peopleForm.allocation_percent} onChange={e=>setPeopleForm(f=>({...f,allocation_percent:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input type="date" value={peopleForm.start_date} onChange={e=>setPeopleForm(f=>({...f,start_date:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input type="date" value={peopleForm.end_date} onChange={e=>setPeopleForm(f=>({...f,end_date:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Hourly Rate (₹)</label>
            <input type="number" value={peopleForm.hourly_rate} onChange={e=>setPeopleForm(f=>({...f,hourly_rate:e.target.value}))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div className="flex gap-3 pt-2">
            <button onClick={()=>setPeopleModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={allocatePeople} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Allocate</button>
          </div>
        </div>
      </Modal>

      {/* Return Modal */}
      {returnModal && (
        <Modal isOpen={!!returnModal} onClose={()=>setReturnModal(null)} title={`Return Items — ${prodName(returnModal.product_id)}`} size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-slate-50 rounded-xl p-3 text-center"><div className="text-slate-500 text-xs">Issued</div><div className="font-bold text-lg">{returnModal.quantity_allocated}</div></div>
              <div className="bg-green-50 rounded-xl p-3 text-center"><div className="text-slate-500 text-xs">Returned</div><div className="font-bold text-lg text-green-600">{returnModal.quantity_returned}</div></div>
              <div className="bg-orange-50 rounded-xl p-3 text-center"><div className="text-slate-500 text-xs">Outstanding</div><div className="font-bold text-lg text-orange-600">{returnModal.quantity_outstanding}</div></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Returning Quantity * (max {returnModal.quantity_outstanding} {returnModal.unit})</label>
              <input type="number" value={returnForm.quantity_returned} onChange={e=>setReturnForm(f=>({...f,quantity_returned:e.target.value}))} min="0.01" max={returnModal.quantity_outstanding}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Condition on Return</label>
              <select value={returnForm.condition} onChange={e=>setReturnForm(f=>({...f,condition:e.target.value}))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="good">Good — Fully functional, back to stock</option>
                <option value="fair">Fair — Minor wear, can be reused</option>
                <option value="damaged">Damaged — Needs repair before reuse</option>
                <option value="lost">Lost — Cannot be returned</option>
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <input value={returnForm.notes} onChange={e=>setReturnForm(f=>({...f,notes:e.target.value}))} placeholder="Any remarks about condition..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
              ℹ️ Items in <strong>Good</strong> or <strong>Fair</strong> condition will be automatically returned to inventory stock.
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setReturnModal(null)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={processReturn} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Process Return</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
