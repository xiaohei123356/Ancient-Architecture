// ================= 全局音乐控件 =================
(function() {
    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMusic);
    } else {
        initMusic();
    }
    
    function initMusic() {
        // 避免重复添加
        if (document.getElementById('musicPlayer')) return;
        
        // 创建音乐控件的 HTML
        const musicHTML = `
            <div class="music-player" id="musicPlayer">
                <div class="music-btn" id="musicBtn">
                    <div class="music-icon">🎵</div>
                </div>
                <div class="music-tooltip" id="musicTooltip">奏 乐</div>
                <audio id="bgMusic" src="/assets/audio/清平乐(国家宝藏).mp3" loop preload="auto"></audio>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', musicHTML);
        
        const musicBtn = document.getElementById('musicBtn');
        const musicTooltip = document.getElementById('musicTooltip');
        const audio = document.getElementById('bgMusic');
        
        // 读取上次的播放状态
        let isPlaying = localStorage.getItem('musicPlaying') === 'true';
        
        if (isPlaying) {
            musicBtn.classList.add('playing');
            musicTooltip.textContent = '静 音';
        }
        
        // 尝试自动播放
        function tryAutoPlay() {
            if (isPlaying) {
                audio.play().catch(function() {
                    musicBtn.classList.remove('playing');
                    musicTooltip.textContent = '奏 乐';
                    isPlaying = false;
                    localStorage.setItem('musicPlaying', 'false');
                });
            }
        }
        
        // 点击切换播放/暂停
        function toggleMusic() {
            if (audio.paused) {
                audio.play().then(function() {
                    musicBtn.classList.add('playing');
                    musicTooltip.textContent = '静 音';
                    isPlaying = true;
                    localStorage.setItem('musicPlaying', 'true');
                }).catch(function(e) {
                    console.log('播放失败:', e);
                });
            } else {
                audio.pause();
                musicBtn.classList.remove('playing');
                musicTooltip.textContent = '奏 乐';
                isPlaying = false;
                localStorage.setItem('musicPlaying', 'false');
            }
        }
        
        if (musicBtn) {
            musicBtn.addEventListener('click', toggleMusic);
        }
        
        // 用户首次点击页面时尝试自动播放
        document.addEventListener('click', function once() {
            tryAutoPlay();
            document.removeEventListener('click', once);
        });
    }
})();