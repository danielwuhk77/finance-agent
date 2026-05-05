# Finance Agent — Claude 项目记忆

> 每次进入此仓库,Claude 必读此文件。任何与本文件冲突的指令,以本文件为准。

---

## 1. 项目定位

- **个人财务 AI Agent**,单用户:Daniel(基于香港)。
- **目标**:自动采集 Gmail 中的银行账单 / 信用卡 / 电商邮件,经 Gemini 解析后落到 Google Drive 的 Markdown 文件,供 Gemini App 和 Claude.ai 作为 Agent 上下文消费。
- **使用场景**:跨港 / 陆 / 加,多币种(HKD 为基准)。

---

## 2. 技术栈

| 层 | 技术 |
|---|---|
| 采集 / 编排 | Google Apps Script(V8 runtime,ES6+)+ clasp 本地↔云端同步 |
| 重型解析 | Cloud Function(Python + qpdf,处理加密 PDF) — 后续阶段 |
| LLM 解析 | Gemini 2.5 Pro,JSON mode |
| 存储 | Google Drive(MD)+ Google Sheets(索引 / 类目 / Run-Log) |
| 部署 | `clasp push`,GitHub private repo 为源 |

---

## 3. 关键设计决策(不可改)

1. **Single Source of Truth**:Drive 上的 MD 是唯一事实源。Sheets / Gmail label 是辅助索引。
2. **采集与解析解耦**:采集层只落原始附件到 `Inbox-Raw/`,不做内容解析。解析阶段独立运行、可重跑。
3. **去重键**:`sha256(date + amount + last4 + merchant_norm)`。同一交易在不同邮件中只算一次。
4. **MD 粒度**:按月一文件(`YYYY-MM.md`)+ 年度 summary(`YYYY-summary.md`)。
5. **类目映射**:Sheets 里逐月人工校正。代码不硬编码类目规则。
6. **币种**:落库保留原币种,MD 加 HKD 折算列。**绝不混算不同币种总数**。
7. **Gmail thread 打 `Acct/Processed` 标签即不再扫**。状态以 label 为准,不依赖本地缓存。
   (Label 前缀用 `Acct/` 而非 `Finance/`,因为 Gmail 把 `Finance` 当系统保留名,无法创建。)

---

## 4. 不要做的事

- ❌ **不爬支付宝 / 微信**(无邮件推送,走手动 CSV 导入)。
- ❌ **不在 Apps Script 里直接处理加密 PDF**,走 Cloud Function。
- ❌ **不混算不同币种总数**。
- ❌ **不硬编码密码 / API key**,用 `PropertiesService.getScriptProperties()`。
- ❌ **不超过 Apps Script 单次 6 分钟限制**,需要分批 + continuation token。
- ❌ **不写中文变量名 / 函数名**,英文标识符 + JSDoc 中文注释。
- ❌ **不写无 JSDoc 的函数**。

---

## 5. 代码风格

- Apps Script **ES6+ V8 runtime**,无 TypeScript。
- 文件名:`PascalCase.gs`(如 `Main.gs`、`Gmail.gs`)。
- 函数:`camelCase`;常量:`UPPER_SNAKE_CASE`。
- 配置集中在 `Main.gs` 的 `CONFIG` 对象,不分散到各文件。
- 关键外部调用(Gmail / Drive / Sheets / UrlFetch)必须 `try/catch`,错误进 Run-Log。
- 每个函数必须有 JSDoc(中文说明 + `@param` / `@return` 类型)。

---

## 6. 用户偏好(Daniel)

- **无寒暄,直接结论**。开头不要"好的我来帮你"之类。
- **多决策点用表格**,不要一长串 bullet。
- **Code-first**:代码 / 命令优先于解释段落。
- **简体中文 + 英文术语**:技术名词保留英文(如 `scriptId`、`OAuth scope`)。
- **单次响应 ≤ 2 屏**。超过则拆分,问一下要不要继续。

---

## 7. 阶段划分

| 阶段 | 范围 | 状态 |
|---|---|---|
| V1 脚手架 | Gmail 采集 → Drive `Inbox-Raw/` 落盘 + Run-Log | **当前** |
| V2 解析 | Gemini JSON-mode 解析单笔交易 → Sheets 索引 | 待启 |
| V3 加密 PDF | Cloud Function + qpdf | 待启 |
| V4 MD 编排 | 按月生成 `YYYY-MM.md` + 年度 summary | 待启 |
| V5 类目 / 多币种 | Sheets 校正 + HKD 折算列 | 待启 |

> **当前阶段只做 V1**。不要主动写 Gemini parser / Cloud Function / MD composer / dedupe 逻辑。
