import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { downloadExcel } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import toast from 'react-hot-toast';

interface Industry { id: string; name: string; icon: string; description: string; }
interface PhaseTemplate { phase_name: string; phase_code: string; color: string; duration_days: number; description: string; suggested_tasks: string[]; }

const STATUS_COLORS: Record<string,string> = { planning:'indigo', in_progress:'blue', completed:'green', on_hold:'yellow', cancelled:'red' };

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [phasePreview, setPhasePreview] = useState<PhaseTemplate[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyTemplateModal, setApplyTemplateModal] = useState<{id:number;name:string}|null>(null);
  const [templateIndustry, setTemplateIndustry] = useState('general');
  const [templateStartDate, setTemplateStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [applying, setApplying] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const defaultForm = {
    name: '', description: '', project_type: 'general', status: 'planning',
    priority: 'medium', start_date: new Date().toISOString().split('T')[0],
    end_date: '', budget: 0, customer_id: ''
  };
  const [form, setForm] = useState<any>(defaultForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/projects/', { params });
      setItems(res?.data?.items || []);
    } catch {} finally { setLoading(false); }
  }, [filterStatus]);

  const fetchStats = async () => {
    try { const r = await api.get('/projects/stats'); setStats(r.data); } catch {}
  };

  const loadIndustries = async () => {
    try {
      const r = await api.get('/projects-v2/templates/industries');
      setIndustries(r.data || []);
    } catch {}
  };

  const loadPhasePreview = async (industry: string) => {
    if (!industry) return;
    setPreviewLoading(true);
    try {
      const r = await api.get(`/projects-v2/templates/phases/${industry}`);
      setPhasePreview(r.data || []);
    } catch {} finally { setPreviewLoading(false); }
  };

  useEffect(() => { load(); fetchStats(); loadIndustries(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, budget: Number(form.budget), customer_id: form.customer_id ? Number(form.customer_id) : undefined };
      if (editItem) {
        await api.put(`/projects/${editItem.id}`, payload);
        toast.success('Project updated');
      } else {
        const r = await api.post('/projects/', payload);
        toast.success('Project created!');
        // Offer to apply template
        const newProj = r.data;
        setShowModal(false);
        setEditItem(null);
        setForm(defaultForm);
        load(); fetchStats();
        if (form.project_type !== 'general') {
          setApplyTemplateModal({ id: newProj.id, name: newProj.name });
          setTemplateIndustry(form.project_type);
          loadPhasePreview(form.project_type);
        }
        return;
      }
      setShowModal(false); setEditItem(null); setForm(defaultForm);
      load(); fetchStats();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Error saving project'); }
  };

  const applyTemplate = async () => {
    if (!applyTemplateModal) return;
    setApplying(true);
    try {
      const r = await api.post(`/projects-v2/${applyTemplateModal.id}/apply-template`, {
        industry: templateIndustry, start_date: templateStartDate
      });
      toast.success(`${r.data.message} — ${r.data.phases} phases, ${r.data.tasks} tasks, ${r.data.milestones} milestones`);
      setApplyTemplateModal(null);
      navigate(`/projects/${applyTemplateModal.id}`);
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed to apply template'); }
    finally { setApplying(false); }
  };

  const handleEdit = (item: any) => {
    setEditItem(item);
    setForm({ name: item.name, description: item.description || '', project_type: item.project_type || 'general',
      status: item.status, priority: item.priority, start_date: item.start_date || '',
      end_date: item.end_date || '', budget: item.budget, customer_id: item.customer_id || '' });
    setShowModal(true);
  };

  const inp = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

  const columns = [
    { key: 'project_number', title: '#', render: (r: any) => <span className="font-mono text-indigo-600 text-xs bg-indigo-50 px-2 py-0.5 rounded">{r.project_number}</span> },
    { key: 'name', title: 'Project', render: (r: any) => (
      <div>
        <div className="font-semibold text-slate-800">{r.name}</div>
        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
          <span>{industries.find(i=>i.id===r.project_type)?.icon||'📋'}</span>
          <span className="capitalize">{industries.find(i=>i.id===r.project_type)?.name || r.project_type?.replace(/_/g,' ')}</span>
        </div>
      </div>
    )},
    { key: 'status', title: 'Status', render: (r: any) => <Badge label={r.status?.replace('_',' ')} color={STATUS_COLORS[r.status] as any || 'gray'} /> },
    { key: 'priority', title: 'Priority', render: (r: any) => <Badge label={r.priority} color={r.priority==='high'||r.priority==='critical'?'red':r.priority==='medium'?'yellow':'gray' as any} /> },
    { key: 'budget', title: 'Budget', render: (r: any) => `₹${(r.budget||0).toLocaleString('en-IN')}` },
    { key: 'progress_percent', title: 'Progress', render: (r: any) => (
      <div className="flex items-center gap-2 min-w-[100px]">
        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
          <div className="bg-indigo-500 rounded-full h-1.5 transition-all" style={{ width: `${r.progress_percent || 0}%` }} />
        </div>
        <span className="text-xs text-slate-600 w-8">{r.progress_percent || 0}%</span>
      </div>
    )},
    { key: 'start_date', title: 'Start', render: (r:any) => r.start_date ? new Date(r.start_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—' },
    { key: 'end_date', title: 'End', render: (r:any) => r.end_date ? new Date(r.end_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—' },
    { key: 'open', title: '', render: (r: any) => (
      <button onClick={() => navigate(`/projects/${r.id}`)}
        className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium whitespace-nowrap">
        Open →
      </button>
    )},
  ];

  const byStatus = stats.by_status || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Project Management</h1>
          <p className="text-slate-500 text-sm mt-1">Universal project tracking for any industry</p>
        </div>
        <button onClick={() => downloadExcel('/projects/export', 'projects.xlsx')} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-indigo-300">📥 Export</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Projects" value={stats.total || 0} icon="🚀" color="indigo" />
        <StatCard title="In Progress" value={byStatus.in_progress || 0} icon="▶️" color="blue" />
        <StatCard title="Planning" value={byStatus.planning || 0} icon="📋" color="purple" />
        <StatCard title="Total Budget" value={`₹${((stats.total_budget||0)/100000).toFixed(1)}L`} icon="💰" color="green" />
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="">All Status</option>
          {['planning','in_progress','completed','on_hold','cancelled'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      <DataTable title="All Projects" columns={columns} data={items} loading={loading}
        onAdd={() => { setForm(defaultForm); setEditItem(null); setShowModal(true); }}
        addLabel="+ New Project" onSearch={() => {}}
        actions={(row) => (
          <div className="flex gap-1">
            <button onClick={() => handleEdit(row)} className="text-xs px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Edit</button>
            <button onClick={() => { setApplyTemplateModal({id:row.id,name:row.name}); setTemplateIndustry(row.project_type||'general'); loadPhasePreview(row.project_type||'general'); setTemplateStartDate(row.start_date||new Date().toISOString().split('T')[0]); }}
              className="text-xs px-2.5 py-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100">📋 Plan</button>
          </div>
        )}
      />

      {/* ── Create / Edit Project Modal ── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Project' : 'Create New Project'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Name *</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. ERP Implementation for ABC Corp" className={inp} />
          </div>

          {/* Industry Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Industry / Project Type *</label>
            <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
              {industries.map(ind=>(
                <button type="button" key={ind.id} onClick={()=>setForm({...form, project_type:ind.id})}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all ${form.project_type===ind.id?'border-indigo-500 bg-indigo-50':'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <span className="text-2xl">{ind.icon}</span>
                  <span className="text-xs font-medium text-slate-700 leading-tight">{ind.name}</span>
                </button>
              ))}
            </div>
            {form.project_type && industries.find(i=>i.id===form.project_type) && (
              <p className="text-xs text-slate-400 mt-1.5">{industries.find(i=>i.id===form.project_type)?.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inp}>
                {['planning','in_progress','on_hold','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className={inp}>
                {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget (₹)</label>
              <input type="number" value={form.budget} onChange={e => setForm({...form, budget: Number(e.target.value)})} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className={inp} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={inp} rows={2} placeholder="Brief project description and objectives..." />
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button type="submit" className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">
              {editItem ? 'Update Project' : '✓ Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Apply Template Modal ── */}
      <Modal isOpen={!!applyTemplateModal} onClose={() => setApplyTemplateModal(null)} title="Apply Project Plan Template" size="xl">
        {applyTemplateModal && (
          <div className="space-y-5">
            <div className="bg-indigo-50 rounded-xl p-4">
              <div className="font-semibold text-indigo-800">"{applyTemplateModal.name}"</div>
              <p className="text-sm text-indigo-600 mt-0.5">This will create phases, WBS tasks, and milestones based on industry best practices.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Industry Template</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {industries.map(ind=>(
                    <button key={ind.id} onClick={()=>{setTemplateIndustry(ind.id);loadPhasePreview(ind.id);}}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${templateIndustry===ind.id?'border-indigo-500 bg-indigo-50':'border-slate-200 hover:border-slate-300'}`}>
                      <span className="text-lg flex-shrink-0">{ind.icon}</span>
                      <span className="text-xs font-medium text-slate-700 leading-tight">{ind.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project Start Date</label>
                  <input type="date" value={templateStartDate} onChange={e=>setTemplateStartDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>

                <label className="block text-sm font-medium text-slate-700 mb-2">Phase Preview</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {previewLoading ? (
                    <div className="text-xs text-slate-400 py-4 text-center">Loading phases...</div>
                  ) : phasePreview.map((ph, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:ph.color}} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-slate-700">{ph.phase_name}</span>
                        <span className="text-xs text-slate-400 ml-1">({ph.duration_days}d)</span>
                      </div>
                      <span className="text-xs text-slate-400">{ph.suggested_tasks.length} tasks</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {phasePreview.length > 0 && (
              <div className="bg-green-50 rounded-xl p-3 text-sm text-green-700">
                ✅ Will create <strong>{phasePreview.length} phases</strong>, <strong>{phasePreview.reduce((s,p)=>s+p.suggested_tasks.length,0)} WBS tasks</strong>, and key milestones
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setApplyTemplateModal(null)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Skip — I'll build manually</button>
              <button onClick={applyTemplate} disabled={applying} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {applying ? 'Applying...' : '🚀 Apply Template & Open Project'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProjectsPage;
