"""Tests for Inventory module — Products."""
import pytest


class TestProducts:
    def _create_product(self, client, auth_headers, **overrides):
        payload = {
            "name": "Test Product",
            "sku": f"TST{id(overrides) % 100000:05d}",
            "product_type": "finished",
            "unit": "nos",
            "cost_price": 1000,
            "selling_price": 1500,
            "tax_percent": 18,
            "reorder_level": 10,
            **overrides,
        }
        return client.post("/api/v1/inventory/products", json=payload, headers=auth_headers)

    def test_create_product(self, client, auth_headers):
        r = self._create_product(client, auth_headers, sku="PROD001", name="Dell Laptop")
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Dell Laptop"
        assert data["sku"] == "PROD001"
        assert data["selling_price"] == 1500
        assert data["tax_percent"] == 18

    def test_list_products(self, client, auth_headers):
        self._create_product(client, auth_headers, sku="LIST001")
        r = client.get("/api/v1/inventory/products", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert len(data["items"]) >= 1

    def test_get_product(self, client, auth_headers):
        created = self._create_product(client, auth_headers, sku="GET001").json()
        r = client.get(f"/api/v1/inventory/products/{created['id']}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == created["id"]

    def test_update_product(self, client, auth_headers):
        created = self._create_product(client, auth_headers, sku="UPD001").json()
        r = client.put(f"/api/v1/inventory/products/{created['id']}",
                       json={"selling_price": 2000, "reorder_level": 20}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["selling_price"] == 2000

    def test_product_not_found(self, client, auth_headers):
        r = client.get("/api/v1/inventory/products/99999", headers=auth_headers)
        assert r.status_code == 404

    def test_product_search(self, client, auth_headers):
        self._create_product(client, auth_headers, sku="SRCH001", name="Searchable Product XYZ123")
        r = client.get("/api/v1/inventory/products?search=XYZ123", headers=auth_headers)
        assert r.status_code == 200

    def test_delete_product(self, client, auth_headers):
        created = self._create_product(client, auth_headers, sku="DEL001").json()
        r = client.delete(f"/api/v1/inventory/products/{created['id']}", headers=auth_headers)
        assert r.status_code == 200

    def test_product_price_relation(self, client, auth_headers):
        r = self._create_product(client, auth_headers, sku="PRC001", cost_price=800, selling_price=1200)
        assert r.status_code == 200
        data = r.json()
        assert data["selling_price"] > data["cost_price"]

    def test_product_tax_rates(self, client, auth_headers):
        """Test various GST rates."""
        for gst, sku in [(5, "TAX005"), (12, "TAX012"), (18, "TAX018"), (28, "TAX028")]:
            r = self._create_product(client, auth_headers, sku=sku, tax_percent=gst)
            assert r.status_code == 200
            assert r.json()["tax_percent"] == gst
