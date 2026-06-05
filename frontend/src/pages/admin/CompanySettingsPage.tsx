import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import Badge from '../../components/ui/Badge';

const COUNTRIES = [
  {code:'IN',name:'India',currency:'INR',symbol:'₹',timezone:'Asia/Kolkata',locale:'en-IN',dateFormat:'DD/MM/YYYY',fiscalStart:'04-01'},
  {code:'US',name:'United States',currency:'USD',symbol:'$',timezone:'America/New_York',locale:'en-US',dateFormat:'MM/DD/YYYY',fiscalStart:'01-01'},
  {code:'GB',name:'United Kingdom',currency:'GBP',symbol:'£',timezone:'Europe/London',locale:'en-GB',dateFormat:'DD/MM/YYYY',fiscalStart:'04-01'},
  {code:'AE',name:'UAE',currency:'AED',symbol:'AED',timezone:'Asia/Dubai',locale:'en-AE',dateFormat:'DD/MM/YYYY',fiscalStart:'01-01'},
  {code:'AU',name:'Australia',currency:'AUD',symbol:'A$',timezone:'Australia/Sydney',locale:'en-AU',dateFormat:'DD/MM/YYYY',fiscalStart:'07-01'},
  {code:'SG',name:'Singapore',currency:'SGD',symbol:'S$',timezone:'Asia/Singapore',locale:'en-SG',dateFormat:'DD/MM/YYYY',fiscalStart:'01-01'},
  {code:'CA',name:'Canada',currency:'CAD',symbol:'CA$',timezone:'America/Toronto',locale:'en-CA',dateFormat:'YYYY-MM-DD',fiscalStart:'01-01'},
  {code:'DE',name:'Germany',currency:'EUR',symbol:'€',timezone:'Europe/Berlin',locale:'de-DE',dateFormat:'DD.MM.YYYY',fiscalStart:'01-01'},
];

const TAX_FIELDS: Record<string, {label:string;placeholder:string}[]> = {
  IN: [{label:'GSTIN',placeholder:'27AABCT1234A1ZB'},{label:'PAN',placeholder:'AABCT1234A'},{label:'TAN',placeholder:'MUMA12345A'},{label:'CIN',placeholder:'U72900MH2020PTC123456'},{label:'MSME No.',placeholder:'UDYAM-MH-123456'}],
  US: [{label:'EIN',placeholder:'12-3456789'},{label:'State Tax ID',placeholder:'CA-123456'}],
  GB: [{label:'VAT Number',placeholder:'GB123456789'},{label:'Company Number',placeholder:'12345678'},{label:'UTR',placeholder:'1234567890'}],
  AE: [{label:'TRN (VAT)',placeholder:'100123456700003'},{label:'Trade License No.',placeholder:'CN-123456'}],
  AU: [{label:'ABN',placeholder:'12 345 678 901'},{label:'ACN',placeholder:'123 456 789'}],
  SG: [{label:'UEN',placeholder:'202012345C'},{label:'GST Reg No.',placeholder:'M12345678Z'}],
  CA: [{label:'Business Number',placeholder:'123456789'},{label:'HST/GST No.',placeholder:'123456789RT0001'}],
  DE: [{label:'USt-IdNr.',placeholder:'DE123456789'},{label:'Steuernummer',placeholder:'1234567890'}],
};

export default function CompanySettingsPage() {
  const [tab, setTab] = useState<'profile'|'tax'|'bank'|'documents'|'salary'>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [structures, setStructures] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [taxRegs, setTaxRegs] = useState<Record<string,string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get('/payroll-v2/company-profile'),
        api.get('/payroll-v2/salary-structures'),
      ]);
      setProfile(pRes.data);
      setForm(pRes.data.configured ? pRes.data : { legal_name:'', country:'India', country_code:'IN', currency:'INR', currency_symbol:'₹', brand_color:'#6366f1', invoice_prefix:'INV', po_prefix:'PO', so_prefix:'SO', default_payment_terms:'30 days' });
      setTaxRegs(pRes.data.tax_registrations || {});
      setStructures(sRes.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.legal_name) return toast.error('Legal name is required');
    setSaving(true);
    try {
      await api.post('/payroll-v2/company-profile', { ...form, tax_registrations: taxRegs });
      toast.success('Company profile saved!'); load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); } finally { setSaving(false); }
  };

  const onCountryChange = (code: string) => {
    const c = COUNTRIES.find(c=>c.code===code);
    if (c) setForm((f:any)=>({...f, country:c.name, country_code:c.code, currency:c.currency, currency_symbol:c.symbol, timezone:c.timezone, locale:c.locale, date_format:c.dateFormat, fiscal_year_start:c.fiscalStart}));
  };

  const inp = 'w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300';
  const currentTaxFields = TAX_FIELDS[form.country_code] || TAX_FIELDS['IN'];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Company Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Configure company profile, logo, tax registrations and document settings</p>
        </div>
        <button onClick={save} disabled={saving} className="gradient-bg text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving...' : '💾 Save Changes'}
        </button>
      </div>

      {/* Company card preview */}
      {profile?.configured && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            style={{backgroundColor: form.brand_color||'#6366f1'}}>
            {form.legal_name?.[0]||'S'}
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-100 text-lg">{form.legal_name}</div>
            <div className="text-slate-500 text-sm">{form.city}, {form.state}, {form.country} · {form.currency}</div>
            <div className="flex gap-2 mt-1">
              {taxRegs.gstin && <Badge label={`GSTIN: ${taxRegs.gstin}`} color="green" />}
              {taxRegs.pan && <Badge label={`PAN: ${taxRegs.pan}`} color="blue" />}
              <Badge label={`${form.currency}`} color="indigo" />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-wrap">
        {([['profile','🏢 Profile'],['tax','🧾 Tax & Legal'],['bank','🏦 Bank Details'],['documents','📄 Document Settings'],['salary','💰 Salary Structures']] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===t?'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>{label}</button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
        {/* PROFILE */}
        {tab==='profile' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Legal Company Name *</label>
                <input value={form.legal_name||''} onChange={e=>setForm((f:any)=>({...f,legal_name:e.target.value}))} className={inp} placeholder="Acme Pvt Ltd" /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Trade Name / Brand</label>
                <input value={form.trade_name||''} onChange={e=>setForm((f:any)=>({...f,trade_name:e.target.value}))} className={inp} placeholder="ACME" /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Type</label>
                <select value={form.company_type||''} onChange={e=>setForm((f:any)=>({...f,company_type:e.target.value}))} className={inp}>
                  <option value="">Select</option>
                  {['pvt_ltd','llp','partnership','sole_prop','public','ngo','trust','huf'].map(t=><option key={t} value={t}>{t.replace('_',' ').toUpperCase()}</option>)}
                </select></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country *</label>
              <select value={form.country_code||'IN'} onChange={e=>onCountryChange(e.target.value)} className={inp}>
                {COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.name} ({c.currency})</option>)}
              </select>
              <p className="text-xs text-slate-400 mt-1">Sets currency, timezone, tax fields, and fiscal year automatically</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address Line 1</label>
                <input value={form.address_line1||''} onChange={e=>setForm((f:any)=>({...f,address_line1:e.target.value}))} className={inp} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address Line 2</label>
                <input value={form.address_line2||''} onChange={e=>setForm((f:any)=>({...f,address_line2:e.target.value}))} className={inp} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
                <input value={form.city||''} onChange={e=>setForm((f:any)=>({...f,city:e.target.value}))} className={inp} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">State / Province</label>
                <input value={form.state||''} onChange={e=>setForm((f:any)=>({...f,state:e.target.value}))} className={inp} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Postal Code</label>
                <input value={form.postal_code||''} onChange={e=>setForm((f:any)=>({...f,postal_code:e.target.value}))} className={inp} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Industry</label>
                <input value={form.industry||''} onChange={e=>setForm((f:any)=>({...f,industry:e.target.value}))} className={inp} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input value={form.phone||''} onChange={e=>setForm((f:any)=>({...f,phone:e.target.value}))} className={inp} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input value={form.email||''} onChange={e=>setForm((f:any)=>({...f,email:e.target.value}))} className={inp} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Website</label>
                <input value={form.website||''} onChange={e=>setForm((f:any)=>({...f,website:e.target.value}))} className={inp} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Logo URL</label>
                <input value={form.logo_url||''} onChange={e=>setForm((f:any)=>({...f,logo_url:e.target.value}))} placeholder="https://..." className={inp} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Brand Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.brand_color||'#6366f1'} onChange={e=>setForm((f:any)=>({...f,brand_color:e.target.value}))} className="w-12 h-10 rounded-lg cursor-pointer border border-slate-200" />
                  <input value={form.brand_color||'#6366f1'} onChange={e=>setForm((f:any)=>({...f,brand_color:e.target.value}))} className={inp} />
                </div></div>
            </div>
          </div>
        )}

        {/* TAX & LEGAL */}
        {tab==='tax' && (
          <div className="space-y-5">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Tax registrations for: <strong>{form.country||'India'}</strong>
                {form.currency && ` · Currency: ${form.currency} (${form.currency_symbol})`}
              </p>
              <p className="text-xs text-blue-600 mt-1">These appear on all invoices, purchase orders and official documents.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {currentTaxFields.map(field => (
                <div key={field.label}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{field.label}</label>
                  <input value={taxRegs[field.label.toLowerCase().replace(/[^a-z]/g,'_')]||taxRegs[field.label]||''}
                    onChange={e=>setTaxRegs(t=>({...t,[field.label]:e.target.value}))}
                    placeholder={field.placeholder} className={`${inp} font-mono`} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                <input value={form.currency||''} onChange={e=>setForm((f:any)=>({...f,currency:e.target.value}))} className={inp} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency Symbol</label>
                <input value={form.currency_symbol||''} onChange={e=>setForm((f:any)=>({...f,currency_symbol:e.target.value}))} className={inp} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Timezone</label>
                <input value={form.timezone||''} onChange={e=>setForm((f:any)=>({...f,timezone:e.target.value}))} className={inp} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fiscal Year Start (MM-DD)</label>
                <input value={form.fiscal_year_start||'04-01'} onChange={e=>setForm((f:any)=>({...f,fiscal_year_start:e.target.value}))} className={inp} placeholder="04-01" /></div>
            </div>
          </div>
        )}

        {/* BANK DETAILS */}
        {tab==='bank' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
                <input value={form.bank_name||''} onChange={e=>setForm((f:any)=>({...f,bank_name:e.target.value}))} className={inp} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Account Number</label>
                <input value={form.bank_account||''} onChange={e=>setForm((f:any)=>({...f,bank_account:e.target.value}))} className={`${inp} font-mono`} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">IFSC / Sort Code / Routing No.</label>
                <input value={form.bank_ifsc||''} onChange={e=>setForm((f:any)=>({...f,bank_ifsc:e.target.value}))} className={`${inp} font-mono`} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Branch</label>
                <input value={form.bank_branch||''} onChange={e=>setForm((f:any)=>({...f,bank_branch:e.target.value}))} className={inp} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">SWIFT / BIC Code</label>
                <input value={form.swift_code||''} onChange={e=>setForm((f:any)=>({...f,swift_code:e.target.value}))} className={`${inp} font-mono`} /></div>
              <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">IBAN (International)</label>
                <input value={form.iban||''} onChange={e=>setForm((f:any)=>({...f,iban:e.target.value}))} className={`${inp} font-mono`} /></div>
            </div>
          </div>
        )}

        {/* DOCUMENT SETTINGS */}
        {tab==='documents' && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-4">
              {[['Invoice Prefix','invoice_prefix','INV'],['Sales Order Prefix','so_prefix','SO'],['Purchase Order Prefix','po_prefix','PO'],['Quotation Prefix','quotation_prefix','QT']].map(([label,field,ph])=>(
                <div key={field}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
                  <input value={form[field]||ph} onChange={e=>setForm((f:any)=>({...f,[field]:e.target.value}))} className={`${inp} font-mono`} placeholder={ph} />
                </div>
              ))}
            </div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default Payment Terms</label>
              <select value={form.default_payment_terms||'30 days'} onChange={e=>setForm((f:any)=>({...f,default_payment_terms:e.target.value}))} className={inp}>
                {['Immediate','7 days','15 days','30 days','45 days','60 days','90 days','Advance'].map(t=><option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Invoice Footer Text</label>
              <textarea value={form.invoice_footer||''} onChange={e=>setForm((f:any)=>({...f,invoice_footer:e.target.value}))} rows={2} className={inp} placeholder="Thank you for your business..." /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Terms & Conditions</label>
              <textarea value={form.terms_conditions||''} onChange={e=>setForm((f:any)=>({...f,terms_conditions:e.target.value}))} rows={4} className={inp} /></div>
          </div>
        )}

        {/* SALARY STRUCTURES */}
        {tab==='salary' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Salary structures for different countries. Employees can be assigned to a structure.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {structures.map(s=>(
                <div key={s.id} className="border border-slate-200 dark:border-slate-600 rounded-2xl p-4 hover:border-indigo-300 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{s.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{s.country} · {s.currency}</div>
                    </div>
                    {s.is_default && <Badge label="Default" color="green" />}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {s.earnings_count} earnings · {s.deductions_count} deductions
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
