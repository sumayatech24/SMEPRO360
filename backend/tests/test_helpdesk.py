"""Tests for Helpdesk module — Tickets."""
import pytest


class TestTickets:
    def _create_ticket(self, client, auth_headers, **overrides):
        payload = {
            "subject": "Test Issue Title",
            "description": "This is a test issue description",
            "priority": "medium",
            "ticket_type": "incident",
            "category": "support",
            **overrides,
        }
        return client.post("/api/v1/helpdesk/tickets", json=payload, headers=auth_headers)

    def test_create_ticket(self, client, auth_headers):
        r = self._create_ticket(client, auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["subject"] == "Test Issue Title"
        assert data["status"] == "open"
        assert "ticket_number" in data
        assert data["ticket_number"].startswith("TKT-")

    def test_create_critical_ticket(self, client, auth_headers):
        r = self._create_ticket(client, auth_headers, priority="critical", subject="CRITICAL: System Down")
        assert r.status_code == 200
        assert r.json()["priority"] == "critical"

    def test_list_tickets(self, client, auth_headers):
        self._create_ticket(client, auth_headers)
        r = client.get("/api/v1/helpdesk/tickets", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data

    def test_get_ticket(self, client, auth_headers):
        ticket = self._create_ticket(client, auth_headers).json()
        r = client.get(f"/api/v1/helpdesk/tickets/{ticket['id']}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == ticket["id"]

    def test_update_ticket_status(self, client, auth_headers):
        ticket = self._create_ticket(client, auth_headers).json()
        r = client.put(f"/api/v1/helpdesk/tickets/{ticket['id']}",
                       json={"status": "in_progress"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "in_progress"

    def test_resolve_ticket(self, client, auth_headers):
        ticket = self._create_ticket(client, auth_headers).json()
        r = client.put(f"/api/v1/helpdesk/tickets/{ticket['id']}",
                       json={"status": "resolved"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "resolved"

    def test_filter_by_priority(self, client, auth_headers):
        self._create_ticket(client, auth_headers, priority="high")
        r = client.get("/api/v1/helpdesk/tickets?priority=high", headers=auth_headers)
        assert r.status_code == 200
        for item in r.json()["items"]:
            assert item["priority"] == "high"

    def test_filter_by_status(self, client, auth_headers):
        self._create_ticket(client, auth_headers)
        r = client.get("/api/v1/helpdesk/tickets?status=open", headers=auth_headers)
        assert r.status_code == 200

    def test_ticket_stats(self, client, auth_headers):
        self._create_ticket(client, auth_headers)
        r = client.get("/api/v1/helpdesk/tickets/stats", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "total" in data

    def test_ticket_not_found(self, client, auth_headers):
        r = client.get("/api/v1/helpdesk/tickets/99999", headers=auth_headers)
        assert r.status_code == 404

    def test_ticket_number_prefix(self, client, auth_headers):
        t1 = self._create_ticket(client, auth_headers).json()
        t2 = self._create_ticket(client, auth_headers, subject="Another Issue").json()
        assert t1["ticket_number"] != t2["ticket_number"]
        assert t1["ticket_number"].startswith("TKT-")
