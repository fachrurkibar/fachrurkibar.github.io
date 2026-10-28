Barisan Fibonacci didefinisikan secara rekursif:

$$F_1 = F_2 = 1, \qquad F_{n} = F_{n-1} + F_{n-2}.$$

Misalkan $r_n = \dfrac{F_{n+1}}{F_n}$. Jika limitnya ada, sebut $\varphi$, maka dari $r_n = 1 + \dfrac{1}{r_{n-1}}$ diperoleh

$$\varphi = 1 + \frac{1}{\varphi} \;\Longrightarrow\; \varphi^2 - \varphi - 1 = 0 \;\Longrightarrow\; \varphi = \frac{1+\sqrt5}{2} \approx 1{,}6180.$$

### Lihat konvergensinya

```python run
import matplotlib.pyplot as plt

F = [1, 1]
for _ in range(18):
    F.append(F[-1] + F[-2])
r = [F[i+1]/F[i] for i in range(len(F)-1)]
phi = (1 + 5**0.5) / 2

plt.figure(figsize=(8, 3.6))
plt.plot(range(1, len(r)+1), r, "o-", color="#2b4d9c", label=r"$F_{n+1}/F_n$")
plt.axhline(phi, color="#d4a017", ls="--", label=r"$\varphi$")
plt.xlabel("n"); plt.legend(); plt.grid(alpha=.3)
plt.title("Rasio suku Fibonacci berurutan")
plt.show()

for n in (5, 10, 15, 19):
    print(f"n={n:2d}  rasio={r[n-1]:.10f}  selisih={abs(r[n-1]-phi):.2e}")
```

Perhatikan rasionya berosilasi di sekitar $\varphi$ — kadang di atas, kadang di bawah — dengan galat yang mengecil secara eksponensial.

**Latihan:** buktikan bahwa $F_{n+1}F_{n-1} - F_n^2 = (-1)^n$ (identitas Cassini), lalu gunakan untuk menjelaskan osilasi tadi.
