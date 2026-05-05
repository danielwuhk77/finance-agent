# Finance Agent

个人财务 AI Agent — 自动采集 Gmail 中银行账单 / 信用卡 / 电商邮件,解析后落到 Google Drive 的 Markdown,供 Gemini App 与 Claude.ai 作为上下文消费。

> 单用户(Daniel,香港),跨港 / 陆 / 加,多币种(HKD 为基准)。

---

## 当前阶段

**V1 脚手架** — 只做采集层:Gmail label → Drive `/Finance/Inbox-Raw/YYYY-MM/<bank>/` 落盘 + Run-Log。
不做解析、不做 MD 编排、不做去重。

后续阶段见 [CLAUDE.md](./CLAUDE.md) §7。

---

## 技术栈

- Google Apps Script(V8 runtime)+ clasp 同步
- Cloud Function (Python + qpdf) — V3 阶段
- Gemini 2.5 Pro JSON-mode — V2 阶段
- Google Drive + Sheets 存储

---

## 快速开始

```bash
npm install
npm run push     # 推到 Apps Script
npm run open     # 打开 Web IDE,跑一次 debugRunOnce
```

完整步骤(Drive 目录、Gmail filter、OAuth 授权、验证 checklist)见 [docs/deployment.md](./docs/deployment.md)。

---

## 仓库结构

```
finance-agent/
├── CLAUDE.md              ← Claude 项目记忆,优先读
├── apps-script/           ← clasp rootDir
│   ├── Main.gs            ← CONFIG + 主入口 + 触发器安装
│   ├── Gmail.gs           ← label 扫描 + 附件落盘
│   ├── Drive.gs           ← Drive 路径工具
│   ├── AuditLog.gs        ← Run-Log Sheet 写入
│   └── appsscript.json
├── cloud-function/        ← V3 占位
├── prompts/               ← V2 占位(Gemini prompts)
├── schemas/               ← V2 占位(JSON schema)
├── docs/
│   ├── architecture.md    ← 待填
│   ├── deployment.md      ← 部署手册
│   └── finance-handbook.md
├── samples/               ← 占位(脱敏样本)
└── tests/                 ← 占位
```
