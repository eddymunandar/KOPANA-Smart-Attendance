/**
 * =========================================================
 * 08_Api.gs
 * Satu-satunya fungsi yang dipanggil frontend lewat
 * google.script.run. Semua aksi lewat sini -> Router.
 *
 * PENTING: hasil di-serialize (JSON.parse/stringify) karena
 * google.script.run TIDAK BISA mengirim objek Date ke browser
 * (respons akan menjadi null). Konversi ini mengubah semua
 * Date menjadi string sehingga aman dikirim.
 * =========================================================
 */

function apiRequest(action, payload) {
  var result = Router.route(action, payload || {});
  return JSON.parse(JSON.stringify(result));
}