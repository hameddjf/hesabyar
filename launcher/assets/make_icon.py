from pathlib import Path
from PIL import Image, ImageDraw
import math

SIZE = 1024
bg = (15, 17, 46, 255)       # navy — همون --t-accent تم پیش‌فرض
white = (255, 255, 255, 255)
accent2 = (99, 102, 241, 255)  # بنفش ملایم برای یکی از قطاع‌ها (تنوع بصری)

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# پس‌زمینه‌ی مربع گردگوشه (سبک لوگوی سایدبار خود اپ)
radius = int(SIZE * 0.22)
d.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=radius, fill=bg)

# نمودار دایره‌ای سهام (همون الگوی صفحه‌ی شرکا) وسط آیکون، به‌رنگ سفید/بنفش روی navy
cx, cy = SIZE // 2, SIZE // 2
r = int(SIZE * 0.30)
ring_w = int(SIZE * 0.11)

def pie_slice(draw, cx, cy, r, start_deg, end_deg, fill):
    draw.pieslice([cx - r, cy - r, cx + r, cy + r], start_deg, end_deg, fill=fill)

# دو قطاع: ۶۵٪ سفید، ۳۵٪ بنفش — بعد یه دایره‌ی navy وسطش می‌کشیم تا حلقه بشه (donut)
pie_slice(d, cx, cy, r, -90, -90 + 0.65 * 360, white)
pie_slice(d, cx, cy, r, -90 + 0.65 * 360, 270, accent2)
d.ellipse([cx - r + ring_w, cy - r + ring_w, cx + r - ring_w, cy + r - ring_w], fill=bg)

sizes = [16, 24, 32, 48, 64, 128, 256]
out_dir = Path(__file__).resolve().parent
img.save(out_dir / "hesabyar.ico", sizes=[(s, s) for s in sizes])
img.resize((256, 256), Image.LANCZOS).save(out_dir / "hesabyar.png")
print("icon built in", out_dir)
