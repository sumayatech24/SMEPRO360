import React, { useState, useEffect, useCallback, useRef } from 'react';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface PayrollRun { id:number; run_number:string; period_label:string; month:number; year:number; status:string; total_employees:number; total_gross:number; total_net:number; processed_at:string; }
interface Payslip { id:number; employee_id:number; employee_name:string; employee_number:string; month:number; year:number; paid_days:number; lop_days:number; earnings:Record<string,number>; gross_salary:number; deductions:Record<string,number>; total_deductions:number; tax_deducted:number; net_salary:number; employer_pf:number; status:string; payment_date:string; }

const STATUS_COLORS: Record<string,string> = { draft:'gray', processing:'blue', approved:'indigo', paid:'green', locked:'slate' };
const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function GlobalPayrollPage() {
  const [tab, setTab] = useState<'runs'|'payslips'|'calculator'|'form16'>('runs');
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun|null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [runModal, setRunModal] = useState(false);
  const [printModal, setPrintModal] = useState<Payslip|null>(null);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [form16Data, setForm16Data] = useState<any>(null);
  const [runForm, setRunForm] = useState({ month:new Date().getMonth()+1, year:new Date().getFullYear() });
  const [calcForm, setCalcForm] = useState({ country:'India', annual_income:'', regime:'new', deductions_80c:'150000', deductions_80d:'25000' });
  const [calcResult, setCalcResult] = useState<any>(null);
  const [form16Form, setForm16Form] = useState({ employee_id:'', year:new Date().getFullYear(), regime:'new', deductions_80c:'150000', deductions_80d:'25000' });
  const [employees, setEmployees] = useState<any[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, cpRes, empRes] = await Promise.all([
        api.get('/payroll-v2/payroll-run'),
        api.get('/payroll-v2/company-profile'),
        api.get('/hr/employees', { params:{limit:200} }),
      ]);
      setRuns(rRes.data || []);
      setCompanyProfile(cpRes.data);
      setEmployees(empRes.data.items || empRes.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadPayslips = async (runId: number) => {
    const r = await api.get(`/payroll-v2/payslips/${runId}`);
    setPayslips(r.data || []);
  };

  const runPayroll = async () => {
    try {
      const res = await api.post('/payroll-v2/payroll-run', { month:runForm.month, year:runForm.year });
      toast.success(`Payroll processed! ${res.data.employees_processed} employees · ₹${(res.data.total_net||0).toLocaleString('en-IN')} net`);
      setRunModal(false); load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed to run payroll'); }
  };

  const approveRun = async (runId: number) => {
    await api.put(`/payroll-v2/payroll-run/${runId}/approve`);
    toast.success('Payroll approved'); load();
  };

  const markPaid = async (runId: number) => {
    await api.put(`/payroll-v2/payroll-run/${runId}/mark-paid`, { payment_ref:`NEFT/${new Date().toISOString().split('T')[0]}` });
    toast.success('Payroll marked as paid'); load();
  };

  const calcTax = async () => {
    if (!calcForm.annual_income) return toast.error('Enter annual income');
    try {
      const res = await api.post('/payroll-v2/tax-calculator', {
        country: calcForm.country, annual_income: Number(calcForm.annual_income),
        regime: calcForm.regime,
        deductions_80c: Number(calcForm.deductions_80c)||0,
        deductions_80d: Number(calcForm.deductions_80d)||0,
      });
      setCalcResult(res.data);
    } catch(e:any){ toast.error('Calculation failed'); }
  };

  const generateForm16 = async () => {
    if (!form16Form.employee_id) return toast.error('Select employee');
    try {
      const res = await api.post(`/payroll-v2/form16/generate/${form16Form.employee_id}`, {
        year: form16Form.year, regime: form16Form.regime,
        deductions_80c: Number(form16Form.deductions_80c)||0,
        deductions_80d: Number(form16Form.deductions_80d)||0,
      });
      setForm16Data(res.data); toast.success('Form 16 generated!');
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const printPayslip = () => {
    if (!printRef.current) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Payslip</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;font-size:11px} table{width:100%;border-collapse:collapse} td,th{padding:6px 10px;border:1px solid #e2e8f0} th{background:#f8fafc;font-weight:600} .total{font-weight:700;font-size:13px} @media print{body{margin:0}}</style>
      </head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close(); w.print();
  };

  const sym = companyProfile?.currency_symbol || '₹';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Global Payroll</h1>
          <p className="text-slate-500 text-sm mt-1">Multi-country payroll, payslips, tax calculation & Form 16</p>
        </div>
        <button onClick={()=>setRunModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">▶ Run Payroll</button>
      </div>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-wrap">
        {([['runs','📊 Payroll Runs'],['payslips','📄 Payslips'],['calculator','🧮 Tax Calculator'],['form16','📋 Form 16 / Tax Cert']] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===t?'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>{label}</button>
        ))}
      </div>

      {/* ── PAYROLL RUNS ── */}
      {tab==='runs' && (
        <div className="space-y-3">
          {loading ? <div className="text-center text-slate-400 py-10">Loading...</div> :
          runs.length===0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-16 text-center shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="text-4xl mb-3">💰</div>
              <div className="text-slate-500 font-medium">No payroll runs yet</div>
              <button onClick={()=>setRunModal(true)} className="mt-4 gradient-bg text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90">▶ Run First Payroll</button>
            </div>
          ) : runs.map(run=>(
            <div key={run.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">📅</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">{run.period_label}</span>
                      <span className="font-mono text-xs text-slate-400">{run.run_number}</span>
                      <Badge label={run.status} color={STATUS_COLORS[run.status] as any || 'gray'} />
                    </div>
                    <div className="flex gap-6 mt-2 text-sm text-slate-600 dark:text-slate-400">
                      <span>👥 {run.total_employees} employees</span>
                      <span>Gross: <strong>{sym}{(run.total_gross||0).toLocaleString('en-IN')}</strong></span>
                      <span>Net Pay: <strong className="text-green-600">{sym}{(run.total_net||0).toLocaleString('en-IN')}</strong></span>
                    </div>
                    {run.processed_at && <div className="text-xs text-slate-400 mt-1">Processed: {new Date(run.processed_at).toLocaleString('en-IN')}</div>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>{setSelectedRun(run);loadPayslips(run.id);setTab('payslips');}} className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200">View Payslips</button>
                  {run.status==='draft' && <button onClick={()=>approveRun(run.id)} className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium">✓ Approve</button>}
                  {run.status==='approved' && <button onClick={()=>markPaid(run.id)} className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-medium">💳 Mark Paid</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PAYSLIPS ── */}
      {tab==='payslips' && (
        <div className="space-y-4">
          {!selectedRun && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
              ⚠️ Select a payroll run from the Runs tab to view payslips
            </div>
          )}
          {selectedRun && (
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-800 dark:text-slate-100">
                Payslips — {selectedRun.period_label} ({payslips.length} employees)
              </div>
              <Badge label={selectedRun.status} color={STATUS_COLORS[selectedRun.status] as any} />
            </div>
          )}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-100 dark:border-slate-600">
                  <tr>{['Employee','Emp #','Paid Days','LOP','Gross','PF','TDS','Prof Tax','Net Pay','Status',''].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {payslips.map(p=>(
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{p.employee_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.employee_number}</td>
                      <td className="px-4 py-3">{p.paid_days}</td>
                      <td className="px-4 py-3 text-red-500">{p.lop_days>0?p.lop_days:'—'}</td>
                      <td className="px-4 py-3">{sym}{(p.gross_salary||0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-slate-500">{sym}{(p.deductions?.PF_EMP||0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-orange-500">{sym}{(p.tax_deducted||0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-slate-500">{sym}{(p.deductions?.PROFESSIONAL_TAX||p.deductions?.PT||0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 font-bold text-green-600">{sym}{(p.net_salary||0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3"><Badge label={p.status} color={p.status==='paid'?'green':p.status==='approved'?'blue':'gray'} /></td>
                      <td className="px-4 py-3">
                        <button onClick={()=>setPrintModal(p)} className="text-xs px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">🖨️ Print</button>
                      </td>
                    </tr>
                  ))}
                  {payslips.length===0 && <tr><td colSpan={11} className="text-center py-10 text-slate-400">No payslips. Select a run first.</td></tr>}
                </tbody>
                {payslips.length>0 && (
                  <tfoot className="bg-slate-50 dark:bg-slate-700 border-t-2 border-slate-200 dark:border-slate-600">
                    <tr className="font-bold text-sm">
                      <td className="px-4 py-3" colSpan={4}>Total ({payslips.length})</td>
                      <td className="px-4 py-3">{sym}{payslips.reduce((s,p)=>s+(p.gross_salary||0),0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">{sym}{payslips.reduce((s,p)=>s+(p.deductions?.PF_EMP||0),0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">{sym}{payslips.reduce((s,p)=>s+(p.tax_deducted||0),0).toLocaleString('en-IN')}</td>
                      <td />
                      <td className="px-4 py-3 text-green-600">{sym}{payslips.reduce((s,p)=>s+(p.net_salary||0),0).toLocaleString('en-IN')}</td>
                      <td colSpan={2}/>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAX CALCULATOR ── */}
      {tab==='calculator' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Income Tax Calculator</h3>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country</label>
              <select value={calcForm.country} onChange={e=>setCalcForm(f=>({...f,country:e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['India','USA','UK','UAE','Australia','Singapore','Canada','Germany'].map(c=><option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Annual Income ({sym})</label>
              <input type="number" value={calcForm.annual_income} onChange={e=>setCalcForm(f=>({...f,annual_income:e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none" placeholder="e.g. 1200000" /></div>
            {calcForm.country==='India' && (
              <>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tax Regime</label>
                  <div className="flex gap-3">
                    {['new','old'].map(r=>(
                      <button key={r} type="button" onClick={()=>setCalcForm(f=>({...f,regime:r}))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${calcForm.regime===r?'border-indigo-500 bg-indigo-50 text-indigo-700':'border-slate-200 text-slate-500'}`}>
                        {r==='new'?'New Regime (Default)':'Old Regime (with deductions)'}
                      </button>
                    ))}
                  </div></div>
                {calcForm.regime==='old' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">80C Deductions</label>
                      <input type="number" value={calcForm.deductions_80c} onChange={e=>setCalcForm(f=>({...f,deductions_80c:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">80D Deductions</label>
                      <input type="number" value={calcForm.deductions_80d} onChange={e=>setCalcForm(f=>({...f,deductions_80d:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
                  </div>
                )}
              </>
            )}
            <button onClick={calcTax} className="w-full gradient-bg text-white rounded-xl py-3 font-medium hover:opacity-90">Calculate Tax</button>
          </div>

          {calcResult && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Tax Breakdown — {calcResult.country}</h3>
              {calcResult.note && <div className="bg-green-50 rounded-xl p-3 text-green-700 text-sm mb-3">{calcResult.note}</div>}
              <div className="space-y-2">
                {[
                  {label:'Annual Income', value:`${sym}${(calcResult.annual_income||0).toLocaleString('en-IN')}`},
                  calcResult.deductions_applied && {label:'Standard Deduction', value:`-${sym}${(calcResult.deductions_applied?.standard||0).toLocaleString('en-IN')}`},
                  calcResult.taxable_income && {label:'Taxable Income', value:`${sym}${calcResult.taxable_income.toLocaleString('en-IN')}`},
                  calcResult.rebate_87a>0 && {label:'Rebate u/s 87A', value:`-${sym}${(calcResult.rebate_87a||0).toLocaleString('en-IN')}`,color:'green'},
                  calcResult.income_tax !== undefined && {label:'Income Tax', value:`${sym}${(calcResult.income_tax||0).toLocaleString('en-IN')}`},
                  calcResult.surcharge>0 && {label:'Surcharge', value:`${sym}${(calcResult.surcharge||0).toLocaleString('en-IN')}`},
                  calcResult.cess_4pct>0 && {label:'H&E Cess (4%)', value:`${sym}${(calcResult.cess_4pct||0).toLocaleString('en-IN')}`},
                  calcResult.federal_tax && {label:'Federal Tax', value:`${sym}${(calcResult.federal_tax||0).toLocaleString('en-IN')}`},
                  calcResult.state_tax && {label:'State Tax', value:`${sym}${(calcResult.state_tax||0).toLocaleString('en-IN')}`},
                  calcResult.fica_social_security_medicare && {label:'FICA (SS + Medicare)', value:`${sym}${(calcResult.fica_social_security_medicare||0).toLocaleString('en-IN')}`},
                  calcResult.national_insurance && {label:'National Insurance', value:`${sym}${(calcResult.national_insurance||0).toLocaleString('en-IN')}`},
                ].filter(Boolean).map((row:any,i)=>(
                  <div key={i} className="flex justify-between text-sm border-b border-slate-50 dark:border-slate-700 pb-1">
                    <span className="text-slate-500 dark:text-slate-400">{row.label}</span>
                    <span className={`font-medium ${row.color==='green'?'text-green-600':''}`}>{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200 dark:border-slate-600">
                  <span>Total Annual Tax</span>
                  <span className="text-red-500">{sym}{(calcResult.total_annual_tax||0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-3 py-2">
                  <span>Monthly TDS</span>
                  <span>{sym}{(calcResult.monthly_tds||0).toLocaleString('en-IN')}</span>
                </div>
                {calcResult.regime && <div className="text-xs text-slate-400 text-center mt-2">Calculated under {calcResult.regime.toUpperCase()} regime · FY 2025-26</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FORM 16 ── */}
      {tab==='form16' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Generate Form 16 (India)</h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
              Form 16 is an annual TDS certificate issued by employer to employee for the financial year.
            </div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee *</label>
              <select value={form16Form.employee_id} onChange={e=>setForm16Form(f=>({...f,employee_id:e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                <option value="">Select Employee</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_number})</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Financial Year</label>
                <select value={form16Form.year} onChange={e=>setForm16Form(f=>({...f,year:Number(e.target.value)}))} className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  {[2024,2025,2026].map(y=><option key={y} value={y}>FY {y-1}-{String(y).slice(2)} (AY {y}-{String(y+1).slice(2)})</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tax Regime</label>
                <select value={form16Form.regime} onChange={e=>setForm16Form(f=>({...f,regime:e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                  <option value="new">New Regime</option><option value="old">Old Regime</option>
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">80C (PF, LIC, ELSS...)</label>
                <input type="number" value={form16Form.deductions_80c} onChange={e=>setForm16Form(f=>({...f,deductions_80c:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">80D (Medical Ins.)</label>
                <input type="number" value={form16Form.deductions_80d} onChange={e=>setForm16Form(f=>({...f,deductions_80d:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
            </div>
            <button onClick={generateForm16} className="w-full gradient-bg text-white rounded-xl py-3 font-medium hover:opacity-90">Generate Form 16</button>
          </div>

          {form16Data && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Form 16 — {form16Data.financial_year}</h3>
                <button onClick={()=>window.print()} className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">🖨️ Print</button>
              </div>
              <div className="space-y-1 text-sm">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3 mb-3">
                  <div className="font-semibold">{form16Data.employee?.name}</div>
                  <div className="text-slate-500">PAN: {form16Data.employee?.pan||'—'} · AY: {form16Data.assessment_year}</div>
                </div>
                <div className="font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase mt-3 mb-2">PART B — SALARY DETAILS</div>
                {[
                  {label:'Gross Salary', value:form16Data.part_b?.gross_salary},
                  {label:'Less: Standard Deduction', value:`-${form16Data.part_b?.standard_deduction||50000}`},
                  {label:'Less: 80C Deductions', value:`-${form16Data.part_b?.deductions_80c||0}`},
                  {label:'Less: 80D Deductions', value:`-${form16Data.part_b?.deductions_80d||0}`},
                  {label:'Net Taxable Income', value:form16Data.part_b?.taxable_income, bold:true},
                  {label:'Tax on Income', value:form16Data.part_b?.tax_on_income},
                  {label:'Surcharge', value:form16Data.part_b?.surcharge||0},
                  {label:'H&E Cess (4%)', value:form16Data.part_b?.cess},
                  {label:'Total Tax Payable', value:form16Data.part_b?.total_tax_payable, bold:true},
                  {label:'Less: TDS by Employer', value:`-${form16Data.part_b?.tax_deducted_by_employer||0}`, color:'green'},
                ].map((r:any,i)=>(
                  <div key={i} className={`flex justify-between py-1.5 border-b border-slate-50 dark:border-slate-700 ${r.bold?'font-bold':''}`}>
                    <span className="text-slate-600 dark:text-slate-400">{r.label}</span>
                    <span className={r.color==='green'?'text-green-600':r.bold?'text-slate-800 dark:text-slate-100':'text-slate-700 dark:text-slate-300'}>
                      ₹{Number(r.value||0).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 mt-3">
                  <div className="text-xs text-indigo-600 font-semibold">PART A — TDS CERTIFICATE</div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm">Total Tax Deducted by Employer</span>
                    <span className="font-bold text-indigo-600">₹{Number(form16Data.part_a?.total_tax_deducted||0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Employer TAN: {form16Data.employer?.tan||'—'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── RUN PAYROLL MODAL ── */}
      <Modal isOpen={runModal} onClose={()=>setRunModal(false)} title="Run Payroll" size="md">
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">
            ⚠️ This will compute payslips for all active employees for the selected month.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Month</label>
              <select value={runForm.month} onChange={e=>setRunForm(f=>({...f,month:Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Year</label>
              <select value={runForm.year} onChange={e=>setRunForm(f=>({...f,year:Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
              </select></div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setRunModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={runPayroll} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">▶ Run Payroll for {MONTHS[runForm.month]} {runForm.year}</button>
          </div>
        </div>
      </Modal>

      {/* ── PAYSLIP PRINT MODAL ── */}
      {printModal && (
        <Modal isOpen={!!printModal} onClose={()=>setPrintModal(null)} title={`Payslip — ${printModal.employee_name} · ${MONTHS[printModal.month]} ${printModal.year}`} size="xl">
          <div className="space-y-4">
            <div ref={printRef}>
              {/* Payslip HTML for printing */}
              <div style={{fontFamily:'Arial,sans-serif',fontSize:'11px',color:'#000'}}>
                {/* Header */}
                <div style={{display:'flex',justifyContent:'space-between',borderBottom:'2px solid #6366f1',paddingBottom:'12px',marginBottom:'12px'}}>
                  <div>
                    <div style={{fontSize:'16px',fontWeight:'900',color:'#6366f1'}}>{companyProfile?.trade_name||companyProfile?.legal_name||'Company'}</div>
                    <div style={{fontSize:'11px',color:'#64748b'}}>{companyProfile?.address_line1}, {companyProfile?.city}</div>
                    {companyProfile?.tax_registrations?.gstin && <div style={{fontWeight:'700',fontSize:'10px'}}>GSTIN: {companyProfile.tax_registrations.gstin}</div>}
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'14px',fontWeight:'700',color:'#1e293b'}}>SALARY PAYSLIP</div>
                    <div style={{color:'#64748b'}}>For the month of {MONTHS[printModal.month]} {printModal.year}</div>
                    <div style={{color:'#64748b'}}>Status: <strong style={{color:printModal.status==='paid'?'#10b981':'#f59e0b'}}>{printModal.status?.toUpperCase()}</strong></div>
                  </div>
                </div>
                {/* Employee Info */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',backgroundColor:'#f8fafc',padding:'10px',borderRadius:'6px',marginBottom:'12px'}}>
                  <div><span style={{color:'#64748b'}}>Employee: </span><strong>{printModal.employee_name}</strong></div>
                  <div><span style={{color:'#64748b'}}>Emp No: </span><strong>{printModal.employee_number}</strong></div>
                  <div><span style={{color:'#64748b'}}>Paid Days: </span><strong>{printModal.paid_days}</strong></div>
                  <div><span style={{color:'#64748b'}}>LOP Days: </span><strong style={{color:'#ef4444'}}>{printModal.lop_days||0}</strong></div>
                  {printModal.payment_date && <div><span style={{color:'#64748b'}}>Payment Date: </span><strong>{new Date(printModal.payment_date).toLocaleDateString('en-IN')}</strong></div>}
                </div>
                {/* Earnings & Deductions */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'12px'}}>
                  <div>
                    <div style={{backgroundColor:'#6366f1',color:'#fff',padding:'6px 10px',fontWeight:'700',borderRadius:'4px',marginBottom:'4px'}}>EARNINGS</div>
                    <table style={{width:'100%',fontSize:'11px'}}>
                      <tbody>
                        {Object.entries(printModal.earnings||{}).map(([k,v]:any)=>(
                          <tr key={k} style={{borderBottom:'1px solid #f1f5f9'}}>
                            <td style={{padding:'4px 6px',color:'#475569'}}>{k.replace(/_/g,' ')}</td>
                            <td style={{padding:'4px 6px',textAlign:'right'}}>{sym}{Number(v).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        <tr style={{fontWeight:'700',borderTop:'2px solid #e2e8f0'}}>
                          <td style={{padding:'6px'}}>GROSS SALARY</td>
                          <td style={{padding:'6px',textAlign:'right'}}>{sym}{(printModal.gross_salary||0).toLocaleString('en-IN')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div style={{backgroundColor:'#ef4444',color:'#fff',padding:'6px 10px',fontWeight:'700',borderRadius:'4px',marginBottom:'4px'}}>DEDUCTIONS</div>
                    <table style={{width:'100%',fontSize:'11px'}}>
                      <tbody>
                        {Object.entries(printModal.deductions||{}).map(([k,v]:any)=>(
                          <tr key={k} style={{borderBottom:'1px solid #f1f5f9'}}>
                            <td style={{padding:'4px 6px',color:'#475569'}}>{k.replace(/_/g,' ')}</td>
                            <td style={{padding:'4px 6px',textAlign:'right',color:'#ef4444'}}>{sym}{Number(v).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        <tr style={{fontWeight:'700',borderTop:'2px solid #e2e8f0'}}>
                          <td style={{padding:'6px'}}>TOTAL DEDUCTIONS</td>
                          <td style={{padding:'6px',textAlign:'right',color:'#ef4444'}}>{sym}{(printModal.total_deductions||0).toLocaleString('en-IN')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Net Pay */}
                <div style={{backgroundColor:'#10b981',color:'#fff',display:'flex',justifyContent:'space-between',padding:'12px 16px',borderRadius:'8px',fontSize:'16px',fontWeight:'900'}}>
                  <span>NET TAKE HOME PAY</span>
                  <span>{sym}{(printModal.net_salary||0).toLocaleString('en-IN')}</span>
                </div>
                <div style={{marginTop:'8px',fontSize:'10px',color:'#94a3b8',textAlign:'center'}}>This is a computer generated payslip. No signature required.</div>
              </div>
            </div>
            <button onClick={printPayslip} className="w-full gradient-bg text-white rounded-xl py-3 font-medium hover:opacity-90">🖨️ Print / Download Payslip</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
