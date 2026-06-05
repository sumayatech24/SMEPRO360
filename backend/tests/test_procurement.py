"""Tests for Procurement module — Vendors and Purchase Orders."""
import pytest


class TestVendors:
    def test_create_vendor(self, client, auth_headers):
        r = client.post("/api/v1/procurement/vendors", json={
            "company_name": "Test Supplies Co",
            "city": "Mumbai",
            "state": "Maharashtra",
            "gstin": "27AABCT9999A1ZZ",
            "credit_days": 30,
            "email": "supplies@test.com",
            "phone": "+91 9876543210",
        }, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["company_name"] == "Test Supplies Co"
        assert data["vendor_number"].startswith("VEN-")

    def test_list_vendors(self, client, auth_headers, sample_vendor):
        r = client.get("/api/v1/procurement/vendors", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()

    def test_get_vendor(self, client, auth_headers, sample_vendor):
        r = client.get(f"/api/v1/procurement/vendors/{sample_vendor['id']}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == sample_vendor["id"]

    def test_update_vendor(self, client, auth_headers, sample_vendor):
        r = client.put(f"/api/v1/procurement/vendors/{sample_vendor['id']}",
                       json={"credit_days": 45}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["credit_days"] == 45

    def test_vendor_search(self, client, auth_headers, sample_vendor):
        r = client.get("/api/v1/procurement/vendors?search=Test Vendor", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["total"] >= 1

    def test_export_vendors(self, client, auth_headers):
        r = client.get("/api/v1/procurement/vendors/export", headers=auth_headers)
        assert r.status_code == 200


class TestPurchaseOrders:
    def _create_po(self, client, auth_headers, vendor_id):
        return client.post("/api/v1/procurement/orders", json={
            "vendor_id": vendor_id,
            "expected_delivery": "2025-12-31",
            "payment_terms": "30 days",
            "notes": "Test PO",
            "items": [
                {"description": "Office Supplies", "quantity": 10, "unit": "pcs",
                 "unit_price": 500, "tax_percent": 18}
            ],
        }, headers=auth_headers)

    def test_create_purchase_order(self, client, auth_headers, sample_vendor):
        r = self._create_po(client, auth_headers, sample_vendor["id"])
        assert r.status_code == 200
        data = r.json()
        assert data["po_number"].startswith("PO-")
        assert data["vendor_id"] == sample_vendor["id"]
        assert data["total_amount"] > 0

    def test_list_purchase_orders(self, client, auth_headers, sample_vendor):
        self._create_po(client, auth_headers, sample_vendor["id"])
        r = client.get("/api/v1/procurement/orders", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()

    def test_approve_purchase_order(self, client, auth_headers, sample_vendor):
        po = self._create_po(client, auth_headers, sample_vendor["id"]).json()
        r = client.put(f"/api/v1/procurement/orders/{po['id']}", json={"status": "approved"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "approved"

    def test_delete_purchase_order(self, client, auth_headers, sample_vendor):
        po = self._create_po(client, auth_headers, sample_vendor["id"]).json()
        r = client.delete(f"/api/v1/procurement/orders/{po['id']}", headers=auth_headers)
        assert r.status_code == 200

    def test_po_with_multiple_items(self, client, auth_headers, sample_vendor):
        r = client.post("/api/v1/procurement/orders", json={
            "vendor_id": sample_vendor["id"],
            "payment_terms": "30 days",
            "items": [
                {"description": "Item A", "quantity": 5, "unit": "pcs", "unit_price": 1000, "tax_percent": 18},
                {"description": "Item B", "quantity": 3, "unit": "pcs", "unit_price": 2000, "tax_percent": 18},
            ],
        }, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["total_amount"] > 0
