function setMessage(target, message, type = "error") {
  target.textContent = message;
  target.className = `message-bar show ${type}`;
}

function clearMessage(target) {
  target.textContent = "";
  target.className = "message-bar";
}

function switchPanel(mode) {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authTab === mode);
  });

  document.querySelectorAll("[data-auth-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.authPanel === mode);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = await loadCurrentUser();
  if (currentUser) {
    window.location.href = "/forum.html";
    return;
  }

  const loginMessage = document.querySelector("#loginMessage");
  const registerMessage = document.querySelector("#registerMessage");
  const loginForm = document.querySelector("#loginForm");
  const registerForm = document.querySelector("#registerForm");

  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => switchPanel(button.dataset.authTab));
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(loginMessage);

    const formData = new FormData(loginForm);
    const payload = {
      account: String(formData.get("account") || "").trim(),
      password: String(formData.get("password") || "")
    };

    try {
      const data = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setMessage(loginMessage, data.message, "success");
      setTimeout(() => {
        window.location.href = "/forum.html";
      }, 700);
    } catch (error) {
      setMessage(loginMessage, error.message);
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessage(registerMessage);

    const formData = new FormData(registerForm);
    const payload = {
      username: String(formData.get("username") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || ""),
      confirmPassword: String(formData.get("confirmPassword") || "")
    };

    try {
      const data = await apiFetch("/api/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      registerForm.reset();
      setMessage(registerMessage, data.message, "success");
      switchPanel("login");
    } catch (error) {
      setMessage(registerMessage, error.message);
    }
  });
});
