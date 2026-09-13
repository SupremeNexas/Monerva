from PIL import Image, ImageDraw, ImageFont


SOURCE_IMAGE = "/Users/supryo/Downloads/WhatsApp Image 2026-07-21 at 12.51.32 PM.jpeg"
OUTPUT_IMAGE = "/Users/supryo/Desktop/Expense-Tracker/docs/development/outputs/detailed_weekly_timetable.png"


WIDTH = 1600
HEIGHT = 760
LEFT_COL_W = 165
TIME_COL_W = 159
HEADER_H = 76
ROW_H = 86
TABLE_TOP = 48
TABLE_LEFT = 10


COLORS = {
    "navy": "#36475B",
    "grid": "#C7C7C7",
    "page": "#F8F8F8",
    "white": "#FFFFFF",
    "text": "#1F2937",
    "muted": "#4B5563",
    "lunch": "#E3E5E8",
    "break": "#E3E5E8",
    "BCT": "#B6D8F2",
    "IR": "#FDE89A",
    "ML": "#C9A9D8",
    "DF": "#F4B0AB",
    "BCT Lab": "#5EA8DC",
    "IOT Lab": "#58BD7F",
    "IOT": "#A8DDB9",
    "DF Lab": "#EF6B61",
    "ML Lab": "#A46AC0",
}


DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
TIMES = ["9-10:00", "10-11:00", "11-12:00", "12-1:00", "1-2:00", "2-3:00", "3-4:00", "4-5:00", "5-6:00"]


BLOCKS = [
    {"day": 0, "start": 2, "span": 1, "label": "BCT", "course_id": "20CP406T", "venue": "E203", "professor": "Utkarsh Gupta"},
    {"day": 0, "start": 3, "span": 1, "label": "IR", "course_id": "20CP417T", "venue": "E203", "professor": "Nandini Modi"},
    {"day": 0, "start": 4, "span": 1, "label": "Lunch", "course_id": "", "venue": "", "professor": ""},
    {"day": 1, "start": 2, "span": 1, "label": "ML", "course_id": "20CP401T", "venue": "F1-302", "professor": "Himanshu Gajera"},
    {"day": 1, "start": 3, "span": 1, "label": "DF", "course_id": "20CP411T", "venue": "E204", "professor": "Sujit Kumar Das"},
    {"day": 1, "start": 4, "span": 1, "label": "Lunch", "course_id": "", "venue": "", "professor": ""},
    {"day": 1, "start": 5, "span": 2, "label": "BCT Lab", "course_id": "20CP406P", "venue": "F-103", "professor": "Utkarsh Tiwari"},
    {"day": 2, "start": 0, "span": 2, "label": "IOT Lab", "course_id": "23CP403P", "venue": "E308", "professor": "Rajendra Choudhary"},
    {"day": 2, "start": 2, "span": 1, "label": "ML", "course_id": "20CP401T", "venue": "F1-304", "professor": "Himanshu Gajera"},
    {"day": 2, "start": 3, "span": 1, "label": "DF", "course_id": "20CP411T", "venue": "E204", "professor": "Sujit Kumar Das"},
    {"day": 2, "start": 4, "span": 1, "label": "Lunch", "course_id": "", "venue": "", "professor": ""},
    {"day": 2, "start": 5, "span": 1, "label": "Break", "course_id": "", "venue": "", "professor": ""},
    {"day": 2, "start": 6, "span": 1, "label": "IOT", "course_id": "23CP403T", "venue": "F1-302", "professor": "Rajendra Choudhary"},
    {"day": 3, "start": 2, "span": 1, "label": "BCT", "course_id": "20CP406T", "venue": "E203", "professor": "Utkarsh Gupta"},
    {"day": 3, "start": 3, "span": 1, "label": "IR", "course_id": "20CP417T", "venue": "E203", "professor": "Nandini Modi"},
    {"day": 3, "start": 4, "span": 1, "label": "Lunch", "course_id": "", "venue": "", "professor": ""},
    {"day": 3, "start": 5, "span": 2, "label": "DF Lab", "course_id": "20CP411P", "venue": "E309", "professor": "Aashka Raval"},
    {"day": 4, "start": 3, "span": 1, "label": "IR", "course_id": "20CP417T", "venue": "E203", "professor": "Nandini Modi"},
    {"day": 4, "start": 4, "span": 1, "label": "Lunch", "course_id": "", "venue": "", "professor": ""},
    {"day": 4, "start": 5, "span": 2, "label": "ML Lab", "course_id": "20CP401P", "venue": "E215 / F-203", "professor": "Chahat Gupta"},
]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica.ttc",
        "/System/Library/Fonts/SFNS.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def cell_bounds(day_index: int, start_col: int, span: int = 1):
    x0 = TABLE_LEFT + LEFT_COL_W + start_col * TIME_COL_W
    y0 = TABLE_TOP + HEADER_H + day_index * ROW_H
    x1 = x0 + TIME_COL_W * span
    y1 = y0 + ROW_H
    return x0, y0, x1, y1


def centered_text(draw, box, text, font, fill):
    x0, y0, x1, y1 = box
    bbox = draw.multiline_textbbox((0, 0), text, font=font, align="center", spacing=4)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = x0 + (x1 - x0 - tw) / 2
    y = y0 + (y1 - y0 - th) / 2
    draw.multiline_text((x, y), text, font=font, fill=fill, align="center", spacing=4)


def fit_multiline(draw, box, lines, fill, min_size=11, max_size=21, bold=False, spacing=3):
    x0, y0, x1, y1 = box
    available_w = (x1 - x0) - 12
    available_h = (y1 - y0) - 10
    for size in range(max_size, min_size - 1, -1):
        font = load_font(size, bold=bold)
        too_wide = False
        max_line_w = 0
        for line in lines:
            line_box = draw.textbbox((0, 0), line, font=font)
            max_line_w = max(max_line_w, line_box[2] - line_box[0])
        multi_box = draw.multiline_textbbox((0, 0), "\n".join(lines), font=font, align="center", spacing=spacing)
        total_h = multi_box[3] - multi_box[1]
        if max_line_w <= available_w and total_h <= available_h:
            centered_text(draw, box, "\n".join(lines), font, fill)
            return
    font = load_font(min_size, bold=bold)
    centered_text(draw, box, "\n".join(lines), font, fill)


def main():
    _ = Image.open(SOURCE_IMAGE)
    image = Image.new("RGB", (WIDTH, HEIGHT), COLORS["page"])
    draw = ImageDraw.Draw(image)

    title_font = load_font(30, bold=True)
    header_font = load_font(16, bold=True)
    day_font = load_font(17, bold=True)
    legend_font = load_font(14, bold=False)

    draw.text((WIDTH / 2, 20), "Weekly Class Timetable", font=title_font, fill=COLORS["text"], anchor="mm")

    draw.rectangle([TABLE_LEFT, TABLE_TOP, TABLE_LEFT + LEFT_COL_W, TABLE_TOP + HEADER_H], fill=COLORS["navy"], outline=COLORS["white"], width=1)
    centered_text(draw, (TABLE_LEFT, TABLE_TOP, TABLE_LEFT + LEFT_COL_W, TABLE_TOP + HEADER_H), "Day", header_font, COLORS["white"])

    for idx, time_label in enumerate(TIMES):
        x0 = TABLE_LEFT + LEFT_COL_W + idx * TIME_COL_W
        x1 = x0 + TIME_COL_W
        draw.rectangle([x0, TABLE_TOP, x1, TABLE_TOP + HEADER_H], fill=COLORS["navy"], outline=COLORS["white"], width=1)
        centered_text(draw, (x0, TABLE_TOP, x1, TABLE_TOP + HEADER_H), time_label, header_font, COLORS["white"])

    for day_idx, day in enumerate(DAYS):
        y0 = TABLE_TOP + HEADER_H + day_idx * ROW_H
        y1 = y0 + ROW_H
        draw.rectangle([TABLE_LEFT, y0, TABLE_LEFT + LEFT_COL_W, y1], fill=COLORS["navy"], outline=COLORS["white"], width=1)
        centered_text(draw, (TABLE_LEFT, y0, TABLE_LEFT + LEFT_COL_W, y1), day, day_font, COLORS["white"])
        for col_idx in range(len(TIMES)):
            x0 = TABLE_LEFT + LEFT_COL_W + col_idx * TIME_COL_W
            x1 = x0 + TIME_COL_W
            draw.rectangle([x0, y0, x1, y1], fill=COLORS["white"], outline=COLORS["grid"], width=1)

    for block in BLOCKS:
        box = cell_bounds(block["day"], block["start"], block["span"])
        color = COLORS.get(block["label"], COLORS["white"])
        outline = COLORS["grid"]
        draw.rectangle(box, fill=color, outline=outline, width=1)
        if block["label"] in {"Lunch", "Break"}:
            fit_multiline(draw, box, [block["label"]], COLORS["text"], min_size=13, max_size=19, bold=True)
        else:
            lines = [block["label"], block["course_id"], block["venue"], block["professor"]]
            fit_multiline(draw, box, lines, COLORS["text"], min_size=10, max_size=18, bold=False)

    legend = (
        "BCT = Blockchain Technology  |  IR = Information Retrieval  |  "
        "DF = Digital Forensics  |  IOT = Internet of Things  |  ML = Machine Learning"
    )
    draw.text((WIDTH / 2, 725), legend, font=legend_font, fill=COLORS["muted"], anchor="mm")

    image.save(OUTPUT_IMAGE, quality=95)


if __name__ == "__main__":
    main()
