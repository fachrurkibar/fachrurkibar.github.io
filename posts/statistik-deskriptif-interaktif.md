Media pembelajaran ini saya gunakan pada perkuliahan **Statistika Dasar**. Mahasiswa cukup menempelkan data, dan ringkasan statistik langsung muncul. Rumus yang dipakai:

$$\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i, \qquad s = \sqrt{\frac{1}{n-1}\sum_{i=1}^{n}(x_i-\bar{x})^2}$$

### Coba langsung

```html live
<style>
  body{font-family:system-ui,sans-serif;margin:0;padding:14px;color:#1d2b4f}
  textarea{width:100%;height:60px;font:14px monospace;border:1px solid #9fb1da;border-radius:6px;padding:8px;box-sizing:border-box}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:12px 0}
  .t{background:#e7eefb;border-radius:8px;padding:8px 10px}
  .t b{display:block;font-size:20px;color:#2b4d9c}
  .t span{font-size:12px;color:#55607a}
  .bars{display:flex;align-items:flex-end;gap:3px;height:110px;border-bottom:1px solid #9fb1da}
  .bars div{flex:1;background:#5a74b8;border-radius:3px 3px 0 0}
</style>
<textarea id="d">72 85 90 66 78 88 95 70 82 79 91 60 75 84 87</textarea>
<div class="grid" id="out"></div>
<div class="bars" id="h"></div>
<script>
  const d = document.getElementById('d');
  function hitung(){
    const x = d.value.split(/[\s,;]+/).map(Number).filter(v=>!isNaN(v)&&v!=='');
    if(!x.length) return;
    const n=x.length, s=[...x].sort((a,b)=>a-b), m=x.reduce((a,b)=>a+b)/n;
    const med = n%2 ? s[(n-1)/2] : (s[n/2-1]+s[n/2])/2;
    const sd = Math.sqrt(x.reduce((a,v)=>a+(v-m)**2,0)/(n-1||1));
    const f = v => v.toFixed(2).replace('.',',');
    document.getElementById('out').innerHTML =
      [['n',n],['Rata-rata',f(m)],['Median',f(med)],['Simp. baku',f(sd)],['Min',s[0]],['Maks',s[n-1]]]
      .map(([k,v])=>`<div class="t"><b>${v}</b><span>${k}</span></div>`).join('');
    const k=8, lo=s[0], w=(s[n-1]-lo)/k||1, c=Array(k).fill(0);
    x.forEach(v=>c[Math.min(k-1,Math.floor((v-lo)/w))]++);
    const mx=Math.max(...c);
    document.getElementById('h').innerHTML=c.map(v=>`<div style="height:${v/mx*100}%" title="${v}"></div>`).join('');
  }
  d.addEventListener('input', hitung); hitung();
</script>
```

### Refleksi pembelajaran

- Mahasiswa lebih cepat memahami pengaruh **pencilan** terhadap rata-rata dibanding median: cukup tambahkan angka `5` atau `200` ke data.
- Histogram yang berubah seketika membantu membangun intuisi tentang **bentuk sebaran**.
