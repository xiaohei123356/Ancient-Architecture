// ================= 一键翻译功能（完整完美修版）=================
(function() {
    const STORAGE_KEY = 'preferred_language';
    let currentLang = localStorage.getItem(STORAGE_KEY) || 'zh';
    
    // 英文翻译字典
    const enTranslations = {
        nav_home: "Home", nav_search: "Search", nav_chat: "Chat", nav_forum: "Forum", nav_login: "Login",
        nav_admin: "Admin Panel", nav_profile: "My Profile", nav_logout: "Logout",
        logo: "Heritage of Ancient Architecture",
        hero_subtitle: "Masterpieces of Ancient Chinese Architecture", hero_title: "Timber & Spirit",
        hero_desc: "Wood as bone, stone as foundation. Between mortise and tenon,<br>lies the soul of mountains and rivers.",
        scroll_hint: "Scroll", poetic_quote: "Enter the gate, home is here<br>Sit beneath the wind-swept eaves",
        chap1_title: "Wooden<br>Structure",
        chap1_desc: "No nails, yet withstanding immense force. No glue, yet lasting a millennium.<br><br>Ancient craftsmen turned mechanics into aesthetics, structure into poetry.<br><br>From the open-spandrel arch of Zhaozhou Bridge to the 54 types of bracket sets in Yingxian Wooden Pagoda, every load-bearing structure is a masterful dialogue with nature.",
        chap2_title: "Master<br>Craftsmen",
        chap2_desc: "They are not nameless artisans, but architectural masters remembered by history.<br><br>They measured heaven and earth with Luban's ruler, defined dynasties with scaled models and architectural drawings.<br><br>Today, we call out their names, inviting these giants to step out from the beams and columns, to receive the respect of future generations.",
        chap3_title: "Sacred<br>Texts",
        chap3_desc: "Wood decays, stone cracks. Only words allow architecture to transcend dynasties.<br><br>From the modular system of 'Yingzao Fashi' to the poetic vision of 'Yuan Ye', these works are not merely technical manuals.<br><br>They are manifestos of Eastern spatial aesthetics and philosophy.",
        chap4_title: "Harmony<br>with Nature",
        chap4_desc: "Chinese architecture never stands apart from nature.<br><br>It is spatial ethics, family order. The courtyard embraces the cycle of seasons.<br><br>The red walls carry the warmth of civilization and the laws of heaven and earth.",
        chat_title: "Chat with the Master", chat_subtitle: "A dialogue across centuries, exploring ancient architectural wisdom", chat_placeholder: "Ask a question, e.g., Why has Zhaozhou Bridge stood for a thousand years?", chat_send: "Send",
        forum_title: "Liangjian Jiyu", forum_subtitle: "Find like-minded friends, discuss ancient architecture, leave your words here", forum_form_title: "Leave Your Words", forum_author_label: "Pen Name", forum_author_placeholder: "What is your name?", forum_content_label: "Thoughts", forum_content_placeholder: "Write your insights or questions about ancient architecture here...", forum_submit: "Submit",
        login_poetic_quote: "Enter the gate, home is here<br>Sit beneath the wind-swept eaves", login_title: "Enter the Hall", login_subtitle: "Vast archives · Inviting you to appreciate", register_title: "Form a Bond", register_subtitle: "Messages convey affection · Shared appreciation of architecture", login_account_placeholder: "Pen Name (Username or Email)", login_password_placeholder: "Password", register_username_placeholder: "Pen Name (3-20 letters, numbers or underscores)", register_email_placeholder: "Letter (Please enter your email)", register_code_placeholder: "Secret Code (Please enter 6-digit verification code)", register_password_placeholder: "Password", register_confirm_placeholder: "Verify Password", send_code_btn: "Send Code", login_btn: "Login", register_btn: "Register", login_footer: "Not yet connected?", register_footer: "Already connected?", login_footer_link: "Connect here", register_footer_link: "Enter here",
        search_title: "Vast Archives · One Search", search_placeholder: "Enter building name or keyword, e.g.: Zhaozhou Bridge...", search_btn: "Search", filter_all: "All", filter_residence: "Residence", filter_government: "Government", filter_ritual: "Ritual", filter_bridge: "Bridge",
        profile_section_info: "Profile Information", profile_username: "Pen Name", profile_email: "Email", profile_gender: "Gender", profile_gender_hidden: "Hidden", profile_gender_male: "Male", profile_gender_female: "Female", profile_age: "Age", profile_bio: "Personal Statement", profile_section_password: "Change Password", profile_old_password: "Current Password", profile_new_password: "New Password", profile_confirm_password: "Confirm Password", profile_save: "Save", profile_age_placeholder: "Enter your age", profile_bio_placeholder: "Write about your connection with ancient architecture...", profile_old_password_placeholder: "Enter current password", profile_new_password_placeholder: "At least 8 characters with letters and numbers", profile_confirm_password_placeholder: "Confirm your new password",
        
        // 注意：下面这一行的结尾加了至关重要的逗号！且把 Index 改成了 Search
        footer_hint: "For more ancient architectural archives, please visit the 'Search' section above.", 
        
        // ========== 使用手册 (Manual) ==========
        manual_tooltip: "GUIDE",
        manual_title: "📜 Architectural Guide",
        manual_preface_title: "🏛️ Preface",
        manual_preface_p: "Welcome to 'Heritage of Ancient Architecture' — a timber-framed palace at your fingertips. Explore Chinese architectural wisdom built on wood and stone.",
        manual_step1_title: "📖 Step 1 · Entering",
        manual_step1_p1: "Click 'Login' in the top right to register via email or sign in.",
        manual_step1_p2: "Admins can access the 'Dashboard' to review comments and submissions.",
        manual_step2_title: "🗺️ Step 2 · Exploration",
        manual_step2_li1: "Home — Scroll through four chapters; click cards for details.",
        manual_step2_li2: "Search — Browse buildings by category; click for archives.",
        manual_step2_li3: "Chat — Ask the AI Master questions about ancient architecture.",
        manual_step2_li4: "Forum — Post, like, and discuss with fellow enthusiasts.",
        manual_step2_li5: "Profile — Edit your personal info and bio after logging in.",
        manual_step3_title: "🎵 Step 3 · Audio",
        manual_step3_p: "The 'Music' button in the bottom right toggles background music.",
        manual_step4_title: "🌐 Step 4 · Language",
        manual_step4_p: "Click 'EN/中' in the nav bar to toggle between Chinese and English.",
        manual_closing: "📝 Closing",
        manual_closing_p: "Feel free to provide feedback in the 'Forum'. Enjoy your journey!",
        manual_footer: "Heritage of Ancient Architecture · Timber & Spirit"
    };
    
    const i18nElements = new Map();
    
    function registerElement(element, key) {
        if (!element) return;
        if (!i18nElements.has(key)) i18nElements.set(key, []);
        i18nElements.get(key).push(element);
        if (!element.hasAttribute('data-original-zh') && element.textContent.trim()) {
            element.setAttribute('data-original-zh', element.innerHTML);
        }
        if ((element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') && !element.hasAttribute('data-original-placeholder') && element.placeholder) {
            element.setAttribute('data-original-placeholder', element.placeholder);
        }
    }
    
    function initI18n() {
        const navMap = { '首页': 'nav_home', '营造索引': 'nav_search', '与匠对谈': 'nav_chat', '梁间集语': 'nav_forum', '登录': 'nav_login' };
        document.querySelectorAll('nav a').forEach(a => { if (navMap[a.textContent.trim()]) registerElement(a, navMap[a.textContent.trim()]); });
        
        registerElement(document.querySelector('.logo'), 'logo');
        registerElement(document.querySelector('.hero-subtitle'), 'hero_subtitle');
        
        const heroTitle = document.querySelector('.hero h1');
        if (heroTitle) {
            if (!heroTitle.hasAttribute('data-original-zh')) heroTitle.setAttribute('data-original-zh', heroTitle.innerHTML);
            registerElement(heroTitle, 'hero_title');
        }
        
        registerElement(document.querySelector('.hero p'), 'hero_desc');
        registerElement(document.querySelector('.scroll-down-indicator span'), 'scroll_hint');
        
        const chapters = [
            { title: '.chapter-wrapper:nth-child(1) .chapter-title', desc: '.chapter-wrapper:nth-child(1) .chapter-desc', titleKey: 'chap1_title', descKey: 'chap1_desc' },
            { title: '.chapter-wrapper:nth-child(2) .chapter-title', desc: '.chapter-wrapper:nth-child(2) .chapter-desc', titleKey: 'chap2_title', descKey: 'chap2_desc' },
            { title: '.chapter-wrapper:nth-child(3) .chapter-title', desc: '.chapter-wrapper:nth-child(3) .chapter-desc', titleKey: 'chap3_title', descKey: 'chap3_desc' },
            { title: '.chapter-wrapper:nth-child(4) .chapter-title', desc: '.chapter-wrapper:nth-child(4) .chapter-desc', titleKey: 'chap4_title', descKey: 'chap4_desc' }
        ];
        chapters.forEach(ch => {
            registerElement(document.querySelector(ch.title), ch.titleKey);
            registerElement(document.querySelector(ch.desc), ch.descKey);
        });
        
        registerElement(document.getElementById('chatTitle'), 'chat_title');
        registerElement(document.getElementById('chatSubtitle'), 'chat_subtitle');
        registerElement(document.getElementById('chatInput'), 'chat_placeholder');
        registerElement(document.getElementById('sendBtn'), 'chat_send');
        
        registerElement(document.getElementById('forumTitle'), 'forum_title');
        registerElement(document.getElementById('forumSubtitle'), 'forum_subtitle');
        registerElement(document.getElementById('forumFormTitle'), 'forum_form_title');
        registerElement(document.getElementById('authorLabel'), 'forum_author_label');
        registerElement(document.getElementById('authorInput'), 'forum_author_placeholder');
        registerElement(document.getElementById('contentLabel'), 'forum_content_label');
        registerElement(document.getElementById('contentInput'), 'forum_content_placeholder');
        registerElement(document.getElementById('publishBtn'), 'forum_submit');
        
        registerElement(document.getElementById('poeticQuote'), 'login_poetic_quote');
        registerElement(document.getElementById('panelTitle'), 'login_title');
        registerElement(document.getElementById('panelSubtitle'), 'login_subtitle');
        registerElement(document.getElementById('accountInput'), 'login_account_placeholder');
        registerElement(document.getElementById('passwordInput'), 'login_password_placeholder');
        registerElement(document.getElementById('usernameInput'), 'register_username_placeholder');
        registerElement(document.getElementById('emailInput'), 'register_email_placeholder');
        registerElement(document.getElementById('codeInput'), 'register_code_placeholder');
        registerElement(document.getElementById('confirmPasswordInput'), 'register_confirm_placeholder');
        registerElement(document.getElementById('sendCodeBtn'), 'send_code_btn');
        
        registerElement(document.getElementById('searchTitle'), 'search_title');
        registerElement(document.querySelector('.search-input'), 'search_placeholder');
        registerElement(document.getElementById('searchBtn'), 'search_btn');
        registerElement(document.getElementById('filterAll'), 'filter_all');
        registerElement(document.getElementById('filterResidence'), 'filter_residence');
        registerElement(document.getElementById('filterGovernment'), 'filter_government');
        registerElement(document.getElementById('filterRitual'), 'filter_ritual');
        registerElement(document.getElementById('filterBridge'), 'filter_bridge');
        
        registerElement(document.querySelector('[data-i18n="profile_section_info"]'), 'profile_section_info');
        registerElement(document.querySelector('[data-i18n="profile_username"]'), 'profile_username');
        registerElement(document.querySelector('[data-i18n="profile_email"]'), 'profile_email');
        registerElement(document.querySelector('[data-i18n="profile_gender"]'), 'profile_gender');
        registerElement(document.querySelector('[data-i18n="profile_age"]'), 'profile_age');
        registerElement(document.querySelector('[data-i18n="profile_bio"]'), 'profile_bio');
        registerElement(document.querySelector('[data-i18n="profile_section_password"]'), 'profile_section_password');
        registerElement(document.querySelector('[data-i18n="profile_old_password"]'), 'profile_old_password');
        registerElement(document.querySelector('[data-i18n="profile_new_password"]'), 'profile_new_password');
        registerElement(document.querySelector('[data-i18n="profile_confirm_password"]'), 'profile_confirm_password');
        registerElement(document.querySelector('[data-i18n="profile_save"]'), 'profile_save');
        registerElement(document.getElementById('ageInput'), 'profile_age_placeholder');
        registerElement(document.getElementById('bioInput'), 'profile_bio_placeholder');
        registerElement(document.getElementById('oldPasswordInput'), 'profile_old_password_placeholder');
        registerElement(document.getElementById('newPasswordInput'), 'profile_new_password_placeholder');
        registerElement(document.getElementById('confirmPasswordInput'), 'profile_confirm_password_placeholder');
        
        document.querySelectorAll('#genderSelect option').forEach(option => {
            if (option.getAttribute('data-i18n')) registerElement(option, option.getAttribute('data-i18n'));
        });
        registerElement(document.querySelector('.modal-footer-hint p'), 'footer_hint');
    }
    
    window.registerDynamicElement = function(element, key) {
        if (!element) return;
        if (!i18nElements.has(key)) i18nElements.set(key, []);
        i18nElements.get(key).push(element);
        if (!element.hasAttribute('data-original-zh') && element.textContent.trim()) {
            element.setAttribute('data-original-zh', element.innerHTML);
        }
        if (currentLang === 'en' && enTranslations[key]) {
            element.innerHTML = enTranslations[key];
        }
    };

    function toggleLanguage() {
        applyLanguage(currentLang === 'zh' ? 'en' : 'zh');
    }

    function applyLanguage(lang) {
        if (lang === 'zh') {
            i18nElements.forEach((elements) => {
                elements.forEach(el => {
                    const original = el.getAttribute('data-original-zh');
                    if (original) el.innerHTML = original;
                    const originalPlaceholder = el.getAttribute('data-original-placeholder');
                    if (originalPlaceholder && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                        el.placeholder = originalPlaceholder;
                    }
                });
            });
        } else if (lang === 'en') {
            i18nElements.forEach((elements, key) => {
                const translation = enTranslations[key];
                if (translation) {
                    elements.forEach(el => {
                        if (key === 'hero_title') {
                            el.innerHTML = translation + '<span class="seal-mark">印</span>';
                        } else if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder !== undefined) {
                            el.placeholder = translation;
                        } else if (el.tagName === 'OPTION') {
                            el.textContent = translation;
                        } else {
                            el.innerHTML = translation;
                        }
                    });
                }
            });
        }

        currentLang = lang;
        localStorage.setItem(STORAGE_KEY, lang);

        if (lang === 'en') {
            document.body.classList.add('lang-en');
        } else {
            document.body.classList.remove('lang-en');
        }

        if (window.reloadBuildings) window.reloadBuildings();
        updateButtonState();
        if (window.refreshLoginMode) window.refreshLoginMode();
        if (window.refreshIndexGallery) window.refreshIndexGallery();
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
                        if (!visibleElements.has(key)) visibleElements.set(key, []);
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
        
        const savedLang = localStorage.getItem(STORAGE_KEY) || 'zh';
        applyLanguage(savedLang); 
        
        const btn = document.getElementById('translateBtn');
        if (btn) btn.addEventListener('click', toggleLanguage);
    });
})();