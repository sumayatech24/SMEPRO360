"""
Approval Workflow API
- Approval workflows, steps, authorities
- Approval requests & actions
- Manager hierarchy
- Document categories
- Inbox: pending approvals for current user
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from app.db.base import get_db
from app.models.approval import (
    ApprovalWorkflow, ApprovalStep, ApprovalAuthority,
    ApprovalRequest, ApprovalAction, ManagerHierarchy, DocumentCategory
)
from app.models.hr import Employee
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class WorkflowCreate(BaseModel):
    name: str
    workflow_type: str
    description: Optional[str] = None

class StepCreate(BaseModel):
    workflow_id: int
    step_order: int
    step_name: str
    approver_type: str
    approver_role: Optional[str] = None
    approver_user_id: Optional[int] = None
    is_mandatory: bool = True
    auto_approve_days: int = 0
    can_skip: bool = False

class AuthorityCreate(BaseModel):
    user_id: int
    workflow_type: str
    scope: str = "department"
    department_id: Optional[int] = None
    max_amount: int = 0
    can_approve: bool = True
    can_reject: bool = True
    can_delegate: bool = False

class RequestCreate(BaseModel):
    workflow_type: str
    reference_id: int
    reference_number: Optional[str] = None
    title: str
    description: Optional[str] = None
    employee_id: Optional[int] = None
    department_id: Optional[int] = None
    amount: int = 0
    priority: str = "normal"
    meta_data: dict = {}

class ActionCreate(BaseModel):
    action: str  # approved|rejected|returned|delegated|commented
    comment: Optional[str] = None
    delegated_to: Optional[int] = None

class HierarchyCreate(BaseModel):
    employee_id: int
    reporting_manager_id: Optional[int] = None
    dotted_manager_id: Optional[int] = None
    is_department_head: bool = False
    is_hr_manager: bool = False
    is_finance_approver: bool = False
    approval_limit: int = 0

class DocCategoryCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    department: Optional[str] = None
    requires_approval: bool = False
    retention_years: int = 5
    is_confidential: bool = False

# ── Helpers ───────────────────────────────────────────────────────────────────

def req_dict(r: ApprovalRequest, include_actions: bool = False):
    d = {
        "id": r.id, "request_number": r.request_number,
        "workflow_type": r.workflow_type, "reference_id": r.reference_id,
        "reference_number": r.reference_number, "title": r.title,
        "description": r.description, "requested_by": r.requested_by,
        "employee_id": r.employee_id, "department_id": r.department_id,
        "amount": r.amount, "status": r.status,
        "current_step": r.current_step, "total_steps": r.total_steps,
        "priority": r.priority, "meta_data": r.meta_data or {},
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
    }
    if include_actions:
        d["actions"] = [
            {"id": a.id, "step_number": a.step_number, "step_name": a.step_name,
             "actioned_by": a.actioned_by, "action": a.action, "comment": a.comment,
             "created_at": a.created_at.isoformat() if a.created_at else None}
            for a in r.actions
        ]
    return d

def get_approver_for_step(step: ApprovalStep, employee_id: int, db: Session) -> Optional[int]:
    """Determine who should approve for this step"""
    if step.approver_type == "specific_user" and step.approver_user_id:
        return step.approver_user_id
    if step.approver_type in ["direct_manager", "department_head"]:
        hierarchy = db.query(ManagerHierarchy).filter(
            ManagerHierarchy.employee_id == employee_id
        ).first()
        if hierarchy:
            if step.approver_type == "direct_manager" and hierarchy.reporting_manager_id:
                return hierarchy.reporting_manager_id
            if step.approver_type == "department_head" and hierarchy.is_department_head:
                return hierarchy.employee_id
    return None

# ── Approval Workflows ────────────────────────────────────────────────────────

@router.get("/workflows")
async def list_workflows(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wfs = db.query(ApprovalWorkflow).filter(ApprovalWorkflow.is_active == True).all()
    return [{"id": w.id, "name": w.name, "workflow_type": w.workflow_type,
             "description": w.description, "step_count": len(w.steps)} for w in wfs]

@router.get("/workflows/{wf_id}")
async def get_workflow(wf_id: int, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    wf = db.query(ApprovalWorkflow).filter(ApprovalWorkflow.id == wf_id).first()
    if not wf: raise HTTPException(404, "Not found")
    return {
        "id": wf.id, "name": wf.name, "workflow_type": wf.workflow_type,
        "description": wf.description,
        "steps": [{"id": s.id, "step_order": s.step_order, "step_name": s.step_name,
                   "approver_type": s.approver_type, "approver_role": s.approver_role,
                   "approver_user_id": s.approver_user_id, "is_mandatory": s.is_mandatory,
                   "auto_approve_days": s.auto_approve_days, "can_skip": s.can_skip}
                  for s in wf.steps]
    }

@router.post("/workflows")
async def create_workflow(data: WorkflowCreate, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    wf = ApprovalWorkflow(name=data.name, workflow_type=data.workflow_type, description=data.description)
    db.add(wf); db.commit(); db.refresh(wf)
    return {"id": wf.id, "name": wf.name}

@router.post("/workflows/{wf_id}/steps")
async def add_step(wf_id: int, data: StepCreate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    step = ApprovalStep(workflow_id=wf_id, **data.dict())
    db.add(step); db.commit(); db.refresh(step)
    return {"id": step.id, "step_name": step.step_name}

@router.put("/workflows/{wf_id}/steps/{step_id}")
async def update_step(wf_id: int, step_id: int, data: dict, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    step = db.query(ApprovalStep).filter(ApprovalStep.id == step_id, ApprovalStep.workflow_id == wf_id).first()
    if not step: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(step, k): setattr(step, k, v)
    db.commit(); return {"id": step.id, "step_name": step.step_name}

@router.delete("/workflows/{wf_id}/steps/{step_id}")
async def delete_step(wf_id: int, step_id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    step = db.query(ApprovalStep).filter(ApprovalStep.id == step_id).first()
    if not step: raise HTTPException(404, "Not found")
    db.delete(step); db.commit()
    return {"message": "Step deleted"}

# ── Approval Authorities ──────────────────────────────────────────────────────

@router.get("/authorities")
async def list_authorities(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    auths = db.query(ApprovalAuthority).filter(ApprovalAuthority.is_active == True).all()
    users = {u.id: u for u in db.query(User).all()}
    return [{"id": a.id, "user_id": a.user_id, "workflow_type": a.workflow_type,
             "scope": a.scope, "department_id": a.department_id, "max_amount": a.max_amount,
             "can_approve": a.can_approve, "can_reject": a.can_reject, "can_delegate": a.can_delegate,
             "user_name": users.get(a.user_id, type('o',(),{'full_name':'?'})).full_name}
            for a in auths]

@router.post("/authorities")
async def grant_authority(data: AuthorityCreate, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    auth = ApprovalAuthority(**data.dict(), granted_by=current_user.id)
    db.add(auth); db.commit(); db.refresh(auth)
    return {"id": auth.id, "message": "Authority granted"}

@router.put("/authorities/{auth_id}")
async def update_authority(auth_id: int, data: dict, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    auth = db.query(ApprovalAuthority).filter(ApprovalAuthority.id == auth_id).first()
    if not auth: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(auth, k): setattr(auth, k, v)
    db.commit(); return {"id": auth.id}

@router.delete("/authorities/{auth_id}")
async def revoke_authority(auth_id: int, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    auth = db.query(ApprovalAuthority).filter(ApprovalAuthority.id == auth_id).first()
    if not auth: raise HTTPException(404, "Not found")
    auth.is_active = False; db.commit()
    return {"message": "Authority revoked"}

# ── Manager Hierarchy ─────────────────────────────────────────────────────────

@router.get("/hierarchy")
async def list_hierarchy(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(ManagerHierarchy).all()
    employees = {e.id: e for e in db.query(Employee).all()}
    def emp_name(eid):
        e = employees.get(eid)
        return f"{e.first_name} {e.last_name or ''}" if e else f"EMP-{eid}"
    return [{"id": h.id, "employee_id": h.employee_id, "employee_name": emp_name(h.employee_id),
             "reporting_manager_id": h.reporting_manager_id,
             "reporting_manager_name": emp_name(h.reporting_manager_id) if h.reporting_manager_id else None,
             "dotted_manager_id": h.dotted_manager_id,
             "is_department_head": h.is_department_head, "is_hr_manager": h.is_hr_manager,
             "is_finance_approver": h.is_finance_approver, "approval_limit": h.approval_limit}
            for h in items]

@router.post("/hierarchy")
async def set_hierarchy(data: HierarchyCreate, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    h = db.query(ManagerHierarchy).filter(ManagerHierarchy.employee_id == data.employee_id).first()
    if h:
        for k, v in data.dict().items():
            if hasattr(h, k): setattr(h, k, v)
    else:
        h = ManagerHierarchy(**data.dict())
        db.add(h)
    db.commit(); db.refresh(h)
    return {"id": h.id, "employee_id": h.employee_id, "message": "Hierarchy updated"}

@router.get("/hierarchy/my-team")
async def get_my_team(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all employees reporting to the current user's linked employee"""
    from app.models.hr import Employee as Emp
    # Find current user's employee record
    user_emp = db.query(Emp).filter(Emp.email == current_user.email).first()
    if not user_emp:
        return {"team": [], "message": "No employee record linked"}

    # Find direct reports
    reports = db.query(ManagerHierarchy).filter(
        ManagerHierarchy.reporting_manager_id == user_emp.id
    ).all()

    emp_ids = [r.employee_id for r in reports]
    team = db.query(Emp).filter(Emp.id.in_(emp_ids)).all()

    return {"team": [{"id": e.id, "first_name": e.first_name, "last_name": e.last_name,
                      "employee_number": e.employee_number, "department_id": e.department_id}
                     for e in team]}

# ── Approval Requests ─────────────────────────────────────────────────────────

@router.get("/requests")
async def list_requests(workflow_type: Optional[str] = None, status: Optional[str] = None,
                         requested_by: Optional[int] = None, skip: int = 0, limit: int = 50,
                         db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(ApprovalRequest)
    if workflow_type: q = q.filter(ApprovalRequest.workflow_type == workflow_type)
    if status: q = q.filter(ApprovalRequest.status == status)
    if requested_by: q = q.filter(ApprovalRequest.requested_by == requested_by)
    total = q.count()
    items = q.order_by(ApprovalRequest.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "items": [req_dict(r) for r in items]}

@router.get("/requests/inbox")
async def my_inbox(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Pending approval requests for the current user"""
    # Find authorities for this user
    authorities = db.query(ApprovalAuthority).filter(
        ApprovalAuthority.user_id == current_user.id,
        ApprovalAuthority.is_active == True,
        ApprovalAuthority.can_approve == True
    ).all()

    workflow_types = [a.workflow_type for a in authorities]

    q = db.query(ApprovalRequest).filter(
        ApprovalRequest.status.in_(["pending", "in_progress"])
    )
    if not current_user.is_superuser and workflow_types:
        q = q.filter(ApprovalRequest.workflow_type.in_(workflow_types))
    elif not current_user.is_superuser:
        # Can only see requests directed to them (or from their team)
        q = q.filter(ApprovalRequest.requested_by == current_user.id)

    items = q.order_by(ApprovalRequest.created_at.desc()).limit(100).all()

    by_type: dict = {}
    for r in items:
        t = r.workflow_type
        if t not in by_type: by_type[t] = []
        by_type[t].append(req_dict(r))

    return {
        "total_pending": len(items),
        "by_type": by_type,
        "items": [req_dict(r) for r in items],
    }

@router.get("/requests/my-requests")
async def my_requests(status: Optional[str] = None, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    """Requests submitted by the current user"""
    q = db.query(ApprovalRequest).filter(ApprovalRequest.requested_by == current_user.id)
    if status: q = q.filter(ApprovalRequest.status == status)
    items = q.order_by(ApprovalRequest.created_at.desc()).limit(50).all()
    return {"total": len(items), "items": [req_dict(r, include_actions=True) for r in items]}

@router.get("/requests/{req_id}")
async def get_request(req_id: int, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    r = db.query(ApprovalRequest).filter(ApprovalRequest.id == req_id).first()
    if not r: raise HTTPException(404, "Not found")
    return req_dict(r, include_actions=True)

@router.post("/requests")
async def create_request(data: RequestCreate, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    """Submit something for approval"""
    # Get workflow to determine total steps
    wf = db.query(ApprovalWorkflow).filter(
        ApprovalWorkflow.workflow_type == data.workflow_type,
        ApprovalWorkflow.is_active == True
    ).first()
    total_steps = len(wf.steps) if wf else 1

    count = db.query(func.count(ApprovalRequest.id)).scalar()
    req = ApprovalRequest(
        request_number=f"APR-{(count or 0)+1:06d}",
        workflow_type=data.workflow_type,
        reference_id=data.reference_id,
        reference_number=data.reference_number,
        title=data.title, description=data.description,
        requested_by=current_user.id,
        employee_id=data.employee_id, department_id=data.department_id,
        amount=data.amount, priority=data.priority,
        meta_data=data.meta_data,
        status="pending", current_step=1, total_steps=total_steps,
    )
    db.add(req); db.commit(); db.refresh(req)
    return req_dict(req)

@router.post("/requests/{req_id}/action")
async def take_action(req_id: int, data: ActionCreate, db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    """Approve, reject, return, or comment on a request"""
    req = db.query(ApprovalRequest).filter(ApprovalRequest.id == req_id).first()
    if not req: raise HTTPException(404, "Not found")
    if req.status not in ["pending", "in_progress"]:
        raise HTTPException(400, f"Request is already {req.status}")

    # Get workflow step name
    wf = db.query(ApprovalWorkflow).filter(
        ApprovalWorkflow.workflow_type == req.workflow_type
    ).first()
    step_name = "Approval"
    if wf:
        step = next((s for s in wf.steps if s.step_order == req.current_step), None)
        step_name = step.step_name if step else f"Step {req.current_step}"

    # Record action
    action = ApprovalAction(
        request_id=req.id, step_number=req.current_step, step_name=step_name,
        actioned_by=current_user.id, action=data.action, comment=data.comment,
        delegated_to=data.delegated_to
    )
    db.add(action)

    # Update request status
    if data.action == "approved":
        if req.current_step >= req.total_steps:
            req.status = "approved"
            req.completed_at = datetime.now()
            # Apply approval to the referenced object
            _apply_approval(req, db)
        else:
            req.current_step += 1
            req.status = "in_progress"
    elif data.action == "rejected":
        req.status = "rejected"
        req.completed_at = datetime.now()
        # Apply rejection to the referenced object
        _apply_rejection(req, db)
    elif data.action == "returned":
        req.status = "pending"
        req.current_step = max(1, req.current_step - 1)
    elif data.action == "cancelled":
        req.status = "cancelled"
        req.completed_at = datetime.now()

    db.commit()
    return {"message": f"Action '{data.action}' recorded", "new_status": req.status, "request_number": req.request_number}

def _apply_approval(req: ApprovalRequest, db: Session):
    """Apply approval to the referenced object"""
    from app.models.hr import Leave
    from app.models.procurement import PurchaseOrder
    from app.models.finance import Expense

    try:
        if req.workflow_type == "leave_request":
            leave = db.query(Leave).filter(Leave.id == req.reference_id).first()
            if leave: leave.status = "approved"
        elif req.workflow_type == "purchase_order":
            po = db.query(PurchaseOrder).filter(PurchaseOrder.id == req.reference_id).first()
            if po: po.status = "approved"
        elif req.workflow_type == "expense_claim":
            exp = db.query(Expense).filter(Expense.id == req.reference_id).first()
            if exp: exp.status = "approved"
        elif req.workflow_type == "attendance_regularization":
            from app.models.attendance import AttendanceRegularization
            reg = db.query(AttendanceRegularization).filter(AttendanceRegularization.id == req.reference_id).first()
            if reg: reg.status = "approved"
    except Exception as e:
        pass  # Don't fail the approval if reference update fails

def _apply_rejection(req: ApprovalRequest, db: Session):
    """Apply rejection to the referenced object"""
    from app.models.hr import Leave
    try:
        if req.workflow_type == "leave_request":
            leave = db.query(Leave).filter(Leave.id == req.reference_id).first()
            if leave: leave.status = "rejected"
    except:
        pass

# ── Document Categories ───────────────────────────────────────────────────────

@router.get("/document-categories")
async def list_doc_categories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cats = db.query(DocumentCategory).filter(DocumentCategory.is_active == True).order_by(DocumentCategory.name).all()
    return [{"id": c.id, "name": c.name, "code": c.code, "description": c.description,
             "parent_id": c.parent_id, "department": c.department,
             "requires_approval": c.requires_approval, "retention_years": c.retention_years,
             "is_confidential": c.is_confidential} for c in cats]

@router.post("/document-categories")
async def create_doc_category(data: DocCategoryCreate, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    if db.query(DocumentCategory).filter(DocumentCategory.code == data.code).first():
        raise HTTPException(400, f"Category code '{data.code}' already exists")
    c = DocumentCategory(**data.dict())
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "name": c.name, "code": c.code}

@router.put("/document-categories/{cat_id}")
async def update_doc_category(cat_id: int, data: dict, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    c = db.query(DocumentCategory).filter(DocumentCategory.id == cat_id).first()
    if not c: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(c, k): setattr(c, k, v)
    db.commit(); return {"id": c.id, "name": c.name}

@router.delete("/document-categories/{cat_id}")
async def delete_doc_category(cat_id: int, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    c = db.query(DocumentCategory).filter(DocumentCategory.id == cat_id).first()
    if not c: raise HTTPException(404, "Not found")
    c.is_active = False; db.commit()
    return {"message": "Category deleted"}

# ── Dashboard stats ───────────────────────────────────────────────────────────

@router.get("/stats")
async def approval_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(func.count(ApprovalRequest.id)).scalar()
    pending = db.query(func.count(ApprovalRequest.id)).filter(ApprovalRequest.status.in_(["pending","in_progress"])).scalar()
    approved = db.query(func.count(ApprovalRequest.id)).filter(ApprovalRequest.status == "approved").scalar()
    rejected = db.query(func.count(ApprovalRequest.id)).filter(ApprovalRequest.status == "rejected").scalar()

    by_type = db.query(ApprovalRequest.workflow_type, func.count(ApprovalRequest.id))\
        .filter(ApprovalRequest.status.in_(["pending","in_progress"]))\
        .group_by(ApprovalRequest.workflow_type).all()

    return {"total": total, "pending": pending, "approved": approved, "rejected": rejected,
            "pending_by_type": {t: c for t, c in by_type}}
