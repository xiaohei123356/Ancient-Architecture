async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "请求失败，请稍后再试。");
  }

  return data;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

async function loadCurrentUser() {
  try {
    const data = await apiFetch("/api/me", { method: "GET", headers: {} });
    updateAuthUI(data.user);
    return data.user;
  } catch {
    updateAuthUI(null);
    return null;
  }
}

function updateAuthUI(user) {
  const authSlot = document.querySelector("[data-auth-slot]");
  if (!authSlot) {
    return;
  }

  if (user) {
    authSlot.innerHTML = `
      <span class="nav-user">你好，${escapeHtml(user.username)}</span>
      <button type="button" class="nav-logout" data-logout-btn>退出</button>
    `;

    const logoutBtn = authSlot.querySelector("[data-logout-btn]");
    logoutBtn.addEventListener("click", async () => {
      try {
        await apiFetch("/api/logout", { method: "POST", body: "{}" });
      } finally {
        window.location.href = "/login.html";
      }
    });
    return;
  }

  authSlot.innerHTML = `<a href="/login.html">注册 / 登录</a>`;
}

document.addEventListener("DOMContentLoaded", () => {
  loadCurrentUser();
});
