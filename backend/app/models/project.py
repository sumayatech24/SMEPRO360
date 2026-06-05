from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON, Numeric, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    project_number = Column(String(50), unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    project_type = Column(String(50), default="it_services")  # it_services, manufacturing
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=True)
    status = Column(String(50), default="planning")  # planning, active, on_hold, completed, cancelled
    priority = Column(String(20), default="medium")
    start_date = Column(Date)
    end_date = Column(Date)
    actual_start = Column(Date)
    actual_end = Column(Date)
    budget = Column(Numeric(15,2), default=0)
    actual_cost = Column(Numeric(15,2), default=0)
    progress_percent = Column(Float, default=0)
    project_manager_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    members = Column(JSON, default=[])
    tags = Column(JSON, default=[])
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    tasks = relationship("ProjectTask", back_populates="project", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="project", cascade="all, delete-orphan")
    timesheets = relationship("Timesheet", back_populates="project")

class ProjectTask(Base):
    __tablename__ = "project_tasks"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    parent_task_id = Column(Integer, ForeignKey('project_tasks.id'), nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    task_type = Column(String(50), default="task")  # task, bug, feature, epic
    status = Column(String(50), default="todo")  # todo, in_progress, review, done
    priority = Column(String(20), default="medium")
    assigned_to = Column(Integer, ForeignKey('users.id'), nullable=True)
    milestone_id = Column(Integer, ForeignKey('milestones.id'), nullable=True)
    start_date = Column(Date)
    due_date = Column(Date)
    estimated_hours = Column(Float)
    actual_hours = Column(Float, default=0)
    progress_percent = Column(Float, default=0)
    tags = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    project = relationship("Project", back_populates="tasks")

class Milestone(Base):
    __tablename__ = "milestones"
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    due_date = Column(Date)
    status = Column(String(50), default="pending")
    deliverables = Column(JSON, default=[])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    project = relationship("Project", back_populates="milestones")

class Timesheet(Base):
    __tablename__ = "timesheets"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    task_id = Column(Integer, ForeignKey('project_tasks.id'), nullable=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    date = Column(Date, nullable=False)
    hours = Column(Float, nullable=False)
    billable = Column(Boolean, default=True)
    hourly_rate = Column(Numeric(10,2))
    description = Column(Text)
    status = Column(String(50), default="draft")  # draft, submitted, approved
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    project = relationship("Project", back_populates="timesheets")
