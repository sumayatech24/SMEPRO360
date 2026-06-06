"""Tests for the newer modules: tax, global payroll, company profile,
client onboarding, skills & appraisal, my-space, HR-extended."""
import pytest


class TestTax:
    def test_create_tax_type(self, client, auth_headers):
        r = client.post("/api/v1/tax/types", json={
            "name": "GST", "code": "GST", "tax_category": "indirect",
            "description": "Goods and Services Tax",
        }, headers=auth_headers)
        assert r.status_code == 200

    def test_create_slab_and_list(self, client, auth_headers):
        tt = client.post("/api/v1/tax/types", json={"name": "GST2", "code": "GST2"}, headers=auth_headers).json()
        r = client.post("/api/v1/tax/slabs", json={
            "tax_type_id": tt["id"], "name": "GST 18%", "rate": 18,
            "cgst_rate": 9, "sgst_rate": 9, "igst_rate": 18,
        }, headers=auth_headers)
        assert r.status_code == 200
        assert client.get("/api/v1/tax/types", headers=auth_headers).status_code == 200


class TestCompanyProfile:
    def test_get_profile_before_setup(self, client, auth_headers):
        r = client.get("/api/v1/payroll-v2/company-profile", headers=auth_headers)
        assert r.status_code == 200

    def test_create_company_profile(self, client, auth_headers):
        r = client.post("/api/v1/payroll-v2/company-profile", json={
            "legal_name": "Test Co Pvt Ltd", "country": "India", "country_code": "IN",
            "currency": "INR", "currency_symbol": "₹",
            "tax_registrations": {"gstin": "27AABCT1234A1ZB", "pan": "AABCT1234A"},
        }, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["legal_name"] == "Test Co Pvt Ltd"


class TestGlobalPayroll:
    def test_list_salary_structures(self, client, auth_headers):
        assert client.get("/api/v1/payroll-v2/salary-structures", headers=auth_headers).status_code == 200

    def test_tax_calculator_india(self, client, auth_headers):
        r = client.post("/api/v1/payroll-v2/tax-calculator", json={
            "country": "India", "annual_income": 1200000, "regime": "new",
        }, headers=auth_headers)
        assert r.status_code == 200
        assert "total_annual_tax" in r.json()

    def test_tax_calculator_uae_no_tax(self, client, auth_headers):
        r = client.post("/api/v1/payroll-v2/tax-calculator", json={
            "country": "UAE", "annual_income": 500000,
        }, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["total_annual_tax"] == 0


class TestClientOnboarding:
    def test_onboard_client(self, client, auth_headers):
        r = client.post("/api/v1/clients/onboard", json={
            "company_name": "Onboard Test Ltd", "trade_name": "OnboardT",
            "country": "India", "country_code": "IN", "currency": "INR",
            "email": "onboard@test.com",
            "tax_registrations": {"GSTIN": "29AABCD1234E1ZF"},
            "admin_name": "Admin User", "admin_email": "onboardadmin@test.com",
            "admin_password": "Onboard@12345", "plan": "professional",
        }, headers=auth_headers)
        assert r.status_code == 200
        body = r.json()
        assert "client_id" in body and len(body["client_id"]) == 8

    def test_list_clients(self, client, auth_headers):
        assert client.get("/api/v1/clients/", headers=auth_headers).status_code == 200


class TestSkillsAppraisal:
    def test_list_skill_categories(self, client, auth_headers):
        assert client.get("/api/v1/hr-skills/categories", headers=auth_headers).status_code == 200

    def test_create_skill(self, client, auth_headers):
        r = client.post("/api/v1/hr-skills/skills", json={
            "name": "Python", "skill_type": "technical",
        }, headers=auth_headers)
        assert r.status_code == 200

    def test_employee_skill_and_education(self, client, auth_headers, sample_employee):
        eid = sample_employee["id"]
        r = client.post(f"/api/v1/hr-skills/employee/{eid}/skills", json={
            "skill_name": "Leadership", "proficiency": "advanced", "years_experience": 5,
        }, headers=auth_headers)
        assert r.status_code == 200
        r2 = client.post(f"/api/v1/hr-skills/employee/{eid}/education", json={
            "degree": "B.Tech", "specialization": "CS", "institution": "IIT",
            "year_from": 2010, "year_to": 2014, "grade": "85%",
        }, headers=auth_headers)
        assert r2.status_code == 200
        assert client.get(f"/api/v1/hr-skills/employee/{eid}/skills", headers=auth_headers).status_code == 200

    def test_appraisal_cycle_and_kra(self, client, auth_headers):
        c = client.post("/api/v1/hr-skills/appraisal/cycles", json={
            "name": "Q1 2026", "cycle_type": "quarterly",
            "financial_year": "2025-26", "period_label": "Q1 2026",
        }, headers=auth_headers)
        assert c.status_code == 200
        cid = c.json()["id"]
        k = client.post(f"/api/v1/hr-skills/appraisal/cycles/{cid}/kras", json={
            "kra_name": "On-time Delivery", "weightage": 30, "target_value": "95%",
            "kpi_type": "quantitative",
        }, headers=auth_headers)
        assert k.status_code == 200
        assert client.get(f"/api/v1/hr-skills/appraisal/cycles/{cid}/kras", headers=auth_headers).status_code == 200


class TestMySpace:
    def test_my_dashboard(self, client, auth_headers):
        r = client.get("/api/v1/my-space/dashboard", headers=auth_headers)
        assert r.status_code == 200
        assert "stats" in r.json()

    def test_my_tasks(self, client, auth_headers):
        assert client.get("/api/v1/my-space/tasks", headers=auth_headers).status_code == 200

    def test_my_payslips(self, client, auth_headers):
        assert client.get("/api/v1/my-space/payslips", headers=auth_headers).status_code == 200


class TestHRExtended:
    def test_seed_and_list_training(self, client, auth_headers):
        client.post("/api/v1/hr-v2/seed-defaults", headers=auth_headers)
        assert client.get("/api/v1/hr-v2/training/courses", headers=auth_headers).status_code == 200

    def test_list_benefit_plans(self, client, auth_headers):
        assert client.get("/api/v1/hr-v2/benefits/plans", headers=auth_headers).status_code == 200

    def test_onboarding_flow(self, client, auth_headers, sample_employee):
        eid = sample_employee["id"]
        r = client.post(f"/api/v1/hr-v2/onboarding/start/{eid}", headers=auth_headers)
        assert r.status_code == 200
        assert client.get(f"/api/v1/hr-v2/onboarding/{eid}", headers=auth_headers).status_code == 200
