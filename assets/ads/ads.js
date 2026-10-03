/* Paid Ads Studio - page logic: campaign tabs, editor, platform mockups, copy fields, PNG / ZIP / video export. */
(function () {
  'use strict';
  var D = window.ADS, R = window.TNAds;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ------------------------------------------------------------ state (diffs against the defaults, per campaign) */
  var KEY = 'tn-paid-ads-v1', ST = {};
  try { ST = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { ST = {}; }
  ST.edits = ST.edits || {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) {} }
  var cur = Math.max(0, Math.min(D.CONCEPTS.length - 1, +ST.sel || 0));
  function concept(i) {
    var c = D.CONCEPTS[i], e = ST.edits[c.id] || {}, copy = {};
    Object.keys(c.copy).forEach(function (g) { copy[g] = Object.assign({}, c.copy[g], (e.copy || {})[g] || {}); });
    return { id: c.id, name: c.name, url: e.url || c.url, creative: Object.assign(clone(c.creative), e.creative || {}), copy: copy };
  }
  function edit(path, val) {
    var c = D.CONCEPTS[cur], e = ST.edits[c.id] || (ST.edits[c.id] = {});
    if (path[0] === 'url') { if (val === c.url) delete e.url; else e.url = val; }
    else if (path[0] === 'creative') {
      e.creative = e.creative || {};
      if (JSON.stringify(c.creative[path[1]]) === JSON.stringify(val)) delete e.creative[path[1]]; else e.creative[path[1]] = val;
    } else {
      e.copy = e.copy || {}; var g = e.copy[path[1]] = e.copy[path[1]] || {};
      if (c.copy[path[1]][path[2]] === val) delete g[path[2]]; else g[path[2]] = val;
    }
    save();
  }

  /* ------------------------------------------------------------ sizes */
  var SIZES = [], SIZE_AT = {};
  D.PLATFORMS.forEach(function (p) { p.placements.forEach(function (pl) { var k = pl.w + 'x' + pl.h; if (!SIZE_AT[k]) { SIZE_AT[k] = { k: k, w: pl.w, h: pl.h, label: pl.ratio + ' (' + pl.w + ' x ' + pl.h + ')' }; SIZES.push(SIZE_AT[k]); } }); });
  var COUNT_PL = D.PLATFORMS.reduce(function (n, p) { return n + p.placements.length; }, 0);

  function utm(c, pf, pl) {
    var u = c.url || 'https://technext.asia/', q = 'utm_source=' + pf.src + '&utm_medium=' + (pf.medium || 'paid_social') + '&utm_campaign=' + encodeURIComponent(c.id) + '&utm_content=' + encodeURIComponent(pl.id);
    return u + (u.indexOf('?') < 0 ? '?' : '&') + q;
  }
  function fileName(c, pf, pl, ext) { var d = new Date(), ym = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2); return 'TN_' + pf.id + '_' + c.id + '_' + pl.id + '_' + pl.w + 'x' + pl.h + '_' + ym + '.' + ext; }
  function download(blob, name) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
  }
  function flash(btn, txt) { var o = btn.getAttribute('data-label') || btn.textContent; btn.setAttribute('data-label', o); btn.textContent = txt; btn.classList.add('copied'); setTimeout(function () { btn.textContent = o; btn.classList.remove('copied'); }, 1400); }
  function copyText(t, btn) {
    function ok() { if (btn) flash(btn, 'Copied'); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(ok, fallback); else fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) {} ta.remove(); }
  }

  /* ------------------------------------------------------------ rendering */
  var CANV = {}, URLS = {}, token = 0, timer = 0;
  function canvasFor(k) { var s = SIZE_AT[k], cv = CANV[k] || (CANV[k] = document.createElement('canvas')); cv.width = s.w; cv.height = s.h; return cv; }
  function renderAll() {
    var my = ++token, sp = concept(cur).creative, flags = [];
    return SIZES.reduce(function (p, s) {
      return p.then(function () {
        if (my !== token) return;
        return R.prepare(sp, s.w, s.h).then(function (L) {
          if (my !== token) return;
          var cv = canvasFor(s.k); R.draw(cv.getContext('2d'), s.w, s.h, sp);
          L.flags.forEach(function (f) { flags.push(s.label + ': ' + f); });
          return new Promise(function (res) {
            cv.toBlob(function (b) {
              if (my === token && b) {
                if (URLS[s.k]) URL.revokeObjectURL(URLS[s.k]);
                URLS[s.k] = URL.createObjectURL(b);
                $$('img.cr[data-k="' + s.k + '"]').forEach(function (im) { im.src = URLS[s.k]; });
              }
              res();
            }, 'image/jpeg', 0.92);
          });
        });
      });
    }, Promise.resolve()).then(function () {
      if (my !== token) return;
      var w = $('#warn'); w.hidden = !flags.length;
      w.innerHTML = flags.length ? '<b>Check these sizes:</b><br>' + flags.map(esc).join('<br>') + '<br>Shorten the text, or it is fitted smaller.' : '';
      document.documentElement.setAttribute('data-ads-ready', String(my));
    });
  }
  function later() { clearTimeout(timer); timer = setTimeout(function () { renderAll(); thumb(cur); }, 220); }
  function pngBlob(k) {
    var s = SIZE_AT[k], sp = concept(cur).creative;
    return R.prepare(sp, s.w, s.h).then(function () { var cv = canvasFor(k); R.draw(cv.getContext('2d'), s.w, s.h, sp); return new Promise(function (res) { cv.toBlob(res, 'image/png'); }); });
  }
  function thumb(i) {
    var cvs = $('#concepts canvas[data-i="' + i + '"]'); if (!cvs) return;
    var sp = concept(i).creative;
    R.prepare(sp, 360, 360).then(function () {
      var big = document.createElement('canvas'); big.width = big.height = 360; R.draw(big.getContext('2d'), 360, 360, sp);
      var g = cvs.getContext('2d'); g.clearRect(0, 0, cvs.width, cvs.height); g.drawImage(big, 0, 0, cvs.width, cvs.height);
    });
  }

  /* ------------------------------------------------------------ icons for the mockups */
  var SV = {
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/></svg>',
    comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M22 3L9.2 13.2M22 3l-7 18-4-8-8-4z"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M14 4l7 7-7 7v-4c-6 0-9 2-11 6 0-7 4-11 11-12z"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
    up: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg>'
  };
  var AV = '<span class="av"><img src="assets/logo/technext-brandmark-blue.png" alt=""></span>';
  var PF_COL = { facebook: '#0866FF', instagram: '#D62976', linkedin: '#0A66C2', tiktok: '#111111', x: '#111111', youtube: '#FF0033' };
  function head(name, sub, globe) { return '<div class="hd">' + AV + '<div><b>' + name + '</b><small>' + sub + (globe ? ' &middot; ' + SV.globe : '') + '</small></div></div>'; }

  function mock(pf, pl) {
    var k = pl.w + 'x' + pl.h, img = '<img class="cr" data-k="' + k + '" alt="' + esc(pf.name + ' ' + pl.name + ' creative') + '" width="' + pl.w + '" height="' + pl.h + '">';
    var G = pf.group;
    switch (pl.mock) {
      case 'fb-feed':
        return '<div class="mk fb">' + head('TechNext', 'Sponsored', true) + '<p class="tx" data-bind="meta.primary"></p>' + img
          + '<div class="linkbar"><div><small>technext.asia</small><b data-bind="meta.headline"></b><span data-bind="meta.desc"></span></div><span class="mbtn" data-bind="meta.cta"></span></div>'
          + '<div class="acts"><span>Like</span><span>Comment</span><span>Share</span></div></div>';
      case 'ig-feed':
        return '<div class="mk ig">' + head('technext.asia', 'Sponsored') + img + '<div class="igcta"><span data-bind="meta.cta"></span>' + SV.chev + '</div>'
          + '<div class="icons">' + SV.heart + SV.comment + SV.send + '<span class="r">' + SV.save + '</span></div><p class="cap"><b>technext.asia</b> <span data-bind="meta.primary"></span></p></div>';
      case 'story':
        return '<div class="mk full story">' + img + '<div class="ov"><div class="top"><div class="bars"><i></i><i></i><i></i></div><div class="who">' + AV + '<span>TechNext<br><small>Sponsored</small></span></div></div>'
          + '<div class="bot"><span class="pill">' + SV.up + '<span data-bind="meta.cta"></span></span></div></div></div>';
      case 'reel':
        var tx = G === 'youtube' ? 'youtube.long' : 'meta.primary';
        return '<div class="mk full reel">' + img + '<div class="ov"><div class="rail">' + SV.heart + SV.comment + SV.send + SV.more + '</div>'
          + '<div class="caption"><b>' + (G === 'youtube' ? '@TechNext' : 'technext.asia') + '</b><p data-bind="' + tx + '"></p><span class="spons">Sponsored</span><span class="wide-cta" data-bind="' + G + '.cta"></span></div></div></div>';
      case 'tiktok':
        return '<div class="mk full tt">' + img + '<div class="ov"><div class="rail">' + AV + SV.heart + SV.comment + SV.save + SV.share + '</div>'
          + '<div class="caption"><b>TechNext</b><p data-bind="tiktok.text"></p><span class="spons">Sponsored</span><span class="wide-cta" data-bind="tiktok.cta"></span></div></div></div>';
      case 'li-feed':
        return '<div class="mk li">' + head('TechNext', 'Promoted') + '<p class="tx" data-bind="linkedin.intro"></p>' + img
          + '<div class="linkbar"><div><b data-bind="linkedin.headline"></b><span>technext.asia</span></div><span class="mbtn" data-bind="linkedin.cta"></span></div>'
          + '<div class="acts"><span>Like</span><span>Comment</span><span>Repost</span><span>Send</span></div></div>';
      case 'x-post':
        var card = pl.w / pl.h > 1.3;
        return '<div class="mk x"><div class="xbody">' + AV + '<div class="xn"><b>TechNext</b> <span>technext.asia &middot; Ad</span></div><p class="tx" data-bind="x.text"></p>'
          + '<div class="xcard">' + img + (card ? '<span class="dom">technext.asia</span>' : '') + '</div>'
          + (card ? '<div class="xfrom">From technext.asia<b data-bind="x.headline"></b></div>' : '') + '</div></div>';
      case 'yt-player':
        return '<div class="mk full yt">' + img + '<div class="ov"><div class="yt-l">' + AV + '<span><small>Sponsored &middot; technext.asia</small><span class="yt-cta" data-bind="youtube.cta"></span></span></div>'
          + '<span class="skip">Skip</span><div class="prog"><i></i></div></div></div>';
    }
    return '<div class="mk">' + img + '</div>';
  }

  function fieldHTML(g, f, val) {
    var key = f[0], max = f[2], multi = f[3], opts = f[4], id = 'cf-' + g + '-' + key, input;
    if (opts) {
      var list = opts.split('|'); if (list.indexOf(val) < 0) list.unshift(val);
      input = '<select id="' + id + '" data-g="' + g + '" data-f="' + key + '">' + list.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
    } else if (multi) input = '<textarea id="' + id + '" data-g="' + g + '" data-f="' + key + '" rows="3">' + esc(val) + '</textarea>';
    else input = '<input id="' + id + '" data-g="' + g + '" data-f="' + key + '" value="' + esc(val) + '">';
    return '<div class="cf"><label class="f" for="' + id + '"><span>' + f[1] + '</span>' + input + '</label>'
      + (max ? '<span class="cnt" data-cnt="' + g + '.' + key + '" data-max="' + max + '"></span>' : '')
      + '<button class="btn sm" type="button" data-copy="' + g + '.' + key + '">Copy</button></div>';
  }

  function buildBoards() {
    var c = concept(cur), html = '';
    D.PLATFORMS.forEach(function (pf) {
      html += '<article class="pf" id="' + pf.id + '" data-pf="' + pf.id + '"><div class="pf-hd"><span class="pf-dot" style="background:' + PF_COL[pf.id] + '"></span><h3>' + pf.name + '</h3><span>'
        + pf.placements.length + ' placement' + (pf.placements.length > 1 ? 's' : '') + ' &middot; ' + D.GROUP_NAMES[pf.group] + '</span></div><div class="mocks">';
      pf.placements.forEach(function (pl) {
        html += '<div class="pl' + (pl.w / pl.h > 1.2 ? ' wide' : '') + '" data-pf="' + pf.id + '" data-pl="' + pl.id + '">' + mock(pf, pl)
          + '<div class="pl-meta"><b>' + pl.name + '<small>' + pl.ratio + ' &middot; ' + pl.w + ' &times; ' + pl.h + '</small></b>'
          + '<button class="btn sm" type="button" data-act="png" title="Download ' + pl.w + ' x ' + pl.h + ' PNG">PNG</button>'
          + (pl.motion ? '<button class="btn sm" type="button" data-act="video" title="8-second animated version">Video</button>' : '')
          + '<button class="btn sm" type="button" data-act="link" title="Copy the landing page link with tracking">Link</button></div></div>';
      });
      html += '</div><div class="copy"><h4>Ad copy for ' + D.GROUP_NAMES[pf.group] + '</h4><div class="copy-grid">'
        + D.FIELDS[pf.group].map(function (f) { return fieldHTML(pf.group, f, c.copy[pf.group][f[0]]); }).join('') + '</div>'
        + '<div class="link-row"><code data-link="' + pf.id + '"></code><button class="btn sm" type="button" data-copylink="' + pf.id + '">Copy link</button></div></div></article>';
    });
    $('#boards').innerHTML = html;
    bindAll(); filter();
    $$('img.cr').forEach(function (im) { var k = im.getAttribute('data-k'); if (URLS[k]) im.src = URLS[k]; });
  }
  function bindAll() {
    var c = concept(cur);
    $$('[data-bind]').forEach(function (el) { var p = el.getAttribute('data-bind').split('.'); el.textContent = (c.copy[p[0]] || {})[p[1]] || ''; });
    $$('[data-cnt]').forEach(function (el) {
      var p = el.getAttribute('data-cnt').split('.'), v = (c.copy[p[0]] || {})[p[1]] || '', max = +el.getAttribute('data-max');
      el.textContent = v.length + ' / ' + max; el.classList.toggle('over', v.length > max);
    });
    $$('[data-link]').forEach(function (el) { var pf = D.PLATFORMS.filter(function (p) { return p.id === el.getAttribute('data-link'); })[0]; el.textContent = utm(c, pf, pf.placements[0]); });
  }
  function filter() {
    var f = ST.pf || 'all';
    $$('#boards .pf').forEach(function (a) { a.hidden = f !== 'all' && a.getAttribute('data-pf') !== f; });
    $$('#pf-chips .chip').forEach(function (ch) { ch.setAttribute('aria-pressed', String(ch.getAttribute('data-pf') === f)); });
  }

  /* ------------------------------------------------------------ editor */
  function fillEditor() {
    var c = concept(cur), cr = c.creative;
    $('#ed-name').textContent = c.name;
    ['kicker', 'headline', 'sub', 'cta', 'bubble', 'bubble2'].forEach(function (k) { $('#f-' + k).value = cr[k] || ''; });
    $('#f-pose2').value = cr.pose2 || ''; $('#f-prop').value = cr.prop || 'none';
    $('#f-items').value = (cr.items || []).join('\n'); $('#f-badge').checked = !!cr.badge; $('#f-url').value = c.url;
    $$('#f-bg button').forEach(function (bt) { bt.setAttribute('aria-checked', String(bt.getAttribute('data-v') === cr.bg)); });
    $$('#f-pose button').forEach(function (bt) { bt.setAttribute('aria-checked', String(bt.getAttribute('data-v') === cr.pose)); });
    $('#pose-name').textContent = D.POSE_NAMES[cr.pose] || '';
    propUI(cr.prop);
    $$('#concepts .concept').forEach(function (bt, i) { bt.setAttribute('aria-selected', String(i === cur)); bt.tabIndex = i === cur ? 0 : -1; });
  }
  var HINT = { flow: 'one step per line: Step|Odoo app, up to 6', apps: 'one Odoo app per line, up to 8', stats: 'figures as 10+|countries',
    chat: 'customer line, then the reply', sheets: 'crossed-out files, last line = the fix', checks: 'one per line', site: 'chat widget greeting' };
  function propUI(prop) { $('#items-hint').textContent = HINT[prop] || 'one per line'; $('#apppick-wrap').hidden = prop !== 'flow' && prop !== 'apps'; }
  function setupEditor() {
    $('#f-bg').innerHTML = D.BACKGROUNDS.map(function (bg) { return '<button type="button" role="radio" data-v="' + bg.id + '" title="' + esc(bg.note) + '"><i class="bg-' + bg.id + '"></i><span>' + bg.name + '</span></button>'; }).join('');
    var poses = Object.keys(D.POSES);
    $('#f-pose').innerHTML = poses.map(function (p) { return '<button type="button" role="radio" data-v="' + p + '" title="' + esc(D.POSE_NAMES[p]) + '"><img src="' + R.poseSrc(p) + '" alt="' + esc(D.POSE_NAMES[p]) + '" loading="lazy"></button>'; }).join('');
    $('#f-pose2').innerHTML = '<option value="">None (one pose)</option>' + poses.map(function (p) { return '<option value="' + p + '">' + esc(D.POSE_NAMES[p]) + '</option>'; }).join('');
    $('#f-prop').innerHTML = D.PROPS.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('');
    $('#apppick').innerHTML = Object.keys(D.ODOO_APPS).map(function (n) { return '<button type="button" data-app="' + esc(n) + '" title="Add ' + esc(n) + '"><img src="' + R.appSrc(D.ODOO_APPS[n]) + '" alt="' + esc(n) + '" loading="lazy"></button>'; }).join('');
    $('#apppick').addEventListener('click', function (e) {
      var bt = e.target.closest('button'); if (!bt) return;
      var ta = $('#f-items'), app = bt.getAttribute('data-app'), line = $('#f-prop').value === 'flow' ? 'Step|' + app : app;
      ta.value = ta.value.replace(/\s+$/, '') + (ta.value.trim() ? '\n' : '') + line; ta.dispatchEvent(new Event('input', { bubbles: true }));
    });
    $('#editor').addEventListener('input', function (e) {
      var t = e.target, k = t.getAttribute('data-k');
      if (k) { edit(['creative', k], t.value); if (k === 'prop') propUI(t.value); }
      else if (t.id === 'f-items') edit(['creative', 'items'], t.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean));
      else if (t.id === 'f-badge') edit(['creative', 'badge'], t.checked);
      else if (t.id === 'f-url') { edit(['url'], t.value.trim()); bindAll(); return; }
      else return;
      later();
    });
    $('#editor').addEventListener('change', function (e) { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') e.target.dispatchEvent(new Event('input', { bubbles: true })); });
    $('#f-bg').addEventListener('click', function (e) { var bt = e.target.closest('button'); if (!bt) return; edit(['creative', 'bg'], bt.getAttribute('data-v')); fillEditor(); later(); });
    $('#f-pose').addEventListener('click', function (e) { var bt = e.target.closest('button'); if (!bt) return; edit(['creative', 'pose'], bt.getAttribute('data-v')); fillEditor(); later(); });
    $('#ed-reset').addEventListener('click', function () { delete ST.edits[D.CONCEPTS[cur].id]; save(); fillEditor(); buildBoards(); renderAll(); thumb(cur); });
  }

  /* ------------------------------------------------------------ campaign tabs */
  function setupConcepts() {
    /* consecutive campaigns of one group share a labelled row */
    var GROUPS = { odoo: 'Odoo ERP', ai: 'AI, web and company' }, html = '', lastG = null;
    D.CONCEPTS.forEach(function (c, i) {
      if (c.group !== lastG) { html += (lastG === null ? '' : '</div></div>') + '<div class="cgroup"><span class="cg-h">' + esc(GROUPS[c.group] || '') + '</span><div class="cg-row">'; lastG = c.group; }
      html += '<button class="concept" type="button" role="tab" data-i="' + i + '"><canvas width="144" height="144" data-i="' + i + '"></canvas><span><b>' + esc(c.name) + '</b><small>' + esc(c.creative.kicker) + '</small></span></button>';
    });
    $('#concepts').innerHTML = html + '</div></div>';
    $('#concepts').addEventListener('click', function (e) { var bt = e.target.closest('.concept'); if (bt) select(+bt.getAttribute('data-i')); });
    $('#concepts').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var n = (cur + (e.key === 'ArrowRight' ? 1 : -1) + D.CONCEPTS.length) % D.CONCEPTS.length; select(n); $$('#concepts .concept')[n].focus();
    });
  }
  function select(i) { cur = i; ST.sel = i; save(); fillEditor(); buildBoards(); renderAll(); }

  /* ------------------------------------------------------------ board actions */
  function findPl(el) {
    var box = el.closest('.pl'); if (!box) return null;
    var pf = D.PLATFORMS.filter(function (p) { return p.id === box.getAttribute('data-pf'); })[0];
    return { pf: pf, pl: pf.placements.filter(function (p) { return p.id === box.getAttribute('data-pl'); })[0] };
  }
  function setupBoards() {
    $('#pf-chips').innerHTML = '<button class="chip" type="button" data-pf="all">All platforms</button>' + D.PLATFORMS.map(function (p) { return '<button class="chip" type="button" data-pf="' + p.id + '">' + p.name + '</button>'; }).join('');
    $('#pf-chips').addEventListener('click', function (e) { var ch = e.target.closest('.chip'); if (!ch) return; ST.pf = ch.getAttribute('data-pf'); save(); filter(); });
    $$('.subnav a').forEach(function (a) { a.addEventListener('click', function () { if (ST.pf && ST.pf !== 'all') { ST.pf = 'all'; filter(); } }); });
    $('#ui-toggle').addEventListener('change', function () { $('#boards').classList.toggle('ui-off', !this.checked); });
    $('#boards').addEventListener('click', function (e) {
      var bt = e.target.closest('button'); if (!bt) return;
      var c = concept(cur), act = bt.getAttribute('data-act');
      if (act) {
        var x = findPl(bt); if (!x) return;
        if (act === 'png') { bt.disabled = true; pngBlob(x.pl.w + 'x' + x.pl.h).then(function (bl) { bt.disabled = false; if (bl) download(bl, fileName(c, x.pf, x.pl, 'png')); }); }
        else if (act === 'link') copyText(utm(c, x.pf, x.pl), bt);
        else if (act === 'video') openRec(x.pf, x.pl);
        return;
      }
      var cp = bt.getAttribute('data-copy');
      if (cp) { var p = cp.split('.'); copyText(c.copy[p[0]][p[1]] || '', bt); return; }
      var cl = bt.getAttribute('data-copylink');
      if (cl) { var pf = D.PLATFORMS.filter(function (q) { return q.id === cl; })[0]; copyText(utm(c, pf, pf.placements[0]), bt); }
    });
    function onCopy(e) {
      var t = e.target, g = t.getAttribute('data-g'), f = t.getAttribute('data-f'); if (!g) return;
      edit(['copy', g, f], t.value);
      $$('[data-g="' + g + '"][data-f="' + f + '"]').forEach(function (o) { if (o !== t) o.value = t.value; });
      bindAll();
    }
    $('#boards').addEventListener('input', onCopy);
    $('#boards').addEventListener('change', onCopy);
  }

  /* ------------------------------------------------------------ ZIPs */
  var zipLib = null;
  function jszip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (!zipLib) zipLib = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = function () { res(window.JSZip); }; s.onerror = function () { zipLib = null; rej(new Error('The ZIP library did not load. Check the connection.')); };
      document.head.appendChild(s);
    });
    return zipLib;
  }
  function copySheet(c) {
    var out = ['TechNext paid ads - ' + c.name, 'Landing page: ' + c.url, ''];
    D.PLATFORMS.forEach(function (pf) {
      out.push('== ' + pf.name + ' (' + D.GROUP_NAMES[pf.group] + ')');
      D.FIELDS[pf.group].forEach(function (f) { out.push(f[1] + ': ' + (c.copy[pf.group][f[0]] || '')); });
      pf.placements.forEach(function (pl) { out.push('  ' + pl.name + ' ' + pl.ratio + ' -> ' + utm(c, pf, pl)); });
      out.push('');
    });
    return out.join('\r\n');
  }
  $('#zip-all').addEventListener('click', function () {
    var bt = this, c = concept(cur), blobs = {}; bt.disabled = true; bt.textContent = 'Building ZIP...';
    jszip().then(function (Z) {
      var zip = new Z();
      return SIZES.reduce(function (p, s) { return p.then(function () { return pngBlob(s.k).then(function (bl) { blobs[s.k] = bl; }); }); }, Promise.resolve()).then(function () {
        D.PLATFORMS.forEach(function (pf) { pf.placements.forEach(function (pl) { zip.file(pf.id + '/' + fileName(c, pf, pl, 'png'), blobs[pl.w + 'x' + pl.h]); }); });
        zip.file('ad-copy-and-links.txt', copySheet(c));
        return zip.generateAsync({ type: 'blob' });
      });
    }).then(function (bl) { download(bl, 'TN_paid-ads_' + c.id + '.zip'); }, function (e) { alert(e.message); })
      .then(function () { bt.disabled = false; bt.textContent = 'Download this campaign (ZIP)'; });
  });
  $('#zip-poses').addEventListener('click', function () {
    var bt = this; bt.disabled = true; bt.textContent = 'Building ZIP...';
    jszip().then(function (Z) {
      var zip = new Z();
      return Promise.all(Object.keys(D.POSES).map(function (p) { return fetch('assets/ads/nexi/png/nexi-' + p + '.png').then(function (r) { if (!r.ok) throw new Error('Missing ' + p); return r.blob(); }).then(function (bl) { zip.file('nexi-' + p + '.png', bl); }); }))
        .then(function () { return zip.generateAsync({ type: 'blob' }); });
    }).then(function (bl) { download(bl, 'TN_nexi-pose-pack.zip'); }, function (e) { alert(e.message); })
      .then(function () { bt.disabled = false; bt.textContent = 'Download all poses (ZIP)'; });
  });

  /* ------------------------------------------------------------ video recorder */
  var REC = null;
  function mime() {
    if (!window.MediaRecorder) return '';
    var l = ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1.4D4028', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    for (var i = 0; i < l.length; i++) if (MediaRecorder.isTypeSupported(l[i])) return l[i];
    return '';
  }
  function openRec(pf, pl) {
    var cv = $('#rec-cv'), sp = concept(cur).creative;
    REC = { pf: pf, pl: pl, run: 0 };
    cv.width = pl.w; cv.height = pl.h;
    $('#rec-title').textContent = pf.name + ' ' + pl.name + ' video, ' + pl.w + ' x ' + pl.h + ', ' + R.DUR + ' s';
    $('#rec-msg').textContent = mime() ? (mime().indexOf('mp4') >= 0 ? 'Saves MP4.' : 'This browser saves WebM.') : 'This browser cannot record canvas video. Use Chrome or Edge.';
    $('#rec-go').disabled = !mime(); $('#rec-prog').style.width = '0';
    $('#rec').hidden = false; $('#rec-close').focus();
    R.prepare(sp, pl.w, pl.h).then(function () { R.draw(cv.getContext('2d'), pl.w, pl.h, sp); });
  }
  function closeRec() { if (REC) REC.run++; $('#rec').hidden = true; REC = null; }
  function play(record) {
    if (!REC) return;
    var run = ++REC.run, cv = $('#rec-cv'), g = cv.getContext('2d'), sp = concept(cur).creative, W = cv.width, H = cv.height, t0 = null, rec = null, chunks = [], type = mime();
    var x = REC, name = fileName(concept(cur), x.pf, x.pl, type.indexOf('mp4') >= 0 ? 'mp4' : 'webm');
    $('#rec-play').disabled = $('#rec-go').disabled = true;
    R.prepare(sp, W, H).then(function () {
      if (record) {
        rec = new MediaRecorder(cv.captureStream(30), { mimeType: type, videoBitsPerSecond: 12000000 });
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = function () { if (chunks.length) { download(new Blob(chunks, { type: type.split(';')[0] }), name); $('#rec-msg').textContent = 'Saved ' + name; } };
        rec.start(500);
      }
      $('#rec-msg').textContent = record ? 'Recording... keep this tab in front.' : 'Playing preview';
      requestAnimationFrame(function frame(now) {
        if (!REC || REC.run !== run) { if (rec && rec.state !== 'inactive') rec.stop(); return; }
        if (t0 === null) t0 = now;
        var t = Math.min(R.DUR, (now - t0) / 1000);
        R.draw(g, W, H, sp, t); $('#rec-prog').style.width = (t / R.DUR * 100) + '%';
        if (t < R.DUR) requestAnimationFrame(frame);
        else {
          if (rec) setTimeout(function () { rec.stop(); }, 300); else $('#rec-msg').textContent = 'Preview done';
          $('#rec-play').disabled = false; $('#rec-go').disabled = !type;
        }
      });
    });
  }
  $('#rec-play').addEventListener('click', function () { play(false); });
  $('#rec-go').addEventListener('click', function () { play(true); });
  $('#rec-close').addEventListener('click', closeRec);
  $('#rec').addEventListener('click', function (e) { if (e.target === this) closeRec(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && REC) closeRec(); });

  /* ------------------------------------------------------------ static sections */
  $('#stats').innerHTML = [[D.PLATFORMS.length, 'platforms'], [D.CONCEPTS.length, 'campaigns, ' + D.CONCEPTS.filter(function (c) { return c.group === 'odoo'; }).length + ' for Odoo'], [COUNT_PL, 'placements, exact sizes'], [Object.keys(D.POSES).length, 'Nexi poses']]
    .map(function (s) { return '<div class="stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join('');
  $('#pose-grid').innerHTML = Object.keys(D.POSES).map(function (p) {
    var m = D.POSES[p];
    return '<div class="pose"><div class="im"><img src="' + R.poseSrc(p) + '" alt="Nexi, ' + esc(D.POSE_NAMES[p]) + '" loading="lazy" width="' + m.w + '" height="' + m.h + '"></div><b>' + esc(D.POSE_NAMES[p]) + '</b><small>' + m.w + ' &times; ' + m.h + ' PNG</small>'
      + '<a class="btn sm" href="assets/ads/nexi/png/nexi-' + p + '.png" download="nexi-' + p + '.png">Download</a></div>';
  }).join('');
  var SPEC_H = Array.prototype.map.call(document.querySelectorAll('#specs thead th'), function (th) { return th.textContent.trim(); });
  $('#spec-rows').innerHTML = D.SPECS.map(function (r) { return '<tr>' + r.map(function (c, i) { var lb = ' data-label="' + (SPEC_H[i] || '').replace(/"/g, '&quot;') + '"'; return i ? '<td' + lb + '>' + c + '</td>' : '<td' + lb + '><b>' + c + '</b></td>'; }).join('') + '</tr>'; }).join('');

  setupConcepts(); setupEditor(); setupBoards(); fillEditor(); buildBoards(); renderAll();
  D.CONCEPTS.forEach(function (c, i) { setTimeout(function () { thumb(i); }, 400 + i * 120); });
})();
