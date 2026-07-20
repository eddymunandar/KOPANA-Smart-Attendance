/**
 * =========================================================
 * KOPANA SMART ATTENDANCE RAT v1.0
 * 01_Config.gs
 * Konfigurasi utama aplikasi.
 * =========================================================
 */

var CONFIG = {
  // Isi dengan ID Spreadsheet database jika script TIDAK terikat (standalone).
  // Jika script terikat langsung ke Spreadsheet (Container-bound), boleh dikosongkan ('').
  SPREADSHEET_ID: '',

  APP_NAME: 'KOPANA Smart Attendance RAT',
  APP_VERSION: '1.0',

  // Durasi sesi login (detik). Maksimal CacheService = 21600 detik (6 jam).
  SESSION_DURATION_SEC: 21600,

  // Nama sheet database. JANGAN DIUBAH.
  SHEET: {
    MEMBER: 'MEMBER',
    EVENT: 'EVENT',
    ATTENDANCE: 'ATTENDANCE',
    USERS: 'USERS',
    SETTINGS: 'SETTINGS',
    LOGS: 'LOGS'
  }
};

/**
 * Mengambil object Spreadsheet aktif sesuai konfigurasi.
 */
function getSpreadsheet_() {
  if (CONFIG.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new AppError('SPREADSHEET_ID belum diatur di 01_Config.gs');
  }
  return active;
}
