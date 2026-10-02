# TechNext Marketing Hub

One page for the marketing team: every tool we use, with the links that matter.

**Live:** https://technextsg.github.io/technext-marketing-hub/ (noindex, internal)

| Page | What it is |
|---|---|
| `index.html` | The hub. Five tool cards (Presentations, Drip Studio, Business Cards, Website, Brand Guide) + "Also handy" rows. Cards render from the `APPS` array at the bottom of the file: add a tool there and it appears. |
| `branding.html` | The brand guide on one page: logo downloads, colours, type, words & claims, company facts, rules, templates. Replaces the old 8-page Brand Hub (`TechNextSG/technext-brand-hub`, now a redirect). |
| `nexi-studio.html` | Nexi Studio: conversation map, the full brain (every topic, keyword, reaction, follow-up), a test bench running the live matcher, a coverage run (95 visitor questions), a learnings queue with a hand-off brief, and the real 3D Nexi (moves, faces, storyboard, WebM recording at 16:9 / 9:16 / 1:1, green screen). |
| `assets/nexi/` | `brain.js` = GENERATED from TechNext-Website `assets/js/nexi-app.js` by `python tools/sync_nexi_brain.py [site-repo]` (re-run after every Nexi change on the site). `data.js` = coverage questions, proposed learnings, storyboard templates, motion library (edit freely). `nexi-core.js` + `three.min.js` = the 3D Nexi from the Nexi cute shorts renderer. `live-*.jpg` = screenshots of technext.asia/nexi#full. |
| `assets/hub.css` `assets/hub.js` | Shared styles (tokens copied from technext.asia `site.css`) and behaviour (card render, search `/`, copy buttons, scroll-spy). |
| `assets/logo/` | Transparent PNGs (renamed from the Drive's `1.png`..`6.png`), wide 1000x200 files, vector SVGs (from the business-card generator), Odoo Ready Partner badge. |
| `assets/img/` | 960x600 screenshots used on the cards. Re-capture with headless Chrome at 1440x900 when a tool's look changes. |
| `docs/` | Eight blank branded document templates as `.docx` + `.md`. Headings only; counsel reviews clause text. |

Deploys from `main` through `.github/workflows/pages.yml` (Actions, not the legacy builder).

Drive mirror: `Marketing \ 00. TechNext Folder \ TechNext Marketing Hub \` (opens from `file://` too). Local preview: `serve-technext-marketing-hub.bat` on port 3972.
