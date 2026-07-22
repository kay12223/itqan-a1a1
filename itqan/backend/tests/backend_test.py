"""
End-to-end pytest backend tests for Itqan Void Edition.
Covers: auth (register-manager, login, /me), crew CRUD + account limit + transactions,
attendance settings + check-in + process-absences, void verify/activate,
finance summary, equipment + projects, role guards.
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://itqan-dashboard.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

VOID_KEY = "701D#V0id_M4st3r$K3y!99X"
PHONE = "01012930571"


# --------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def manager_ctx(session):
    """Register a brand new manager + company for isolated tests."""
    suffix = uuid.uuid4().hex[:8]
    email = f"test_mgr_{suffix}@itqan.com"
    payload = {
        "company_name": f"TEST Co {suffix}",
        "name": "TEST Manager",
        "email": email,
        "password": "Pass123!",
    }
    r = session.post(f"{API}/auth/register-manager", json=payload, timeout=30)
    assert r.status_code == 200, f"register-manager failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data and "user" in data and "company" in data
    assert data["user"]["role"] == "manager"
    assert data["user"]["email"] == email
    assert data["company"]["account_limit"] == 6
    assert data["company"]["storage_limit_mb"] == 100
    return {
        "email": email,
        "password": "Pass123!",
        "token": data["access_token"],
        "user": data["user"],
        "company": data["company"],
    }


@pytest.fixture(scope="session")
def mgr_headers(manager_ctx):
    return {"Authorization": f"Bearer {manager_ctx['token']}", "Content-Type": "application/json"}


# --------------------------------------------------------------------------
# Auth tests
# --------------------------------------------------------------------------
class TestAuth:
    def test_register_duplicate_email_rejected(self, session, manager_ctx):
        r = session.post(f"{API}/auth/register-manager", json={
            "company_name": "X", "name": "Y", "email": manager_ctx["email"], "password": "Pass123!"
        })
        assert r.status_code == 400

    def test_login_manager_success(self, session, manager_ctx):
        r = session.post(f"{API}/auth/login", json={
            "identifier": manager_ctx["email"], "password": manager_ctx["password"], "role": "manager"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["role"] == "manager"
        assert "access_token" in data

    def test_login_wrong_password(self, session, manager_ctx):
        r = session.post(f"{API}/auth/login", json={
            "identifier": manager_ctx["email"], "password": "wrong", "role": "manager"
        })
        assert r.status_code == 401

    def test_login_wrong_role(self, session, manager_ctx):
        # manager email but role=member should fail
        r = session.post(f"{API}/auth/login", json={
            "identifier": manager_ctx["email"], "password": manager_ctx["password"], "role": "member"
        })
        assert r.status_code == 401

    def test_me_requires_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_returns_user_and_company(self, session, mgr_headers):
        r = session.get(f"{API}/auth/me", headers=mgr_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["role"] == "manager"
        assert data["company"] is not None


# --------------------------------------------------------------------------
# Crew tests + account limit
# --------------------------------------------------------------------------
class TestCrew:
    created_ids = []

    def test_create_crew(self, session, mgr_headers, manager_ctx):
        suffix = uuid.uuid4().hex[:6]
        payload = {
            "name": "TEST Employee 1",
            "username": f"emp_{suffix}_1",
            "password": "1234567890",
            "job_title": "مهندس",
            "monthly_salary": 5000,
        }
        r = session.post(f"{API}/crew", json=payload, headers=mgr_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "member"
        assert data["name"] == payload["name"]
        assert data["monthly_salary"] == 5000
        TestCrew.created_ids.append(data["id"])
        manager_ctx["first_employee"] = data
        manager_ctx["first_employee_username"] = payload["username"]
        manager_ctx["first_employee_password"] = payload["password"]

    def test_list_crew_shows_created(self, session, mgr_headers):
        r = session.get(f"{API}/crew", headers=mgr_headers)
        assert r.status_code == 200
        ids = [c["id"] for c in r.json()]
        assert TestCrew.created_ids[0] in ids

    def test_account_limit_blocks_seventh(self, session, mgr_headers):
        # We have 1 employee, add 5 more (total 6), then 7th must fail with 403 mentioning phone.
        for i in range(2, 7):
            suffix = uuid.uuid4().hex[:6]
            r = session.post(f"{API}/crew", json={
                "name": f"TEST Emp {i}",
                "username": f"emp_{suffix}_{i}",
                "password": "passpass",
                "monthly_salary": 1000,
            }, headers=mgr_headers)
            assert r.status_code == 200, f"create #{i} failed: {r.text}"
            TestCrew.created_ids.append(r.json()["id"])
        # 7th must fail
        suffix = uuid.uuid4().hex[:6]
        r = session.post(f"{API}/crew", json={
            "name": "TEST Emp 7",
            "username": f"emp_{suffix}_7",
            "password": "passpass",
            "monthly_salary": 1000,
        }, headers=mgr_headers)
        assert r.status_code == 403
        detail = r.json().get("detail", "")
        assert PHONE in detail, f"expected phone in detail: {detail}"

    def test_transaction_deduction_updates_totals(self, session, mgr_headers):
        cid = TestCrew.created_ids[0]
        r = session.post(f"{API}/crew/{cid}/transaction", json={
            "type": "deduction", "amount": 100, "reason": "TEST"
        }, headers=mgr_headers)
        assert r.status_code == 200
        assert r.json()["total_deductions"] >= 100

    def test_transaction_addition_updates_totals(self, session, mgr_headers):
        cid = TestCrew.created_ids[0]
        r = session.post(f"{API}/crew/{cid}/transaction", json={
            "type": "addition", "amount": 50, "reason": "TEST bonus"
        }, headers=mgr_headers)
        assert r.status_code == 200
        assert r.json()["total_additions"] >= 50

    def test_transaction_salary_update(self, session, mgr_headers):
        cid = TestCrew.created_ids[0]
        r = session.post(f"{API}/crew/{cid}/transaction", json={
            "type": "salary", "amount": 6000, "reason": "raise"
        }, headers=mgr_headers)
        assert r.status_code == 200
        assert r.json()["monthly_salary"] == 6000


# --------------------------------------------------------------------------
# Attendance
# --------------------------------------------------------------------------
class TestAttendance:
    def test_update_attendance_settings(self, session, mgr_headers):
        r = session.put(f"{API}/company/attendance-settings", json={
            "check_in_deadline": "00:01",  # nearly midnight => any check-in will be late
            "work_start": "09:00", "work_end": "17:00",
            "late_deduction": 25, "absence_deduction": 100,
        }, headers=mgr_headers)
        assert r.status_code == 200
        assert r.json()["attendance"]["late_deduction"] == 25

    def test_employee_login_and_checkin(self, session, manager_ctx):
        # Login employee using username/password
        emp_user = manager_ctx["first_employee_username"]
        emp_pass = manager_ctx["first_employee_password"]
        r = session.post(f"{API}/auth/login", json={
            "identifier": emp_user, "password": emp_pass, "role": "member"
        })
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        # Check-in (deadline is 00:01, so will be late)
        r = session.post(f"{API}/attendance/checkin", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] in ("late", "present")

        # Second check-in same day: already
        r2 = session.post(f"{API}/attendance/checkin", headers=headers)
        assert r2.status_code == 200
        assert r2.json().get("already") is True

    def test_process_absences(self, session, mgr_headers):
        r = session.post(f"{API}/attendance/process-absences", headers=mgr_headers)
        assert r.status_code == 200
        data = r.json()
        assert "marked" in data


# --------------------------------------------------------------------------
# Void Engine
# --------------------------------------------------------------------------
class TestVoidEngine:
    def test_wrong_key_rejected(self, session, mgr_headers):
        r = session.post(f"{API}/void/verify-key", json={"key": "wrong"}, headers=mgr_headers)
        assert r.status_code == 403

    def test_correct_key_unlocks(self, session, mgr_headers):
        r = session.post(f"{API}/void/verify-key", json={"key": VOID_KEY}, headers=mgr_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True
        assert "subscriptions" in data["options"]

    def test_activate_subscription_makes_premium(self, session, mgr_headers):
        r = session.post(f"{API}/void/activate", json={"key": VOID_KEY, "option_id": "sub_monthly"}, headers=mgr_headers)
        assert r.status_code == 200
        company = r.json()["company"]
        assert company["is_premium"] is True
        assert company["subscription"]["plan_type"] == "monthly"

    def test_activate_storage_addon(self, session, mgr_headers):
        # current limit before
        before = session.get(f"{API}/company", headers=mgr_headers).json()["storage_limit_mb"]
        r = session.post(f"{API}/void/activate", json={"key": VOID_KEY, "option_id": "st_500"}, headers=mgr_headers)
        assert r.status_code == 200
        assert r.json()["company"]["storage_limit_mb"] == before + 500

    def test_activate_accounts_addon(self, session, mgr_headers):
        before = session.get(f"{API}/company", headers=mgr_headers).json()["account_limit"]
        r = session.post(f"{API}/void/activate", json={"key": VOID_KEY, "option_id": "acc_5"}, headers=mgr_headers)
        assert r.status_code == 200
        assert r.json()["company"]["account_limit"] == before + 5


# --------------------------------------------------------------------------
# Finance summary
# --------------------------------------------------------------------------
class TestFinance:
    def test_finance_summary(self, session, mgr_headers):
        r = session.get(f"{API}/finance/summary", headers=mgr_headers)
        assert r.status_code == 200
        data = r.json()
        for key in ("total_salaries", "total_deductions", "total_additions",
                    "net_payroll", "per_employee", "crew_count"):
            assert key in data
        assert data["crew_count"] >= 6
        assert isinstance(data["per_employee"], list)


# --------------------------------------------------------------------------
# Operations: equipment + projects
# --------------------------------------------------------------------------
class TestOperations:
    eq_id = None
    proj_id = None

    def test_add_equipment(self, session, mgr_headers):
        r = session.post(f"{API}/equipment", json={
            "name": "TEST Laptop", "amount": 1500, "note": "TEST"
        }, headers=mgr_headers)
        assert r.status_code == 200
        TestOperations.eq_id = r.json()["id"]

    def test_add_project(self, session, mgr_headers):
        r = session.post(f"{API}/projects", json={
            "name": "TEST Project", "budget_spent": 1000,
            "equipment_used": [TestOperations.eq_id] if TestOperations.eq_id else [],
            "assigned_crew": [],
            "manager_spending": 200,
            "status": "active",
        }, headers=mgr_headers)
        assert r.status_code == 200
        TestOperations.proj_id = r.json()["id"]

    def test_list_projects(self, session, mgr_headers):
        r = session.get(f"{API}/projects", headers=mgr_headers)
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()]
        assert TestOperations.proj_id in ids


# --------------------------------------------------------------------------
# Role guards (member cannot access manager routes)
# --------------------------------------------------------------------------
class TestRoleGuards:
    def test_member_blocked_from_manager_routes(self, session, manager_ctx):
        r = session.post(f"{API}/auth/login", json={
            "identifier": manager_ctx["first_employee_username"],
            "password": manager_ctx["first_employee_password"],
            "role": "member",
        })
        assert r.status_code == 200
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}

        # crew listing requires manager
        assert session.get(f"{API}/crew", headers=h).status_code == 403
        # finance summary requires manager
        assert session.get(f"{API}/finance/summary", headers=h).status_code == 403
        # void verify requires manager
        assert session.post(f"{API}/void/verify-key", json={"key": VOID_KEY}, headers=h).status_code == 403
        # process-absences requires manager
        assert session.post(f"{API}/attendance/process-absences", headers=h).status_code == 403


# --------------------------------------------------------------------------
# Cleanup
# --------------------------------------------------------------------------
def test_zz_cleanup_crew(session, mgr_headers):
    """Best-effort: delete created crew so DB stays clean."""
    r = session.get(f"{API}/crew", headers=mgr_headers)
    if r.status_code == 200:
        for c in r.json():
            if c["name"].startswith("TEST"):
                session.delete(f"{API}/crew/{c['id']}", headers=mgr_headers)
