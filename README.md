# 古建智汇平台

这是一个适合比赛项目演示的轻量全栈版本，已经补完了真实可运行的注册登录与论坛发帖能力。

## 已实现能力

- 用户注册：用户名和邮箱唯一校验
- 用户登录：支持用户名或邮箱登录
- 密码安全：使用 Node 内置 `scrypt` 加密存储
- 会话管理：使用 `HttpOnly` Cookie 保存登录态
- 登录保护：带基础限流和同源校验
- 论坛发帖：登录后可发布帖子，内容写入 SQLite

## 运行方式

1. 复制环境变量模板

```powershell
Copy-Item .env.example .env
```

2. 修改 `.env` 中的 `SESSION_SECRET`

3. 启动项目

```powershell
node server.js
```

4. 打开浏览器访问

```text
http://localhost:3000
```

## GitHub 提交建议

- 可以提交前端页面、`public/assets/`、`server.js`、`package.json`、`README.md`
- 不要提交 `.env`
- 不要提交 `data/` 目录下的真实数据库文件

## 默认技术方案

- 前端：原生 HTML / CSS / JavaScript
- 后端：Node.js 原生 `http` 服务
- 数据库：Node 内置 `sqlite`
- 认证：服务端会话 + Cookie

## 目录结构

```text
Ancient-Architecture/
├─ public/
│  ├─ pages/        # 前端页面
│  └─ assets/
│     ├─ css/       # 样式文件
│     └─ js/        # 前端脚本
├─ data/            # 本地数据库
├─ server.js        # 后端入口
└─ README.md
```
