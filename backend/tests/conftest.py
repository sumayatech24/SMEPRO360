"""
Test configuration and fixtures for SMEPRO360 backend tests.
Uses an in-memory SQLite database so tests are fast and isolated.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base, get_db
from app.models import *  # noqa: ensure all models are registered
from app.db.init_db import init_db

# ── In-memory test database ───────────────────────────────────────────────────
TEST_DB_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables once for the test session."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    """Per-test DB session that rolls back after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    """Test client with DB override."""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client):
    """Login and return Authorization headers."""
    resp = client.post("/api/v1/auth/login", json={
        "email": "admin@smepro360.com",
        "password": "Admin@123456",
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def sample_customer(client, auth_headers):
    """Create and return a sample customer."""
    r = client.post("/api/v1/crm/customers", json={
        "company_name": "Test Company Ltd",
        "customer_type": "corporate",
        "industry": "IT",
        "city": "Mumbai",
        "state": "Maharashtra",
        "email": "test@testcompany.com",
        "phone": "+91 9876543210",
        "gstin": "27AABCT1234A1ZB",
        "credit_limit": 500000,
        "credit_days": 30,
    }, headers=auth_headers)
    assert r.status_code == 200
    return r.json()


@pytest.fixture()
def sample_employee(client, auth_headers):
    """Create and return a sample employee."""
    r = client.post("/api/v1/hr/employees", json={
        "first_name": "Test",
        "last_name": "Employee",
        "email": "test.employee@smepro360.com",
        "phone": "+91 9876543211",
        "employment_type": "full_time",
        "basic_salary": 50000,
        "hra": 20000,
        "other_allowances": 5000,
    }, headers=auth_headers)
    assert r.status_code == 200
    return r.json()


@pytest.fixture()
def sample_vendor(client, auth_headers):
    """Create and return a sample vendor."""
    r = client.post("/api/v1/procurement/vendors", json={
        "company_name": "Test Vendor Pvt Ltd",
        "city": "Delhi",
        "state": "Delhi",
        "gstin": "07AABCT1234A1ZB",
        "credit_days": 30,
        "email": "vendor@test.com",
        "phone": "+91 9876543212",
    }, headers=auth_headers)
    assert r.status_code == 200
    return r.json()


@pytest.fixture()
def sample_product(client, auth_headers):
    """Create and return a sample product."""
    r = client.post("/api/v1/inventory/products", json={
        "name": "Test Product",
        "sku": "TST001",
        "category": "Electronics",
        "cost_price": 1000,
        "selling_price": 1500,
        "gst_rate": 18,
        "unit": "pcs",
        "reorder_level": 10,
    }, headers=auth_headers)
    assert r.status_code == 200
    return r.json()
