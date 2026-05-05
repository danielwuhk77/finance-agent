/**
 * Finance Agent — 运行日志
 *
 * 职责:
 *   - writeRunLog(entry):往 /Finance/Index/Run-Log Sheet 写一行运行记录
 *   - 首次写入时自动建表头(CONFIG.runLogHeaders)
 *
 * 表头:runId | startedAt | finishedAt | threadsProcessed | attachmentsSaved | errors | notes
 * 时间统一以 CONFIG.timezone 格式化为 ISO-like 字符串。
 */

/**
 * 把一次运行的指标写入 Run-Log Sheet 的第一个 sheet。
 *
 * @param {{
 *   runId: string,
 *   startedAt: (Date|string),
 *   finishedAt: (Date|string),
 *   threadsProcessed: number,
 *   attachmentsSaved: number,
 *   errors: (string[]|string|undefined),
 *   notes: (string|undefined)
 * }} entry
 * @return {void}
 */
function writeRunLog(entry) {
  const ss = SpreadsheetApp.openById(CONFIG.runLogSheetId);
  const sheet = ss.getSheets()[0];
  if (!sheet) {
    throw new Error(`Run-Log sheet has no tabs: ${CONFIG.runLogSheetId}`);
  }

  ensureHeader_(sheet, CONFIG.runLogHeaders);

  const errorsField = Array.isArray(entry.errors)
    ? entry.errors.join(' || ')
    : (entry.errors || '');

  const row = [
    entry.runId || '',
    formatTs_(entry.startedAt),
    formatTs_(entry.finishedAt),
    Number(entry.threadsProcessed || 0),
    Number(entry.attachmentsSaved || 0),
    truncate_(errorsField, 5000),
    entry.notes || ''
  ];

  sheet.appendRow(row);
}

/**
 * 若首行不是预期表头,则插入/重写表头。
 * @private
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string[]} headers
 * @return {void}
 */
function ensureHeader_(sheet, headers) {
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();

  if (lastRow === 0 || lastCol === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  const existing = sheet.getRange(1, 1, 1, Math.max(lastCol, headers.length))
    .getValues()[0];
  let needRewrite = false;
  for (let i = 0; i < headers.length; i++) {
    if (existing[i] !== headers[i]) { needRewrite = true; break; }
  }
  if (needRewrite) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

/**
 * 把 Date / string 统一格式化为 'yyyy-MM-dd HH:mm:ss' (HKT)。
 * @private
 * @param {(Date|string|undefined)} v
 * @return {string}
 */
function formatTs_(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return Utilities.formatDate(v, CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss');
  }
  return String(v);
}

/**
 * 字符串截断,防 Sheets 单元格爆字。
 * @private
 * @param {string} s
 * @param {number} max
 * @return {string}
 */
function truncate_(s, max) {
  const str = String(s || '');
  if (str.length <= max) return str;
  return str.substring(0, max - 3) + '...';
}
