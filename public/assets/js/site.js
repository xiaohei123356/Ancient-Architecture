/**
 * 【大木作导航系统】 - 统一管理全站登录状态与身份分流
 */
async function syncNavigationState() {
    console.log("🛠️ [身份核验] 正在从后端同步真实身份...");
    const nav = document.querySelector('nav');
    const navArea = document.getElementById('nav-user-area');
    if (!nav && !navArea) return;

    try {
        // 1. 核心：只从服务器获取真实状态，不迷信 localStorage
        const response = await fetch('/api/me', { credentials: 'same-origin' });
        const data = await response.json();
        
        // 2. 清理现场：把旧的“登录”、“个人小筑”、“总控台”、“退出”按钮全推平
        const cleanOldButtons = (container) => {
            if (!container) return;
            const links = container.querySelectorAll('a');
            links.forEach(link => {
                const text = link.textContent || "";
                if (text.includes('登录') || text.includes('小筑') || text.includes('总控台') || text.includes('退出')) {
                    link.remove();
                }
            });
        };
        cleanOldButtons(nav);
        cleanOldButtons(navArea);

        // 3. 没登录或通行证过期的情况
        if (!response.ok || !data.user) {
            console.log("⚠️ [身份核验] 未检测到有效登录。");
            localStorage.removeItem('currentGujianUser'); // 顺手清理过期的本地缓存
            const loginBtn = `<a href="login.html" style="font-weight: bold; text-decoration: none;">登录</a>`;
            if (navArea) navArea.innerHTML = loginBtn;
            else if (nav) nav.insertAdjacentHTML('beforeend', loginBtn);
            return;
        }

        // 4. 确认身份：你是 admin 还是普通匠师？
        const username = data.user.username;
        const isAdmin = username.toLowerCase() === 'admin';
        console.log(`✅ [身份核验] 欢迎归来，${isAdmin ? '大木作' : '匠师'} ${username}`);

        // 5. 动态构建导航组件
        const portalLink = isAdmin 
            ? `<a href="admin.html" style="color: #8c222c; font-weight: bold; text-decoration: none;">总控台 (admin)</a>`
            : `<a href="profile.html" style="color: #1a1a1a; font-weight: bold; text-decoration: none;">个人小筑 (${username})</a>`;
        
        const logoutBtn = `<a href="javascript:void(0);" id="global-logout" style="color: #666; text-decoration: none; margin-left: 20px; font-weight: bold; cursor: pointer;">退出</a>`;

        // 6. 渲染到页面
        if (navArea) {
            navArea.innerHTML = portalLink + logoutBtn;
        } else {
            nav.insertAdjacentHTML('beforeend', portalLink);
            nav.insertAdjacentHTML('beforeend', logoutBtn);
        }

        // 7. 绑定唯一的退出逻辑
        document.getElementById('global-logout').addEventListener('click', handleGlobalLogout);

    } catch (error) {
        console.error('❌ [身份核验] 同步失败：', error);
    }
}

/**
 * 全局统一退出逻辑
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

// 页面加载完毕，只运行这一个“大脑”
document.addEventListener('DOMContentLoaded', syncNavigationState);
