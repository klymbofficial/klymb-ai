"""One-time conversion of app.klymb.ai's 60-day challenge content into klymb.ai's day format.

Usage: python3 -I convert_challenges.py <ABtalksapp/prisma/content> <klymb-ai/src/data/challenges>
"""
import html
import json
import math
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[2])

SLUGS = {"CLAUDE": "claude", "AI": "artificial-intelligence", "SE": "software-engineering", "DS": "data-science"}
SITE = "https://www.klymb.ai/challenges"

# Longest first, so a URL is replaced before the bare name inside it.
REBRAND = [
    (r"https?://(?:www\.)?linkedin\.com/company/abtalks-on-ai/?", SITE),
    (r"https?://(?:www\.)?abtalks\.in/?", SITE),
    (r"\babtalks\.in\b", "klymb.ai/challenges"),
    (r"@ABTalks(?:OnAI)?\b", "@Klymb.ai"),
    (r"#ABTalks\b", "#Klymb"),
    (r"\bABTalks\b", "Klymb"),
]


def rebrand(text):
    if not isinstance(text, str):
        return text
    for pattern, repl in REBRAND:
        text = re.sub(pattern, repl, text, flags=re.I)
    return text


def deep(v):
    if isinstance(v, str):
        return rebrand(v)
    if isinstance(v, list):
        return [deep(x) for x in v]
    if isinstance(v, dict):
        return {k: deep(x) for k, x in v.items()}
    return v


def resource(url):
    host = urlparse(url).netloc.removeprefix("www.")
    watch = "youtube.com" in host or "youtu.be" in host
    path = urlparse(url).path.strip("/").split("/")
    label = host + (f" · {path[-1][:40]}" if path and path[-1] else "")
    return {"kind": "watch" if watch else "read", "label": label, "url": url}


def first_line(md):
    for line in md.splitlines():
        line = re.sub(r"[*_`#>]", "", line).strip()
        if line and not line.lower().startswith("welcome to day"):
            return line[:240]
    return ""


def day_of(p):
    p = deep(p)
    c = p.get("dayContent") or {}
    task = c.get("task") or {}
    learning = c.get("learning") or {}
    tool = c.get("tool") or {}
    deliverable = (c.get("deliverable") or {}).get("description") or "Push today's work to your GitHub repository, post on LinkedIn, and submit both links."
    day = {
        "day": p["dayNumber"],
        "week": math.ceil(p["dayNumber"] / 7),
        "kind": "build",
        "title": re.sub(r"^Day\s*\d+\s*[:\-–]\s*", "", p["title"]).strip(),
        "mission": (c.get("tagline") or "") or first_line(p.get("problemStatement") or ""),
        "points": 10,
        "estimateMinutes": int(p.get("estimatedMinutes") or c.get("estimatedMinutes") or 45),
        "tags": list({t.lower(): t for t in [p.get("difficulty"), *(p.get("tags") or [])] if t and not re.fullmatch(r"day-?\d+|claude|ai|se|ds", t, re.I)}.values())[:4],
        "objectives": p.get("learningObjectives") or [],
        "concepts": [f"{b['label']}: {b['text']}" if b.get("label") else b.get("text", "") for b in learning.get("bullets") or []],
        "steps": task.get("steps") or [],
        # The day page renders this field as HTML (the career tracks use <code>), so it is escaped here.
        "deliverable": html.escape(deliverable),
        "reviewerChecks": "The link opens today's work in your repository, and your LinkedIn post about it is public.",
        "resources": [resource(u) for u in (p.get("resources") or []) if isinstance(u, str) and u.startswith("http")],
        "quiz": [],
        "brief": p.get("problemStatement") or "",
        "linkedinTemplate": p.get("linkedinTemplate") or "",
    }
    if c.get("promptTemplate"):
        day["prompt"] = c["promptTemplate"]
    if task.get("solutionVideoUrl"):
        day["video"] = task["solutionVideoUrl"]
    if tool.get("name"):
        day["tool"] = {"name": tool["name"], "description": tool.get("description", ""), **({"url": tool["url"]} if tool.get("url") else {})}
    if (c.get("engagement") or {}).get("description"):
        day["post"] = c["engagement"]["description"]
    return day


def quiz_of(q):
    q = deep(q)
    letters = "ABCD"
    return {
        "week": q["weekNumber"],
        "title": re.sub(r"^Week\s*\d+[^:]*:\s*", "", q["title"]).strip() or f"Week {q['weekNumber']}",
        "questions": [
            {
                "question": x["questionText"],
                "options": [x["optionA"], x["optionB"], x["optionC"], x["optionD"]],
                "answer": letters.index(x["correctAnswer"].strip().upper()[0]),
                "explanation": x.get("explanation", ""),
            }
            for x in sorted(q["questions"], key=lambda x: x["questionOrder"])
        ],
    }


problems = json.load(open(SRC / "problems.json")) + json.load(open(SRC / "claude-problems.json"))
quizzes = json.load(open(SRC / "quizzes.json")) + json.load(open(SRC / "claude-quizzes.json"))
OUT.mkdir(parents=True, exist_ok=True)

for domain, slug in SLUGS.items():
    days = sorted((day_of(p) for p in problems if p["domain"] == domain), key=lambda d: d["day"])
    qs = sorted((quiz_of(q) for q in quizzes if q["domain"] == domain), key=lambda q: q["week"])
    names = {q["week"]: q["title"] for q in qs}
    weeks = sorted({d["week"] for d in days})
    modules = []
    for w in weeks:
        in_week = [d["day"] for d in days if d["week"] == w]
        modules.append({"week": w, "name": names.get(w, f"Week {w}"), "days": f"Days {in_week[0]}–{in_week[-1]}", "summary": days[in_week[0] - 1]["title"] if days[in_week[0] - 1]["day"] == in_week[0] else ""})
    assert [d["day"] for d in days] == list(range(1, len(days) + 1)), f"{slug}: days not 1..n"
    text = json.dumps({"days": days, "modules": modules, "quizzes": qs}, ensure_ascii=False, indent=1)
    left = re.findall(r"abtalks|app\.klymb", text, re.I)
    assert not left, f"{slug}: branding left: {left[:5]}"
    (OUT / f"{slug}.json").write_text(text + "\n")
    print(slug, len(days), "days,", len(qs), "quizzes,", len(modules), "weeks")
