/**
 * =========================================================
 * 07_Router.gs
 * Satu pintu masuk untuk semua request dari frontend.
 * Arsitektur: Frontend -> AppJs -> Api -> Router -> Service -> Sheets
 * =========================================================
 */

var Router = (function () {

  function route(action, payload) {
    try {
      switch (action) {

        // ---- Auth ----
        case 'login':
          return AuthService.login(payload.username, payload.password);
        case 'logout':
          return AuthService.logout(payload.token);
        case 'whoAmI':
          return AuthService.whoAmI(payload.token);

        // ---- Dashboard ----
        case 'getDashboard':
          Utils.requireAuth(payload.token);
          return DashboardService.getStats();

        // ---- Event RAT ----
        case 'getEvents': {
          Utils.requireAuth(payload.token);
          return EventService.getEvents();
        }
        case 'createEvent': {
          var u1 = Utils.requireAdmin(payload.token);
          return EventService.createEvent(payload, u1);
        }
        case 'updateEvent': {
          var u2 = Utils.requireAdmin(payload.token);
          return EventService.updateEvent(payload, u2);
        }
        case 'closeEvent': {
          var u3 = Utils.requireAdmin(payload.token);
          return EventService.closeEvent(payload, u3);
        }
        case 'setActiveEvent': {
          var u4 = Utils.requireAdmin(payload.token);
          return EventService.setActiveEvent(payload, u4);
        }

        // ---- Scan QR / Attendance ----
        case 'scanQr': {
          var u5 = Utils.requireAuth(payload.token);
          return AttendanceService.scanQr(payload, u5);
        }
        case 'getAttendance':
          Utils.requireAuth(payload.token);
          return AttendanceService.getAttendance(payload);

        // ---- Settings ----
        case 'getSettings':
          Utils.requireAuth(payload.token);
          return { success: true, data: Database.getSettings() };
        case 'saveSettings': {
          var u6 = Utils.requireAdmin(payload.token);
          var saved = Database.saveSettings(payload.settings || {});
          ActivityLogger.log(u6.username, LOG_ACTION.SIMPAN_PENGATURAN, 'Update pengaturan');
          return { success: true, data: saved, message: 'Pengaturan disimpan' };
        }

        // ---- Ranting list (untuk dropdown filter) ----
        case 'getRantingList': {
          Utils.requireAuth(payload.token);
          var members = Database.getAll(CONFIG.SHEET.MEMBER);
          var rantingSet = {};
          members.forEach(function (m) { if (m.Ranting) rantingSet[m.Ranting] = true; });
          return { success: true, data: Object.keys(rantingSet).sort() };
        }

        default:
          throw new AppError(MESSAGES.UNKNOWN_ACTION, 'UNKNOWN_ACTION');
      }
    } catch (err) {
      return ErrorHandler.handle(err);
    }
  }

  return { route: route };
})();