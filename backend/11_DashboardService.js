/**
 * =========================================================
 * 11_DashboardService.gs
 * Statistik ringkas untuk halaman Dashboard.
 * =========================================================
 */

var DashboardService = (function () {

  function getStats() {
    var members = Database.getAll(CONFIG.SHEET.MEMBER);
    var jumlahAktif = members.filter(function (m) {
      return m.Status === STATUS_MEMBER.AKTIF;
    }).length;

    var activeEvent = EventService.getActiveEvent();

    var hadirHariIni = 0;
    if (activeEvent) {
      var attendance = Database.findWhere(CONFIG.SHEET.ATTENDANCE, { EventID: activeEvent.EventID });
      hadirHariIni = attendance.filter(function (a) {
        return a.JamHadir && Utils.isToday(a.JamHadir);
      }).length;
    }

    return {
      success: true,
      jumlahAnggotaAktif: jumlahAktif,
      eventAktif: activeEvent ? activeEvent.NamaEvent : null,
      eventAktifId: activeEvent ? activeEvent.EventID : null,
      jumlahHadirHariIni: hadirHariIni
    };
  }

  return { getStats: getStats };
})();
