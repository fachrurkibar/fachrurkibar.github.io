/* =========================================================
   app.js — mesin blog statis untuk GitHub Pages
   Data:   data/site.json · data/menu.json · data/posts.json
   Konten: posts/*.md · pages/*.md
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const LS_MENU = 'blog.menu.override';
  const LS_DRAFT = 'blog.draft';
  const LS_THEME = 'blog.theme';
  const LS_OWNER = 'blog.owner';
  // Mode pemilik: aktifkan dengan membuka situs memakai ?pemilik, matikan dengan ?keluar
  const OWNER = (() => {
    const qs = new URLSearchParams(location.search);
    if (qs.has('keluar')) { try { localStorage.removeItem(LS_OWNER); } catch { } }
    else if (qs.has('pemilik')) { try { localStorage.setItem(LS_OWNER, 'true'); } catch { } }
    try { return localStorage.getItem(LS_OWNER) === 'true'; } catch { return false; }
  })();
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* penyimpanan tidak tersedia */ } },
    del(k) { try { localStorage.removeItem(k); } catch { } }
  };

  const S = { site: {}, menu: [], defaultMenu: [], posts: [], cats: {}, cache: {}, cal: null, charts: [] };

  const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDate = s => { const d = parseDate(s); return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
  const slugify = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  async function getJSON(url) { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }
  async function getText(url) {
    if (S.cache[url]) return S.cache[url];
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error('Berkas tidak ditemukan: ' + url);
    return (S.cache[url] = await r.text());
  }

  /* =========================================================
     Markdown → HTML (dengan rumus, kode interaktif, dan HTML mentah)
     ========================================================= */
  function renderMarkdown(md) {
    // 1. Amankan blok kode agar rumus di dalamnya tidak tersentuh
    const codes = [];
    md = md.replace(/(^|\n)(```|~~~)[^\n]*\n[\s\S]*?\n\2[ \t]*(?=\n|$)/g, m => { codes.push(m); return `\u0000C${codes.length - 1}\u0000`; });
    md = md.replace(/`[^`\n]+`/g, m => { codes.push(m); return `\u0000C${codes.length - 1}\u0000`; });
    // 2. Amankan rumus LaTeX
    const maths = [];
    const keep = m => { maths.push(m); return `MATHPH${maths.length - 1}END`; };
    md = md.replace(/\$\$[\s\S]+?\$\$/g, keep)
      .replace(/\\\[[\s\S]+?\\\]/g, keep)
      .replace(/\\\([\s\S]+?\\\)/g, keep)
      .replace(/(^|[^\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g, (m, pre, body) => pre + keep('$' + body + '$'));
    // 3. Kembalikan kode, lalu parse Markdown
    md = md.replace(/\u0000C(\d+)\u0000/g, (_, i) => codes[i]);
    let html;
    if (window.marked) {
      const renderer = new marked.Renderer();
      renderer.code = function (a, b) {
        const text = typeof a === 'object' ? a.text : a;
        const info = ((typeof a === 'object' ? a.lang : b) || '').trim().split(/\s+/);
        let lang = (info[0] || '').toLowerCase();
        const flags = info.slice(1).map(f => f.replace(/[{}]/g, '').toLowerCase());
        if (lang === 'javascript') lang = 'js';
        if (lang === 'py') lang = 'python';
        if (lang === 'python' && flags.includes('run')) return Runner.blockHTML('python', 'run', text);
        if (lang === 'js' && flags.includes('run')) return Runner.blockHTML('js', 'run', text);
        if (lang === 'html' && (flags.includes('live') || flags.includes('run'))) return Runner.blockHTML('html', 'live', text);
        return `<pre><code class="language-${esc(lang || 'plaintext')}">${esc(text)}</code></pre>`;
      };
      html = marked.parse(md, { renderer, gfm: true, breaks: false });
    } else {
      html = md.split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join('');
    }
    // 4. Kembalikan rumus (ter-escape; KaTeX membaca teksnya)
    return html.replace(/MATHPH(\d+)END/g, (_, i) => esc(maths[i]));
  }

  function hydrate(el) {
    if (window.renderMathInElement) {
      renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true }, { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }, { left: '$', right: '$', display: false }
        ],
        ignoredClasses: ['runblock'], throwOnError: false
      });
    }
    if (window.hljs) $$('pre code', el).forEach(c => { if (!c.closest('.runblock')) hljs.highlightElement(c); });
    Runner.enhance(el);
    // jalankan <script> yang ditulis langsung di dalam Markdown/HTML
    $$('script', el).forEach(old => {
      const s = document.createElement('script');
      [...old.attributes].forEach(a => s.setAttribute(a.name, a.value));
      s.textContent = old.textContent;
      old.replaceWith(s);
    });
    // tautan luar dibuka di tab baru
    $$('a[href^="http"]', el).forEach(a => { if (!a.href.startsWith(location.origin)) { a.target = '_blank'; a.rel = 'noopener'; } });
  }

  /* =========================================================
     Menu & kategori
     ========================================================= */
  function catSlug(route) { const m = /^#\/kategori\/([^/?]+)/.exec(route || ''); return m ? decodeURIComponent(m[1]) : null; }

  function buildCats() {
    S.cats = {};
    S.menu.forEach(item => {
      const p = catSlug(item.route);
      if (p) S.cats[p] = { label: item.label, parent: null };
      (item.children || []).forEach(ch => {
        const c = catSlug(ch.route);
        if (c) S.cats[c] = { label: ch.label, parent: p };
      });
    });
    S.posts.forEach(p => { if (!S.cats[p.category]) S.cats[p.category] = { label: p.category, parent: null }; });
  }
  const catLabel = s => S.cats[s]?.label || s;
  const catFamily = s => [s, ...Object.keys(S.cats).filter(k => S.cats[k].parent === s)];
  const topCat = s => S.cats[s]?.parent || s;

  function renderMenu() {
    const ul = $('#menu');
    const link = it => {
      const ext = /^https?:/.test(it.route);
      return `href="${esc(it.route || '#/')}"${ext ? ' target="_blank" rel="noopener"' : ''}`;
    };
    ul.innerHTML = S.menu.map(it => {
      const kids = it.children?.length;
      return `<li><a ${link(it)}>${esc(it.label)}${kids ? '<span class="caret">▼</span>' : ''}</a>${kids ? `<ul>${it.children.map(c => `<li><a ${link(c)}>${esc(c.label)}</a></li>`).join('')}</ul>` : ''}</li>`;
    }).join('');
    markActiveMenu();
  }
  function markActiveMenu() {
    const h = location.hash || '#/';
    $$('#menu a').forEach(a => a.classList.remove('active'));
    let best = null;
    $$('#menu > li').forEach(li => {
      const links = $$('a', li);
      if (links.some(a => { const r = a.getAttribute('href'); return r === h || (r !== '#/' && h.startsWith(r + '?')); })) best = li;
    });
    if (!best && h.startsWith('#/post/')) {
      const p = S.posts.find(x => x.slug === h.slice(7));
      if (p) best = $$('#menu > li').find(li => $$('a', li).some(a => catSlug(a.getAttribute('href')) === topCat(p.category) || catSlug(a.getAttribute('href')) === p.category));
    }
    if (!best && (h === '#/' || h === '#' || h === '')) best = $$('#menu > li').find(li => li.firstElementChild.getAttribute('href') === '#/');
    best?.firstElementChild.classList.add('active');
  }

  /* =========================================================
     Sidebar: kalender, terbaru, kategori
     ========================================================= */
  function renderCalendar() {
    const el = $('#calendar');
    if (!S.cal) { const n = new Date(); S.cal = { y: n.getFullYear(), m: n.getMonth() }; }
    const { y, m } = S.cal;
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7; // Senin = kolom pertama
    const days = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    const byDay = {};
    S.posts.forEach(p => { const d = parseDate(p.date); if (d.getFullYear() === y && d.getMonth() === m) (byDay[d.getDate()] ||= []).push(p); });
    let cells = '';
    for (let i = 0; i < offset; i++) cells += '<td class="empty"></td>';
    for (let d = 1; d <= days; d++) {
      const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
      const ps = byDay[d];
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells += `<td class="${isToday ? 'today ' : ''}${ps ? 'has' : ''}">${ps ? `<a href="#/arsip/${ds}" title="${esc(ps.map(p => p.title).join(' · '))}">${d}</a>` : d}</td>`;
      if ((offset + d) % 7 === 0) cells += '</tr><tr>';
    }
    el.innerHTML = `<div class="cal-head"><button class="cal-nav" data-d="-1" aria-label="Bulan sebelumnya">‹</button>
      <a class="cal-title" href="#/arsip/${y}-${String(m + 1).padStart(2, '0')}" style="text-decoration:none">${BULAN[m]} ${y}</a>
      <button class="cal-nav" data-d="1" aria-label="Bulan berikutnya">›</button></div>
      <table><thead><tr>${['S', 'S', 'R', 'K', 'J', 'S', 'M'].map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody><tr>${cells}</tr></tbody></table>`;
    $$('.cal-nav', el).forEach(b => b.onclick = () => {
      const d = new Date(S.cal.y, S.cal.m + Number(b.dataset.d), 1);
      S.cal = { y: d.getFullYear(), m: d.getMonth() }; renderCalendar();
    });
  }

  function renderSidebarLists() {
    $('#recentList').innerHTML = S.posts.slice(0, 5).map(p => `<li><a href="#/post/${p.slug}">${esc(p.title)}</a><small>${fmtDate(p.date)}</small></li>`).join('') || '<li class="empty">Belum ada tulisan</li>';
    const count = s => S.posts.filter(p => catFamily(s).includes(p.category)).length;
    const tops = Object.keys(S.cats).filter(k => !S.cats[k].parent);
    $('#catList').innerHTML = tops.map(t => {
      const subs = Object.keys(S.cats).filter(k => S.cats[k].parent === t);
      return `<li><a href="#/kategori/${t}">${esc(catLabel(t))}</a><span class="n">${count(t)}</span></li>` +
        subs.map(s => `<li class="sub"><a href="#/kategori/${s}">${esc(catLabel(s))}</a><span class="n">${count(s)}</span></li>`).join('');
    }).join('');
  }

  /* =========================================================
     Halaman-halaman
     ========================================================= */
  const view = () => $('#content');
  function setTitle(t) { document.title = t ? `${t} — ${S.site.title || 'Blog'}` : `${S.site.titleArabic || ''} · ${S.site.title || 'Blog'}`; }

  function cardHTML(p) {
    return `<a class="card" href="#/post/${p.slug}"><span class="c-cat">${esc(catLabel(p.category))}</span>
      <h4>${esc(p.title)}</h4><p>${esc(p.summary || '')}</p><time datetime="${p.date}">${fmtDate(p.date)}</time></a>`;
  }

  function listHTML(posts, page, base) {
    const per = S.site.postsPerPage || 6;
    const pages = Math.max(1, Math.ceil(posts.length / per));
    page = Math.min(Math.max(1, page), pages);
    const slice = posts.slice((page - 1) * per, page * per);
    const pager = pages > 1 ? `<div class="pager">${Array.from({ length: pages }, (_, i) =>
      `<a class="btn sm ${i + 1 === page ? 'primary' : ''}" href="${base}${base.includes('?') ? '&' : '?'}p=${i + 1}">${i + 1}</a>`).join('')}</div>` : '';
    return slice.length ? `<div class="cards">${slice.map(cardHTML).join('')}</div>${pager}` : '<p class="empty">Belum ada tulisan di sini.</p>';
  }

  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

  function pageHome(q) {
    setTitle('');
    const now = new Date();
    const thisYear = S.posts.filter(p => parseDate(p.date).getFullYear() === now.getFullYear()).length;
    const last = S.posts[0];
    const sinceLast = last ? Math.max(0, Math.round((now - parseDate(last.date)) / 864e5)) : '–';
    const interaktif = S.posts.filter(p => (p.tags || []).some(t => /python|html|interaktif|simulasi/i.test(t))).length;
    const tops = Object.keys(S.cats).filter(k => !S.cats[k].parent);
    const filter = q.get('k') || '';
    const shown = filter ? S.posts.filter(p => catFamily(filter).includes(p.category)) : S.posts;

    view().innerHTML = `
      <div class="hero"><div>
        <h1>Ahlan wa sahlan</h1>
        <p>${esc(S.site.description || '')}</p>
      </div></div>
      <div class="tiles">
        <div class="tile"><b>${S.posts.length}</b><span>Total tulisan</span></div>
        <div class="tile"><b>${thisYear}</b><span>Tulisan tahun ${now.getFullYear()}</span></div>
        <div class="tile"><b>${interaktif}</b><span>Tulisan interaktif</span></div>
        <div class="tile"><b>${sinceLast}</b><span>Hari sejak tulisan terakhir</span></div>
      </div>
      <div class="panels">
        <div class="panel"><h3>Aktivitas menulis (12 bulan)</h3><canvas id="chMonth" height="200"></canvas></div>
        <div class="panel"><h3>Sebaran per rubrik</h3><canvas id="chCat" height="200"></canvas></div>
      </div>
      <h2 class="section-title">Tulisan terbaru</h2>
      <div class="filterbar">
        <a class="chip ${!filter ? 'on' : ''}" href="#/">Semua</a>
        ${tops.map(t => `<a class="chip ${filter === t ? 'on' : ''}" href="#/?k=${t}">${esc(catLabel(t))}</a>`).join('')}
      </div>
      ${listHTML(shown, Number(q.get('p') || 1), filter ? `#/?k=${filter}` : '#/')}
    `;
    drawCharts(tops);
  }

  function drawCharts(tops) {
    S.charts.forEach(c => c.destroy()); S.charts = [];
    if (!window.Chart) { $$('.panel canvas').forEach(c => c.replaceWith(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'Grafik tidak dapat dimuat (Chart.js offline).' }))); return; }
    const ink = cssVar('--ink-soft'), line = cssVar('--line'), main = cssVar('--nav'), title = cssVar('--title'), accent = cssVar('--accent');
    Chart.defaults.font.family = cssVar('--font'); Chart.defaults.color = ink;
    const now = new Date(); const labels = [], data = [], keys = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(BLN[d.getMonth()]); keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); data.push(0);
    }
    S.posts.forEach(p => { const i = keys.indexOf(p.date.slice(0, 7)); if (i >= 0) data[i]++; });
    S.charts.push(new Chart($('#chMonth'), {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: main, borderRadius: 4, maxBarThickness: 22 }] },
      options: {
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw} tulisan` } } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: line } }, x: { grid: { display: false } } },
        onClick: (e, el) => { if (el[0]) location.hash = '#/arsip/' + keys[el[0].index]; }
      }
    }));
    const counts = tops.map(t => S.posts.filter(p => catFamily(t).includes(p.category)).length);
    const palette = [title, accent, '#6b9a5b', '#b0567a', '#3f9aa8', '#8a6cc4', '#c07a3a'];
    S.charts.push(new Chart($('#chCat'), {
      type: 'doughnut',
      data: { labels: tops.map(catLabel), datasets: [{ data: counts, backgroundColor: palette, borderColor: cssVar('--paper-2'), borderWidth: 2 }] },
      options: {
        cutout: '58%', plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } },
        onClick: (e, el) => { if (el[0]) location.hash = '#/kategori/' + tops[el[0].index]; }
      }
    }));
  }

  function pageCategory(slug, q) {
    const fam = catFamily(slug);
    const posts = S.posts.filter(p => fam.includes(p.category));
    const parent = S.cats[slug]?.parent;
    const subs = fam.slice(1);
    setTitle(catLabel(slug));
    view().innerHTML = `
      <div class="breadcrumb"><a href="#/">Beranda</a>${parent ? ` › <a href="#/kategori/${parent}">${esc(catLabel(parent))}</a>` : ''}</div>
      <h1 class="post-title">${esc(catLabel(slug))}</h1>
      <p class="post-meta">${posts.length} tulisan</p>
      ${subs.length ? `<div class="filterbar">${subs.map(s => `<a class="chip" href="#/kategori/${s}">${esc(catLabel(s))}</a>`).join('')}</div>` : ''}
      ${listHTML(posts, Number(q.get('p') || 1), `#/kategori/${slug}`)}`;
  }

  function pageArchive(prefix) {
    const posts = S.posts.filter(p => p.date.startsWith(prefix));
    const [y, m, d] = prefix.split('-').map(Number);
    const label = d ? fmtDate(prefix) : m ? `${BULAN[m - 1]} ${y}` : String(y);
    setTitle('Arsip ' + label);
    if (m) { S.cal = { y, m: m - 1 }; renderCalendar(); }
    view().innerHTML = `<div class="breadcrumb"><a href="#/">Beranda</a> › Arsip</div>
      <h1 class="post-title">Arsip ${esc(label)}</h1><p class="post-meta">${posts.length} tulisan</p>${listHTML(posts, 1, '#/arsip/' + prefix)}`;
  }

  function pageSearch(term) {
    const t = term.toLowerCase();
    const posts = S.posts.filter(p => [p.title, p.summary, catLabel(p.category), ...(p.tags || [])].join(' ').toLowerCase().includes(t));
    setTitle('Cari: ' + term);
    $('#searchInput').value = term;
    view().innerHTML = `<div class="breadcrumb"><a href="#/">Beranda</a> › Pencarian</div>
      <h1 class="post-title">Hasil pencarian “${esc(term)}”</h1><p class="post-meta">${posts.length} tulisan ditemukan</p>${listHTML(posts, 1, '#/cari/' + encodeURIComponent(term))}`;
  }

  function pageTag(tag) {
    const posts = S.posts.filter(p => (p.tags || []).includes(tag));
    setTitle('#' + tag);
    view().innerHTML = `<div class="breadcrumb"><a href="#/">Beranda</a> › Label</div>
      <h1 class="post-title">#${esc(tag)}</h1><p class="post-meta">${posts.length} tulisan</p>${listHTML(posts, 1, '#/tag/' + encodeURIComponent(tag))}`;
  }

  function postHeader(p) {
    const d = parseDate(p.date);
    const parent = S.cats[p.category]?.parent;
    return `<div class="date-badge" aria-hidden="true"><span class="m">${BLN[d.getMonth()]}</span> <span class="d">${d.getDate()}</span></div>
      <h1 class="post-title">${esc(p.title)}</h1>
      <div class="post-meta">${fmtDate(p.date)} · ${parent ? `<a href="#/kategori/${parent}">${esc(catLabel(parent))}</a> › ` : ''}<a href="#/kategori/${esc(p.category)}">${esc(catLabel(p.category))}</a>
        ${(p.tags || []).length ? '<br>' + p.tags.map(t => `<a class="tag" href="#/tag/${encodeURIComponent(t)}">#${esc(t)}</a>`).join('') : ''}</div>`;
  }

  async function pagePost(slug) {
    const i = S.posts.findIndex(p => p.slug === slug);
    if (i < 0) return pageNotFound();
    const p = S.posts[i];
    setTitle(p.title);
    view().innerHTML = `<article class="post has-date">${postHeader(p)}<div class="prose"><p class="loading">Memuat tulisan…</p></div></article>`;
    try {
      const md = await getText(p.file);
      const body = $('.prose', view());
      body.innerHTML = renderMarkdown(md);
      hydrate(body);
      const newer = S.posts[i - 1], older = S.posts[i + 1];
      $('.post', view()).insertAdjacentHTML('beforeend', `<nav class="post-nav">
        <span>${older ? `← <a href="#/post/${older.slug}">${esc(older.title)}</a>` : ''}</span>
        <span style="text-align:right">${newer ? `<a href="#/post/${newer.slug}">${esc(newer.title)}</a> →` : ''}</span></nav>`);
    } catch (e) { $('.prose', view()).innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
  }

  async function pageStatic(name) {
    const item = S.menu.flatMap(m => [m, ...(m.children || [])]).find(m => m.route === '#/halaman/' + name);
    const title = item?.label || name.replace(/-/g, ' ');
    setTitle(title);
    view().innerHTML = `<article class="post"><h1 class="post-title">${esc(title)}</h1><div class="prose"><p class="loading">Memuat…</p></div></article>`;
    try {
      const body = $('.prose', view());
      body.innerHTML = renderMarkdown(await getText(`pages/${name}.md`));
      hydrate(body);
    } catch (e) { $('.prose', view()).innerHTML = `<p class="empty">Halaman belum dibuat. Tambahkan berkas <code>pages/${esc(name)}.md</code> di repositori.</p>`; }
  }

  function pageNotFound() {
    setTitle('Tidak ditemukan');
    view().innerHTML = `<h1 class="post-title">Halaman tidak ditemukan</h1><p>Kembali ke <a href="#/">Beranda</a>.</p>`;
  }

  /* ---------- Lab Kode ---------- */
  const LAB_PY = `import numpy as np
import matplotlib.pyplot as plt

# Regresi linear sederhana dengan data acak
rng = np.random.default_rng(1)
x = np.linspace(0, 10, 40)
y = 2.5 * x + 4 + rng.normal(0, 3, x.size)
b1, b0 = np.polyfit(x, y, 1)
r = np.corrcoef(x, y)[0, 1]

plt.figure(figsize=(7, 3.6))
plt.scatter(x, y, color="#5a74b8", label="data")
plt.plot(x, b0 + b1 * x, color="#d4a017", lw=2.5, label=f"ŷ = {b0:.2f} + {b1:.2f}x")
plt.legend(); plt.grid(alpha=.3); plt.show()

print(f"Koefisien korelasi r = {r:.3f}, R² = {r*r:.3f}")`;
  const LAB_JS = `// Bilangan prima di bawah 100 dengan Saringan Eratosthenes
const n = 100, prima = Array(n).fill(true);
prima[0] = prima[1] = false;
for (let i = 2; i * i < n; i++)
  if (prima[i]) for (let j = i * i; j < n; j += i) prima[j] = false;
const hasil = prima.flatMap((p, i) => p ? [i] : []);
console.log("Banyaknya:", hasil.length);
console.log(hasil.join(", "));`;
  const LAB_WEB = {
    html: `<h2>Asmaul Husna Acak</h2>\n<div id="kartu">Klik tombol</div>\n<button id="b">Tampilkan</button>`,
    css: `body{font-family:Georgia,serif;text-align:center;padding:20px;background:#eef4fd}\n#kartu{font-size:28px;margin:18px;color:#2b4d9c}\nbutton{padding:8px 18px;border-radius:20px;border:0;background:#5a74b8;color:#fff;font-size:16px;cursor:pointer}`,
    js: `const nama = [["Ar-Rahman","Yang Maha Pengasih"],["Ar-Rahim","Yang Maha Penyayang"],["Al-'Alim","Yang Maha Mengetahui"],["Al-Hakim","Yang Maha Bijaksana"],["Al-Latif","Yang Maha Lembut"]];\ndocument.getElementById("b").onclick = () => {\n  const [a, b] = nama[Math.floor(Math.random() * nama.length)];\n  document.getElementById("kartu").innerHTML = a + "<br><small>" + b + "</small>";\n};`
  };

  function pageLab(q) {
    setTitle('Lab Kode');
    const tab = q.get('t') || 'python';
    const tabs = [['python', 'Python'], ['web', 'HTML · CSS · JS'], ['js', 'JavaScript'], ['md', 'Markdown']];
    view().innerHTML = `<h1 class="post-title">Lab Kode</h1>
      <p class="help">Ruang uji coba: tulis kode, jalankan, lihat hasilnya. Semua berjalan di browser pengunjung — tanpa server. Kode yang sama bisa disisipkan ke tulisan dengan blok <code>\`\`\`python run</code>, <code>\`\`\`html live</code>, atau <code>\`\`\`js run</code>.</p>
      <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="${k === tab ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
      <div id="labBody"></div>`;
    $$('.tabs button', view()).forEach(b => b.onclick = () => { location.hash = '#/lab?t=' + b.dataset.t; });
    const body = $('#labBody');
    if (tab === 'python') { body.innerHTML = Runner.blockHTML('python', 'run', store.get('lab.py') || LAB_PY); }
    else if (tab === 'js') { body.innerHTML = Runner.blockHTML('js', 'run', store.get('lab.js') || LAB_JS); }
    else if (tab === 'web') {
      const w = store.get('lab.web') || LAB_WEB;
      body.innerHTML = `<div class="web-grid">${['html', 'css', 'js'].map(k => `<div><label>${k.toUpperCase()}</label><textarea data-k="${k}" spellcheck="false">${esc(w[k])}</textarea></div>`).join('')}</div>
        <div class="toolbar"><button class="btn primary" id="webRun">▶ Jalankan</button><button class="btn" id="webReset">↺ Contoh awal</button><label style="font-size:15px"><input type="checkbox" id="webAuto" checked> perbarui otomatis</label></div>
        <iframe class="lab-frame" sandbox="allow-scripts allow-modals allow-forms" title="Hasil"></iframe>`;
      const tas = $$('textarea', body), frame = $('iframe', body);
      const run = () => {
        const v = Object.fromEntries(tas.map(t => [t.dataset.k, t.value]));
        store.set('lab.web', v);
        frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>${v.css}</style></head><body>${v.html}<script>${v.js.replace(/<\/script/gi, '<\\/script')}<\/script></body></html>`;
      };
      let t; tas.forEach(ta => ta.addEventListener('input', () => { if ($('#webAuto').checked) { clearTimeout(t); t = setTimeout(run, 400); } }));
      $('#webRun').onclick = run;
      $('#webReset').onclick = () => { store.del('lab.web'); tas.forEach(ta => ta.value = LAB_WEB[ta.dataset.k]); run(); };
      run();
    } else {
      body.innerHTML = `<p class="help">Editor Markdown lengkap (dengan metadata dan unduhan) ada di halaman <a href="#/tulis">Tulis artikel</a>.</p>
        <div class="split"><textarea class="editor" id="labMd" spellcheck="false">${esc(store.get('lab.md') || '## Coba Markdown\n\nRumus inline $e^{i\\pi}+1=0$ dan blok:\n\n$$\\int_0^1 x^2\\,dx = \\tfrac13$$\n\n- **tebal**, *miring*, `kode`\n\n| x | x² |\n|---|---|\n| 2 | 4 |')}</textarea><div class="preview-box prose" id="labPrev"></div></div>`;
      const ta = $('#labMd'), prev = $('#labPrev');
      const upd = () => { prev.innerHTML = renderMarkdown(ta.value); hydrate(prev); store.set('lab.md', ta.value); };
      let t; ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(upd, 350); }); upd();
    }
    Runner.enhance(body);
    const codeTa = $('.runblock textarea.code', body);
    if (codeTa) codeTa.addEventListener('input', () => store.set(tab === 'python' ? 'lab.py' : 'lab.js', codeTa.value));
  }

  /* ---------- Tulis artikel ---------- */
  const SNIPPETS = {
    rumus: '\n$$\n\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i\n$$\n',
    python: '\n```python run\nimport matplotlib.pyplot as plt\nplt.plot([1, 2, 3, 4], [1, 4, 9, 16], "o-")\nplt.title("Contoh grafik")\nplt.show()\n```\n',
    html: '\n```html live\n<button onclick="this.textContent = \'Terima kasih!\'">Klik saya</button>\n```\n',
    js: '\n```js run\nconsole.log("Assalamu\'alaikum dari JavaScript");\n```\n',
    tabel: '\n| Kolom A | Kolom B |\n|---|---|\n| 1 | 2 |\n',
    ayat: '\n<div class="ayat">\nبِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\n</div>\n',
    gambar: '\n![Keterangan gambar](assets/img/nama-gambar.jpg)\n'
  };

  function pageWrite() {
    setTitle('Tulis artikel');
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const d = store.get(LS_DRAFT) || { title: '', date: today, category: Object.keys(S.cats).find(k => S.cats[k].parent) || '', tags: '', summary: '', body: '## Subjudul\n\nTulis isi artikel di sini. Gunakan tombol di atas untuk menyisipkan rumus, kode Python, atau HTML interaktif.\n' };
    const catOpts = Object.keys(S.cats).map(k => `<option value="${k}" ${k === d.category ? 'selected' : ''}>${S.cats[k].parent ? '— ' : ''}${esc(catLabel(k))}</option>`).join('');
    view().innerHTML = `<h1 class="post-title">Tulis artikel</h1>
      <p class="help">Draf tersimpan otomatis di browser ini. Setelah selesai: <b>1)</b> unduh berkas <code>.md</code> dan simpan ke folder <code>posts/</code>, <b>2)</b> salin entri JSON dan tempel di bagian atas <code>data/posts.json</code>, lalu commit ke GitHub.</p>
      <div class="fields">
        <label class="field">Judul<input id="fTitle" value="${esc(d.title)}" placeholder="Judul tulisan"></label>
        <label class="field">Tanggal<input id="fDate" type="date" value="${esc(d.date)}"></label>
        <label class="field">Rubrik<select id="fCat">${catOpts}</select></label>
      </div>
      <div class="fields" style="grid-template-columns:1fr 2fr">
        <label class="field">Label (pisahkan koma)<input id="fTags" value="${esc(d.tags)}" placeholder="statistika, python"></label>
        <label class="field">Ringkasan<input id="fSum" value="${esc(d.summary)}" placeholder="Satu-dua kalimat untuk kartu di beranda"></label>
      </div>
      <div class="toolbar">Sisipkan:
        ${Object.keys(SNIPPETS).map(k => `<button class="btn sm" data-s="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}
        <span style="flex:1"></span>
        <button class="btn" id="dlMd">⬇ Unduh .md</button>
        <button class="btn primary" id="cpJson">Salin entri JSON</button>
        <button class="btn ghost" id="clr">Kosongkan</button>
      </div>
      <div class="split">
        <textarea class="editor" id="fBody" spellcheck="false">${esc(d.body)}</textarea>
        <div class="preview-box"><article class="post">${'<div id="pvHead"></div>'}<div class="prose" id="pvBody"></div></article></div>
      </div>
      <pre id="jsonOut" class="help" hidden style="white-space:pre-wrap;font:13px var(--mono)"></pre>`;

    const f = { title: $('#fTitle'), date: $('#fDate'), category: $('#fCat'), tags: $('#fTags'), summary: $('#fSum'), body: $('#fBody') };
    const read = () => Object.fromEntries(Object.entries(f).map(([k, el]) => [k, el.value]));
    const entry = v => ({
      slug: slugify(v.title || 'tulisan-baru'), title: v.title || 'Tulisan baru', date: v.date, category: v.category,
      tags: v.tags.split(',').map(s => s.trim()).filter(Boolean), summary: v.summary, file: `posts/${slugify(v.title || 'tulisan-baru')}.md`
    });
    const update = () => {
      const v = read(); store.set(LS_DRAFT, v);
      const e = entry(v);
      $('#pvHead').innerHTML = postHeader(e).replace('class="date-badge"', 'class="date-badge" style="position:static;display:inline-flex;gap:6px;width:auto;padding:2px 12px;margin-bottom:6px"');
      const pv = $('#pvBody'); pv.innerHTML = renderMarkdown(v.body); hydrate(pv);
    };
    let t; Object.values(f).forEach(el => el.addEventListener('input', () => { clearTimeout(t); t = setTimeout(update, 400); }));
    f.category.addEventListener('change', update);
    f.body.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); f.body.setRangeText('    ', f.body.selectionStart, f.body.selectionEnd, 'end'); } });
    $$('[data-s]', view()).forEach(b => b.onclick = () => {
      f.body.setRangeText(SNIPPETS[b.dataset.s], f.body.selectionStart, f.body.selectionEnd, 'end'); f.body.focus(); update();
    });
    $('#dlMd').onclick = () => { const v = read(); download(entry(v).slug + '.md', v.body, 'text/markdown'); };
    $('#cpJson').onclick = async () => {
      const txt = JSON.stringify(entry(read()), null, 2) + ',';
      const out = $('#jsonOut'); out.hidden = false; out.textContent = txt;
      try { await navigator.clipboard.writeText(txt); $('#cpJson').textContent = '✓ Tersalin'; } catch { $('#cpJson').textContent = 'Salin dari kotak di bawah'; }
      setTimeout(() => $('#cpJson').textContent = 'Salin entri JSON', 2500);
    };
    $('#clr').onclick = () => { if (confirm('Kosongkan draf?')) { store.del(LS_DRAFT); pageWrite(); } };
    update();
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* =========================================================
     Editor menu
     ========================================================= */
  function openMenuEditor() {
    const dlg = $('#menuEditor');
    let work = JSON.parse(JSON.stringify(S.menu));
    const commit = () => { S.menu = JSON.parse(JSON.stringify(work)); store.set(LS_MENU, S.menu); buildCats(); renderMenu(); renderSidebarLists(); };
    const row = (it, path, isChild) => `<div class="mt-row ${isChild ? 'child' : ''}" data-path="${path}">
      <input data-f="label" value="${esc(it.label)}" placeholder="Label" aria-label="Label menu">
      <input data-f="route" value="${esc(it.route || '')}" placeholder="#/kategori/nama" aria-label="Tujuan menu">
      <div class="mt-actions">
        <button type="button" data-a="up" title="Naik">↑</button><button type="button" data-a="down" title="Turun">↓</button>
        ${isChild ? '' : '<button type="button" data-a="sub" title="Tambah submenu">＋sub</button>'}
        <button type="button" data-a="del" title="Hapus">✕</button>
      </div></div>`;
    const draw = () => {
      $('#menuTree').innerHTML = work.map((it, i) => `<div class="mt-group">${row(it, i, false)}${(it.children || []).map((c, j) => row(c, i + '.' + j, true)).join('')}</div>`).join('');
    };
    const locate = path => { const [i, j] = path.split('.').map(Number); return j === undefined ? [work, i] : [work[i].children, j]; };
    $('#menuTree').oninput = e => {
      const r = e.target.closest('.mt-row'); if (!r) return;
      const [arr, k] = locate(r.dataset.path); arr[k][e.target.dataset.f] = e.target.value; commit();
    };
    $('#menuTree').onclick = e => {
      const b = e.target.closest('button[data-a]'); if (!b) return;
      const [arr, k] = locate(b.closest('.mt-row').dataset.path);
      const a = b.dataset.a;
      if (a === 'up' && k > 0) [arr[k - 1], arr[k]] = [arr[k], arr[k - 1]];
      if (a === 'down' && k < arr.length - 1) [arr[k + 1], arr[k]] = [arr[k], arr[k + 1]];
      if (a === 'del' && confirm(`Hapus menu "${arr[k].label}"?`)) { arr.splice(k, 1); }
      if (a === 'sub') (arr[k].children ||= []).push({ label: 'Submenu baru', route: '#/kategori/' + slugify('submenu-' + Date.now().toString(36).slice(-4)) });
      draw(); commit();
    };
    $('#addTop').onclick = () => { work.push({ label: 'Menu baru', route: '#/halaman/menu-baru' }); draw(); commit(); };
    $('#resetMenu').onclick = () => { if (confirm('Kembalikan menu ke isi data/menu.json?')) { store.del(LS_MENU); work = JSON.parse(JSON.stringify(S.defaultMenu)); draw(); commit(); store.del(LS_MENU); } };
    $('#exportMenu').onclick = () => download('menu.json', JSON.stringify(work, null, 2) + '\n', 'application/json');
    draw();
    dlg.showModal();
  }

  /* =========================================================
     Router
     ========================================================= */
  function route() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = raw.split('?');
    const q = new URLSearchParams(qs || '');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    S.charts.forEach(c => c.destroy()); S.charts = [];
    Runner.resetNamespace();
    $('#menu').classList.remove('open'); $('#navToggle').setAttribute('aria-expanded', 'false');
    const [a, b] = parts;
    if (!a) pageHome(q);
    else if (a === 'kategori' && b) pageCategory(b, q);
    else if (a === 'post' && b) pagePost(b);
    else if (a === 'halaman' && b) pageStatic(b);
    else if (a === 'arsip' && b) pageArchive(b);
    else if (a === 'cari') pageSearch(b || '');
    else if (a === 'tag' && b) pageTag(b);
    else if (a === 'lab' && OWNER) pageLab(q);
    else if (a === 'tulis' && OWNER) pageWrite();
    else pageNotFound();
    markActiveMenu();
    window.scrollTo(0, 0);
  }

  /* =========================================================
     Tema terang/gelap
     ========================================================= */
  function initTheme() {
    const saved = store.get(LS_THEME);
    if (saved) document.documentElement.dataset.theme = saved;
    const btn = document.createElement('button');
    btn.className = 'btn sm theme-toggle'; btn.type = 'button';
    const label = () => {
      const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      btn.textContent = dark ? '☀ Terang' : '☾ Gelap'; return dark;
    };
    btn.onclick = () => { const next = label() ? 'light' : 'dark'; document.documentElement.dataset.theme = next; store.set(LS_THEME, next); label(); route(); };
    label();
    $('.footer').appendChild(btn);
  }

  /* =========================================================
     Mulai
     ========================================================= */
  async function init() {
    try {
      const [site, menu, posts] = await Promise.all([getJSON('data/site.json'), getJSON('data/menu.json'), getJSON('data/posts.json')]);
      S.site = site; S.defaultMenu = menu; S.menu = (OWNER && store.get(LS_MENU)) || menu;
      S.posts = posts.sort((x, y) => y.date.localeCompare(x.date));
    } catch (e) {
      view().innerHTML = `<h1 class="post-title">Gagal memuat data</h1><p>${esc(e.message)}</p>
        <p class="help">Jika Anda membuka <code>index.html</code> langsung dari komputer (file://), browser memblokir pembacaan berkas. Jalankan server lokal: <code>python -m http.server</code> lalu buka <code>http://localhost:8000</code>, atau unggah ke GitHub Pages.</p>`;
      return;
    }
    $$('[data-site]').forEach(el => { if (el.dataset.site in S.site) el.textContent = S.site[el.dataset.site]; });
    if (S.site.headerImage) { const b = $('#banner'); b.style.backgroundImage = `url("${S.site.headerImage}")`; b.classList.add('has-image'); }
    buildCats(); renderMenu(); renderCalendar(); renderSidebarLists(); initTheme();

    $('#navToggle').onclick = () => { const o = $('#menu').classList.toggle('open'); $('#navToggle').setAttribute('aria-expanded', o); };
    $('#searchForm').onsubmit = e => { e.preventDefault(); const v = $('#searchInput').value.trim(); if (v) location.hash = '#/cari/' + encodeURIComponent(v); };
    if (OWNER) {
      $('#ruangKerja').hidden = false;
      $('#editMenuLink').onclick = e => { e.preventDefault(); openMenuEditor(); };
      document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') { e.preventDefault(); openMenuEditor(); } });
      $('.footer').insertAdjacentHTML('beforeend', ' <span class="owner-badge">· Mode pemilik · <a href="?keluar">Keluar</a></span>');
    }
    window.addEventListener('hashchange', route);
    if (OWNER && new URLSearchParams(location.search).has('edit')) openMenuEditor();
    route();
  }

  window.Blog = { renderMarkdown, hydrate };
  init();
})();
