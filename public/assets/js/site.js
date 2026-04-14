async function loadNavigationAuthState() {
    const loginLink = document.querySelector('nav a[href="login.html"]');
    if (!loginLink) {
        return;
    }

    try {
        const response = await fetch('/api/me', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        if (!response.ok || !data.user) {
            return;
        }

        const userBadge = document.createElement('span');
        userBadge.className = 'nav-user';
        const userLabel = document.createElement('span');
        userLabel.className = 'nav-user-label';
        userLabel.textContent = '已登录';
        const userName = document.createElement('span');
        userName.className = 'nav-user-name';
        userName.textContent = data.user.username;
        userBadge.append(userLabel, userName);
        loginLink.replaceWith(userBadge);

        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.textContent = '退出';
        logoutLink.addEventListener('click', async function(event) {
            event.preventDefault();

            try {
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: '{}',
                    credentials: 'same-origin'
                });
            } finally {
                window.location.href = 'index.html';
            }
        });

        userBadge.insertAdjacentElement('afterend', logoutLink);
    } catch (error) {
        console.error('加载登录状态失败', error);
    }
}

document.addEventListener('DOMContentLoaded', loadNavigationAuthState);

// 页面加载完成后，立刻检查登录状态并渲染导航栏
document.addEventListener('DOMContentLoaded', function() {
    renderUserNav();
});

function renderUserNav() {
    const navArea = document.getElementById('nav-user-area');
    if (!navArea) return; // 如果当前页面没有这个盒子，就跳过

    // 尝试从浏览器缓存中读取当前登录的用户名
    const currentUser = localStorage.getItem('currentGujianUser');

    if (currentUser) {
        // 状态：已登录 -> 显示个人小筑和退出
        navArea.innerHTML = `
            <a href="profile.html" style="color: #8b1818; font-weight: bold; text-decoration: none;">个人小筑 (${currentUser})</a>
            <a href="javascript:void(0);" onclick="handleLogout()" style="color: #666; text-decoration: none; font-size: 15px; font-weight: bold;">退出</a>
        `;
    } else {
        // 状态：未登录 -> 只显示登录按钮
        navArea.innerHTML = `
            <a href="login.html" style="color: #333; text-decoration: none; font-weight: bold; font-size: 15px;">登录</a>
        `;
    }
}

/* =========================================
   全局账户状态管理 (登录、显示、退出)
========================================= */

// 1. 页面加载完毕后，立刻执行渲染导航栏的动作
document.addEventListener('DOMContentLoaded', function() {
    renderUserNav();
});

// 2. 检查身份并渲染导航栏
function renderUserNav() {
    const navArea = document.getElementById('nav-user-area');
    if (!navArea) return; // 如果当前页面没有这个坑位（比如 profile 页面），就安全跳过

    // 尝试去浏览器的记忆库里找“通行证”
    const currentUser = localStorage.getItem('currentGujianUser');

    if (currentUser) {
        // 如果有通行证 -> 渲染个人小筑和退出
        navArea.innerHTML = `
            <a href="profile.html" style="color: #8b1818; font-weight: bold; text-decoration: none;">个人小筑 (${currentUser})</a>
            <a href="javascript:void(0);" onclick="handleLogout()" style="color: #666; text-decoration: none; font-size: 15px; font-weight: bold; cursor: pointer;">退出</a>
        `;
    } else {
        // 如果没有通行证 -> 只渲染登录按钮
        navArea.innerHTML = `
            <a href="login.html" style="color: #333; text-decoration: none; font-weight: bold; font-size: 15px;">登录</a>
        `;
    }
}

// 全局通用退出逻辑
function handleLogout() {
    const confirmLogout = confirm("匠师确定要推门而出，暂别这营造世界吗？");
    if (confirmLogout) {
        // 1. 撕毁浏览器的通行证
        localStorage.removeItem('currentGujianUser');
        // 2. 提示退隐
        alert("已成功退隐。");
        // 3. 【核心修复】强制返回首页，而不是登录页
        window.location.href = 'index.html'; 
    }
}