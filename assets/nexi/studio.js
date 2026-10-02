/* Nexi Studio. Reads window.NEXI_BRAIN (synced from technext.asia) and window.NEXI_DATA. Pure ASCII. */
(function () {
'use strict';
var B = window.NEXI_BRAIN, D = window.NEXI_DATA, F = B.fn;
var SITE = 'https://technext.asia/';
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
var esc = F.esc, icon = F.icon;
var GOALS = { schedule: 1, quote: 1, talk: 1 };

function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
var toastT = 0;
function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('show'); }, 2200); }
function copy(text, msg) {
  function ok() { toast(msg || 'Copied'); }
  try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
  function fallback() { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('Copy failed'); } ta.remove(); }
}
function download(name, blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
function icons(a) { return String(a || '').replace(/\{([io]_[a-z_]+)\}/g, function (m, k) { return icon(k); }); }
function splitList(s) { return String(s || '').split(/[,\n]/).map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean); }

/* ================================================================ learnings + merged brain */
var LKEY = 'nexi_studio_learnings_v1';
var L = store(LKEY);
if (!Array.isArray(L)) L = JSON.parse(JSON.stringify(D.LEARNINGS));
function saveL() { store(LKEY, L); }

function merged(apply) {
  var KB = B.KB.map(function (k) { return { id: k.id, kw: k.kw.slice(), a: k.a, actions: (k.actions || []).slice(), goal: k.goal }; });
  var LABEL = Object.assign({}, B.LABEL), FOLLOW = {}, TOPIC = {}, added = {}, touched = {};
  Object.keys(B.FOLLOW).forEach(function (k) { FOLLOW[k] = B.FOLLOW[k].slice(); });
  Object.keys(B.TOPIC).forEach(function (k) { TOPIC[k] = Object.assign({}, B.TOPIC[k]); });
  var byId = function (id) { for (var i = 0; i < KB.length; i++) if (KB[i].id === id) return KB[i]; return null; };
  if (apply) L.forEach(function (l) {
    if (!l.on) return;
    var k = byId(l.topic);
    if (l.type === 'kw' && k) {
      added[k.id] = added[k.id] || [];
      l.kw.forEach(function (w) { if (k.kw.indexOf(w) < 0) { k.kw.push(w); added[k.id].push(w); } });
      touched[k.id] = (touched[k.id] || 0) + 1;
    } else if (l.type === 'new' && l.topic) {
      if (!k) { k = { id: l.topic, kw: [], a: '', actions: [] }; KB.splice(KB.length - 3, 0, k); }
      k.kw = k.kw.concat(l.kw.filter(function (w) { return k.kw.indexOf(w) < 0; }));
      k.a = icons(l.ans) || k.a; k.actions = parseActs(l.links);
      added[k.id] = l.kw.slice();
      if (l.label) LABEL[k.id] = l.label;
      TOPIC[k.id] = { icon: l.icon || 'i_chat', react: l.react || 'nod', intro: l.intro || '' };
      FOLLOW[k.id] = (l.fol && l.fol.length) ? l.fol.slice() : ['price', 'how', 'talk'];
      (l.from || []).forEach(function (src) { if (FOLLOW[src] && FOLLOW[src].indexOf(k.id) < 0) FOLLOW[src][Math.max(0, FOLLOW[src].length - 2)] = k.id; });
      touched[k.id] = (touched[k.id] || 0) + 1;
    } else if (l.type === 'ans' && k) {
      if (l.ans) k.a = icons(l.ans);
      if (l.intro) TOPIC[k.id] = Object.assign({}, TOPIC[k.id], { intro: l.intro });
      if (l.links) k.actions = parseActs(l.links);
      touched[k.id] = (touched[k.id] || 0) + 1;
    } else if (l.type === 'fol' && l.fol && l.fol.length) {
      FOLLOW[l.topic] = l.fol.slice(); touched[l.topic] = (touched[l.topic] || 0) + 1;
    }
  });
  var TOUR_KB = Object.keys(B.TOUR_KW).map(function (id) { return { id: id, kw: B.TOUR_KW[id] }; });
  return { KB: KB, LABEL: LABEL, FOLLOW: FOLLOW, TOPIC: TOPIC, TOUR_KB: TOUR_KB, added: added, touched: touched, byId: byId };
}
function parseActs(text) {
  if (Array.isArray(text)) return text;
  return String(text || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
    var p = s.split('|').map(function (x) { return x.trim(); });
    if (p.length > 1) return ['link', p[0].replace(/^\/+/, ''), p[1]];
    return [p[0]];
  });
}
function actsText(acts) { return (acts || []).map(function (a) { return a[0] === 'link' ? a[1] + ' | ' + a[2] : a[0]; }).join('\n'); }

/* the live matcher's decision, re-run on a (possibly merged) brain; also returns the ranking */
function understand(text, M) {
  var qn = F.norm(text), qt = F.toks(text);
  if (!qt.length) return { type: 'none', rank: [] };
  var rank = [];
  M.TOUR_KB.forEach(function (k) { rank.push({ kind: 'tour', id: k.id, s: F.scoreEntry(k, qt, qn) }); });
  M.KB.forEach(function (k) { rank.push({ kind: 'kb', id: k.id, s: F.scoreEntry(k, qt, qn), k: k }); });
  var tour = best(rank, 'tour'), kb = best(rank, 'kb');
  rank = rank.filter(function (r) { return r.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 5);
  if (tour && tour.s >= 1.1 && tour.s >= (kb ? kb.s : 0)) return { type: 'tour', id: tour.id, s: tour.s, rule: 'Tour score 1.1+ and at least the best topic', rank: rank };
  if (kb && kb.s >= 1.1) return { type: 'kb', id: kb.id, k: kb.k, s: kb.s, rule: 'Topic score 1.1+', rank: rank };
  var pages = F.searchSite(qt);
  if (pages) return { type: 'site', pages: pages, s: kb ? kb.s : 0, rule: 'No strong topic, so the site page index answered', rank: rank };
  if (kb && kb.s >= 0.7) return { type: 'kb', id: kb.id, k: kb.k, s: kb.s, rule: 'Weak topic match (0.7 to 1.1)', weak: true, rank: rank };
  if (tour && tour.s >= 0.7) return { type: 'tour', id: tour.id, s: tour.s, rule: 'Weak tour match (0.7 to 1.1)', weak: true, rank: rank };
  return { type: 'unknown', s: kb ? kb.s : 0, rule: 'Nothing scored 0.7, no site page matched: fallback', rank: rank };
}
function best(rank, kind) { var b = null; rank.forEach(function (r) { if (r.kind === kind && r.s > 0 && (!b || r.s > b.s)) b = r; }); return b; }
function cleanTitle(t) { return (t || '').split(/\s[\u2014|\u00b7]\s/)[0].replace(/\s*[|\u00b7]\s*TechNext\s*$/i, '').trim(); }
function gaveText(r) { return r.type === 'kb' ? r.id : r.type === 'tour' ? 'tour:' + r.id : r.type === 'site' ? 'site:' + (r.pages[0].u || 'home') : 'fallback'; }
function passes(r, exp) {
  if (exp.indexOf('tour:') === 0) return r.type === 'tour' && 'tour:' + r.id === exp;
  if (exp.indexOf('site:') === 0) { var pre = exp.slice(5); return r.type === 'site' && r.pages.some(function (p) { return (p.u || '').indexOf(pre) === 0; }); }
  return r.type === 'kb' && r.id === exp;
}

/* ================================================================ overview */
function renderStats() {
  var M = merged(false), kws = 0; M.KB.forEach(function (k) { kws += k.kw.length; });
  var stats = [[M.KB.length, 'answer topics'], [kws, 'keywords'], [B.QUESTIONS.length, '3D mini tours'], [B.SITE.length, 'site pages indexed'], [Object.keys(GOALS).length, 'goals'], [D.TESTS.length, 'coverage questions']];
  $('#stats').innerHTML = stats.map(function (s) { return '<div class="stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>'; }).join('');
  $('#greet').textContent = ' "' + B.GREETING + '"';
  $('#starts').textContent = B.FOLLOW.start.map(function (id) { return B.LABEL[id]; }).join(' / ');
  $('#synced').textContent = 'Synced from technext.asia ' + B.meta.commit;
  $('#foot-sync').textContent = 'Brain synced ' + B.meta.synced + ' (' + B.meta.commit.split(' ')[0] + ')';
}

function renderChain() {
  var M = merged($('#apply1').checked);
  var keys = M.KB.map(function (k) { return k.id; }).concat(['start', 'site', 'unknown', 'tour_about', 'tour_odoo', 'tour_ai', 'goal']);
  var name = function (id) { return M.LABEL[id] || ({ start: 'Start (greeting)', site: 'After a site-page answer', unknown: 'After a fallback', tour_about: 'After the Services tour', tour_odoo: 'After the Odoo tour', tour_ai: 'After the AI tour', goal: 'After any goal' })[id] || id; };
  $('#chain').innerHTML = keys.filter(function (id) { return M.FOLLOW[id]; }).map(function (id) {
    return '<div class="ch" data-ch="' + id + '"><div class="h">' + esc(name(id)) + '<small>' + id + '</small></div><div class="nx">' +
      M.FOLLOW[id].map(function (n) { return '<span class="tk' + (GOALS[n] ? ' goal' : '') + '" data-go="' + n + '">' + esc(n) + '</span>'; }).join('') + '</div></div>';
  }).join('');
  /* health checks */
  var H = [], reach = {};
  Object.keys(M.FOLLOW).forEach(function (k) { M.FOLLOW[k].forEach(function (n) { reach[n] = 1; }); });
  var noGoal = Object.keys(M.FOLLOW).filter(function (k) { var f = M.FOLLOW[k]; return !GOALS[f[f.length - 1]] && ['start', 'tour_about', 'goal'].indexOf(k) < 0; });
  H.push(noGoal.length ? ['warn', 'Chains that do not end at a goal: ' + noGoal.join(', ') + '.'] : ['ok', 'Every follow-up chain ends at a goal (book, quote or talk).']);
  var SMALL = { thanks: 1, hello: 1 };
  var unreach = M.KB.filter(function (k) { return !reach[k.id] && !GOALS[k.id] && !SMALL[k.id]; }).map(function (k) { return k.id; });
  H.push(unreach.length ? ['warn', 'Never offered as a chip (visitors only reach them by typing): ' + unreach.join(', ') + '.'] : ['ok', 'Every topic is offered as a chip somewhere.']);
  var noLabel = M.KB.filter(function (k) { return !M.LABEL[k.id] && !SMALL[k.id]; }).map(function (k) { return k.id; });
  if (noLabel.length) H.push(['warn', 'No chip label: ' + noLabel.join(', ') + '.']);
  var html = 0; M.KB.forEach(function (k) { (k.actions || []).forEach(function (a) { if (a[0] === 'link' && /\.html/.test(a[1])) html++; }); });
  H.push(html ? ['warn', html + ' answer buttons still link to .html URLs. The site uses clean URLs (/odoo/apps), so each click takes a redirect first.'] : ['ok', 'Answer buttons use clean URLs.']);
  var seen = {}, dup = [];
  M.KB.forEach(function (k) { k.kw.forEach(function (w) { w = F.norm(w); if (seen[w] && seen[w] !== k.id) dup.push(w + ' (' + seen[w] + ' + ' + k.id + ')'); else seen[w] = k.id; }); });
  H.push(dup.length ? ['warn', dup.length + ' keywords sit in two topics, so the earlier topic always wins them: ' + dup.slice(0, 12).join(', ') + (dup.length > 12 ? '...' : '') + '.'] : ['ok', 'No keyword sits in two topics.']);
  $('#health').innerHTML = H.map(function (h) { return '<div class="hc ' + h[0] + '"><i>' + (h[0] === 'ok' ? '&#10003;' : '!') + '</i><span>' + esc(h[1]) + '</span></div>'; }).join('');
}
$('#chain').addEventListener('click', function (e) {
  var t = e.target.closest('[data-go]'); if (!t) return;
  var c = $('[data-ch="' + t.dataset.go + '"]'); if (!c) return;
  $$('.ch.hl').forEach(function (x) { x.classList.remove('hl'); }); c.classList.add('hl');
  c.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

/* ================================================================ brain */
function actHtml(acts) {
  var seen = {};
  return (acts || []).map(function (a) {
    var k = a[0] === 'link' ? a[1] : a[0]; if (seen[k]) return ''; seen[k] = 1;
    if (a[0] === 'link') return '<a class="act" href="' + SITE + esc(a[1]) + '" target="_blank" rel="noopener">' + esc(a[2]) + icon('i_arrow') + '</a>';
    if (a[0] === 'quote') return '<a class="act primary" href="' + SITE + 'quotation" target="_blank" rel="noopener">' + icon('i_receipt') + 'Open the quotation builder</a>';
    if (a[0] === 'meet') return '<a class="act primary" href="' + B.MEET + '" target="_blank" rel="noopener">' + icon('i_calendar') + 'Pick a meeting time</a>';
    if (a[0] === 'talkform') return '<span class="act primary">' + icon('i_send') + 'Open the Let\u2019s Talk form</span>';
    if (a[0] === 'wabook') return '<span class="act primary">' + icon('i_calendar') + 'Book on WhatsApp</span>';
    if (a[0] === 'wa' || a[0] === 'human') return '<span class="act">' + icon('i_whatsapp') + 'WhatsApp the team</span>';
    if (a[0] === 'email') return '<span class="act">' + icon('i_mail') + 'sales@technext.asia</span>';
    if (a[0] === 'tour') { var q = tourById(a[1]); return q ? '<span class="act">' + icon('i_play') + 'Mini tour: ' + esc(q.short) + '</span>' : ''; }
    return '';
  }).join('');
}
function tourById(id) { for (var i = 0; i < B.QUESTIONS.length; i++) if (B.QUESTIONS[i].id === id) return B.QUESTIONS[i]; return null; }
function answerBubble(k, M) {
  var t = M.TOPIC[k.id] || {};
  var acts = (k.actions || []).slice(); if (t.tour) acts.push(['tour', t.tour]);
  return '<div class="bub">' + (t.intro ? '<span class="intro">' + esc(t.intro) + '</span> ' : '') + k.a + '</div>' + (acts.length ? '<div class="acts2">' + actHtml(acts) + '</div>' : '');
}
function renderBrain() {
  var M = merged($('#apply1').checked), q = F.norm($('#bq').value);
  var list = M.KB.filter(function (k) { return !q || F.norm(k.id + ' ' + (M.LABEL[k.id] || '') + ' ' + k.kw.join(' ') + ' ' + k.a.replace(/<[^>]+>/g, ' ')).indexOf(q) > -1; });
  $('#brain-count').textContent = list.length + ' of ' + M.KB.length + ' topics';
  $('#topics').innerHTML = list.map(function (k) {
    var t = M.TOPIC[k.id] || {}, add = M.added[k.id] || [];
    var pend = M.touched[k.id] ? '<span class="pill ok">+ learning</span>' : '';
    return '<details class="tp" data-id="' + k.id + '"><summary><span class="ico">' + (t.icon ? icon(t.icon) : '') + '</span>' +
      '<span class="ttl"><b>' + esc(M.LABEL[k.id] || k.id) + '</b><span>' + esc((t.intro ? t.intro + ' ' : '') + k.a.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')) + '</span></span>' +
      '<span class="meta">' + pend + (k.goal ? '<span class="pill care">goal</span>' : '') + '<span class="pill" style="background:var(--blue-050);color:var(--blue-700)">' + k.kw.length + ' kw</span></span></summary>' +
      '<div class="in">' + answerBubble(k, M) +
      '<dl class="kv"><dt>Topic id</dt><dd><code class="code">' + k.id + '</code></dd>' +
      '<dt>Reaction</dt><dd>' + esc(t.react || 'nod') + (t.shot ? ' &middot; camera ' + esc(t.shot) : '') + (t.tour ? ' &middot; suggests the ' + esc(t.tour) + ' tour' : '') + '</dd>' +
      '<dt>Follow-ups</dt><dd>' + (M.FOLLOW[k.goal ? 'goal' : k.id] || []).map(function (n) { return '<span class="tk' + (GOALS[n] ? ' goal' : '') + '">' + esc(M.LABEL[n] || n) + '</span>'; }).join(' ') + '</dd>' +
      '<dt>Keywords</dt><dd class="kws">' + k.kw.map(function (w) { return '<span class="kw' + (add.indexOf(w) > -1 ? ' new' : '') + '">' + esc(w) + '</span>'; }).join('') + '</dd></dl>' +
      '<div class="tools" style="margin:0"><button class="btn mini" type="button" data-teach="kw" data-topic="' + k.id + '">Add keywords</button><button class="btn mini" type="button" data-teach="ans" data-topic="' + k.id + '">Rewrite answer</button><button class="btn mini" type="button" data-teach="fol" data-topic="' + k.id + '">Change follow-ups</button></div>' +
      '</div></details>';
  }).join('') || '<div class="empty show">No topic matches.</div>';
}
$('#bq').addEventListener('input', renderBrain);
$('#apply1').addEventListener('change', function () { renderBrain(); renderChain(); });
$('#topics').addEventListener('click', function (e) {
  var b = e.target.closest('[data-teach]'); if (!b) return;
  openTeach({ type: b.dataset.teach, topic: b.dataset.topic });
});

/* ================================================================ test bench */
var convo = $('#convo');
function push(html) { var h = convo.querySelector('.hint'); if (h) h.remove(); var d = document.createElement('div'); d.style.display = 'grid'; d.style.gap = '6px'; d.innerHTML = html; convo.appendChild(d); convo.scrollTop = convo.scrollHeight; return d; }
function followChips(key, M) {
  return '<div class="chips2">' + (M.FOLLOW[key] || M.FOLLOW.start).filter(function (id) { return M.LABEL[id]; }).slice(0, 3).map(function (id) {
    return '<button class="chip' + (GOALS[id] ? '" style="border-color:var(--blue);color:var(--blue-700)' : '') + '" type="button" data-kb="' + id + '">' + esc(M.LABEL[id]) + '</button>';
  }).join('') + '</div>';
}
function reply(r, M) {
  if (r.type === 'kb') { push(answerBubble(r.k, M) + followChips(r.k.goal ? 'goal' : r.k.id, M)); return; }
  if (r.type === 'tour') { var q = tourById(r.id); push('<div class="bub"><span class="intro">' + esc(q.reply) + '</span><br><span class="small">3D mini tour plays here: ' + esc(q.short) + '</span></div>' + followChips('tour_' + r.id, M)); return; }
  if (r.type === 'site') {
    var top = r.pages[0], d = top.d || '', first = d.split('. ')[0]; if (first && first.length < d.length) first += '.';
    push('<div class="bub">Let me look that up! Here\'s the page on <b>' + esc(cleanTitle(top.t)) + '</b>. ' + esc(first) + '</div><div class="acts2">' + actHtml(r.pages.map(function (p) { return ['link', p.u, cleanTitle(p.t)]; }).concat([['wa']])) + '</div>' + followChips('site', M));
    return;
  }
  push('<div class="bub">Hmm, I don\'t have an answer for that one yet. My human teammates do! Message them on WhatsApp or email sales@technext.asia.</div><div class="acts2">' + actHtml([['wa'], ['email']]) + '</div>' + followChips('unknown', M));
}
function why(r, text) {
  var max = Math.max(3, r.rank.length ? r.rank[0].s : 0);
  var verdict = r.type === 'kb' ? 'Answered from topic <code class="code">' + r.id + '</code>' : r.type === 'tour' ? 'Started the <code class="code">' + r.id + '</code> mini tour' : r.type === 'site' ? 'Answered from site pages' : 'Fallback: no answer yet';
  var col = r.type === 'unknown' ? 'var(--bad)' : r.weak || r.type === 'site' ? 'var(--warn)' : 'var(--ok)';
  var html = '<div class="verdict"><span style="width:10px;height:10px;border-radius:50%;background:' + col + '"></span>' + verdict + '</div>' +
    '<p class="small" style="margin:6px 0 12px">' + esc(r.rule) + (r.s ? ' &middot; score ' + r.s.toFixed(2) : '') + '</p>' +
    '<div class="res">' + (r.rank.length ? r.rank.map(function (x, i) {
      return '<div class="bar' + (i === 0 ? ' win' : '') + '"><span class="t">' + (x.kind === 'tour' ? 'tour:' : '') + esc(x.id) + '</span><span class="v"><i style="width:' + Math.min(100, x.s / max * 100).toFixed(1) + '%"></i></span><span class="n">' + x.s.toFixed(2) + '</span></div>';
    }).join('') : '<p class="small">No topic or tour keyword matched any word.</p>') + '</div>' +
    '<p class="thr">Thresholds: 1.1 strong, 0.7 weak. A phrase found whole scores 2; each matching word up to 2.</p>';
  if (r.type === 'site') html += '<p class="small">Pages: ' + r.pages.map(function (p) { return esc('/' + p.u); }).join(', ') + '</p>';
  if (r.type !== 'kb' || r.weak) html += '<button class="btn p mini" type="button" id="teach-this">Teach Nexi this question</button>';
  $('#why').innerHTML = html;
  var t = $('#teach-this'); if (t) t.onclick = function () { openTeach({ type: 'kw', topic: r.type === 'kb' ? r.id : '', q: text }); };
}
function askText(text) {
  var M = merged(true), r = understand(text, M);
  push('<div class="me">' + esc(text) + '</div>');
  reply(r, M); why(r, text);
  N3.react(r.type === 'kb' ? (M.TOPIC[r.id] || {}).react || 'nod' : r.type === 'unknown' ? 'shrug' : 'nod');
}
$('#askf').addEventListener('submit', function (e) { e.preventDefault(); var v = $('#aq').value.trim(); if (!v) return; $('#aq').value = ''; askText(v); });
convo.addEventListener('click', function (e) {
  var b = e.target.closest('[data-kb]'); if (!b) return;
  var M = merged(true), k = M.byId(b.dataset.kb); if (!k) return;
  push('<div class="me">' + esc(M.LABEL[k.id]) + '</div>'); reply({ type: 'kb', k: k, id: k.id }, M);
  N3.react((M.TOPIC[k.id] || {}).react || 'nod');
});
function renderStarters() {
  $('#starters').innerHTML = B.FOLLOW.start.map(function (id) { return '<button class="chip" type="button" data-s="' + esc(B.LABEL[id]) + '">' + esc(B.LABEL[id]) + '</button>'; }).join('') +
    B.QUESTIONS.map(function (q) { return '<button class="chip" type="button" data-s="' + esc(q.label) + '">' + icon('i_play') + ' ' + esc(q.short) + '</button>'; }).join('');
}
$('#starters').addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (b) askText(b.dataset.s); });

/* coverage */
var lastScore = null;
function runCoverage() {
  var M = merged($('#apply2').checked), pass = 0;
  var rows = D.TESTS.map(function (t) { var r = understand(t[0], M), ok = passes(r, t[1]); if (ok) pass++; return { q: t[0], exp: t[1], r: r, ok: ok }; });
  var pct = Math.round(pass / rows.length * 100);
  $('#cov-sum').hidden = false; $('#cov-wrap').hidden = false;
  $('#cov-score').innerHTML = pass + '/' + rows.length + '<small>' + pct + '% answered right</small>';
  $('#cov-bar').style.width = pct + '%';
  $('#cov-delta').textContent = lastScore != null && lastScore !== pass ? (pass > lastScore ? '+' : '') + (pass - lastScore) + ' since the last run' : '';
  lastScore = pass;
  var only = $('#failsonly').checked;
  $('#cov-body').innerHTML = rows.filter(function (x) { return !only || !x.ok; }).map(function (x) {
    return '<tr class="' + (x.ok ? 'pass' : 'fail') + '"><td>' + esc(x.q) + '</td><td><code class="code">' + esc(x.exp) + '</code></td><td>' + esc(gaveText(x.r)) + (x.r.weak ? ' <span class="pill care">weak</span>' : '') + '</td><td>' + (x.r.s ? x.r.s.toFixed(2) : '-') + '</td><td>' +
      (x.ok ? '<span class="pill ok">pass</span>' : '<button class="btn mini" type="button" data-fix="' + esc(x.q) + '" data-exp="' + esc(x.exp) + '">Teach</button>') + '</td></tr>';
  }).join('');
  return { pass: pass, total: rows.length, rows: rows };
}
window.NexiStudioCoverage = runCoverage;
$('#runcov').addEventListener('click', runCoverage);
$('#failsonly').addEventListener('change', function () { if (!$('#cov-wrap').hidden) runCoverage(); });
$('#apply2').addEventListener('change', function () { if (!$('#cov-wrap').hidden) runCoverage(); });
$('#cov-body').addEventListener('click', function (e) {
  var b = e.target.closest('[data-fix]'); if (!b) return;
  var exp = b.dataset.exp, M = merged(true);
  if (exp.indexOf(':') > -1) { openTeach({ type: 'kw', topic: '', q: b.dataset.fix }); return; }
  openTeach({ type: M.byId(exp) ? 'kw' : 'new', topic: exp, q: b.dataset.fix });
});

/* ================================================================ learnings */
var STOP = { the: 1, a: 1, an: 1, do: 1, you: 1, your: 1, we: 1, i: 1, is: 1, are: 1, can: 1, for: 1, to: 1, of: 1, and: 1, or: 1, my: 1, our: 1, us: 1, me: 1, it: 1, in: 1, on: 1, with: 1, what: 1, whats: 1, how: 1, have: 1, has: 1, be: 1, does: 1, there: 1, any: 1, ah: 1, la: 1, lah: 1, need: 1, want: 1 };
function suggestKw(q) { var t = F.toks(q).filter(function (w) { return !STOP[w] && w.length > 2; }); var out = t.slice(); if (t.length > 1) out.unshift(t.join(' ')); return out.slice(0, 5).join(', '); }
function fillTopicSelect() {
  var M = merged(true);
  $('#ltopic').innerHTML = M.KB.map(function (k) { return '<option value="' + k.id + '">' + esc(k.id + ' - ' + (M.LABEL[k.id] || '')) + '</option>'; }).join('') +
    ['start', 'site', 'unknown'].map(function (k) { return '<option value="' + k + '">' + k + ' (follow-ups only)</option>'; }).join('');
  $('#lreact').innerHTML = Object.keys(D.REACT).map(function (r) { return '<option>' + r + '</option>'; }).join('');
}
function formMode() {
  var t = $('#lt').value;
  $('#l-topic').hidden = t === 'new'; $('#l-id').hidden = t !== 'new';
  $('#l-kw').hidden = !(t === 'kw' || t === 'new');
  $('#l-label').hidden = t !== 'new'; $('#l-intro').hidden = !(t === 'new' || t === 'ans');
  $('#l-ans').hidden = !(t === 'new' || t === 'ans'); $('#l-links').hidden = !(t === 'new' || t === 'ans');
  $('#l-more').hidden = !(t === 'new' || t === 'fol');
  $('#lreact').parentNode.hidden = t !== 'new';
  if (t === 'ans' || t === 'fol') {
    var M = merged(true), k = M.byId($('#ltopic').value);
    if (t === 'ans' && k) { $('#lans').value = k.a; $('#lintro').value = (M.TOPIC[k.id] || {}).intro || ''; $('#llinks').value = actsText(k.actions); }
    if (t === 'fol') $('#lfol').value = (M.FOLLOW[$('#ltopic').value] || []).join(', ');
  }
}
$('#lt').addEventListener('change', formMode);
$('#ltopic').addEventListener('change', formMode);
function openTeach(o) {
  fillTopicSelect();
  $('#lt').value = o.type || 'kw';
  if (o.type === 'new') { $('#lid').value = o.topic || ''; } else if (o.topic) $('#ltopic').value = o.topic;
  formMode();
  $('#lq').value = o.q || '';
  if (o.q) $('#lkw').value = suggestKw(o.q);
  $('#lmsg').textContent = '';
  document.getElementById('learn').scrollIntoView({ behavior: 'smooth' });
  setTimeout(function () { ($('#lt').value === 'ans' ? $('#lans') : $('#lkw')).focus({ preventScroll: true }); }, 500);
}
function readForm() {
  var t = $('#lt').value, l = { type: t, q: $('#lq').value.trim(), on: true, status: 'proposed', by: 'You', at: new Date().toISOString().slice(0, 10) };
  l.topic = t === 'new' ? $('#lid').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') : $('#ltopic').value;
  if (t === 'kw' || t === 'new') l.kw = splitList($('#lkw').value);
  if (t === 'new') { l.label = $('#llabel').value.trim(); l.react = $('#lreact').value; }
  if (t === 'new' || t === 'ans') { l.intro = $('#lintro').value.trim(); l.ans = $('#lans').value.trim(); l.links = parseActs($('#llinks').value); }
  if (t === 'new' || t === 'fol') l.fol = splitList($('#lfol').value);
  var err = !l.topic ? 'Pick or name a topic.' : (t === 'kw' && !l.kw.length) ? 'Add at least one keyword.' : (t === 'new' && (!l.kw.length || !l.ans || !l.label)) ? 'A new topic needs keywords, a chip label and an answer.' : (t === 'ans' && !l.ans) ? 'Write the answer.' : (t === 'fol' && l.fol.length !== 3) ? 'Give exactly 3 follow-up ids.' : '';
  return err ? { err: err } : l;
}
$('#lform').addEventListener('submit', function (e) {
  e.preventDefault(); var l = readForm(); if (l.err) { $('#lmsg').textContent = l.err; return; }
  L.unshift(l); saveL(); refreshAll(); $('#lmsg').textContent = 'Added. It is on in the test bench and coverage run.'; toast('Learning added');
});
$('#ltry').addEventListener('click', function () {
  var l = readForm(); if (l.err) { $('#lmsg').textContent = l.err; return; }
  L.unshift(l); var q = l.q || (l.kw && l.kw[0]) || ''; if (q) askText(q); L.shift();
  document.getElementById('bench').scrollIntoView({ behavior: 'smooth' });
});
function lTitle(l) {
  return l.type === 'kw' ? 'Add ' + l.kw.length + ' keyword' + (l.kw.length > 1 ? 's' : '') + ' to ' + l.topic : l.type === 'new' ? 'New topic: ' + l.topic + (l.label ? ' (' + l.label + ')' : '') : l.type === 'ans' ? 'Rewrite the ' + l.topic + ' answer' : 'Follow-ups after ' + l.topic + ': ' + (l.fol || []).join(', ');
}
function lBody(l) {
  var s = '';
  if (l.q) s += 'Asked: "' + esc(l.q) + '". ';
  if (l.kw) s += 'Keywords: ' + esc(l.kw.join(', ')) + '. ';
  if (l.ans) s += 'Answer: ' + esc(l.ans.replace(/<[^>]+>/g, '').slice(0, 160)) + (l.ans.length > 160 ? '...' : '');
  if (l.why) s += ' <i>' + esc(l.why) + '</i>';
  return s;
}
function renderL() {
  $('#learn-count').textContent = L.length + ' learnings, ' + L.filter(function (l) { return l.on; }).length + ' on';
  $('#llist').innerHTML = L.length ? L.map(function (l, i) {
    var cls = l.type === 'new' ? 'new' : l.type === 'ans' ? 'ans' : l.type === 'fol' ? 'fol' : '';
    return '<div class="lrn' + (l.on ? '' : ' off') + '"><span class="ty ' + cls + '">' + ({ kw: 'keywords', new: 'new topic', ans: 'answer', fol: 'follow-ups' })[l.type] + '</span>' +
      '<div><b>' + esc(lTitle(l)) + '</b><p>' + lBody(l) + '</p><div class="by">' + esc(l.by || 'You') + (l.at ? ' &middot; ' + esc(l.at) : '') + '</div></div>' +
      '<div class="ops"><label class="sw2" title="Use in the test bench and coverage run"><input type="checkbox" data-on="' + i + '"' + (l.on ? ' checked' : '') + '> On</label>' +
      '<select class="mini" data-st="' + i + '" aria-label="Status" style="border:1px solid var(--line);border-radius:8px;font:inherit;font-size:12px;padding:4px">' + ['proposed', 'approved', 'shipped'].map(function (s) { return '<option' + (l.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
      '<button class="btn mini" type="button" data-edit="' + i + '">Edit</button><button class="btn mini" type="button" data-del="' + i + '" aria-label="Delete">&times;</button></div></div>';
  }).join('') : '<div class="empty show">No learnings yet. Teach Nexi from the test bench or the coverage run.</div>';
}
$('#llist').addEventListener('change', function (e) {
  var on = e.target.dataset.on, st = e.target.dataset.st;
  if (on != null) { L[on].on = e.target.checked; saveL(); refreshAll(); }
  if (st != null) { L[st].status = e.target.value; saveL(); }
});
$('#llist').addEventListener('click', function (e) {
  var d = e.target.closest('[data-del]'), ed = e.target.closest('[data-edit]');
  if (d) { if (!confirm('Delete this learning?')) return; L.splice(+d.dataset.del, 1); saveL(); refreshAll(); }
  if (ed) {
    var l = L.splice(+ed.dataset.edit, 1)[0]; saveL(); refreshAll();
    openTeach({ type: l.type, topic: l.topic, q: l.q });
    if (l.kw) $('#lkw').value = l.kw.join(', ');
    if (l.label) $('#llabel').value = l.label;
    if (l.intro != null) $('#lintro').value = l.intro;
    if (l.ans) $('#lans').value = l.ans;
    if (l.links) $('#llinks').value = actsText(l.links);
    if (l.fol) $('#lfol').value = l.fol.join(', ');
    if (l.react) $('#lreact').value = l.react;
    $('#lmsg').textContent = 'Editing: press Add learning to save it back.';
  }
});
$('#reset').addEventListener('click', function () { if (!confirm('Replace your learnings with the original proposals?')) return; L = JSON.parse(JSON.stringify(D.LEARNINGS)); saveL(); refreshAll(); toast('Back to the proposals'); });
$('#exp').addEventListener('click', function () { download('nexi-learnings-' + new Date().toISOString().slice(0, 10) + '.json', new Blob([JSON.stringify({ brain: B.meta, learnings: L }, null, 2)], { type: 'application/json' })); });
$('#imp').addEventListener('change', function (e) {
  var f = e.target.files[0]; if (!f) return; var rd = new FileReader();
  rd.onload = function () { try { var j = JSON.parse(rd.result), arr = Array.isArray(j) ? j : j.learnings; if (!Array.isArray(arr)) throw 0; var n = 0; arr.forEach(function (l) { if (l && l.type && l.topic) { L.push(l); n++; } }); saveL(); refreshAll(); toast('Imported ' + n + ' learnings'); } catch (err) { toast('That file is not a learnings export'); } };
  rd.readAsText(f); e.target.value = '';
});
function jsStr(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }
function jsAns(s) { return jsStr(s).replace(/\{o_([a-z_]+)\}/g, "'+oi('$1')+'").replace(/\{(i_[a-z_]+)\}/g, "'+icon('$1')+'"); }
function jsActs(a) { return '[' + (a || []).map(function (x) { return '[' + x.map(jsStr).join(',') + ']'; }).join(',') + ']'; }
$('#brief').addEventListener('click', function () {
  var on = L.filter(function (l) { return l.on && l.status !== 'shipped'; });
  if (!on.length) { toast('No open learnings are on'); return; }
  var before = (function () { var s = $('#apply2').checked; $('#apply2').checked = false; var r = runCoverage(); $('#apply2').checked = s; return r; })();
  var after = runCoverage();
  var t = ['# Nexi learnings to ship (' + on.length + ')', '',
    'From Nexi Studio (https://technextsg.github.io/technext-marketing-hub/nexi-studio.html), brain synced from TechNext-Website ' + B.meta.commit + '.',
    'Edit `_src/nexi/app.html` in TechNext-Website (it generates assets/js/nexi-app.js), run `python _src/build.py`, check /nexi#full, then re-run `python tools/sync_nexi_brain.py` in the hub repo.',
    'Coverage run: ' + before.pass + '/' + before.total + ' today, ' + (after.pass) + '/' + after.total + ' with these learnings.', ''];
  on.forEach(function (l, i) {
    t.push('## ' + (i + 1) + '. ' + lTitle(l) + ' [' + l.status + ']');
    if (l.q) t.push('Visitor asked: "' + l.q + '"');
    if (l.why) t.push('Why: ' + l.why);
    if (l.type === 'kw') t.push('Add to `KB` entry `' + l.topic + '` kw: ' + l.kw.map(jsStr).join(', '));
    if (l.type === 'new') {
      t.push('Insert before the goals in `KB`:', '```js', "{ id:'" + l.topic + "', kw:[" + l.kw.map(jsStr).join(',') + '],', '  a:' + jsAns(l.ans) + ',', '  actions:' + jsActs(l.links) + ' },', '```');
      t.push('`LABEL.' + l.topic + ' = ' + jsStr(l.label) + '`', '`TOPIC.' + l.topic + " = { icon:'" + (l.icon || 'i_chat') + "', react:'" + (l.react || 'nod') + "', intro:" + jsStr(l.intro || '') + ' }`', '`FOLLOW.' + l.topic + ' = [' + (l.fol || []).map(jsStr).join(',') + ']`');
      if (l.from && l.from.length) t.push('Offer it as a chip: in `FOLLOW` of ' + l.from.join(', ') + ', replace the middle chip with `' + l.topic + '`.');
    }
    if (l.type === 'ans') { t.push('Replace `KB.' + l.topic + '.a` with:', '```html', l.ans, '```'); if (l.intro) t.push('`TOPIC.' + l.topic + '.intro = ' + jsStr(l.intro) + '`'); if (l.links && l.links.length) t.push('actions: `' + jsActs(l.links) + '`'); }
    if (l.type === 'fol') t.push('`FOLLOW.' + l.topic + ' = [' + l.fol.map(jsStr).join(',') + ']`');
    t.push('');
  });
  t.push('After shipping, mark these learnings "shipped" in the studio.');
  copy(t.join('\n'), 'Brief copied: ' + on.length + ' learnings');
});

/* ================================================================ persona */
function renderPersona() {
  $('#facts').innerHTML = B.FACTS.map(function (f) { return '<div class="fact"><b>' + esc(f[0]) + '</b><span>' + esc(f[1].charAt(0) + f[1].slice(1).toLowerCase()) + '</span></div>'; }).join('');
  var M = merged(true);
  $('#openers').innerHTML = Object.keys(M.TOPIC).filter(function (k) { return M.TOPIC[k].intro; }).map(function (k) { return '<div><b>' + esc(k) + '</b> &middot; ' + esc(M.TOPIC[k].intro) + '</div>'; }).join('');
}

function refreshAll() { renderL(); renderBrain(); renderChain(); renderPersona(); fillTopicSelect(); if (!$('#cov-wrap').hidden) runCoverage(); }

/* ================================================================ 3D stage */
var N3 = (function () {
  var cv = $('#stage'), g = cv.getContext('2d'), gl = document.createElement('canvas'), N = null, err = '';
  try { if (!window.THREE) throw new Error('3D library did not load'); N = window.NexiCore(gl, 'assets/nexi/'); } catch (e) { err = e.message || String(e); }
  var AR = { '16x9': [1280, 720], '9x16': [720, 1280], '1x1': [960, 960] }, HQ = { '16x9': [1920, 1080], '9x16': [1080, 1920], '1x1': [1080, 1080] };
  var ar = '16x9', bg = 'studio', W = 1280, H = 720, U = 300, CX = 640, CY = 380, pos = 'center', hq = false;
  var logo = new Image(); logo.src = 'assets/logo/technext-horizontal-blue.png';
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  if (N) {
    N.addClip('doze', 1, function () {});
    N.addClip('shake', 0.9, function (p, O) { var e = Math.sin(p * Math.PI); O.yaw += Math.sin(p * Math.PI * 6) * 0.35 * e; O.tilt += Math.sin(p * Math.PI * 6) * 0.08 * e; });
    N.addClip('reach', 0.9, function (p, O) { var e = Math.sin(p * Math.PI); O.hLy += 0.9 * e; O.hRy += 0.9 * e; O.hLx += 0.2 * e; O.hRx -= 0.2 * e; O.nod -= 0.15 * e; O.yb += 0.12 * e; });
    N.addClip('kiss', 1.6, function (p, O) { var e = p < 0.3 ? ease(p / 0.3) : p < 0.55 ? 1 : 1 - ease((p - 0.55) / 0.45); O.hRx -= 0.55 * e; O.hRy += 0.95 * e; O.hRz += 0.55 * e; O.tilt += 0.12 * e; O.nod += 0.08 * e; });
    N.addClip('leanL', 1.2, function (p, O) { var e = Math.sin(p * Math.PI); O.tilt += 0.35 * e; O.yaw += 0.35 * e; O.hRy += 0.3 * e; });
    N.addClip('leanR', 1.2, function (p, O) { var e = Math.sin(p * Math.PI); O.tilt -= 0.35 * e; O.yaw -= 0.35 * e; O.hLy += 0.3 * e; });
    N.addClip('shrug', 1.2, function (p, O) { var e = Math.sin(p * Math.PI); O.hLy += 0.5 * e; O.hRy += 0.5 * e; O.hLx -= 0.25 * e; O.hRx += 0.25 * e; O.tilt += 0.18 * e; });
  }
  function posXY(p) {
    var port = ar === '9x16', off = port ? U * 0.32 : ar === '1x1' ? U * 0.42 : U * 0.8;
    switch (p) {
      case 'left': return [CX - off, CY, 0];
      case 'right': return [CX + off, CY, 0];
      case 'near': return [CX, CY - U * 0.05, 11];
      case 'far': return [CX, CY - U * 0.05, -9];
      case 'low': return [CX, CY + U * 0.3, 0];
      case 'offR': return [W + U * 0.9, CY - U * 0.6, 0];
      case 'offL': return [-U * 0.9, CY - U * 0.6, 0];
      case 'up': return [CX, -U * 1.2, 0];
      default: return [CX, CY, 0];
    }
  }
  function setSize(a, high) {
    ar = a; hq = !!high; var s = (hq ? HQ : AR)[ar]; W = s[0]; H = s[1];
    cv.width = W; cv.height = H;
    U = ar === '9x16' ? W * 0.72 : ar === '1x1' ? H * 0.6 : H * 0.62;
    CX = W / 2; CY = H * (ar === '9x16' ? 0.56 : 0.6);
    if (N) { N.setup(W, H, U); var p = posXY(pos); N.place(p[0], p[1], p[2]); }
  }
  function go(p, instant) { pos = p; if (!N) return; var q = posXY(p); (instant ? N.place : N.go)(q[0], q[1], q[2]); }

  /* particles */
  var P = [];
  var CONF = ['#3167CA', '#5B8DEF', '#FF7EB6', '#FFD25E', '#7ED9C4', '#B79CFF'];
  function rr(a, b) { return a + Math.random() * (b - a); }
  function emit(kind, n) {
    if (!N) return; var h = N.headPx(), k = U / 600;
    for (var i = 0; i < n; i++) {
      if (kind === 'hearts') P.push({ k: 'heart', x: h.x + rr(-U * .3, U * .3), y: h.y, vx: rr(-60, 60) * k, vy: rr(-260, -150) * k, g: 0, s: rr(22, 40) * k, life: rr(1.3, 1.9), t: 0, ph: rr(0, 6) });
      else if (kind === 'sparks') { var a = rr(0, 6.28), v = rr(160, 420) * k; P.push({ k: 'spark', x: h.x, y: h.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: .93, g: 0, s: rr(14, 30) * k, life: rr(.8, 1.3), t: 0, ph: rr(0, 6) }); }
      else if (kind === 'confetti') P.push({ k: 'conf', x: rr(0, W), y: -20, vx: rr(-40, 40), vy: rr(80, 260) * k, g: 120 * k, s: rr(10, 18) * k * 1.4, life: rr(2.2, 3.2), t: 0, ph: rr(0, 6), col: CONF[i % CONF.length], rot: rr(0, 6), vr: rr(-6, 6) });
      else if (kind === 'zzz') P.push({ k: 'z', x: h.x + U * .25, y: h.y - U * .1, vx: rr(20, 50) * k, vy: rr(-90, -60) * k, g: 0, s: rr(28, 44) * k, life: 1.8, t: 0, ph: rr(0, 6) });
    }
  }
  function heart(x, y, s, a) { g.save(); g.globalAlpha = a; g.beginPath(); g.moveTo(x, y + s * .95); g.bezierCurveTo(x - s * 1.25, y + s * .1, x - s * 1.05, y - s, x, y - s * .38); g.bezierCurveTo(x + s * 1.05, y - s, x + s * 1.25, y + s * .1, x, y + s * .95); g.fillStyle = '#FF6FAE'; g.fill(); g.restore(); }
  function spark(x, y, s, a, rot) { g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot); g.beginPath(); for (var i = 0; i < 8; i++) { var an = i * Math.PI / 4, r = i % 2 ? s * .28 : s; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fillStyle = '#FFD25E'; g.fill(); g.restore(); }
  function stepP(dt) {
    P = P.filter(function (p) { p.t += dt; if (p.t > p.life) return false; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; } if (p.vr) p.rot += p.vr * dt; return true; });
  }
  function drawP() {
    P.forEach(function (p) {
      var q = p.t / p.life, a = q > .7 ? 1 - (q - .7) / .3 : 1, pop = Math.min(1, p.t / .2);
      if (p.k === 'heart') heart(p.x + Math.sin(p.t * 5 + p.ph) * 12, p.y, p.s * pop, a);
      else if (p.k === 'spark') spark(p.x, p.y, p.s * pop, a, p.t * 4);
      else if (p.k === 'conf') { g.save(); g.globalAlpha = a; g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, Math.cos(p.t * 9 + p.ph)); g.fillStyle = p.col; g.fillRect(-p.s / 2, -p.s * .3, p.s, p.s * .6); g.restore(); }
      else if (p.k === 'z') { g.save(); g.globalAlpha = a; g.font = '800 ' + p.s + 'px "Plus Jakarta Sans",system-ui,sans-serif'; g.fillStyle = '#6FA0F5'; g.fillText('z', p.x, p.y); g.restore(); }
    });
  }

  /* speech bubble */
  var bubble = null;
  function say(text, dur) { if (!text) { bubble = null; return; } bubble = { text: text, t: 0, d: dur || Math.max(2, text.length * .07) }; if (N) N.talk(Math.min(bubble.d, 1 + text.length * .05)); }
  function wrap(text, maxW) { var words = text.split(' '), lines = [], cur = ''; words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }); if (cur) lines.push(cur); return lines; }
  function rrect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function drawBubble(dt) {
    if (!bubble || !N) return; bubble.t += dt; if (bubble.t > bubble.d) { bubble = null; return; }
    var a = Math.min(1, bubble.t / .18, (bubble.d - bubble.t) / .25), fs = Math.round(Math.min(W, H) * (ar === '9x16' ? .052 : .05));
    g.save(); g.font = '800 ' + fs + 'px "Plus Jakarta Sans",system-ui,sans-serif';
    var lines = wrap(bubble.text, Math.min(W * .78, fs * 16)), lh = fs * 1.25, bw = 0;
    lines.forEach(function (l) { bw = Math.max(bw, g.measureText(l).width); });
    bw += fs * 1.4; var bh = lines.length * lh + fs * .9;
    var h = N.headPx(), k = N.scale, x = Math.max(16, Math.min(W - bw - 16, h.x - bw / 2)), y = h.y - U * .3 * k - bh - fs * .7, tail = 1;
    if (y < H * .04) { y = Math.min(H - bh - H * .05, h.y + U * .75 * k); tail = -1; }
    var s = .85 + .15 * Math.min(1, bubble.t / .18);
    g.globalAlpha = a; g.translate(x + bw / 2, y + bh / 2); g.scale(s, s); g.translate(-(x + bw / 2), -(y + bh / 2));
    g.shadowColor = 'rgba(31,31,61,.18)'; g.shadowBlur = fs * .8; g.shadowOffsetY = fs * .2;
    rrect(x, y, bw, bh, fs * .6); g.fillStyle = '#fff'; g.fill(); g.shadowColor = 'transparent';
    var tx = Math.max(x + fs, Math.min(x + bw - fs, h.x)); g.beginPath();
    if (tail > 0) { g.moveTo(tx - fs * .4, y + bh - 1); g.lineTo(tx, y + bh + fs * .55); g.lineTo(tx + fs * .4, y + bh - 1); }
    else { g.moveTo(tx - fs * .4, y + 1); g.lineTo(tx, y - fs * .55); g.lineTo(tx + fs * .4, y + 1); }
    g.fill();
    g.fillStyle = '#1F1F3D'; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(function (l, i) { g.fillText(l, x + bw / 2, y + fs * .45 + lh * (i + .5)); });
    g.restore();
  }
  function backdrop() {
    if (bg === 'green') { g.fillStyle = '#00B140'; g.fillRect(0, 0, W, H); return; }
    if (bg === 'white') { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }
    else if (bg === 'blue') { var lg = g.createLinearGradient(0, 0, W, H); lg.addColorStop(0, '#3167CA'); lg.addColorStop(1, '#1E4691'); g.fillStyle = lg; g.fillRect(0, 0, W, H); }
    else { var rg = g.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, Math.max(W, H) * .75); rg.addColorStop(0, '#F7FAFF'); rg.addColorStop(1, '#D9E3F4'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(49,103,202,.07)'; var st = Math.round(Math.min(W, H) / 26); for (var y = st / 2; y < H; y += st) for (var x = st / 2; x < W; x += st) g.fillRect(x, y, 2, 2); }
    if (N) { var b = N.botPx(), k = N.scale; g.save(); g.fillStyle = bg === 'blue' ? 'rgba(0,0,0,.18)' : 'rgba(31,31,61,.10)'; g.beginPath(); g.ellipse(b.x, b.y + U * .58 * k, U * .3 * k, U * .05 * k, 0, 0, 7); g.fill(); g.restore(); }
  }
  var endT = -1;
  function endcard(dt) {
    if (endT < 0) return; endT += dt; var a = Math.min(1, endT / .5);
    g.save(); g.globalAlpha = a; g.fillStyle = bg === 'blue' ? '#1E4691' : '#fff'; g.fillRect(0, 0, W, H);
    var lw = Math.min(W * .56, 720), lh = lw * (logo.naturalHeight / (logo.naturalWidth || 1));
    if (logo.complete && logo.naturalWidth) g.drawImage(logo, W / 2 - lw / 2, H * .44 - lh / 2, lw, lh);
    var fs = Math.round(Math.min(W, H) * .05); g.font = '800 ' + fs + 'px "Plus Jakarta Sans",system-ui,sans-serif'; g.fillStyle = '#3167CA'; g.textAlign = 'center';
    g.fillText('technext.asia/nexi', W / 2, H * .44 + lh / 2 + fs * 1.6); g.restore();
  }
  function safe() {
    if (!$('#safe').checked || recording) return;
    g.save(); g.strokeStyle = 'rgba(229,72,77,.8)'; g.setLineDash([10, 8]); g.lineWidth = 2;
    g.strokeRect(W * .05, H * .05, W * .9, H * .9);
    if (ar === '9x16') { g.fillStyle = 'rgba(229,72,77,.10)'; g.fillRect(0, 0, W, H * .12); g.fillRect(0, H * .8, W, H * .2); g.fillRect(W * .86, H * .45, W * .14, H * .35); }
    g.restore();
  }

  /* storyboard runner */
  var run = null, recording = null;
  function apply(b, first) {
    if (!N) return;
    go(b.pos || 'center', !!first);
    N.boost(b.fx === 'boost');
    if (b.face) N.expr(b.face, b.d);
    if (b.move) N.play(b.move);
    if (b.fx === 'blush') N.blush(b.d);
    if (b.fx === 'look') N.lookCam(b.d);
    if (b.fx === 'hearts') emit('hearts', 10);
    if (b.fx === 'sparks') emit('sparks', 16);
    if (b.fx === 'confetti') emit('confetti', 60);
    say(b.line, b.d);
  }
  function play(beats, opts) {
    if (!beats.length) return; opts = opts || {};
    run = { beats: beats, i: 0, t: 0, end: beats[0].d, opts: opts, zz: 0 }; endT = -1; P = [];
    apply(beats[0], true); markBeat(0);
  }
  function stop() { run = null; endT = -1; markBeat(-1); if (N) N.boost(false); }
  function stepRun(dt) {
    if (!run) return;
    run.t += dt;
    var b = run.beats[run.i];
    if (b && b.fx === 'zzz' && (run.zz -= dt) <= 0) { emit('zzz', 1); run.zz = .55; }
    if (run.i < run.beats.length && run.t >= run.end) {
      run.i++;
      if (run.i < run.beats.length) { apply(run.beats[run.i]); run.end += run.beats[run.i].d; markBeat(run.i); }
      else { markBeat(-1); if (N) N.boost(false); if (run.opts.endcard) { endT = 0; run.end += 2.6; } else { var cb = run.opts.done; run = null; if (cb) cb(); return; } }
    } else if (run.i >= run.beats.length && run.t >= run.end) { var done = run.opts.done; run = null; if (done) done(); setTimeout(function () { if (!run) endT = -1; }, 600); }
  }
  function markBeat(i) {
    $$('.beat').forEach(function (el, j) { el.classList.toggle('now', j === i); });
    $$('#tl i').forEach(function (el, j) { el.classList.toggle('now', j === i); });
  }

  /* loop: render only while the stage is on screen (or recording) */
  var visible = false, last = performance.now();
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe($('.stagewrap'));
  else visible = true;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!(visible || recording) || document.hidden) return;
    stepRun(dt); stepP(dt);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    backdrop();
    if (N) { N.tick(dt); N.render(); g.drawImage(gl, 0, 0); }
    else { g.fillStyle = '#4C4C63'; g.font = '600 22px Inter,sans-serif'; g.textAlign = 'center'; g.fillText('3D Nexi could not start: ' + err, W / 2, H / 2); }
    drawP(); drawBubble(dt); endcard(dt); safe();
  }
  setSize('16x9');
  requestAnimationFrame(frame);

  function reactName(name) {
    if (!N) return;
    if (name === 'shrug') { N.play('shrug'); N.expr('wow', 1.4); say('hmm?', 1.4); return; }
    var r = D.REACT[name] || ['nod', 'happy', 1]; N.play(r[0]); N.expr(r[1], r[2]);
    if (name === 'love') { N.blush(2.2); emit('hearts', 8); }
    if (name === 'sparkle') emit('sparks', 14);
    if (name === 'celebrate') emit('confetti', 50);
    if (name === 'dance') { N.play('hop'); }
  }
  function tapName(name) {
    if (!N) return;
    var map = { backflip: ['flip', 'happy', 'WHEEE!'], tornado: ['spin', 'dizzy', 'SPIN CYCLE!'], shy: ['peek', 'happy', 'eep! don\'t look!'], love: ['kiss', 'love', 'I LIKE YOU!'], boing: ['bigjump', 'wow', 'BOING BOING!'], surprise: ['gasp', 'wow', 'WHOA!'], laugh: ['wiggle', 'happy', 'HAHAHA, STOP!'], rocket: ['bigjump', 'star', 'TO THE MOON!'], dance: ['wiggle', 'happy', 'DANCE BREAK!'] }[name];
    N.play(map[0]); N.expr(map[1], 2.2); say(map[2], 1.8);
    if (name === 'shy') N.blush(2.6); if (name === 'love') { N.blush(2.4); emit('hearts', 8); } if (name === 'rocket') { N.boost(true); setTimeout(function () { N.boost(false); }, 1500); }
    if (name === 'tornado' || name === 'dance') emit('sparks', 10);
  }

  return {
    ok: !!N, setSize: function (a, h) { setSize(a, h); }, get ar() { return ar; }, setBg: function (b) { bg = b; },
    go: go, say: say, emit: emit, play: play, stop: stop, react: reactName, tap: tapName,
    clip: function (n) { if (N) N.play(n); }, face: function (n) { if (N) N.expr(n, 2.6); },
    fx: function (n) { if (!N) return; if (n === 'blush') N.blush(2.4); else if (n === 'boost') { N.boost(true); setTimeout(function () { N.boost(false); }, 1600); } else if (n === 'look') N.lookCam(2.5); else emit(n, n === 'confetti' ? 60 : n === 'zzz' ? 3 : 12); },
    get running() { return !!run; },
    record: function (beats, opts, done) {
      if (!window.MediaRecorder || !cv.captureStream) { toast('Recording needs Chrome or Edge on a computer'); return false; }
      var types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'], mime = types.filter(function (t) { return MediaRecorder.isTypeSupported(t); })[0];
      setSize(ar, opts.hq);
      var stream = cv.captureStream(30), chunks = [], rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: opts.hq ? 14e6 : 7e6 } : {});
      recording = rec;
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () { recording = null; setSize(ar, false); done(new Blob(chunks, { type: 'video/webm' })); };
      rec.start(250);
      setTimeout(function () { play(beats, { endcard: opts.endcard, done: function () { setTimeout(function () { rec.stop(); }, 150); } }); }, 300);
      return true;
    },
    get recording() { return !!recording; }
  };
})();

/* stage controls */
$('#ar').addEventListener('click', function (e) { var b = e.target.closest('[data-ar]'); if (!b || N3.recording) return; $$('#ar button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); N3.setSize(b.dataset.ar); });
$('#bg').addEventListener('click', function (e) { var b = e.target.closest('[data-bg]'); if (!b) return; $$('#bg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); N3.setBg(b.dataset.bg); });
function setAr(a) { $$('#ar button').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.ar === a ? 'true' : 'false'); }); N3.setSize(a); }
$$('.tabs [data-tab]').forEach(function (t) {
  t.addEventListener('click', function () {
    $$('.tabs [data-tab]').forEach(function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
    $$('.pane').forEach(function (p) { p.hidden = p.dataset.pane !== t.dataset.tab; });
  });
});
function btns(el, list, attr) { $(el).innerHTML = list.map(function (x) { var v = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<button class="mv" type="button" data-' + attr + '="' + v + '">' + esc(l) + '</button>'; }).join(''); }
btns('#m-react', Object.keys(D.REACT).map(function (r) { return [r, r]; }), 'r');
btns('#m-clip', D.MOVES, 'c'); btns('#m-face', D.FACES, 'f'); btns('#m-pos', D.POS, 'p'); btns('#m-fx', D.FX, 'x');
btns('#taps', D.TAPS, 't');
$('[data-pane="moves"]').addEventListener('click', function (e) {
  var b = e.target.closest('.mv'); if (!b) return; N3.stop();
  if (b.dataset.r) N3.react(b.dataset.r); if (b.dataset.c) N3.clip(b.dataset.c); if (b.dataset.f) N3.face(b.dataset.f);
  if (b.dataset.p) { N3.go(b.dataset.p); $$('#m-pos .mv').forEach(function (x) { x.classList.toggle('on', x === b); }); }
  if (b.dataset.x) N3.fx(b.dataset.x);
});
$('#taps').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) { N3.stop(); N3.tap(b.dataset.t); } });
$('#sayf').addEventListener('submit', function (e) { e.preventDefault(); N3.say($('#sayq').value.trim() || 'Hi! I\'m Nexi.'); });
$('#eps').innerHTML = D.EPISODES.map(function (ep) { return '<div class="ep"><b>' + ep[0] + ' &middot; ' + esc(ep[1]) + '</b><span>9:16 + 16:9 MP4, about 12 s</span></div>'; }).join('');
$('#shots').innerHTML = D.SHOTS.map(function (s) { return '<tr><td><code class="code">' + s[0] + '</code></td><td>' + esc(s[1]) + '</td></tr>'; }).join('');

/* storyboard editor */
var SKEY = 'nexi_studio_story_v1';
var story = store(SKEY) || JSON.parse(JSON.stringify(D.STORIES[0]));
function saveS() { store(SKEY, story); }
$('#tpl').innerHTML = '<option value="">Templates&hellip;</option>' + D.STORIES.map(function (s, i) { return '<option value="' + i + '">' + esc(s.name) + '</option>'; }).join('');
$('#tpl').addEventListener('change', function () { if (this.value === '') return; story = JSON.parse(JSON.stringify(D.STORIES[+this.value])); saveS(); setAr(story.ar); renderBeats(); this.value = ''; toast('Loaded: ' + story.name); });
function opts(list, v, blank) { return (blank ? '<option value="">' + blank + '</option>' : '') + list.map(function (x) { var k = Array.isArray(x) ? x[0] : x, l = Array.isArray(x) ? x[1] : x; return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join(''); }
function renderBeats() {
  var tot = 0; story.beats.forEach(function (b) { tot += +b.d || 0; });
  $('#beats').innerHTML = story.beats.map(function (b, i) {
    return '<div class="beat" data-i="' + i + '"><span class="i">' + (i + 1) + '</span>' +
      '<input type="number" min="0.4" max="12" step="0.1" value="' + b.d + '" data-k="d" aria-label="Seconds">' +
      '<select data-k="move" aria-label="Move">' + opts(D.MOVES, b.move, '(no move)') + '</select>' +
      '<select data-k="face" aria-label="Face">' + opts(D.FACES, b.face, '(face)') + '</select>' +
      '<select data-k="pos" aria-label="Position">' + opts(D.POS, b.pos) + '</select>' +
      '<button class="x" type="button" data-del="' + i + '" aria-label="Delete beat">&times;</button>' +
      '<select data-k="fx" aria-label="Effect" style="grid-column:1 / 3">' + opts(D.FX, b.fx, '(effect)') + '</select>' +
      '<input class="line" data-k="line" value="' + esc(b.line || '') + '" placeholder="What Nexi says (optional)" aria-label="Line" style="grid-column:3 / -1">' +
      '</div>';
  }).join('');
  $('#tl').innerHTML = story.beats.map(function (b) { return '<i style="flex:' + b.d + '"></i>'; }).join('');
  $('#sb-len').textContent = story.beats.length + ' beats, ' + tot.toFixed(1) + ' s' + ($('#endcard').checked ? ' + 2.6 s end card' : '');
}
$('#beats').addEventListener('input', function (e) {
  var row = e.target.closest('.beat'), k = e.target.dataset.k; if (!row || !k) return;
  var b = story.beats[+row.dataset.i]; b[k] = k === 'd' ? Math.max(.4, +e.target.value || 1) : e.target.value; saveS();
  if (k === 'd') { $('#tl').innerHTML = story.beats.map(function (x) { return '<i style="flex:' + x.d + '"></i>'; }).join(''); }
});
$('#beats').addEventListener('click', function (e) { var d = e.target.closest('[data-del]'); if (!d) return; story.beats.splice(+d.dataset.del, 1); saveS(); renderBeats(); });
$('#sb-add').addEventListener('click', function () { var l = story.beats[story.beats.length - 1] || {}; story.beats.push({ d: 2, pos: l.pos || 'center', move: 'nod', face: 'happy', fx: '', line: '' }); saveS(); renderBeats(); });
$('#endcard').addEventListener('change', renderBeats);
$('#sb-play').addEventListener('click', function () { if (N3.running) { N3.stop(); this.textContent = 'Play'; return; } var btn = this; btn.textContent = 'Stop'; N3.play(story.beats, { endcard: $('#endcard').checked, done: function () { btn.textContent = 'Play'; } }); });
$('#sb-rec').addEventListener('click', function () {
  if (N3.recording) return; var btn = this;
  var started = N3.record(story.beats, { hq: $('#hq').checked, endcard: $('#endcard').checked }, function (blob) {
    btn.classList.remove('recording'); btn.textContent = 'Record video';
    var name = 'nexi-' + (story.name || 'video').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) + '-' + N3.ar + '.webm';
    download(name, blob); toast('Saved ' + name + ' (' + (blob.size / 1048576).toFixed(1) + ' MB)');
  });
  if (started) { btn.classList.add('recording'); btn.textContent = 'Recording... keep this tab open'; }
});
$('#sb-script').addEventListener('click', function () {
  var t = 0, out = ['NEXI SCRIPT: ' + (story.name || 'Untitled') + ' (' + N3.ar.replace('x', ':') + ')', ''];
  story.beats.forEach(function (b, i) {
    out.push((i + 1) + '. ' + t.toFixed(1) + 's-' + (t + +b.d).toFixed(1) + 's  [' + [b.pos, b.move, b.face, b.fx].filter(Boolean).join(', ') + ']' + (b.line ? '  NEXI: "' + b.line + '"' : ''));
    t += +b.d;
  });
  if ($('#endcard').checked) out.push('End card: TechNext logo + technext.asia/nexi (2.6 s)');
  copy(out.join('\n'), 'Script copied');
});
$('#sb-json').addEventListener('click', function () { story.ar = N3.ar; download('nexi-storyboard.json', new Blob([JSON.stringify(story, null, 2)], { type: 'application/json' })); });
$('#sb-load').addEventListener('change', function (e) {
  var f = e.target.files[0]; if (!f) return; var rd = new FileReader();
  rd.onload = function () { try { var j = JSON.parse(rd.result); if (!Array.isArray(j.beats)) throw 0; story = j; saveS(); if (j.ar) setAr(j.ar); renderBeats(); toast('Storyboard loaded'); } catch (err) { toast('Not a storyboard file'); } };
  rd.readAsText(f); e.target.value = '';
});

/* subnav scroll-spy */
var links = $$('.subnav a');
function spy() { var y = window.scrollY + 160, cur = links[0]; links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s && s.offsetTop <= y) cur = a; }); links.forEach(function (a) { a.classList.toggle('on', a === cur); }); }
window.addEventListener('scroll', spy, { passive: true });

/* boot */
renderStats(); renderStarters(); fillTopicSelect(); formMode(); refreshAll(); renderBeats(); spy();
if (story.ar && story.ar !== '16x9') setAr(story.ar);
})();
