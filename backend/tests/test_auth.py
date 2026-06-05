"""Tests for authentication endpoints."""
import pytest


class TestLogin:
    def test_login_success(self, client):
        r = client.post("/api/v1/auth/login", json={
            "email": "admin@smepro360.com",
            "password": "Admin@123456",
        })
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == "admin@smepro360.com"

    def test_login_wrong_password(self, client):
        r = client.post("/api/v1/auth/login", json={
            "email": "admin@smepro360.com",
            "password": "wrongpassword",
        })
        assert r.status_code == 401

    def test_login_wrong_email(self, client):
        r = client.post("/api/v1/auth/login", json={
            "email": "nobody@nowhere.com",
            "password": "Admin@123456",
        })
        assert r.status_code == 401

    def test_login_missing_fields(self, client):
        r = client.post("/api/v1/auth/login", json={"email": "admin@smepro360.com"})
        assert r.status_code == 422  # Validation error

    def test_protected_endpoint_without_token(self, client):
        r = client.get("/api/v1/leads/")
        assert r.status_code == 401

    def test_protected_endpoint_with_token(self, client, auth_headers):
        r = client.get("/api/v1/leads/", headers=auth_headers)
        assert r.status_code == 200

    def test_protected_endpoint_invalid_token(self, client):
        r = client.get("/api/v1/leads/", headers={"Authorization": "Bearer invalidtoken123"})
        assert r.status_code == 401

    def test_me_endpoint(self, client, auth_headers):
        r = client.get("/api/v1/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == "admin@smepro360.com"


class TestRegister:
    def test_register_new_user(self, client, auth_headers):
        r = client.post("/api/v1/auth/register", json={
            "email": "newuser@smepro360.com",
            "password": "NewPass@123",
            "full_name": "New User",
        }, headers=auth_headers)
        # Either 200 or 400 (duplicate) is acceptable
        assert r.status_code in [200, 400]

    def test_register_duplicate_email(self, client, auth_headers):
        r = client.post("/api/v1/auth/register", json={
            "email": "admin@smepro360.com",
            "password": "Admin@123456",
            "full_name": "Duplicate",
        }, headers=auth_headers)
        assert r.status_code == 400
