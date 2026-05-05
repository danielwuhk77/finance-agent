# Finance Agent — 部署手册

> 适用阶段:**V1 脚手架**(Gmail → Drive `Inbox-Raw/` 落盘 + Run-Log)。

---

## 1. 前置准备

| 项 | 要求 | 验证命令 |
|---|---|---|
| Node | ≥ 18 | `node -v` |
| clasp | ≥ 2.4 | `npx clasp --version` |
| Apps Script API | 启用 | https://script.google.com/home/usersettings |
| Google 账号 | 与 Drive / Gmail / Sheets 同账号登录 | — |
| GitHub repo | 已创建 private 仓库 | — |

> Apps Script API 必须在 https://script.google.com/home/usersettings 手动打开 "Google Apps Script API",否则 `clasp push` 会 401。

---

## 2. 一次性配置(本地)

```bash
# 1. 全局装 clasp(也可以走 npx)
npm i -g @google/clasp

# 2. 登录 Google 账号(浏览器授权)
clasp login

# 3. 进项目目录,装 devDependency
cd "/Users/<you>/.../finance-agent"
npm install
```

`.clasp.json` 已包含 `scriptId` 和 `rootDir: apps-script`,无需手动改。

---

## 3. Drive 目录结构(手动建一次)

在 `/Finance` 根目录(folder ID 已在 `CONFIG.driveRootFolderId`)下建立:

```
/Finance/
├── Inbox-Raw/           ← 代码会自动按 YYYY-MM/<bank>/ 落盘,但根目录需手建
├── Index/
│   └── Run-Log          ← Sheet,ID 已在 CONFIG.runLogSheetId
├── Statements/          ← 占位,V4 阶段使用
└── Receipts/            ← 占位
```

> `Inbox-Raw/` 下的月度子目录由 `ensureFolderPath()` 自动创建,不要手动预建。

---

## 4. Gmail Label + Filter 配置

### 4.1 必建 label(Gmail 设置 → Labels)

> **重要**:Gmail 把 `Finance` 当系统保留 label(对应自动分类的 "财务" tab),不能新建。前缀用 `Acct/`(account)。

| Label | 用途 |
|---|---|
| `Acct/Bank/HSBC` | HSBC 账单类邮件 |
| `Acct/Bank/HangSeng` | 恒生账单 |
| `Acct/Bank/BOCHK` | 中银香港 |
| `Acct/Bank/Citibank` | 花旗个人账户 |
| `Acct/Bank/ICBC-Asia` | 工银亚洲 |
| `Acct/CreditCard/HSBC-CC` | HSBC 信用卡 |
| `Acct/CreditCard/Citibank-CC` | Citi 信用卡 |
| `Acct/Processed` | **代码自动打**,不要手动加 |

### 4.2 Filter 示例(Gmail 设置 → Filters)

| 来源 | From / Subject 关键词 | Apply Label |
|---|---|---|
| HSBC | `from:(@hsbc.com.hk) subject:(statement OR e-Statement)` | `Acct/Bank/HSBC` |
| HangSeng | `from:(@hangseng.com)` | `Acct/Bank/HangSeng` |
| BOCHK | `from:(@bochk.com)` | `Acct/Bank/BOCHK` |
| Citi | `from:(@citibank.com.hk)` | `Acct/Bank/Citibank` |
| ICBC-Asia | `from:(@icbcasia.com OR @icbc.com.hk)` | `Acct/Bank/ICBC-Asia` |
| HSBC-CC | `from:(@hsbc.com.hk) subject:(credit card)` | `Acct/CreditCard/HSBC-CC` |
| Citi-CC | `from:(@citibank.com.hk) subject:(credit card)` | `Acct/CreditCard/Citibank-CC` |

> 关键词以实际收到的银行邮件为准,部署后看 Run-Log 命中数微调。

---

## 5. 部署步骤

```bash
# 推代码到 Apps Script(只推 apps-script/ 下的文件)
npm run push

# 打开 Apps Script Web IDE 检查
npm run open
```

首次 `clasp push` 后,在 Web IDE 里:

1. 选函数 `installTriggers` → ▶︎ Run → 浏览器弹窗授权(见 §6)。
2. 选函数 `debugRunOnce` → ▶︎ Run → 跑一次完整采集做烟测。
3. 看 `View → Executions` 确认无红色 ERROR;打开 Run-Log Sheet 看到一行新记录即成功。

---

## 6. 首次授权 OAuth scope

授权弹窗会列出以下 scope,**全部允许**:

| scope | 用途 |
|---|---|
| `gmail.modify` | 读邮件 + 打 Processed label |
| `drive` | 在 /Finance 下建子目录、写附件 |
| `spreadsheets` | 写 Run-Log |
| `script.scriptapp` | 安装时间触发器 |
| `script.external_request` | 预留(V2 调 Gemini 用) |

> 第一次会提示 "This app isn't verified"(因为是个人脚本),点 **Advanced → Go to <project>** 继续即可。

---

## 7. 验证 Checklist

- [ ] `npm run push` 无错误,Web IDE 看到 4 个 .gs 文件 + appsscript.json
- [ ] `installTriggers` 跑完后,Web IDE 的 **Triggers** 页有一条 `runDailyIngestion` 每日 07:00 HKT
- [ ] `debugRunOnce` 跑完无红错
- [ ] `/Finance/Inbox-Raw/YYYY-MM/<bank>/` 下出现附件文件(若该 label 下有未处理邮件)
- [ ] 被处理过的 Gmail thread 上多了一个 `Acct/Processed` 标签
- [ ] Run-Log Sheet 第一行是表头,第二行起是运行记录

---

## 8. 故障排查

| 现象 | 可能原因 | 处理 |
|---|---|---|
| `clasp push` 报 401 | Apps Script API 未开 | 去 https://script.google.com/home/usersettings 打开 |
| `clasp push` 报 scriptId 不匹配 | `.clasp.json` 写错 | 核对 Apps Script Web IDE URL 中 `/projects/<id>/edit` |
| 授权后仍报 `Gmail not enabled` | 用了不同 Google 账号 | `clasp logout` → `clasp login` 用正确账号 |
| Run-Log 没新行 | `runLogSheetId` 错 / Sheet 没共享给执行账号 | 核对 ID;同账号则无需共享 |
| Drive 下没附件 | 当 label 下所有 thread 都已打 `Processed` | 拿掉 Processed 标签后重跑;或本期就是没新邮件 |
| 单次运行超 6 分钟超时 | 单 label 邮件过多 | 把 `CONFIG.threadBatchSize` 调小,或拆多次跑 |
| 附件类型被跳过 | 后缀不在 `allowedAttachmentExt` | 在 `CONFIG.allowedAttachmentExt` 里加,或先转格式 |

---

## 9. 后续阶段(预告,本次不做)

- **V2**:`Inbox-Raw/` → Gemini JSON-mode 解析单笔交易 → 写 Sheets 索引
- **V3**:加密 PDF 走 Cloud Function (Python + qpdf)
- **V4**:按月生成 `YYYY-MM.md` + 年度 `YYYY-summary.md`
- **V5**:Sheets 类目人工校正 + HKD 折算列
