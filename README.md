# Personal Blog — template GitHub Pages

Situs statis (tanpa build, tanpa server) dengan menu bertingkat yang bisa diedit, dashboard di Beranda, dan konten yang mendukung Markdown, rumus LaTeX, HTML/CSS/JS langsung, serta Python yang bisa dijalankan di browser (dengan grafik matplotlib).

## Memasang di GitHub Pages

1. Unggah seluruh isi folder ini ke repositori `NAMA-ANDA.github.io` (atau repositori lain, lalu aktifkan *Settings → Pages → Deploy from branch → main / root*).
2. Buka `https://NAMA-ANDA.github.io`.

Uji di komputer sendiri: jalankan `python -m http.server` di folder ini lalu buka `http://localhost:8000` (membuka `index.html` langsung lewat `file://` tidak akan memuat data).

## Struktur

| Berkas | Isi |
|---|---|
| `data/site.json` | Judul Arab, judul, tagline, nama, deskripsi, gambar header (`headerImage`), teks footer |
| `data/menu.json` | Menu & submenu |
| `data/posts.json` | Daftar tulisan (judul, tanggal, rubrik, label, ringkasan, berkas) |
| `posts/*.md` | Isi tulisan |
| `pages/*.md` | Halaman statis (`profilku.md`, `download.md`, …) |
| `files/` | Berkas untuk diunduh |
| `assets/css/style.css` | Tampilan; warna tema ada di bagian `:root` paling atas |
| `assets/js/app.js` | Router, dashboard, sidebar, editor menu, halaman Tulis & Lab |
| `assets/js/runner.js` | Menjalankan blok Python / HTML / JS |

## Mengubah menu

- **Cara visual:** klik *Atur menu* di sidebar (atau `Ctrl/⌘ + Shift + M`, atau buka `?edit`). Perubahan langsung terlihat di browser Anda. Klik **Unduh menu.json**, lalu ganti `data/menu.json` di repositori agar berlaku untuk semua pengunjung.
- **Cara manual:** edit `data/menu.json`.

Format `route`:

- `#/` → Beranda (dashboard)
- `#/kategori/nama` → daftar tulisan rubrik `nama`. Submenu otomatis menjadi sub-rubrik: membuka *Artikel* menampilkan tulisan Renungan, Matematika, dan Statistika sekaligus.
- `#/halaman/nama` → isi berkas `pages/nama.md`
- `#/post/slug` → satu tulisan
- `https://…` → tautan luar (dibuka di tab baru)

## Menambah tulisan

Cara termudah: buka **Tulis artikel baru** di sidebar (`#/tulis`). Isi judul, rubrik, dan konten — pratinjau tampil langsung. Lalu:

1. Klik **Unduh .md** → simpan ke folder `posts/`.
2. Klik **Salin entri JSON** → tempel di baris paling atas array dalam `data/posts.json`.
3. Commit ke GitHub.

Nilai `category` harus sama dengan nama rubrik di route menu (mis. `statistika`, `quran`, `pengabdian`).

## Fitur di dalam Markdown

````markdown
Rumus inline $\bar x$ dan blok:
$$ s^2 = \frac{1}{n-1}\sum (x_i-\bar x)^2 $$

```python run
import matplotlib.pyplot as plt
plt.plot([1, 2, 3], [1, 4, 9]); plt.show()
print("halo")
```

```html live
<button onclick="alert('Bismillah')">Klik</button>
```

```js run
console.log(2 ** 10)
```

<div class="ayat">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
````

- `python run` — dijalankan dengan Pyodide (Python 3.12 di browser). Paket seperti `numpy`, `pandas`, `scipy`, `matplotlib`, `sympy`, `statsmodels` dimuat otomatis dari `import`. Pemuatan pertama ± 10–20 detik, selanjutnya cepat. Blok Python dalam satu halaman berbagi variabel (seperti notebook). Ekspresi terakhir ditampilkan; DataFrame pandas tampil sebagai tabel.
- `html live` — pratinjau langsung di iframe aman; pengunjung bisa membuka dan mengubah kodenya.
- `js run` — keluaran `console.log` ditampilkan di bawah kode.
- HTML biasa (termasuk `<script>`) boleh ditulis langsung di Markdown.

Lab Kode (`#/lab`) menyediakan ruang uji coba untuk Python, JavaScript, HTML·CSS·JS, dan Markdown.

## Gambar header sendiri

Simpan gambar (± 2200×360 px) sebagai `assets/img/header.jpg`, lalu isi `"headerImage": "assets/img/header.jpg"` di `data/site.json`. Teks Arab, judul, dan tagline tetap ditampilkan di atasnya; kosongkan nilainya di `site.json` jika gambar sudah memuat teks.

## Pustaka yang dipakai (dari CDN)

marked (Markdown), KaTeX (rumus), highlight.js (pewarnaan kode), Chart.js (grafik dashboard), Pyodide (Python). Semuanya dimuat dari jsDelivr/cdnjs — tidak perlu dipasang.
