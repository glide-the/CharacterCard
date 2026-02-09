# 设计稿：游戏页面规则显示修复 & 世界法则触发增强

> **版本**: v1.0  
> **日期**: 2026-02-09  
> **范围**: 游戏页面（GAMEPLAY Phase）左侧「现实映射规则解析」修复 + 右侧「世界法则」触发机制优化  

---

## 一、问题诊断

### 问题 1：左侧「现实映射的规则解析」未正常显示

**根因分析**：

在 `App.tsx` 的 `renderGameplay()` 中，左侧面板的「现实法则解析」区域通过以下逻辑过滤规则：

```ts
const realityRules = rules.filter(r => r.type === 'REALITY' && r.active);
```

存在以下缺陷：

| # | 缺陷描述 | 影响 |
|---|---------|------|
| 1 | **过滤条件过严**：只展示 `type === 'REALITY'` 的规则，但 `INITIAL_RULES` 中仅有 `r2`(社会信誉)、`r6`(八卦网络)、`r10`(商人的贪婪) 三条为 REALITY 类型，且 `r6` 和 `r10` 初始状态为 `active: false`，导致初始只显示 1 条规则 | 用户几乎看不到「规则解析」的实际内容 |
| 2 | **规则解析与属性阈值断裂**：「现实映射」区域的核心目的是将抽象规则**解析映射**到当前数值状态（如信誉 < 3 触发敌意、压力 > 7 触发幻觉），但当前实现将 stat bars 和 REALITY 规则列表割裂为两个无关区块，缺乏关联性 | 用户无法直观理解「哪条规则正在影响哪个属性」 |
| 3 | **REALITY 规则描述未被动态解析**：例如 `r2` 的描述是"低信誉度（<3）会使NPC产生敌意。高压力（>8）会触发幻觉事件。"这段文本只是原封不动地显示，没有根据当前数值高亮是否已达到阈值 | 规则看起来像静态文本而非动态状态 |
| 4 | **`hidden md:flex` 导致移动端完全不可见** | 手机/平板用户无法看到任何规则解析 |

### 问题 2：右侧「世界法则」触发展示不完整

**根因分析**：

- `RuleCard` 组件已接收 `triggeredInfo` prop 并正确展示了触发状态（高亮 + "已触发" 徽章 + hover tooltip）
- `geminiService.ts` 的 prompt 已要求 AI 返回 `triggeredRules` 字段
- **但是**：AI 返回的 `triggeredRules` 是否包含**所有**被规则描述匹配的触发，取决于 AI 模型的判断质量，没有客户端兜底校验
- **关键缺失**：没有**客户端规则引擎**来确定性地判断哪些规则应该被触发。当前完全依赖 AI 的自由回答，可能遗漏触发或给出不准确的原因

**hover 行为分析**：

- `RuleCard` 内部已实现 `showTooltip` 状态 + hover 事件
- tooltip 仅在 `isTriggered && showTooltip` 时显示
- **问题**：**未触发的规则 hover 时没有任何反馈**，用户无法得知每条规则的具体效果和潜在触发条件
- 中间栏顶部的 `Triggered Rules Banner` 有 tooltip，但被 `pointer-events-none` 限制（虽然父元素用了 `group-hover:opacity-100`，但 CSS 层叠和定位可能导致 tooltip 被裁剪或不响应）

---

## 二、设计方案

### 方案 A（左侧）：重构「现实映射规则解析」

#### A1. 数据层：新增客户端规则解析引擎

新增一个纯函数（不修改代码，描述逻辑），负责将规则描述解析为可视化状态：

```
输入: rules: RuleCard[], realityStats: { credibility, stress, connections }
输出: ParsedRuleMapping[]

interface ParsedRuleMapping {
  rule: RuleCard;
  linkedStats: Array<{
    statKey: 'credibility' | 'stress' | 'connections';
    statLabel: string;
    currentValue: number;
    threshold: number;
    direction: 'below' | 'above';  // 低于阈值危险 or 高于阈值危险
    isTriggered: boolean;           // 当前值是否已达到阈值
    warningMessage: string;
  }>;
  isAnyTriggered: boolean;
}
```

**解析规则示例**：
- `r2`("社会信誉"): 提取 `低信誉度（<3）` → `{ statKey: 'credibility', threshold: 3, direction: 'below' }` + `高压力（>8）` → `{ statKey: 'stress', threshold: 8, direction: 'above' }`
- `r10`("商人的贪婪"): 无直接 stat 映射，标记为「叙事规则」
- `r3`("迷雾"): 提取 `增加"腐化"计数` → 标记为「风险提示」

**兜底策略**：对于无法自动解析的规则文本，fallback 为原样显示。

#### A2. UI 层：左侧面板重构

**改动范围**: `renderGameplay()` 中左侧面板的「现实映射」区域

```
┌──────────────────────────────────────┐
│           📊 现实映射                  │
├──────────────────────────────────────┤
│                                      │
│  ⚖ 信誉度         [████████░░] 5/10 │
│    ├─ ⚠ 社会信誉: 低于3时NPC敌意      │ ← 关联规则(r2) 
│    │   状态: ✅ 安全 (当前5)           │ ← 动态状态
│    └─ 📢 八卦网络: [未激活]            │ ← r6 灰显
│                                      │
│  🧠 精神压力       [████░░░░░░] 2/10 │
│    ├─ ⚠ 社会信誉: 高于8时触发幻觉      │ ← 同一规则r2的第二条
│    │   状态: ✅ 安全 (当前2)           │
│    └─ 🌫 迷雾: 休息增加腐化            │ ← r3 关联
│                                      │
│  🤝 人脉           [███░░░░░░░] 3/10 │
│    └─ (暂无关联规则)                   │
│                                      │
├──────────────────────────────────────┤
│  ⚡ 其他活跃规则 (非属性映射)            │
│  ┌─────────────────────────────────┐ │
│  │ 🔒 等价交换法则                   │ │ ← r1, CONSTRAINT
│  │ 📝 魔法消耗物理资源...             │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ 🎲 墨菲定律                      │ │ ← r4, RISK 
│  │ 📝 超过2步的计划第3步将失败        │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ 🔒 铁律物理                      │ │ ← r8, CONSTRAINT
│  │ 📝 跌落伤害真实...                │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ 🎲 夜惊                         │ │ ← r11, RISK
│  │ 📝 夜间行动需理智检定              │ │
│  └─────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**核心改动点**：

1. **属性条 + 关联规则合并展示**：每个 stat bar 下方直接挂载与之关联的规则摘要
2. **动态状态标签**：
   - 安全态 → 绿色 `✅ 安全` 
   - 接近阈值 → 黄色 `⚠ 注意`（距阈值差值 ≤ 2）
   - 已触发 → 红色 `🔴 生效` + 脉冲动画
3. **非属性映射的规则**：原本只展示 REALITY 类型的规则列表，改为展示**所有活跃但无直接属性映射的规则**（CONSTRAINT / RISK / BONUS），以小卡片形式显示
4. **未激活规则**以灰色半透明样式显示在关联位置，让用户知道它的存在但当前未生效

#### A3. 移动端适配

- 在 `md` 以下断点，将「现实映射」区域改为顶部**可折叠面板**（默认收起，点击展开）
- 折叠状态下仅显示三个 stat 数值的 mini bar + 触发警告图标

---

### 方案 B（右侧）：世界法则触发增强 & Hover 原因展示

#### B1. 客户端规则触发校验（确定性兜底）

**目标**: 在 AI 返回结果后，客户端独立校验以下确定性规则，补充 AI 遗漏的触发：

| 规则 ID | 触发条件（可确定性判断） | 校验逻辑 |
|---------|----------------------|---------|
| r2 (社会信誉) | `credibility < 3` 或 `stress > 8` | 直接比对新 stats 数值 |
| r4 (墨菲定律) | 玩家选择的文本暗示 ≥3 步计划 | 仅依赖 AI 判断（无法客户端确定） |
| r5 (主角光环) | 某次伤害将导致 HP 降至 0 | 检测 stat 是否被 clamp 兜底 |
| r8 (铁律物理) | 叙事中包含跌落/护甲相关 | 仅依赖 AI 判断 |
| r11 (夜惊) | 叙事上下文为夜间 | 仅依赖 AI 判断 |

**合并策略**:
```
最终触发列表 = AI返回的triggeredRules ∪ 客户端校验触发的规则（去重，以ruleId为key）
```

- 若 AI 已返回某 ruleId 的触发，以 AI 的 reason 为准
- 若仅客户端检测到触发，自动生成 reason，如: `"当前信誉度(${credibility})已低于阈值3，触发NPC敌意效果"`

#### B2. RuleCard Hover 增强

当前 `RuleCard` 组件仅在 `isTriggered` 时显示 tooltip。**设计改进**：

**所有规则卡片（无论是否触发）hover 时都应显示信息面板**：

```
┌─────────────────────────────────────────┐
│  ⚖ 社会信誉  [REALITY]    ⚡ 已触发     │  ← 标题行
│  ────────────────────────────────────── │
│  📝 低信誉度（<3）会使NPC产生敌意。       │  ← 规则描述
│     高压力（>8）会触发"幻觉"事件。        │
│  ────────────────────────────────────── │
│                                         │
│  HOVER TOOLTIP (浮层):                   │
│  ┌──────────────────────────────────┐   │
│  │ 📋 规则详情                       │   │
│  │                                   │   │
│  │ 类型: 现实法则 (REALITY)           │   │
│  │ 状态: 🟢 激活                     │   │
│  │                                   │   │
│  │ 📊 关联属性:                       │   │
│  │   信誉度: 5/10 (安全, 阈值: 3)     │   │
│  │   精神压力: 2/10 (安全, 阈值: 8)   │   │
│  │                                   │   │
│  │ ── 本轮触发? ──                   │   │
│  │ ⚡ 是 / ✖ 否                      │   │
│  │ 原因: "玩家选择恐吓守卫，导致      │   │
│  │       信誉下降至2，低于阈值3"       │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Tooltip 内容根据状态分三种模式**：

| 状态 | Tooltip 内容 |
|------|-------------|
| **已触发** | 类型 + 关联属性当前值 + **触发原因**（来自 `triggeredInfo.reason`）+ 红色高亮 |
| **激活但未触发** | 类型 + 关联属性当前值 + 距离触发的安全余量 + "本轮未触发" |
| **未激活** | 类型 + "此规则当前休眠，可能在特定条件下被激活" |

#### B3. 触发动画强化

当新一轮结果返回后，被触发的 RuleCard 应播放入场动画：

1. **脉冲光晕**: 被触发的卡片边框发出 2 次金色脉冲（`ring-yellow-400` + `animate-pulse`，已部分实现）
2. **排序提升**: 被触发的规则卡片自动排到列表顶部（通过 sort，triggered 优先）
3. **原因预览**: 触发时自动展开 tooltip 持续 3 秒后收起（使用 `setTimeout` + 状态管理），让用户无需 hover 就能先看到原因
4. **连接线**: 在中间叙事区出现的「本轮触发」banner 中，每个规则 tag hover 时，右侧对应 RuleCard 高亮闪烁（跨列联动）

#### B4. 中间栏 Triggered Rules Banner 修复

当前实现存在的 CSS 问题：

```tsx
// 当前代码 - tooltip 使用了 pointer-events-none，导致嵌套 hover 可能失效
<span className="... pointer-events-none z-50 ...opacity-0 group-hover:opacity-100">
```

**修复方案**：
- 移除 tooltip 上的 `pointer-events-none`（因为它是 `group-hover` 子元素，不需要阻止指针事件）
- 确保 tooltip 的 `z-50` 不被父容器的 `overflow: hidden` 裁剪（检查 banner 容器是否设置了 overflow）
- 增加 tooltip 出现的延迟（150ms debounce），避免鼠标快速扫过时闪烁

---

## 三、数据流变更

### 修改前的数据流

```
AI Response
  └─> EngineResult.triggeredRules
        └─> store.currentTriggeredRules  (直接存入)
              ├─> 中间栏 Banner (显示触发规则名)
              └─> 右侧 RuleCard (通过 triggeredMap 查找)
```

### 修改后的数据流

```
AI Response
  └─> EngineResult.triggeredRules (AI 判断)
        │
        ├─> 客户端校验层 (合并确定性触发)
        │     输入: newStats, activeRules, AI triggeredRules
        │     输出: mergedTriggeredRules[]
        │
        └─> store.currentTriggeredRules (合并后存入)
              │
              ├─> 中间栏 Banner (修复 tooltip hover)
              │
              ├─> 右侧 RuleCard (增强 hover 全状态 tooltip)
              │     ├─ 已触发: 显示原因 + 高亮
              │     ├─ 未触发: 显示安全余量
              │     └─ 未激活: 显示休眠说明
              │
              └─> 左侧 现实映射 (关联解析)
                    ├─ stat bar + 关联规则子项
                    ├─ 动态阈值状态标签
                    └─ 非映射规则列表
```

---

## 四、组件变更清单

| 文件 | 变更类型 | 变更描述 |
|------|---------|---------|
| `types.ts` | **新增** | 添加 `ParsedRuleMapping` 接口、`RuleTooltipMode` 类型 |
| `utils/ruleParser.ts` | **新建** | 规则解析引擎：将规则 description 解析为属性映射 |
| `utils/ruleValidator.ts` | **新建** | 客户端规则触发校验器：确定性规则的 fallback 触发检测 |
| `components/RuleCard.tsx` | **修改** | 增强 hover tooltip（三种模式）、接收 `realityStats` prop |
| `components/StatBarWithRules.tsx` | **新建** | 新组件：「属性条 + 关联规则」的复合组件 |
| `components/RealityMappingPanel.tsx` | **新建** | 新组件：整个左侧「现实映射」面板（替换 App.tsx 中的内联 JSX） |
| `App.tsx` | **修改** | 左侧面板使用 `RealityMappingPanel`；`handleChoice` 中增加客户端触发合并；修复 banner tooltip CSS |
| `store/index.ts` | **无变更** | 数据结构不变，`currentTriggeredRules` 存储合并后的结果 |

---

## 五、详细 UI 规格

### 5.1 StatBarWithRules 组件

```
Props:
  - statKey: 'credibility' | 'stress' | 'connections'
  - label: string (e.g. "信誉度")
  - icon: string (FontAwesome class)
  - value: number
  - max: number (default 10)
  - linkedRules: Array<{
      rule: RuleCard;
      threshold: number;
      direction: 'below' | 'above';
      isTriggered: boolean;
      currentTriggeredReason?: string;
    }>
  - dangerColor: string (e.g. 'red', 'orange')

渲染结构:
  <div class="stat-group">
    <!-- bar 行 -->
    <div class="flex justify-between">
      <span>{icon} {label}</span>
      <span class="{danger? 'text-red animate-pulse' : ''}">{value}/{max}</span>
    </div>
    <div class="progress-bar">
      <div class="fill" style="width: {value/max*100}%"/>
      {linkedRules.map(lr => (
        <div class="threshold-marker" style="left: {lr.threshold/max*100}%" />
      ))}
    </div>
    
    <!-- 关联规则子项 -->
    {linkedRules.map(lr => (
      <div class="rule-link {lr.isTriggered ? 'triggered' : 'safe'}">
        <span class="rule-name">{lr.rule.title}</span>
        <span class="status-badge">
          {lr.isTriggered 
            ? '🔴 生效: ' + lr.currentTriggeredReason
            : distanceToThreshold <= 2
              ? '⚠ 注意 (距阈值差' + distance + ')'  
              : '✅ 安全'
          }
        </span>
      </div>
    ))}
  </div>
```

**主题色**：
- 安全: `text-green-400`, `bg-green-900/20`
- 注意: `text-yellow-400`, `bg-yellow-900/20`
- 生效: `text-red-400`, `bg-red-900/30`, `animate-pulse`

### 5.2 RuleCard Hover Tooltip 规格

```
位置: absolute, bottom-full (卡片上方), left-0, mb-2
宽度: w-64 (256px)
最大高度: max-h-48 overflow-y-auto
背景: bg-[#1a0505] 
边框: border border-{typeColor}/60
圆角: rounded-lg
阴影: shadow-2xl
Z-index: z-50
动画: opacity-0 → opacity-100, transition-opacity duration-200

内容结构:
┌── Header ──────────────────┐
│ {typeIcon} {typeName}  {statusBadge}  │
├── Divider ─────────────────┤
│ 📊 关联属性:                │  ← 仅 REALITY 类型显示
│   {statKey}: {value}/{max}  │
│   阈值: {threshold}         │
│   安全余量: {margin}         │
├── Divider ─────────────────┤
│ 本轮状态:                   │
│ {⚡触发原因 / ✖ 未触发}      │
└────────────────────────────┘

Arrow: 底部三角箭头指向卡片
```

### 5.3 触发自动展示动效

```
时序:
  T+0ms:    handleChoice 返回结果, setCurrentTriggeredRules(merged)
  T+0ms:    被触发的 RuleCard border 变为 gold, ring 动画开始
  T+100ms:  被触发的 RuleCard 排序移至列表顶部 (with layout animation)
  T+300ms:  auto-tooltip 自动展开 (无需 hover)
  T+3300ms: auto-tooltip 自动收起 (3秒后)
  用户随时可 hover 重新展开
```

---

## 六、规则解析逻辑详细设计

### 6.1 解析映射表（硬编码 + 模式匹配混合）

对于初始的 12 条规则，使用以下映射（可后续扩展为正则匹配）：

| 规则 ID | 规则标题 | 关联属性 | 阈值 | 方向 | 解析方式 |
|---------|---------|---------|------|------|---------|
| r1 | 等价交换法则 | - | - | - | 纯文本，无属性映射 |
| r2 | 社会信誉 | credibility | 3 | below | 硬编码映射 |
| r2 | 社会信誉 | stress | 8 | above | 硬编码映射 |
| r3 | 迷雾 | stress | - | - | 标记为「休息风险」 |
| r4 | 墨菲定律 | - | - | - | 纯叙事规则 |
| r5 | 主角光环 | credibility/stress | 0/10 | below/above | 极限保护 |
| r6 | 八卦网络 | credibility | - | - | 名声传播效果 |
| r7 | 血债 | - | - | - | 事件驱动 |
| r8 | 铁律物理 | - | - | - | 纯叙事规则 |
| r9 | 奥术共鸣 | - | - | - | 纯叙事规则 |
| r10 | 商人的贪婪 | connections | - | - | 经济效果 |
| r11 | 夜惊 | stress | - | - | 夜间风险 |
| r12 | 神圣干预 | - | - | - | 随机触发 |

### 6.2 AI 动态添加的规则

AI 在游戏过程中可能通过 `ruleUpdates.add` 添加新规则。对于这些运行时新增的规则：
- 默认无属性映射，显示在「其他活跃规则」区域
- 如果 AI 返回中包含了该新规则的 `triggeredRules` 信息，则正常显示触发状态

### 6.3 客户端确定性触发校验伪代码

```
function validateRuleTriggers(
  activeRules, newStats, aiTriggeredRules
) -> TriggeredRule[]:

  aiMap = Map(aiTriggeredRules, by ruleId)
  result = [...aiTriggeredRules]
  
  for rule in activeRules:
    if rule.id == 'r2' and not aiMap.has('r2'):
      if newStats.credibility < 3:
        result.push({
          ruleId: 'r2',
          ruleTitle: '社会信誉',
          reason: `信誉度已降至${newStats.credibility}，低于阈值3，NPC将产生敌意`
        })
      elif newStats.stress > 8:
        result.push({
          ruleId: 'r2',
          ruleTitle: '社会信誉',
          reason: `精神压力已升至${newStats.stress}，超过阈值8，可能触发幻觉事件`
        })
    
    if rule.id == 'r5' and not aiMap.has('r5'):
      // 检测是否有 clamp 保护
      if any stat was clamped from ≤ 0:
        result.push({
          ruleId: 'r5',
          ruleTitle: '主角光环',
          reason: '致命伤害被主角光环抵消，保留最低值'
        })
  
  return deduplicate(result, by ruleId)
```

---

## 七、可选增强项（Optional Enhancers）

### E1. 规则演化时间线
在左侧面板底部增加「规则变更日志」，记录每一轮新增/移除的规则，以小字时间线样式展示：
```
Turn III: + 🔒 守卫通缉令 (新增)
Turn V:   - 🎁 主角光环 (已消耗)
```

### E2. 规则关联图谱 (Advanced)
以小型力导向图展示规则之间的关系（如 r2 和 r3 都影响 stress），hover 节点高亮关联属性条。

### E3. AI Prompt 增强
在 `geminiService.ts` 的 prompt 中增加更强的约束：
```
CRITICAL: You MUST evaluate EVERY active rule against the player's action. 
For each rule, explicitly state whether it triggers or not. 
Do NOT skip any rule in your analysis.
The "triggeredRules" array must be comprehensive - missing a trigger is a critical error.
```

### E4. 触发音效
被触发的规则播放短促的音效（如锁链声/雷鸣），增强沉浸感。

### E5. 规则卡片翻转效果
RuleCard hover 时使用 CSS 3D 翻转（`rotateY(180deg)`），正面显示规则名 + 类型图标，背面显示完整详情和触发状态。

---

## 八、验收标准

| # | 验收项 | 通过条件 |
|---|-------|---------|
| 1 | 左侧现实映射显示 | 进入游戏后，三个属性条下方各自展示关联的 REALITY 规则条目 |
| 2 | 规则状态动态更新 | 当信誉度降至 2 时，r2 规则下方显示红色「🔴 生效」标签 |
| 3 | 非映射规则可见 | CONSTRAINT / RISK / BONUS 类型的活跃规则在属性条下方显示 |
| 4 | 右侧 hover 未触发规则 | hover 任意未触发的 RuleCard，tooltip 显示类型 + 关联信息 + "本轮未触发" |
| 5 | 右侧 hover 已触发规则 | hover 已触发的 RuleCard，tooltip 显示触发原因（来自 AI 或客户端校验） |
| 6 | 触发自动展示 | 新一轮结果返回后，被触发的规则卡 tooltip 自动展开 3 秒 |
| 7 | 中间栏 banner hover | banner 中的规则标签 hover 时正确显示 tooltip，无裁剪 |
| 8 | 客户端校验兜底 | AI 遗漏 r2 触发（信誉 < 3）时，客户端补充触发 + 生成 reason |
| 9 | 移动端 | 小屏下现实映射以折叠面板形式显示 |
