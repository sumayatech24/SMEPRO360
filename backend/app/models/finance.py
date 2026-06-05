from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    account_code = Column(String(50), nullable=False)
    account_name = Column(String(255), nullable=False)
    account_type = Column(String(50))  # asset, liability, equity, revenue, expense
    account_group = Column(String(100))
    parent_id = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    description = Column(Text)
    is_group = Column(Boolean, default=False)
    opening_balance = Column(Numeric(15,2), default=0)
    current_balance = Column(Numeric(15,2), default=0)
    currency = Column(String(10), default="INR")
    tax_applicable = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    journal_lines = relationship("JournalLine", back_populates="account")

class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    entry_number = Column(String(50), unique=True)
    entry_date = Column(DateTime(timezone=True))
    reference = Column(String(100))
    description = Column(Text)
    total_debit = Column(Numeric(15,2), default=0)
    total_credit = Column(Numeric(15,2), default=0)
    status = Column(String(50), default="draft")  # draft, posted, reversed
    entry_type = Column(String(50))  # manual, sales, purchase, payment, payroll
    created_by = Column(Integer, ForeignKey('users.id'))
    approved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    lines = relationship("JournalLine", back_populates="journal_entry", cascade="all, delete-orphan")

class JournalLine(Base):
    __tablename__ = "journal_lines"
    id = Column(Integer, primary_key=True)
    journal_entry_id = Column(Integer, ForeignKey('journal_entries.id'), nullable=False)
    account_id = Column(Integer, ForeignKey('accounts.id'), nullable=False)
    description = Column(String(500))
    debit_amount = Column(Numeric(15,2), default=0)
    credit_amount = Column(Numeric(15,2), default=0)
    cost_center = Column(String(100))
    project_id = Column(Integer, nullable=True)
    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account", back_populates="journal_lines")

class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    expense_number = Column(String(50), unique=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=True)
    expense_date = Column(DateTime(timezone=True))
    category = Column(String(100))
    description = Column(Text)
    amount = Column(Numeric(15,2), nullable=False)
    tax_amount = Column(Numeric(15,2), default=0)
    total_amount = Column(Numeric(15,2))
    currency = Column(String(10), default="INR")
    payment_mode = Column(String(50))
    vendor_name = Column(String(255))
    receipt_url = Column(String(500))
    status = Column(String(50), default="draft")  # draft, submitted, approved, rejected, paid
    approved_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    project_id = Column(Integer, nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Budget(Base):
    __tablename__ = "budgets"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, nullable=True)
    name = Column(String(255), nullable=False)
    fiscal_year = Column(String(20))
    period_type = Column(String(20), default="monthly")
    account_id = Column(Integer, ForeignKey('accounts.id'), nullable=True)
    department = Column(String(100))
    january = Column(Numeric(15,2), default=0)
    february = Column(Numeric(15,2), default=0)
    march = Column(Numeric(15,2), default=0)
    april = Column(Numeric(15,2), default=0)
    may = Column(Numeric(15,2), default=0)
    june = Column(Numeric(15,2), default=0)
    july = Column(Numeric(15,2), default=0)
    august = Column(Numeric(15,2), default=0)
    september = Column(Numeric(15,2), default=0)
    october = Column(Numeric(15,2), default=0)
    november = Column(Numeric(15,2), default=0)
    december = Column(Numeric(15,2), default=0)
    total_budget = Column(Numeric(15,2), default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
