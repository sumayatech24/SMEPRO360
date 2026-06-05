import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface ApprovalRequest { id: number; request_number: string; workflow_type: string; title: string; description: string; status: string; priority: string; current_step: number; total_steps: number; amount: number; created_at: string; actions?: any[]; requested_by: number; }
interface Workflow { id: number; name: string; workflow_type: string; description: string; step_count: number; steps?: any[]; }
interface Authority { id: number; user_id: number; workflow_type: string; scope: string; max_amount: number; can_approve: boolean; can_delegate: boolean; user_name: string; }
interface Hierarchy { id: number; employee_id: number; employee_name: string; reporting_manager_id: number; reporting_manager_name: string; is_department_head: boolean; is_hr_manager: boolean; is_finance_approver: boolean; approval_limit: number; }
interface DocCategory { id: number; name: string; code: string; department: string; requires_approval: boolean; is_confidential: boolean; retention_years: number; }
interface Stats { total: number; pending: number; approved: number; rejected: number; pending_by_type: Record<string,number>; }

const WF_ICONS: Record<string,string> = { leave_request:'🌴', purchase_order:'📦', expense_claim:'💸', sales_order:'🛒', invoice:'📄', document:'📁', attendance_regularization:'📅', asset_disposal:'🗑️', policy_review:'📋' };
const STATUS_COLORS: Record<string,string> = { pending:'yellow', in_progress:'blue', approved:'green', rejected:'red', cancelled:'gray', escalated:'orange' };
const PRIORITY_COLORS: Record<string,string> = { low:'gray', normal:'blue', high:'orange', urgent:'red' };

export default function ApprovalsPage() {
  const [tab, setTab] = useState<'inbox'|'my-requests'|'workflows'|'authorities'|'hierarchy'|'doc-categories'>('inbox');
  const [inbox, setInbox] = useState<ApprovalRequest[]>([]);
  const [myRequests, setMyRequests] = useState<ApprovalRequest[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [hierarchy, setHierarchy] = useState<Hierarchy[]>([]);
  const [docCategories, setDocCategories] = useState<DocCategory[]>([]);
  const [stats, setStats] = useState<Stats|null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest|null>(null);
  const [actionModal, setActionModal] = useState(false);
  const [actionForm, setActionForm] = useState({ action:'approved', comment:'' });
  const [wfModal, setWfModal] = useState(false);
  const [wfDetail, setWfDetail] = useState<Workflow|null>(null);
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name:'', code:'', department:'', requires_approval:false, retention_years:5, is_confidential:false, description:'' });
  const [authModal, setAuthModal] = useState(false);
  const [authForm, setAuthForm] = useState({ user_id:'', workflow_type:'', scope:'department', max_amount:0 });
  const [users, setUsers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inboxRes, myRes, wfRes, authRes, hierRes, catRes, statsRes, uRes, eRes] = await Promise.all([
        api.get('/approvals/requests/inbox'),
        api.get('/approvals/requests/my-requests'),
        api.get('/approvals/workflows'),
        api.get('/approvals/authorities'),
        api.get('/approvals/hierarchy'),
        api.get('/approvals/document-categories'),
        api.get('/approvals/stats'),
        api.get('/users/', { params:{limit:100} }),
        api.get('/hr/employees', { params:{limit:100} }),
      ]);
      setInbox(inboxRes.data.items || []);
      setMyRequests(myRes.data.items || []);
      setWorkflows(wfRes.data || []);
      setAuthorities(authRes.data || []);
      setHierarchy(hierRes.data || []);
      setDocCategories(catRes.data || []);
      setStats(statsRes.data);
      setUsers(uRes.data.items || uRes.data || []);
      setEmployees(eRes.data.items || eRes.data || []);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const takeAction = async () => {
    if (!selectedReq) return;
    try {
      const res = await api.post(`/approvals/requests/${selectedReq.id}/action`, actionForm);
      toast.success(res.data.message);
      setActionModal(false); setSelectedReq(null); load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Action failed'); }
  };

  const openWfDetail = async (wf: Workflow) => {
    const res = await api.get(`/approvals/workflows/${wf.id}`);
    setWfDetail(res.data); setWfModal(true);
  };

  const createDocCategory = async () => {
    if (!catForm.name || !catForm.code) return toast.error('Fill required fields');
    try {
      await api.post('/approvals/document-categories', catForm);
      toast.success('Category created!'); setCatModal(false); load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const grantAuthority = async () => {
    if (!authForm.user_id || !authForm.workflow_type) return toast.error('Fill required fields');
    try {
      await api.post('/approvals/authorities', { user_id:Number(authForm.user_id), workflow_type:authForm.workflow_type, scope:authForm.scope, max_amount:Number(authForm.max_amount), can_approve:true, can_reject:true, can_delegate:false });
      toast.success('Authority granted!'); setAuthModal(false); load();
    } catch(e:any){ toast.error(e.response?.data?.detail||'Failed'); }
  };

  const revokeAuthority = async (id: number) => {
    await api.delete(`/approvals/authorities/${id}`);
    toast.success('Authority revoked'); load();
  };

  const filteredInbox = inbox.filter(r =>
    (!filterStatus || r.status === filterStatus) &&
    (!filterType || r.workflow_type === filterType)
  );

  const WORKFLOW_TYPES = [...new Set([...inbox, ...myRequests].map(r => r.workflow_type))];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Approval System</h1>
          <p className="text-slate-500 text-sm mt-1">Multi-level approval workflows, authorities & hierarchy</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {label:'Pending',value:stats.pending,color:'text-yellow-600',bg:'bg-yellow-50'},
            {label:'Approved',value:stats.approved,color:'text-green-600',bg:'bg-green-50'},
            {label:'Rejected',value:stats.rejected,color:'text-red-500',bg:'bg-red-50'},
            {label:'Total',value:stats.total,color:'text-slate-800',bg:'bg-slate-50'},
          ].map(s=>(
            <div key={s.label} className={`rounded-2xl p-4 border border-slate-100 ${s.bg}`}>
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
        {([
          ['inbox','📬 My Inbox'],
          ['my-requests','📤 My Requests'],
          ['workflows','⚙️ Workflows'],
          ['authorities','🔑 Authorities'],
          ['hierarchy','🏢 Manager Hierarchy'],
          ['doc-categories','📂 Document Categories'],
        ] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${tab===t?'bg-white text-indigo-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {label}
            {t==='inbox' && inbox.filter(r=>r.status==='pending').length>0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {inbox.filter(r=>r.status==='pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── INBOX ── */}
      {tab==='inbox' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="">All Status</option>
              {['pending','in_progress','approved','rejected'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              <option value="">All Types</option>
              {Object.keys(WF_ICONS).map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
            </select>
          </div>

          {filteredInbox.length===0 ? (
            <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-slate-100">
              <div className="text-4xl mb-3">✅</div>
              <div className="text-slate-500 font-medium">No pending approvals</div>
              <div className="text-slate-400 text-sm mt-1">Your inbox is clear!</div>
            </div>
          ) : filteredInbox.map(req=>(
            <div key={req.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{WF_ICONS[req.workflow_type]||'📋'}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">{req.title}</span>
                      <Badge label={req.request_number} color="gray" />
                      <Badge label={req.priority} color={PRIORITY_COLORS[req.priority] as any} />
                    </div>
                    <div className="text-xs text-indigo-600 font-medium mt-0.5 capitalize">{req.workflow_type.replace(/_/g,' ')}</div>
                    {req.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{req.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>Step {req.current_step}/{req.total_steps}</span>
                      {req.amount > 0 && <span className="font-medium text-slate-600">₹{req.amount.toLocaleString('en-IN')}</span>}
                      <span>{req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN') : ''}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full">
                      <div className="h-1.5 bg-indigo-500 rounded-full" style={{width:`${(req.current_step/req.total_steps)*100}%`}} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge label={req.status.replace('_',' ')} color={STATUS_COLORS[req.status] as any || 'gray'} />
                  {req.status==='pending'||req.status==='in_progress' ? (
                    <div className="flex gap-2">
                      <button onClick={()=>{setSelectedReq(req);setActionForm({action:'approved',comment:''});setActionModal(true);}}
                        className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-medium">✓ Approve</button>
                      <button onClick={()=>{setSelectedReq(req);setActionForm({action:'rejected',comment:''});setActionModal(true);}}
                        className="text-xs px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 font-medium">✗ Reject</button>
                      <button onClick={()=>{setSelectedReq(req);setActionForm({action:'returned',comment:''});setActionModal(true);}}
                        className="text-xs px-3 py-1.5 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 font-medium">↩ Return</button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MY REQUESTS ── */}
      {tab==='my-requests' && (
        <div className="space-y-3">
          {myRequests.length===0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
              <div className="text-3xl mb-2">📤</div>
              <div className="text-slate-400">No requests submitted yet</div>
            </div>
          ) : myRequests.map(req=>(
            <div key={req.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{WF_ICONS[req.workflow_type]||'📋'}</span>
                  <div>
                    <div className="font-semibold text-slate-800">{req.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{req.request_number} · {req.created_at?new Date(req.created_at).toLocaleDateString('en-IN'):''}</div>
                    {req.actions && req.actions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {req.actions.map((a:any,i:number)=>(
                          <div key={i} className="text-xs flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-white ${a.action==='approved'?'bg-green-500':a.action==='rejected'?'bg-red-500':'bg-yellow-500'}`}>{a.action}</span>
                            <span className="text-slate-500">{a.step_name}</span>
                            {a.comment && <span className="text-slate-400 italic">"{a.comment}"</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Badge label={req.status.replace('_',' ')} color={STATUS_COLORS[req.status] as any || 'gray'} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── WORKFLOWS ── */}
      {tab==='workflows' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {workflows.map(wf=>(
            <div key={wf.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md cursor-pointer" onClick={()=>openWfDetail(wf)}>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{WF_ICONS[wf.workflow_type]||'⚙️'}</span>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{wf.name}</div>
                  <div className="text-xs text-indigo-600 font-mono mt-0.5">{wf.workflow_type}</div>
                  {wf.description && <p className="text-sm text-slate-400 mt-1">{wf.description}</p>}
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({length:wf.step_count}).map((_,i)=>(
                      <div key={i} className="flex items-center gap-1">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-indigo-400 flex items-center justify-center text-xs font-bold text-indigo-600">{i+1}</div>
                        {i<wf.step_count-1 && <div className="w-6 h-0.5 bg-indigo-200" />}
                      </div>
                    ))}
                    <span className="text-xs text-slate-400 ml-2">{wf.step_count} step{wf.step_count!==1?'s':''}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── AUTHORITIES ── */}
      {tab==='authorities' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setAuthModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Grant Authority</button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['User','Workflow Type','Scope','Max Amount','Permissions',''].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {authorities.map(a=>(
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{a.user_name}</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-1">{WF_ICONS[a.workflow_type]||'📋'} <span className="capitalize text-xs">{a.workflow_type.replace(/_/g,' ')}</span></span></td>
                    <td className="px-4 py-3 capitalize">{a.scope}</td>
                    <td className="px-4 py-3">{a.max_amount===0?'Unlimited':`₹${a.max_amount.toLocaleString('en-IN')}`}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {a.can_approve && <Badge label="Approve" color="green" />}
                        {a.can_delegate && <Badge label="Delegate" color="blue" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={()=>revokeAuthority(a.id)} className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded hover:bg-red-100">Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MANAGER HIERARCHY ── */}
      {tab==='hierarchy' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Manager reporting chain for {hierarchy.length} employees</p>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{['Employee','Reports To','Dept Head','HR Manager','Finance Approver','Approval Limit'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {hierarchy.map(h=>(
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">{h.employee_name?.[0]}</div><span className="font-medium">{h.employee_name}</span></div></td>
                    <td className="px-4 py-3 text-slate-600">{h.reporting_manager_name||<span className="text-slate-300 italic">No Manager (Top Level)</span>}</td>
                    <td className="px-4 py-3 text-center">{h.is_department_head?'✅':'—'}</td>
                    <td className="px-4 py-3 text-center">{h.is_hr_manager?'✅':'—'}</td>
                    <td className="px-4 py-3 text-center">{h.is_finance_approver?'✅':'—'}</td>
                    <td className="px-4 py-3">{h.approval_limit===0?<span className="text-slate-400">—</span>:`₹${h.approval_limit.toLocaleString('en-IN')}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DOCUMENT CATEGORIES ── */}
      {tab==='doc-categories' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setCatModal(true)} className="gradient-bg text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90">+ Add Category</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docCategories.map(cat=>(
              <div key={cat.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-slate-800">{cat.name}</div>
                    <div className="font-mono text-xs text-indigo-600 mt-0.5">{cat.code}</div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {cat.requires_approval && <Badge label="Needs Approval" color="yellow" />}
                    {cat.is_confidential && <Badge label="Confidential" color="red" />}
                  </div>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-3">
                  {cat.department && <span>📂 {cat.department}</span>}
                  <span>🗂️ Retain {cat.retention_years}yr</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ACTION MODAL ── */}
      <Modal isOpen={actionModal} onClose={()=>setActionModal(false)} title={`${actionForm.action==='approved'?'Approve':actionForm.action==='rejected'?'Reject':'Return'} Request`} size="md">
        {selectedReq && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="font-medium text-slate-800">{selectedReq.title}</div>
              <div className="text-xs text-slate-400 mt-1">{selectedReq.request_number} · Step {selectedReq.current_step}/{selectedReq.total_steps}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Action</label>
              <div className="flex gap-2">
                {['approved','rejected','returned','commented'].map(a=>(
                  <button key={a} onClick={()=>setActionForm(f=>({...f,action:a}))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${actionForm.action===a?(a==='approved'?'border-green-500 bg-green-50 text-green-700':a==='rejected'?'border-red-500 bg-red-50 text-red-700':'border-yellow-500 bg-yellow-50 text-yellow-700'):'border-slate-200 text-slate-400'}`}>
                    {a==='approved'?'✓ Approve':a==='rejected'?'✗ Reject':a==='returned'?'↩ Return':'💬 Comment'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Comment {actionForm.action!=='approved'?'*':''}</label>
              <textarea value={actionForm.comment} onChange={e=>setActionForm(f=>({...f,comment:e.target.value}))} rows={3}
                placeholder={actionForm.action==='rejected'?'Reason for rejection...':actionForm.action==='returned'?'What needs to be corrected...':'Optional comment...'}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setActionModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={takeAction} className={`flex-1 text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90 ${actionForm.action==='approved'?'bg-green-500':actionForm.action==='rejected'?'bg-red-500':'gradient-bg'}`}>
                {actionForm.action==='approved'?'✓ Confirm Approval':actionForm.action==='rejected'?'✗ Confirm Rejection':'Submit'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── WORKFLOW DETAIL MODAL ── */}
      <Modal isOpen={wfModal} onClose={()=>setWfModal(false)} title={wfDetail?.name||'Workflow'} size="lg">
        {wfDetail && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">{wfDetail.description}</p>
            <div className="space-y-3">
              {(wfDetail.steps||[]).map((step:any,i:number)=>(
                <div key={step.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{step.step_order}</div>
                  <div className="flex-1 border border-slate-200 rounded-xl p-3">
                    <div className="font-semibold text-slate-800">{step.step_name}</div>
                    <div className="text-xs text-indigo-600 mt-0.5 capitalize">{step.approver_type.replace(/_/g,' ')}{step.approver_role?` (${step.approver_role})`:''}</div>
                    <div className="flex gap-2 mt-2 text-xs text-slate-400">
                      {step.is_mandatory&&<span className="bg-red-50 text-red-500 px-2 py-0.5 rounded">Mandatory</span>}
                      {step.can_skip&&<span className="bg-green-50 text-green-500 px-2 py-0.5 rounded">Can Skip</span>}
                      {step.auto_approve_days>0&&<span className="bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded">Auto-approve in {step.auto_approve_days}d</span>}
                    </div>
                  </div>
                  {i<(wfDetail.steps?.length||0)-1&&<div className="absolute ml-4 mt-8 w-0.5 h-3 bg-indigo-200" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ── GRANT AUTHORITY MODAL ── */}
      <Modal isOpen={authModal} onClose={()=>setAuthModal(false)} title="Grant Approval Authority" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">User *</label>
            <select value={authForm.user_id} onChange={e=>setAuthForm(f=>({...f,user_id:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select User</option>
              {users.map(u=><option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Workflow Type *</label>
            <select value={authForm.workflow_type} onChange={e=>setAuthForm(f=>({...f,workflow_type:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Select Type</option>
              {Object.keys(WF_ICONS).map(t=><option key={t} value={t}>{WF_ICONS[t]} {t.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Scope</label>
              <select value={authForm.scope} onChange={e=>setAuthForm(f=>({...f,scope:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['self','department','division','all'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Amount (₹, 0=unlimited)</label>
              <input type="number" value={authForm.max_amount} onChange={e=>setAuthForm(f=>({...f,max_amount:Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setAuthModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={grantAuthority} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Grant Authority</button>
          </div>
        </div>
      </Modal>

      {/* ── DOC CATEGORY MODAL ── */}
      <Modal isOpen={catModal} onClose={()=>setCatModal(false)} title="Add Document Category" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
              <input value={catForm.code} onChange={e=>setCatForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="HR-POL" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <input value={catForm.department} onChange={e=>setCatForm(f=>({...f,department:e.target.value}))} placeholder="HR, Finance, IT..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Retention (Years)</label>
              <input type="number" value={catForm.retention_years} onChange={e=>setCatForm(f=>({...f,retention_years:Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={catForm.requires_approval} onChange={e=>setCatForm(f=>({...f,requires_approval:e.target.checked}))} className="w-4 h-4 rounded text-indigo-600" />
              <span className="text-sm text-slate-700">Requires Approval</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={catForm.is_confidential} onChange={e=>setCatForm(f=>({...f,is_confidential:e.target.checked}))} className="w-4 h-4 rounded text-indigo-600" />
              <span className="text-sm text-slate-700">Confidential</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setCatModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-600">Cancel</button>
            <button onClick={createDocCategory} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90">Create Category</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
