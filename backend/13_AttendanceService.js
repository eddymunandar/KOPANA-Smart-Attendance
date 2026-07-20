/**
 * =========================================================
 * 13_AttendanceService.gs
 * Proses scan QR, pencatatan tamu, dan pengambilan data kehadiran.
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
 *
 * TAMU UNDANGAN dicatat lewat recordGuest() dengan:
 *   No Anggota = 'TAMU', Status = 'Tamu'
 * sehingga tidak ikut terhitung sebagai anggota hadir (kuorum).
 * =========================================================
 */

var AttendanceService = (function () {

  var STATUS_TAMU = 'Tamu';
  var KODE_TAMU = 'TAMU';

  /**
   * Mengambil No Anggota dari isi QR.
   * Mendukung 2 bentuk input:
   * 1. Teks multi-baris kartu anggota (dicari baris "No. Anggota: xxx")
   * 2. Nomor anggota langsung (input manual) -> dipakai apa adanya
   */
  function extractNoAnggota_(rawText) {
    var text = String(rawText || '').trim();
    if (!text) return '';

    var match = text.match(/no\.?\s*anggota\s*:?\s*([^\r\n]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return text.split(/[\r\n]+/)[0].trim();
  }

  /**
   * Alur scan anggota:
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
    var barisBaru = Database.insert(CONFIG.SHEET.ATTENDANCE, {
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
        row: barisBaru,
        noAnggota: member['No Anggota'],
        nama: member.Nama,
        ranting: member.Ranting,
        jamHadir: Utils.formatDateTime(jamHadir)
      }
    };
  }

  /**
   * Mencatat kehadiran TAMU UNDANGAN (bukan anggota koperasi).
   * Disimpan dengan Status 'Tamu' agar tidak terhitung dalam kuorum anggota.
   */
  function recordGuest(payload, actingUser) {
    var nama = String(payload.nama || '').trim();
    var instansi = String(payload.instansi || '').trim();

    if (!nama) {
      return { success: false, code: 'INVALID', message: 'Nama tamu wajib diisi' };
    }

    var activeEvent = EventService.getActiveEvent();
    if (!activeEvent) {
      return { success: false, code: 'NO_EVENT', message: MESSAGES.NO_ACTIVE_EVENT };
    }

    // Cegah pencatatan ganda untuk nama tamu yang sama pada event yang sama
    var guests = Database.findWhere(CONFIG.SHEET.ATTENDANCE, {
      EventID: activeEvent.EventID,
      Status: STATUS_TAMU
    });
    for (var i = 0; i < guests.length; i++) {
      if (String(guests[i].Nama).trim().toLowerCase() === nama.toLowerCase()) {
        return {
          success: false,
          code: 'ALREADY',
          message: 'Tamu dengan nama ini sudah tercatat',
          member: { nama: nama, jamHadir: guests[i].JamHadir }
        };
      }
    }

    var jamHadir = new Date();
    Database.insert(CONFIG.SHEET.ATTENDANCE, {
      EventID: activeEvent.EventID,
      'No Anggota': KODE_TAMU,
      Nama: nama,
      Ranting: instansi || '-',
      JamHadir: jamHadir,
      Status: STATUS_TAMU,
      ScannedBy: actingUser.username
    });

    ActivityLogger.log(actingUser.username, 'Catat Tamu', nama + (instansi ? ' - ' + instansi : ''));

    return {
      success: true,
      code: 'OK',
      message: 'Tamu berhasil dicatat',
      member: {
        noAnggota: KODE_TAMU,
        nama: nama,
        ranting: instansi || '-',
        jamHadir: Utils.formatDateTime(jamHadir)
      }
    };
  }

  /**
   * Mengambil data kehadiran untuk sebuah event, dengan opsi pencarian & filter ranting.
   * Mengembalikan juga rincian jumlah anggota dan tamu.
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

    var totalAnggota = 0;
    var totalTamu = 0;
    rows.forEach(function (r) {
      if (String(r.Status) === STATUS_TAMU) totalTamu++;
      else totalAnggota++;
    });

    var totalTransport = 0;
    var data = rows.map(function (r, idx) {
      var sudahTransport = String(r.Transport || '').trim().toLowerCase() === 'sudah';
      if (sudahTransport) totalTransport++;
      return {
        no: idx + 1,
        row: r.__row,
        noAnggota: r['No Anggota'],
        nama: r.Nama,
        ranting: r.Ranting,
        jamHadir: Utils.formatDateTime(r.JamHadir),
        status: r.Status,
        transport: sudahTransport ? 'Sudah' : '',
        transportJam: r.TransportJam ? Utils.formatDateTime(r.TransportJam) : '',
        transportOleh: r.TransportOleh || ''
      };
    });

    return {
      success: true,
      data: data,
      total: data.length,
      totalAnggota: totalAnggota,
      totalTamu: totalTamu,
      totalTransport: totalTransport
    };
  }

  /**
   * Menandai bahwa uang transport sudah diserahkan kepada seseorang
   * yang tercatat hadir. Menyimpan jejak audit: jam penyerahan dan
   * petugas yang menyerahkan.
   *
   * payload.row    = nomor baris di sheet ATTENDANCE (dari getAttendance)
   * payload.cancel = true untuk membatalkan (khusus Admin)
   */
  function markTransport(payload, actingUser) {
    var rowNumber = parseInt(payload.row, 10);
    if (!rowNumber) {
      return { success: false, code: 'INVALID', message: 'Data kehadiran tidak valid' };
    }

    var activeEvent = EventService.getActiveEvent();
    if (!activeEvent) {
      return { success: false, code: 'NO_EVENT', message: MESSAGES.NO_ACTIVE_EVENT };
    }

    // Baca HANYA baris yang diperlukan (jauh lebih cepat daripada getAll)
    var target = Database.getRow(CONFIG.SHEET.ATTENDANCE, rowNumber);
    if (!target) {
      return { success: false, code: 'NOT_FOUND', message: 'Data kehadiran tidak ditemukan' };
    }
    if (String(target.EventID) !== String(activeEvent.EventID)) {
      return { success: false, code: 'INVALID', message: 'Data ini bukan milik Event yang aktif' };
    }

    var sudah = String(target.Transport || '').trim().toLowerCase() === 'sudah';

    // Pembatalan hanya boleh Admin (menyangkut penyerahan uang)
    if (payload.cancel) {
      if (actingUser.role !== ROLES.ADMIN) {
        return { success: false, code: 'FORBIDDEN', message: 'Pembatalan hanya dapat dilakukan Admin' };
      }
      if (!sudah) {
        return { success: false, code: 'INVALID', message: 'Transport belum ditandai diserahkan' };
      }
      Database.updateByRow(CONFIG.SHEET.ATTENDANCE, rowNumber, {
        Transport: '',
        TransportJam: '',
        TransportOleh: ''
      });
      ActivityLogger.log(actingUser.username, 'Batal Transport', target['No Anggota'] + ' - ' + target.Nama);
      return { success: true, message: 'Penyerahan transport dibatalkan' };
    }

    if (sudah) {
      return {
        success: false,
        code: 'ALREADY',
        message: 'Transport sudah diserahkan sebelumnya',
        member: { nama: target.Nama, jamHadir: target.TransportJam }
      };
    }

    var jam = new Date();
    Database.updateByRow(CONFIG.SHEET.ATTENDANCE, rowNumber, {
      Transport: 'Sudah',
      TransportJam: jam,
      TransportOleh: actingUser.username
    });

    ActivityLogger.log(actingUser.username, 'Serah Transport', target['No Anggota'] + ' - ' + target.Nama);

    return {
      success: true,
      code: 'OK',
      message: 'Transport diserahkan',
      member: {
        noAnggota: target['No Anggota'],
        nama: target.Nama,
        ranting: target.Ranting,
        jamHadir: Utils.formatDateTime(jam)
      }
    };
  }

  return {
    scanQr: scanQr,
    recordGuest: recordGuest,
    markTransport: markTransport,
    getAttendance: getAttendance
  };
})();
