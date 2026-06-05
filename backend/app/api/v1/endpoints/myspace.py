"""
My Space API — Personal Employee Workspace
Each logged-in user sees ONLY their own data.
Based on user.email → employee record linkage.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, date, timedelta

from app.db.base import get_db
from app.models.hr import Employee, Attendance, Leave, Payroll
from app.models.project import Project, ProjectTask, Timesheet
from app.models.resource import ResourceAllocation, ItemAllocation
from app.models.hr_extended import (
    OnboardingRecord, TrainingEnrollment, EmployeeBenefit,
    EmployeeDocument, PerformanceReview, ExitRecord
)
from app.models.travel import TravelRequest
from app.models.approval import ApprovalRequest
from app.models.company import Payslip
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

# ── Helper: get my employee record ────────────────────────────────────────────

def get_my_employee(user: User, db: Session) -> Optional[Employee]:
    """Find employee record linked to current user (by email)"""
    emp = db.query(Employee).filter(
        (Employee.email == user.email) | (Employee.id == getattr(user, 'employee_id', None))
    ).first()
    return emp

# ── My Dashboard ──────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def my_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Personal dashboard summary"""
    emp = get_my_employee(current_user, db)
    today = date.today()
    this_month_start = today.replace(day=1)

    # Today's attendance
    today_att = db.query(Attendance).filter(
        Attendance.employee_id == emp.id if emp else 0,
        Attendance.date == today
    ).first() if emp else None

    # Leave balance (pending requests)
    pending_leaves = db.query(func.count(Leave.id)).filter(
        Leave.employee_id == emp.id if emp else 0,
        Leave.status == "pending"
    ).scalar() if emp else 0

    # My tasks
    my_tasks = db.query(ProjectTask).filter(
        ProjectTask.assigned_to == emp.id if emp else 0,
        ProjectTask.status.in_(["todo", "in_progress"]),
        ProjectTask.is_active == True
    ).count() if emp else 0

    # My projects
    my_projects = db.query(ResourceAllocation).filter(
        ResourceAllocation.employee_id == emp.id if emp else 0,
        ResourceAllocation.status == "active"
    ).count() if emp else 0

    # Pending approvals (things waiting for my action as manager)
    pending_approvals = db.query(ApprovalRequest).filter(
        ApprovalRequest.status.in_(["pending", "in_progress"])
    ).count()

    # Latest payslip
    latest_payslip = db.query(Payslip).filter(
        Payslip.employee_id == emp.id if emp else 0
    ).order_by(Payslip.year.desc(), Payslip.month.desc()).first() if emp else None

    return {
        "employee": {
            "id": emp.id if emp else None,
            "name": f"{emp.first_name} {emp.last_name or ''}".strip() if emp else current_user.full_name,
            "employee_number": emp.employee_number if emp else None,
            "department_id": emp.department_id if emp else None,
            "designation": getattr(emp, "designation", "") if emp else "",
            "email": emp.email if emp else current_user.email,
            "phone": emp.phone if emp else None,
            "date_of_joining": str(emp.date_of_joining) if emp and emp.date_of_joining else None,
            "basic_salary": float(emp.basic_salary or 0) if emp else 0,
            "status": emp.status if emp else "active",
        },
        "today": {
            "date": str(today),
            "day": today.strftime("%A"),
            "checked_in": today_att is not None and today_att.check_in is not None,
            "check_in_time": today_att.check_in.strftime("%H:%M") if today_att and today_att.check_in else None,
            "check_out_time": today_att.check_out.strftime("%H:%M") if today_att and today_att.check_out else None,
            "attendance_status": today_att.status if today_att else "not_marked",
            "hours_worked": float(today_att.hours_worked or 0) if today_att else 0,
        },
        "stats": {
            "pending_leaves": pending_leaves,
            "open_tasks": my_tasks,
            "active_projects": my_projects,
            "pending_approvals": pending_approvals,
            "latest_net_salary": float(latest_payslip.net_salary or 0) if latest_payslip else 0,
            "latest_pay_month": f"{['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][latest_payslip.month]} {latest_payslip.year}" if latest_payslip else None,
        },
        "has_employee_record": emp is not None,
    }

# ── My Attendance ─────────────────────────────────────────────────────────────

@router.get("/attendance")
async def my_attendance(year: Optional[int] = None, month: Optional[int] = None,
                         db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = get_my_employee(current_user, db)
    if not emp: return {"records": [], "summary": {}, "message": "No employee record linked"}

    today = date.today()
    yr = year or today.year; mo = month or today.month
    from calendar import monthrange
    _, days = monthrange(yr, mo)
    start = date(yr, mo, 1); end = date(yr, mo, days)

    records = db.query(Attendance).filter(
        Attendance.employee_id == emp.id,
        Attendance.date >= start, Attendance.date <= end
    ).order_by(Attendance.date.desc()).all()

    return {
        "employee_id": emp.id,
        "year": yr, "month": mo, "days_in_month": days,
        "summary": {
            "present": sum(1 for r in records if r.status == "present"),
            "absent": sum(1 for r in records if r.status == "absent"),
            "late": sum(1 for r in records if r.status == "late"),
            "half_day": sum(1 for r in records if r.status == "half_day"),
            "total_hours": round(sum(r.hours_worked or 0 for r in records), 1),
        },
        "records": [{"date": str(r.date), "status": r.status,
                     "check_in": r.check_in.strftime("%H:%M") if r.check_in else None,
                     "check_out": r.check_out.strftime("%H:%M") if r.check_out else None,
                     "hours_worked": float(r.hours_worked or 0), "notes": r.notes} for r in records]
    }

@router.post("/attendance/checkin")
async def my_checkin(data: dict = {}, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    """Self check-in"""
    emp = get_my_employee(current_user, db)
    if not emp: raise HTTPException(404, "No employee record found")
    today = date.today(); now = datetime.now()
    att = db.query(Attendance).filter(Attendance.employee_id == emp.id, Attendance.date == today).first()
    if not att:
        att = Attendance(employee_id=emp.id, date=today, status="present", check_in=now)
        db.add(att)
    elif not att.check_in:
        att.check_in = now; att.status = "present"
    db.commit()
    return {"message": f"Checked in at {now.strftime('%H:%M')}", "time": now.strftime("%H:%M")}

@router.post("/attendance/checkout")
async def my_checkout(data: dict = {}, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    emp = get_my_employee(current_user, db)
    if not emp: raise HTTPException(404, "No employee record")
    today = date.today(); now = datetime.now()
    att = db.query(Attendance).filter(Attendance.employee_id == emp.id, Attendance.date == today).first()
    if not att: raise HTTPException(400, "Not checked in today")
    att.check_out = now
    if att.check_in:
        att.hours_worked = round((now - att.check_in).seconds / 3600, 2)
    db.commit()
    return {"message": f"Checked out at {now.strftime('%H:%M')}", "hours_worked": att.hours_worked}

# ── My Leaves ─────────────────────────────────────────────────────────────────

@router.get("/leaves")
async def my_leaves(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = get_my_employee(current_user, db)
    if not emp: return {"leaves": [], "balance": {}}
    leaves = db.query(Leave).filter(Leave.employee_id == emp.id).order_by(Leave.created_at.desc()).limit(30).all()
    return {
        "leaves": [{"id": l.id, "leave_type": l.leave_type,
                    "from_date": str(l.from_date), "to_date": str(l.to_date),
                    "days": l.days, "reason": l.reason, "status": l.status,
                    "created_at": l.created_at.isoformat() if l.created_at else None} for l in leaves],
        "summary": {
            "total": len(leaves), "approved": sum(1 for l in leaves if l.status=="approved"),
            "pending": sum(1 for l in leaves if l.status=="pending"),
            "rejected": sum(1 for l in leaves if l.status=="rejected"),
        }
    }

@router.post("/leaves/apply")
async def apply_my_leave(data: dict, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    emp = get_my_employee(current_user, db)
    if not emp: raise HTTPException(404, "No employee record")
    fd = date.fromisoformat(data["from_date"]); td = date.fromisoformat(data["to_date"])
    days = (td - fd).days + 1
    leave = Leave(employee_id=emp.id, leave_type=data.get("leave_type","casual"),
                  from_date=fd, to_date=td, days=days, reason=data.get("reason",""),
                  status="pending")
    db.add(leave); db.commit(); db.refresh(leave)
    # Create approval request
    from app.models.approval import ApprovalRequest
    count = db.query(func.count(ApprovalRequest.id)).scalar()
    req = ApprovalRequest(
        request_number=f"APR-{(count or 0)+1:06d}",
        workflow_type="leave_request", reference_id=leave.id,
        reference_number=f"LEAVE-{leave.id}",
        title=f"Leave Request — {emp.first_name} ({data.get('leave_type','casual')}, {days} day(s))",
        description=data.get("reason",""), requested_by=current_user.id,
        employee_id=emp.id, status="pending", current_step=1, total_steps=2
    )
    db.add(req); db.commit()
    return {"id": leave.id, "days": days, "status": "pending", "message": "Leave request submitted for approval"}

# ── My Tasks ──────────────────────────────────────────────────────────────────

@router.get("/tasks")
async def my_tasks(status: Optional[str] = None, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    emp = get_my_employee(current_user, db)
    if not emp: return {"tasks": []}
    q = db.query(ProjectTask).filter(ProjectTask.assigned_to == emp.id, ProjectTask.is_active == True)
    if status: q = q.filter(ProjectTask.status == status)
    tasks = q.order_by(ProjectTask.created_at.desc()).all()
    projects = {p.id: p for p in db.query(Project).all()}
    return {"tasks": [{"id": t.id, "title": t.title, "description": t.description,
                       "status": t.status, "priority": t.priority,
                       "project_name": projects[t.project_id].name if t.project_id in projects else f"PRJ-{t.project_id}",
                       "due_date": str(t.due_date) if t.due_date else None,
                       "estimated_hours": t.estimated_hours, "actual_hours": t.actual_hours,
                       "percent_complete": t.progress_percent or 0} for t in tasks]}

@router.put("/tasks/{task_id}/progress")
async def update_my_task(task_id: int, data: dict, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    emp = get_my_employee(current_user, db)
    task = db.query(ProjectTask).filter(ProjectTask.id == task_id, ProjectTask.assigned_to == emp.id if emp else 0).first()
    if not task: raise HTTPException(403, "Task not assigned to you")
    for k, v in data.items():
        if hasattr(task, k): setattr(task, k, v)
    if data.get("percent_complete") == 100: task.status = "completed"
    elif data.get("percent_complete", 0) > 0: task.status = "in_progress"
    db.commit()
    return {"id": task.id, "status": task.status, "percent_complete": task.progress_percent}

# ── My Projects ───────────────────────────────────────────────────────────────

@router.get("/projects")
async def my_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = get_my_employee(current_user, db)
    if not emp: return {"projects": []}
    allocs = db.query(ResourceAllocation).filter(ResourceAllocation.employee_id == emp.id).all()
    projects = {p.id: p for p in db.query(Project).all()}
    return {"projects": [{"id": a.id, "project_id": a.project_id,
                          "project_name": projects[a.project_id].name if a.project_id in projects else f"PRJ-{a.project_id}",
                          "project_status": projects[a.project_id].status if a.project_id in projects else "unknown",
                          "role": a.role, "allocation_percent": a.allocation_percent,
                          "start_date": str(a.start_date) if a.start_date else None,
                          "end_date": str(a.end_date) if a.end_date else None,
                          "status": a.status} for a in allocs]}

# ── My Timesheets ─────────────────────────────────────────────────────────────

@router.get("/timesheets")
async def my_timesheets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    timesheets = db.query(Timesheet).filter(Timesheet.user_id == current_user.id).order_by(Timesheet.date.desc()).limit(30).all()
    projects = {p.id: p for p in db.query(Project).all()}
    return {"timesheets": [{"id": t.id, "project_id": t.project_id,
                            "project_name": projects[t.project_id].name if t.project_id in projects else f"PRJ-{t.project_id}",
                            "date": str(t.date), "hours": float(t.hours or 0),
                            "description": t.description, "billable": t.billable} for t in timesheets],
            "total_hours": round(sum(float(t.hours or 0) for t in timesheets), 1),
            "billable_hours": round(sum(float(t.hours or 0) for t in timesheets if t.billable), 1)}

@router.post("/timesheets/log")
async def log_my_timesheet(data: dict, db: Session = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    if not data.get("project_id") or not data.get("hours"):
        raise HTTPException(400, "project_id and hours required")
    ts = Timesheet(project_id=data["project_id"], user_id=current_user.id,
                   hours=data["hours"], description=data.get("description",""),
                   billable=data.get("billable", True),
                   date=date.fromisoformat(data["date"]) if data.get("date") else date.today())
    db.add(ts); db.commit(); db.refresh(ts)
    return {"id": ts.id, "hours": ts.hours, "message": "Time logged"}

# ── My Payslips ───────────────────────────────────────────────────────────────

@router.get("/payslips")
async def my_payslips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = get_my_employee(current_user, db)
    if not emp: return {"payslips": []}
    payslips = db.query(Payslip).filter(Payslip.employee_id == emp.id).order_by(Payslip.year.desc(), Payslip.month.desc()).limit(24).all()
    MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return {"payslips": [{"id": p.id, "month": p.month, "year": p.year,
                          "period": f"{MONTHS[p.month]} {p.year}",
                          "gross_salary": float(p.gross_salary or 0),
                          "total_deductions": float(p.total_deductions or 0),
                          "net_salary": float(p.net_salary or 0),
                          "tax_deducted": float(p.tax_deducted or 0),
                          "status": p.status,
                          "payment_date": p.payment_date.isoformat() if p.payment_date else None} for p in payslips]}

# ── My Training ───────────────────────────────────────────────────────────────

@router.get("/training")
async def my_training(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = get_my_employee(current_user, db)
    if not emp: return {"enrollments": []}
    from app.models.hr_extended import TrainingCourse
    enrollments = db.query(TrainingEnrollment).filter(TrainingEnrollment.employee_id == emp.id).all()
    courses = {c.id: c for c in db.query(TrainingCourse).all()}
    return {"enrollments": [{"id": e.id, "course_id": e.course_id,
                             "course_title": courses[e.course_id].title if e.course_id in courses else f"Course {e.course_id}",
                             "course_category": courses[e.course_id].category if e.course_id in courses else "",
                             "duration_hours": courses[e.course_id].duration_hours if e.course_id in courses else 0,
                             "status": e.status, "score": e.score, "grade": e.grade,
                             "scheduled_date": str(e.scheduled_date) if e.scheduled_date else None,
                             "completion_date": str(e.completion_date) if e.completion_date else None,
                             "certification": courses[e.course_id].certification if e.course_id in courses else None} for e in enrollments],
            "completed": sum(1 for e in enrollments if e.status == "completed"),
            "in_progress": sum(1 for e in enrollments if e.status == "in_progress"),
            "enrolled": sum(1 for e in enrollments if e.status == "enrolled")}

# ── My Documents ──────────────────────────────────────────────────────────────

@router.get("/documents")
async def my_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = get_my_employee(current_user, db)
    if not emp: return {"documents": []}
    docs = db.query(EmployeeDocument).filter(EmployeeDocument.employee_id == emp.id, EmployeeDocument.is_active == True).all()
    return {"documents": [{"id": d.id, "document_type": d.document_type, "document_name": d.document_name,
                           "document_number": d.document_number, "is_verified": d.is_verified,
                           "expiry_date": str(d.expiry_date) if d.expiry_date else None} for d in docs]}

# ── My Benefits ───────────────────────────────────────────────────────────────

@router.get("/benefits")
async def my_benefits(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = get_my_employee(current_user, db)
    if not emp: return {"benefits": []}
    from app.models.hr_extended import BenefitPlan
    benefits = db.query(EmployeeBenefit).filter(EmployeeBenefit.employee_id == emp.id, EmployeeBenefit.is_active == True).all()
    plans = {p.id: p for p in db.query(BenefitPlan).all()}
    return {"benefits": [{"id": b.id, "plan_name": plans[b.plan_id].name if b.plan_id in plans else "?",
                          "benefit_type": plans[b.plan_id].benefit_type if b.plan_id in plans else "?",
                          "coverage_amount": float(plans[b.plan_id].coverage_amount or 0) if b.plan_id in plans else 0,
                          "policy_number": b.policy_number,
                          "enrollment_date": str(b.enrollment_date) if b.enrollment_date else None} for b in benefits]}

# ── My Approvals (pending actions for me) ─────────────────────────────────────

@router.get("/approvals/inbox")
async def my_approval_inbox(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.approval import ApprovalAuthority
    # Get my approval authorities
    authorities = db.query(ApprovalAuthority).filter(
        ApprovalAuthority.user_id == current_user.id, ApprovalAuthority.is_active == True
    ).all()
    wf_types = [a.workflow_type for a in authorities]
    q = db.query(ApprovalRequest).filter(ApprovalRequest.status.in_(["pending","in_progress"]))
    if not current_user.is_superuser:
        if wf_types: q = q.filter(ApprovalRequest.workflow_type.in_(wf_types))
        else: q = q.filter(ApprovalRequest.requested_by == current_user.id)
    items = q.order_by(ApprovalRequest.created_at.desc()).limit(20).all()
    return {"total": len(items), "items": [{"id": r.id, "request_number": r.request_number,
                                            "workflow_type": r.workflow_type, "title": r.title,
                                            "status": r.status, "priority": r.priority,
                                            "created_at": r.created_at.isoformat() if r.created_at else None} for r in items]}

@router.get("/approvals/my-requests")
async def my_submitted_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(ApprovalRequest).filter(ApprovalRequest.requested_by == current_user.id).order_by(ApprovalRequest.created_at.desc()).limit(20).all()
    return {"total": len(items), "items": [{"id": r.id, "request_number": r.request_number,
                                            "workflow_type": r.workflow_type, "title": r.title,
                                            "status": r.status, "created_at": r.created_at.isoformat() if r.created_at else None} for r in items]}

# ── My Onboarding ─────────────────────────────────────────────────────────────

@router.get("/onboarding")
async def my_onboarding(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = get_my_employee(current_user, db)
    if not emp: return {"started": False}
    rec = db.query(OnboardingRecord).filter(OnboardingRecord.employee_id == emp.id).first()
    if not rec: return {"started": False}
    return {"started": True, "status": rec.status, "progress_percent": rec.progress_percent,
            "task_statuses": rec.task_statuses or {}}

# ── My Performance ────────────────────────────────────────────────────────────

@router.get("/performance")
async def my_performance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = get_my_employee(current_user, db)
    if not emp: return {"reviews": []}
    reviews = db.query(PerformanceReview).filter(PerformanceReview.employee_id == emp.id).order_by(PerformanceReview.review_date.desc()).all()
    return {"reviews": [{"id": r.id, "review_period": r.review_period, "review_type": r.review_type,
                         "overall_rating": r.overall_rating, "rating_label": r.rating_label,
                         "outcome": r.outcome, "increment_percent": r.increment_percent,
                         "status": r.status, "review_date": str(r.review_date) if r.review_date else None} for r in reviews]}
