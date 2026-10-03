"""Build ai-team.html: the TechNext AI marketing team, one section per employee with their skills by category, their
agentic-AI skill levels, daily routine, what they learn next and the skill log.

    python tools/build_ai_team.py

Source of truth: knowledge/team-skills.json in the AI Marketing Team folder (shared drive). Claude updates that file
whenever an agent learns something and re-runs this script; commit only ai-team.html, index.html and this script
(the hub clone is shared: explicit git add, never -A).
"""
import html
import json
import pathlib

HUB = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(r"G:\Shared drives\Marketing\00. TechNext Folder\23. AI Marketing Team\knowledge\team-skills.json")
OUT = HUB / "ai-team.html"
e = html.escape


def avatar(a, size=64):
    hat = ""
    if a["style"] == "beret":
        hat = '<ellipse cx="21" cy="10.5" rx="10" ry="4.2" fill="#5B2EA6"/>'
    elif a["style"] == "glasses":
        hat = '<circle cx="16.5" cy="20" r="2.8" fill="none" stroke="#1F1F3D" stroke-width="1"/><circle cx="23.5" cy="20" r="2.8" fill="none" stroke="#1F1F3D" stroke-width="1"/>'
    elif a["style"] == "headset":
        hat = '<path d="M10 20a10 10 0 0 1 20 0" stroke="#1F1F3D" stroke-width="1.6" fill="none"/><rect x="8" y="18" width="3.5" height="6" rx="1.5" fill="#1F1F3D"/>'
    return ('<svg class="av" width="%d" height="%d" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="%s"/>'
            '<circle cx="20" cy="21" r="10.5" fill="%s"/><path d="M9.6 18.5C10 11 14.5 8.6 20 8.6s10 2.4 10.4 9.9c-3-2.2-6.4-3.4-10.4-3.4S12.6 16.3 9.6 18.5z" fill="%s"/>'
            '<circle cx="16.5" cy="20.5" r="1.1" fill="#1F1F3D"/><circle cx="23.5" cy="20.5" r="1.1" fill="#1F1F3D"/>'
            '<path d="M17.5 24.5c1.5 1.3 3.5 1.3 5 0" stroke="#8A3B2E" stroke-width="1.2" fill="none" stroke-linecap="round"/>%s</svg>') % (
        size, size, a["color"], a["skin"], a["hair"], hat)


def meter(n):
    return '<span class="meter" role="img" aria-label="%d of 5">%s</span>' % (n, "".join('<i class="%s"></i>' % ("on" if i < n else "") for i in range(5)))


def build():
    d = json.loads(SRC.read_text(encoding="utf-8"))
    dims = d["dimensions"]
    agents = d["agents"]
    n_skills = sum(len(items) for a in agents for _, items in a["skills"])
    chips = "".join('<button class="chip" data-who="%s" aria-pressed="false">%s</button>' % (a["id"], e(a["name"])) for a in agents)
    cards = []
    for a in agents:
        lv = a["levels"]
        avg = sum(lv.values()) / len(lv)
        skills = "".join('<div class="cat"><h4>%s</h4><ul>%s</ul></div>' % (e(cat), "".join("<li>%s</li>" % e(x) for x in items)) for cat, items in a["skills"])
        levels = "".join('<li><span class="dn" title="%s">%s</span>%s</li>' % (e(desc), e(lab), meter(lv.get(k, 0))) for k, lab, desc in dims)
        daily = "".join('<li><b>%s</b>%s</li>' % (e(t), e(x)) for t, x in a["daily"])
        kpis = "".join('<li><b>%s</b>%s</li>' % (e(v), e(t)) for v, t in a["kpis"])
        nxt = "".join("<li>%s</li>" % e(x) for x in a["next"])
        hand = "".join("<li>%s</li>" % e(x) for x in a["handoffs"])
        cards.append("""
<article class="emp" id="%(id)s" data-who="%(id)s">
  <header class="ehead">
    %(av)s
    <div><span class="role">%(role)s</span><h3>%(name)s</h3><p>%(summary)s</p><ul class="kpis">%(kpis)s</ul></div>
    <div class="score" title="Average agentic AI level"><b>%(avg).1f</b><span>agentic AI<br>level of 5</span></div>
  </header>
  <div class="ebody">
    <div class="skills"><h4 class="lbl">Skills</h4><div class="cats">%(skills)s</div></div>
    <aside class="side">
      <div><h4 class="lbl">Agentic AI skills</h4><ul class="levels">%(levels)s</ul></div>
      <div><h4 class="lbl">Every day</h4><ul class="daily">%(daily)s</ul></div>
      <div><h4 class="lbl">Hands off to</h4><ul class="plain">%(hand)s</ul></div>
    </aside>
  </div>
  <footer class="efoot"><h4 class="lbl">Learning next</h4><ol class="next">%(nxt)s</ol></footer>
</article>""" % {"id": e(a["id"]), "av": avatar(a, 76), "role": e(a["role"]), "name": e(a["name"]), "summary": e(a["summary"]),
                 "kpis": kpis, "avg": avg, "skills": skills, "levels": levels, "daily": daily, "hand": hand, "nxt": nxt})
    names = {a["id"]: a["name"] for a in agents}
    log = "".join('<li data-who="%s"><time>%s</time><b>%s</b>%s</li>' % (e(w), e(day), e(names.get(w, "Whole team")), e(t)) for day, w, t in d["log"])
    loop = "".join("<li>%s</li>" % e(x) for x in d["loop"])
    page = TEMPLATE.replace("%%CHIPS%%", chips).replace("%%CARDS%%", "".join(cards)).replace("%%LOG%%", log).replace("%%LOOP%%", loop) \
        .replace("%%N_AGENTS%%", str(len(agents))).replace("%%N_SKILLS%%", str(n_skills)).replace("%%UPDATED%%", e(d["updated"]))
    OUT.write_text(page, encoding="utf-8", newline="\n")
    print("ai-team.html: %d agents, %d skills" % (len(agents), n_skills))


TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>AI Team &middot; TechNext Marketing Hub</title>
<meta name="description" content="TechNext's AI marketing team: Pixel the designer, Razel the lead researcher and Ralph the social media planner, with Pia (General Manager), Joy (HR) and Mika (front desk). What each one does every day, their skills by category, their agentic AI skill levels and what they learn next.">
<link rel="icon" type="image/png" href="assets/logo/technext-brandmark-blue.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600&family=Caveat:wght@700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/hub.css?v=6">
<style>
.hero .stats{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:18px;font-size:14px;color:var(--ink-3)}
.hero .stats b{color:var(--ink);font-family:var(--font-display);font-weight:800}
.emps{display:grid;gap:28px}
.emp{background:var(--card);border:1px solid var(--line);border-radius:22px;box-shadow:var(--shadow-md);overflow:clip;scroll-margin-top:80px}
.ehead{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:22px;align-items:center;padding:clamp(20px,3vw,34px);
  background:radial-gradient(120% 140% at 100% 0%,rgba(111,160,245,.22),transparent 55%),linear-gradient(160deg,#fff 30%,var(--blue-050))}
.ehead .av{border-radius:50%;box-shadow:0 10px 24px rgba(30,70,145,.18)}
.ehead .role{font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--blue-700)}
.ehead h3{font-size:clamp(28px,3.6vw,40px);font-weight:800;letter-spacing:-.03em;margin:2px 0 6px}
.ehead p{margin:0;color:var(--ink-2);font-size:16px;line-height:1.6;max-width:66ch}
.kpis{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 0;padding:0;list-style:none}
.kpis li{background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 12px;font-size:13px;color:var(--ink-3);line-height:1.3}
.kpis b{display:block;font-family:var(--font-display);font-size:18px;color:var(--ink);font-weight:800}
.score{text-align:center;background:#fff;border:1px solid var(--blue-100);border-radius:18px;padding:14px 16px;min-width:108px}
.score b{display:block;font-family:var(--font-display);font-size:34px;font-weight:800;color:var(--blue)}
.score span{font-size:12px;color:var(--ink-3);line-height:1.3}
.ebody{display:grid;grid-template-columns:minmax(0,1fr) 330px;border-top:1px solid var(--line)}
.skills{padding:clamp(18px,2.6vw,28px)}
.lbl{font-size:12.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--blue-700);margin:0 0 12px;font-family:var(--font-body)}
.cats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.cat{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:#fff}
.cat h4{margin:0 0 8px;font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--ink)}
.cat ul,.plain,.daily{margin:0;padding:0;list-style:none}
.cat li{position:relative;padding:5px 0 5px 18px;font-size:14.5px;line-height:1.45;color:var(--ink-2)}
.cat li::before{content:"";position:absolute;left:2px;top:12px;width:7px;height:7px;border-radius:2px;background:var(--blue)}
.side{padding:clamp(18px,2.6vw,28px);background:var(--bg);border-left:1px solid var(--line);display:grid;gap:22px;align-content:start}
.levels{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.levels li{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:14px;color:var(--ink-2)}
.dn{border-bottom:1px dotted var(--ink-3);cursor:help}
.meter{display:inline-flex;gap:3px}
.meter i{width:16px;height:8px;border-radius:3px;background:var(--line)}
.meter i.on{background:var(--blue)}
.daily li{display:flex;gap:10px;font-size:14px;line-height:1.45;color:var(--ink-2);padding:4px 0}
.daily b{font-family:var(--font-display);color:var(--ink);min-width:44px}
.plain li{font-size:14px;line-height:1.45;color:var(--ink-2);padding:4px 0}
.efoot{border-top:1px solid var(--line);padding:clamp(16px,2.4vw,24px) clamp(18px,2.6vw,28px)}
.next{margin:0;padding-left:20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:6px 24px}
.next li{font-size:14.5px;line-height:1.45;color:var(--ink-2)}
.loop,.log{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:clamp(18px,2.6vw,28px)}
.loop ol{margin:0;padding-left:20px;display:grid;gap:8px;font-size:15px;color:var(--ink-2)}
.log ul{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.log li{display:grid;grid-template-columns:96px 90px minmax(0,1fr);gap:12px;font-size:14.5px;color:var(--ink-2);align-items:baseline}
.log time{font-family:var(--font-display);font-weight:700;color:var(--ink-3);font-size:13px}
.log b{color:var(--ink)}
.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px}
.is-hidden{display:none!important}
@media (max-width:900px){.ebody{grid-template-columns:minmax(0,1fr)}.side{border-left:0;border-top:1px solid var(--line)}.two{grid-template-columns:minmax(0,1fr)}}
@media (max-width:640px){.ehead{grid-template-columns:minmax(0,1fr)}.ehead .av{width:60px;height:60px}.score{justify-self:start}.cats{grid-template-columns:minmax(0,1fr)}.log li{grid-template-columns:minmax(0,1fr)}}
</style>
</head>
<body>
<header class="top">
  <div class="wrap">
    <a class="brand" href="index.html"><img src="assets/logo/technext-wide-blue.png" alt="TechNext" width="150" height="30"><b>Marketing Hub</b></a>
    <nav class="nav" aria-label="Hub">
      <a href="index.html">Tools</a>
      <a href="branding.html">Brand guide</a>
      <a href="nexi-studio.html">Nexi Studio</a>
      <a href="paid-ads.html">Paid ads</a>
      <a href="skills.html">Skills</a>
      <a href="ai-team.html" aria-current="page">AI team</a>
      <a class="cta" href="https://technext.asia" target="_blank" rel="noopener">technext.asia</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="wrap">
    <span class="kicker"><i></i>Marketing team &middot; AI employees</span>
    <h1>The AI team, <em>skill by skill.</em></h1>
    <p>Who does what every day, the skills each AI employee has, how good they are at working on their own, and what they learn next. They get better every week: every note the owner sends back becomes a lesson.</p>
    <div class="stats"><span><b>%%N_AGENTS%%</b> AI employees</span><span><b>%%N_SKILLS%%</b> skills</span><span>Updated <b>%%UPDATED%%</b></span></div>
    <div class="chips" role="group" aria-label="Show one employee"><button class="chip" data-who="" aria-pressed="true">Everyone</button>%%CHIPS%%</div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="sec-head"><span class="n">1</span><h2>The team</h2><p>Skills grouped per employee. Hover a skill level to see what it means.</p></div>
    <div class="emps">%%CARDS%%
    </div>
  </div>
</section>

<section>
  <div class="wrap two">
    <div class="loop"><h4 class="lbl">How they get better</h4><ol>%%LOOP%%</ol></div>
    <div class="log"><h4 class="lbl">Skill log</h4><ul>%%LOG%%</ul></div>
  </div>
</section>

<footer>
  <div class="wrap">
    <span>TechNext Pte. Ltd. &middot; Marketing Hub &middot; internal use</span>
    <a href="index.html">All tools</a>
    <a href="https://github.com/TechNextSG/technext-marketing-hub" target="_blank" rel="noopener">Edit this page</a>
    <span class="right">Updated %%UPDATED%%</span>
  </div>
</footer>
<script>
(function () {
  var chips = document.querySelectorAll('.chip[data-who]'), emps = document.querySelectorAll('.emp, .log li');
  function show(who) {
    chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-who') === who ? 'true' : 'false'); });
    emps.forEach(function (x) { var w = x.getAttribute('data-who'); x.classList.toggle('is-hidden', !!who && w !== who && w !== 'team'); });
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { show(c.getAttribute('data-who')); history.replaceState(null, '', c.getAttribute('data-who') ? '#' + c.getAttribute('data-who') : location.pathname); }); });
  var h = location.hash.slice(1); if (h && document.getElementById(h)) show(h);
})();
</script>
</body>
</html>
"""

if __name__ == "__main__":
    build()
