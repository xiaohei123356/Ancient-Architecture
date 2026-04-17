/**
 * 【大木作导航系统】 - 统一管理全站登录状态与身份分流
 */
async function syncNavigationState() {
    console.log("🛠️ [身份核验] 正在从后端同步真实身份...");
    const nav = document.querySelector('nav');
    if (!nav) return;

    // 获取 EN 按钮位置
    const enBtn = document.getElementById('translateBtn');

    try {
        const response = await fetch('/api/me', { credentials: 'same-origin' });
        const data = await response.json();

        // 清理旧的动态按钮（只删除动态添加的，保留原有的导航链接）
        const links = nav.querySelectorAll('a');
        links.forEach(link => {
            const text = link.textContent || "";
            // 只删除包含这些关键词的链接（动态添加的）
            if (text === '登录' || text === 'Login' || 
                text.includes('小筑') || text.includes('总控台') || 
                text.includes('退出') || text.includes('Logout') ||
                text.includes('My Profile') || text.includes('Admin Panel')) {
                link.remove();
            }
        });

        // 没登录的情况
        if (!response.ok || !data.user) {
            console.log("⚠️ [身份核验] 未登录");
            localStorage.removeItem('currentGujianUser');
            
            const loginBtn = document.createElement('a');
            loginBtn.href = 'login.html';
            loginBtn.textContent = '登录';
            loginBtn.setAttribute('data-i18n', 'nav_login');
            
            if (enBtn) {
                nav.insertBefore(loginBtn, enBtn);
            } else {
                nav.appendChild(loginBtn);
            }
            
            if (window.registerDynamicElement) {
                window.registerDynamicElement(loginBtn, 'nav_login');
            }
            return;
        }

        // 已登录
        const username = data.user.username;
        const isAdmin = username.toLowerCase() === 'admin';
        console.log(`✅ [身份核验] 欢迎 ${username}`);
        localStorage.setItem('currentGujianUser', username);

        // 创建个人/管理入口
        const userLink = document.createElement('a');
        userLink.href = isAdmin ? 'admin.html' : 'profile.html';
        userLink.style.textDecoration = 'none';
        userLink.style.fontWeight = 'bold';
        userLink.style.marginLeft = '30px';
        userLink.style.color = isAdmin ? '#8c222c' : '#1a1a1a';
        userLink.textContent = isAdmin ? '总控台 (admin)' : `个人小筑 (${username})`;
        userLink.setAttribute('data-i18n', isAdmin ? 'nav_admin' : 'nav_profile');

        // 创建退出按钮
        const logoutBtn = document.createElement('a');
        logoutBtn.href = 'javascript:void(0)';
        logoutBtn.textContent = '退出';
        logoutBtn.style.textDecoration = 'none';
        logoutBtn.style.color = '#666';
        logoutBtn.style.marginLeft = '20px';
        logoutBtn.style.fontWeight = 'bold';
        logoutBtn.style.cursor = 'pointer';
        logoutBtn.setAttribute('data-i18n', 'nav_logout');
        logoutBtn.id = 'global-logout';
        logoutBtn.addEventListener('click', handleGlobalLogout);

        // 插入到 EN 按钮前面
        if (enBtn) {
            nav.insertBefore(userLink, enBtn);
            nav.insertBefore(logoutBtn, enBtn);
        } else {
            nav.appendChild(userLink);
            nav.appendChild(logoutBtn);
        }

        // 注册到翻译系统
        if (window.registerDynamicElement) {
            window.registerDynamicElement(userLink, isAdmin ? 'nav_admin' : 'nav_profile');
            window.registerDynamicElement(logoutBtn, 'nav_logout');
        }

    } catch (error) {
        console.error('❌ [身份核验] 失败：', error);
    }
}

/**
 * 全局退出逻辑
 */
async function handleGlobalLogout() {
    if (confirm("匠师确定要推门而出，暂别这营造世界吗？")) {
        localStorage.removeItem('currentGujianUser');
        try {
            await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
        } finally {
            alert("已成功退隐。");
            window.location.href = 'index.html';
        }
    }
}

// 页面加载时运行
document.addEventListener('DOMContentLoaded', syncNavigationState);