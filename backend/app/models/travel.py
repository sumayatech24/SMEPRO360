"""
Travel Expense Module
- Multi-city travel with legs
- Expense types: taxi, food, hotel, fuel, toll, misc
- Weekend stay special approval
- Auto-escalation: high amount → manager's manager
- Per-project or general travel
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric, Date, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class TravelRequest(Base):
    """Master travel request — one per trip"""
    __tablename__ = "travel_requests"
    id              = Column(Integer, primary_key=True, index=True)
    request_number  = Column(String(30), unique=True, nullable=False)
    employee_id     = Column(Integer, ForeignKey("employees.id"), nullable=False)
    project_id      = Column(Integer, ForeignKey("projects.id"), nullable=True)
    # Trip details
    trip_purpose    = Column(String(300), nullable=False)
    trip_type       = Column(String(30), default="domestic")   # domestic|international
    from_city       = Column(String(100))
    to_city         = Column(String(100))      # final destination
    departure_date  = Column(Date, nullable=False)
    return_date     = Column(Date, nullable=False)
    total_days      = Column(Integer, default=1)
    has_weekend     = Column(Boolean, default=False)  # trip spans a weekend
    # Financial
    advance_requested = Column(Numeric(12,2), default=0)
    advance_paid      = Column(Numeric(12,2), default=0)
    total_claimed     = Column(Numeric(12,2), default=0)
    total_approved    = Column(Numeric(12,2), default=0)
    balance_payable   = Column(Numeric(12,2), default=0)  # approved - advance
    # Status
    status          = Column(String(30), default="draft")
    # draft|submitted|pending_l1|pending_l2|approved|rejected|paid|cancelled
    requires_l2_approval = Column(Boolean, default=False)   # high amount or weekend
    l2_reason       = Column(String(200))                    # why L2 needed
    # Approvals
    l1_approver_id  = Column(Integer, nullable=True)         # direct manager
    l2_approver_id  = Column(Integer, nullable=True)         # manager's manager
    l1_approved_at  = Column(DateTime(timezone=True), nullable=True)
    l2_approved_at  = Column(DateTime(timezone=True), nullable=True)
    l1_comments     = Column(Text)
    l2_comments     = Column(Text)
    finance_approved_at = Column(DateTime(timezone=True), nullable=True)
    finance_comments = Column(Text)
    paid_at         = Column(DateTime(timezone=True), nullable=True)
    paid_by         = Column(Integer, nullable=True)
    notes           = Column(Text)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    legs            = relationship("TravelLeg", back_populates="request", cascade="all, delete-orphan", order_by="TravelLeg.leg_order")
    expenses        = relationship("TravelExpenseItem", back_populates="request", cascade="all, delete-orphan")


class TravelLeg(Base):
    """Each city-to-city leg of the trip"""
    __tablename__ = "travel_legs"
    id              = Column(Integer, primary_key=True, index=True)
    request_id      = Column(Integer, ForeignKey("travel_requests.id"), nullable=False)
    leg_order       = Column(Integer, default=1)
    from_city       = Column(String(100), nullable=False)
    to_city         = Column(String(100), nullable=False)
    travel_date     = Column(Date, nullable=False)
    travel_mode     = Column(String(30), default="flight")    # flight|train|bus|car|self_drive
    class_type      = Column(String(20))                      # economy|business|ac_first|ac_2|ac_3|sleeper
    # Booking details
    booking_ref     = Column(String(100))
    ticket_amount   = Column(Numeric(10,2), default=0)
    # Stay at destination
    has_hotel_stay  = Column(Boolean, default=False)
    hotel_name      = Column(String(200))
    check_in_date   = Column(Date)
    check_out_date  = Column(Date)
    hotel_nights    = Column(Integer, default=0)
    hotel_per_night = Column(Numeric(10,2), default=0)
    hotel_total     = Column(Numeric(10,2), default=0)
    is_weekend_stay = Column(Boolean, default=False)    # stay covers Sat/Sun
    weekend_reason  = Column(Text)                      # business reason for weekend stay
    notes           = Column(String(300))
    request         = relationship("TravelRequest", back_populates="legs")


class TravelExpenseItem(Base):
    """Individual expense items — taxi, food, fuel, misc per day"""
    __tablename__ = "travel_expense_items"
    id              = Column(Integer, primary_key=True, index=True)
    request_id      = Column(Integer, ForeignKey("travel_requests.id"), nullable=False)
    leg_id          = Column(Integer, ForeignKey("travel_legs.id"), nullable=True)
    expense_date    = Column(Date, nullable=False)
    city            = Column(String(100))
    expense_type    = Column(String(40), nullable=False)
    # taxi|auto|cab|metro|food_breakfast|food_lunch|food_dinner|food_snacks|
    # hotel|fuel|toll|parking|internet|phone|laundry|tips|misc
    description     = Column(String(300))
    amount          = Column(Numeric(10,2), nullable=False)
    approved_amount = Column(Numeric(10,2))
    currency        = Column(String(10), default="INR")
    receipt_number  = Column(String(100))
    receipt_url     = Column(String(500))
    is_reimbursable = Column(Boolean, default=True)
    notes           = Column(String(200))
    request         = relationship("TravelRequest", back_populates="expenses")


# ── Travel Policy ─────────────────────────────────────────────────────────────

class TravelPolicy(Base):
    """Company travel policy — per grade/designation"""
    __tablename__ = "travel_policies"
    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(100), nullable=False)
    employee_grade  = Column(String(50), default="all")  # junior|senior|manager|director|all
    trip_type       = Column(String(20), default="domestic")
    # Per diem limits
    hotel_limit_per_night = Column(Numeric(10,2), default=3000)
    food_limit_per_day    = Column(Numeric(10,2), default=500)
    taxi_limit_per_day    = Column(Numeric(10,2), default=500)
    misc_limit_per_day    = Column(Numeric(10,2), default=200)
    # Travel class
    flight_class    = Column(String(20), default="economy")
    train_class     = Column(String(20), default="ac_2")
    # Approval thresholds
    l2_approval_threshold = Column(Numeric(10,2), default=15000)
    weekend_requires_l2   = Column(Boolean, default=True)
    advance_max_percent   = Column(Float, default=75.0)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
