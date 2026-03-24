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
