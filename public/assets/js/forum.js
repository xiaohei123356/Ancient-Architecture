function renderPosts(posts) {
  const list = document.querySelector("#postList");
  const empty = document.querySelector("#postEmpty");

  if (!posts.length) {
    list.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  list.innerHTML = posts
    .map(
      (post) => `
        <article class="post-card">
          <div class="post-meta">
            <strong>${escapeHtml(post.username)}</strong>
            <span>${escapeHtml(formatDateTime(post.created_at))}</span>
          </div>
          <p>${escapeHtml(post.content)}</p>
        </article>
      `
    )
    .join("");
}

function setComposerState(user) {
  const status = document.querySelector("#composerStatus");
  const submitButton = document.querySelector("#publishButton");
  const textarea = document.querySelector("#contentInput");

  if (user) {
    status.textContent = `当前以 ${user.username} 的身份发布内容。`;
    submitButton.disabled = false;
    textarea.disabled = false;
    textarea.placeholder = "写下你对古建筑结构、保护策略或数字化展示的想法。";
    return;
  }

  status.innerHTML = `请先 <a href="/login.html">注册或登录</a> 后再发帖。`;
  submitButton.disabled = true;
  textarea.disabled = true;
  textarea.placeholder = "登录后可发布帖子。";
}

function setFeedMessage(message, type = "error") {
  const bar = document.querySelector("#forumMessage");
  bar.textContent = message;
  bar.className = `message-bar show ${type}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = await loadCurrentUser();
  setComposerState(user);

  async function loadPosts() {
    const data = await apiFetch("/api/posts", { method: "GET", headers: {} });
    renderPosts(data.posts || []);
  }

  await loadPosts();

  const form = document.querySelector("#postForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = document.querySelector("#contentInput").value.trim();
    if (!content) {
      setFeedMessage("请输入帖子内容。");
      return;
    }

    try {
      await apiFetch("/api/posts", {
        method: "POST",
        body: JSON.stringify({ content })
      });
      form.reset();
      setFeedMessage("发布成功，帖子已加入讨论区。", "success");
      await loadPosts();
    } catch (error) {
      setFeedMessage(error.message);
    }
  });
});
