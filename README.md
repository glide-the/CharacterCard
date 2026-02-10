<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 人格编年史 (Chronicle of Personas)

<p>
  <img src="https://img.shields.io/badge/React-19.2-blue?style=flat-square&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite" alt="Vite"/>
  <img src="https://img.shields.io/badge/Zustand-5.0-orange?style=flat-square" alt="Zustand"/>
  <img src="https://img.shields.io/badge/AI-Gemini%20%7C%20OpenAI-green?style=flat-square" alt="AI"/>
</p>

**一个由 AI 驱动的动态叙事卡牌游戏，规则根据你的选择不断改写。**

*"选择你的面具。这个世界的规则并非刻在石头上，而是由鲜血和抉择书写。"*

[在线演示](https://ai.studio/apps/drive/1mxxjF-3EzOO4s8wJEt0e51PyZOcoV9fn) | [AI Studio](https://ai.studio) | [部署文档](DEPLOYMENT.md)

</div>

---

## 📋 版本说明

### v2.0.0 — 4-Task 串并联架构（2026-02-10）

> 将 AI 回合处理从单体模式重构为「叙事优先 → 三翼并行」的 4-Task 调度架构。

**架构变更**
- **Phase A**：Task 3（纯叙事生成）最先执行，支持 streaming 逐字渲染
- **Phase B**：叙事完成后并行触发 Task 1（现实映射）+ Task 2（世界法则）+ Task 4（选项生成）
- 新增 `turnOrchestrator.ts` 串并联调度层，使用 `Promise.allSettled` 并行容错

**新增模块**
| 文件 | 说明 |
|------|------|
| `services/turnOrchestrator.ts` | 串并联调度层 + 结果合并 + fallback |
| `services/narrativeTask.ts` | AI Task 3：纯叙事生成（Phase A, streaming） |
| `services/realityMappingTask.ts` | AI Task 1：现实映射规则解析（Phase B-1, JSON） |
| `services/worldRulesTask.ts` | AI Task 2：世界法则触发判定（Phase B-2, JSON） |
| `services/choicesTask.ts` | AI Task 4：回合选项生成（Phase B-3, JSON） |

**Task 级 AI 配置**
- 新增 `TaskAIConfig` / `TurnAIConfig` 接口，每个 Task 独立配置 temperature / model / timeout / retries
- 新增 `DEFAULT_TASK_CONFIGS` 预设常量（叙事 temp=0.75, 映射/法则 temp=0.3, 选项 temp=0.9）
- AI 设置弹窗新增 Task 参数 Tab，支持按角色保存配置

**容错降级**
- Task 3 失败 → 通用错误叙事 + Phase B 空上下文继续
- Task 1 失败 → 客户端 `ruleParser.ts` 降级（statUpdates 全 0）
- Task 2 失败 → 客户端 `ruleValidator.ts` 降级（仅硬阈值）
- Task 4 失败 → 3 个默认通用选项
- 全链路失败 → 回退 `geminiService.processTurn()` 单体模式

**UI 增强**
- 中间面板：叙事 streaming 逐字呈现 → 选项独立 loading
- 左侧面板：属性 safe(绿) / warning(黄) / triggered(红) 三色编码 + 变化原因
- 右侧面板：规则 triggered(⚡黄) / active(绿) / inactive(灰) / new(✨紫) 四态渲染

**Store 扩展**
- 新增四路独立 loading 状态（`narrativeLoading` / `realityAnalysisLoading` / `worldRulesLoading` / `choicesLoading`）
- 新增 `ruleStatusMap` / `realityAnalysis` / `narrativeStreamBuffer`
- `taskConfigsByCharacter` 支持按角色持久化 AI 配置

> 详细设计文档见 [docs/design/](docs/design/) | 运营文档见 [docs/运营文档-4Task架构重构.md](docs/运营文档-4Task架构重构.md)

### v1.0.0 — 初始版本

- 单体 `geminiService.processTurn()` 单次 AI 调用完成全部逻辑
- 支持 Gemini / OpenAI 双 Provider
- 8 个可选暗黑奇幻角色 + 动态规则卡牌系统
- Zustand + localStorage 游戏状态持久化

---

## ✨ 特性

### 🎮 游戏核心
- **动态叙事系统**：每个选择都会影响故事走向，AI 实时生成独特的剧情分支
- **进化规则卡牌**：游戏规则根据玩家决策动态添加或移除
- **中世纪奇幻美学**：精美的视觉设计，营造沉浸式游戏体验
- **多维度统计系统**：信誉度、压力值、人际关系三大核心属性影响游戏进程

### 🤖 AI 引擎
- **多 AI 提供商支持**：支持 Google Gemini 和 OpenAI (GPT-4)
- **智能 JSON 解析**：强健的错误处理和数据验证机制
- **上下文理解**：AI 理解游戏历史和角色特性，生成连贯的故事

### 💾 技术亮点
- **状态持久化**：使用 localStorage 自动保存游戏进度
- **集中式状态管理**：基于 Zustand 的高性能状态管理方案
- **响应式设计**：完美适配桌面和移动设备
- **TypeScript 类型安全**：全面的类型定义，提高代码质量

---

## 🎯 游戏玩法

### 角色选择
游戏开始时，从多个独特的角色中选择你的化身：
- 每个角色拥有独特的属性（力量、智慧、魅力）
- 特殊特质和弱点影响游戏体验
- 初始规则卡牌定义你的起始条件

### 核心机制
1. **阅读 AI 生成的故事场景**
2. **在多个选择中做出决定**
3. **观察你的选择如何影响**：
   - 📊 **三大核心属性**：信誉度、压力值、人际关系
   - 🃏 **规则卡牌变化**：新规则可能被添加或移除
   - 📖 **故事走向**：剧情根据你的决策发展

### 胜负条件
- ⚠️ **压力值达到 10**：理智崩溃，游戏结束
- 💔 **信誉度降至 0**：被社会放逐，游戏结束
- 🏆 **完成所有回合**：解锁最终总结

---

## 🚀 快速开始

### 环境要求
- **Node.js** 16.x 或更高版本
- **pnpm** (推荐) 或 npm

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd CharacterCard
   ```

2. **安装依赖**
   ```bash
   pnpm install
   # 或使用 npm
   npm install
   ```

3. **配置 AI API**
   
   创建 `.env.local` 文件并配置你的 API 密钥：
   
   ```bash
   # 使用 Gemini
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   
   # 或使用 OpenAI
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_OPENAI_BASE_URL=https://api.openai.com/v1
   VITE_OPENAI_MODEL=gpt-4
   ```

4. **启动开发服务器**
   ```bash
   pnpm dev
   # 或
   npm run dev
   ```

5. **访问应用**
   
   打开浏览器访问：`http://localhost:5173`

### 构建生产版本

```bash
pnpm build
# 预览构建结果
pnpm preview
```

---

## 🔧 配置说明

### AI 提供商配置

游戏支持两种 AI 提供商，你可以在游戏界面的设置按钮中切换：

#### Gemini (Google)
- 申请 API Key：[Google AI Studio](https://ai.google.dev/)
- 在设置中输入你的 API Key

#### OpenAI
- 申请 API Key：[OpenAI Platform](https://platform.openai.com/)
- 配置项：
  - API Key
  - Base URL（默认：`https://api.openai.com/v1`）
  - Model（推荐：`gpt-4` 或 `gpt-4-turbo`）

### 游戏参数调整

在 [constants.ts](constants.ts) 中可以自定义：
- 游戏最大回合数
- 角色初始属性
- 初始规则卡牌
- 角色库

---

## 📁 项目结构

```
CharacterCard/
├── components/               # React 组件
│   ├── AiSettingsModal.tsx       # AI 配置界面（含 Task 级参数 Tab）
│   ├── CharacterCard.tsx         # 角色卡牌组件
│   ├── DecisionFlowPage.tsx      # 决策流程页面
│   ├── RealityMappingPanel.tsx   # 左侧·现实映射面板（AI 分析结果渲染）
│   ├── RuleCard.tsx              # 右侧·规则卡牌（四状态渲染）
│   ├── StatBarWithRules.tsx      # 属性条（safe/warning/triggered 着色）
│   └── TurnCompleteToast.tsx     # 回合完成提示
├── services/                # 服务层
│   ├── aiEngine.ts              # AI 引擎核心（支持 TaskAIConfig + executeWithRetry）
│   ├── geminiService.ts         # 单体 AI 服务（保留为 fallback）
│   ├── turnOrchestrator.ts      # ★ 串并联调度层（Phase A → Phase B）
│   ├── narrativeTask.ts         # ★ Task 3：纯叙事生成（streaming）
│   ├── realityMappingTask.ts    # ★ Task 1：现实映射规则解析
│   ├── worldRulesTask.ts        # ★ Task 2：世界法则触发判定
│   └── choicesTask.ts           # ★ Task 4：回合选项生成
├── store/                   # 状态管理
│   └── index.ts                 # Zustand store（四路 loading + taskConfigs）
├── utils/                   # 工具层
│   ├── ruleParser.ts            # 客户端规则解析（Task 1 降级用）
│   └── ruleValidator.ts         # 客户端规则验证（Task 2 降级用）
├── docs/                    # 文档
│   └── design/                  # 6 份设计文档
├── App.tsx                  # 应用主组件（orchestrateTurn 调度入口）
├── constants.ts             # 游戏常量 + DEFAULT_TASK_CONFIGS
├── types.ts                # 类型定义（含 TaskAIConfig / TurnAIConfig / TaskOutput）
├── index.tsx               # 应用入口
└── vite.config.ts          # Vite 配置
```

---

## 🛠️ 技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| **React** | UI 框架 | 19.2.4 |
| **TypeScript** | 类型安全 | 5.8.2 |
| **Vite** | 构建工具 | 6.2.0 |
| **Zustand** | 状态管理 | 5.0.11 |
| **@google/genai** | Gemini API | 1.40.0 |
| **openai** | OpenAI API | 6.17.0 |
| **Font Awesome** | 图标库 | - |

---

## 📖 文档

- [部署指南](DEPLOYMENT.md) - GitHub Pages 自动部署配置
- [迁移文档](MIGRATION.md) - 状态管理和 AI 引擎实现细节
- [运营文档](docs/运营文档-4Task架构重构.md) - 4-Task 架构重构任务分解与交付计划
- [决策流程设计](docs/design/决策流程设计.md) - 主架构文档（决策流程 + 4-Task 总览）
- [Task 级 AI 配置](docs/design/task-ai-config.md) - 各 Task 的参数设计与逐文件扩展方案

---

## 🎨 特性展示

### 状态持久化
游戏进度自动保存到浏览器本地存储，刷新页面后可继续游戏。

### 智能 JSON 解析
AI 引擎包含强健的 JSON 解析机制：
- 自动去除 Markdown 代码块标记
- 修复常见的 JSON 格式问题
- 详细的错误日志和降级处理

### 响应式 UI
- 桌面端：大屏展示，视觉效果丰富
- 移动端：触摸优化，流畅体验

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发指南
1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

---

## 📄 许可证

本项目为私有项目，仅供学习和研究使用。

---

## 🙏 致谢

- Google Gemini AI
- OpenAI GPT-4
- React 和 Vite 团队
- 所有开源贡献者

---

<div align="center">

**用 ❤️ 和 ☕️ 构建 | Powered by AI**

[报告问题](../../issues) · [请求功能](../../issues) · [查看文档](DEPLOYMENT.md)

</div>
