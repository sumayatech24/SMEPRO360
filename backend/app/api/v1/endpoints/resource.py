"""
Resource Management & Allocation API
- People allocation to projects
- Item (inventory) allocation to projects/people
- Return workflow for reusable items
- Stock movements and alerts
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from app.db.base import get_db
from app.models.resource import ResourceAllocation, ItemAllocation, StockReturn, StockAlert
from app.models.inventory import Product, Warehouse, StockLevel, StockMovement
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────────────────────────

class ResourceAllocationCreate(BaseModel):
    project_id: int
    employee_id: int
    role: Optional[str] = None
    allocation_percent: float = 100
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    hourly_rate: float = 0
    notes: Optional[str] = None

class ItemAllocationCreate(BaseModel):
    product_id: int
    warehouse_id: Optional[int] = None
    project_id: Optional[int] = None
    employee_id: Optional[int] = None
    item_type: str = "consumable"
    quantity_allocated: float
    unit: str = "pcs"
    expected_return_date: Optional[str] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None
    condition_out: str = "good"

class StockReturnCreate(BaseModel):
    allocation_id: int
    quantity_returned: float
    condition: str = "good"
    notes: Optional[str] = None
    warehouse_id: Optional[int] = None

class StockAdjustCreate(BaseModel):
    product_id: int
    warehouse_id: int
    quantity: float
    movement_type: str = "adjustment"
    reference_type: Optional[str] = "manual"
    notes: Optional[str] = None

# ── People Resource Allocation ────────────────────────────────────────────────

@router.get("/people")
async def list_resource_allocations(project_id: Optional[int] = None,
                                     employee_id: Optional[int] = None,
                                     db: Session = Depends(get_db),
                                     current_user: User = Depends(get_current_user)):
    q = db.query(ResourceAllocation)
    if project_id: q = q.filter(ResourceAllocation.project_id == project_id)
    if employee_id: q = q.filter(ResourceAllocation.employee_id == employee_id)
    items = q.order_by(ResourceAllocation.created_at.desc()).all()
    return [{"id": a.id, "project_id": a.project_id, "employee_id": a.employee_id,
             "role": a.role, "allocation_percent": a.allocation_percent,
             "start_date": str(a.start_date) if a.start_date else None,
             "end_date": str(a.end_date) if a.end_date else None,
             "hourly_rate": float(a.hourly_rate or 0), "status": a.status,
             "notes": a.notes} for a in items]

@router.post("/people")
async def create_resource_allocation(data: ResourceAllocationCreate,
                                      db: Session = Depends(get_db),
                                      current_user: User = Depends(get_current_user)):
    d = data.dict()
    if d.get("start_date"): d["start_date"] = datetime.strptime(d["start_date"], "%Y-%m-%d")
    if d.get("end_date"): d["end_date"] = datetime.strptime(d["end_date"], "%Y-%m-%d")
    a = ResourceAllocation(**d, allocated_by=current_user.id)
    db.add(a); db.commit(); db.refresh(a)
    return {"id": a.id, "message": "Resource allocated"}

@router.put("/people/{alloc_id}")
async def update_resource_allocation(alloc_id: int, data: dict,
                                      db: Session = Depends(get_db),
                                      current_user: User = Depends(get_current_user)):
    a = db.query(ResourceAllocation).filter(ResourceAllocation.id == alloc_id).first()
    if not a: raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(a, k): setattr(a, k, v)
    db.commit(); return {"id": a.id, "status": a.status}

@router.delete("/people/{alloc_id}")
async def delete_resource_allocation(alloc_id: int, db: Session = Depends(get_db),
                                      current_user: User = Depends(get_current_user)):
    a = db.query(ResourceAllocation).filter(ResourceAllocation.id == alloc_id).first()
    if not a: raise HTTPException(404, "Not found")
    db.delete(a); db.commit()
    return {"message": "Allocation removed"}

# ── Item Allocation ────────────────────────────────────────────────────────────

def alloc_dict(a: ItemAllocation):
    return {
        "id": a.id, "allocation_number": a.allocation_number,
        "product_id": a.product_id, "warehouse_id": a.warehouse_id,
        "project_id": a.project_id, "employee_id": a.employee_id,
        "item_type": a.item_type,
        "quantity_allocated": a.quantity_allocated,
        "quantity_returned": a.quantity_returned,
        "quantity_consumed": a.quantity_consumed,
        "quantity_outstanding": max(0, a.quantity_allocated - a.quantity_returned - a.quantity_consumed),
        "unit": a.unit, "status": a.status,
        "allocation_date": a.allocation_date.isoformat() if a.allocation_date else None,
        "expected_return_date": str(a.expected_return_date) if a.expected_return_date else None,
        "actual_return_date": str(a.actual_return_date) if a.actual_return_date else None,
        "purpose": a.purpose, "notes": a.notes,
        "condition_out": a.condition_out, "condition_in": a.condition_in,
        "unit_cost": float(a.unit_cost or 0), "total_cost": float(a.total_cost or 0),
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }

@router.get("/items")
async def list_item_allocations(project_id: Optional[int] = None,
                                 employee_id: Optional[int] = None,
                                 status: Optional[str] = None,
                                 item_type: Optional[str] = None,
                                 db: Session = Depends(get_db),
                                 current_user: User = Depends(get_current_user)):
    q = db.query(ItemAllocation)
    if project_id: q = q.filter(ItemAllocation.project_id == project_id)
    if employee_id: q = q.filter(ItemAllocation.employee_id == employee_id)
    if status: q = q.filter(ItemAllocation.status == status)
    if item_type: q = q.filter(ItemAllocation.item_type == item_type)
    total = q.count()
    items = q.order_by(ItemAllocation.created_at.desc()).limit(100).all()
    return {"total": total, "items": [alloc_dict(a) for a in items]}

@router.post("/items")
async def create_item_allocation(data: ItemAllocationCreate,
                                  db: Session = Depends(get_db),
                                  current_user: User = Depends(get_current_user)):
    # Check stock availability
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product: raise HTTPException(404, "Product not found")

    if data.warehouse_id:
        stock = db.query(StockLevel).filter(
            StockLevel.product_id == data.product_id,
            StockLevel.warehouse_id == data.warehouse_id
        ).first()
        if stock and stock.quantity_available < data.quantity_allocated:
            raise HTTPException(400, f"Insufficient stock. Available: {stock.quantity_available}")

    count = db.query(func.count(ItemAllocation.id)).scalar()
    d = data.dict()
    if d.get("expected_return_date"):
        d["expected_return_date"] = datetime.strptime(d["expected_return_date"], "%Y-%m-%d")

    alloc = ItemAllocation(
        **d,
        allocation_number=f"ALLOC-{(count or 0)+1:05d}",
        issued_by=current_user.id,
        unit_cost=float(product.cost_price or 0),
        total_cost=float(product.cost_price or 0) * data.quantity_allocated,
        unit=data.unit or product.unit
    )
    db.add(alloc)

    # Deduct from stock
    if data.warehouse_id:
        stock = db.query(StockLevel).filter(
            StockLevel.product_id == data.product_id,
            StockLevel.warehouse_id == data.warehouse_id
        ).first()
        if stock:
            stock.quantity_reserved += data.quantity_allocated
            stock.quantity_available = max(0, stock.quantity_on_hand - stock.quantity_reserved)

    # Create stock movement
    mv_count = db.query(func.count(StockMovement.id)).scalar()
    movement = StockMovement(
        movement_number=f"SM-{(mv_count or 0)+1:06d}",
        product_id=data.product_id,
        warehouse_id=data.warehouse_id or 1,
        movement_type="out",
        reference_type="allocation",
        quantity=data.quantity_allocated,
        unit_cost=float(product.cost_price or 0),
        total_cost=float(product.cost_price or 0) * data.quantity_allocated,
        notes=f"Allocated: {data.purpose or 'Project/Employee allocation'}",
        created_by=current_user.id
    )
    db.add(movement)
    db.commit(); db.refresh(alloc)
    return alloc_dict(alloc)

@router.get("/items/{alloc_id}")
async def get_item_allocation(alloc_id: int, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    a = db.query(ItemAllocation).filter(ItemAllocation.id == alloc_id).first()
    if not a: raise HTTPException(404, "Not found")
    d = alloc_dict(a)
    d["returns"] = [{"id": r.id, "return_number": r.return_number,
                     "quantity_returned": r.quantity_returned, "condition": r.condition,
                     "return_date": r.return_date.isoformat() if r.return_date else None,
                     "notes": r.notes} for r in a.returns]
    return d

# ── Stock Return ───────────────────────────────────────────────────────────────

@router.post("/returns")
async def process_return(data: StockReturnCreate, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    alloc = db.query(ItemAllocation).filter(ItemAllocation.id == data.allocation_id).first()
    if not alloc: raise HTTPException(404, "Allocation not found")

    outstanding = alloc.quantity_allocated - alloc.quantity_returned - alloc.quantity_consumed
    if data.quantity_returned > outstanding:
        raise HTTPException(400, f"Cannot return {data.quantity_returned}. Outstanding: {outstanding}")

    count = db.query(func.count(StockReturn.id)).scalar()
    ret = StockReturn(
        return_number=f"RET-{(count or 0)+1:05d}",
        allocation_id=alloc.id,
        product_id=alloc.product_id,
        warehouse_id=data.warehouse_id or alloc.warehouse_id,
        quantity_returned=data.quantity_returned,
        condition=data.condition,
        notes=data.notes,
        received_by=current_user.id
    )
    db.add(ret)

    # Update allocation
    alloc.quantity_returned += data.quantity_returned
    if alloc.quantity_returned >= alloc.quantity_allocated - alloc.quantity_consumed:
        alloc.status = "fully_returned"
        alloc.actual_return_date = datetime.utcnow()
    else:
        alloc.status = "partially_returned"
    alloc.condition_in = data.condition

    # Return to stock (only if condition is good/acceptable)
    wh_id = data.warehouse_id or alloc.warehouse_id
    if wh_id and data.condition in ["good", "fair"]:
        stock = db.query(StockLevel).filter(
            StockLevel.product_id == alloc.product_id,
            StockLevel.warehouse_id == wh_id
        ).first()
        if stock:
            stock.quantity_reserved = max(0, stock.quantity_reserved - data.quantity_returned)
            stock.quantity_available = stock.quantity_on_hand - stock.quantity_reserved

    # Stock movement
    mv_count = db.query(func.count(StockMovement.id)).scalar()
    db.add(StockMovement(
        movement_number=f"SM-{(mv_count or 0)+1:06d}",
        product_id=alloc.product_id,
        warehouse_id=wh_id or 1,
        movement_type="in",
        reference_type="return",
        quantity=data.quantity_returned,
        notes=f"Return from allocation {alloc.allocation_number} — {data.condition}",
        created_by=current_user.id
    ))

    db.commit()
    return {"message": "Return processed", "return_number": ret.return_number,
            "remaining_outstanding": max(0, outstanding - data.quantity_returned)}

@router.get("/returns")
async def list_returns(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    returns = db.query(StockReturn).order_by(StockReturn.created_at.desc()).limit(100).all()
    return [{"id": r.id, "return_number": r.return_number, "allocation_id": r.allocation_id,
             "product_id": r.product_id, "quantity_returned": r.quantity_returned,
             "condition": r.condition, "return_date": r.return_date.isoformat() if r.return_date else None,
             "notes": r.notes} for r in returns]

# ── Stock Movements ────────────────────────────────────────────────────────────

@router.get("/movements")
async def list_stock_movements(product_id: Optional[int] = None,
                                warehouse_id: Optional[int] = None,
                                movement_type: Optional[str] = None,
                                limit: int = 100,
                                db: Session = Depends(get_db),
                                current_user: User = Depends(get_current_user)):
    q = db.query(StockMovement)
    if product_id: q = q.filter(StockMovement.product_id == product_id)
    if warehouse_id: q = q.filter(StockMovement.warehouse_id == warehouse_id)
    if movement_type: q = q.filter(StockMovement.movement_type == movement_type)
    total = q.count()
    items = q.order_by(StockMovement.created_at.desc()).limit(limit).all()
    return {"total": total, "items": [
        {"id": m.id, "movement_number": m.movement_number, "product_id": m.product_id,
         "warehouse_id": m.warehouse_id, "movement_type": m.movement_type,
         "reference_type": m.reference_type, "reference_id": m.reference_id,
         "quantity": m.quantity, "unit_cost": float(m.unit_cost or 0),
         "total_cost": float(m.total_cost or 0), "notes": m.notes,
         "created_at": m.created_at.isoformat() if m.created_at else None} for m in items
    ]}

@router.post("/movements/adjust")
async def adjust_stock(data: StockAdjustCreate, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product: raise HTTPException(404, "Product not found")

    stock = db.query(StockLevel).filter(
        StockLevel.product_id == data.product_id,
        StockLevel.warehouse_id == data.warehouse_id
    ).first()
    if not stock:
        stock = StockLevel(product_id=data.product_id, warehouse_id=data.warehouse_id,
                           quantity_on_hand=0, quantity_reserved=0, quantity_available=0)
        db.add(stock)

    old_qty = stock.quantity_on_hand
    stock.quantity_on_hand = max(0, data.quantity)
    stock.quantity_available = max(0, stock.quantity_on_hand - stock.quantity_reserved)

    mv_count = db.query(func.count(StockMovement.id)).scalar()
    diff = data.quantity - old_qty
    db.add(StockMovement(
        movement_number=f"SM-{(mv_count or 0)+1:06d}",
        product_id=data.product_id, warehouse_id=data.warehouse_id,
        movement_type=data.movement_type,
        reference_type=data.reference_type or "manual",
        quantity=abs(diff),
        notes=data.notes or f"Stock adjustment: {old_qty} → {data.quantity}",
        created_by=current_user.id
    ))
    db.commit()
    return {"message": "Stock adjusted", "old_quantity": old_qty,
            "new_quantity": data.quantity, "difference": diff}

# ── Stock Alerts ───────────────────────────────────────────────────────────────

@router.get("/alerts")
async def get_stock_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns current stock alerts based on reorder levels"""
    from app.models.inventory import Product, StockLevel
    products = db.query(Product).filter(Product.is_active == True, Product.reorder_level > 0).all()
    alerts = []
    for p in products:
        total_available = sum(s.quantity_available for s in p.stock_levels)
        total_on_hand = sum(s.quantity_on_hand for s in p.stock_levels)
        if total_available <= 0:
            alerts.append({
                "product_id": p.id, "sku": p.sku, "name": p.name, "unit": p.unit,
                "alert_type": "out_of_stock", "severity": "critical",
                "current_stock": total_available, "reorder_level": p.reorder_level,
                "reorder_quantity": p.reorder_quantity or p.reorder_level * 2,
            })
        elif total_available <= p.reorder_level:
            alerts.append({
                "product_id": p.id, "sku": p.sku, "name": p.name, "unit": p.unit,
                "alert_type": "low_stock", "severity": "warning",
                "current_stock": total_available, "reorder_level": p.reorder_level,
                "reorder_quantity": p.reorder_quantity or p.reorder_level * 2,
            })

    return {"total_alerts": len(alerts), "critical": len([a for a in alerts if a["severity"]=="critical"]),
            "warning": len([a for a in alerts if a["severity"]=="warning"]),
            "alerts": sorted(alerts, key=lambda x: (0 if x["severity"]=="critical" else 1, x["name"]))}

# ── Inventory Dashboard ────────────────────────────────────────────────────────

@router.get("/inventory/dashboard")
async def inventory_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar()
    total_stock_value = db.query(func.sum(StockLevel.quantity_on_hand * Product.cost_price))\
        .join(Product, StockLevel.product_id == Product.id).scalar() or 0

    # Stock by status
    products = db.query(Product).filter(Product.is_active == True).all()
    in_stock = low_stock = out_of_stock = 0
    for p in products:
        avail = sum(s.quantity_available for s in p.stock_levels)
        if avail <= 0: out_of_stock += 1
        elif avail <= p.reorder_level: low_stock += 1
        else: in_stock += 1

    # Recent movements
    recent_movements = db.query(StockMovement).order_by(StockMovement.created_at.desc()).limit(10).all()

    # Active allocations
    active_allocs = db.query(func.count(ItemAllocation.id)).filter(
        ItemAllocation.status.in_(["issued", "partially_returned"])
    ).scalar()

    return {
        "total_products": total_products,
        "total_stock_value": float(total_stock_value),
        "in_stock": in_stock, "low_stock": low_stock, "out_of_stock": out_of_stock,
        "active_allocations": active_allocs or 0,
        "recent_movements": [
            {"id": m.id, "movement_number": m.movement_number,
             "product_id": m.product_id, "movement_type": m.movement_type,
             "quantity": m.quantity, "created_at": m.created_at.isoformat() if m.created_at else None}
            for m in recent_movements
        ]
    }
