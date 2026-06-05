import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';
import toast from 'react-hot-toast';

const TABS = [
  {id:'overview',    icon:'📊', label:'Overview'},
  {id:'onboarding',  icon:'🚀', label:'Onboarding'},
  {id:'documents',   icon:'📁', label:'Documents'},
  {id:'training',    icon:'📚', label:'Training'},
  {id:'attendance',  icon:'📅', label:'Attendance'},
  {id:'leaves',      icon:'🌴', label:'Leaves'},
  {id:'benefits',    icon:'💎', label:'Benefits'},
  {id:'salary',      icon:'💰', label:'Salary'},
  {id:'tasks',       icon:'✔️', label:'Tasks'},
  {id:'projects',    icon:'🚀', label:'Projects'},
  {id:'performance', icon:'⭐', label:'Performance'},
  {id:'travel',      icon:'✈️', label:'Travel & Expenses'},
  {id:'exit',        icon:'🚪', label:'Exit'},
];

const DOC_TYPES = ['offer_letter','appointment_letter','id_proof','address_proof','pan','aadhaar','passport','visa','education','experience','nda','contract','increment_letter','exit_letter','other'];

export default function EmployeeDetailPage() {
  const { id } = useParams<{id:string}>();
  const navigate = useNavigate();
  const empId = Number(id);
  const [tab, setTab] = useState('overview');
  const [profile, setProfile] = useState<any>(null);
  const [onboarding, setOnboarding] = useState<any>(null);
  const [training, setTraining] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [benefits, setBenefits] = useState<any[]>([]);
  const [benefitPlans, setBenefitPlans] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [travelRequests, setTravelRequests] = useState<any[]>([]);
  const [exitRecord, setExitRecord] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [docModal, setDocModal] = useState(false);
  const [enrollModal, setEnrollModal] = useState(false);
  const [benefitModal, setBenefitModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [exitModal, setExitModal] = useState(false);
  const [docForm, setDocForm] = useState({document_type:'id_proof',document_name:'',document_number:'',issue_date:'',expiry_date:''});
  const [enrollForm, setEnrollForm] = useState({course_id:'',scheduled_date:'',trainer_name:''});
  const [reviewForm, setReviewForm] = useState({review_period:'',review_type:'annual',review_date:new Date().toISOString().split('T')[0],overall_rating:3,goal_achievement:3,skill_rating:3,strengths:'',areas_for_improvement:'',goals_next_period:'',outcome:'no_change',increment_percent:0});
  const [exitForm, setExitForm] = useState({resignation_date:new Date().toISOString().split('T')[0],last_working_date:'',exit_reason:'resignation',exit_reason_detail:'',notice_period_days:30});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, dRes, cRes, bpRes, psRes] = await Promise.all([
        api.get(`/hr-v2/employees/${empId}/profile`),
        api.get(`/hr/departments`),
        api.get('/hr-v2/training/courses'),
        api.get('/hr-v2/benefits/plans'),
        api.get(`/payroll-v2/payslip/employee/${empId}`).catch(()=>({data:[]})),
      ]);
      setProfile(pRes.data);
      setOnboarding(pRes.data.onboarding);
      setTraining(pRes.data.training || []);
      setDocuments(pRes.data.documents || []);
      setBenefits(pRes.data.benefits || []);
      setExitRecord(pRes.data.exit);
      setDepartments(dRes.data || []);
      setCourses(cRes.data || []);
      setBenefitPlans(bpRes.data || []);
      setPayslips(psRes.data || []);
      // Travel
      api.get('/travel/requests', { params:{employee_id:empId} }).then(r=>setTravelRequests(r.data.items||[])).catch(()=>{});
    } catch(e){ console.error(e); } finally { setLoading(false); }
  }, [empId]);

  useEffect(() => { load(); }, [load]);

  const updateOnboardingTask = async (taskId: string, status: string) => {
    if (!onboarding) { await api.post(`/hr-v2/onboarding/start/${empId}`); await load(); return; }
    const res = await api.put(`/hr-v2/onboarding/${empId}/task`, {task_id:taskId, status});
    setOnboarding((o:any) => ({...o, task_statuses:{...o.task_statuses,[taskId]:status}, progress_percent:res.data.progress_percent}));
    if (res.data.onboarding_status==='completed') toast.success('Onboarding completed! 🎉');
  };

  const addDocument = async () => {
    await api.post(`/hr-v2/documents/employee/${empId}`, docForm);
    toast.success('Document added'); setDocModal(false); load();
  };

  const enrollTraining = async () => {
    await api.post('/hr-v2/training/enroll', {employee_id:empId, ...enrollForm, course_id:Number(enrollForm.course_id)});
    toast.success('Enrolled in training!'); setEnrollModal(false); load();
  };

  const enrollBenefit = async (planId: number) => {
    await api.post('/hr-v2/benefits/enroll', {employee_id:empId, plan_id:planId});
    toast.success('Benefit enrolled!'); load();
  };

  const submitReview = async () => {
    await api.post('/hr-v2/performance/review', {employee_id:empId, ...reviewForm});
    toast.success('Performance review submitted!'); setReviewModal(false); load();
  };

  const initiateExit = async () => {
    await api.post(`/hr-v2/exit/initiate/${empId}`, exitForm);
    toast.success('Exit process initiated'); setExitModal(false); load();
  };

  const startOnboarding = async () => {
    await api.post(`/hr-v2/onboarding/start/${empId}`);
    toast.success('Onboarding started!'); load();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  if (!profile) return <div className="p-8 text-center text-slate-400">Employee not found</div>;

  const emp = profile.employee;
  const dept = departments.find(d=>d.id===emp.department_id);
  const sym = '₹';
  const fmtDate = (d?:string) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── EMPLOYEE HEADER ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {emp.first_name?.[0]}{emp.last_name?.[0]||''}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{emp.first_name} {emp.last_name||''}</h1>
                <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{emp.employee_number}</span>
                <Badge label={emp.status||'active'} color={emp.status==='active'?'green':'red'} />
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{dept?.name||'—'} · {emp.employment_type?.replace('_',' ')}</div>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                {emp.email && <span>✉ {emp.email}</span>}
                {emp.phone && <span>📞 {emp.phone}</span>}
                {emp.date_of_joining && <span>📅 Joined {fmtDate(emp.date_of_joining)}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={()=>navigate('/hr/employees')} className="text-sm px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50">← Back</button>
            {!exitRecord && <button onClick={()=>setExitModal(true)} className="text-sm px-3 py-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 font-medium">🚪 Initiate Exit</button>}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
          {[
            {label:'Basic',value:`${sym}${(emp.basic_salary||0).toLocaleString('en-IN')}`,color:'text-green-600'},
            {label:'Attendance (30d)',value:`${profile.attendance_summary?.present||0}/${profile.attendance_summary?.total||0}`,color:'text-blue-600'},
            {label:'Projects',value:profile.project_allocations?.length||0,color:'text-purple-600'},
            {label:'Open Tasks',value:profile.tasks?.filter((t:any)=>t.status!=='done').length||0,color:'text-orange-500'},
            {label:'Training',value:`${profile.training?.filter((t:any)=>t.status==='completed').length||0}/${profile.training?.length||0}`,color:'text-teal-600'},
            {label:'Documents',value:profile.documents?.length||0,color:'text-slate-600'},
          ].map(s=>(
            <div key={s.label} className="text-center">
              <div className={`font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-2xl p-1.5 shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tab===t.id?'bg-indigo-600 text-white shadow-sm':'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==='overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Personal Details</h3>
            <div className="space-y-2 text-sm">
              {[['Email',emp.email],['Phone',emp.phone],['Date of Joining',fmtDate(emp.date_of_joining)],['Employment Type',emp.employment_type?.replace('_',' ')],['PAN',emp.pan_number],['Bank',emp.bank_name],['Account',emp.bank_account],['IFSC',emp.bank_ifsc]].map(([label,value])=>(
                <div key={label as string} className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{value||'—'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {/* Project allocations */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Current Projects</h3>
              {profile.project_allocations?.length===0 ? <div className="text-sm text-slate-400">No active project assignments</div> :
              profile.project_allocations?.map((a:any)=>(
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700 last:border-0">
                  <div><div className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.role||'Team Member'}</div>
                    <div className="text-xs text-slate-400">PRJ-{a.project_id}</div></div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-indigo-600">{a.allocation_percent}%</div>
                    <Badge label={a.status} color="green" />
                  </div>
                </div>
              ))}
            </div>
            {/* Open Tasks */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Open Tasks</h3>
              {profile.tasks?.filter((t:any)=>t.status!=='done').map((t:any)=>(
                <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-slate-700 last:border-0 text-sm">
                  <span className="text-slate-700 dark:text-slate-300 truncate flex-1">{t.title}</span>
                  <Badge label={t.priority} color={t.priority==='high'?'red':t.priority==='medium'?'yellow':'gray'} />
                </div>
              ))}
              {!profile.tasks?.filter((t:any)=>t.status!=='done').length && <div className="text-sm text-slate-400">No open tasks</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── ONBOARDING ── */}
      {tab==='onboarding' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Onboarding Checklist</h3>
            {!onboarding ? (
              <button onClick={startOnboarding} className="gradient-bg text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">Start Onboarding</button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="text-sm text-slate-500">{onboarding.progress_percent}% complete</div>
                <div className="w-32 h-2 bg-slate-100 rounded-full"><div className="h-2 bg-indigo-600 rounded-full" style={{width:`${onboarding.progress_percent}%`}} /></div>
                <Badge label={onboarding.status} color={onboarding.status==='completed'?'green':'blue'} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            {[
              {category:'HR',color:'#6366f1'},
              {category:'IT',color:'#0891b2'},
              {category:'Operations',color:'#10b981'},
              {category:'Training',color:'#f59e0b'},
              {category:'Admin',color:'#8b5cf6'},
              {category:'Performance',color:'#ef4444'},
            ].map(({category,color})=>{
              const catTasks = (onboarding?.tasks || [
                {id:'t1',task:'Submit personal documents',category:'HR',due_days:1,is_mandatory:true},
                {id:'t2',task:'Sign offer letter and NDA',category:'HR',due_days:1,is_mandatory:true},
                {id:'t3',task:'Complete background verification',category:'HR',due_days:2,is_mandatory:true},
                {id:'t4',task:'Laptop/workstation allocation',category:'IT',due_days:1,is_mandatory:true},
                {id:'t5',task:'Create email and system access',category:'IT',due_days:1,is_mandatory:true},
                {id:'t6',task:'Add to payroll system',category:'HR',due_days:3,is_mandatory:true},
                {id:'t7',task:'HR orientation session',category:'HR',due_days:2,is_mandatory:true},
                {id:'t8',task:'Department introduction',category:'Operations',due_days:3,is_mandatory:true},
                {id:'t9',task:'Meet key stakeholders',category:'Operations',due_days:5,is_mandatory:false},
                {id:'t10',task:'Assign buddy / mentor',category:'HR',due_days:1,is_mandatory:true},
                {id:'t11',task:'Complete compliance training',category:'Training',due_days:7,is_mandatory:true},
                {id:'t12',task:'Set probation goals',category:'Performance',due_days:7,is_mandatory:true},
                {id:'t13',task:'ID card issuance',category:'Admin',due_days:3,is_mandatory:true},
                {id:'t14',task:'Add to health insurance',category:'HR',due_days:7,is_mandatory:true},
                {id:'t15',task:'30-day check-in',category:'HR',due_days:30,is_mandatory:false},
              ]).filter((t:any)=>t.category===category);
              if (!catTasks.length) return null;
              return (
                <div key={category} className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
                  <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white" style={{backgroundColor:color}}>{category}</div>
                  {catTasks.map((task:any)=>{
                    const taskStatus = onboarding?.task_statuses?.[task.id] || 'pending';
                    return (
                      <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <button onClick={()=>updateOnboardingTask(task.id, taskStatus==='completed'?'pending':'completed')}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${taskStatus==='completed'?'bg-green-500 border-green-500 text-white':'border-slate-300 dark:border-slate-500'}`}>
                          {taskStatus==='completed' && <span className="text-xs">✓</span>}
                        </button>
                        <div className="flex-1">
                          <span className={`text-sm ${taskStatus==='completed'?'line-through text-slate-400':'text-slate-700 dark:text-slate-300'}`}>{task.task}</span>
                          {task.is_mandatory && <span className="ml-1 text-[9px] text-red-400">*required</span>}
                        </div>
                        <span className="text-xs text-slate-400">Day {task.due_days}</span>
                        {taskStatus==='completed' && <span className="text-xs text-green-500">Done</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {tab==='documents' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setDocModal(true)} className="gradient-bg text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90">+ Add Document</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc=>(
              <div key={doc.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="text-2xl">
                    {doc.document_type==='pan'?'🪪':doc.document_type==='aadhaar'?'🪪':doc.document_type==='passport'?'📔':doc.document_type?.includes('letter')?'📄':'📁'}
                  </div>
                  <Badge label={doc.is_verified?'Verified':'Pending'} color={doc.is_verified?'green':'yellow'} />
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-100 capitalize">{doc.document_type?.replace('_',' ')}</div>
                {doc.document_name && <div className="text-xs text-slate-500">{doc.document_name}</div>}
                {doc.document_number && <div className="text-xs font-mono text-slate-400 mt-1">{doc.document_number}</div>}
                {doc.expiry_date && <div className={`text-xs mt-1 ${new Date(doc.expiry_date)<new Date()?'text-red-500 font-medium':'text-slate-400'}`}>Expires: {fmtDate(doc.expiry_date)}</div>}
              </div>
            ))}
            {documents.length===0 && <div className="col-span-3 text-center py-10 text-slate-400">No documents uploaded yet</div>}
          </div>
        </div>
      )}

      {/* ── TRAINING ── */}
      {tab==='training' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setEnrollModal(true)} className="gradient-bg text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90">+ Enroll in Course</button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                {['Course','Status','Scheduled','Completed','Score','Certification'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {training.map(e=>{
                  const course = courses.find((c:any)=>c.id===e.course_id);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-4 py-3 font-medium">{course?.title||`Course ${e.course_id}`}</td>
                      <td className="px-4 py-3"><Badge label={e.status} color={e.status==='completed'?'green':e.status==='in_progress'?'blue':'gray'} /></td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(e.scheduled_date)}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(e.completion_date)}</td>
                      <td className="px-4 py-3">{e.score!=null?`${e.score}%`:'—'}</td>
                      <td className="px-4 py-3 text-xs">{course?.certification||'—'}</td>
                    </tr>
                  );
                })}
                {training.length===0 && <tr><td colSpan={6} className="text-center py-10 text-slate-400">No training enrollments</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BENEFITS ── */}
      {tab==='benefits' && (
        <div className="space-y-5">
          <div><h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Enrolled Benefits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {benefits.map(b=>{
                const plan = benefitPlans.find((p:any)=>p.id===b.plan_id);
                return (
                  <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{plan?.name||'—'}</div>
                    <div className="text-xs text-slate-400 capitalize mt-0.5">{plan?.benefit_type?.replace('_',' ')}</div>
                    {b.policy_number && <div className="text-xs font-mono text-indigo-600 mt-1">Policy: {b.policy_number}</div>}
                    {plan?.coverage_amount>0 && <div className="text-xs text-green-600 mt-1">Coverage: ₹{Number(plan.coverage_amount).toLocaleString('en-IN')}</div>}
                  </div>
                );
              })}
              {benefits.length===0 && <div className="text-sm text-slate-400">No benefits enrolled</div>}
            </div>
          </div>
          <div><h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Available Plans</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {benefitPlans.filter(p=>!benefits.find(b=>b.plan_id===p.id)).map(plan=>(
                <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-indigo-200 transition-all">
                  <div className="font-semibold text-slate-800 dark:text-slate-100">{plan.name}</div>
                  <div className="text-xs text-slate-400 capitalize mt-0.5">{plan.benefit_type?.replace('_',' ')}</div>
                  <div className="text-xs text-slate-500 mt-1">{plan.description}</div>
                  {plan.coverage_amount>0 && <div className="text-xs text-green-600 mt-1">₹{Number(plan.coverage_amount).toLocaleString('en-IN')}</div>}
                  <button onClick={()=>enrollBenefit(plan.id)} className="mt-3 w-full text-xs py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">+ Enroll</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SALARY ── */}
      {tab==='salary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[{label:'Basic',value:`${sym}${(emp.basic_salary||0).toLocaleString('en-IN')}`},{label:'HRA',value:`${sym}${(emp.hra||0).toLocaleString('en-IN')}`},{label:'Other Allowances',value:`${sym}${(emp.other_allowances||0).toLocaleString('en-IN')}`}].map(s=>(
              <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="text-xs text-slate-500">{s.label}</div><div className="font-bold text-slate-800 dark:text-slate-100 text-lg mt-1">{s.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-100">Payslip History</div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700"><tr>
                {['Month','Gross','Deductions','TDS','Net Pay','Status'].map(h=>(
                  <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {payslips.map((p:any)=>(
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-4 py-2">{['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][p.month]} {p.year}</td>
                    <td className="px-4 py-2">{sym}{(p.gross_salary||0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 text-red-500">{sym}{(p.total_deductions||0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2">{sym}{(p.tax_deducted||0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2 font-bold text-green-600">{sym}{(p.net_salary||0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2"><Badge label={p.status} color={p.status==='paid'?'green':'yellow'} /></td>
                  </tr>
                ))}
                {payslips.length===0 && <tr><td colSpan={6} className="text-center py-8 text-slate-400">No payslips yet. Run payroll to generate.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TASKS ── */}
      {tab==='tasks' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-100">Assigned Tasks</div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700"><tr>
              {['Task','Project','Priority','Status'].map(h=>(
                <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {profile.tasks?.map((t:any)=>(
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3 text-indigo-600 text-xs">PRJ-{t.project_id}</td>
                  <td className="px-4 py-3"><Badge label={t.priority} color={t.priority==='high'?'red':t.priority==='medium'?'yellow':'gray'} /></td>
                  <td className="px-4 py-3"><Badge label={t.status?.replace('_',' ')} color={t.status==='done'?'green':t.status==='in_progress'?'blue':'gray'} /></td>
                </tr>
              ))}
              {!profile.tasks?.length && <tr><td colSpan={4} className="text-center py-8 text-slate-400">No tasks assigned</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PROJECTS ── */}
      {tab==='projects' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile.project_allocations?.map((a:any)=>(
              <div key={a.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-start justify-between mb-3">
                  <div><div className="font-semibold text-slate-800 dark:text-slate-100">{a.role||'Team Member'}</div>
                    <div className="text-xs text-slate-400">PRJ-{a.project_id}</div></div>
                  <div className="text-2xl font-black text-indigo-600">{a.allocation_percent}%</div>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full"><div className="h-2 bg-indigo-600 rounded-full" style={{width:`${a.allocation_percent}%`}} /></div>
                <Badge label={a.status} color="green" />
              </div>
            ))}
            {!profile.project_allocations?.length && <div className="col-span-2 text-center py-10 text-slate-400">No project allocations</div>}
          </div>
          {profile.item_allocations?.length>0 && (
            <div><h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Equipment Allocations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {profile.item_allocations.map((a:any)=>(
                  <div key={a.id} className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-700">
                    <Badge label={a.item_type} color={a.item_type==='reusable'?'green':'red'} />
                    <div className="text-sm font-medium mt-1">PRD-{a.product_id}</div>
                    <div className="text-xs text-slate-400">Issued: {a.quantity_allocated} · Outstanding: {a.quantity_outstanding}</div>
                    <Badge label={a.status?.replace('_',' ')} color={a.status==='issued'?'blue':'green'} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PERFORMANCE ── */}
      {tab==='performance' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>setReviewModal(true)} className="gradient-bg text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90">+ Add Review</button>
          </div>
          {profile.performance?.map((r:any)=>(
            <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-start justify-between mb-3">
                <div><div className="font-semibold text-slate-800 dark:text-slate-100">{r.review_period} — {r.review_type}</div>
                  <div className="text-xs text-slate-400">{fmtDate(r.review_date)}</div></div>
                <div className="text-right">
                  <div className="text-2xl font-black text-indigo-600">{r.overall_rating}/5</div>
                  <div className="text-xs text-slate-500">{r.rating_label}</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge label={r.outcome?.replace('_',' ')} color={r.outcome==='promoted'?'green':r.outcome==='pip'?'red':'gray'} />
                {r.increment_percent>0 && <Badge label={`+${r.increment_percent}% increment`} color="green" />}
              </div>
            </div>
          ))}
          {!profile.performance?.length && <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm border border-slate-100 dark:border-slate-700 text-slate-400">No performance reviews yet</div>}
        </div>
      )}

      {/* ── TRAVEL & EXPENSES ── */}
      {tab==='travel' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={()=>navigate('/hr/travel')} className="gradient-bg text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90">+ New Travel Request</button>
          </div>
          {travelRequests.length===0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-sm border border-slate-100 dark:border-slate-700 text-slate-400">
              <div className="text-3xl mb-2">✈️</div>No travel requests yet
            </div>
          ) : travelRequests.map((tr:any)=>(
            <div key={tr.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div><div className="font-semibold text-slate-800 dark:text-slate-100">{tr.trip_purpose}</div>
                  <div className="text-xs text-slate-400">{tr.request_number} · {fmtDate(tr.departure_date)} → {fmtDate(tr.return_date)}</div></div>
                <div className="text-right">
                  <Badge label={tr.status} color={tr.status==='approved'?'green':tr.status==='rejected'?'red':'yellow'} />
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">₹{(tr.total_claimed||0).toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ATTENDANCE ── */}
      {tab==='attendance' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Attendance Summary (Last 30 days)</h3>
          <div className="grid grid-cols-4 gap-4 mb-5">
            {[{label:'Present',value:profile.attendance_summary?.present||0,color:'text-green-600'},{label:'Absent',value:profile.attendance_summary?.absent||0,color:'text-red-500'},{label:'Late',value:profile.attendance_summary?.late||0,color:'text-yellow-600'},{label:'Avg Hours',value:`${profile.attendance_summary?.avg_hours||0}h`,color:'text-indigo-600'}].map(s=>(
              <div key={s.label} className="text-center"><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-slate-400">{s.label}</div></div>
            ))}
          </div>
          <p className="text-sm text-slate-400 text-center">Full attendance history available in the Attendance module</p>
        </div>
      )}

      {/* ── LEAVES ── */}
      {tab==='leaves' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Leave Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            {[{label:'Total Applications',value:profile.leave_summary?.total||0},{label:'Approved',value:profile.leave_summary?.approved||0},{label:'Pending',value:profile.leave_summary?.pending||0}].map(s=>(
              <div key={s.label} className="text-center bg-slate-50 dark:bg-slate-700 rounded-xl p-4"><div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</div><div className="text-xs text-slate-400">{s.label}</div></div>
            ))}
          </div>
        </div>
      )}

      {/* ── EXIT ── */}
      {tab==='exit' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          {!exitRecord ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-3">🚪</div>
              <div className="text-slate-500 font-medium mb-4">Employee exit not initiated</div>
              <button onClick={()=>setExitModal(true)} className="bg-red-50 text-red-500 px-5 py-2.5 rounded-xl font-medium hover:bg-red-100">Initiate Exit Process</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-800 dark:text-slate-100">Exit Details</h3><Badge label={exitRecord.status} color={exitRecord.status==='completed'?'green':'yellow'} /></div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[['Exit Reason',exitRecord.exit_reason?.replace('_',' ')],['Resignation Date',fmtDate(exitRecord.resignation_date)],['Last Working Day',fmtDate(exitRecord.last_working_date)],['Notice Period',`${exitRecord.notice_period_days} days`]].map(([l,v])=>(
                  <div key={l as string} className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3"><div className="text-xs text-slate-400">{l}</div><div className="font-medium text-slate-800 dark:text-slate-100 capitalize">{v||'—'}</div></div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">Exit Checklist</h4>
                {[['noc_issued','NOC Issued'],['experience_letter','Experience Letter'],['equipment_returned','Equipment Returned'],['access_revoked','System Access Revoked'],['exit_interview_done','Exit Interview Done'],['final_settlement','Final Settlement Done']].map(([field,label]:[string,string])=>(
                  <label key={field} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={exitRecord[field]||false}
                      onChange={async(e)=>{await api.put(`/hr-v2/exit/${empId}`,{[field]:e.target.checked});load();}}
                      className="w-4 h-4 rounded text-indigo-600" />
                    <span className={`text-sm ${exitRecord[field]?'line-through text-slate-400':'text-slate-700 dark:text-slate-300'}`}>{label}</span>
                    {exitRecord[field] && <span className="text-green-500 text-xs">✓</span>}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Add Document */}
      <Modal isOpen={docModal} onClose={()=>setDocModal(false)} title="Add Employee Document" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Document Type *</label>
            <select value={docForm.document_type} onChange={e=>setDocForm(f=>({...f,document_type:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              {DOC_TYPES.map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Document Name</label>
            <input value={docForm.document_name} onChange={e=>setDocForm(f=>({...f,document_name:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Document Number</label>
            <input value={docForm.document_number} onChange={e=>setDocForm(f=>({...f,document_number:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
              <input type="date" value={docForm.issue_date} onChange={e=>setDocForm(f=>({...f,issue_date:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
              <input type="date" value={docForm.expiry_date} onChange={e=>setDocForm(f=>({...f,expiry_date:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setDocModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm">Cancel</button>
            <button onClick={addDocument} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium">Add Document</button>
          </div>
        </div>
      </Modal>

      {/* Enroll Training */}
      <Modal isOpen={enrollModal} onClose={()=>setEnrollModal(false)} title="Enroll in Training" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Course *</label>
            <select value={enrollForm.course_id} onChange={e=>setEnrollForm(f=>({...f,course_id:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
              <option value="">Select Course</option>
              {courses.map((c:any)=><option key={c.id} value={c.id}>{c.title} ({c.duration_hours}h)</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Date</label>
              <input type="date" value={enrollForm.scheduled_date} onChange={e=>setEnrollForm(f=>({...f,scheduled_date:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Trainer</label>
              <input value={enrollForm.trainer_name} onChange={e=>setEnrollForm(f=>({...f,trainer_name:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setEnrollModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm">Cancel</button>
            <button onClick={enrollTraining} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium">Enroll</button>
          </div>
        </div>
      </Modal>

      {/* Performance Review */}
      <Modal isOpen={reviewModal} onClose={()=>setReviewModal(false)} title="Add Performance Review" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
              <input value={reviewForm.review_period} onChange={e=>setReviewForm(f=>({...f,review_period:e.target.value}))} placeholder="Q2 2026" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={reviewForm.review_type} onChange={e=>setReviewForm(f=>({...f,review_type:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['annual','quarterly','probation','mid_year'].map(t=><option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input type="date" value={reviewForm.review_date} onChange={e=>setReviewForm(f=>({...f,review_date:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[['Overall Rating (1-5)','overall_rating'],['Goal Achievement','goal_achievement'],['Skill Rating','skill_rating']].map(([l,f])=>(
              <div key={f as string}><label className="block text-sm font-medium text-slate-700 mb-1">{l}</label>
                <input type="number" min="1" max="5" step="0.5" value={(reviewForm as any)[f as string]} onChange={e=>setReviewForm((rv:any)=>({...rv,[f as string]:Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
            ))}
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Strengths</label>
            <textarea value={reviewForm.strengths} onChange={e=>setReviewForm(f=>({...f,strengths:e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Areas for Improvement</label>
            <textarea value={reviewForm.areas_for_improvement} onChange={e=>setReviewForm(f=>({...f,areas_for_improvement:e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
              <select value={reviewForm.outcome} onChange={e=>setReviewForm(f=>({...f,outcome:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['confirmed','promoted','pip','no_change','terminated'].map(o=><option key={o} value={o}>{o.replace('_',' ')}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Increment %</label>
              <input type="number" value={reviewForm.increment_percent} onChange={e=>setReviewForm(f=>({...f,increment_percent:Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setReviewModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm">Cancel</button>
            <button onClick={submitReview} className="flex-1 gradient-bg text-white rounded-xl py-2.5 text-sm font-medium">Submit Review</button>
          </div>
        </div>
      </Modal>

      {/* Exit Modal */}
      <Modal isOpen={exitModal} onClose={()=>setExitModal(false)} title="Initiate Exit Process" size="md">
        <div className="space-y-4">
          <div className="bg-red-50 rounded-xl p-3 text-sm text-red-700">⚠️ This will initiate the exit/offboarding workflow for this employee.</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Exit Reason *</label>
              <select value={exitForm.exit_reason} onChange={e=>setExitForm(f=>({...f,exit_reason:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                {['resignation','termination','retirement','layoff','end_of_contract','absconding'].map(r=><option key={r} value={r}>{r.replace('_',' ')}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Notice Period (days)</label>
              <input type="number" value={exitForm.notice_period_days} onChange={e=>setExitForm(f=>({...f,notice_period_days:Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Resignation Date</label>
              <input type="date" value={exitForm.resignation_date} onChange={e=>setExitForm(f=>({...f,resignation_date:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Last Working Day</label>
              <input type="date" value={exitForm.last_working_date} onChange={e=>setExitForm(f=>({...f,last_working_date:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Reason Details</label>
            <textarea value={exitForm.exit_reason_detail} onChange={e=>setExitForm(f=>({...f,exit_reason_detail:e.target.value}))} rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" /></div>
          <div className="flex gap-3">
            <button onClick={()=>setExitModal(false)} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm">Cancel</button>
            <button onClick={initiateExit} className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-600">Initiate Exit</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
