## Keteraturan di balik keacakan

Ambil sampel berukuran $n$ dari populasi apa pun yang memiliki rata-rata $\mu$ dan varians $\sigma^2$ yang hingga. Teorema Limit Pusat menyatakan bahwa untuk $n$ yang cukup besar,

$$
\bar{X}_n \;\approx\; N\!\left(\mu,\ \frac{\sigma^2}{n}\right)
\qquad\text{atau}\qquad
\frac{\bar{X}_n-\mu}{\sigma/\sqrt{n}} \xrightarrow{d} N(0,1).
$$

Yang menakjubkan: populasi asalnya **tidak harus normal**. Mari kita buktikan secara empiris.

### Simulasi (klik ▶ Jalankan)

Populasi di bawah ini sangat miring (distribusi eksponensial). Ubah nilai `n` lalu jalankan ulang.

```python run
import numpy as np
import matplotlib.pyplot as plt

rng = np.random.default_rng(2026)
n = 30          # ukuran sampel — coba ganti 2, 5, 30
ulangan = 5000  # banyaknya sampel

populasi = rng.exponential(scale=1.0, size=100_000)
rata2 = rng.exponential(scale=1.0, size=(ulangan, n)).mean(axis=1)

fig, ax = plt.subplots(1, 2, figsize=(10, 3.8))
ax[0].hist(populasi, bins=60, color="#5a74b8", alpha=.85)
ax[0].set_title("Populasi: Eksponensial(1)")
ax[1].hist(rata2, bins=50, density=True, color="#2b4d9c", alpha=.8)
x = np.linspace(rata2.min(), rata2.max(), 200)
ax[1].plot(x, np.exp(-(x-1)**2/(2/n)) / np.sqrt(2*np.pi/n), color="#d4a017", lw=2.5)
ax[1].set_title(f"Rata-rata sampel, n = {n}")
plt.tight_layout()
plt.show()

print(f"Rata-rata dari rata-rata sampel : {rata2.mean():.4f}  (teori: 1)")
print(f"Simpangan baku rata-rata sampel : {rata2.std():.4f}  (teori: {1/np.sqrt(n):.4f})")
```

### Catatan untuk kelas

| Ukuran sampel $n$ | Bentuk distribusi $\bar X$ |
|---|---|
| 2 | masih miring ke kanan |
| 5 | mulai simetris |
| 30 | hampir normal |

> Keacakan pada tingkat individu, keteraturan pada tingkat kumpulan — sebuah pelajaran yang juga berlaku dalam kehidupan.
