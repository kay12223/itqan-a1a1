"""
Iteration 3 backend tests for Itqan Void Edition.
Covers: USD currency, no sub_eternal, perks+add_accounts+add_mb on subs,
storage 4 tiers, accounts 3 tiers, activate-sub grants bonus, camera
check-in photo storage, Announcements/Leaves/Todo CRUD, manager delete
employee, multi-tenancy for new collections.
"""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
VOID_KEY = "701D#V0id_M4st3r$K3y!99X"

# Tiny 1x1 PNG dataURL for camera check-in test
PHOTO_DATAURL = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0l"
    "EQVR4nGNgAAIAAAUAAeImBZsAAAAASUVORK5CYII="
)


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _register_manager(s, label):
    suffix = uuid.uuid4().hex[:8]
    email = f"test_{label}_{suffix}@itqan.com"
    r = s.post(f"{API}/auth/register-manager", json={
        "company_name": f"TEST {label} Co {suffix}",
        "name": f"TEST Mgr {label}",
        "email": email,
        "password": "Pass123!",
    }, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    return {
        "email": email, "password": "Pass123!",
        "token": data["access_token"], "user": data["user"], "company": data["company"],
        "headers": {"Authorization": f"Bearer {data['access_token']}", "Content-Type": "application/json"},
    }


def _create_employee(s, mgr, idx=1):
    suffix = uuid.uuid4().hex[:6]
    username = f"emp_{suffix}_{idx}"
    r = s.post(f"{API}/crew", json={
        "name": f"TEST Emp {idx}", "username": username,
        "password": "passpass", "monthly_salary": 1000,
    }, headers=mgr["headers"])
    assert r.status_code == 200, r.text
    emp = r.json()
    r2 = s.post(f"{API}/auth/login", json={
        "identifier": username, "password": "passpass", "role": "member"
    })
    assert r2.status_code == 200
    emp_token = r2.json()["access_token"]
    return {
        "id": emp["id"], "username": username, "name": emp["name"],
        "token": emp_token,
        "headers": {"Authorization": f"Bearer {emp_token}", "Content-Type": "application/json"},
    }


@pytest.fixture(scope="module")
def mgr_a(session):
    return _register_manager(session, "iter3_A")


@pytest.fixture(scope="module")
def mgr_b(session):
    return _register_manager(session, "iter3_B")


@pytest.fixture(scope="module")
def emp_a(session, mgr_a):
    return _create_employee(session, mgr_a, 1)


# ----------------------------- Void Options ------------------------------
class TestVoidOptions:
    def test_subs_no_eternal_and_usd(self, session, mgr_a):
        r = session.get(f"{API}/void/options", headers=mgr_a["headers"])
        assert r.status_code == 200
        data = r.json()
        sub_ids = [s["id"] for s in data["subscriptions"]]
        assert sub_ids == ["sub_weekly", "sub_monthly", "sub_yearly"], sub_ids
        for s in data["subscriptions"]:
            assert "perks" in s and isinstance(s["perks"], list) and len(s["perks"]) > 0
            assert "add_accounts" in s and isinstance(s["add_accounts"], int)
            assert "add_mb" in s and isinstance(s["add_mb"], int)
            assert s.get("currency", "USD") == "USD" or "$" in s.get("price_label", "")

    def test_storage_has_4_tiers(self, session, mgr_a):
        r = session.get(f"{API}/void/options", headers=mgr_a["headers"])
        st_ids = [s["id"] for s in r.json()["storage"]]
        for needed in ["st_1024", "st_5120", "st_10240", "st_51200"]:
            assert needed in st_ids, f"Missing {needed} in storage tiers: {st_ids}"

    def test_accounts_has_3_tiers(self, session, mgr_a):
        r = session.get(f"{API}/void/options", headers=mgr_a["headers"])
        acc_ids = [s["id"] for s in r.json()["accounts"]]
        for needed in ["acc_10", "acc_50", "acc_200"]:
            assert needed in acc_ids


# ----------------------------- Activate grants bonus ----------------------
class TestActivateBonus:
    def test_activate_sub_monthly_grants_accounts_and_storage(self, session):
        mgr = _register_manager(session, "iter3_BONUS")
        # before
        r0 = session.get(f"{API}/auth/me", headers=mgr["headers"])
        comp0 = r0.json()["company"]
        acc_before = comp0["account_limit"]
        st_before = comp0["storage_limit_mb"]
        # activate sub_monthly
        r = session.post(f"{API}/void/activate",
                         json={"key": VOID_KEY, "option_id": "sub_monthly"},
                         headers=mgr["headers"])
        assert r.status_code == 200, r.text
        # after
        r1 = session.get(f"{API}/auth/me", headers=mgr["headers"])
        comp1 = r1.json()["company"]
        assert comp1["subscription_active"] is True
        assert comp1["account_limit"] > acc_before, (
            f"account_limit not increased: {acc_before} -> {comp1['account_limit']}"
        )
        assert comp1["storage_limit_mb"] > st_before, (
            f"storage_limit_mb not increased: {st_before} -> {comp1['storage_limit_mb']}"
        )


# ----------------------------- Camera check-in ----------------------------
class TestCameraCheckin:
    def test_checkin_with_photo_stored(self, session, mgr_a, emp_a):
        # Employee check-in with photo
        r = session.post(f"{API}/attendance/checkin",
                         json={"photo": PHOTO_DATAURL},
                         headers=emp_a["headers"])
        assert r.status_code == 200, r.text
        # Manager GET attendance - find this employee's latest record
        r2 = session.get(f"{API}/attendance", headers=mgr_a["headers"])
        assert r2.status_code == 200
        # Response shape may be a list directly or { records: [...] }
        body = r2.json()
        records = body if isinstance(body, list) else body.get("records") or body.get("logs") or []
        # Find an entry with photo for emp_a (latest)
        my = [r for r in records if r.get("user_id") == emp_a["id"] or r.get("employee_id") == emp_a["id"]]
        assert my, f"No attendance for employee found in {records[:2]}"
        with_photo = [r for r in my if r.get("photo")]
        assert with_photo, f"No 'photo' field in attendance entries: keys={list(my[0].keys())}"
        assert with_photo[0]["photo"].startswith("data:image"), with_photo[0]["photo"][:30]


# ----------------------------- Announcements -----------------------------
class TestAnnouncements:
    ann_id = None

    def test_manager_creates_announcement(self, session, mgr_a):
        r = session.post(f"{API}/announcements",
                         json={"title": "TEST_ANN عنوان", "body": "نص الإعلان", "pinned": True},
                         headers=mgr_a["headers"])
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["title"] == "TEST_ANN عنوان"
        assert data.get("pinned") is True
        TestAnnouncements.ann_id = data["id"]

    def test_employee_cannot_post(self, session, emp_a):
        r = session.post(f"{API}/announcements",
                         json={"title": "X", "body": "Y"},
                         headers=emp_a["headers"])
        assert r.status_code == 403, r.status_code

    def test_employee_can_get(self, session, emp_a):
        r = session.get(f"{API}/announcements", headers=emp_a["headers"])
        assert r.status_code == 200
        titles = [a["title"] for a in r.json()]
        assert "TEST_ANN عنوان" in titles

    def test_pinned_first(self, session, mgr_a):
        # create a non-pinned
        session.post(f"{API}/announcements",
                     json={"title": "TEST_ANN_NORMAL", "body": "x"},
                     headers=mgr_a["headers"])
        r = session.get(f"{API}/announcements", headers=mgr_a["headers"])
        items = r.json()
        # Find pinned one – first pinned should appear before any non-pinned
        first_pinned_idx = next((i for i, a in enumerate(items) if a.get("pinned")), -1)
        last_unpinned_before = max((i for i, a in enumerate(items[:first_pinned_idx]) if not a.get("pinned")), default=-1)
        # Trivially: at index 0 there should be a pinned item, given we just created one
        assert items[0].get("pinned") is True, f"First item not pinned: {items[0]}"

    def test_manager_delete(self, session, mgr_a):
        r = session.delete(f"{API}/announcements/{TestAnnouncements.ann_id}",
                           headers=mgr_a["headers"])
        assert r.status_code == 200


# ----------------------------- Leave Requests -----------------------------
class TestLeaves:
    emp_leave = None
    mgr_leave = None

    def test_employee_creates_pending(self, session, emp_a):
        r = session.post(f"{API}/leaves",
                         json={"leave_type": "annual",
                               "start_date": "2026-02-01",
                               "end_date": "2026-02-03",
                               "reason": "TEST_LEAVE emp"},
                         headers=emp_a["headers"])
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "pending"
        TestLeaves.emp_leave = data["id"]

    def test_manager_creates_approved(self, session, mgr_a):
        r = session.post(f"{API}/leaves",
                         json={"leave_type": "sick",
                               "start_date": "2026-03-01",
                               "end_date": "2026-03-02",
                               "reason": "TEST_LEAVE mgr"},
                         headers=mgr_a["headers"])
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "approved"
        TestLeaves.mgr_leave = data["id"]

    def test_manager_decision_approve(self, session, mgr_a):
        r = session.post(f"{API}/leaves/{TestLeaves.emp_leave}/decision",
                         json={"status": "approved"},
                         headers=mgr_a["headers"])
        assert r.status_code == 200, r.text
        # verify persisted
        r2 = session.get(f"{API}/leaves", headers=mgr_a["headers"])
        leave = next(l for l in r2.json() if l["id"] == TestLeaves.emp_leave)
        assert leave["status"] == "approved"

    def test_employee_sees_only_own(self, session, emp_a):
        r = session.get(f"{API}/leaves", headers=emp_a["headers"])
        assert r.status_code == 200
        ids = [l["id"] for l in r.json()]
        assert TestLeaves.emp_leave in ids
        assert TestLeaves.mgr_leave not in ids

    def test_manager_sees_all(self, session, mgr_a):
        r = session.get(f"{API}/leaves", headers=mgr_a["headers"])
        ids = [l["id"] for l in r.json()]
        assert TestLeaves.emp_leave in ids and TestLeaves.mgr_leave in ids

    def test_employee_delete_own(self, session, emp_a):
        # create a fresh pending and delete it
        r = session.post(f"{API}/leaves",
                         json={"leave_type": "annual",
                               "start_date": "2026-04-01",
                               "end_date": "2026-04-02"},
                         headers=emp_a["headers"])
        assert r.status_code == 200
        lid = r.json()["id"]
        r2 = session.delete(f"{API}/leaves/{lid}", headers=emp_a["headers"])
        assert r2.status_code == 200


# ----------------------------- To-Do --------------------------------------
class TestTodo:
    todo_id = None

    def test_create_todo(self, session, emp_a):
        r = session.post(f"{API}/todos", json={"text": "TEST_TODO أنهي التقرير"},
                         headers=emp_a["headers"])
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["text"] == "TEST_TODO أنهي التقرير"
        assert data.get("done") is False
        TestTodo.todo_id = data["id"]

    def test_get_own_todos(self, session, emp_a):
        r = session.get(f"{API}/todos", headers=emp_a["headers"])
        assert r.status_code == 200
        ids = [t["id"] for t in r.json()]
        assert TestTodo.todo_id in ids

    def test_toggle(self, session, emp_a):
        r = session.put(f"{API}/todos/{TestTodo.todo_id}/toggle",
                        headers=emp_a["headers"])
        assert r.status_code == 200, r.text
        # verify
        r2 = session.get(f"{API}/todos", headers=emp_a["headers"])
        t = next(t for t in r2.json() if t["id"] == TestTodo.todo_id)
        assert t["done"] is True

    def test_delete(self, session, emp_a):
        r = session.delete(f"{API}/todos/{TestTodo.todo_id}", headers=emp_a["headers"])
        assert r.status_code == 200
        r2 = session.get(f"{API}/todos", headers=emp_a["headers"])
        ids = [t["id"] for t in r2.json()]
        assert TestTodo.todo_id not in ids

    def test_other_user_cannot_see(self, session, mgr_a, emp_a):
        # manager creates own todo
        r = session.post(f"{API}/todos", json={"text": "TEST_TODO_MGR"},
                         headers=mgr_a["headers"])
        assert r.status_code == 200
        mtid = r.json()["id"]
        r2 = session.get(f"{API}/todos", headers=emp_a["headers"])
        assert mtid not in [t["id"] for t in r2.json()]


# ----------------------------- Manager deletes employee -------------------
class TestManagerDeleteEmployee:
    def test_delete_employee(self, session, mgr_a):
        # create an employee to delete
        suffix = uuid.uuid4().hex[:6]
        username = f"emp_del_{suffix}"
        r = session.post(f"{API}/crew", json={
            "name": "TEST Del Emp", "username": username,
            "password": "passpass", "monthly_salary": 100,
        }, headers=mgr_a["headers"])
        assert r.status_code == 200
        emp_id = r.json()["id"]
        # delete
        r2 = session.delete(f"{API}/crew/{emp_id}", headers=mgr_a["headers"])
        assert r2.status_code == 200, r2.text
        # employee can no longer login
        r3 = session.post(f"{API}/auth/login",
                          json={"identifier": username, "password": "passpass", "role": "member"})
        assert r3.status_code in (401, 403, 404)


# ----------------------------- Currency in company ------------------------
class TestCurrency:
    def test_company_currency_is_usd(self, session, mgr_a):
        r = session.get(f"{API}/auth/me", headers=mgr_a["headers"])
        currency = r.json()["company"].get("currency")
        assert currency == "USD", f"Expected USD, got {currency}"


# ----------------------------- Multi-tenancy for new collections ----------
class TestTenancyIter3:
    def test_b_no_announcements_of_a(self, session, mgr_a, mgr_b):
        session.post(f"{API}/announcements",
                     json={"title": "TEST_ANN_ISO", "body": "x"},
                     headers=mgr_a["headers"])
        r = session.get(f"{API}/announcements", headers=mgr_b["headers"])
        assert r.status_code == 200
        assert not any("TEST_ANN_ISO" in a["title"] for a in r.json())

    def test_b_no_leaves_of_a(self, session, mgr_b):
        r = session.get(f"{API}/leaves", headers=mgr_b["headers"])
        assert r.status_code == 200
        assert not any("TEST_LEAVE" in (l.get("reason") or "") for l in r.json())

    def test_b_no_todos_of_a(self, session, mgr_b):
        r = session.get(f"{API}/todos", headers=mgr_b["headers"])
        assert r.status_code == 200
        assert not any("TEST_TODO" in t["text"] for t in r.json())


# ----------------------------- Cleanup ------------------------------------
def test_zz_cleanup(session, mgr_a, mgr_b):
    for mgr in (mgr_a, mgr_b):
        r = session.get(f"{API}/crew", headers=mgr["headers"])
        if r.status_code == 200:
            for c in r.json():
                if c.get("name", "").startswith("TEST"):
                    session.delete(f"{API}/crew/{c['id']}", headers=mgr["headers"])
