"""
Enhanced Attendance & Leave API
- Biometric punch (card/fingerprint/facial)
- Mark absent / bulk mark absent
- Regularization requests & approvals
- Leave types (regional)
- Holiday calendar (national/state/regional)
- Leave balances
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date, timedelta, time
import json

from app.db.base import get_db
from app.models.attendance import (
    BiometricDevice, AttendanceLog, AttendanceRegularization,
    LeaveType, LeavePolicy, LeaveBalance, HolidayType, Holiday
)
from app.models.hr import Attendance, Employee, Leave
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
# BIOMETRIC DEVICES
# ─────────────────────────────────────────────────────────────────────────────

class DeviceCreate(BaseModel):
    device_name: str
    device_code: str
    device_type: str = "fingerprint"   # fingerprint|facial|card_swipe|manual
    location: Optional[str] = None
    ip_address: Optional[str] = None
    branch_id: Optional[int] = None

@router.get("/devices")
async def list_devices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    devices = db.query(BiometricDevice).filter(BiometricDevice.is_active == True).all()
    return [{"id": d.id, "device_name": d.device_name, "device_code": d.device_code,
             "device_type": d.device_type, "location": d.location, "ip_address": d.ip_address,
             "is_active": d.is_active, "last_sync": d.last_sync.isoformat() if d.last_sync else None}
            for d in devices]

@router.post("/devices")
async def create_device(data: DeviceCreate, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    d = BiometricDevice(**data.dict())
    db.add(d); db.commit(); db.refresh(d)
    return {"id": d.id, "device_name": d.device_name}

# ─────────────────────────────────────────────────────────────────────────────
# BIOMETRIC PUNCH
# ─────────────────────────────────────────────────────────────────────────────

class PunchIn(BaseModel):
    employee_id: int
    punch_time: Optional[str] = None        # ISO datetime, defaults to now
    punch_type: str = "in"                  # in | out | break_in | break_out
    source: str = "manual"                  # manual | card_swipe | fingerprint | facial | mobile_app
    device_id: Optional[int] = None
    raw_data: Optional[str] = None          # JSON from device

@router.post("/punch")
async def biometric_punch(data: PunchIn, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    """Record a biometric punch. Auto-creates/updates daily attendance record."""
    punch_dt = datetime.fromisoformat(data.punch_time) if data.punch_time else datetime.now()
    att_date = punch_dt.date()

    # Log the raw punch
    log = AttendanceLog(
        employee_id=data.employee_id,
        device_id=data.device_id,
        punch_time=punch_dt,
        punch_type=data.punch_type,
        source=data.source,
        raw_data=data.raw_data,
        is_processed=False,
    )
    db.add(log)

    # Update or create daily attendance record
    att = db.query(Attendance).filter(
        Attendance.employee_id == data.employee_id,
        Attendance.date == att_date
    ).first()

    if not att:
        att = Attendance(
            employee_id=data.employee_id,
            date=att_date,
            status="present",
        )
        db.add(att)

    if data.punch_type == "in" and not att.check_in:
        att.check_in = punch_dt
        att.status = "present"
    elif data.punch_type == "out":
        att.check_out = punch_dt
        if att.check_in:
            delta = punch_dt - att.check_in
            att.hours_worked = round(delta.seconds / 3600, 2)

    log.is_processed = True
    db.commit()
    return {
        "success": True,
        "message": f"Punch {data.punch_type.upper()} recorded at {punch_dt.strftime('%H:%M')}",
        "source": data.source,
        "employee_id": data.employee_id,
        "date": str(att_date),
        "check_in": att.check_in.isoformat() if att.check_in else None,
        "check_out": att.check_out.isoformat() if att.check_out else None,
    }

@router.post("/mark-absent")
async def mark_absent_bulk(data: dict, db: Session = Depends(get_db),
                            current_user: User = Depends(get_current_user)):
    """Mark one or multiple employees absent for a date."""
    att_date = date.fromisoformat(data.get("date", date.today().isoformat()))
    employee_ids = data.get("employee_ids", [])
    reason = data.get("reason", "No attendance recorded")

    if not employee_ids:
        # Auto-mark all employees absent who have no attendance for the date
        all_employees = db.query(Employee).filter(Employee.is_active == True).all()
        present_ids = {a.employee_id for a in db.query(Attendance).filter(Attendance.date == att_date).all()}
        employee_ids = [e.id for e in all_employees if e.id not in present_ids]

    marked = 0
    for emp_id in employee_ids:
        att = db.query(Attendance).filter(
            Attendance.employee_id == emp_id, Attendance.date == att_date
        ).first()
        if not att:
            att = Attendance(employee_id=emp_id, date=att_date, status="absent", notes=reason)
            db.add(att)
            marked += 1
        elif att.status not in ["present", "half_day"]:
            att.status = "absent"
            att.notes = reason
            marked += 1

    db.commit()
    return {"message": f"Marked {marked} employees absent for {att_date}", "count": marked}

@router.get("/today-status")
async def today_attendance_status(db: Session = Depends(get_db),
                                   current_user: User = Depends(get_current_user)):
    """Real-time attendance dashboard for today."""
    today = date.today()
    total_employees = db.query(func.count(Employee.id)).filter(Employee.is_active == True).scalar()
    today_records = db.query(Attendance).filter(Attendance.date == today).all()

    present = sum(1 for a in today_records if a.status == "present")
    absent = sum(1 for a in today_records if a.status == "absent")
    late = sum(1 for a in today_records if a.status == "late")
    half_day = sum(1 for a in today_records if a.status == "half_day")
    not_marked = total_employees - len(today_records)

    # Check-ins in last hour
    one_hour_ago = datetime.now() - timedelta(hours=1)
    recent_punches = db.query(AttendanceLog).filter(
        AttendanceLog.punch_time >= one_hour_ago,
        AttendanceLog.punch_type == "in"
    ).count()

    return {
        "date": str(today),
        "total_employees": total_employees,
        "present": present,
        "absent": absent,
        "late": late,
        "half_day": half_day,
        "not_marked": not_marked,
        "on_leave": 0,
        "recent_checkins_1h": recent_punches,
        "attendance_percent": round(present / total_employees * 100, 1) if total_employees else 0,
    }

@router.get("/punch-logs")
async def get_punch_logs(employee_id: Optional[int] = None, date_from: Optional[str] = None,
                          date_to: Optional[str] = None, limit: int = 100,
                          db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(AttendanceLog)
    if employee_id: q = q.filter(AttendanceLog.employee_id == employee_id)
    if date_from: q = q.filter(AttendanceLog.punch_time >= datetime.fromisoformat(date_from))
    if date_to: q = q.filter(AttendanceLog.punch_time <= datetime.fromisoformat(date_to + "T23:59:59"))
    logs = q.order_by(AttendanceLog.punch_time.desc()).limit(limit).all()
    return {"total": q.count(), "items": [
        {"id": l.id, "employee_id": l.employee_id, "punch_time": l.punch_time.isoformat(),
         "punch_type": l.punch_type, "source": l.source, "device_id": l.device_id}
        for l in logs
    ]}

# ─────────────────────────────────────────────────────────────────────────────
# REGULARIZATION
# ─────────────────────────────────────────────────────────────────────────────

class RegularizationCreate(BaseModel):
    employee_id: int
    attendance_date: str
    requested_in: Optional[str] = None     # "HH:MM"
    requested_out: Optional[str] = None    # "HH:MM"
    reason: str
    regularization_type: str = "forgot_punch"
    on_duty_location: Optional[str] = None

@router.get("/regularization")
async def list_regularizations(employee_id: Optional[int] = None, status: Optional[str] = None,
                                 skip: int = 0, limit: int = 50,
                                 db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(AttendanceRegularization)
    if employee_id: q = q.filter(AttendanceRegularization.employee_id == employee_id)
    if status: q = q.filter(AttendanceRegularization.status == status)
    total = q.count()
    items = q.order_by(AttendanceRegularization.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "items": [
        {"id": r.id, "employee_id": r.employee_id,
         "attendance_date": str(r.attendance_date),
         "requested_in": str(r.requested_in) if r.requested_in else None,
         "requested_out": str(r.requested_out) if r.requested_out else None,
         "reason": r.reason, "regularization_type": r.regularization_type,
         "on_duty_location": r.on_duty_location,
         "status": r.status, "rejection_reason": r.rejection_reason,
         "created_at": r.created_at.isoformat() if r.created_at else None}
        for r in items
    ]}

@router.post("/regularization")
async def create_regularization(data: RegularizationCreate, db: Session = Depends(get_db),
                                  current_user: User = Depends(get_current_user)):
    r = AttendanceRegularization(
        employee_id=data.employee_id,
        attendance_date=date.fromisoformat(data.attendance_date),
        requested_in=time.fromisoformat(data.requested_in) if data.requested_in else None,
        requested_out=time.fromisoformat(data.requested_out) if data.requested_out else None,
        reason=data.reason,
        regularization_type=data.regularization_type,
        on_duty_location=data.on_duty_location,
    )
    db.add(r); db.commit(); db.refresh(r)
    return {"id": r.id, "status": r.status, "message": "Regularization request submitted"}

@router.put("/regularization/{reg_id}/approve")
async def approve_regularization(reg_id: int, db: Session = Depends(get_db),
                                   current_user: User = Depends(get_current_user)):
    reg = db.query(AttendanceRegularization).filter(AttendanceRegularization.id == reg_id).first()
    if not reg: raise HTTPException(404, "Not found")

    reg.status = "approved"
    reg.approved_by = current_user.id
    reg.approved_at = datetime.now()

    # Apply to actual attendance record
    att = db.query(Attendance).filter(
        Attendance.employee_id == reg.employee_id,
        Attendance.date == reg.attendance_date
    ).first()
    if not att:
        att = Attendance(employee_id=reg.employee_id, date=reg.attendance_date, status="present")
        db.add(att)

    if reg.requested_in:
        att.check_in = datetime.combine(reg.attendance_date, reg.requested_in)
    if reg.requested_out:
        att.check_out = datetime.combine(reg.attendance_date, reg.requested_out)
    if att.check_in and att.check_out:
        delta = att.check_out - att.check_in
        att.hours_worked = round(delta.seconds / 3600, 2)
    att.status = "present" if reg.regularization_type != "on_duty" else "on_duty"
    att.notes = f"Regularized: {reg.reason}"

    db.commit()
    return {"message": "Regularization approved and attendance updated"}

@router.put("/regularization/{reg_id}/reject")
async def reject_regularization(reg_id: int, data: dict = {}, db: Session = Depends(get_db),
                                  current_user: User = Depends(get_current_user)):
    reg = db.query(AttendanceRegularization).filter(AttendanceRegularization.id == reg_id).first()
    if not reg: raise HTTPException(404, "Not found")
    reg.status = "rejected"
    reg.approved_by = current_user.id
    reg.rejection_reason = data.get("reason", "Not approved")
    db.commit()
    return {"message": "Regularization rejected"}

# ─────────────────────────────────────────────────────────────────────────────
# LEAVE TYPES (Regional)
# ─────────────────────────────────────────────────────────────────────────────

class LeaveTypeCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    leave_category: str = "general"
    country: str = "India"
    applicable_states: str = "ALL"
    gender_specific: str = "all"
    default_days_per_year: float = 0
    is_paid: bool = True
    is_carry_forward: bool = False
    max_carry_forward: float = 0
    is_encashable: bool = False
    requires_medical_certificate: bool = False
    min_days: float = 0.5
    max_days_per_application: float = 0
    notice_days: int = 0

def lt_dict(lt: LeaveType):
    return {"id": lt.id, "name": lt.name, "code": lt.code, "description": lt.description,
            "leave_category": lt.leave_category, "country": lt.country,
            "applicable_states": lt.applicable_states, "gender_specific": lt.gender_specific,
            "default_days_per_year": lt.default_days_per_year, "is_paid": lt.is_paid,
            "is_carry_forward": lt.is_carry_forward, "max_carry_forward": lt.max_carry_forward,
            "is_encashable": lt.is_encashable,
            "requires_medical_certificate": lt.requires_medical_certificate,
            "min_days": lt.min_days, "max_days_per_application": lt.max_days_per_application,
            "notice_days": lt.notice_days, "is_active": lt.is_active}

@router.get("/leave-types")
async def list_leave_types(country: Optional[str] = None, state: Optional[str] = None,
                            leave_category: Optional[str] = None,
                            db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(LeaveType).filter(LeaveType.is_active == True)
    if country: q = q.filter(LeaveType.country == country)
    if leave_category: q = q.filter(LeaveType.leave_category == leave_category)
    return [lt_dict(lt) for lt in q.order_by(LeaveType.name).all()]

@router.post("/leave-types")
async def create_leave_type(data: LeaveTypeCreate, db: Session = Depends(get_db),
                              current_user: User = Depends(get_current_user)):
    lt = LeaveType(**data.dict())
    db.add(lt); db.commit(); db.refresh(lt)
    return lt_dict(lt)

@router.put("/leave-types/{lt_id}")
async def update_leave_type(lt_id: int, data: dict, db: Session = Depends(get_db),
                              current_user: User = Depends(get_current_user)):
    lt = db.query(LeaveType).filter(LeaveType.id == lt_id).first()
    if not lt: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(lt, k): setattr(lt, k, v)
    db.commit(); return lt_dict(lt)

@router.delete("/leave-types/{lt_id}")
async def delete_leave_type(lt_id: int, db: Session = Depends(get_db),
                              current_user: User = Depends(get_current_user)):
    lt = db.query(LeaveType).filter(LeaveType.id == lt_id).first()
    if not lt: raise HTTPException(404, "Not found")
    lt.is_active = False; db.commit()
    return {"message": "Deactivated"}

# ─────────────────────────────────────────────────────────────────────────────
# LEAVE BALANCE
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/leave-balance")
async def get_leave_balance(employee_id: int, year: Optional[int] = None,
                             db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    yr = year or datetime.now().year
    balances = db.query(LeaveBalance).filter(
        LeaveBalance.employee_id == employee_id,
        LeaveBalance.year == yr
    ).all()
    leave_types = {lt.id: lt for lt in db.query(LeaveType).filter(LeaveType.is_active == True).all()}
    return [{"id": b.id, "employee_id": b.employee_id, "year": b.year,
             "leave_type_id": b.leave_type_id,
             "leave_type_name": leave_types.get(b.leave_type_id, type('o', (), {'name': '?', 'code': '?'})).name,
             "leave_type_code": leave_types.get(b.leave_type_id, type('o', (), {'name': '?', 'code': '?'})).code,
             "opening_balance": b.opening_balance, "accrued": b.accrued,
             "availed": b.availed, "pending": b.pending,
             "closing_balance": b.closing_balance, "carried_forward": b.carried_forward}
            for b in balances]

@router.post("/leave-balance/initialize")
async def initialize_leave_balances(data: dict, db: Session = Depends(get_db),
                                     current_user: User = Depends(get_current_user)):
    """Initialize leave balances for all employees for a year."""
    year = data.get("year", datetime.now().year)
    leave_types = db.query(LeaveType).filter(LeaveType.is_active == True).all()
    employees = db.query(Employee).filter(Employee.is_active == True).all()

    created = 0
    for emp in employees:
        for lt in leave_types:
            # Check gender restriction
            if lt.gender_specific != "all":
                emp_gender = getattr(emp, 'gender', 'other') or 'other'
                if lt.gender_specific == 'female' and emp_gender.lower() not in ['female', 'f']:
                    continue
                if lt.gender_specific == 'male' and emp_gender.lower() not in ['male', 'm']:
                    continue

            existing = db.query(LeaveBalance).filter(
                LeaveBalance.employee_id == emp.id,
                LeaveBalance.leave_type_id == lt.id,
                LeaveBalance.year == year
            ).first()
            if not existing:
                bal = LeaveBalance(
                    employee_id=emp.id,
                    leave_type_id=lt.id,
                    year=year,
                    opening_balance=lt.default_days_per_year,
                    accrued=lt.default_days_per_year,
                    closing_balance=lt.default_days_per_year,
                )
                db.add(bal); created += 1
    db.commit()
    return {"message": f"Initialized {created} leave balances for {year}"}

# ─────────────────────────────────────────────────────────────────────────────
# HOLIDAY TYPES
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/holiday-types")
async def list_holiday_types(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    types = db.query(HolidayType).filter(HolidayType.is_active == True).all()
    return [{"id": t.id, "name": t.name, "code": t.code, "description": t.description,
             "is_mandatory": t.is_mandatory, "country": t.country} for t in types]

@router.post("/holiday-types")
async def create_holiday_type(data: dict, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    t = HolidayType(**{k: v for k, v in data.items() if hasattr(HolidayType, k)})
    db.add(t); db.commit(); db.refresh(t)
    return {"id": t.id, "name": t.name}

# ─────────────────────────────────────────────────────────────────────────────
# HOLIDAY CALENDAR
# ─────────────────────────────────────────────────────────────────────────────

class HolidayCreate(BaseModel):
    holiday_type_id: int
    name: str
    date: str
    country: str = "India"
    applicable_states: str = "ALL"
    applicable_religions: Optional[str] = None
    is_optional: bool = False
    is_paid: bool = True
    description: Optional[str] = None

def holiday_dict(h: Holiday):
    return {"id": h.id, "name": h.name, "date": str(h.date), "year": h.year,
            "day_of_week": h.day_of_week, "holiday_type_id": h.holiday_type_id,
            "holiday_type_name": h.holiday_type.name if h.holiday_type else None,
            "country": h.country, "applicable_states": h.applicable_states,
            "applicable_religions": h.applicable_religions,
            "is_optional": h.is_optional, "is_paid": h.is_paid, "description": h.description}

@router.get("/holidays")
async def list_holidays(year: Optional[int] = None, country: str = "India",
                         state: Optional[str] = None, is_optional: Optional[bool] = None,
                         db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    yr = year or datetime.now().year
    q = db.query(Holiday).filter(Holiday.year == yr, Holiday.is_active == True, Holiday.country == country)
    if is_optional is not None: q = q.filter(Holiday.is_optional == is_optional)
    if state:
        q = q.filter((Holiday.applicable_states == "ALL") |
                     (Holiday.applicable_states.contains(state)))
    holidays = q.order_by(Holiday.date).all()
    return {"year": yr, "total": len(holidays), "items": [holiday_dict(h) for h in holidays]}

@router.post("/holidays")
async def create_holiday(data: HolidayCreate, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    hdate = date.fromisoformat(data.date)
    h = Holiday(
        holiday_type_id=data.holiday_type_id, name=data.name, date=hdate,
        year=hdate.year, day_of_week=hdate.strftime("%A"),
        country=data.country, applicable_states=data.applicable_states,
        applicable_religions=data.applicable_religions,
        is_optional=data.is_optional, is_paid=data.is_paid, description=data.description,
    )
    db.add(h); db.commit(); db.refresh(h)
    return holiday_dict(h)

@router.put("/holidays/{h_id}")
async def update_holiday(h_id: int, data: dict, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    h = db.query(Holiday).filter(Holiday.id == h_id).first()
    if not h: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(h, k): setattr(h, k, v)
    db.commit(); return holiday_dict(h)

@router.delete("/holidays/{h_id}")
async def delete_holiday(h_id: int, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    h = db.query(Holiday).filter(Holiday.id == h_id).first()
    if not h: raise HTTPException(404, "Not found")
    h.is_active = False; db.commit()
    return {"message": "Holiday deleted"}

@router.get("/holidays/check")
async def check_is_holiday(check_date: str, country: str = "India", state: Optional[str] = None,
                             db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Check if a specific date is a holiday."""
    d = date.fromisoformat(check_date)
    q = db.query(Holiday).filter(Holiday.date == d, Holiday.country == country, Holiday.is_active == True)
    if state:
        q = q.filter((Holiday.applicable_states == "ALL") | (Holiday.applicable_states.contains(state)))
    holidays = q.all()
    return {"date": check_date, "is_holiday": len(holidays) > 0,
            "holidays": [{"name": h.name, "is_optional": h.is_optional, "is_paid": h.is_paid} for h in holidays]}

# ─────────────────────────────────────────────────────────────────────────────
# ATTENDANCE ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/analytics/monthly")
async def monthly_analytics(year: int = None, month: int = None,
                              employee_id: Optional[int] = None,
                              db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.now()
    yr = year or now.year
    mo = month or now.month

    from calendar import monthrange
    _, days_in_month = monthrange(yr, mo)
    start = date(yr, mo, 1)
    end = date(yr, mo, days_in_month)

    q = db.query(Attendance).filter(Attendance.date >= start, Attendance.date <= end)
    if employee_id: q = q.filter(Attendance.employee_id == employee_id)
    records = q.all()

    # Get holidays for this month
    holidays = db.query(Holiday).filter(
        Holiday.date >= start, Holiday.date <= end,
        Holiday.is_active == True, Holiday.country == "India",
        Holiday.is_optional == False
    ).count()

    working_days = days_in_month - holidays

    summary = {
        "year": yr, "month": mo, "days_in_month": days_in_month,
        "working_days": working_days, "holidays": holidays,
        "total_records": len(records),
        "present": sum(1 for r in records if r.status == "present"),
        "absent": sum(1 for r in records if r.status == "absent"),
        "half_day": sum(1 for r in records if r.status == "half_day"),
        "late": sum(1 for r in records if r.status == "late"),
        "avg_hours": round(sum(r.hours_worked or 0 for r in records) / max(len(records), 1), 2),
    }
    return summary
