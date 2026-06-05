"""Tests for CRM module — Customers and Opportunities."""
import pytest


class TestCustomers:
    def test_create_customer(self, client, auth_headers):
        r = client.post("/api/v1/crm/customers", json={
            "company_name": "Acme Corp",
            "customer_type": "corporate",
            "industry": "Manufacturing",
            "city": "Pune",
            "state": "Maharashtra",
            "email": "acme@acme.com",
            "gstin": "27AABCA1234A1ZB",
            "credit_limit": 500000,
            "credit_days": 30,
        }, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["company_name"] == "Acme Corp"
        assert data["customer_number"].startswith("CUS-")

    def test_list_customers(self, client, auth_headers, sample_customer):
        r = client.get("/api/v1/crm/customers", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert "total" in data

    def test_get_customer(self, client, auth_headers, sample_customer):
        r = client.get(f"/api/v1/crm/customers/{sample_customer['id']}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == sample_customer["id"]

    def test_update_customer(self, client, auth_headers, sample_customer):
        r = client.put(f"/api/v1/crm/customers/{sample_customer['id']}",
                       json={"city": "Bengaluru", "credit_limit": 1000000}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["city"] == "Bengaluru"

    def test_customer_search(self, client, auth_headers, sample_customer):
        r = client.get("/api/v1/crm/customers?search=Test Company", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["total"] >= 1

    def test_customer_not_found(self, client, auth_headers):
        r = client.get("/api/v1/crm/customers/99999", headers=auth_headers)
        assert r.status_code == 404

    def test_delete_customer(self, client, auth_headers, sample_customer):
        r = client.delete(f"/api/v1/crm/customers/{sample_customer['id']}", headers=auth_headers)
        assert r.status_code == 200


class TestOpportunities:
    def test_create_opportunity(self, client, auth_headers, sample_customer):
        r = client.post("/api/v1/crm/opportunities", json={
            "customer_id": sample_customer["id"],
            "name": "ERP Implementation Deal",
            "stage": "proposal",
            "expected_revenue": 1000000,
            "probability": 60,
        }, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "ERP Implementation Deal"
        assert data["stage"] == "proposal"

    def test_list_opportunities(self, client, auth_headers):
        r = client.get("/api/v1/crm/opportunities", headers=auth_headers)
        assert r.status_code == 200

    def test_opportunity_pipeline(self, client, auth_headers, sample_customer):
        stages = ["prospecting","qualification","proposal","negotiation","closed_won"]
        for stage in stages:
            r = client.post("/api/v1/crm/opportunities", json={
                "customer_id": sample_customer["id"],
                "name": f"Opp in {stage}",
                "stage": stage,
                "expected_revenue": 500000,
                "probability": 50,
            }, headers=auth_headers)
            assert r.status_code == 200
