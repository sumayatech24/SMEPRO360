"""
Add audit trail columns to ALL tables:
- created_by (user id)
- updated_by (user id)
- is_deleted (soft delete flag)
- deleted_at
- deleted_by
"""
from app.db.base import engine
from sqlalchemy import text, inspect

AUDIT_COLUMNS = [
    ("created_by", "INTEGER"),
    ("updated_by", "INTEGER"),
    ("is_deleted", "BOOLEAN DEFAULT FALSE"),
    ("deleted_at", "TIMESTAMPTZ"),
    ("deleted_by", "INTEGER"),
]

def get_all_tables():
    inspector = inspect(engine)
    return inspector.get_table_names()

def get_existing_columns(table):
    inspector = inspect(engine)
    return [c["name"] for c in inspector.get_columns(table)]

def add_audit_columns():
    tables = get_all_tables()
    print(f"Found {len(tables)} tables")
    total_added = 0

    with engine.connect() as conn:
        for table in sorted(tables):
            existing = get_existing_columns(table)
            for col_name, col_type in AUDIT_COLUMNS:
                if col_name not in existing:
                    try:
                        conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS {col_name} {col_type}'))
                        total_added += 1
                    except Exception as e:
                        print(f"  SKIP {table}.{col_name}: {str(e)[:60]}")
            conn.commit()

    print(f"Added {total_added} audit columns across {len(tables)} tables")

if __name__ == "__main__":
    add_audit_columns()
    print("Audit trail migration complete!")
