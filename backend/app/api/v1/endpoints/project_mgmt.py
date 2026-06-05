"""
Complete Project Management API
- Project phases
- WBS (Work Breakdown Structure) — MS Project style grid
- Milestones
- Risk Register
- Issue Tracker
- Budget & EVM
- Project Documents
- Activity Log
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date

from app.db.base import get_db
from app.models.project_mgmt import (
    ProjectPhase, WBSItem, ProjectMilestone, ProjectRisk,
    ProjectIssue, ProjectBudget, ProjectDocument, ProjectActivity
)
from app.models.project import Project
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class PhaseCreate(BaseModel):
    project_id: int
    phase_name: str
    phase_code: Optional[str] = None
    phase_order: int = 1
    description: Optional[str] = None
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    color: str = "#6366f1"

class WBSCreate(BaseModel):
    project_id: int
    phase_id: Optional[int] = None
    parent_id: Optional[int] = None
    wbs_code: Optional[str] = None
    task_name: str
    description: Optional[str] = None
    task_type: str = "task"
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    duration_days: float = 1
    assigned_to: Optional[int] = None
    percent_complete: float = 0
    status: str = "not_started"
    priority: str = "medium"
    estimated_hours: float = 0
    estimated_cost: float = 0
    predecessors: Optional[str] = None
    dependency_type: str = "FS"
    lag_days: float = 0
    sort_order: int = 0
    level: int = 1
    notes: Optional[str] = None

class MilestoneCreate(BaseModel):
    project_id: int
    phase_id: Optional[int] = None
    milestone_name: str
    description: Optional[str] = None
    milestone_type: str = "delivery"
    planned_date: str
    owner_id: Optional[int] = None
    deliverable: Optional[str] = None
    acceptance_criteria: Optional[str] = None

class RiskCreate(BaseModel):
    project_id: int
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    probability: str = "medium"
    impact: str = "medium"
    mitigation_plan: Optional[str] = None
    contingency_plan: Optional[str] = None
    owner_id: Optional[int] = None
    identified_date: Optional[str] = None
    review_date: Optional[str] = None

class IssueCreate(BaseModel):
    project_id: int
    title: str
    description: Optional[str] = None
    issue_type: str = "issue"
    priority: str = "medium"
    severity: str = "medium"
    assigned_to: Optional[int] = None
    raised_by: Optional[int] = None
    raised_date: Optional[str] = None
    target_date: Optional[str] = None
    impact_on_schedule: str = "none"
    impact_on_budget: str = "none"

class BudgetUpdate(BaseModel):
    approved_budget: float = 0
    contingency: float = 0
    labour_cost_planned: float = 0
    material_cost_planned: float = 0
    equipment_cost_planned: float = 0
    travel_cost_planned: float = 0
    overhead_planned: float = 0
    labour_cost_actual: float = 0
    material_cost_actual: float = 0
    equipment_cost_actual: float = 0
    travel_cost_actual: float = 0
    overhead_actual: float = 0
    notes: Optional[str] = None

class DocCreate(BaseModel):
    project_id: int
    title: str
    document_type: Optional[str] = None
    category: Optional[str] = None
    version: str = "1.0"
    description: Optional[str] = None
    status: str = "draft"
    tags: List[str] = []

# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_date(d): return date.fromisoformat(d) if d else None

def phase_dict(p: ProjectPhase):
    return {"id": p.id, "project_id": p.project_id, "phase_name": p.phase_name,
            "phase_code": p.phase_code, "phase_order": p.phase_order, "description": p.description,
            "planned_start": str(p.planned_start) if p.planned_start else None,
            "planned_end": str(p.planned_end) if p.planned_end else None,
            "start_date": str(p.start_date) if p.start_date else None,
            "end_date": str(p.end_date) if p.end_date else None,
            "status": p.status, "progress_percent": p.progress_percent, "color": p.color}

def wbs_dict(w: WBSItem):
    return {"id": w.id, "project_id": w.project_id, "phase_id": w.phase_id,
            "parent_id": w.parent_id, "wbs_code": w.wbs_code, "task_name": w.task_name,
            "description": w.description, "task_type": w.task_type,
            "planned_start": str(w.planned_start) if w.planned_start else None,
            "planned_end": str(w.planned_end) if w.planned_end else None,
            "actual_start": str(w.actual_start) if w.actual_start else None,
            "actual_end": str(w.actual_end) if w.actual_end else None,
            "duration_days": w.duration_days, "assigned_to": w.assigned_to,
            "percent_complete": w.percent_complete, "status": w.status, "priority": w.priority,
            "estimated_hours": w.estimated_hours, "actual_hours": w.actual_hours,
            "estimated_cost": float(w.estimated_cost or 0), "actual_cost": float(w.actual_cost or 0),
            "predecessors": w.predecessors, "dependency_type": w.dependency_type, "lag_days": w.lag_days,
            "sort_order": w.sort_order, "level": w.level, "is_critical": w.is_critical,
            "notes": w.notes, "assigned_team": w.assigned_team or []}

# ── Project Overview ──────────────────────────────────────────────────────────

@router.get("/{project_id}/overview")
async def project_overview(project_id: int, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj: raise HTTPException(404, "Project not found")

    phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).order_by(ProjectPhase.phase_order).all()
    total_wbs = db.query(func.count(WBSItem.id)).filter(WBSItem.project_id == project_id, WBSItem.is_active == True).scalar()
    done_wbs = db.query(func.count(WBSItem.id)).filter(WBSItem.project_id == project_id, WBSItem.status == "completed").scalar()
    milestones = db.query(ProjectMilestone).filter(ProjectMilestone.project_id == project_id).all()
    risks = db.query(ProjectRisk).filter(ProjectRisk.project_id == project_id, ProjectRisk.is_active == True).all()
    issues = db.query(ProjectIssue).filter(ProjectIssue.project_id == project_id, ProjectIssue.is_active == True).all()
    budget = db.query(ProjectBudget).filter(ProjectBudget.project_id == project_id).first()
    docs = db.query(func.count(ProjectDocument.id)).filter(ProjectDocument.project_id == project_id).scalar()
    recent = db.query(ProjectActivity).filter(ProjectActivity.project_id == project_id).order_by(ProjectActivity.created_at.desc()).limit(5).all()

    overall_progress = round(sum(p.progress_percent for p in phases) / max(len(phases), 1), 1) if phases else (proj.progress_percent or 0)

    return {
        "project": {"id": proj.id, "project_number": proj.project_number, "name": proj.name,
                    "description": proj.description, "project_type": proj.project_type,
                    "status": proj.status, "priority": proj.priority,
                    "start_date": str(proj.start_date) if proj.start_date else None,
                    "end_date": str(proj.end_date) if proj.end_date else None,
                    "budget": float(proj.budget or 0), "actual_cost": float(proj.actual_cost or 0),
                    "progress_percent": overall_progress, "project_manager_id": proj.project_manager_id,
                    "customer_id": proj.customer_id},
        "phases": [phase_dict(p) for p in phases],
        "summary": {
            "total_tasks": total_wbs or 0,
            "completed_tasks": done_wbs or 0,
            "milestones_total": len(milestones),
            "milestones_achieved": len([m for m in milestones if m.status == "achieved"]),
            "milestones_missed": len([m for m in milestones if m.status == "missed"]),
            "milestones_at_risk": len([m for m in milestones if m.status == "at_risk"]),
            "open_risks": len([r for r in risks if r.status == "open"]),
            "critical_risks": len([r for r in risks if r.risk_level == "critical"]),
            "open_issues": len([i for i in issues if i.status == "open"]),
            "documents": docs or 0,
            "budget_planned": float(budget.total_budget if budget else proj.budget or 0),
            "budget_actual": float(budget.total_actual if budget else proj.actual_cost or 0),
        },
        "overall_progress": overall_progress,
        "recent_activity": [{"id": a.id, "title": a.title, "activity_type": a.activity_type,
                              "description": a.description, "created_at": a.created_at.isoformat()} for a in recent],
    }

# ── Project Phases ────────────────────────────────────────────────────────────

@router.get("/{project_id}/phases")
async def list_phases(project_id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id, ProjectPhase.is_active == True).order_by(ProjectPhase.phase_order).all()
    return [phase_dict(p) for p in phases]

@router.post("/{project_id}/phases")
async def create_phase(project_id: int, data: PhaseCreate, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    p = ProjectPhase(project_id=project_id, phase_name=data.phase_name, phase_code=data.phase_code,
                     phase_order=data.phase_order, description=data.description, color=data.color,
                     planned_start=parse_date(data.planned_start), planned_end=parse_date(data.planned_end))
    db.add(p); db.commit(); db.refresh(p)
    _log_activity(project_id, "phase_created", f"Phase created: {p.phase_name}", db, current_user.id)
    return phase_dict(p)

@router.put("/{project_id}/phases/{phase_id}")
async def update_phase(project_id: int, phase_id: int, data: dict, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    p = db.query(ProjectPhase).filter(ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id).first()
    if not p: raise HTTPException(404, "Phase not found")
    for k, v in data.items():
        if k in ['planned_start','planned_end','start_date','end_date'] and v:
            setattr(p, k, date.fromisoformat(v))
        elif hasattr(p, k): setattr(p, k, v)
    db.commit(); return phase_dict(p)

@router.delete("/{project_id}/phases/{phase_id}")
async def delete_phase(project_id: int, phase_id: int, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    p = db.query(ProjectPhase).filter(ProjectPhase.id == phase_id).first()
    if not p: raise HTTPException(404, "Not found")
    p.is_active = False; db.commit()
    return {"message": "Phase deleted"}

# ── WBS ───────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/wbs")
async def get_wbs(project_id: int, phase_id: Optional[int] = None,
                   db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(WBSItem).filter(WBSItem.project_id == project_id, WBSItem.is_active == True)
    if phase_id: q = q.filter(WBSItem.phase_id == phase_id)
    items = q.order_by(WBSItem.sort_order, WBSItem.wbs_code, WBSItem.id).all()
    return {"total": len(items), "items": [wbs_dict(w) for w in items]}

@router.post("/{project_id}/wbs")
async def create_wbs_item(project_id: int, data: WBSCreate, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    w = WBSItem(project_id=project_id, phase_id=data.phase_id, parent_id=data.parent_id,
                wbs_code=data.wbs_code, task_name=data.task_name, description=data.description,
                task_type=data.task_type, duration_days=data.duration_days,
                assigned_to=data.assigned_to, percent_complete=data.percent_complete,
                status=data.status, priority=data.priority, estimated_hours=data.estimated_hours,
                estimated_cost=data.estimated_cost, predecessors=data.predecessors,
                dependency_type=data.dependency_type, lag_days=data.lag_days,
                sort_order=data.sort_order, level=data.level, notes=data.notes,
                planned_start=parse_date(data.planned_start), planned_end=parse_date(data.planned_end))
    db.add(w); db.commit(); db.refresh(w)
    # Update phase progress
    _update_phase_progress(data.phase_id, db)
    return wbs_dict(w)

@router.put("/{project_id}/wbs/{item_id}")
async def update_wbs_item(project_id: int, item_id: int, data: dict,
                           db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    w = db.query(WBSItem).filter(WBSItem.id == item_id, WBSItem.project_id == project_id).first()
    if not w: raise HTTPException(404, "WBS item not found")
    date_fields = ['planned_start','planned_end','actual_start','actual_end']
    for k, v in data.items():
        if k in date_fields and v: setattr(w, k, date.fromisoformat(v))
        elif k in date_fields and not v: setattr(w, k, None)
        elif hasattr(w, k): setattr(w, k, v)
    # Auto-set status
    if 'percent_complete' in data:
        pc = float(data['percent_complete'])
        if pc == 100: w.status = "completed"
        elif pc > 0: w.status = "in_progress"
        else: w.status = "not_started"
    db.commit()
    _update_phase_progress(w.phase_id, db)
    return wbs_dict(w)

@router.delete("/{project_id}/wbs/{item_id}")
async def delete_wbs_item(project_id: int, item_id: int, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    w = db.query(WBSItem).filter(WBSItem.id == item_id).first()
    if not w: raise HTTPException(404, "Not found")
    w.is_active = False; db.commit()
    return {"message": "Task deleted"}

@router.post("/{project_id}/wbs/bulk")
async def bulk_update_wbs(project_id: int, data: dict, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    """Bulk update multiple WBS items (e.g. after drag-reorder)"""
    updates = data.get("updates", [])
    updated = 0
    for u in updates:
        item_id = u.get("id")
        if not item_id: continue
        w = db.query(WBSItem).filter(WBSItem.id == item_id, WBSItem.project_id == project_id).first()
        if w:
            for k, v in u.items():
                if k == "id": continue
                if k in ['planned_start','planned_end','actual_start','actual_end'] and v:
                    setattr(w, k, date.fromisoformat(v))
                elif hasattr(w, k): setattr(w, k, v)
            updated += 1
    db.commit()
    return {"updated": updated}

# ── Milestones ────────────────────────────────────────────────────────────────

@router.get("/{project_id}/milestones")
async def list_milestones(project_id: int, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    ms = db.query(ProjectMilestone).filter(ProjectMilestone.project_id == project_id,
                                            ProjectMilestone.is_active == True).order_by(ProjectMilestone.planned_date).all()
    return [{"id": m.id, "project_id": m.project_id, "phase_id": m.phase_id,
             "milestone_name": m.milestone_name, "description": m.description,
             "milestone_type": m.milestone_type,
             "planned_date": str(m.planned_date), "actual_date": str(m.actual_date) if m.actual_date else None,
             "status": m.status, "owner_id": m.owner_id, "deliverable": m.deliverable,
             "acceptance_criteria": m.acceptance_criteria, "notes": m.notes,
             "days_variance": (date.today() - m.planned_date).days if m.planned_date and not m.actual_date and m.status != "achieved" else 0}
            for m in ms]

@router.post("/{project_id}/milestones")
async def create_milestone(project_id: int, data: MilestoneCreate, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    m = ProjectMilestone(project_id=project_id, phase_id=data.phase_id, milestone_name=data.milestone_name,
                         description=data.description, milestone_type=data.milestone_type,
                         planned_date=parse_date(data.planned_date), owner_id=data.owner_id,
                         deliverable=data.deliverable, acceptance_criteria=data.acceptance_criteria)
    db.add(m); db.commit(); db.refresh(m)
    _log_activity(project_id, "milestone_created", f"Milestone added: {m.milestone_name}", db, current_user.id)
    return {"id": m.id, "milestone_name": m.milestone_name, "planned_date": str(m.planned_date)}

@router.put("/{project_id}/milestones/{ms_id}")
async def update_milestone(project_id: int, ms_id: int, data: dict, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    m = db.query(ProjectMilestone).filter(ProjectMilestone.id == ms_id).first()
    if not m: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if k in ['planned_date','actual_date'] and v: setattr(m, k, date.fromisoformat(v))
        elif hasattr(m, k): setattr(m, k, v)
    # Auto-log achievement
    if data.get("status") == "achieved":
        _log_activity(project_id, "milestone_achieved", f"Milestone achieved: {m.milestone_name}", db, current_user.id)
    db.commit()
    return {"id": m.id, "status": m.status}

# ── Risk Register ─────────────────────────────────────────────────────────────

PROB_SCORE = {"low":1, "medium":2, "high":3, "critical":4}
IMPACT_SCORE = {"low":1, "medium":2, "high":3, "critical":4}
RISK_LEVEL = {(1,2):("low","#10b981"), (3,4):("medium","#f59e0b"), (5,8):("high","#ef4444"), (9,16):("critical","#7f1d1d")}

def get_risk_level(prob, impact):
    score = PROB_SCORE.get(prob,2) * IMPACT_SCORE.get(impact,2)
    for (lo,hi),(level,color) in RISK_LEVEL.items():
        if lo <= score <= hi: return level, score, color
    return "medium", score, "#f59e0b"

@router.get("/{project_id}/risks")
async def list_risks(project_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    risks = db.query(ProjectRisk).filter(ProjectRisk.project_id == project_id, ProjectRisk.is_active == True).order_by(ProjectRisk.risk_score.desc()).all()
    return [{"id": r.id, "risk_id_code": r.risk_id_code, "title": r.title, "description": r.description,
             "category": r.category, "probability": r.probability, "impact": r.impact,
             "risk_score": r.risk_score, "risk_level": r.risk_level, "status": r.status,
             "mitigation_plan": r.mitigation_plan, "contingency_plan": r.contingency_plan,
             "owner_id": r.owner_id, "identified_date": str(r.identified_date) if r.identified_date else None,
             "review_date": str(r.review_date) if r.review_date else None}
            for r in risks]

@router.post("/{project_id}/risks")
async def create_risk(project_id: int, data: RiskCreate, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    level, score, _ = get_risk_level(data.probability, data.impact)
    count = db.query(func.count(ProjectRisk.id)).filter(ProjectRisk.project_id == project_id).scalar()
    r = ProjectRisk(project_id=project_id, risk_id_code=f"R{(count or 0)+1:03d}", title=data.title,
                    description=data.description, category=data.category,
                    probability=data.probability, impact=data.impact, risk_score=score, risk_level=level,
                    mitigation_plan=data.mitigation_plan, contingency_plan=data.contingency_plan,
                    owner_id=data.owner_id, identified_date=parse_date(data.identified_date),
                    review_date=parse_date(data.review_date))
    db.add(r); db.commit(); db.refresh(r)
    return {"id": r.id, "risk_id_code": r.risk_id_code, "risk_level": r.risk_level}

@router.put("/{project_id}/risks/{risk_id}")
async def update_risk(project_id: int, risk_id: int, data: dict, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    r = db.query(ProjectRisk).filter(ProjectRisk.id == risk_id).first()
    if not r: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(r, k): setattr(r, k, v)
    if "probability" in data or "impact" in data:
        level, score, _ = get_risk_level(r.probability, r.impact)
        r.risk_level = level; r.risk_score = score
    db.commit(); return {"id": r.id, "risk_level": r.risk_level}

# ── Issues ────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/issues")
async def list_issues(project_id: int, status: Optional[str] = None, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    q = db.query(ProjectIssue).filter(ProjectIssue.project_id == project_id, ProjectIssue.is_active == True)
    if status: q = q.filter(ProjectIssue.status == status)
    issues = q.order_by(ProjectIssue.created_at.desc()).all()
    return [{"id": i.id, "issue_number": i.issue_number, "title": i.title, "description": i.description,
             "issue_type": i.issue_type, "priority": i.priority, "severity": i.severity, "status": i.status,
             "raised_by": i.raised_by, "assigned_to": i.assigned_to,
             "raised_date": str(i.raised_date) if i.raised_date else None,
             "target_date": str(i.target_date) if i.target_date else None,
             "resolved_date": str(i.resolved_date) if i.resolved_date else None,
             "resolution": i.resolution, "impact_on_schedule": i.impact_on_schedule,
             "impact_on_budget": i.impact_on_budget, "notes": i.notes}
            for i in issues]

@router.post("/{project_id}/issues")
async def create_issue(project_id: int, data: IssueCreate, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    count = db.query(func.count(ProjectIssue.id)).filter(ProjectIssue.project_id == project_id).scalar()
    prefix = "CR" if data.issue_type == "change_request" else "ISS"
    i = ProjectIssue(project_id=project_id, issue_number=f"{prefix}-{(count or 0)+1:03d}",
                     title=data.title, description=data.description, issue_type=data.issue_type,
                     priority=data.priority, severity=data.severity,
                     raised_by=data.raised_by, assigned_to=data.assigned_to,
                     raised_date=parse_date(data.raised_date) or date.today(),
                     target_date=parse_date(data.target_date),
                     impact_on_schedule=data.impact_on_schedule, impact_on_budget=data.impact_on_budget)
    db.add(i); db.commit(); db.refresh(i)
    return {"id": i.id, "issue_number": i.issue_number}

@router.put("/{project_id}/issues/{issue_id}")
async def update_issue(project_id: int, issue_id: int, data: dict, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    i = db.query(ProjectIssue).filter(ProjectIssue.id == issue_id).first()
    if not i: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(i, k): setattr(i, k, v)
    if data.get("status") == "resolved" and not i.resolved_date:
        i.resolved_date = date.today()
    db.commit(); return {"id": i.id, "status": i.status}

# ── Budget ────────────────────────────────────────────────────────────────────

@router.get("/{project_id}/budget")
async def get_budget(project_id: int, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    b = db.query(ProjectBudget).filter(ProjectBudget.project_id == project_id).first()
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not b:
        return {"project_id": project_id, "approved_budget": float(proj.budget or 0), "total_budget": float(proj.budget or 0),
                "contingency": 0, "total_actual": float(proj.actual_cost or 0),
                "labour_cost_planned": 0, "material_cost_planned": 0, "equipment_cost_planned": 0,
                "labour_cost_actual": 0, "material_cost_actual": 0, "equipment_cost_actual": 0,
                "travel_cost_actual": 0, "overhead_actual": 0,
                "spi": 1.0, "cpi": 1.0, "pv": 0, "ev": 0, "ac": 0, "notes": None}
    return {k: float(getattr(b, k)) if isinstance(getattr(b, k), (int, float)) or hasattr(getattr(b,k,''), 'quantize') else getattr(b,k)
            for k in ['project_id','approved_budget','contingency','total_budget','labour_cost_planned',
                      'material_cost_planned','equipment_cost_planned','travel_cost_planned','overhead_planned',
                      'labour_cost_actual','material_cost_actual','equipment_cost_actual','travel_cost_actual',
                      'overhead_actual','total_actual','pv','ev','ac','spi','cpi','currency','notes']}

@router.put("/{project_id}/budget")
async def update_budget(project_id: int, data: BudgetUpdate, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    b = db.query(ProjectBudget).filter(ProjectBudget.project_id == project_id).first()
    if not b:
        b = ProjectBudget(project_id=project_id)
        db.add(b)
    d = data.dict()
    total_planned = sum([d.get(f,0) for f in ['labour_cost_planned','material_cost_planned','equipment_cost_planned','travel_cost_planned','overhead_planned']])
    total_actual = sum([d.get(f,0) for f in ['labour_cost_actual','material_cost_actual','equipment_cost_actual','travel_cost_actual','overhead_actual']])
    for k, v in d.items():
        if hasattr(b, k): setattr(b, k, v)
    b.total_budget = d['approved_budget'] + d.get('contingency', 0)
    b.total_actual = total_actual
    # EVM
    proj = db.query(Project).filter(Project.id == project_id).first()
    progress = (proj.progress_percent or 0) / 100
    b.pv = b.total_budget * progress
    b.ev = b.total_budget * progress
    b.ac = total_actual
    b.cpi = round(b.ev / max(b.ac, 0.01), 2)
    b.spi = round(b.ev / max(b.pv, 0.01), 2)
    db.commit()
    return {"message": "Budget updated", "total_budget": float(b.total_budget), "total_actual": float(b.total_actual), "cpi": b.cpi, "spi": b.spi}

# ── Documents ─────────────────────────────────────────────────────────────────

@router.get("/{project_id}/documents")
async def list_project_docs(project_id: int, db: Session = Depends(get_db),
                             current_user: User = Depends(get_current_user)):
    docs = db.query(ProjectDocument).filter(ProjectDocument.project_id == project_id, ProjectDocument.is_active == True).order_by(ProjectDocument.created_at.desc()).all()
    return [{"id": d.id, "title": d.title, "document_type": d.document_type, "category": d.category,
             "version": d.version, "description": d.description, "status": d.status,
             "uploaded_by": d.uploaded_by, "tags": d.tags or [],
             "created_at": d.created_at.isoformat() if d.created_at else None}
            for d in docs]

@router.post("/{project_id}/documents")
async def add_project_doc(project_id: int, data: DocCreate, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    d = ProjectDocument(project_id=project_id, title=data.title, document_type=data.document_type,
                        category=data.category, version=data.version, description=data.description,
                        status=data.status, tags=data.tags, uploaded_by=current_user.id)
    db.add(d); db.commit(); db.refresh(d)
    _log_activity(project_id, "document_uploaded", f"Document added: {d.title}", db, current_user.id)
    return {"id": d.id, "title": d.title}

@router.delete("/{project_id}/documents/{doc_id}")
async def delete_project_doc(project_id: int, doc_id: int, db: Session = Depends(get_db),
                              current_user: User = Depends(get_current_user)):
    d = db.query(ProjectDocument).filter(ProjectDocument.id == doc_id).first()
    if not d: raise HTTPException(404, "Not found")
    d.is_active = False; db.commit()
    return {"message": "Document removed"}

# ── Activity Log ──────────────────────────────────────────────────────────────

@router.get("/{project_id}/activity")
async def get_activity(project_id: int, limit: int = 50, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    acts = db.query(ProjectActivity).filter(ProjectActivity.project_id == project_id).order_by(ProjectActivity.created_at.desc()).limit(limit).all()
    return [{"id": a.id, "activity_type": a.activity_type, "title": a.title, "description": a.description,
             "old_value": a.old_value, "new_value": a.new_value, "performed_by": a.performed_by,
             "created_at": a.created_at.isoformat()} for a in acts]

@router.post("/{project_id}/activity/comment")
async def add_comment(project_id: int, data: dict, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    _log_activity(project_id, "comment", data.get("comment",""), db, current_user.id)
    return {"message": "Comment added"}

def _log_activity(project_id: int, activity_type: str, description: str, db: Session, user_id: int, title: str = "", old_value: str = None, new_value: str = None):
    a = ProjectActivity(project_id=project_id, activity_type=activity_type,
                        title=title or description[:100], description=description,
                        old_value=old_value, new_value=new_value, performed_by=user_id)
    db.add(a)
    try: db.flush()
    except: pass

# ── Industry Templates & Quick-Start ─────────────────────────────────────────

@router.get("/templates/industries")
async def list_industries(current_user: User = Depends(get_current_user)):
    """Return all supported industry types"""
    from app.core.project_templates import PROJECT_INDUSTRIES
    return [{"id": i[0], "name": i[1], "icon": i[2], "description": i[3]} for i in PROJECT_INDUSTRIES]

@router.get("/templates/phases/{industry}")
async def get_phase_template(industry: str, current_user: User = Depends(get_current_user)):
    """Return phase template for an industry"""
    from app.core.project_templates import get_phase_template, get_wbs_for_phase
    phases = get_phase_template(industry)
    return [{"phase_name": p[0], "phase_code": p[1], "color": p[2], "duration_days": p[3],
             "description": p[4], "suggested_tasks": get_wbs_for_phase(p[1])} for p in phases]

@router.post("/{project_id}/apply-template")
async def apply_industry_template(project_id: int, data: dict, db: Session = Depends(get_db),
                                   current_user: User = Depends(get_current_user)):
    """Apply an industry template to a project — creates phases + WBS tasks + milestones"""
    from app.core.project_templates import get_phase_template, get_wbs_for_phase, get_milestone_template
    from datetime import date, timedelta
    import random

    industry = data.get("industry", "general")
    start_date_str = data.get("start_date")

    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj: raise HTTPException(404, "Project not found")

    # Clear existing phases & WBS
    db.query(WBSItem).filter(WBSItem.project_id == project_id).delete()
    db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).delete()
    db.query(ProjectMilestone).filter(ProjectMilestone.project_id == project_id).delete()
    db.flush()

    start = date.fromisoformat(start_date_str) if start_date_str else (proj.start_date or date.today())
    phases_data = get_phase_template(industry)
    milestones_data = get_milestone_template(industry)
    phase_start = start
    n_phases = n_wbs = n_ms = 0

    for order, (pname, pcode, pcolor, pdur, pdesc) in enumerate(phases_data, 1):
        phase_end = phase_start + timedelta(days=pdur)
        phase = ProjectPhase(
            project_id=project_id, phase_name=pname, phase_code=pcode,
            phase_order=order, color=pcolor, description=pdesc,
            planned_start=phase_start, planned_end=phase_end,
            status="not_started", progress_percent=0
        )
        db.add(phase); db.flush()
        n_phases += 1

        tasks = get_wbs_for_phase(pcode)
        task_start = phase_start
        for idx, tname in enumerate(tasks):
            tdur = max(1, pdur // len(tasks))
            tend = task_start + timedelta(days=tdur)
            db.add(WBSItem(
                project_id=project_id, phase_id=phase.id,
                wbs_code=f"{order}.{idx+1}", task_name=tname,
                task_type="task", planned_start=task_start, planned_end=tend,
                duration_days=tdur, percent_complete=0, status="not_started",
                priority="medium", estimated_hours=tdur * 8, sort_order=idx, level=2,
                predecessors=f"{order}.{idx}" if idx > 0 else None
            ))
            task_start = tend
            n_wbs += 1

        phase_start = phase_end + timedelta(days=1)

    # Add milestones
    ms_date = start
    for ms_name, days_from_start in milestones_data:
        ms_date = start + timedelta(days=days_from_start)
        db.add(ProjectMilestone(
            project_id=project_id, milestone_name=ms_name,
            milestone_type="delivery", planned_date=ms_date, status="pending",
            deliverable=f"{ms_name} deliverable"
        ))
        n_ms += 1

    # Update project type and end date
    proj.project_type = industry
    proj.start_date = start
    proj.end_date = phase_start + timedelta(days=7)
    db.commit()

    _log_activity(project_id, "template_applied", f"Applied {industry} template: {n_phases} phases, {n_wbs} tasks, {n_ms} milestones", db, current_user.id)

    return {"message": f"Template applied successfully", "industry": industry,
            "phases": n_phases, "tasks": n_wbs, "milestones": n_ms}

def _update_phase_progress(phase_id: Optional[int], db: Session):
    if not phase_id: return
    items = db.query(WBSItem).filter(WBSItem.phase_id == phase_id, WBSItem.is_active == True).all()
    if items:
        avg = sum(i.percent_complete for i in items) / len(items)
        phase = db.query(ProjectPhase).filter(ProjectPhase.id == phase_id).first()
        if phase: phase.progress_percent = round(avg, 1)
