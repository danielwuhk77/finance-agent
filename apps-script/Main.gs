/**
 * Finance Agent — 主入口与全局配置
 *
 * 职责:
 *   - 集中管理 CONFIG(Drive 根目录、Run-Log Sheet、扫描 label、时区等)
 *   - runDailyIngestion():每日 07:00 HKT 触发的采集主流程
 *   - installTriggers():安装时间触发器
 *   - debugRunOnce():手动单次调试入口
 *
 * 阶段:V1 脚手架 — 只采集,不解析。
 */

/**
 * 全局配置对象。
 * 其它 .gs 文件统一通过 CONFIG.* 读取,不要在别处写常量。
 */
const CONFIG = {
  /** Drive 上 /Finance 根目录的 folder ID */
  driveRootFolderId: '14NS1MTbZLClPJ6syQZYhrxIhflVYayn5',

  /** /Finance/Index/Run-Log Sheet 的 sheet ID */
  runLogSheetId: '1XuMt1Kw5Aze0YPM8eFE4r8bRvumB4odpgznIrXVQiXY',

  /** Gmail 上"已处理"标签;打上即不再扫 */
  processedLabel: 'Finance/Processed',

  /** 待扫描的 Gmail label 列表(顺序无关) */
  scanLabels: [
    'Finance/Bank/HSBC',
    'Finance/Bank/HangSeng',
    'Finance/Bank/BOCHK',
    'Finance/Bank/Citibank',
    'Finance/CreditCard/HSBC-CC',
    'Finance/CreditCard/Citibank-CC'
  ],

  /**
   * Gmail label → Drive 子目录名的映射。
   * 落盘路径为 /Finance/Inbox-Raw/YYYY-MM/<folderName>/
   */
  labelToFolder: {
    'Finance/Bank/HSBC': 'HSBC',
    'Finance/Bank/HangSeng': 'HangSeng',
    'Finance/Bank/BOCHK': 'BOCHK',
    'Finance/Bank/Citibank': 'Citibank',
    'Finance/CreditCard/HSBC-CC': 'HSBC-CC',
    'Finance/CreditCard/Citibank-CC': 'Citibank-CC'
  },

  /** 接受的附件后缀(小写,带点) */
  allowedAttachmentExt: ['.pdf', '.csv', '.xlsx', '.html'],

  /** Inbox-Raw 一级目录名 */
  inboxRawFolderName: 'Inbox-Raw',

  /** 时区 */
  timezone: 'Asia/Hong_Kong',

  /** 每次 thread 处理上限(防 6 分钟超时) */
  threadBatchSize: 50,

  /** Run-Log Sheet 的表头 */
  runLogHeaders: [
    'runId',
    'startedAt',
    'finishedAt',
    'threadsProcessed',
    'attachmentsSaved',
    'errors',
    'notes'
  ]
};

/**
 * 每日采集主入口。由 7:00 HKT 触发器调用,亦可手动跑。
 *
 * 流程:
 *   1. 生成 runId
 *   2. 遍历 CONFIG.scanLabels,逐 label 调 processLabel()
 *   3. 汇总指标,写 Run-Log
 *
 * @return {void}
 */
function runDailyIngestion() {
  const runId = Utilities.formatDate(new Date(), CONFIG.timezone, 'yyyyMMdd-HHmmss');
  const startedAt = new Date();
  let threadsProcessed = 0;
  let attachmentsSaved = 0;
  const errors = [];

  Logger.log('[runDailyIngestion] start runId=%s', runId);

  for (const label of CONFIG.scanLabels) {
    try {
      const result = processLabel(label);
      threadsProcessed += result.threadsProcessed;
      attachmentsSaved += result.attachmentsSaved;
      if (result.errors && result.errors.length) {
        errors.push.apply(errors, result.errors);
      }
    } catch (e) {
      const msg = `[label=${label}] ${e && e.stack ? e.stack : e}`;
      Logger.log('ERROR ' + msg);
      errors.push(msg);
    }
  }

  const finishedAt = new Date();
  try {
    writeRunLog({
      runId: runId,
      startedAt: startedAt,
      finishedAt: finishedAt,
      threadsProcessed: threadsProcessed,
      attachmentsSaved: attachmentsSaved,
      errors: errors,
      notes: ''
    });
  } catch (e) {
    Logger.log('FATAL writeRunLog failed: %s', e && e.stack ? e.stack : e);
  }

  Logger.log(
    '[runDailyIngestion] done runId=%s threads=%d attachments=%d errors=%d',
    runId, threadsProcessed, attachmentsSaved, errors.length
  );
}

/**
 * 安装/重装每日触发器(07:00 HKT)。
 * 会先清理同名函数的旧触发器,避免重复。
 *
 * @return {void}
 */
function installTriggers() {
  const targetFn = 'runDailyIngestion';
  const existing = ScriptApp.getProjectTriggers();
  for (const t of existing) {
    if (t.getHandlerFunction() === targetFn) {
      ScriptApp.deleteTrigger(t);
    }
  }

  ScriptApp.newTrigger(targetFn)
    .timeBased()
    .atHour(7)
    .everyDays(1)
    .inTimezone(CONFIG.timezone)
    .create();

  Logger.log('[installTriggers] installed daily trigger 07:00 %s for %s',
    CONFIG.timezone, targetFn);
}

/**
 * 调试入口:在 IDE 里点击运行,执行一次完整采集。
 * 与 runDailyIngestion 等价,只是命名上区分用途。
 *
 * @return {void}
 */
function debugRunOnce() {
  runDailyIngestion();
}
