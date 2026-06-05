import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';

interface Task { id: number; title: string; project_id: number; assigned_to: number; status: string; priority: string; due_date: string; estimated_hours: number; }
interface Project { id: number; name: string; }
interface Employee { id: number; first_name: string; last_name: string; }

const statusColor: Record<string, string> = { todo: 'gray', in_progress: 'blue', review: 'yellow', done: 'green', cancelled: 'red' };
const priorityColor: Record<string, string> = { low: 'gray', medium: 'yellow', high: 'red', critical: 'red' };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [form, setForm] = useState({ project_id: '', title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '', due_date: '', estimated_hours: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, pRes, eRes] = await Promise.all([
        api.get('/projects/tasks/all', { params: { limit: 200 } }),
        api.get('/projects/', { params: { limit: 50 } }),
        api.get('/hr/employees', { params: { limit: 100 } }),
      ]);
      setTasks(tRes.data.items || tRes.data);
      setProjects(pRes.data.items || pRes.data);
      setEmployees(eRes.data.items || eRes.data);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.project_id || !form.title) return toast.error('Fill required fields');
    try {
      await api.post('/projects/tasks', {
        project_id: Number(form.project_id), title: form.title, description: form.description,
        status: form.status, priority: form.priority,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
        due_date: form.due_date || undefined,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : undefined,
      });
      toast.success('Task created!'); setModalOpen(false); load();
      setForm({ project_id: '', title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '', due_date: '', estimated_hours: '' });
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const updateStatus = async (id: number, status: string) => {
    await api.put(`/projects/tasks/${id}`, { status });
    load();
  };

  const projName = (id: number) => projects.find(p => p.id === id)?.name || `PRJ-${id}`;
  const empName = (id: number) => { const e = employees.find(e => e.id === id); return e ? `${e.first_name} ${e.last_name}` : '-'; };

  const filtered = tasks.filter(t =>
    (!filterStatus || t.status === filterStatus) &&
    (!filterProject || t.project_id === Number(filterProject))
  );

  const columns = [
    { key: 'title', title: 'Task', render: (r: Task) => <span className="font-medium text-slate-800">{r.title}</span> },
    { key: 'project_id', title: 'Project', render: (r: Task) => <span className="text-indigo-600 text-sm">{projName(r.project_id)}</span> },
    { key: 'assigned_to', title: 'Assigned To', render: (r: Task) => empName(r.assigned_to) },
    { key: 'priority', title: 'Priority', render: (r: Task) => <Badge label={r.priority} color={priorityColor[r.priority] as any} /> },
    { key: 'status', title: 'Status', render: (r: Task) => <Badge label={r.status?.replace('_',' ')} color={statusColor[r.status] as any} /> },
    { key: 'due_date', title: 'Due', render: (r: Task) => r.due_date ? new Date(r.due_date).toLocaleDateString('en-IN') : '-' },
    { key: 'estimated_hours', title: 'Est. Hrs', render: (r: Task) => r.estimated_hours ? `${r.estimated_hours}h` : '-' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">Project Tasks</h1><p className="text-slate-500 text-sm mt-1">{tasks.length} tasks across all projects</p></div>
        <button onClick={() => setModalOpen(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ New Task</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {['todo','in_progress','review','done','cancelled'].map(status => (
          <div key={status} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="text-xs text-slate-500 capitalize">{status.replace('_',' ')}</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{tasks.filter(t => t.status === status).length}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="">All Statuses</option>
          {['todo','in_progress','review','done','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} title="All Tasks"
        onAdd={() => setModalOpen(true)} addLabel="New Task"
        actions={(row: Task) => (
          <div className="flex gap-1">
            {row.status === 'todo' && <button onClick={() => updateStatus(row.id, 'in_progress')} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">Start</button>}
            {row.status === 'in_progress' && <button onClick={() => updateStatus(row.id, 'review')} className="text-xs px-2 py-1 bg-yellow-50 text-yellow-600 rounded-lg">Review</button>}
            {row.status === 'review' && <button onClick={() => updateStatus(row.id, 'done')} className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-lg">Done</button>}
          </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Task" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project *</label>
            <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Task Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Status', 'status', ['todo','in_progress','review','done']],
              ['Priority', 'priority', ['low','medium','high','critical']],
            ].map(([label, field, opts]) => (
              <div key={field as string}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label as string}</label>
                <select value={(form as any)[field as string]} onChange={e => setForm(f => ({ ...f, [field as string]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {(opts as string[]).map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
              <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Est. Hours</label>
              <input type="number" value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))} placeholder="0"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={submit} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create Task</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
