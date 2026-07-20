/**
 * =========================================================
 * 04_Utils.gs
 * Fungsi bantu umum (ID, tanggal, session, hashing).
 * =========================================================
 */

var Utils = (function () {

  function generateId(prefix) {
    return (prefix || '') + Utilities.getUuid().substring(0, 8).toUpperCase();
  }

  function formatDateTime(date) {
    return Utilities.formatDate(new Date(date), CONFIG_TZ_(), 'dd/MM/yyyy HH:mm:ss');
  }

  function formatDateOnly(date) {
    return Utilities.formatDate(new Date(date), CONFIG_TZ_(), 'yyyy-MM-dd');
  }

  function isToday(date) {
    return formatDateOnly(date) === formatDateOnly(new Date());
  }

  function hashPassword(plainText) {
    var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, plainText);
    return digest.map(function (b) {
      var v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? '0' + v : v;
    }).join('');
  }

  // ---- Session (berbasis CacheService + token) ----

  function createSession(user) {
    var token = Utilities.getUuid();
    var cache = CacheService.getScriptCache();
    var payload = {
      username: user.Username,
      nama: user.Nama,
      role: user.Role
    };
    cache.put('session_' + token, JSON.stringify(payload), CONFIG.SESSION_DURATION_SEC);
    return token;
  }

  function getSession(token) {
    if (!token) return null;
    var cache = CacheService.getScriptCache();
    var raw = cache.get('session_' + token);
    return raw ? JSON.parse(raw) : null;
  }

  function destroySession(token) {
    if (!token) return;
    CacheService.getScriptCache().remove('session_' + token);
  }

  function requireAuth(token) {
    var user = getSession(token);
    if (!user) throw new AppError(MESSAGES.SESSION_INVALID, 'UNAUTHORIZED');
    return user;
  }

  function requireAdmin(token) {
    var user = requireAuth(token);
    if (user.role !== ROLES.ADMIN) throw new AppError(MESSAGES.FORBIDDEN, 'FORBIDDEN');
    return user;
  }

  return {
    generateId: generateId,
    formatDateTime: formatDateTime,
    formatDateOnly: formatDateOnly,
    isToday: isToday,
    hashPassword: hashPassword,
    createSession: createSession,
    getSession: getSession,
    destroySession: destroySession,
    requireAuth: requireAuth,
    requireAdmin: requireAdmin
  };
})();

function CONFIG_TZ_() {
  return Session.getScriptTimeZone() || 'Asia/Jakarta';
}
