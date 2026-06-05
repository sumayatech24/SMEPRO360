import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Client {
  id: number; client_id: string; name: string; slug: string; email: string;
  phone?: string; country: string; currency: string; plan: string;
  logo_url?: string; brand_color?: string; tax_registrations?: Record<string,string>;
  address?: string; user_count?: number; created_at: string;
  status?: string;
}

const PLAN_COLORS: Record<string,string> = { starter:'gray', professional:'blue', enterprise:'indigo', unlimited:'purple' };
const COUNTRIES = [
  {code:'IN',name:'India',currency:'INR',symbol:'₹'},
  {code:'US',name:'United States',currency:'USD',symbol:'$'},
  {code:'GB',name:'United Kingdom',currency:'GBP',symbol:'£'},
  {code:'AE',name:'UAE',currency:'AED',symbol:'AED'},
  {code:'AU',name:'Australia',currency:'AUD',symbol:'A$'},
  {code:'SG',name:'Singapore',currency:'SGD',symbol:'S$'},
];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onboardModal, setOnboardModal] = useState(false);
  const [viewModal, setViewModal] = useState<Client|null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name:'', trade_name:'', company_type:'pvt_ltd', industry:'',
    country:'India', country_code:'IN', currency:'INR',
    address_line1:'', city:'', state:'', postal_code:'',
    phone:'', email:'', website:'',
    tax_registrations:{} as Record<string,string>,
    logo_url:'', brand_color:'#6366f1',
    admin_name:'', admin_email:'', admin_password:'',
    plan:'professional',
  });
  const [taxFields, setTaxFields] = useState<Record<string,string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        api.get('/clients/', { params: { limit: 100, search } }),
        api.get('/clients/stats/overview').catch(()=>({ data: {} })),
      ]);
      setClients(cRes.data.items || []);
      setStats(sRes.data);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const onboard = async () => {
    if (!form.company_name || !form.admin_email || !form.admin_password) return toast.error('Fill all required fields');
    if (form.admin_password.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      const res = await api.post('/clients/onboard', { ...form, tax_registrations: taxFields });
      toast.success(`Client "${form.company_name}" onboarded! Client ID: ${res.data.client_id}`);
      setOnboardModal(false);
      setForm({ company_name:'', trade_name:'', company_type:'pvt_ltd', industry:'', country:'India', country_code:'IN', currency:'INR', address_line1:'', city:'', state:'', postal_code:'', phone:'', email:'', website:'', tax_registrations:{}, logo_url:'', brand_color:'#6366f1', admin_name:'', admin_email:'', admin_password:'', plan:'professional' });
      setTaxFields({});
      load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Onboarding failed'); }
    setSaving(false);
  };

  const onCountryChange = (code: string) => {
    const c = COUNTRIES.find(c=>c.code===code);
    if (c) setForm(f=>({...f,country:c.name,country_code:c.code,currency:c.currency}));
  };

  const suspend = async (id: number) => {
    await api.put(`/clients/${id}/suspend`);
    toast.success('Client suspended'); load();
  };

  const activate = async (id: number) => {
    await api.put(`/clients/${id}/activate`);
    toast.success('Client activated'); load();
  };

  const inp = 'w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Client Management</h1>
          <p className="text-slate-500 text-sm mt-1">Multi-tenant client onboarding and management</p>
        </div>
        <button onClick={()=>setOnboardModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Onboard Client</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {label:'Total Clients',value:stats.total_clients||0,color:'text-indigo-600'},
            {label:'Active',value:stats.active_clients||0,color:'text-green-600'},
            {label:'Professional',value:(stats.by_plan||{}).professional||0,color:'text-blue-600'},
            {label:'Enterprise',value:(stats.by_plan||{}).enterprise||0,color:'text-purple-600'},
          ].map(s=>(
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
              <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients by name or email..."
        className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />

      {/* Client Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i=><div key={i} className="bg-white dark:bg-slate-800 rounded-2xl h-48 animate-pulse shadow-sm border border-slate-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client=>(
            <div key={client.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {client.logo_url ? (
                    <img src={client.logo_url} alt="Logo" className="w-12 h-12 rounded-xl object-contain border border-slate-100" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                      style={{backgroundColor:client.brand_color||'#6366f1'}}>
                      {client.name?.[0]?.toUpperCase()||'C'}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100">{client.name}</div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">ID: {client.client_id||client.slug}</div>
                  </div>
                </div>
                <Badge label={client.plan} color={PLAN_COLORS[client.plan] as any || 'gray'} />
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
                <div className="flex items-center gap-1.5">📧 {client.email}</div>
                {client.phone && <div className="flex items-center gap-1.5">📞 {client.phone}</div>}
                <div className="flex items-center gap-1.5">🌍 {client.country} · {client.currency}</div>
                {client.address && <div className="flex items-center gap-1.5">📍 {client.address}</div>}
                {client.tax_registrations && Object.keys(client.tax_registrations).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(client.tax_registrations).slice(0,2).map(([k,v])=>(
                      <span key={k} className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs font-mono">{k}: {v}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-400">
                  {client.user_count !== undefined ? `${client.user_count} users · ` : ''}
                  {client.created_at ? new Date(client.created_at).toLocaleDateString('en-IN') : ''}
                </span>
                <div className="flex gap-1.5">
                  <button onClick={()=>setViewModal(client)} className="text-xs px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">View</button>
                  <button onClick={()=>client.status==='suspended'?activate(client.id):suspend(client.id)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg ${client.status==='suspended'?'bg-green-50 text-green-600 hover:bg-green-100':'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                    {client.status==='suspended'?'Activate':'Suspend'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {clients.length===0 && (
            <div className="col-span-3 bg-white dark:bg-slate-800 rounded-2xl p-16 text-center shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="text-4xl mb-3">🏢</div>
              <div className="text-slate-500 font-medium">No clients onboarded yet</div>
              <button onClick={()=>setOnboardModal(true)} className="mt-4 gradient-bg text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90">+ Onboard First Client</button>
            </div>
          )}
        </div>
      )}

      {/* ── ONBOARD MODAL ── */}
      <Modal isOpen={onboardModal} onClose={()=>setOnboardModal(false)} title="Onboard New Client" size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Name *</label>
              <input value={form.company_name} onChange={e=>setForm(f=>({...f,company_name:e.target.value}))} placeholder="Acme Corporation" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Trade Name</label>
              <input value={form.trade_name} onChange={e=>setForm(f=>({...f,trade_name:e.target.value}))} placeholder="ACME" className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country *</label>
              <select value={form.country_code} onChange={e=>onCountryChange(e.target.value)} className={inp}>
                {COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name} ({c.currency})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Industry</label>
              <input value={form.industry} onChange={e=>setForm(f=>({...f,industry:e.target.value}))} placeholder="IT, Manufacturing..." className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Plan</label>
              <select value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))} className={inp}>
                {['starter','professional','enterprise','unlimited'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
              <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
              <input value={form.address_line1} onChange={e=>setForm(f=>({...f,address_line1:e.target.value}))} placeholder="Street address" className={inp} />
            </div>
            <div>
              <input value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} placeholder="City" className={inp} />
            </div>
            <div>
              <input value={form.state} onChange={e=>setForm(f=>({...f,state:e.target.value}))} placeholder="State" className={inp} />
            </div>
            <div>
              <input value={form.postal_code} onChange={e=>setForm(f=>({...f,postal_code:e.target.value}))} placeholder="Postal Code" className={inp} />
            </div>
          </div>

          {/* Tax registrations */}
          <div className="border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 bg-indigo-50/50 dark:bg-indigo-900/10">
            <label className="block text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3">Tax Registration Numbers</label>
            <div className="grid grid-cols-2 gap-3">
              {(form.country_code==='IN' ? [['GSTIN','27AABCT1234A1ZB'],['PAN','AABCT1234A'],['TAN','MUMA12345A'],['CIN','U72900MH2020PTC123456']] :
                form.country_code==='US' ? [['EIN','12-3456789'],['State Tax ID','CA-123456']] :
                form.country_code==='GB' ? [['VAT Number','GB123456789'],['Company Number','12345678']] :
                form.country_code==='AE' ? [['TRN','100123456700003'],['Trade License','CN-123456']] :
                [['Tax ID',''],['Reg Number','']]).map(([label,ph]:[string,string])=>(
                <div key={label}>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
                  <input value={taxFields[label]||''} onChange={e=>setTaxFields(t=>({...t,[label]:e.target.value}))} placeholder={ph}
                    className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 rounded-lg px-2.5 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                </div>
              ))}
            </div>
          </div>

          {/* Brand */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Logo URL</label>
              <input value={form.logo_url} onChange={e=>setForm(f=>({...f,logo_url:e.target.value}))} placeholder="https://..." className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Brand Color</label>
              <div className="flex gap-2">
                <input type="color" value={form.brand_color} onChange={e=>setForm(f=>({...f,brand_color:e.target.value}))} className="w-10 h-10 rounded-lg border border-slate-200" />
                <input value={form.brand_color} onChange={e=>setForm(f=>({...f,brand_color:e.target.value}))} className={inp} />
              </div>
            </div>
          </div>

          {/* Admin User */}
          <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">👤 Admin User Account</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Full Name *</label>
                <input value={form.admin_name} onChange={e=>setForm(f=>({...f,admin_name:e.target.value}))} placeholder="John Doe" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email *</label>
                <input type="email" value={form.admin_email} onChange={e=>setForm(f=>({...f,admin_email:e.target.value}))} placeholder="admin@company.com" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Password *</label>
                <input type="password" value={form.admin_password} onChange={e=>setForm(f=>({...f,admin_password:e.target.value}))} placeholder="Min 8 characters" className={inp} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={()=>setOnboardModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={onboard} disabled={saving} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? 'Onboarding...' : '🚀 Onboard Client'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── VIEW CLIENT MODAL ── */}
      {viewModal && (
        <Modal isOpen={!!viewModal} onClose={()=>setViewModal(null)} title={`Client — ${viewModal.name}`} size="md">
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl">
              {viewModal.logo_url ? (
                <img src={viewModal.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-contain" />
              ) : (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
                  style={{backgroundColor:viewModal.brand_color||'#6366f1'}}>
                  {viewModal.name?.[0]}
                </div>
              )}
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-100 text-lg">{viewModal.name}</div>
                <div className="font-mono text-xs text-indigo-600 mt-0.5">Client ID: {viewModal.client_id||viewModal.slug}</div>
                <Badge label={viewModal.plan} color={PLAN_COLORS[viewModal.plan] as any} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                {label:'Email',value:viewModal.email},
                {label:'Phone',value:viewModal.phone||'—'},
                {label:'Country',value:viewModal.country},
                {label:'Currency',value:viewModal.currency},
                {label:'Address',value:viewModal.address||'—'},
                {label:'Users',value:viewModal.user_count||0},
              ].map(row=>(
                <div key={row.label} className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-0.5">{row.label}</div>
                  <div className="font-medium text-slate-800 dark:text-slate-100">{row.value}</div>
                </div>
              ))}
            </div>
            {viewModal.tax_registrations && Object.keys(viewModal.tax_registrations).length > 0 && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2">TAX REGISTRATIONS</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(viewModal.tax_registrations).map(([k,v])=>(
                    <div key={k} className="text-sm">
                      <span className="text-slate-500 dark:text-slate-400">{k}: </span>
                      <span className="font-mono font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="text-xs text-slate-400 text-center">
              Onboarded: {viewModal.created_at?new Date(viewModal.created_at).toLocaleDateString('en-IN'):'—'}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
