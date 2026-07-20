/**
 * =========================================================
 * 06_Logger.gs
 * Mencatat aktivitas penting ke Sheet LOGS.
 * =========================================================
 */

var ActivityLogger = (function () {

  /**
   * @param {string} username - pelaku aktivitas
   * @param {string} action   - salah satu LOG_ACTION
   * @param {string} detail   - keterangan tambahan
   */
  function log(username, action, detail) {
    try {
      Database.insert(CONFIG.SHEET.LOGS, {
        Timestamp: new Date(),
        Username: username || '-',
        Aktivitas: action || '-',
        Detail: detail || ''
      });
    } catch (e) {
      // Kegagalan mencatat log tidak boleh menghentikan proses utama.
      Logger.log('Gagal menulis LOGS: ' + e.message);
    }
  }

  return { log: log };
})();
