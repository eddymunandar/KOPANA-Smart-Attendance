/**
 * =========================================================
 * 05_ErrorHandler.gs
 * Penanganan error terpusat & konsisten untuk seluruh API.
 * =========================================================
 */

/**
 * Custom error dengan kode, agar frontend bisa membedakan
 * jenis error (mis. NOT_FOUND, UNAUTHORIZED, FORBIDDEN).
 */
function AppError(message, code) {
  this.name = 'AppError';
  this.message = message;
  this.code = code || 'ERROR';
}
AppError.prototype = Object.create(Error.prototype);
AppError.prototype.constructor = AppError;

var ErrorHandler = (function () {

  function handle(err) {
    var code = (err && err.code) ? err.code : 'ERROR';
    var message = (err && err.message) ? err.message : 'Terjadi kesalahan pada server';

    try {
      Logger.log('[ERROR] ' + code + ' - ' + message + (err && err.stack ? '\n' + err.stack : ''));
    } catch (e) { /* ignore logging failure */ }

    return {
      success: false,
      code: code,
      message: message
    };
  }

  return { handle: handle };
})();
