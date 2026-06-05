"""
Approval Workflow System
- Multi-level approval for Leave, PO, Expenses, Sales Orders, Documents, etc.
- Manager hierarchy with approval authorities
- Escalation and delegation support
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class ApprovalWorkflow(Base):
    """Define what needs approval and how many levels"""
    __tablename__ = "approval_workflows"
    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(100), nullable=False)
    workflow_type   = Column(String(50), nullable=False, unique=True)
    # leave_request|purchase_order|expense_claim|sales_order|invoice|attendance_regularization|document|policy_review
    description     = Column(Text)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    steps           = relationship("ApprovalStep", back_populates="workflow",
                                   order_by="ApprovalStep.step_order", cascade="all, delete-orphan")


class ApprovalStep(Base):
    """Each approval level in a workflow"""
    __tablename__ = "approval_steps"
    id              = Column(Integer, primary_key=True, index=True)
    workflow_id     = Column(Integer, ForeignKey("approval_workflows.id"), nullable=False)
    step_order      = Column(Integer, nullable=False)       # 1, 2, 3...
    step_name       = Column(String(100), nullable=False)   # "Direct Manager", "HR Manager", "Finance Director"
    approver_type   = Column(String(50), nullable=False)
    # direct_manager | department_head | role | specific_user | hr_manager | finance_manager | ceo
    approver_role   = Column(String(100))                   # Role name if approver_type='role'
    approver_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # For specific_user
    is_mandatory    = Column(Boolean, default=True)
    auto_approve_days = Column(Integer, default=0)          # Auto-approve after N days of no action
    can_skip        = Column(Boolean, default=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    workflow        = relationship("ApprovalWorkflow", back_populates="steps")


class ApprovalAuthority(Base):
    """Who can approve what — authority matrix"""
    __tablename__ = "approval_authorities"
    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False)
    workflow_type   = Column(String(50), nullable=False)
    # Scope of authority
    scope           = Column(String(20), default="department")  # self|department|division|all
    department_id   = Column(Integer, nullable=True)
    max_amount      = Column(Integer, default=0)               # 0 = unlimited
    can_approve     = Column(Boolean, default=True)
    can_reject      = Column(Boolean, default=True)
    can_delegate    = Column(Boolean, default=False)
    is_active       = Column(Boolean, default=True)
    granted_by      = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


class ApprovalRequest(Base):
    """Instance of an approval — created when something needs approval"""
    __tablename__ = "approval_requests"
    id              = Column(Integer, primary_key=True, index=True)
    request_number  = Column(String(50), unique=True)
    workflow_type   = Column(String(50), nullable=False)
    reference_id    = Column(Integer, nullable=False)      # ID of the object being approved
    reference_number = Column(String(100))                  # Human-readable reference
    title           = Column(String(300), nullable=False)
    description     = Column(Text)
    requested_by    = Column(Integer, ForeignKey("users.id"), nullable=False)
    employee_id     = Column(Integer, nullable=True)        # Employee the request is about
    department_id   = Column(Integer, nullable=True)
    amount          = Column(Integer, default=0)            # For financial approvals
    status          = Column(String(30), default="pending")
    # pending|in_progress|approved|rejected|cancelled|escalated
    current_step    = Column(Integer, default=1)
    total_steps     = Column(Integer, default=1)
    priority        = Column(String(20), default="normal")  # low|normal|high|urgent
    due_date        = Column(DateTime(timezone=True), nullable=True)
    meta_data       = Column(JSON, default={})              # Extra data about the request
    completed_at    = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    actions         = relationship("ApprovalAction", back_populates="request",
                                   order_by="ApprovalAction.created_at", cascade="all, delete-orphan")


class ApprovalAction(Base):
    """Each approve/reject/comment action taken"""
    __tablename__ = "approval_actions"
    id              = Column(Integer, primary_key=True, index=True)
    request_id      = Column(Integer, ForeignKey("approval_requests.id"), nullable=False)
    step_number     = Column(Integer, nullable=False)
    step_name       = Column(String(100))
    actioned_by     = Column(Integer, ForeignKey("users.id"), nullable=False)
    action          = Column(String(30), nullable=False)    # approved|rejected|returned|delegated|commented
    comment         = Column(Text)
    delegated_to    = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    request         = relationship("ApprovalRequest", back_populates="actions")


class ManagerHierarchy(Base):
    """Manager reporting chain"""
    __tablename__ = "manager_hierarchy"
    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False, unique=True)
    reporting_manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    dotted_manager_id    = Column(Integer, ForeignKey("employees.id"), nullable=True)
    is_department_head   = Column(Boolean, default=False)
    is_hr_manager        = Column(Boolean, default=False)
    is_finance_approver  = Column(Boolean, default=False)
    approval_limit       = Column(Integer, default=0)       # Max amount they can approve
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DocumentCategory(Base):
    """Document categories with approval requirements"""
    __tablename__ = "document_categories"
    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(100), nullable=False)
    code            = Column(String(20), unique=True)
    description     = Column(Text)
    parent_id       = Column(Integer, ForeignKey("document_categories.id"), nullable=True)
    department      = Column(String(100))
    requires_approval = Column(Boolean, default=False)
    retention_years = Column(Integer, default=5)
    is_confidential = Column(Boolean, default=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
