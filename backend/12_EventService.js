/**
 * =========================================================
 * 12_EventService.gs
 * Kelola Event RAT: tambah, edit, tutup, set aktif.
 * Kolom EVENT: EventID | NamaEvent | Tanggal | Status | CreatedBy | CreatedAt
 * Hanya boleh ada SATU Event berstatus "Aktif" pada satu waktu.
 * =========================================================
 */

var EventService = (function () {

  function getEvents() {
    var events = Database.getAll(CONFIG.SHEET.EVENT);
    events.sort(function (a, b) {
      return new Date(b.CreatedAt) - new Date(a.CreatedAt);
    });
    return { success: true, data: events };
  }

  function getActiveEvent() {
    return Database.findOne(CONFIG.SHEET.EVENT, 'Status', STATUS_EVENT.AKTIF);
  }

  function createEvent(payload, actingUser) {
    if (!payload.namaEvent || !payload.tanggal) {
      throw new AppError('Nama Event dan Tanggal wajib diisi');
    }
    var eventId = Utils.generateId('EVT-');
    Database.insert(CONFIG.SHEET.EVENT, {
      EventID: eventId,
      NamaEvent: payload.namaEvent,
      Tanggal: payload.tanggal,
      Status: STATUS_EVENT.DRAFT,
      CreatedBy: actingUser.username,
      CreatedAt: new Date()
    });
    ActivityLogger.log(actingUser.username, LOG_ACTION.TAMBAH_EVENT, payload.namaEvent);
    return { success: true, message: 'Event RAT berhasil ditambahkan' };
  }

  function updateEvent(payload, actingUser) {
    var event = Database.findOne(CONFIG.SHEET.EVENT, 'EventID', payload.eventId);
    if (!event) throw new AppError('Event tidak ditemukan');

    Database.updateByRow(CONFIG.SHEET.EVENT, event.__row, {
      NamaEvent: payload.namaEvent || event.NamaEvent,
      Tanggal: payload.tanggal || event.Tanggal
    });
    ActivityLogger.log(actingUser.username, LOG_ACTION.EDIT_EVENT, payload.eventId);
    return { success: true, message: 'Event RAT berhasil diperbarui' };
  }

  function closeEvent(payload, actingUser) {
    var event = Database.findOne(CONFIG.SHEET.EVENT, 'EventID', payload.eventId);
    if (!event) throw new AppError('Event tidak ditemukan');

    Database.updateByRow(CONFIG.SHEET.EVENT, event.__row, { Status: STATUS_EVENT.TUTUP });
    ActivityLogger.log(actingUser.username, LOG_ACTION.TUTUP_EVENT, payload.eventId);
    return { success: true, message: 'Event RAT ditutup' };
  }

  /**
   * Menjadikan satu Event sebagai Aktif.
   * Event lain yang sebelumnya Aktif otomatis diturunkan ke Draft
   * (tidak ke Tutup, karena Tutup berarti RAT sudah selesai permanen).
   */
  function setActiveEvent(payload, actingUser) {
    var target = Database.findOne(CONFIG.SHEET.EVENT, 'EventID', payload.eventId);
    if (!target) throw new AppError('Event tidak ditemukan');
    if (target.Status === STATUS_EVENT.TUTUP) {
      throw new AppError('Event yang sudah Tutup tidak bisa diaktifkan kembali');
    }

    var allEvents = Database.getAll(CONFIG.SHEET.EVENT);
    allEvents.forEach(function (ev) {
      if (ev.Status === STATUS_EVENT.AKTIF && ev.EventID !== target.EventID) {
        Database.updateByRow(CONFIG.SHEET.EVENT, ev.__row, { Status: STATUS_EVENT.DRAFT });
      }
    });

    Database.updateByRow(CONFIG.SHEET.EVENT, target.__row, { Status: STATUS_EVENT.AKTIF });
    ActivityLogger.log(actingUser.username, LOG_ACTION.SET_EVENT_AKTIF, target.NamaEvent);
    return { success: true, message: 'Event "' + target.NamaEvent + '" kini menjadi Event Aktif' };
  }

  return {
    getEvents: getEvents,
    getActiveEvent: getActiveEvent,
    createEvent: createEvent,
    updateEvent: updateEvent,
    closeEvent: closeEvent,
    setActiveEvent: setActiveEvent
  };
})();

