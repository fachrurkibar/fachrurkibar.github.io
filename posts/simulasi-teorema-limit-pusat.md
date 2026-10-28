Media pembelajaran ini membantu mahasiswa melihat sendiri isi **Teorema Limit Pusat**: rata-rata dari sampel acak berukuran $n$ akan berdistribusi mendekati normal, apa pun bentuk populasinya,

$$\bar{X}_n \;\approx\; N\!\left(\mu,\ \frac{\sigma^2}{n}\right).$$

Mahasiswa memilih distribusi populasi, mengubah parameternya, lalu memperbesar ukuran sampel $n$ dan mengamati bagaimana histogram rata-rata sampel berubah bentuk.

### Coba langsung

<div class="tlp-embed">
<iframe id="tlp-frame" src="simulasi-clt.html" title="Simulasi Teorema Limit Pusat" loading="lazy" style="display:block;width:100%;height:1700px;border:0;border-radius:8px;background:transparent"></iframe>
<p style="font-size:15px;margin:.4em 0 0;text-align:right"><a href="simulasi-clt.html" target="_blank" rel="noopener">Buka simulasi di halaman penuh ↗</a></p>
</div>

<script>
(function () {
  var f = document.getElementById('tlp-frame');
  if (!f) return;
  function setup() {
    var d;
    try { d = f.contentDocument; } catch (e) { return; }
    if (!d || !d.body) return;
    var st = d.createElement('style');
    st.textContent = 'html,body{background:transparent!important}.wrap>header .eyebrow,.wrap>header h1{display:none}.wrap{padding-top:4px!important;padding-bottom:8px!important}';
    d.head.appendChild(st);
    var t = document.documentElement.getAttribute('data-theme');
    if (t) d.documentElement.setAttribute('data-theme', t);
    function fit() { f.style.height = d.documentElement.scrollHeight + 'px'; }
    new ResizeObserver(fit).observe(d.body);
    fit();
  }
  f.addEventListener('load', setup);
  if (f.contentDocument && f.contentDocument.readyState === 'complete' && f.contentDocument.body && f.contentDocument.body.childElementCount) setup();
})();
</script>

### Cara membaca simulasi

- **Grafik pertama** menampilkan data mentah yang dibangkitkan dari populasi. Bentuknya mengikuti populasi, misalnya tetap menceng ke kanan untuk distribusi eksponensial.
- **Grafik kedua** berisi satu nilai untuk setiap sampel, yaitu rata-ratanya. Saat $n$ membesar, histogram ini makin sempit (galat baku $\sigma/\sqrt{n}$) dan makin menyerupai kurva normal.
- **Tabel** membandingkan nilai teoretis dengan hasil simulasi. Kemencengan dan kurtosis berlebih $\bar X$ menyusut menjadi $\gamma_1/\sqrt{n}$ dan $\gamma_2/n$, sehingga keduanya menuju 0 seperti pada distribusi normal.
- Mode **Bertahap** mengambil sampel satu per satu, sehingga mahasiswa bisa melihat histogram rata-rata sampel terbentuk perlahan.

### Aktivitas untuk kelas

1. Pilih populasi **Eksponensial** dengan $\lambda = 0{,}5$. Bandingkan bentuk histogram rata-rata sampel untuk $n = 1$, $n = 5$, dan $n = 30$. Pada $n$ berapa bentuknya sudah tampak normal?
2. Catat simpangan baku $\bar X$ dari tabel untuk $n = 4$ dan $n = 16$. Berapa perbandingannya? Cocokkan dengan rumus $\sigma/\sqrt{n}$.
3. Ulangi langkah 1 untuk populasi **Seragam** dan **Bimodal**. Populasi mana yang paling cepat mendekati normal, dan mengapa? Petunjuk: lihat nilai kemencengan populasi.
4. Pilih **Poisson** dengan $\lambda = 0{,}5$ dan $n = 2$. Mengapa histogram rata-rata sampel tampak bergerigi?

Untuk versi kode Python yang bisa diubah dan dijalankan langsung, lihat tulisan [Teorema Limit Pusat: Melihat Keteraturan di Balik Keacakan](#/post/teorema-limit-pusat).
