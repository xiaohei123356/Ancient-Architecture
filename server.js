require('dotenv').config();

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { DatabaseSync } = require("node:sqlite");

const nodemailer = require('nodemailer');
// 用来临时存储验证码的“小本本”：键是邮箱，值是验证码
const verificationCodes = new Map();
// 创建邮件发送器
const transporter = nodemailer.createTransport({
  service: 'qq',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const PAGES_DIR = path.join(PUBLIC_DIR, "pages");
const DATA_DIR = path.join(ROOT_DIR, "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

loadEnvFile();

const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-only-secret-change-before-production";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const LOGIN_WINDOW_MS = 1000 * 60 * 10;
const LOGIN_MAX_ATTEMPTS = 5;
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || "";
const DASHSCOPE_API_URL =
  process.env.DASHSCOPE_API_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const DASHSCOPE_MODEL = process.env.DASHSCOPE_MODEL || "qwen-plus";
const CHAT_HISTORY_LIMIT = 12;
const CHAT_SYSTEM_PROMPT =
  process.env.CHAT_SYSTEM_PROMPT ||
  [
    "你是一位熟悉中国古代建筑、传统营造技艺与土木结构的匠师型讲解员。",
    "请用典雅但通俗的中文回答，优先结合古建筑结构、材料、受力、施工和文化背景来解释。",
    "回答保持准确、清晰、有启发性，避免空泛套话。",
    "当用户问题过于模糊时，先基于常见场景给出回答，再顺带指出可以继续追问的方向。"
  ].join("");
const scryptAsync = promisify(crypto.scrypt);
const loginAttempts = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours')),
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours')),
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', '+8 hours')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

seedPosts();

const server = http.createServer(async (req, res) => {
  try {
    applySecurityHeaders(res);
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      await handleApiRequest(req, res, url);
      return;
    }

    serveStaticFile(url.pathname, res);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    const message =
      statusCode >= 500 ? "服务器内部错误，请稍后再试。" : error.message || "请求处理失败。";
    sendJson(res, statusCode, { ok: false, message });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 古建匠师助手启动成功！`);
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log(`🤖 当前模型: ${DASHSCOPE_MODEL}`);
  console.log(`🔒 运行模式: ${process.env.NODE_ENV === 'production' ? '生产环境' : '开发调试'}`);
  console.log(`=========================================\n`);
});

function loadEnvFile() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // 修改这里：增加 * 允许所有来源的图片，确保本地和外链都能显示
      "img-src 'self' data: *", 
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join("; ")
  );
}

async function handleApiRequest(req, res, url) {
  if (url.pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/me" && req.method === "GET") {
    const session = getSessionUser(req);
    sendJson(res, 200, {
      ok: true,
      authenticated: Boolean(session),
      user: session ? { id: session.id, username: session.username, email: session.email } : null
    });
    return;
  }

  if (url.pathname === "/api/chat" && req.method === "POST") {
    ensureSameOrigin(req);
    const body = await parseJsonBody(req);
    await handleChat(body, res);
    return;
  }

  if (url.pathname === "/api/chat/stream" && req.method === "POST") {
    ensureSameOrigin(req);
    const body = await parseJsonBody(req);
    await handleChatStream(body, res);
    return;
  }

  if (url.pathname === "/api/register" && req.method === "POST") {
    ensureSameOrigin(req);
    const body = await parseJsonBody(req);
    await handleRegister(body, res);
    return;
  }

  if (url.pathname === "/api/login" && req.method === "POST") {
    ensureSameOrigin(req);
    const body = await parseJsonBody(req);
    await handleLogin(req, body, res);
    return;
  }

  if (url.pathname === "/api/logout" && req.method === "POST") {
    ensureSameOrigin(req);
    handleLogout(req, res);
    return;
  }

  if (url.pathname === "/api/posts" && req.method === "GET") {
    const posts = db.prepare(`
      SELECT posts.id, posts.content, posts.created_at, users.username
      FROM posts
      JOIN users ON users.id = posts.user_id
      ORDER BY posts.id DESC
      LIMIT 50
    `).all();

    sendJson(res, 200, { ok: true, posts });
    return;
  }

  if (url.pathname === "/api/posts" && req.method === "POST") {
    ensureSameOrigin(req);
    const user = getSessionUser(req);
    if (!user) {
      sendJson(res, 401, { ok: false, message: "请先登录后再发布内容。" });
      return;
    }

    const body = await parseJsonBody(req);
    const content = sanitizeText(body.content, 300);
    if (!content || content.length < 5) {
      sendJson(res, 400, { ok: false, message: "帖子内容至少需要 5 个字符。" });
      return;
    }

    db.prepare("INSERT INTO posts (user_id, content, created_at) VALUES (?, ?, ?)").run(
      user.id,
      content,
      beijingNow()
    );
    sendJson(res, 201, { ok: true, message: "发布成功。" });
    return;
  }
  

if (url.pathname === "/api/send-code" && req.method === "POST") {
    ensureSameOrigin(req);
    const body = await parseJsonBody(req);
    const email = body.email;

    if (!email) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "请提供邮箱地址" }));
      return;
    }

    // 1. 生成 6 位随机数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. 存进小本本，并设置 5 分钟后自动销毁（过期时间）
    verificationCodes.set(email, code);
    setTimeout(() => {
      if (verificationCodes.get(email) === code) {
        verificationCodes.delete(email);
      }
    }, 5 * 60 * 1000);

    // 3. 准备邮件内容
    const mailOptions = {
      from: process.env.EMAIL_USER, // 你的QQ邮箱
      to: email,                    // 用户的邮箱
      subject: '【古建匠师】登录验证码',
      text: `欢迎访问古建匠师平台！\n\n您的登录验证码是：${code}\n\n该验证码在 5 分钟内有效。如非本人操作，请忽略此邮件。`
    };

    // 4. 发送邮件
    try {
      await transporter.sendMail(mailOptions);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, message: "验证码已发送，请查收" }));
    } catch (error) {
      console.error("发送邮件失败:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "邮件发送失败，请稍后再试" }));
    }
    return;
  }

  sendJson(res, 404, { ok: false, message: "接口不存在。" });}


async function handleRegister(body, res) {
  const username = sanitizeUsername(body.username);
  const email = sanitizeEmail(body.email);
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!username || !email || !password || !confirmPassword) {
    sendJson(res, 400, { ok: false, message: "请完整填写注册信息。" });
    return;
  }

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    sendJson(res, 400, { ok: false, message: "用户名需为 3 到 20 位字母、数字或下划线。" });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    sendJson(res, 400, { ok: false, message: "请输入有效的邮箱地址。" });
    return;
  }

  if (password !== confirmPassword) {
    sendJson(res, 400, { ok: false, message: "两次输入的密码不一致。" });
    return;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    sendJson(res, 400, { ok: false, message: passwordError });
    return;
  }

  const existingUser = db
    .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
    .get(username, email);
  if (existingUser) {
    sendJson(res, 409, { ok: false, message: "用户名或邮箱已被注册。" });
    return;
  }

  const passwordHash = await hashPassword(password);
  db.prepare("INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)").run(
    username,
    email,
    passwordHash,
    beijingNow()
  );

  sendJson(res, 201, { ok: true, message: "注册成功，请使用新账号登录。" });
}

async function handleChat(body, res) {
  const message = sanitizeText(body.message, 500);
  if (!message) {
    sendJson(res, 400, { ok: false, message: "请输入你想请教的问题。" });
    return;
  }

  if (!DASHSCOPE_API_KEY) {
    sendJson(res, 500, { ok: false, message: "服务端未配置通义 API Key。" });
    return;
  }

  try {
    const reply = await requestDashScopeChat(message);
    sendJson(res, 200, { ok: true, reply });
  } catch (error) {
    console.error("DashScope chat request failed:", error);
    const statusCode = error.statusCode || 502;
    sendJson(res, statusCode, {
      ok: false,
      message: error.publicMessage || "暂时无法连接智能讲解服务，请稍后再试。"
    });
  }
}

async function requestDashScopeChat(userMessage) {
  const baseMessages = [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    { role: "user", content: userMessage }
  ];

  const firstPayload = await sendDashScopeRequest(baseMessages, 1200);
  let reply = extractAssistantText(firstPayload);
  if (!reply) {
    const error = new Error("Empty DashScope response");
    error.statusCode = 502;
    error.publicMessage = "智能讲解服务没有返回有效内容，请稍后再试。";
    throw error;
  }

  if (isTruncatedResponse(firstPayload)) {
    const continuationPayload = await sendDashScopeRequest(
      [
        ...baseMessages,
        { role: "assistant", content: reply },
        {
          role: "user",
          content: "请从上一句自然继续，把刚才未说完的内容补完整，不要重复前文。"
        }
      ],
      800
    );

    const continuation = extractAssistantText(continuationPayload);
    if (continuation) {
      reply = `${reply}\n\n${continuation}`.trim();
    }
  }

  return reply;
}

async function sendDashScopeRequest(messages, maxTokens) {
  const response = await fetch(DASHSCOPE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DASHSCOPE_MODEL,
      temperature: 0.7,
      max_tokens: maxTokens,
      messages
    })
  });

  const rawText = await response.text();
  let data = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error("DashScope API request failed");
    error.statusCode = response.status;
    error.publicMessage =
      data && typeof data.message === "string"
        ? `通义接口返回错误：${data.message}`
        : data?.error?.message
          ? `通义接口返回错误：${data.error.message}`
          : "智能讲解服务暂时不可用，请稍后再试。";
    throw error;
  }

  return data;
}

function isTruncatedResponse(payload) {
  const finishReason = payload?.choices?.[0]?.finish_reason;
  return finishReason === "length";
}

function extractAssistantText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part.text === "string") {
          return part.text;
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

async function handleChatStream(body, res) {
  const message = sanitizeText(body.message, 500);
  if (!message) {
    sendSseError(res, 400, "请输入你想请教的问题。");
    return;
  }

  if (!DASHSCOPE_API_KEY) {
    sendSseError(res, 500, "服务端未配置通义 API Key。");
    return;
  }

  const history = sanitizeHistory(body.history);

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });

  try {
    const fullText = await streamDashScopeChat(res, history, message);
    writeSseEvent(res, "done", { reply: fullText });
  } catch (error) {
    console.error("DashScope chat stream failed:", error);
    writeSseEvent(res, "error", {
      message: error.publicMessage || "暂时无法连接智能讲解服务，请稍后再试。"
    });
  } finally {
    res.end();
  }
}

async function streamDashScopeChat(res, history, userMessage) {
  const messages = buildChatMessages(history, userMessage);
  const firstPass = await sendDashScopeStreamRequest(res, messages, 1200);
  let fullText = firstPass.fullText.trim();

  if (!fullText) {
    const error = new Error("Empty DashScope stream response");
    error.statusCode = 502;
    error.publicMessage = "智能讲解服务没有返回有效内容，请稍后再试。";
    throw error;
  }

  if (firstPass.truncated) {
    writeSseEvent(res, "meta", { message: "内容较长，正在继续生成……" });
    const continuationPass = await sendDashScopeStreamRequest(
      res,
      [
        ...messages,
        { role: "assistant", content: fullText },
        {
          role: "user",
          content: "请从上一句自然继续，把刚才未说完的内容补完整，不要重复前文。"
        }
      ],
      800
    );

    if (continuationPass.fullText.trim()) {
      fullText = `${fullText}\n\n${continuationPass.fullText.trim()}`.trim();
    }
  }

  return fullText;
}

async function sendDashScopeStreamRequest(res, messages, maxTokens) {
  const response = await fetch(DASHSCOPE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DASHSCOPE_MODEL,
      temperature: 0.7,
      max_tokens: maxTokens,
      stream: true,
      messages
    })
  });

  if (!response.ok || !response.body) {
    const rawText = await response.text().catch(() => "");
    let data = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    const error = new Error("DashScope stream request failed");
    error.statusCode = response.status || 502;
    error.publicMessage =
      data && typeof data.message === "string"
        ? `通义接口返回错误：${data.message}`
        : data?.error?.message
          ? `通义接口返回错误：${data.error.message}`
          : "智能讲解服务暂时不可用，请稍后再试。";
    throw error;
  }

  const decoder = new TextDecoder("utf-8");
  const reader = response.body.getReader();
  let buffer = "";
  let fullText = "";
  let truncated = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    let separatorIndex = buffer.indexOf("\n\n");

    while (separatorIndex !== -1) {
      const eventBlock = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      processStreamEventBlock(eventBlock);
      separatorIndex = buffer.indexOf("\n\n");
    }
  }

  if (buffer.trim()) {
    processStreamEventBlock(buffer);
  }

  return { fullText, truncated };

  function processStreamEventBlock(block) {
    const dataText = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");

    if (!dataText || dataText === "[DONE]") {
      return;
    }

    let payload = null;
    try {
      payload = JSON.parse(dataText);
    } catch {
      return;
    }

    if (payload?.choices?.[0]?.finish_reason === "length") {
      truncated = true;
    }

    const deltaText = extractStreamDeltaText(payload);
    if (!deltaText) {
      return;
    }

    fullText += deltaText;
    writeSseEvent(res, "delta", { text: deltaText });
  }
}

function extractStreamDeltaText(payload) {
  const content = payload?.choices?.[0]?.delta?.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part.text === "string") {
          return part.text;
        }

        return "";
      })
      .join("");
  }

  return "";
}

function buildChatMessages(history, userMessage) {
  return [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userMessage }
  ];
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((item) => ({
      role: item && (item.role === "assistant" || item.role === "user") ? item.role : "",
      content: sanitizeText(item && item.content, 1200)
    }))
    .filter((item) => item.role && item.content)
    .slice(-CHAT_HISTORY_LIMIT);
}

function writeSseEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function sendSseError(res, statusCode, message) {
  res.writeHead(statusCode, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive"
  });
  writeSseEvent(res, "error", { message });
  res.end();
}

async function handleLogin(req, body, res) {
  const account = String(body.account || "").trim().toLowerCase();
  const password = String(body.password || "");
  const limiterKey = `${getClientIp(req)}:${account}`;

  // 1. 基础非空校验（登录只需账号和密码）
  if (!account || !password) {
    sendJson(res, 400, { ok: false, message: "请输入账号和密码。" });
    return;
  }

  // 2. 防爆破限流校验
  if (!checkRateLimit(limiterKey)) {
    sendJson(res, 429, { ok: false, message: "尝试次数过多，请 10 分钟后再试。" });
    return;
  }

  // 3. 数据库查询：支持用户名或邮箱登录
  const user = db
    .prepare("SELECT id, username, email, password_hash FROM users WHERE lower(username) = ? OR lower(email) = ?")
    .get(account, account);

  if (!user) {
    registerFailedAttempt(limiterKey);
    sendJson(res, 401, { ok: false, message: "账号或密码错误。" }); // 模糊提示，保护账号隐私
    return;
  }

  // 4. 校验密码
  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    registerFailedAttempt(limiterKey);
    sendJson(res, 401, { ok: false, message: "账号或密码错误。" });
    return;
  }

  // 5. 校验成功，清空失败记录
  clearFailedAttempts(limiterKey);

  // 6. 生成并记录 Session (保持你原本优秀的安全机制)
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  db.prepare("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)").run(
    user.id,
    tokenHash,
    expiresAt
  );
  db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(beijingNow(), user.id);

  // 7. 设置 Cookie 并返回成功信息
  setSessionCookie(res, rawToken, expiresAt);
  sendJson(res, 200, {
    ok: true,
    message: "登录成功。",
    user: { id: user.id, username: user.username, email: user.email }
  });
}

function handleLogout(req, res) {
  const cookies = parseCookies(req);
  const sessionToken = cookies.session_token;
  if (sessionToken) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashSessionToken(sessionToken));
  }

  clearSessionCookie(res);
  sendJson(res, 200, { ok: true, message: "已退出登录。" });
}

function getSessionUser(req) {
  const cookies = parseCookies(req);
  const sessionToken = cookies.session_token;
  if (!sessionToken) {
    return null;
  }

  const row = db
    .prepare(`
      SELECT users.id, users.username, users.email, sessions.expires_at
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?
    `)
    .get(hashSessionToken(sessionToken));

  if (!row) {
    return null;
  }

  if (Date.parse(row.expires_at) <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashSessionToken(sessionToken));
    return null;
  }

  return row;
}

function ensureSameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) {
    return;
  }

  const originUrl = new URL(origin);
  if (originUrl.host !== host) {
    const error = new Error("Origin not allowed");
    error.statusCode = 403;
    throw error;
  }
}

function serveStaticFile(requestPath, res) {
  const routeMap = new Map([
    ["/", path.join(PAGES_DIR, "index.html")],
    ["/index.html", path.join(PAGES_DIR, "index.html")],
    ["/login.html", path.join(PAGES_DIR, "login.html")],
    ["/forum.html", path.join(PAGES_DIR, "forum.html")],
    ["/search.html", path.join(PAGES_DIR, "search.html")],
    ["/chat.html", path.join(PAGES_DIR, "chat.html")]
  ]);

  let filePath = routeMap.get(requestPath);
  if (!filePath) {
    const relativePath = decodeURIComponent(requestPath);
    const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
    filePath = path.join(PUBLIC_DIR, safePath);
  }

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(res, 404, "Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const typeMap = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  };

  res.writeHead(200, { "Content-Type": typeMap[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Invalid JSON");
    error.statusCode = 400;
    throw error;
  }
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  return cookieHeader.split(";").reduce((acc, segment) => {
    const [key, ...value] = segment.trim().split("=");
    if (!key) {
      return acc;
    }

    acc[key] = decodeURIComponent(value.join("="));
    return acc;
  }, {});
}

function setSessionCookie(res, token, expiresAt) {
  const attributes = [
    `session_token=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${new Date(expiresAt).toUTCString()}`
  ];

  if (process.env.NODE_ENV === "production") {
    attributes.push("Secure");
  }

  res.setHeader("Set-Cookie", attributes.join("; "));
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    "session_token=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  );
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${Buffer.from(derivedKey).toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [saltHex, hashHex] = String(storedHash).split(":");
  if (!saltHex || !hashHex) {
    return false;
  }

  const derivedKey = await scryptAsync(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  const actual = Buffer.from(derivedKey);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function hashSessionToken(token) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(token).digest("hex");
}

function sanitizeUsername(value) {
  return String(value || "").trim();
}

function sanitizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function sanitizeText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function beijingNow() {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const beijingTime = new Date(utcTime + 8 * 60 * 60 * 1000);
  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(beijingTime.getUTCDate()).padStart(2, "0");
  const hours = String(beijingTime.getUTCHours()).padStart(2, "0");
  const minutes = String(beijingTime.getUTCMinutes()).padStart(2, "0");
  const seconds = String(beijingTime.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function validatePassword(password) {
  if (password.length < 8 || password.length > 64) {
    return "密码长度需要在 8 到 64 位之间。";
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return "密码需同时包含大写字母、小写字母和数字。";
  }

  return "";
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, content) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(content);
}

function getClientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown");
}

function checkRateLimit(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record) {
    return true;
  }

  if (now > record.resetAt) {
    loginAttempts.delete(key);
    return true;
  }

  return record.count < LOGIN_MAX_ATTEMPTS;
}

function registerFailedAttempt(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now > record.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }

  record.count += 1;
}

function clearFailedAttempts(key) {
  loginAttempts.delete(key);
}

function seedPosts() {
  const countRow = db.prepare("SELECT COUNT(*) AS count FROM posts").get();
  if (countRow.count > 0) {
    return;
  }

  const demoUser = db.prepare("SELECT id FROM users WHERE username = ?").get("heritage_admin");
  let userId = demoUser && demoUser.id;
  if (!userId) {
    userId = db
      .prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)")
      .run(
        "heritage_admin",
        "heritage@example.com",
        "seed-user-not-for-login"
      ).lastInsertRowid;
  }

  const insertPost = db.prepare("INSERT INTO posts (user_id, content) VALUES (?, ?)");
  insertPost.run(
    userId,
    "应县木塔的斗拱与木构受力关系非常值得细看，许多看似装饰性的细部，其实都承担了清晰的结构逻辑。"
  );
  insertPost.run(
    userId,
    "古建筑数字化不只是建模，更重要的是把年代、形制、工艺和保护记录组织成可以长期维护的知识库。"
  );
}

setInterval(() => {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
}, 1000 * 60 * 30).unref();
