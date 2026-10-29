# Tiby

Pendamping Cerdas Pengobatan TBC. Bun monorepo dengan tiga service yang dapat di-deploy secara independen; kode bersama di `shared/` hanya berisi contracts, bukan business logic.

## Struktur Repo

```
tiby/
  app/frontend/        # Next.js — bun run dev:frontend
  app/backend/         # NestJS — bun run dev:backend
  app/ai-service/      # FastAPI (Python, separate env — no root scripts)
  shared/
    ts-shared/         # zod schemas + types + error codes (FE+BE)
    api-contract/      # source of truth, including AI
```

## Setup Development

```sh
bun install          # sekali, di root

bun run dev:frontend # Next.js (port 3000)
bun run dev:backend  # NestJS (PORT=3001)
bun run dev          # keduanya sekaligus
```

AI service berjalan dengan environment Python terpisah: masuk ke `app/ai-service` dan ikuti README di folder tersebut (venv sendiri + provider API tokens).

Untuk deployment (Docker, environment, domain publik), lihat bagian [Deployment](#deployment) di bawah.

---

## Deployment

Bagian ini membahas cara deploy: prasyarat, konfigurasi, langkah, dan aturan. Mekanisme aplikasi tidak dibahas di sini.

### Overview

Seluruh stack berjalan dari satu `docker-compose.yml` di root repo.

| Komponen | Teknologi | Port (host) | Keterangan |
| --- | --- | --- | --- |
| Frontend | Next.js 16 | 3000 | Web app |
| Backend | NestJS | 3001 | Semua route di bawah prefix `/api` |
| AI Service | FastAPI, Python 3.10 | 8000 | Health check di `/health` |
| Database | PostgreSQL 16 | 5432 | Volume `tiby-pgdata` |
| WhatsApp | WAHA | 3008 | Dashboard + API, sesi di volume `tiby-waha-sessions` |
| Proxy | Caddy | 8080 | Entrypoint tunggal: `/api/*` ke backend, sisanya ke frontend |
| Tunnel | cloudflared | - | Opsional, profile `tunnel`, untuk domain publik |

### Prasyarat

- Docker Engine dan Docker Compose v2.
- Akun S3-compatible storage (mis. Supabase Storage). Tidak ada object storage bawaan di stack ini; tanpa S3 asli, fitur upload tidak berfungsi.
- Token provider AI (NaraRouter, Groq, Fish Audio) untuk fitur AI penuh. Tanpa token asli, ai-service tetap hidup tetapi panggilan AI mengembalikan 503.
- Untuk publik dengan domain sendiri: akun Cloudflare dan domain yang DNS-nya dikelola Cloudflare.

### Konfigurasi Environment

Semua nilai ada di blok `environment` pada `docker-compose.yml`. Nilai yang ter-commit di repo adalah **dummy** untuk uji lokal.

Aturan:

1. Jangan commit nilai asli (secret, token, API key) ke repo.
2. Ganti semua variabel bertanda wajib sebelum deploy publik.
3. `NEXT_PUBLIC_API_URL` di-bake ke bundle frontend saat build. Mengubahnya wajib rebuild image frontend.
4. Nilai WAHA di backend dan di service `waha` harus identik (`WAHA_API_KEY`, dan `WAHA_WEBHOOK_SECRET` = nilai `X-Waha-Secret` pada `WHATSAPP_HOOK_CUSTOM_HEADERS`).

Backend:

| Variabel | Wajib | Catatan |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Ya | Acak, minimal 32 karakter |
| `BETTER_AUTH_URL` | Ya | Origin publik backend, mis. `https://tiby.web.id` |
| `DATABASE_URL` | Otomatis | Sudah mengarah ke service `db` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Ya | Generate pasangan sendiri, jangan pakai contoh dari `.env.example` |
| `PII_ENCRYPTION_KEY` | Ya | Hex 64 karakter |
| `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION` | Ya, untuk upload | Dari provider S3 (mis. Supabase Storage) |
| `WAHA_BOT_PHONE_NUMBER` | Ya, untuk WhatsApp | Nomor bot, format internasional tanpa `+` |
| `WEB_URL` | Ya | Origin publik frontend |

AI Service:

| Variabel | Wajib | Catatan |
| --- | --- | --- |
| `NARAROUTER_API_TOKEN`, `NARAROUTER_API_KEY` | Ya, untuk AI | Dari akun NaraRouter |
| `GROQ_API_KEY` | Ya, untuk AI | Dari akun Groq |
| `FISH_AUDIO_API_TOKEN`, `FISH_API_KEY` | Ya, untuk transkripsi | Dari akun Fish Audio |

### Deploy dengan Docker

```bash
git clone https://github.com/mcqeems/tiby.git
cd tiby

# 1. Edit docker-compose.yml, isi environment sesuai tabel di atas
# 2. Build dan jalankan semua service
docker compose up -d --build

# 3. Verifikasi
docker compose ps   # frontend, backend, ai-service, db harus (healthy)
curl http://localhost:3000          # halaman frontend
curl http://localhost:3001/api      # {"status":"ok"}
curl http://localhost:8000/health   # {"status":"ok"}
```

Catatan first boot:

- Service one-shot `auth-migrate` membuat tabel Better Auth (`users`, `session`, `account`, `verification`) dan backend menunggu service ini selesai sebelum start. Cek dengan `docker compose logs auth-migrate`.
- Tabel aplikasi dibuat oleh TypeORM `synchronize` karena repo belum memiliki migration. Ini alasan `NODE_ENV` diset `development` pada compose; lihat Aturan.
- Pairing WhatsApp: buka dashboard WAHA di port 3008, login dengan `WAHA_DASHBOARD_USERNAME` / `WAHA_DASHBOARD_PASSWORD`, lalu scan QR pada sesi `default`.
- Data demo (opsional): `docker compose exec backend bun run seed`.

### Deploy Publik (Cloudflare Tunnel)

Prinsip: hanya proxy (8080) yang menerima trafik publik. Port backend (3001), database (5432), dan WAHA (3008) jangan dipublish ke internet.

1. Buat tunnel di Cloudflare Zero Trust: Networks, Tunnels, Create tunnel, pilih Cloudflared. Salin token-nya.
2. Tulis token ke file `.env` di root repo pada server:

   ```bash
   # .env
   TUNNEL_TOKEN=<token dari Cloudflare>
   ```

3. Pada tunnel yang sama, tab Routes, Add route, pilih Published application: hostname isi domain kamu, Service URL isi `http://proxy:8080`. Record DNS dibuat otomatis oleh Cloudflare.
4. Set `BETTER_AUTH_URL`, `WEB_URL`, dan `NEXT_PUBLIC_API_URL` ke `https://<domain-kamu>`, lalu jalankan:

   ```bash
   docker compose up -d --build        # rebuild frontend dengan URL baru
   docker compose --profile tunnel up -d
   ```

5. Verifikasi dari luar: `https://<domain-kamu>/`, `https://<domain-kamu>/api`, `https://<domain-kamu>/api/auth/ok`.

### Update dan Maintenance

```bash
git pull
docker compose up -d --build   # recreate service yang berubah
docker compose logs -f backend # log per service
```

- Backup database: backup volume `tiby-pgdata`, atau dump: `docker compose exec db pg_dump -U tiby tiby > backup.sql`.
- Hemat disk: jalankan `docker builder prune` secara berkala; image WAHA berukuran besar (sekitar 4 GB).

### Aturan

- `NODE_ENV` tetap `development` selama belum ada migration database. Mode `production` mematikan `synchronize` dan mewajibkan S3 key asli; jangan beralih sebelum migration tersedia.
- Frontend dan backend bergantung pada package `@tiby/ts-shared` yang harus di-build lebih dulu. Dockerfile sudah menanganinya; untuk build manual jalankan `bun run build:shared` sebelum `build:frontend` / `build:backend`.
- AI service menginstal dependency group `dev` secara sengaja: `providers/fish.py` mengimpor `httpx` saat runtime dan package itu berada di group `dev` pada `pyproject.toml`. Jangan tambahkan `--no-dev` pada Dockerfile ai-service.
- Satu entrypoint publik: proxy. Akses langsung ke port service hanya untuk keperluan lokal/debug.

### Troubleshooting

| Gejala | Penyebab | Tindakan |
| --- | --- | --- |
| Backend log: `Database schema mismatch` | Tabel Better Auth belum dibuat | Pastikan `auth-migrate` selesai (`docker compose logs auth-migrate`), lalu `docker compose restart backend` |
| Frontend tampil, panggilan API gagal | `NEXT_PUBLIC_API_URL` salah atau berubah setelah build | Perbaiki nilainya, lalu `docker compose build frontend` dan `docker compose up -d` |
| AI service crash: `No module named 'httpx'` | Dependency group `dev` tidak terinstal | Rebuild ai-service; Dockerfile harus memakai `uv sync --frozen` tanpa `--no-dev` |
| Webhook WAHA ditolak backend | Secret webhook tidak sama | Samakan `WAHA_WEBHOOK_SECRET` (backend) dengan `X-Waha-Secret` (service waha), lalu recreate kedua service |
| WAHA API membalas 401 | Header `X-Api-Key` tidak sesuai `WAHA_API_KEY` | Samakan API key pemanggil dengan konfigurasi service waha |

### Deployment Tanpa Docker

Jalur non-Docker tidak didokumentasikan di sini; ikuti README masing-masing service. Urutan dan environment mengikuti bagian Konfigurasi di atas, dan `@tiby/ts-shared` tetap harus di-build pertama.

| Service | Referensi |
| --- | --- |
| Frontend | [app/frontend/README.md](app/frontend/README.md) |
| Backend | [app/backend/README.md](app/backend/README.md) |
| AI Service | [app/ai-service/README.md](app/ai-service/README.md) |

WAHA standalone (di luar compose utama) tersedia di `infra/waha/docker-compose.yml`.
