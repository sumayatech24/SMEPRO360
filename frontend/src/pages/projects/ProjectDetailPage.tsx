import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';
import toast from 'react-hot-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Project { id:number; project_number:string; name:string; description:string; project_type:string; status:string; priority:string; start_date:string; end_date:string; budget:number; actual_cost:number; progress_percent:number; project_manager_id:number; customer_id:number; }
interface Phase { id:number; phase_name:string; phase_code:string; phase_order:number; planned_start:string; planned_end:string; start_date:string; end_date:string; status:string; progress_percent:number; color:string; }
interface WBSItem { id:number; wbs_code:string; task_name:string; task_type:string; phase_id:number; parent_id:number; planned_start:string; planned_end:string; actual_start:string; actual_end:string; duration_days:number; assigned_to:number; percent_complete:number; status:string; priority:string; estimated_hours:number; actual_hours:number; predecessors:string; dependency_type:string; level:number; sort_order:number; is_critical:boolean; notes:string; }
interface Milestone { id:number; milestone_name:string; milestone_type:string; planned_date:string; actual_date:string; status:string; deliverable:string; owner_id:number; days_variance:number; }
interface Risk { id:number; risk_id_code:string; title:string; category:string; probability:string; impact:string; risk_score:number; risk_level:string; status:string; mitigation_plan:string; }
interface Issue { id:number; issue_number:string; title:string; issue_type:string; priority:string; status:string; assigned_to:number; raised_date:string; target_date:string; }
interface Budget { approved_budget:number; contingency:number; total_budget:number; labour_cost_planned:number; material_cost_planned:number; equipment_cost_planned:number; overhead_planned:number; labour_cost_actual:number; material_cost_actual:number; equipment_cost_actual:number; overhead_actual:number; total_actual:number; spi:number; cpi:number; notes:string; }
interface Employee { id:number; first_name:string; last_name:string; employee_number:string; }
interface Overview { project:Project; phases:Phase[]; summary:any; overall_progress:number; recent_activity:any[]; }

// ── Status / Priority styles ──────────────────────────────────────────────────
const STATUS_COLORS: Record<string,string> = { not_started:'gray', in_progress:'blue', completed:'green', on_hold:'yellow', cancelled:'red', pending:'gray', achieved:'green', missed:'red', at_risk:'yellow', open:'red', mitigated:'green', accepted:'yellow', occurred:'red' };
const PRIORITY_COLORS: Record<string,string> = { low:'gray', medium:'blue', high:'orange', critical:'red' };
const RISK_COLORS: Record<string,string> = { low:'green', medium:'yellow', high:'red', critical:'red' };

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtCur = (v?: number) => `₹${(v||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;

export default function ProjectDetailPage() {
  const { id } = useParams<{id:string}>();
  const navigate = useNavigate();
  const projId = Number(id);

  const [tab, setTab] = useState<'overview'|'plan'|'milestones'|'risks'|'issues'|'budget'|'documents'|'activity'>('overview');
  const [overview, setOverview] = useState<Overview|null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [wbsItems, setWbsItems] = useState<WBSItem[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [budget, setBudget] = useState<Budget|null>(null);
  const [projDocs, setProjDocs] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [wbsEditModal, setWbsEditModal] = useState<WBSItem|null>(null);
  const [addWbsModal, setAddWbsModal] = useState<{phase_id?:number;parent_id?:number}|null>(null);
  const [addMsModal, setAddMsModal] = useState(false);
  const [addRiskModal, setAddRiskModal] = useState(false);
  const [addIssueModal, setAddIssueModal] = useState(false);
  const [addDocModal, setAddDocModal] = useState(false);
  const [phaseModal, setPhaseModal] = useState(false);
  const [filterPhase, setFilterPhase] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  // Forms
  const [wbsForm, setWbsForm] = useState<any>({task_name:'',task_type:'task',planned_start:'',planned_end:'',duration_days:1,assigned_to:'',priority:'medium',estimated_hours:8,predecessors:'',notes:''});
  const [msForm, setMsForm] = useState<any>({milestone_name:'',milestone_type:'delivery',planned_date:'',deliverable:'',acceptance_criteria:''});
  const [riskForm, setRiskForm] = useState<any>({title:'',category:'technical',probability:'medium',impact:'medium',mitigation_plan:'',identified_date:new Date().toISOString().split('T')[0]});
  const [issueForm, setIssueForm] = useState<any>({title:'',issue_type:'issue',priority:'medium',severity:'medium',impact_on_schedule:'none',impact_on_budget:'none',raised_date:new Date().toISOString().split('T')[0]});
  const [docForm, setDocForm] = useState<any>({title:'',document_type:'plan',category:'',version:'1.0',description:'',status:'draft'});
  const [phaseForm, setPhaseForm] = useState<any>({phase_name:'',phase_code:'',planned_start:'',planned_end:'',color:'#6366f1',phase_order:1});
  const [budgetForm, setBudgetForm] = useState<any>({approved_budget:0,contingency:0,labour_cost_planned:0,material_cost_planned:0,equipment_cost_planned:0,overhead_planned:0,labour_cost_actual:0,material_cost_actual:0,equipment_cost_actual:0,overhead_actual:0});
  const [commentText, setCommentText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, empRes] = await Promise.all([
        api.get(`/projects-v2/${projId}/overview`),
        api.get('/hr/employees', { params:{limit:200} }),
      ]);
      setOverview(ovRes.data);
      setPhases(ovRes.data.phases || []);
      setEmployees(empRes.data.items || empRes.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [projId]);

  const loadTab = useCallback(async () => {
    try {
      if (tab==='plan') {
        const r = await api.get(`/projects-v2/${projId}/wbs`, { params: filterPhase ? {phase_id:filterPhase} : {} });
        setWbsItems(r.data.items || []);
      } else if (tab==='milestones') {
        const r = await api.get(`/projects-v2/${projId}/milestones`);
        setMilestones(r.data);
      } else if (tab==='risks') {
        const r = await api.get(`/projects-v2/${projId}/risks`);
        setRisks(r.data);
      } else if (tab==='issues') {
        const r = await api.get(`/projects-v2/${projId}/issues`);
        setIssues(r.data);
      } else if (tab==='budget') {
        const r = await api.get(`/projects-v2/${projId}/budget`);
        setBudget(r.data);
        setBudgetForm({...r.data});
      } else if (tab==='documents') {
        const r = await api.get(`/projects-v2/${projId}/documents`);
        setProjDocs(r.data);
      } else if (tab==='activity') {
        const r = await api.get(`/projects-v2/${projId}/activity`);
        setActivity(r.data);
      }
    } catch {}
  }, [projId, tab, filterPhase]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadTab(); }, [loadTab]);

  const empName = (id?:number) => { const e=employees.find(e=>e.id===id); return e?`${e.first_name} ${e.last_name}`:'—'; };

  const updateWbs = async (id:number, updates:any) => {
    await api.put(`/projects-v2/${projId}/wbs/${id}`, updates);
    loadTab(); toast.success('Updated');
  };

  const addWbs = async () => {
    if (!wbsForm.task_name) return toast.error('Enter task name');
    const payload = { ...wbsForm, project_id:projId,
      phase_id:addWbsModal?.phase_id||undefined,
      parent_id:addWbsModal?.parent_id||undefined,
      assigned_to:wbsForm.assigned_to?Number(wbsForm.assigned_to):undefined,
      level:addWbsModal?.parent_id?2:1 };
    await api.post(`/projects-v2/${projId}/wbs`, payload);
    toast.success('Task added!'); setAddWbsModal(null); loadTab();
    setWbsForm({task_name:'',task_type:'task',planned_start:'',planned_end:'',duration_days:1,assigned_to:'',priority:'medium',estimated_hours:8,predecessors:'',notes:''});
  };

  const addMilestone = async () => {
    if (!msForm.milestone_name || !msForm.planned_date) return toast.error('Fill required fields');
    await api.post(`/projects-v2/${projId}/milestones`, {...msForm, project_id:projId});
    toast.success('Milestone added!'); setAddMsModal(false); loadTab();
  };

  const addRisk = async () => {
    if (!riskForm.title) return toast.error('Enter risk title');
    await api.post(`/projects-v2/${projId}/risks`, {...riskForm, project_id:projId});
    toast.success('Risk added!'); setAddRiskModal(false); loadTab();
  };

  const addIssue = async () => {
    if (!issueForm.title) return toast.error('Enter issue title');
    await api.post(`/projects-v2/${projId}/issues`, {...issueForm, project_id:projId});
    toast.success('Issue added!'); setAddIssueModal(false); loadTab();
  };

  const addDoc = async () => {
    if (!docForm.title) return toast.error('Enter document title');
    await api.post(`/projects-v2/${projId}/documents`, {...docForm, project_id:projId});
    toast.success('Document added!'); setAddDocModal(false); loadTab();
  };

  const addPhase = async () => {
    if (!phaseForm.phase_name) return toast.error('Enter phase name');
    await api.post(`/projects-v2/${projId}/phases`, {...phaseForm, project_id:projId, phase_order:phases.length+1});
    toast.success('Phase added!'); setPhaseModal(false); load();
  };

  const saveBudget = async () => {
    await api.put(`/projects-v2/${projId}/budget`, budgetForm);
    toast.success('Budget saved!'); loadTab();
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    await api.post(`/projects-v2/${projId}/activity/comment`, {comment: commentText});
    toast.success('Comment added'); setCommentText(''); loadTab();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading project...</p></div>
    </div>
  );

  if (!overview) return <div className="p-8 text-center text-slate-400">Project not found</div>;

  const { project: proj, summary } = overview;
  const budgetVariance = (budget?.total_budget||proj.budget||0) - (budget?.total_actual||proj.actual_cost||0);

  const TABS = [
    {id:'overview',label:'Overview',icon:'📊'},
    {id:'plan',label:'Project Plan',icon:'📋'},
    {id:'milestones',label:'Milestones',icon:'🏁'},
    {id:'risks',label:'Risk Register',icon:'⚠️'},
    {id:'issues',label:'Issues',icon:'🐛'},
    {id:'budget',label:'Budget',icon:'💰'},
    {id:'documents',label:'Documents',icon:'📁'},
    {id:'activity',label:'Activity',icon:'🕐'},
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <button onClick={()=>navigate('/projects')} className="text-slate-400 hover:text-indigo-600 text-sm">← Projects</button>
              <span className="text-slate-300">/</span>
              <span className="font-mono text-xs text-slate-400">{proj.project_number}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-1">{proj.name}</h1>
            <p className="text-sm text-slate-400 line-clamp-2">{proj.description}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge label={proj.status?.replace('_',' ')} color={STATUS_COLORS[proj.status] as any} />
              <Badge label={proj.priority} color={PRIORITY_COLORS[proj.priority] as any} />
              <span className="text-xs text-slate-400 capitalize">{proj.project_type?.replace('_',' ')}</span>
              {proj.start_date && <span className="text-xs text-slate-400">📅 {fmtDate(proj.start_date)} → {fmtDate(proj.end_date)}</span>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-3xl font-bold text-indigo-600">{overview.overall_progress}%</div>
            <div className="text-xs text-slate-400">Overall Progress</div>
            <div className="mt-2 w-32 h-2 bg-slate-100 rounded-full">
              <div className="h-2 bg-indigo-600 rounded-full" style={{width:`${overview.overall_progress}%`}} />
            </div>
          </div>
        </div>

        {/* Phase Progress Bar */}
        {phases.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-1 mb-1">
              {phases.map(ph=>(
                <div key={ph.id} className="flex-1 relative group" title={`${ph.phase_name}: ${ph.progress_percent}%`}>
                  <div className="h-5 rounded overflow-hidden border border-slate-200" style={{backgroundColor:ph.color+'30'}}>
                    <div className="h-5 transition-all duration-500" style={{width:`${ph.progress_percent}%`, backgroundColor:ph.color}} />
                  </div>
                  <div className="hidden group-hover:block absolute bottom-6 left-0 z-10 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {ph.phase_name}: {ph.progress_percent}%
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap mt-1">
              {phases.map(ph=>(
                <div key={ph.id} className="flex items-center gap-1 text-xs text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:ph.color}} />
                  <span>{ph.phase_name}</span>
                  <span className="text-slate-300">({ph.progress_percent}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick stats row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-50">
          {[
            {label:'Tasks',value:`${summary.completed_tasks}/${summary.total_tasks}`},
            {label:'Milestones',value:`${summary.milestones_achieved}/${summary.milestones_total}`},
            {label:'Open Risks',value:summary.open_risks,color:summary.open_risks>0?'text-red-500':''},
            {label:'Open Issues',value:summary.open_issues,color:summary.open_issues>0?'text-orange-500':''},
            {label:'Budget',value:fmtCur(summary.budget_planned)},
            {label:'Spent',value:fmtCur(summary.budget_actual),color:summary.budget_actual>summary.budget_planned?'text-red-500':'text-green-600'},
          ].map(s=>(
            <div key={s.label} className="text-center">
              <div className={`text-base font-bold ${s.color||'text-slate-800'}`}>{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 overflow-x-auto">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab===t.id?'bg-indigo-600 text-white shadow-sm':'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            <span>{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* OVERVIEW */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {tab==='overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Phases status */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Project Phases</h3>
                <button onClick={()=>setPhaseModal(true)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add Phase</button>
              </div>
              <div className="space-y-3">
                {phases.map(ph=>(
                  <div key={ph.id} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:ph.color}} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{ph.phase_name}</span>
                        <span className="text-xs text-slate-400">{ph.progress_percent}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full">
                        <div className="h-1.5 rounded-full" style={{width:`${ph.progress_percent}%`, backgroundColor:ph.color}} />
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{fmtDate(ph.planned_start)} → {fmtDate(ph.planned_end)}</div>
                    </div>
                    <Badge label={ph.status.replace('_',' ')} color={STATUS_COLORS[ph.status] as any || 'gray'} />
                  </div>
                ))}
              </div>
            </div>

            {/* Milestone summary */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4">Milestone Health</h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  {label:'Total',value:summary.milestones_total,color:'text-slate-800'},
                  {label:'Achieved ✅',value:summary.milestones_achieved,color:'text-green-600'},
                  {label:'At Risk ⚠️',value:summary.milestones_at_risk,color:'text-yellow-600'},
                  {label:'Missed ❌',value:summary.milestones_missed,color:'text-red-500'},
                ].map(s=>(
                  <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-slate-400">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="text-sm text-slate-500">
                Completion: <strong className="text-slate-800">{summary.milestones_total>0?Math.round(summary.milestones_achieved/summary.milestones_total*100):0}%</strong>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-3">Recent Activity</h3>
            {overview.recent_activity.length===0 ? (
              <div className="text-slate-400 text-sm py-4 text-center">No activity yet</div>
            ) : (
              <div className="space-y-3">
                {overview.recent_activity.map(a=>(
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0">
                      {a.activity_type==='comment'?'💬':a.activity_type?.includes('milestone')?'🏁':a.activity_type?.includes('risk')?'⚠️':'📌'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-700">{a.description||a.title}</div>
                      <div className="text-xs text-slate-400">{a.created_at?new Date(a.created_at).toLocaleDateString('en-IN'):''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* PROJECT PLAN — MS PROJECT STYLE WBS GRID */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {tab==='plan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <select value={filterPhase} onChange={e=>{setFilterPhase(e.target.value);}} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
                <option value="">All Phases</option>
                {phases.map(p=><option key={p.id} value={p.id}>{p.phase_name}</option>)}
              </select>
              <span className="text-sm text-slate-500">{wbsItems.length} tasks</span>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setAddWbsModal({})} className="gradient-bg text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">+ Add Task</button>
            </div>
          </div>

          {/* WBS Grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="grid bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase sticky top-0 z-10"
              style={{gridTemplateColumns:'40px 80px 2fr 90px 90px 60px 1fr 90px 90px 80px 80px 40px'}}>
              {['','WBS','Task Name','Start','End','Dur','Assigned','% Done','Status','Est.Hrs','Act.Hrs',''].map((h,i)=>(
                <div key={i} className="px-2 py-3 truncate">{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div className="max-h-[600px] overflow-y-auto">
              {wbsItems.length===0 ? (
                <div className="text-center py-16 text-slate-400">
                  <div className="text-3xl mb-2">📋</div>
                  <div>No tasks yet. Click "+ Add Task" to start building your project plan.</div>
                </div>
              ) : wbsItems.map((item, idx)=>{
                const isEditing = wbsEditModal?.id === item.id;
                const indentPx = (item.level - 1) * 16;
                const rowBg = item.task_type==='summary' ? 'bg-slate-50' : item.is_critical ? 'bg-red-50/40' : (idx%2===0?'bg-white':'bg-slate-50/30');
                const phase = phases.find(p=>p.id===item.phase_id);

                return (
                  <div key={item.id}
                    className={`grid border-b border-slate-50 hover:bg-blue-50/30 transition-colors group ${rowBg}`}
                    style={{gridTemplateColumns:'40px 80px 2fr 90px 90px 60px 1fr 90px 90px 80px 80px 40px'}}>
                    {/* Row # */}
                    <div className="px-2 py-2.5 text-xs text-slate-300 flex items-center">{idx+1}</div>
                    {/* WBS Code */}
                    <div className="px-2 py-2.5 font-mono text-xs text-indigo-600 flex items-center">{item.wbs_code}</div>
                    {/* Task Name with indent */}
                    <div className="px-2 py-2.5 flex items-center gap-1" style={{paddingLeft:`${8+indentPx}px`}}>
                      {item.task_type==='summary' && <span className="text-slate-400 text-xs">▼</span>}
                      {item.is_critical && <span className="text-red-500 text-xs" title="Critical path">●</span>}
                      <span className={`text-sm truncate ${item.task_type==='summary'?'font-semibold text-slate-800':'text-slate-700'}`}>{item.task_name}</span>
                      {phase && <span className="text-[9px] px-1 py-0.5 rounded ml-1 text-white flex-shrink-0" style={{backgroundColor:phase.color+'cc'}}>{phase.phase_code}</span>}
                    </div>
                    {/* Start */}
                    <div className="px-2 py-2.5 text-xs text-slate-600 flex items-center">
                      <input type="date" defaultValue={item.planned_start||''} className="text-xs border-0 bg-transparent focus:ring-1 focus:ring-indigo-300 rounded w-full"
                        onBlur={e=>e.target.value!==item.planned_start && updateWbs(item.id,{planned_start:e.target.value})} />
                    </div>
                    {/* End */}
                    <div className="px-2 py-2.5 text-xs text-slate-600 flex items-center">
                      <input type="date" defaultValue={item.planned_end||''} className="text-xs border-0 bg-transparent focus:ring-1 focus:ring-indigo-300 rounded w-full"
                        onBlur={e=>e.target.value!==item.planned_end && updateWbs(item.id,{planned_end:e.target.value})} />
                    </div>
                    {/* Duration */}
                    <div className="px-2 py-2.5 text-xs text-slate-600 flex items-center">
                      <input type="number" defaultValue={item.duration_days} min={1} className="text-xs border-0 bg-transparent focus:ring-1 focus:ring-indigo-300 rounded w-12 text-center"
                        onBlur={e=>Number(e.target.value)!==item.duration_days && updateWbs(item.id,{duration_days:Number(e.target.value)})} />d
                    </div>
                    {/* Assigned */}
                    <div className="px-2 py-2.5 text-xs text-slate-600 flex items-center truncate">
                      <select defaultValue={item.assigned_to||''} className="text-xs border-0 bg-transparent focus:ring-1 focus:ring-indigo-300 rounded w-full truncate"
                        onChange={e=>updateWbs(item.id,{assigned_to:e.target.value?Number(e.target.value):null})}>
                        <option value="">—</option>
                        {employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name?.charAt(0)}.</option>)}
                      </select>
                    </div>
                    {/* % Complete */}
                    <div className="px-2 py-2.5 flex items-center gap-1">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full">
                        <div className={`h-1.5 rounded-full ${item.percent_complete===100?'bg-green-500':item.percent_complete>0?'bg-blue-500':'bg-slate-200'}`}
                          style={{width:`${item.percent_complete}%`}} />
                      </div>
                      <input type="number" defaultValue={item.percent_complete} min={0} max={100}
                        className="text-xs border-0 bg-transparent focus:ring-1 focus:ring-indigo-300 rounded w-8 text-right"
                        onBlur={e=>Number(e.target.value)!==item.percent_complete && updateWbs(item.id,{percent_complete:Number(e.target.value)})} />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                    {/* Status */}
                    <div className="px-2 py-2.5 flex items-center">
                      <select defaultValue={item.status} className="text-xs border border-slate-200 bg-white rounded-lg px-1 py-0.5 focus:outline-none"
                        onChange={e=>updateWbs(item.id,{status:e.target.value})}>
                        {['not_started','in_progress','completed','on_hold','cancelled'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                      </select>
                    </div>
                    {/* Est Hours */}
                    <div className="px-2 py-2.5 text-xs text-slate-500 flex items-center">
                      <input type="number" defaultValue={item.estimated_hours} min={0}
                        className="text-xs border-0 bg-transparent focus:ring-1 focus:ring-indigo-300 rounded w-14 text-right"
                        onBlur={e=>Number(e.target.value)!==item.estimated_hours && updateWbs(item.id,{estimated_hours:Number(e.target.value)})} />h
                    </div>
                    {/* Act Hours */}
                    <div className="px-2 py-2.5 text-xs flex items-center">
                      <span className={item.actual_hours>item.estimated_hours?'text-red-500':'text-green-600'}>{item.actual_hours.toFixed(0)}h</span>
                    </div>
                    {/* Delete */}
                    <div className="px-1 py-2.5 flex items-center opacity-0 group-hover:opacity-100">
                      <button onClick={()=>{if(window.confirm('Delete task?'))api.delete(`/projects-v2/${projId}/wbs/${item.id}`).then(()=>{loadTab();toast.success('Deleted');})}}
                        className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="grid bg-slate-100 border-t border-slate-200 text-xs font-semibold text-slate-600 px-2 py-2"
              style={{gridTemplateColumns:'40px 80px 2fr 90px 90px 60px 1fr 90px 90px 80px 80px 40px'}}>
              <div/><div/><div>Total: {wbsItems.length} tasks</div><div/><div/><div/>
              <div/><div className="px-2">{wbsItems.length>0?`${Math.round(wbsItems.reduce((s,i)=>s+i.percent_complete,0)/wbsItems.length)}%`:''} avg</div>
              <div/><div className="px-2">{wbsItems.reduce((s,i)=>s+i.estimated_hours,0).toFixed(0)}h</div>
              <div className="px-2">{wbsItems.reduce((s,i)=>s+i.actual_hours,0).toFixed(0)}h</div><div/>
            </div>
          </div>

          {/* Add task to phase buttons */}
          <div className="flex gap-2 flex-wrap">
            {phases.map(ph=>(
              <button key={ph.id} onClick={()=>setAddWbsModal({phase_id:ph.id})}
                className="text-xs px-3 py-1.5 rounded-xl border text-white font-medium hover:opacity-80"
                style={{backgroundColor:ph.color+'cc', borderColor:ph.color}}>
                + Task in {ph.phase_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* MILESTONES */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {tab==='milestones' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setAddMsModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Add Milestone</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['Milestone','Type','Planned Date','Actual Date','Variance','Deliverable','Status'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {milestones.map(ms=>(
                  <tr key={ms.id} className={`hover:bg-slate-50 ${ms.status==='missed'?'bg-red-50':ms.status==='at_risk'?'bg-yellow-50':''}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{ms.status==='achieved'?'✅':ms.status==='missed'?'❌':ms.status==='at_risk'?'⚠️':'🏁'}</span>
                        {ms.milestone_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-500">{ms.milestone_type?.replace('_',' ')}</td>
                    <td className="px-4 py-3 font-mono text-sm">{fmtDate(ms.planned_date)}</td>
                    <td className="px-4 py-3 font-mono text-sm">{ms.actual_date?fmtDate(ms.actual_date):'—'}</td>
                    <td className="px-4 py-3">
                      {ms.days_variance!==0 && ms.status!=='achieved' ? (
                        <span className={`text-xs font-medium ${ms.days_variance>0?'text-red-500':'text-green-600'}`}>
                          {ms.days_variance>0?`+${ms.days_variance}d late`:`${ms.days_variance}d ahead`}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{ms.deliverable||'—'}</td>
                    <td className="px-4 py-3">
                      <select defaultValue={ms.status}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                        onChange={e=>api.put(`/projects-v2/${projId}/milestones/${ms.id}`,{status:e.target.value,actual_date:e.target.value==='achieved'?new Date().toISOString().split('T')[0]:undefined}).then(()=>{loadTab();})}>
                        {['pending','achieved','missed','at_risk'].map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {milestones.length===0 && <div className="text-center py-12 text-slate-400">No milestones. Add key project checkpoints.</div>}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* RISK REGISTER */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {tab==='risks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              {['critical','high','medium','low'].map(level=>(
                <div key={level} className="text-center">
                  <div className={`text-xl font-bold ${RISK_COLORS[level]==='red'?'text-red-500':RISK_COLORS[level]==='yellow'?'text-yellow-600':'text-green-600'}`}>
                    {risks.filter(r=>r.risk_level===level).length}
                  </div>
                  <div className="text-xs text-slate-400 capitalize">{level}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>setAddRiskModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Add Risk</button>
          </div>

          <div className="space-y-3">
            {risks.map(risk=>(
              <div key={risk.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${risk.risk_level==='critical'?'border-red-200':risk.risk_level==='high'?'border-orange-200':'border-slate-100'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-16 text-center flex-shrink-0">
                      <div className="text-2xl font-black" style={{color:risk.risk_level==='critical'?'#ef4444':risk.risk_level==='high'?'#f97316':risk.risk_level==='medium'?'#f59e0b':'#10b981'}}>
                        {risk.risk_score}
                      </div>
                      <div className="text-xs font-mono text-slate-400">{risk.risk_id_code}</div>
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800">{risk.title}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge label={risk.risk_level} color={RISK_COLORS[risk.risk_level] as any} />
                        <span className="text-xs text-slate-500 capitalize">P:{risk.probability} × I:{risk.impact}</span>
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded capitalize">{risk.category}</span>
                      </div>
                      {risk.mitigation_plan && <div className="text-xs text-slate-500 mt-1.5 bg-green-50 px-2 py-1 rounded">🛡️ {risk.mitigation_plan}</div>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge label={risk.status} color={risk.status==='open'?'red':risk.status==='mitigated'?'green':'yellow'} />
                    <select defaultValue={risk.status}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1"
                      onChange={e=>api.put(`/projects-v2/${projId}/risks/${risk.id}`,{status:e.target.value}).then(()=>loadTab())}>
                      {['open','mitigated','accepted','closed','occurred'].map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            {risks.length===0 && <div className="bg-white rounded-2xl p-12 text-center text-slate-400 shadow-sm border border-slate-100">No risks identified. Use the risk register to track project risks proactively.</div>}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* ISSUES */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {tab==='issues' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setAddIssueModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Add Issue / CR</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['#','Title','Type','Priority','Assigned To','Raised','Target','Status'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {issues.map(issue=>(
                  <tr key={issue.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600">{issue.issue_number}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{issue.title}</td>
                    <td className="px-4 py-3"><Badge label={issue.issue_type.replace('_',' ')} color="blue" /></td>
                    <td className="px-4 py-3"><Badge label={issue.priority} color={PRIORITY_COLORS[issue.priority] as any} /></td>
                    <td className="px-4 py-3 text-slate-500">{empName(issue.assigned_to)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(issue.raised_date)}</td>
                    <td className="px-4 py-3 text-xs">{issue.target_date?<span className={new Date(issue.target_date)<new Date()&&issue.status!=='resolved'&&issue.status!=='closed'?'text-red-500':'text-slate-400'}>{fmtDate(issue.target_date)}</span>:'—'}</td>
                    <td className="px-4 py-3">
                      <select defaultValue={issue.status} className="text-xs border border-slate-200 rounded-lg px-2 py-1"
                        onChange={e=>api.put(`/projects-v2/${projId}/issues/${issue.id}`,{status:e.target.value}).then(()=>loadTab())}>
                        {['open','in_progress','resolved','closed','rejected'].map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {issues.length===0 && <div className="text-center py-10 text-slate-400">No issues or change requests.</div>}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* BUDGET */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {tab==='budget' && budget && (
        <div className="space-y-5">
          {/* EVM Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {label:'Total Budget',value:fmtCur(budget.total_budget),color:'text-slate-800'},
              {label:'Actual Spent',value:fmtCur(budget.total_actual),color:budget.total_actual>budget.total_budget?'text-red-500':'text-green-600'},
              {label:'Variance',value:fmtCur(budget.total_budget-budget.total_actual),color:budget.total_budget>=budget.total_actual?'text-green-600':'text-red-500'},
              {label:'% Spent',value:`${budget.total_budget>0?Math.round(budget.total_actual/budget.total_budget*100):0}%`,color:'text-indigo-600'},
            ].map(s=>(
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="text-xs text-slate-500">{s.label}</div>
                <div className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* EVM Metrics */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {label:'CPI (Cost Performance Index)',value:budget.cpi?.toFixed(2)||'1.00',good:Number(budget.cpi)>=1,desc:Number(budget.cpi)>=1?'Under budget':'Over budget'},
              {label:'SPI (Schedule Performance Index)',value:budget.spi?.toFixed(2)||'1.00',good:Number(budget.spi)>=1,desc:Number(budget.spi)>=1?'Ahead of schedule':'Behind schedule'},
              {label:'Contingency Used',value:fmtCur(Math.max(0,budget.total_actual-budget.approved_budget)),good:budget.total_actual<=budget.approved_budget,desc:'of '+fmtCur(budget.contingency)+' contingency'},
            ].map(s=>(
              <div key={s.label} className={`bg-white rounded-2xl p-5 shadow-sm border ${s.good?'border-green-100':'border-red-100'}`}>
                <div className="text-xs text-slate-500">{s.label}</div>
                <div className={`text-2xl font-bold mt-1 ${s.good?'text-green-600':'text-red-500'}`}>{s.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.desc}</div>
              </div>
            ))}
          </div>

          {/* Budget breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Cost Breakdown</h3>
              <button onClick={saveBudget} className="gradient-bg text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">Save Budget</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100">
                  <tr className="text-xs font-semibold text-slate-500 uppercase">
                    <th className="text-left py-2">Category</th>
                    <th className="text-right py-2">Planned</th>
                    <th className="text-right py-2">Actual</th>
                    <th className="text-right py-2">Variance</th>
                    <th className="text-right py-2">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    {label:'Labour',planned:budget.labour_cost_planned,actual:budget.labour_cost_actual,pkey:'labour_cost_planned',akey:'labour_cost_actual'},
                    {label:'Materials',planned:budget.material_cost_planned,actual:budget.material_cost_actual,pkey:'material_cost_planned',akey:'material_cost_actual'},
                    {label:'Equipment',planned:budget.equipment_cost_planned,actual:budget.equipment_cost_actual,pkey:'equipment_cost_planned',akey:'equipment_cost_actual'},
                    {label:'Overhead',planned:budget.overhead_planned,actual:budget.overhead_actual,pkey:'overhead_planned',akey:'overhead_actual'},
                  ].map(row=>{
                    const variance = (row.planned||0) - (row.actual||0);
                    const pct = row.planned>0 ? Math.round(row.actual/row.planned*100) : 0;
                    return (
                      <tr key={row.label} className="hover:bg-slate-50">
                        <td className="py-3 font-medium">{row.label}</td>
                        <td className="py-3 text-right">
                          <input type="number" value={budgetForm[row.pkey]||0} onChange={e=>setBudgetForm((f:any)=>({...f,[row.pkey]:Number(e.target.value)}))}
                            className="text-right border border-slate-200 rounded-lg px-2 py-1 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                        </td>
                        <td className="py-3 text-right">
                          <input type="number" value={budgetForm[row.akey]||0} onChange={e=>setBudgetForm((f:any)=>({...f,[row.akey]:Number(e.target.value)}))}
                            className="text-right border border-slate-200 rounded-lg px-2 py-1 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
                        </td>
                        <td className={`py-3 text-right font-medium ${variance<0?'text-red-500':'text-green-600'}`}>{fmtCur(variance)}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                              <div className={`h-1.5 rounded-full ${pct>100?'bg-red-400':'bg-blue-400'}`} style={{width:`${Math.min(100,pct)}%`}} />
                            </div>
                            <span className="text-xs text-slate-500">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-slate-200 font-bold">
                    <td className="py-3">Total</td>
                    <td className="py-3 text-right">{fmtCur(budget.total_budget)}</td>
                    <td className="py-3 text-right">{fmtCur(budget.total_actual)}</td>
                    <td className={`py-3 text-right ${budgetVariance<0?'text-red-500':'text-green-600'}`}>{fmtCur(budgetVariance)}</td>
                    <td className="py-3 text-right text-xs">{budget.total_budget>0?Math.round(budget.total_actual/budget.total_budget*100):0}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* DOCUMENTS */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {tab==='documents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setAddDocModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Add Document</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projDocs.map(doc=>(
              <div key={doc.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-2xl">
                    {doc.document_type==='plan'?'📋':doc.document_type==='report'?'📊':doc.document_type==='specification'?'📐':doc.document_type==='approval'?'✅':'📄'}
                  </div>
                  <Badge label={doc.status} color={doc.status==='approved'?'green':doc.status==='review'?'yellow':'gray'} />
                </div>
                <div className="font-semibold text-slate-800 mb-1">{doc.title}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <span className="bg-slate-100 px-2 py-0.5 rounded capitalize">{doc.document_type?.replace('_',' ') || 'Document'}</span>
                  <span>v{doc.version}</span>
                </div>
                {doc.description && <p className="text-xs text-slate-500 line-clamp-2">{doc.description}</p>}
                <div className="text-xs text-slate-400 mt-2">{doc.created_at?new Date(doc.created_at).toLocaleDateString('en-IN'):''}</div>
              </div>
            ))}
            {projDocs.length===0 && (
              <div className="col-span-3 bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
                <div className="text-3xl mb-2">📁</div>
                <div className="text-slate-400">No documents added yet</div>
                <button onClick={()=>setAddDocModal(true)} className="mt-3 gradient-bg text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">Add First Document</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* ACTIVITY LOG */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {tab==='activity' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex gap-3">
            <input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Add a comment or update..."
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&addComment()} />
            <button onClick={addComment} className="gradient-bg text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90">Post</button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {activity.length===0 ? (
              <div className="p-12 text-center text-slate-400">No activity recorded yet</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {activity.map(a=>(
                  <div key={a.id} className="px-5 py-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm flex-shrink-0">
                      {a.activity_type==='comment'?'💬':a.activity_type?.includes('milestone')?'🏁':a.activity_type?.includes('risk')?'⚠️':a.activity_type?.includes('document')?'📁':'📌'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-700">{a.description||a.title}</div>
                      {a.old_value&&a.new_value&&<div className="text-xs text-slate-400 mt-0.5">Changed: <span className="line-through">{a.old_value}</span> → <span className="font-medium">{a.new_value}</span></div>}
                    </div>
                    <div className="text-xs text-slate-400 flex-shrink-0">{a.created_at?new Date(a.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* Add WBS Task */}
      <Modal isOpen={!!addWbsModal} onClose={()=>setAddWbsModal(null)} title="Add Task / Work Item" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Task Name *</label>
              <input value={wbsForm.task_name} onChange={e=>setWbsForm((f:any)=>({...f,task_name:e.target.value}))} placeholder="e.g. System Architecture Design"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={wbsForm.task_type} onChange={e=>setWbsForm((f:any)=>({...f,task_type:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['task','summary','milestone','deliverable'].map(t=><option key={t} value={t}>{t}</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Planned Start</label>
              <input type="date" value={wbsForm.planned_start} onChange={e=>setWbsForm((f:any)=>({...f,planned_start:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Planned End</label>
              <input type="date" value={wbsForm.planned_end} onChange={e=>setWbsForm((f:any)=>({...f,planned_end:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Duration (Days)</label>
              <input type="number" value={wbsForm.duration_days} min={1} onChange={e=>setWbsForm((f:any)=>({...f,duration_days:Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
              <select value={wbsForm.assigned_to} onChange={e=>setWbsForm((f:any)=>({...f,assigned_to:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                <option value="">Unassigned</option>{employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={wbsForm.priority} onChange={e=>setWbsForm((f:any)=>({...f,priority:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['low','medium','high','critical'].map(p=><option key={p} value={p}>{p}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Est. Hours</label>
              <input type="number" value={wbsForm.estimated_hours} onChange={e=>setWbsForm((f:any)=>({...f,estimated_hours:Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Predecessors (WBS codes, comma-sep)</label>
              <input value={wbsForm.predecessors} onChange={e=>setWbsForm((f:any)=>({...f,predecessors:e.target.value}))} placeholder="1.1, 1.2" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Dependency Type</label>
              <select value={wbsForm.dependency_type} onChange={e=>setWbsForm((f:any)=>({...f,dependency_type:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {[['FS','Finish-Start'],['SS','Start-Start'],['FF','Finish-Finish'],['SF','Start-Finish']].map(([v,l])=><option key={v} value={v}>{v} — {l}</option>)}
              </select></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={wbsForm.notes} onChange={e=>setWbsForm((f:any)=>({...f,notes:e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          <div className="flex gap-3">
            <button onClick={()=>setAddWbsModal(null)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={addWbs} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Add Task</button>
          </div>
        </div>
      </Modal>

      {/* Add Milestone */}
      <Modal isOpen={addMsModal} onClose={()=>setAddMsModal(false)} title="Add Milestone" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Milestone Name *</label>
            <input value={msForm.milestone_name} onChange={e=>setMsForm((f:any)=>({...f,milestone_name:e.target.value}))} placeholder="e.g. UAT Sign-off"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={msForm.milestone_type} onChange={e=>setMsForm((f:any)=>({...f,milestone_type:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['delivery','review','approval','payment','go_live','kickoff','phase_complete'].map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Planned Date *</label>
              <input type="date" value={msForm.planned_date} onChange={e=>setMsForm((f:any)=>({...f,planned_date:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Deliverable</label>
            <input value={msForm.deliverable} onChange={e=>setMsForm((f:any)=>({...f,deliverable:e.target.value}))} placeholder="What will be delivered?"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Acceptance Criteria</label>
            <textarea value={msForm.acceptance_criteria} onChange={e=>setMsForm((f:any)=>({...f,acceptance_criteria:e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          <div className="flex gap-3">
            <button onClick={()=>setAddMsModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={addMilestone} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Add Milestone</button>
          </div>
        </div>
      </Modal>

      {/* Add Risk */}
      <Modal isOpen={addRiskModal} onClose={()=>setAddRiskModal(false)} title="Add Risk" size="lg">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Risk Title *</label>
            <input value={riskForm.title} onChange={e=>setRiskForm((f:any)=>({...f,title:e.target.value}))} placeholder="e.g. Key resource unavailability"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={riskForm.category} onChange={e=>setRiskForm((f:any)=>({...f,category:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['technical','resource','schedule','cost','quality','external','regulatory'].map(c=><option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Probability</label>
              <select value={riskForm.probability} onChange={e=>setRiskForm((f:any)=>({...f,probability:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['low','medium','high','critical'].map(v=><option key={v} value={v}>{v}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Impact</label>
              <select value={riskForm.impact} onChange={e=>setRiskForm((f:any)=>({...f,impact:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['low','medium','high','critical'].map(v=><option key={v} value={v}>{v}</option>)}
              </select></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Mitigation Plan</label>
            <textarea value={riskForm.mitigation_plan} onChange={e=>setRiskForm((f:any)=>({...f,mitigation_plan:e.target.value}))} rows={2} placeholder="How will you reduce this risk?" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          <div className="flex gap-3">
            <button onClick={()=>setAddRiskModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={addRisk} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Add Risk</button>
          </div>
        </div>
      </Modal>

      {/* Add Issue */}
      <Modal isOpen={addIssueModal} onClose={()=>setAddIssueModal(false)} title="Add Issue / Change Request" size="lg">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input value={issueForm.title} onChange={e=>setIssueForm((f:any)=>({...f,title:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={issueForm.issue_type} onChange={e=>setIssueForm((f:any)=>({...f,issue_type:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['issue','change_request','bug','enhancement','clarification'].map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={issueForm.priority} onChange={e=>setIssueForm((f:any)=>({...f,priority:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['low','medium','high','critical'].map(p=><option key={p} value={p}>{p}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
              <input type="date" value={issueForm.target_date||''} onChange={e=>setIssueForm((f:any)=>({...f,target_date:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
              <select value={issueForm.assigned_to||''} onChange={e=>setIssueForm((f:any)=>({...f,assigned_to:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                <option value="">Unassigned</option>{employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Impact on Schedule</label>
              <select value={issueForm.impact_on_schedule} onChange={e=>setIssueForm((f:any)=>({...f,impact_on_schedule:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['none','low','medium','high'].map(v=><option key={v} value={v}>{v}</option>)}
              </select></div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setAddIssueModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={addIssue} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Add Issue</button>
          </div>
        </div>
      </Modal>

      {/* Add Document */}
      <Modal isOpen={addDocModal} onClose={()=>setAddDocModal(false)} title="Add Project Document" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input value={docForm.title} onChange={e=>setDocForm((f:any)=>({...f,title:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
              <select value={docForm.document_type} onChange={e=>setDocForm((f:any)=>({...f,document_type:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['plan','report','specification','meeting_minutes','approval','contract','requirements','design','test_plan','manual'].map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Version</label>
              <input value={docForm.version} onChange={e=>setDocForm((f:any)=>({...f,version:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={docForm.description} onChange={e=>setDocForm((f:any)=>({...f,description:e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          <div className="flex gap-3">
            <button onClick={()=>setAddDocModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={addDoc} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Add Document</button>
          </div>
        </div>
      </Modal>

      {/* Add Phase */}
      <Modal isOpen={phaseModal} onClose={()=>setPhaseModal(false)} title="Add Project Phase" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Phase Name *</label>
              <input value={phaseForm.phase_name} onChange={e=>setPhaseForm((f:any)=>({...f,phase_name:e.target.value}))} placeholder="e.g. Testing & QA" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Phase Code</label>
              <input value={phaseForm.phase_code} onChange={e=>setPhaseForm((f:any)=>({...f,phase_code:e.target.value.toUpperCase()}))} placeholder="TEST" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Planned Start</label>
              <input type="date" value={phaseForm.planned_start} onChange={e=>setPhaseForm((f:any)=>({...f,planned_start:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Planned End</label>
              <input type="date" value={phaseForm.planned_end} onChange={e=>setPhaseForm((f:any)=>({...f,planned_end:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={phaseForm.color} onChange={e=>setPhaseForm((f:any)=>({...f,color:e.target.value}))} className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200" />
              <div className="flex gap-2">
                {['#6366f1','#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#64748b','#0891b2'].map(c=>(
                  <button key={c} onClick={()=>setPhaseForm((f:any)=>({...f,color:c}))} className="w-7 h-7 rounded-full border-2" style={{backgroundColor:c,borderColor:phaseForm.color===c?'#1e293b':'transparent'}} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setPhaseModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={addPhase} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Add Phase</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
