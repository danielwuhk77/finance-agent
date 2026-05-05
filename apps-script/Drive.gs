/**
 * Finance Agent — Drive 路径工具
 *
 * 职责:
 *   - ensureFolderPath(segments):在 /Finance 下逐层确保子目录存在,返回最深层 Folder
 *
 * 规则:
 *   - 根 Folder 由 CONFIG.driveRootFolderId 指定
 *   - 同名子目录若有多个,取首个;新建则避免重名
 */

/**
 * 在 /Finance 根下,按 segments 逐层 ensure 目录,返回最深层 Folder。
 * 例如 ensureFolderPath(['Inbox-Raw', '2026-05', 'HSBC']) 会确保
 *   /Finance/Inbox-Raw/2026-05/HSBC/
 * 存在并返回该 Folder。
 *
 * @param {string[]} segments 路径片段,从根目录下第一层开始,不含 /Finance 本身
 * @return {GoogleAppsScript.Drive.Folder}
 * @throws 如果根目录无法访问
 */
function ensureFolderPath(segments) {
  let current;
  try {
    current = DriveApp.getFolderById(CONFIG.driveRootFolderId);
  } catch (e) {
    Logger.log('[ensureFolderPath] cannot open root %s: %s',
      CONFIG.driveRootFolderId, e && e.stack ? e.stack : e);
    throw e;
  }

  if (!segments || !segments.length) return current;

  for (const seg of segments) {
    current = ensureChildFolder_(current, seg);
  }
  return current;
}

/**
 * 在 parent 下取或建名为 name 的子目录。
 * @private
 * @param {GoogleAppsScript.Drive.Folder} parent
 * @param {string} name
 * @return {GoogleAppsScript.Drive.Folder}
 */
function ensureChildFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}
