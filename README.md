# TechNext Marketing Hub

One page for the marketing team: every tool we use, with the links that matter.

**Live:** https://technextsg.github.io/technext-marketing-hub/ (noindex, internal)

| Page | What it is |
|---|---|
| `index.html` | The hub. Seven tool cards (Presentations, Drip Studio, Paid Ads Studio, Website, Nexi Studio, Branding Miscellaneous, Brand Guide) + "Also handy" rows. Cards render from the `APPS` array at the bottom of the file: add a tool there and it appears. |
| `branding.html` | The brand guide on one page: logo downloads, colours, type, words & claims, company facts, rules, templates. Replaces the old 8-page Brand Hub (`TechNextSG/technext-brand-hub`, now a redirect). |
| `nexi-studio.html` | Nexi Studio: conversation map, the full brain (every topic, keyword, reaction, follow-up), a test bench running the live matcher, a coverage run (95 visitor questions), a learnings queue with a hand-off brief, and the real 3D Nexi (moves, faces, storyboard, WebM recording at 16:9 / 9:16 / 1:1, green screen). |
| `paid-ads.html` | Paid Ads Studio: eleven campaigns starring Nexi (seven Odoo: one system, discovery, order-to-cash, procure-to-pay, make to order, month-end close, Odoo 20 apps) in every placement for Facebook, Instagram, LinkedIn, TikTok, X and YouTube, drawn on canvas at exact pixel sizes. Editor (saved per browser), feed mockups, ad copy with character limits, UTM links, PNG / ZIP / 8 s MP4 export, Nexi pose pack, spec sheet. |
| `assets/ads/` | `data.js` = campaigns, placements, copy fields, specs (edit freely; claims from the brand guide only). `render.js` = the canvas renderer (brand backgrounds as SVG, layouts for 9:16, 4:5, 1:1, 1.91:1 and 16:9, motion timeline). `ads.js` = page logic. `odoo/` = the official Odoo app icons, copied from TechNext-Website `assets/img/odoo` (names in `data.js` ODOO_APPS); used by the Odoo app row and the workflow strip (`Step|App` items). `nexi/` = the pose pack: WebP for the page, `png/` transparent PNGs, rendered from the real 3D Nexi with `~/ClaudeWork/qa/nexi-ads/render_poses.py`. |
| `assets/nexi/` | `brain.js` = GENERATED from TechNext-Website `assets/js/nexi-app.js` by `python tools/sync_nexi_brain.py [site-repo]` (re-run after every Nexi change on the site). `data.js` = coverage questions, proposed learnings, storyboard templates, motion library (edit freely). `nexi-core.js` + `three.min.js` = the 3D Nexi from the Nexi cute shorts renderer. `live-*.jpg` = screenshots of technext.asia/nexi#full. |
| `assets/hub.css` `assets/hub.js` | Shared styles (tokens copied from technext.asia `site.css`) and behaviour (card render, search `/`, copy buttons, scroll-spy). |
| `assets/logo/` | Transparent PNGs (renamed from the Drive's `1.png`..`6.png`), wide 1000x200 files, vector SVGs (from the business-card generator), Odoo Ready Partner badge. |
| `assets/img/` | 960x600 screenshots used on the cards. Re-capture with headless Chrome at 1440x900 when a tool's look changes. |
| `docs/` | Eight blank branded document templates as `.docx` + `.md`. Headings only; counsel reviews clause text. |

Deploys from `main` through `.github/workflows/pages.yml` (Actions, not the legacy builder).

Drive mirror: `Marketing \ 00. TechNext Folder \ TechNext Marketing Hub \` (opens from `file://` too). Local preview: `serve-technext-marketing-hub.bat` on port 3972.
