/**
 * =========================================================
 * 10_AuthService.gs
 * Login, Logout, dan validasi Session.
 * =========================================================
 */

var AuthService = (function () {

  function login(username, password) {
    if (!username || !password) {
      throw new AppError(MESSAGES.LOGIN_FAILED, 'LOGIN_FAILED');
    }

    var user = UserRepository.findByUsername(username);
    if (!user) throw new AppError(MESSAGES.LOGIN_FAILED, 'LOGIN_FAILED');

    var hashed = Utils.hashPassword(password);
    if (String(user.Password) !== hashed) {
      throw new AppError(MESSAGES.LOGIN_FAILED, 'LOGIN_FAILED');
    }

    if (user.Status && user.Status !== STATUS_USER.AKTIF) {
      throw new AppError(MESSAGES.LOGIN_INACTIVE, 'LOGIN_INACTIVE');
    }

    var token = Utils.createSession(user);
    ActivityLogger.log(user.Username, LOG_ACTION.LOGIN, 'Login berhasil sebagai ' + user.Role);

    return {
      success: true,
      token: token,
      user: {
        username: user.Username,
        nama: user.Nama,
        role: user.Role
      }
    };
  }

  function logout(token) {
    var user = Utils.getSession(token);
    Utils.destroySession(token);
    if (user) {
      ActivityLogger.log(user.username, LOG_ACTION.LOGOUT, 'Logout');
    }
    return { success: true };
  }

  function whoAmI(token) {
    var user = Utils.requireAuth(token);
    return { success: true, user: user };
  }

  return {
    login: login,
    logout: logout,
    whoAmI: whoAmI
  };
})();
