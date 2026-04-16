// ================= 一键翻译功能（手动精修版）=================
(function() {
    const STORAGE_KEY = 'preferred_language';
    let currentLang = localStorage.getItem(STORAGE_KEY) || 'zh';
    
    // 英文翻译（包含所有页面的内容）
    const enTranslations = {
        // ========== 导航栏（所有页面共用）==========
        nav_home: "Home",
        nav_search: "Index",
        nav_chat: "Chat",
        nav_forum: "Forum",
        nav_login: "Login",
        
        // ========== Logo ==========
        logo: "Yingzao Fashi",
        
        // ========== 首页 Hero ==========
        hero_subtitle: "Masterpieces of Ancient Chinese Architecture",
        hero_title: "Timber & Spirit",
        hero_desc: "Wood as bone, stone as foundation. Between mortise and tenon,<br>lies the soul of mountains and rivers.",
        scroll_hint: "Scroll",
        poetic_quote: "Enter the gate, home is here<br>Sit beneath the wind-swept eaves",
        
        // ========== 首页四个章节 ==========
        chap1_title: "Wooden<br>Structure",
        chap1_desc: "No nails, yet withstanding immense force. No glue, yet lasting a millennium.<br><br>Ancient craftsmen turned mechanics into aesthetics, structure into poetry.<br><br>From the open-spandrel arch of Zhaozhou Bridge to the 54 types of bracket sets in Yingxian Wooden Pagoda, every load-bearing structure is a masterful dialogue with nature.",
        chap2_title: "Master<br>Craftsmen",
        chap2_desc: "They are not nameless artisans, but architectural masters remembered by history.<br><br>They measured heaven and earth with Luban's ruler, defined dynasties with scaled models and architectural drawings.<br><br>Today, we call out their names, inviting these giants to step out from the beams and columns, to receive the respect of future generations.",
        chap3_title: "Sacred<br>Texts",
        chap3_desc: "Wood decays, stone cracks. Only words allow architecture to transcend dynasties.<br><br>From the modular system of 'Yingzao Fashi' to the poetic vision of 'Yuan Ye', these works are not merely technical manuals.<br><br>They are manifestos of Eastern spatial aesthetics and philosophy.",
        chap4_title: "Harmony<br>with Nature",
        chap4_desc: "Chinese architecture never stands apart from nature.<br><br>It is spatial ethics, family order. The courtyard embraces the cycle of seasons.<br><br>The red walls carry the warmth of civilization and the laws of heaven and earth.",
        
        // ========== Chat 页面 ==========
        chat_title: "Chat with the Master",
        chat_subtitle: "A dialogue across centuries, exploring ancient architectural wisdom",
        chat_placeholder: "Ask a question, e.g., Why has Zhaozhou Bridge stood for a thousand years?",
        chat_send: "Send",
        
        // ========== Forum 页面 ==========
        forum_title: "Liangjian Jiyu",
        forum_subtitle: "Find like-minded friends, discuss ancient architecture, leave your words here",
        forum_form_title: "Leave Your Words",
        forum_author_label: "Pen Name",
        forum_author_placeholder: "What is your name?",
        forum_content_label: "Thoughts",
        forum_content_placeholder: "Write your insights or questions about ancient architecture here...",
        forum_submit: "Submit",
        
        // ========== Login 页面 ==========
        login_poetic_quote: "Enter the gate, home is here<br>Sit beneath the wind-swept eaves",
        login_title: "Enter the Hall",
        login_subtitle: "Vast archives · Inviting you to appreciate",
        register_title: "Form a Bond",
        register_subtitle: "Messages convey affection · Shared appreciation of architecture",
        login_account_placeholder: "Pen Name (Username or Email)",
        login_password_placeholder: "Password",
        register_username_placeholder: "Pen Name (3-20 letters, numbers or underscores)",
        register_email_placeholder: "Letter (Please enter your email)",
        register_code_placeholder: "Secret Code (Please enter 6-digit verification code)",
        register_password_placeholder: "Password",
        register_confirm_placeholder: "Verify Password",
        send_code_btn: "Send Code",
        login_btn: "Login",
        register_btn: "Register",
        login_footer: "Not yet connected?",
        register_footer: "Already connected?",
        login_footer_link: "Connect here",
        register_footer_link: "Enter here",
        
        // ========== Search 页面 ==========
        search_title: "Vast Archives · One Search",
        search_placeholder: "Enter building name or keyword, e.g.: Zhaozhou Bridge...",
        search_btn: "Search",
        filter_all: "All",
        filter_residence: "Residence",
        filter_government: "Government",
        filter_ritual: "Ritual",
        filter_bridge: "Bridge",
        
        // ========== 弹窗底部提示 ==========
        footer_hint: "For more ancient architectural archives, please visit the 'Index' section above."
    };
    
    // 需要翻译的元素映射
    const i18nElements = new Map();
    
    function registerElement(element, key) {
        if (!element) return;
        if (!i18nElements.has(key)) {
            i18nElements.set(key, []);
        }
        i18nElements.get(key).push(element);
        if (!element.hasAttribute('data-original-zh') && element.textContent.trim()) {
            element.setAttribute('data-original-zh', element.innerHTML);
        }
        if ((element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') && !element.hasAttribute('data-original-placeholder') && element.placeholder) {
            element.setAttribute('data-original-placeholder', element.placeholder);
        }
    }
    
    function initI18n() {
        // ========== 导航栏 ==========
        const navMap = {
            '首页': 'nav_home',
            '营造索引': 'nav_search',
            '与匠对谈': 'nav_chat',
            '梁间集语': 'nav_forum',
            '登录': 'nav_login'
        };
        document.querySelectorAll('nav a').forEach(a => {
            const text = a.textContent.trim();
            if (navMap[text]) {
                registerElement(a, navMap[text]);
            }
        });
        
        // Logo
        const logo = document.querySelector('.logo');
        if (logo) registerElement(logo, 'logo');
        
        // ========== 首页 ==========
        const heroSubtitle = document.querySelector('.hero-subtitle');
        if (heroSubtitle) registerElement(heroSubtitle, 'hero_subtitle');
        
        const heroTitle = document.querySelector('.hero h1');
        if (heroTitle) {
            if (!heroTitle.hasAttribute('data-original-zh')) {
                heroTitle.setAttribute('data-original-zh', heroTitle.innerHTML);
            }
            registerElement(heroTitle, 'hero_title');
        }
        
        const heroP = document.querySelector('.hero p');
        if (heroP) registerElement(heroP, 'hero_desc');
        
        const scrollSpan = document.querySelector('.scroll-down-indicator span');
        if (scrollSpan) registerElement(scrollSpan, 'scroll_hint');
        
        const chapters = [
            { title: '.chapter-wrapper:nth-child(1) .chapter-title', desc: '.chapter-wrapper:nth-child(1) .chapter-desc', titleKey: 'chap1_title', descKey: 'chap1_desc' },
            { title: '.chapter-wrapper:nth-child(2) .chapter-title', desc: '.chapter-wrapper:nth-child(2) .chapter-desc', titleKey: 'chap2_title', descKey: 'chap2_desc' },
            { title: '.chapter-wrapper:nth-child(3) .chapter-title', desc: '.chapter-wrapper:nth-child(3) .chapter-desc', titleKey: 'chap3_title', descKey: 'chap3_desc' },
            { title: '.chapter-wrapper:nth-child(4) .chapter-title', desc: '.chapter-wrapper:nth-child(4) .chapter-desc', titleKey: 'chap4_title', descKey: 'chap4_desc' }
        ];
        
        chapters.forEach(ch => {
            const titleEl = document.querySelector(ch.title);
            const descEl = document.querySelector(ch.desc);
            if (titleEl) registerElement(titleEl, ch.titleKey);
            if (descEl) registerElement(descEl, ch.descKey);
        });
        
        // ========== Chat 页面 ==========
        const chatTitle = document.getElementById('chatTitle');
        if (chatTitle) registerElement(chatTitle, 'chat_title');
        
        const chatSubtitle = document.getElementById('chatSubtitle');
        if (chatSubtitle) registerElement(chatSubtitle, 'chat_subtitle');
        
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            registerElement(chatInput, 'chat_placeholder');
        }
        
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) registerElement(sendBtn, 'chat_send');
        
        // ========== Forum 页面 ==========
        const forumTitle = document.getElementById('forumTitle');
        if (forumTitle) registerElement(forumTitle, 'forum_title');
        
        const forumSubtitle = document.getElementById('forumSubtitle');
        if (forumSubtitle) registerElement(forumSubtitle, 'forum_subtitle');
        
        const forumFormTitle = document.getElementById('forumFormTitle');
        if (forumFormTitle) registerElement(forumFormTitle, 'forum_form_title');
        
        const authorLabel = document.getElementById('authorLabel');
        if (authorLabel) registerElement(authorLabel, 'forum_author_label');
        
        const authorInput = document.getElementById('authorInput');
        if (authorInput) {
            registerElement(authorInput, 'forum_author_placeholder');
        }
        
        const contentLabel = document.getElementById('contentLabel');
        if (contentLabel) registerElement(contentLabel, 'forum_content_label');
        
        const contentInput = document.getElementById('contentInput');
        if (contentInput) {
            registerElement(contentInput, 'forum_content_placeholder');
        }
        
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) registerElement(publishBtn, 'forum_submit');
        
        // ========== Login 页面 ==========
        const loginPoeticQuote = document.getElementById('poeticQuote');
        if (loginPoeticQuote) registerElement(loginPoeticQuote, 'login_poetic_quote');
        
        const panelTitle = document.getElementById('panelTitle');
        const panelSubtitle = document.getElementById('panelSubtitle');
        const submitButton = document.getElementById('submitButton');
        const footerText = document.getElementById('footerText');
        
        if (panelTitle) registerElement(panelTitle, 'login_title');
        if (panelSubtitle) registerElement(panelSubtitle, 'login_subtitle');
        
        const accountInput = document.getElementById('accountInput');
        if (accountInput) {
            registerElement(accountInput, 'login_account_placeholder');
        }
        
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) {
            registerElement(passwordInput, 'login_password_placeholder');
        }
        
        const usernameInput = document.getElementById('usernameInput');
        if (usernameInput) {
            registerElement(usernameInput, 'register_username_placeholder');
        }
        
        const emailInput = document.getElementById('emailInput');
        if (emailInput) {
            registerElement(emailInput, 'register_email_placeholder');
        }
        
        const codeInput = document.getElementById('codeInput');
        if (codeInput) {
            registerElement(codeInput, 'register_code_placeholder');
        }
        
        const confirmPasswordInput = document.getElementById('confirmPasswordInput');
        if (confirmPasswordInput) {
            registerElement(confirmPasswordInput, 'register_confirm_placeholder');
        }
        
        const sendCodeBtn = document.getElementById('sendCodeBtn');
        if (sendCodeBtn) registerElement(sendCodeBtn, 'send_code_btn');
        
        // ========== Search 页面 ==========
        const searchTitle = document.getElementById('searchTitle');
        if (searchTitle) registerElement(searchTitle, 'search_title');
        
        const searchInputEl = document.querySelector('.search-input');
        if (searchInputEl) {
            registerElement(searchInputEl, 'search_placeholder');
        }
        
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) registerElement(searchBtn, 'search_btn');
        
        const filterAll = document.getElementById('filterAll');
        const filterResidence = document.getElementById('filterResidence');
        const filterGovernment = document.getElementById('filterGovernment');
        const filterRitual = document.getElementById('filterRitual');
        const filterBridge = document.getElementById('filterBridge');
        
        if (filterAll) registerElement(filterAll, 'filter_all');
        if (filterResidence) registerElement(filterResidence, 'filter_residence');
        if (filterGovernment) registerElement(filterGovernment, 'filter_government');
        if (filterRitual) registerElement(filterRitual, 'filter_ritual');
        if (filterBridge) registerElement(filterBridge, 'filter_bridge');
        
        // ========== 弹窗底部提示 ==========
        const footerHint = document.querySelector('.modal-footer-hint p');
        if (footerHint) registerElement(footerHint, 'footer_hint');
    }
    
    function applyLanguage(lang) {
        if (lang === 'zh') {
            // 恢复中文
            i18nElements.forEach((elements) => {
                elements.forEach(el => {
                    const original = el.getAttribute('data-original-zh');
                    if (original) {
                        el.innerHTML = original;
                    }
                    const originalPlaceholder = el.getAttribute('data-original-placeholder');
                    if (originalPlaceholder && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                        el.placeholder = originalPlaceholder;
                    }
                });
            });
            if (window.reloadBuildings) {
                window.reloadBuildings();
            }
        } else if (lang === 'en') {
            // 应用英文
            i18nElements.forEach((elements, key) => {
                const translation = enTranslations[key];
                if (translation) {
                    elements.forEach(el => {
                        if (key === 'hero_title') {
                            const sealHtml = '<span class="seal-mark">印</span>';
                            el.innerHTML = translation + sealHtml;
                        } else if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder !== undefined) {
                            el.placeholder = translation;
                        } else {
                            el.innerHTML = translation;
                        }
                    });
                }
            });
            if (window.reloadBuildings) {
                window.reloadBuildings();
            }
        }
        currentLang = lang;
        localStorage.setItem(STORAGE_KEY, lang);
        updateButtonState();
        
        if (window.refreshLoginMode) {
            window.refreshLoginMode();
        }
    }
    
    function toggleLanguage() {
        const newLang = currentLang === 'zh' ? 'en' : 'zh';
        applyLanguage(newLang);
    }
    
    function updateButtonState() {
        const btn = document.getElementById('translateBtn');
        if (btn) {
            btn.textContent = currentLang === 'zh' ? 'EN' : '中';
            btn.classList.toggle('active', currentLang === 'en');
        }
    }
    
    window.refreshLoginMode = function() {
        if (currentLang === 'en') {
            const visibleElements = new Map();
            i18nElements.forEach((elements, key) => {
                elements.forEach(el => {
                    if (el.offsetParent !== null) {
                        if (!visibleElements.has(key)) {
                            visibleElements.set(key, []);
                        }
                        visibleElements.get(key).push(el);
                    }
                });
            });
            visibleElements.forEach((elements, key) => {
                const translation = enTranslations[key];
                if (translation) {
                    elements.forEach(el => {
                        if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder !== undefined) {
                            el.placeholder = translation;
                        } else {
                            el.innerHTML = translation;
                        }
                    });
                }
            });
        }
    };
    
    document.addEventListener('DOMContentLoaded', function() {
        initI18n();
        updateButtonState();
        
        // 关键修复：根据存储的语言自动应用翻译
        const savedLang = localStorage.getItem(STORAGE_KEY);
        if (savedLang === 'en') {
            applyLanguage('en');
        }
        
        const btn = document.getElementById('translateBtn');
        if (btn) {
            btn.addEventListener('click', toggleLanguage);
        }
    });
})();