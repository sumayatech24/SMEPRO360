from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON, Numeric, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50))
    parent_id = Column(Integer, ForeignKey('departments.id'), nullable=True)
    head_id = Column(Integer, ForeignKey('employees.id'), nullable=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    employees = relationship("Employee", back_populates="department", foreign_keys="[Employee.department_id]")

class Designation(Base):
    __tablename__ = "designations"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50))
    department_id = Column(Integer, ForeignKey('departments.id'), nullable=True)
    grade = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    employee_number = Column(String(50), unique=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100))
    email = Column(String(255))
    phone = Column(String(20))
    date_of_birth = Column(Date)
    gender = Column(String(20))
    blood_group = Column(String(10))
    marital_status = Column(String(20))
    nationality = Column(String(50), default="Indian")
    pan_number = Column(String(15))
    aadhaar_number = Column(String(20))
    uan_number = Column(String(20))
    esic_number = Column(String(20))
    department_id = Column(Integer, ForeignKey('departments.id'), nullable=True)
    designation_id = Column(Integer, ForeignKey('designations.id'), nullable=True)
    reporting_manager_id = Column(Integer, ForeignKey('employees.id'), nullable=True)
    branch_id = Column(Integer, nullable=True)
    employment_type = Column(String(50), default="full_time")  # full_time, part_time, contract
    date_of_joining = Column(Date)
    date_of_leaving = Column(Date)
    status = Column(String(50), default="active")
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(10))
    bank_name = Column(String(100))
    bank_account = Column(String(50))
    bank_ifsc = Column(String(20))
    basic_salary = Column(Numeric(15,2), default=0)
    hra = Column(Numeric(15,2), default=0)
    other_allowances = Column(Numeric(15,2), default=0)
    photo_url = Column(String(500))
    documents = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    department = relationship("Department", back_populates="employees", foreign_keys=[department_id])
    attendances = relationship("Attendance", back_populates="employee")
    leaves = relationship("Leave", back_populates="employee")
    payrolls = relationship("Payroll", back_populates="employee")

class Attendance(Base):
    __tablename__ = "attendances"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    date = Column(Date, nullable=False)
    check_in = Column(DateTime(timezone=True))
    check_out = Column(DateTime(timezone=True))
    hours_worked = Column(Float, default=0)
    overtime_hours = Column(Float, default=0)
    status = Column(String(50), default="present")  # present, absent, half_day, late, on_leave
    attendance_type = Column(String(50), default="regular")
    notes = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    employee = relationship("Employee", back_populates="attendances")

class Leave(Base):
    __tablename__ = "leaves"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    leave_type = Column(String(50))  # casual, sick, earned, maternity, paternity
    from_date = Column(Date, nullable=False)
    to_date = Column(Date, nullable=False)
    days = Column(Float)
    reason = Column(Text)
    status = Column(String(50), default="pending")  # pending, approved, rejected, cancelled
    approved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    approved_at = Column(DateTime(timezone=True))
    rejection_reason = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    employee = relationship("Employee", back_populates="leaves")

class Payroll(Base):
    __tablename__ = "payrolls"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)
    payroll_period = Column(String(20))  # 2024-01
    month = Column(Integer)
    year = Column(Integer)
    working_days = Column(Integer)
    present_days = Column(Float)
    leave_days = Column(Float)
    basic_salary = Column(Numeric(15,2), default=0)
    hra = Column(Numeric(15,2), default=0)
    other_allowances = Column(Numeric(15,2), default=0)
    gross_salary = Column(Numeric(15,2), default=0)
    pf_employee = Column(Numeric(15,2), default=0)
    pf_employer = Column(Numeric(15,2), default=0)
    esic_employee = Column(Numeric(15,2), default=0)
    esic_employer = Column(Numeric(15,2), default=0)
    professional_tax = Column(Numeric(15,2), default=0)
    tds = Column(Numeric(15,2), default=0)
    other_deductions = Column(Numeric(15,2), default=0)
    total_deductions = Column(Numeric(15,2), default=0)
    net_salary = Column(Numeric(15,2), default=0)
    status = Column(String(50), default="draft")  # draft, approved, paid
    payment_date = Column(DateTime(timezone=True))
    payment_mode = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    employee = relationship("Employee", back_populates="payrolls")

class PayrollItem(Base):
    __tablename__ = "payroll_items"
    id = Column(Integer, primary_key=True)
    payroll_id = Column(Integer, ForeignKey('payrolls.id'), nullable=False)
    item_type = Column(String(50))  # earning, deduction
    name = Column(String(100))
    amount = Column(Numeric(15,2))
