/* TechNext Paid Ads Studio - canvas renderer.
   TNAds.prepare(spec, W, H) loads fonts, Nexi, logos and the background, then TNAds.draw(ctx, W, H, spec, t) paints one
   creative at that exact size. t = seconds into the motion version; leave it out for the finished still.
   Layout adapts to four shapes: V 9:16, P 4:5, S 1:1, L 1.91:1 and 16:9. Text auto-fits into its column. */
(function () {
  'use strict';
  var D = window.ADS;
  var C = { blue: '#3167CA', deep: '#1E4691', sky: '#6FA0F5', tint: '#DDE7F8', mist: '#EAF0FB', ink: '#1F1F3D', ink2: '#4C4C63', ink3: '#7A7A90' };
  var FD = '"Plus Jakarta Sans", Inter, system-ui, sans-serif', FB = 'Inter, system-ui, sans-serif';
  var DUR = 8, SWAP = 3.6;
  var DARK = {}; D.BACKGROUNDS.forEach(function (b) { DARK[b.id] = b.dark; });

  /* ------------------------------------------------------------------ assets */
  var IMG = {}, GOT = {}, BGC = {}, FONTS = null;
  function load(src) {
    if (!IMG[src]) IMG[src] = new Promise(function (res, rej) {
      var i = new Image(); i.decoding = 'async';
      i.onload = function () { GOT[src] = i; res(i); };
      i.onerror = function () { rej(new Error('Could not load ' + src)); };
      i.src = src;
    });
    return IMG[src];
  }
  function poseSrc(p) { return 'assets/ads/nexi/nexi-' + (D.POSES[p] ? p : 'hello') + '.webp'; }
  var LOGO = { blue: 'assets/logo/technext-horizontal-blue.svg', white: 'assets/logo/technext-horizontal-white.svg', odoo: 'assets/logo/odoo-ready-partner.png' };
  var LOGO_AR = 1275 / 176, ODOO_CROP = [458, 161, 1649, 804];
  function fonts() {
    if (!FONTS) FONTS = Promise.all(['800 80px "Plus Jakarta Sans"', '700 80px "Plus Jakarta Sans"', '500 40px Inter', '600 40px Inter', '700 40px Inter']
      .map(function (f) { return document.fonts ? document.fonts.load(f) : null; })).catch(function () {});
    return FONTS;
  }

  /* ------------------------------------------------------------------ helpers */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function prog(t, a, d) { return t == null ? 1 : clamp((t - a) / d, 0, 1); }
  function eo(x) { return 1 - Math.pow(1 - x, 3); }
  function back(x) { var c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function bell(x) { return Math.sin(Math.PI * clamp(x, 0, 1)); }
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function hit(a, b, pad) { pad = pad || 0; return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y; }
  function shadow(g, col, blur, oy) { g.shadowColor = col; g.shadowBlur = blur; g.shadowOffsetX = 0; g.shadowOffsetY = oy || 0; }
  function noShadow(g) { g.shadowColor = 'rgba(0,0,0,0)'; g.shadowBlur = 0; g.shadowOffsetY = 0; }
  var HAS_LS = (function () { try { return 'letterSpacing' in document.createElement('canvas').getContext('2d'); } catch (e) { return false; } })();
  function setFont(g, f, ls) { g.font = f; if (HAS_LS) g.letterSpacing = (ls || 0) + 'px'; }

  /* stroke icons on a 24-unit grid */
  var ICON = {
    chart: 'M4 20V11M10 20V5M16 20v-8M21 20H3', box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
    receipt: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    store: 'M3 9l1.5-5h15L21 9M4 9v11h16V9M3 9h18M10 20v-6h4v6', cart: 'M3 4h2l2.4 11h11L21 7H6.2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    check: 'M5 12.5l4.5 4.5L19 7', file: 'M14 2H6v20h12V6zM14 2v4h4M9 13h6M9 17h6', x: 'M7 7l10 10M17 7L7 17',
    chat: 'M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z', mail: 'M3 5h18v14H3zM3 6l9 7 9-7', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4.2-4.2',
    cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2.2 9 2.2 12 0v-5M22 9v6', plug: 'M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5',
    life: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6'
  };
  var PATH = {};
  function icon(g, name, x, y, size, col, lw) {
    var p = PATH[name] || (PATH[name] = new Path2D(ICON[name] || ICON.grid));
    g.save(); g.translate(x, y); g.scale(size / 24, size / 24);
    g.strokeStyle = col; g.lineWidth = lw || 2; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(p); g.restore();
  }
  /* official Odoo app icons by app name (data.js ODOO_APPS); stroke icons stand in for steps that are not an app */
  var ODOO = D.ODOO_APPS || {};
  function appMod(name) { var k = String(name || '').trim().toLowerCase(); for (var a in ODOO) if (a.toLowerCase() === k) return ODOO[a]; return null; }
  function appSrc(mod) { return 'assets/ads/odoo/' + mod + '.svg'; }
  var STEP_ICON = { discovery: 'search', training: 'cap', integration: 'plug', support: 'life', request: 'file', quote: 'file', order: 'check',
    deliver: 'box', ship: 'box', receive: 'box', invoice: 'receipt', bill: 'receipt', pay: 'check', paid: 'check', report: 'chart', close: 'check' };
  var APP_ICON = { sales: 'chart', inventory: 'box', accounting: 'receipt', invoicing: 'receipt', crm: 'users', pos: 'store', 'point of sale': 'store', purchase: 'cart', email: 'mail' };

  /* ------------------------------------------------------------------ text */
  /* "Make it *one system*." -> paragraphs of words; a word is runs of {t, a(ccent)} so "system*." keeps its full stop */
  function words(str) {
    var paras = [[]], cur = null, acc = false, s = String(str || '');
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '*') { acc = !acc; continue; }
      if (c === '\n') { cur = null; paras.push([]); continue; }
      if (/\s/.test(c)) { cur = null; continue; }
      if (!cur) { cur = []; paras[paras.length - 1].push(cur); }
      var last = cur[cur.length - 1];
      if (last && last.a === acc) last.t += c; else cur.push({ t: c, a: acc });
    }
    return paras.filter(function (p, i) { return p.length || i === 0; });
  }
  function wordW(g, w) { var s = 0; for (var i = 0; i < w.length; i++) s += g.measureText(w[i].t).width; return s; }
  function wrap(g, paras, maxW) {
    var sp = g.measureText(' ').width, lines = [], over = false;
    paras.forEach(function (p) {
      var line = [], lw = 0;
      p.forEach(function (w) {
        var ww = wordW(g, w);
        if (ww > maxW) over = true;
        if (line.length && lw + sp + ww > maxW) { lines.push({ words: line, w: lw }); line = []; lw = 0; }
        lw += (line.length ? sp : 0) + ww; line.push({ runs: w, w: ww });
      });
      if (line.length) lines.push({ words: line, w: lw });
    });
    return { lines: lines, over: over, sp: sp };
  }
  /* largest size that fits maxLines (and maxH), then the narrowest width that keeps that line count (no widows) */
  function fit(g, str, o) {
    var paras = words(str), size = o.max, r, step = Math.max(1, o.max / 40);
    for (; size >= o.min; size -= step) {
      setFont(g, o.weight + ' ' + Math.round(size) + 'px ' + o.family, (o.ls || 0) * size);
      r = wrap(g, paras, o.maxW);
      if (!r.over && r.lines.length <= o.maxLines && (!o.maxH || r.lines.length * size * o.lh <= o.maxH)) break;
    }
    size = Math.max(size, o.min); size = Math.round(size);
    var font = o.weight + ' ' + size + 'px ' + o.family, ls = (o.ls || 0) * size;
    setFont(g, font, ls); r = wrap(g, paras, o.maxW);
    if (o.balance && r.lines.length > 1) {
      var n = r.lines.length, lo = o.maxW * 0.45, hi = o.maxW;
      for (var k = 0; k < 9; k++) { var mid = (lo + hi) / 2, t2 = wrap(g, paras, mid); if (t2.lines.length <= n && !t2.over) hi = mid; else lo = mid; }
      r = wrap(g, paras, hi);
    }
    var maxLine = 0; r.lines.forEach(function (l) { maxLine = Math.max(maxLine, l.w); });
    return { font: font, ls: ls, size: size, lh: o.lh, lines: r.lines, sp: r.sp, w: maxLine, h: r.lines.length * size * o.lh, clipped: r.lines.length > o.maxLines || r.over };
  }
  function textRects(T, x, y, align) {
    return T.lines.map(function (l, i) { var lx = align === 'center' ? x - l.w / 2 : x; return { x: lx, y: y + i * T.size * T.lh, w: l.w, h: T.size * T.lh }; });
  }

  /* ------------------------------------------------------------------ backgrounds (SVG, rastered once per size) */
  function svgHead(W, H) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">'; }
  function n(v) { return Math.round(v * 10) / 10; }
  var BGSVG = {
    daylight: function (W, H, f) {
      var u = Math.min(W, H) / 1080, k = Math.max(W, H) / 1080, s = svgHead(W, H);
      s += '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EAF0FB"/></linearGradient>'
        + '<radialGradient id="gl" gradientUnits="userSpaceOnUse" cx="' + W + '" cy="' + H + '" r="' + n(900 * k) + '"><stop offset="0" stop-color="#6FA0F5" stop-opacity=".30"/><stop offset=".62" stop-color="#6FA0F5" stop-opacity="0"/></radialGradient>'
        + '<linearGradient id="ar" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#3167CA"/><stop offset="1" stop-color="#6FA0F5"/></linearGradient></defs>'
        + '<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/><rect width="' + W + '" height="' + H + '" fill="url(#gl)"/><g fill="none" stroke="url(#ar)">';
      [[330, 3, .5], [480, 2, .34], [650, 1.5, .22], [840, 1.2, .13]].forEach(function (a) { s += '<circle cx="' + W + '" cy="' + H + '" r="' + n(a[0] * k) + '" stroke-width="' + n(a[1] * u) + '" opacity="' + a[2] + '"/>'; });
      s += '</g><circle cx="0" cy="' + H + '" r="' + n(420 * u) + '" fill="#DDE7F8" opacity=".55"/><circle cx="0" cy="' + H + '" r="' + n(260 * u) + '" fill="#EAF0FB"/>';
      var x1 = f.x - f.r * 1.7, y1 = Math.max(70 * u, f.y - f.r * 1.55), x2 = Math.min(W - 60 * u, f.x + f.r * 0.95), y2 = Math.max(60 * u, y1 - 70 * u);
      if (H > W * 1.4) { x1 = W * 0.5; y1 = H * 0.085; x2 = W * 0.88; y2 = H * 0.055; }
      s += '<path d="M' + n(x1) + ' ' + n(y1) + ' C ' + n(x1 + (x2 - x1) * .35) + ' ' + n(y1 - 90 * u) + ', ' + n(x1 + (x2 - x1) * .7) + ' ' + n(y2 + 80 * u) + ', ' + n(x2) + ' ' + n(y2) + '" fill="none" stroke="#3167CA" stroke-width="' + n(3 * u) + '" stroke-dasharray="' + n(2 * u) + ' ' + n(14 * u) + '" stroke-linecap="round" opacity=".55"/>'
        + '<circle cx="' + n(x2) + '" cy="' + n(y2) + '" r="' + n(6 * u) + '" fill="#3167CA" opacity=".6"/>';
      return s + '</svg>';
    },
    modules: function (W, H, f) {
      var u = Math.min(W, H) / 1080, sp = n(34 * u), s = svgHead(W, H);
      s += '<defs><pattern id="dots" width="' + sp + '" height="' + sp + '" patternUnits="userSpaceOnUse"><circle cx="' + n(2 * u) + '" cy="' + n(2 * u) + '" r="' + n(1.7 * u) + '" fill="#C2D1EC"/></pattern>'
        + '<radialGradient id="fade" gradientUnits="userSpaceOnUse" cx="' + n(f.x) + '" cy="' + n(f.y) + '" r="' + n(Math.max(W, H) * .78) + '"><stop offset="0" stop-color="#FBFCFF" stop-opacity="0"/><stop offset=".35" stop-color="#FBFCFF" stop-opacity=".15"/><stop offset="1" stop-color="#FBFCFF" stop-opacity="1"/></radialGradient></defs>'
        + '<rect width="' + W + '" height="' + H + '" fill="#FBFCFF"/><rect width="' + W + '" height="' + H + '" fill="url(#dots)"/><rect width="' + W + '" height="' + H + '" fill="url(#fade)"/>'
        + '<circle cx="' + n(-40 * u) + '" cy="' + n(H + 40 * u) + '" r="' + n(380 * u) + '" fill="#EAF0FB"/>'
        + '<rect x="' + n(W - 128 * u) + '" y="' + n(H * .1) + '" width="' + n(72 * u) + '" height="' + n(72 * u) + '" rx="' + n(20 * u) + '" fill="#EAF0FB"/>'
        + '<rect x="' + n(W - 196 * u) + '" y="' + n(H * .1 + 92 * u) + '" width="' + n(48 * u) + '" height="' + n(48 * u) + '" rx="' + n(14 * u) + '" fill="#DDE7F8"/>';
      return s + '</svg>';
    },
    horizon: function (W, H, f) {
      var u = Math.min(W, H) / 1080, M = Math.max(W, H), s = svgHead(W, H);
      s += '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A5BC0"/><stop offset="1" stop-color="#16367A"/></linearGradient>'
        + '<radialGradient id="sun" gradientUnits="userSpaceOnUse" cx="' + n(W / 2) + '" cy="' + n(-H * .15) + '" r="' + n(M * .85) + '"><stop offset="0" stop-color="#9CC0FF" stop-opacity=".5"/><stop offset="1" stop-color="#9CC0FF" stop-opacity="0"/></radialGradient>'
        + '<linearGradient id="ring" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#6FA0F5" stop-opacity=".05"/><stop offset="1" stop-color="#BFD5FF" stop-opacity=".75"/></linearGradient></defs>'
        + '<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/><rect width="' + W + '" height="' + H + '" fill="url(#sun)"/><g fill="none" stroke="url(#ring)">'
        + '<circle cx="' + n(f.x) + '" cy="' + n(f.y) + '" r="' + n(f.r * 1.2) + '" stroke-width="' + n(34 * u) + '" opacity=".5"/>'
        + '<circle cx="' + n(f.x) + '" cy="' + n(f.y) + '" r="' + n(f.r * 1.5) + '" stroke-width="' + n(2 * u) + '" opacity=".6"/>'
        + '<circle cx="' + n(f.x) + '" cy="' + n(f.y) + '" r="' + n(f.r * 1.85) + '" stroke-width="' + n(1.4 * u) + '" opacity=".4"/>'
        + '<circle cx="' + n(W * .08) + '" cy="' + n(H + 60 * u) + '" r="' + n(300 * u) + '" stroke-width="' + n(2 * u) + '" opacity=".45"/>'
        + '<circle cx="' + n(W * .08) + '" cy="' + n(H + 60 * u) + '" r="' + n(400 * u) + '" stroke-width="' + n(1.2 * u) + '" opacity=".3"/></g>'
        + '<g fill="#DDE7F8"><circle cx="' + n(f.x - f.r * 1.38) + '" cy="' + n(f.y - f.r * .62) + '" r="' + n(6 * u) + '"/><circle cx="' + n(f.x - f.r * 1.38) + '" cy="' + n(f.y - f.r * .62) + '" r="' + n(18 * u) + '" opacity=".2"/></g>';
      return s + '</svg>';
    },
    midnight: function (W, H, f) {
      var u = Math.min(W, H) / 1080, s = svgHead(W, H);
      function P(a) { return a.map(function (v, i) { return typeof v === 'string' ? v : n(i % 2 ? v * H : v * W); }).join(' '); }
      var p1 = P(['M', -.04, .93, 'C', .26, .91, .52, .70, .77, .39, 'S', .99, .11, 1.04, .06]);
      var p2 = P(['M', -.04, 1.0, 'C', .31, .98, .6, .81, .84, .52, 'S', 1.02, .28, 1.06, .23]);
      var p3 = P(['M', .16, 1.04, 'C', .47, 1.0, .7, .89, .92, .67, 'S', 1.04, .52, 1.07, .48]);
      s += '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B1838"/><stop offset=".55" stop-color="#132C66"/><stop offset="1" stop-color="#1E4691"/></linearGradient>'
        + '<radialGradient id="gl" gradientUnits="userSpaceOnUse" cx="' + n(W * .85) + '" cy="' + n(H * .2) + '" r="' + n(Math.max(W, H) * .6) + '"><stop offset="0" stop-color="#3167CA" stop-opacity=".55"/><stop offset="1" stop-color="#3167CA" stop-opacity="0"/></radialGradient>'
        + '<linearGradient id="tr" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#6FA0F5" stop-opacity="0"/><stop offset=".7" stop-color="#6FA0F5" stop-opacity=".9"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>'
        + '<filter id="bl" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="' + n(7 * u) + '"/></filter></defs>'
        + '<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/><rect width="' + W + '" height="' + H + '" fill="url(#gl)"/>'
        + '<g fill="none" stroke="url(#tr)" stroke-linecap="round"><path d="' + p1 + '" stroke-width="' + n(16 * u) + '" filter="url(#bl)" opacity=".7"/><path d="' + p1 + '" stroke-width="' + n(3 * u) + '"/>'
        + '<path d="' + p2 + '" stroke-width="' + n(2 * u) + '" opacity=".55"/><path d="' + p3 + '" stroke-width="' + n(1.4 * u) + '" opacity=".35"/></g><g fill="#fff">';
      [[.77, .39, 5, 1], [.84, .52, 3.5, .7], [.92, .67, 3, .5], [.63, .23, 2, .45], [.7, .15, 1.6, .4], [.88, .31, 2.2, .5], [.97, .41, 1.6, .35], [.51, .13, 1.6, .3], [.3, .2, 1.4, .3], [.12, .4, 1.4, .25]]
        .forEach(function (d) { s += '<circle cx="' + n(d[0] * W) + '" cy="' + n(d[1] * H) + '" r="' + n(d[2] * u) + '" opacity="' + d[3] + '"/>'; });
      return s + '</g></svg>';
    }
  };
  function bgKey(id, W, H, f) { return id + '|' + W + 'x' + H + '|' + Math.round(f.x) + ',' + Math.round(f.y) + ',' + Math.round(f.r); }
  function bgRaster(id, W, H, f) {
    var key = bgKey(id, W, H, f);
    if (BGC[key]) return BGC[key].p;
    var ent = { c: null }, svg = (BGSVG[id] || BGSVG.daylight)(W, H, f);
    ent.p = new Promise(function (res) {
      var i = new Image();
      i.onload = function () { var c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(i, 0, 0, W, H); ent.c = c; res(c); };
      i.onerror = function () { res(null); };
      i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    BGC[key] = ent;
    var keys = Object.keys(BGC); if (keys.length > 60) delete BGC[keys[0]];
    return ent.p;
  }

  /* ------------------------------------------------------------------ layout */
  function shape(W, H) { var r = W / H; return r < 0.7 ? 'V' : r < 0.9 ? 'P' : r <= 1.2 ? 'S' : 'L'; }
  var SCR = document.createElement('canvas').getContext('2d');
  var MEMO = {}, MEMO_N = 0;

  function fitNexi(z, A1, A2, cx) {
    var wmax = Math.max(A1.w, A2.w), hmax = Math.max(A1.h, A2.h);
    var s = Math.min((z.y1 - z.y0) / 1375, (z.x1 - z.x0) / 1150, (z.x1 - z.x0) / wmax, (z.y1 - z.y0) / hmax);
    var lo = z.x0 + Math.max(A1.ax, A2.ax) * s, hi = z.x1 - Math.max(A1.w - A1.ax, A2.w - A2.ax) * s;
    var X = lo > hi ? (lo + hi) / 2 : clamp(cx == null ? (z.x0 + z.x1) / 2 : cx, lo, hi);
    var Y = z.y1 - 672 * s, top = Math.max(A1.ay, A2.ay) * s;
    if (Y - top < z.y0 || z.alignTop) Y = z.y0 + top;
    return { s: s, X: X, Y: Y, r: 640 * s };
  }

  function bandOn0(sp) { return (sp.prop === 'flow' || sp.prop === 'apps') && (sp.items || []).filter(Boolean).length > 0; }
  function plan(W, H, sp) {
    var key = W + 'x' + H + '|' + JSON.stringify(sp);
    if (MEMO[key]) return MEMO[key];
    var g = SCR, k = shape(W, H), dark = !!DARK[sp.bg], u = (k === 'L' ? H : W) / 1080, L = { W: W, H: H, k: k, u: u, dark: dark, occ: [], flags: [] };
    var A1 = D.POSES[sp.pose] || D.POSES.hello, A2 = D.POSES[sp.pose2] || A1;
    var m, colW, align = 'left', x0;
    /* --- logo lockup */
    var lh = { V: 56, P: 50, S: 48, L: 54 }[k] * u, lw = lh * LOGO_AR, lock = { h: lh, lw: lw, badge: !!sp.badge };
    lock.bh = lh * 1.5; lock.bw = lock.bh * (ODOO_CROP[2] / ODOO_CROP[3]); lock.gap = 26 * u;
    lock.w = lw + (lock.badge ? lock.gap * 2 + 2 * u + lock.bw + (dark ? 28 * u : 0) : 0);
    if (k === 'V') { m = 84 * u; lock.x = (W - lock.w) / 2; lock.y = H * 0.14; colW = W - 2 * 90 * u; align = 'center'; x0 = W / 2; }
    else if (k === 'P') { m = 72 * u; lock.x = m; lock.y = m; colW = W - 2 * m; x0 = m; }
    else if (k === 'S') { m = 64 * u; lock.x = m; lock.y = m; colW = W - 2 * m; x0 = m; }
    else { m = 74 * u; lock.x = m; lock.y = m; colW = 0.53 * W; x0 = m; }
    L.m = m; L.lock = lock; L.align = align;
    var lockH = Math.max(lh, lock.badge ? lock.bh + (dark ? 16 * u : 0) : 0);
    lock.cy = lock.y + lockH / 2;
    L.occ.push({ x: lock.x, y: lock.y, w: lock.w, h: lockH });
    var y = lock.y + lockH;
    /* --- kicker */
    var ks = { V: 30, P: 26, S: 25, L: 26 }[k] * u;
    if (sp.kicker) {
      setFont(g, '700 ' + Math.round(ks) + 'px ' + FB, ks * 0.12);
      var kt = String(sp.kicker).toUpperCase(), kw = g.measureText(kt).width, kh = ks * 2.15, kpx = ks * 0.95, kd = ks * 0.26;
      var kW = kw + kpx * 2 + kd * 2 + ks * 0.55;
      y += { V: 56, P: 50, S: 44, L: 46 }[k] * u;
      L.kick = { t: kt, x: align === 'center' ? x0 - kW / 2 : x0, y: y, w: kW, h: kh, size: ks, px: kpx, dot: kd };
      L.occ.push(L.kick); y += kh;
    }
    /* --- headline */
    var HS = { V: [bandOn0(sp) ? 100 : 112, 62, 3], P: [100, 58, 3], S: [90, 52, 3], L: [W / H > 1.85 ? 92 : 104, 54, 3] }[k];
    y += { V: 34, P: 28, S: 26, L: 26 }[k] * u;
    var hT = fit(g, sp.headline || '', { weight: 800, family: FD, max: HS[0] * u, min: HS[1] * u, maxW: colW, maxLines: HS[2], lh: 1.06, ls: -0.022, balance: true });
    L.head = { T: hT, x: x0, y: y }; L.head.rects = textRects(hT, x0, y, align);
    if (hT.clipped) L.flags.push('headline too long');
    L.occ = L.occ.concat(L.head.rects); y += hT.h;
    /* --- Odoo band: the workflow strip or the app row (landscape: in the column, after the sub line) */
    var bandOn = (sp.prop === 'flow' || sp.prop === 'apps') && (sp.items || []).filter(Boolean).length > 0;
    function addBand(bx, bw) {
      y += { V: 40, P: 36, S: 30, L: 28 }[k] * u;
      L.band = layoutBand(g, sp, bx, y, bw, u, k);
      var o = { x: L.band.x, y: L.band.y - 8 * u, w: L.band.w, h: L.band.h + 16 * u }; L.occ.push(o); y += L.band.h;
      if (L.band.more) L.flags.push(L.band.more + ' item(s) did not fit the strip');
      return o;
    }
    if (bandOn && k !== 'L') addBand(k === 'V' ? 90 * u : x0, k === 'V' ? W - 180 * u : W - 2 * m);
    /* --- columns below the headline */
    var subW = { V: colW * 0.96, P: 0.46 * W, S: 0.43 * W, L: 0.5 * W }[k];
    var SS = { V: [40, 32, 3], P: [34, 27, 5], S: [30, 24, 4], L: [W / H > 1.85 ? 34 : 36, 26, W / H > 1.85 ? 2 : 3] }[k];
    var subOn = sp.sub && !(bandOn && (k === 'V' || k === 'S' || (k === 'L' && W / H > 1.85)));
    var subT = subOn ? fit(g, sp.sub, { weight: 500, family: FB, max: SS[0] * u, min: SS[1] * u, maxW: subW, maxLines: SS[2], lh: 1.42 }) : null;
    var ctaH = { V: 102, P: 92, S: 88, L: 92 }[k] * u;
    /* Nexi zone (V waits for the text column below) */
    var z = null, nx = null;
    function zoneNexi(zz) {
      z = zz; nx = fitNexi(z, A1, A2, z.cx);
      L.nexi = nx; L.zone = z; L.focus = { x: nx.X, y: nx.Y, r: nx.r };
    }
    if (k === 'P') { var y0p = Math.max(y + 120 * u, H * 0.37); zoneNexi({ x0: 0.44 * W, x1: W - 26 * u, y0: y0p, y1: H + 0.07 * (H - y0p), cx: W * 0.72 }); }
    else if (k === 'S') { var y0s = y + (bandOn ? 84 : 104) * u; zoneNexi({ x0: (bandOn ? 0.4 : 0.455) * W, x1: W - 20 * u, y0: y0s, y1: H + (bandOn ? 0.17 : 0.13) * (H - y0s), cx: W * 0.74 }); }
    else if (k === 'L') zoneNexi({ x0: 0.565 * W, x1: W - 18 * u, y0: H * 0.05, y1: H - 8 * u, cx: W * 0.79 });
    L.head2 = function (A) { return { x: nx.X + (A.hx - A.ax) * nx.s, y: nx.Y + (A.hy - A.ay) * nx.s, R: 255 * nx.s }; };
    if (subT) {
      y += { V: 30, P: 30, S: 26, L: 26 }[k] * u;
      L.sub = { T: subT, x: x0, y: y }; L.sub.rects = textRects(subT, x0, y, align);
      L.occ = L.occ.concat(L.sub.rects); y += subT.h;
      if (subT.clipped) L.flags.push('sub line too long');
    }
    if (bandOn && k === 'L') {
      var bo = addBand(x0, colW * 0.92);
      if (L.band.y + L.band.h > H - m - ctaH - 14 * u && L.sub) {
        /* no room for both: the strip wins, the sub line goes (it is in the ad copy anyway) */
        var drop = L.sub.rects; L.occ = L.occ.filter(function (r) { return r !== bo && drop.indexOf(r) < 0; });
        y = L.sub.y - 26 * u; L.sub = null; addBand(x0, colW * 0.92);
      }
      if (L.band.y + L.band.h > H - m - ctaH - 14 * u) L.flags.push('workflow strip runs into the button');
    }
    /* CTA */
    var cs = Math.round(ctaH * 0.35);
    setFont(g, '700 ' + cs + 'px ' + FD, 0);
    var ctaTW = g.measureText(sp.cta || '').width, ctaW = ctaTW + ctaH * 0.96 + ctaH * 0.42;
    var cta = { h: ctaH, w: ctaW, size: cs, tw: ctaTW };
    if (k === 'V') { cta.x = W / 2 - ctaW / 2; cta.y = y + 44 * u; y = cta.y + ctaH; }
    else { cta.x = x0; cta.y = H - m - ctaH; }
    L.cta = sp.cta ? cta : null;
    if (L.cta) {
      L.occ.push({ x: cta.x, y: cta.y, w: cta.w, h: cta.h });
      var us = Math.round(ctaH * 0.27); setFont(g, '600 ' + us + 'px ' + FB, 0);
      var uw = g.measureText('technext.asia').width;
      if (k !== 'V' && cta.x + cta.w + 26 * u + uw < (k === 'P' ? 0.5 * W : z.x0 + 10 * u)) { L.url = { x: cta.x + cta.w + 26 * u, y: cta.y + ctaH / 2, size: us }; }
    }
    if (k === 'V') { var y0v = Math.max(H * 0.5, y + 84 * u); zoneNexi({ x0: 90 * u, x1: W - 140 * u, y0: y0v, y1: H * 1.13, cx: W * 0.56, alignTop: true }); }
    if (k === 'V' && H * 1.13 - z.y0 < H * 0.45) L.flags.push('text leaves little room for Nexi');
    /* --- props (chips) */
    var box;
    if (k === 'V') { var hv = L.head2(A1), by0 = hv.y + hv.R * 1.25; box = { x: 56 * u, y: by0, w: 0.52 * W, h: H * 0.86 - by0, max: 2 }; }
    else { var top = y + 32 * u, bot = (L.cta ? cta.y : H - m) - 30 * u; box = { x: x0, y: top, w: Math.min(subW, k === 'L' ? 0.46 * W : subW), h: bot - top, max: 4 }; }
    L.props = layoutProps(g, sp, box, u, k);
    L.props.forEach(function (p) { L.occ.push(p); });
    /* --- bubble: first candidate around the head that stays clear of everything */
    L.bubbles = [sp.bubble, sp.bubble2 || null].map(function (txt, i) { return txt ? placeBubble(g, txt, L.head2(i ? A2 : A1), L, k, u) : null; });
    if (sp.bubble && !L.bubbles[0]) L.flags.push('no room for the speech bubble');
    if (++MEMO_N > 80) { MEMO = {}; MEMO_N = 0; }
    MEMO[key] = L;
    return L;
  }

  function placeBubble(g, txt, hd, L, k, u) {
    var W = L.W, H = L.H, tries = [1, 0.86, 0.74];
    var order = k === 'V' ? ['left', 'tl', 'tr', 'right'] : k === 'L' ? ['left', 'tl', 'tr', 'right'] : ['tl', 'left', 'tr', 'right'];
    var unsafe = k === 'V' ? [{ x: W - 150 * u, y: 0, w: 150 * u, h: H }, { x: 0, y: 0, w: W, h: H * 0.13 }] : [];
    for (var ti = 0; ti < tries.length; ti++) {
      var fs = Math.round({ V: 38, P: 34, S: 32, L: 34 }[k] * u * tries[ti]);
      setFont(g, '800 ' + fs + 'px ' + FD, -0.01 * fs);
      var tw = g.measureText(txt).width, px = fs * 0.85, bw = tw + px * 2, bh = fs * 2.1, tl = fs * 0.62, R = hd.R;
      for (var oi = 0; oi < order.length; oi++) {
        var o = order[oi], b, tip;
        if (o === 'tl') { tip = { x: hd.x - R * 0.45, y: hd.y - R * 0.98 }; b = { x: tip.x - bw + bh * 0.9, y: tip.y - tl - bh, w: bw, h: bh }; }
        else if (o === 'tr') { tip = { x: hd.x + R * 0.45, y: hd.y - R * 0.98 }; b = { x: tip.x - bh * 0.9, y: tip.y - tl - bh, w: bw, h: bh }; }
        else if (o === 'left') { tip = { x: hd.x - R * 1.14, y: hd.y - R * 0.25 }; b = { x: tip.x - tl - bw, y: tip.y - bh * 0.62, w: bw, h: bh }; }
        else { tip = { x: hd.x + R * 1.14, y: hd.y - R * 0.25 }; b = { x: tip.x + tl, y: tip.y - bh * 0.62, w: bw, h: bh }; }
        var pad = 14 * u;
        if (b.x < pad || b.y < pad || b.x + b.w > W - pad || b.y + b.h > H - pad) continue;
        if (L.occ.some(function (r) { return hit(b, r, 12 * u); }) || unsafe.some(function (r) { return hit(b, r, 0); })) continue;
        return { t: txt, side: o, b: b, tip: tip, size: fs, px: px };
      }
    }
    return null;
  }


  /* Odoo band layout. apps: one row of tiles (as many as fit at 96u+). flow: up to 6 steps, evenly spaced. */
  function layoutBand(g, sp, x, y, w, u, k) {
    var items = (sp.items || []).filter(Boolean), i;
    if (sp.prop === 'apps') {
      var gap = 18 * u, n = Math.min(items.length, 8), ts;
      for (; n > 1; n--) { ts = Math.min(150 * u, (w - gap * (n - 1)) / n); if (ts >= 96 * u) break; }
      ts = Math.min(150 * u, (w - gap * (n - 1)) / n);
      var ls = Math.round(clamp(ts * 0.17, 17 * u, 24 * u)), list = [], widest = 0;
      setFont(g, '600 ' + ls + 'px ' + FB, 0);
      for (i = 0; i < n; i++) { var nm = String(items[i]).split('|')[0].trim(); widest = Math.max(widest, g.measureText(nm).width); list.push({ t: nm, mod: appMod(nm), x: x + i * (ts + gap), y: y, s: ts }); }
      if (widest > ts + gap * 0.7) ls = Math.max(Math.round(13 * u), Math.floor(ls * (ts + gap * 0.7) / widest));
      var bw = n * ts + (n - 1) * gap, off = k === 'V' ? (w - bw) / 2 : 0;
      list.forEach(function (l) { l.x += off; });
      return { kind: 'apps', items: list, x: x + off, y: y, w: bw, h: ts + 12 * u + ls * 1.3, ls: ls, more: items.length - n };
    }
    var steps = items.slice(0, 6).map(function (t) {
      var p = String(t).split('|'), st = p[0].trim(), cap = (p[1] || '').trim();
      return { t: st, cap: cap, mod: appMod(cap) || appMod(st), ic: STEP_ICON[st.toLowerCase()] || 'grid' };
    });
    var c = steps.length, ns = clamp(w / (c * 1.85), 62 * u, 112 * u), span = c > 1 ? (w - ns) / (c - 1) : 0;
    if (c > 1 && span - ns < 34 * u) { ns = Math.max(48 * u, (w - 34 * u * (c - 1)) / c); span = (w - ns) / (c - 1); }
    var fl = Math.round(clamp(ns * 0.25, 18 * u, 28 * u)), fc = Math.round(fl * 0.8), lim = c > 1 ? span - 10 * u : w, wl = 0, wc = 0;
    setFont(g, '700 ' + fl + 'px ' + FB, 0); steps.forEach(function (st) { wl = Math.max(wl, g.measureText(st.t).width); });
    if (wl > lim) fl = Math.max(Math.round(14 * u), Math.floor(fl * lim / wl));
    setFont(g, '600 ' + fc + 'px ' + FB, 0); steps.forEach(function (st) { wc = Math.max(wc, g.measureText(st.cap).width); });
    if (wc > lim) fc = Math.max(Math.round(12 * u), Math.floor(fc * lim / wc));
    var anyCap = steps.some(function (st) { return st.cap; });
    return { kind: 'flow', steps: steps, x: x, y: y, w: w, ns: ns, span: span, ls: fl, cs: fc, h: ns + 14 * u + fl * 1.25 + (anyCap ? fc * 1.4 : 0), more: items.length - steps.length };
  }

  /* Odoo band drawing. The flow builds node by node, then a dot runs the whole chain and the last step gets its tick. */
  function drawBand(g, L, t, u) {
    var B = L.band, dark = L.dark; if (!B) return;
    if (B.kind === 'apps') {
      B.items.forEach(function (it, i) {
        var e = prog(t, 1.2 + i * 0.08, 0.42); if (e <= 0) return;
        var sc = 0.8 + 0.2 * back(e), cx = it.x + it.s / 2, cy = it.y + it.s / 2, im = it.mod && GOT[appSrc(it.mod)], is = it.s * 0.58;
        g.save(); g.globalAlpha = Math.min(1, e * 1.7); g.translate(cx, cy); g.scale(sc, sc); g.translate(-cx, -cy);
        card(g, it.x, it.y, it.s, it.s, it.s * 0.24, u);
        if (im) g.drawImage(im, cx - is / 2, cy - is / 2, is, is); else icon(g, APP_ICON[it.t.toLowerCase()] || 'grid', cx - is * 0.4, cy - is * 0.4, is * 0.8, C.blue, 2.1);
        setFont(g, '600 ' + B.ls + 'px ' + FB, 0); g.textAlign = 'center'; g.fillStyle = dark ? '#FFFFFF' : C.ink;
        g.fillText(it.t, cx, it.y + it.s + 10 * u + B.ls * 0.95); g.textAlign = 'left';
        g.restore();
      });
      return;
    }
    var n = B.steps.length, ns = B.ns, cy = B.y + ns / 2, T0 = 1.3, ST = 0.2, i;
    var tok = t == null ? null : clamp((t - 2.7) / 3, 0, 1) * (n - 1);
    function cxOf(j) { return n > 1 ? B.x + ns / 2 + j * B.span : B.x + B.w / 2; }
    for (i = 0; i < n - 1; i++) {
      var pc = eo(prog(t, T0 + 0.12 + i * ST, 0.3)); if (pc <= 0) continue;
      var x1 = cxOf(i) + ns / 2 + 9 * u, x2 = cxOf(i + 1) - ns / 2 - 9 * u, xe = x1 + (x2 - x1) * pc, lit = tok == null || tok >= i + 1;
      g.strokeStyle = lit ? (dark ? '#FFFFFF' : C.blue) : (dark ? 'rgba(255,255,255,.45)' : C.sky);
      g.lineWidth = 3.2 * u; g.lineCap = 'round'; g.lineJoin = 'round';
      g.setLineDash([0.1, 9 * u]); g.beginPath(); g.moveTo(x1, cy); g.lineTo(Math.max(x1, xe - 10 * u), cy); g.stroke(); g.setLineDash([]);
      if (pc >= 1) { g.beginPath(); g.moveTo(x2 - 9 * u, cy - 8 * u); g.lineTo(x2, cy); g.lineTo(x2 - 9 * u, cy + 8 * u); g.stroke(); }
    }
    B.steps.forEach(function (st, j) {
      var e = prog(t, T0 + j * ST, 0.45); if (e <= 0) return;
      var cx = cxOf(j), sc = 0.78 + 0.22 * back(e), x = cx - ns / 2, y = B.y, last = j === n - 1;
      var reached = tok != null && tok >= j - 0.001, im = st.mod && GOT[appSrc(st.mod)], is = ns * 0.56;
      g.save(); g.globalAlpha = Math.min(1, e * 1.7); g.translate(cx, cy); g.scale(sc, sc); g.translate(-cx, -cy);
      card(g, x, y, ns, ns, ns * 0.28, u);
      if (reached || (t == null && last)) { g.strokeStyle = dark ? '#9CC0FF' : C.blue; g.lineWidth = 3.4 * u; rr(g, x - 6 * u, y - 6 * u, ns + 12 * u, ns + 12 * u, ns * 0.28 + 6 * u); g.stroke(); }
      if (im) g.drawImage(im, cx - is / 2, cy - is / 2, is, is); else icon(g, st.ic, cx - is * 0.42, cy - is * 0.42, is * 0.84, C.blue, 2.1);
      if (last && (t == null || tok >= n - 1 - 0.001)) {
        var br = ns * 0.18, bx = x + ns - br * 0.25, by = y + br * 0.25;
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(bx, by, br + 3 * u, 0, 7); g.fill();
        g.fillStyle = C.blue; g.beginPath(); g.arc(bx, by, br, 0, 7); g.fill();
        icon(g, 'check', bx - br * 0.62, by - br * 0.62, br * 1.24, '#FFFFFF', 3.4);
      }
      setFont(g, '700 ' + B.ls + 'px ' + FB, 0); g.textAlign = 'center'; g.fillStyle = dark ? '#FFFFFF' : C.ink;
      var ly = y + ns + 14 * u + B.ls * 0.92; g.fillText(st.t, cx, ly);
      if (st.cap) { setFont(g, '600 ' + B.cs + 'px ' + FB, 0); g.fillStyle = dark ? '#BFD3F7' : C.ink3; g.fillText(st.cap, cx, ly + B.cs * 1.4); }
      g.textAlign = 'left'; g.restore();
    });
    if (tok != null && tok > 0 && tok < n - 1) {
      var seg = Math.floor(tok), f = tok - seg, a = cxOf(seg) + ns / 2 + 9 * u, b = cxOf(seg + 1) - ns / 2 - 9 * u;
      if (f > 0.04 && f < 0.96) {
        var px = a + (b - a) * f, hr = g.createRadialGradient(px, cy, 0, px, cy, 20 * u);
        hr.addColorStop(0, dark ? 'rgba(255,255,255,.55)' : 'rgba(49,103,202,.45)'); hr.addColorStop(1, 'rgba(49,103,202,0)');
        g.fillStyle = hr; g.beginPath(); g.arc(px, cy, 20 * u, 0, 7); g.fill();
        g.fillStyle = dark ? '#FFFFFF' : C.blue; g.beginPath(); g.arc(px, cy, 8 * u, 0, 7); g.fill();
      }
    }
  }

  /* props: small white cards in a column box */
  function layoutProps(g, sp, box, u, k) {
    var kind = sp.prop || 'none', items = (sp.items || []).filter(Boolean), out = [], y = box.y, gap = 16 * u, maxN = box.max;
    if (kind === 'none' || !items.length || box.h < 80 * u) return out;
    var fs = Math.round((k === 'V' ? 28 : 25) * u);
    function room(h) { return y + h <= box.y + box.h; }
    if (kind === 'apps' || kind === 'flow') return out;
    if (kind === 'stats') {
      var cw = (box.w - gap) / 2, ch = 116 * u, i;
      for (i = 0; i < Math.min(items.length, maxN); i++) {
        var row = Math.floor(i / 2), cy = box.y + row * (ch + gap);
        if (cy + ch > box.y + box.h) break;
        var parts = String(items[i]).split('|');
        out.push({ k: 'stat', big: parts[0], t: parts[1] || '', x: box.x + (i % 2) * (cw + gap), y: cy, w: cw, h: ch });
      }
      return out;
    }
    if (kind === 'site') {
      var sw = Math.min(box.w, 520 * u), sh = sw * 0.62;
      if (box.h < sh * 0.6) return out;
      if (sh > box.h) { sh = box.h; sw = sh / 0.62; }
      out.push({ k: 'site', t: items[0] || '', x: box.x, y: y, w: sw, h: sh });
      return out;
    }
    items.slice(0, maxN).forEach(function (t, i) {
      var last = i === items.length - 1, kindI = kind === 'chat' ? (i % 2 ? 'bot' : 'user') : kind === 'sheets' ? (last ? 'win' : 'file') : 'check';
      var isMsg = kind === 'chat', ic = isMsg ? 0 : 46 * u, pxx = (isMsg ? 26 : 18) * u, maxTw = box.w * (isMsg ? 0.84 : 1) - pxx * 2 - (ic ? ic + 16 * u : 0);
      var T = fit(g, t, { weight: kindI === 'win' ? 700 : 600, family: FB, max: fs, min: fs * 0.82, maxW: maxTw, maxLines: isMsg ? 3 : 1, lh: 1.3 });
      var w = T.w + pxx * 2 + (ic ? ic + 16 * u : 0), h = Math.max(T.h, ic) + (isMsg ? 22 : 18) * u * 2 * (isMsg ? 1 : 0.62);
      if (!room(h) || out.length >= maxN) return;
      var x = box.x + (kindI === 'bot' ? Math.min(box.w - w, 44 * u) : 0);
      out.push({ k: kindI, T: T, x: x, y: y, w: w, h: h, px: pxx, ic: ic });
      y += h + gap;
    });
    return out;
  }

  /* ------------------------------------------------------------------ drawing */
  function drawText(g, T, x, y, align, col, acc, t0, t, u, under) {
    setFont(g, T.font, T.ls); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    T.lines.forEach(function (l, i) {
      var p = eo(prog(t, t0 + i * 0.11, 0.5)); if (p <= 0) return;
      var lx = align === 'center' ? x - l.w / 2 : x, ly = y + i * T.size * T.lh + (1 - p) * 36 * u, base = ly + T.size * (T.lh - 1) / 2 + T.size * 0.84;
      g.globalAlpha = p;
      var cx = lx, a0 = null, a1 = null;
      l.words.forEach(function (w, wi) {
        w.runs.forEach(function (r) {
          g.fillStyle = r.a ? acc : col; g.fillText(r.t, cx, base);
          var rw = g.measureText(r.t).width;
          if (r.a && /\w/.test(r.t)) { if (a0 === null) a0 = cx; a1 = cx + rw; }
          cx += rw;
        });
        if (wi < l.words.length - 1) cx += T.sp;
      });
      if (under && a0 !== null) {
        var q = eo(prog(t, 1.1 + i * 0.08, 0.5));
        if (q > 0) {
          var uy = base + T.size * 0.14, xe = a0 + (a1 - a0) * q;
          g.save(); g.beginPath(); g.rect(a0 - T.size * 0.1, uy - T.size * 0.3, (xe - a0) + T.size * 0.2, T.size * 0.6); g.clip();
          g.strokeStyle = under; g.lineWidth = T.size * 0.075; g.lineCap = 'round';
          g.beginPath(); g.moveTo(a0, uy + T.size * 0.02); g.quadraticCurveTo((a0 + a1) / 2, uy + T.size * 0.09, a1, uy - T.size * 0.02); g.stroke(); g.restore();
        }
      }
    });
    g.globalAlpha = 1;
  }

  function drawLock(g, L, dark) {
    var k = L.lock, logo = GOT[dark ? LOGO.white : LOGO.blue];
    if (logo) g.drawImage(logo, k.x, k.cy - k.h / 2, k.lw, k.h);
    if (!k.badge) return;
    var od = GOT[LOGO.odoo], x = k.x + k.lw + k.gap, u = L.u;
    g.fillStyle = dark ? 'rgba(255,255,255,.35)' : '#C9D6EE'; g.fillRect(x, k.cy - k.h * 0.6, 2 * u, k.h * 1.2);
    x += 2 * u + k.gap;
    if (dark) { g.fillStyle = '#FFFFFF'; rr(g, x, k.cy - k.bh / 2 - 8 * u, k.bw + 28 * u, k.bh + 16 * u, 14 * u); g.fill(); x += 14 * u; }
    if (od) g.drawImage(od, ODOO_CROP[0], ODOO_CROP[1], ODOO_CROP[2], ODOO_CROP[3], x, k.cy - k.bh / 2, k.bw, k.bh);
  }

  function drawKicker(g, K, dark, a, u) {
    if (a <= 0) return;
    g.globalAlpha = a;
    var y = K.y + (1 - a) * 18 * u;
    g.fillStyle = dark ? 'rgba(255,255,255,.13)' : C.mist; rr(g, K.x, y, K.w, K.h, K.h / 2); g.fill();
    if (dark) { g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1.5 * u; g.stroke(); }
    g.fillStyle = dark ? '#9CC0FF' : C.blue; g.beginPath(); g.arc(K.x + K.px + K.dot, y + K.h / 2, K.dot, 0, Math.PI * 2); g.fill();
    setFont(g, '700 ' + Math.round(K.size) + 'px ' + FB, K.size * 0.12); g.textBaseline = 'middle';
    g.fillStyle = dark ? '#FFFFFF' : C.deep; g.fillText(K.t, K.x + K.px + K.dot * 2 + K.size * 0.55, y + K.h / 2 + K.size * 0.04);
    g.textBaseline = 'alphabetic'; g.globalAlpha = 1;
  }

  function drawCTA(g, c, label, dark, a, sc, u) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = a;
    var cx = c.x + c.w / 2, cy = c.y + c.h / 2; g.translate(cx, cy); g.scale(sc, sc); g.translate(-cx, -cy);
    shadow(g, dark ? 'rgba(4,12,40,.35)' : 'rgba(49,103,202,.42)', 34 * u, 14 * u);
    g.fillStyle = dark ? '#FFFFFF' : C.blue; rr(g, c.x, c.y, c.w, c.h, c.h / 2); g.fill(); noShadow(g);
    var fg = dark ? C.deep : '#FFFFFF', tx = c.x + c.h * 0.48;
    setFont(g, '700 ' + c.size + 'px ' + FD, 0); g.textBaseline = 'middle'; g.fillStyle = fg; g.fillText(label, tx, cy + c.size * 0.04);
    var ax = tx + c.tw + c.h * 0.2, aw = c.h * 0.26;
    g.strokeStyle = fg; g.lineWidth = c.h * 0.045; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(ax, cy); g.lineTo(ax + aw, cy); g.moveTo(ax + aw * 0.55, cy - aw * 0.45); g.lineTo(ax + aw, cy); g.lineTo(ax + aw * 0.55, cy + aw * 0.45); g.stroke();
    g.textBaseline = 'alphabetic'; g.restore();
  }

  function drawBubble(g, B, a, sc, u) {
    if (!B || a <= 0) return;
    g.save(); g.globalAlpha = a;
    g.translate(B.tip.x, B.tip.y); g.scale(sc, sc); g.translate(-B.tip.x, -B.tip.y);
    var b = B.b, r = b.h * 0.42, tw = b.h * 0.34;
    shadow(g, 'rgba(20,50,120,.22)', 28 * u, 10 * u); g.fillStyle = '#FFFFFF';
    rr(g, b.x, b.y, b.w, b.h, r); g.fill();
    g.beginPath();
    if (B.side === 'tl' || B.side === 'tr') { var bx = clamp(B.tip.x, b.x + r, b.x + b.w - r); g.moveTo(bx - tw / 2, b.y + b.h - 1); g.lineTo(B.tip.x, B.tip.y); g.lineTo(bx + tw / 2, b.y + b.h - 1); }
    else if (B.side === 'left') { var by = clamp(B.tip.y, b.y + r * 0.6, b.y + b.h - r * 0.6); g.moveTo(b.x + b.w - 1, by - tw / 2); g.lineTo(B.tip.x, B.tip.y); g.lineTo(b.x + b.w - 1, by + tw / 2); }
    else { var by2 = clamp(B.tip.y, b.y + r * 0.6, b.y + b.h - r * 0.6); g.moveTo(b.x + 1, by2 - tw / 2); g.lineTo(B.tip.x, B.tip.y); g.lineTo(b.x + 1, by2 + tw / 2); }
    g.closePath(); g.fill(); noShadow(g);
    setFont(g, '800 ' + B.size + 'px ' + FD, -0.01 * B.size); g.textBaseline = 'middle'; g.fillStyle = C.ink;
    g.fillText(B.t, b.x + B.px, b.y + b.h / 2 + B.size * 0.04);
    g.textBaseline = 'alphabetic'; g.restore();
  }

  function card(g, x, y, w, h, r, u, fill) {
    shadow(g, 'rgba(30,70,145,.18)', 30 * u, 10 * u); g.fillStyle = fill || '#FFFFFF'; rr(g, x, y, w, h, r); g.fill(); noShadow(g);
  }

  function drawProps(g, L, t, u) {
    L.props.forEach(function (p, i) {
      var e = prog(t, 1.3 + i * 0.16, 0.45); if (e <= 0) return;
      var s = 0.86 + 0.14 * back(e), cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      g.save(); g.globalAlpha = Math.min(1, e * 1.6); g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy);
      if (p.k === 'app') {
        card(g, p.x, p.y, p.w, p.h, p.w * 0.24, u);
        var ic = APP_ICON[String(p.t).toLowerCase()] || 'grid', is = p.w * 0.36;
        icon(g, ic, p.x + (p.w - is) / 2, p.y + p.h * 0.17, is, C.blue, 2.1);
        setFont(g, '600 ' + p.fs + 'px ' + FB, 0); g.textAlign = 'center'; g.fillStyle = C.ink; g.fillText(p.t, p.x + p.w / 2, p.y + p.h * 0.82); g.textAlign = 'left';
      } else if (p.k === 'stat') {
        card(g, p.x, p.y, p.w, p.h, 22 * u, u);
        setFont(g, '800 ' + Math.round(p.h * 0.42) + 'px ' + FD, -0.02 * p.h * 0.42); g.fillStyle = C.blue; g.fillText(p.big, p.x + 22 * u, p.y + p.h * 0.52);
        setFont(g, '600 ' + Math.round(p.h * 0.17) + 'px ' + FB, 0); g.fillStyle = C.ink2; g.fillText(p.t, p.x + 22 * u, p.y + p.h * 0.8);
      } else if (p.k === 'site') {
        drawSite(g, p, u, L);
      } else {
        var T = p.T, isMsg = p.k === 'user' || p.k === 'bot', fill = p.k === 'bot' || p.k === 'win' ? C.blue : '#FFFFFF';
        if (isMsg) {
          shadow(g, 'rgba(30,70,145,.18)', 30 * u, 10 * u); g.fillStyle = fill;
          var r = Math.min(30 * u, p.h / 2); rr(g, p.x, p.y, p.w, p.h, r); g.fill(); noShadow(g);
          g.fillStyle = fill; g.fillRect(p.k === 'bot' ? p.x + p.w - r : p.x, p.y + p.h - r, r, r);
        } else card(g, p.x, p.y, p.w, p.h, Math.min(22 * u, p.h / 2), u, fill);
        var tx = p.x + p.px, ty = p.y + (p.h - T.h) / 2;
        if (p.ic) {
          var ib = p.ic, iy = p.y + (p.h - ib) / 2;
          g.fillStyle = p.k === 'win' ? 'rgba(255,255,255,.18)' : p.k === 'file' ? '#F1F3F8' : C.mist; rr(g, tx, iy, ib, ib, ib * 0.3); g.fill();
          icon(g, p.k === 'file' ? 'file' : 'check', tx + ib * 0.2, iy + ib * 0.2, ib * 0.6, p.k === 'win' ? '#FFFFFF' : p.k === 'file' ? C.ink3 : C.blue, p.k === 'check' || p.k === 'win' ? 2.8 : 2);
          tx += ib + 16 * u;
        }
        var col = p.k === 'bot' || p.k === 'win' ? '#FFFFFF' : p.k === 'file' ? C.ink3 : C.ink;
        drawText(g, T, tx, ty, 'left', col, col, -9, null, u, null);
        if (p.k === 'file') { var lw0 = T.lines[0] ? T.lines[0].w : 0, my = ty + T.size * T.lh / 2 + T.size * 0.06; g.strokeStyle = C.ink3; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(tx - 2 * u, my); g.lineTo(tx + lw0 + 2 * u, my); g.stroke(); }
      }
      g.restore();
    });
  }

  function drawSite(g, p, u, L) {
    var x = p.x, y = p.y, w = p.w, h = p.h, bar = h * 0.11;
    card(g, x, y, w, h, 18 * u, u);
    g.save(); rr(g, x, y, w, h, 18 * u); g.clip();
    g.fillStyle = '#F3F6FC'; g.fillRect(x, y, w, bar);
    ['#E3E7F0', '#E3E7F0', '#E3E7F0'].forEach(function (c, i) { g.fillStyle = c; g.beginPath(); g.arc(x + bar * 0.55 + i * bar * 0.42, y + bar / 2, bar * 0.13, 0, 7); g.fill(); });
    g.fillStyle = '#FFFFFF'; rr(g, x + w * 0.3, y + bar * 0.22, w * 0.42, bar * 0.56, bar * 0.28); g.fill();
    var px = x + w * 0.07, py = y + bar + h * 0.09;
    g.fillStyle = C.ink; rr(g, px, py, w * 0.38, h * 0.06, h * 0.03); g.fill();
    g.fillStyle = C.blue; rr(g, px, py + h * 0.09, w * 0.28, h * 0.06, h * 0.03); g.fill();
    g.fillStyle = '#E3E7F0'; [0, 1, 2].forEach(function (i) { rr(g, px, py + h * 0.2 + i * h * 0.055, w * (0.4 - i * 0.07), h * 0.026, h * 0.013); g.fill(); });
    g.fillStyle = C.blue; rr(g, px, py + h * 0.39, w * 0.17, h * 0.085, h * 0.042); g.fill();
    g.fillStyle = C.tint; rr(g, x + w * 0.54, py - h * 0.01, w * 0.39, h * 0.44, 12 * u); g.fill();
    g.strokeStyle = C.sky; g.lineWidth = 3 * u; g.lineJoin = 'round'; g.beginPath();
    var ix = x + w * 0.6, iy = py + h * 0.36; g.moveTo(ix, iy); g.lineTo(ix + w * 0.08, iy - h * 0.13); g.lineTo(ix + w * 0.14, iy - h * 0.05); g.lineTo(ix + w * 0.2, iy - h * 0.17); g.lineTo(ix + w * 0.27, iy); g.stroke();
    var fy = y + h * 0.72;
    [0, 1, 2].forEach(function (i) { var fx = x + w * 0.07 + i * w * 0.29; g.fillStyle = C.mist; rr(g, fx, fy, w * 0.26, h * 0.2, 10 * u); g.fill(); g.fillStyle = C.sky; rr(g, fx + w * 0.025, fy + h * 0.045, h * 0.06, h * 0.06, h * 0.018); g.fill(); g.fillStyle = '#D5DEEE'; rr(g, fx + w * 0.025, fy + h * 0.13, w * 0.15, h * 0.025, h * 0.012); g.fill(); });
    g.restore();
    /* chat widget, with the greeting */
    var cr = h * 0.1, cx = x + w - cr * 1.2, cy = y + h - cr * 1.2;
    shadow(g, 'rgba(49,103,202,.45)', 18 * u, 6 * u); g.fillStyle = C.blue; g.beginPath(); g.arc(cx, cy, cr, 0, 7); g.fill(); noShadow(g);
    icon(g, 'chat', cx - cr * 0.55, cy - cr * 0.55, cr * 1.1, '#FFFFFF', 2.2);
    if (p.t) {
      var fs = Math.round(h * 0.075); setFont(g, '600 ' + fs + 'px ' + FB, 0);
      var tw = g.measureText(p.t).width, bw = tw + fs * 1.6, bh = fs * 2.1, bx = cx - cr - bw + cr * 0.3, by = cy - cr - bh - 8 * u;
      card(g, bx, by, bw, bh, bh * 0.45, u, '#FFFFFF');
      g.fillStyle = C.ink; g.textBaseline = 'middle'; g.fillText(p.t, bx + fs * 0.8, by + bh / 2 + fs * 0.04); g.textBaseline = 'alphabetic';
    }
  }

  function drawStage(g, L, a, sc) {
    var f = L.focus, u = L.u, r = f.r * sc;
    if (a <= 0) return;
    g.save(); g.globalAlpha = a;
    if (!L.dark) {
      var gr = g.createLinearGradient(f.x - r, f.y - r, f.x + r, f.y + r); gr.addColorStop(0, '#83AEF8'); gr.addColorStop(1, '#2F60C2');
      g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, r, 0, Math.PI * 2); g.fill();
      var hl = g.createRadialGradient(f.x - r * 0.35, f.y - r * 0.45, 0, f.x - r * 0.35, f.y - r * 0.45, r * 1.1);
      hl.addColorStop(0, 'rgba(255,255,255,.28)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = hl; g.fill();
      g.strokeStyle = 'rgba(111,160,245,.45)'; g.lineWidth = 3 * u; g.beginPath(); g.arc(f.x, f.y, r * 1.09, 0, Math.PI * 2); g.stroke();
    } else {
      var rg = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 1.05);
      rg.addColorStop(0, 'rgba(255,255,255,.20)'); rg.addColorStop(.7, 'rgba(255,255,255,.07)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(f.x, f.y, r * 1.05, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.26)'; g.lineWidth = 3 * u; g.beginPath(); g.arc(f.x, f.y, r * 0.98, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  }

  function drawNexi(g, L, sp, t) {
    var nx = L.nexi, u = L.u, e = back(prog(t, 0.15, 0.8)), al = prog(t, 0.15, 0.25);
    if (al <= 0) return;
    var bob = t == null ? 0 : Math.sin((t - 1) * 2.4) * 7 * u * clamp(t - 1, 0, 1);
    var hop = t == null ? 0 : -bell(prog(t, SWAP - 0.12, 0.5)) * 26 * u;
    var dy = (1 - e) * 170 * u + bob + hop, sc = 0.86 + 0.14 * e;
    var k2 = sp.pose2 && t != null ? prog(t, SWAP, 0.22) : 0;
    /* floor shadow */
    var fy = nx.Y + 700 * nx.s, sw = 300 * nx.s * (1 - 0.2 * Math.abs(bob) / (7 * u + 1e-6) * 0);
    var sg = g.createRadialGradient(nx.X, fy, 0, nx.X, fy, sw);
    sg.addColorStop(0, L.dark ? 'rgba(0,8,30,.42)' : 'rgba(14,40,100,.30)'); sg.addColorStop(1, 'rgba(14,40,100,0)');
    g.save(); g.globalAlpha = al; g.translate(nx.X, fy); g.scale(1, 0.16); g.translate(-nx.X, -fy); g.fillStyle = sg; g.beginPath(); g.arc(nx.X, fy, sw, 0, 7); g.fill(); g.restore();
    [[sp.pose, 1 - k2], [sp.pose2, k2]].forEach(function (pa) {
      if (pa[1] <= 0 || !pa[0]) return;
      var A = D.POSES[pa[0]] || D.POSES.hello, im = GOT[poseSrc(pa[0])]; if (!im) return;
      var s = nx.s * sc;
      g.globalAlpha = al * pa[1];
      g.drawImage(im, nx.X - A.ax * s, nx.Y + dy - A.ay * s + (1 - sc) * 300 * nx.s, A.w * s, A.h * s);
    });
    g.globalAlpha = 1;
  }

  function draw(g, W, H, sp, t) {
    var L = plan(W, H, sp), u = L.u, dark = L.dark;
    g.save(); g.clearRect(0, 0, W, H);
    var bg = BGC[bgKey(sp.bg, W, H, L.focus)];
    if (bg && bg.c) g.drawImage(bg.c, 0, 0); else { g.fillStyle = dark ? '#16367A' : '#FFFFFF'; g.fillRect(0, 0, W, H); }
    drawStage(g, L, prog(t, 0, 0.3), 0.6 + 0.4 * back(prog(t, 0, 0.7)));
    drawNexi(g, L, sp, t);
    drawLock(g, L, dark);
    if (L.kick) drawKicker(g, L.kick, dark, eo(prog(t, 0.25, 0.4)), u);
    drawText(g, L.head.T, L.head.x, L.head.y, L.align, dark ? '#FFFFFF' : C.ink, dark ? '#9CC0FF' : C.blue, 0.4, t, u, dark ? 'rgba(156,192,255,.55)' : 'rgba(111,160,245,.55)');
    if (L.sub) drawText(g, L.sub.T, L.sub.x, L.sub.y, L.align, dark ? '#D6E2FA' : C.ink2, dark ? '#D6E2FA' : C.ink2, 0.85, t, u, null);
    drawBand(g, L, t, u);
    drawProps(g, L, t, u);
    if (L.cta) {
      var ce = prog(t, 1.8, 0.5), pulse = t == null ? 0 : 0.045 * (bell(prog(t, 4.6, 0.6)) + bell(prog(t, 6.4, 0.6)));
      drawCTA(g, L.cta, sp.cta, dark, Math.min(1, ce * 1.6), 0.72 + 0.28 * back(ce) + pulse, u);
      if (L.url) {
        g.globalAlpha = prog(t, 2.1, 0.4); setFont(g, '600 ' + L.url.size + 'px ' + FB, 0); g.textBaseline = 'middle';
        g.fillStyle = dark ? 'rgba(255,255,255,.78)' : C.ink3; g.fillText('technext.asia', L.url.x, L.url.y + L.url.size * 0.04); g.textBaseline = 'alphabetic'; g.globalAlpha = 1;
      }
    }
    /* bubbles: the first pops in, swaps for the second when Nexi changes pose */
    var b1 = L.bubbles[0], b2 = sp.pose2 ? L.bubbles[1] : null;
    if (b1) {
      var inA = prog(t, 0.95, 0.4), outA = b2 && t != null ? prog(t, SWAP - 0.25, 0.2) : 0;
      drawBubble(g, b1, Math.min(1, inA * 2) * (1 - outA), (0.5 + 0.5 * back(inA)) * (1 - 0.3 * outA), u);
    }
    if (b2 && t != null) { var in2 = prog(t, SWAP + 0.15, 0.4); drawBubble(g, b2, Math.min(1, in2 * 2), 0.5 + 0.5 * back(in2), u); }
    g.restore();
    return L;
  }

  function prepare(sp, W, H) {
    return fonts().then(function () {
      var L = plan(W, H, sp), list = [load(poseSrc(sp.pose)), load(LOGO[L.dark ? 'white' : 'blue'])];
      if (sp.pose2) list.push(load(poseSrc(sp.pose2)));
      if (sp.badge) list.push(load(LOGO.odoo));
      if (L.band) (L.band.items || L.band.steps).forEach(function (it) { if (it.mod) list.push(load(appSrc(it.mod))); });
      list.push(bgRaster(sp.bg, W, H, L.focus));
      return Promise.all(list.map(function (p) { return p.catch(function (e) { return e; }); })).then(function () { return L; });
    });
  }

  window.TNAds = { prepare: prepare, draw: draw, plan: plan, shape: shape, DUR: DUR, load: load, poseSrc: poseSrc, appSrc: appSrc, appMod: appMod };
})();
