# حسابیار - پنل مالی B2B

## پیش‌نیازها
- Node.js نسخه ۱۸ یا بالاتر
- npm یا yarn

## نصب و راه‌اندازی

```bash
# نصب dependencies
npm install

# اجرا در حالت توسعه
npm run dev

# build برای production
npm run build
```

بعد از `npm run dev` پنل روی `http://localhost:5173` در دسترسه.

## ساختار پروژه

```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx     ← shell اصلی (sidebar + topbar + content)
│   │   ├── Sidebar.jsx       ← منوی کناری
│   │   └── Topbar.jsx        ← نوار بالا
│   └── ui/
│       └── PlaceholderPage.jsx
├── pages/
│   └── Dashboard.jsx         ← صفحه داشبورد (کامل)
├── store/
│   └── appStore.js           ← Zustand store (زبان، sidebar)
├── i18n/
│   ├── index.js
│   └── locales/
│       ├── fa.json           ← ترجمه فارسی
│       └── en.json           ← ترجمه انگلیسی
├── router.jsx                ← تعریف مسیرها
├── App.jsx
├── main.jsx
└── index.css                 ← استایل‌های پایه + Tailwind
```

## Stack

| ابزار | نسخه | کاربرد |
|---|---|---|
| React | 18 | فریم‌ورک اصلی |
| Vite | 5 | bundler |
| Tailwind CSS | 3 | استایل‌دهی |
| React Router | 6 | مسیریابی |
| Recharts | 2 | نمودارها |
| i18next | 23 | دوزبانه FA/EN |
| Zustand | 4 | مدیریت state |
| Lucide React | - | آیکون‌ها |

## صفحات تکمیل‌شده

- [x] Layout اصلی (Sidebar + Topbar)
- [x] داشبورد
- [ ] فاکتورها
- [ ] پرداخت‌ها
- [ ] هزینه‌ها
- [ ] مشتریان
- [ ] کارمندان
- [ ] محصولات
- [ ] گزارشات
- [ ] تنظیمات
