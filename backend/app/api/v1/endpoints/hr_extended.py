"""
Extended HR API — Complete Employee Lifecycle
- Onboarding workflow + checklist
- Training courses & enrollments
- Employee benefits
- Employee documents
- Performance reviews
- Exit management
- Resource planning (people allocation)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date

from app.db.base import get_db
from app.models.hr_extended import (
    OnboardingTemplate, OnboardingRecord, TrainingCourse, TrainingEnrollment,
    BenefitPlan, EmployeeBenefit, EmployeeDocument, PerformanceReview, ExitRecord
)
from app.models.hr import Employee, Attendance, Leave
from app.models.project import Project, ProjectTask
from app.models.resource import ResourceAllocation, ItemAllocation
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# EMPLOYEE FULL PROFILE
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/employees/{emp_id}/profile")
async def get_employee_full_profile(emp_id: int, db: Session = Depends(get_db),
                                     current_user: User = Depends(get_current_user)):
    """Complete employee profile with all lifecycle data"""
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp: raise HTTPException(404, "Employee not found")

    # Onboarding
    onboarding = db.query(OnboardingRecord).filter(OnboardingRecord.employee_id == emp_id).first()
    # Training
    enrollments = db.query(TrainingEnrollment).filter(TrainingEnrollment.employee_id == emp_id).all()
    # Benefits
    benefits = db.query(EmployeeBenefit).filter(EmployeeBenefit.employee_id == emp_id, EmployeeBenefit.is_active==True).all()
    # Documents
    docs = db.query(EmployeeDocument).filter(EmployeeDocument.employee_id == emp_id, EmployeeDocument.is_active==True).all()
    # Attendance (last 30 days)
    att = db.query(Attendance).filter(Attendance.employee_id == emp_id).order_by(Attendance.date.desc()).limit(30).all()
    # Leaves
    leaves = db.query(Leave).filter(Leave.employee_id == emp_id).order_by(Leave.created_at.desc()).limit(10).all()
    # Project allocations
    project_allocs = db.query(ResourceAllocation).filter(ResourceAllocation.employee_id == emp_id).all()
    # Item allocations
    item_allocs = db.query(ItemAllocation).filter(ItemAllocation.employee_id == emp_id).all()
    # Tasks
    tasks = db.query(ProjectTask).filter(ProjectTask.assigned_to == emp_id, ProjectTask.is_active==True).limit(10).all()
    # Performance
    reviews = db.query(PerformanceReview).filter(PerformanceReview.employee_id == emp_id).order_by(PerformanceReview.review_date.desc()).all()
    # Exit
    exit_rec = db.query(ExitRecord).filter(ExitRecord.employee_id == emp_id).first()

    def safe_float(v): return float(v) if v is not None else 0

    return {
        "employee": {
            "id": emp.id, "employee_number": emp.employee_number,
            "first_name": emp.first_name, "last_name": emp.last_name,
            "email": emp.email, "phone": emp.phone,
            "department_id": emp.department_id,
            "employment_type": emp.employment_type,
            "date_of_joining": str(emp.date_of_joining) if emp.date_of_joining else None,
            "basic_salary": safe_float(emp.basic_salary), "hra": safe_float(emp.hra),
            "other_allowances": safe_float(emp.other_allowances),
            "status": emp.status, "is_active": emp.is_active,
            "pan_number": getattr(emp,"pan_number",""), "bank_name": getattr(emp,"bank_name",""),
            "bank_account": getattr(emp,"bank_account",""), "bank_ifsc": getattr(emp,"bank_ifsc",""),
        },
        "onboarding": {"id": onboarding.id, "status": onboarding.status, "progress_percent": onboarding.progress_percent, "task_statuses": onboarding.task_statuses or {}} if onboarding else None,
        "training": [{"id": e.id, "course_id": e.course_id, "status": e.status, "score": e.score, "completion_date": str(e.completion_date) if e.completion_date else None} for e in enrollments],
        "benefits": [{"id": b.id, "plan_id": b.plan_id, "policy_number": b.policy_number, "enrollment_date": str(b.enrollment_date) if b.enrollment_date else None} for b in benefits],
        "documents": [{"id": d.id, "document_type": d.document_type, "document_name": d.document_name, "document_number": d.document_number, "is_verified": d.is_verified} for d in docs],
        "attendance_summary": {
            "present": sum(1 for a in att if a.status == "present"),
            "absent": sum(1 for a in att if a.status == "absent"),
            "late": sum(1 for a in att if a.status == "late"),
            "total": len(att),
            "avg_hours": round(sum(a.hours_worked or 0 for a in att) / max(len(att),1), 1),
        },
        "leave_summary": {
            "total": len(leaves), "approved": sum(1 for l in leaves if l.status == "approved"),
            "pending": sum(1 for l in leaves if l.status == "pending"),
        },
        "project_allocations": [{"id": a.id, "project_id": a.project_id, "role": a.role, "allocation_percent": a.allocation_percent, "status": a.status} for a in project_allocs],
        "item_allocations": [{"id": a.id, "product_id": a.product_id, "item_type": a.item_type, "quantity_allocated": a.quantity_allocated, "quantity_outstanding": a.quantity_outstanding, "status": a.status} for a in item_allocs],
        "tasks": [{"id": t.id, "title": t.title, "status": t.status, "priority": t.priority, "project_id": t.project_id} for t in tasks],
        "performance": [{"id": r.id, "review_period": r.review_period, "overall_rating": r.overall_rating, "rating_label": r.rating_label, "status": r.status} for r in reviews],
        "exit": {"id": exit_rec.id, "exit_reason": exit_rec.exit_reason, "last_working_date": str(exit_rec.last_working_date) if exit_rec.last_working_date else None, "status": exit_rec.status} if exit_rec else None,
    }

# ─────────────────────────────────────────────────────────────────────────────
# ONBOARDING
# ─────────────────────────────────────────────────────────────────────────────

DEFAULT_ONBOARDING_TASKS = [
    {"id":"t1","task":"Submit personal documents (Aadhaar, PAN, Bank details)","category":"HR","due_days":1,"assignee_type":"employee","is_mandatory":True},
    {"id":"t2","task":"Sign offer letter and NDA","category":"HR","due_days":1,"assignee_type":"employee","is_mandatory":True},
    {"id":"t3","task":"Complete background verification forms","category":"HR","due_days":2,"assignee_type":"employee","is_mandatory":True},
    {"id":"t4","task":"Laptop/workstation allocation","category":"IT","due_days":1,"assignee_type":"it","is_mandatory":True},
    {"id":"t5","task":"Create email account and system access","category":"IT","due_days":1,"assignee_type":"it","is_mandatory":True},
    {"id":"t6","task":"Add to payroll system","category":"HR","due_days":3,"assignee_type":"hr","is_mandatory":True},
    {"id":"t7","task":"HR orientation session","category":"HR","due_days":2,"assignee_type":"hr","is_mandatory":True},
    {"id":"t8","task":"Department introduction and tour","category":"Operations","due_days":3,"assignee_type":"manager","is_mandatory":True},
    {"id":"t9","task":"Meet key stakeholders","category":"Operations","due_days":5,"assignee_type":"manager","is_mandatory":False},
    {"id":"t10","task":"Assign buddy / mentor","category":"HR","due_days":1,"assignee_type":"hr","is_mandatory":True},
    {"id":"t11","task":"Complete compliance training","category":"Training","due_days":7,"assignee_type":"employee","is_mandatory":True},
    {"id":"t12","task":"Set probation goals","category":"Performance","due_days":7,"assignee_type":"manager","is_mandatory":True},
    {"id":"t13","task":"ID card issuance","category":"Admin","due_days":3,"assignee_type":"admin","is_mandatory":True},
    {"id":"t14","task":"Add to group health insurance","category":"HR","due_days":7,"assignee_type":"hr","is_mandatory":True},
    {"id":"t15","task":"30-day check-in meeting","category":"HR","due_days":30,"assignee_type":"hr","is_mandatory":False},
]

@router.post("/onboarding/start/{emp_id}")
async def start_onboarding(emp_id: int, data: dict = {}, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    existing = db.query(OnboardingRecord).filter(OnboardingRecord.employee_id == emp_id).first()
    if existing: return {"message": "Onboarding already started", "id": existing.id, "status": existing.status}

    tasks = DEFAULT_ONBOARDING_TASKS
    initial_statuses = {t["id"]: "pending" for t in tasks}
    rec = OnboardingRecord(
        employee_id=emp_id, start_date=date.today(),
        target_completion=date.fromordinal(date.today().toordinal() + 30),
        status="in_progress", progress_percent=0, task_statuses=initial_statuses,
        notes=data.get("notes","")
    )
    db.add(rec); db.commit(); db.refresh(rec)
    return {"id": rec.id, "status": rec.status, "tasks": tasks, "task_statuses": initial_statuses}

@router.get("/onboarding/{emp_id}")
async def get_onboarding(emp_id: int, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    rec = db.query(OnboardingRecord).filter(OnboardingRecord.employee_id == emp_id).first()
    if not rec: return {"started": False, "tasks": DEFAULT_ONBOARDING_TASKS}
    done = sum(1 for v in (rec.task_statuses or {}).values() if v == "completed")
    total = len(DEFAULT_ONBOARDING_TASKS)
    return {"started": True, "id": rec.id, "status": rec.status,
            "progress_percent": round(done/total*100, 1) if total else 0,
            "tasks": DEFAULT_ONBOARDING_TASKS, "task_statuses": rec.task_statuses or {},
            "start_date": str(rec.start_date) if rec.start_date else None,
            "target_completion": str(rec.target_completion) if rec.target_completion else None}

@router.put("/onboarding/{emp_id}/task")
async def update_onboarding_task(emp_id: int, data: dict, db: Session = Depends(get_db),
                                  current_user: User = Depends(get_current_user)):
    rec = db.query(OnboardingRecord).filter(OnboardingRecord.employee_id == emp_id).first()
    if not rec: raise HTTPException(404, "Onboarding not started")
    task_id = data.get("task_id"); status = data.get("status","completed")
    statuses = dict(rec.task_statuses or {})
    statuses[task_id] = status
    rec.task_statuses = statuses
    done = sum(1 for v in statuses.values() if v == "completed")
    total = len(DEFAULT_ONBOARDING_TASKS)
    rec.progress_percent = round(done/total*100, 1)
    if rec.progress_percent >= 100: rec.status = "completed"; rec.completed_at = datetime.now()
    db.commit()
    return {"task_id": task_id, "status": status, "progress_percent": rec.progress_percent, "onboarding_status": rec.status}

# ─────────────────────────────────────────────────────────────────────────────
# TRAINING
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/training/courses")
async def list_courses(category: Optional[str] = None, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    q = db.query(TrainingCourse).filter(TrainingCourse.is_active == True)
    if category: q = q.filter(TrainingCourse.category == category)
    courses = q.order_by(TrainingCourse.title).all()
    return [{"id": c.id, "title": c.title, "code": c.code, "category": c.category,
             "duration_hours": c.duration_hours, "delivery_mode": c.delivery_mode,
             "provider": c.provider, "is_mandatory": c.is_mandatory,
             "certification": c.certification, "validity_months": c.validity_months,
             "cost_per_person": float(c.cost_per_person or 0)} for c in courses]

@router.post("/training/courses")
async def create_course(data: dict, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    c = TrainingCourse(**{k:v for k,v in data.items() if hasattr(TrainingCourse,k)})
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "title": c.title}

@router.get("/training/enrollments")
async def list_enrollments(employee_id: Optional[int] = None, course_id: Optional[int] = None,
                            status: Optional[str] = None, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    q = db.query(TrainingEnrollment)
    if employee_id: q = q.filter(TrainingEnrollment.employee_id == employee_id)
    if course_id: q = q.filter(TrainingEnrollment.course_id == course_id)
    if status: q = q.filter(TrainingEnrollment.status == status)
    enrollments = q.order_by(TrainingEnrollment.created_at.desc()).all()
    return [{"id": e.id, "employee_id": e.employee_id, "course_id": e.course_id,
             "enrolled_date": str(e.enrolled_date) if e.enrolled_date else None,
             "scheduled_date": str(e.scheduled_date) if e.scheduled_date else None,
             "completion_date": str(e.completion_date) if e.completion_date else None,
             "status": e.status, "score": e.score, "grade": e.grade,
             "certificate_url": e.certificate_url, "trainer_name": e.trainer_name} for e in enrollments]

@router.post("/training/enroll")
async def enroll_in_course(data: dict, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    e = TrainingEnrollment(
        employee_id=data["employee_id"], course_id=data["course_id"],
        enrolled_date=date.today(),
        scheduled_date=date.fromisoformat(data["scheduled_date"]) if data.get("scheduled_date") else None,
        status="enrolled", trainer_name=data.get("trainer_name","")
    )
    db.add(e); db.commit(); db.refresh(e)
    return {"id": e.id, "status": e.status}

@router.put("/training/enrollments/{enroll_id}")
async def update_enrollment(enroll_id: int, data: dict, db: Session = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    e = db.query(TrainingEnrollment).filter(TrainingEnrollment.id == enroll_id).first()
    if not e: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(e, k): setattr(e, k, v)
    if data.get("status") == "completed" and not e.completion_date:
        e.completion_date = date.today()
    db.commit(); return {"id": e.id, "status": e.status}

# ─────────────────────────────────────────────────────────────────────────────
# BENEFITS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/benefits/plans")
async def list_benefit_plans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plans = db.query(BenefitPlan).filter(BenefitPlan.is_active == True).all()
    return [{"id": p.id, "name": p.name, "benefit_type": p.benefit_type, "description": p.description,
             "coverage_amount": float(p.coverage_amount or 0), "employer_contribution": float(p.employer_contribution or 0),
             "employee_contribution": float(p.employee_contribution or 0), "provider": p.provider,
             "is_taxable": p.is_taxable, "eligibility": p.eligibility} for p in plans]

@router.post("/benefits/plans")
async def create_benefit_plan(data: dict, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    p = BenefitPlan(**{k:v for k,v in data.items() if hasattr(BenefitPlan,k)})
    db.add(p); db.commit(); db.refresh(p)
    return {"id": p.id, "name": p.name}

@router.get("/benefits/employee/{emp_id}")
async def get_employee_benefits(emp_id: int, db: Session = Depends(get_db),
                                 current_user: User = Depends(get_current_user)):
    benefits = db.query(EmployeeBenefit).filter(EmployeeBenefit.employee_id == emp_id, EmployeeBenefit.is_active==True).all()
    plans = {p.id: p for p in db.query(BenefitPlan).all()}
    return [{"id": b.id, "plan_id": b.plan_id, "plan_name": plans[b.plan_id].name if b.plan_id in plans else "?",
             "benefit_type": plans[b.plan_id].benefit_type if b.plan_id in plans else "?",
             "policy_number": b.policy_number, "nominee_name": b.nominee_name,
             "enrollment_date": str(b.enrollment_date) if b.enrollment_date else None,
             "end_date": str(b.end_date) if b.end_date else None} for b in benefits]

@router.post("/benefits/enroll")
async def enroll_benefit(data: dict, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    b = EmployeeBenefit(
        employee_id=data["employee_id"], plan_id=data["plan_id"],
        enrollment_date=date.today(), policy_number=data.get("policy_number",""),
        nominee_name=data.get("nominee_name",""), nominee_relation=data.get("nominee_relation","")
    )
    db.add(b); db.commit(); db.refresh(b)
    return {"id": b.id}

# ─────────────────────────────────────────────────────────────────────────────
# EMPLOYEE DOCUMENTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/documents/employee/{emp_id}")
async def get_employee_documents(emp_id: int, db: Session = Depends(get_db),
                                  current_user: User = Depends(get_current_user)):
    docs = db.query(EmployeeDocument).filter(EmployeeDocument.employee_id == emp_id, EmployeeDocument.is_active==True).order_by(EmployeeDocument.document_type).all()
    return [{"id": d.id, "document_type": d.document_type, "document_name": d.document_name,
             "document_number": d.document_number, "issue_date": str(d.issue_date) if d.issue_date else None,
             "expiry_date": str(d.expiry_date) if d.expiry_date else None,
             "file_url": d.file_url, "is_verified": d.is_verified, "notes": d.notes} for d in docs]

@router.post("/documents/employee/{emp_id}")
async def add_employee_document(emp_id: int, data: dict, db: Session = Depends(get_db),
                                 current_user: User = Depends(get_current_user)):
    d = EmployeeDocument(
        employee_id=emp_id, document_type=data.get("document_type"),
        document_name=data.get("document_name"), document_number=data.get("document_number"),
        issue_date=date.fromisoformat(data["issue_date"]) if data.get("issue_date") else None,
        expiry_date=date.fromisoformat(data["expiry_date"]) if data.get("expiry_date") else None,
        file_url=data.get("file_url",""), notes=data.get("notes","")
    )
    db.add(d); db.commit(); db.refresh(d)
    return {"id": d.id, "document_type": d.document_type}

@router.put("/documents/{doc_id}/verify")
async def verify_document(doc_id: int, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    d = db.query(EmployeeDocument).filter(EmployeeDocument.id == doc_id).first()
    if not d: raise HTTPException(404, "Not found")
    d.is_verified = True; d.verified_by = current_user.id
    db.commit(); return {"id": d.id, "is_verified": True}

# ─────────────────────────────────────────────────────────────────────────────
# PERFORMANCE REVIEWS
# ─────────────────────────────────────────────────────────────────────────────

RATING_LABELS = {5:"Exceptional",4:"Exceeds Expectations",3:"Meets Expectations",2:"Needs Improvement",1:"Unacceptable"}

@router.get("/performance/employee/{emp_id}")
async def get_employee_performance(emp_id: int, db: Session = Depends(get_db),
                                    current_user: User = Depends(get_current_user)):
    reviews = db.query(PerformanceReview).filter(PerformanceReview.employee_id == emp_id).order_by(PerformanceReview.review_date.desc()).all()
    return [{"id": r.id, "review_period": r.review_period, "review_type": r.review_type,
             "review_date": str(r.review_date) if r.review_date else None,
             "overall_rating": r.overall_rating, "rating_label": r.rating_label,
             "goal_achievement": r.goal_achievement, "skill_rating": r.skill_rating,
             "strengths": r.strengths, "areas_for_improvement": r.areas_for_improvement,
             "goals_next_period": r.goals_next_period, "outcome": r.outcome,
             "increment_percent": r.increment_percent, "status": r.status} for r in reviews]

@router.post("/performance/review")
async def create_performance_review(data: dict, db: Session = Depends(get_db),
                                     current_user: User = Depends(get_current_user)):
    overall = data.get("overall_rating", 3)
    r = PerformanceReview(
        employee_id=data["employee_id"], reviewer_id=data.get("reviewer_id"),
        review_period=data.get("review_period"), review_type=data.get("review_type","annual"),
        review_date=date.fromisoformat(data["review_date"]) if data.get("review_date") else date.today(),
        overall_rating=overall, goal_achievement=data.get("goal_achievement"),
        skill_rating=data.get("skill_rating"), behavior_rating=data.get("behavior_rating"),
        rating_label=RATING_LABELS.get(round(overall), "Meets Expectations"),
        strengths=data.get("strengths"), areas_for_improvement=data.get("areas_for_improvement"),
        goals_next_period=data.get("goals_next_period"), outcome=data.get("outcome","no_change"),
        increment_percent=data.get("increment_percent"), status="submitted"
    )
    db.add(r); db.commit(); db.refresh(r)
    return {"id": r.id, "rating_label": r.rating_label}

# ─────────────────────────────────────────────────────────────────────────────
# EXIT MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/exit/initiate/{emp_id}")
async def initiate_exit(emp_id: int, data: dict, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    existing = db.query(ExitRecord).filter(ExitRecord.employee_id == emp_id).first()
    if existing: return {"message": "Exit already initiated", "id": existing.id}
    notice_days = data.get("notice_period_days", 30)
    last_day = date.fromisoformat(data["resignation_date"]) if data.get("resignation_date") else date.today()
    from datetime import timedelta
    lwd = date.fromisoformat(data["last_working_date"]) if data.get("last_working_date") else (last_day + timedelta(days=notice_days))
    ex = ExitRecord(
        employee_id=emp_id, resignation_date=last_day, notice_period_days=notice_days,
        last_working_date=lwd, exit_reason=data.get("exit_reason","resignation"),
        exit_reason_detail=data.get("exit_reason_detail",""), status="initiated"
    )
    db.add(ex); db.commit(); db.refresh(ex)
    return {"id": ex.id, "last_working_date": str(ex.last_working_date), "status": ex.status}

@router.get("/exit/{emp_id}")
async def get_exit_record(emp_id: int, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    ex = db.query(ExitRecord).filter(ExitRecord.employee_id == emp_id).first()
    if not ex: return {"initiated": False}
    return {"initiated": True, "id": ex.id, "resignation_date": str(ex.resignation_date) if ex.resignation_date else None,
            "last_working_date": str(ex.last_working_date) if ex.last_working_date else None,
            "exit_reason": ex.exit_reason, "exit_reason_detail": ex.exit_reason_detail,
            "noc_issued": ex.noc_issued, "experience_letter": ex.experience_letter,
            "equipment_returned": ex.equipment_returned, "access_revoked": ex.access_revoked,
            "final_settlement": ex.final_settlement, "exit_interview_done": ex.exit_interview_done,
            "exit_feedback": ex.exit_feedback, "status": ex.status}

@router.put("/exit/{emp_id}")
async def update_exit(emp_id: int, data: dict, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    ex = db.query(ExitRecord).filter(ExitRecord.employee_id == emp_id).first()
    if not ex: raise HTTPException(404, "Exit not initiated")
    for k, v in data.items():
        if hasattr(ex, k): setattr(ex, k, v)
    db.commit()
    return {"id": ex.id, "status": ex.status}

# ─────────────────────────────────────────────────────────────────────────────
# RESOURCE PLANNING DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/resource-planning")
async def resource_planning_dashboard(db: Session = Depends(get_db),
                                       current_user: User = Depends(get_current_user)):
    """Resource utilization across all projects"""
    employees = db.query(Employee).filter(Employee.is_active == True).all()
    allocs = db.query(ResourceAllocation).filter(ResourceAllocation.status == "active").all()
    projects = {p.id: p for p in db.query(Project).filter(Project.is_active == True).all()}

    emp_map = {}
    for emp in employees:
        emp_map[emp.id] = {
            "id": emp.id, "name": f"{emp.first_name} {emp.last_name or ''}",
            "employee_number": emp.employee_number,
            "department_id": emp.department_id,
            "total_allocation": 0, "projects": []
        }

    for a in allocs:
        if a.employee_id in emp_map:
            emp_map[a.employee_id]["total_allocation"] += (a.allocation_percent or 0)
            proj = projects.get(a.project_id)
            emp_map[a.employee_id]["projects"].append({
                "project_id": a.project_id,
                "project_name": proj.name if proj else f"PRJ-{a.project_id}",
                "role": a.role, "allocation_percent": a.allocation_percent,
                "start_date": str(a.start_date) if a.start_date else None,
                "end_date": str(a.end_date) if a.end_date else None,
            })

    utilization = list(emp_map.values())
    over_allocated = [e for e in utilization if e["total_allocation"] > 100]
    under_utilized = [e for e in utilization if e["total_allocation"] < 50]
    available = [e for e in utilization if e["total_allocation"] == 0]

    return {
        "total_employees": len(employees),
        "allocated": len([e for e in utilization if e["total_allocation"] > 0]),
        "available": len(available),
        "over_allocated": len(over_allocated),
        "under_utilized": len(under_utilized),
        "utilization": sorted(utilization, key=lambda e: -e["total_allocation"]),
    }

@router.post("/resource-planning/allocate")
async def allocate_to_project(data: dict, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    from datetime import datetime as dt
    a = ResourceAllocation(
        project_id=data["project_id"], employee_id=data["employee_id"],
        role=data.get("role","Team Member"), allocation_percent=data.get("allocation_percent",100),
        start_date=dt.strptime(data["start_date"],"%Y-%m-%d") if data.get("start_date") else None,
        end_date=dt.strptime(data["end_date"],"%Y-%m-%d") if data.get("end_date") else None,
        hourly_rate=data.get("hourly_rate",0), notes=data.get("notes",""),
        status="active", allocated_by=current_user.id
    )
    db.add(a); db.commit(); db.refresh(a)
    return {"id": a.id, "message": "Resource allocated"}

# ─────────────────────────────────────────────────────────────────────────────
# SEED DEFAULT DATA
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/seed-defaults")
async def seed_default_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Seed default training courses and benefit plans"""
    n_courses = n_plans = 0

    default_courses = [
        ("Corporate Induction","IND001","onboarding","Company overview, culture, policies",4,"classroom",True,None,0),
        ("POSH Compliance","POSH001","compliance","Prevention of Sexual Harassment at Workplace",2,"online",True,"POSH Certified",12),
        ("Data Security & Privacy","SEC001","compliance","Data protection, GDPR, Information Security",3,"online",True,"Security Awareness",12),
        ("Fire Safety & Emergency Procedures","SAFE001","safety","Fire safety, evacuation, emergency response",2,"classroom",True,"Safety Certified",24),
        ("Effective Communication","COMM001","soft_skills","Business writing, presentations, email etiquette",8,"blended",False,"Communication Professional",0),
        ("Leadership & Management","LEAD001","leadership","People management, delegation, feedback",16,"classroom",False,"Leadership Certified",0),
        ("Project Management Fundamentals","PM001","technical","Project planning, execution, monitoring",16,"online",False,"PMP Foundation",0),
        ("Excel Advanced","EXCEL001","technical","Advanced Excel, Pivot Tables, Data Analysis",8,"online",False,"Excel Expert",0),
        ("Customer Service Excellence","CS001","soft_skills","Customer handling, complaint resolution",4,"online",False,None,0),
        ("Time Management & Productivity","TM001","soft_skills","Prioritization, goal setting, productivity tools",4,"online",False,None,0),
    ]
    for title, code, cat, desc, dur, mode, mandatory, cert, validity in default_courses:
        if not db.query(TrainingCourse).filter(TrainingCourse.code == code).first():
            db.add(TrainingCourse(title=title,code=code,category=cat,description=desc,
                                   duration_hours=dur,delivery_mode=mode,is_mandatory=mandatory,
                                   certification=cert,validity_months=validity))
            n_courses += 1

    default_plans = [
        ("Group Health Insurance","health_insurance","Covers employee + family",500000,0,0,"Star Health"),
        ("Group Life Insurance","life_insurance","Term life cover",2000000,500,0,"LIC"),
        ("Provident Fund (PF)","pf","Employee PF contribution 12% of Basic",0,0,0,"EPFO"),
        ("Gratuity","gratuity","Gratuity as per Gratuity Act",0,0,0,"Company"),
        ("Meal Allowance","meal","Monthly meal card/allowance",2500,2500,0,"Sodexo"),
        ("Phone Allowance","phone","Mobile phone reimbursement",1000,1000,0,"Company"),
        ("Transport Allowance","transport","Monthly transport/commute allowance",1600,1600,0,"Company"),
        ("Gym & Wellness","gym","Annual gym membership reimbursement",12000,12000,0,"Company"),
        ("Professional Development","training","Annual L&D budget",25000,25000,0,"Company"),
    ]
    for name, btype, desc, cov, emp_c, ee_c, provider in default_plans:
        if not db.query(BenefitPlan).filter(BenefitPlan.name == name).first():
            db.add(BenefitPlan(name=name,benefit_type=btype,description=desc,
                                coverage_amount=cov,employer_contribution=emp_c,
                                employee_contribution=ee_c,provider=provider))
            n_plans += 1

    db.commit()
    return {"training_courses": n_courses, "benefit_plans": n_plans, "message": "Defaults seeded"}
