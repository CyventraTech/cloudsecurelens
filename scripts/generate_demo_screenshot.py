from pathlib import Path
import subprocess
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'Pillow'])
    from PIL import Image, ImageDraw, ImageFont

path = Path('public/demo-dashboard.png')
img = Image.new('RGB', (1280, 720), '#0f172a')
draw = ImageDraw.Draw(img)
font = None
for name in ['arial.ttf', 'DejaVuSans.ttf']:
    try:
        font = ImageFont.truetype(name, 36)
        break
    except Exception:
        font = None
if font is None:
    font = ImageFont.load_default()
text = 'Cloud SecureLens Screenshot Placeholder'
try:
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    w, h = right - left, bottom - top
except AttributeError:
    w, h = font.getsize(text)
draw.rectangle(((40, 40), (1240, 680)), outline='#334155', width=4)
draw.text(((1280 - w) / 2, 320), text, fill='#f8fafc', font=font)
img.save(path)
print('created', path)
