from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class SLA(Base):
    __tablename__ = "slas"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    name = Column(String(255), nullable=False)
    priority = Column(String(20))
    response_hours = Column(Float)
    resolution_hours = Column(Float)
    business_hours_only = Column(Boolean, default=True)
    escalation_levels = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    ticket_number = Column(String(50), unique=True)
    subject = Column(String(500), nullable=False)
    description = Column(Text)
    ticket_type = Column(String(50), default="incident")  # incident, request, problem, change
    category = Column(String(100))
    sub_category = Column(String(100))
    priority = Column(String(20), default="medium")
    status = Column(String(50), default="open")  # open, in_progress, pending, resolved, closed
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=True)
    contact_name = Column(String(255))
    contact_email = Column(String(255))
    contact_phone = Column(String(20))
    assigned_to = Column(Integer, ForeignKey('users.id'), nullable=True)
    team = Column(String(100))
    sla_id = Column(Integer, ForeignKey('slas.id'), nullable=True)
    first_response_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))
    due_at = Column(DateTime(timezone=True))
    sla_breached = Column(Boolean, default=False)
    satisfaction_rating = Column(Integer)
    tags = Column(JSON, default=[])
    attachments = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan")

class TicketComment(Base):
    __tablename__ = "ticket_comments"
    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey('tickets.id'), nullable=False)
    comment = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ticket = relationship("Ticket", back_populates="comments")

class KnowledgeBase(Base):
    __tablename__ = "knowledge_base"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    title = Column(String(500), nullable=False)
    content = Column(Text)
    category = Column(String(100))
    tags = Column(JSON, default=[])
    views = Column(Integer, default=0)
    helpful_count = Column(Integer, default=0)
    status = Column(String(50), default="published")
    created_by = Column(Integer, ForeignKey('users.id'))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
