"""
Extended HR Models — Complete Employee Lifecycle
- Onboarding workflow
- Training & certifications
- Employee benefits
- Employee documents
- Performance reviews
- Exit management
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric, Date, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


# ── Onboarding ────────────────────────────────────────────────────────────────

class OnboardingTemplate(Base):
    """Checklist template for new hire onboarding"""
    __tablename__ = "onboarding_templates"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), nullable=False)
    department  = Column(String(100))
    description = Column(Text)
    tasks       = Column(JSON, default=[])
    # [{"task":"Submit documents","category":"HR","due_days":1,"assignee_type":"employee"},...]
    is_default  = Column(Boolean, default=False)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class OnboardingRecord(Base):
    """Per-employee onboarding tracker"""
    __tablename__ = "onboarding_records"
    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False, unique=True)
    template_id     = Column(Integer, ForeignKey("onboarding_templates.id"), nullable=True)
    start_date      = Column(Date)
    target_completion = Column(Date)
    status          = Column(String(30), default="in_progress")
    # in_progress|completed|overdue
    progress_percent = Column(Float, default=0)
    # Task statuses stored as JSON: {"task_id": "completed"|"pending"|"skipped"}
    task_statuses   = Column(JSON, default={})
    completed_at    = Column(DateTime(timezone=True), nullable=True)
    notes           = Column(Text)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ── Training ──────────────────────────────────────────────────────────────────

class TrainingCourse(Base):
    """Training course catalog"""
    __tablename__ = "training_courses"
    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(200), nullable=False)
    code        = Column(String(30), unique=True)
    category    = Column(String(50))
    # technical|soft_skills|compliance|safety|leadership|product|onboarding
    description = Column(Text)
    duration_hours = Column(Float, default=1)
    delivery_mode  = Column(String(20), default="online")  # online|classroom|on_job|blended
    provider       = Column(String(200))
    cost_per_person = Column(Numeric(10,2), default=0)
    is_mandatory    = Column(Boolean, default=False)
    certification   = Column(String(200))  # Certificate awarded on completion
    validity_months = Column(Integer, default=0)  # 0=no expiry
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


class TrainingEnrollment(Base):
    """Employee enrollment in a training course"""
    __tablename__ = "training_enrollments"
    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    course_id       = Column(Integer, ForeignKey("training_courses.id"), nullable=False)
    enrolled_date   = Column(Date)
    scheduled_date  = Column(Date)
    completion_date = Column(Date)
    status          = Column(String(20), default="enrolled")
    # enrolled|in_progress|completed|failed|cancelled
    score           = Column(Float)              # Test score %
    grade           = Column(String(10))         # A/B/C/Pass/Fail
    certificate_url = Column(String(500))
    expiry_date     = Column(Date)
    feedback        = Column(Text)
    trainer_name    = Column(String(200))
    notes           = Column(Text)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


# ── Employee Benefits ─────────────────────────────────────────────────────────

class BenefitPlan(Base):
    """Benefit plans (insurance, allowances, etc.)"""
    __tablename__ = "benefit_plans"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), nullable=False)
    benefit_type = Column(String(50))
    # health_insurance|life_insurance|dental|vision|pf|gratuity|meal|transport|phone|fuel|gym
    description = Column(Text)
    coverage_amount = Column(Numeric(12,2), default=0)
    employer_contribution = Column(Numeric(10,2), default=0)
    employee_contribution = Column(Numeric(10,2), default=0)
    provider    = Column(String(200))
    is_taxable  = Column(Boolean, default=False)
    eligibility = Column(String(50), default="all")  # all|manager|senior|contract
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class EmployeeBenefit(Base):
    """Benefits enrolled per employee"""
    __tablename__ = "employee_benefits"
    id          = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    plan_id     = Column(Integer, ForeignKey("benefit_plans.id"), nullable=False)
    enrollment_date = Column(Date)
    end_date    = Column(Date)
    policy_number = Column(String(100))
    nominee_name  = Column(String(200))
    nominee_relation = Column(String(50))
    notes       = Column(Text)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


# ── Employee Documents ────────────────────────────────────────────────────────

class EmployeeDocument(Base):
    """Employee document store"""
    __tablename__ = "employee_documents"
    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    document_type   = Column(String(50), nullable=False)
    # offer_letter|appointment_letter|id_proof|address_proof|pan|aadhaar|passport|
    # visa|education|experience|nda|contract|increment_letter|exit_letter|other
    document_name   = Column(String(200))
    document_number = Column(String(100))
    issue_date      = Column(Date)
    expiry_date     = Column(Date)
    file_url        = Column(String(500))
    file_size       = Column(Integer)
    is_verified     = Column(Boolean, default=False)
    verified_by     = Column(Integer, nullable=True)
    notes           = Column(Text)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


# ── Performance ───────────────────────────────────────────────────────────────

class PerformanceReview(Base):
    """Periodic performance reviews"""
    __tablename__ = "performance_reviews"
    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    reviewer_id     = Column(Integer, ForeignKey("employees.id"), nullable=True)
    review_period   = Column(String(30))   # "Q1 2026", "FY 2025-26"
    review_type     = Column(String(20), default="annual")  # annual|quarterly|probation|mid_year
    review_date     = Column(Date)
    # Ratings (1-5)
    overall_rating  = Column(Float)
    goal_achievement = Column(Float)
    skill_rating    = Column(Float)
    behavior_rating = Column(Float)
    # Comments
    strengths       = Column(Text)
    areas_for_improvement = Column(Text)
    goals_next_period = Column(Text)
    employee_comments = Column(Text)
    rating_label    = Column(String(20))   # Exceptional|Exceeds|Meets|Needs Improvement|Unacceptable
    # Outcome
    outcome         = Column(String(30))   # confirmed|promoted|pip|no_change|terminated
    increment_percent = Column(Float)
    status          = Column(String(20), default="draft")  # draft|submitted|acknowledged|closed
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


# ── Exit Management ───────────────────────────────────────────────────────────

class ExitRecord(Base):
    """Employee exit / offboarding"""
    __tablename__ = "exit_records"
    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False, unique=True)
    resignation_date = Column(Date)
    notice_period_days = Column(Integer, default=30)
    last_working_date = Column(Date)
    exit_reason     = Column(String(50))
    # resignation|termination|retirement|layoff|end_of_contract|absconding
    exit_reason_detail = Column(Text)
    is_eligible_rehire = Column(Boolean, default=True)
    # Exit checklist
    noc_issued      = Column(Boolean, default=False)
    experience_letter = Column(Boolean, default=False)
    equipment_returned = Column(Boolean, default=False)
    access_revoked  = Column(Boolean, default=False)
    final_settlement = Column(Boolean, default=False)
    # Exit interview
    exit_interview_done = Column(Boolean, default=False)
    exit_feedback   = Column(Text)
    interviewer_id  = Column(Integer, nullable=True)
    status          = Column(String(20), default="initiated")
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
