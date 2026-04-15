async function loadNavigationAuthState() {
    console.log("🛠️ [身份核验] 脚本开始运行...");
    const nav = document.querySelector('nav');
    if (!nav) {
        console.log("❌ [身份核验] 找不到导航栏 <nav>！");
        return;
    }

    try {
        console.log("📡 [身份核验] 正在向后端出示通行证...");
        const response = await fetch('/api/me', { credentials: 'same-origin' });
        const data = await response.json();
        console.log("📦 [身份核验] 后端返回的真实身份：", data);
        
        // 推土机：清理旧按钮
        const links = nav.querySelectorAll('a');
        links.forEach(link => {
            const text = link.textContent || "";
            if (text.includes('登录') || text.includes('小筑') || text.includes('总控台') || text.includes('退出')) {
                link.remove();
            }
        });
        const navUserArea = document.getElementById('nav-user-area');
        if (navUserArea) navUserArea.remove();

        // 没登录的情况
        if (!response.ok || !data.user) {
            console.log("⚠️ [身份核验] 未登录或失效，挂载【登录】按钮");
            localStorage.removeItem('currentGujianUser'); 
            const loginBtn = document.createElement('a');
            loginBtn.href = 'login.html';
            loginBtn.textContent = '登录';
            nav.appendChild(loginBtn);
            return;
        }

        console.log(`✅ [身份核验] 恭喜！确认为【${data.user.username}】，准备开启传送门！`);
        
        // 登录成功的情况
        const userBadge = document.createElement('a');
        userBadge.className = 'serif-text';
        userBadge.style = 'text-decoration: none; font-weight: bold; margin-left: 30px; transition: color 0.3s;';
        
        if (data.user.username.toLowerCase() === 'admin') {
            userBadge.href = 'admin.html';
            userBadge.style.color = '#8c222c'; 
            userBadge.textContent = '总控台 (admin)';
        } else {
            userBadge.href = 'profile.html';
            userBadge.style.color = '#1a1a1a';
            userBadge.textContent = `个人小筑 (${data.user.username})`;
        }

        const logoutLink = document.createElement('a');
        logoutLink.href = 'javascript:void(0)';
        logoutLink.style = 'text-decoration: none; color: #666; margin-left: 20px; font-weight: bold; cursor: pointer;';
        logoutLink.textContent = '退出';
        
        logoutLink.addEventListener('click', async function(event) {
            event.preventDefault();
            if(confirm("匠师确定要退隐吗？")) {
                localStorage.removeItem('currentGujianUser');
                try {
                    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
                } finally {
                    window.location.href = 'index.html';
                }
            }
        });

        nav.appendChild(userBadge);
        nav.appendChild(logoutLink);

    } catch (error) {
        console.error('❌ [身份核验] 彻底失败：', error);
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