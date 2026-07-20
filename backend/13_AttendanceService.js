/**
 * =========================================================
 * 13_AttendanceService.gs
 * Proses scan QR dan pengambilan data kehadiran.
 * Kolom ATTENDANCE: EventID | No Anggota | Nama | Ranting | JamHadir | Status | ScannedBy
 *
 * QR kartu anggota berisi teks multi-baris:
 *   No. Anggota: 17
 *   Nama: ...
 *   Ranting: ...
 *   Status: ...
 * Fungsi extractNoAnggota_ mengambil nomor anggotanya saja.
 * Status di QR DIABAIKAN - yang dipakai selalu status terkini
 * di Sheet MEMBER.
 * =========================================================
 */

var AttendanceService = (function () {

  /**
   * Mengambil No Anggota dari isi QR.
   * Mendukung 2 bentuk input:
   * 1. Teks multi-baris kartu anggota (dicari baris "No. Anggota: xxx")
   * 2. Nomor anggota langsung (input manual) -> dipakai apa adanya
   */
  function extractNoAnggota_(rawText) {
    var text = String(rawText || '').trim();
    if (!text) return '';

    // Cari pola "No. Anggota" / "No Anggota" (fleksibel terhadap titik,
    // spasi, dan huruf besar/kecil), ambil nilai setelah tanda ':'
    var match = text.match(/no\.?\s*anggota\s*:?\s*([^\r\n]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }

    // Bukan format kartu: anggap input manual berisi nomor langsung.
    // Ambil baris pertama saja untuk berjaga-jaga.
    return text.split(/[\r\n]+/)[0].trim();
  }

  /**
   * Alur:
   * QR terbaca -> Ekstrak No Anggota -> Cari MEMBER -> Cek Status Aktif
   * -> Cek Event Aktif -> Cek sudah hadir -> Simpan ATTENDANCE
   */
  function scanQr(payload, actingUser) {
    var noAnggota = extractNoAnggota_(payload.code);
    if (!noAnggota) {
      return { success: false, code: 'NOT_FOUND', message: MESSAGES.NOT_FOUND };
    }

    var member = Database.findOne(CONFIG.SHEET.MEMBER, 'No Anggota', noAnggota);
    if (!member) {
      return { success: false, code: 'NOT_FOUND', message: MESSAGES.NOT_FOUND };
    }

    if (member.Status !== STATUS_MEMBER.AKTIF) {
      return { success: false, code: 'INACTIVE', message: MESSAGES.INACTIVE, member: { nama: member.Nama } };
    }

    var activeEvent = EventService.getActiveEvent();
    if (!activeEvent) {
      return { success: false, code: 'NO_EVENT', message: MESSAGES.NO_ACTIVE_EVENT };
    }

    var already = Database.findOneWhere(CONFIG.SHEET.ATTENDANCE, {
      EventID: activeEvent.EventID,
      'No Anggota': noAnggota
    });
    if (already) {
      return {
        success: false,
        code: 'ALREADY',
        message: MESSAGES.ALREADY_ATTEND,
        member: { nama: member.Nama, jamHadir: already.JamHadir }
      };
    }

    var jamHadir = new Date();
    Database.insert(CONFIG.SHEET.ATTENDANCE, {
      EventID: activeEvent.EventID,
      'No Anggota': member['No Anggota'],
      Nama: member.Nama,
      Ranting: member.Ranting,
      JamHadir: jamHadir,
      Status: STATUS_ATTENDANCE.HADIR,
      ScannedBy: actingUser.username
    });

    ActivityLogger.log(actingUser.username, LOG_ACTION.SCAN_QR, noAnggota + ' - ' + member.Nama);

    return {
      success: true,
      code: 'OK',
      message: MESSAGES.SCAN_SUCCESS,
      member: {
        noAnggota: member['No Anggota'],
        nama: member.Nama,
        ranting: member.Ranting,
        jamHadir: Utils.formatDateTime(jamHadir)
      }
    };
  }

  /**
   * Mengambil data kehadiran untuk sebuah event, dengan opsi pencarian & filter ranting.
   */
  function getAttendance(payload) {
    var eventId = payload.eventId;
    var keyword = (payload.keyword || '').toLowerCase().trim();
    var ranting = payload.ranting || '';

    var rows = eventId
      ? Database.findWhere(CONFIG.SHEET.ATTENDANCE, { EventID: eventId })
      : Database.getAll(CONFIG.SHEET.ATTENDANCE);

    rows = rows.filter(function (r) {
      var matchKeyword = !keyword ||
        String(r['No Anggota']).toLowerCase().indexOf(keyword) !== -1 ||
        String(r.Nama).toLowerCase().indexOf(keyword) !== -1;
      var matchRanting = !ranting || String(r.Ranting) === ranting;
      return matchKeyword && matchRanting;
    });

    rows.sort(function (a, b) {
      return new Date(b.JamHadir) - new Date(a.JamHadir);
    });

    var data = rows.map(function (r, idx) {
      return {
        no: idx + 1,
        noAnggota: r['No Anggota'],
        nama: r.Nama,
        ranting: r.Ranting,
        jamHadir: Utils.formatDateTime(r.JamHadir),
        status: r.Status
      };
    });

    return { success: true, data: data, total: data.length };
  }

  return {
    scanQr: scanQr,
    getAttendance: getAttendance
  };
})();