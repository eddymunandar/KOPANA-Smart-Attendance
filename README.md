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

- **Frontend**: satu file `index.html` (HTML + CSS + JS jadi satu), di-hosting GitHub Pages. Berjalan sebagai halaman top-level sehingga **kamera HP bisa diakses** — di dalam iframe Apps Script kamera diblokir browser (iPhone & sebagian Android). Inilah alasan arsitektur ini dipakai.
- **Backend**: Google Apps Script sebagai API JSON murni (`doPost`). Kode sumbernya ada di folder `backend/`, dikelola dengan `clasp`.
- **Database**: Google Sheets, 6 sheet (struktur di bawah).
- **Login**: token session — dibuat saat login, disimpan di `sessionStorage` (browser) dan `CacheService` (server, kedaluwarsa 6 jam). Password disimpan sebagai hash SHA-256.

## Struktur Repo

```
index.html          Frontend lengkap (yang disajikan GitHub Pages)
logo.png            Logo koperasi (opsional, dipakai lewat menu Pengaturan)
backend/            Kode Apps Script (hasil clasp clone)
  ├── *.js          File kode — di Apps Script bernama .gs
  └── appsscript.json
README.md           Dokumen ini
.gitignore          Mengecualikan .clasp.json & node_modules
```

> **Catatan penamaan:** `clasp` mengunduh file Apps Script `.gs` menjadi **`.js`**
> di lokal (agar dikenali editor), dan mengunggahnya kembali sebagai `.gs`.
> Jadi `backend/Code.js` di repo = `Code.gs` di Apps Script Editor. Ini normal —
> jangan di-rename.

## Struktur File Backend (folder `backend/`)

| File | Isi |
|---|---|
| `Code.js` | `doPost` (pintu masuk API JSON), `doGet` (status), `util_generatePasswordHash` |
| `01_Config.js` | Konfigurasi: SPREADSHEET_ID, nama sheet, durasi session |
| `02_Constants.js` | Konstanta role, status, pesan |
| `03_Database.js` | Layer generik baca/tulis Google Sheets (semua akses sheet lewat sini) |
| `04_Utils.js` | ID generator, format tanggal, hash SHA-256, session (CacheService) |
| `05_ErrorHandler.js` | AppError + penanganan error terpusat |
| `06_Logger.js` | Tulis aktivitas ke sheet LOGS |
| `07_Router.js` | Dispatcher semua aksi API + cek otorisasi per aksi |
| `08_Api.js` | Sisa arsitektur lama (pintu masuk kini `doPost` di Code.js) |
| `09_UserRepository.js` | Akses sheet USERS |
| `10_AuthService.js` | Login / Logout / whoAmI |
| `11_DashboardService.js` | Statistik dashboard |
| `12_EventService.js` | Kelola Event RAT (satu event Aktif pada satu waktu) |
| `13_AttendanceService.js` | Scan QR: ekstraksi No Anggota dari QR multi-baris, validasi, simpan kehadiran |
| `appsscript.json` | Manifest. Akses web app: `ANYONE_ANONYMOUS` — wajib agar frontend eksternal bisa memanggil API |

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

- `Password`: hash SHA-256, bukan teks biasa. Buat dengan menjalankan `util_generatePasswordHash` di Apps Script Editor (ubah dulu nilai `plainPassword` di dalamnya), lalu salin hash dari Execution Log.
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

Backend (`13_AttendanceService.js` → `extractNoAnggota_`) mengekstrak nilai
setelah label `No. Anggota:`. **Status di QR diabaikan** — yang berlaku selalu
status terkini di sheet MEMBER, sehingga kartu lama tetap valid. Input manual
berupa nomor langsung juga diterima (alur validasi sama).

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

### Frontend (`index.html`)

1. Buat perubahan lewat PR (edit di GitHub / Claude Code) → review → **Merge** ke `main`.
2. GitHub Pages rebuild otomatis, live dalam 1–2 menit. Tidak ada langkah manual lain.
3. Saat mengecek hasil, tambahkan `?v=angka` di URL untuk melewati cache
   (cache GitHub Pages ±10 menit), contoh:
   `https://eddymunandar.github.io/KOPANA-Smart-Attendance/?v=12`

### Backend (`backend/*.js`) — via clasp

Prasyarat sekali saja: `npm install -g @google/clasp` lalu `clasp login`.

```bash
git pull                 # ambil perubahan hasil merge PR
cd backend
clasp push               # kirim kode ke Apps Script
clasp deploy             # buat versi deployment baru
```

Alternatif tanpa clasp: salin isi file yang berubah ke Apps Script Editor → Save →
**Deploy → Manage deployments → ikon pensil → Version: New version → Deploy.**

> Tanpa membuat **versi baru**, web app tetap menjalankan kode lama walaupun
> kodenya sudah tersimpan. Ini sumber kebingungan yang paling sering terjadi.

Pengaturan deployment yang benar: Execute as **Me**, Who has access **Anyone**.
Jika URL `/exec` berubah (membuat deployment baru, bukan versi baru), perbarui
konstanta `API_URL` di `index.html`.

## Konfigurasi Frontend

Di `index.html`, konstanta di awal blok `<script>`:

```js
var API_URL = 'https://script.google.com/macros/s/.../exec';
```

Harus menunjuk ke URL Web App Apps Script yang aktif.

## Catatan Teknis & Jebakan yang Pernah Terjadi

- **Objek Date tidak bisa dikirim langsung ke browser** lewat mekanisme Apps Script —
  respons berubah jadi `null`. Karena itu `doPost` melakukan
  `JSON.parse(JSON.stringify(result))` sebelum mengirim. Jangan dihapus.
- **Nama tab & header sheet bersifat case-sensitive** — `ATTENDANCE` bukan `ATTENDACE`,
  `Username` bukan `USERNAME`. Beda satu huruf saja membuat data "tidak ditemukan"
  atau memunculkan error `appendRow() must not be empty`.
- **Kolom No Anggota** sebaiknya diformat **Plain text** di Sheets agar nol di depan
  (mis. `001234`) tidak hilang.
- **Jangan kembalikan frontend ke `HtmlService`** — kamera akan terblokir lagi karena
  halaman disajikan di dalam iframe.
- **Scanner**: `html5-qrcode`, qrbox 80% viewfinder + resolusi ideal 1280×720.
  QR multi-baris cukup padat sehingga butuh area & resolusi memadai; dengan setelan
  kotak kecil default QR tidak terbaca. Continuous scan dengan jeda kunci 2 detik.
- **Export Excel** dibuat di sisi browser (SheetJS) lengkap dengan judul laporan;
  **Cetak** memakai `window.print()` + CSS `@media print`. SheetJS versi gratis tidak
  mendukung format tebal/besar, jadi judul tampil sebagai teks biasa.
- **Input manual No Anggota** tersedia di halaman Scan QR sebagai cadangan bila QR
  rusak/buram atau kamera bermasalah — melewati alur validasi yang sama persis.

## Kapasitas

Dirancang untuk ±250 anggota, 4 ranting, ±3 petugas melakukan scan bersamaan.
