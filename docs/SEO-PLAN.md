# Rencana SEO Tiby

Audit terhadap kode frontend dan situs live (https://tiby.web.id) per 30 Oktober 2026, rencana perbaikan bertahap, dan daftar periksa evaluasinya. Fase 0 sudah dikerjakan bersamaan dengan dokumen ini.

## Hasil audit — yang sudah baik

1. Halaman utama (`/`) adalah server component: HTML ter-render penuh di server, langsung terbaca crawler tanpa menunggu JavaScript.
2. `lang="id"` sudah terpasang; root layout sudah punya template judul, deskripsi, kata kunci, dan ikon.
3. Web manifest (PWA) sudah ada lengkap dengan ikon 192/512 dan apple-touch-icon; service worker terdaftar.
4. Font memakai `next/font` (self-hosted) — tanpa request ke server font eksternal, baik untuk kecepatan.
5. Gambar landing memakai `next/image` (optimasi dan resize otomatis) dan hero punya tepat satu `<h1>`.
6. HTTPS aktif lewat Cloudflare Tunnel.

## Hasil audit — yang kurang atau tidak best practice

1. **Sitemap tidak ada** — `/sitemap.xml` membalas 404. Crawler tidak punya peta halaman publik.
2. **robots.txt bukan milik proyek** — yang live adalah robots terkelola Cloudflare (content signals): tidak memuat aturan proyek, tidak merujuk sitemap, dan area privat (`/admin`, `/nakes`, `/pasien`, `/pmo`, `/dashboard`) tidak dilarang eksplisit. Cloudflare umumnya menggabungkan robots origin di bawah preamble-nya; bila ternyata tertimpa penuh, matikan fitur managed robots.txt di dashboard Cloudflare.
3. **OpenGraph tidak lengkap** — tanpa gambar, url, siteName, dan locale; Twitter Card tidak ada. Tautan yang dibagikan ke media sosial tampil polos tanpa gambar.
4. **`metadataBase` belum diset** — URL OpenGraph dan canonical tidak bisa absolut; Next.js memberi peringatan soal ini saat build.
5. **Tidak ada canonical dan data terstruktur** — belum ada JSON-LD, padahal landing punya bagian FAQ yang merupakan kandidat skema FAQPage untuk rich result.
6. **Area aplikasi belum bisa diberi `noindex`** — layout tiap area adalah client component sehingga tidak bisa mengekspor metadata. Untuk saat ini pengamanannya robots disallow + seluruh area berada di balik login.
7. **Aset gambar landing besar** — file PNG di `public/landing/` berukuran 260–445 KB per file. Terbantu optimasi `next/image`, tetapi sumbernya sebaiknya dikompresi atau diganti WebP.
8. **Judul landing menghilangkan kata kunci utama** — judul absolut halaman utama "Pendamping Cerdas Pengobatan" tanpa "TBC", berbeda dari judul default layout yang memuatnya.
9. **`start_url` manifest menunjuk `/dashboard`** — halaman redirect client-side; untuk PWA yang terpasang, membuka `/` lebih cepat.

## Fase 0 — selesai (bersamaan dengan dokumen ini)

1. `app/robots.ts` — mengizinkan perayapan halaman publik, melarang area aplikasi dan `/api/`, serta merujuk sitemap.
2. `app/sitemap.ts` — peta untuk `/`, `/demo`, `/login`, `/register` beserta prioritasnya.
3. `app/opengraph-image.tsx` dan `app/twitter-image.tsx` — gambar OpenGraph/Twitter 1200×630 yang dirender Next.js saat build: logo Tiby versi penuh (bukan logo-only) di latar putih, dari aset `public/logo/logo.png` yang sudah ada di repo.
4. Metadata root layout dilengkapi: `metadataBase`, OpenGraph lengkap (url, siteName, locale `id_ID`, gambar), Twitter Card `summary_large_image`, dan arahan robots index/follow.
5. Metadata landing dilengkapi: canonical `/`, OpenGraph dan Twitter Card dengan gambar.
6. JSON-LD di halaman utama: skema `WebSite` dan `SoftwareApplication`.
7. Manifest dilengkapi `id`, `lang: "id"`, dan `categories` health/medical.

## Fase 1 — perbaikan berikutnya (perubahan kode)

1. JSON-LD `FAQPage` yang dirender dari sumber data FAQ yang sama dengan komponennya, agar tidak ada duplikasi yang bisa basi.
2. Pisahkan server layout tipis per area aplikasi khusus untuk metadata `noindex, nofollow`; robots disallow tetap dipertahankan.
3. Metadata unik per halaman publik (`/login`, `/register`, `/demo`): judul dan deskripsi sendiri, bukan mewarisi default.
4. Kompresi aset `public/landing/` (target di bawah 150 KB per gambar) atau konversi ke WebP; audit teks `alt` semua gambar.
5. Samakan judul halaman utama agar memuat kata kunci "TBC".
6. Ganti `start_url` manifest menjadi `/`.

## Fase 2 — di luar kode

1. Daftarkan domain di Google Search Console dan Bing Webmaster Tools, lalu kirim `https://tiby.web.id/sitemap.xml` dan minta pengindeksan halaman utama.
2. Pantau laporan cakupan indeks dan kueri penelusuran tiap minggu.
3. Konten publik yang bisa diindeks — misalnya halaman edukasi TBC — adalah pintu masuk organik terbesar untuk topik ini; area aplikasi yang privat tidak akan pernah tampil di hasil pencarian.
4. Tautan balik dari halaman resmi kampus/tim dan publikasi lomba.

## Daftar periksa evaluasi

- `curl https://tiby.web.id/robots.txt` — memuat baris `Sitemap: https://tiby.web.id/sitemap.xml` dan aturan Disallow area aplikasi.
- `curl https://tiby.web.id/sitemap.xml` — membalas 200 dan memuat 4 URL publik.
- View-source halaman utama — ada `og:image`, `og:url`, `twitter:card`, canonical, dan script `application/ld+json`.
- URL `og:image` pada meta halaman utama — membalas 200, tipe image/png, ukuran 1200×630.
- Uji rich result (search.google.com/test/rich-results) dan validator OpenGraph untuk URL utama.
- Lighthouse kategori SEO pada halaman utama: target 100.
