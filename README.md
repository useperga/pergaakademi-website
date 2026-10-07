# Perga Tech Akademi: web sitesi (Otter Jeksın sürümü)

Bu klasör, maskot Otter Jeksın'ı temel alan sürümdür (deniz paleti, sayfada gezen 3D rehber, sohbet).

- Jeksın'ın repliği, hazır soruları ve bilgi tabanı: `src/jeksin.js` (LINES, QUICK, KB, FINDER)
- 3D model ve hareketler: `src/otter.js`
- Her bölümdeki yeri: `index.html` içindeki `data-jx-spot` öğeleri ve `styles.css` sonundaki OTTER JEKSIN bölümü

Palet `src/styles.css` başındaki `:root` bloğunda; renklerin bileşenlere dağılımı dosyanın sonundaki
"MINDMARKET PALETTE" bölümünde. Film renkleri `src/film.js` içindeki `PAL`, `CREAM`, `YELLOW`.

```bash
npm install
npm run dev -- --port 5175   # http://localhost:5175
npm run build    # dist/
```

## Hero videosu
Hero şu an `src/film.js` içindeki prosedürel (koni kesitleri) filmi oynatıyor.
Kendi videonuzu kullanmak için:

1. Videoyu scrub için kodlayın (her kare anahtar kare, ses yok):
   `ffmpeg -i video.mp4 -an -c:v libx264 -g 1 -crf 22 -pix_fmt yuv420p -movflags +faststart public/media/hero.mp4`
   (İsteğe bağlı dikey mobil kesim: `public/media/hero-mobile.mp4`)
2. Site dosyayı otomatik algılar ve canvas yerine videoyu kullanır.
3. `src/story.js` içindeki sahne zamanlarını (saniye) videonuzdaki sahnelere göre güncelleyin.

## Yapılacaklar
- `index.html`: eğitmen adları ve unvanları (“Eğitmen adı” yer tutucuları).
- `src/main.js`: form gönderimini gerçek bir servise bağlayın (TODO).
- Footer'daki “Gizlilik ve Aydınlatma” ve “Çerez Tercihleri” bağlantıları.
