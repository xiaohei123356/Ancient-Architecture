const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { DatabaseSync } = require("node:sqlite");

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const PAGES_DIR = path.join(PUBLIC_DIR, "pages");
const DATA_DIR = path.join(ROOT_DIR, "data");
const DB_PATH = path.join(DATA_DIR, "app.db");
const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-only-secret-change-before-production";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const LOGIN_WINDOW_MS = 1000 * 60 * 10;
const LOGIN_MAX_ATTEMPTS = 5;
const scryptAsync = promisify(crypto.scrypt);
const loginAttempts = new Map();

loadEnvFile();

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
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
      "img-src 'self' https://images.unsplash.com data:",
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

    db.prepare("INSERT INTO posts (user_id, content) VALUES (?, ?)").run(user.id, content);
    sendJson(res, 201, { ok: true, message: "发布成功。" });
    return;
  }

  sendJson(res, 404, { ok: false, message: "接口不存在。" });
}

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
  db.prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)").run(
    username,
    email,
    passwordHash
  );

  sendJson(res, 201, { ok: true, message: "注册成功，请使用新账号登录。" });
}

async function handleLogin(req, body, res) {
  const account = String(body.account || "").trim().toLowerCase();
  const password = String(body.password || "");
  const limiterKey = `${getClientIp(req)}:${account}`;

  if (!account || !password) {
    sendJson(res, 400, { ok: false, message: "请输入账号和密码。" });
    return;
  }

  if (!checkRateLimit(limiterKey)) {
    sendJson(res, 429, { ok: false, message: "尝试次数过多，请 10 分钟后再试。" });
    return;
  }

  const user = db
    .prepare("SELECT id, username, email, password_hash FROM users WHERE lower(username) = ? OR lower(email) = ?")
    .get(account, account);

  if (!user) {
    registerFailedAttempt(limiterKey);
    sendJson(res, 401, { ok: false, message: "账号或密码错误。" });
    return;
  }

  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    registerFailedAttempt(limiterKey);
    sendJson(res, 401, { ok: false, message: "账号或密码错误。" });
    return;
  }

  clearFailedAttempts(limiterKey);

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  db.prepare("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)").run(
    user.id,
    tokenHash,
    expiresAt
  );
  db.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);

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
