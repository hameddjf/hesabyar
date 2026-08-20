# 📁 Features — ویژگی‌های خاص حسابیار

این پوشه شامل اسکریپت‌ها و ماژول‌های ویژه‌ای است که به صورت مجزا نگهداری می‌شوند.

## ساختار

```
features/
├── offline/          ← آفلاین مود
│   ├── offlineDB.js        IndexedDB wrapper
│   ├── useOffline.jsx      React hook + Provider
│   └── OfflineBadge.jsx    نشانگر آنلاین/آفلاین در topbar
│
├── holo/             ← یکپارچه‌سازی با هلو حسابداری
│   ├── holoSchema.js       نقشه‌برداری جداول هلو ↔ حسابیار
│   └── HoloManager.jsx     UI ورود/خروج داده هلو
│
└── README.md         ← این فایل
```

## آفلاین مود
- **Service Worker** (`/public/sw.js`): کش استراتژی + Background Sync
- **IndexedDB**: ذخیره محلی همه موجودیت‌ها
- **Sync Queue**: صف عملیات‌های آفلاین برای ارسال هنگام اتصال مجدد

## هلو
- **holoSchema.js**: نقشه‌برداری فیلدها، تبدیل‌گرها، تاریخ و واحد
- **HoloManager.jsx**: رابط کاربری drag & drop برای import/export
- **وضعیت**: فاز فرانت (UI) کامل — فاز بکند (parse واقعی Firebird) در مرحله بعد

### برای فاز بکند هلو نیاز داریم:
1. پسوند دقیق فایل بکاپ (.hlb یا .bak)
2. نسخه هلو (استاندارد / ۱ / ۲)
3. کتابخانه `node-firebird` برای parse
