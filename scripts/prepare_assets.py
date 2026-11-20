from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_LOGO = ROOT / "assets" / "zerospoil_logo.jpg"
PUBLIC_DIR = ROOT / "frontend" / "public"
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)


def make_transparent_white(img: Image.Image, threshold: int = 245) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.getdata()
    cleaned = []
    for r, g, b, a in pixels:
        if r >= threshold and g >= threshold and b >= threshold:
            cleaned.append((255, 255, 255, 0))
        else:
            cleaned.append((r, g, b, a))
    rgba.putdata(cleaned)
    return rgba


def main() -> None:
    if not SRC_LOGO.exists():
        raise FileNotFoundError(f"Place your logo at {SRC_LOGO} first.")

    img = Image.open(SRC_LOGO).convert("RGBA")
    w, h = img.size

    # 1. Save full horizontal master logo (transparent background)
    full_transparent = make_transparent_white(img)
    full_bbox = full_transparent.getbbox()
    if full_bbox:
        full_transparent = full_transparent.crop(full_bbox)
    full_transparent.save(PUBLIC_DIR / "zerospoil-logo.png", "PNG")
    full_transparent.save(ROOT / "assets" / "zerospoil_logo.png", "PNG")

    # 2. Crop strictly the left circular renewal-arrows + produce-crate emblem (~38.5% width)
    left_slice = img.crop((0, 0, int(w * 0.385), h))
    emblem = make_transparent_white(left_slice)
    bbox = emblem.getbbox()
    if bbox:
        emblem = emblem.crop(bbox)

    # Center onto a clean 1:1 square canvas with subtle padding
    side = max(emblem.size)
    pad = int(side * 0.08)
    canvas_size = side + pad * 2
    square = Image.new("RGBA", (canvas_size, canvas_size), (255, 255, 255, 0))
    offset = ((canvas_size - emblem.width) // 2, (canvas_size - emblem.height) // 2)
    square.paste(emblem, offset, emblem)

    # Export favicon variants directly into frontend/public/
    square.resize((64, 64), Image.Resampling.LANCZOS).save(PUBLIC_DIR / "favicon.png", "PNG")
    square.resize((180, 180), Image.Resampling.LANCZOS).save(PUBLIC_DIR / "apple-touch-icon.png", "PNG")
    square.save(
        PUBLIC_DIR / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    square.resize((128, 128), Image.Resampling.LANCZOS).save(ROOT / "assets" / "zerospoil_favicon.png", "PNG")

    print("Generated master logo and square emblem favicons in frontend/public/ and assets/.")


if __name__ == "__main__":
    main()