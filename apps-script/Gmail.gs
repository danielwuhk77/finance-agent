/**
 * Finance Agent — Gmail 采集层
 *
 * 职责:
 *   - processLabel(labelName):扫某个 label 下未打 Processed 标签的 thread,
 *     抽附件落盘,完成后给 thread 打 Processed 标签
 *   - saveAttachmentsFromMessage():按 Inbox-Raw/YYYY-MM/<bank>/ 落盘单条邮件附件
 *
 * 阶段:V1 — 不解析内容,只做"邮件→附件→Drive"的搬运。
 */

/**
 * 扫指定 label,处理所有未打 Processed 的 thread。
 *
 * @param {string} labelName 扫描标签名,例如 'Finance/Bank/HSBC'
 * @return {{threadsProcessed:number, attachmentsSaved:number, errors:string[]}}
 */
function processLabel(labelName) {
  const errors = [];
  let threadsProcessed = 0;
  let attachmentsSaved = 0;

  const scanLabel = GmailApp.getUserLabelByName(labelName);
  if (!scanLabel) {
    const msg = `[processLabel] label not found: ${labelName}`;
    Logger.log(msg);
    errors.push(msg);
    return { threadsProcessed, attachmentsSaved, errors };
  }

  const processedLabel = ensureLabel_(CONFIG.processedLabel);
  if (!processedLabel) {
    const msg = `[processLabel] cannot ensure processed label: ${CONFIG.processedLabel}`;
    Logger.log(msg);
    errors.push(msg);
    return { threadsProcessed, attachmentsSaved, errors };
  }

  // 用 Gmail search 过滤掉已打 Processed 标签的 thread,避免回扫
  const query = `label:"${labelName}" -label:"${CONFIG.processedLabel}"`;
  let threads = [];
  try {
    threads = GmailApp.search(query, 0, CONFIG.threadBatchSize);
  } catch (e) {
    const msg = `[processLabel:${labelName}] search failed: ${e && e.stack ? e.stack : e}`;
    Logger.log(msg);
    errors.push(msg);
    return { threadsProcessed, attachmentsSaved, errors };
  }

  Logger.log('[processLabel:%s] found %d unprocessed threads', labelName, threads.length);

  const folderName = CONFIG.labelToFolder[labelName] || 'Misc';

  for (const thread of threads) {
    try {
      const messages = thread.getMessages();
      let savedThisThread = 0;
      for (const msg of messages) {
        savedThisThread += saveAttachmentsFromMessage(msg, folderName);
      }
      // 不论有无附件,都打 Processed 避免下次再扫
      thread.addLabel(processedLabel);
      threadsProcessed += 1;
      attachmentsSaved += savedThisThread;
    } catch (e) {
      const msg = `[processLabel:${labelName}] thread err: ${e && e.stack ? e.stack : e}`;
      Logger.log(msg);
      errors.push(msg);
    }
  }

  return { threadsProcessed, attachmentsSaved, errors };
}

/**
 * 把单条 Gmail 邮件的附件落到 Drive。
 * 路径:/Finance/Inbox-Raw/YYYY-MM/<folderName>/<原文件名>
 * 命名冲突:追加 -<timestamp> 后缀。
 *
 * @param {GoogleAppsScript.Gmail.GmailMessage} message
 * @param {string} folderName 例如 'HSBC'
 * @return {number} 实际落盘的附件数
 */
function saveAttachmentsFromMessage(message, folderName) {
  const attachments = message.getAttachments({
    includeInlineImages: false,
    includeAttachments: true
  });
  if (!attachments || !attachments.length) return 0;

  const ym = Utilities.formatDate(message.getDate(), CONFIG.timezone, 'yyyy-MM');
  const targetFolder = ensureFolderPath([
    CONFIG.inboxRawFolderName,
    ym,
    folderName
  ]);

  let saved = 0;
  for (const att of attachments) {
    const name = att.getName() || 'unnamed';
    if (!isAllowedExt_(name)) {
      Logger.log('[saveAttachments] skip non-allowed: %s', name);
      continue;
    }
    try {
      const finalName = uniqueChildName_(targetFolder, name);
      targetFolder.createFile(att.copyBlob().setName(finalName));
      saved += 1;
    } catch (e) {
      Logger.log('[saveAttachments] write failed for %s: %s',
        name, e && e.stack ? e.stack : e);
      throw e; // 让上层 thread loop 记到 errors,且不打 Processed 标签
    }
  }
  return saved;
}

/**
 * 检查文件名后缀是否在 CONFIG.allowedAttachmentExt 内。
 * @private
 * @param {string} name
 * @return {boolean}
 */
function isAllowedExt_(name) {
  const lower = String(name).toLowerCase();
  for (const ext of CONFIG.allowedAttachmentExt) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

/**
 * 在 folder 内生成不冲突的文件名:同名则追加 -YYYYMMDDHHmmss。
 * @private
 * @param {GoogleAppsScript.Drive.Folder} folder
 * @param {string} name
 * @return {string}
 */
function uniqueChildName_(folder, name) {
  const it = folder.getFilesByName(name);
  if (!it.hasNext()) return name;
  const stamp = Utilities.formatDate(new Date(), CONFIG.timezone, 'yyyyMMddHHmmss');
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return `${name}-${stamp}`;
  return `${name.substring(0, dot)}-${stamp}${name.substring(dot)}`;
}

/**
 * 取或建一个用户 label。
 * @private
 * @param {string} labelName
 * @return {GoogleAppsScript.Gmail.GmailLabel|null}
 */
function ensureLabel_(labelName) {
  let lbl = GmailApp.getUserLabelByName(labelName);
  if (lbl) return lbl;
  try {
    return GmailApp.createLabel(labelName);
  } catch (e) {
    Logger.log('[ensureLabel_] create %s failed: %s',
      labelName, e && e.stack ? e.stack : e);
    return null;
  }
}
