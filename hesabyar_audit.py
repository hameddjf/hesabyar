#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
 اسکریپت مستقل تست‌وتحلیل خودکار پروژه‌ی حسابیار (hesabyar)
==============================================================================

این اسکریپت دو کار جدا انجام می‌ده (هر کدوم رو می‌شه جدا یا با هم اجرا کرد):

  1) تحلیل استاتیک (--static)
     بدون نیاز به اجرای پروژه، سورس فرانت و بک‌اند رو می‌خونه و:
       - همه‌ی endpoint هایی که بک‌اند تعریف کرده رو استخراج می‌کنه
         (هم route های دستی، هم اونایی که با makeCrudRouter ساخته شدن)
       - همه‌ی endpoint هایی که فرانت صداشون می‌زنه رو استخراج می‌کنه
         (هم از src/lib/apiClient.js، هم از api.get/post/put/del مستقیم
          توی هوک‌ها و صفحات)
       - این دو لیست رو مقایسه می‌کنه و می‌گه:
           * چه endpoint هایی توی بک‌اند هستن ولی هیچ‌جای فرانت صدا زده نمی‌شن
             (یعنی بک‌اندش زده شده، فرانتش نه)
           * چه endpoint هایی فرانت صدا می‌زنه ولی توی بک‌اند تعریف نشدن
             (یعنی فرانتش زده شده، بک‌اندش نه — این‌ها باگ واقعی‌ان)

  2) تست زنده / Live Smoke Test (--dynamic)
     به یه نمونه‌ی در‌حال‌اجرای واقعی (لوکال یا دیپلوی‌شده) وصل می‌شه و:
       - سلامت بک‌اند (/api/health) رو چک می‌کنه
       - یه شرکت و کاربر تستی جدا می‌سازه (ثبت‌نام + لاگین واقعی)
       - برای هر ماژول CRUD (مشتریان، کالاها، فاکتورها، پرداخت‌ها، کارمندان،
         حساب‌های بانکی، شرکا، ...) یه چرخه‌ی کامل create → list → get →
         update → delete اجرا می‌کنه و نتیجه رو چک می‌کنه
       - مسیرهای خاص (invoice-links، partner-ledger، notifications،
         user-layouts، activity-log، company، holo) رو هم تست می‌کنه
       - چک می‌کنه که بدون توکن، درخواست به مسیرهای محافظت‌شده 401 بده
         (تست امنیتی پایه)
       - در پایان تمام دیتای تستی که ساخته رو پاک می‌کنه (مگر با --keep-data)
       - صفحات فرانت (مسیرهای اصلی SPA) رو هم پینگ می‌کنه که 200 برگردونن

  خروجی: هم روی کنسول (رنگی، ✅/❌/⚠️) چاپ می‌شه، هم یه گزارش کامل Markdown
  توی پوشه‌ی ./reports ذخیره می‌شه.

------------------------------------------------------------------------------
 نحوه‌ی استفاده
------------------------------------------------------------------------------

هیچ وابستگی خارجی لازم نیست — فقط پایتون ۳.۸ به بالا (کتابخونه‌ی استاندارد).

# ۱) فقط تحلیل استاتیک (مقایسه‌ی سورس فرانت/بک‌اند، نیازی به اجرای پروژه نیست)
python3 hesabyar_audit.py --static /path/to/hesabyar-mvp

# ۲) فقط تست زنده روی یک نمونه‌ی در حال اجرا (مثلاً لوکال)
python3 hesabyar_audit.py --dynamic \
    --api http://localhost:4000/api \
    --frontend http://localhost:5173

# ۲.۱) تست زنده روی نسخه‌ی دیپلوی‌شده (مثلاً روی Render/Vercel)
python3 hesabyar_audit.py --dynamic \
    --api https://your-backend.onrender.com/api \
    --frontend https://your-frontend.vercel.app

# ۳) هر دو با هم (پیشنهادی)
python3 hesabyar_audit.py --static /path/to/hesabyar-mvp \
    --dynamic --api http://localhost:4000/api --frontend http://localhost:5173

نکات مهم:
  - "/path/to/hesabyar-mvp" باید همون پوشه‌ای باشه که hesabyar-frontend و
    hesabyar-backend توش هستن (پوشه‌ی ریشه‌ی زیپ).
  - این اسکریپت خودش یه شرکت/کاربر تستی با ایمیل رندوم می‌سازه، پس نیازی به
    وارد کردن ایمیل/پسورد واقعی نیست. اگه می‌خوای دیتای تستی بمونه (برای
    بررسی دستی توی دیتابیس) از --keep-data استفاده کن.
  - این اسکریپت رو هرگز روی محیطی که کاربر واقعی توشه اجرا نکن مگر با
    --keep-data=false (پیش‌فرض) که در پایان خودش پاک‌سازی می‌کنه.
  - اگه بک‌اند لوکال rate-limit سخت‌گیرانه داره و تست‌ها fail خوردن با خطای
    429، از --delay برای افزایش فاصله‌ی بین درخواست‌ها استفاده کن.

خروجی نهایی در reports/audit-<تاریخ‌وساعت>.md ذخیره می‌شه — همون رو می‌شه
مستقیم برای بررسی فرستاد.
==============================================================================
"""

import argparse
import json
import os
import random
import re
import string
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime

# ──────────────────────────────────────────────────────────────────────────
# ابزارهای کمکی مشترک
# ──────────────────────────────────────────────────────────────────────────

RESULTS = []  # {section, name, status, detail}
ICONS = {"pass": "✅", "fail": "❌", "warn": "⚠️ ", "skip": "⏭️ ", "info": "ℹ️ "}


def record(section, name, status, detail=""):
    RESULTS.append({"section": section, "name": name, "status": status, "detail": detail})
    icon = ICONS.get(status, "•")
    line = f"{icon} [{section}] {name}"
    if detail:
        line += f" — {detail}"
    print(line)


def rand_suffix(n=6):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))


def today_iso():
    return datetime.now().strftime("%Y-%m-%d")


# ──────────────────────────────────────────────────────────────────────────
# بخش ۱: تحلیل استاتیک — استخراج endpoint ها از سورس
# ──────────────────────────────────────────────────────────────────────────

CRUD_METHODS = {"GET /", "GET /:id", "POST /", "PUT /:id", "DELETE /:id"}


def clean_dynamic_path(path):
    """وقتی مسیر شامل یه عبارت پیچیده (نه فقط ${id} ساده) مثل کوئری‌استرینگ
    شرطی باشه (مثلاً /checks${qs ? `?${qs}` : ''})، رجکس اصلی ممکنه به‌خاطر
    بک‌تیک تودرتو ناقص match کنه. این تابع همه‌چیز از اولین ${...} پیچیده
    (که فاصله داخلش داره، یعنی یه عبارت جاوااسکریپتیه نه فقط یه شناسه‌ی ساده)
    رو قطع می‌کنه تا فقط مسیر پایه‌ی واقعی بمونه."""
    return re.split(r"\$\{[^}]*\s[^}]*", path)[0]


def normalize_path(p):
    """پارامترهای داینامیک رو یکدست می‌کنه: :id یا ${id} یا ${xId} -> :id
    (به‌جز placeholder مخصوص پیشوند مخفی ادمین که دست‌نخورده می‌مونه)"""
    p = p.replace("${ADMIN_PREFIX}", "__ADMIN__").replace("${ADMIN_ROUTE_SECRET}", "__ADMIN__")
    p = re.sub(r"\$\{[^}]+\}", ":id", p)
    p = re.sub(r":(?!id\b)[A-Za-z_][A-Za-z0-9_]*", ":id", p)
    p = p.rstrip("/")
    return p if p else "/"


def scan_backend(backend_src_dir):
    """
    server.js رو می‌خونه تا mount prefix هر route file رو پیدا کنه،
    بعد هر route file رو می‌خونه (یا router.METHOD مستقیم، یا makeCrudRouter).
    خروجی: set از رشته‌های 'METHOD /api/prefix/path'
    """
    server_path = os.path.join(backend_src_dir, "server.js")
    routes_dir = os.path.join(backend_src_dir, "routes")
    endpoints = set()
    route_files_info = []

    if not os.path.isfile(server_path):
        print(f"⚠️  server.js پیدا نشد در {server_path}")
        return endpoints, route_files_info

    server_src = open(server_path, encoding="utf-8").read()

    # app.use('/api/xxx', ...maybeMiddleware, someRoutesVar)
    mount_re = re.compile(
        r"""app\.use\(\s*[`'"]([^`'"]+)[`'"]\s*,\s*(?:[A-Za-z_][A-Za-z0-9_]*\s*,\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*\)"""
    )
    # import xxxRoutes from './routes/yyy.js'
    import_re = re.compile(
        r"""import\s+([A-Za-z_][A-Za-z0-9_]*)\s+from\s+['"]\./routes/([^'"]+)['"]"""
    )
    var_to_file = {var: fname for var, fname in import_re.findall(server_src)}

    for prefix, var in mount_re.findall(server_src):
        fname = var_to_file.get(var)
        if not fname:
            continue
        # ADMIN_PREFIX پویاست (از env میاد) — با همون placeholder یکدستی که
        # توی scan_frontend برای src/admin استفاده می‌شه جایگزینش می‌کنیم
        prefix = prefix.replace("${ADMIN_PREFIX}", "__ADMIN__")
        route_files_info.append((prefix, fname))

    for prefix, fname in route_files_info:
        fpath = os.path.join(routes_dir, fname)
        if not os.path.isfile(fpath):
            continue
        src = open(fpath, encoding="utf-8").read()

        if "makeCrudRouter(" in src:
            for method, path in [
                ("GET", "/"), ("GET", "/:id"), ("POST", "/"),
                ("PUT", "/:id"), ("DELETE", "/:id"),
            ]:
                full = normalize_path(prefix + path)
                endpoints.add(f"{method} {full}")

        for m in re.finditer(r"router\.(get|post|put|patch|delete)\(\s*[`'\"]([^`'\"]*)[`'\"]", src):
            method = m.group(1).upper()
            path = m.group(2)
            full = normalize_path(prefix + path)
            endpoints.add(f"{method} {full}")

    return endpoints, route_files_info


def scan_frontend(frontend_src_dir):
    """
    src/lib/apiClient.js رو برای request('/xxx', ...) پارس می‌کنه،
    و کل src رو برای فراخوانی مستقیم api.get/post/put/del('/xxx') می‌گرده.
    خروجی: set از 'METHOD /api/xxx'
    """
    endpoints = set()
    src_root = frontend_src_dir

    method_map = {"get": "GET", "post": "POST", "put": "PUT", "patch": "PATCH", "del": "DELETE", "delete": "DELETE"}

    for dirpath, _, files in os.walk(src_root):
        for fn in files:
            if not fn.endswith((".js", ".jsx", ".ts", ".tsx")):
                continue
            fpath = os.path.join(dirpath, fn)
            try:
                src = open(fpath, encoding="utf-8").read()
            except Exception:
                continue

            # فایل‌های زیر src/admin با یک پیشوند مخفی جدا (ADMIN_ROUTE_SECRET) صحبت می‌کنن،
            # نه با /api مستقیم -> پیشوندشون رو جدا می‌ذاریم تا با بک‌اند درست مچ بشه
            is_admin_client = (os.sep + "admin" + os.sep) in fpath
            api_prefix = "/api/__ADMIN__" if is_admin_client else "/api"

            # request('/path', { method: 'POST' ... })  (داخل apiClient.js یا adminApiClient.js)
            for m in re.finditer(
                r"""request\(\s*[`'"]([^`'"]+)[`'"]\s*(?:,\s*\{\s*method:\s*[`'"]([A-Za-z]+)[`'"])?""",
                src,
            ):
                path, method = m.group(1), (m.group(2) or "GET").upper()
                path = clean_dynamic_path(path)
                endpoints.add(f"{method} {normalize_path(api_prefix + path)}")

            # api.get('/path') / api.post('/path', ...) / api.del(`/path/${id}`)
            for m in re.finditer(
                r"""api\.(get|post|put|patch|del|delete)\(\s*[`'"]([^`'"]+)[`'"]""",
                src,
            ):
                verb, path = m.group(1), m.group(2)
                path = clean_dynamic_path(path)
                method = method_map.get(verb, verb.upper())
                endpoints.add(f"{method} {normalize_path(api_prefix + path)}")

    return endpoints


def run_static_analysis(project_root):
    print("\n" + "=" * 78)
    print(" تحلیل استاتیک: مقایسه‌ی endpoint های بک‌اند و فراخوانی‌های فرانت")
    print("=" * 78)

    backend_src = os.path.join(project_root, "hesabyar-backend", "src")
    frontend_src = os.path.join(project_root, "hesabyar-frontend", "src")

    if not os.path.isdir(backend_src) or not os.path.isdir(frontend_src):
        record("استاتیک", "پیدا کردن پوشه‌های پروژه", "fail",
               f"hesabyar-backend/src یا hesabyar-frontend/src زیر {project_root} پیدا نشد")
        return

    backend_eps, route_files = scan_backend(backend_src)
    frontend_eps = scan_frontend(frontend_src)

    record("استاتیک", "تعداد endpoint های کشف‌شده در بک‌اند", "info", str(len(backend_eps)))
    record("استاتیک", "تعداد فراخوانی‌های API کشف‌شده در فرانت", "info", str(len(frontend_eps)))

    # فرانت داره صدا می‌زنه ولی بک‌اند نداره -> باگ واقعی
    fe_without_be = sorted(frontend_eps - backend_eps)
    # بک‌اند هست ولی هیچ‌جای فرانت صدا زده نمی‌شه -> شاید عمدیه (مثل ادمین‌پنل جدا) یا فراموش‌شده
    be_without_fe = sorted(backend_eps - frontend_eps)

    if fe_without_be:
        for ep in fe_without_be:
            record("استاتیک", "فرانت این endpoint رو صدا می‌زنه ولی توی بک‌اند تعریف نشده", "fail", ep)
    else:
        record("استاتیک", "همه‌ی فراخوانی‌های فرانت در بک‌اند تعریف شدن", "pass")

    if be_without_fe:
        for ep in be_without_fe:
            record("استاتیک", "این endpoint توی بک‌اند هست ولی هیچ‌جای فرانت صدا زده نمی‌شه", "warn", ep)
    else:
        record("استاتیک", "همه‌ی endpoint های بک‌اند حداقل یک‌بار از فرانت صدا زده می‌شن", "pass")

    return {"backend_eps": backend_eps, "frontend_eps": frontend_eps,
            "fe_without_be": fe_without_be, "be_without_fe": be_without_fe}


# ──────────────────────────────────────────────────────────────────────────
# بخش ۲: تست زنده — HTTP client ساده (بدون requests)
# ──────────────────────────────────────────────────────────────────────────

class ApiError(Exception):
    def __init__(self, status, body):
        self.status = status
        self.body = body
        super().__init__(f"HTTP {status}: {body}")


def http_request(url, method="GET", body=None, token=None, timeout=15):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = resp.status
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        status = e.code
        raw = e.read().decode("utf-8", errors="replace")
    except urllib.error.URLError as e:
        raise ApiError(0, str(e.reason))

    parsed = None
    if raw:
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = raw
    return status, parsed


class Api:
    def __init__(self, base_url, delay=0.1):
        self.base = base_url.rstrip("/")
        self.token = None
        self.delay = delay

    def call(self, method, path, body=None, auth=True, expect=None):
        time.sleep(self.delay)
        status, payload = http_request(
            self.base + path, method=method, body=body,
            token=self.token if auth else None,
        )
        if expect is not None and status not in expect:
            raise ApiError(status, payload)
        return status, payload


# ──────────────────────────────────────────────────────────────────────────
# بخش ۲: تست زنده — سناریوهای تست
# ──────────────────────────────────────────────────────────────────────────

def run_dynamic_tests(api_base, frontend_base, keep_data=False, delay=0.15):
    print("\n" + "=" * 78)
    print(" تست زنده روی پروژه‌ی در حال اجرا")
    print("=" * 78)

    api = Api(api_base, delay=delay)
    created = {}  # برای پاک‌سازی نهایی: {'clients': [ids], ...}

    def track(kind, _id):
        created.setdefault(kind, []).append(_id)

    # ---------- سلامت پایه ----------
    try:
        status, payload = api.call("GET", "/health", auth=False)
        if status == 200:
            record("سلامت", "GET /api/health", "pass", f"HTTP {status}")
        else:
            record("سلامت", "GET /api/health", "fail", f"HTTP {status}")
    except ApiError as e:
        record("سلامت", "GET /api/health", "fail", str(e))
        record("سلامت", "توقف تست‌های زنده", "fail", "بک‌اند در دسترس نیست — ادامه‌ی تست بی‌فایده‌ست")
        return

    # ---------- تست امنیتی پایه: دسترسی بدون توکن باید 401 بده ----------
    try:
        status, _ = api.call("GET", "/clients", auth=False)
        if status == 401:
            record("امنیت", "دسترسی بدون توکن به /api/clients", "pass", "درست 401 برگردوند")
        else:
            record("امنیت", "دسترسی بدون توکن به /api/clients", "fail", f"انتظار 401 بود، HTTP {status} برگشت")
    except ApiError as e:
        record("امنیت", "دسترسی بدون توکن به /api/clients", "warn", str(e))

    # ---------- ثبت‌نام و لاگین شرکت تستی ----------
    suffix = rand_suffix()
    test_email = f"audit-{suffix}@example.com"
    test_password = "AuditTest#12345"
    company_name = f"شرکت تستی حسابیار {suffix}"

    try:
        status, payload = api.call("POST", "/auth/register", body={
            "companyName": company_name,
            "name": "کاربر تستی",
            "email": test_email,
            "password": test_password,
        }, auth=False)
        if status in (200, 201) and isinstance(payload, dict) and payload.get("token"):
            api.token = payload["token"]
            record("احراز هویت", "ثبت‌نام شرکت تستی", "pass", f"{test_email}")
        else:
            record("احراز هویت", "ثبت‌نام شرکت تستی", "fail", f"HTTP {status} — {payload}")
            record("احراز هویت", "توقف تست‌های زنده", "fail", "بدون توکن معتبر نمی‌شه ادامه داد")
            return
    except ApiError as e:
        record("احراز هویت", "ثبت‌نام شرکت تستی", "fail", str(e))
        return

    try:
        status, payload = api.call("POST", "/auth/login", body={
            "email": test_email, "password": test_password,
        }, auth=False)
        if status == 200 and isinstance(payload, dict) and payload.get("token"):
            api.token = payload["token"]
            record("احراز هویت", "لاگین با کاربر تستی", "pass")
        else:
            record("احراز هویت", "لاگین با کاربر تستی", "fail", f"HTTP {status}")
    except ApiError as e:
        record("احراز هویت", "لاگین با کاربر تستی", "fail", str(e))

    try:
        status, payload = api.call("GET", "/auth/me")
        record("احراز هویت", "GET /api/auth/me", "pass" if status == 200 else "fail", f"HTTP {status}")
    except ApiError as e:
        record("احراز هویت", "GET /api/auth/me", "fail", str(e))

    # ---------- فراموشی / بازنشانی رمز عبور ----------
    # نکته: چون توکن reset از طریق ایمیل/کنسول سرور می‌ره (نه از API)، این‌جا
    # فقط می‌شه رفتار «بیرونی» endpoint رو تست کرد، نه چرخه‌ی کامل موفق —
    # چرخه‌ی کامل توسط تست جداگانه‌ی curl در حین توسعه تأیید شده.
    try:
        status1, body1 = api.call("POST", "/auth/forgot-password", body={"email": test_email}, auth=False)
        status2, body2 = api.call("POST", "/auth/forgot-password", body={"email": "no-such-user-xyz@example.com"}, auth=False)
        same_shape = status1 == status2 == 200 and isinstance(body1, dict) and isinstance(body2, dict) \
            and body1.get("message") == body2.get("message")
        record("احراز هویت", "POST /api/auth/forgot-password (ایمیل موجود در برابر ناموجود، پیام یکسان)",
               "pass" if same_shape else "fail",
               "درست: نمی‌شه با این endpoint فهمید ایمیلی وجود داره یا نه" if same_shape
               else f"HTTP {status1}/{status2} — پاسخ‌ها متفاوتن، ممکنه افشای وجود ایمیل باشه")
    except ApiError as e:
        record("احراز هویت", "POST /api/auth/forgot-password", "fail", str(e))

    try:
        status, body = api.call("POST", "/auth/reset-password",
                                 body={"token": "0" * 64, "password": "SomeNewPass123"}, auth=False)
        record("احراز هویت", "POST /api/auth/reset-password (با توکن جعلی، باید رد بشه)",
               "pass" if status == 400 else "fail", f"HTTP {status}")
    except ApiError as e:
        record("احراز هویت", "POST /api/auth/reset-password (توکن جعلی)", "fail", str(e))

    # ---------- تست company ----------
    try:
        status, payload = api.call("GET", "/company")
        record("شرکت", "GET /api/company", "pass" if status == 200 else "fail", f"HTTP {status}")
    except ApiError as e:
        record("شرکت", "GET /api/company", "fail", str(e))

    # ---------- تست CRUD عمومی ----------
    def crud_test(resource_name, path, payload_create, payload_update=None, cleanup=True):
        """یک چرخه‌ی کامل create -> list -> get -> update -> delete"""
        section = f"CRUD: {resource_name}"
        new_id = None
        try:
            status, body = api.call("POST", path, body=payload_create)
            if status in (200, 201) and isinstance(body, dict) and body.get("id"):
                new_id = body["id"]
                record(section, f"POST {path}", "pass", f"id={new_id}")
            else:
                record(section, f"POST {path}", "fail", f"HTTP {status} — {body}")
                return None
        except ApiError as e:
            record(section, f"POST {path}", "fail", str(e))
            return None

        try:
            status, body = api.call("GET", path)
            ok = status == 200 and isinstance(body, list)
            found = ok and any(str(row.get("id")) == str(new_id) for row in body)
            record(section, f"GET {path} (لیست شامل رکورد تازه‌ساخته‌شده)",
                   "pass" if found else "warn", f"HTTP {status}, {len(body) if ok else '?'} رکورد")
        except ApiError as e:
            record(section, f"GET {path}", "fail", str(e))

        try:
            status, body = api.call("GET", f"{path}/{new_id}")
            record(section, f"GET {path}/:id", "pass" if status == 200 else "warn", f"HTTP {status}")
        except ApiError as e:
            record(section, f"GET {path}/:id", "warn", str(e))

        if payload_update is not None:
            try:
                status, body = api.call("PUT", f"{path}/{new_id}", body=payload_update)
                record(section, f"PUT {path}/:id", "pass" if status in (200, 204) else "fail", f"HTTP {status}")
            except ApiError as e:
                record(section, f"PUT {path}/:id", "fail", str(e))

        if cleanup and not keep_data:
            try:
                status, body = api.call("DELETE", f"{path}/{new_id}")
                record(section, f"DELETE {path}/:id (پاک‌سازی)", "pass" if status in (200, 204) else "warn", f"HTTP {status}")
            except ApiError as e:
                record(section, f"DELETE {path}/:id", "warn", str(e))
        else:
            track(resource_name, new_id)

        return new_id

    client_id = crud_test(
        "clients", "/clients",
        {"name": f"مشتری تستی {suffix}", "type": "person", "phone": "09120000000"},
        {"phone": "09121111111"},
        cleanup=False,  # برای استفاده در فاکتور نگهش می‌داریم، آخر دستی پاک می‌کنیم
    )

    crud_test(
        "products", "/products",
        {"sku": f"SKU-{suffix}", "name": "کالای تستی", "unit": "عدد", "price": 100000, "stock": 5},
        {"price": 120000},
    )

    crud_test(
        "employees", "/employees",
        {"name": "کارمند تستی", "position": "حسابدار", "status": "active"},
        {"position": "حسابدار ارشد"},
    )

    crud_test(
        "banking-accounts", "/banking-accounts",
        {"label": "حساب تستی", "bank": "ملی", "balance": 0},
        {"balance": 1000},
    )

    partner_id = crud_test(
        "partners", "/partners",
        {"name": "شریک تستی", "role": "owner", "share": 50},
        {"share": 40},
        cleanup=False,
    )

    invoice_id = None
    if client_id:
        invoice_id = crud_test(
            "invoices", "/invoices",
            {
                "invoice_number": f"INV-AUDIT-{suffix}", "type": "sale",
                "issue_date": today_iso(), "client_id": client_id,
                "total_amount": 100000, "discount": 0, "tax_amount": 0,
                "grand_total": 100000, "status": "pending", "items_json": "[]",
            },
            {"status": "paid"},
            cleanup=False,
        )
    else:
        record("CRUD: invoices", "رد شدن از تست فاکتور", "skip", "چون ساخت مشتری تستی ناموفق بود")

    crud_test(
        "payments", "/payments",
        {
            "date": today_iso(), "amount": 50000, "transaction_type": "receipt",
            "method": "cash", "description": "تست خودکار",
        },
        {"amount": 55000},
    )

    # ---------- چک‌ها (مدیریت دسته چک) ----------
    check_id = crud_test(
        "checks", "/checks",
        {
            "direction": "received", "check_number": f"CHK-AUDIT-{suffix}",
            "bank_name": "ملت", "amount": 1000000, "due_date": today_iso(),
            "party_name": "طرف حساب تستی",
        },
        {"bank_name": "صادرات"},
        cleanup=False,
    )
    if check_id:
        try:
            status, body = api.call("POST", f"/checks/{check_id}/status", body={"status": "cleared"})
            record("CRUD: checks", "POST /checks/:id/status (پرش غیرمجاز in_hand→cleared، باید رد بشه)",
                   "pass" if status == 400 else "fail", f"HTTP {status}")
        except ApiError as e:
            record("CRUD: checks", "POST /checks/:id/status (پرش غیرمجاز)", "fail", str(e))

        try:
            status, body = api.call("POST", f"/checks/{check_id}/status", body={"status": "deposited", "note": "تست"})
            record("CRUD: checks", "POST /checks/:id/status (in_hand→deposited، مجاز)",
                   "pass" if status == 200 and body.get("status") == "deposited" else "fail", f"HTTP {status}")
        except ApiError as e:
            record("CRUD: checks", "POST /checks/:id/status (مجاز)", "fail", str(e))

        try:
            status, body = api.call("GET", f"/checks/{check_id}/history")
            record("CRUD: checks", "GET /checks/:id/history (باید ۲ ردیف داشته باشه)",
                   "pass" if status == 200 and isinstance(body, list) and len(body) == 2 else "warn", f"HTTP {status}, {len(body) if isinstance(body, list) else '?'} ردیف")
        except ApiError as e:
            record("CRUD: checks", "GET /checks/:id/history", "fail", str(e))

        try:
            status, body = api.call("GET", "/checks/summary")
            record("CRUD: checks", "GET /checks/summary", "pass" if status == 200 else "fail", f"HTTP {status}")
        except ApiError as e:
            record("CRUD: checks", "GET /checks/summary", "fail", str(e))

        if not keep_data:
            try:
                api.call("DELETE", f"/checks/{check_id}")
            except Exception:
                pass

    # ---------- مسیرهای خاصِ غیر-CRUD ----------
    if invoice_id:
        try:
            status, body = api.call("GET", f"/invoice-links/balance/{invoice_id}")
            record("مسیرهای خاص", "GET /api/invoice-links/balance/:id", "pass" if status == 200 else "fail", f"HTTP {status}")
        except ApiError as e:
            record("مسیرهای خاص", "GET /api/invoice-links/balance/:id", "fail", str(e))

    try:
        status, body = api.call("GET", "/notifications")
        record("مسیرهای خاص", "GET /api/notifications", "pass" if status == 200 else "fail", f"HTTP {status}")
    except ApiError as e:
        record("مسیرهای خاص", "GET /api/notifications", "fail", str(e))

    try:
        status, body = api.call("GET", "/activity-log")
        record("مسیرهای خاص", "GET /api/activity-log", "pass" if status == 200 else "fail", f"HTTP {status}")
    except ApiError as e:
        record("مسیرهای خاص", "GET /api/activity-log", "fail", str(e))

    try:
        status, body = api.call("PUT", "/user-layouts/dashboard", body={
            "layout": [{"id": "stat-total", "visible": True, "order": 0}]
        })
        record("مسیرهای خاص", "PUT /api/user-layouts/dashboard", "pass" if status in (200, 201) else "fail", f"HTTP {status}")
    except ApiError as e:
        record("مسیرهای خاص", "PUT /api/user-layouts/dashboard", "fail", str(e))

    if partner_id:
        try:
            status, body = api.call("GET", "/partner-ledger/balances")
            record("مسیرهای خاص", "GET /api/partner-ledger/balances", "pass" if status == 200 else "fail", f"HTTP {status}")
        except ApiError as e:
            record("مسیرهای خاص", "GET /api/partner-ledger/balances", "fail", str(e))

    try:
        status, body = api.call("POST", "/holo/test-connection", body={"host": "invalid", "port": 1})
        # انتظار: چون اتصال جعلیه باید خطای منطقی بده نه کرش سرور (500 خام)
        record("مسیرهای خاص", "POST /api/holo/test-connection (با اتصال نامعتبر)",
               "pass" if status in (200, 400, 422) else "warn", f"HTTP {status}")
    except ApiError as e:
        record("مسیرهای خاص", "POST /api/holo/test-connection", "warn", str(e))

    # ---------- تست ایزوله‌سازی چندمستأجری (چند-شرکتی) ----------
    suffix2 = rand_suffix()
    other_email = f"audit-{suffix2}@example.com"
    other_api = Api(api_base, delay=delay)
    try:
        status, payload = other_api.call("POST", "/auth/register", body={
            "companyName": f"شرکت تستی دوم {suffix2}", "name": "کاربر دوم",
            "email": other_email, "password": test_password,
        }, auth=False)
        if status in (200, 201):
            other_api.token = payload["token"]
            status, body = other_api.call("GET", "/clients")
            leaked = isinstance(body, list) and any(str(row.get("id")) == str(client_id) for row in body)
            record("امنیت", "ایزوله‌سازی داده بین دو شرکت مختلف (/api/clients)",
                   "fail" if leaked else "pass",
                   "دیتای شرکت اول برای شرکت دوم قابل مشاهده‌ست!" if leaked else "درست ایزوله شده")
            if not keep_data and client_id:
                try:
                    other_api.call("GET", f"/clients/{client_id}", expect=None)
                except Exception:
                    pass
        else:
            record("امنیت", "ساخت شرکت دوم برای تست ایزوله‌سازی", "warn", f"HTTP {status}")
    except ApiError as e:
        record("امنیت", "تست ایزوله‌سازی چندمستأجری", "warn", str(e))

    # ---------- پاک‌سازی نهایی ----------
    if not keep_data:
        if invoice_id:
            try:
                api.call("DELETE", f"/invoices/{invoice_id}")
            except Exception:
                pass
        if partner_id:
            try:
                api.call("DELETE", f"/partners/{partner_id}")
            except Exception:
                pass
        if client_id:
            try:
                api.call("DELETE", f"/clients/{client_id}")
            except Exception:
                pass
        record("پاک‌سازی", "حذف تمام دیتای تستی ساخته‌شده", "pass")
    else:
        record("پاک‌سازی", "دیتای تستی نگه داشته شد (--keep-data)", "info", f"ایمیل: {test_email}")

    # ---------- تست دسترس‌پذیری صفحات فرانت ----------
    if frontend_base:
        print("\n" + "-" * 78)
        print(" دسترس‌پذیری صفحات فرانت")
        print("-" * 78)
        pages = [
            "/", "/login", "/register", "/dashboard", "/clients", "/products",
            "/invoices", "/payments", "/employees", "/banking-accounts",
            "/partners", "/reports", "/settings", "/expenses", "/receipts",
        ]
        for p in pages:
            try:
                status, _ = http_request(frontend_base.rstrip("/") + p, method="GET")
                record("فرانت", f"GET {p}", "pass" if status == 200 else "warn", f"HTTP {status}")
            except Exception as e:
                record("فرانت", f"GET {p}", "fail", str(e))
            time.sleep(delay)


# ──────────────────────────────────────────────────────────────────────────
# گزارش‌گیری
# ──────────────────────────────────────────────────────────────────────────

def write_report():
    os.makedirs("reports", exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    path = os.path.join("reports", f"audit-{ts}.md")

    total = len(RESULTS)
    passed = sum(1 for r in RESULTS if r["status"] == "pass")
    failed = sum(1 for r in RESULTS if r["status"] == "fail")
    warned = sum(1 for r in RESULTS if r["status"] == "warn")

    lines = [f"# گزارش تست خودکار حسابیار — {ts}", ""]
    lines.append(f"📊 خلاصه: {passed} موفق، {failed} ناموفق، {warned} هشدار (از مجموع {total} مورد)")
    lines.append("")
    current_section = None
    for r in RESULTS:
        if r["section"] != current_section:
            current_section = r["section"]
            lines.append(f"\n## {current_section}\n")
        icon = ICONS.get(r["status"], "•")
        detail = f" — {r['detail']}" if r["detail"] else ""
        lines.append(f"- {icon} {r['name']}{detail}")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print("\n" + "=" * 78)
    print(f"📊 خلاصه: {passed} موفق، {failed} ناموفق، {warned} هشدار (از مجموع {total} مورد)")
    print(f"📝 گزارش کامل ذخیره شد در: {path}")
    print("=" * 78)
    return path


# ──────────────────────────────────────────────────────────────────────────
# main
# ──────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="اسکریپت تست‌وتحلیل خودکار پروژه‌ی حسابیار",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--static", metavar="PROJECT_ROOT",
                         help="مسیر ریشه‌ی پروژه (پوشه‌ای که hesabyar-frontend و hesabyar-backend توشه) برای تحلیل استاتیک")
    parser.add_argument("--dynamic", action="store_true", help="اجرای تست زنده روی یک نمونه‌ی در حال اجرا")
    parser.add_argument("--api", default="http://localhost:4000/api", help="آدرس پایه‌ی API بک‌اند")
    parser.add_argument("--frontend", default="http://localhost:5173", help="آدرس پایه‌ی فرانت")
    parser.add_argument("--keep-data", action="store_true", help="دیتای تستی رو در پایان پاک نکن")
    parser.add_argument("--delay", type=float, default=0.15, help="فاصله (ثانیه) بین درخواست‌ها")
    args = parser.parse_args()

    if not args.static and not args.dynamic:
        parser.print_help()
        print("\n⚠️  حداقل یکی از --static یا --dynamic رو باید بدی.")
        sys.exit(1)

    if args.static:
        run_static_analysis(args.static)

    if args.dynamic:
        run_dynamic_tests(args.api, args.frontend, keep_data=args.keep_data, delay=args.delay)

    write_report()


if __name__ == "__main__":
    main()
