"""
Employee Skills, Education & KRA/KPI Performance Appraisal Models
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Numeric, Date, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class SkillCategory(Base):
    """Industry-specific skill categories"""
    __tablename__ = "skill_categories"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), nullable=False, unique=True)
    industry    = Column(String(100), default="general")
    description = Column(Text)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class Skill(Base):
    """Global skill catalog"""
    __tablename__ = "skills"
    id          = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("skill_categories.id"), nullable=True)
    name        = Column(String(150), nullable=False)
    description = Column(Text)
    skill_type  = Column(String(30), default="technical")
    # technical|soft_skills|domain|language|tool|certification
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    category    = relationship("SkillCategory")


class EmployeeSkill(Base):
    """Skills per employee with proficiency level"""
    __tablename__ = "employee_skills"
    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    skill_id        = Column(Integer, ForeignKey("skills.id"), nullable=True)
    skill_name      = Column(String(150))     # for custom/unlisted skills
    proficiency     = Column(String(20), default="intermediate")
    # beginner|intermediate|advanced|expert
    proficiency_score = Column(Integer, default=3)  # 1-5
    years_experience = Column(Float, default=0)
    last_used_year  = Column(Integer)
    is_primary      = Column(Boolean, default=False)
    certification   = Column(String(200))   # certification name if any
    cert_date       = Column(Date)
    verified_by     = Column(Integer, nullable=True)
    notes           = Column(Text)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    skill           = relationship("Skill", foreign_keys=[skill_id])


class EducationDetail(Base):
    """Employee educational qualifications"""
    __tablename__ = "education_details"
    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    degree          = Column(String(150), nullable=False)
    # B.Tech|MBA|B.Com|M.Sc|Ph.D|Diploma|12th|10th|etc.
    specialization  = Column(String(200))
    institution     = Column(String(300))
    university      = Column(String(300))
    year_from       = Column(Integer)
    year_to         = Column(Integer)
    grade           = Column(String(20))        # CGPA / % / Pass
    grade_value     = Column(Float)
    grade_type      = Column(String(10), default="percentage")  # cgpa|percentage|grade
    country         = Column(String(50), default="India")
    is_highest      = Column(Boolean, default=False)
    is_verified     = Column(Boolean, default=False)
    certificate_url = Column(String(500))
    created_at      = Column(DateTime(timezone=True), server_default=func.now())


# ── KRA / KPI Performance Appraisal ──────────────────────────────────────────

class AppraisalCycle(Base):
    """Performance review cycles — Q1, Q2, H1, Annual"""
    __tablename__ = "appraisal_cycles"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), nullable=False)
    cycle_type  = Column(String(20), default="annual")
    # quarterly|half_yearly|annual|probation|continuous
    financial_year = Column(String(10))     # "2025-26"
    period_label = Column(String(50))       # "Q1 2026", "H1 FY 2025-26"
    start_date  = Column(Date)
    end_date    = Column(Date)
    # Timeline
    kra_setting_deadline = Column(Date)     # Deadline for setting KRAs/goals
    self_review_deadline = Column(Date)     # Employee self-assessment deadline
    manager_review_deadline = Column(Date)  # Manager review deadline
    calibration_date = Column(Date)         # HR calibration session
    status      = Column(String(20), default="draft")
    # draft|kra_setting|self_review|manager_review|calibration|closed
    created_by  = Column(Integer, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    kra_templates = relationship("KRATemplate", back_populates="cycle")


class KRATemplate(Base):
    """KRA templates defined by HR/Manager for a cycle"""
    __tablename__ = "kra_templates"
    id          = Column(Integer, primary_key=True, index=True)
    cycle_id    = Column(Integer, ForeignKey("appraisal_cycles.id"), nullable=False)
    department_id = Column(Integer, nullable=True)   # null = applies to all
    designation = Column(String(100))
    kra_name    = Column(String(200), nullable=False)
    kra_description = Column(Text)
    weightage   = Column(Float, default=0)      # % weightage in overall score
    measurement_criteria = Column(Text)          # How it's measured
    target_value = Column(String(100))           # Numeric or qualitative target
    kpi_type    = Column(String(20), default="quantitative")  # quantitative|qualitative
    is_mandatory = Column(Boolean, default=True)
    sort_order  = Column(Integer, default=0)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    cycle       = relationship("AppraisalCycle", back_populates="kra_templates")


class EmployeeAppraisal(Base):
    """Individual appraisal per employee per cycle"""
    __tablename__ = "employee_appraisals"
    id              = Column(Integer, primary_key=True, index=True)
    cycle_id        = Column(Integer, ForeignKey("appraisal_cycles.id"), nullable=False)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    reviewer_id     = Column(Integer, ForeignKey("employees.id"), nullable=True)   # manager
    hr_reviewer_id  = Column(Integer, nullable=True)
    # Status workflow
    status          = Column(String(30), default="pending")
    # pending|kra_set|self_review|manager_review|calibration|closed
    # KRAs for this employee (list of kra ratings)
    kras            = Column(JSON, default=[])
    # [{"kra_id":1,"kra_name":"...","weightage":20,"target":"...",
    #   "employee_achievement":"...","employee_score":4,
    #   "manager_achievement":"...","manager_score":3.5,
    #   "final_score":3.5,"comments":"..."}]
    # Overall scores
    self_score      = Column(Float)          # Employee's self-rating
    manager_score   = Column(Float)          # Manager's rating
    final_score     = Column(Float)          # After calibration
    rating_label    = Column(String(30))     # Exceptional/Exceeds/Meets/Needs/Unacceptable
    # Goals for next period
    goals_next_period = Column(JSON, default=[])
    # Development plan
    development_plan = Column(Text)
    training_needs  = Column(Text)
    # Comments
    employee_comments = Column(Text)
    manager_comments = Column(Text)
    hr_comments     = Column(Text)
    # Outcome
    outcome         = Column(String(30))     # confirmed|promoted|pip|no_change|fast_track
    increment_percent = Column(Float)
    bonus_amount    = Column(Numeric(12,2))
    promotion_to    = Column(String(100))
    # Dates
    kra_set_date    = Column(DateTime(timezone=True))
    self_review_date = Column(DateTime(timezone=True))
    manager_review_date = Column(DateTime(timezone=True))
    closed_date     = Column(DateTime(timezone=True))
    # Acknowledgement
    employee_acknowledged = Column(Boolean, default=False)
    employee_acknowledged_at = Column(DateTime(timezone=True))
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
