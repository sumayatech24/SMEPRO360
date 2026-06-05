"""
Enhanced Attendance & Leave Models
- Biometric attendance (card swipe, fingerprint, facial recognition)
- Attendance regularization
- Regional leave types & holiday calendar
- Leave balance tracking
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Numeric, Date, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


# ── Attendance Source / Biometric ──────────────────────────────────────────────

class BiometricDevice(Base):
    """Register of biometric devices at each location"""
    __tablename__ = "biometric_devices"
    id          = Column(Integer, primary_key=True, index=True)
    device_name = Column(String(100), nullable=False)
    device_code = Column(String(50), unique=True)
    device_type = Column(String(30), default="fingerprint")  # fingerprint|facial|card_swipe|manual
    location    = Column(String(200))
    branch_id   = Column(Integer, nullable=True)
    ip_address  = Column(String(50))
    is_active   = Column(Boolean, default=True)
    last_sync   = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class AttendanceLog(Base):
    """Raw biometric log — each swipe/scan/punch"""
    __tablename__ = "attendance_logs"
    id            = Column(Integer, primary_key=True, index=True)
    employee_id   = Column(Integer, ForeignKey("employees.id"), nullable=False)
    device_id     = Column(Integer, ForeignKey("biometric_devices.id"), nullable=True)
    punch_time    = Column(DateTime(timezone=True), nullable=False)
    punch_type    = Column(String(20), default="in")     # in | out | break_in | break_out
    source        = Column(String(30), default="manual") # manual | card_swipe | fingerprint | facial | mobile_app
    raw_data      = Column(Text)                         # raw device payload JSON
    is_processed  = Column(Boolean, default=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class AttendanceRegularization(Base):
    """Employee request to correct/regularize attendance"""
    __tablename__ = "attendance_regularizations"
    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    attendance_date = Column(Date, nullable=False)
    requested_in    = Column(Time, nullable=True)       # Requested check-in time
    requested_out   = Column(Time, nullable=True)       # Requested check-out time
    reason          = Column(Text, nullable=False)
    regularization_type = Column(String(30), default="forgot_punch")
    # forgot_punch | late_arrival | early_departure | wfh | on_duty | other
    on_duty_location  = Column(String(200))             # For on-duty regularization
    status            = Column(String(20), default="pending")  # pending|approved|rejected
    approved_by       = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at       = Column(DateTime(timezone=True), nullable=True)
    rejection_reason  = Column(Text)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ── Leave Types & Policies ─────────────────────────────────────────────────────

class LeaveType(Base):
    """Leave type definitions — per region/country"""
    __tablename__ = "leave_types"
    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(100), nullable=False)       # Annual Leave, Sick Leave, etc.
    code            = Column(String(20), nullable=False)        # AL, SL, CL, EL, ML, PL
    description     = Column(Text)
    leave_category  = Column(String(30), default="general")    # general|medical|maternity|paternity|bereavement|comp_off|wfh|on_duty
    # Regional applicability
    country         = Column(String(50), default="India")
    applicable_states = Column(Text)                           # JSON list of states, or "ALL"
    gender_specific = Column(String(10), default="all")        # all|male|female
    # Policy defaults
    default_days_per_year = Column(Float, default=0)
    is_paid         = Column(Boolean, default=True)
    is_carry_forward = Column(Boolean, default=False)
    max_carry_forward = Column(Float, default=0)
    is_encashable   = Column(Boolean, default=False)
    requires_medical_certificate = Column(Boolean, default=False)
    min_days        = Column(Float, default=0.5)              # Min days per application
    max_days_per_application = Column(Float, default=0)       # 0 = no limit
    notice_days     = Column(Integer, default=0)              # Advance notice required
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    policies        = relationship("LeavePolicy", back_populates="leave_type")


class LeavePolicy(Base):
    """Leave policy per employee group/department"""
    __tablename__ = "leave_policies"
    id              = Column(Integer, primary_key=True, index=True)
    leave_type_id   = Column(Integer, ForeignKey("leave_types.id"), nullable=False)
    policy_name     = Column(String(100))
    employment_type = Column(String(30), default="all")       # all|full_time|part_time|contract
    department_id   = Column(Integer, nullable=True)
    days_per_year   = Column(Float, nullable=False)
    carry_forward_max = Column(Float, default=0)
    encashment_max  = Column(Float, default=0)
    probation_allowed = Column(Boolean, default=False)
    effective_from  = Column(Date, nullable=True)
    effective_to    = Column(Date, nullable=True)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    leave_type      = relationship("LeaveType", back_populates="policies")


class LeaveBalance(Base):
    """Per-employee leave balance tracker"""
    __tablename__ = "leave_balances"
    id              = Column(Integer, primary_key=True, index=True)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    leave_type_id   = Column(Integer, ForeignKey("leave_types.id"), nullable=False)
    year            = Column(Integer, nullable=False)
    opening_balance = Column(Float, default=0)
    accrued         = Column(Float, default=0)       # Earned/accrued this year
    availed         = Column(Float, default=0)       # Used
    pending         = Column(Float, default=0)       # Pending approval
    closing_balance = Column(Float, default=0)       # Available
    carried_forward = Column(Float, default=0)
    encashed        = Column(Float, default=0)
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ── Holiday Calendar ──────────────────────────────────────────────────────────

class HolidayType(Base):
    """Types of holidays"""
    __tablename__ = "holiday_types"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(100), nullable=False)          # National Holiday, State Holiday, etc.
    code        = Column(String(20), nullable=False)
    description = Column(Text)
    is_mandatory = Column(Boolean, default=True)              # Mandatory or Optional
    country     = Column(String(50), default="India")
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    holidays    = relationship("Holiday", back_populates="holiday_type")


class Holiday(Base):
    """Holiday calendar with regional applicability"""
    __tablename__ = "holidays"
    id              = Column(Integer, primary_key=True, index=True)
    holiday_type_id = Column(Integer, ForeignKey("holiday_types.id"), nullable=False)
    name            = Column(String(200), nullable=False)
    date            = Column(Date, nullable=False)
    year            = Column(Integer, nullable=False)
    day_of_week     = Column(String(10))
    # Regional applicability
    country         = Column(String(50), default="India")
    applicable_states = Column(Text, default="ALL")           # JSON list or "ALL"
    applicable_regions = Column(Text)                         # More granular
    applicable_religions = Column(Text)                       # Diwali, Eid, Christmas
    # Type
    is_optional     = Column(Boolean, default=False)          # Optional / restricted holiday
    is_paid         = Column(Boolean, default=True)
    description     = Column(Text)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    holiday_type    = relationship("HolidayType", back_populates="holidays")
