"""
Pytest backend tests for Itqan Void Edition - NEW features:
- AI Assistant chat (GPT-4o via Emergent LLM)
- Team Chat (group + DM, channel scoped by company_id)
- Work Logs (add, list, summary, approve, delete)
- Subscription perks
- Multi-tenancy isolation
"""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://itqan-dashboard.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
VOID_KEY = "701D#V0id_M4st3r$K3y!99X"


# ----------------------------------------------------------------------
# Fixtures: two isolated companies for tenant isolation tests
# ----------------------------------------------------------------------
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
    return _register_manager(session, "A")


@pytest.fixture(scope="module")
def mgr_b(session):
    return _register_manager(session, "B")


@pytest.fixture(scope="module")
def emp_a(session, mgr_a):
    return _create_employee(session, mgr_a, 1)


@pytest.fixture(scope="module")
def emp_b(session, mgr_b):
    return _create_employee(session, mgr_b, 1)


# ----------------------------------------------------------------------
# Subscription perks
# ----------------------------------------------------------------------
class TestPerks:
    def test_options_have_perks(self, session, mgr_a):
        r = session.get(f"{API}/void/options", headers=mgr_a["headers"])
        assert r.status_code == 200
        subs = r.json()["subscriptions"]
        assert len(subs) >= 4
        for s in subs:
            assert "perks" in s and isinstance(s["perks"], list) and len(s["perks"]) > 0

    def test_verify_key_returns_perks(self, session, mgr_a):
        r = session.post(f"{API}/void/verify-key", json={"key": VOID_KEY}, headers=mgr_a["headers"])
        assert r.status_code == 200
        subs = r.json()["options"]["subscriptions"]
        assert all("perks" in s for s in subs)


# ----------------------------------------------------------------------
# AI Assistant
# ----------------------------------------------------------------------
class TestAIChat:
    def test_clear_history_first(self, session, mgr_a):
        r = session.delete(f"{API}/ai-chat/history", headers=mgr_a["headers"])
        assert r.status_code == 200

    def test_send_message_returns_real_reply(self, session, mgr_a):
        r = session.post(f"{API}/ai-chat", json={"message": "مرحبا، اعطني نصيحة قصيرة لرفع إنتاجية الفريق."},
                         headers=mgr_a["headers"], timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "reply" in data and isinstance(data["reply"], str) and len(data["reply"]) > 5
        assert "premium" in data
        # Should NOT be the fallback error
        assert "تعذّر الاتصال" not in data["reply"], f"AI fallback used: {data['reply']}"

    def test_premium_flag_after_activation(self, session, mgr_a):
        # Activate subscription so company is premium
        r = session.post(f"{API}/void/activate",
                         json={"key": VOID_KEY, "option_id": "sub_monthly"},
                         headers=mgr_a["headers"])
        assert r.status_code == 200
        r = session.post(f"{API}/ai-chat", json={"message": "اختصر: ما هي خطوات إدارة فريق صغير؟"},
                         headers=mgr_a["headers"], timeout=60)
        assert r.status_code == 200
        assert r.json()["premium"] is True

    def test_history_returns_messages(self, session, mgr_a):
        r = session.get(f"{API}/ai-chat/history", headers=mgr_a["headers"])
        assert r.status_code == 200
        msgs = r.json()
        assert len(msgs) >= 2  # at least user + assistant
        roles = {m["role"] for m in msgs}
        assert "user" in roles and "assistant" in roles

    def test_clear_history(self, session, mgr_a):
        r = session.delete(f"{API}/ai-chat/history", headers=mgr_a["headers"])
        assert r.status_code == 200
        r2 = session.get(f"{API}/ai-chat/history", headers=mgr_a["headers"])
        assert r2.status_code == 200
        assert r2.json() == []


# ----------------------------------------------------------------------
# Team Chat
# ----------------------------------------------------------------------
class TestTeamChat:
    def test_manager_contacts_returns_crew(self, session, mgr_a, emp_a):
        r = session.get(f"{API}/chat/contacts", headers=mgr_a["headers"])
        assert r.status_code == 200
        contacts = r.json()["contacts"]
        ids = [c["id"] for c in contacts]
        assert emp_a["id"] in ids

    def test_employee_contacts_returns_manager(self, session, emp_a, mgr_a):
        r = session.get(f"{API}/chat/contacts", headers=emp_a["headers"])
        assert r.status_code == 200
        contacts = r.json()["contacts"]
        assert len(contacts) == 1
        assert contacts[0]["role"] == "manager"
        assert contacts[0]["id"] == mgr_a["user"]["id"]

    def test_group_message_send_and_history(self, session, mgr_a, emp_a):
        # Manager sends a group msg
        r = session.post(f"{API}/chat/send",
                         json={"channel_type": "group", "text": "TEST_GROUP من المدير"},
                         headers=mgr_a["headers"])
        assert r.status_code == 200
        # Employee sends one too
        r = session.post(f"{API}/chat/send",
                         json={"channel_type": "group", "text": "TEST_GROUP من الموظف"},
                         headers=emp_a["headers"])
        assert r.status_code == 200
        # Both can see group history
        r1 = session.get(f"{API}/chat/history?channel_type=group", headers=mgr_a["headers"])
        r2 = session.get(f"{API}/chat/history?channel_type=group", headers=emp_a["headers"])
        assert r1.status_code == 200 and r2.status_code == 200
        msgs1 = r1.json()
        msgs2 = r2.json()
        assert any("من المدير" in m["text"] for m in msgs1)
        assert any("من الموظف" in m["text"] for m in msgs2)
        # mine flag flips depending on requester
        mgr_msg = next(m for m in msgs1 if "من المدير" in m["text"])
        assert mgr_msg["mine"] is True
        mgr_msg_seen_by_emp = next(m for m in msgs2 if "من المدير" in m["text"])
        assert mgr_msg_seen_by_emp["mine"] is False

    def test_direct_message_between_manager_and_employee(self, session, mgr_a, emp_a):
        # Manager -> employee
        r = session.post(f"{API}/chat/send",
                         json={"channel_type": "direct", "to_user_id": emp_a["id"], "text": "TEST_DM hello emp"},
                         headers=mgr_a["headers"])
        assert r.status_code == 200
        # Employee -> manager
        r = session.post(f"{API}/chat/send",
                         json={"channel_type": "direct", "to_user_id": mgr_a["user"]["id"], "text": "TEST_DM hi mgr"},
                         headers=emp_a["headers"])
        assert r.status_code == 200
        # Both see same DM thread
        rmgr = session.get(f"{API}/chat/history?channel_type=direct&to_user_id={emp_a['id']}",
                           headers=mgr_a["headers"])
        remp = session.get(f"{API}/chat/history?channel_type=direct&to_user_id={mgr_a['user']['id']}",
                           headers=emp_a["headers"])
        assert rmgr.status_code == 200 and remp.status_code == 200
        msgs_mgr = rmgr.json()
        msgs_emp = remp.json()
        assert len(msgs_mgr) == len(msgs_emp) >= 2
        assert any("hello emp" in m["text"] for m in msgs_mgr)
        assert any("hi mgr" in m["text"] for m in msgs_emp)


# ----------------------------------------------------------------------
# Work Logs
# ----------------------------------------------------------------------
class TestWorkLogs:
    pending_id = None
    mgr_id = None

    def test_employee_creates_pending(self, session, emp_a):
        r = session.post(f"{API}/work-logs",
                         json={"description": "TEST_WL أنجزت مهمة", "price": 200},
                         headers=emp_a["headers"])
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "pending"
        assert data["price"] == 200
        TestWorkLogs.pending_id = data["id"]

    def test_manager_creates_auto_approved(self, session, mgr_a):
        r = session.post(f"{API}/work-logs",
                         json={"description": "TEST_WL مهمة المدير", "price": 500},
                         headers=mgr_a["headers"])
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "approved"
        TestWorkLogs.mgr_id = data["id"]

    def test_employee_sees_own_only(self, session, emp_a):
        r = session.get(f"{API}/work-logs", headers=emp_a["headers"])
        assert r.status_code == 200
        logs = r.json()
        assert all(l["user_id"] == emp_a["id"] for l in logs)
        assert any(l["id"] == TestWorkLogs.pending_id for l in logs)

    def test_manager_sees_all_in_company(self, session, mgr_a):
        r = session.get(f"{API}/work-logs", headers=mgr_a["headers"])
        assert r.status_code == 200
        ids = [l["id"] for l in r.json()]
        assert TestWorkLogs.pending_id in ids
        assert TestWorkLogs.mgr_id in ids

    def test_approve_pending(self, session, mgr_a):
        r = session.post(f"{API}/work-logs/{TestWorkLogs.pending_id}/approve",
                         headers=mgr_a["headers"])
        assert r.status_code == 200
        r2 = session.get(f"{API}/work-logs", headers=mgr_a["headers"])
        log = next(l for l in r2.json() if l["id"] == TestWorkLogs.pending_id)
        assert log["status"] == "approved"

    def test_summary_aggregates(self, session, mgr_a, emp_a):
        from datetime import datetime
        month = datetime.utcnow().strftime("%Y-%m")
        r = session.get(f"{API}/work-logs/summary?month={month}", headers=mgr_a["headers"])
        assert r.status_code == 200
        s = r.json()
        assert "per_employee" in s
        assert s["grand_total"] >= 700  # 200 + 500
        assert s["total_jobs"] >= 2

    def test_employee_can_delete_own_pending(self, session, emp_a):
        # create new pending then delete
        r = session.post(f"{API}/work-logs",
                         json={"description": "TEST_WL_TO_DELETE", "price": 10},
                         headers=emp_a["headers"])
        assert r.status_code == 200
        wid = r.json()["id"]
        r = session.delete(f"{API}/work-logs/{wid}", headers=emp_a["headers"])
        assert r.status_code == 200


# ----------------------------------------------------------------------
# Multi-tenancy isolation
# ----------------------------------------------------------------------
class TestTenantIsolation:
    def test_company_b_cannot_see_company_a_crew(self, session, mgr_a, mgr_b, emp_a):
        r = session.get(f"{API}/crew", headers=mgr_b["headers"])
        assert r.status_code == 200
        ids = [c["id"] for c in r.json()]
        assert emp_a["id"] not in ids

    def test_company_b_cannot_see_company_a_chat(self, session, mgr_b):
        # Send a group message in company A first happened above; B's group history must be empty (own scope)
        r = session.get(f"{API}/chat/history?channel_type=group", headers=mgr_b["headers"])
        assert r.status_code == 200
        msgs = r.json()
        # No TEST_GROUP from A's flow should be here
        assert not any("TEST_GROUP" in m["text"] for m in msgs)

    def test_company_b_cannot_see_company_a_worklogs(self, session, mgr_b):
        r = session.get(f"{API}/work-logs", headers=mgr_b["headers"])
        assert r.status_code == 200
        assert not any("TEST_WL" in l["description"] for l in r.json())

    def test_company_b_finance_does_not_see_company_a_crew(self, session, mgr_b, emp_a):
        r = session.get(f"{API}/finance/summary", headers=mgr_b["headers"])
        assert r.status_code == 200
        per = r.json()["per_employee"]
        assert all(p["id"] != emp_a["id"] for p in per)

    def test_company_b_contacts_does_not_include_a(self, session, mgr_b, emp_a):
        r = session.get(f"{API}/chat/contacts", headers=mgr_b["headers"])
        assert r.status_code == 200
        ids = [c["id"] for c in r.json()["contacts"]]
        assert emp_a["id"] not in ids


# ----------------------------------------------------------------------
# Cleanup
# ----------------------------------------------------------------------
def test_zz_cleanup(session, mgr_a, mgr_b):
    for mgr in (mgr_a, mgr_b):
        r = session.get(f"{API}/crew", headers=mgr["headers"])
        if r.status_code == 200:
            for c in r.json():
                if c["name"].startswith("TEST"):
                    session.delete(f"{API}/crew/{c['id']}", headers=mgr["headers"])
