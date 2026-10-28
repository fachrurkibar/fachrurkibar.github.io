/* =========================================================
   runner.js — menjalankan blok kode di dalam tulisan
   - ```python run   → Python (Pyodide) + grafik matplotlib
   - ```html live    → pratinjau HTML/CSS/JS langsung (iframe aman)
   - ```js run       → JavaScript, keluaran console.log ditampilkan
   ========================================================= */
(function () {
  const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  let pyodidePromise = null;
  let pyNamespace = null;
  let uid = 0;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- HTML untuk blok interaktif (dipanggil oleh renderer Markdown) ---------- */
  function blockHTML(lang, mode, code) {
    const id = 'rb' + (++uid);
    const label = { python: 'Python', html: 'HTML · CSS · JS', js: 'JavaScript' }[lang] || lang;
    const lines = code.split('\n').length;
    const rows = Math.min(Math.max(lines + 1, 4), 28);
    if (lang === 'html') {
      return `<div class="runblock" data-lang="html" data-mode="live" id="${id}">
        <div class="runblock-bar"><span class="lang">${label}</span><span class="run-status">pratinjau langsung</span><span class="spacer"></span>
          <button class="btn sm" data-act="toggle">Lihat / ubah kode</button><button class="btn sm" data-act="reset">↺</button></div>
        <textarea class="code" spellcheck="false" rows="${rows}" hidden>${esc(code)}</textarea>
        <iframe class="live" sandbox="allow-scripts allow-modals allow-forms" title="Pratinjau HTML"></iframe>
        <template class="orig">${esc(code)}</template>
      </div>`;
    }
    return `<div class="runblock" data-lang="${lang}" data-mode="run" id="${id}">
      <div class="runblock-bar"><span class="lang">${label}</span><span class="run-status"></span><span class="spacer"></span>
        <button class="btn sm" data-act="reset" title="Kembalikan kode asli">↺</button>
        <button class="btn sm primary" data-act="run" title="Ctrl/⌘ + Enter">▶ Jalankan</button></div>
      <textarea class="code" spellcheck="false" rows="${rows}">${esc(code)}</textarea>
      <div class="run-out" aria-live="polite"></div>
      <template class="orig">${esc(code)}</template>
    </div>`;
  }

  /* ---------- Pasang perilaku pada semua blok di dalam elemen ---------- */
  function enhance(root) {
    root.querySelectorAll('.runblock:not([data-ready])').forEach(block => {
      block.dataset.ready = '1';
      const ta = block.querySelector('textarea.code');
      const orig = block.querySelector('template.orig').innerHTML
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const lang = block.dataset.lang;

      ta.addEventListener('keydown', e => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const s = ta.selectionStart;
          ta.setRangeText('    ', s, ta.selectionEnd, 'end');
          ta.dispatchEvent(new Event('input'));
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(); }
      });

      const run = () => {
        if (lang === 'python') return runPython(ta.value, block);
        if (lang === 'js') return runJS(ta.value, block);
        if (lang === 'html') return renderLive(ta.value, block);
      };

      block.querySelector('[data-act="run"]')?.addEventListener('click', run);
      block.querySelector('[data-act="reset"]').addEventListener('click', () => {
        ta.value = orig;
        if (lang === 'html') renderLive(orig, block);
        else { const out = block.querySelector('.run-out'); out.innerHTML = ''; out.classList.remove('show'); }
      });
      block.querySelector('[data-act="toggle"]')?.addEventListener('click', () => { ta.hidden = !ta.hidden; if (!ta.hidden) ta.focus(); });

      if (lang === 'html') {
        let t; ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => renderLive(ta.value, block), 350); });
        renderLive(ta.value, block);
      }
    });
  }

  /* ---------- HTML langsung ---------- */
  const resizeScript = id => `<script>(function(){function s(){parent.postMessage({__live:"${id}",h:document.documentElement.scrollHeight},"*")}
    addEventListener("load",s);new ResizeObserver(s).observe(document.documentElement);setTimeout(s,300)})();<\/script>`;

  function renderLive(code, block) {
    const frame = block.querySelector('iframe.live');
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${code}${resizeScript(block.id)}</body></html>`;
  }
  window.addEventListener('message', e => {
    const d = e.data || {};
    if (d.__live) {
      const f = document.querySelector('#' + CSS.escape(d.__live) + ' iframe.live, iframe.live[data-id="' + d.__live + '"]');
      if (f) f.style.height = Math.min(Math.max(d.h + 4, 80), 1600) + 'px';
    }
  });

  /* ---------- JavaScript ---------- */
  function runJS(code, block) {
    const out = block.querySelector('.run-out');
    out.innerHTML = ''; out.classList.add('show');
    const id = 'js' + (++uid);
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.style.display = 'none';
    const safe = code.replace(/<\/script/gi, '<\\/script');
    frame.srcdoc = `<script>
      const send=(t,a)=>parent.postMessage({__js:"${id}",t,m:a.map(x=>{try{return typeof x==="object"?JSON.stringify(x,null,1):String(x)}catch(e){return String(x)}}).join(" ")},"*");
      console.log=(...a)=>send("log",a);console.info=console.log;console.warn=(...a)=>send("err",a);console.error=(...a)=>send("err",a);
      window.onerror=(m,s,l)=>{send("err",["Baris "+l+": "+m])};
    <\/script><script>${safe}<\/script><script>send("done",[])<\/script>`;
    const onMsg = e => {
      if (!e.data || e.data.__js !== id) return;
      if (e.data.t === 'done') { window.removeEventListener('message', onMsg); setTimeout(() => frame.remove(), 50); return; }
      const p = document.createElement('pre');
      p.className = e.data.t === 'err' ? 'stderr' : 'stdout';
      p.textContent = e.data.m;
      out.appendChild(p);
    };
    window.addEventListener('message', onMsg);
    document.body.appendChild(frame);
  }

  /* ---------- Python (Pyodide) ---------- */
  function loadPyodideOnce(status) {
    if (pyodidePromise) return pyodidePromise;
    pyodidePromise = new Promise((resolve, reject) => {
      status('memuat Python (± 10 MB, hanya sekali)…');
      const s = document.createElement('script');
      s.src = PYODIDE_URL + 'pyodide.js';
      s.onload = async () => {
        try {
          const py = await window.loadPyodide({ indexURL: PYODIDE_URL });
          await py.runPythonAsync(`
import sys, io, os, base64, warnings
os.environ["MPLBACKEND"] = "AGG"
warnings.filterwarnings("ignore", message=".*non-interactive.*")
def __capture_figs():
    if "matplotlib.pyplot" not in sys.modules:
        return []
    import matplotlib.pyplot as plt
    out = []
    for n in plt.get_fignums():
        b = io.BytesIO()
        plt.figure(n).savefig(b, format="png", dpi=110, bbox_inches="tight")
        out.append(base64.b64encode(b.getvalue()).decode())
    plt.close("all")
    return out
def __fmt(o):
    if hasattr(o, "_repr_html_"):
        try:
            return ["html", o._repr_html_()]
        except Exception:
            pass
    return ["text", repr(o)]
`);
          resolve(py);
        } catch (err) { pyodidePromise = null; reject(err); }
      };
      s.onerror = () => { pyodidePromise = null; reject(new Error('Gagal memuat Pyodide. Periksa koneksi internet.')); };
      document.head.appendChild(s);
    });
    return pyodidePromise;
  }

  let queue = Promise.resolve();
  function runPython(code, block) {
    queue = queue.then(() => runPythonNow(code, block)).catch(() => {});
    return queue;
  }

  async function runPythonNow(code, block) {
    const out = block.querySelector('.run-out');
    const statusEl = block.querySelector('.run-status');
    const btn = block.querySelector('[data-act="run"]');
    const status = t => { statusEl.textContent = t; };
    out.innerHTML = ''; out.classList.add('show');
    btn.disabled = true;
    const t0 = performance.now();
    const addText = (cls, txt) => {
      let last = out.lastElementChild;
      if (!last || !last.classList.contains(cls)) { last = document.createElement('pre'); last.className = cls; out.appendChild(last); }
      last.textContent += txt + '\n';
    };
    try {
      const py = await loadPyodideOnce(status);
      if (!pyNamespace) pyNamespace = py.globals.get('dict')();
      status('memasang paket…');
      await py.loadPackagesFromImports(code, { messageCallback: m => status(m.slice(0, 60)) });
      py.setStdout({ batched: s => addText('stdout', s) });
      py.setStderr({ batched: s => addText('stderr', s) });
      status('berjalan…');
      const result = await py.runPythonAsync(code, { globals: pyNamespace });
      if (result !== undefined && result !== null) {
        const fmt = py.globals.get('__fmt')(result).toJs();
        if (fmt[0] === 'html') { const d = document.createElement('div'); d.className = 'prose'; d.innerHTML = fmt[1]; out.appendChild(d); }
        else addText('stdout', fmt[1]);
        result.destroy?.();
      }
      const figs = py.globals.get('__capture_figs')().toJs();
      figs.forEach(b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; img.alt = 'Grafik keluaran Python'; out.appendChild(img); });
      status(`selesai · ${((performance.now() - t0) / 1000).toFixed(1)} dtk`);
      if (!out.childElementCount) addText('stdout', '(tidak ada keluaran)');
    } catch (err) {
      const msg = String(err.message || err);
      const i = msg.indexOf('File "<exec>"');
      const tb = i >= 0 ? 'Traceback:\n  ' + msg.slice(i) : msg;
      addText('stderr', tb.trim());
      status('galat');
    } finally {
      btn.disabled = false;
    }
  }

  window.Runner = {
    blockHTML, enhance, renderLive,
    resetNamespace() { pyNamespace = null; },
    runPythonCode: runPython,
    warmup() { return loadPyodideOnce(() => {}); }
  };
})();
