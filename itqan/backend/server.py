from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import math
import pathlib
import asyncio as _asyncio
import jwt
import bcrypt
import random
import logging
from datetime import datetime, timezone, timedelta, date
from zoneinfo import ZoneInfo
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from pydantic import BaseModel, Field
from ai_engine import smart_ai_reply

# --------------------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------------------
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')

# Initialize with try/except to give descriptive errors instead of crashing uri parser
try:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
except Exception as e:
    print(f"❌ Error connecting to MongoDB: {e}")
    # Fallback to local default to allow server startup and health check
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]

JWT_SECRET = os.environ.get('JWT_SECRET', '9f8c2a7e4b1d6038f5c9ab2d7e0146839cbe57a2d40f1986e3b7c5a9d2148f60')
JWT_ALGORITHM = "HS256"

# The Void Engine master key (feature unlock code, intentionally app-level constant)
VOID_MASTER_KEY = "701D#V0id_M4st3r$K3y!99X"

# ── Login rate-limit (in-memory, per IP) ─────────────────────────────────────
import time as _time
_login_attempts: dict = {}   # ip -> [timestamps]
_LOGIN_WINDOW  = 900          # 15 minutes
_LOGIN_MAX     = 10           # max failed attempts per window
CONTACT_PHONE = "01012930571"
CAIRO_TZ = ZoneInfo("Africa/Cairo")

FREE_ACCOUNT_LIMIT = 6
FREE_STORAGE_MB = 100
STORAGE_COST_EMPLOYEE = 5
STORAGE_COST_PROJECT = 3
STORAGE_COST_EQUIPMENT = 2

VOID_OPTIONS = {
    "managers": [
        {"id": "mgr_1", "label": "مدير واحد", "price": 0, "max_managers": 1,
         "badge": None, "perks": ["حساب مدير واحد", "جميع الصلاحيات الأساسية"]},
        {"id": "mgr_2", "label": "مديران اثنان", "price": 300, "max_managers": 2,
         "badge": "الأكثر طلباً", "perks": ["حسابان للمديرين", "لوحة تحكم مشتركة", "إدارة الخصومات والمصاريف لكل مدير", "صلاحيات كاملة"]},
        {"id": "mgr_3", "label": "ثلاثة مديرين", "price": 600, "max_managers": 3,
         "badge": "للشركات الكبيرة", "perks": ["ثلاثة حسابات مديرين", "لوحة تحكم مشتركة", "إدارة مالية مستقلة لكل مدير", "صلاحيات كاملة", "دعم مخصص"]},
        {"id": "mgr_5", "label": "خمسة مديرين", "price": 900, "max_managers": 5,
         "badge": "للمؤسسات", "perks": ["خمسة حسابات مديرين", "لوحة تحكم مشتركة", "صلاحيات متدرجة", "إدارة مالية مستقلة", "دعم VIP"]},
        {"id": "mgr_10", "label": "عشرة مديرين", "price": 1500, "max_managers": 10,
         "badge": "للشركات الكبرى", "perks": ["عشرة حسابات مديرين", "صلاحيات متكاملة", "لوحة تحكم موحدة", "تقارير إدارية متقدمة", "دعم مخصص حصري"]},
    ],
    "ai_power": [
        {"id": "ai_basic", "label": "ذكاء أساسي", "price": 0, "ai_level": "basic",
         "badge": None, "perks": ["ردود ذكية أساسية", "نصائح إدارية عامة", "إجابات سريعة"]},
        {"id": "ai_pro", "label": "ذكاء احترافي", "price": 400, "ai_level": "pro",
         "badge": "الأكثر طلباً", "perks": ["تحليل الأداء المتقدم", "GPT-4o", "نصائح مالية معمقة", "تقارير ذكية", "كشف الأنماط"]},
        {"id": "ai_ultra", "label": "ذكاء فائق", "price": 800, "ai_level": "ultra",
         "badge": "الأقوى", "perks": ["GPT-4o Ultra", "تحليل تنبؤي", "توصيات استراتيجية", "مراقبة ذكية 24/7", "محرر الكود الذكي بلا حدود"]},
    ],
    "subscriptions": [
        {"id": "sub_trial", "label": "تجريبي", "price": 0, "days": 3, "plan": "trial",
         "add_accounts": 5, "add_mb": 512, "badge": None,
         "perks": ["+5 حسابات طاقم", "+512 ميجا مساحة", "الميزات الأساسية فقط", "دعم فني"]},
        {"id": "sub_weekly", "label": "أسبوعي", "price": 150, "days": 7, "plan": "weekly",
         "add_accounts": 10, "add_mb": 1024, "badge": None,
         "perks": ["+10 حسابات طاقم", "+1 جيجابايت مساحة", "✅ الخزنة والعُهدة", "تصدير التقارير", "دعم فني"]},
        {"id": "sub_monthly", "label": "شهري", "price": 500, "days": 30, "plan": "monthly",
         "add_accounts": 30, "add_mb": 5120, "badge": "الأكثر طلباً",
         "perks": ["+30 حساب طاقم", "+5 جيجابايت مساحة", "✅ الخزنة والعُهدة", "✅ إحصائيات الشركة", "نسخ احتياطي تلقائي", "أولوية في الدعم"]},
        {"id": "sub_quarterly", "label": "ربع سنوي", "price": 1200, "days": 90, "plan": "quarterly",
         "add_accounts": 60, "add_mb": 10240, "badge": "وفّر 20%",
         "perks": ["+60 حساب طاقم", "+10 جيجابايت مساحة", "✅ الخزنة والعُهدة", "✅ إحصائيات الشركة", "✅ الصلاحيات المؤقتة", "نسخ احتياطي يومي", "دعم مباشر"]},
        {"id": "sub_biannual", "label": "نصف سنوي", "price": 2000, "days": 180, "plan": "biannual",
         "add_accounts": 100, "add_mb": 20480, "badge": "وفّر 33%",
         "perks": ["+100 حساب طاقم", "+20 جيجابايت مساحة", "✅ الخزنة والعُهدة", "✅ إحصائيات الشركة", "✅ الصلاحيات المؤقتة", "✅ شات الفريق والمساعد الذكي", "✅ تتبع الأجهزة والـIP", "دعم VIP"]},
        {"id": "sub_yearly", "label": "سنوي", "price": 3000, "days": 365, "plan": "yearly",
         "add_accounts": 200, "add_mb": 51200, "badge": "الأفضل قيمة",
         "perks": ["+200 حساب طاقم", "+50 جيجابايت مساحة", "✅ الخزنة والعُهدة", "✅ إحصائيات الشركة", "✅ الصلاحيات المؤقتة", "✅ شات الفريق والمساعد الذكي", "✅ تتبع الأجهزة والـIP", "✅ استوديو التصميم", "دعم VIP حصري"]},
        {"id": "sub_eternal", "label": "مدى الحياة", "price": 9999, "days": None, "plan": "eternal",
         "add_accounts": 999, "add_mb": 204800, "badge": "مرة واحدة للأبد",
         "perks": ["+999 حساب طاقم", "+200 جيجابايت مساحة", "✅ كل الميزات إلى الأبد", "تحديثات مجانية دائماً", "أولوية قصوى في الدعم", "شارة ELITE حصرية"]},
    ],
    "storage": [
        {"id": "st_1024", "label": "+ 1 جيجابايت", "price": 50, "add_mb": 1024},
        {"id": "st_5120", "label": "+ 5 جيجابايت", "price": 200, "add_mb": 5120},
        {"id": "st_20480", "label": "+ 20 جيجابايت", "price": 600, "add_mb": 20480},
        {"id": "st_51200", "label": "+ 50 جيجابايت", "price": 1200, "add_mb": 51200},
        {"id": "st_102400", "label": "+ 100 جيجابايت", "price": 2000, "add_mb": 102400},
    ],
    "accounts": [
        {"id": "acc_10", "label": "+ 10 حسابات", "price": 120, "add_accounts": 10},
        {"id": "acc_50", "label": "+ 50 حساب", "price": 450, "add_accounts": 50},
        {"id": "acc_200", "label": "+ 200 حساب", "price": 1500, "add_accounts": 200},
        {"id": "acc_500", "label": "+ 500 حساب", "price": 3000, "add_accounts": 500},
    ],
    # Buy ONE feature on its own → permanent/lifetime for the company, forever (no renewal).
    "feature_addons": [
        {"id": "addon_chat", "label": "الشات والمساعد الذكي", "price": 350, "feature": "chat",
         "badge": "دائم مدى الحياة", "perks": ["شات الموظفين", "المساعد الذكي", "بدون تجديد — يبقى مفعّلاً للأبد"]},
        {"id": "addon_vault", "label": "الخزنة والعُهدة", "price": 350, "feature": "vault",
         "badge": "دائم مدى الحياة", "perks": ["إدارة العهدة النقدية (الخزنة)", "بدون تجديد — يبقى مفعّلاً للأبد"]},
        {"id": "addon_stats", "label": "إحصائيات الشركة", "price": 300, "feature": "company_stats",
         "badge": "دائم مدى الحياة", "perks": ["لوحة إحصائيات الشركة الكاملة", "بدون تجديد — يبقى مفعّلاً للأبد"]},
        {"id": "addon_devices", "label": "تتبع الأجهزة والـIP", "price": 300, "feature": "device_tracking",
         "badge": "دائم مدى الحياة", "perks": ["تتبع أجهزة وعناوين IP الحضور", "كشف الأنشطة المشبوهة", "بدون تجديد — يبقى مفعّلاً للأبد"]},
        {"id": "addon_design", "label": "استوديو التصميم", "price": 300, "feature": "design",
         "badge": "دائم مدى الحياة", "perks": ["تخصيص ألوان وخطوط وخلفيات المنصة", "بدون تجديد — يبقى مفعّلاً للأبد"]},
        {"id": "addon_temp_access", "label": "الصلاحيات المؤقتة", "price": 250, "feature": "temp_access",
         "badge": "دائم مدى الحياة", "perks": ["منح موظف صلاحيات مؤقتة كمدير", "تحديد القسم والمدة والصلاحيات", "بدون تجديد — يبقى مفعّلاً للأبد"]},
    ],
    # Buy a BUNDLE of all extra features together → temporary, needs renewal (unlike single purchases above).
    "addon_bundle": [
        {"id": "bundle_month", "label": "باقة الإضافات المجمّعة — شهر", "price": 900, "days": 30,
         "badge": "كل الإضافات معاً", "perks": ["الشات والمساعد الذكي", "الخزنة والعهدة", "إحصائيات الشركة", "تتبع الأجهزة والـIP", "استوديو التصميم", "صالحة 30 يوم ثم تحتاج تجديد"]},
        {"id": "bundle_year", "label": "باقة الإضافات المجمّعة — سنة", "price": 8000, "days": 365,
         "badge": "وفّر أكثر", "perks": ["الشات والمساعد الذكي", "الخزنة والعهدة", "إحصائيات الشركة", "تتبع الأجهزة والـIP", "استوديو التصميم", "صالحة سنة كاملة ثم تحتاج تجديد"]},
    ],
}

# Features that can be bought individually (lifetime) or together as a temporary bundle.
ADDON_FEATURES = {
    "chat": "الشات والمساعد الذكي",
    "vault": "الخزنة والعهدة",
    "company_stats": "إحصائيات الشركة",
    "device_tracking": "تتبع الأجهزة والـIP",
    "design": "استوديو التصميم",
    "temp_access": "الصلاحيات المؤقتة",
}

# --------------------------------------------------------------------------------------
# App
# --------------------------------------------------------------------------------------
app = FastAPI(title="Itqan - Void Edition")

# إضافات الربط (CORS) هنا
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("itqan")


# --------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def cairo_now() -> datetime:
    return datetime.now(CAIRO_TZ)


def ser_user(u: dict) -> dict:
    return {
        "id": str(u["_id"]),
        "company_id": str(u.get("company_id")) if u.get("company_id") else None,
        "name": u.get("name"),
        "username": u.get("username"),
        "email": u.get("email"),
        "role": u.get("role"),
        "avatar_url": u.get("avatar_url"),
        "job_title": u.get("job_title"),
        "phone": u.get("phone"),
        "monthly_salary": u.get("monthly_salary", 0),
        "total_deductions": u.get("total_deductions", 0),
        "total_additions": u.get("total_additions", 0),
        "is_active": u.get("is_active", True),
        "status": u.get("status", "off"),
        "last_checkin_date": u.get("last_checkin_date"),
        "last_activity": u.get("last_activity").isoformat() if isinstance(u.get("last_activity"), datetime) else u.get("last_activity"),
        "created_at": u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
        "registered_device_id": u.get("registered_device_id"),
        "registered_device_label": u.get("registered_device_label"),
        "description": u.get("description"),
        # None/omitted = full access (primary managers always have full access; co_managers default to full
        # access too until the primary manager restricts them via /managers/{id}/permissions).
        "allowed_modules": u.get("allowed_modules"),
    }


# Sidebar/API modules a primary manager can restrict a co_manager's access to.
MANAGER_MODULES = {
    "crew": "إدارة الموظفين", "finance": "المالية والخزنة", "tasks": "المهام والمعدات",
    "reports": "التقارير والتحليلات", "device_tracking": "تتبع الأجهزة والـIP",
    "temp_access": "الصلاحيات المؤقتة", "settings": "إعدادات الشركة", "ai_assistant": "المساعد الذكي",
}


def has_module_access(user: dict, module: str) -> bool:
    """Primary managers always have full access. Co_managers are restricted only if
    allowed_modules is explicitly set on their user doc; None/missing means unrestricted (backward compatible)."""
    if user.get("role") == "manager":
        return True
    allowed = user.get("allowed_modules")
    if allowed is None:
        return True
    return module in allowed


def require_module(module: str):
    async def _dep(request: Request) -> dict:
        user = await require_manager(request)
        if not has_module_access(user, module):
            raise HTTPException(status_code=403, detail=f"لا تملك صلاحية الوصول لهذا القسم: {MANAGER_MODULES.get(module, module)}")
        return user
    return _dep


def subscription_active(company: dict) -> bool:
    sub = company.get("subscription") or {}
    if not sub.get("is_active"):
        return False
    if sub.get("plan_type") == "eternal":
        return True
    end = sub.get("end_date")
    if not end:
        return False
    try:
        end_dt = datetime.fromisoformat(end) if isinstance(end, str) else end
        if not end_dt.tzinfo:
            end_dt = end_dt.replace(tzinfo=timezone.utc)
        return now_utc() < end_dt
    except Exception:
        return False


_PLAN_EFFECTS = {
    "trial":    {"color": "#6b7280", "glow": "rgba(107,114,128,0.4)", "badge": "تجريبي",      "tier": 0},
    "weekly":   {"color": "#0ea5e9", "glow": "rgba(14,165,233,0.4)",  "badge": "أسبوعي",      "tier": 1},
    "monthly":  {"color": "#8b5cf6", "glow": "rgba(139,92,246,0.4)",  "badge": "شهري",        "tier": 2},
    "quarterly":{"color": "#f59e0b", "glow": "rgba(245,158,11,0.4)",  "badge": "ربع سنوي",    "tier": 3},
    "biannual": {"color": "#f43f5e", "glow": "rgba(244,63,94,0.4)",   "badge": "نصف سنوي",    "tier": 4},
    "yearly":   {"color": "#10b981", "glow": "rgba(16,185,129,0.4)",  "badge": "سنوي",        "tier": 5},
    "eternal":  {"color": "#f59e0b", "glow": "rgba(251,191,36,0.6)",  "badge": "مدى الحياة",  "tier": 6},
}

# ── Tiered feature access per subscription plan ──────────────────────────────
# Each plan unlocks only the listed add-on features.
# Features NOT listed here must be purchased separately (permanent addon or bundle).
PLAN_FEATURES: dict[str, set] = {
    "trial":     set(),                                                                          # بدون ميزات إضافية
    "weekly":    {"vault"},                                                                       # الخزنة فقط
    "monthly":   {"vault", "company_stats"},                                                     # + الإحصائيات
    "quarterly": {"vault", "company_stats", "temp_access"},                                      # + الصلاحيات المؤقتة
    "biannual":  {"vault", "company_stats", "temp_access", "chat", "device_tracking"},           # + الشات + تتبع الأجهزة
    "yearly":    {"vault", "company_stats", "temp_access", "chat", "device_tracking", "design"}, # + التصميم
    "eternal":   {"vault", "company_stats", "temp_access", "chat", "device_tracking", "design"}, # كل الميزات
}

def ser_company(c: dict) -> dict:
    sub = c.get("subscription") or {"plan_type": None, "is_active": False}
    plan_type = sub.get("plan_type")
    is_active = subscription_active(c)
    return {
        "addons": {k: {"unlocked": has_feature_access(c, k), "permanent": (c.get("addons") or {}).get(k, {}).get("permanent", False)} for k in ADDON_FEATURES},
        "addon_bundle": {"is_active": addon_bundle_active(c), "expires_at": (c.get("addon_bundle") or {}).get("expires_at")},
        "id": str(c["_id"]),
        "name": c.get("name"),
        "logo_url": c.get("logo_url"),
        "industry": c.get("industry"),
        "industry_pack": c.get("industry_pack"),
        "onboarding_done": c.get("onboarding_done", False),
        "phone": c.get("phone"),
        "address": c.get("address"),
        "storage_used_mb": c.get("storage_used_mb", 0),
        "storage_limit_mb": c.get("storage_limit_mb", FREE_STORAGE_MB),
        "account_limit": c.get("account_limit", FREE_ACCOUNT_LIMIT),
        "manager_limit": c.get("manager_limit", 1),
        "subscription": sub,
        "is_premium": is_active,
        "plan_effects": _PLAN_EFFECTS.get(plan_type) if is_active and plan_type else None,
        "ai_level": c.get("ai_level", "basic"),
        "attendance": c.get("attendance") or {},
        "settings": c.get("settings") or {},
        "created_at": c.get("created_at").isoformat() if isinstance(c.get("created_at"), datetime) else c.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="غير مصرح. الرجاء تسجيل الدخول")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="المستخدم غير موجود")
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_activity": now_utc()}})
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="رمز غير صالح")


async def require_manager(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") not in ("manager", "co_manager"):
        raise HTTPException(status_code=403, detail="هذه الصلاحية للمدير فقط")
    return user


async def require_subscription(user: dict = Depends(get_current_user)) -> dict:
    """Dependency: blocks access unless the company has an active paid subscription."""
    company = await db.companies.find_one({"_id": user["company_id"]})
    if not company or not subscription_active(company):
        raise HTTPException(
            status_code=402,
            detail="❌ هذه الميزة متاحة للمشتركين فقط. قم بالترقية من صفحة الاشتراكات",
        )
    return user


def addon_bundle_active(company: dict) -> bool:
    bundle = company.get("addon_bundle") or {}
    if not bundle.get("is_active"):
        return False
    end = bundle.get("expires_at")
    if not end:
        return False
    try:
        end_dt = datetime.fromisoformat(end) if isinstance(end, str) else end
        if not end_dt.tzinfo:
            end_dt = end_dt.replace(tzinfo=timezone.utc)
        return now_utc() < end_dt
    except Exception:
        return False


def has_feature_access(company: dict, feature: str) -> bool:
    """A gated add-on feature is unlocked if:
    1. The active subscription plan includes this feature in PLAN_FEATURES, OR
    2. The feature was bought individually as a permanent/lifetime add-on, OR
    3. An active addon_bundle currently covers it (temporary).
    Each subscription plan only unlocks the specific features mapped in PLAN_FEATURES —
    lower-tier plans do NOT grant access to features reserved for higher tiers."""
    # 1. Check plan-based tiered access
    if subscription_active(company):
        sub = company.get("subscription") or {}
        plan_type = sub.get("plan_type", "")
        if feature in PLAN_FEATURES.get(plan_type, set()):
            return True
    # 2. Permanently purchased individual addon
    addons = company.get("addons") or {}
    if addons.get(feature, {}).get("permanent"):
        return True
    # 3. Active temporary bundle
    if addon_bundle_active(company) and feature in (company.get("addon_bundle") or {}).get("features", []):
        return True
    return False


def require_feature(feature: str):
    """Dependency factory: blocks access to a gated add-on feature unless the company has it
    via active subscription, permanent single-feature purchase, or an active bundle.
    Managers (primary & co) always have access — they own the account.
    Any authenticated user may call these endpoints if the feature is unlocked (e.g. chat)."""
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        # Managers (account owners) bypass subscription gates entirely
        if user.get("role") in ("manager", "co_manager"):
            return user
        company = await db.companies.find_one({"_id": user["company_id"]})
        if not company or not has_feature_access(company, feature):
            raise HTTPException(
                status_code=402,
                detail=f"❌ ميزة «{ADDON_FEATURES.get(feature, feature)}» تحتاج اشتراكاً فعّالاً أو شراءها كإضافة من صفحة الاشتراكات",
            )
        return user
    return _dep


def require_manager_feature(feature: str):
    """Dependency factory: requires BOTH manager/co_manager role AND feature access.
    Primary managers always have access (they own the account).
    Co-managers need the feature unlocked via subscription/add-on."""
    async def _dep(request: Request) -> dict:
        user = await require_manager(request)
        # Primary manager always has full access
        if user.get("role") == "manager":
            return user
        company = await db.companies.find_one({"_id": user["company_id"]})
        if not company or not has_feature_access(company, feature):
            raise HTTPException(
                status_code=402,
                detail=f"❌ ميزة «{ADDON_FEATURES.get(feature, feature)}» تحتاج اشتراكاً فعّالاً أو شراءها كإضافة من صفحة الاشتراكات",
            )
        return user
    return _dep


def require_company_feature_manager(feature: str):
    """Dependency factory: requires manager/co_manager role AND enforces subscription
    on ALL managers — including the primary manager. Use this for premium features
    that must be paid for even by account owners (device_tracking, temp_access)."""
    async def _dep(request: Request) -> dict:
        user = await require_manager(request)
        company = await db.companies.find_one({"_id": user["company_id"]})
        if not company or not has_feature_access(company, feature):
            raise HTTPException(
                status_code=402,
                detail=f"❌ ميزة «{ADDON_FEATURES.get(feature, feature)}» تحتاج اشتراكاً فعّالاً أو شراءها كإضافة من صفحة الاشتراكات",
            )
        return user
    return _dep


async def require_primary_manager(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "manager":
        raise HTTPException(status_code=403, detail="هذه الصلاحية للمدير الرئيسي فقط")
    return user


async def get_company(user: dict) -> dict:
    company = await db.companies.find_one({"_id": user["company_id"]})
    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")
    return company


def safe_object_id(id_str: str) -> ObjectId:
    """Convert string to ObjectId, raising 400 on invalid format."""
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="معرّف غير صالح")


def ensure_storage(company: dict, add_mb: int):
    used = company.get("storage_used_mb", 0)
    limit = company.get("storage_limit_mb", FREE_STORAGE_MB)
    if used + add_mb > limit:
        raise HTTPException(
            status_code=403,
            detail=f"تم استهلاك المساحة التخزينية بالكامل ({used}/{limit} ميجا). للترقية تواصل مع الإدارة: {CONTACT_PHONE}",
        )


# --------------------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------------------
class RegisterManager(BaseModel):
    company_name: str
    name: str
    email: str
    password: str


class LoginInput(BaseModel):
    identifier: str
    password: str
    role: str  # manager | member


class CrewCreate(BaseModel):
    name: str
    username: str
    password: str
    job_title: Optional[str] = ""
    monthly_salary: int = 0
    phone: Optional[str] = ""
    avatar_url: Optional[str] = None


class CrewUpdate(BaseModel):
    name: Optional[str] = None
    job_title: Optional[str] = None
    monthly_salary: Optional[int] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None
    password: Optional[str] = None
    reset_device: Optional[bool] = None


class TransactionInput(BaseModel):
    type: str  # deduction | addition | salary
    amount: int
    reason: Optional[str] = ""


class ShiftConfig(BaseModel):
    enabled: bool = False
    label: Optional[str] = ""
    work_start: str = "09:00"
    work_end: str = "17:00"
    check_in_deadline: str = "09:30"
    late_deduction: int = 50
    absence_deduction: int = 200


class AttendanceSettings(BaseModel):
    check_in_deadline: str = "09:30"
    work_start: str = "09:00"
    work_end: str = "17:00"
    late_deduction: int = 50
    absence_deduction: int = 200
    shifts: Optional[dict] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    settings: Optional[dict] = None


class EquipmentInput(BaseModel):
    name: str
    amount: int
    assigned_to: Optional[str] = None
    note: Optional[str] = ""


class ProjectInput(BaseModel):
    name: str
    budget_spent: int = 0
    equipment_used: Optional[List[str]] = []
    assigned_crew: Optional[List[str]] = []
    manager_spending: int = 0
    personal_expense: int = 0
    advance_payment: int = 0
    company_name: Optional[str] = ""
    owner_name: Optional[str] = ""
    recipient_name: Optional[str] = ""
    work_date: Optional[str] = None
    status: Optional[str] = "active"
    note: Optional[str] = ""


class VoidVerify(BaseModel):
    key: str


class VoidActivate(BaseModel):
    key: str
    option_id: str


class InviteManager(BaseModel):
    name: str
    username: str
    password: str
    job_title: Optional[str] = "مدير مشارك"
    monthly_salary: Optional[int] = 0
    phone: Optional[str] = ""
    description: Optional[str] = ""


class UpdateManagerFinance(BaseModel):
    monthly_salary: Optional[int] = None
    total_deductions: Optional[int] = None
    total_additions: Optional[int] = None
    note: Optional[str] = ""


class UpdatePrices(BaseModel):
    secret: str
    prices: dict


# --------------------------------------------------------------------------------------
# Auth Routes
# --------------------------------------------------------------------------------------
@api.post("/auth/register-manager")
async def register_manager(body: RegisterManager):
    email = body.email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="هذا البريد مسجّل بالفعل")

    company_doc = {
        "name": body.company_name,
        "logo_url": None,
        "industry": "",
        "phone": "",
        "address": "",
        "storage_used_mb": 0,
        "storage_limit_mb": FREE_STORAGE_MB,
        "account_limit": FREE_ACCOUNT_LIMIT,
        "manager_limit": 1,
        "subscription": {"plan_type": None, "is_active": False, "start_date": None, "end_date": None},
        "attendance": {
            "check_in_deadline": "09:30",
            "work_start": "09:00",
            "work_end": "17:00",
            "late_deduction": 50,
            "absence_deduction": 200,
        },
        "settings": {
            "ai_monitor_enabled": True,
            "allow_employee_self_edit": False,
            "notifications": True,
            "default_theme": "void",
            "two_factor": False,
            "weekend_days": ["friday", "saturday"],
            "currency": "EGP",
            "email_alerts": False,
            "sms_alerts": False,
            "audit_log": True,
            "lock_after_hours": False,
            "auto_backup": True,
            "overtime_rate": 1.5,
            "leave_quota_days": 21,
            "allow_late_check_grace": True,
            "grace_minutes": 15,
            "require_location_checkin": False,
            "allow_employee_leave_request": True,
            "show_salary_to_employee": False,
            "work_days_per_month": 26,
        },
        "created_at": now_utc(),
    }
    company_res = await db.companies.insert_one(company_doc)
    company_id = company_res.inserted_id

    user_doc = {
        "company_id": company_id,
        "role": "manager",
        "name": body.name,
        "username": email.split("@")[0],
        "email": email,
        "password_hash": hash_password(body.password),
        "avatar_url": None,
        "job_title": "المدير العام",
        "phone": "",
        "monthly_salary": 0,
        "total_deductions": 0,
        "total_additions": 0,
        "is_active": True,
        "status": "present",
        "last_checkin_date": None,
        "last_activity": now_utc(),
        "created_at": now_utc(),
    }
    user_res = await db.users.insert_one(user_doc)
    user_doc["_id"] = user_res.inserted_id
    token = create_access_token(str(user_res.inserted_id), "manager")
    company_doc["_id"] = company_id
    return {"access_token": token, "user": ser_user(user_doc), "company": ser_company(company_doc)}


@api.post("/auth/login")
async def login(body: LoginInput, request: Request):
    # ── Rate-limit: max 10 failed attempts per IP per 15 min ─────────────────
    client_ip_rl = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    now_ts = _time.time()
    attempts = [t for t in _login_attempts.get(client_ip_rl, []) if now_ts - t < _LOGIN_WINDOW]
    if len(attempts) >= _LOGIN_MAX:
        raise HTTPException(status_code=429, detail="❌ تم تجاوز الحد الأقصى لمحاولات الدخول. حاول مجدداً بعد 15 دقيقة")
    # ─────────────────────────────────────────────────────────────────────────

    ident = body.identifier.strip().lower()
    # co_managers can also login with role="manager" from the frontend
    roles_to_check = ["manager", "co_manager"] if body.role == "manager" else [body.role]
    query = {"$or": [{"email": ident}, {"username": body.identifier.strip()}], "role": {"$in": roles_to_check}}
    user = await db.users.find_one(query)
    if not user or not verify_password(body.password, user["password_hash"]):
        # Record failed attempt
        attempts.append(now_ts)
        _login_attempts[client_ip_rl] = attempts
        raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="تم تعطيل هذا الحساب. تواصل مع المدير")
    token = create_access_token(str(user["_id"]), user["role"])
    try:
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "غير معروف")
        device_info = request.headers.get("User-Agent", "غير محدد")
        await log_activity(
            company_id=user["company_id"],
            user_id=user["_id"],
            user_name=user.get("name", ""),
            action="login", ip=client_ip,
            message=f"تسجيل دخول ({user.get('name')} ({user.get('role')})",
            details=f"الجهاز : {device_info}",
        )
        _asyncio.create_task(record_device_history(
            user["_id"], user["company_id"], "", device_info, client_ip, "", photo=None, scan_type="login",
        ))
    except Exception as err:
        logger.error(f"Login post-processing error: {err}")

    company_data = None
    try:
        if "company_id" in user and user["company_id"]:
            company_data = await get_company(user)
    except Exception:
        pass

    return {
    "access_token": token,
    "user": ser_user(user),
    "company": ser_company(company_data) if company_data else None
}
class UpdateMyProfile(BaseModel):
    avatar_url: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None

@api.put("/auth/update-profile")
async def update_my_profile(body: UpdateMyProfile, user: dict = Depends(get_current_user)):
    """Let any logged-in user update their own avatar / name / phone."""
    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        return {"ok": True}
    # All users (managers and crew) are stored in db.users
    result = await db.users.update_one({"_id": user["_id"]}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    return {"ok": True}


# --------------------------------------------------------------------------------------
# Company Routes
# --------------------------------------------------------------------------------------
@api.get("/company")
async def company_info(user: dict = Depends(get_current_user)):
    company = await get_company(user)
    crew_count = await db.users.count_documents({"company_id": user["company_id"], "role": "member"})
    return {**ser_company(company), "crew_count": crew_count}


@api.put("/company")
async def update_company(body: CompanyUpdate, user: dict = Depends(require_manager)):
    company = await get_company(user)
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "settings" in update:
        merged = {**(company.get("settings") or {}), **update["settings"]}
        update["settings"] = merged
    await db.companies.update_one({"_id": company["_id"]}, {"$set": update})
    company = await get_company(user)
    return ser_company(company)


# ─────────────────────────────────────────────────────────────────────────────
# Industry Packs  (V5.0)
# ─────────────────────────────────────────────────────────────────────────────
INDUSTRY_PACKS = [
    {
        "id": "photography",
        "name": "شركات التصوير والإنتاج",
        "icon": "📸",
        "color": "from-pink-500 to-rose-500",
        "description": "فوتوغرافي، فيديو، إنتاج إعلاني",
        "terminology": {"task": "جلسة/مشروع تصوير", "project": "مشروع إنتاج", "client": "عميل"},
        "custom_fields": ["الموقع", "المعدات", "اسم العميل", "حالة التسليم"],
        "features": ["equipment_tracking", "client_portal", "asset_library"],
    },
    {
        "id": "marketing",
        "name": "وكالات الإعلانات والتسويق",
        "icon": "📢",
        "color": "from-orange-500 to-amber-500",
        "description": "إعلانات، تسويق رقمي، حملات",
        "terminology": {"task": "حملة/تسليمة إعلانية", "project": "حملة تسويقية", "client": "حساب عميل"},
        "custom_fields": ["اسم الحساب", "الميزانية", "تاريخ الإطلاق", "KPIs"],
        "features": ["client_portal", "performance_analytics"],
    },
    {
        "id": "salon",
        "name": "صالونات ومراكز التجميل",
        "icon": "💇",
        "color": "from-fuchsia-500 to-pink-500",
        "description": "صالونات، سبا، عناية شخصية",
        "terminology": {"task": "موعد/خدمة", "project": "حجز", "client": "زبون"},
        "custom_fields": ["نوع الخدمة", "العمولة", "تذكير واتساب"],
        "features": ["appointments", "commissions", "whatsapp_reminders"],
    },
    {
        "id": "medical",
        "name": "شركات الأدوية والقطاع الصحي",
        "icon": "💊",
        "color": "from-emerald-500 to-teal-500",
        "description": "أدوية، عيادات، خدمات صحية",
        "terminology": {"task": "مهمة طبية", "project": "مشروع صحي", "client": "مريض/عميل"},
        "custom_fields": ["رقم الدُفعة", "تاريخ الصلاحية", "تقارير الامتثال"],
        "features": ["batch_tracking", "compliance_reports", "expiry_alerts"],
    },
    {
        "id": "retail",
        "name": "شركات التجارة والبيع بالتجزئة",
        "icon": "🛍️",
        "color": "from-blue-500 to-cyan-500",
        "description": "تجارة، بيع بالتجزئة، متاجر",
        "terminology": {"task": "أمر بيع/شراء", "project": "عملية تجارية", "client": "عميل"},
        "custom_fields": ["رقم المنتج", "الكمية", "المستودع"],
        "features": ["inventory", "invoicing", "sales_reports"],
    },
    {
        "id": "restaurant",
        "name": "قطاع المطاعم والضيافة",
        "icon": "🍽️",
        "color": "from-yellow-500 to-orange-500",
        "description": "مطاعم، كافيهات، ضيافة",
        "terminology": {"task": "وردية/خدمة", "project": "فعالية", "client": "زبون"},
        "custom_fields": ["الوردية", "الطاولة", "اسم الطاهي"],
        "features": ["shift_scheduling", "commissions", "inventory"],
    },
    {
        "id": "construction",
        "name": "شركات المقاولات والإنشاءات",
        "icon": "🏗️",
        "color": "from-stone-500 to-slate-500",
        "description": "مقاولات، بناء، هندسة",
        "terminology": {"task": "مرحلة/بند", "project": "مشروع إنشائي", "client": "مالك المشروع"},
        "custom_fields": ["الموقع", "المرحلة", "المقاول الفرعي", "ميزانية البند"],
        "features": ["equipment_tracking", "compliance_reports", "budget_tracking"],
    },
    {
        "id": "software",
        "name": "شركات التكنولوجيا والبرمجيات",
        "icon": "💻",
        "color": "from-violet-500 to-indigo-500",
        "description": "برمجيات، تقنية، تطوير",
        "terminology": {"task": "تذكرة/سبرينت", "project": "منتج/مشروع تقني", "client": "عميل تقني"},
        "custom_fields": ["نوع المهمة", "الأولوية", "Sprint", "رابط Git"],
        "features": ["ticketing", "developer_platform", "api_gateway"],
    },
    {
        "id": "education",
        "name": "مراكز التعليم والتدريب",
        "icon": "🎓",
        "color": "from-sky-500 to-blue-500",
        "description": "تعليم، تدريب، دورات",
        "terminology": {"task": "محاضرة/جلسة", "project": "دورة تدريبية", "client": "طالب"},
        "custom_fields": ["المحتوى التدريبي", "المستوى", "معدل الإتمام"],
        "features": ["learning_center", "performance_reviews", "attendance"],
    },
    {
        "id": "general",
        "name": "أخرى / نشاط عام",
        "icon": "✏️",
        "color": "from-gray-500 to-slate-500",
        "description": "أي نشاط تجاري آخر — القالب العام القابل للتخصيص",
        "terminology": {"task": "مهمة", "project": "مشروع", "client": "عميل"},
        "custom_fields": [],
        "features": ["custom_fields", "all_modules"],
    },
]


@api.get("/team-pulse")
async def team_pulse(user: dict = Depends(require_manager)):
    """Daily team pulse — who's here, late tasks, needs follow-up."""
    today = cairo_now().date()
    crew = await db.users.find(
        {"company_id": user["company_id"], "role": "member", "is_active": True}
    ).to_list(500)

    pulse = []
    for m in crew:
        uid = m["_id"]
        # today's attendance – use attendance_logs (the authoritative collection)
        att = await db.attendance_logs.find_one(
            {"user_id": uid, "company_id": user["company_id"],
             "log_date": today.isoformat()},
            sort=[("created_at", -1)],
        )
        checked_in = att is not None
        checked_out = att.get("check_out") is not None if att else False
        status = "present" if checked_in and not checked_out else ("done" if checked_out else "absent")

        # pending tasks
        late_tasks = await db.projects.count_documents({
            "company_id": user["company_id"],
            "assigned_crew": str(uid),
            "status": {"$in": ["active", "pending"]},
        })

        pulse.append({
            "id": str(uid),
            "name": m.get("name", ""),
            "job_title": m.get("job_title", ""),
            "avatar_url": m.get("avatar_url"),
            "status": status,
            "checked_in": checked_in,
            "checked_out": checked_out,
            "late_tasks": late_tasks,
            "needs_followup": late_tasks > 0 or not checked_in,
        })

    # sort: absent first, then present with late tasks, then done
    order = {"absent": 0, "present": 1, "done": 2}
    pulse.sort(key=lambda x: (order.get(x["status"], 9), -x["late_tasks"]))

    return {
        "date": today.isoformat(),
        "total": len(pulse),
        "present": sum(1 for p in pulse if p["status"] == "present"),
        "absent": sum(1 for p in pulse if p["status"] == "absent"),
        "done": sum(1 for p in pulse if p["status"] == "done"),
        "needs_followup": sum(1 for p in pulse if p["needs_followup"]),
        "members": pulse,
    }


class ManagerPermissionsInput(BaseModel):
    allowed_modules: Optional[list] = None  # None = full access; [] = no access; [...] = only those modules


@api.put("/managers/{mgr_id}/permissions")
async def set_manager_permissions(mgr_id: str, body: ManagerPermissionsInput, user: dict = Depends(require_primary_manager)):
    """Primary manager restricts which sections a co_manager can use (e.g. only 'إدارة الموظفين')."""
    target = await db.users.find_one({"_id": safe_object_id(mgr_id), "company_id": user["company_id"], "role": "co_manager"})
    if not target:
        raise HTTPException(status_code=404, detail="المدير المشارك غير موجود")
    if body.allowed_modules is not None:
        invalid = [m for m in body.allowed_modules if m not in MANAGER_MODULES]
        if invalid:
            raise HTTPException(status_code=400, detail=f"أقسام غير معروفة: {', '.join(invalid)}")
    await db.users.update_one({"_id": target["_id"]}, {"$set": {"allowed_modules": body.allowed_modules}})
    await log_activity(company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
                        action="set_permissions",
                        message=f"تحديد صلاحيات {target.get('name')}: " + (
                            "كل الصلاحيات" if body.allowed_modules is None
                            else "بدون صلاحيات" if not body.allowed_modules
                            else "، ".join(MANAGER_MODULES.get(m, m) for m in body.allowed_modules)
                        ))
    target = await db.users.find_one({"_id": target["_id"]})
    return ser_user(target)


@api.get("/manager-modules")
async def list_manager_modules(user: dict = Depends(require_manager)):
    """List of restrictable module keys/labels, for building the permissions UI."""
    return [{"key": k, "label": v} for k, v in MANAGER_MODULES.items()]


@api.put("/company/attendance-settings")
async def update_attendance_settings(body: AttendanceSettings, user: dict = Depends(require_manager)):
    company = await get_company(user)
    await db.companies.update_one({"_id": company["_id"]}, {"$set": {"attendance": body.model_dump()}})
    company = await get_company(user)
    return ser_company(company)


# --------------------------------------------------------------------------------------
# Crew Routes
# --------------------------------------------------------------------------------------
@api.get("/crew")
async def list_crew(user: dict = Depends(require_module("crew"))):
    crew = await db.users.find({"company_id": user["company_id"], "role": "member"}).sort("created_at", -1).to_list(500)
    return [ser_user(c) for c in crew]


@api.post("/crew")
async def create_crew(body: CrewCreate, user: dict = Depends(require_module("crew"))):
    company = await get_company(user)
    count = await db.users.count_documents({"company_id": user["company_id"], "role": "member"})
    if count >= company.get("account_limit", FREE_ACCOUNT_LIMIT):
        raise HTTPException(
            status_code=403,
            detail=f"وصلت للحد الأقصى للحسابات ({company.get('account_limit')}). لإضافة المزيد تواصل مع الإدارة: {CONTACT_PHONE}",
        )
    ensure_storage(company, STORAGE_COST_EMPLOYEE)

    username = body.username.strip()
    if await db.users.find_one({"username": username, "company_id": user["company_id"]}):
        raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل")

    doc = {
        "company_id": user["company_id"],
        "role": "member",
        "name": body.name,
        "username": username,
        "email": f"{username}@{str(user['company_id'])[:6]}.itqan",
        "password_hash": hash_password(body.password),
        "avatar_url": body.avatar_url,
        "job_title": body.job_title or "",
        "phone": body.phone or "",
        "monthly_salary": body.monthly_salary or 0,
        "total_deductions": 0,
        "total_additions": 0,
        "is_active": True,
        "status": "off",
        "last_checkin_date": None,
        "last_activity": now_utc(),
        "created_at": now_utc(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    await db.companies.update_one({"_id": company["_id"]}, {"$inc": {"storage_used_mb": STORAGE_COST_EMPLOYEE}})
    await log_activity(
        company_id=user["company_id"],
        user_id=user["_id"],
        user_name=user.get("name", ""),
        action="crew",
        message=f"إضافة موظف جديد: {body.name} | {body.job_title or 'موظف'}",
    )
    return ser_user(doc)


@api.put("/crew/{crew_id}")
async def update_crew(crew_id: str, body: CrewUpdate, user: dict = Depends(require_module("crew"))):
    target = await db.users.find_one({"_id": safe_object_id(crew_id), "company_id": user["company_id"]})
    if not target:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    reset_device = body.reset_device
    update = {k: v for k, v in body.model_dump().items() if v is not None and k not in ("password", "reset_device")}
    if body.password:
        update["password_hash"] = hash_password(body.password)
    if update:
        await db.users.update_one({"_id": target["_id"]}, {"$set": update})
    if reset_device:
        await db.users.update_one(
            {"_id": target["_id"]},
            {"$unset": {"registered_device_id": "", "registered_device_label": ""}},
        )
        await log_activity(
            company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
            action="reset_device",
            message=f"إعادة ضبط جهاز البصمة لـ {target.get('name')} — يمكنه التسجيل من هاتف جديد",
        )
    target = await db.users.find_one({"_id": target["_id"]})
    return ser_user(target)


@api.delete("/crew/{crew_id}")
async def delete_crew(crew_id: str, user: dict = Depends(require_module("crew"))):
    target = await db.users.find_one({"_id": safe_object_id(crew_id), "company_id": user["company_id"], "role": "member"})
    if not target:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    await db.users.delete_one({"_id": target["_id"]})
    await db.attendance_logs.delete_many({"user_id": target["_id"]})
    await db.device_history.delete_many({"user_id": target["_id"]})
    await db.companies.update_one(
        {"_id": user["company_id"], "storage_used_mb": {"$gte": STORAGE_COST_EMPLOYEE}},
        {"$inc": {"storage_used_mb": -STORAGE_COST_EMPLOYEE}},
    )
    return {"ok": True}


@api.post("/crew/{crew_id}/transaction")
async def crew_transaction(crew_id: str, body: TransactionInput, user: dict = Depends(get_current_user)):
    # Managers can edit anyone; members can record their own (manager monitors)
    target = await db.users.find_one({"_id": safe_object_id(crew_id), "company_id": user["company_id"]})
    if not target:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    if user["role"] not in ("manager", "co_manager") and str(target["_id"]) != str(user["_id"]):
        raise HTTPException(status_code=403, detail="غير مسموح")

    if body.type == "deduction":
        await db.users.update_one({"_id": target["_id"]}, {"$inc": {"total_deductions": body.amount}})
    elif body.type == "addition":
        await db.users.update_one({"_id": target["_id"]}, {"$inc": {"total_additions": body.amount}})
    elif body.type == "salary":
        await db.users.update_one({"_id": target["_id"]}, {"$set": {"monthly_salary": body.amount}})
    else:
        raise HTTPException(status_code=400, detail="نوع غير صالح")

    log = {
        "company_id": user["company_id"],
        "user_id": target["_id"],
        "type": body.type,
        "amount": body.amount,
        "reason": body.reason or "",
        "recorded_by": user["_id"],
        "recorded_by_name": user.get("name"),
        "created_at": now_utc(),
    }
    await db.transactions.insert_one(log)
    target = await db.users.find_one({"_id": target["_id"]})
    return ser_user(target)


@api.get("/transactions")
async def list_transactions(user: dict = Depends(get_current_user)):
    query = {"company_id": user["company_id"]}
    if user["role"] != "manager":
        query["user_id"] = user["_id"]
    logs = await db.transactions.find(query).sort("created_at", -1).to_list(200)
    name_cache = {}
    out = []
    for l in logs:
        uid = l.get("user_id") or l.get("crew_id")  # support legacy crew_id field
        if uid is None:
            continue
        if uid not in name_cache:
            u = await db.users.find_one({"_id": uid})
            name_cache[uid] = u.get("name") if u else "—"
        out.append({
            "id": str(l["_id"]),
            "user_id": str(uid),
            "user_name": name_cache[uid],
            "type": l["type"],
            "amount": l["amount"],
            "reason": l.get("reason", ""),
            "recorded_by_name": l.get("recorded_by_name"),
            "created_at": l["created_at"].isoformat() if isinstance(l.get("created_at"), datetime) else l.get("created_at"),
        })
    return out


# --------------------------------------------------------------------------------------
# Attendance Routes
# --------------------------------------------------------------------------------------
class CheckinInput(BaseModel):
    photo: Optional[str] = None


def _get_active_shift(att: dict, now_c) -> tuple:
    """
    Return (shift_name, shift_dict) for whichever enabled shift covers the current Cairo time.
    Handles overnight shifts (e.g. work_start=22:00, work_end=06:00).
    Falls back to the first enabled shift, or to att itself with key 'default'.
    """
    shifts = att.get("shifts", {})
    now_min = now_c.hour * 60 + now_c.minute
    for name, sh in shifts.items():
        if not sh.get("enabled"):
            continue
        try:
            ws_h, ws_m = [int(x) for x in sh["work_start"].split(":")]
            we_h, we_m = [int(x) for x in sh["work_end"].split(":")]
        except Exception:
            continue
        start_min = ws_h * 60 + ws_m
        end_min   = we_h * 60 + we_m
        if end_min <= start_min:               # overnight (e.g. 22:00 → 06:00)
            if now_min >= start_min or now_min < end_min:
                return name, sh
        else:
            if start_min <= now_min < end_min:
                return name, sh
    # No window matched — pick first enabled shift as best guess
    for name, sh in shifts.items():
        if sh.get("enabled"):
            return name, sh
    return "default", att                      # absolute fallback


async def _reverse_absence_if_exists(user_id, today: str):
    """If the employee was auto-marked absent today (process-absences ran early),
    delete that log and refund the deduction so the real checkin takes over."""
    absence_log = await db.attendance_logs.find_one(
        {"user_id": user_id, "log_date": today, "type": "absence"}
    )
    if absence_log:
        await db.attendance_logs.delete_one({"_id": absence_log["_id"]})
        deduction = absence_log.get("deduction_amount", 0) or 0
        if deduction:
            await db.users.update_one(
                {"_id": user_id}, {"$inc": {"total_deductions": -deduction}}
            )


@api.post("/attendance/checkin")
async def checkin(body: CheckinInput = CheckinInput(), user: dict = Depends(get_current_user)):
    company = await get_company(user)
    today = cairo_now().date().isoformat()
    if user.get("last_checkin_date") == today:
        return {"status": user.get("status"), "message": "سجّلت حضورك بالفعل اليوم", "already": True}

    # Cancel any accidental absence log before registering the real checkin
    await _reverse_absence_if_exists(user["_id"], today)

    att = company.get("attendance", {})
    now_c = cairo_now()
    assigned_shift_name = user.get("shift")
    if assigned_shift_name and assigned_shift_name in att.get("shifts", {}):
        shift_name = assigned_shift_name
        shift = att["shifts"][shift_name]
    else:
        shift_name, shift = _get_active_shift(att, now_c)
        hh, mm = 9, 30
    deadline = now_c.replace(hour=hh, minute=mm, second=0, microsecond=0)
    _s = company.get("settings", {})
    _grace = int(_s.get("grace_minutes", 0)) if _s.get("allow_late_check_grace") else 0
    effective_deadline = deadline + timedelta(minutes=_grace)
    is_late = now_c.replace(second=0, microsecond=0) > effective_deadline
    status = "late" if is_late else "present"
    deduction = shift.get("late_deduction", att.get("late_deduction", 50)) if is_late else 0

    log = {
        "company_id": user["company_id"],
        "user_id": user["_id"],
        "log_date": today,
        "type": status,
        "shift": shift_name,
        "deduction_amount": deduction,
        "check_time": now_c.strftime("%H:%M"),
        "photo": body.photo,
        "created_at": now_utc(),
    }
    await db.attendance_logs.insert_one(log)
    update = {"last_checkin_date": today, "status": status, "last_activity": now_utc()}
    inc = {}
    if deduction:
        inc["total_deductions"] = deduction
    await db.users.update_one({"_id": user["_id"]}, {"$set": update, **({"$inc": inc} if inc else {})})

    if is_late:
        await db.ai_alerts.insert_one({
            "company_id": user["company_id"], "user_id": user["_id"],
            "message": f"⏰ تأخّر {user.get('name')} عن الحضور (سجّل {now_c.strftime('%H:%M')}). خصم {deduction} ج.م",
            "severity": "warning", "is_read": False, "created_at": now_utc(),
        })
    return {"status": status, "message": "تم تسجيل الحضور بنجاح" if not is_late else f"تم التسجيل متأخراً - خصم {deduction} ج.م", "deduction": deduction}


@api.post("/attendance/process-absences")
async def process_absences(user: dict = Depends(require_manager)):
    company = await get_company(user)
    today = cairo_now().date().isoformat()
    att = company.get("attendance", {})
    now_c = cairo_now()
    _, active_shift = _get_active_shift(att, now_c)
    absence_deduction = active_shift.get("absence_deduction", att.get("absence_deduction", 200))
    crew = await db.users.find({"company_id": user["company_id"], "role": "member", "is_active": True}).to_list(500)
    marked = 0
    for c in crew:
        if c.get("last_checkin_date") == today:
            continue
        exists = await db.attendance_logs.find_one({"user_id": c["_id"], "log_date": today})
        if exists:
            continue
        await db.attendance_logs.insert_one({
            "company_id": user["company_id"], "user_id": c["_id"], "log_date": today,
            "type": "absence", "deduction_amount": absence_deduction, "check_time": None, "created_at": now_utc(),
        })
        await db.users.update_one({"_id": c["_id"]}, {"$set": {"status": "absent"}, "$inc": {"total_deductions": absence_deduction}})
        await db.ai_alerts.insert_one({
            "company_id": user["company_id"], "user_id": c["_id"],
            "message": f"🚨 غياب: {c.get('name')} لم يسجّل حضوره اليوم. خصم {absence_deduction} ج.م",
            "severity": "critical", "is_read": False, "created_at": now_utc(),
        })
        marked += 1
    return {"marked": marked, "message": f"تم تسجيل {marked} حالة غياب وتطبيق الخصومات"}


@api.get("/attendance")
async def attendance_logs(user: dict = Depends(get_current_user)):
    query = {"company_id": user["company_id"]}
    if user["role"] not in ("manager", "co_manager"):
        query["user_id"] = user["_id"]
    logs = await db.attendance_logs.find(query).sort("created_at", -1).to_list(300)
    name_cache = {}
    out = []
    for l in logs:
        uid = l["user_id"]
        if uid not in name_cache:
            u = await db.users.find_one({"_id": uid})
            name_cache[uid] = u.get("name") if u else "—"
        out.append({
            "id": str(l["_id"]), "user_id": str(uid), "user_name": name_cache[uid],
            "log_date": l.get("log_date"), "type": l.get("type"),
            "deduction_amount": l.get("deduction_amount", 0), "check_time": l.get("check_time"),
            "photo": l.get("photo"),
            "created_at": l["created_at"].isoformat() if isinstance(l.get("created_at"), datetime) else l.get("created_at"),
        })
    return out


# --------------------------------------------------------------------------------------
# Branches
# --------------------------------------------------------------------------------------
class BranchInput(BaseModel):
    name: str
    city: str = ""
    address: str = ""
    phone: str = ""
    manager_name: str = ""
    is_active: bool = True


@api.get("/branches")
async def list_branches(user: dict = Depends(get_current_user)):
    items = await db.branches.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(200)
    return [{
        "id": str(b["_id"]),
        "name": b["name"],
        "city": b.get("city", ""),
        "address": b.get("address", ""),
        "phone": b.get("phone", ""),
        "manager_name": b.get("manager_name", ""),
        "is_active": b.get("is_active", True),
        "employee_count": await db.users.count_documents({"company_id": user["company_id"], "branch_id": str(b["_id"]), "role": "member"}),
        "created_at": b["created_at"].isoformat() if isinstance(b.get("created_at"), datetime) else b.get("created_at"),
    } for b in items]


@api.post("/branches")
async def create_branch(body: BranchInput, user: dict = Depends(require_manager)):
    doc = {"company_id": user["company_id"], **body.model_dump(), "created_at": now_utc()}
    res = await db.branches.insert_one(doc)
    return {"id": str(res.inserted_id), **body.model_dump()}


@api.put("/branches/{branch_id}")
async def update_branch(branch_id: str, body: BranchInput, user: dict = Depends(require_manager)):
    await db.branches.update_one(
        {"_id": safe_object_id(branch_id), "company_id": user["company_id"]},
        {"$set": body.model_dump()}
    )
    return {"id": branch_id, **body.model_dump()}


@api.delete("/branches/{branch_id}")
async def delete_branch(branch_id: str, user: dict = Depends(require_manager)):
    await db.branches.delete_one({"_id": safe_object_id(branch_id), "company_id": user["company_id"]})
    return {"ok": True}


# --------------------------------------------------------------------------------------
# Equipment & Projects (Operations / Finance)
# --------------------------------------------------------------------------------------
@api.get("/equipment")
async def list_equipment(user: dict = Depends(get_current_user)):
    items = await db.equipment.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(300)
    return [{
        "id": str(i["_id"]), "name": i["name"], "amount": i.get("amount", 0),
        "assigned_to": i.get("assigned_to"), "note": i.get("note", ""),
        "created_at": i["created_at"].isoformat() if isinstance(i.get("created_at"), datetime) else i.get("created_at"),
    } for i in items]


@api.post("/equipment")
async def add_equipment(body: EquipmentInput, user: dict = Depends(require_manager)):
    company = await get_company(user)
    ensure_storage(company, STORAGE_COST_EQUIPMENT)
    doc = {"company_id": user["company_id"], **body.model_dump(), "created_at": now_utc()}
    res = await db.equipment.insert_one(doc)
    await db.companies.update_one({"_id": company["_id"]}, {"$inc": {"storage_used_mb": STORAGE_COST_EQUIPMENT}})
    doc["_id"] = res.inserted_id
    return {"id": str(res.inserted_id), "name": doc["name"], "amount": doc["amount"], "assigned_to": doc.get("assigned_to"), "note": doc.get("note", "")}


@api.delete("/equipment/{eq_id}")
async def delete_equipment(eq_id: str, user: dict = Depends(require_manager)):
    await db.equipment.delete_one({"_id": safe_object_id(eq_id), "company_id": user["company_id"]})
    return {"ok": True}


@api.get("/projects")
async def list_projects(user: dict = Depends(get_current_user)):
    items = await db.projects.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(300)
    return [{
        "id": str(i["_id"]), "name": i["name"], "budget_spent": i.get("budget_spent", 0),
        "equipment_used": i.get("equipment_used", []), "assigned_crew": i.get("assigned_crew", []),
        "manager_spending": i.get("manager_spending", 0), "status": i.get("status", "active"),
        "note": i.get("note", ""),
        "created_at": i["created_at"].isoformat() if isinstance(i.get("created_at"), datetime) else i.get("created_at"),
    } for i in items]


@api.post("/projects")
async def add_project(body: ProjectInput, user: dict = Depends(require_manager)):
    company = await get_company(user)
    ensure_storage(company, STORAGE_COST_PROJECT)
    doc = {"company_id": user["company_id"], **body.model_dump(), "created_at": now_utc()}
    res = await db.projects.insert_one(doc)
    await db.companies.update_one({"_id": company["_id"]}, {"$inc": {"storage_used_mb": STORAGE_COST_PROJECT}})
    return {"id": str(res.inserted_id), **body.model_dump()}


@api.put("/projects/{pid}")
async def update_project(pid: str, body: ProjectInput, user: dict = Depends(require_manager)):
    await db.projects.update_one({"_id": safe_object_id(pid), "company_id": user["company_id"]}, {"$set": body.model_dump()})
    return {"id": pid, **body.model_dump()}


@api.delete("/projects/{pid}")
async def delete_project(pid: str, user: dict = Depends(require_manager)):
    await db.projects.delete_one({"_id": safe_object_id(pid), "company_id": user["company_id"]})
    return {"ok": True}


# --------------------------------------------------------------------------------------
# Finance Summary
# --------------------------------------------------------------------------------------
@api.get("/finance/summary")
async def finance_summary(user: dict = Depends(require_module("finance"))):
    crew = await db.users.find({"company_id": user["company_id"], "role": "member"}).to_list(500)
    total_salaries = sum(c.get("monthly_salary", 0) for c in crew)
    total_deductions = sum(c.get("total_deductions", 0) for c in crew)
    total_additions = sum(c.get("total_additions", 0) for c in crew)

    equipment = await db.equipment.find({"company_id": user["company_id"]}).to_list(500)
    total_equipment = sum(e.get("amount", 0) for e in equipment)

    projects = await db.projects.find({"company_id": user["company_id"]}).to_list(500)
    total_projects = sum(p.get("budget_spent", 0) for p in projects)
    total_manager_spending = sum(p.get("manager_spending", 0) for p in projects)

    net_payroll = total_salaries + total_additions - total_deductions
    total_expenses = net_payroll + total_equipment + total_projects

    # per-employee attendance rate
    per_employee = []
    for c in crew:
        logs = await db.attendance_logs.find({"user_id": c["_id"]}).to_list(500)
        present = sum(1 for l in logs if l["type"] in ("present", "late"))
        total = len(logs)
        rate = round((present / total) * 100) if total else 100
        per_employee.append({
            "id": str(c["_id"]), "name": c.get("name"),
            "salary": c.get("monthly_salary", 0), "deductions": c.get("total_deductions", 0),
            "additions": c.get("total_additions", 0),
            "net": c.get("monthly_salary", 0) + c.get("total_additions", 0) - c.get("total_deductions", 0),
            "attendance_rate": rate,
        })

    return {
        "total_salaries": total_salaries,
        "total_deductions": total_deductions,
        "total_additions": total_additions,
        "total_equipment": total_equipment,
        "total_projects": total_projects,
        "total_manager_spending": total_manager_spending,
        "net_payroll": net_payroll,
        "total_expenses": total_expenses,
        "crew_count": len(crew),
        "per_employee": per_employee,
        "equipment_breakdown": [{"name": e["name"], "amount": e.get("amount", 0)} for e in equipment],
        "projects_breakdown": [{"name": p["name"], "spent": p.get("budget_spent", 0)} for p in projects],
    }


# --------------------------------------------------------------------------------------
# Monthly Reports
# --------------------------------------------------------------------------------------
class ReportQuery(BaseModel):
    year: int
    month: int  # 1-12


@api.get("/reports/monthly")
async def monthly_report(year: int, month: int, user: dict = Depends(require_manager)):
    company = await get_company(user)

    # Date range strings (attendance_logs store log_date as YYYY-MM-DD)
    prefix = f"{year:04d}-{month:02d}-"
    m_start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        m_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        m_end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    # Pull all attendance logs for this month in one query
    att_logs = await db.attendance_logs.find({
        "company_id": user["company_id"],
        "log_date": {"$regex": f"^{year:04d}-{month:02d}-"},
    }).to_list(None)

    # Pull all transactions for this month
    transactions = await db.transactions.find({
        "company_id": user["company_id"],
        "created_at": {"$gte": m_start, "$lt": m_end},
    }).to_list(None)

    # Get all active employees
    employees = await db.users.find(
        {"company_id": user["company_id"], "role": "member"}
    ).to_list(500)

    rows = []
    for emp in employees:
        eid = emp["_id"]
        emp_logs = [l for l in att_logs if l["user_id"] == eid]
        present  = sum(1 for l in emp_logs if l["type"] == "present")
        late     = sum(1 for l in emp_logs if l["type"] == "late")
        absent   = sum(1 for l in emp_logs if l["type"] == "absence")
        att_ded  = sum(l.get("deduction_amount", 0) for l in emp_logs)

        emp_txs       = [t for t in transactions if t["user_id"] == eid]
        manual_ded    = sum(t["amount"] for t in emp_txs if t["type"] == "deduction")
        manual_add    = sum(t["amount"] for t in emp_txs if t["type"] == "addition")

        base    = emp.get("monthly_salary", 0)
        total_d = att_ded + manual_ded
        net     = max(0, base + manual_add - total_d)

        rows.append({
            "id":               str(eid),
            "name":             emp.get("name", "—"),
            "job_title":        emp.get("job_title", "—"),
            "base_salary":      base,
            "present_days":     present,
            "late_days":        late,
            "absent_days":      absent,
            "att_deductions":   att_ded,
            "manual_deductions":manual_ded,
            "manual_additions": manual_add,
            "total_deductions": total_d,
            "net_salary":       net,
            "status":           emp.get("status", "—"),
        })

    rows.sort(key=lambda r: r["name"])

    return {
        "company":  company.get("name", ""),
        "year":     year,
        "month":    month,
        "rows":     rows,
        "summary": {
            "total_employees":    len(rows),
            "total_base_payroll": sum(r["base_salary"] for r in rows),
            "total_deductions":   sum(r["total_deductions"] for r in rows),
            "total_additions":    sum(r["manual_additions"] for r in rows),
            "net_payroll":        sum(r["net_salary"] for r in rows),
            "present_total":      sum(r["present_days"] for r in rows),
            "late_total":         sum(r["late_days"] for r in rows),
            "absent_total":       sum(r["absent_days"] for r in rows),
        },
    }


# --------------------------------------------------------------------------------------
# AI Monitor
# --------------------------------------------------------------------------------------
@api.get("/ai-monitor/status")
async def ai_status(user: dict = Depends(get_current_user)):
    """Real productivity signal, derived from actual data (no random numbers):
    • حضور اليوم — حاضر/متأخر/غائب حتى الآن
    • إنجاز المهام هذا الشهر — نسبة المهام المنتهية من إجمالي مهام الموظف
    • النشاط — دقائق الخمول منذ آخر نشاط مسجَّل
    Each employee's score is the average of whichever signals are actually available for them."""
    crew = await db.users.find({"company_id": user["company_id"], "role": "member", "is_active": True}).to_list(500)
    now_c = cairo_now()
    after_5pm = now_c.hour >= 17
    today = now_c.date().isoformat()
    month_prefix = now_c.strftime("%Y-%m")

    today_logs = await db.attendance_logs.find({
        "company_id": user["company_id"], "log_date": today,
    }).to_list(1000)
    today_log_by_user = {l["user_id"]: l for l in today_logs}

    flags_today = await db.device_history.find({
        "company_id": user["company_id"], "is_suspicious": True,
        "created_at": {"$gte": now_c.replace(hour=0, minute=0, second=0, microsecond=0)},
    }).to_list(1000)
    flags_by_user = {}
    for f in flags_today:
        flags_by_user[f["user_id"]] = flags_by_user.get(f["user_id"], 0) + 1

    rows = []
    total_prod = 0
    for c in crew:
        eid = c["_id"]
        scores = []

        # 1) Attendance signal
        log = today_log_by_user.get(eid)
        if log:
            scores.append({"present": 100, "late": 60, "absence": 0}.get(log.get("type"), 70))
        elif c.get("last_checkin_date") == today:
            scores.append(100)

        # 2) Task-completion signal (this month's to-dos)
        todos = await db.todos.find({
            "user_id": eid, "created_at": {"$gte": now_c.replace(day=1, hour=0, minute=0, second=0, microsecond=0)},
        }).to_list(500)
        if todos:
            done = sum(1 for t in todos if t.get("done"))
            scores.append(round(done / len(todos) * 100))

        # 3) Activity-recency signal
        la = c.get("last_activity")
        inactivity = 0
        if isinstance(la, datetime):
            la_aware = la if la.tzinfo else la.replace(tzinfo=timezone.utc)
            inactivity = max(0, int((now_utc() - la_aware).total_seconds() / 60))
            scores.append(max(0, 100 - max(0, inactivity - 15)))

        productivity = round(sum(scores) / len(scores)) if scores else None
        checked = c.get("last_checkin_date") == today
        if productivity is not None:
            total_prod += productivity
        rows.append({
            "id": str(eid), "name": c.get("name"), "avatar_url": c.get("avatar_url"),
            "productivity": productivity, "inactivity_minutes": inactivity,
            "flags_today": flags_by_user.get(eid, 0), "checked_in_today": checked,
            "status": c.get("status", "off"),
        })

    scored_rows = [r for r in rows if r["productivity"] is not None]
    avg = round(total_prod / len(scored_rows)) if scored_rows else None

    if avg is None:
        recommendation = "لا توجد بيانات كافية بعد لحساب الإنتاجية — تحتاج حضور أو مهام مسجَّلة"
    elif avg >= 85:
        recommendation = "الطاقم يعمل بكفاءة عالية، حافظ على الزخم"
    elif avg >= 60:
        recommendation = "أداء جيد بشكل عام — راقب المهام المتأخرة لتفادي تراكمها"
    else:
        recommendation = "الإنتاجية أقل من المتوقع — راجع الحضور والمهام غير المكتملة مع الفريق"

    return {
        "average_productivity": avg,
        "active_crew": len(rows),
        "after_hours": after_5pm,
        "recommendation": recommendation,
        "crew": rows,
        "server_time": now_c.strftime("%H:%M"),
    }


@api.post("/ai-monitor/refresh")
async def ai_refresh(user: dict = Depends(require_manager)):
    crew = await db.users.find({"company_id": user["company_id"], "role": "member", "is_active": True}).to_list(500)
    today = cairo_now().date().isoformat()
    created = 0
    for c in crew:
        if c.get("last_checkin_date") != today:
            recent = await db.ai_alerts.find_one({
                "user_id": c["_id"], "severity": "warning",
                "created_at": {"$gte": now_utc() - timedelta(minutes=30)},
            })
            if not recent:
                await db.ai_alerts.insert_one({
                    "company_id": user["company_id"], "user_id": c["_id"],
                    "message": f"⚠️ المراقب: {c.get('name')} لم يسجّل حضوره بعد اليوم",
                    "severity": "warning", "is_read": False, "created_at": now_utc(),
                })
                created += 1
    return {"created": created, "message": f"تم تحليل النشاط وإنشاء {created} تنبيه"}


@api.get("/ai-monitor/alerts")
async def ai_alerts(user: dict = Depends(get_current_user)):
    query = {"company_id": user["company_id"]}
    if user["role"] != "manager":
        query["user_id"] = user["_id"]
    alerts = await db.ai_alerts.find(query).sort("created_at", -1).to_list(50)
    return [{
        "id": str(a["_id"]), "message": a["message"], "severity": a.get("severity", "info"),
        "is_read": a.get("is_read", False),
        "created_at": a["created_at"].isoformat() if isinstance(a.get("created_at"), datetime) else a.get("created_at"),
    } for a in alerts]


@api.post("/ai-monitor/mark-read")
async def mark_read(user: dict = Depends(require_manager)):
    await db.ai_alerts.update_many({"company_id": user["company_id"]}, {"$set": {"is_read": True}})
    return {"ok": True}


# ----------------------------------------------------
# Void Engine (Subscriptions / Storage / Accounts unlock)
# ----------------------------------------------------

@api.post("/void/verify-key")
async def void_verify(body: VoidVerify, user: dict = Depends(require_manager)):
    if body.key.strip() != VOID_MASTER_KEY:
        raise HTTPException(status_code=403, detail="❌ المفتاح السري غير صحيح")
    return {"valid": True, "options": VOID_OPTIONS, "message": "✅ تم فتح بوابة محرك الفراغ. اختر باقة واحدة لتفعيلها"}

@api.post("/void/activate")
async def void_activate(body: VoidActivate, request: Request, user: dict = Depends(require_manager)):
    if body.key.strip() != VOID_MASTER_KEY:
        raise HTTPException(status_code=403, detail="❌ المفتاح السري غير صحيح")
    
    target_id = (
        getattr(body, "identifier", None) or 
        getattr(body, "email", None) or 
        getattr(body, "company_id", None) or
        getattr(body, "id", None)
    )
    
    if not target_id and hasattr(body, "dict"):
        body_dict = body.dict()
        target_id = body_dict.get("identifier") or body_dict.get("email") or body_dict.get("company_id")

    company = None
    if target_id:
        target_id_str = str(target_id).strip().lower()
        query_conditions = [
            {"email": target_id_str},
            {"company_id": target_id_str},
            {"name": target_id_str}
        ]
        if ObjectId.is_valid(target_id_str):
            query_conditions.append({"_id": ObjectId(target_id_str)})
            
        company = await db.companies.find_one({"$or": query_conditions})
        
        if not company:
            company = await db.companies.find_one({"email": {"$regex": target_id_str, "$options": "i"}})
            
        if not company:
            raise HTTPException(status_code=400, detail="معرف غير صالح أو الإيميل غير موجود")
    else:
        company = await get_company(user)

    chosen = None
    category = None
    for cat, opts in VOID_OPTIONS.items():
        for o in opts:
            if o["id"] == body.option_id:
                chosen = o
                category = cat
    if not chosen:
        raise HTTPException(status_code=400, detail="الخيار غير موجود")

    msg = ""
    if category == "subscriptions":
        start = now_utc()
        end = None if chosen["days"] is None else (start + timedelta(days=chosen["days"]))

        # ── Delta-based limit adjustment (prevents stacking when re-subscribing) ──
        # Subtract what the OLD subscription contributed, add what the NEW plan contributes.
        old_sub = company.get("subscription") or {}
        old_add_accounts = old_sub.get("add_accounts_granted", 0) if old_sub.get("is_active") else 0
        old_add_mb       = old_sub.get("add_mb_granted",      0) if old_sub.get("is_active") else 0
        new_add_accounts = chosen.get("add_accounts", 0)
        new_add_mb       = chosen.get("add_mb",       0)
        delta_accounts   = new_add_accounts - old_add_accounts
        delta_mb         = new_add_mb       - old_add_mb

        sub = {
            "plan_type":           chosen["plan"],
            "is_active":           True,
            "start_date":          start.isoformat(),
            "end_date":            end.isoformat() if end else None,
            "add_accounts_granted": new_add_accounts,
            "add_mb_granted":       new_add_mb,
            "activated_by_ip":      request.headers.get("X-Forwarded-For",
                                    request.client.host if request.client else "غير معروف"),
        }
        inc = {}
        if delta_accounts:
            inc["account_limit"]    = delta_accounts
        if delta_mb:
            inc["storage_limit_mb"] = delta_mb
        update_doc = {"$set": {"subscription": sub}}
        if inc:
            update_doc["$inc"] = inc
        await db.companies.update_one({"_id": company["_id"]}, update_doc)
        await log_activity(
            company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
            action="subscription_activated",
            message=f"تم تفعيل باقة {chosen['label']} ({chosen['plan']})",
            details=f"IP: {sub['activated_by_ip']} | حسابات+{new_add_accounts} | مساحة+{new_add_mb}MB",
        )
        msg = f"✅ تم تفعيل باقة {chosen['label']} بنجاح!"
    elif category == "storage":
        await db.companies.update_one({"_id": company["_id"]}, {"$inc": {"storage_limit_mb": chosen["add_mb"]}})
        msg = f"تمت إضافة {chosen['label']} لمساحتك التخزينية ✨"
    elif category == "accounts":
        await db.companies.update_one({"_id": company["_id"]}, {"$inc": {"account_limit": chosen["add_accounts"]}})
        msg = f"تمت إضافة {chosen['label']} ✨"
    elif category == "managers":
        await db.companies.update_one({"_id": company["_id"]}, {"$set": {"manager_limit": chosen["max_managers"]}})
        msg = f"تم تحديث حد المديرين إلى {chosen['max_managers']} ✨"
    elif category == "ai_power":
        await db.companies.update_one({"_id": company["_id"]}, {"$set": {"ai_level": chosen["ai_level"]}})
        msg = f"تم ترقية قوة الذكاء الاصطناعي إلى «{chosen['label']}» ✨"
    elif category == "feature_addons":
        feature = chosen["feature"]
        await db.companies.update_one(
            {"_id": company["_id"]},
            {"$set": {f"addons.{feature}": {"permanent": True, "purchased_at": now_utc().isoformat()}}},
        )
        await log_activity(company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
                            action="feature_addon_purchased",
                            message=f"شراء ميزة «{chosen['label']}» بشكل دائم مدى الحياة")
        msg = f"✅ تم تفعيل «{chosen['label']}» بشكل دائم مدى الحياة — لن تحتاج لتجديدها!"
    elif category == "addon_bundle":
        start = now_utc()
        end = start + timedelta(days=chosen["days"])
        await db.companies.update_one(
            {"_id": company["_id"]},
            {"$set": {"addon_bundle": {
                "is_active": True, "features": list(ADDON_FEATURES.keys()),
                "start_date": start.isoformat(), "expires_at": end.isoformat(),
            }}},
        )
        await log_activity(company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
                            action="addon_bundle_purchased",
                            message=f"تفعيل باقة الإضافات المجمّعة لمدة {chosen['days']} يوم")
        msg = f"✅ تم تفعيل باقة الإضافات المجمّعة لمدة {chosen['days']} يوم"

    company = await get_company(user)
    return {"message": msg, "company": ser_company(company)}


# --------------------------------------------------------------------------------------
# Price Override System (Secret Code Protected)
# --------------------------------------------------------------------------------------
DESIGN_SECRET = "23534858"

async def get_void_options_with_overrides() -> dict:
    import copy
    opts = copy.deepcopy(VOID_OPTIONS)
    cfg = await db.site_config.find_one({"_id": "price_overrides"})
    if cfg:
        overrides = cfg.get("prices", {})
        for category, items in opts.items():
            for item in items:
                key = f"{category}:{item['id']}"
                if key in overrides:
                    item["price"] = overrides[key]
    return opts


@api.post("/void/update-prices")
async def update_prices(body: UpdatePrices, user: dict = Depends(require_manager)):
    if body.secret.strip() != DESIGN_SECRET:
        raise HTTPException(status_code=403, detail="❌ الكود السري غير صحيح")
    await db.site_config.update_one(
        {"_id": "price_overrides"},
        {"$set": {"prices": body.prices, "updated_at": now_utc().isoformat()}},
        upsert=True,
    )
    return {"message": "✅ تم تحديث الأسعار بنجاح"}


@api.get("/void/options")
async def void_options_route(user: dict = Depends(get_current_user)):
    return await get_void_options_with_overrides()


# --------------------------------------------------------------------------------------
# Owner Admin Panel — dual-key protected, no session required
# ── confirm key  : DESIGN_SECRET  (23534858)
# ── master key   : VOID_MASTER_KEY (701D#V0id_M4st3r$K3y!99X)
# --------------------------------------------------------------------------------------

class OwnerAuthBody(BaseModel):
    confirm_key: str
    master_key:  str

class OwnerSetSubBody(BaseModel):
    confirm_key: str
    master_key:  str
    company_id:  str
    plan_type:   str                    # none | trial | weekly | monthly | quarterly | biannual | yearly | eternal
    end_date:    Optional[str] = None   # ISO date string or None
    addons:      Optional[dict] = None  # {"chat": True, "vault": False, ...}

def _owner_auth(confirm_key: str, master_key: str):
    if confirm_key.strip() != DESIGN_SECRET or master_key.strip() != VOID_MASTER_KEY:
        raise HTTPException(status_code=403, detail="❌ بيانات الدخول غير صحيحة")

@api.post("/owner/auth")
async def owner_auth(body: OwnerAuthBody):
    _owner_auth(body.confirm_key, body.master_key)
    return {"ok": True}

@api.post("/owner/companies")
async def owner_companies(body: OwnerAuthBody):
    _owner_auth(body.confirm_key, body.master_key)
    companies = await db.companies.find({}).to_list(2000)
    result = []
    for c in companies:
        sub = c.get("subscription") or {}
        end_date = sub.get("end_date")
        is_prem  = bool(sub.get("is_active") and (not end_date or end_date > now_utc().isoformat()))
        result.append({
            "id":               str(c["_id"]),
            "name":             c.get("name", "—"),
            "email":            c.get("email", ""),
            "is_premium":       is_prem,
            "plan_type":        sub.get("plan_type"),
            "end_date":         end_date,
            "addons":           {k: bool((c.get("addons") or {}).get(k, {}).get("permanent")) for k in ADDON_FEATURES},
            "account_limit":    c.get("account_limit", 6),
            "storage_limit_mb": c.get("storage_limit_mb", 100),
            "manager_limit":    c.get("manager_limit", 1),
        })
    return result

@api.post("/owner/set-subscription")
async def owner_set_subscription(body: OwnerSetSubBody):
    _owner_auth(body.confirm_key, body.master_key)
    cid = safe_object_id(body.company_id)
    company = await db.companies.find_one({"_id": cid})
    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")

    PLAN_DAYS = {
        "trial": 3, "weekly": 7, "monthly": 30,
        "quarterly": 90, "biannual": 180, "yearly": 365, "eternal": None,
    }

    if body.plan_type == "none":
        await db.companies.update_one(
            {"_id": cid},
            {"$set": {"subscription": {"plan_type": None, "is_active": False,
                                        "start_date": None, "end_date": None}}}
        )
    else:
        days  = PLAN_DAYS.get(body.plan_type)
        start = now_utc()
        if body.end_date:
            try:
                end_dt = datetime.fromisoformat(body.end_date)
                end = end_dt.isoformat()
            except Exception:
                end = None
        elif days is not None:
            end = (start + timedelta(days=days)).isoformat()
        else:
            end = None  # eternal

        sub = {
            "plan_type":  body.plan_type,
            "is_active":  True,
            "start_date": start.isoformat(),
            "end_date":   end,
        }
        await db.companies.update_one({"_id": cid}, {"$set": {"subscription": sub}})

    # Update addons if provided
    if body.addons:
        for feature, enabled in body.addons.items():
            if feature not in ADDON_FEATURES:
                continue
            if enabled:
                await db.companies.update_one(
                    {"_id": cid},
                    {"$set": {f"addons.{feature}": {"permanent": True, "purchased_at": now_utc().isoformat()}}},
                )
            else:
                await db.companies.update_one({"_id": cid}, {"$unset": {f"addons.{feature}": ""}})

    company = await db.companies.find_one({"_id": cid})
    return {"ok": True, "company": ser_company(company)}


# ── Subscription Requests (WhatsApp pending orders) ──────────────────────────

class SubRequestBody(BaseModel):
    company_id:         str
    company_name:       str
    plan_id:            str
    plan_label:         str
    requester_name:     str
    generated_password: str

class SubRequestAuthBody(BaseModel):
    confirm_key: str
    master_key:  str

class GrantSubRequestBody(BaseModel):
    confirm_key: str
    master_key:  str
    request_id:  str
    plan_type:   str

class DeleteSubRequestBody(BaseModel):
    confirm_key: str
    master_key:  str
    request_id:  str

@api.post("/owner/subscription-request")
async def create_subscription_request(body: SubRequestBody):
    """Store a pending subscription request (sent via WhatsApp by the client)."""
    doc = {
        "company_id":         body.company_id,
        "company_name":       body.company_name,
        "plan_id":            body.plan_id,
        "plan_label":         body.plan_label,
        "requester_name":     body.requester_name,
        "generated_password": body.generated_password,
        "status":             "pending",
        "created_at":         now_utc().isoformat(),
    }
    result = await db.subscription_requests.insert_one(doc)
    return {"ok": True, "request_id": str(result.inserted_id)}

@api.post("/owner/subscription-requests")
async def list_subscription_requests(body: SubRequestAuthBody):
    """List all subscription requests — owner only."""
    _owner_auth(body.confirm_key, body.master_key)
    requests = await db.subscription_requests.find({}).sort("created_at", -1).to_list(500)
    return [{"id": str(r["_id"]), **{k: v for k, v in r.items() if k != "_id"}} for r in requests]

@api.post("/owner/grant-subscription-request")
async def grant_subscription_request(body: GrantSubRequestBody):
    """Activate a plan for the company linked to the given request."""
    _owner_auth(body.confirm_key, body.master_key)
    rid = safe_object_id(body.request_id)
    req = await db.subscription_requests.find_one({"_id": rid})
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")

    cid = safe_object_id(req["company_id"])
    company = await db.companies.find_one({"_id": cid})
    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")

    PLAN_DAYS = {
        "trial": 3, "weekly": 7, "monthly": 30,
        "quarterly": 90, "biannual": 180, "yearly": 365, "eternal": None,
    }
    days  = PLAN_DAYS.get(body.plan_type)
    start = now_utc()
    end   = (start + timedelta(days=days)).isoformat() if days is not None else None
    sub   = {"plan_type": body.plan_type, "is_active": True,
             "start_date": start.isoformat(), "end_date": end}
    await db.companies.update_one({"_id": cid}, {"$set": {"subscription": sub}})
    await db.subscription_requests.update_one({"_id": rid}, {"$set": {"status": "granted"}})

    company = await db.companies.find_one({"_id": cid})
    return {"ok": True, "company": ser_company(company)}

@api.post("/owner/delete-subscription-request")
async def delete_subscription_request(body: DeleteSubRequestBody):
    """Remove a subscription request from the queue."""
    _owner_auth(body.confirm_key, body.master_key)
    rid = safe_object_id(body.request_id)
    await db.subscription_requests.delete_one({"_id": rid})
    return {"ok": True}


class OwnerGrantAnyBody(BaseModel):
    confirm_key: str
    master_key:  str
    company_id:  str
    option_id:   str   # any VOID_OPTIONS item id  e.g. sub_monthly, st_5120, mgr_3 …
    request_id:  Optional[str] = None  # if coming from a pending request, mark it granted

@api.post("/owner/grant-any-option")
async def owner_grant_any_option(body: OwnerGrantAnyBody):
    """Activate ANY void option (subscription, storage, accounts, managers, addon…) for a company — owner only."""
    _owner_auth(body.confirm_key, body.master_key)
    cid     = safe_object_id(body.company_id)
    company = await db.companies.find_one({"_id": cid})
    if not company:
        raise HTTPException(status_code=404, detail="الشركة غير موجودة")

    # Find the chosen option across all categories
    chosen   = None
    category = None
    for cat, opts in VOID_OPTIONS.items():
        for o in opts:
            if o["id"] == body.option_id:
                chosen   = o
                category = cat
                break
        if chosen:
            break
    if not chosen:
        raise HTTPException(status_code=400, detail="الخيار غير موجود")

    msg = ""
    if category == "subscriptions":
        start = now_utc()
        end   = None if chosen["days"] is None else (start + timedelta(days=chosen["days"]))
        old_sub          = company.get("subscription") or {}
        old_add_accounts = old_sub.get("add_accounts_granted", 0) if old_sub.get("is_active") else 0
        old_add_mb       = old_sub.get("add_mb_granted",      0) if old_sub.get("is_active") else 0
        new_add_accounts = chosen.get("add_accounts", 0)
        new_add_mb       = chosen.get("add_mb",       0)
        delta_accounts   = new_add_accounts - old_add_accounts
        delta_mb         = new_add_mb       - old_add_mb
        sub = {
            "plan_type":            chosen["plan"],
            "is_active":            True,
            "start_date":           start.isoformat(),
            "end_date":             end.isoformat() if end else None,
            "add_accounts_granted": new_add_accounts,
            "add_mb_granted":       new_add_mb,
        }
        inc = {}
        if delta_accounts: inc["account_limit"]    = delta_accounts
        if delta_mb:       inc["storage_limit_mb"] = delta_mb
        update_doc = {"$set": {"subscription": sub}}
        if inc: update_doc["$inc"] = inc
        await db.companies.update_one({"_id": cid}, update_doc)
        msg = f"✅ تم تفعيل باقة {chosen['label']}"

    elif category == "storage":
        await db.companies.update_one({"_id": cid}, {"$inc": {"storage_limit_mb": chosen["add_mb"]}})
        msg = f"✅ تمت إضافة {chosen['label']} للمساحة"

    elif category == "accounts":
        await db.companies.update_one({"_id": cid}, {"$inc": {"account_limit": chosen["add_accounts"]}})
        msg = f"✅ تمت إضافة {chosen['label']}"

    elif category == "managers":
        await db.companies.update_one({"_id": cid}, {"$set": {"manager_limit": chosen["max_managers"]}})
        msg = f"✅ تم تحديث حد المديرين إلى {chosen['max_managers']}"

    elif category == "feature_addons":
        feature = chosen["feature"]
        await db.companies.update_one(
            {"_id": cid},
            {"$set": {f"addons.{feature}": {"permanent": True, "purchased_at": now_utc().isoformat()}}},
        )
        msg = f"✅ تم تفعيل «{chosen['label']}» بشكل دائم"

    elif category == "addon_bundle":
        start = now_utc()
        end   = start + timedelta(days=chosen["days"])
        await db.companies.update_one(
            {"_id": cid},
            {"$set": {"addon_bundle": {
                "is_active":  True,
                "features":   list(ADDON_FEATURES.keys()),
                "start_date": start.isoformat(),
                "expires_at": end.isoformat(),
            }}},
        )
        msg = f"✅ تم تفعيل باقة الإضافات المجمّعة لمدة {chosen['days']} يوم"

    # Mark the linked pending request as granted if provided
    if body.request_id:
        try:
            rid = safe_object_id(body.request_id)
            await db.subscription_requests.update_one({"_id": rid}, {"$set": {"status": "granted"}})
        except Exception:
            pass

    company = await db.companies.find_one({"_id": cid})
    return {"ok": True, "message": msg, "company": ser_company(company)}


# --------------------------------------------------------------------------------------
# Site Content Engine (Global changes for ALL users)
# --------------------------------------------------------------------------------------

class SiteContentBody(BaseModel):
    secret: str
    texts: Optional[dict] = None
    css_vars: Optional[dict] = None
    custom_css: Optional[str] = None
    theme: Optional[str] = None

class SiteNoticeBody(BaseModel):
    secret: str
    message: Optional[str] = ""
    notice_type: Optional[str] = "info"
    active: bool = True

class ReadFileBody(BaseModel):
    secret: str
    path: str

class WriteFileBody(BaseModel):
    secret: str
    path: str
    content: str

class AICodeBody(BaseModel):
    secret: str
    prompt: str
    file_path: Optional[str] = None
    file_content: Optional[str] = None


@api.get("/void/site-content")
async def get_site_content():
    doc = await db.site_config.find_one({"_id": "global_content"})
    if not doc:
        return {"texts": {}, "css_vars": {}, "custom_css": "", "theme": None}
    return {
        "texts": doc.get("texts", {}),
        "css_vars": doc.get("css_vars", {}),
        "custom_css": doc.get("custom_css", ""),
        "theme": doc.get("theme"),
    }


@api.post("/void/site-content")
async def save_site_content(body: SiteContentBody):
    if body.secret.strip() != DESIGN_SECRET:
        raise HTTPException(status_code=403, detail="❌ الكود السري غير صحيح")
    doc = await db.site_config.find_one({"_id": "global_content"}) or {}
    update = {"updated_at": now_utc().isoformat()}
    if body.texts is not None:
        update["texts"] = body.texts
    else:
        update["texts"] = doc.get("texts", {})
    if body.css_vars is not None:
        update["css_vars"] = body.css_vars
    else:
        update["css_vars"] = doc.get("css_vars", {})
    if body.custom_css is not None:
        update["custom_css"] = body.custom_css
    else:
        update["custom_css"] = doc.get("custom_css", "")
    if body.theme is not None:
        update["theme"] = body.theme
    else:
        update["theme"] = doc.get("theme")
    await db.site_config.update_one(
        {"_id": "global_content"}, {"$set": update}, upsert=True
    )
    return {"message": "✅ تم حفظ تعديلات الموقع — ستظهر لجميع المستخدمين"}


@api.get("/void/site-notice")
async def get_site_notice():
    doc = await db.site_config.find_one({"_id": "site_notice"})
    if not doc or not doc.get("active"):
        return {"active": False, "message": "", "notice_type": "info"}
    return {
        "active": True,
        "message": doc.get("message", ""),
        "notice_type": doc.get("notice_type", "info"),
        "updated_at": doc.get("updated_at", ""),
    }


@api.post("/void/site-notice")
async def set_site_notice(body: SiteNoticeBody):
    if body.secret.strip() != DESIGN_SECRET:
        raise HTTPException(status_code=403, detail="❌ الكود السري غير صحيح")
    await db.site_config.update_one(
        {"_id": "site_notice"},
        {"$set": {
            "active": body.active,
            "message": body.message or "",
            "notice_type": body.notice_type or "info",
            "updated_at": now_utc().isoformat(),
        }},
        upsert=True,
    )
    return {"message": "✅ تم تحديث إشعار الموقع للجميع"}


_ALLOWED_EXTS = {".jsx", ".js", ".css", ".tsx", ".ts", ".json"}
_FRONTEND_SRC = ROOT_DIR.parent / "frontend" / "src"


@api.post("/void/list-files")
async def list_source_files(body: ReadFileBody):
    if body.secret.strip() != DESIGN_SECRET:
        raise HTTPException(status_code=403, detail="❌ الكود السري غير صحيح")
    files = []
    for p in _FRONTEND_SRC.rglob("*"):
        if p.is_file() and p.suffix in _ALLOWED_EXTS:
            rel = str(p.relative_to(_FRONTEND_SRC)).replace("\\", "/")
            files.append(rel)
    return {"files": sorted(files)}


@api.post("/void/read-file")
async def read_source_file(body: ReadFileBody):
    if body.secret.strip() != DESIGN_SECRET:
        raise HTTPException(status_code=403, detail="❌ الكود السري غير صحيح")
    path = (_FRONTEND_SRC / body.path).resolve()
    if not str(path).startswith(str(_FRONTEND_SRC.resolve())):
        raise HTTPException(status_code=400, detail="مسار غير مسموح")
    if path.suffix not in _ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="نوع ملف غير مدعوم")
    if not path.exists():
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    content = path.read_text(encoding="utf-8")
    return {"content": content, "path": body.path, "lines": len(content.splitlines())}


@api.post("/void/write-file")
async def write_source_file(body: WriteFileBody):
    if body.secret.strip() != DESIGN_SECRET:
        raise HTTPException(status_code=403, detail="❌ الكود السري غير صحيح")
    path = (_FRONTEND_SRC / body.path).resolve()
    if not str(path).startswith(str(_FRONTEND_SRC.resolve())):
        raise HTTPException(status_code=400, detail="مسار غير مسموح")
    if path.suffix not in _ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="نوع ملف غير مدعوم")
    if not path.exists():
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    backup = path.with_suffix(path.suffix + ".bak")
    backup.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
    path.write_text(body.content, encoding="utf-8")
    return {"message": f"✅ تم حفظ {body.path} (نسخة احتياطية .bak محفوظة)"}


from fastapi import UploadFile, File, Form
import uuid as _uuid

_UPLOADS_DIR = ROOT_DIR.parent / "frontend" / "public" / "uploads"

@api.post("/void/upload-asset")
async def upload_asset(secret: str = Form(...), file: UploadFile = File(...)):
    if secret.strip() != DESIGN_SECRET:
        raise HTTPException(status_code=403, detail="❌ الكود السري غير صحيح")
    _UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    allowed_types = {
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
        "audio/mpeg", "audio/ogg", "audio/wav", "video/mp4",
    }
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"نوع ملف غير مدعوم: {file.content_type}")
    ext = Path(file.filename).suffix if file.filename else ".bin"
    fname = f"{_uuid.uuid4().hex}{ext}"
    dest = _UPLOADS_DIR / fname
    dest.write_bytes(await file.read())
    return {"url": f"/uploads/{fname}", "filename": fname, "content_type": file.content_type}


@api.post("/void/ai-code")
async def ai_code_edit(body: AICodeBody):
    if body.secret.strip() != DESIGN_SECRET:
        raise HTTPException(status_code=403, detail="❌ الكود السري غير صحيح")
    import groq as groq_module
    groq_key = os.environ.get("GROQ_API_KEY", "")
    system_prompt = (
        "أنت مطور React/Tailwind CSS خبير. مهمتك تعديل كود React JSX بناءً على طلب المستخدم.\n"
        "القواعد الصارمة:\n"
        "1. أعد الكود الكامل المعدّل فقط — بدون أي شرح أو ملاحظات\n"
        "2. لا تضف ``` أو أي markdown\n"
        "3. حافظ على هيكل الملف الأصلي وجميع imports\n"
        "4. استخدم Tailwind CSS\n"
        "5. الواجهة عربية RTL\n"
        "6. إذا لم يوجد كود حالي، أنشئ component React كامل"
    )
    if body.file_content:
        user_msg = f"الملف: {body.file_path or 'unknown'}\n\nالكود الحالي:\n{body.file_content[:8000]}\n\nالطلب: {body.prompt}"
    else:
        user_msg = f"الطلب: {body.prompt}"

    if not groq_key:
        return {"code": "// ⚠️ GROQ_API_KEY غير متوفر — أضف المفتاح في الإعدادات", "prompt": body.prompt}
    try:
        cg = groq_module.Groq(api_key=groq_key)
        resp = cg.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=4096,
            temperature=0.2,
        )
        result = resp.choices[0].message.content.strip()
        if result.startswith("```"):
            result = "\n".join(result.split("\n")[1:])
            if result.endswith("```"):
                result = result[:-3].strip()
    except Exception as e:
        result = f"// ❌ خطأ في AI: {str(e)}"
    return {"code": result, "prompt": body.prompt}


# --------------------------------------------------------------------------------------
# Managers Management
# --------------------------------------------------------------------------------------
@api.get("/managers")
async def list_managers(user: dict = Depends(require_manager)):
    managers = await db.users.find(
        {"company_id": user["company_id"], "role": {"$in": ["manager", "co_manager"]}}
    ).to_list(50)
    return [ser_user(m) for m in managers]


@api.post("/managers/invite")
async def invite_manager(body: InviteManager, user: dict = Depends(require_primary_manager)):
    company = await get_company(user)
    manager_limit = company.get("manager_limit", 1)
    current_count = await db.users.count_documents(
        {"company_id": user["company_id"], "role": "co_manager"}
    )
    if current_count >= manager_limit:
        raise HTTPException(
            status_code=400,
            detail=f"وصلت للحد الأقصى من المديرين ({manager_limit}). قم بترقية باقة المديرين"
        )
    username = body.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="اسم المستخدم مطلوب")
    if await db.users.find_one({"company_id": user["company_id"], "username": username}):
        raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل في شركتك")
    doc = {
        "company_id": user["company_id"],
        "role": "co_manager",
        "name": body.name,
        "username": username,
        "email": f"{username}@{str(user['company_id'])[:6]}.itqan",
        "password_hash": hash_password(body.password),
        "avatar_url": None,
        "job_title": body.job_title or "مدير مشارك",
        "phone": body.phone or "",
        "monthly_salary": body.monthly_salary or 0,
        "description": body.description or "",
        "total_deductions": 0,
        "total_additions": 0,
        "is_active": True,
        "status": "present",
        "last_checkin_date": None,
        "last_activity": now_utc(),
        "created_at": now_utc(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    await log_activity(
        company_id=user["company_id"],
        user_id=user["_id"],
        user_name=user.get("name", ""),
        action="invite_manager",
        message=f"تمت إضافة مدير مشارك: {body.name}",
    )
    return ser_user(doc)


@api.put("/managers/{mgr_id}")
async def update_manager(mgr_id: str, body: dict, user: dict = Depends(require_primary_manager)):
    mgr = await db.users.find_one({"_id": safe_object_id(mgr_id), "company_id": user["company_id"]})
    if not mgr:
        raise HTTPException(status_code=404, detail="المدير غير موجود")
    allowed = {"name", "job_title", "phone", "monthly_salary", "total_deductions", "total_additions", "is_active", "description"}
    patch = {k: v for k, v in body.items() if k in allowed}
    if patch:
        await db.users.update_one({"_id": safe_object_id(mgr_id)}, {"$set": patch})
    mgr = await db.users.find_one({"_id": safe_object_id(mgr_id)})
    return ser_user(mgr)


@api.delete("/managers/{mgr_id}")
async def delete_manager(mgr_id: str, user: dict = Depends(require_primary_manager)):
    mgr = await db.users.find_one({"_id": safe_object_id(mgr_id), "company_id": user["company_id"]})
    if not mgr:
        raise HTTPException(status_code=404, detail="المدير غير موجود")
    if mgr.get("role") == "manager":
        raise HTTPException(status_code=400, detail="لا يمكن حذف المدير الرئيسي")
    await db.users.delete_one({"_id": safe_object_id(mgr_id)})
    await log_activity(
        company_id=user["company_id"],
        user_id=user["_id"],
        user_name=user.get("name", ""),
        action="remove_manager",
        message=f"تم حذف المدير المشارك: {mgr.get('name', '')}",
    )
    return {"message": "تم حذف المدير المشارك"}


# --------------------------------------------------------------------------------------
# Employee dashboard
# --------------------------------------------------------------------------------------
@api.get("/me/dashboard")
async def my_dashboard(user: dict = Depends(get_current_user)):
    logs = await db.attendance_logs.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(60)
    present = sum(1 for l in logs if l["type"] in ("present", "late"))
    late = sum(1 for l in logs if l["type"] == "late")
    absent = sum(1 for l in logs if l["type"] == "absence")
    total = len(logs)
    rate = round((present / total) * 100) if total else 100
    today = cairo_now().date().isoformat()
    net = user.get("monthly_salary", 0) + user.get("total_additions", 0) - user.get("total_deductions", 0)
    # Check today's log for check-in and checkout times
    today_log = next((l for l in logs if l.get("log_date") == today), None)
    checked_in = user.get("last_checkin_date") == today or bool(today_log)
    checked_out = bool(today_log and today_log.get("checkout_time")) if today_log else False
    return {
        "checked_in_today": checked_in,
        "checked_out_today": checked_out,
        "check_time": today_log.get("check_time") if today_log else None,
        "checkout_time": today_log.get("checkout_time") if today_log else None,
        "worked_hours": today_log.get("worked_hours") if today_log else None,
        "status": user.get("status", "off"),
        "monthly_salary": user.get("monthly_salary", 0),
        "total_deductions": user.get("total_deductions", 0),
        "total_additions": user.get("total_additions", 0),
        "net_salary": net,
        "attendance_rate": rate,
        "present_days": present, "late_days": late, "absent_days": absent,
        "recent_logs": [{
            "log_date": l.get("log_date"), "type": l.get("type"),
            "check_time": l.get("check_time"),
            "checkout_time": l.get("checkout_time"),
            "worked_hours": l.get("worked_hours"),
            "deduction_amount": l.get("deduction_amount", 0),
        } for l in logs[:15]],
    }
@api.post("/auth/checkout")
async def checkout(user: dict = Depends(get_current_user)):
    today_str = cairo_now().date().isoformat()
    
    # البحث عن سجل الحضور الخاص بيوم اليوم للمستخدم
    today_log = await db.attendance_logs.find_one({
        "user_id": str(user["_id"]),
        "log_date": today_str
    })
    
    if today_log:
        # تحديث وقت الخروج وحالة الانصراف
        await db.attendance_logs.update_one(
            {"_id": today_log["_id"]},
            {"$set": {
                "checkout_time": datetime.now().strftime("%I:%M %p"),
                "status": "منصرف"
            }}
        )
        return {"ok": True, "message": "تم تسجيل الانصراف بنجاح"}
    else:
        raise HTTPException(status_code=400, detail="لم يتم تسجيل الحضور لهذا اليوم أولاً")

# --------------------------------------------------------------------------------------
# Loans (Employee debt management)
# --------------------------------------------------------------------------------------
class LoanRequest(BaseModel):
    amount: int
    reason: str
    repayment_months: int = 3

class LoanReject(BaseModel):
    reason: Optional[str] = ""

def ser_loan(l: dict) -> dict:
    return {
        "id": str(l["_id"]),
        "employee_id": str(l.get("employee_id", "")),
        "employee_name": l.get("employee_name", ""),
        "amount": l.get("amount", 0),
        "total_amount": l.get("total_amount", l.get("amount", 0)),
        "remaining_amount": l.get("remaining_amount", l.get("amount", 0)),
        "monthly_installment": l.get("monthly_installment", 0),
        "repayment_months": l.get("repayment_months", 3),
        "reason": l.get("reason", ""),
        "status": l.get("status", "pending"),
        "reject_reason": l.get("reject_reason", ""),
        "created_at": l["created_at"].isoformat() if isinstance(l.get("created_at"), datetime) else str(l.get("created_at", "")),
    }

@api.get("/loans")
async def get_loans(user: dict = Depends(get_current_user)):
    is_mgr = user["role"] in ("manager", "co_manager")
    if is_mgr:
        loans = await db.loans.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(500)
    else:
        loans = await db.loans.find({"company_id": user["company_id"], "employee_id": user["_id"]}).sort("created_at", -1).to_list(100)
    return [ser_loan(l) for l in loans]

@api.post("/loans")
async def request_loan(body: LoanRequest, user: dict = Depends(get_current_user)):
    if user["role"] not in ("member",):
        raise HTTPException(status_code=403, detail="الموظفون فقط يمكنهم طلب قروض")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="المبلغ يجب أن يكون أكبر من صفر")
    if body.repayment_months < 1 or body.repayment_months > 24:
        raise HTTPException(status_code=400, detail="عدد أشهر السداد يجب أن يكون بين 1 و24")
    # Check no pending loan
    existing = await db.loans.find_one({"company_id": user["company_id"], "employee_id": user["_id"], "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="لديك طلب قرض قيد المراجعة بالفعل")
    installment = math.ceil(body.amount / body.repayment_months)
    doc = {
        "company_id": user["company_id"],
        "employee_id": user["_id"],
        "employee_name": user.get("name", ""),
        "amount": body.amount,
        "total_amount": body.amount,
        "remaining_amount": body.amount,
        "monthly_installment": installment,
        "repayment_months": body.repayment_months,
        "reason": body.reason,
        "status": "pending",
        "reject_reason": "",
        "created_at": now_utc(),
    }
    res = await db.loans.insert_one(doc)
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="loan_request", message=f"طلب قرض بمبلغ {body.amount} ج.م — {body.reason}",
    )
    return {"id": str(res.inserted_id), "message": "تم إرسال طلب القرض للمدير"}

@api.put("/loans/{loan_id}/approve")
async def approve_loan(loan_id: str, user: dict = Depends(require_manager)):
    loan = await db.loans.find_one({"_id": safe_object_id(loan_id), "company_id": user["company_id"]})
    if not loan:
        raise HTTPException(status_code=404, detail="القرض غير موجود")
    if loan["status"] != "pending":
        raise HTTPException(status_code=400, detail="لا يمكن الموافقة على قرض غير معلق")
    await db.loans.update_one({"_id": safe_object_id(loan_id)}, {"$set": {"status": "approved", "approved_at": now_utc()}})
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="loan_approve", message=f"تمت الموافقة على قرض {loan.get('employee_name')} بمبلغ {loan.get('amount')} ج.م",
    )
    return {"message": "تمت الموافقة على القرض"}

@api.put("/loans/{loan_id}/reject")
async def reject_loan(loan_id: str, body: LoanReject, user: dict = Depends(require_manager)):
    loan = await db.loans.find_one({"_id": safe_object_id(loan_id), "company_id": user["company_id"]})
    if not loan:
        raise HTTPException(status_code=404, detail="القرض غير موجود")
    if loan["status"] != "pending":
        raise HTTPException(status_code=400, detail="لا يمكن رفض قرض غير معلق")
    await db.loans.update_one({"_id": safe_object_id(loan_id)}, {"$set": {"status": "rejected", "reject_reason": body.reason or ""}})
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="loan_reject", message=f"تم رفض طلب قرض {loan.get('employee_name')}",
    )
    return {"message": "تم رفض القرض"}

@api.put("/loans/{loan_id}/pay-installment")
async def pay_loan_installment(loan_id: str, user: dict = Depends(require_manager)):
    loan = await db.loans.find_one({"_id": safe_object_id(loan_id), "company_id": user["company_id"]})
    if not loan:
        raise HTTPException(status_code=404, detail="القرض غير موجود")
    if loan["status"] != "approved":
        raise HTTPException(status_code=400, detail="القرض غير موافق عليه")
    installment = loan.get("monthly_installment", 0)
    remaining = loan.get("remaining_amount", 0) - installment
    new_status = "paid" if remaining <= 0 else "approved"
    await db.loans.update_one({"_id": safe_object_id(loan_id)}, {
        "$set": {"remaining_amount": max(0, remaining), "status": new_status}
    })
    # Add deduction transaction to employee
    emp = await db.users.find_one({"_id": loan["employee_id"]})
    if emp:
        await db.transactions.insert_one({
            "company_id": user["company_id"],
            "user_id": loan["employee_id"],
            "type": "deduction",
            "amount": installment,
            "reason": f"قسط قرض شهري — {loan.get('reason', '')}",
            "created_at": now_utc(),
            "created_by": str(user["_id"]),
        })
    return {"message": f"تم تسجيل الدفعة ({installment} ج.م)", "remaining": max(0, remaining)}

# --------------------------------------------------------------------------------------
# Code Editor (AI-powered file editor — manager only)
# --------------------------------------------------------------------------------------
WORKSPACE_ROOT = pathlib.Path("/home/runner/workspace")
EDITOR_ALLOWED_EXTS = {".jsx", ".js", ".ts", ".tsx", ".css", ".py", ".json", ".md", ".html", ".txt", ".sh"}
EDITOR_IGNORED_DIRS = {"node_modules", "__pycache__", ".git", "dist", "build", ".next", "coverage", ".cache", ".pythonlibs", ".local", ".upm"}

def _editor_safe_path(rel_path: str) -> pathlib.Path:
    """Resolve a relative path and ensure it falls within the workspace."""
    try:
        p = pathlib.Path(rel_path).resolve()
    except Exception:
        raise HTTPException(status_code=400, detail="مسار غير صالح")
    try:
        p.relative_to(WORKSPACE_ROOT.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="المسار خارج نطاق المشروع")
    if p.suffix not in EDITOR_ALLOWED_EXTS:
        raise HTTPException(status_code=403, detail="نوع الملف غير مدعوم")
    return p

def _build_tree(root: pathlib.Path, depth: int = 0) -> list:
    if depth > 8:
        return []
    items = []
    try:
        entries = sorted(root.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
    except PermissionError:
        return []
    for entry in entries:
        if entry.name.startswith(".") or entry.name in EDITOR_IGNORED_DIRS:
            continue
        if entry.is_dir():
            children = _build_tree(entry, depth + 1)
            if children:
                items.append({"name": entry.name, "path": str(entry), "children": children})
        elif entry.suffix in EDITOR_ALLOWED_EXTS:
            items.append({"name": entry.name, "path": str(entry)})
    return items

@api.get("/editor/files")
async def editor_list_files(user: dict = Depends(require_manager)):
    roots = [
        WORKSPACE_ROOT / "frontend" / "src",
        WORKSPACE_ROOT / "frontend" / "public",
        WORKSPACE_ROOT / "backend",
    ]
    tree = []
    for root in roots:
        if root.exists():
            children = _build_tree(root)
            if children:
                tree.append({"name": root.name, "path": str(root), "children": children})
    return {"tree": tree}

@api.get("/editor/file")
async def editor_read_file(path: str, user: dict = Depends(require_manager)):
    p = _editor_safe_path(path)
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail="الملف غير موجود")
    try:
        content = p.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"path": path, "content": content, "size": p.stat().st_size}

class EditorWriteInput(BaseModel):
    path: str
    content: str

@api.post("/editor/file")
async def editor_write_file(body: EditorWriteInput, user: dict = Depends(require_manager)):
    p = _editor_safe_path(body.path)
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(body.content, encoding="utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="editor_save", message=f"تم حفظ الملف: {p.name}",
    )
    return {"message": "تم الحفظ", "path": body.path}

class EditorAIInput(BaseModel):
    message: str
    file_path: Optional[str] = None
    file_content: Optional[str] = None
    image_data: Optional[str] = None     # base64-encoded image
    image_name: Optional[str] = None
    extra_files: Optional[List[str]] = None  # extra file paths to include as context

@api.post("/editor/ai")
async def editor_ai(body: EditorAIInput, user: dict = Depends(require_manager)):
    company = await db.companies.find_one({"_id": user["company_id"]})

    # Build current file context
    file_ctx = ""
    if body.file_path and body.file_content is not None:
        preview = body.file_content[:12000] if len(body.file_content) > 12000 else body.file_content
        file_ctx = f"\n\n📄 الملف المفتوح حالياً: {body.file_path}\n```\n{preview}\n```"

    # Load extra files requested by the editor
    extra_ctx = ""
    if body.extra_files:
        for ep in body.extra_files[:5]:
            try:
                ep_path = _editor_safe_path(ep)
                if ep_path.exists() and ep_path.is_file():
                    content = ep_path.read_text(encoding="utf-8", errors="replace")[:6000]
                    extra_ctx += f"\n\n📎 ملف إضافي: {ep}\n```\n{content}\n```"
            except Exception:
                pass

    # Image context
    image_ctx = ""
    if body.image_data and body.image_name:
        image_ctx = f"\n\n🖼️ المستخدم أرسل صورة باسم: {body.image_name} — تعامل معها كمرجع بصري لما يطلبه."

    # Build full project file listing
    project_summary = ""
    try:
        ws = WORKSPACE_ROOT
        all_files = []
        for root_dir in [ws / "frontend" / "src", ws / "backend"]:
            for p in root_dir.rglob("*"):
                if p.is_file() and p.suffix in EDITOR_ALLOWED_EXTS and not any(ig in str(p) for ig in EDITOR_IGNORED_DIRS):
                    all_files.append(str(p.relative_to(ws)))
        project_summary = "\n\n📁 جميع ملفات المشروع:\n" + "\n".join(f"  - {f}" for f in all_files[:120])
    except Exception:
        pass

    # Build tech stack summary
    stack_info = (
        "\n\n🛠️ تقنيات المشروع:"
        "\n  - Frontend: React 18 + Tailwind CSS + Framer Motion + Lucide Icons"
        "\n  - Backend: FastAPI + Motor (async MongoDB) + JWT Auth"
        "\n  - UI Components: GlassCard, PageHeader, PrimaryButton من @/components/Kit"
        "\n  - الـ CSS variables تعتمد على --primary, --accent, gradient-primary, glass class"
        "\n  - الكود dir=rtl، العربية للواجهة، الإنجليزية للكود"
        "\n  - الـ API base path: /api — المصادقة بـ Bearer token في Authorization header"
        "\n  - MongoDB collections: users, companies, attendance, bank_records, loans, activity_logs, announcements, messages, todos, ai_chat_messages, operations, performance_reviews"
    )

    system = (
        "أنت «المطور الذكي» — مهندس برمجيات أول senior full-stack متخصص في بناء وتحسين منصة «إتقان» لإدارة الأعمال العربية. "
        "لديك وصول كامل لجميع ملفات المشروع ويمكنك قراءة أي ملف وتعديله. "
        "\n\n🎯 مهمتك الأساسية: تطوير وتحسين الموقع بناءً على طلب المدير. أنت تعرف البنية الكاملة للمشروع."
        "\n\n📋 قواعد الرد:"
        "\n1. تعديل الملف المفتوح → أعد محتواه كاملاً في: ```FILE_UPDATE\n...الكود...\n```"
        "\n2. إنشاء ملف جديد → اذكر المسار الكامل ثم الكود في: ```NEW_FILE:path/to/file.jsx\n...الكود...\n```"
        "\n3. لا تختصر أبداً بـ ... أو // existing — الكود كامل دائماً"
        "\n4. إذا احتجت ملفاً آخر → اذكر اسمه بالضبط وسيتم تحميله"
        "\n5. الشرح بالعربية، الكود بالإنجليزية"
        "\n6. حافظ على نمط التصميم الموجود (glass cards, gradient-primary, RTL)"
        "\n7. عند تحليل الصور → صف ما تراه وكيف يمكن تطبيقه في الكود"
        + stack_info
        + project_summary
        + file_ctx
        + extra_ctx
        + image_ctx
    )

    # Enhance message with image context if provided
    enhanced_message = body.message
    if body.image_data:
        enhanced_message = f"[تم إرفاق صورة: {body.image_name}]\n{body.message}"

    reply = await smart_ai_reply(enhanced_message, system, user, company)

    # Extract FILE_UPDATE block if present
    new_content = None
    import re as _re
    file_update_match = _re.search(r"```FILE_UPDATE\s*([\s\S]*?)```", reply)
    if file_update_match:
        new_content = file_update_match.group(1).strip()
        reply = reply.replace(file_update_match.group(0), "✅ تم تطبيق التغيير على الملف").strip()
    else:
        # Try to find a large code block that looks like a full file replacement
        code_blocks = _re.findall(r"```(?:jsx?|tsx?|python|py|css)?\s*([\s\S]*?)```", reply)
        if code_blocks and body.file_content and len(code_blocks[-1]) > len(body.file_content) * 0.5:
            new_content = code_blocks[-1].strip()

    # Check for new file creation instructions
    new_file_match = _re.search(r"```NEW_FILE:([^\n]+)\s*([\s\S]*?)```", reply)
    new_file_info = None
    if new_file_match:
        new_file_info = {"path": new_file_match.group(1).strip(), "content": new_file_match.group(2).strip()}
        reply = reply.replace(new_file_match.group(0), f"✅ تم إنشاء الملف الجديد: {new_file_info['path']}").strip()

    return {"reply": reply, "new_content": new_content, "new_file": new_file_info}

class TerminalInput(BaseModel):
    command: str

@api.post("/editor/terminal")
async def editor_terminal(body: TerminalInput, user: dict = Depends(require_manager)):
    """Run a shell command inside the workspace and return output."""
    import subprocess, shlex
    cmd = body.command.strip()
    if not cmd:
        raise HTTPException(status_code=400, detail="الأمر فارغ")
    # Block truly dangerous commands
    BLOCKED = ["rm -rf /", "mkfs", ":(){ :|:& };:", "dd if=", "shutdown", "reboot", "halt", "init 0"]
    if any(b in cmd for b in BLOCKED):
        raise HTTPException(status_code=403, detail="هذا الأمر محظور")
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=30,
            cwd=str(WORKSPACE_ROOT)
        )
        output = result.stdout + result.stderr
        return {"output": output if output else "(لا يوجد ناتج)", "exit_code": result.returncode}
    except subprocess.TimeoutExpired:
        return {"output": "⏱️ انتهت مهلة الأمر (30 ثانية)", "exit_code": 124}
    except Exception as e:
        return {"output": f"❌ خطأ: {str(e)}", "exit_code": 1}

@api.post("/editor/analyze")
async def editor_analyze_site(user: dict = Depends(require_manager)):
    """Full site analysis — reads key files and produces a report."""
    report_parts = []
    ws = WORKSPACE_ROOT
    key_files = [
        ws / "backend" / "server.py",
        ws / "frontend" / "src" / "App.js",
        ws / "frontend" / "src" / "components" / "AppLayout.jsx",
    ]
    for kf in key_files:
        if kf.exists():
            try:
                snippet = kf.read_text(encoding="utf-8", errors="replace")[:3000]
                report_parts.append(f"### {kf.name}\n```\n{snippet}\n```")
            except Exception:
                pass

    # Count files
    fe_count = sum(1 for p in (ws / "frontend" / "src").rglob("*") if p.is_file() and not any(ig in str(p) for ig in EDITOR_IGNORED_DIRS))
    be_count = sum(1 for p in (ws / "backend").rglob("*") if p.is_file())

    system = (
        "أنت محلل تقني خبير. حلل بنية الموقع المذكورة وأعط تقريراً شاملاً بالعربية يتضمن:"
        "\n1. نظرة عامة على هيكل المشروع"
        "\n2. الصفحات والوظائف الرئيسية"
        "\n3. نقاط القوة في البنية الحالية"
        "\n4. اقتراحات للتحسين"
        "\n5. الميزات المقترحة التي قد تفيد المنصة"
    )
    msg = (
        f"المشروع: منصة إتقان لإدارة الأعمال\n"
        f"ملفات الـ frontend: {fe_count} ملف\n"
        f"ملفات الـ backend: {be_count} ملف\n\n"
        + "\n\n".join(report_parts[:3])
    )
    company = await db.companies.find_one({"_id": user["company_id"]})
    reply = await smart_ai_reply(msg, system, user, company)
    return {"report": reply, "stats": {"fe_files": fe_count, "be_files": be_count}}

    reply = await smart_ai_reply(body.message, system, user, company)

    # Extract FILE_UPDATE block if present
    new_content = None
    import re as _re
    file_update_match = _re.search(r"```FILE_UPDATE\s*([\s\S]*?)```", reply)
    if file_update_match:
        new_content = file_update_match.group(1).strip()
        reply = reply.replace(file_update_match.group(0), "✅ تم تطبيق التغيير على الملف").strip()
    else:
        # Try to find a large code block that looks like a full file replacement
        code_blocks = _re.findall(r"```(?:jsx?|tsx?|python|py|css)?\s*([\s\S]*?)```", reply)
        if code_blocks and body.file_content and len(code_blocks[-1]) > len(body.file_content) * 0.5:
            new_content = code_blocks[-1].strip()

    return {"reply": reply, "new_content": new_content}

# --------------------------------------------------------------------------------------
# AI Assistant
# --------------------------------------------------------------------------------------
class AIChatInput(BaseModel):
    message: str


@api.post("/ai-chat")
async def ai_chat(body: AIChatInput, user: dict = Depends(require_feature("chat"))):
    company = await db.companies.find_one({"_id": user["company_id"]})
    premium = subscription_active(company) if company else False

    crew_count = await db.users.count_documents({"company_id": user["company_id"], "role": "member"})
    ai_level = company.get("ai_level", "basic") if company else "basic"

    system = (
        "أنت «المساعد الذكي» داخل منصة إتقان لإدارة الأعمال والموظفين. "
        f"اسم الشركة: {company.get('name') if company else ''}. "
        f"دور المستخدم: {'المدير' if user['role'] == 'manager' else 'موظف'}، واسمه {user.get('name')}. "
        f"عدد أعضاء الطاقم: {crew_count}. "
        "مهمتك: مساعدة المستخدم في أي شيء يطلبه — تنظيم العمل، تحليل الأداء، الرواتب، المهام، "
        "حل المشاكل، النصائح الاحترافية، أو أي سؤال عام. أجب دائماً بالعربية بأسلوب ودود واضح. "
        "استخدم النقاط والجداول عند الحاجة. لا تقيّد نفسك بمجال واحد — ساعد المستخدم بأقصى ما تستطيع."
    )
    if ai_level == "ultra":
        system += " أنت في وضع الذكاء الفائق: قدّم تحليلاً تنبؤياً ومتعمقاً وتوصيات استراتيجية."
    elif ai_level == "pro":
        system += " أنت في وضع الذكاء الاحترافي: قدّم تحليلاً متقدماً وخططاً عملية ونصائح مالية معمّقة."
    else:
        system += " قدّم إجابات مفيدة وشاملة تناسب مشترك المنصة."

    history = await db.ai_chat_messages.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(10)
    history = list(reversed(history))
    if history:
        convo = "\n".join(f"{'المستخدم' if m['role'] == 'user' else 'المساعد'}: {m['text']}" for m in history)
        system += "\n\nسياق المحادثة السابقة:\n" + convo

    await db.ai_chat_messages.insert_one({
        "company_id": user["company_id"], "user_id": user["_id"], "role": "user",
        "text": body.message, "created_at": now_utc(),
    })

    reply_text = await smart_ai_reply(body.message, system, user, company)

    await db.ai_chat_messages.insert_one({
        "company_id": user["company_id"], "user_id": user["_id"], "role": "assistant",
        "text": reply_text, "created_at": now_utc(),
    })
    return {"reply": reply_text, "premium": premium}


@api.get("/ai-chat/history")
async def ai_chat_history(user: dict = Depends(require_feature("chat"))):
    msgs = await db.ai_chat_messages.find({"user_id": user["_id"]}).sort("created_at", 1).to_list(100)
    return [{
        "role": m["role"], "text": m["text"],
        "created_at": m["created_at"].isoformat() if isinstance(m.get("created_at"), datetime) else m.get("created_at"),
    } for m in msgs]


@api.delete("/ai-chat/history")
async def clear_ai_chat(user: dict = Depends(require_feature("chat"))):
    await db.ai_chat_messages.delete_many({"user_id": user["_id"]})
    return {"ok": True}


# --------------------------------------------------------------------------------------
# Team Chat (WhatsApp-style, company scoped)
# --------------------------------------------------------------------------------------
def channel_id(a, b):
    return "dm:" + ":".join(sorted([str(a), str(b)]))


class ChatSend(BaseModel):
    channel_type: str  # group | direct
    to_user_id: Optional[str] = None
    text: str


@api.get("/chat/contacts")
async def chat_contacts(user: dict = Depends(require_feature("chat"))):
    contacts = []
    if user["role"] in ("manager", "co_manager"):
        crew = await db.users.find({"company_id": user["company_id"], "role": "member"}).to_list(500)
        contacts = [{"id": str(c["_id"]), "name": c.get("name"), "avatar_url": c.get("avatar_url"), "job_title": c.get("job_title"), "role": "member"} for c in crew]
    else:
        # employees see all managers and co-managers
        mgrs = await db.users.find({"company_id": user["company_id"], "role": {"$in": ["manager", "co_manager"]}}).to_list(20)
        contacts = [{"id": str(m["_id"]), "name": m.get("name"), "avatar_url": m.get("avatar_url"), "job_title": m.get("job_title", "المدير"), "role": m["role"]} for m in mgrs]
    return {"contacts": contacts}


@api.post("/chat/send")
async def chat_send(body: ChatSend, user: dict = Depends(require_feature("chat"))):
    if body.channel_type == "group":
        channel = "group"
    else:
        if not body.to_user_id:
            raise HTTPException(status_code=400, detail="حدد المستلم")
        channel = channel_id(user["_id"], body.to_user_id)
    doc = {
        "company_id": user["company_id"], "channel": channel,
        "sender_id": user["_id"], "sender_name": user.get("name"),
        "sender_avatar": user.get("avatar_url"), "sender_role": user["role"],
        "text": body.text, "created_at": now_utc(),
    }
    res = await db.chat_messages.insert_one(doc)
    return {"id": str(res.inserted_id), "ok": True}


@api.get("/chat/history")
async def chat_history(channel_type: str, to_user_id: Optional[str] = None, user: dict = Depends(require_feature("chat"))):
    if channel_type == "group":
        channel = "group"
    else:
        if not to_user_id:
            raise HTTPException(status_code=400, detail="حدد المستلم")
        channel = channel_id(user["_id"], to_user_id)
    msgs = await db.chat_messages.find({"company_id": user["company_id"], "channel": channel}).sort("created_at", 1).to_list(400)
    return [{
        "id": str(m["_id"]), "sender_id": str(m["sender_id"]), "sender_name": m.get("sender_name"),
        "sender_avatar": m.get("sender_avatar"), "sender_role": m.get("sender_role"), "text": m["text"],
        "mine": str(m["sender_id"]) == str(user["_id"]),
        "created_at": m["created_at"].isoformat() if isinstance(m.get("created_at"), datetime) else m.get("created_at"),
    } for m in msgs]


# --------------------------------------------------------------------------------------
# Work Logs (Notebook: employees log completed work, manager approves)
# --------------------------------------------------------------------------------------
class WorkLogInput(BaseModel):
    description: str
    price: int = 0
    work_date: Optional[str] = None


@api.post("/work-logs")
async def add_work_log(body: WorkLogInput, user: dict = Depends(get_current_user)):
    doc = {
        "company_id": user["company_id"], "user_id": user["_id"], "user_name": user.get("name"),
        "description": body.description, "price": body.price or 0,
        "work_date": body.work_date or cairo_now().date().isoformat(),
        "status": "approved" if user["role"] == "manager" else "pending",
        "approved_by": user.get("name") if user["role"] == "manager" else None,
        "created_at": now_utc(),
    }
    res = await db.work_logs.insert_one(doc)
    return {"id": str(res.inserted_id), "description": doc["description"], "price": doc["price"],
            "work_date": doc["work_date"], "status": doc["status"], "user_name": doc["user_name"]}


@api.get("/work-logs/summary")
async def work_logs_summary(month: Optional[str] = None, user: dict = Depends(require_manager)):
    query = {"company_id": user["company_id"], "status": "approved"}
    if month:
        query["work_date"] = {"$regex": f"^{month}"}
    logs = await db.work_logs.find(query).to_list(2000)
    by_user = {}
    for l in logs:
        uid = str(l["user_id"])
        by_user.setdefault(uid, {"user_name": l.get("user_name"), "count": 0, "total": 0})
        by_user[uid]["count"] += 1
        by_user[uid]["total"] += l.get("price", 0)
    return {"per_employee": list(by_user.values()),
            "grand_total": sum(v["total"] for v in by_user.values()),
            "total_jobs": sum(v["count"] for v in by_user.values())}


@api.get("/work-logs")
async def list_work_logs(month: Optional[str] = None, user_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"company_id": user["company_id"]}
    if user["role"] != "manager":
        query["user_id"] = user["_id"]
    elif user_id:
        query["user_id"] = safe_object_id(user_id)
    if month:
        query["work_date"] = {"$regex": f"^{month}"}
    logs = await db.work_logs.find(query).sort("created_at", -1).to_list(500)
    return [{
        "id": str(l["_id"]), "user_id": str(l["user_id"]), "user_name": l.get("user_name"),
        "description": l["description"], "price": l.get("price", 0), "work_date": l.get("work_date"),
        "status": l.get("status"), "approved_by": l.get("approved_by"),
    } for l in logs]


@api.post("/work-logs/{wid}/approve")
async def approve_work_log(wid: str, user: dict = Depends(require_manager)):
    await db.work_logs.update_one(
        {"_id": safe_object_id(wid), "company_id": user["company_id"]},
        {"$set": {"status": "approved", "approved_by": user.get("name")}},
    )
    return {"ok": True}
@api.post("/attendance/checkout")
async def employee_checkout(data: dict, current_user: dict = Depends(get_current_user)):
    today_date = datetime.now().date()
    
    attendance_log = await db.attendance_logs.find_one({
        "employee_id": current_user.get("id") or current_user.get("_id"),
        "log_date": str(today_date)
    })
    
    if not attendance_log:
        raise HTTPException(status_code=400, detail="لا يوجد سجل حضور مسجل لهذا اليوم لتسجيل الانصراف عليه")
    
    await db.attendance_logs.update_one(
        {"_id": attendance_log.get("id") or attendance_log.get("_id")},
        {"$set": {"checkout_time": data.get("checkout_time"), "status_checkout": "checked_out"}}
    )
    
    notification_payload = {
        "manager_id": attendance_log.get("manager_id"),
        "title": "انصراف موظف",
        "message": f"قام الموظف {current_user.get('name', 'موظف')} بتسجيل الانصراف ومغادرة مقر العمل.",
        "timestamp": datetime.now(),
        "read": False
    }
    await db.notifications.insert_one(notification_payload)
    
    return {"status": "success", "message": "تم تسجيل الانصراف وإبلاغ الإدارة بنجاح"}

@api.delete("/work-logs/{wid}")
async def delete_work_log(wid: str, user: dict = Depends(get_current_user)):
    q = {"_id": safe_object_id(wid), "company_id": user["company_id"]}
    if user["role"] != "manager":
        q["user_id"] = user["_id"]
        q["status"] = "pending"
    await db.work_logs.delete_one(q)
    return {"ok": True}
class CheckoutInput(BaseModel):
    checkout_time: Optional[str] = None

@api.post("/attendance/checkout")
async def employee_checkout(body: CheckoutInput, user: dict = Depends(get_current_user)):
    today = cairo_now().date().isoformat()
    existing_log = await db.attendance.find_one({
        "company_id": user["company_id"],
        "user_id": user["_id"],
        "log_date": today
    })
    
    if not existing_log:
        raise HTTPException(status_code=400, detail="لم تقم بتسجيل الحضور اليوم لتتمكن من الانصراف")
    
    checkout_t = body.checkout_time or cairo_now().strftime("%H:%M")
    await db.attendance.update_one(
        {"_id": existing_log["_id"]},
        {"$set": {"checkout_time": checkout_t}}
    )
    return {"ok": True, "message": "تم تسجيل الانصراف بنجاح"}

# --------------------------------------------------------------------------------------
# Announcements (Notice Board) — inspired by WorkDo Dash
# --------------------------------------------------------------------------------------
class AnnouncementInput(BaseModel):
    title: str
    body: str
    pinned: bool = False


@api.get("/announcements")
async def list_announcements(user: dict = Depends(get_current_user)):
    items = await db.announcements.find({"company_id": user["company_id"]}).sort([("pinned", -1), ("created_at", -1)]).to_list(100)
    return [{
        "id": str(i["_id"]), "title": i["title"], "body": i["body"], "pinned": i.get("pinned", False),
        "author": i.get("author"),
        "created_at": i["created_at"].isoformat() if isinstance(i.get("created_at"), datetime) else i.get("created_at"),
    } for i in items]


@api.post("/announcements")
async def add_announcement(body: AnnouncementInput, user: dict = Depends(require_manager)):
    doc = {"company_id": user["company_id"], "title": body.title, "body": body.body,
           "pinned": body.pinned, "author": user.get("name"), "created_at": now_utc()}
    res = await db.announcements.insert_one(doc)
    return {"id": str(res.inserted_id)}


@api.delete("/announcements/{aid}")
async def del_announcement(aid: str, user: dict = Depends(require_manager)):
    await db.announcements.delete_one({"_id": safe_object_id(aid), "company_id": user["company_id"]})
    return {"ok": True}


# --------------------------------------------------------------------------------------
# Leave Requests (الإجازات)
# --------------------------------------------------------------------------------------
class LeaveInput(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: Optional[str] = ""


class LeaveDecision(BaseModel):
    status: str  # approved | rejected


@api.get("/leaves")
async def list_leaves(user: dict = Depends(get_current_user)):
    q = {"company_id": user["company_id"]}
    if user["role"] not in ("manager", "co_manager"):
        q["user_id"] = user["_id"]
    items = await db.leaves.find(q).sort("created_at", -1).to_list(300)
    return [{
        "id": str(i["_id"]), "user_id": str(i["user_id"]), "user_name": i.get("user_name"),
        "leave_type": i["leave_type"], "start_date": i["start_date"], "end_date": i["end_date"],
        "reason": i.get("reason", ""), "status": i.get("status", "pending"),
        "created_at": i["created_at"].isoformat() if isinstance(i.get("created_at"), datetime) else i.get("created_at"),
    } for i in items]


@api.post("/leaves")
async def add_leave(body: LeaveInput, user: dict = Depends(get_current_user)):
    doc = {"company_id": user["company_id"], "user_id": user["_id"], "user_name": user.get("name"),
           "leave_type": body.leave_type, "start_date": body.start_date, "end_date": body.end_date,
           "reason": body.reason or "", "status": "approved" if user["role"] == "manager" else "pending",
           "created_at": now_utc()}
    res = await db.leaves.insert_one(doc)
    return {"id": str(res.inserted_id), "status": doc["status"]}


@api.post("/leaves/{lid}/decision")
async def decide_leave(lid: str, body: LeaveDecision, user: dict = Depends(require_manager)):
    await db.leaves.update_one({"_id": safe_object_id(lid), "company_id": user["company_id"]}, {"$set": {"status": body.status}})
    return {"ok": True}


@api.delete("/leaves/{lid}")
async def del_leave(lid: str, user: dict = Depends(get_current_user)):
    q = {"_id": safe_object_id(lid), "company_id": user["company_id"]}
    if user["role"] != "manager":
        q["user_id"] = user["_id"]
        q["status"] = "pending"
    await db.leaves.delete_one(q)
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# Late Permissions (استئذان للتأخير)
# ──────────────────────────────────────────────────────────────────────────────
class LatePermissionInput(BaseModel):
    reason: str
    expected_time: Optional[str] = ""

class LatePermissionDecision(BaseModel):
    status: str  # approved | rejected

@api.get("/late-permissions")
async def list_late_permissions(user: dict = Depends(get_current_user)):
    q = {"company_id": user["company_id"]}
    if user["role"] not in ("manager", "co_manager"):
        q["user_id"] = user["_id"]
    items = await db.late_permissions.find(q).sort("created_at", -1).to_list(300)
    return [{
        "id": str(i["_id"]), "user_id": str(i["user_id"]),
        "user_name": i.get("user_name", ""), "reason": i.get("reason", ""),
        "expected_time": i.get("expected_time", ""), "status": i.get("status", "pending"),
        "created_at": i["created_at"].isoformat() if isinstance(i.get("created_at"), datetime) else i.get("created_at"),
    } for i in items]

@api.post("/late-permissions")
async def request_late_permission(body: LatePermissionInput, user: dict = Depends(get_current_user)):
    doc = {
        "company_id": user["company_id"], "user_id": user["_id"],
        "user_name": user.get("name", ""), "reason": body.reason,
        "expected_time": body.expected_time or "", "status": "pending", "created_at": now_utc(),
    }
    res = await db.late_permissions.insert_one(doc)
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="late_permission_request", message=f"طلب استئذان تأخير: {user.get('name')} — {body.reason}",
    )
    return {"id": str(res.inserted_id), "status": "pending"}

@api.post("/late-permissions/{pid}/decision")
async def decide_late_permission(pid: str, body: LatePermissionDecision, user: dict = Depends(require_manager)):
    item = await db.late_permissions.find_one({"_id": safe_object_id(pid), "company_id": user["company_id"]})
    if not item:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    await db.late_permissions.update_one(
        {"_id": safe_object_id(pid)},
        {"$set": {"status": body.status, "decided_by": user.get("name"), "decided_at": now_utc()}}
    )
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="late_permission_decision",
        message=f"{'موافقة' if body.status == 'approved' else 'رفض'} استئذان تأخير: {item.get('user_name')}",
    )
    return {"ok": True}

@api.delete("/late-permissions/{pid}")
async def delete_late_permission(pid: str, user: dict = Depends(get_current_user)):
    q = {"_id": safe_object_id(pid), "company_id": user["company_id"]}
    if user["role"] not in ("manager", "co_manager"):
        q["user_id"] = user["_id"]
        q["status"] = "pending"
    await db.late_permissions.delete_one(q)
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# Petty Cash / Store (الخزينة / المخزن)
# ──────────────────────────────────────────────────────────────────────────────
class PettyCashInput(BaseModel):
    op_type: str  # fund | spend
    amount: float
    description: str
    category: Optional[str] = ""

@api.get("/petty-cash")
async def get_petty_cash(user: dict = Depends(require_manager_feature("vault"))):
    ops = await db.petty_cash.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(500)
    balance = sum(o["amount"] if o["op_type"] == "fund" else -o["amount"] for o in ops)
    return {
        "balance": round(balance, 2),
        "operations": [{
            "id": str(o["_id"]), "op_type": o["op_type"], "amount": o["amount"],
            "description": o.get("description", ""), "category": o.get("category", ""),
            "created_by": o.get("created_by", ""),
            "created_at": o["created_at"].isoformat() if isinstance(o.get("created_at"), datetime) else o.get("created_at"),
        } for o in ops]
    }

@api.post("/petty-cash")
async def add_petty_cash_op(body: PettyCashInput, user: dict = Depends(require_manager_feature("vault"))):
    if body.op_type not in ("fund", "spend"):
        raise HTTPException(status_code=400, detail="نوع العملية غير صالح")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="المبلغ يجب أن يكون أكبر من صفر")
    if body.op_type == "spend":
        ops = await db.petty_cash.find({"company_id": user["company_id"]}).to_list(500)
        balance = sum(o["amount"] if o["op_type"] == "fund" else -o["amount"] for o in ops)
        if body.amount > balance:
            raise HTTPException(status_code=400, detail=f"الرصيد غير كافٍ. الرصيد الحالي: {balance:.2f} ج.م")
    doc = {
        "company_id": user["company_id"], "op_type": body.op_type, "amount": body.amount,
        "description": body.description, "category": body.category or "",
        "created_by": user.get("name", ""), "created_at": now_utc(),
    }
    res = await db.petty_cash.insert_one(doc)
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="petty_cash",
        message=f"{'إيداع' if body.op_type == 'fund' else 'صرف'} من الخزينة: {body.amount} ج.م — {body.description}",
    )
    return {"id": str(res.inserted_id), "ok": True}

@api.delete("/petty-cash/{oid}")
async def delete_petty_cash_op(oid: str, user: dict = Depends(require_manager_feature("vault"))):
    await db.petty_cash.delete_one({"_id": safe_object_id(oid), "company_id": user["company_id"]})
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# Manager Records (ديون / خصومات / عربون / احتياجات)
# ──────────────────────────────────────────────────────────────────────────────
class ManagerRecordInput(BaseModel):
    record_type: str  # debt | deduction | advance | need
    amount: float
    description: str
    person_name: Optional[str] = ""
    due_date: Optional[str] = None
    note: Optional[str] = ""
    status: Optional[str] = "active"  # active | settled

@api.get("/manager-records")
async def list_manager_records(user: dict = Depends(require_manager)):
    items = await db.manager_records.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(500)
    return [{
        "id": str(i["_id"]), "record_type": i["record_type"], "amount": i.get("amount", 0),
        "description": i.get("description", ""), "person_name": i.get("person_name", ""),
        "due_date": i.get("due_date"), "note": i.get("note", ""), "status": i.get("status", "active"),
        "created_by": i.get("created_by", ""),
        "created_at": i["created_at"].isoformat() if isinstance(i.get("created_at"), datetime) else i.get("created_at"),
    } for i in items]

@api.post("/manager-records")
async def add_manager_record(body: ManagerRecordInput, user: dict = Depends(require_manager)):
    if body.record_type not in ("debt", "deduction", "advance", "need"):
        raise HTTPException(status_code=400, detail="نوع السجل غير صالح")
    doc = {
        "company_id": user["company_id"], "record_type": body.record_type, "amount": body.amount,
        "description": body.description, "person_name": body.person_name or "",
        "due_date": body.due_date, "note": body.note or "", "status": body.status or "active",
        "created_by": user.get("name", ""), "created_at": now_utc(),
    }
    res = await db.manager_records.insert_one(doc)
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="manager_record", message=f"سجل جديد ({body.record_type}): {body.description} — {body.amount} ج.م",
    )
    return {"id": str(res.inserted_id), "ok": True}

@api.put("/manager-records/{rid}")
async def update_manager_record(rid: str, body: ManagerRecordInput, user: dict = Depends(require_manager)):
    await db.manager_records.update_one(
        {"_id": safe_object_id(rid), "company_id": user["company_id"]},
        {"$set": {
            "record_type": body.record_type, "amount": body.amount, "description": body.description,
            "person_name": body.person_name or "", "due_date": body.due_date,
            "note": body.note or "", "status": body.status or "active",
        }}
    )
    return {"ok": True}

@api.delete("/manager-records/{rid}")
async def delete_manager_record(rid: str, user: dict = Depends(require_manager)):
    await db.manager_records.delete_one({"_id": safe_object_id(rid), "company_id": user["company_id"]})
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# Employee Full Profile (ملف الموظف الكامل)
# ──────────────────────────────────────────────────────────────────────────────
@api.get("/crew/{employee_id}/full-profile")
async def employee_full_profile(employee_id: str, user: dict = Depends(require_manager)):
    emp = await db.users.find_one({"_id": safe_object_id(employee_id), "company_id": user["company_id"]})
    if not emp:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    att_logs = await db.attendance_logs.find({"user_id": emp["_id"]}).sort("created_at", -1).to_list(200)
    txs = await db.transactions.find({"$or": [{"user_id": emp["_id"]}, {"crew_id": emp["_id"]}]}).sort("created_at", -1).to_list(200)
    loans = await db.loans.find({"employee_id": emp["_id"]}).sort("created_at", -1).to_list(100)
    leaves = await db.leaves.find({"user_id": emp["_id"]}).sort("created_at", -1).to_list(100)
    late_perms = await db.late_permissions.find({"user_id": emp["_id"]}).sort("created_at", -1).to_list(100)
    total = len(att_logs)
    present = sum(1 for l in att_logs if l["type"] in ("present", "late"))
    late = sum(1 for l in att_logs if l["type"] == "late")
    absent = sum(1 for l in att_logs if l["type"] == "absence")
    att_rate = round((present / total) * 100) if total else 100
    def fmt(v): return v.isoformat() if isinstance(v, datetime) else v
    return {
        "employee": ser_user(emp),
        "attendance": {
            "total_days": total, "present_days": present, "late_days": late,
            "absent_days": absent, "attendance_rate": att_rate,
            "logs": [{"id": str(l["_id"]), "log_date": l.get("log_date"), "type": l.get("type"),
                      "check_time": l.get("check_time"), "deduction_amount": l.get("deduction_amount", 0),
                      "created_at": fmt(l.get("created_at"))} for l in att_logs[:50]],
        },
        "transactions": [{"id": str(t["_id"]), "type": t.get("type"), "amount": t.get("amount", 0),
                          "reason": t.get("reason", ""), "created_at": fmt(t.get("created_at"))} for t in txs],
        "loans": [{"id": str(l["_id"]), "amount": l.get("amount", 0),
                   "remaining_amount": l.get("remaining_amount", 0), "status": l.get("status"),
                   "reason": l.get("reason", ""), "created_at": fmt(l.get("created_at"))} for l in loans],
        "leaves": [{"id": str(l["_id"]), "leave_type": l.get("leave_type"),
                    "start_date": l.get("start_date"), "end_date": l.get("end_date"),
                    "reason": l.get("reason", ""), "status": l.get("status"),
                    "created_at": fmt(l.get("created_at"))} for l in leaves],
        "late_permissions": [{"id": str(p["_id"]), "reason": p.get("reason", ""),
                              "expected_time": p.get("expected_time", ""), "status": p.get("status"),
                              "created_at": fmt(p.get("created_at"))} for p in late_perms],
    }


# ──────────────────────────────────────────────────────────────────────────────
# Company Stats (إحصائيات الشركة — أقسام الشركة بدون الموظفين)
# ──────────────────────────────────────────────────────────────────────────────
@api.get("/company/stats")
async def company_stats(user: dict = Depends(require_manager_feature("company_stats"))):
    company = await get_company(user)
    bank_recs = await db.bank_records.find({"company_id": user["company_id"]}).to_list(1000)
    total_income = sum(r.get("amount", 0) for r in bank_recs if r.get("record_type") == "income")
    total_expense = sum(r.get("amount", 0) for r in bank_recs if r.get("record_type") == "expense")
    petty = await db.petty_cash.find({"company_id": user["company_id"]}).to_list(1000)
    petty_balance = sum(o["amount"] if o["op_type"] == "fund" else -o["amount"] for o in petty)
    mgr_recs = await db.manager_records.find({"company_id": user["company_id"]}).to_list(1000)
    active_debts = sum(r.get("amount", 0) for r in mgr_recs if r.get("record_type") == "debt" and r.get("status") == "active")
    active_needs = [r for r in mgr_recs if r.get("record_type") == "need" and r.get("status") == "active"]
    equipment = await db.equipment.find({"company_id": user["company_id"]}).to_list(500)
    projects = await db.projects.find({"company_id": user["company_id"]}).to_list(500)
    return {
        "company": ser_company(company),
        "bank": {"total_income": total_income, "total_expense": total_expense, "net": total_income - total_expense},
        "petty_cash": {"balance": round(petty_balance, 2)},
        "manager_records": {"active_debts": active_debts, "active_needs_count": len(active_needs)},
        "operations": {
            "equipment_count": len(equipment),
            "total_equipment_value": sum(e.get("amount", 0) for e in equipment),
            "active_projects": sum(1 for p in projects if p.get("status") == "active"),
        },
    }


# ──────────────────────────────────────────────────────────────────────────────
# Device Registration (تسجيل الأجهزة المعتمدة)
# ──────────────────────────────────────────────────────────────────────────────
class DeviceRegisterInput(BaseModel):
    device_id: str
    device_name: str

@api.get("/devices")
async def list_devices(user: dict = Depends(get_current_user)):
    devs = await db.registered_devices.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(20)
    return [{"id": str(d["_id"]), "device_id": d["device_id"], "device_name": d.get("device_name", ""),
             "last_seen": d.get("last_seen").isoformat() if isinstance(d.get("last_seen"), datetime) else d.get("last_seen"),
             "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else d.get("created_at")} for d in devs]

@api.post("/devices/register")
async def register_device(body: DeviceRegisterInput, request: Request, user: dict = Depends(get_current_user)):
    existing = await db.registered_devices.find_one({"user_id": user["_id"], "device_id": body.device_id})
    if existing:
        await db.registered_devices.update_one({"_id": existing["_id"]},
            {"$set": {"last_seen": now_utc(), "device_name": body.device_name}})
        return {"registered": False, "message": "الجهاز مسجل مسبقاً"}
    doc = {
        "company_id": user["company_id"], "user_id": user["_id"],
        "device_id": body.device_id, "device_name": body.device_name,
        "ip": request.headers.get("X-Forwarded-For", request.client.host if request.client else ""),
        "last_seen": now_utc(), "created_at": now_utc(),
    }
    await db.registered_devices.insert_one(doc)
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="device_registered", message=f"تسجيل جهاز جديد: {body.device_name}",
    )
    return {"registered": True, "message": "تم تسجيل الجهاز بنجاح"}

@api.delete("/devices/{did}")
async def remove_device(did: str, user: dict = Depends(require_manager)):
    await db.registered_devices.delete_one({"_id": safe_object_id(did), "company_id": user["company_id"]})
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# AI Anomaly Detection — Security Events
# ──────────────────────────────────────────────────────────────────────────────
@api.get("/security/events")
async def get_security_events(user: dict = Depends(require_manager)):
    events = await db.security_events.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(200)
    return [{"id": str(e["_id"]), "event_type": e.get("event_type"), "severity": e.get("severity", "info"),
             "user_name": e.get("user_name", ""), "message": e.get("message", ""),
             "ip": e.get("ip", ""), "is_resolved": e.get("is_resolved", False),
             "created_at": e["created_at"].isoformat() if isinstance(e.get("created_at"), datetime) else e.get("created_at")} for e in events]

@api.post("/security/events/{eid}/resolve")
async def resolve_security_event(eid: str, user: dict = Depends(require_manager)):
    await db.security_events.update_one(
        {"_id": safe_object_id(eid), "company_id": user["company_id"]},
        {"$set": {"is_resolved": True, "resolved_by": user.get("name"), "resolved_at": now_utc()}}
    )
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# Pending Approvals (موافقة المدير على التعديلات الحساسة)
# ──────────────────────────────────────────────────────────────────────────────
class PendingApprovalInput(BaseModel):
    action_type: str   # salary_change | employee_delete | role_change
    target_id: str     # employee user id
    target_name: str
    old_value: Optional[str] = ""
    new_value: Optional[str] = ""
    note: Optional[str] = ""

@api.get("/pending-approvals")
async def list_pending_approvals(user: dict = Depends(require_manager)):
    items = await db.pending_approvals.find({"company_id": user["company_id"], "status": "pending"}).sort("created_at", -1).to_list(100)
    return [
        {
            "id": str(i["_id"]),
            "action_type": i.get("action_type"),
            "target_name": i.get("target_name", ""),
            "target_id": i.get("target_id", ""),
            "old_value": i.get("old_value", ""),
            "new_value": i.get("new_value", ""),
            "note": i.get("note", ""),
            "requested_by": i.get("requested_by", ""),
            # device-change specific fields
            "photo": i.get("photo"),
            "device_info": i.get("device_info", ""),
            "old_device_info": i.get("old_device_info", ""),
            "network_name": i.get("network_name", ""),
            "ip_address": i.get("ip_address", ""),
            "location": i.get("location", ""),
            "created_at": i["created_at"].isoformat() if isinstance(i.get("created_at"), datetime) else i.get("created_at"),
        }
        for i in items
    ]

@api.post("/pending-approvals")
async def create_pending_approval(body: PendingApprovalInput, user: dict = Depends(require_manager)):
    doc = {
        "company_id": user["company_id"], "action_type": body.action_type,
        "target_id": body.target_id, "target_name": body.target_name,
        "old_value": body.old_value or "", "new_value": body.new_value or "",
        "note": body.note or "", "status": "pending", "requested_by": user.get("name", ""),
        "created_at": now_utc(),
    }
    res = await db.pending_approvals.insert_one(doc)
    return {"id": str(res.inserted_id)}

@api.post("/pending-approvals/{aid}/approve")
async def approve_pending_action(aid: str, user: dict = Depends(require_manager)):
    item = await db.pending_approvals.find_one({"_id": safe_object_id(aid), "company_id": user["company_id"]})
    if not item:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    await db.pending_approvals.update_one({"_id": safe_object_id(aid)},
        {"$set": {"status": "approved", "approved_by": user.get("name"), "approved_at": now_utc()}})
    # Execute the approved action
    if item["action_type"] == "salary_change":
        try:
            await db.users.update_one({"_id": safe_object_id(item["target_id"]), "company_id": user["company_id"]},
                {"$set": {"monthly_salary": float(item["new_value"])}})
        except Exception:
            pass
    elif item["action_type"] == "employee_delete":
        try:
            await db.users.update_one({"_id": safe_object_id(item["target_id"]), "company_id": user["company_id"]}, {"$set": {"is_active": False}})
        except Exception:
            pass
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="approval_granted", message=f"تم الموافقة على: {item.get('action_type')} لـ {item.get('target_name')}",
    )
    return {"ok": True}

@api.post("/pending-approvals/{aid}/reject")
async def reject_pending_action(aid: str, user: dict = Depends(require_manager)):
    await db.pending_approvals.update_one(
        {"_id": safe_object_id(aid), "company_id": user["company_id"]},
        {"$set": {"status": "rejected", "rejected_by": user.get("name"), "rejected_at": now_utc()}}
    )
    return {"ok": True}


# --------------------------------------------------------------------------------------
# Personal To-Do
# --------------------------------------------------------------------------------------
class TodoInput(BaseModel):
    text: str


@api.get("/todos")
async def list_todos(user: dict = Depends(get_current_user)):
    items = await db.todos.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(200)
    return [{"id": str(i["_id"]), "text": i["text"], "done": i.get("done", False)} for i in items]


@api.post("/todos")
async def add_todo(body: TodoInput, user: dict = Depends(get_current_user)):
    doc = {"company_id": user["company_id"], "user_id": user["_id"], "text": body.text, "done": False, "created_at": now_utc()}
    res = await db.todos.insert_one(doc)
    return {"id": str(res.inserted_id), "text": body.text, "done": False}


@api.put("/todos/{tid}/toggle")
async def toggle_todo(tid: str, user: dict = Depends(get_current_user)):
    t = await db.todos.find_one({"_id": safe_object_id(tid), "user_id": user["_id"]})
    if not t:
        raise HTTPException(status_code=404, detail="غير موجود")
    await db.todos.update_one({"_id": t["_id"]}, {"$set": {"done": not t.get("done", False)}})
    return {"ok": True}


@api.delete("/todos/{tid}")
async def del_todo(tid: str, user: dict = Depends(get_current_user)):
    await db.todos.delete_one({"_id": safe_object_id(tid), "user_id": user["_id"]})
    return {"ok": True}


# --------------------------------------------------------------------------------------
# QR Attendance System
# --------------------------------------------------------------------------------------
import secrets as _secrets


async def enforce_device_lock(user: dict, device_id: str, device_label: str):
    """Bind attendance check-in to the first phone/device an employee registers with.
    On the first successful check-in, the device fingerprint is stored on the user.
    Any later check-in from a different device is rejected until a manager resets it.
    """
    if not device_id:
        raise HTTPException(
            status_code=400,
            detail="❌ تعذّر التعرف على جهازك — تأكد من تفعيل الجافاسكريبت وإعادة تحميل الصفحة",
        )
    registered = user.get("registered_device_id")
    if not registered:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"registered_device_id": device_id, "registered_device_label": device_label or "جهاز غير محدد"}},
        )
        return
    if registered != device_id:
        raise HTTPException(
            status_code=403,
            detail="❌ لا يمكنك تسجيل الحضور إلا من نفس الهاتف المسجل مسبقاً. تواصل مع المدير لإعادة ضبط الجهاز",
        )


class QRCheckinInput(BaseModel):
    token: str
    device_info: Optional[str] = ""
    device_id: Optional[str] = ""
    location: Optional[str] = ""
    photo: Optional[str] = None
    network_name: Optional[str] = ""
    network_type: Optional[str] = ""


class SelfCheckinInput(BaseModel):
    device_info: Optional[str] = ""
    device_id: Optional[str] = ""
    location: Optional[str] = ""
    photo: Optional[str] = None
    network_name: Optional[str] = ""
    network_type: Optional[str] = ""

@api.post("/me/checkin")
async def self_checkin(body: SelfCheckinInput, request: Request, user: dict = Depends(get_current_user)):
    """Employee self check-in with face photo — no manager QR needed."""
    if user.get("role") not in ("member",):
        raise HTTPException(status_code=403, detail="تسجيل الحضور للموظفين فقط")
    today = cairo_now().date().isoformat()
    existing_log = await db.attendance_logs.find_one({
        "user_id": user["_id"], "log_date": today, "type": {"$in": ["present", "late"]},
    })
    if existing_log or user.get("last_checkin_date") == today:
        return {"status": user.get("status"), "message": "سجّلت حضورك بالفعل اليوم", "already": True}
    # Cancel any accidental absence log before registering the real checkin
    await _reverse_absence_if_exists(user["_id"], today)
    await enforce_device_lock(user, body.device_id, body.device_info)
    company = await get_company(user)
    att = company.get("attendance", {})
    now_c = cairo_now()
    shift_name, shift = _get_active_shift(att, now_c)
    deadline_str = shift.get("check_in_deadline", att.get("check_in_deadline", "09:30"))
    try:
        hh, mm = [int(x) for x in deadline_str.split(":")]
    except Exception:
        hh, mm = 9, 30
    deadline = now_c.replace(hour=hh, minute=mm, second=0, microsecond=0)
    _s = company.get("settings", {})
    _grace = int(_s.get("grace_minutes", 0)) if _s.get("allow_late_check_grace") else 0
    effective_deadline = deadline + timedelta(minutes=_grace)
    is_late = now_c.replace(second=0, microsecond=0) > effective_deadline
    status = "late" if is_late else "present"
    deduction = shift.get("late_deduction", att.get("late_deduction", 50)) if is_late else 0
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "غير معروف")
    log = {
        "company_id": user["company_id"], "user_id": user["_id"],
        "log_date": today, "type": status, "shift": shift_name, "deduction_amount": deduction,
        "check_time": now_c.strftime("%H:%M"), "method": "self_qr",
        "ip_address": client_ip, "device_info": body.device_info or "غير محدد",
        "location": body.location or "", "photo": body.photo, "created_at": now_utc(),
    }
    await db.attendance_logs.insert_one(log)
    update = {"last_checkin_date": today, "status": status, "last_activity": now_utc()}
    inc = {"total_deductions": deduction} if deduction else {}
    await db.users.update_one({"_id": user["_id"]}, {"$set": update, **({"$inc": inc} if inc else {})})
    device_label = body.device_info or "جهاز غير معروف"
    msg_text = (
        f"📱 تسجيل ذاتي: {user.get('name')} في {now_c.strftime('%H:%M')} | {device_label} | IP: {client_ip}"
        + (f" ⚠️ متأخر — خصم {deduction} ج.م" if is_late else " ✅ في الموعد")
    )
    await db.ai_alerts.insert_one({
        "company_id": user["company_id"], "user_id": user["_id"],
        "message": msg_text, "severity": "warning" if is_late else "info",
        "is_read": False, "created_at": now_utc(),
    })
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="self_checkin", ip=client_ip,
        message=f"تسجيل حضور ذاتي: {user.get('name')} في {now_c.strftime('%H:%M')}" + (" (متأخر)" if is_late else ""),
        details=f"الجهاز: {device_label} | الموقع: {body.location or 'غير محدد'}",
    )
    # Anomaly detection — same location/device mass check-in (section 2)
    _asyncio.create_task(detect_checkin_anomaly(user["company_id"], body.location or "", body.device_id or "", now_c))
    _asyncio.create_task(record_device_history(
        user["_id"], user["company_id"], body.device_id or "", body.device_info or "", client_ip, body.location or "",
        photo=body.photo, scan_type="checkin",
        network_name=body.network_name or "", network_type=body.network_type or "",
    ))
    return {"status": status, "check_time": now_c.strftime("%H:%M"), "is_late": is_late, "deduction": deduction}


@api.get("/me/employee-qr")
async def get_employee_qr(user: dict = Depends(get_current_user)):
    """Generate a fresh personal QR token for the employee. Requesting a new one immediately
    invalidates any previously-issued token for this employee (sequence-based, not just time-based),
    so an old QR shown on-screen stops working the moment a new one is generated."""
    if user.get("role") not in ("member",):
        raise HTTPException(status_code=403, detail="هذا الكود للموظفين فقط")
    import time, hmac as _hmac, hashlib
    updated = await db.users.find_one_and_update(
        {"_id": user["_id"]},
        {"$inc": {"qr_seq": 1}, "$set": {"qr_seq_issued_at": now_utc()}},
        return_document=True,
    )
    seq = updated.get("qr_seq", 1)
    raw = f"{user['_id']}:{seq}"
    token = _hmac.new(JWT_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()[:24]
    return {
        "token": token,
        "employee_id": str(user["_id"]),
        "employee_name": user.get("name", ""),
        "expires_in": 60,
    }


class EmployeeSelfCheckinInput(BaseModel):
    employee_id: str
    token: str
    photo: Optional[str] = None
    device_info: Optional[str] = ""
    device_id: Optional[str] = ""
    location: Optional[str] = ""
    network_name: Optional[str] = ""
    network_type: Optional[str] = ""


@api.post("/self-checkin")
async def employee_self_checkin_public(body: EmployeeSelfCheckinInput, request: Request):
    """Public endpoint — employee checks in using their personal HMAC QR token (no JWT needed)."""
    import time, hmac as _hmac, hashlib
    from bson import ObjectId

    # Validate employee_id format
    try:
        oid = ObjectId(body.employee_id)
    except Exception:
        raise HTTPException(status_code=400, detail="❌ رمز QR غير صالح")

    user = await db.users.find_one({"_id": oid})
    if not user or user.get("role") != "member":
        raise HTTPException(status_code=404, detail="❌ الموظف غير موجود")

    # Only the current sequence's token is valid — generating a new QR immediately invalidates the old one.
    seq = user.get("qr_seq", 0)
    issued_at = user.get("qr_seq_issued_at")
    valid = False
    if seq:
        raw = f"{body.employee_id}:{seq}"
        expected = _hmac.new(JWT_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()[:24]
        if _hmac.compare_digest(expected, body.token):
            if issued_at:
                # MongoDB may return naive datetimes — normalize to UTC-aware
                ia = issued_at.replace(tzinfo=timezone.utc) if issued_at.tzinfo is None else issued_at
                if (now_utc() - ia).total_seconds() <= 60:
                    valid = True

    if not valid:
        raise HTTPException(status_code=400, detail="❌ انتهت صلاحية رمز QR أو غير صالح — أعد تحميل الصفحة")

    today = cairo_now().date().isoformat()
    existing_log = await db.attendance_logs.find_one({
        "user_id": user["_id"],
        "log_date": today,
        "checkout_time": {"$exists": False}
    })

    if existing_log and not existing_log.get("checkout_time"):
        now_c = cairo_now()
        checkout_str = now_c.strftime("%H:%M")

        # Calculate worked hours
        check_time_str = existing_log.get("check_time", "09:00")
        try:
            ch_h, ch_m = map(int, check_time_str.split(":"))
            co_h, co_m = now_c.hour, now_c.minute
            worked_mins = (co_h * 60 + co_m) - (ch_h * 60 + ch_m)
            worked_hours = round(max(0, worked_mins) / 60, 2)
        except Exception:
            worked_hours = 0.0

        await db.attendance_logs.update_one(
            {"_id": existing_log["_id"]},
            {
                "$set": {
                    "checkout_time": checkout_str,
                    "worked_hours": worked_hours,
                    "checkout_date": today,
                    "status": "checked_out"
                }
            }
        )

        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"status": "off", "last_activity": now_utc()}}
        )

        return {"status": "off", "message": f"تم تسجيل الانصراف بنجاح - ساعات العمل: {worked_hours} ساعة"}
    
    # Cancel any accidental absence log before registering the real checkin
    await _reverse_absence_if_exists(user["_id"], today)

    await enforce_device_lock(user, body.device_id, body.device_info)

    company = await db.companies.find_one({"_id": user["company_id"]})
    if not company:
        raise HTTPException(status_code=404, detail="❌ الشركة غير موجودة")

    att = company.get("attendance", {})
    now_c = cairo_now()
    shift_name, shift = _get_active_shift(att, now_c)
    deadline_str = shift.get("check_in_deadline", att.get("check_in_deadline", "09:30"))
    try:
        hh, mm = [int(x) for x in deadline_str.split(":")]
    except Exception:
        hh, mm = 9, 30
    deadline = now_c.replace(hour=hh, minute=mm, second=0, microsecond=0)
    _s = company.get("settings", {})
    _grace = int(_s.get("grace_minutes", 0)) if _s.get("allow_late_check_grace") else 0
    effective_deadline = deadline + timedelta(minutes=_grace)
    is_late = now_c.replace(second=0, microsecond=0) > effective_deadline
    status = "late" if is_late else "present"
    deduction = shift.get("late_deduction", att.get("late_deduction", 50)) if is_late else 0

    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "غير معروف")
    log = {
        "company_id": user["company_id"], "user_id": user["_id"],
        "log_date": today, "type": status, "shift": shift_name, "deduction_amount": deduction,
        "check_time": now_c.strftime("%H:%M"), "method": "employee_qr",
        "ip_address": client_ip, "device_info": body.device_info or "غير محدد",
        "location": body.location or "", "photo": body.photo, "created_at": now_utc(),
    }
    await db.attendance_logs.insert_one(log)
    update = {"last_checkin_date": today, "status": status, "last_activity": now_utc()}
    inc = {"total_deductions": deduction} if deduction else {}
    await db.users.update_one({"_id": user["_id"]}, {"$set": update, **({"$inc": inc} if inc else {})})

    device_label = body.device_info or "جهاز غير معروف"
    msg_text = (
        f"📱 كيو آر شخصي: {user.get('name')} في {now_c.strftime('%H:%M')} | {device_label} | IP: {client_ip}"
        + (f" ⚠️ متأخر — خصم {deduction} ج.م" if is_late else " ✅ في الموعد")
    )
    await db.ai_alerts.insert_one({
        "company_id": user["company_id"], "user_id": user["_id"],
        "message": msg_text, "severity": "warning" if is_late else "info",
        "is_read": False, "created_at": now_utc(),
    })
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="employee_qr_checkin", ip=client_ip,
        message=f"حضور بكيو آر شخصي: {user.get('name')} في {now_c.strftime('%H:%M')}" + (" (متأخر)" if is_late else ""),
        details=f"الجهاز: {device_label} | الموقع: {body.location or 'غير محدد'}",
    )
    # Anomaly detection — same location/device mass check-in (section 2)
    _asyncio.create_task(detect_checkin_anomaly(user["company_id"], body.location or "", body.device_id or "", now_c))
    _asyncio.create_task(record_device_history(
        user["_id"], user["company_id"], body.device_id or "", body.device_info or "", client_ip, body.location or "",
        photo=body.photo, scan_type="checkin",
        network_name=body.network_name or "", network_type=body.network_type or "",
    ))
    # Fire automation rules if late
    if is_late:
        _asyncio.create_task(fire_automation(user["company_id"], "employee_late",
            {"employee_name": user.get("name",""), "check_time": now_c.strftime("%H:%M")}))
    return {"status": status, "check_time": now_c.strftime("%H:%M"), "is_late": is_late, "deduction": deduction}


@api.get("/attendance/qr-token")
async def get_qr_token(user: dict = Depends(require_manager)):
    company = await get_company(user)
    # Always generate a fresh token on request
    token = _secrets.token_urlsafe(32)
    await db.companies.update_one({"_id": company["_id"]}, {"$set": {"qr_token": token, "qr_token_issued_at": now_utc()}})
    return {"token": token, "company_id": str(company["_id"])}


@api.post("/attendance/qr-checkin")
async def qr_checkin(body: QRCheckinInput, request: Request, user: dict = Depends(get_current_user)):
    company = await get_company(user)
    stored_token = company.get("qr_token", "")

    # Validate token
    if not stored_token or body.token.strip() != stored_token.strip():
        raise HTTPException(status_code=400, detail="❌ رمز QR غير صالح أو منتهي الصلاحية. اطلب من المدير تجديد الكود")

    # Check token age (max 60 seconds)
    issued_at = company.get("qr_token_issued_at")
    if issued_at:
        age_seconds = (now_utc() - (issued_at if issued_at.tzinfo else issued_at.replace(tzinfo=timezone.utc))).total_seconds()
        if age_seconds > 60:
            raise HTTPException(status_code=400, detail="❌ انتهت صلاحية رمز QR. اطلب من المدير تجديد الكود")

    today = cairo_now().date().isoformat()
    # Double-check via attendance_logs (more reliable than user field)
    existing_log = await db.attendance_logs.find_one({
        "user_id": user["_id"],
        "log_date": today,
        "type": {"$in": ["present", "late"]},
    })
    if existing_log or user.get("last_checkin_date") == today:
        # Already checked in — if not yet checked out, treat this scan as checkout
        if existing_log and not existing_log.get("checkout_time"):
            client_ip_co = request.headers.get("X-Forwarded-For", request.client.host if request.client else "غير معروف")
            co_result = await do_checkout(user, CheckoutInput(), client_ip_co)
            return {**co_result, "action": "checkout"}
        return {"status": user.get("status"), "message": "سجّلت حضورك وانصرافك بالفعل اليوم", "already": True}

    # Cancel any accidental absence log before registering the real checkin
    await _reverse_absence_if_exists(user["_id"], today)

    await enforce_device_lock(user, body.device_id, body.device_info)

    att = company.get("attendance", {})
    now_c = cairo_now()
    shift_name, shift = _get_active_shift(att, now_c)
    deadline_str = shift.get("check_in_deadline", att.get("check_in_deadline", "09:30"))
    try:
        hh, mm = [int(x) for x in deadline_str.split(":")]
    except Exception:
        hh, mm = 9, 30
    deadline = now_c.replace(hour=hh, minute=mm, second=0, microsecond=0)
    _s = company.get("settings", {})
    _grace = int(_s.get("grace_minutes", 0)) if _s.get("allow_late_check_grace") else 0
    effective_deadline = deadline + timedelta(minutes=_grace)
    is_late = now_c.replace(second=0, microsecond=0) > effective_deadline
    status = "late" if is_late else "present"
    deduction = shift.get("late_deduction", att.get("late_deduction", 50)) if is_late else 0

    # Get client IP
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "غير معروف")

    log = {
        "company_id": user["company_id"],
        "user_id": user["_id"],
        "log_date": today,
        "type": status,
        "shift": shift_name,
        "deduction_amount": deduction,
        "check_time": now_c.strftime("%H:%M"),
        "method": "qr",
        "ip_address": client_ip,
        "device_info": body.device_info or "غير محدد",
        "location": body.location or "",
        "photo": body.photo,
        "created_at": now_utc(),
    }
    await db.attendance_logs.insert_one(log)
    update = {"last_checkin_date": today, "status": status, "last_activity": now_utc()}
    inc = {}
    if deduction:
        inc["total_deductions"] = deduction
    await db.users.update_one({"_id": user["_id"]}, {"$set": update, **({"$inc": inc} if inc else {})})

    # Rotate QR token after each successful scan
    new_token = _secrets.token_urlsafe(32)
    await db.companies.update_one({"_id": company["_id"]}, {"$set": {"qr_token": new_token, "qr_token_issued_at": now_utc()}})

    # Notify manager with detailed info
    device_label = body.device_info or "جهاز غير معروف"
    msg_text = (
        f"📱 تسجيل QR: {user.get('name')} في {now_c.strftime('%H:%M')} | {device_label} | IP: {client_ip}"
        + (f" ⚠️ متأخر — خصم {deduction} ج.م" if is_late else " ✅ في الموعد")
    )
    await db.ai_alerts.insert_one({
        "company_id": user["company_id"],
        "user_id": user["_id"],
        "message": msg_text,
        "severity": "warning" if is_late else "info",
        "is_read": False,
        "created_at": now_utc(),
    })

    await log_activity(
        company_id=user["company_id"],
        user_id=user["_id"],
        user_name=user.get("name", ""),
        action="qr_checkin",
        message=f"تسجيل حضور QR: {user.get('name')} في {now_c.strftime('%H:%M')}" + (" (متأخر)" if is_late else " (في الموعد)"),
        ip=client_ip,
        details=f"الجهاز: {device_label} | الموقع: {body.location or 'غير محدد'}",
    )
    _asyncio.create_task(detect_checkin_anomaly(user["company_id"], body.location or "", body.device_id or "", now_c))
    _asyncio.create_task(record_device_history(
        user["_id"], user["company_id"], body.device_id or "", body.device_info or "", client_ip, body.location or "",
        photo=body.photo, scan_type="checkin",
        network_name=body.network_name or "", network_type=body.network_type or "",
    ))
    return {
        "status": status,
        "message": "تم تسجيل حضورك بنجاح ✅" if not is_late else f"تم التسجيل متأخراً — خصم {deduction} ج.م ⚠️",
        "deduction": deduction,
        "check_time": now_c.strftime("%H:%M"),
        "date": today,
        "device": device_label,
        "ip": client_ip,
    }


# --------------------------------------------------------------------------------------
# Employee Live Monitoring (manager sees all employees live)
# --------------------------------------------------------------------------------------
@api.get("/monitor/live")
async def live_monitor(user: dict = Depends(require_manager)):
    crew = await db.users.find({"company_id": user["company_id"], "role": "member"}).to_list(500)
    today = cairo_now().date().isoformat()
    result = []
    for c in crew:
        logs = await db.attendance_logs.find({"user_id": c["_id"], "log_date": today}).sort("created_at", -1).to_list(5)
        today_log = logs[0] if logs else None
        att_logs_all = await db.attendance_logs.find({"user_id": c["_id"]}).to_list(60)
        present_days = sum(1 for l in att_logs_all if l["type"] in ("present", "late"))
        absent_days = sum(1 for l in att_logs_all if l["type"] == "absence")
        late_days = sum(1 for l in att_logs_all if l["type"] == "late")
        total_days = len(att_logs_all)
        rate = round((present_days / total_days) * 100) if total_days else 100

        la = c.get("last_activity")
        inactivity_min = 0
        if isinstance(la, datetime):
            la_utc = la if la.tzinfo else la.replace(tzinfo=timezone.utc)
            inactivity_min = max(0, int((now_utc() - la_utc).total_seconds() / 60))

        # Determine online status
        if inactivity_min < 5:
            online_status = "online"
        elif inactivity_min < 30:
            online_status = "idle"
        else:
            online_status = "offline"

        result.append({
            "id": str(c["_id"]),
            "name": c.get("name"),
            "job_title": c.get("job_title", ""),
            "avatar_url": c.get("avatar_url"),
            "is_active": c.get("is_active", True),
            "checked_in_today": c.get("last_checkin_date") == today,
            "check_time": today_log.get("check_time") if today_log else None,
            "attendance_type": today_log.get("type") if today_log else "absent",
            "check_device": today_log.get("device_info", "") if today_log else "",
            "check_ip": today_log.get("ip_address", "") if today_log else "",
            "check_location": today_log.get("location", "") if today_log else "",
            "last_activity": c.get("last_activity").isoformat() if isinstance(c.get("last_activity"), datetime) else c.get("last_activity"),
            "online_status": online_status,
            "inactivity_minutes": inactivity_min,
            "present_days": present_days,
            "absent_days": absent_days,
            "late_days": late_days,
            "commitment_rate": rate,
            "monthly_salary": c.get("monthly_salary", 0),
            "total_deductions": c.get("total_deductions", 0),
            "total_additions": c.get("total_additions", 0),
        })
    return result


# --------------------------------------------------------------------------------------
# Bank / Expense Records
# --------------------------------------------------------------------------------------
class BankRecordInput(BaseModel):
    record_type: str  # income | expense | advance | personal_expense
    amount: int
    description: str
    person_name: Optional[str] = ""
    company_name: Optional[str] = ""
    owner_name: Optional[str] = ""
    recipient_name: Optional[str] = ""
    record_date: Optional[str] = None
    note: Optional[str] = ""


@api.get("/bank")
async def list_bank(user: dict = Depends(require_manager)):
    records = await db.bank_records.find({"company_id": user["company_id"]}).sort("record_date", -1).to_list(500)
    return [{
        "id": str(r["_id"]),
        "record_type": r.get("record_type"),
        "amount": r.get("amount", 0),
        "description": r.get("description", ""),
        "person_name": r.get("person_name", ""),
        "company_name": r.get("company_name", ""),
        "owner_name": r.get("owner_name", ""),
        "recipient_name": r.get("recipient_name", ""),
        "record_date": r.get("record_date"),
        "note": r.get("note", ""),
        "added_by": r.get("added_by", ""),
        "created_at": r["created_at"].isoformat() if isinstance(r.get("created_at"), datetime) else r.get("created_at"),
    } for r in records]


@api.post("/bank")
async def add_bank_record(body: BankRecordInput, user: dict = Depends(require_manager)):
    doc = {
        "company_id": user["company_id"],
        "record_type": body.record_type,
        "amount": body.amount,
        "description": body.description,
        "person_name": body.person_name or "",
        "company_name": body.company_name or "",
        "owner_name": body.owner_name or "",
        "recipient_name": body.recipient_name or "",
        "record_date": body.record_date or cairo_now().date().isoformat(),
        "note": body.note or "",
        "added_by": user.get("name", ""),
        "created_at": now_utc(),
    }
    res = await db.bank_records.insert_one(doc)
    doc["_id"] = res.inserted_id
    doc["id"] = str(res.inserted_id)
    type_labels = {"income": "دخل", "expense": "مصروف", "advance": "عربون", "personal_expense": "مصروف شخصي"}
    await log_activity(
        company_id=user["company_id"],
        user_id=user["_id"],
        user_name=user.get("name", ""),
        action="bank",
        message=f"معاملة مالية ({type_labels.get(body.record_type, '')}): {body.description} — {body.amount:,} ج.م",
    )
    return doc


@api.delete("/bank/{rid}")
async def delete_bank_record(rid: str, user: dict = Depends(require_manager)):
    await db.bank_records.delete_one({"_id": safe_object_id(rid), "company_id": user["company_id"]})
    return {"ok": True}


@api.get("/bank/summary")
async def bank_summary(user: dict = Depends(require_manager)):
    records = await db.bank_records.find({"company_id": user["company_id"]}).to_list(1000)
    income = sum(r["amount"] for r in records if r.get("record_type") == "income")
    expense = sum(r["amount"] for r in records if r.get("record_type") == "expense")
    advance = sum(r["amount"] for r in records if r.get("record_type") == "advance")
    personal = sum(r["amount"] for r in records if r.get("record_type") == "personal_expense")
    return {
        "total_income": income,
        "total_expense": expense,
        "total_advance": advance,
        "total_personal": personal,
        "net_balance": income - expense - advance - personal,
        "total_records": len(records),
    }


# --------------------------------------------------------------------------------------
# Activity Log
# --------------------------------------------------------------------------------------
async def log_activity(company_id, user_id, user_name: str, action: str, message: str, ip: str = "", details: str = ""):
    """Insert an activity log entry with cryptographic hash-chaining (section 11-ح)."""
    import hashlib as _hashlib
    try:
        # Compute created_at ONCE so hash and stored value are identical
        ts = now_utc()
        ts_str = ts.isoformat()
        # Get previous entry's hash to form the chain
        prev = await db.activity_logs.find_one(
            {"company_id": company_id},
            sort=[("created_at", -1)],
        )
        prev_hash = prev.get("chain_hash", "GENESIS") if prev else "GENESIS"
        entry_data = f"{prev_hash}|{str(company_id)}|{action}|{message}|{ts_str}"
        chain_hash = _hashlib.sha256(entry_data.encode()).hexdigest()
        await db.activity_logs.insert_one({
            "company_id": company_id,
            "user_id": user_id,
            "user_name": user_name,
            "action": action,
            "message": message,
            "ip": ip,
            "details": details,
            "prev_hash": prev_hash,
            "chain_hash": chain_hash,
            "ts_str": ts_str,        # store exact string used for hashing
            "created_at": ts,
        })
    except Exception:
        pass


@api.get("/activity-log")
async def get_activity_log(user: dict = Depends(require_manager)):
    logs = await db.activity_logs.find(
        {"company_id": user["company_id"]}
    ).sort("created_at", -1).to_list(500)
    result = []
    for l in logs:
        result.append({
            "id": str(l["_id"]),
            "user_name": l.get("user_name", ""),
            "action": l.get("action", ""),
            "message": l.get("message", ""),
            "ip": l.get("ip", ""),
            "details": l.get("details", ""),
            "created_at": l.get("created_at").isoformat() if isinstance(l.get("created_at"), datetime) else l.get("created_at"),
        })
    return result


# --------------------------------------------------------------------------------------
# System-wide Broadcast (manager sends alert to all company users)
# --------------------------------------------------------------------------------------
class BroadcastInput(BaseModel):
    title: str
    body: str
    pinned: bool = True


@api.post("/announcements/broadcast")
async def broadcast_announcement(body: BroadcastInput, user: dict = Depends(require_manager)):
    doc = {
        "company_id": user["company_id"],
        "title": body.title[:120],
        "body": body.body[:500],
        "pinned": body.pinned,
        "author": user.get("name"),
        "broadcast": True,
        "created_at": now_utc(),
    }
    res = await db.announcements.insert_one(doc)
    await log_activity(
        company_id=user["company_id"],
        user_id=user["_id"],
        user_name=user.get("name", ""),
        action="broadcast",
        message=f"إعلان جديد: {body.title}",
        ip="",
        details=body.body[:100],
    )
    return {"id": str(res.inserted_id), "ok": True}


# --------------------------------------------------------------------------------------
# Reports — individual employee PDF data
# --------------------------------------------------------------------------------------
@api.get("/reports/employee/{employee_id}")
async def employee_report(employee_id: str, user: dict = Depends(require_manager)):
    employee = await db.users.find_one({"_id": safe_object_id(employee_id), "company_id": user["company_id"]})
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")

    logs = await db.attendance_logs.find({"user_id": employee["_id"]}).sort("created_at", -1).to_list(300)
    bank_recs = await db.bank_records.find({"company_id": user["company_id"]}).to_list(500)

    present = sum(1 for l in logs if l["type"] in ("present", "late"))
    late = sum(1 for l in logs if l["type"] == "late")
    absent = sum(1 for l in logs if l["type"] == "absence")
    total = len(logs)
    rate = round((present / total) * 100) if total else 100

    return {
        "employee": ser_user(employee),
        "stats": {
            "present_days": present,
            "late_days": late,
            "absent_days": absent,
            "total_days": total,
            "attendance_rate": rate,
        },
        "logs": [{
            "log_date": l.get("log_date"),
            "type": l.get("type"),
            "check_time": l.get("check_time", "—"),
            "deduction_amount": l.get("deduction_amount", 0),
            "method": l.get("method", "—"),
            "device_info": l.get("device_info", ""),
        } for l in logs[:100]],
        "generated_at": cairo_now().strftime("%Y-%m-%d %H:%M"),
    }


# --------------------------------------------------------------------------------------
# Startup
# --------------------------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index([("email", 1)], background=True)
        await db.users.create_index([("company_id", 1), ("username", 1)], background=True)
        await db.activity_logs.create_index([("company_id", 1), ("created_at", -1)], background=True)
        await db.announcements.create_index([("company_id", 1), ("pinned", -1), ("created_at", -1)], background=True)
        await db.ai_decision_log.create_index([("status", 1), ("expires_at", 1)], background=True)
        await db.temp_access.create_index([("expires_at", 1), ("revoked", 1)], background=True)
        await db.automation_rules.create_index([("company_id", 1), ("trigger", 1), ("is_active", 1)], background=True)
    except Exception as e:
        logger.error(f"Startup index creation warning: {e}")
    # Launch background workers
    _asyncio.create_task(_expire_ai_decisions())
    _asyncio.create_task(_expire_temp_access())
    logger.info("Itqan Void Edition backend started")


# --------------------------------------------------------------------------------------
# Security Middleware
# --------------------------------------------------------------------------------------
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=*, geolocation=*"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none';"
        )
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-site"
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────────────────
# Performance Center — Reviews / Goals / Skills
# ──────────────────────────────────────────────────────────────────────────────

@api.get("/performance/reviews")
async def get_perf_reviews(user: dict = Depends(require_manager)):
    items = await db.performance_reviews.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(500)
    return [{"id": str(i["_id"]), "employee_id": i.get("employee_id", ""), "period": i.get("period", ""),
             "overall_rating": i.get("overall_rating", 3), "attendance_rating": i.get("attendance_rating", 3),
             "performance_rating": i.get("performance_rating", 3), "teamwork_rating": i.get("teamwork_rating", 3),
             "notes": i.get("notes", ""), "recommendations": i.get("recommendations", ""),
             "created_at": i["created_at"].isoformat() if isinstance(i.get("created_at"), datetime) else ""} for i in items]

@api.post("/performance/reviews")
async def add_perf_review(req: Request, user: dict = Depends(require_manager)):
    body = await req.json()
    doc = {
        "company_id": user["company_id"],
        "employee_id": body.get("employee_id", ""),
        "period": body.get("period", ""),
        "overall_rating": int(body.get("overall_rating", 3)),
        "attendance_rating": int(body.get("attendance_rating", 3)),
        "performance_rating": int(body.get("performance_rating", 3)),
        "teamwork_rating": int(body.get("teamwork_rating", 3)),
        "notes": body.get("notes", ""),
        "recommendations": body.get("recommendations", ""),
        "created_at": now_utc(),
    }
    res = await db.performance_reviews.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return doc

@api.delete("/performance/reviews/{rid}")
async def delete_perf_review(rid: str, user: dict = Depends(require_manager)):
    await db.performance_reviews.delete_one({"_id": safe_object_id(rid), "company_id": user["company_id"]})
    return {"ok": True}

@api.get("/performance/goals")
async def get_perf_goals(user: dict = Depends(require_manager)):
    items = await db.performance_goals.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(500)
    return [{"id": str(i["_id"]), "employee_id": i.get("employee_id", ""), "title": i.get("title", ""),
             "description": i.get("description", ""), "deadline": i.get("deadline", ""),
             "priority": i.get("priority", "medium"), "status": i.get("status", "pending"),
             "created_at": i["created_at"].isoformat() if isinstance(i.get("created_at"), datetime) else ""} for i in items]

@api.post("/performance/goals")
async def add_perf_goal(req: Request, user: dict = Depends(require_manager)):
    body = await req.json()
    doc = {
        "company_id": user["company_id"],
        "employee_id": body.get("employee_id", ""),
        "title": body.get("title", ""),
        "description": body.get("description", ""),
        "deadline": body.get("deadline", ""),
        "priority": body.get("priority", "medium"),
        "status": "pending",
        "created_at": now_utc(),
    }
    res = await db.performance_goals.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return doc

@api.put("/performance/goals/{gid}")
async def update_perf_goal(gid: str, req: Request, user: dict = Depends(require_manager)):
    body = await req.json()
    allowed = {k: v for k, v in body.items() if k in ("status", "title", "description", "deadline", "priority")}
    if not allowed:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")
    await db.performance_goals.update_one(
        {"_id": safe_object_id(gid), "company_id": user["company_id"]},
        {"$set": allowed}
    )
    updated = await db.performance_goals.find_one({"_id": safe_object_id(gid)})
    if not updated:
        raise HTTPException(status_code=404, detail="الهدف غير موجود")
    return {"id": str(updated["_id"]), "employee_id": updated.get("employee_id", ""),
            "title": updated.get("title", ""), "description": updated.get("description", ""),
            "deadline": updated.get("deadline", ""), "priority": updated.get("priority", "medium"),
            "status": updated.get("status", "pending")}

@api.get("/performance/skills")
async def get_perf_skills(user: dict = Depends(require_manager)):
    items = await db.performance_skills.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(500)
    return [{"id": str(i["_id"]), "employee_id": i.get("employee_id", ""), "skill_name": i.get("skill_name", ""),
             "level": i.get("level", "متوسط"), "notes": i.get("notes", ""),
             "created_at": i["created_at"].isoformat() if isinstance(i.get("created_at"), datetime) else ""} for i in items]

@api.post("/performance/skills")
async def add_perf_skill(req: Request, user: dict = Depends(require_manager)):
    body = await req.json()
    doc = {
        "company_id": user["company_id"],
        "employee_id": body.get("employee_id", ""),
        "skill_name": body.get("skill_name", ""),
        "level": body.get("level", "متوسط"),
        "notes": body.get("notes", ""),
        "created_at": now_utc(),
    }
    res = await db.performance_skills.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return doc


@api.put("/performance/reviews/{rid}")
async def update_perf_review(rid: str, req: Request, user: dict = Depends(require_manager)):
    body = await req.json()
    allowed = {k: v for k, v in body.items() if k in (
        "period", "overall_rating", "attendance_rating", "performance_rating",
        "teamwork_rating", "notes", "recommendations"
    )}
    if not allowed:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")
    await db.performance_reviews.update_one(
        {"_id": safe_object_id(rid), "company_id": user["company_id"]},
        {"$set": allowed}
    )
    updated = await db.performance_reviews.find_one({"_id": safe_object_id(rid), "company_id": user["company_id"]})
    if not updated:
        raise HTTPException(status_code=404, detail="التقييم غير موجود")
    return {
        "id": str(updated["_id"]),
        "employee_id": updated.get("employee_id", ""),
        "period": updated.get("period", ""),
        "overall_rating": updated.get("overall_rating", 3),
        "attendance_rating": updated.get("attendance_rating", 3),
        "performance_rating": updated.get("performance_rating", 3),
        "teamwork_rating": updated.get("teamwork_rating", 3),
        "notes": updated.get("notes", ""),
        "recommendations": updated.get("recommendations", ""),
    }


@api.delete("/performance/skills/{sid}")
async def delete_perf_skill(sid: str, user: dict = Depends(require_manager)):
    await db.performance_skills.delete_one({"_id": safe_object_id(sid), "company_id": user["company_id"]})
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# Checkout (انهاء الدوام)
# ──────────────────────────────────────────────────────────────────────────────
class CheckoutInput(BaseModel):
    photo: Optional[str] = None
    location: Optional[str] = ""
    device_info: Optional[str] = ""
    device_id: Optional[str] = ""
    network_name: Optional[str] = ""
    network_type: Optional[str] = ""


async def do_checkout(user: dict, body: "CheckoutInput", client_ip: str, forced_by: dict = None) -> dict:
    """Shared checkout logic — used for self-checkout and manager-forced checkout."""
    today = cairo_now().date().isoformat()
    checkin_log = await db.attendance_logs.find_one({
        "user_id": user["_id"],
        "log_date": today,
        "type": {"$in": ["present", "late"]},
    })
    if not checkin_log:
        raise HTTPException(status_code=400, detail="لا يوجد تسجيل حضور اليوم")
    if checkin_log.get("checkout_time"):
        return {"message": "سجّلت انصرافك بالفعل اليوم", "already": True,
                "checkout_time": checkin_log.get("checkout_time")}

    now_c = cairo_now()
    checkout_time = now_c.strftime("%H:%M")

    worked_hours = None
    checkin_time_str = checkin_log.get("check_time")
    if checkin_time_str:
        try:
            ci_h, ci_m = [int(x) for x in checkin_time_str.split(":")]
            co_h, co_m = [int(x) for x in checkout_time.split(":")]
            worked_minutes = (co_h * 60 + co_m) - (ci_h * 60 + ci_m)
            worked_hours = round(max(0, worked_minutes) / 60, 2)
        except Exception:
            pass

    await db.attendance_logs.update_one(
        {"_id": checkin_log["_id"]},
        {"$set": {
            "checkout_time": checkout_time,
            "worked_hours": worked_hours,
            "checkout_photo": body.photo,
            "checkout_location": body.location or "",
            "checkout_ip_address": client_ip,
            "checkout_device_info": body.device_info or "",
            "checkout_forced_by": forced_by.get("name") if forced_by else None,
        }}
    )
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"status": "off", "last_activity": now_utc()}})
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="checkout", ip=client_ip,
        message=f"انصراف: {user.get('name')} في {checkout_time}" + (f" — {worked_hours} ساعة" if worked_hours else ""),
        details=f"الجهاز: {body.device_info or 'غير محدد'}",
    )
    _asyncio.create_task(record_device_history(
        user["_id"], user["company_id"], body.device_id or "", body.device_info or "", client_ip, body.location or "",
        photo=body.photo, scan_type="checkout",
        network_name=getattr(body, "network_name", "") or "",
        network_type=getattr(body, "network_type", "") or "",
    ))
    return {"checkout_time": checkout_time, "worked_hours": worked_hours, "message": "تم تسجيل الانصراف بنجاح"}


@api.post("/attendance/checkout")
async def checkout(body: CheckoutInput = CheckoutInput(), request: Request = None, user: dict = Depends(get_current_user)):
    """Employee self-checkout (end of shift), with face photo + device/IP capture."""
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request and request.client else "غير معروف") if request else "غير معروف"
    return await do_checkout(user, body, client_ip)


@api.post("/crew/{crew_id}/force-checkout")
async def force_checkout(crew_id: str, user: dict = Depends(require_module("crew"))):
    """Manager manually ends an employee's workday (force checkout) without needing the employee's phone."""
    target = await db.users.find_one({"_id": safe_object_id(crew_id), "company_id": user["company_id"], "role": "member"})
    if not target:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    result = await do_checkout(target, CheckoutInput(), "—", forced_by=user)
    await log_activity(company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
                        action="force_checkout",
                        message=f"المدير {user.get('name')} أنهى يوم عمل {target.get('name')} يدوياً")
    return result


@api.post("/crew/{crew_id}/force-checkin")
async def force_checkin(crew_id: str, user: dict = Depends(require_module("crew"))):
    """Manager manually marks an employee present for today (e.g. forgot to scan QR) — keeps them 'موجود' as normal."""
    target = await db.users.find_one({"_id": safe_object_id(crew_id), "company_id": user["company_id"], "role": "member"})
    if not target:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    today = cairo_now().date().isoformat()
    existing_log = await db.attendance_logs.find_one({
        "user_id": target["_id"], "log_date": today, "type": {"$in": ["present", "late"]},
    })
    if existing_log:
        return {"status": target.get("status"), "message": "الموظف مسجّل حضوره بالفعل اليوم", "already": True}
    now_c = cairo_now()
    log = {
        "company_id": user["company_id"], "user_id": target["_id"],
        "log_date": today, "type": "present", "deduction_amount": 0,
        "check_time": now_c.strftime("%H:%M"), "method": "manager_forced",
        "ip_address": "—", "device_info": f"سجّله المدير {user.get('name','')}",
        "location": "", "photo": None, "created_at": now_utc(),
    }
    await db.attendance_logs.insert_one(log)
    await db.users.update_one({"_id": target["_id"]}, {"$set": {
        "last_checkin_date": today, "status": "present", "last_activity": now_utc(),
    }})
    await log_activity(company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
                        action="force_checkin",
                        message=f"المدير {user.get('name')} سجّل حضور {target.get('name')} يدوياً")
    return {"status": "present", "check_time": now_c.strftime("%H:%M"), "message": "تم تسجيل حضور الموظف"}


# ──────────────────────────────────────────────────────────────────────────────
# Industry / Sector Selection (اختيار القطاع)
# ──────────────────────────────────────────────────────────────────────────────
INDUSTRY_PACKS = [
    {"id": "photography", "label": "شركات التصوير والإنتاج الإعلاني", "icon": "📸",
     "custom_fields": ["الموقع", "المعدات", "اسم العميل", "حالة التسليم"]},
    {"id": "advertising", "label": "وكالات الإعلانات والتسويق", "icon": "📢",
     "custom_fields": ["اسم الحساب", "الميزانية", "تاريخ الإطلاق"]},
    {"id": "beauty", "label": "صالونات ومراكز التجميل والعناية", "icon": "💇",
     "custom_fields": ["نوع الخدمة", "اسم العميل", "موعد الحجز"]},
    {"id": "pharma", "label": "شركات الأدوية والقطاع الصحي", "icon": "💊",
     "custom_fields": ["رقم الدُفعة", "تاريخ الصلاحية", "المورد"]},
    {"id": "retail", "label": "شركات التجارة والبيع بالتجزئة", "icon": "🛍️",
     "custom_fields": ["المنتج", "الكمية", "المخزون"]},
    {"id": "restaurant", "label": "قطاع المطاعم والضيافة", "icon": "🍽️",
     "custom_fields": ["الطاولة", "الطلب", "وقت التقديم"]},
    {"id": "construction", "label": "شركات المقاولات والإنشاءات", "icon": "🏗️",
     "custom_fields": ["الموقع", "المرحلة", "المقاول الفرعي"]},
    {"id": "tech", "label": "شركات التكنولوجيا والبرمجيات", "icon": "💻",
     "custom_fields": ["المشروع", "Sprint", "المستودع"]},
    {"id": "education", "label": "مراكز التعليم والتدريب", "icon": "🎓",
     "custom_fields": ["الكورس", "المجموعة", "تاريخ التقييم"]},
    {"id": "general", "label": "أخرى — قالب عام قابل للتخصيص", "icon": "✏️",
     "custom_fields": []},
]

# ──────────────────────────────────────────────────────────────────────────────
# AI Governance — Autonomy Settings & Approval Queue (بند 24)
# ──────────────────────────────────────────────────────────────────────────────
AI_CAPABILITY_KEYS = [
    "shift_scheduling", "account_freeze", "automation_rules",
    "client_responses", "workload_rebalance", "security_actions",
]

@api.get("/ai/autonomy-settings")
async def get_ai_autonomy(user: dict = Depends(require_manager)):
    settings = await db.ai_autonomy_settings.find({"company_id": user["company_id"]}).to_list(20)
    defaults = {k: {"mode": "suggest_only", "confidence_threshold": 0.85} for k in AI_CAPABILITY_KEYS}
    for s in settings:
        key = s.get("capability_key")
        if key in defaults:
            defaults[key] = {"mode": s.get("mode", "suggest_only"),
                             "confidence_threshold": s.get("confidence_threshold", 0.85)}
    return {"settings": defaults}

@api.put("/ai/autonomy-settings")
async def update_ai_autonomy(req: Request, user: dict = Depends(require_manager)):
    body = await req.json()  # {capability_key: str, mode: str, confidence_threshold: float}
    key = body.get("capability_key")
    mode = body.get("mode", "suggest_only")
    try:
        threshold = float(body.get("confidence_threshold", 0.85))
        if not (0.0 <= threshold <= 1.0):
            raise ValueError()
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="نسبة الثقة يجب أن تكون بين 0 و 1")
    if key not in AI_CAPABILITY_KEYS:
        raise HTTPException(status_code=400, detail="مفتاح قدرة غير معروف")
    if mode not in ("auto", "suggest_only"):
        raise HTTPException(status_code=400, detail="الوضع يجب أن يكون auto أو suggest_only")
    await db.ai_autonomy_settings.update_one(
        {"company_id": user["company_id"], "capability_key": key},
        {"$set": {"mode": mode, "confidence_threshold": threshold, "updated_at": now_utc(),
                  "updated_by": user.get("name", "")}},
        upsert=True,
    )
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="ai_autonomy_update",
        message=f"تغيير وضع الذكاء [{key}] إلى: {mode} (ثقة {int(threshold*100)}%)",
    )
    return {"ok": True}

@api.get("/ai/approval-queue")
async def get_ai_queue(user: dict = Depends(require_manager)):
    items = await db.ai_decision_log.find({
        "company_id": user["company_id"], "status": "pending"
    }).sort("created_at", -1).to_list(100)
    return [{"id": str(i["_id"]), "ai_module": i.get("ai_module", ""),
             "suggested_action": i.get("suggested_action", ""),
             "confidence_score": i.get("confidence_score", 0),
             "reason": i.get("reason", ""),
             "status": i.get("status", "pending"),
             "created_at": i["created_at"].isoformat() if isinstance(i.get("created_at"), datetime) else ""
             } for i in items]

class AIDecisionBody(BaseModel):
    decision: str  # "approved" | "rejected"
    note: Optional[str] = ""

@api.post("/ai/approval-queue/{did}/decide")
async def decide_ai_action(did: str, body: AIDecisionBody, user: dict = Depends(require_manager)):
    item = await db.ai_decision_log.find_one({"_id": safe_object_id(did), "company_id": user["company_id"]})
    if not item:
        raise HTTPException(status_code=404, detail="القرار غير موجود")
    if item.get("status") != "pending":
        raise HTTPException(status_code=400, detail="تم البت في هذا القرار مسبقاً")
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="القرار يجب أن يكون approved أو rejected")
    await db.ai_decision_log.update_one(
        {"_id": safe_object_id(did)},
        {"$set": {"status": body.decision, "approved_by": user.get("name", ""),
                  "note": body.note or "", "decided_at": now_utc()}}
    )
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action=f"ai_decision_{body.decision}",
        message=f"{'موافقة' if body.decision == 'approved' else 'رفض'} قرار AI: {item.get('suggested_action', '')}",
    )
    return {"ok": True}

# Helper to create an AI decision proposal (used internally by AI engine)
async def propose_ai_action(company_id, ai_module: str, suggested_action: str,
                             confidence: float, reason: str):
    await db.ai_decision_log.insert_one({
        "company_id": company_id,
        "ai_module": ai_module,
        "suggested_action": suggested_action,
        "confidence_score": confidence,
        "reason": reason,
        "status": "pending",
        "approved_by": None,
        "decided_at": None,
        "expires_at": now_utc() + timedelta(hours=48),   # auto-expire fail-safe
        "created_at": now_utc(),
    })


# ──────────────────────────────────────────────────────────────────────────────
# Audit Log — Hash-Chain Verification (بند 11-ح)
# ──────────────────────────────────────────────────────────────────────────────
@api.get("/activity-log/verify-chain")
async def verify_audit_chain(user: dict = Depends(require_manager)):
    """Verify the cryptographic hash chain of audit logs. Returns broken entries."""
    import hashlib as _hashlib
    logs = await db.activity_logs.find(
        {"company_id": user["company_id"]}
    ).sort("created_at", 1).to_list(2000)

    broken = []
    for i, log in enumerate(logs):
        prev_hash = log.get("prev_hash", "GENESIS")
        stored_hash = log.get("chain_hash")
        ts_str = log.get("ts_str")
        if not stored_hash or not ts_str:
            continue  # old entry before chaining was enabled — skip
        entry_data = f"{prev_hash}|{str(log['company_id'])}|{log.get('action','')}|{log.get('message','')}|{ts_str}"
        expected = _hashlib.sha256(entry_data.encode()).hexdigest()
        if expected != stored_hash:
            broken.append({"id": str(log["_id"]), "action": log.get("action"), "created_at": str(log.get("created_at"))})

    return {"total_checked": sum(1 for l in logs if l.get("chain_hash")),
            "broken_count": len(broken),
            "chain_intact": len(broken) == 0,
            "broken_entries": broken[:20]}


# ──────────────────────────────────────────────────────────────────────────────
# Workflow Automation Engine — CRUD (بند 16)
# ──────────────────────────────────────────────────────────────────────────────
AUTOMATION_TRIGGERS = [
    "employee_late", "employee_absent", "loan_approved", "leave_approved",
    "project_completed", "low_balance", "checkin_anomaly", "new_employee",
]
AUTOMATION_ACTIONS = [
    "notify_manager", "notify_employee", "create_alert", "log_activity",
    "freeze_account", "send_message",
]

class AutomationRuleInput(BaseModel):
    name: str
    trigger: str          # e.g. "employee_late"
    condition: Optional[dict] = {}   # e.g. {"threshold": 3}
    action: str           # e.g. "notify_manager"
    action_params: Optional[dict] = {}  # e.g. {"message": "..."}
    is_active: Optional[bool] = True
    mode: Optional[str] = "suggest_only"   # "auto" | "suggest_only"

@api.get("/automation/rules")
async def list_automation_rules(user: dict = Depends(require_manager)):
    rules = await db.automation_rules.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(200)
    return [{"id": str(r["_id"]), "name": r.get("name",""), "trigger": r.get("trigger",""),
             "condition": r.get("condition",{}), "action": r.get("action",""),
             "action_params": r.get("action_params",{}), "is_active": r.get("is_active", True),
             "mode": r.get("mode","suggest_only"), "run_count": r.get("run_count",0),
             "last_run": r["last_run"].isoformat() if isinstance(r.get("last_run"), datetime) else r.get("last_run"),
             "created_at": r["created_at"].isoformat() if isinstance(r.get("created_at"), datetime) else ""
             } for r in rules]

@api.post("/automation/rules")
async def create_automation_rule(body: AutomationRuleInput, user: dict = Depends(require_manager)):
    if body.trigger not in AUTOMATION_TRIGGERS:
        raise HTTPException(status_code=400, detail=f"حدث غير مدعوم. المتاح: {', '.join(AUTOMATION_TRIGGERS)}")
    if body.action not in AUTOMATION_ACTIONS:
        raise HTTPException(status_code=400, detail=f"إجراء غير مدعوم. المتاح: {', '.join(AUTOMATION_ACTIONS)}")
    doc = {
        "company_id": user["company_id"],
        "name": body.name.strip(),
        "trigger": body.trigger,
        "condition": body.condition or {},
        "action": body.action,
        "action_params": body.action_params or {},
        "is_active": body.is_active,
        "mode": body.mode if body.mode in ("auto","suggest_only") else "suggest_only",
        "run_count": 0,
        "last_run": None,
        "created_by": user.get("name",""),
        "created_at": now_utc(),
    }
    res = await db.automation_rules.insert_one(doc)
    await log_activity(company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name",""),
                       action="automation_rule_created", message=f"قاعدة أتمتة جديدة: {body.name} ({body.trigger} → {body.action})")
    return {"id": str(res.inserted_id), **{k: v for k, v in doc.items() if k != "_id"}}

@api.put("/automation/rules/{rid}")
async def update_automation_rule(rid: str, body: AutomationRuleInput, user: dict = Depends(require_manager)):
    await db.automation_rules.update_one(
        {"_id": safe_object_id(rid), "company_id": user["company_id"]},
        {"$set": {"name": body.name, "trigger": body.trigger, "condition": body.condition or {},
                  "action": body.action, "action_params": body.action_params or {},
                  "is_active": body.is_active,
                  "mode": body.mode if body.mode in ("auto","suggest_only") else "suggest_only"}}
    )
    return {"ok": True}

@api.delete("/automation/rules/{rid}")
async def delete_automation_rule(rid: str, user: dict = Depends(require_manager)):
    await db.automation_rules.delete_one({"_id": safe_object_id(rid), "company_id": user["company_id"]})
    return {"ok": True}

@api.post("/automation/rules/{rid}/toggle")
async def toggle_automation_rule(rid: str, user: dict = Depends(require_manager)):
    rule = await db.automation_rules.find_one({"_id": safe_object_id(rid), "company_id": user["company_id"]})
    if not rule:
        raise HTTPException(status_code=404, detail="القاعدة غير موجودة")
    new_state = not rule.get("is_active", True)
    await db.automation_rules.update_one({"_id": safe_object_id(rid)}, {"$set": {"is_active": new_state}})
    return {"is_active": new_state}

@api.get("/automation/triggers")
async def list_automation_triggers(user: dict = Depends(require_manager)):
    return {"triggers": AUTOMATION_TRIGGERS, "actions": AUTOMATION_ACTIONS}

# Internal: execute automation rules for a given trigger
async def fire_automation(company_id, trigger: str, context: dict):
    """Fire all active automation rules matching the trigger."""
    rules = await db.automation_rules.find({
        "company_id": company_id, "trigger": trigger, "is_active": True
    }).to_list(50)
    for rule in rules:
        try:
            action = rule.get("action")
            params = rule.get("action_params", {})
            mode = rule.get("mode", "suggest_only")
            if mode == "suggest_only":
                # Queue as AI proposal for human approval
                await propose_ai_action(
                    company_id=company_id,
                    ai_module="automation_engine",
                    suggested_action=f"{rule.get('name')}: {action}",
                    confidence=0.95,
                    reason=f"قاعدة الأتمتة '{rule.get('name')}' انطلقت بسبب: {trigger} | السياق: {str(context)[:200]}",
                )
            else:
                # Auto-execute
                if action == "create_alert":
                    await db.ai_alerts.insert_one({
                        "company_id": company_id,
                        "message": params.get("message", f"أتمتة: {trigger}"),
                        "severity": params.get("severity", "info"),
                        "is_read": False, "created_at": now_utc(),
                    })
                elif action == "log_activity":
                    await log_activity(company_id=company_id, user_id=None, user_name="نظام الأتمتة",
                                       action=f"auto_{trigger}", message=params.get("message", f"تنفيذ تلقائي: {trigger}"))
            await db.automation_rules.update_one(
                {"_id": rule["_id"]}, {"$inc": {"run_count": 1}, "$set": {"last_run": now_utc()}}
            )
        except Exception:
            pass


# ──────────────────────────────────────────────────────────────────────────────
# Workload Balance Index (بند 22)
# ──────────────────────────────────────────────────────────────────────────────
@api.get("/analytics/workload-balance")
async def workload_balance(user: dict = Depends(require_manager)):
    """Compare task/attendance load across employees to detect imbalance."""
    today = cairo_now().date()
    month_start = today.replace(day=1).isoformat()
    employees = await db.users.find({"company_id": user["company_id"], "role": "member", "is_active": True}).to_list(200)
    if not employees:
        return {"employees": [], "imbalance_detected": False}

    result = []
    for emp in employees:
        att_count = await db.attendance_logs.count_documents({
            "user_id": emp["_id"], "log_date": {"$gte": month_start}, "type": {"$in": ["present","late"]}
        })
        tx_count = await db.transactions.count_documents({"$or": [{"user_id": emp["_id"]},{"crew_id": emp["_id"]}]})
        loans_count = await db.loans.count_documents({"employee_id": emp["_id"], "status": "approved"})
        leaves_count = await db.leaves.count_documents({"user_id": emp["_id"], "status": "approved"})
        result.append({
            "employee_id": str(emp["_id"]),
            "employee_name": emp.get("name",""),
            "job_title": emp.get("job_title",""),
            "attendance_days": att_count,
            "transactions_count": tx_count,
            "active_loans": loans_count,
            "leaves_taken": leaves_count,
            "workload_score": att_count * 2 + tx_count + loans_count,
        })

    if not result:
        return {"employees": result, "imbalance_detected": False}

    scores = [r["workload_score"] for r in result]
    avg = sum(scores) / len(scores)
    max_score = max(scores)
    min_score = min(scores)
    imbalance = (max_score - min_score) > avg * 0.5 and len(scores) > 1

    # Sort by workload descending
    result.sort(key=lambda x: x["workload_score"], reverse=True)
    return {
        "employees": result,
        "avg_workload": round(avg, 1),
        "max_workload": max_score,
        "min_workload": min_score,
        "imbalance_detected": imbalance,
        "recommendation": "يُنصح بإعادة توزيع المهام — تفاوت كبير في الحمل الوظيفي" if imbalance else "توزيع متوازن",
    }


# ──────────────────────────────────────────────────────────────────────────────
# Data Portability + Right to be Forgotten (بند 17)
# ──────────────────────────────────────────────────────────────────────────────
@api.get("/data/export")
async def export_company_data(user: dict = Depends(require_manager)):
    """Export all company data as structured JSON (Data Portability - GDPR)."""
    cid = user["company_id"]
    company = await get_company(user)
    employees = await db.users.find({"company_id": cid}).to_list(1000)
    att_logs = await db.attendance_logs.find({"company_id": cid}).to_list(5000)
    transactions = await db.transactions.find({"company_id": cid}).to_list(2000)
    loans = await db.loans.find({"company_id": cid}).to_list(1000)
    leaves = await db.leaves.find({"company_id": cid}).to_list(1000)
    bank = await db.bank_records.find({"company_id": cid}).to_list(2000)

    def to_str(v):
        if isinstance(v, datetime): return v.isoformat()
        from bson import ObjectId as _OId
        if isinstance(v, _OId): return str(v)
        if isinstance(v, dict): return {k2: to_str(v2) for k2, v2 in v.items()}
        if isinstance(v, list): return [to_str(i) for i in v]
        return v

    def clean(doc):
        out = {}
        for k, v in doc.items():
            if k == "_id": out["id"] = str(v)
            elif k not in ("password_hash", "hashed_password"): out[k] = to_str(v)
        return out

    payload = {
        "exported_at": now_utc().isoformat(),
        "company": clean(company),
        "employees": [clean(e) for e in employees],
        "attendance_logs": [clean(l) for l in att_logs],
        "transactions": [clean(t) for t in transactions],
        "loans": [clean(l) for l in loans],
        "leaves": [clean(l) for l in leaves],
        "bank_records": [clean(b) for b in bank],
    }
    await log_activity(company_id=cid, user_id=user["_id"], user_name=user.get("name",""),
                       action="data_export", message="تصدير بيانات الشركة الكاملة (حق نقل البيانات)")
    from fastapi.responses import JSONResponse
    return JSONResponse(content=payload, headers={
        "Content-Disposition": f"attachment; filename=etqan-export-{today_cairo()}.json"
    })

def today_cairo():
    return cairo_now().date().isoformat()

@api.delete("/data/forget-employee/{employee_id}")
async def forget_employee(employee_id: str, user: dict = Depends(require_manager)):
    """Right to be Forgotten — anonymize employee PII while retaining aggregate records."""
    emp = await db.users.find_one({"_id": safe_object_id(employee_id), "company_id": user["company_id"]})
    if not emp:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    anon_name = f"موظف-محذوف-{str(emp['_id'])[-6:]}"
    # Anonymize PII but keep aggregate data intact
    await db.users.update_one({"_id": emp["_id"]}, {"$set": {
        "name": anon_name, "email": f"deleted-{str(emp['_id'])}@anon.local",
        "phone": "", "avatar_url": None, "username": f"deleted-{str(emp['_id'])[-8:]}",
        "is_active": False, "forgotten_at": now_utc(),
    }})
    await log_activity(company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name",""),
                       action="right_to_forget", message=f"إخفاء هوية موظف (حق النسيان): {emp.get('name','')}")
    return {"ok": True, "anonymized_name": anon_name}


# ──────────────────────────────────────────────────────────────────────────────
# Temporary Access Grants (بند 7 — صلاحيات مؤقتة)
# ──────────────────────────────────────────────────────────────────────────────
class TempAccessInput(BaseModel):
    employee_id: str
    elevated_role: str   # "co_manager" | "viewer"
    duration_hours: int  # 1 – 720
    reason: str
    allowed_modules: Optional[list] = None  # None = full access; [] = no access; [...] = only those modules

@api.get("/temp-access")
async def list_temp_access(user: dict = Depends(require_company_feature_manager("temp_access"))):
    grants = await db.temp_access.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(100)
    now = now_utc()
    return [{"id": str(g["_id"]), "employee_id": str(g.get("employee_id","")),
             "employee_name": g.get("employee_name",""), "elevated_role": g.get("elevated_role",""),
             "reason": g.get("reason",""), "granted_by": g.get("granted_by",""),
             "allowed_modules": g.get("allowed_modules"),
             "expires_at": g["expires_at"].isoformat() if isinstance(g.get("expires_at"), datetime) else "",
             "is_expired": g.get("expires_at", now) < now,
             "created_at": g["created_at"].isoformat() if isinstance(g.get("created_at"), datetime) else ""
             } for g in grants]

@api.post("/temp-access")
async def grant_temp_access(body: TempAccessInput, user: dict = Depends(require_company_feature_manager("temp_access"))):
    if body.elevated_role not in ("co_manager",):
        raise HTTPException(status_code=400, detail="الدور المؤقت يجب أن يكون co_manager")
    if not (1 <= body.duration_hours <= 720):
        raise HTTPException(status_code=400, detail="المدة يجب أن تكون بين 1 و 720 ساعة")
    if body.allowed_modules is not None:
        invalid = [m for m in body.allowed_modules if m not in MANAGER_MODULES]
        if invalid:
            raise HTTPException(status_code=400, detail=f"أقسام غير معروفة: {', '.join(invalid)}")
    emp = await db.users.find_one({"_id": safe_object_id(body.employee_id), "company_id": user["company_id"]})
    if not emp:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    expires_at = now_utc() + timedelta(hours=body.duration_hours)
    doc = {
        "company_id": user["company_id"],
        "employee_id": emp["_id"],
        "employee_name": emp.get("name",""),
        "original_role": emp.get("role","member"),
        "original_allowed_modules": emp.get("allowed_modules"),
        "elevated_role": body.elevated_role,
        "allowed_modules": body.allowed_modules,
        "reason": body.reason,
        "granted_by": user.get("name",""),
        "expires_at": expires_at,
        "revoked": False,
        "created_at": now_utc(),
    }
    res = await db.temp_access.insert_one(doc)
    # Apply elevated role + scoped permissions temporarily
    await db.users.update_one(
        {"_id": emp["_id"]},
{"$set": {"allowed_modules": body.allowed_modules, "temp_access_id": str(res.inserted_id)}},    )
    scope_msg = (
        "كل الصلاحيات" if body.allowed_modules is None
        else "بدون صلاحيات إضافية" if not body.allowed_modules
        else "، ".join(MANAGER_MODULES.get(m, m) for m in body.allowed_modules)
    )
    await log_activity(company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name",""),
                       action="temp_access_granted",
                       message=f"صلاحية مؤقتة [{body.elevated_role}] لـ {emp.get('name','')} لمدة {body.duration_hours}ساعة — النطاق: {scope_msg}")
    return {"id": str(res.inserted_id), "expires_at": expires_at.isoformat()}

@api.delete("/temp-access/{gid}/revoke")
async def revoke_temp_access(gid: str, user: dict = Depends(require_company_feature_manager("temp_access"))):
    grant = await db.temp_access.find_one({"_id": safe_object_id(gid), "company_id": user["company_id"]})
    if not grant:
        raise HTTPException(status_code=404, detail="المنح غير موجود")
    await db.temp_access.update_one({"_id": safe_object_id(gid)}, {"$set": {"revoked": True}})
    # Restore original role + permissions
    await db.users.update_one({"_id": grant["employee_id"]},
        {"$set": {"role": grant.get("original_role","member"), "allowed_modules": grant.get("original_allowed_modules")},
         "$unset": {"temp_access_id": ""}})
    await log_activity(company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name",""),
                       action="temp_access_revoked",
                       message=f"إلغاء صلاحية مؤقتة لـ {grant.get('employee_name','')}")
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# Same-Location Anomaly Detection (بند 2)
# ──────────────────────────────────────────────────────────────────────────────
async def detect_checkin_anomaly(company_id, location: str, device_id: str, checkin_time: datetime):
    """Detect if multiple employees checked in from same location/device within 5 minutes."""
    if not location and not device_id:
        return
    window_start = checkin_time - timedelta(minutes=5)
    query = {"company_id": company_id, "created_at": {"$gte": window_start}}
    if location:
        query["location"] = location
    elif device_id:
        query["device_info"] = device_id

    recent = await db.attendance_logs.count_documents(query)
    if recent >= 3:
        await db.security_events.insert_one({
            "company_id": company_id,
            "event_type": "mass_checkin_anomaly",
            "severity": "high",
            "user_name": "نظام الكشف",
            "message": f"⚠️ كشف شبهة: {recent} موظفين سجّلوا حضورهم من نفس الموقع/الجهاز خلال 5 دقائق",
            "ip": location or device_id,
            "is_resolved": False,
            "created_at": now_utc(),
        })
        await db.ai_alerts.insert_one({
            "company_id": company_id,
            "message": f"🚨 تنبيه أمني: {recent} موظفين من نفس الموقع/الجهاز في 5 دقائق — راجع سجل الأمان",
            "severity": "critical",
            "is_read": False,
            "created_at": now_utc(),
        })
        await fire_automation(company_id, "checkin_anomaly",
                              {"location": location, "device_id": device_id, "count": recent})


# ──────────────────────────────────────────────────────────────────────────────
# Per-Employee Device & IP Tracking (بند 2 — تتبع الجهاز والـIP)
# ──────────────────────────────────────────────────────────────────────────────
async def record_device_history(user_id, company_id, device_id: str, device_info: str, ip_address: str, location: str, photo: str = None, scan_type: str = "checkin", network_name: str = "", network_type: str = "") -> dict:
    """Record every check-in device/IP and flag suspicious patterns:
    1) same device shared by another employee, 2) a device new to this employee,
    3) an IP outside the employee's usual range. Notifies the manager on any flag.
    """
    suspicious_flags = []
    severity = "normal"

    if device_id:
        shared = await db.device_history.find_one({
            "company_id": company_id, "device_id": device_id, "user_id": {"$ne": user_id},
        })
        if shared:
            suspicious_flags.append({
                "type": "shared_device", "label": "جهاز مشترك",
                "detail": "هذا الجهاز مستخدم من موظف آخر أيضاً", "severity": "high",
            })
            severity = "high"

        has_any_history = await db.device_history.find_one({"user_id": user_id})
        known_device = await db.device_history.find_one({"user_id": user_id, "device_id": device_id})
        if has_any_history and not known_device:
            suspicious_flags.append({
                "type": "unusual_device", "label": "جهاز جديد",
                "detail": "أول مرة يسجّل هذا الموظف الحضور من هذا الجهاز", "severity": "medium",
            })
            if severity == "normal":
                severity = "medium"

    if ip_address and ip_address != "غير معروف":
        usual_ips = await db.device_history.distinct("ip_address", {"user_id": user_id})
        usual_prefixes = {".".join(ip.split(".")[:2]) for ip in usual_ips if ip and ip.count(".") == 3}
        current_prefix = ".".join(ip_address.split(".")[:2]) if ip_address.count(".") == 3 else ""
        if usual_prefixes and current_prefix and current_prefix not in usual_prefixes:
            suspicious_flags.append({
                "type": "unusual_ip", "label": "IP غير معتاد",
                "detail": f"عنوان الشبكة مختلف عن المعتاد لهذا الموظف", "severity": "medium",
            })
            if severity == "normal":
                severity = "medium"

    # Detect network changes compared to last known check-in
    if network_name:
        last_entry = await db.device_history.find_one(
            {"user_id": user_id, "network_name": {"$nin": ["", None]}},
            sort=[("created_at", -1)],
        )
        if last_entry and last_entry.get("network_name") and last_entry["network_name"] != network_name:
            suspicious_flags.append({
                "type": "network_change",
                "label": "شبكة جديدة",
                "detail": f"الشبكة تغيّرت من «{last_entry['network_name']}» إلى «{network_name}»",
                "severity": "medium",
            })
            if severity == "normal":
                severity = "medium"

    entry = {
        "user_id": user_id, "company_id": company_id,
        "device_id": device_id or "", "device_info": device_info or "غير محدد",
        "ip_address": ip_address or "غير معروف", "location": location or "",
        "network_name": network_name or "", "network_type": network_type or "",
        "photo": photo, "scan_type": scan_type,
        "suspicious_flags": suspicious_flags, "severity": severity,
        "is_suspicious": len(suspicious_flags) > 0, "is_resolved": False,
        "created_at": now_utc(),
    }
    result = await db.device_history.insert_one(entry)
    entry["_id"] = result.inserted_id

    if suspicious_flags:
        user_doc = await db.users.find_one({"_id": user_id})
        emp_name = user_doc.get("name", "موظف") if user_doc else "موظف"
        labels = "، ".join(f["label"] for f in suspicious_flags)

        # Alert
        await db.ai_alerts.insert_one({
            "company_id": company_id, "user_id": user_id,
            "message": f"⚠️ نشاط مشبوه عند حضور {emp_name}: {labels}",
            "severity": "critical" if severity == "high" else "warning",
            "is_read": False, "created_at": now_utc(),
        })

        # Pending approval so manager can approve / reject the device change
        # Determine which flags need manager action
        actionable_types = {"shared_device", "unusual_device", "network_change"}
        if any(f["type"] in actionable_types for f in suspicious_flags):
            registered_label = user_doc.get("registered_device_label", "جهاز مسجل مسبقاً") if user_doc else "جهاز مسجل مسبقاً"
            flags_detail = "، ".join(f["detail"] for f in suspicious_flags if f["type"] in actionable_types)
            await db.pending_approvals.insert_one({
                "company_id": company_id,
                "action_type": "device_change",
                "target_id": str(user_id),
                "target_name": emp_name,
                "old_value": registered_label,
                "new_value": device_info or "جهاز غير محدد",
                "note": flags_detail,
                "status": "pending",
                "requested_by": "نظام الكشف التلقائي",
                # extra context for the approval card shown to the manager
                "photo": photo,
                "device_info": device_info or "",
                "old_device_info": registered_label,
                "network_name": network_name or "",
                "ip_address": ip_address or "",
                "location": location or "",
                "created_at": now_utc(),
            })

    return entry


@api.get("/device-tracking")
async def list_device_tracking(
    suspicious_only: bool = False, employee_id: Optional[str] = None,
    skip: int = 0, limit: int = 50, user: dict = Depends(require_company_feature_manager("device_tracking")),
):
    """Manager view of device/IP history with suspicious-activity flags."""
    query = {"company_id": user["company_id"]}
    if suspicious_only:
        query["is_suspicious"] = True
    if employee_id:
        eid = safe_object_id(employee_id)
        if eid:
            query["user_id"] = eid

    cursor = db.device_history.find(query).sort("created_at", -1).skip(skip).limit(limit)
    entries = []
    async for e in cursor:
        e["_id"] = str(e["_id"])
        emp = await db.users.find_one({"_id": e["user_id"]})
        e["employee_name"] = emp.get("name", "موظف محذوف") if emp else "موظف محذوف"
        e["user_id"] = str(e["user_id"])
        e["company_id"] = str(e["company_id"])
        entries.append(e)
    total = await db.device_history.count_documents(query)
    suspicious_count = await db.device_history.count_documents({"company_id": user["company_id"], "is_suspicious": True, "is_resolved": False})
    return {"entries": entries, "total": total, "suspicious_open": suspicious_count}


@api.post("/device-tracking/{entry_id}/resolve")
async def resolve_device_tracking(entry_id: str, user: dict = Depends(require_company_feature_manager("device_tracking"))):
    result = await db.device_history.update_one(
        {"_id": safe_object_id(entry_id), "company_id": user["company_id"]},
        {"$set": {"is_resolved": True, "resolved_at": now_utc(), "resolved_by": str(user["_id"])}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="السجل غير موجود")
    return {"ok": True}


@api.post("/device-tracking/{employee_id}/force-logout")
async def force_logout_device(employee_id: str, user: dict = Depends(require_company_feature_manager("device_tracking"))):
    """Reset an employee's registered device, forcing re-verification on next check-in."""
    target = await db.users.find_one({"_id": safe_object_id(employee_id), "company_id": user["company_id"], "role": "member"})
    if not target:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    await db.users.update_one(
        {"_id": target["_id"]},
        {"$unset": {"registered_device_id": "", "registered_device_label": ""}},
    )
    await log_activity(
        company_id=user["company_id"], user_id=user["_id"], user_name=user.get("name", ""),
        action="force_logout_device", message=f"تسجيل خروج قسري لجهاز {target.get('name')}",
    )
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# Feature Flags — Central Feature Gating (بند 14)
# ──────────────────────────────────────────────────────────────────────────────
DEFAULT_FEATURE_FLAGS = {
    "ai_assistant":       {"label": "المساعد الذكي", "min_tier": "trial"},
    "performance_center": {"label": "مركز الأداء", "min_tier": "trial"},
    "spreadsheet":        {"label": "جداول البيانات", "min_tier": "trial"},
    "automation_engine":  {"label": "محرك الأتمتة", "min_tier": "monthly"},
    "ai_governance":      {"label": "حوكمة الذكاء الاصطناعي", "min_tier": "monthly"},
    "temp_access":        {"label": "الصلاحيات المؤقتة", "min_tier": "monthly"},
    "workload_balance":   {"label": "توازن الحمل الوظيفي", "min_tier": "quarterly"},
    "data_export":        {"label": "تصدير البيانات", "min_tier": "monthly"},
    "design_studio":      {"label": "استوديو التصميم", "min_tier": "yearly"},
    "white_label":        {"label": "العلامة البيضاء", "min_tier": "yearly"},
    "multi_manager":      {"label": "تعدد المديرين", "min_tier": "quarterly"},
}

TIER_ORDER = ["trial", "weekly", "monthly", "quarterly", "biannual", "yearly", "eternal"]

def tier_gte(current: str, required: str) -> bool:
    """Return True if current tier >= required tier."""
    try:
        return TIER_ORDER.index(current) >= TIER_ORDER.index(required)
    except ValueError:
        return False

@api.get("/feature-flags")
async def get_feature_flags(user: dict = Depends(require_manager)):
    """Return feature access status for the company's current subscription tier."""
    company = await get_company(user)
    tier = company.get("subscription_tier", "trial")
    # Get any overrides stored by void admin
    overrides = await db.feature_flag_overrides.find({"company_id": user["company_id"]}).to_list(50)
    override_map = {o["flag_key"]: o for o in overrides}

    result = {}
    for key, meta in DEFAULT_FEATURE_FLAGS.items():
        override = override_map.get(key)
        if override:
            enabled = override.get("enabled", True)
        else:
            enabled = tier_gte(tier, meta["min_tier"])
        result[key] = {"label": meta["label"], "enabled": enabled, "min_tier": meta["min_tier"]}

    return {"tier": tier, "features": result}

@api.get("/feature-flags/check/{flag_key}")
async def check_feature_flag(flag_key: str, user: dict = Depends(get_current_user)):
    """Quick check if a specific feature is enabled for the current company."""
    company = await get_company(user)
    tier = company.get("subscription_tier", "trial")
    override = await db.feature_flag_overrides.find_one({"company_id": user["company_id"], "flag_key": flag_key})
    if override:
        return {"enabled": override.get("enabled", True)}
    meta = DEFAULT_FEATURE_FLAGS.get(flag_key)
    if not meta:
        return {"enabled": False}
    return {"enabled": tier_gte(tier, meta["min_tier"])}


# ──────────────────────────────────────────────────────────────────────────────
# Background Tasks — AI Decision Auto-expiry + Temp Access cleanup
# ──────────────────────────────────────────────────────────────────────────────
import asyncio as _asyncio

async def _expire_ai_decisions():
    """Auto-cancel AI decisions that have been pending past their expiry (fail-safe, بند 24.2)."""
    while True:
        try:
            now = now_utc()
            result = await db.ai_decision_log.update_many(
                {"status": "pending", "expires_at": {"$lt": now}},
                {"$set": {"status": "expired", "decided_at": now}}
            )
            if result.modified_count:
                pass  # silently expire — no notification needed
        except Exception:
            pass
        await _asyncio.sleep(300)  # check every 5 minutes

async def _expire_temp_access():
    """Restore original roles for expired temporary access grants (بند 7)."""
    while True:
        try:
            now = now_utc()
            expired = await db.temp_access.find({
                "expires_at": {"$lt": now}, "revoked": False
            }).to_list(100)
            for grant in expired:
                emp_id = grant.get("employee_id")
                original_role = grant.get("original_role", "member")
                original_allowed_modules = grant.get("original_allowed_modules")
                if emp_id:
                    await db.users.update_one(
                {"_id": emp_id},
                {
                    "$set": {"allowed_modules": original_allowed_modules},
                    "$unset": {"temp_access_id": ""}
                }
            )
                await db.temp_access.update_one({"_id": grant["_id"]}, {"$set": {"revoked": True}})
        except Exception:
            pass
        await _asyncio.sleep(60)   # check every minute


@api.get("/reports/compliance")
async def compliance_report(user: dict = Depends(require_manager)):
    """Work-law compliance report (بند 11.ج)."""
    company = await get_company(user)
    settings = company.get("settings", {})
    attendance_cfg = company.get("attendance", {})
    work_start = attendance_cfg.get("work_start", "09:00")
    work_end   = attendance_cfg.get("work_end",   "17:00")
    leave_quota = settings.get("leave_quota_days", 21)
    grace = settings.get("grace_minutes", 15)
    weekend_days = settings.get("weekend_days", ["friday", "saturday"])

    # last 30 days
    from_dt = now_utc() - timedelta(days=30)
    crew = await db.users.find({"company_id": user["company_id"], "role": "member", "is_active": True}).to_list(500)
    records = []
    for m in crew:
        # attendance last 30 days — use attendance_logs (authoritative)
        att = await db.attendance_logs.find(
            {"user_id": m["_id"], "company_id": user["company_id"],
             "created_at": {"$gte": from_dt}}
        ).to_list(100)
        total_hours = 0.0
        for a in att:
            if a.get("check_out"):
                try:
                    ci = a["check_in"] if isinstance(a.get("check_in"), datetime) else \
                         datetime.fromisoformat(a["check_in"]) if isinstance(a.get("check_in"), str) else None
                    co = a["check_out"] if isinstance(a.get("check_out"), datetime) else \
                         datetime.fromisoformat(a["check_out"]) if isinstance(a.get("check_out"), str) else None
                    if ci and co:
                        total_hours += max(0, (co - ci).total_seconds() / 3600)
                except Exception:
                    pass
        leaves = await db.leaves.count_documents(
            {"user_id": str(m["_id"]), "company_id": str(user["company_id"]), "status": "approved"}
        )
        records.append({
            "employee_id": str(m["_id"]),
            "name": m.get("name", ""),
            "job_title": m.get("job_title", ""),
            "days_attended": len(att),
            "total_hours_30d": round(total_hours, 1),
            "avg_hours_per_day": round(total_hours / max(len(att), 1), 1),
            "leaves_taken": leaves,
            "leave_quota": leave_quota,
            "leave_remaining": max(0, leave_quota - leaves),
            "compliant": total_hours / max(len(att), 1) >= 7.5 if att else True,
        })
    return {
        "period": "آخر 30 يوم",
        "work_hours": f"{work_start} — {work_end}",
        "grace_minutes": grace,
        "weekend_days": weekend_days,
        "leave_quota_days": leave_quota,
        "total_employees": len(records),
        "compliant_count": sum(1 for r in records if r["compliant"]),
        "records": records,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Shifts  (V5.0 – جدولة الورديات بند 11.ب)
# ─────────────────────────────────────────────────────────────────────────────
class ShiftInput(BaseModel):
    name: str
    start_time: str = "08:00"
    end_time: str   = "16:00"
    days: List[int] = []      # 0=Sun … 6=Sat
    color: int = 0
    note: str = ""


class ShiftAssignInput(BaseModel):
    employee_id: str


@api.get("/shifts")
async def list_shifts(user: dict = Depends(require_manager)):
    shifts = await db.shifts.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(200)
    result = []
    for sh in shifts:
        sid = str(sh["_id"])
        emps = await db.users.find(
            {"company_id": user["company_id"], "shift_id": sid, "is_active": True}
        ).to_list(200)
        result.append({
            "id": sid, "name": sh["name"],
            "start_time": sh.get("start_time", "08:00"),
            "end_time":   sh.get("end_time",   "16:00"),
            "days":       sh.get("days", []),
            "color":      sh.get("color", 0),
            "note":       sh.get("note", ""),
            "assigned_count": len(emps),
            "employees": [{"id": str(e["_id"]), "name": e.get("name", "")} for e in emps],
            "created_at": sh["created_at"].isoformat() if isinstance(sh.get("created_at"), datetime) else "",
        })
    return result


@api.post("/shifts")
async def create_shift(body: ShiftInput, user: dict = Depends(require_manager)):
    doc = {"company_id": user["company_id"], **body.model_dump(), "created_at": now_utc()}
    res = await db.shifts.insert_one(doc)
    return {"id": str(res.inserted_id), **body.model_dump()}


@api.post("/shifts/{shift_id}/assign")
async def assign_shift(shift_id: str, body: ShiftAssignInput, user: dict = Depends(require_manager)):
    shift = await db.shifts.find_one({"_id": safe_object_id(shift_id), "company_id": user["company_id"]})
    if not shift:
        raise HTTPException(status_code=404, detail="الوردية غير موجودة")
    await db.users.update_one(
        {"_id": safe_object_id(body.employee_id), "company_id": user["company_id"]},
        {"$set": {"shift_id": shift_id}}
    )
    return {"ok": True}


@api.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, user: dict = Depends(require_manager)):
    await db.shifts.delete_one({"_id": safe_object_id(shift_id), "company_id": user["company_id"]})
    # unlink employees
    await db.users.update_many(
        {"company_id": user["company_id"], "shift_id": shift_id},
        {"$unset": {"shift_id": ""}}
    )
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# Learning Center  (V5.0 – مركز التعلم بند 11.هـ)
# ─────────────────────────────────────────────────────────────────────────────
class LearningInput(BaseModel):
    title: str
    description: str = ""
    url: str = ""
    level: str = "beginner"   # beginner | intermediate | advanced
    duration_min: int = 30
    target_roles: List[str] = ["member"]


@api.get("/learning")
async def list_learning(user: dict = Depends(get_current_user)):
    items = await db.learning.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(200)
    return [{
        "id": str(i["_id"]), "title": i["title"],
        "description": i.get("description", ""), "url": i.get("url", ""),
        "level": i.get("level", "beginner"), "duration_min": i.get("duration_min", 30),
        "target_roles": i.get("target_roles", ["member"]),
        "completions": await db.learning_progress.count_documents({"course_id": str(i["_id"]), "completed": True}),
        "created_at": i["created_at"].isoformat() if isinstance(i.get("created_at"), datetime) else "",
    } for i in items]


@api.post("/learning")
async def create_course(body: LearningInput, user: dict = Depends(require_manager)):
    doc = {"company_id": user["company_id"], **body.model_dump(), "created_at": now_utc()}
    res = await db.learning.insert_one(doc)
    return {"id": str(res.inserted_id), **body.model_dump()}


@api.delete("/learning/{course_id}")
async def delete_course(course_id: str, user: dict = Depends(require_manager)):
    await db.learning.delete_one({"_id": safe_object_id(course_id), "company_id": user["company_id"]})
    return {"ok": True}


@api.post("/learning/{course_id}/complete")
async def mark_course_complete(course_id: str, user: dict = Depends(get_current_user)):
    await db.learning_progress.update_one(
        {"course_id": course_id, "user_id": user["_id"]},
        {"$set": {"completed": True, "completed_at": now_utc()}},
        upsert=True,
    )
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# Invoices  (V5.0 – Mini Invoicing بند 13.ح)
# ─────────────────────────────────────────────────────────────────────────────
import secrets as _secrets

class InvoiceInput(BaseModel):
    client_name: str
    client_email: str = ""
    description: str
    amount: float
    currency: str = "EGP"
    due_date: str = ""
    notes: str = ""

class InvoiceStatusInput(BaseModel):
    status: str   # draft | sent | paid | overdue


@api.get("/invoices")
async def list_invoices(user: dict = Depends(require_manager)):
    items = await db.invoices.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(500)
    return [{
        "id": str(i["_id"]), "invoice_number": i.get("invoice_number", ""),
        "client_name": i["client_name"], "client_email": i.get("client_email", ""),
        "description": i["description"], "amount": i["amount"],
        "currency": i.get("currency", "EGP"), "status": i.get("status", "draft"),
        "due_date": i.get("due_date", ""), "notes": i.get("notes", ""),
        "created_at": i["created_at"].isoformat() if isinstance(i.get("created_at"), datetime) else "",
    } for i in items]


@api.post("/invoices")
async def create_invoice(body: InvoiceInput, user: dict = Depends(require_manager)):
    count = await db.invoices.count_documents({"company_id": user["company_id"]})
    inv_num = f"INV-{count + 1:04d}"
    doc = {
        "company_id": user["company_id"],
        "invoice_number": inv_num,
        **body.model_dump(),
        "status": "draft",
        "created_at": now_utc(),
    }
    res = await db.invoices.insert_one(doc)
    return {"id": str(res.inserted_id), "invoice_number": inv_num, **body.model_dump(), "status": "draft"}


@api.put("/invoices/{inv_id}/status")
async def update_invoice_status(inv_id: str, body: InvoiceStatusInput, user: dict = Depends(require_manager)):
    if body.status not in ("draft", "sent", "paid", "overdue"):
        raise HTTPException(status_code=400, detail="حالة غير صالحة")
    await db.invoices.update_one(
        {"_id": safe_object_id(inv_id), "company_id": user["company_id"]},
        {"$set": {"status": body.status}}
    )
    return {"ok": True}


@api.delete("/invoices/{inv_id}")
async def delete_invoice(inv_id: str, user: dict = Depends(require_manager)):
    await db.invoices.delete_one({"_id": safe_object_id(inv_id), "company_id": user["company_id"]})
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────────────────
# Client Portal  (V5.0 – بند 13.ب)
# ─────────────────────────────────────────────────────────────────────────────
class ClientPortalInput(BaseModel):
    client_name: str
    client_email: str = ""
    project_name: str
    description: str = ""
    expires_days: int = 30


@api.get("/client-portals")
async def list_client_portals(user: dict = Depends(require_manager)):
    items = await db.client_portals.find({"company_id": user["company_id"]}).sort("created_at", -1).to_list(200)
    now = now_utc()
    return [{
        "id": str(p["_id"]), "token": p["token"],
        "client_name": p["client_name"], "client_email": p.get("client_email", ""),
        "project_name": p["project_name"], "description": p.get("description", ""),
        "status": "revoked" if p.get("revoked") else ("expired" if p["expires_at"] < now else "active"),
        "expires_at": p["expires_at"].isoformat(),
        "created_at": p["created_at"].isoformat(),
    } for p in items]


@api.post("/client-portals")
async def create_client_portal(body: ClientPortalInput, user: dict = Depends(require_manager)):
    token = _secrets.token_urlsafe(32)
    doc = {
        "company_id": user["company_id"],
        "token": token,
        **body.model_dump(),
        "revoked": False,
        "expires_at": now_utc() + timedelta(days=body.expires_days),
        "created_at": now_utc(),
    }
    await db.client_portals.insert_one(doc)
    return {"ok": True, "token": token}


@api.delete("/client-portals/{portal_id}")
async def revoke_client_portal(portal_id: str, user: dict = Depends(require_manager)):
    await db.client_portals.update_one(
        {"_id": safe_object_id(portal_id), "company_id": user["company_id"]},
        {"$set": {"revoked": True}}
    )
    return {"ok": True}


@api.get("/portal/{token}")
async def get_portal_data(token: str):
    """Public endpoint — no auth required. Returns limited project data for the client."""
    portal = await db.client_portals.find_one({"token": token, "revoked": False})
    if not portal:
        raise HTTPException(status_code=404, detail="هذه البوابة غير موجودة أو منتهية")
    if portal["expires_at"] < now_utc():
        raise HTTPException(status_code=410, detail="انتهت صلاحية هذه البوابة")
    # get project info
    project = await db.projects.find_one({
        "company_id": portal["company_id"],
        "name": portal["project_name"],
    })
    company = await db.companies.find_one({"_id": portal["company_id"]})
    return {
        "client_name": portal["client_name"],
        "project_name": portal["project_name"],
        "description": portal.get("description", ""),
        "company_name": company.get("name", "") if company else "",
        "company_logo": company.get("logo_url") if company else None,
        "project_status": project.get("status", "active") if project else "active",
        "project_note": project.get("note", "") if project else "",
        "expires_at": portal["expires_at"].isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Register all API routes — MUST come after all @api.* route definitions
# ─────────────────────────────────────────────────────────────────────────────
app.include_router(api, prefix="")

# Serve React frontend build in production
_FRONTEND_BUILD = Path(__file__).parent / "build"
if _FRONTEND_BUILD.exists():
    app.mount("/static", StaticFiles(directory=str(_FRONTEND_BUILD / "static")), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Serve any file that physically exists in the build folder (e.g. logo, favicon)
        requested = _FRONTEND_BUILD / full_path
        if requested.exists() and requested.is_file():
            return FileResponse(str(requested))
        # Fall back to index.html for all SPA routes
        index = _FRONTEND_BUILD / "index.html"
        return FileResponse(str(index))


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)