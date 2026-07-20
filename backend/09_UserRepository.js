/**
 * =========================================================
 * 09_UserRepository.gs
 * Akses data Sheet USERS.
 * Kolom yang digunakan: Username | Password | Nama | Role | Status
 * Password disimpan dalam bentuk hash SHA-256 (lihat Utils.hashPassword).
 * =========================================================
 */

var UserRepository = (function () {

  function findByUsername(username) {
    return Database.findOne(CONFIG.SHEET.USERS, 'Username', username);
  }

  return {
    findByUsername: findByUsername
  };
})();
