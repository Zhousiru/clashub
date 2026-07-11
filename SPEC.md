# Clashub 规格说明书

Clashub 是一个可以把用户输入的 Clash 订阅链接进行处理和转换的工具

## 技术栈

React Router 7 + Cloudflare 全栈 Web App

FE：React 19、Tailwind v4 + Radix UI (If necessary) + Tabler Icon、@monaco-editor/react
BE：Cloudflare KV、React Router Loader

## 模块 / 页面

### 登录

提供基本的身份验证功能，用户只需要输入密码（称为 token）即可登录，不需要账号与登录功能

token 存储在 KV，初次进入支持设置密码

所有必要的操作都需要 token 传入，考虑实现验证中间件存放在 HTTP Only Cookie 中

此页面呈现居中文本输入框、提示文本、登录按钮，除此之外不需要有更多元素

### Proxy Provider Manager

这是登陆后用户看到的第一个页面，用户可以在这个界面添加自己的 Clash 订阅链接

添加订阅链接需要用户输入这个链接对应的 ID（由小写字母、数字、连字符和英文句点组成的 string），称为 Source ID，和对应的链接地址，称为 Subscription URL

此页面整体布局呈现单栏布局，可以编辑已有项目的 Subscription URL

### Config Manager

用户可以在此页面创建和编辑配置，配置由配置对应的 ID（由小写字母、数字、连字符和英文句点组成的 string，称为 Config ID），和对应的配置内容（任意 YAML 文本，称为 Config）组成

此页面呈现双栏布局，左边是 Config ID 列表，选中对应的 Config ID 后，展示右栏编辑器（使用 Monaco 编辑器），用户可以进行编辑，带有保存按钮

创建按钮考虑放在左侧列表底部，点击后让用户输入 Config ID，然后创建一个关于此 ID 的空配置，选中新建 ID 让用户进行内容编辑

### Fetcher Manager

用户可以在此页面管理反向代理 URL，一个 fetcher 由 Fetcher ID（由小写字母、数字、连字符和英文句点组成的 string）和 Fetcher URL，界面类似于 Proxy Provider Manager，区别在于编辑内容不同

### Settings

在这里页面，用户可以改变密码（token）

### API Endpoints

这是最核心的模块，用户可以通过 API Endpoints 去访问处理后的数据

- /api/v1/proxy-provider/<Source ID>

  这个节点获取 Source ID 的 Subscription URL 处理后的数据，具体处理流程：
  1. GET Subscription URL 得到 YAML 格式的内容，提取出 `proxies` 块的内容
  2. 返回以下内容

     ```
     proxies:
       // 源文件 `proxies` 块的内容
     ```

     相当于删除其余配置块，只保留 `proxies` 块

- /api/v1/config/<Config ID>

  直接返回对应 Config ID 的内容

- /api/v1/fetcher/<Fetcher ID>

  对 Fetcher ID 对应的 URL 发起请求，按原样返回（相当于反向代理）

所有的 API 端点都需要加上 query，?token=<token> 来认证用户身份

### Management API

管理 API 面向自动化客户端和 Codex Skill，使用 JSON 读写 Config、Proxy
Provider 和 Fetcher。认证信息必须通过请求头传递：

```
Authorization: Bearer <token>
```

管理 API 不接受 query token，也不会返回当前认证 token。所有响应都设置
`Cache-Control: no-store`。

- `GET /api/v1/admin/snapshot`：读取三类资源的完整快照
- `GET /api/v1/admin/<resource>`：列出资源
- `POST /api/v1/admin/<resource>`：创建资源，ID 放在 JSON body 中
- `GET /api/v1/admin/<resource>/<id>`：读取单个资源
- `PUT /api/v1/admin/<resource>/<id>`：更新资源
- `DELETE /api/v1/admin/<resource>/<id>`：删除资源

其中 `<resource>` 为 `configs`、`proxy-providers` 或 `fetchers`。更新和删除
必须传入 `expectedRevision`；版本不一致时返回 `409 Conflict` 和当前记录。

## 架构规范

实现分层，把 KV 数据交互相关操作封装在 service 中。抽离可复用组件到 components（按钮、输入框、列表等），可复用工具函数到 utils

## 设计风格

采用 Vercel-like 的现代、克制工具界面，以黑 / 白 / 灰为主色，语义红绿只用于错误、危险与成功状态。控件和普通容器使用 10px 圆角，modal 与移动端 bottom sheet 使用 20px 圆角；主要布局节奏为 28–32px，局部表单和列表节奏为 12–16px。阴影只用于 toast、dialog、浮层或关键聚焦状态，最大模糊半径为 8px。优先通过排版、留白和 1px 分隔线建立层级，尽可能少用 card，禁止 card 嵌套 card。不要使用大面积渐变、玻璃拟态、夸张装饰或典型 SaaS 营销式视觉。完整规范见 `PRODUCT.md` 与 `DESIGN.md`。

桌面端使用持久侧边导航，资源页为连续单栏工作区，Config 为列表 + Monaco 的连续双栏工作区；移动端使用底部导航，Config 采用列表 → 编辑器层级，定位为查看、复制和必要的小范围编辑。UI 改写不得新增功能、服务端字段、状态推断或信息展示，也不得改变现有 API、鉴权与资源操作。

### 反馈系统

- 字段格式、必填和字段级服务端错误使用贴近字段的 inline error。
- 与局部工作区强相关、需要持续显示的信息使用 inline message。
- 保存、复制、创建等无需用户决策的短暂结果使用 toast；右上角最多同时显示 3 条，默认 4 秒后关闭，hover 或键盘聚焦时暂停。
- 无合适页面落点的后台失败使用持久 error toast，并提供重试或关闭操作。
- 删除、未保存更改、首次设置等会阻断流程或产生不可逆结果的决策使用 dialog/modal。
- 禁止使用浏览器原生 `alert()`、`confirm()` 或 `prompt()` 作为正式产品反馈。
- toast 需要合适的 live region；dialog 需要标题、初始焦点、焦点锁定、Escape 关闭与关闭后的焦点归还。

### 动画系统

使用 `motion/react` 处理列表重排、表单显隐、toast、dialog、选择指示器和图标状态切换。普通 hover、focus 和颜色变化继续使用 CSS。

- 点击和图标切换：100–140ms。
- toast 进入 180ms、退出 140ms；使用淡入和不超过 6px 的短位移。
- 表单展开 200–240ms；dialog 遮罩 160ms、面板 200ms。
- Provider、Config、Fetcher 增删使用 `layout` 与 `AnimatePresence`，让其余条目在 180–240ms 内补位。
- Config 选择指示器可使用 `layoutId`；禁止动画 Monaco 编辑器本体或通过 key 强制其重新挂载。
- 统一缓动为 `cubic-bezier(0.25, 1, 0.5, 1)`，禁止 bounce、elastic 和夸张 spring。
- 根级 Motion 配置使用 `reducedMotion="user"`，尊重 `prefers-reduced-motion`。
