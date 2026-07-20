/**
 * =========================================================
 * Code.gs (versi API untuk frontend GitHub Pages)
 * doPost = pintu masuk API JSON dari frontend eksternal.
 * doGet  = halaman info sederhana (aplikasi lama via iframe
 *          sudah tidak dipakai).
 * =========================================================
 */

function doPost(e) {
  var result;
  try {
    var body = JSON.parse(e.postData.contents);
    result = Router.route(body.action, body.payload || {});
    // Serialize agar objek Date aman dikirim sebagai JSON
    result = JSON.parse(JSON.stringify(result));
  } catch (err) {
    result = { success: false, code: 'BAD_REQUEST', message: 'Request tidak valid' };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    app: CONFIG.APP_NAME,
    version: CONFIG.APP_VERSION,
    status: 'API aktif. Gunakan aplikasi melalui halaman GitHub Pages.'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * UTILITY SETUP - jalankan manual dari Editor Apps Script (klik Run)
 * untuk membuat hash password saat mengisi Sheet USERS.
 * Ubah 'password123' sesuai kebutuhan, lalu lihat hasilnya di
 * Execution Log. Berguna juga saat menambah user Petugas baru.
 */
function util_generatePasswordHash() {
  var plainPassword = 'password123';
  Logger.log('Hash untuk "' + plainPassword + '": ' + Utils.hashPassword(plainPassword));
}