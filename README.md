# KOPANA Smart Attendance RAT

Aplikasi absensi QR Code untuk **Rapat Anggota Tahunan (RAT) KOPANA**.
Khusus untuk absensi RAT — bukan aplikasi koperasi umum.

**Aplikasi live:** https://eddymunandar.github.io/KOPANA-Smart-Attendance/

## Arsitektur

```
Frontend (GitHub Pages, index.html)
   ↓ fetch() POST JSON
Apps Script Web App (doPost → Router → Service)
   ↓
Google Sheets (database)
```

- **Frontend**: satu file `index.html` (HTML + CSS + JS jadi satu), di-hosting GitHub Pages. Berjalan sebagai halaman top-level sehingga **kamera HP bisa diakses** (di dalam iframe Apps Script, kamera diblokir browser — inilah alasan arsitektur ini dipakai).
- **Backend**: Google Apps Script sebagai API JSON murni. File sumbernya diarsipkan di folder `backend/`.
- **Database**: Google Sheets dengan 6 sheet (lihat struktur di bawah).
- **Login**: token session — dibuat saat login, disimpan di `sessionStorage` (browser) dan `CacheService` (server, kedaluwarsa 6 jam). Password disimpan sebagai hash SHA-256.

## Struktur Repo

```
index.html      Frontend lengkap (yang disajikan GitHub Pages)
logo.png        Logo koperasi (opsional, dipakai lewat menu Pengaturan)
backend/        Arsip file Apps Script (.gs) — sumber kebenaran kode backend
README.md       Dokumen ini
```

> **Penting:** Apps Script TIDAK membaca folder `backend/` secara otomatis.
> Perubahan pada file `.gs` harus disalin manual ke Apps Script Editor,
> lalu **Deploy → Manage deployments → edit → New version → Deploy**.
> Perubahan `index.html` otomatis live 1–2 menit setelah merge ke `main`
> (GitHub Pages rebuild otomatis; gunakan `?v=angka` untuk melewati cache
> saat mengecek hasil).

## Struktur File Backend (folder `backend/`)

| File | Isi |
|---|---|
| `Code.gs` | `doPost` (pintu masuk API JSON), `doGet` (status), `util_generatePasswordHash` |
| `01_Config.gs` | Konfigurasi: SPREADSHEET_ID, nama sheet, durasi session |
| `02_Constants.gs` | Konstanta role, status, pesan |
| `03_Database.gs` | Layer generik baca/tulis Google Sheets (semua akses sheet lewat sini) |
| `04_Utils.gs` | ID generator, format tanggal, hash SHA-256, session (CacheService) |
| `05_ErrorHandler.gs` | AppError + penanganan error terpusat |
| `06_Logger.gs` | Tulis aktivitas ke sheet LOGS |
| `07_Router.gs` | Dispatcher semua aksi API + cek otorisasi per aksi |
| `08_Api.gs` | (tidak dipakai lagi di arsitektur API — pintu masuk kini `doPost` di Code.gs) |
| `09_UserRepository.gs` | Akses sheet USERS |
| `10_AuthService.gs` | Login / Logout / whoAmI |
| `11_DashboardService.gs` | Statistik dashboard |
| `12_EventService.gs` | Kelola Event RAT (satu event Aktif pada satu waktu) |
| `13_AttendanceService.gs` | Scan QR: ekstraksi No Anggota dari QR multi-baris, validasi, simpan kehadiran |
| `appsscript.json` | Manifest (akses web app: ANYONE_ANONYMOUS — wajib agar frontend eksternal bisa memanggil API) |

## Struktur Google Sheets (nama tab & header WAJIB persis)

**MEMBER** — data anggota (hanya dibaca aplikasi; tidak ada CRUD anggota)
| No Anggota | Nama | Alamat | Telepon | Ranting | Status |
|---|---|---|---|---|---|

Nilai `Status`: `Aktif` atau `Non Aktif` (persis, huruf besar hanya di awal kata).
Hanya anggota `Aktif` yang bisa absen.

**EVENT** — diisi lewat aplikasi
| EventID | NamaEvent | Tanggal | Status | CreatedBy | CreatedAt |
|---|---|---|---|---|---|

Status event: `Draft` / `Aktif` / `Tutup`. Hanya satu event `Aktif` pada satu waktu.

**ATTENDANCE** — diisi otomatis saat scan
| EventID | No Anggota | Nama | Ranting | JamHadir | Status | ScannedBy |
|---|---|---|---|---|---|---|

**USERS** — akun login
| Username | Password | Nama | Role | Status |
|---|---|---|---|---|

- `Password`: hash SHA-256 (bukan teks biasa) — buat dengan menjalankan `util_generatePasswordHash` di Apps Script Editor.
- `Role`: `Admin` atau `Petugas`. `Status`: `Aktif` atau `Non Aktif`.

**SETTINGS** — key-value, dikelola lewat menu Pengaturan
| Key | Value |
|---|---|

Key yang dipakai: `namaKoperasi`, `logoUrl`, `scannerFacingMode`, `beepVolume`.

**LOGS** — diisi otomatis (login, logout, scan, kelola event, simpan pengaturan)
| Timestamp | Username | Aktivitas | Detail |
|---|---|---|---|

## Format QR Code Kartu Anggota

QR berisi teks multi-baris:

```
No. Anggota: 17
Nama: ...
Ranting: ...
Status: ...
```

Backend (`13_AttendanceService.gs` → `extractNoAnggota_`) mengekstrak nilai
setelah label `No. Anggota:`. **Status di QR diabaikan** — yang berlaku selalu
status terkini di sheet MEMBER. Input manual berupa nomor langsung juga diterima
(alur validasi sama).

## Alur Scan

```
QR terbaca / input manual
→ Ekstrak No Anggota
→ Cari di MEMBER          (gagal: "Anggota tidak ditemukan")
→ Cek Status Aktif        (gagal: "Anggota tidak aktif")
→ Cek Event Aktif         (gagal: "Tidak ada Event RAT yang aktif")
→ Cek sudah hadir         (gagal: "Anggota sudah melakukan absensi")
→ Simpan ATTENDANCE → Beep → Notifikasi berhasil → siap scan berikutnya
```

## Cara Update

**Frontend (`index.html`):**
1. Buat perubahan lewat PR (edit di GitHub / Claude Code) → review → **Merge**.
2. GitHub Pages rebuild otomatis (1–2 menit). Cek dengan `?v=angka` di URL untuk melewati cache (cache Pages ±10 menit).

**Backend (`backend/*.gs`):**
1. Merge perubahan di repo (arsip).
2. Salin isi file yang berubah ke Apps Script Editor → Save.
3. **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy.**
   (Tanpa "New version", web app tetap menjalankan kode lama.)
4. Pengaturan deployment: Execute as **Me**, Who has access **Anyone**.
5. Jika URL `/exec` berubah (deployment baru, bukan versi baru), perbarui konstanta `API_URL` di `index.html`.

## Konfigurasi Frontend

Di `index.html`, konstanta di awal blok `<script>`:

```js
var API_URL = 'https://script.google.com/macros/s/.../exec';
```

Harus menunjuk ke URL Web App Apps Script yang aktif.

## Catatan Teknis & Jebakan yang Pernah Terjadi

- **`google.script.run` tidak bisa mengirim objek Date** → semua respons di-serialize `JSON.parse(JSON.stringify(...))` di `doPost` sebelum dikirim. Jangan dihapus.
- **Nama tab & header sheet case-sensitive** — `ATTENDANCE` bukan `ATTENDACE`, `Username` bukan `USERNAME`. Salah satu huruf pun membuat data "tidak ditemukan".
- **Kolom No Anggota di sheet** sebaiknya berformat **Plain text** agar nol di depan tidak hilang.
- **Kamera di iframe Apps Script diblokir** (iPhone & sebagian Android) — itulah alasan frontend dipindah ke GitHub Pages. Jangan kembali menyajikan frontend lewat `HtmlService`.
- **Scanner**: pakai `html5-qrcode`, qrbox 80% viewfinder + resolusi ideal 1280×720 (QR multi-baris butuh resolusi cukup). Continuous scan dengan jeda kunci 2 detik antar-scan.
- **Export Excel** dibuat di browser (SheetJS) dengan judul laporan; **Cetak** memakai `window.print()` + CSS `@media print`.

## Kapasitas

Dirancang untuk ±250 anggota, 4 ranting, ±3 petugas scan bersamaan.
