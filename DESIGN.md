---
name: Clashub
description: A compact monochrome control center for self-hosted Clash configuration.
colors:
  ink: "#000000"
  canvas: "#ffffff"
  surface-subtle: "#f9fafb"
  surface-selected: "#f3f4f6"
  hairline: "#e5e7eb"
  text-muted: "#4b5563"
  danger: "#b91c1c"
  danger-surface: "#fef2f2"
  success: "#166534"
typography:
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.333
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
rounded:
  control: "10px"
  container: "10px"
  overlay: "20px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.overlay}"
    padding: "12px 16px"
  dialog:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.container}"
    padding: "24px"
---

# Design System: Clashub

## 1. Overview

**Creative North Star: "袖珍控制台"**

Clashub 应像一台专为个人配置工作流打造的袖珍控制台：体积感轻、信息密度适中、操作路径直接。黑白灰不是为了显得冷酷，而是为了让 Source ID、URL、YAML 内容与系统状态成为屏幕上最清楚的东西。

系统以平面结构为默认，通过排版、留白和发丝线建立层级。控件与静态容器统一 10px 圆角，modal 与移动端 bottom sheet 使用 20px 圆角；阴影只在 toast、dialog、浮层或关键聚焦状态中出现。

系统明确拒绝彩色或大面积渐变、玻璃拟态、夸张动效、厚重装饰、典型 SaaS 营销式视觉，以及 card 嵌套 card。动画只解释状态变化、空间关系和操作结果，不做全页入场表演。

**Key Characteristics:**

- 黑白灰双主题，语义色仅用于状态反馈。
- 紧凑但不拥挤，核心操作始终靠近其作用对象。
- 小半径、细边界、克制阴影，不制造漂浮的卡片墙。
- 完整的反馈层级：字段错误、inline message、toast、dialog 各司其职。
- Motion 集中服务列表重排、显隐、选择关系和操作确认。

## 2. Colors

这是一套以墨黑、瓷白、石墨与发丝线灰为核心的无彩色系统；红与绿只承担危险、错误和成功语义。

### Primary

- **墨黑（Ink）：** 用于最高层级文字、主要操作、toast 和清晰焦点。

### Secondary

- **警示红（Danger）：** 删除、错误和不可逆操作的唯一强调色。
- **确认绿（Success）：** 保存成功与已完成状态的语义色；成功 toast 默认仍使用墨黑底，避免大面积绿色。

### Neutral

- **瓷白（Canvas）：** 页面、控件与 dialog 的基础表面。
- **雾面白（Surface Subtle）：** 用于 hover、提示区和弱分组，不铺满主要内容区。
- **浅石墨面（Surface Selected）：** 只用于选择状态和需要确认归属的局部区域。
- **发丝线灰（Hairline）：** 用于分隔线和低强调边界。
- **石墨（Text Muted）：** 用于可读的辅助正文与说明，不承担关键正文或低对比占位符。

### Named Rules

**The Monochrome First Rule.** 新组件默认只能使用黑、白与灰；只有真实语义状态可以引入红或绿。

**The Contrast Is Functional Rule.** 正文与占位符必须达到 WCAG 2.2 AA；如果灰色更难读，就必须改深。

## 3. Typography

**Display Font:** Inter（ui-sans-serif、system-ui 后备）  
**Body Font:** Inter（ui-sans-serif、system-ui 后备）

**Character:** 单一 Inter 字族保持工具界面稳定、熟悉和高效。层级来自尺寸、字重与间距，不靠第二字体或装饰性排版制造戏剧感。

### Hierarchy

- **Headline**（700，1.5rem，1.333）：页面级标题；每个工作区只出现一次。
- **Title**（600，1.125rem，1.25）：容器、toast 与 dialog 标题。
- **Body**（400，1rem，1.5）：输入、正文与长说明；连续文字控制在 65–75ch。
- **Label**（500，0.875rem，1.25）：表单标签、导航、按钮和反馈操作；禁止全大写宽字距装饰。

### Named Rules

**The One Family Rule.** 产品界面只使用 Inter 与系统后备字体；Monaco 编辑器保留自身等宽字体。

**The Quiet Hierarchy Rule.** 标题层级最多依靠相邻两级尺寸和字重变化，禁止营销页式超大标题。

## 4. Elevation

系统平面为主。页面区域通过表面色、留白和 1px 发丝线分隔；阴影只用于 toast、dialog、浮层或关键聚焦状态。模态背景使用纯黑透明遮罩，不使用模糊玻璃效果。

### Shadow Vocabulary

- **Ambient Low**（`0 1px 3px rgba(0, 0, 0, 0.08)`）：小型浮层、聚焦容器和 toast。
- **Ambient Float**（`0 4px 8px rgba(0, 0, 0, 0.10)`）：dialog 与浮动面板；禁止用于普通卡片或按钮。
- **Overlay Backdrop**（`rgba(0, 0, 0, 0.42)`）：modal/dialog 背景遮罩；不得叠加 backdrop blur。

### Named Rules

**The Flat-by-Default Rule.** 如果 1px 边框已经表达边界，就不得再添加宽软阴影。

**The Eight-Pixel Ceiling Rule.** 阴影模糊半径不得超过 8px；需要更大阴影通常说明层级结构错误。

## 5. Components

### Buttons

- **Shape:** 控件统一 10px 圆角，图标与文字保持 8px 间隔。
- **Primary:** 墨黑底、瓷白字、8px 16px 内边距；每个局部区域只有一个主操作。
- **Secondary:** 瓷白底、墨黑字、1px 发丝线；禁止虚线边框作为默认次按钮。
- **Danger:** 浅红表面与深红文字；不可与主按钮同时争夺注意力。
- **Hover / Focus:** 使用 CSS 完成 100–200ms 颜色过渡和 2px `focus-visible` 外环；普通按钮不需要 Motion 包装。

### Cards / Containers

- **Corner Style:** 普通容器与控件统一 10px；modal 与 bottom sheet 为 20px。除此之外不得随意引入新的圆角层级。
- **Shadow Strategy:** 静止内容无阴影；只在浮起或聚焦状态使用 Ambient Low。
- **Border:** 最多 1px 发丝线；禁止与宽软阴影叠加。
- **Internal Padding:** 标准区块使用 28–32px 的主要节奏；表单、列表和工具区使用 12–16px 的局部节奏。
- **Usage:** 容器只在内容确实共享边界时存在；页面结构不等于卡片集合。

### Inputs / Fields

- **Style:** 瓷白背景、1px 灰色描边、10px 圆角、8px 12px 内边距。
- **Focus:** 描边切换为墨黑并显示 2px 外侧焦点环，不得只依赖颜色。
- **Error / Disabled:** 字段错误紧贴字段；disabled 降低对比但保持标签可读。

### Navigation

桌面端使用持久侧边导航，让资源页形成连续工作区；移动端使用固定底部导航，并预留安全区。当前项通过浅灰表面、字重和图标状态共同表达。普通导航 hover 使用 CSS；同一持久布局内的选择背景使用 Motion `layoutId`。

### Lists

列表是 Proxy Providers、Configs 与 Fetchers 的首选组织方式。条目使用 1px 分隔线、12px 16px 内边距和浅灰 hover。增删时使用 Motion `layout` 与 `AnimatePresence`：新条目淡入并上移 4px，删除快速淡出，其余条目在 180–240ms 内补位。

### Feedback & Notifications

- **Field Error:** 输入格式、必填和字段级服务端错误紧贴字段显示，修正后立即消失。
- **Inline Message:** 只用于与当前区域强相关、需要持续保留或需要用户修正的信息。
- **Toast:** 用于保存成功、复制完成、创建完成等无需决策的短暂结果。右上角最多堆叠 3 条，默认停留 4 秒，hover 或键盘聚焦时暂停。
- **Persistent Error Toast:** 后台失败且页面没有合适落点时使用，不自动消失，并提供重试或关闭操作。
- **Dialog / Modal:** 只用于删除确认、未保存更改、首次设置等必须暂停当前流程的决策。必须有标题、清晰后果、主次操作、初始焦点、焦点锁定、Escape 关闭和关闭后焦点归还。
- **Native Prompts:** 禁止使用 `alert()`、`confirm()` 或 `prompt()` 作为正式产品体验。

**The Right Feedback Rule.** 无需决策的短暂结果使用 toast；需要持续修正的内容使用 inline message；会阻断流程或产生不可逆后果的决策才使用 dialog。

### Motion

- **Press / Icon Swap:** 100–140ms，用于复制图标切换、按钮按压和即时反馈。
- **Toast / Inline Feedback:** 进入 180ms，退出 140ms；使用淡入与不超过 6px 的短位移。
- **Form / Dialog:** 表单展开 200–240ms；dialog 遮罩 160ms、面板 200ms；退出约为进入时长的 75%。
- **List Reflow:** 使用 Motion `layout`；超过 10 项时不做逐项 stagger。
- **Selection:** Config 当前项使用 `layoutId` 移动背景或指示器；不得动画 Monaco 编辑器本体或通过 key 强制其重新挂载。
- **Easing:** 统一使用 `cubic-bezier(0.25, 1, 0.5, 1)`；禁止 bounce、elastic 和夸张 spring。
- **Reduced Motion:** 根级 Motion 配置使用 `reducedMotion="user"`；取消 transform 和 layout 动画，只保留必要 opacity、颜色和即时状态切换。

**The State Before Spectacle Rule.** 每个动画必须说明哪个状态改变了、内容从哪里来或操作结果去了哪里；答不出来就删除动画。

## 6. Do's and Don'ts

### Do:

- **Do** 使用 10px 控件/容器圆角、20px modal/sheet 圆角、28–32px 主要间距和 1px 发丝线建立结构。
- **Do** 使用 toast 表达无需决策的短暂结果，使用 inline message 表达持续上下文，使用 dialog 表达不可逆或阻断式决策。
- **Do** 将 Motion 集中用于列表重排、表单显隐、toast、dialog、选择指示器与图标状态切换。
- **Do** 为 toast 提供 live region，为 dialog 提供焦点管理、Escape 关闭和焦点归还。
- **Do** 达到 WCAG 2.2 AA，并支持键盘、色觉缺陷与 `prefers-reduced-motion`。

### Don't:

- **Don't** 使用彩色或大面积渐变、玻璃拟态、夸张动效、厚重装饰和典型 SaaS 营销式视觉。
- **Don't** 把每块内容都做成卡片，尤其禁止 card 嵌套 card。
- **Don't** 延续全局 0px 圆角，也不要把 20px overlay 圆角扩散到普通页面容器。

## 7. Responsive Workspaces

- Provider 与 Fetcher 保持单栏资源工作区，不额外展示服务端未提供的状态、日志、检测结果或 URL 详情。
- Config 在桌面端为文件列表与 Monaco 的连续双栏工作区；编辑器本体不使用卡片边界或阴影。
- Config 在移动端采用列表 → 编辑器的层级导航。移动端主要用于查看、复制和必要的小范围编辑，不试图复刻完整桌面 IDE。
- 所有创建、编辑与删除继续使用真实 modal；小屏同一组件适配为 20px 顶部圆角 bottom sheet。
- UI 重排不得改变既有路由、请求、字段、鉴权方式、资源操作或信息可见范围。
- **Don't** 使用页面顶部简陋提示条承载所有成功与错误，也不要使用原生 `alert()`、`confirm()` 或 `prompt()`。
- **Don't** 同时给同一元素使用 1px 边框和模糊半径大于 8px 的宽软阴影。
- **Don't** 为普通路由切换、Monaco 编辑器本体或每个页面区块添加装饰性入场动画。
