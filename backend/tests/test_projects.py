"""Tests for Projects module."""
import pytest


class TestProjects:
    def _create_project(self, client, auth_headers, **overrides):
        payload = {
            "name": "Test Project",
            "description": "Test project description",
            "status": "planning",
            "start_date": "2025-01-01",
            "end_date": "2025-12-31",
            "budget": 500000,
            **overrides,
        }
        return client.post("/api/v1/projects/", json=payload, headers=auth_headers)

    def test_create_project(self, client, auth_headers):
        r = self._create_project(client, auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Test Project"
        assert data["status"] == "planning"
        assert data["budget"] == 500000

    def test_list_projects(self, client, auth_headers):
        self._create_project(client, auth_headers)
        r = client.get("/api/v1/projects/", headers=auth_headers)
        assert r.status_code == 200

    def test_get_project(self, client, auth_headers):
        proj = self._create_project(client, auth_headers).json()
        r = client.get(f"/api/v1/projects/{proj['id']}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == proj["id"]

    def test_update_project_status(self, client, auth_headers):
        proj = self._create_project(client, auth_headers).json()
        r = client.put(f"/api/v1/projects/{proj['id']}", json={"status": "in_progress"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "in_progress"

    def test_project_with_customer(self, client, auth_headers, sample_customer):
        r = self._create_project(client, auth_headers, customer_id=sample_customer["id"])
        assert r.status_code == 200
        assert r.json()["customer_id"] == sample_customer["id"]

    def test_project_stats(self, client, auth_headers):
        self._create_project(client, auth_headers)
        r = client.get("/api/v1/projects/stats", headers=auth_headers)
        assert r.status_code == 200


class TestTasks:
    def test_create_task(self, client, auth_headers):
        proj = client.post("/api/v1/projects/", json={
            "name": "Task Test Project", "status": "in_progress", "budget": 100000
        }, headers=auth_headers).json()
        r = client.post("/api/v1/projects/tasks", json={
            "project_id": proj["id"],
            "title": "Design Database Schema",
            "description": "Design the database schema for the application",
            "status": "todo",
            "priority": "high",
            "estimated_hours": 16,
        }, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "Design Database Schema"
        assert data["status"] == "todo"

    def test_list_all_tasks(self, client, auth_headers):
        r = client.get("/api/v1/projects/tasks/all", headers=auth_headers)
        assert r.status_code == 200

    def test_update_task_status(self, client, auth_headers):
        proj = client.post("/api/v1/projects/", json={
            "name": "Status Test Project", "status": "in_progress", "budget": 100000
        }, headers=auth_headers).json()
        task = client.post("/api/v1/projects/tasks", json={
            "project_id": proj["id"], "title": "Status Test Task",
            "status": "todo", "priority": "medium",
        }, headers=auth_headers).json()
        r = client.put(f"/api/v1/projects/tasks/{task['id']}", json={"status": "in_progress"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "in_progress"
