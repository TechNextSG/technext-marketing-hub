"""Compile the Claude Code skills into the hub's Skills page (skills.html).

Reads every ~/.claude/skills/<name>/SKILL.md (frontmatter + folder).
  - TechNext-made skills (OWN) are published in full: every text file is
    embedded for the in-page reader, and a zip is written to install from.
  - Third-party skills are listed with name, description, licence and source
    only. Their content stays on the machine (no redistribution).

    python tools/build_skills.py

Writes assets/skills/skills.js (window.SKILLS) and assets/skills/<own>.zip.
Re-run after every skill update, then commit only skills.html,
assets/skills/ and tools/build_skills.py (the hub clone is shared: explicit
git add, never -A).
"""
import datetime
import hashlib
import json
import pathlib
import re
import zipfile

HUB = pathlib.Path(__file__).resolve().parent.parent
SKILLS = pathlib.Path.home() / ".claude" / "skills"
OUT = HUB / "assets" / "skills"

# Skills TechNext wrote. Only these are published in full.
OWN = {"nexi-video", "technext-presentations"}

# How the page names one job of a TechNext skill ("10 steps per <unit>", the pipeline heading) and its art.
JOB = {
    "nexi-video": ("video", "How we make one video"),
    "technext-presentations": ("deck change", "How we change a deck"),
}
ART = {
    "nexi-video": ("assets/ads/nexi/nexi-present.webp", 1608, 1375),
    "technext-presentations": ("assets/img/skill-presentations.webp", 804, 688),
}

# Filter group per skill. New skills default to "design".
GROUP = {
    "nexi-video": "video",
    "technext-presentations": "decks",
    "impeccable": "design", "web-design-engineer": "design", "apple-design": "design",
    "emil-design-eng": "design", "pick-ui-library": "design", "prototype": "design",
    "animation-vocabulary": "motion", "find-animation-opportunities": "motion",
    "improve-animations": "motion", "review-animations": "motion",
}

# Where a third-party skill comes from, as its own files state it.
NOTE = {
    "apple-design": "Distilled from Apple's WWDC design talks.",
    "emil-design-eng": "Built on Emil Kowalski's design-engineering philosophy.",
    "find-animation-opportunities": "Built on Emil Kowalski's design-engineering philosophy.",
    "improve-animations": "Built on Emil Kowalski's design-engineering philosophy.",
    "review-animations": "Built on Emil Kowalski's design-engineering philosophy.",
    "pick-ui-library": "A curated, opinionated library list.",
    "prototype": "Builds UI variants behind a live picker.",
}

# Reading order for published skills; anything else follows alphabetically.
ORDER = ["SKILL.md", "reference/rules.md", "reference/content-rules.md", "reference/workflow.md", "reference/engine.md",
         "reference/build-and-ship.md", "reference/decks.md", "reference/recipes.md", "reference/design.md",
         "reference/qa-checklist.md", "reference/lessons.md", "reference/film-template.js"]
TEXT = {".md", ".js", ".py", ".json", ".txt", ".css", ".html", ".yml", ".yaml"}


def frontmatter(text):
    """Return (meta dict, body) for a SKILL.md with a --- YAML-ish header."""
    meta, body = {}, text
    m = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n?", text, re.S)
    if m:
        body = text[m.end():]
        for line in m.group(1).splitlines():
            k, sep, v = line.partition(":")
            if not sep or line[:1] in " \t#":
                continue
            v = v.strip()
            if len(v) > 1 and v[0] == v[-1] and v[0] in "\"'":
                v = v[1:-1]
            meta[k.strip()] = v
    return meta, body


def licence(folder, meta):
    if meta.get("license"):
        return meta["license"]
    lic = folder / "LICENSE"
    if lic.exists():
        head = lic.read_text(encoding="utf-8", errors="replace")[:400]
        if "Apache License" in head:
            return "Apache 2.0"
        if "MIT License" in head:
            return "MIT"
        return "See LICENSE"
    return ""


def homepage(folder):
    man = folder / "manifest.json"
    if man.exists():
        try:
            return json.loads(man.read_text(encoding="utf-8")).get("homepage", "")
        except ValueError:
            return ""
    return ""


def summary(body):
    """The first paragraph under the title: written for people, unlike the trigger description."""
    m = re.search(r"^# .*?\n\s*\n(.+?)(?:\n\s*\n|$)", body, re.S | re.M)
    if not m:
        return ""
    text = " ".join(m.group(1).split())
    return re.sub(r"\*\*([^*]*)\*\*", r"\1", re.sub(r"`([^`]*)`", r"\1", text))


def pipeline(body):
    """Top-level numbered steps under '## The pipeline': [{t, d}]."""
    m = re.search(r"^## The pipeline.*?$(.*?)(?=^## )", body, re.S | re.M)
    if not m:
        return []
    steps = []
    for s in re.finditer(r"^\d+\.\s+\*\*(.+?)\*\*\s*(.*)$", m.group(1), re.M):
        title = s.group(1).rstrip(".")
        rest = re.sub(r"`([^`]*)`", r"\1", s.group(2))
        rest = re.sub(r"\*\*([^*]*)\*\*", r"\1", rest)
        first = re.split(r"(?<=[.!?])\s", rest.strip(), maxsplit=1)[0]
        steps.append({"t": title, "d": first})
    return steps


def files_of(folder):
    out = [p for p in folder.rglob("*") if p.is_file() and "__pycache__" not in p.parts]
    rel = lambda p: p.relative_to(folder).as_posix()
    rank = {name: i for i, name in enumerate(ORDER)}
    return sorted(out, key=lambda p: (rank.get(rel(p), len(ORDER)), rel(p)))


def write_zip(name, folder, dest):
    """Deterministic zip (fixed timestamps, sorted) so unchanged skills give identical bytes."""
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(files_of(folder), key=lambda p: p.relative_to(folder).as_posix()):
            info = zipfile.ZipInfo(f"{name}/{p.relative_to(folder).as_posix()}", date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, p.read_bytes().replace(b"\r\n", b"\n"))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    skills = []
    for folder in sorted(p for p in SKILLS.iterdir() if (p / "SKILL.md").exists()):
        raw = (folder / "SKILL.md").read_text(encoding="utf-8", errors="replace")
        meta, body = frontmatter(raw)
        name = meta.get("name") or folder.name
        files = files_of(folder)
        newest = max(p.stat().st_mtime for p in files)
        own = folder.name in OWN
        manual = meta.get("disable-model-invocation", "").lower() == "true"
        s = {
            "id": folder.name,
            "name": name,
            "desc": meta.get("description", ""),
            "group": GROUP.get(folder.name, "design"),
            "own": own,
            "licence": "" if own else licence(folder, meta),
            "home": homepage(folder),
            "note": NOTE.get(folder.name, ""),
            "version": meta.get("version", ""),
            "invoke": "manual" if manual else "auto",
            "nfiles": len(files),
            "date": datetime.date.fromtimestamp(newest).isoformat(),
        }
        if own:
            docs = []
            for p in files:
                if p.suffix.lower() not in TEXT:
                    continue
                text = p.read_text(encoding="utf-8", errors="replace").replace("\r\n", "\n")
                rel = p.relative_to(folder).as_posix()
                if rel == "SKILL.md":
                    text = body.lstrip("\n").replace("\r\n", "\n")
                docs.append({"path": rel, "kind": "md" if p.suffix.lower() == ".md" else "code", "text": text})
            s["docs"] = docs
            s["summary"] = summary(body)
            s["steps"] = pipeline(body)
            lessons = folder / "reference" / "lessons.md"
            s["lessons"] = len(re.findall(r"^## ", lessons.read_text(encoding="utf-8"), re.M)) if lessons.exists() else 0
            s["unit"], s["pipe"] = JOB.get(folder.name, ("job", "How we do one job"))
            if folder.name in ART:
                s["art"] = dict(zip(("src", "w", "h"), ART[folder.name]))
            s["zip"] = f"assets/skills/{folder.name}.zip"
            write_zip(folder.name, folder, OUT / f"{folder.name}.zip")
        skills.append(s)

    skills.sort(key=lambda s: (not s["own"], s["group"] != "video", s["name"]))
    data = {"built": datetime.date.today().isoformat(), "skills": skills}
    js = ("/* Generated by tools/build_skills.py from ~/.claude/skills. Do not edit by hand. */\n"
          "window.SKILLS=" + json.dumps(data, ensure_ascii=True, separators=(",", ":")) + ";\n")
    (OUT / "skills.js").write_text(js, encoding="utf-8", newline="\n")
    # Cache-bust: GitHub Pages caches for 10 min, so stamp the data hash into the page.
    page = HUB / "skills.html"
    html = page.read_text(encoding="utf-8")
    ver = hashlib.md5(js.encode()).hexdigest()[:8]
    stamped = re.sub(r"assets/skills/skills\.js\?v=[0-9a-z]*", "assets/skills/skills.js?v=" + ver, html)
    if stamped != html:
        page.write_text(stamped, encoding="utf-8", newline="\n")
    own = [s["id"] for s in skills if s["own"]]
    print(f"{len(skills)} skills ({len(own)} published in full: {', '.join(own)}) -> {OUT.relative_to(HUB)}")


if __name__ == "__main__":
    main()
