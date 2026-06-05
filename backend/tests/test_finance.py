"""Tests for Finance module — Accounts, Journals, Expenses."""
import pytest


class TestAccounts:
    def _create_account(self, client, auth_headers, code, name, atype, balance=0):
        return client.post("/api/v1/finance/accounts", json={
            "account_code": code, "account_name": name,
            "account_type": atype, "account_group": "Test Group",
            "opening_balance": balance, "is_group": False,
        }, headers=auth_headers)

    def test_create_account(self, client, auth_headers):
        r = self._create_account(client, auth_headers, "T001", "Test Cash Account", "asset", 10000)
        assert r.status_code == 200
        data = r.json()
        assert data["account_code"] == "T001"
        assert data["account_type"] == "asset"
        assert data["opening_balance"] == 10000

    def test_list_accounts(self, client, auth_headers):
        self._create_account(client, auth_headers, "T002", "Test Bank", "asset")
        r = client.get("/api/v1/finance/accounts", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_filter_accounts_by_type(self, client, auth_headers):
        self._create_account(client, auth_headers, "T003", "Test Equity", "equity", 50000)
        r = client.get("/api/v1/finance/accounts?account_type=equity", headers=auth_headers)
        assert r.status_code == 200
        for acc in r.json():
            assert acc["account_type"] == "equity"


class TestJournalEntries:
    def _setup_accounts(self, client, auth_headers):
        cash = client.post("/api/v1/finance/accounts", json={
            "account_code": "JT001", "account_name": "Journal Test Cash",
            "account_type": "asset", "account_group": "Current Assets",
            "opening_balance": 100000, "is_group": False,
        }, headers=auth_headers).json()
        rent = client.post("/api/v1/finance/accounts", json={
            "account_code": "JT002", "account_name": "Journal Test Rent",
            "account_type": "expense", "account_group": "Indirect Expenses",
            "opening_balance": 0, "is_group": False,
        }, headers=auth_headers).json()
        return cash, rent

    def test_create_balanced_journal(self, client, auth_headers):
        cash, rent = self._setup_accounts(client, auth_headers)
        r = client.post("/api/v1/finance/journals", json={
            "entry_date": "2025-06-01",
            "description": "Rent payment",
            "entry_type": "manual",
            "reference": "RENT-001",
            "lines": [
                {"account_id": rent["id"], "description": "Rent June", "debit_amount": 50000, "credit_amount": 0},
                {"account_id": cash["id"], "description": "Cash paid", "debit_amount": 0, "credit_amount": 50000},
            ]
        }, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["total_debit"] == 50000
        assert data["total_credit"] == 50000
        assert data["status"] == "draft"

    def test_reject_unbalanced_journal(self, client, auth_headers):
        cash, rent = self._setup_accounts(client, auth_headers)
        r = client.post("/api/v1/finance/journals", json={
            "entry_date": "2025-06-01",
            "description": "Unbalanced",
            "entry_type": "manual",
            "lines": [
                {"account_id": rent["id"], "debit_amount": 50000, "credit_amount": 0},
                {"account_id": cash["id"], "debit_amount": 0, "credit_amount": 40000},  # Mismatch!
            ]
        }, headers=auth_headers)
        assert r.status_code == 400

    def test_post_journal(self, client, auth_headers):
        # Create fresh accounts with 0 opening balance to avoid Decimal arithmetic issue
        cash2 = client.post("/api/v1/finance/accounts", json={
            "account_code": "JT003", "account_name": "Post Test Cash",
            "account_type": "asset", "account_group": "Current Assets",
            "opening_balance": 0, "is_group": False,
        }, headers=auth_headers).json()
        rent2 = client.post("/api/v1/finance/accounts", json={
            "account_code": "JT004", "account_name": "Post Test Rent",
            "account_type": "expense", "account_group": "Indirect",
            "opening_balance": 0, "is_group": False,
        }, headers=auth_headers).json()
        je = client.post("/api/v1/finance/journals", json={
            "entry_date": "2025-06-01", "description": "Post test",
            "entry_type": "manual",
            "lines": [
                {"account_id": rent2["id"], "debit_amount": 10000, "credit_amount": 0},
                {"account_id": cash2["id"], "debit_amount": 0, "credit_amount": 10000},
            ]
        }, headers=auth_headers).json()
        r = client.put(f"/api/v1/finance/journals/{je['id']}/post", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["message"] == "Posted"

    def test_list_journals(self, client, auth_headers):
        r = client.get("/api/v1/finance/journals", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()


class TestExpenses:
    def test_create_expense(self, client, auth_headers):
        r = client.post("/api/v1/finance/expenses", json={
            "expense_date": "2025-06-01",
            "category": "Travel",
            "description": "Client meeting travel",
            "amount": 5000,
            "currency": "INR",
            "payment_mode": "credit_card",
            "vendor_name": "Ola Business",
        }, headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "expense_number" in data
        assert data["expense_number"].startswith("EXP-")

    def test_list_expenses(self, client, auth_headers):
        client.post("/api/v1/finance/expenses", json={
            "expense_date": "2025-06-01", "category": "Office Supplies",
            "description": "Stationery", "amount": 500, "currency": "INR",
        }, headers=auth_headers)
        r = client.get("/api/v1/finance/expenses", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()

    def test_expense_filter_by_status(self, client, auth_headers):
        r = client.get("/api/v1/finance/expenses?status=pending", headers=auth_headers)
        assert r.status_code == 200

    def test_trial_balance(self, client, auth_headers):
        r = client.get("/api/v1/finance/reports/trial-balance", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_profit_loss(self, client, auth_headers):
        r = client.get("/api/v1/finance/reports/pl", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert "revenue" in data
        assert "expense" in data
        assert "net_profit" in data
