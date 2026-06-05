import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Timesheet { id: number; project_id: number; user_id: number; task_id: number; date: string; hours: number; description: string; billable: boolean; }
interface Project { id: number; name: string; }
interface Employee { id: number; first_name: string; last_name: string; }

export default function TimesheetsPage() {
  const [sheets, setSheets] = useState<Timesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ project_id:'', employee_id:'', date:new Date().toISOString().split('T')[0], hours:'', description:'', billable:true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, pRes, eRes] = await Promise.all([
        api.get('/projects/timesheets', {params:{limit:200}}),
        api.get('/projects/', {params:{limit:50}}),
        api.get('/hr/employees', {params:{limit:100}}),
      ]);
      setSheets(tRes.data.items || tRes.data || []);
      setProjects(pRes.data.items || pRes.data || []);
      setEmployees(eRes.data.items || eRes.data || []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const projName = (id:number) => projects.find(p=>p.id===id)?.name || `PRJ-${id}`;
  const empName = (id:number) => { if (!id) return 'Me'; const e = employees.find(e=>e.id===id); return e ? `${e.first_name} ${e.last_name}` : '—'; };

  const submit = async () => {
    if (!form.project_id || !form.hours) return toast.error('Fill required fields');
    try {
      await api.post('/projects/timesheets', { project_id:Number(form.project_id), date:form.date, hours:Number(form.hours), description:form.description, billable:form.billable });
      toast.success('Timesheet logged!'); setModalOpen(false); load();
      setForm({ project_id:'', employee_id:'', date:new Date().toISOString().split('T')[0], hours:'', description:'', billable:true });
    } catch(e:any) { toast.error(e.response?.data?.detail||'Failed'); }
  };

  const totalHours = sheets.reduce((s,t)=>s+(t.hours||0),0);
  const billableHours = sheets.filter(t=>t.billable).reduce((s,t)=>s+(t.hours||0),0);

  const columns = [
    { key:'date', title:'Date', render:(r:Timesheet)=>r.date?new Date(r.date).toLocaleDateString('en-IN'):'-' },
    { key:'project_id', title:'Project', render:(r:Timesheet)=><span className="text-indigo-600">{projName(r.project_id)}</span> },
    { key:'user_id', title:'Logged By', render:(r:Timesheet)=>empName(r.user_id) },
    { key:'hours', title:'Hours', render:(r:Timesheet)=><span className="font-bold">{r.hours}h</span> },
    { key:'description', title:'Work Done', render:(r:Timesheet)=><span className="text-sm text-slate-500 max-w-xs truncate block">{r.description||'-'}</span> },
    { key:'billable', title:'Billable', render:(r:Timesheet)=><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.billable?'bg-green-50 text-green-600':'bg-slate-100 text-slate-500'}`}>{r.billable?'Yes':'No'}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Timesheets</h1><p className="text-slate-500 text-sm mt-1">Log and track project hours</p></div>
        <button onClick={()=>setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Log Time</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{label:'Total Entries',value:sheets.length},{label:'Total Hours',value:`${totalHours}h`},{label:'Billable Hours',value:`${billableHours}h`}].map(s=>(
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={sheets} loading={loading} title="Timesheet Entries"
        onAdd={()=>setModalOpen(true)} addLabel="Log Time" />

      <Modal isOpen={modalOpen} onClose={()=>setModalOpen(false)} title="Log Timesheet" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Project *</label>
              <select value={form.project_id} onChange={e=>setForm(f=>({...f,project_id:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Select Project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
              <select value={form.employee_id} onChange={e=>setForm(f=>({...f,employee_id:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Self</option>{employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Hours *</label>
              <input type="number" step="0.5" min="0.5" max="24" value={form.hours} onChange={e=>setForm(f=>({...f,hours:e.target.value}))} placeholder="e.g. 4.5" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description of Work</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="What did you work on?" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="billable" checked={form.billable} onChange={e=>setForm(f=>({...f,billable:e.target.checked}))} className="w-4 h-4 rounded text-indigo-600" />
            <label htmlFor="billable" className="text-sm text-slate-700">This is billable time</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={()=>setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Log Time</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
