// ================= 使用手册 =================
(function() {
    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initManual);
    } else {
        initManual();
    }
    
    function initManual() {
        // 避免重复添加
        if (document.getElementById('manualBtn')) return;
        
        // 创建手册按钮的 HTML
        const manualHTML = `
            <div class="manual-btn" id="manualBtn">
                <div class="manual-icon">📖</div>
                <div class="manual-tooltip">营 造 指 津</div>
            </div>
        `;
        
        // 创建弹窗的 HTML
        const modalHTML = `
            <div class="manual-modal" id="manualModal">
                <div class="manual-content">
                    <div class="manual-header">
                        <h3>📜 营 造 指 津</h3>
                        <span class="manual-close" id="manualClose">&times;</span>
                    </div>
                    <div class="manual-body">
                        <div class="manual-section">
                            <h4>🏛️ 卷 首 语</h4>
                            <p>欢迎来到「古建智传」—— 一座藏于指尖的木构殿堂。此处以木为骨、以石为基，邀您共探中华营造智慧。</p>
                        </div>
                        <div class="manual-section">
                            <h4>📖 第 一 步 · 入 园</h4>
                            <p>点击右上角「登录」，可使用邮箱注册新账号，或直接登录已有账号。</p>
                            <p>管理员账号可进入「总控台」审核用户留言与投稿内容。</p>
                        </div>
                        <div class="manual-section">
                            <h4>🗺️ 第 二 步 · 游 园</h4>
                            <ul>
                                <li><strong>首页</strong> —— 滑动阅览四大篇章，点击卡片可展开详细图鉴。</li>
                                <li><strong>营造索引</strong> —— 按分类检索古建筑，点击卡片可查看详情与百科链接。</li>
                                <li><strong>与匠对谈</strong> —— 向 AI 匠师提问古建相关问题，实时获得解答。</li>
                                <li><strong>梁间集语</strong> —— 发布帖子、点赞、回复探讨，与同好交流。</li>
                                <li><strong>个人小筑</strong> —— 登录后可编辑个人资料与简介。</li>
                            </ul>
                        </div>
                        <div class="manual-section">
                            <h4>🎵 第 三 步 · 聆 音</h4>
                            <p>右下角「音乐」按钮可播放/暂停背景音乐，再次点击切换状态。</p>
                        </div>
                        <div class="manual-section">
                            <h4>🌐 第 四 步 · 译 言</h4>
                            <p>点击导航栏「EN」按钮，可一键切换中英文界面，方便不同语言使用者。</p>
                        </div>
                        <div class="manual-section">
                            <h4>📝 卷 尾</h4>
                            <p>如遇问题或建议，欢迎在「梁间集语」发帖反馈。愿您在此寻得一份古建之趣。</p>
                        </div>
                    </div>
                    <div class="manual-footer">
                        <p>古建智传 · 木骨丹青 营造千秋</p>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', manualHTML);
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 绑定事件
        const modal = document.getElementById('manualModal');
        const openBtn = document.getElementById('manualBtn');
        const closeBtn = document.getElementById('manualClose');
        
        if (openBtn && modal) {
            openBtn.addEventListener('click', function() {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            });
        }
        
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', function() {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            });
        }
        
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            });
        }
    }
})();