import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

interface AttendanceRecord { id: number; employee_id: number; date: string; status: string; check_in?: string; check_out?: string; hours_worked?: number; notes?: string; }
interface Employee { id: number; first_name: string; last_name?: string; employee_number?: string; }
interface PunchLog { id: number; employee_id: number; punch_time: string; punch_type: string; source: string; }
interface Regularization { id: number; employee_id: number; attendance_date: string; requested_in?: string; requested_out?: string; reason: string; regularization_type: string; status: string; on_duty_location?: string; }
interface TodayStatus { date: string; total_employees: number; present: number; absent: number; late: number; half_day: number; not_marked: number; attendance_percent: number; recent_checkins_1h: number; }
interface Device { id: number; device_name: string; device_code: string; device_type: string; location: string; }

const SOURCE_ICONS: Record<string, string> = { manual:'✋', card_swipe:'💳', fingerprint:'👆', facial:'😊', mobile_app:'📱' };
const SOURCE_COLORS: Record<string, string> = { manual:'gray', card_swipe:'blue', fingerprint:'indigo', facial:'purple', mobile_app:'green' };
const REG_TYPES = ['forgot_punch','late_arrival','early_departure','wfh','on_duty','client_visit','other'];
const STATUS_COLORS: Record<string,string> = { present:'green', absent:'red', half_day:'yellow', late:'orange', on_duty:'blue', wfh:'indigo' };

export default function AttendancePage() {
  const [tab, setTab] = useState<'today'|'records'|'punch'|'regularize'|'regularizations'>('today');
  const [todayStatus, setTodayStatus] = useState<TodayStatus|null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [punchLogs, setPunchLogs] = useState<PunchLog[]>([]);
  const [regularizations, setRegularizations] = useState<Regularization[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterEmp, setFilterEmp] = useState('');

  // Punch form
  const [punchForm, setPunchForm] = useState({ employee_id:'', punch_type:'in', source:'manual', device_id:'' });
  // Regularization form
  const [regForm, setRegForm] = useState({ employee_id:'', attendance_date:new Date().toISOString().split('T')[0], requested_in:'09:00', requested_out:'18:00', reason:'', regularization_type:'forgot_punch', on_duty_location:'' });
  // Mark absent form
  const [absentModal, setAbsentModal] = useState(false);
  const [absentDate, setAbsentDate] = useState(new Date().toISOString().split('T')[0]);
  const [absentEmpIds, setAbsentEmpIds] = useState<number[]>([]);
  const [absentReason, setAbsentReason] = useState('No attendance recorded');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, eRes, dRes, rRes, logRes] = await Promise.all([
        api.get('/attendance-v2/today-status'),
        api.get('/hr/employees', { params:{limit:200} }),
        api.get('/attendance-v2/devices'),
        api.get('/attendance-v2/regularization', { params:{limit:50} }),
        api.get('/attendance-v2/punch-logs', { params:{limit:20} }),
      ]);
      setTodayStatus(tRes.data);
      setEmployees(eRes.data.items || eRes.data || []);
      setDevices(dRes.data || []);
      setRegularizations(rRes.data.items || []);
      setPunchLogs(logRes.data.items || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, []);

  const loadRecords = useCallback(async () => {
    const params: any = { limit:100 };
    if(filterDate) params.date_from = filterDate;
    if(filterEmp) params.employee_id = Number(filterEmp);
    const r = await api.get('/hr/attendance', { params });
    setRecords(r.data.items || []);
  }, [filterDate, filterEmp]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if(tab==='records') loadRecords(); }, [tab, loadRecords]);

  const empName = (id: number) => { const e=employees.find(e=>e.id===id); return e?`${e.first_name} ${e.last_name||''}`:`EMP-${id}`; };

  const punch = async () => {
    if(!punchForm.employee_id) return toast.error('Select employee');
    try {
      const res = await api.post('/attendance-v2/punch', {
        employee_id: Number(punchForm.employee_id),
        punch_type: punchForm.punch_type,
        source: punchForm.source,
        device_id: punchForm.device_id ? Number(punchForm.device_id) : undefined,
        punch_time: new Date().toISOString(),
      });
      toast.success(`${SOURCE_ICONS[punchForm.source]} ${res.data.message}`);
      load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Punch failed'); }
  };

  const submitRegularization = async () => {
    if(!regForm.employee_id || !regForm.reason) return toast.error('Fill required fields');
    try {
      await api.post('/attendance-v2/regularization', {
        employee_id: Number(regForm.employee_id),
        attendance_date: regForm.attendance_date,
        requested_in: regForm.requested_in || undefined,
        requested_out: regForm.requested_out || undefined,
        reason: regForm.reason,
        regularization_type: regForm.regularization_type,
        on_duty_location: regForm.on_duty_location || undefined,
      });
      toast.success('Regularization request submitted!');
      setRegForm(f => ({...f, reason:'', on_duty_location:''}));
      load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const approveReg = async (id: number) => {
    await api.put(`/attendance-v2/regularization/${id}/approve`);
    toast.success('Regularization approved!'); load();
  };

  const rejectReg = async (id: number) => {
    await api.put(`/attendance-v2/regularization/${id}/reject`, { reason: 'Not approved' });
    toast.success('Rejected'); load();
  };

  const markAbsent = async () => {
    try {
      const res = await api.post('/attendance-v2/mark-absent', {
        date: absentDate,
        employee_ids: absentEmpIds,
        reason: absentReason,
      });
      toast.success(res.data.message); setAbsentModal(false); load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Attendance Management</h1>
          <p className="text-slate-500 text-sm mt-1">Biometric punch, regularization & tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setAbsentModal(true)} className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50">Mark Absent</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {([['today','📊 Today'],['records','📋 Records'],['punch','👆 Biometric Punch'],['regularize','📝 Regularize'],['regularizations','⏳ Pending']] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${tab===t?'bg-white text-indigo-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {label}
            {t==='regularizations' && regularizations.filter(r=>r.status==='pending').length>0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {regularizations.filter(r=>r.status==='pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TODAY STATUS ── */}
      {tab==='today' && todayStatus && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              {label:'Total',value:todayStatus.total_employees,color:'text-slate-800',bg:'bg-slate-100'},
              {label:'Present',value:todayStatus.present,color:'text-green-600',bg:'bg-green-50'},
              {label:'Absent',value:todayStatus.absent,color:'text-red-500',bg:'bg-red-50'},
              {label:'Late',value:todayStatus.late,color:'text-orange-500',bg:'bg-orange-50'},
              {label:'Half Day',value:todayStatus.half_day,color:'text-yellow-600',bg:'bg-yellow-50'},
              {label:'Not Marked',value:todayStatus.not_marked,color:'text-slate-500',bg:'bg-slate-50'},
              {label:'Recent Check-ins',value:todayStatus.recent_checkins_1h,color:'text-indigo-600',bg:'bg-indigo-50'},
            ].map(s=>(
              <div key={s.label} className={`rounded-2xl p-4 border border-slate-100 ${s.bg}`}>
                <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Attendance meter */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Today's Attendance</h3>
              <span className="text-2xl font-bold text-indigo-600">{todayStatus.attendance_percent}%</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-4 bg-gradient-to-r from-indigo-500 to-green-500 rounded-full transition-all duration-1000"
                style={{width:`${todayStatus.attendance_percent}%`}} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4 text-center text-sm">
              <div><div className="text-green-600 font-bold text-lg">{todayStatus.present}</div><div className="text-slate-400">Present</div></div>
              <div><div className="text-red-500 font-bold text-lg">{todayStatus.absent}</div><div className="text-slate-400">Absent</div></div>
              <div><div className="text-slate-500 font-bold text-lg">{todayStatus.not_marked}</div><div className="text-slate-400">Not Marked</div></div>
            </div>
          </div>

          {/* Recent punch logs */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Recent Biometric Logs</h3>
              <span className="text-xs text-slate-400">Live feed</span>
            </div>
            <div className="divide-y divide-slate-50">
              {punchLogs.length===0 ? (
                <div className="p-8 text-center text-slate-400">No punches recorded yet today</div>
              ) : punchLogs.map(log=>(
                <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${log.punch_type==='in'?'bg-green-50':'bg-red-50'}`}>
                    {SOURCE_ICONS[log.source]}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800">{empName(log.employee_id)}</div>
                    <div className="text-xs text-slate-400">
                      <span className={`capitalize font-medium ${log.punch_type==='in'?'text-green-600':'text-red-500'}`}>{log.punch_type.toUpperCase()}</span>
                      {' · '}{log.source.replace('_',' ')}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 text-right">
                    <div className="font-medium">{new Date(log.punch_time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
                    <Badge label={log.source.replace('_',' ')} color={SOURCE_COLORS[log.source] as any || 'gray'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RECORDS ── */}
      {tab==='records' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <input type="date" value={filterDate} onChange={e=>{setFilterDate(e.target.value);}}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <select value={filterEmp} onChange={e=>setFilterEmp(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="">All Employees</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
            <button onClick={loadRecords} className="gradient-bg text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">Filter</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100"><h3 className="font-semibold text-slate-800">Attendance Records ({records.length})</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>{['Employee','Date','Status','Check In','Check Out','Hours','Notes'].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {records.length===0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-slate-400">No records for this date</td></tr>
                  ) : records.map(r=>(
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{empName(r.employee_id)}</td>
                      <td className="px-4 py-3">{r.date}</td>
                      <td className="px-4 py-3"><Badge label={r.status} color={STATUS_COLORS[r.status] as any || 'gray'} /></td>
                      <td className="px-4 py-3 font-mono text-green-600">{r.check_in ? new Date(r.check_in).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                      <td className="px-4 py-3 font-mono text-red-500">{r.check_out ? new Date(r.check_out).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                      <td className="px-4 py-3 font-semibold">{r.hours_worked ? `${r.hours_worked}h` : '-'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{r.notes||'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── BIOMETRIC PUNCH ── */}
      {tab==='punch' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Record Biometric Punch</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
                <select value={punchForm.employee_id} onChange={e=>setPunchForm(f=>({...f,employee_id:e.target.value}))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Select Employee</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_number})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Punch Type</label>
                  <div className="flex gap-2">
                    {['in','out'].map(t=>(
                      <button key={t} onClick={()=>setPunchForm(f=>({...f,punch_type:t}))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${punchForm.punch_type===t?(t==='in'?'border-green-500 bg-green-50 text-green-700':'border-red-500 bg-red-50 text-red-700'):'border-slate-200 text-slate-500'}`}>
                        {t==='in'?'▶ CHECK IN':'◀ CHECK OUT'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(SOURCE_ICONS).map(([src, icon])=>(
                    <button key={src} onClick={()=>setPunchForm(f=>({...f,source:src}))}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition-all ${punchForm.source===src?'border-indigo-500 bg-indigo-50 text-indigo-700':'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      <span className="text-2xl">{icon}</span>
                      <span className="capitalize">{src.replace('_',' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Device (Optional)</label>
                <select value={punchForm.device_id} onChange={e=>setPunchForm(f=>({...f,device_id:e.target.value}))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Select Device</option>
                  {devices.map(d=><option key={d.id} value={d.id}>{d.device_name} — {d.location}</option>)}
                </select>
              </div>

              <button onClick={punch} className={`w-full py-3.5 rounded-xl font-bold text-white text-lg transition-all hover:opacity-90 ${punchForm.punch_type==='in'?'bg-gradient-to-r from-green-500 to-emerald-500':'bg-gradient-to-r from-red-500 to-rose-500'}`}>
                {SOURCE_ICONS[punchForm.source]} {punchForm.punch_type==='in'?'Mark Check-IN':'Mark Check-OUT'}
              </button>

              <div className="text-center text-sm text-slate-400">
                Time: {new Date().toLocaleTimeString('en-IN')} · {new Date().toLocaleDateString('en-IN')}
              </div>
            </div>
          </div>

          {/* Device status panel */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">Registered Devices ({devices.length})</h3>
            <div className="space-y-3">
              {devices.map(d=>(
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-2xl">
                    {d.device_type==='fingerprint'?'👆':d.device_type==='facial'?'😊':d.device_type==='card_swipe'?'💳':'📱'}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 text-sm">{d.device_name}</div>
                    <div className="text-xs text-slate-400">{d.location}</div>
                    {d.ip_address && <div className="text-xs font-mono text-slate-300">{d.ip_address}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge label={d.device_type.replace('_',' ')} color="indigo" />
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── REGULARIZATION FORM ── */}
      {tab==='regularize' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-1">Submit Attendance Regularization</h3>
            <p className="text-sm text-slate-400 mb-5">Request correction for a past date — missed punch, WFH, on-duty travel, etc.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
                <select value={regForm.employee_id} onChange={e=>setRegForm(f=>({...f,employee_id:e.target.value}))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Select Employee</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <input type="date" value={regForm.attendance_date} onChange={e=>setRegForm(f=>({...f,attendance_date:e.target.value}))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Regularization Type</label>
                  <select value={regForm.regularization_type} onChange={e=>setRegForm(f=>({...f,regularization_type:e.target.value}))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {REG_TYPES.map(t=><option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Requested Check-In Time</label>
                  <input type="time" value={regForm.requested_in} onChange={e=>setRegForm(f=>({...f,requested_in:e.target.value}))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Requested Check-Out Time</label>
                  <input type="time" value={regForm.requested_out} onChange={e=>setRegForm(f=>({...f,requested_out:e.target.value}))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>
              {(regForm.regularization_type==='on_duty'||regForm.regularization_type==='client_visit') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">On Duty Location *</label>
                  <input value={regForm.on_duty_location} onChange={e=>setRegForm(f=>({...f,on_duty_location:e.target.value}))} placeholder="Client site, branch office address..."
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                <textarea value={regForm.reason} onChange={e=>setRegForm(f=>({...f,reason:e.target.value}))} rows={3}
                  placeholder="Explain why regularization is needed..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <button onClick={submitRegularization} className="w-full gradient-bg text-white rounded-xl py-3 font-medium hover:opacity-90">
                Submit Regularization Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PENDING REGULARIZATIONS ── */}
      {tab==='regularizations' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            {['all','pending','approved','rejected'].map(s=>(
              <span key={s} className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 font-medium capitalize cursor-pointer hover:bg-slate-200">
                {s}: {regularizations.filter(r=>s==='all'||r.status===s).length}
              </span>
            ))}
          </div>
          <div className="space-y-3">
            {regularizations.length===0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-slate-400">No regularization requests</div>
              </div>
            ) : regularizations.map(reg=>(
              <div key={reg.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800">{empName(reg.employee_id)}</span>
                      <Badge label={reg.regularization_type.replace('_',' ')} color="blue" />
                      <Badge label={reg.status} color={reg.status==='pending'?'yellow':reg.status==='approved'?'green':'red'} />
                    </div>
                    <div className="text-sm text-slate-500 mb-1">
                      📅 {reg.attendance_date} |
                      {reg.requested_in && ` Check-in: ${reg.requested_in}`}
                      {reg.requested_out && ` Check-out: ${reg.requested_out}`}
                    </div>
                    <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5 mt-2">{reg.reason}</div>
                    {reg.on_duty_location && <div className="text-xs text-indigo-600 mt-1">📍 {reg.on_duty_location}</div>}
                  </div>
                  {reg.status==='pending' && (
                    <div className="flex gap-2 ml-4">
                      <button onClick={()=>approveReg(reg.id)} className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-medium">✓ Approve</button>
                      <button onClick={()=>rejectReg(reg.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 font-medium">✗ Reject</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mark Absent Modal */}
      <Modal isOpen={absentModal} onClose={()=>setAbsentModal(false)} title="Mark Employees Absent" size="md">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
            ⚠️ This will mark selected employees (or ALL unmarked employees) as absent for the chosen date.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input type="date" value={absentDate} onChange={e=>setAbsentDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Specific Employees (leave empty to mark all unmarked)</label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
              {employees.map(e=>(
                <label key={e.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                  <input type="checkbox" checked={absentEmpIds.includes(e.id)}
                    onChange={ev=>setAbsentEmpIds(prev=>ev.target.checked?[...prev,e.id]:prev.filter(id=>id!==e.id))}
                    className="w-4 h-4 rounded text-red-500" />
                  <span className="text-sm">{e.first_name} {e.last_name}</span>
                </label>
              ))}
            </div>
            {absentEmpIds.length===0 && <p className="text-xs text-slate-400 mt-1">All employees without attendance for this date will be marked absent</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <input value={absentReason} onChange={e=>setAbsentReason(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setAbsentModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={markAbsent} className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-600">Mark Absent</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
