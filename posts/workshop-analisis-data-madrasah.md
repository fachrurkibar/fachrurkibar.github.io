**Tempat:** MAN Kota Malang · **Peserta:** 35 guru · **Skema:** Pengabdian kepada Masyarakat

Kegiatan ini bertujuan membantu guru mengolah nilai ulangan menjadi informasi yang dapat ditindaklanjuti: siapa yang membutuhkan remedial, butir soal mana yang terlalu sulit, dan bagaimana tren capaian kelas.

### Materi

1. Statistik deskriptif dengan spreadsheet
2. Analisis butir soal: tingkat kesukaran $p = \frac{B}{N}$ dan daya pembeda
3. Visualisasi capaian kelas

### Hasil evaluasi peserta

```python run
import matplotlib.pyplot as plt
aspek = ["Materi", "Pemateri", "Waktu", "Manfaat", "Fasilitas"]
skor = [4.5, 4.7, 3.9, 4.8, 4.2]
plt.figure(figsize=(7, 3.2))
bars = plt.barh(aspek, skor, color="#5a74b8")
plt.xlim(0, 5); plt.xlabel("Skor rata-rata (1–5)")
for b, s in zip(bars, skor):
    plt.text(s + .05, b.get_y() + b.get_height()/2, f"{s}", va="center")
plt.title("Kepuasan peserta workshop"); plt.tight_layout(); plt.show()
```

*(Data di atas adalah contoh.)*
