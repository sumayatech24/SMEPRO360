import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Product { id: number; sku: string; name: string; unit: string; reorder_level: number; reorder_quantity: number; }
interface StockLevel { id: number; product_id: number; warehouse_id: number; quantity_on_hand: number; quantity_reserved: number; quantity_available: number; }
interface Movement { id: number; movement_number: string; product_id: number; warehouse_id: number; movement_type: string; quantity: number; notes?: string; reference_type?: string; created_at: string; }
interface Alert { product_id: number; sku: string; name: string; unit: string; alert_type: string; severity: string; current_stock: number; reorder_level: number; reorder_quantity: number; }
interface Dashboard { total_products: number; total_stock_value: number; in_stock: number; low_stock: number; out_of_stock: number; active_allocations: number; recent_movements: Movement[]; }

const mvTypeColor: Record<string,string> = { in:'green', out:'red', adjustment:'blue', transfer:'yellow' };

export default function InventoryPage() {
  const [tab, setTab] = useState<'dashboard'|'stock'|'movements'|'alerts'>('dashboard');
  const [dashboard, setDashboard] = useState<Dashboard|null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState<Product|null>(null);
  const [adjForm, setAdjForm] = useState({ warehouse_id:'1', quantity:'', notes:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, pRes, mvRes, aRes] = await Promise.all([
        api.get('/resource/inventory/dashboard'),
        api.get('/inventory/products', { params: { limit: 200 } }),
        api.get('/resource/movements', { params: { limit: 50 } }),
        api.get('/resource/alerts'),
      ]);
      setDashboard(dRes.data);
      setProducts(pRes.data.items || pRes.data || []);
      setMovements(mvRes.data.items || []);
      setAlerts(aRes.data.alerts || []);
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Build stock view: products with their available stock
  const stockView = products.map(p => {
    const alert = alerts.find(a => a.product_id === p.id);
    return {
      id: p.id, sku: p.sku, name: p.name, unit: p.unit,
      current_stock: alert?.current_stock ?? 0,
      reorder_level: p.reorder_level || 0,
      status: alert ? alert.alert_type : 'in_stock',
      severity: alert?.severity || 'ok',
    };
  });

  const adjust = async () => {
    if (!adjustModal || !adjForm.quantity) return toast.error('Enter quantity');
    try {
      await api.post('/resource/movements/adjust', {
        product_id: adjustModal.id,
        warehouse_id: Number(adjForm.warehouse_id),
        quantity: Number(adjForm.quantity),
        notes: adjForm.notes || 'Manual stock adjustment',
      });
      toast.success('Stock adjusted!'); setAdjustModal(null); setAdjForm({warehouse_id:'1',quantity:'',notes:''}); load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const stockColumns = [
    { key:'sku', title:'SKU', render:(r:any) => <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{r.sku}</span> },
    { key:'name', title:'Product', render:(r:any) => <span className="font-medium">{r.name}</span> },
    { key:'current_stock', title:'Available Stock', render:(r:any) => (
      <div className="flex items-center gap-2">
        <span className={`font-bold ${r.current_stock<=0?'text-red-500':r.current_stock<=r.reorder_level?'text-yellow-600':'text-green-600'}`}>
          {r.current_stock} {r.unit}
        </span>
        <div className="w-20 h-1.5 bg-slate-100 rounded-full">
          <div className={`h-1.5 rounded-full ${r.current_stock<=0?'bg-red-400':r.current_stock<=r.reorder_level?'bg-yellow-400':'bg-green-400'}`}
            style={{width:`${Math.min(100, r.reorder_level>0?Math.round(r.current_stock/r.reorder_level*50):50)}%`}} />
        </div>
      </div>
    )},
    { key:'reorder_level', title:'Reorder At', render:(r:any) => `${r.reorder_level} ${r.unit}` },
    { key:'status', title:'Status', render:(r:any) => (
      <Badge label={r.status==='out_of_stock'?'Out of Stock':r.status==='low_stock'?'Low Stock':'In Stock'}
        color={r.status==='out_of_stock'?'red':r.status==='low_stock'?'yellow':'green'} />
    )},
  ];

  const movementColumns = [
    { key:'movement_number', title:'#', render:(r:Movement) => <span className="font-mono text-xs text-slate-500">{r.movement_number}</span> },
    { key:'movement_type', title:'Type', render:(r:Movement) => <Badge label={r.movement_type} color={mvTypeColor[r.movement_type] as any || 'gray'} /> },
    { key:'product_id', title:'Product', render:(r:Movement) => { const p=products.find(p=>p.id===r.product_id); return p?.name||`PRD-${r.product_id}`; }},
    { key:'quantity', title:'Quantity', render:(r:Movement) => <span className={`font-bold ${r.movement_type==='out'?'text-red-500':'text-green-600'}`}>{r.movement_type==='out'?'-':'+‌'}{r.quantity}</span> },
    { key:'notes', title:'Notes', render:(r:Movement) => <span className="text-sm text-slate-500 max-w-xs truncate block">{r.notes||'-'}</span> },
    { key:'created_at', title:'Date', render:(r:Movement) => r.created_at?new Date(r.created_at).toLocaleDateString('en-IN'):'-' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Inventory Management</h1>
          <p className="text-slate-500 text-sm mt-1">Stock levels, movements, and alerts</p></div>
        <div className="flex gap-2">
          {alerts.filter(a=>a.severity==='critical').length > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-xl text-sm font-medium">
              🚨 {alerts.filter(a=>a.severity==='critical').length} Out of Stock
            </div>
          )}
          {alerts.filter(a=>a.severity==='warning').length > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-xl text-sm font-medium">
              ⚠️ {alerts.filter(a=>a.severity==='warning').length} Low Stock
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([['dashboard','📊 Dashboard'],['stock','📦 Stock Levels'],['movements','🔄 Movements'],['alerts','🚨 Alerts']] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${tab===t?'bg-white text-indigo-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {label}
            {t==='alerts' && alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{alerts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {tab==='dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              {label:'Total Products',value:dashboard.total_products,color:'text-indigo-600',bg:'bg-indigo-50'},
              {label:'In Stock',value:dashboard.in_stock,color:'text-green-600',bg:'bg-green-50'},
              {label:'Low Stock',value:dashboard.low_stock,color:'text-yellow-600',bg:'bg-yellow-50'},
              {label:'Out of Stock',value:dashboard.out_of_stock,color:'text-red-500',bg:'bg-red-50'},
              {label:'Active Allocations',value:dashboard.active_allocations,color:'text-purple-600',bg:'bg-purple-50'},
              {label:'Stock Value',value:`₹${(dashboard.total_stock_value/100000).toFixed(1)}L`,color:'text-blue-600',bg:'bg-blue-50'},
            ].map(s=>(
              <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className={`text-xs font-medium ${s.color} ${s.bg} px-2 py-0.5 rounded-full w-fit mb-2`}>{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Stock Status Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Stock Status Overview</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={[
                {name:'In Stock',count:dashboard.in_stock,fill:'#10b981'},
                {name:'Low Stock',count:dashboard.low_stock,fill:'#f59e0b'},
                {name:'Out of Stock',count:dashboard.out_of_stock,fill:'#ef4444'},
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize:12}} />
                <YAxis tick={{fontSize:12}} />
                <Tooltip />
                <Bar dataKey="count" radius={[6,6,0,0]} fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Movements */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-800">Recent Stock Movements</h3></div>
            <div className="divide-y divide-slate-50">
              {(dashboard.recent_movements||[]).slice(0,8).map(m=>(
                <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${m.movement_type==='in'?'bg-green-500':m.movement_type==='out'?'bg-red-500':'bg-blue-500'}`}>
                    {m.movement_type==='in'?'↑':m.movement_type==='out'?'↓':'⟳'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800">{m.movement_number}</div>
                    <div className="text-xs text-slate-400">{m.notes||m.reference_type}</div>
                  </div>
                  <span className={`text-sm font-bold ${m.movement_type==='out'?'text-red-500':'text-green-600'}`}>
                    {m.movement_type==='out'?'-':'+‌'}{m.quantity}
                  </span>
                  <span className="text-xs text-slate-400">{m.created_at?new Date(m.created_at).toLocaleDateString('en-IN'):''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STOCK LEVELS */}
      {tab==='stock' && (
        <DataTable columns={stockColumns} data={stockView} loading={loading} title="Stock Levels"
          actions={(row:any) => (
            <button onClick={()=>{setAdjustModal(products.find(p=>p.id===row.id)||null);setAdjForm({warehouse_id:'1',quantity:String(row.current_stock),notes:''});}}
              className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">Adjust</button>
          )}
        />
      )}

      {/* MOVEMENTS */}
      {tab==='movements' && (
        <DataTable columns={movementColumns} data={movements} loading={loading} title="Stock Movements" />
      )}

      {/* ALERTS */}
      {tab==='alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-slate-100">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-slate-500 font-medium">All stock levels are healthy!</div>
              <div className="text-slate-400 text-sm mt-1">No reorder alerts at this time</div>
            </div>
          ) : (
            <>
              {alerts.filter(a=>a.severity==='critical').length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-2">🚨 CRITICAL — Out of Stock ({alerts.filter(a=>a.severity==='critical').length})</h3>
                  <div className="space-y-2">
                    {alerts.filter(a=>a.severity==='critical').map(a=>(
                      <div key={a.product_id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-red-800">{a.name}</div>
                          <div className="text-xs text-red-500 mt-0.5">SKU: {a.sku} · Reorder at: {a.reorder_level} {a.unit}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-600">0 {a.unit}</div>
                          <div className="text-xs text-red-400">Reorder qty: {a.reorder_quantity} {a.unit}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {alerts.filter(a=>a.severity==='warning').length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-yellow-600 mb-2 flex items-center gap-2">⚠️ WARNING — Low Stock ({alerts.filter(a=>a.severity==='warning').length})</h3>
                  <div className="space-y-2">
                    {alerts.filter(a=>a.severity==='warning').map(a=>(
                      <div key={a.product_id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-yellow-800">{a.name}</div>
                          <div className="text-xs text-yellow-600 mt-0.5">SKU: {a.sku} · Reorder at: {a.reorder_level} {a.unit}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-yellow-700">{a.current_stock} {a.unit}</div>
                          <div className="text-xs text-yellow-500">Reorder qty: {a.reorder_quantity} {a.unit}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <Modal isOpen={!!adjustModal} onClose={()=>setAdjustModal(null)} title={`Adjust Stock — ${adjustModal.name}`} size="sm">
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <span className="text-slate-500">SKU:</span> <span className="font-mono font-medium">{adjustModal.sku}</span>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">New Quantity ({adjustModal.unit}) *</label>
              <input type="number" value={adjForm.quantity} onChange={e=>setAdjForm(f=>({...f,quantity:e.target.value}))} min="0"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
              <input value={adjForm.notes} onChange={e=>setAdjForm(f=>({...f,notes:e.target.value}))} placeholder="Physical count, damage, returns..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div className="flex gap-3 pt-2">
              <button onClick={()=>setAdjustModal(null)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={adjust} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Save Adjustment</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
