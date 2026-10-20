# 🎨 Tiby Design System & UI/UX Guidelines

> **Instruksi untuk AI Agent / Developer:** Dokumen ini adalah sumber kebenaran tunggal (Single Source of Truth) untuk semua pengembangan antarmuka (Frontend) di aplikasi Tiby. Patuhi aturan warna, tipografi, dan komponen di bawah ini. Jangan menggunakan warna default Tailwind (seperti `bg-red-500` atau `bg-gray-100`) kecuali diizinkan secara eksplisit di sini.

## 1. Design Philosophy
Tiby mengadopsi estetika **"Privacy-First Fintech"** yang terinspirasi dari [PIVY.me](https://pivy.me), dipadukan dengan kehangatan aplikasi kesehatan.
*   **Clean & Minimalist:** Banyak *white space*, tidak ada elemen visual yang berlebihan. Fokus pada satu aksi utama per layar.
*   **Card-Based Layout:** Informasi dikelompokkan dalam kartu-kartu dengan sudut membulat (rounded), memberikan kesan modern dan mudah dicerna.
*   **Empathetic & Calming:** Menghindari warna medis yang kaku atau warna peringatan yang menakutkan. Antarmuka harus terasa seperti "teman yang mendampingi", bukan "rumah sakit".
*   **Privacy-Preserving:** Tidak ada kata "TBC" atau "Tuberkulosis" di antarmuka pasien. Gunakan istilah netral seperti "Rutinitas Sehat" atau "Pendamping Harian".

## 2. Color Palette (Tailwind Configuration)
Gunakan palet warna ini. Konfigurasikan di `tailwind.config.js` Anda.

| Hex Code | Nama Tailwind | Penggunaan (Usage) |
| :--- | :--- | :--- |
| `#127A78` | `tiby-teal-700` | Hover state untuk tombol utama, teks judul yang tegas. |
| `#1B9E9B` | `tiby-teal-600` | **Primary Color.** Tombol utama (CTA), ikon aktif, border fokus. |
| `#DDF0EE` | `tiby-teal-100`| Latar belakang kartu sekunder, badge status aman. |
| `#F1FAF9` | `tiby-teal-50` | Latar belakang kartu utama (Hero Card) di beranda pasien. |
| `#FCFCFA` | `tiby-white` | Latar belakang halaman utama (Panda White). Lebih lembut dari `#FFFFFF`. |
| `#FAF5EA` | `tiby-cream` | Latar belakang kartu untuk status "Perlu Perhatian" atau area hangat. |
| `#2C2C2C` | `tiby-ink` | Warna teks utama (Heading & Body). Hindari hitam pekat `#000000`. |
| `#6F6F6A` | `tiby-muted` | Warna teks sekunder, placeholder, atau *caption*. |

**Aturan Warna Status (Rule Engine Verdicts):**
*   🟢 **Terkendali:** Background `tiby-teal-50`, Teks `tiby-teal-700`, Ikon centang.
*   🟡 **Perlu Perhatian:** Background `tiby-cream`, Teks `tiby-ink`, Ikon peringatan lembut.
*   🔴 **Segera ke Faskes:** Background `#FDF3F3` (merah sangat pastel), Teks `#9B1C1C` (merah gelap), TANPA warna merah menyala. Tombol aksi harus menonjol.

## 3. Typography
Gunakan *font* yang membulat dan ramah. Jangan gunakan *font* kaku seperti Arial atau Roboto.
*   **Heading (H1, H2, H3):** `Fredoka` (Google Fonts) - Bobot: 500 (Medium) atau 600 (SemiBold).
*   **Body Text & UI Elements:** `Open Runde` atau `Nunito` (Fallback) - Bobot: 400 (Regular) atau 500 (Medium).
*   **Ukuran:** Gunakan skala yang jelas. (Contoh: `text-3xl` untuk sapaan beranda, `text-sm` untuk *caption*).

## 4. Shapes & Spacing (Layout)
*   **Border Radius (Sudut):**
    *   Kartu Besar (Cards): `rounded-2xl` atau `rounded-3xl` (16px - 24px).
    *   Tombol (Buttons): `rounded-full` (Pill shape) atau `rounded-xl`.
    *   Input Field: `rounded-xl`.
*   **Shadows:** Gunakan *shadow* yang sangat halus dan menyebar. Hindari *shadow* tajam.
    *   *Tailwind:* `shadow-sm` atau `shadow-[0_4px_20px_rgba(0,0,0,0.05)]`.
*   **Spacing:** Berikan *padding* yang lega di dalam kartu (`p-6` atau `p-8`). Jarak antar elemen (`gap-4` atau `gap-6`).

## 5. UI Components (Komponen Wajib)

### A. Primary Button (CTA)
*   **Style:** Background `tiby-teal-600`, Teks putih, `rounded-full`, `px-6 py-3`, `font-medium`. 
*   **Hover:** Background `tiby-teal-700`, transisi halus.
*   **Contoh Kasus:** Tombol "Sudah Minum", "Hubungi PMO".

### B. Secondary Button
*   **Style:** Background transparan, Border `tiby-teal-600`, Teks `tiby-teal-700`, `rounded-full`.

### C. Cards (PIVY Style)
*   **Style:** Background `tiby-white` atau `tiby-teal-50`, `rounded-3xl`, `p-6`, tanpa border tebal (mengandalkan *shadow* halus).
*   **Header Card:** Biasanya berisi teks kecil (`text-tiby-muted`) dan teks besar (`text-tiby-ink`).

### D. Voice Check-in Hero (Khusus Beranda Pasien)
*   Desain terinspirasi dari *Stealth Balance* PIVY. Satu kartu besar di tengah layar.
*   Berisi tombol mikrofon raksasa (lingkaran `w-24 h-24`) dengan efek *pulse* (gelombang suara) berwarna `tiby-teal-600` saat aktif.
*   Maskot Pandu diletakkan di atas atau di samping tombol mikrofon.

### E. Status Badges
*   Berbentuk *pill* (`rounded-full px-3 py-1 text-xs font-semibold`).
*   Menunjukkan status: "Terkendali", "Perlu Perhatian", "Segera ke Faskes".

## 6. Mascot Integration (Pandu)
*   Gunakan gambar Panda (Pandu) yang sudah disediakan (di folder `/public/mascot/`).
*   **Penggunaan:** 
    *   *Listening state:* Saat pasien menekan tombol mikrofon.
    *   *Empty State:* Saat belum ada riwayat *check-in* atau data kosong.
    *   *Verdict State:* Sesuaikan ekspresi Panda dengan status (sedih untuk *red flag*, melompat untuk *terkendali*).
*   Jangan menaruh maskot di *Dashboard Faskes* (Web Desktop). Maskot hanya untuk antarmuka Pasien dan PMO (Mobile).

## 7. Layout Rules (Responsive)
*   **Mobile (Pasien/PMO):** Desain *Mobile-First*. Maksimal lebar konten 480px di tengah layar. Navigasi bawah (*Bottom Navigation*) dengan 3 ikon utama (Home, Edukasi, Profil).
*   **Desktop (Faskes):** Desain *SaaS Dashboard*. Gunakan *Sidebar* di sebelah kiri (lebar 250px) dan area konten utama yang luas. Gunakan tabel untuk daftar pasien, bukan *cards*.
*   **Jangan Campur Aduk:** Jangan menggunakan tata letak Desktop di Mobile, dan sebaliknya. Gunakan *breakpoints* Tailwind (`md:`, `lg:`) untuk menyesuaikan.

## 8. Anti-Patterns (Larangan Keras untuk Agent)
❌ **JANGAN** menggunakan warna merah menyala (`bg-red-500` atau `text-red-600`) untuk *error* atau *red flag*. Gunakan warna pastel atau ikon.
❌ **JANGAN** menampilkan teks transkrip suara pasien di *Dashboard Faskes* jika tidak diperlukan (cukup tampilkan JSON hasil ekstraksi AI).
❌ **JANGAN** menggunakan *font* yang kaku atau berukuran sangat kecil. Pastikan *font size* minimal `text-sm` (14px) untuk aksesibilitas lansia.
❌ **JANGAN** membuat form registrasi manual untuk pasien. Semua harus *Frictionless Onboarding* (login saja).

## 9. Tailwind Config Example
Tambahkan ini ke `tailwind.config.js` Anda agar agent langsung mengenali kelas warnanya:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        tiby: {
          teal: {
            50: '#F1FAF9',
            100: '#DDF0EE',
            600: '#1B9E9B',
            700: '#127A78',
          },
          white: '#FCFCFA',
          cream: '#FAF5EA',
          ink: '#2C2C2C',
          muted: '#6F6F6A',
          danger: '#FDF3F3',
          dangerText: '#9B1C1C',
        }
      },
      fontFamily: {
        heading: ['Fredoka', 'sans-serif'],
        body: ['Open Runde', 'Nunito', 'sans-serif'],
      },
      borderRadius: {
        'card': '24px',
      }
    }
  }
}