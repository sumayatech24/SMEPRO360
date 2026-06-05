"""
Skills, Education & KRA/KPI Performance Appraisal API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date

from app.db.base import get_db
from app.models.skills import (
    SkillCategory, Skill, EmployeeSkill, EducationDetail,
    AppraisalCycle, KRATemplate, EmployeeAppraisal
)
from app.models.hr import Employee
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

RATING_LABELS = {5:"Exceptional",4:"Exceeds Expectations",3:"Meets Expectations",
                 2:"Needs Improvement",1:"Unacceptable"}

# ─────────────────────────────────────────────────────────────────────────────
# SKILLS CATALOG
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/categories")
async def list_skill_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cats = db.query(SkillCategory).filter(SkillCategory.is_active==True).order_by(SkillCategory.name).all()
    return [{"id":c.id,"name":c.name,"industry":c.industry} for c in cats]

@router.get("/skills")
async def list_skills(category_id: Optional[int]=None, search: Optional[str]=None,
                       db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Skill).filter(Skill.is_active==True)
    if category_id: q = q.filter(Skill.category_id==category_id)
    if search: q = q.filter(Skill.name.ilike(f"%{search}%"))
    skills = q.order_by(Skill.name).all()
    return [{"id":s.id,"name":s.name,"category_id":s.category_id,
             "category_name":s.category.name if s.category else None,"skill_type":s.skill_type} for s in skills]

@router.post("/skills")
async def create_skill(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    s = Skill(name=data["name"], category_id=data.get("category_id"), skill_type=data.get("skill_type","technical"), description=data.get("description"))
    db.add(s); db.commit(); db.refresh(s)
    return {"id":s.id,"name":s.name}

# ─────────────────────────────────────────────────────────────────────────────
# EMPLOYEE SKILLS
# ─────────────────────────────────────────────────────────────────────────────

def skill_dict(es: EmployeeSkill):
    return {"id":es.id,"employee_id":es.employee_id,"skill_id":es.skill_id,
            "skill_name":es.skill.name if es.skill else es.skill_name,
            "category_name":es.skill.category.name if es.skill and es.skill.category else None,
            "skill_type":es.skill.skill_type if es.skill else None,
            "proficiency":es.proficiency,"proficiency_score":es.proficiency_score,
            "years_experience":es.years_experience,"last_used_year":es.last_used_year,
            "is_primary":es.is_primary,"certification":es.certification,
            "cert_date":str(es.cert_date) if es.cert_date else None,"notes":es.notes}

@router.get("/employee/{emp_id}/skills")
async def get_employee_skills(emp_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    skills = db.query(EmployeeSkill).filter(EmployeeSkill.employee_id==emp_id).order_by(EmployeeSkill.proficiency_score.desc()).all()
    return [skill_dict(s) for s in skills]

@router.post("/employee/{emp_id}/skills")
async def add_employee_skill(emp_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    proficiency_map = {"beginner":1,"intermediate":3,"advanced":4,"expert":5}
    prof = data.get("proficiency","intermediate")
    es = EmployeeSkill(
        employee_id=emp_id, skill_id=data.get("skill_id"),
        skill_name=data.get("skill_name",""), proficiency=prof,
        proficiency_score=data.get("proficiency_score", proficiency_map.get(prof,3)),
        years_experience=data.get("years_experience",0),
        last_used_year=data.get("last_used_year"),
        is_primary=data.get("is_primary",False),
        certification=data.get("certification"),
        cert_date=date.fromisoformat(data["cert_date"]) if data.get("cert_date") else None,
        notes=data.get("notes")
    )
    db.add(es); db.commit(); db.refresh(es)
    return skill_dict(es)

@router.put("/employee/{emp_id}/skills/{skill_id}")
async def update_employee_skill(emp_id: int, skill_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    es = db.query(EmployeeSkill).filter(EmployeeSkill.id==skill_id, EmployeeSkill.employee_id==emp_id).first()
    if not es: raise HTTPException(404,"Not found")
    for k,v in data.items():
        if hasattr(es,k): setattr(es,k,v)
    db.commit(); return skill_dict(es)

@router.delete("/employee/{emp_id}/skills/{skill_id}")
async def delete_employee_skill(emp_id: int, skill_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    es = db.query(EmployeeSkill).filter(EmployeeSkill.id==skill_id, EmployeeSkill.employee_id==emp_id).first()
    if not es: raise HTTPException(404,"Not found")
    db.delete(es); db.commit()
    return {"message":"Skill removed"}

# ─────────────────────────────────────────────────────────────────────────────
# EDUCATION
# ─────────────────────────────────────────────────────────────────────────────

def edu_dict(e: EducationDetail):
    return {"id":e.id,"employee_id":e.employee_id,"degree":e.degree,"specialization":e.specialization,
            "institution":e.institution,"university":e.university,"year_from":e.year_from,
            "year_to":e.year_to,"grade":e.grade,"grade_value":e.grade_value,"grade_type":e.grade_type,
            "country":e.country,"is_highest":e.is_highest,"is_verified":e.is_verified,"certificate_url":e.certificate_url}

@router.get("/employee/{emp_id}/education")
async def get_employee_education(emp_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    edus = db.query(EducationDetail).filter(EducationDetail.employee_id==emp_id).order_by(EducationDetail.year_to.desc()).all()
    return [edu_dict(e) for e in edus]

@router.post("/employee/{emp_id}/education")
async def add_education(emp_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    edu = EducationDetail(employee_id=emp_id, degree=data["degree"], specialization=data.get("specialization"),
                          institution=data.get("institution"), university=data.get("university"),
                          year_from=data.get("year_from"), year_to=data.get("year_to"),
                          grade=data.get("grade"), grade_value=data.get("grade_value"),
                          grade_type=data.get("grade_type","percentage"), country=data.get("country","India"),
                          is_highest=data.get("is_highest",False), certificate_url=data.get("certificate_url"))
    db.add(edu); db.commit(); db.refresh(edu)
    return edu_dict(edu)

@router.put("/employee/{emp_id}/education/{edu_id}")
async def update_education(emp_id: int, edu_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    edu = db.query(EducationDetail).filter(EducationDetail.id==edu_id, EducationDetail.employee_id==emp_id).first()
    if not edu: raise HTTPException(404,"Not found")
    for k,v in data.items():
        if hasattr(edu,k): setattr(edu,k,v)
    db.commit(); return edu_dict(edu)

@router.delete("/employee/{emp_id}/education/{edu_id}")
async def delete_education(emp_id: int, edu_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    edu = db.query(EducationDetail).filter(EducationDetail.id==edu_id, EducationDetail.employee_id==emp_id).first()
    if not edu: raise HTTPException(404,"Not found")
    db.delete(edu); db.commit()
    return {"message":"Education record removed"}

# ─────────────────────────────────────────────────────────────────────────────
# MANAGER DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/manager/dashboard")
async def manager_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Manager sees their team's data (not personal sensitive info)"""
    from app.models.resource import ResourceAllocation
    from app.models.project import ProjectTask
    from app.models.hr import Leave, Attendance
    from app.models.approval import ApprovalRequest

    # Find manager's employee record
    manager_emp = db.query(Employee).filter(Employee.email==current_user.email).first()
    if not manager_emp and not current_user.is_superuser:
        return {"team":[],"message":"No manager record found"}

    # Get direct reports
    from app.models.hr_extended import OnboardingRecord
    if current_user.is_superuser:
        team = db.query(Employee).filter(Employee.is_active==True).limit(30).all()
    else:
        from app.models.resource import ManagerHierarchy as MH
        reports = db.query(MH).filter(MH.reporting_manager_id==manager_emp.id).all()
        emp_ids = [r.employee_id for r in reports]
        team = db.query(Employee).filter(Employee.id.in_(emp_ids), Employee.is_active==True).all() if emp_ids else []

    today = date.today()
    team_data = []
    for emp in team:
        # Today attendance
        att = db.query(Attendance).filter(Attendance.employee_id==emp.id, Attendance.date==today).first()
        # Pending leaves
        pending_leaves = db.query(func.count(Leave.id)).filter(Leave.employee_id==emp.id, Leave.status=="pending").scalar()
        # Open tasks
        open_tasks = db.query(func.count(ProjectTask.id)).filter(ProjectTask.assigned_to==emp.id, ProjectTask.status.in_(["todo","in_progress"]), ProjectTask.is_active==True).scalar()
        # Active projects
        active_projs = db.query(func.count(ResourceAllocation.id)).filter(ResourceAllocation.employee_id==emp.id, ResourceAllocation.status=="active").scalar()

        team_data.append({
            "id":emp.id, "employee_number":emp.employee_number,
            "name":f"{emp.first_name} {emp.last_name or ''}".strip(),
            "department_id":emp.department_id, "employment_type":emp.employment_type,
            # Attendance (not personal salary/bank)
            "today_status": att.status if att else "not_marked",
            "checked_in": att.check_in is not None if att else False,
            "check_in_time": att.check_in.strftime("%H:%M") if att and att.check_in else None,
            "check_out_time": att.check_out.strftime("%H:%M") if att and att.check_out else None,
            "hours_today": float(att.hours_worked or 0) if att else 0,
            # Work metrics
            "pending_leaves": pending_leaves, "open_tasks": open_tasks, "active_projects": active_projs,
        })

    # Pending approvals for manager to action
    pending_approvals = db.query(ApprovalRequest).filter(
        ApprovalRequest.status.in_(["pending","in_progress"])
    ).order_by(ApprovalRequest.created_at.desc()).limit(10).all()

    return {
        "team_size": len(team_data), "team": team_data,
        "pending_approvals": [{"id":a.id,"request_number":a.request_number,"workflow_type":a.workflow_type,
                               "title":a.title,"status":a.status} for a in pending_approvals],
        "today": str(today),
        "team_present": sum(1 for t in team_data if t["today_status"]=="present"),
        "team_absent": sum(1 for t in team_data if t["today_status"]=="absent"),
        "team_not_marked": sum(1 for t in team_data if t["today_status"]=="not_marked"),
        "total_pending_leaves": sum(t["pending_leaves"] for t in team_data),
    }

# ─────────────────────────────────────────────────────────────────────────────
# APPRAISAL CYCLES
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/appraisal/cycles")
async def list_cycles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cycles = db.query(AppraisalCycle).order_by(AppraisalCycle.created_at.desc()).all()
    return [{"id":c.id,"name":c.name,"cycle_type":c.cycle_type,"financial_year":c.financial_year,
             "period_label":c.period_label,"status":c.status,
             "start_date":str(c.start_date) if c.start_date else None,
             "end_date":str(c.end_date) if c.end_date else None,
             "kra_setting_deadline":str(c.kra_setting_deadline) if c.kra_setting_deadline else None,
             "self_review_deadline":str(c.self_review_deadline) if c.self_review_deadline else None,
             "manager_review_deadline":str(c.manager_review_deadline) if c.manager_review_deadline else None,
             "calibration_date":str(c.calibration_date) if c.calibration_date else None,
             "kra_count":len(c.kra_templates)} for c in cycles]

@router.post("/appraisal/cycles")
async def create_cycle(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    def pd(d): return date.fromisoformat(d) if d else None
    c = AppraisalCycle(
        name=data["name"], cycle_type=data.get("cycle_type","annual"),
        financial_year=data.get("financial_year"), period_label=data.get("period_label"),
        start_date=pd(data.get("start_date")), end_date=pd(data.get("end_date")),
        kra_setting_deadline=pd(data.get("kra_setting_deadline")),
        self_review_deadline=pd(data.get("self_review_deadline")),
        manager_review_deadline=pd(data.get("manager_review_deadline")),
        calibration_date=pd(data.get("calibration_date")),
        status="draft", created_by=current_user.id
    )
    db.add(c); db.commit(); db.refresh(c)
    return {"id":c.id,"name":c.name,"status":c.status}

@router.put("/appraisal/cycles/{cycle_id}")
async def update_cycle(cycle_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    c = db.query(AppraisalCycle).filter(AppraisalCycle.id==cycle_id).first()
    if not c: raise HTTPException(404,"Not found")
    for k,v in data.items():
        if hasattr(c,k): setattr(c,k,v)
    db.commit(); return {"id":c.id,"status":c.status}

# ─────────────────────────────────────────────────────────────────────────────
# KRA TEMPLATES (HR sets for a cycle)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/appraisal/cycles/{cycle_id}/kras")
async def list_kras(cycle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    kras = db.query(KRATemplate).filter(KRATemplate.cycle_id==cycle_id).order_by(KRATemplate.sort_order).all()
    return [{"id":k.id,"kra_name":k.kra_name,"kra_description":k.kra_description,
             "weightage":k.weightage,"measurement_criteria":k.measurement_criteria,
             "target_value":k.target_value,"kpi_type":k.kpi_type,
             "department_id":k.department_id,"is_mandatory":k.is_mandatory} for k in kras]

@router.post("/appraisal/cycles/{cycle_id}/kras")
async def add_kra(cycle_id: int, data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    k = KRATemplate(cycle_id=cycle_id, kra_name=data["kra_name"],
                    kra_description=data.get("kra_description"),
                    weightage=data.get("weightage",0),
                    measurement_criteria=data.get("measurement_criteria"),
                    target_value=data.get("target_value"),
                    kpi_type=data.get("kpi_type","quantitative"),
                    department_id=data.get("department_id"),
                    is_mandatory=data.get("is_mandatory",True),
                    sort_order=data.get("sort_order",0))
    db.add(k); db.commit(); db.refresh(k)
    return {"id":k.id,"kra_name":k.kra_name}

@router.delete("/appraisal/kras/{kra_id}")
async def delete_kra(kra_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    k = db.query(KRATemplate).filter(KRATemplate.id==kra_id).first()
    if not k: raise HTTPException(404,"Not found")
    db.delete(k); db.commit()
    return {"message":"KRA removed"}

# ─────────────────────────────────────────────────────────────────────────────
# EMPLOYEE APPRAISALS (initiate, self-review, manager review)
# ─────────────────────────────────────────────────────────────────────────────

def appraisal_dict(a: EmployeeAppraisal):
    return {"id":a.id,"cycle_id":a.cycle_id,"employee_id":a.employee_id,
            "reviewer_id":a.reviewer_id,"status":a.status,
            "kras":a.kras or [],"self_score":a.self_score,"manager_score":a.manager_score,
            "final_score":a.final_score,"rating_label":a.rating_label,
            "goals_next_period":a.goals_next_period or [],
            "employee_comments":a.employee_comments,"manager_comments":a.manager_comments,
            "outcome":a.outcome,"increment_percent":a.increment_percent,
            "employee_acknowledged":a.employee_acknowledged,
            "created_at":a.created_at.isoformat() if a.created_at else None}

@router.post("/appraisal/cycles/{cycle_id}/initiate")
async def initiate_appraisals(cycle_id: int, data: dict = {}, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    """HR initiates appraisals for all active employees"""
    cycle = db.query(AppraisalCycle).filter(AppraisalCycle.id==cycle_id).first()
    if not cycle: raise HTTPException(404,"Cycle not found")
    kras = db.query(KRATemplate).filter(KRATemplate.cycle_id==cycle_id).all()
    kra_list = [{"kra_id":k.id,"kra_name":k.kra_name,"weightage":k.weightage,
                 "target_value":k.target_value,"measurement_criteria":k.measurement_criteria,
                 "kpi_type":k.kpi_type,"is_mandatory":k.is_mandatory,
                 "employee_achievement":"","employee_score":None,
                 "manager_achievement":"","manager_score":None,"final_score":None,"comments":""} for k in kras]
    employees = db.query(Employee).filter(Employee.is_active==True, Employee.status=="active").all()
    created = skipped = 0
    for emp in employees:
        existing = db.query(EmployeeAppraisal).filter(EmployeeAppraisal.cycle_id==cycle_id, EmployeeAppraisal.employee_id==emp.id).first()
        if not existing:
            db.add(EmployeeAppraisal(cycle_id=cycle_id, employee_id=emp.id, status="kra_set", kras=kra_list))
            created += 1
        else: skipped += 1
    cycle.status = "kra_setting"
    db.commit()
    return {"message":f"Appraisals initiated for {created} employees","created":created,"skipped":skipped}

@router.get("/appraisal/cycles/{cycle_id}/appraisals")
async def list_appraisals(cycle_id: int, status: Optional[str]=None, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    q = db.query(EmployeeAppraisal).filter(EmployeeAppraisal.cycle_id==cycle_id)
    if status: q = q.filter(EmployeeAppraisal.status==status)
    appraisals = q.all()
    employees = {e.id:e for e in db.query(Employee).all()}
    result = []
    for a in appraisals:
        emp = employees.get(a.employee_id)
        d = appraisal_dict(a)
        d["employee_name"] = f"{emp.first_name} {emp.last_name or ''}".strip() if emp else f"EMP-{a.employee_id}"
        d["employee_number"] = emp.employee_number if emp else ""
        result.append(d)
    return result

@router.get("/appraisal/my")
async def get_my_appraisals(cycle_id: Optional[int]=None, db: Session = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    """Employee sees their own appraisals"""
    emp = db.query(Employee).filter(Employee.email==current_user.email).first()
    if not emp: return []
    q = db.query(EmployeeAppraisal).filter(EmployeeAppraisal.employee_id==emp.id)
    if cycle_id: q = q.filter(EmployeeAppraisal.cycle_id==cycle_id)
    appraisals = q.order_by(EmployeeAppraisal.created_at.desc()).all()
    return [appraisal_dict(a) for a in appraisals]

@router.put("/appraisal/{appraisal_id}/self-review")
async def submit_self_review(appraisal_id: int, data: dict, db: Session = Depends(get_db),
                              current_user: User = Depends(get_current_user)):
    """Employee submits self-assessment"""
    a = db.query(EmployeeAppraisal).filter(EmployeeAppraisal.id==appraisal_id).first()
    if not a: raise HTTPException(404,"Not found")
    a.kras = data.get("kras", a.kras)
    a.employee_comments = data.get("employee_comments")
    a.goals_next_period = data.get("goals_next_period", [])
    # Calculate self score
    if a.kras:
        scores = [(k.get("employee_score") or 0) * (k.get("weightage") or 0) for k in a.kras if k.get("employee_score")]
        total_weight = sum(k.get("weightage",0) for k in a.kras if k.get("employee_score"))
        a.self_score = round(sum(scores)/max(total_weight,1), 2) if scores else None
    a.status = "self_review"; a.self_review_date = datetime.now()
    db.commit()
    return {"id":a.id,"status":a.status,"self_score":a.self_score}

@router.put("/appraisal/{appraisal_id}/manager-review")
async def submit_manager_review(appraisal_id: int, data: dict, db: Session = Depends(get_db),
                                 current_user: User = Depends(get_current_user)):
    """Manager submits their assessment"""
    a = db.query(EmployeeAppraisal).filter(EmployeeAppraisal.id==appraisal_id).first()
    if not a: raise HTTPException(404,"Not found")
    a.kras = data.get("kras", a.kras)
    a.manager_comments = data.get("manager_comments")
    a.development_plan = data.get("development_plan")
    a.training_needs = data.get("training_needs")
    a.outcome = data.get("outcome","no_change")
    a.increment_percent = data.get("increment_percent")
    # Calculate manager score
    if a.kras:
        scores = [(k.get("manager_score") or 0) * (k.get("weightage") or 0) for k in a.kras if k.get("manager_score")]
        total_weight = sum(k.get("weightage",0) for k in a.kras if k.get("manager_score"))
        a.manager_score = round(sum(scores)/max(total_weight,1), 2) if scores else None
        a.final_score = a.manager_score
        if a.final_score:
            r = round(a.final_score)
            a.rating_label = RATING_LABELS.get(min(5,max(1,r)),"Meets Expectations")
    a.reviewer_id = data.get("reviewer_id")
    a.status = "manager_review"; a.manager_review_date = datetime.now()
    db.commit()
    return {"id":a.id,"status":a.status,"manager_score":a.manager_score,"rating_label":a.rating_label}

@router.put("/appraisal/{appraisal_id}/close")
async def close_appraisal(appraisal_id: int, data: dict={}, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    a = db.query(EmployeeAppraisal).filter(EmployeeAppraisal.id==appraisal_id).first()
    if not a: raise HTTPException(404,"Not found")
    a.status = "closed"; a.closed_date = datetime.now()
    if data.get("hr_comments"): a.hr_comments = data["hr_comments"]
    if data.get("final_score"): a.final_score = data["final_score"]
    if data.get("rating_label"): a.rating_label = data["rating_label"]
    db.commit()
    return {"id":a.id,"status":"closed"}

@router.put("/appraisal/{appraisal_id}/acknowledge")
async def employee_acknowledge(appraisal_id: int, db: Session = Depends(get_db),
                                current_user: User = Depends(get_current_user)):
    a = db.query(EmployeeAppraisal).filter(EmployeeAppraisal.id==appraisal_id).first()
    if not a: raise HTTPException(404,"Not found")
    a.employee_acknowledged = True; a.employee_acknowledged_at = datetime.now()
    db.commit()
    return {"id":a.id,"acknowledged":True}

@router.get("/appraisal/analytics")
async def appraisal_analytics(cycle_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    appraisals = db.query(EmployeeAppraisal).filter(EmployeeAppraisal.cycle_id==cycle_id).all()
    by_rating = {}
    by_outcome = {}
    for a in appraisals:
        if a.rating_label: by_rating[a.rating_label] = by_rating.get(a.rating_label,0)+1
        if a.outcome: by_outcome[a.outcome] = by_outcome.get(a.outcome,0)+1
    avg_score = round(sum(a.final_score or 0 for a in appraisals)/max(len(appraisals),1),2)
    return {"total":len(appraisals),"completed":sum(1 for a in appraisals if a.status=="closed"),
            "by_rating":by_rating,"by_outcome":by_outcome,"avg_score":avg_score,
            "pending_self_review":sum(1 for a in appraisals if a.status in ["kra_set","pending"]),
            "pending_manager_review":sum(1 for a in appraisals if a.status=="self_review")}
