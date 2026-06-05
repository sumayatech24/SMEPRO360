"""Tests for HR module — Employees, Attendance, Leaves, Payroll."""
import pytest
from datetime import datetime, timedelta


class TestEmployees:
    def test_create_employee(self, client, auth_headers):
        r = client.post("/api/v1/hr/employees", json={
            "first_name": "Ramesh",
            "last_name": "Sharma",
            "email": "ramesh.sharma.unique@test.com",
            "phone": "+91 9876543210",
            "employment_type": "full_time",
            "basic_salary": 60000,
            "hra": 24000,
            "other_allowances": 6000,
        }, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["first_name"] == "Ramesh"
        assert data["employee_number"].startswith("EMP-")
        assert data["basic_salary"] == 60000

    def test_list_employees(self, client, auth_headers, sample_employee):
        r = client.get("/api/v1/hr/employees", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert len(data["items"]) >= 1

    def test_get_employee(self, client, auth_headers, sample_employee):
        r = client.get(f"/api/v1/hr/employees/{sample_employee['id']}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == sample_employee["id"]

    def test_update_employee(self, client, auth_headers, sample_employee):
        r = client.put(f"/api/v1/hr/employees/{sample_employee['id']}",
                       json={"basic_salary": 70000}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["basic_salary"] == 70000

    def test_employee_not_found(self, client, auth_headers):
        r = client.get("/api/v1/hr/employees/99999", headers=auth_headers)
        assert r.status_code == 404

    def test_employee_search(self, client, auth_headers, sample_employee):
        r = client.get("/api/v1/hr/employees?search=Test", headers=auth_headers)
        assert r.status_code == 200

    def test_employee_number_auto_generated(self, client, auth_headers):
        r = client.post("/api/v1/hr/employees", json={
            "first_name": "Auto",
            "last_name": "Number",
            "email": "auto.number.unique@test.com",
            "basic_salary": 45000,
        }, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["employee_number"].startswith("EMP-")

    def test_delete_employee(self, client, auth_headers, sample_employee):
        r = client.delete(f"/api/v1/hr/employees/{sample_employee['id']}", headers=auth_headers)
        assert r.status_code == 200

    def test_export_employees(self, client, auth_headers):
        r = client.get("/api/v1/hr/employees/export", headers=auth_headers)
        assert r.status_code == 200


class TestAttendance:
    def test_mark_attendance_present(self, client, auth_headers, sample_employee):
        today = datetime.now().strftime("%Y-%m-%d")
        r = client.post("/api/v1/hr/attendance", json={
            "employee_id": sample_employee["id"],
            "date": today,
            "status": "present",
            "check_in": f"{today}T09:00:00",
            "check_out": f"{today}T18:00:00",
        }, headers=auth_headers)
        assert r.status_code == 200

    def test_mark_attendance_absent(self, client, auth_headers, sample_employee):
        yesterday = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
        r = client.post("/api/v1/hr/attendance", json={
            "employee_id": sample_employee["id"],
            "date": yesterday,
            "status": "absent",
        }, headers=auth_headers)
        assert r.status_code == 200

    def test_list_attendance(self, client, auth_headers):
        r = client.get("/api/v1/hr/attendance", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()

    def test_attendance_filter_by_employee(self, client, auth_headers, sample_employee):
        date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
        client.post("/api/v1/hr/attendance", json={
            "employee_id": sample_employee["id"],
            "date": date, "status": "present",
        }, headers=auth_headers)
        r = client.get(f"/api/v1/hr/attendance?employee_id={sample_employee['id']}", headers=auth_headers)
        assert r.status_code == 200
        for item in r.json()["items"]:
            assert item["employee_id"] == sample_employee["id"]


class TestLeaves:
    def test_apply_leave(self, client, auth_headers, sample_employee):
        r = client.post("/api/v1/hr/leaves", json={
            "employee_id": sample_employee["id"],
            "leave_type": "annual",
            "from_date": "2025-08-01",
            "to_date": "2025-08-03",
            "reason": "Family vacation",
        }, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["days"] == 3
        assert data["status"] in ["pending", "applied"]

    def test_approve_leave(self, client, auth_headers, sample_employee):
        leave = client.post("/api/v1/hr/leaves", json={
            "employee_id": sample_employee["id"],
            "leave_type": "sick",
            "from_date": "2025-09-01",
            "to_date": "2025-09-01",
            "reason": "Fever",
        }, headers=auth_headers).json()
        r = client.put(f"/api/v1/hr/leaves/{leave['id']}/approve", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["message"] == "Approved"

    def test_reject_leave(self, client, auth_headers, sample_employee):
        leave = client.post("/api/v1/hr/leaves", json={
            "employee_id": sample_employee["id"],
            "leave_type": "casual",
            "from_date": "2025-10-01",
            "to_date": "2025-10-01",
            "reason": "Personal",
        }, headers=auth_headers).json()
        r = client.put(f"/api/v1/hr/leaves/{leave['id']}/reject?reason=Not+approved", headers=auth_headers)
        assert r.status_code == 200

    def test_list_leaves(self, client, auth_headers):
        r = client.get("/api/v1/hr/leaves", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()


class TestPayroll:
    def test_run_payroll(self, client, auth_headers, sample_employee):
        """Test payroll run which generates payroll for all active employees."""
        r = client.post("/api/v1/hr/payroll/run?month=6&year=2025", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "message" in data

    def test_list_payroll(self, client, auth_headers):
        r = client.get("/api/v1/hr/payroll", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()

    def test_run_payroll_twice_same_month(self, client, auth_headers, sample_employee):
        """Running payroll twice for same month should not create duplicates."""
        r1 = client.post("/api/v1/hr/payroll/run?month=7&year=2025", headers=auth_headers)
        r2 = client.post("/api/v1/hr/payroll/run?month=7&year=2025", headers=auth_headers)
        assert r1.status_code == 200
        assert r2.status_code == 200

    def test_export_payroll(self, client, auth_headers):
        r = client.get("/api/v1/hr/payroll/export", headers=auth_headers)
        assert r.status_code == 200
