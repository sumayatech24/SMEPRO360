"""
Audit Trail Utilities
Auto-populates created_by / updated_by on model save
"""
from datetime import datetime
from sqlalchemy.orm import Session


def set_audit_create(model_instance, user_id: int):
    """Call when creating a new record"""
    if hasattr(model_instance, 'created_by') and user_id:
        model_instance.created_by = user_id
    if hasattr(model_instance, 'updated_by') and user_id:
        model_instance.updated_by = user_id


def set_audit_update(model_instance, user_id: int):
    """Call when updating an existing record"""
    if hasattr(model_instance, 'updated_by') and user_id:
        model_instance.updated_by = user_id
    if hasattr(model_instance, 'updated_at'):
        model_instance.updated_at = datetime.utcnow()


def soft_delete(model_instance, user_id: int):
    """Soft delete — sets is_deleted=True instead of removing row"""
    if hasattr(model_instance, 'is_deleted'):
        model_instance.is_deleted = True
    if hasattr(model_instance, 'deleted_at'):
        model_instance.deleted_at = datetime.utcnow()
    if hasattr(model_instance, 'deleted_by'):
        model_instance.deleted_by = user_id


def get_audit_fields(model_instance) -> dict:
    """Extract audit fields for API response"""
    fields = {}
    for f in ['created_at', 'created_by', 'updated_at', 'updated_by']:
        val = getattr(model_instance, f, None)
        if val is not None:
            fields[f] = val.isoformat() if hasattr(val, 'isoformat') else val
    return fields
