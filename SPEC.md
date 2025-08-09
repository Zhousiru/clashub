# Clashub 规格说明书

Clashub 是一个可以把用户输入的 Clash 订阅链接进行处理和转换的工具

## 技术栈

React Router 7 + Cloudflare 全栈 Web App

FE：React 19、Tailwind v4 + Radix UI (If necessary) + Tabler Icon、@monaco-editor/react
BE：Cloudflare Durable Object、React Router Loader

## 模块 / 页面

### 登录

提供基本的身份验证功能，用户只需要输入密码（称为 token）即可登录，不需要账号与登录功能

token 存储在 Durable Object KV，初次进入支持设置密码

所有必要的操作都需要 token 传入，考虑实现验证中间件存放在 HTTP Only Cookie 中

此页面呈现居中文本输入框、提示文本、登录按钮，除此之外不需要有更多元素

### Proxy Provider Manager

这是登陆后用户看到的第一个页面，用户可以在这个界面添加自己的 Clash 订阅链接

添加订阅链接需要用户输入这个链接对应的 ID（由小写字母和 hyphen 组成的 string），称为 Source ID，和对应的链接地址，称为 Subscription URL

此页面整体布局呈现单栏布局，可以编辑已有项目的 Subscription URL

### Config Manager

用户可以在此页面创建和编辑配置，配置由配置对应的 ID（由小写字母和 hyphen 组成的 string，称为 Config ID），和对应的配置内容（任意 YAML 文本，称为 Config）组成

此页面呈现双栏布局，左边是 Config ID 列表，选中对应的 Config ID 后，展示右栏编辑器（使用 Monaco 编辑器），用户可以进行编辑，带有保存按钮

创建按钮考虑放在左侧列表底部，点击后让用户输入 Config ID，然后创建一个关于此 ID 的空配置，选中新建 ID 让用户进行内容编辑

### Fetcher Manager

用户可以在此页面管理反向代理 URL，一个 fetcher 由 Fetcher ID（由小写字母和 hyphen 组成的 string）和 cURL 命令组成（称为 cURL），界面类似于 Config Manager，区别在于编辑器内容不同

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

  解析对应 Fetcher ID 的 cURL 命令（考虑使用 curlconverter），发起请求，按原样返回（相当于反向代理）

所有的 API 端点都需要加上 query，?token=<token> 来认证用户身份

## 架构规范

实现分层，把数据交互相关操作封装在 Durable Object Class 中。抽离可复用组件到 components，可复用工具函数到 utils，Durable Object 封装在 services 中，并且在 app.ts 中重新导出

Durable Object 可参考资料：

- https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests/

- https://developers.cloudflare.com/durable-objects/get-started/

## 设计风格

现代简洁 Retro 风格，黑 / 白 / 灰配色（参考 Vercel），圆角半径 0px（无圆角设计元素）。不要使用大面积渐变色
