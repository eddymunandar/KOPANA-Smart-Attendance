/**
 * =========================================================
 * 03_Database.gs
 * Layer generik untuk baca/tulis Google Sheets.
 * Semua service WAJIB mengakses Sheet lewat file ini.
 * =========================================================
 */

var Database = (function () {

  function getSheet(sheetName) {
    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new AppError('Sheet "' + sheetName + '" tidak ditemukan. Periksa nama sheet.');
    }
    return sheet;
  }

  function getHeaders(sheet) {
    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) return [];
    return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  /**
   * Mengubah seluruh isi sheet menjadi array of object.
   * Setiap object mendapat properti tambahan __row (nomor baris asli di sheet).
   */
  function getAll(sheetName) {
    var sheet = getSheet(sheetName);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol === 0) return [];

    var headers = getHeaders(sheet);
    var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var result = [];

    for (var i = 0; i < values.length; i++) {
      var obj = { __row: i + 2 };
      var isEmptyRow = true;
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        if (!key) continue;
        obj[key] = values[i][j];
        if (values[i][j] !== '' && values[i][j] !== null) isEmptyRow = false;
      }
      if (!isEmptyRow) result.push(obj);
    }
    return result;
  }

  /**
   * Mencari satu baris berdasarkan satu kolom = value.
   */
  function findOne(sheetName, column, value) {
    var rows = getAll(sheetName);
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][column]).trim().toLowerCase() === String(value).trim().toLowerCase()) {
        return rows[i];
      }
    }
    return null;
  }

  /**
   * Mencari satu baris berdasarkan beberapa kondisi kolom (AND).
   * conditions = { KolomA: valueA, KolomB: valueB }
   */
  function findOneWhere(sheetName, conditions) {
    var rows = getAll(sheetName);
    for (var i = 0; i < rows.length; i++) {
      var match = true;
      for (var key in conditions) {
        if (String(rows[i][key]).trim().toLowerCase() !== String(conditions[key]).trim().toLowerCase()) {
          match = false;
          break;
        }
      }
      if (match) return rows[i];
    }
    return null;
  }

  /**
   * Mencari banyak baris berdasarkan beberapa kondisi kolom (AND).
   */
  function findWhere(sheetName, conditions) {
    var rows = getAll(sheetName);
    return rows.filter(function (row) {
      for (var key in conditions) {
        if (String(row[key]).trim().toLowerCase() !== String(conditions[key]).trim().toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Menambah baris baru. rowObject = { NamaKolom: value, ... }
   * Kolom yang tidak diisi akan dikosongkan.
   */
  function insert(sheetName, rowObject) {
    var sheet = getSheet(sheetName);
    var headers = getHeaders(sheet);
    var rowValues = headers.map(function (h) {
      return (h in rowObject) ? rowObject[h] : '';
    });
    sheet.appendRow(rowValues);
    return sheet.getLastRow();
  }

  /**
   * Update baris berdasarkan nomor baris (__row) dengan data parsial.
   */
  function updateByRow(sheetName, rowNumber, updates) {
    var sheet = getSheet(sheetName);
    var headers = getHeaders(sheet);
    headers.forEach(function (h, idx) {
      if (h in updates) {
        sheet.getRange(rowNumber, idx + 1).setValue(updates[h]);
      }
    });
  }

  /**
   * Mengambil pengaturan (SETTINGS sheet berformat Key | Value).
   */
  function getSettings() {
    var rows = getAll(CONFIG.SHEET.SETTINGS);
    var settings = {};
    for (var key in DEFAULT_SETTINGS) settings[key] = DEFAULT_SETTINGS[key];
    rows.forEach(function (row) {
      if (row.Key) settings[row.Key] = row.Value;
    });
    return settings;
  }

  /**
   * Menyimpan pengaturan. settingsObject = { key: value, ... }
   * Menimpa baris yang sudah ada, menambah baris baru jika key belum ada.
   */
  function saveSettings(settingsObject) {
    var sheet = getSheet(CONFIG.SHEET.SETTINGS);
    var rows = getAll(CONFIG.SHEET.SETTINGS);

    for (var key in settingsObject) {
      var existing = null;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].Key === key) { existing = rows[i]; break; }
      }
      if (existing) {
        updateByRow(CONFIG.SHEET.SETTINGS, existing.__row, { Key: key, Value: settingsObject[key] });
      } else {
        insert(CONFIG.SHEET.SETTINGS, { Key: key, Value: settingsObject[key] });
      }
    }
    return getSettings();
  }

  return {
    getSheet: getSheet,
    getHeaders: getHeaders,
    getAll: getAll,
    findOne: findOne,
    findOneWhere: findOneWhere,
    findWhere: findWhere,
    insert: insert,
    updateByRow: updateByRow,
    getSettings: getSettings,
    saveSettings: saveSettings
  };
})();
