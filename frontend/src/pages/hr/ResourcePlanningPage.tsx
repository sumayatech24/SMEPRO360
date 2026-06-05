import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Resource {
  id: number; name: string; employee_number: string; department_id: number;
  total_allocation: number; projects: {project_id:number;project_name:string;role:string;allocation_percent:number}[];
}

export default function ResourcePlanningPage() {
  const navigate = useNavigate();
  const [planning, setPlanning] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocModal, setAllocModal] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ employee_id:'', project_id:'', role:'', allocation_percent:'100', start_date:'', end_date:'', hourly_rate:'', notes:'' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, projRes, empRes, dRes] = await Promise.all([
        api.get('/hr-v2/resource-planning'),
        api.get('/projects/', { params:{limit:50} }),
        api.get('/hr/employees', { params:{limit:200} }),
        api.get('/hr/departments'),
      ]);
      setPlanning(pRes.data);
      setProjects(projRes.data.items || []);
      setEmployees(empRes.data.items || empRes.data || []);
      setDepartments(dRes.data || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const allocate = async () => {
    if (!form.employee_id || !form.project_id) return toast.error('Select employee and project');
    try {
      await api.post('/hr-v2/resource-planning/allocate', {
        employee_id: Number(form.employee_id),
        project_id: Number(form.project_id),
        role: form.role || 'Team Member',
        allocation_percent: Number(form.allocation_percent),
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        hourly_rate: Number(form.hourly_rate) || 0,
        notes: form.notes,
      });
      toast.success('Resource allocated!'); setAllocModal(false); load();
      setForm({ employee_id:'', project_id:'', role:'', allocation_percent:'100', start_date:'', end_date:'', hourly_rate:'', notes:'' });
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const resources: Resource[] = planning?.utilization || [];
  const filtered = resources.filter(r => {
    const deptMatch = !filterDept || String(r.department_id) === filterDept;
    const statusMatch = filterStatus === 'all' ||
      (filterStatus === 'over' && r.total_allocation > 100) ||
      (filterStatus === 'under' && r.total_allocation < 50 && r.total_allocation > 0) ||
      (filterStatus === 'available' && r.total_allocation === 0);
    return deptMatch && statusMatch;
  });

  const getBarColor = (pct: number) => pct > 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : pct >= 50 ? '#10b981' : '#3b82f6';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Resource Planning</h1>
          <p className="text-slate-500 text-sm mt-1">Employee utilization across all projects</p>
        </div>
        <button onClick={()=>setAllocModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Allocate Resource</button>
      </div>

      {/* Stats */}
      {planning && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            {label:'Total Employees',value:planning.total_employees,color:'text-slate-800'},
            {label:'Allocated',value:planning.allocated,color:'text-indigo-600'},
            {label:'Available',value:planning.available,color:'text-green-600'},
            {label:'Over-Allocated',value:planning.over_allocated,color:'text-red-500'},
            {label:'Under-Utilized',value:planning.under_utilized,color:'text-yellow-600'},
          ].map(s=>(
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterDept} onChange={e=>setFilterDept(e.target.value)} className="border border-slate-200 dark:border-slate-600 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="">All Departments</option>
          {departments.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {[['all','All'],['available','Available'],['under','Under-Utilized'],['over','Over-Allocated']].map(([v,l])=>(
          <button key={v} onClick={()=>setFilterStatus(v)}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${filterStatus===v?'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20':'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300'}`}>
            {l}
          </button>
        ))}
        <span className="text-sm text-slate-400 self-center">{filtered.length} employees</span>
      </div>

      {/* Resource Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-100 dark:border-slate-600">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total Allocation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Projects</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {loading ? (
                Array.from({length:5}).map((_,i)=>(
                  <tr key={i}><td colSpan={4} className="px-4 py-4"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                ))
              ) : filtered.map(r=>(
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0">
                        {r.name?.[0]||'?'}
                      </div>
                      <div>
                        <button onClick={()=>{const emp=employees.find(e=>e.id===r.id);if(emp)navigate(`/hr/employees/${r.id}`);}}
                          className="font-medium text-slate-800 dark:text-slate-100 hover:text-indigo-600 transition-colors">
                          {r.name}
                        </button>
                        <div className="text-xs text-slate-400">{r.employee_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-600 rounded-full min-w-[80px]">
                        <div className="h-2 rounded-full transition-all" style={{width:`${Math.min(100, r.total_allocation)}%`, backgroundColor:getBarColor(r.total_allocation)}} />
                      </div>
                      <span className={`text-sm font-bold min-w-[40px] text-right ${r.total_allocation>100?'text-red-500':r.total_allocation>=80?'text-yellow-600':r.total_allocation>0?'text-green-600':'text-slate-400'}`}>
                        {r.total_allocation}%
                      </span>
                      {r.total_allocation > 100 && <Badge label="Over" color="red" />}
                      {r.total_allocation === 0 && <Badge label="Available" color="green" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.projects.map((p,i)=>(
                        <span key={i} className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 px-2 py-0.5 rounded-full">
                          {p.project_name?.split(' ').slice(0,2).join(' ')||`PRJ-${p.project_id}`} ({p.allocation_percent}%)
                        </span>
                      ))}
                      {r.projects.length===0 && <span className="text-xs text-slate-400">No projects</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={()=>{setForm(f=>({...f,employee_id:String(r.id)}));setAllocModal(true);}}
                      className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium">
                      + Assign
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length===0 && (
                <tr><td colSpan={4} className="text-center py-12 text-slate-400">No employees found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allocate Modal */}
      <Modal isOpen={allocModal} onClose={()=>setAllocModal(false)} title="Allocate Resource to Project" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employee *</label>
            <select value={form.employee_id} onChange={e=>setForm(f=>({...f,employee_id:e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              <option value="">Select Employee</option>
              {employees.map((e:any)=><option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_number})</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Project *</label>
            <select value={form.project_id} onChange={e=>setForm(f=>({...f,project_id:e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              <option value="">Select Project</option>
              {projects.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <input value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} placeholder="Lead Developer, QA..." className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Allocation %</label>
              <input type="number" min="10" max="200" value={form.allocation_percent} onChange={e=>setForm(f=>({...f,allocation_percent:e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hourly Rate (₹/hr)</label>
            <input type="number" value={form.hourly_rate} onChange={e=>setForm(f=>({...f,hourly_rate:e.target.value}))} className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          <div className="flex gap-3">
            <button onClick={()=>setAllocModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={allocate} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Allocate</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
