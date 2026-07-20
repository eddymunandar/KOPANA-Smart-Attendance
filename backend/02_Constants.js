/**
 * =========================================================
 * 02_Constants.gs
 * Konstanta yang dipakai di seluruh aplikasi.
 * =========================================================
 */

var ROLES = {
  ADMIN: 'Admin',
  PETUGAS: 'Petugas'
};

var STATUS_MEMBER = {
  AKTIF: 'Aktif',
  NONAKTIF: 'Non Aktif'
};

var STATUS_USER = {
  AKTIF: 'Aktif',
  NONAKTIF: 'Non Aktif'
};

var STATUS_EVENT = {
  DRAFT: 'Draft',
  AKTIF: 'Aktif',
  TUTUP: 'Tutup'
};

var STATUS_ATTENDANCE = {
  HADIR: 'Hadir'
};

var LOG_ACTION = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  SCAN_QR: 'Scan QR',
  TAMBAH_EVENT: 'Tambah Event',
  EDIT_EVENT: 'Edit Event',
  TUTUP_EVENT: 'Tutup Event',
  SET_EVENT_AKTIF: 'Set Event Aktif',
  SIMPAN_PENGATURAN: 'Simpan Pengaturan'
};

var MESSAGES = {
  NOT_FOUND: 'Anggota tidak ditemukan',
  INACTIVE: 'Anggota tidak aktif',
  ALREADY_ATTEND: 'Anggota sudah melakukan absensi',
  NO_ACTIVE_EVENT: 'Tidak ada Event RAT yang aktif saat ini',
  SCAN_SUCCESS: 'Absensi berhasil dicatat',
  LOGIN_FAILED: 'Username atau password salah',
  LOGIN_INACTIVE: 'Akun Anda tidak aktif, hubungi Admin',
  SESSION_INVALID: 'Sesi berakhir, silakan login kembali',
  FORBIDDEN: 'Anda tidak memiliki akses untuk aksi ini',
  UNKNOWN_ACTION: 'Aksi tidak dikenal'
};

var DEFAULT_SETTINGS = {
  namaKoperasi: 'KOPANA',
  logoUrl: '',
  scannerFacingMode: 'environment',
  beepVolume: '70'
};
