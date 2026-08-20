#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
شورتکات‌ساز حسابیار (ویندوز)
==============================
یه برنامه‌ی کاملاً مجزا از لانچر اصلی. فقط یه کار می‌کنه: یه شورتکات به اسم
«حسابیار» با آیکون اختصاصی پروژه (assets/hesabyar.ico) روی دسکتاپ می‌سازه.

دوبار-کلیک روی همون شورتکات دقیقاً معادل اجرای hesabyar_launcher.py است —
یعنی همون پنج مرحله (ساخت/فعال‌سازی محیط مجازی، نصب پکیج‌ها، آماده‌سازی
دیتابیس، بالا آوردن هم‌زمان بک‌اند و فرانت) خودکار طی می‌شه.

اجرا (یه‌بار کافیه):
    python create_desktop_shortcut.py
(یا دوبار-کلیک روی Create-Desktop-Shortcut.bat کنار همین پروژه)
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

LAUNCHER_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = LAUNCHER_DIR.parent
LAUNCHER_SCRIPT = LAUNCHER_DIR / "hesabyar_launcher.py"
ICON_PATH = LAUNCHER_DIR / "assets" / "hesabyar.ico"
SHORTCUT_NAME = "حسابیار.lnk"


def ensure_dependencies() -> None:
    """winshell/pywin32 فقط برای ساخت شورتکات لازمن؛ اگه نبودن نصبشون می‌کنیم."""
    try:
        import winshell  # noqa: F401
        from win32com.client import Dispatch  # noqa: F401
        return
    except ImportError:
        pass
    print("در حال نصب پیش‌نیازهای شورتکات‌ساز (winshell, pywin32) ...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "--quiet", "winshell", "pywin32"]
    )
    if result.returncode != 0:
        print("⚠️  نصب پیش‌نیازها با pip شکست خورد؛ پایین‌تر دوباره امتحان می‌کنیم.")


def main() -> None:
    if os.name != "nt":
        print("این ابزار فقط روی ویندوز کار می‌کنه (شورتکات .lnk مخصوص ویندوزه).")
        sys.exit(1)

    if not LAUNCHER_SCRIPT.exists():
        print(f"❌ فایل لانچر پیدا نشد: {LAUNCHER_SCRIPT}")
        print("مطمئن شو این اسکریپت رو از داخل پوشه‌ی launcher/ اجرا می‌کنی.")
        sys.exit(1)

    ensure_dependencies()

    try:
        import winshell
        from win32com.client import Dispatch
    except ImportError as e:
        print(f"❌ نصب پیش‌نیازها ناموفق بود ({e}).")
        print("دستی امتحان کن: pip install winshell pywin32")
        sys.exit(1)

    desktop = Path(winshell.desktop())
    shortcut_path = desktop / SHORTCUT_NAME

    # اجرای بی‌صدا (بدون فلاش کنسول اضافه): اگه pythonw.exe کنار پایتون فعلی
    # پیدا بشه ازش استفاده می‌کنیم، وگرنه از همون python.exe فعلی.
    pythonw = Path(sys.executable).with_name("pythonw.exe")
    target = str(pythonw) if pythonw.exists() else sys.executable

    shell = Dispatch("WScript.Shell")
    shortcut = shell.CreateShortCut(str(shortcut_path))
    shortcut.Targetpath = target
    shortcut.Arguments = f'"{LAUNCHER_SCRIPT}"'
    # حیاتی: working directory باید ریشه‌ی پروژه باشه، وگرنه لانچر پوشه‌های
    # hesabyar-backend/hesabyar-frontend رو پیدا نمی‌کنه.
    shortcut.WorkingDirectory = str(PROJECT_ROOT)
    if ICON_PATH.exists():
        shortcut.IconLocation = str(ICON_PATH)
    else:
        print(f"⚠️  آیکون اختصاصی پیدا نشد ({ICON_PATH}) — از آیکون پیش‌فرض استفاده می‌شه.")
    shortcut.Description = "راه‌انداز حسابیار — پنج مرحله رو خودکار طی می‌کنه"
    shortcut.save()

    print(f"✅ شورتکات دسکتاپ ساخته شد: {shortcut_path}")
    print("از این به بعد فقط دوبار روی همون آیکون روی دسکتاپ کلیک کن.")


if __name__ == "__main__":
    main()
