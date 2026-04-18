/**
 * 【大木作导航系统】 - 清爽版
 */

// 1. 初次加载时，检查语言并贴上排版标签
function syncLanguageStyle() {
    const currentLang = localStorage.getItem('preferred_language') || 'zh';
    if (currentLang === 'en') {
        document.body.classList.add('lang-en');
    } else {
        document.body.classList.remove('lang-en');
    }
}

// 2. 自动识别当前页面并高亮
function highlightCurrentNav() {
    let currentPath = window.location.pathname.split('/').pop();
    if (currentPath === '' || currentPath === '/') currentPath = 'index.html';

    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) link.classList.add('active');
    });
}

// 3. 同步登录状态与动态按钮
async function syncNavigationState() {
    const nav = document.querySelector('nav');
    if (!nav) return;
    const enBtn = document.getElementById('translateBtn');

    try {
        const response = await fetch('/api/me', { credentials: 'same-origin' });
        const data = await response.json();

        // 清理旧按钮
        nav.querySelectorAll('a').forEach(link => {
            const text = link.textContent || "";
            if (text === '登录' || text === 'Login' || text.includes('小筑') || text.includes('退出')) link.remove();
        });

        if (!response.ok || !data.user) {
            localStorage.removeItem('currentGujianUser');
            const loginBtn = document.createElement('a');
            loginBtn.href = 'login.html';
            loginBtn.textContent = '登录';
            loginBtn.setAttribute('data-i18n', 'nav_login');
            if (enBtn) nav.insertBefore(loginBtn, enBtn);
            else nav.appendChild(loginBtn);
            if (window.registerDynamicElement) window.registerDynamicElement(loginBtn, 'nav_login');
            return;
        }

        // 已登录
        const username = data.user.username;
        const isAdmin = username.toLowerCase() === 'admin';
        localStorage.setItem('currentGujianUser', username);

        const userLink = document.createElement('a');
        userLink.href = isAdmin ? 'admin.html' : 'profile.html';
        userLink.style.fontWeight = 'bold';
        userLink.style.marginLeft = '30px';
        userLink.style.color = isAdmin ? '#8c222c' : '#1a1a1a';
        userLink.textContent = isAdmin ? '总控台 (admin)' : `个人小筑 (${username})`;
        userLink.setAttribute('data-i18n', isAdmin ? 'nav_admin' : 'nav_profile');

        const logoutBtn = document.createElement('a');
        logoutBtn.href = 'javascript:void(0)';
        logoutBtn.textContent = '退出';
        logoutBtn.style.marginLeft = '20px';
        logoutBtn.style.fontWeight = 'bold';
        logoutBtn.style.cursor = 'pointer';
        logoutBtn.setAttribute('data-i18n', 'nav_logout');
        logoutBtn.addEventListener('click', handleGlobalLogout);

        if (enBtn) {
            nav.insertBefore(userLink, enBtn);
            nav.insertBefore(logoutBtn, enBtn);
        } else {
            nav.appendChild(userLink);
            nav.appendChild(logoutBtn);
        }

        if (window.registerDynamicElement) {
            window.registerDynamicElement(userLink, isAdmin ? 'nav_admin' : 'nav_profile');
            window.registerDynamicElement(logoutBtn, 'nav_logout');
        }

        highlightCurrentNav();
    } catch (error) {
        console.error('❌ [身份核验] 失败：', error);
    }
}

// 4. 全局退出
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

// 5. 页面初次加载时启动
document.addEventListener('DOMContentLoaded', () => {
    syncLanguageStyle();
    highlightCurrentNav();
    syncNavigationState();
});