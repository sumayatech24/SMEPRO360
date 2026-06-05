import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface LeaveType { id: number; name: string; code: string; leave_category: string; country: string; applicable_states: string; gender_specific: string; default_days_per_year: number; is_paid: boolean; is_carry_forward: boolean; is_encashable: boolean; requires_medical_certificate: boolean; min_days: number; notice_days: number; is_active: boolean; }
interface Holiday { id: number; name: string; date: string; day_of_week: string; is_optional: boolean; is_paid: boolean; applicable_states: string; applicable_religions: string; holiday_type_name: string; description: string; }
interface LeaveBalance { id: number; leave_type_id: number; leave_type_name: string; leave_type_code: string; year: number; opening_balance: number; accrued: number; availed: number; pending: number; closing_balance: number; }
interface Employee { id: number; first_name: string; last_name: string; employee_number: string; }

const CAT_COLORS: Record<string,string> = { general:'blue', medical:'green', maternity:'pink', paternity:'indigo', bereavement:'gray', comp_off:'yellow', wfh:'purple', on_duty:'orange' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function LeaveModulePage() {
  const [tab, setTab] = useState<'types'|'holidays'|'balance'|'apply'>('holidays');
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(2026);
  const [filterState, setFilterState] = useState('ALL');
  const [filterOptional, setFilterOptional] = useState<boolean|null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number|null>(null);
  const [ltModal, setLtModal] = useState(false);
  const [holidayModal, setHolidayModal] = useState(false);
  const [balanceEmpId, setBalanceEmpId] = useState('');
  const [ltForm, setLtForm] = useState({ name:'', code:'', leave_category:'general', applicable_states:'ALL', gender_specific:'all', default_days_per_year:0, is_paid:true, is_carry_forward:false, max_carry_forward:0, is_encashable:false, requires_medical_certificate:false, min_days:0.5, notice_days:0, description:'' });
  const [holidayForm, setHolidayForm] = useState({ holiday_type_id:'', name:'', date:'', applicable_states:'ALL', applicable_religions:'', is_optional:false, description:'' });
  const [holidayTypes, setHolidayTypes] = useState<any[]>([]);
  const [applyForm, setApplyForm] = useState({ employee_id:'', leave_type_id:'', from_date:'', to_date:'', reason:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { year: filterYear, country: 'India' };
      if (filterOptional !== null) params.is_optional = filterOptional;
      if (filterState && filterState !== 'ALL') params.state = filterState;

      const [ltRes, holRes, empRes, htRes] = await Promise.all([
        api.get('/attendance-v2/leave-types'),
        api.get('/attendance-v2/holidays', { params }),
        api.get('/hr/employees', { params:{limit:100} }),
        api.get('/attendance-v2/holiday-types'),
      ]);
      setLeaveTypes(ltRes.data || []);
      setHolidays(holRes.data.items || []);
      setEmployees(empRes.data.items || empRes.data || []);
      setHolidayTypes(htRes.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [filterYear, filterState, filterOptional]);

  const loadBalance = async () => {
    if (!balanceEmpId) return toast.error('Select employee');
    try {
      const res = await api.get('/attendance-v2/leave-balance', { params:{employee_id:Number(balanceEmpId), year:filterYear} });
      setBalances(res.data || []);
    } catch(e:any){ toast.error('Failed to load balance'); }
  };

  useEffect(() => { load(); }, [load]);

  const createLeaveType = async () => {
    if (!ltForm.name || !ltForm.code) return toast.error('Fill required fields');
    try {
      await api.post('/attendance-v2/leave-types', ltForm);
      toast.success('Leave type created!'); setLtModal(false); load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const createHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date || !holidayForm.holiday_type_id) return toast.error('Fill required fields');
    try {
      await api.post('/attendance-v2/holidays', { ...holidayForm, holiday_type_id:Number(holidayForm.holiday_type_id) });
      toast.success('Holiday added!'); setHolidayModal(false); load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const initializeBalances = async () => {
    try {
      const res = await api.post('/attendance-v2/leave-balance/initialize', { year: filterYear });
      toast.success(res.data.message);
    } catch(e:any){ toast.error('Failed'); }
  };

  const submitLeave = async () => {
    if (!applyForm.employee_id || !applyForm.leave_type_id || !applyForm.from_date || !applyForm.to_date) return toast.error('Fill required fields');
    try {
      // Calculate days
      const from = new Date(applyForm.from_date);
      const to = new Date(applyForm.to_date);
      const days = Math.ceil((to.getTime() - from.getTime()) / (1000*60*60*24)) + 1;

      await api.post('/hr/leaves', {
        employee_id: Number(applyForm.employee_id),
        leave_type: leaveTypes.find(lt=>lt.id===Number(applyForm.leave_type_id))?.code||'CL',
        from_date: applyForm.from_date,
        to_date: applyForm.to_date,
        reason: applyForm.reason,
      });
      toast.success(`Leave applied for ${days} day(s)!`);
      setApplyForm({ employee_id:'', leave_type_id:'', from_date:'', to_date:'', reason:'' });
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  // Group holidays by month for calendar view
  const holidaysByMonth = holidays.reduce((acc, h) => {
    const m = new Date(h.date).getMonth();
    if (!acc[m]) acc[m] = [];
    acc[m].push(h);
    return acc;
  }, {} as Record<number, Holiday[]>);

  const mandatory = holidays.filter(h=>!h.is_optional);
  const optional = holidays.filter(h=>h.is_optional);

  const INDIAN_STATES = ['ALL','Maharashtra','Karnataka','Tamil Nadu','Kerala','Delhi','Gujarat','Rajasthan','Uttar Pradesh','West Bengal','Andhra Pradesh','Telangana','Punjab','Haryana','Bihar','Jharkhand','Assam','Odisha','Goa'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leave Module</h1>
          <p className="text-slate-500 text-sm mt-1">Leave types, holiday calendar & balance management</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterYear} onChange={e=>setFilterYear(Number(e.target.value))} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
            {[2024,2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {label:'Leave Types',value:leaveTypes.length,color:'text-indigo-600'},
          {label:'Total Holidays',value:holidays.length,color:'text-blue-600'},
          {label:'Mandatory',value:mandatory.length,color:'text-green-600'},
          {label:'Optional',value:optional.length,color:'text-yellow-600'},
        ].map(s=>(
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {([['holidays','📅 Holiday Calendar'],['types','📋 Leave Types'],['balance','⚖️ Leave Balance'],['apply','✉️ Apply Leave']] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===t?'bg-white text-indigo-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── HOLIDAY CALENDAR ── */}
      {tab==='holidays' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <select value={filterState} onChange={e=>setFilterState(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
              {INDIAN_STATES.map(s=><option key={s} value={s}>{s==='ALL'?'🇮🇳 All India':s}</option>)}
            </select>
            <button onClick={()=>setFilterOptional(null)} className={`px-3 py-2 rounded-xl text-sm font-medium border ${filterOptional===null?'border-indigo-400 bg-indigo-50 text-indigo-600':'border-slate-200 text-slate-500'}`}>All</button>
            <button onClick={()=>setFilterOptional(false)} className={`px-3 py-2 rounded-xl text-sm font-medium border ${filterOptional===false?'border-green-400 bg-green-50 text-green-600':'border-slate-200 text-slate-500'}`}>Mandatory</button>
            <button onClick={()=>setFilterOptional(true)} className={`px-3 py-2 rounded-xl text-sm font-medium border ${filterOptional===true?'border-yellow-400 bg-yellow-50 text-yellow-600':'border-slate-200 text-slate-500'}`}>Optional</button>
            <button onClick={()=>setHolidayModal(true)} className="ml-auto gradient-bg text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">+ Add Holiday</button>
          </div>

          {/* Month-wise calendar grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {MONTHS.map((monthName, monthIdx) => {
              const monthHolidays = holidaysByMonth[monthIdx] || [];
              if (monthHolidays.length === 0 && selectedMonth !== null && selectedMonth !== monthIdx) return null;
              return (
                <div key={monthIdx} className={`bg-white rounded-2xl shadow-sm border overflow-hidden cursor-pointer transition-all ${selectedMonth===monthIdx?'border-indigo-400 shadow-md':'border-slate-100 hover:border-slate-200'}`}
                  onClick={()=>setSelectedMonth(selectedMonth===monthIdx?null:monthIdx)}>
                  <div className={`px-4 py-2.5 flex items-center justify-between ${monthHolidays.length>0?'bg-indigo-600':'bg-slate-100'}`}>
                    <span className={`font-semibold text-sm ${monthHolidays.length>0?'text-white':'text-slate-500'}`}>{monthName}</span>
                    {monthHolidays.length>0 && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{monthHolidays.length}</span>}
                  </div>
                  {monthHolidays.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-300 italic">No holidays</div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {monthHolidays.map(h=>(
                        <div key={h.id} className="px-3 py-2.5 flex items-start gap-2">
                          <div className="text-center min-w-[36px]">
                            <div className="text-lg font-bold text-slate-800 leading-none">{new Date(h.date).getDate()}</div>
                            <div className="text-[9px] text-slate-400 uppercase">{h.day_of_week?.slice(0,3)}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-700 truncate">{h.name}</div>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {h.is_optional ? (
                                <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Optional</span>
                              ) : (
                                <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Mandatory</span>
                              )}
                              {h.applicable_religions && <span className="text-[9px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded">{h.applicable_religions}</span>}
                              {h.applicable_states !== 'ALL' && <span className="text-[9px] text-slate-400 truncate">{h.applicable_states.split(',')[0]}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LEAVE TYPES ── */}
      {tab==='types' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setLtModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Add Leave Type</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaveTypes.map(lt=>(
              <div key={lt.id} className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 ${!lt.is_active?'opacity-60':''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-slate-800">{lt.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{lt.code}</span>
                      <Badge label={lt.leave_category} color={CAT_COLORS[lt.leave_category] as any || 'gray'} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-800">{lt.default_days_per_year}<span className="text-xs font-normal text-slate-400"> days/yr</span></div>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {lt.is_paid && <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded">Paid</span>}
                  {!lt.is_paid && <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded">Unpaid</span>}
                  {lt.is_carry_forward && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Carry Forward</span>}
                  {lt.is_encashable && <span className="bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded">Encashable</span>}
                  {lt.requires_medical_certificate && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded">Medical Cert</span>}
                  {lt.gender_specific !== 'all' && <span className="bg-pink-50 text-pink-600 px-2 py-0.5 rounded capitalize">{lt.gender_specific} only</span>}
                </div>
                {lt.applicable_states !== 'ALL' && (
                  <div className="mt-2 text-xs text-slate-400">📍 {lt.applicable_states}</div>
                )}
                <div className="mt-2 text-xs text-slate-400">Min: {lt.min_days}d · Notice: {lt.notice_days}d</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LEAVE BALANCE ── */}
      {tab==='balance' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Employee</label>
              <select value={balanceEmpId} onChange={e=>setBalanceEmpId(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-w-48">
                <option value="">Select Employee</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_number})</option>)}
              </select>
            </div>
            <button onClick={loadBalance} className="gradient-bg text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90">Load Balance</button>
            <button onClick={initializeBalances} className="border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">Initialize All Balances for {filterYear}</button>
          </div>

          {balances.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {balances.map(b=>(
                <div key={b.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-slate-800">{b.leave_type_name}</div>
                      <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{b.leave_type_code}</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{b.closing_balance}</div>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      {label:'Opening',value:b.opening_balance,color:'text-slate-600'},
                      {label:'Accrued',value:b.accrued,color:'text-blue-600'},
                      {label:'Availed',value:b.availed,color:'text-red-500'},
                      {label:'Pending',value:b.pending,color:'text-yellow-600'},
                    ].map(row=>(
                      <div key={row.label} className="flex justify-between text-sm">
                        <span className="text-slate-400">{row.label}</span>
                        <span className={`font-medium ${row.color}`}>{row.value}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 pt-1.5 flex justify-between text-sm font-bold">
                      <span className="text-slate-700">Available</span>
                      <span className="text-green-600">{b.closing_balance}</span>
                    </div>
                    {/* Balance bar */}
                    <div className="h-2 bg-slate-100 rounded-full mt-2">
                      <div className="h-2 bg-green-400 rounded-full" style={{width:`${Math.min(100,b.availed/(b.opening_balance||1)*100)}%`}} />
                    </div>
                    <div className="text-xs text-slate-400 text-right">{b.availed} of {b.opening_balance} used</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── APPLY LEAVE ── */}
      {tab==='apply' && (
        <div className="max-w-xl">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="font-semibold text-slate-800">Apply for Leave</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
              <select value={applyForm.employee_id} onChange={e=>setApplyForm(f=>({...f,employee_id:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select Employee</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type *</label>
              <select value={applyForm.leave_type_id} onChange={e=>setApplyForm(f=>({...f,leave_type_id:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select Leave Type</option>
                {leaveTypes.filter(lt=>lt.is_active).map(lt=><option key={lt.id} value={lt.id}>{lt.name} ({lt.code}) — {lt.default_days_per_year} days/year</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Date *</label>
                <input type="date" value={applyForm.from_date} onChange={e=>setApplyForm(f=>({...f,from_date:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To Date *</label>
                <input type="date" value={applyForm.to_date} onChange={e=>setApplyForm(f=>({...f,to_date:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>
            {applyForm.from_date && applyForm.to_date && (
              <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-700">
                📅 Duration: <strong>{Math.ceil((new Date(applyForm.to_date).getTime()-new Date(applyForm.from_date).getTime())/(1000*60*60*24))+1} day(s)</strong>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
              <textarea value={applyForm.reason} onChange={e=>setApplyForm(f=>({...f,reason:e.target.value}))} rows={3} placeholder="Reason for leave..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <button onClick={submitLeave} className="w-full gradient-bg text-white rounded-xl py-3 font-medium hover:opacity-90">Submit Leave Application</button>
          </div>
        </div>
      )}

      {/* Leave Type Modal */}
      <Modal isOpen={ltModal} onClose={()=>setLtModal(false)} title="Add Leave Type" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Leave Name *</label>
              <input value={ltForm.name} onChange={e=>setLtForm(f=>({...f,name:e.target.value}))} placeholder="Annual Leave" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
              <input value={ltForm.code} onChange={e=>setLtForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="AL" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={ltForm.leave_category} onChange={e=>setLtForm(f=>({...f,leave_category:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['general','medical','maternity','paternity','bereavement','comp_off','wfh','on_duty'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Days Per Year</label>
              <input type="number" value={ltForm.default_days_per_year} onChange={e=>setLtForm(f=>({...f,default_days_per_year:Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select value={ltForm.gender_specific} onChange={e=>setLtForm(f=>({...f,gender_specific:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                <option value="all">All</option><option value="female">Female only</option><option value="male">Male only</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Applicable States (comma-separated or ALL)</label>
            <input value={ltForm.applicable_states} onChange={e=>setLtForm(f=>({...f,applicable_states:e.target.value}))} placeholder="ALL or Maharashtra,Tamil Nadu" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          </div>
          <div className="flex flex-wrap gap-4">
            {[['is_paid','Paid Leave'],['is_carry_forward','Carry Forward'],['is_encashable','Encashable'],['requires_medical_certificate','Medical Certificate']].map(([field,label])=>(
              <label key={field} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(ltForm as any)[field]} onChange={e=>setLtForm(f=>({...f,[field]:e.target.checked}))} className="w-4 h-4 rounded text-indigo-600" />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setLtModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={createLeaveType} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create Leave Type</button>
          </div>
        </div>
      </Modal>

      {/* Holiday Modal */}
      <Modal isOpen={holidayModal} onClose={()=>setHolidayModal(false)} title="Add Holiday" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Holiday Type *</label>
            <select value={holidayForm.holiday_type_id} onChange={e=>setHolidayForm(f=>({...f,holiday_type_id:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select Type</option>
              {holidayTypes.map(ht=><option key={ht.id} value={ht.id}>{ht.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Holiday Name *</label>
              <input value={holidayForm.name} onChange={e=>setHolidayForm(f=>({...f,name:e.target.value}))} placeholder="Diwali, Christmas..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input type="date" value={holidayForm.date} onChange={e=>setHolidayForm(f=>({...f,date:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Applicable States</label>
            <input value={holidayForm.applicable_states} onChange={e=>setHolidayForm(f=>({...f,applicable_states:e.target.value}))} placeholder="ALL or specific states" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Religion (Optional)</label>
            <input value={holidayForm.applicable_religions} onChange={e=>setHolidayForm(f=>({...f,applicable_religions:e.target.value}))} placeholder="Hindu, Muslim, Christian..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={holidayForm.is_optional} onChange={e=>setHolidayForm(f=>({...f,is_optional:e.target.checked}))} className="w-4 h-4 rounded text-indigo-600" />
            <span className="text-sm text-slate-700">Optional/Restricted Holiday (employee choice)</span>
          </label>
          <div className="flex gap-3">
            <button onClick={()=>setHolidayModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={createHoliday} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Add Holiday</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
