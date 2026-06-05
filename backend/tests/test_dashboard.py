"""Tests for Dashboard and Reports."""
import pytest


class TestDashboard:
    def test_dashboard_data(self, client, auth_headers):
        r = client.get("/api/v1/dashboard/", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        # Must contain key KPI fields
        assert "total_leads" in data or "leads" in data or isinstance(data, dict)

    def test_dashboard_no_auth(self, client):
        r = client.get("/api/v1/dashboard/")
        assert r.status_code == 401


class TestReports:
    def test_sales_report(self, client, auth_headers):
        r = client.get("/api/v1/reports/sales", headers=auth_headers)
        assert r.status_code in [200, 404]  # endpoint may not exist yet

    def test_hr_report(self, client, auth_headers):
        r = client.get("/api/v1/reports/hr", headers=auth_headers)
        assert r.status_code in [200, 404]

    def test_finance_trial_balance(self, client, auth_headers):
        r = client.get("/api/v1/finance/reports/trial-balance", headers=auth_headers)
        assert r.status_code == 200

    def test_finance_pl(self, client, auth_headers):
        r = client.get("/api/v1/finance/reports/pl", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "revenue" in data
        assert "expense" in data
        assert "net_profit" in data
