#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
لانچر یکپارچه‌ی حسابیار (ویندوز)
=================================
تنها راه رسمی بالا آوردن پروژه. این فایل، و فقط همین فایل، پنج مرحله رو
دقیقاً به همون ترتیبی که خواسته شده انجام می‌ده:

  1) ساخت محیط مجازی پایتون به اسم «config»، هم‌ردیف با hesabyar-backend
     و hesabyar-frontend (معادل: python -m venv config)
  2) «فعال‌سازی» همون محیط مجازی برای همه‌ی مراحل بعدی
     (معادل: .\\config\\Scripts\\activate)
  3) نصب خودکار پکیج‌های لازم — هم بک‌اند (npm) هم فرانت (npm)
  4) آماده‌سازی دیتابیس (ساخت جدول‌ها + کاربر پیش‌فرض)
  5) بالا آوردن هم‌زمان بک‌اند و فرانت + باز کردن خودکار مرورگر

نکته‌ی فنی (چرا نسخه‌ی قبلی گیر می‌کرد):
  بک‌اند/فرانت این پروژه Node.js هستن. روی ویندوز npm در واقع یک فایل
  «npm.cmd» است، نه یک .exe واقعی. صدا زدن مستقیمش با
  subprocess.run(["npm", ...]) (بدون گذر از cmd.exe) با خطای
  WinError 2 شکست می‌خوره — دقیقاً همون‌جایی که قبلاً لاگ بی‌صدا قطع می‌شد.
  این نسخه همه‌ی دستورهای npm رو از طریق cmd.exe (‎cmd /c ...‎) اجرا می‌کنه
  که همون رفتار Command Prompt عادی رو داره و این مشکل رو کامل حل می‌کنه.

نکته‌ی فنی ۲ (خطای مرحله‌ی ۳ روی better-sqlite3 / پکیج‌های بومی):
  اگه «npm install» توی مرحله‌ی ۳ با خطاهایی مثل «No prebuilt binaries
  found» و «Could not find any Visual Studio installation» شکست بخوره،
  دلیلش اینه که better-sqlite3 (یه پکیج C++) نه نسخه‌ی از‌پیش‌کامپایل‌شده‌ی
  آماده پیدا کرده، نه ابزار کامپایل (Visual Studio Build Tools) روی سیستم
  بوده تا از رو سورس بسازتش. حدس اولیه این بود که فقط به‌خاطر نسخه‌ی خیلی
  تازه‌ی Node («Current» به‌جای «LTS») هست، ولی روی یه مورد واقعی این خطا
  حتی بعد از سوییچ به Node LTS هم تکرار شد — پس علت اصلی، نبودِ کامل
  Visual Studio Build Tools روی سیستمه (مستقل از نسخه‌ی Node)؛ نصب Node
  LTS فقط یه توصیه‌ی جانبیه، نه راه‌حل قطعی. این launcher حالا این حالت رو
  تشخیص می‌ده، Visual Studio Build Tools رو به‌عنوان راه‌حل اصلی پیشنهاد
  می‌ده، و اگه مسیر نصب Node.js هم فاصله/حروف غیرانگلیسی داشته باشه
  (که می‌تونه خودش یه منبع شکست جداگانه برای ابزارهای کامپایل باشه) جدا
  هشدار می‌ده — ببین Launcher._diagnose_native_build_failure().

محیط مجازی «config» طبق درخواست ساخته و فعال می‌شه (PATH پردازش‌های بعدی
با پوشه‌ی Scripts آن آپدیت می‌شه). چون npm/node داخل این venv نیستن، نصب
Node همیشه با npm انجام می‌شه؛ venv برای وابستگی‌های پایتونیِ احتمالیِ
آینده (اگه به requirements.txt چیزی اضافه شد) آماده‌ست.

اجرا:
    python hesabyar_launcher.py
(یا دوبار-کلیک روی Run-Hesabyar.bat کنار همین پروژه)
"""

from __future__ import annotations

import os
import queue
import shutil
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from datetime import datetime
from pathlib import Path

try:
    import tkinter as tk
    from tkinter import ttk, scrolledtext
except ImportError:
    tk = None  # پیام واضح در main() اگه tkinter نصب نبود


# ────────────────────────────────────────────────────────────────
# مسیرها و تنظیمات ثابت
# ────────────────────────────────────────────────────────────────
LAUNCHER_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = LAUNCHER_DIR.parent

BACKEND_DIR = PROJECT_ROOT / "hesabyar-backend"
FRONTEND_DIR = PROJECT_ROOT / "hesabyar-frontend"
VENV_DIR = PROJECT_ROOT / "config"
REQUIREMENTS_FILE = PROJECT_ROOT / "requirements.txt"

ICON_PATH = LAUNCHER_DIR / "assets" / "hesabyar.ico"
LOG_FILE = LAUNCHER_DIR / "run_log.txt"

BACKEND_PORT = 4000
FRONTEND_PORT = 5173
HEALTHCHECK_TIMEOUT_SEC = 90
HEALTHCHECK_INTERVAL_SEC = 1

STEP_TITLES = [
    "ساخت محیط مجازی (config)",
    "فعال‌سازی محیط مجازی",
    "نصب پکیج‌های بک‌اند و فرانت",
    "آماده‌سازی دیتابیس",
    "بالا آوردن هم‌زمان بک‌اند و فرانت",
]


class Cancelled(Exception):
    """برای خارج شدن تمیز از run() وقتی یه مرحله fatal شکست خورده."""


# ────────────────────────────────────────────────────────────────
# موتور اصلی — همه‌ی کار واقعی این‌جاست، در یک ترد پس‌زمینه اجرا می‌شه
# ────────────────────────────────────────────────────────────────
class Launcher:
    def __init__(self, out_queue: "queue.Queue"):
        self.q = out_queue
        self.env = os.environ.copy()
        self.backend_proc: subprocess.Popen | None = None
        self.frontend_proc: subprocess.Popen | None = None
        self.frontend_url: str | None = None  # از رو خروجی واقعی Vite تشخیص داده می‌شه
        self._stop = threading.Event()

    # ---- ارتباط با GUI ----
    def log(self, msg: str) -> None:
        line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
        try:
            LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
            with LOG_FILE.open("a", encoding="utf-8") as f:
                f.write(line + "\n")
        except OSError:
            pass  # نوشتن لاگ روی دیسک هیچ‌وقت نباید کل برنامه رو متوقف کنه
        self.q.put(("log", line))

    def set_step(self, idx: int, status: str) -> None:
        self.q.put(("step", idx, status))

    def fatal(self, idx: int, msg: str) -> None:
        self.log(f"❌ خطا: {msg}")
        self.set_step(idx, "error")
        self.q.put(("fatal", msg))
        raise Cancelled(msg)

    # ---- اجرای دستورها ----
    @staticmethod
    def _win_wrap(args: list[str]) -> list[str]:
        """
        روی ویندوز همه‌چیز رو از طریق cmd.exe اجرا می‌کنیم (cmd /c ...).
        این دقیقاً همون کاری‌ه که وقتی خودت توی Command Prompt تایپ می‌کنی
        اتفاق می‌افته، و برخلاف صدا زدن مستقیم npm.cmd، هیچ‌وقت با
        WinError 2 شکست نمی‌خوره.
        """
        if os.name == "nt":
            return ["cmd", "/c"] + args
        return args

    def _missing_dependencies(self, project_dir: Path) -> list[str]:
        """
        بعد از npm install، واقعاً روی دیسک چک می‌کنه که هر پکیجی که توی
        dependencies نوشته شده، پوشه‌ی متناظرش زیر node_modules هست یا نه.
        این دقیقاً همون چیزیه که «npm install بدون خطا تموم شد» تضمینش
        نمی‌کنه (مخصوصاً پشت OneDrive یا آنتی‌ویروس).
        """
        import json

        pkg_json = project_dir / "package.json"
        try:
            data = json.loads(pkg_json.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return []

        deps = list(data.get("dependencies", {}).keys())
        node_modules = project_dir / "node_modules"
        return [dep for dep in deps if not (node_modules / dep).is_dir()]

    @staticmethod
    def _diagnose_native_build_failure(output_lines: list[str]) -> str | None:
        """
        اگه خروجی نشون بده «npm install» به این خاطر شکست خورده که یه پکیج
        بومی (native/C++، مثل better-sqlite3) نه باینری از‌پیش‌کامپایل‌شده
        پیدا کرده و نه ابزار کامپایل (Visual Studio Build Tools) روی سیستم
        نصب بوده، یه پیام دقیق و قابل‌اقدام برمی‌گردونه؛ وگرنه None.

        نکته‌ی مهم (بعد از دیدن دو تا لاگ واقعی، یکی روی Node 26 و یکی روی
        Node 24 LTS): سوییچ‌کردن نسخه‌ی Node به‌تنهایی این مشکل رو حل نکرد،
        چون «No prebuilt binaries found» روی هر دو نسخه تکرار شد. یعنی
        مشکل اصلی احتمالاً دانلود prebuild از GitHub نیست (که به نسخه‌ی
        Node بستگی داره)، بلکه نبودِ کامل Visual Studio Build Tools هست —
        این تنها راهیه که مستقل از نسخه‌ی Node و مستقل از دسترسی به
        GitHub، همیشه کار می‌کنه. برای همین این‌جا اون رو راه‌حل اصلی
        گذاشتیم، نه جایگزین.
        """
        import re

        joined = "\n".join(output_lines)
        if "Could not find any Visual Studio installation" not in joined:
            return None
        if "No prebuilt binaries found" not in joined and "prebuild-install" not in joined:
            return None

        pkg_match = re.search(
            r"npm error path .*[\\/]node_modules[\\/]([^\\/\r\n]+)", joined
        )
        pkg_name = pkg_match.group(1) if pkg_match else "یکی از پکیج‌های بومی (native)"

        node_match = re.search(r"npm error gyp info using node@([^\s]+)", joined)
        node_ver = node_match.group(1) if node_match else None
        node_line = f" (نسخه‌ی نود روی سیستمت: {node_ver})" if node_ver else ""

        # اگه node.exe از یه مسیر با فاصله یا کاراکتر غیرانگلیسی اجرا شده،
        # این خودش می‌تونه یه منبع شکست جداگانه برای کامپایلرهای C++/node-gyp
        # باشه (حتی بعد از نصب Visual Studio) — پس جدا هشدار می‌دیم.
        path_match = re.search(r'npm error gyp ERR! command\s+"([^"]+)"', joined)
        bad_path_note = ""
        if path_match:
            # npm این مسیر رو با بک‌اسلش دوتایی (JSON-escaped) لاگ می‌کنه؛
            # برای نمایش تمیز به کاربر، تکی‌ش می‌کنیم.
            node_exe_path = path_match.group(1).replace("\\\\", "\\")
            has_space = " " in node_exe_path
            has_non_ascii = any(ord(ch) > 127 for ch in node_exe_path)
            if has_space or has_non_ascii:
                bad_path_note = (
                    "\n\n⚠️ یه نکته‌ی جداگانه هم دیدم: Node.js روی سیستمت از این مسیر اجرا "
                    f"می‌شه:\n  {node_exe_path}\n"
                    "این مسیر فاصله و/یا حروف غیرانگلیسی داره. ابزارهای کامپایل C++ (node-gyp، "
                    "Python، Visual Studio) روی ویندوز گاهی دقیقاً همین‌جوری مسیرها رو درست "
                    "تشخیص نمی‌دن و باز هم شکست می‌خورن، حتی بعد از نصب Visual Studio. اگه بعد "
                    "از نصب Visual Studio Build Tools باز هم همین ارور رو دیدی، بهتره Node.js "
                    "رو Uninstall کنی و دوباره توی یه مسیر ساده و بدون فاصله مثل C:\\nodejs "
                    "نصبش کنی (موقع نصب Node، مسیر پیش‌فرض رو عوض کن)."
                )

        return (
            f"پکیج «{pkg_name}» یه پکیج بومی (C++) هست: یا باید نسخه‌ی از‌پیش‌کامپایل‌شده‌ش "
            f"دانلود بشه، یا خودش روی سیستم تو کامپایل بشه.{node_line}\n"
            "این خطا به‌تنهایی به «نسخه‌ی Node قدیمی/جدیده» ربطی نداره — اگه این پیام رو بعد "
            "از عوض‌کردن نسخه‌ی Node هم دوباره می‌بینی، یعنی مشکل اصلی جای دیگه‌ایه: روی این "
            "سیستم اصلاً ابزار کامپایل C++ (Visual Studio Build Tools) نصب نیست، و دانلود "
            "باینری آماده هم (به هر دلیلی، مثلاً دسترسی به GitHub) جواب نداده.\n\n"
            "راه‌حل اصلی (این‌بار قطعی‌تره چون به نسخه‌ی Node یا اینترنت GitHub وابسته نیست):\n"
            "  ۱) از https://visualstudio.microsoft.com/visual-cpp-build-tools/ نصب‌کننده‌ی "
            "رایگان «Build Tools for Visual Studio» رو دانلود کن\n"
            "  ۲) موقع نصب، تیک «Desktop development with C++» رو بزن (تیک همین یکی کافیه)\n"
            "  ۳) بعد از تموم‌شدن نصب، ویندوز رو یه بار ری‌استارت کن\n"
            "  ۴) این launcher رو دوباره اجرا کن — این‌بار node-gyp خودش از رو سورس "
            "می‌سازتش و دیگه نیازی به دانلود از GitHub نداره\n\n"
            "نکته‌ی جانبی (بی‌ضرره ولی الزامی نیست): بهتره نسخه‌ی LTS نود رو نگه داری "
            "(نه نسخه‌ی Current) — از nodejs.org دکمه‌ی LTS. ولی همون‌طور که دیدیم، این "
            "به‌تنهایی مشکل رو حل نمی‌کنه؛ نصب Visual Studio Build Tools قدم اصلیه."
            f"{bad_path_note}"
        )

    def run_blocking(self, args: list[str], cwd: Path, step_idx: int, label: str) -> None:
        """یه دستور رو اجرا می‌کنه، خروجی زنده رو استریم می‌کنه، تا تموم شدنش صبر می‌کنه."""
        self.log(f"[{label}] $ {' '.join(args)}")
        try:
            proc = subprocess.Popen(
                self._win_wrap(args),
                cwd=str(cwd),
                env=self.env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                encoding="utf-8",
                errors="replace",
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
        except OSError as e:
            self.fatal(step_idx, f"اجرای «{' '.join(args)}» ممکن نشد: {e}")
            return

        assert proc.stdout is not None
        output_lines: list[str] = []
        for raw_line in proc.stdout:
            line = raw_line.rstrip("\n")
            if line:
                self.log(f"    {line}")
                output_lines.append(line)
        proc.wait()

        if proc.returncode != 0:
            specific = self._diagnose_native_build_failure(output_lines)
            if specific:
                self.fatal(step_idx, specific)
            else:
                self.fatal(
                    step_idx,
                    f"«{' '.join(args)}» با کد خروج {proc.returncode} شکست خورد "
                    f"(جزئیات توی لاگ بالا).",
                )

    def start_dev_server(self, cwd: Path, label: str) -> subprocess.Popen:
        proc = subprocess.Popen(
            self._win_wrap(["npm", "run", "dev"]),
            cwd=str(cwd),
            env=self.env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace",
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        threading.Thread(target=self._pump_output, args=(proc, label), daemon=True).start()
        return proc

    def _pump_output(self, proc: subprocess.Popen, label: str) -> None:
        assert proc.stdout is not None
        import re
        for raw_line in proc.stdout:
            line = raw_line.rstrip("\n")
            if line:
                self.log(f"[{label}] {line}")
                if label == "FRONTEND" and self.frontend_url is None:
                    # Vite دقیقاً پورتی که واقعاً روش بالا اومده رو این‌جا چاپ می‌کنه؛
                    # اگه پورت پیش‌فرض (5173) قبلاً توسط یه پراسس باقی‌مونده از اجرای
                    # قبلی اشغال باشه، Vite خودش بی‌صدا می‌ره سراغ پورت بعدی —
                    # برای همین به‌جای فرض‌کردن پورت ثابت، از رو همین خط واقعی می‌خونیمش.
                    m = re.search(r"Local:\s+(https?://[^\s/]+/?)", line)
                    if m:
                        self.frontend_url = m.group(1).rstrip("/") + "/"

    # ────────────────────────────────────────────────────────
    # مرحله‌ی ۱: ساخت محیط مجازی
    # ────────────────────────────────────────────────────────
    def step_venv(self) -> None:
        idx = 0
        self.set_step(idx, "running")
        venv_python = VENV_DIR / ("Scripts" if os.name == "nt" else "bin") / (
            "python.exe" if os.name == "nt" else "python"
        )
        if venv_python.exists():
            self.log("[رد شد] محیط مجازی «config» قبلاً ساخته شده.")
        else:
            self.log("[ساخت] در حال ساخت محیط مجازی در ./config ...")
            try:
                proc = subprocess.run(
                    [sys.executable, "-m", "venv", str(VENV_DIR)],
                    capture_output=True, text=True, encoding="utf-8", errors="replace",
                )
            except OSError as e:
                self.fatal(idx, f"اجرای «python -m venv» ممکن نشد: {e}")
                return
            if proc.returncode != 0:
                self.fatal(
                    idx,
                    "ساخت محیط مجازی شکست خورد:\n"
                    f"{proc.stdout}\n{proc.stderr}",
                )
                return
            self.log("✅ محیط مجازی ساخته شد.")
        self.set_step(idx, "done")

    # ────────────────────────────────────────────────────────
    # مرحله‌ی ۲: فعال‌سازی محیط مجازی
    # ────────────────────────────────────────────────────────
    def step_activate(self) -> None:
        idx = 1
        self.set_step(idx, "running")
        scripts_dir = VENV_DIR / ("Scripts" if os.name == "nt" else "bin")
        if not scripts_dir.exists():
            self.fatal(idx, f"پوشه‌ی «{scripts_dir}» پیدا نشد — محیط مجازی درست ساخته نشده.")
            return

        # معادل برنامه‌نویسی‌شده‌ی «.\config\Scripts\activate»: چون این پردازش‌ها
        # داخل یه شل تعاملی زنده نمی‌مونن، اثر activate رو با آپدیت PATH/
        # VIRTUAL_ENV برای همه‌ی زیرپردازش‌های بعدی (pip، npm، سرورها) شبیه‌سازی
        # می‌کنیم — دقیقاً همون کاری که activate.bat واقعی هم می‌کنه.
        env = os.environ.copy()
        env["VIRTUAL_ENV"] = str(VENV_DIR)
        env["PATH"] = str(scripts_dir) + os.pathsep + env.get("PATH", "")
        env.pop("PYTHONHOME", None)
        self.env = env

        self.log(f"✅ محیط مجازی فعال شد ({scripts_dir} به PATH اضافه شد).")
        self.set_step(idx, "done")

    # ────────────────────────────────────────────────────────
    # مرحله‌ی ۳: نصب پکیج‌ها
    # ────────────────────────────────────────────────────────
    def step_install(self) -> None:
        idx = 2
        self.set_step(idx, "running")

        # پکیج‌های پایتون — فقط اگه requirements.txt واقعاً چیزی برای نصب داشته باشه
        if REQUIREMENTS_FILE.exists():
            real_lines = [
                l for l in REQUIREMENTS_FILE.read_text(encoding="utf-8").splitlines()
                if l.strip() and not l.strip().startswith("#")
            ]
            if real_lines:
                pip_exe = VENV_DIR / ("Scripts" if os.name == "nt" else "bin") / (
                    "pip.exe" if os.name == "nt" else "pip"
                )
                self.log("[نصب] پکیج‌های پایتون از requirements.txt ...")
                self.run_blocking(
                    [str(pip_exe), "install", "-r", str(REQUIREMENTS_FILE)],
                    PROJECT_ROOT, idx, "PIP",
                )
            else:
                self.log("ℹ️ requirements.txt وابستگی واقعی نداره (پروژه Node.js هست) — رد شد.")

        if not shutil.which("node"):
            self.fatal(
                idx,
                "Node.js روی این سیستم پیدا نشد. از https://nodejs.org نسخه‌ی LTS رو "
                "نصب کن، سیستم رو ری‌استارت کن، و دوباره اجرا کن.",
            )
            return

        # همیشه npm install رو اجرا می‌کنیم، حتی اگه node_modules از قبل وجود
        # داشته باشه — چون «پوشه وجود داره» به معنی «نصب کامل و سالمه» نیست.
        # (دقیقاً همین فرض غلط باعث شد یه‌بار node_modules نصفه‌کاره از یه اجرای
        # قبلی باقی بمونه، مرحله‌ی بعدی رد بشه، و seed.js با خطای «bcryptjs
        # پیدا نشد» بترکه.) وقتی همه‌چیز از قبل درست نصب باشه، خود npm این رو
        # توی چند ثانیه با «up to date» تشخیص می‌ده و کاری انجام نمی‌ده — پس
        # هزینه‌ی همیشه اجرا کردنش ناچیزه، در مقابل امنیت خاطری که می‌ده زیاده.
        # همیشه npm install رو اجرا می‌کنیم، حتی اگه node_modules از قبل وجود
        # داشته باشه — چون «پوشه وجود داره» به معنی «نصب کامل و سالمه» نیست.
        # وقتی همه‌چیز از قبل درست نصب باشه، خود npm این رو توی چند ثانیه با
        # «up to date» تشخیص می‌ده — پس هزینه‌ی همیشه اجرا کردنش ناچیزه.
        #
        # روی این پروژه یه‌بار node_modules نصفه‌کاره از یه اجرای قبلی باقی
        # مونده بود؛ اما حتی بعد از این‌که همیشه npm install رو اجرا می‌کنیم،
        # ممکنه npm خودش با کد موفق (0) تموم بشه ولی بعضی پکیج‌ها واقعاً روی
        # دیسک نوشته نشده باشن — رایج‌ترین دلیلش وقتی پروژه داخل یه پوشه‌ی
        # sync‌شده با OneDrive باشه (مثلاً Downloads روی ویندوز ۱۱ که پیش‌فرض
        # OneDrive Backup روش فعاله) یا آنتی‌ویروس جلوی نوشتن بعضی فایل‌ها رو
        # بگیره. برای همین بعد از هر npm install واقعاً چک می‌کنیم که پکیج‌های
        # لیست‌شده توی package.json واقعاً روی دیسک هستن، و اگه نبودن، یه‌بار
        # node_modules رو کامل پاک و از نو نصب می‌کنیم.
        for name, d in (("بک‌اند", BACKEND_DIR), ("فرانت", FRONTEND_DIR)):
            if not d.exists():
                self.fatal(idx, f"پوشه‌ی {name} پیدا نشد: {d}")
                return

            self.log(f"[نصب] {name}: در حال اجرای «npm install» "
                     f"(اگه همه‌چیز از قبل نصب باشه چند ثانیه‌ای تموم می‌شه)...")
            self.run_blocking(["npm", "install"], d, idx, name.upper())

            missing = self._missing_dependencies(d)
            if missing:
                self.log(
                    f"⚠️ با این‌که «npm install» بدون خطا تموم شد، این پکیج‌های {name} "
                    f"روی دیسک پیدا نشدن: {', '.join(missing)}. احتمالاً چیزی (OneDrive/"
                    f"آنتی‌ویروس) جلوی نوشتن کامل فایل‌ها رو گرفته. یه نصب تمیز امتحان می‌کنیم..."
                )
                node_modules = d / "node_modules"
                if node_modules.exists():
                    shutil.rmtree(node_modules, ignore_errors=True)
                self.run_blocking(["npm", "install"], d, idx, name.upper())
                missing = self._missing_dependencies(d)
                if missing:
                    self.fatal(
                        idx,
                        f"حتی بعد از یه نصب کاملاً تمیز، این پکیج‌های {name} هنوز پیدا نمی‌شن: "
                        f"{', '.join(missing)}.\n"
                        f"محتمل‌ترین دلیل: پوشه‌ی پروژه داخل یه مسیر sync‌شده‌ست (OneDrive/"
                        f"Google Drive) یا آنتی‌ویروس جلوی نوشتن فایل رو می‌گیره.\n"
                        f"راه‌حل: کل پوشه‌ی «hesabyar» رو به یه مسیر ساده و sync‌نشده مثل "
                        f"C:\\hesabyar منتقل کن (نه داخل Downloads/OneDrive)، بعد دوباره اجرا کن.",
                    )
                    return

            self.log(f"✅ نصب {name} کامل و سالمه (پکیج‌ها روی دیسک تأیید شدن).")

        # فایل‌های .env رو اگه نبودن، از روی .env.example بساز
        for d in (BACKEND_DIR, FRONTEND_DIR):
            env_file = d / ".env"
            example = d / ".env.example"
            if not env_file.exists() and example.exists():
                shutil.copyfile(example, env_file)
                self.log(f"[ساخت شد] {d.name}/.env از روی .env.example.")

        self.set_step(idx, "done")

    # ────────────────────────────────────────────────────────
    # مرحله‌ی ۴: آماده‌سازی دیتابیس
    # ────────────────────────────────────────────────────────
    def step_db(self) -> None:
        idx = 3
        self.set_step(idx, "running")
        # این پروژه Django نیست، پس makemigrations/migrate به این شکل نداره:
        # جدول‌ها با CREATE TABLE IF NOT EXISTS همون لحظه‌ای که بک‌اند بالا میاد
        # ساخته می‌شن (src/db.js). معادل عملیِ «مهاجرت + seed» برای این پروژه
        # اجرای اسکریپت seed هست: هم db.js رو import می‌کنه (پس جدول‌ها ساخته
        # می‌شن) هم شرکت/کاربر/سوپرادمین پیش‌فرض رو می‌سازه — و کاملاً idempotent
        # است (اگه از قبل باشن، دوباره نمی‌سازه).
        self.log("[دیتابیس] در حال ساخت جدول‌ها + کاربر پیش‌فرض (npm run seed) ...")
        self.run_blocking(["npm", "run", "seed"], BACKEND_DIR, idx, "DB")
        self.log("✅ دیتابیس آماده شد.")
        self.set_step(idx, "done")

    # ────────────────────────────────────────────────────────
    # مرحله‌ی ۵: بالا آوردن هم‌زمان + health check + مرورگر
    # ────────────────────────────────────────────────────────
    def _wait_port(self, port: int, timeout: int) -> bool:
        deadline = time.time() + timeout
        while time.time() < deadline and not self._stop.is_set():
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                try:
                    s.connect(("127.0.0.1", port))
                    return True
                except OSError:
                    pass
            time.sleep(HEALTHCHECK_INTERVAL_SEC)
        return False

    def step_launch(self) -> None:
        idx = 4
        self.set_step(idx, "running")

        self.log("[شروع] در حال بالا آوردن بک‌اند ...")
        self.backend_proc = self.start_dev_server(BACKEND_DIR, "BACKEND")
        time.sleep(2)  # کمی فاصله تا لاگ‌های اولیه قاطی نشن
        self.log("[شروع] در حال بالا آوردن فرانت ...")
        self.frontend_proc = self.start_dev_server(FRONTEND_DIR, "FRONTEND")

        self.log(f"[Health Check] تا {HEALTHCHECK_TIMEOUT_SEC} ثانیه صبر می‌کنیم ...")
        backend_ok = self._wait_port(BACKEND_PORT, HEALTHCHECK_TIMEOUT_SEC)

        # به‌جای فرض‌کردن پورت ثابت ۵۱۷۳، صبر می‌کنیم تا از رو خروجی واقعی Vite
        # (خط «Local: http://localhost:PORT/») پورت واقعی رو تشخیص بدیم — چون اگه
        # یه پراسس باقی‌مونده از اجرای قبلی هنوز پورت پیش‌فرض رو نگه داشته باشه،
        # Vite بی‌صدا می‌ره سراغ پورت بعدی و اون آدرس هر بار عوض می‌شه.
        deadline = time.time() + HEALTHCHECK_TIMEOUT_SEC
        while time.time() < deadline and self.frontend_url is None and not self._stop.is_set():
            time.sleep(HEALTHCHECK_INTERVAL_SEC)
        frontend_ok = self.frontend_url is not None

        if not (backend_ok and frontend_ok):
            problems = []
            if not backend_ok:
                alive = self.backend_proc.poll() is None
                problems.append(
                    f"بک‌اند روی پورت {BACKEND_PORT} بالا نیومد"
                    + ("" if alive else f" (پراسس با کد {self.backend_proc.returncode} متوقف شد)")
                )
            if not frontend_ok:
                alive = self.frontend_proc.poll() is None
                problems.append(
                    "فرانت بالا نیومد"
                    + ("" if alive else f" (پراسس با کد {self.frontend_proc.returncode} متوقف شد)")
                )
            self.fatal(idx, " | ".join(problems) + " — لاگ بالا رو برای جزئیات ببین.")
            return

        self.log("🎉 هر دو سرویس بالا اومدن.")
        self.set_step(idx, "done")
        url = self.frontend_url
        self.log(f"[لینک] آدرس واقعی این اجرا: {url} — اگه بعداً دوباره باز کردیش و "
                 f"کار نکرد، همین‌جا (توی لاگ همون اجرا) دنبال آدرس درستش بگرد؛ "
                 f"چون اگه اجرای قبلی درست بسته نشده باشه ممکنه پورت عوض بشه.")
        self.q.put(("ready", url))
        try:
            webbrowser.open(url)
        except Exception:
            pass

    # ---- اجرای کامل ----
    def run(self) -> None:
        try:
            self.step_venv()
            self.step_activate()
            self.step_install()
            self.step_db()
            self.step_launch()
        except Cancelled:
            return
        except Exception as e:  # هیچ‌وقت نباید بی‌صدا کرش کنه
            self.log(f"❌ خطای غیرمنتظره: {e}")
            self.q.put(("fatal", str(e)))

    def stop_services(self) -> None:
        self._stop.set()
        for proc in (self.backend_proc, self.frontend_proc):
            if proc is None or proc.poll() is not None:
                continue
            try:
                if os.name == "nt":
                    # taskkill /T مهمه: npm از طریق cmd.exe اجرا شده، پس terminate()
                    # ساده فقط cmd.exe رو می‌بنده و node.exe زیرش زنده/آویزون می‌مونه.
                    # /T کل درخت پردازش رو می‌بنده.
                    subprocess.run(
                        ["taskkill", "/T", "/F", "/PID", str(proc.pid)],
                        capture_output=True,
                    )
                else:
                    proc.terminate()
            except Exception:
                pass


# ────────────────────────────────────────────────────────────────
# رابط گرافیکی (Tkinter)
# ────────────────────────────────────────────────────────────────
class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("حسابیار — راه‌انداز")
        self.geometry("760x580")
        self.minsize(640, 480)

        if os.name == "nt" and ICON_PATH.exists():
            try:
                self.iconbitmap(str(ICON_PATH))
            except Exception:
                pass

        self.q: "queue.Queue" = queue.Queue()
        self.frontend_url: str | None = None

        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except Exception:
            pass

        steps_frame = ttk.Frame(self, padding=14)
        steps_frame.pack(fill="x")
        self.step_status_labels: list[ttk.Label] = []
        for i, title in enumerate(STEP_TITLES):
            row = ttk.Frame(steps_frame)
            row.pack(fill="x", pady=3)
            status_lbl = ttk.Label(row, text="○", width=3, font=("Segoe UI", 12), anchor="center")
            status_lbl.pack(side="left")
            text_lbl = ttk.Label(
                row, text=f"{i + 1}. {title}", anchor="w", font=("Segoe UI", 11)
            )
            text_lbl.pack(side="left", fill="x", expand=True)
            self.step_status_labels.append(status_lbl)

        ttk.Separator(self).pack(fill="x", padx=14)

        self.log_box = scrolledtext.ScrolledText(
            self, height=18, font=("Consolas", 9), state="disabled", wrap="word"
        )
        self.log_box.pack(fill="both", expand=True, padx=14, pady=10)

        btns = ttk.Frame(self, padding=(14, 0, 14, 14))
        btns.pack(fill="x")
        self.open_btn = ttk.Button(
            btns, text="باز کردن حسابیار در مرورگر", command=self.open_browser, state="disabled"
        )
        self.open_btn.pack(side="left")
        self.retry_btn = ttk.Button(btns, text="تلاش دوباره", command=self.retry, state="disabled")
        self.retry_btn.pack(side="left", padx=8)
        ttk.Button(btns, text="خروج", command=self.on_close).pack(side="right")

        self.protocol("WM_DELETE_WINDOW", self.on_close)
        self.engine: Launcher | None = None
        self.after(100, self.poll_queue)
        self.start_run()

    def start_run(self) -> None:
        self.engine = Launcher(self.q)
        threading.Thread(target=self.engine.run, daemon=True).start()

    def append_log(self, text: str) -> None:
        self.log_box.configure(state="normal")
        self.log_box.insert("end", text + "\n")
        self.log_box.see("end")
        try:
            total_lines = int(self.log_box.index("end-1c").split(".")[0])
            if total_lines > 4000:
                self.log_box.delete("1.0", f"{total_lines - 3000}.0")
        except Exception:
            pass
        self.log_box.configure(state="disabled")

    def set_step_status(self, idx: int, status: str) -> None:
        icon = {"running": "⏳", "done": "✅", "error": "❌"}.get(status, "○")
        self.step_status_labels[idx].configure(text=icon)

    def poll_queue(self) -> None:
        try:
            while True:
                item = self.q.get_nowait()
                kind = item[0]
                if kind == "log":
                    self.append_log(item[1])
                elif kind == "step":
                    self.set_step_status(item[1], item[2])
                elif kind == "ready":
                    self.frontend_url = item[1]
                    self.open_btn.configure(state="normal")
                    self.title("حسابیار — در حال اجراست ✅")
                elif kind == "fatal":
                    self.retry_btn.configure(state="normal")
                    self.title("حسابیار — یه مشکلی پیش اومد ❌")
        except queue.Empty:
            pass
        self.after(150, self.poll_queue)

    def open_browser(self) -> None:
        if self.frontend_url:
            webbrowser.open(self.frontend_url)

    def retry(self) -> None:
        self.retry_btn.configure(state="disabled")
        self.open_btn.configure(state="disabled")
        for lbl in self.step_status_labels:
            lbl.configure(text="○")
        self.append_log("──────────── تلاش دوباره ────────────")
        self.title("حسابیار — راه‌انداز")
        self.start_run()

    def on_close(self) -> None:
        if self.engine is not None:
            self.engine.stop_services()
        self.destroy()


def main() -> None:
    if tk is None:
        print(
            "خطا: tkinter روی این نصب پایتون موجود نیست.\n"
            "پایتون رو از python.org با گزینه‌های پیش‌فرض (که شامل tkinter می‌شه) نصب کن."
        )
        sys.exit(1)
    LAUNCHER_DIR.mkdir(parents=True, exist_ok=True)
    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()
