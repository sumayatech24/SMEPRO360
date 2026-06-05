"""
Complete Project Management Models
- Project Phases (Initiation → Planning → Execution → Monitoring → Closure)
- Work Breakdown Structure (WBS) with dependencies - MS Project style
- Milestones with target/actual tracking
- Risk Register
- Issue Tracker
- Budget & Estimation
- Project Documents
- Activity / Audit Log
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Numeric, Date, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class ProjectPhase(Base):
    """Project phases — Initiation, Planning, Execution, Monitoring, Closure"""
    __tablename__ = "project_phases"
    id              = Column(Integer, primary_key=True, index=True)
    project_id      = Column(Integer, ForeignKey("projects.id"), nullable=False)
    phase_name      = Column(String(100), nullable=False)
    phase_code      = Column(String(20))
    phase_order     = Column(Integer, default=1)
    description     = Column(Text)
    start_date      = Column(Date)
    end_date        = Column(Date)
    planned_start   = Column(Date)
    planned_end     = Column(Date)
    status          = Column(String(30), default="not_started")
    # not_started|in_progress|completed|on_hold|cancelled
    progress_percent = Column(Float, default=0)
    color           = Column(String(20), default="#6366f1")
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    wbs_items       = relationship("WBSItem", back_populates="phase", cascade="all, delete-orphan")
    milestones      = relationship("ProjectMilestone", back_populates="phase")


class WBSItem(Base):
    """Work Breakdown Structure — hierarchical task tree (MS Project style)"""
    __tablename__ = "wbs_items"
    id              = Column(Integer, primary_key=True, index=True)
    project_id      = Column(Integer, ForeignKey("projects.id"), nullable=False)
    phase_id        = Column(Integer, ForeignKey("project_phases.id"), nullable=True)
    parent_id       = Column(Integer, ForeignKey("wbs_items.id"), nullable=True)
    # WBS numbering: 1, 1.1, 1.1.1, etc.
    wbs_code        = Column(String(30))
    task_name       = Column(String(300), nullable=False)
    description     = Column(Text)
    task_type       = Column(String(30), default="task")  # task|summary|milestone|deliverable
    # Scheduling
    planned_start   = Column(Date)
    planned_end     = Column(Date)
    actual_start    = Column(Date)
    actual_end      = Column(Date)
    duration_days   = Column(Float, default=1)
    # Assignment
    assigned_to     = Column(Integer, ForeignKey("employees.id"), nullable=True)
    assigned_team   = Column(JSON, default=[])   # list of employee IDs
    # Progress
    percent_complete = Column(Float, default=0)
    status          = Column(String(30), default="not_started")
    priority        = Column(String(20), default="medium")
    # Budget
    estimated_hours = Column(Float, default=0)
    actual_hours    = Column(Float, default=0)
    estimated_cost  = Column(Numeric(15,2), default=0)
    actual_cost     = Column(Numeric(15,2), default=0)
    # Dependencies (predecessors) stored as comma-separated WBS IDs
    predecessors    = Column(String(200))
    dependency_type = Column(String(10), default="FS")  # FS|SS|FF|SF
    lag_days        = Column(Float, default=0)
    # Display
    sort_order      = Column(Integer, default=0)
    level           = Column(Integer, default=1)
    is_critical     = Column(Boolean, default=False)
    is_collapsed    = Column(Boolean, default=False)
    notes           = Column(Text)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    phase           = relationship("ProjectPhase", back_populates="wbs_items")
    children        = relationship("WBSItem", foreign_keys=[parent_id])


class ProjectMilestone(Base):
    """Key milestones with target vs actual tracking"""
    __tablename__ = "project_milestones"
    id              = Column(Integer, primary_key=True, index=True)
    project_id      = Column(Integer, ForeignKey("projects.id"), nullable=False)
    phase_id        = Column(Integer, ForeignKey("project_phases.id"), nullable=True)
    milestone_name  = Column(String(200), nullable=False)
    description     = Column(Text)
    milestone_type  = Column(String(30), default="delivery")
    # delivery|review|approval|payment|go_live|kickoff
    planned_date    = Column(Date, nullable=False)
    actual_date     = Column(Date)
    status          = Column(String(30), default="pending")
    # pending|achieved|missed|at_risk
    owner_id        = Column(Integer, ForeignKey("employees.id"), nullable=True)
    deliverable     = Column(String(300))
    acceptance_criteria = Column(Text)
    notes           = Column(Text)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    phase           = relationship("ProjectPhase", back_populates="milestones")


class ProjectRisk(Base):
    """Risk Register"""
    __tablename__ = "project_risks"
    id              = Column(Integer, primary_key=True, index=True)
    project_id      = Column(Integer, ForeignKey("projects.id"), nullable=False)
    risk_id_code    = Column(String(20))   # e.g. R001
    title           = Column(String(300), nullable=False)
    description     = Column(Text)
    category        = Column(String(50))   # technical|resource|schedule|cost|quality|external
    probability     = Column(String(20), default="medium")  # low|medium|high|critical
    impact          = Column(String(20), default="medium")
    risk_score      = Column(Integer, default=0)   # probability * impact (1-25)
    risk_level      = Column(String(20), default="medium")  # low|medium|high|critical
    status          = Column(String(30), default="open")    # open|mitigated|accepted|closed|occurred
    mitigation_plan = Column(Text)
    contingency_plan = Column(Text)
    owner_id        = Column(Integer, ForeignKey("employees.id"), nullable=True)
    identified_date = Column(Date)
    review_date     = Column(Date)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


class ProjectIssue(Base):
    """Issue / Change Request Tracker"""
    __tablename__ = "project_issues"
    id              = Column(Integer, primary_key=True, index=True)
    project_id      = Column(Integer, ForeignKey("projects.id"), nullable=False)
    issue_number    = Column(String(20), unique=True)
    title           = Column(String(300), nullable=False)
    description     = Column(Text)
    issue_type      = Column(String(30), default="issue")  # issue|change_request|bug|enhancement
    priority        = Column(String(20), default="medium")
    severity        = Column(String(20), default="medium")
    status          = Column(String(30), default="open")   # open|in_progress|resolved|closed|rejected
    raised_by       = Column(Integer, ForeignKey("employees.id"), nullable=True)
    assigned_to     = Column(Integer, ForeignKey("employees.id"), nullable=True)
    raised_date     = Column(Date)
    target_date     = Column(Date)
    resolved_date   = Column(Date)
    resolution      = Column(Text)
    impact_on_schedule = Column(String(20), default="none")   # none|low|medium|high
    impact_on_budget   = Column(String(20), default="none")
    notes           = Column(Text)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


class ProjectBudget(Base):
    """Budget and cost tracking per project"""
    __tablename__ = "project_budgets"
    id              = Column(Integer, primary_key=True, index=True)
    project_id      = Column(Integer, ForeignKey("projects.id"), nullable=False, unique=True)
    # Approved budget
    approved_budget = Column(Numeric(15,2), default=0)
    contingency     = Column(Numeric(15,2), default=0)
    total_budget    = Column(Numeric(15,2), default=0)
    # Cost breakdown
    labour_cost_planned   = Column(Numeric(15,2), default=0)
    material_cost_planned = Column(Numeric(15,2), default=0)
    equipment_cost_planned = Column(Numeric(15,2), default=0)
    travel_cost_planned   = Column(Numeric(15,2), default=0)
    overhead_planned      = Column(Numeric(15,2), default=0)
    # Actuals
    labour_cost_actual    = Column(Numeric(15,2), default=0)
    material_cost_actual  = Column(Numeric(15,2), default=0)
    equipment_cost_actual = Column(Numeric(15,2), default=0)
    travel_cost_actual    = Column(Numeric(15,2), default=0)
    overhead_actual       = Column(Numeric(15,2), default=0)
    total_actual          = Column(Numeric(15,2), default=0)
    # EVM
    pv  = Column(Numeric(15,2), default=0)  # Planned Value
    ev  = Column(Numeric(15,2), default=0)  # Earned Value
    ac  = Column(Numeric(15,2), default=0)  # Actual Cost
    spi = Column(Float, default=1.0)         # Schedule Performance Index
    cpi = Column(Float, default=1.0)         # Cost Performance Index
    currency        = Column(String(10), default="INR")
    notes           = Column(Text)
    last_updated    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ProjectDocument(Base):
    """Project-specific documents"""
    __tablename__ = "project_documents"
    id              = Column(Integer, primary_key=True, index=True)
    project_id      = Column(Integer, ForeignKey("projects.id"), nullable=False)
    phase_id        = Column(Integer, nullable=True)
    title           = Column(String(300), nullable=False)
    document_type   = Column(String(50))   # plan|report|specification|meeting_minutes|approval|contract
    category        = Column(String(100))
    version         = Column(String(20), default="1.0")
    file_path       = Column(String(500))
    file_size       = Column(Integer)
    description     = Column(Text)
    status          = Column(String(30), default="draft")  # draft|review|approved|obsolete
    uploaded_by     = Column(Integer, ForeignKey("users.id"), nullable=True)
    tags            = Column(JSON, default=[])
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ProjectActivity(Base):
    """Audit trail / activity log for a project"""
    __tablename__ = "project_activities"
    id              = Column(Integer, primary_key=True, index=True)
    project_id      = Column(Integer, ForeignKey("projects.id"), nullable=False)
    activity_type   = Column(String(50))   # status_change|comment|file_upload|task_update|milestone_achieved
    title           = Column(String(300))
    description     = Column(Text)
    old_value       = Column(String(300))
    new_value       = Column(String(300))
    performed_by    = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
