import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';
import toast from 'react-hot-toast';

const TABS = [
  {id:'home',icon:'🏠',label:'My Home'},
  {id:'attendance',icon:'📅',label:'Attendance'},
  {id:'leaves',icon:'🌴',label:'Leaves'},
  {id:'tasks',icon:'✔️',label:'Tasks'},
  {id:'projects',icon:'🚀',label:'Projects'},
  {id:'timesheets',icon:'⏱️',label:'Timesheets'},
  {id:'payslips',icon:'💰',label:'Payslips'},
  {id:'training',icon:'📚',label:'Training'},
  {id:'benefits',icon:'💎',label:'Benefits'},
  {id:'documents',icon:'📁',label:'Documents'},
  {id:'performance',icon:'⭐',label:'Performance'},
  {id:'approvals',icon:'✅',label:'Approvals'},
];

const inp = 'w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300';

export default function MySpacePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('home');
  const [dashboard, setDashboard] = useState<any>(null);
  const [tabData, setTabData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [projects_list, setProjectsList] = useState<any[]>([]);
  const [leaveModal, setLeaveModal] = useState(false);
  const [tsModal, setTsModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leave_type:'casual', from_date:'', to_date:'', reason:'' });
  const [tsForm, setTsForm] = useState({ project_id:'', date:new Date().toISOString().split('T')[0], hours:'', description:'', billable:true });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, pRes] = await Promise.all([
        api.get('/my-space/dashboard'),
        api.get('/projects/', { params:{limit:50} }),
      ]);
      setDashboard(dRes.data);
      setProjectsList(pRes.data.items || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, []);

  const loadTab = useCallback(async () => {
    if (tab === 'home') return;
    try {
      const TAB_API: Record<string,string> = {
        attendance:'/my-space/attendance', leaves:'/my-space/leaves',
        tasks:'/my-space/tasks', projects:'/my-space/projects',
        timesheets:'/my-space/timesheets', payslips:'/my-space/payslips',
        training:'/my-space/training', benefits:'/my-space/benefits',
        documents:'/my-space/documents', performance:'/my-space/performance',
      };
      if (TAB_API[tab]) {
        const r = await api.get(TAB_API[tab]);
        setTabData(r.data);
      } else if (tab === 'approvals') {
        const [i,m] = await Promise.all([api.get('/my-space/approvals/inbox'), api.get('/my-space/approvals/my-requests')]);
        setTabData({ inbox: i.data, my_requests: m.data });
      }
    } catch {}
  }, [tab]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { setTabData(null); loadTab(); }, [loadTab]);

  const checkIn = async () => {
    setCheckingIn(true);
    try { const r = await api.post('/my-space/attendance/checkin'); toast.success(r.data.message); loadDashboard(); }
    catch(e:any){ toast.error(e.response?.data?.detail||'Check-in failed'); }
    setCheckingIn(false);
  };

  const checkOut = async () => {
    setCheckingIn(true);
    try { const r = await api.post('/my-space/attendance/checkout'); toast.success(`${r.data.message} · ${r.data.hours_worked}h`); loadDashboard(); }
    catch(e:any){ toast.error(e.response?.data?.detail||'Check-out failed'); }
    setCheckingIn(false);
  };

  const applyLeave = async () => {
    if (!leaveForm.from_date || !leaveForm.to_date || !leaveForm.reason) return toast.error('Fill all fields');
    try {
      const r = await api.post('/my-space/leaves/apply', leaveForm);
      toast.success(r.data.message); setLeaveModal(false); loadTab(); loadDashboard();
      setLeaveForm({ leave_type:'casual', from_date:'', to_date:'', reason:'' });
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const logTs = async () => {
    if (!tsForm.project_id || !tsForm.hours) return toast.error('Select project and hours');
    try {
      await api.post('/my-space/timesheets/log', { ...tsForm, project_id:Number(tsForm.project_id), hours:Number(tsForm.hours) });
      toast.success('Time logged!'); setTsModal(false); loadTab();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const updateTask = async (taskId: number, updates: any) => {
    await api.put(`/my-space/tasks/${taskId}/progress`, updates);
    toast.success('Updated'); loadTab();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;

  const emp = dashboard?.employee;
  const today = dashboard?.today;
  const stats = dashboard?.stats;
  const checkedIn = today?.checked_in;
  const leaveDays = leaveForm.from_date && leaveForm.to_date ? Math.max(1, Math.ceil((new Date(leaveForm.to_date).getTime()-new Date(leaveForm.from_date).getTime())/(1000*60*60*24))+1) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-black">👋 {emp?.name?.split(' ')[0] || 'Welcome'}!</div>
            <div className="text-indigo-200 text-sm mt-1">{emp?.employee_number} · {emp?.email}</div>
            <div className="text-indigo-300 text-xs mt-0.5">{today?.day}, {today?.date}</div>
          </div>
          <div className="text-right">
            {!checkedIn ? (
              <button onClick={checkIn} disabled={checkingIn}
                className="bg-green-400 hover:bg-green-300 text-green-900 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-50">
                ▶ Check In
              </button>
            ) : (
              <div className="space-y-1">
                <div className="text-sm text-indigo-200">In: <strong className="text-white">{today?.check_in_time}</strong></div>
                {today?.check_out_time ? (
                  <div className="text-sm text-indigo-200">Out: <strong className="text-white">{today?.check_out_time}</strong> · {today?.hours_worked}h</div>
                ) : (
                  <button onClick={checkOut} disabled={checkingIn}
                    className="bg-red-400 hover:bg-red-300 text-red-900 px-4 py-2 rounded-xl font-bold text-sm shadow-lg">
                    ◼ Check Out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-5 pt-4 border-t border-white/20">
          {[
            {l:'Open Tasks',v:stats?.open_tasks||0,c:'text-yellow-300'},
            {l:'Projects',v:stats?.active_projects||0,c:'text-blue-300'},
            {l:'Leave Pending',v:stats?.pending_leaves||0,c:'text-orange-300'},
            {l:'Approvals',v:stats?.pending_approvals||0,c:'text-red-300'},
            {l:'Last Net Pay',v:stats?.latest_net_salary?`₹${(stats.latest_net_salary||0).toLocaleString('en-IN')}`:'—',c:'text-green-300'},
            {l:'Month',v:stats?.latest_pay_month||'—',c:'text-purple-300'},
          ].map(s=>(
            <div key={s.l} className="text-center">
              <div className={`text-lg font-black ${s.c}`}>{s.v}</div>
              <div className="text-[10px] text-indigo-300">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={()=>setLeaveModal(true)} className="flex-1 bg-white/15 hover:bg-white/25 text-white rounded-xl py-2 text-sm font-medium transition-all">🌴 Apply Leave</button>
          <button onClick={()=>setTsModal(true)} className="flex-1 bg-white/15 hover:bg-white/25 text-white rounded-xl py-2 text-sm font-medium transition-all">⏱️ Log Hours</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-2xl p-1.5 shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto scrollbar-thin">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tab===t.id?'bg-indigo-600 text-white shadow-sm':'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* HOME */}
      {tab==='home' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">My Profile</h3>
            <div className="space-y-2.5 text-sm">
              {[['Employee #',emp?.employee_number],['Email',emp?.email],['Phone',emp?.phone||'—'],
                ['Joined',emp?.date_of_joining?new Date(emp.date_of_joining).toLocaleDateString('en-IN'):'—'],
                ['Type',emp?.employment_type?.replace('_',' ')],['Status',emp?.status]].map(([l,v])=>(
                <div key={l as string} className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{l}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100 capitalize">{v||'—'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[['🌴','Apply Leave',()=>setLeaveModal(true),'indigo'],
                ['⏱️','Log Hours',()=>setTsModal(true),'green'],
                ['✅','View Approvals',()=>setTab('approvals'),'yellow'],
                ['⭐','My Performance',()=>setTab('performance'),'purple'],
              ].map(([icon,label,action,color])=>(
                <button key={label as string} onClick={action as any}
                  className={`p-4 rounded-xl border-2 border-${color}-100 bg-${color}-50 dark:bg-${color}-900/10 hover:border-${color}-300 transition-all text-left`}>
                  <div className="text-xl mb-1">{icon as string}</div>
                  <div className={`text-xs font-semibold text-${color}-700 dark:text-${color}-300`}>{label as string}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE */}
      {tab==='attendance' && tabData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[{l:'Present',v:tabData.summary?.present||0,c:'text-green-600'},{l:'Absent',v:tabData.summary?.absent||0,c:'text-red-500'},
              {l:'Late',v:tabData.summary?.late||0,c:'text-yellow-600'},{l:'Hours',v:`${tabData.summary?.total_hours||0}h`,c:'text-indigo-600'}].map(s=>(
              <div key={s.l} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
                <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div><div className="text-xs text-slate-500">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                {['Date','Day','Status','In','Out','Hrs'].map(h=><th key={h} className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {tabData.records?.map((r:any)=>(
                  <tr key={r.date}>
                    <td className="px-4 py-2.5">{new Date(r.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</td>
                    <td className="px-4 py-2.5 text-slate-400">{new Date(r.date).toLocaleDateString('en-IN',{weekday:'short'})}</td>
                    <td className="px-4 py-2.5"><Badge label={r.status} color={r.status==='present'?'green':r.status==='absent'?'red':'yellow'} /></td>
                    <td className="px-4 py-2.5 font-mono text-green-600 text-xs">{r.check_in||'—'}</td>
                    <td className="px-4 py-2.5 font-mono text-red-500 text-xs">{r.check_out||'—'}</td>
                    <td className="px-4 py-2.5 font-semibold">{r.hours_worked>0?`${r.hours_worked}h`:'—'}</td>
                  </tr>
                ))}
                {!tabData.records?.length && <tr><td colSpan={6} className="text-center py-8 text-slate-400">No attendance records this month</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEAVES */}
      {tab==='leaves' && tabData && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 text-sm">
              {[{l:'Total',v:tabData.summary?.total||0},{l:'Approved',v:tabData.summary?.approved||0,c:'text-green-600'},
                {l:'Pending',v:tabData.summary?.pending||0,c:'text-yellow-600'},{l:'Rejected',v:tabData.summary?.rejected||0,c:'text-red-500'}].map(s=>(
                <div key={s.l}><span className="text-slate-500">{s.l}: </span><span className={`font-bold ${(s as any).c||'text-slate-800 dark:text-slate-100'}`}>{s.v}</span></div>
              ))}
            </div>
            <button onClick={()=>setLeaveModal(true)} className="gradient-bg text-white px-4 py-2 rounded-xl text-sm font-medium">+ Apply</button>
          </div>
          <div className="space-y-3">
            {tabData.leaves?.map((l:any)=>(
              <div key={l.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100 capitalize">{l.leave_type} Leave · {l.days} day(s)</div>
                  <div className="text-sm text-slate-500">{new Date(l.from_date).toLocaleDateString('en-IN')} → {new Date(l.to_date).toLocaleDateString('en-IN')}</div>
                  {l.reason && <div className="text-xs text-slate-400 mt-0.5 italic">"{l.reason}"</div>}
                </div>
                <Badge label={l.status} color={l.status==='approved'?'green':l.status==='rejected'?'red':'yellow'} />
              </div>
            ))}
            {!tabData.leaves?.length && <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700">No leave applications</div>}
          </div>
        </div>
      )}

      {/* TASKS */}
      {tab==='tasks' && tabData && (
        <div className="space-y-3">
          <div className="flex gap-4 text-sm text-slate-500">
            {['todo','in_progress','review','done'].map(s=>(
              <span key={s} className="capitalize">{s.replace('_',' ')}: <strong className="text-slate-800 dark:text-slate-100">{tabData.tasks?.filter((t:any)=>t.status===s).length||0}</strong></span>
            ))}
          </div>
          {tabData.tasks?.map((task:any)=>(
            <div key={task.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{task.title}</div>
                  <div className="text-xs text-indigo-600">{task.project_name}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                      <div className="h-1.5 rounded-full bg-indigo-600" style={{width:`${task.percent_complete||0}%`}} />
                    </div>
                    <span className="text-xs text-slate-500">{task.percent_complete||0}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  <Badge label={task.priority} color={task.priority==='high'?'red':task.priority==='medium'?'yellow':'gray'} />
                  <select value={task.status} onChange={e=>updateTask(task.id,{status:e.target.value,percent_complete:e.target.value==='done'?100:task.percent_complete})}
                    className="text-xs border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-lg px-2 py-1">
                    {['todo','in_progress','review','done'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
          {!tabData.tasks?.length && <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700">No tasks assigned</div>}
        </div>
      )}

      {/* PROJECTS */}
      {tab==='projects' && tabData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tabData.projects?.map((p:any)=>(
            <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between mb-3">
                <div><div className="font-bold text-slate-800 dark:text-slate-100">{p.project_name}</div><div className="text-xs text-slate-400 mt-0.5">{p.role}</div></div>
                <div className="text-2xl font-black text-indigo-600">{p.allocation_percent}%</div>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full"><div className="h-1.5 bg-indigo-600 rounded-full" style={{width:`${Math.min(p.allocation_percent,100)}%`}} /></div>
              <div className="flex justify-between mt-2">
                <Badge label={p.project_status||p.status||'active'} color="blue" />
                {p.end_date && <span className="text-xs text-slate-400">Until {new Date(p.end_date).toLocaleDateString('en-IN')}</span>}
              </div>
            </div>
          ))}
          {!tabData.projects?.length && <div className="col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700">No project allocations</div>}
        </div>
      )}

      {/* TIMESHEETS */}
      {tab==='timesheets' && tabData && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 text-sm">
              <span>Total: <strong>{tabData.total_hours||0}h</strong></span>
              <span className="text-green-600">Billable: <strong>{tabData.billable_hours||0}h</strong></span>
            </div>
            <button onClick={()=>setTsModal(true)} className="gradient-bg text-white px-4 py-2 rounded-xl text-sm font-medium">+ Log Time</button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                {['Date','Project','Hours','Billable','Description'].map(h=><th key={h} className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {tabData.timesheets?.map((t:any)=>(
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-4 py-2.5">{new Date(t.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</td>
                    <td className="px-4 py-2.5 text-indigo-600">{t.project_name}</td>
                    <td className="px-4 py-2.5 font-bold">{t.hours}h</td>
                    <td className="px-4 py-2.5"><Badge label={t.billable?'Yes':'No'} color={t.billable?'green':'gray'} /></td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs truncate max-w-xs">{t.description||'—'}</td>
                  </tr>
                ))}
                {!tabData.timesheets?.length && <tr><td colSpan={5} className="text-center py-8 text-slate-400">No timesheets logged</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYSLIPS */}
      {tab==='payslips' && tabData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tabData.payslips?.map((p:any)=>(
            <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between mb-3">
                <div className="font-bold text-slate-800 dark:text-slate-100">{p.period}</div>
                <Badge label={p.status} color={p.status==='paid'?'green':'yellow'} />
              </div>
              <div className="space-y-1.5 text-sm">
                {[['Gross',`₹${(p.gross_salary||0).toLocaleString('en-IN')}`,''],['-Deductions',`-₹${(p.total_deductions||0).toLocaleString('en-IN')}`,'text-red-500'],['-TDS',`-₹${(p.tax_deducted||0).toLocaleString('en-IN')}`,'text-orange-500']].map(([l,v,c])=>(
                  <div key={l as string} className="flex justify-between"><span className="text-slate-500">{l}</span><span className={c as string}>{v}</span></div>
                ))}
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-600 pt-1.5 font-bold">
                  <span>Net Pay</span><span className="text-green-600">₹{(p.net_salary||0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          ))}
          {!tabData.payslips?.length && <div className="col-span-3 bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm">No payslips generated yet</div>}
        </div>
      )}

      {/* TRAINING */}
      {tab==='training' && tabData && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[{l:'Completed',v:tabData.completed||0,c:'text-green-600'},{l:'In Progress',v:tabData.in_progress||0,c:'text-blue-600'},{l:'Enrolled',v:tabData.enrolled||0,c:'text-indigo-600'}].map(s=>(
              <div key={s.l} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
                <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div><div className="text-xs text-slate-500">{s.l}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {tabData.enrollments?.map((e:any)=>(
              <div key={e.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{e.course_title}</div>
                  <div className="text-xs text-slate-400">{e.course_category} · {e.duration_hours}h</div>
                  {e.certification && <div className="text-xs text-indigo-600 mt-0.5">🎓 {e.certification}</div>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge label={e.status} color={e.status==='completed'?'green':e.status==='in_progress'?'blue':'gray'} />
                  {e.score && <span className="text-xs font-bold text-green-600">{e.score}%</span>}
                </div>
              </div>
            ))}
            {!tabData.enrollments?.length && <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm">No training enrollments</div>}
          </div>
        </div>
      )}

      {/* BENEFITS */}
      {tab==='benefits' && tabData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tabData.benefits?.map((b:any)=>(
            <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="font-semibold text-slate-800 dark:text-slate-100">{b.plan_name}</div>
              <div className="text-xs text-slate-400 capitalize mt-0.5">{b.benefit_type?.replace('_',' ')}</div>
              {b.coverage_amount>0 && <div className="text-sm text-green-600 font-semibold mt-1">₹{b.coverage_amount.toLocaleString('en-IN')}</div>}
              {b.policy_number && <div className="text-xs font-mono text-slate-400 mt-1">{b.policy_number}</div>}
            </div>
          ))}
          {!tabData.benefits?.length && <div className="col-span-3 bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm">No benefits enrolled</div>}
        </div>
      )}

      {/* DOCUMENTS */}
      {tab==='documents' && tabData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tabData.documents?.map((d:any)=>(
            <div key={d.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between mb-2">
                <span className="text-2xl">{d.document_type?.includes('pan')?'🪪':d.document_type?.includes('letter')?'📄':'📁'}</span>
                <Badge label={d.is_verified?'Verified':'Pending'} color={d.is_verified?'green':'yellow'} />
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-100 capitalize">{d.document_type?.replace('_',' ')}</div>
              {d.document_number && <div className="text-xs font-mono text-slate-400 mt-1">{d.document_number}</div>}
              {d.expiry_date && <div className={`text-xs mt-1 ${new Date(d.expiry_date)<new Date()?'text-red-500':'text-slate-400'}`}>Expires: {new Date(d.expiry_date).toLocaleDateString('en-IN')}</div>}
            </div>
          ))}
          {!tabData.documents?.length && <div className="col-span-3 bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm">No documents uploaded</div>}
        </div>
      )}

      {/* PERFORMANCE */}
      {tab==='performance' && tabData && (
        <div className="space-y-4">
          {tabData.reviews?.map((r:any)=>(
            <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between">
                <div><div className="font-bold text-slate-800 dark:text-slate-100">{r.review_period}</div>
                  <div className="text-xs text-slate-400 capitalize">{r.review_type}</div></div>
                {r.final_score && <div className="text-right"><div className="text-2xl font-black text-indigo-600">{r.final_score}/5</div><div className="text-xs text-slate-400">{r.rating_label}</div></div>}
              </div>
              <div className="flex gap-2 mt-3">
                {r.outcome && <Badge label={r.outcome?.replace('_',' ')} color={r.outcome==='promoted'?'green':r.outcome==='pip'?'red':'gray'} />}
                {r.increment_percent>0 && <Badge label={`+${r.increment_percent}% increment`} color="green" />}
                <Badge label={r.status} color={r.status==='closed'?'green':'blue'} />
              </div>
              {!r.employee_acknowledged && r.status==='closed' && (
                <button onClick={async()=>{ await api.put(`/hr-skills/appraisal/${r.id}/acknowledge`); loadTab(); toast.success('Acknowledged!'); }}
                  className="mt-3 w-full text-sm py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl font-medium hover:bg-indigo-100">
                  ✓ Acknowledge Review
                </button>
              )}
            </div>
          ))}
          {!tabData.reviews?.length && <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-sm">No performance reviews yet</div>}
        </div>
      )}

      {/* APPROVALS */}
      {tab==='approvals' && tabData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3">⏳ Pending My Action ({tabData.inbox?.total||0})</h3>
            <div className="space-y-2">
              {tabData.inbox?.items?.map((r:any)=>(
                <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-700 flex items-start justify-between">
                  <div><div className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.title}</div>
                    <div className="text-xs text-slate-400">{r.workflow_type?.replace('_',' ')}</div></div>
                  <button onClick={()=>navigate('/approvals')} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">Review</button>
                </div>
              ))}
              {!tabData.inbox?.items?.length && <div className="bg-white dark:bg-slate-800 rounded-xl p-6 text-center text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700">✅ Inbox clear!</div>}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3">📤 My Requests ({tabData.my_requests?.total||0})</h3>
            <div className="space-y-2">
              {tabData.my_requests?.items?.map((r:any)=>(
                <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div><div className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.title}</div>
                    <div className="text-xs text-slate-400">{r.request_number}</div></div>
                  <Badge label={r.status} color={r.status==='approved'?'green':r.status==='rejected'?'red':'yellow'} />
                </div>
              ))}
              {!tabData.my_requests?.items?.length && <div className="bg-white dark:bg-slate-800 rounded-xl p-6 text-center text-slate-400 shadow-sm">No requests submitted</div>}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <Modal isOpen={leaveModal} onClose={()=>setLeaveModal(false)} title="Apply for Leave" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Leave Type *</label>
            <select value={leaveForm.leave_type} onChange={e=>setLeaveForm(f=>({...f,leave_type:e.target.value}))} className={inp}>
              {['casual','sick','annual','earned','maternity','paternity','emergency','unpaid'].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)} Leave</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">From *</label>
              <input type="date" value={leaveForm.from_date} onChange={e=>setLeaveForm(f=>({...f,from_date:e.target.value}))} className={inp} /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">To *</label>
              <input type="date" value={leaveForm.to_date} onChange={e=>setLeaveForm(f=>({...f,to_date:e.target.value}))} className={inp} /></div>
          </div>
          {leaveDays > 0 && <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-2 text-sm text-center text-indigo-700 dark:text-indigo-300"><strong>{leaveDays} day(s)</strong> leave requested</div>}
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason *</label>
            <textarea value={leaveForm.reason} onChange={e=>setLeaveForm(f=>({...f,reason:e.target.value}))} rows={2} className={inp} placeholder="Reason for leave..." /></div>
          <div className="flex gap-3">
            <button onClick={()=>setLeaveModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm">Cancel</button>
            <button onClick={applyLeave} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium">Submit Request</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={tsModal} onClose={()=>setTsModal(false)} title="Log Work Hours" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Project *</label>
            <select value={tsForm.project_id} onChange={e=>setTsForm(f=>({...f,project_id:e.target.value}))} className={inp}>
              <option value="">Select Project</option>
              {projects_list.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input type="date" value={tsForm.date} onChange={e=>setTsForm(f=>({...f,date:e.target.value}))} className={inp} /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hours *</label>
              <input type="number" step="0.5" min="0.5" max="24" value={tsForm.hours} onChange={e=>setTsForm(f=>({...f,hours:e.target.value}))} placeholder="e.g. 4.5" className={inp} /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">What did you work on?</label>
            <textarea value={tsForm.description} onChange={e=>setTsForm(f=>({...f,description:e.target.value}))} rows={2} className={inp} placeholder="Brief description of work..." /></div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={tsForm.billable} onChange={e=>setTsForm(f=>({...f,billable:e.target.checked}))} className="w-4 h-4 rounded text-indigo-600" />
            <span className="text-sm text-slate-700 dark:text-slate-300">Billable time</span>
          </label>
          <div className="flex gap-3">
            <button onClick={()=>setTsModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm">Cancel</button>
            <button onClick={logTs} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium">Log Time</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
