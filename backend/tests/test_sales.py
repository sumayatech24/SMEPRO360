"""Tests for Sales module — Orders, Invoices, Payments."""
import pytest


class TestSalesOrders:
    def _create_order(self, client, auth_headers, customer_id):
        return client.post("/api/v1/sales/orders", json={
            "customer_id": customer_id,
            "delivery_date": "2025-12-31",
            "payment_terms": "30 days",
            "notes": "Test order",
            "items": [
                {"description": "Laptop", "quantity": 2, "unit": "pcs",
                 "unit_price": 50000, "discount_percent": 0, "tax_percent": 18}
            ],
        }, headers=auth_headers)

    def test_create_order(self, client, auth_headers, sample_customer):
        r = self._create_order(client, auth_headers, sample_customer["id"])
        assert r.status_code == 200
        data = r.json()
        assert data["order_number"].startswith("SO-")
        assert data["customer_id"] == sample_customer["id"]
        # 2 * 50000 = 100000 subtotal + 18000 tax = 118000
        assert abs(data["total_amount"] - 118000) < 1

    def test_list_orders(self, client, auth_headers, sample_customer):
        self._create_order(client, auth_headers, sample_customer["id"])
        r = client.get("/api/v1/sales/orders", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()

    def test_get_order(self, client, auth_headers, sample_customer):
        created = self._create_order(client, auth_headers, sample_customer["id"]).json()
        r = client.get(f"/api/v1/sales/orders/{created['id']}", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert len(data["items"]) == 1

    def test_update_order_status(self, client, auth_headers, sample_customer):
        created = self._create_order(client, auth_headers, sample_customer["id"]).json()
        r = client.put(f"/api/v1/sales/orders/{created['id']}", json={"status": "confirmed"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "confirmed"

    def test_order_with_discount(self, client, auth_headers, sample_customer):
        r = client.post("/api/v1/sales/orders", json={
            "customer_id": sample_customer["id"],
            "items": [{"description": "Product", "quantity": 10, "unit": "pcs",
                       "unit_price": 1000, "discount_percent": 10, "tax_percent": 18}],
        }, headers=auth_headers)
        assert r.status_code == 200
        # 10 * 1000 * 0.9 = 9000 subtotal + 1620 tax = 10620
        assert abs(r.json()["total_amount"] - 10620) < 1

    def test_order_stats(self, client, auth_headers, sample_customer):
        self._create_order(client, auth_headers, sample_customer["id"])
        r = client.get("/api/v1/sales/orders/stats", headers=auth_headers)
        assert r.status_code == 200
        assert "total" in r.json()

    def test_delete_order(self, client, auth_headers, sample_customer):
        created = self._create_order(client, auth_headers, sample_customer["id"]).json()
        r = client.delete(f"/api/v1/sales/orders/{created['id']}", headers=auth_headers)
        assert r.status_code == 200


class TestInvoices:
    def _create_invoice(self, client, auth_headers, customer_id):
        return client.post("/api/v1/sales/invoices", json={
            "customer_id": customer_id,
            "due_date": "2025-12-31",
            "notes": "Test invoice",
            "items": [
                {"description": "Consulting Services", "quantity": 5, "unit": "days",
                 "unit_price": 10000, "discount_percent": 0, "tax_percent": 18}
            ],
        }, headers=auth_headers)

    def test_create_invoice(self, client, auth_headers, sample_customer):
        r = self._create_invoice(client, auth_headers, sample_customer["id"])
        assert r.status_code == 200
        data = r.json()
        assert data["invoice_number"].startswith("INV-")
        # 5 * 10000 = 50000 + 9000 = 59000
        assert abs(data["total_amount"] - 59000) < 1
        assert data["balance_due"] == data["total_amount"]

    def test_list_invoices(self, client, auth_headers, sample_customer):
        self._create_invoice(client, auth_headers, sample_customer["id"])
        r = client.get("/api/v1/sales/invoices", headers=auth_headers)
        assert r.status_code == 200
        assert len(r.json()["items"]) >= 1

    def test_invoice_status_update(self, client, auth_headers, sample_customer):
        inv = self._create_invoice(client, auth_headers, sample_customer["id"]).json()
        r = client.put(f"/api/v1/sales/invoices/{inv['id']}", json={"status": "sent"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "sent"


class TestPayments:
    def test_record_payment_full(self, client, auth_headers, sample_customer):
        # Create invoice first
        inv_r = client.post("/api/v1/sales/invoices", json={
            "customer_id": sample_customer["id"],
            "items": [{"description": "Service", "quantity": 1, "unit": "nos",
                       "unit_price": 50000, "discount_percent": 0, "tax_percent": 18}],
        }, headers=auth_headers)
        assert inv_r.status_code == 200
        inv = inv_r.json()

        # Record full payment
        pay_r = client.post("/api/v1/sales/payments", json={
            "invoice_id": inv["id"],
            "customer_id": sample_customer["id"],
            "amount": inv["total_amount"],
            "payment_mode": "bank_transfer",
            "reference_number": "TXN123456",
        }, headers=auth_headers)
        assert pay_r.status_code == 200
        assert "payment_number" in pay_r.json()

    def test_list_payments(self, client, auth_headers):
        r = client.get("/api/v1/sales/payments", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()
