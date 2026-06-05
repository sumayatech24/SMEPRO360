"""Tests for Lead Management module."""
import pytest


class TestLeadCRUD:
    def _create_lead(self, client, auth_headers, **overrides):
        payload = {
            "first_name": "Rajesh",
            "last_name": "Kumar",
            "email": "rajesh.kumar@test.com",
            "phone": "+91 9876543210",
            "company": "TestCorp",
            "status": "new",
            "source": "website",
            "priority": "medium",
            **overrides,
        }
        return client.post("/api/v1/leads/", json=payload, headers=auth_headers)

    def test_create_lead(self, client, auth_headers):
        r = self._create_lead(client, auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["first_name"] == "Rajesh"
        assert data["last_name"] == "Kumar"
        assert data["status"] == "new"
        assert "lead_number" in data
        assert data["lead_number"].startswith("LD-")

    def test_list_leads(self, client, auth_headers):
        self._create_lead(client, auth_headers)
        r = client.get("/api/v1/leads/", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) >= 1

    def test_get_lead_by_id(self, client, auth_headers):
        created = self._create_lead(client, auth_headers).json()
        r = client.get(f"/api/v1/leads/{created['id']}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == created["id"]

    def test_update_lead(self, client, auth_headers):
        created = self._create_lead(client, auth_headers).json()
        r = client.put(f"/api/v1/leads/{created['id']}", json={"status": "qualified", "priority": "high"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "qualified"
        assert r.json()["priority"] == "high"

    def test_delete_lead_soft(self, client, auth_headers):
        created = self._create_lead(client, auth_headers).json()
        r = client.delete(f"/api/v1/leads/{created['id']}", headers=auth_headers)
        assert r.status_code == 200
        # Verify it's soft-deleted (not in list)
        list_r = client.get("/api/v1/leads/", headers=auth_headers)
        ids = [item["id"] for item in list_r.json()["items"]]
        assert created["id"] not in ids

    def test_lead_not_found(self, client, auth_headers):
        r = client.get("/api/v1/leads/99999", headers=auth_headers)
        assert r.status_code == 404

    def test_lead_search(self, client, auth_headers):
        self._create_lead(client, auth_headers, first_name="UniqueNameXYZ")
        r = client.get("/api/v1/leads/?search=UniqueNameXYZ", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["total"] >= 1

    def test_lead_filter_by_status(self, client, auth_headers):
        self._create_lead(client, auth_headers, status="won")
        r = client.get("/api/v1/leads/?status=won", headers=auth_headers)
        assert r.status_code == 200
        for item in r.json()["items"]:
            assert item["status"] == "won"

    def test_lead_stats(self, client, auth_headers):
        self._create_lead(client, auth_headers)
        r = client.get("/api/v1/leads/stats", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        assert "by_status" in data
        assert "by_source" in data

    def test_convert_lead_to_customer(self, client, auth_headers):
        lead = self._create_lead(client, auth_headers, company="ConversionCo").json()
        r = client.post(f"/api/v1/leads/{lead['id']}/convert", headers=auth_headers)
        assert r.status_code == 200
        assert "customer_id" in r.json()

    def test_lead_pagination(self, client, auth_headers):
        for i in range(5):
            self._create_lead(client, auth_headers, email=f"test{i}@pagination.com")
        r = client.get("/api/v1/leads/?skip=0&limit=2", headers=auth_headers)
        assert r.status_code == 200
        assert len(r.json()["items"]) <= 2

    def test_lead_number_unique(self, client, auth_headers):
        l1 = self._create_lead(client, auth_headers, email="a@test.com").json()
        l2 = self._create_lead(client, auth_headers, email="b@test.com").json()
        assert l1["lead_number"] != l2["lead_number"]
