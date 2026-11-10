/**
 * site-nav.js — Mostanad Academy
 * يضيف navbar + footer موحّد لكل صفحات الموقع تلقائياً
 * أضف هذا السطر في أي صفحة: <script src="site-nav.js" defer></script>
 */
(function () {
  /* ====== THEME ====== */
  const saved = localStorage.getItem('mostanad-academy-theme') || 'dark';
  document.documentElement.dataset.theme = saved;

  const meta = document.querySelector('meta[name="theme-color"]')
    || Object.assign(document.head.appendChild(document.createElement('meta')), { name: 'theme-color' });
  meta.content = saved === 'dark' ? '#0d1722' : '#f5f7f9';

  /* ====== DETECT ROOT PATH ====== */
  // كل الملفات الآن في المجلد الرئيسي — المسار دائماً ./
  const root = './';

  /* ====== STYLES ====== */
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --sn-navy: #102641;
      --sn-blue: #2469a4;
      --sn-gold: #c9984c;
      --sn-paper: #f5f7f9;
      --sn-line: #e3e9ee;
      --sn-muted: #6b7c8d;
      --sn-font: "IBM Plex Sans Arabic","DM Sans",Arial,sans-serif;
    }
    html[data-theme="dark"] {
      --sn-paper: #0d1722;
      --sn-line: #1e2e40;
      --sn-muted: #8ca0b3;
    }

    /* skip link */
    .sn-skip {
      position: fixed; top: 8px; right: 8px; z-index: 10000;
      padding: 8px 14px; background: var(--sn-navy); color: #fff;
      border-radius: 6px; font-size: .8rem; font-family: var(--sn-font);
      transform: translateY(-120%); transition: transform .2s;
      text-decoration: none;
    }
    .sn-skip:focus { transform: translateY(0); }

    /* navbar */
    .sn-bar {
      position: fixed; top: 0; inset-inline: 0; z-index: 9000;
      background: rgba(245,247,249,.93);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--sn-line);
      font-family: var(--sn-font);
      transition: background .3s;
    }
    html[data-theme="dark"] .sn-bar { background: rgba(13,23,34,.93); }

    .sn-inner {
      max-width: 1160px; margin: 0 auto;
      display: flex; align-items: center;
      justify-content: space-between;
      padding: 0 20px; height: 62px; gap: 12px;
    }

    .sn-brand {
      display: flex; align-items: center; gap: 9px;
      text-decoration: none; flex-shrink: 0;
    }
    .sn-brand img {
      width: 38px; height: 38px; border-radius: 9px;
      object-fit: cover;
    }
    .sn-brand-text strong {
      display: block; font-size: .88rem; font-weight: 700;
      color: var(--sn-navy); line-height: 1.2;
    }
    html[data-theme="dark"] .sn-brand-text strong { color: #e8f0f8; }
    .sn-brand-text small {
      font-size: .65rem; color: var(--sn-muted); font-weight: 500;
    }

    .sn-links {
      display: flex; align-items: center; gap: 2px; flex: 1;
      justify-content: center;
    }
    .sn-links a {
      padding: 6px 11px; border-radius: 7px;
      font-size: .82rem; font-weight: 600;
      color: var(--sn-muted); text-decoration: none;
      transition: all .2s; white-space: nowrap;
    }
    .sn-links a:hover,
    .sn-links a.sn-active {
      background: var(--sn-line); color: var(--sn-navy);
    }
    html[data-theme="dark"] .sn-links a:hover,
    html[data-theme="dark"] .sn-links a.sn-active { color: #e8f0f8; }

    .sn-links a.sn-cta {
      background: var(--sn-navy) !important; color: #fff !important;
      padding: 6px 14px; border-radius: 8px;
    }
    html[data-theme="dark"] .sn-links a.sn-cta { background: var(--sn-blue) !important; }
    .sn-links a.sn-cta:hover { opacity: .88; }

    .sn-auth { display: flex; align-items: center; gap: 6px; }
    .sn-auth a {
      padding: 6px 10px; border-radius: 7px; font-size: .78rem; font-weight: 600;
      color: var(--sn-muted); text-decoration: none; white-space: nowrap;
    }
    .sn-auth a.portal-register-link {
      background: var(--sn-navy) !important; color: #fff !important;
    }
    html[data-theme="dark"] .sn-auth a.portal-register-link { background: var(--sn-blue) !important; }
    .sn-right { display: flex; align-items: center; gap: 8px; }

    .sn-theme {
      width: 34px; height: 34px; border-radius: 50%;
      border: 1.5px solid var(--sn-line); background: transparent;
      cursor: pointer; font-size: .9rem;
      display: flex; align-items: center; justify-content: center;
      color: var(--sn-muted); transition: all .2s; font-family: var(--sn-font);
    }
    .sn-theme:hover { background: var(--sn-line); }

    .sn-hamburger {
      display: none; background: none;
      border: 1.5px solid var(--sn-line); border-radius: 7px;
      padding: 5px 9px; cursor: pointer; font-size: 1rem;
      color: var(--sn-navy); font-family: var(--sn-font);
      transition: all .2s;
    }
    html[data-theme="dark"] .sn-hamburger { color: #e8f0f8; }
    .sn-hamburger:hover { background: var(--sn-line); }

    /* mobile panel */
    .sn-mobile {
      display: none; position: fixed;
      top: 62px; inset-inline: 0; z-index: 8999;
      background: var(--sn-paper);
      border-top: 1px solid var(--sn-line);
      padding: 12px 16px 20px;
      flex-direction: column; gap: 4px;
      font-family: var(--sn-font);
      max-height: calc(100vh - 62px); overflow-y: auto;
    }
    .sn-mobile.open { display: flex; }
    .sn-mobile a {
      padding: 11px 14px; border-radius: 9px;
      font-size: .9rem; font-weight: 600;
      color: var(--sn-navy); text-decoration: none;
      transition: background .2s;
    }
    html[data-theme="dark"] .sn-mobile a { color: #e8f0f8; }
    .sn-mobile a:hover { background: var(--sn-line); }
    .sn-mobile a.sn-cta {
      background: var(--sn-navy); color: #fff !important;
      margin-top: 8px;
    }

    /* body offset */
    body { padding-top: 62px !important; }

    /* footer */
    .sn-footer {
      background: var(--sn-navy); color: rgba(255,255,255,.6);
      padding: 44px 20px 20px;
      font-family: var(--sn-font); margin-top: 60px;
    }
    .sn-footer-inner {
      max-width: 1160px; margin: 0 auto;
    }
    .sn-footer-top {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr 1fr;
      gap: 36px; margin-bottom: 32px;
    }
    .sn-footer-brand img {
      width: 42px; border-radius: 9px; margin-bottom: 10px;
    }
    .sn-footer-brand strong {
      display: block; color: #fff; font-size: .95rem; margin-bottom: 6px;
    }
    .sn-footer-brand p { font-size: .8rem; line-height: 1.7; max-width: 220px; }
    .sn-footer-col h4 {
      color: #fff; font-size: .82rem; font-weight: 700;
      margin-bottom: 12px; text-transform: uppercase;
      letter-spacing: .05em;
    }
    .sn-footer-col a {
      display: block; font-size: .8rem; margin-bottom: 7px;
      color: rgba(255,255,255,.55); text-decoration: none; transition: color .2s;
    }
    .sn-footer-col a:hover { color: #fff; }
    .sn-footer-social { display: flex; gap: 8px; margin-top: 14px; }
    .sn-footer-social a {
      width: 34px; height: 34px; border-radius: 8px;
      background: rgba(255,255,255,.08);
      display: flex; align-items: center; justify-content: center;
      font-size: .85rem; transition: all .2s;
      color: rgba(255,255,255,.55) !important;
      text-decoration: none;
    }
    .sn-footer-social a:hover { background: var(--sn-blue); color: #fff !important; }
    .sn-footer-bottom {
      border-top: 1px solid rgba(255,255,255,.1);
      padding-top: 18px;
      display: flex; align-items: center;
      justify-content: space-between; flex-wrap: wrap; gap: 10px;
    }
    .sn-footer-bottom p { font-size: .75rem; }
    .sn-footer-bottom-links { display: flex; gap: 14px; }
    .sn-footer-bottom-links a {
      font-size: .75rem; color: rgba(255,255,255,.45);
      text-decoration: none; transition: color .2s;
    }
    .sn-footer-bottom-links a:hover { color: #fff; }

    @media (max-width: 860px) {
      .sn-links { display: none; }
      .sn-auth { display: none; }
      .sn-hamburger { display: flex; align-items: center; }
      .sn-footer-top { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 520px) {
      .sn-footer-top { grid-template-columns: 1fr; }
    }
  `;
  document.head.insertBefore(style, document.head.firstChild);

  /* ====== CURRENT PAGE DETECTION ====== */
  const path = location.pathname.split('/').pop() || 'index.html';

  const pages = [
    { href: root + 'index.html',         ar: 'الرئيسية',       en: 'Home' },
    { href: root + 'courses.html',        ar: 'الكورسات',       en: 'Courses' },
    { href: root + 'about.html',          ar: 'عن الأكاديمية',  en: 'About' },
    { href: root + 'contact.html',        ar: 'تواصل معنا',     en: 'Contact' },
    { href: root + 'faq.html',            ar: 'الأسئلة الشائعة', en: 'FAQ' },
    { href: root + 'academy_index.html#login', ar: 'منصة التعلّم', en: 'Learning portal', cta: true },
  ];

  /* ====== BUILD NAVBAR ====== */
  const skip = Object.assign(document.createElement('a'), {
    className: 'sn-skip', href: '#main-content', textContent: 'تجاوز إلى المحتوى'
  });

  const bar = document.createElement('nav');
  bar.className = 'sn-bar';
  bar.setAttribute('aria-label', 'التنقل الرئيسي');

  const inner = document.createElement('div');
  inner.className = 'sn-inner';

  // brand
  const brand = document.createElement('a');
  brand.className = 'sn-brand';
  brand.href = root + 'index.html';
  brand.innerHTML = `
    <img src="${root}mostanad-academy-logo.png" alt="Mostanad Academy" width="38" height="38"
      onerror="this.style.display='none'">
    <div class="sn-brand-text">
      <strong>Mostanad Academy</strong>
      <small>مستند أكاديمي · PROFESSIONAL LEARNING</small>
    </div>`;

  // desktop links
  const links = document.createElement('div');
  links.className = 'sn-links';
  links.setAttribute('role', 'list');
  pages.forEach(p => {
    const a = document.createElement('a');
    a.href = p.href;
    a.textContent = p.ar;
    a.setAttribute('role', 'listitem');
    if (p.cta) a.classList.add('sn-cta');
    const target = p.href.split('/').pop().split('#')[0];
    if (path === target) a.classList.add('sn-active');
    links.appendChild(a);
  });

  // right: theme + hamburger
  const right = document.createElement('div');
  right.className = 'sn-right';

  const themeBtn = document.createElement('button');
  themeBtn.className = 'sn-theme';
  themeBtn.setAttribute('aria-label', 'تغيير المظهر');
  themeBtn.textContent = saved === 'dark' ? '☀' : '☾';

  const hamburger = document.createElement('button');
  hamburger.className = 'sn-hamburger';
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.setAttribute('aria-controls', 'sn-mobile-menu');
  hamburger.setAttribute('aria-label', 'فتح القائمة');
  hamburger.textContent = '☰';

  const authArea = document.createElement('div');
  authArea.id = 'nav-auth-area';
  authArea.className = 'sn-auth';
  right.append(authArea, themeBtn, hamburger);
  inner.append(brand, links, right);
  bar.appendChild(inner);

  // mobile menu
  const mobile = document.createElement('div');
  mobile.className = 'sn-mobile';
  mobile.id = 'sn-mobile-menu';
  mobile.setAttribute('role', 'menu');
  pages.forEach(p => {
    const a = document.createElement('a');
    a.href = p.href;
    a.textContent = p.ar;
    a.setAttribute('role', 'menuitem');
    if (p.cta) { a.classList.add('sn-cta'); }
    const target = p.href.split('/').pop().split('#')[0];
    if (path === target) a.classList.add('sn-active');
    a.addEventListener('click', () => {
      mobile.classList.remove('open');
      hamburger.textContent = '☰';
      hamburger.setAttribute('aria-expanded', 'false');
    });
    mobile.appendChild(a);
  });
  const mobileAuth = document.createElement('div');
  mobileAuth.id = 'nav-auth-area-mobile';
  mobileAuth.className = 'sn-auth';
  mobile.appendChild(mobileAuth);
  const faqLink = document.createElement('a');
  faqLink.href = root + 'faq.html';
  faqLink.textContent = 'الأسئلة الشائعة';
  faqLink.setAttribute('role', 'menuitem');
  mobile.appendChild(faqLink);

  /* ====== BUILD FOOTER ====== */
  const footer = document.createElement('footer');
  footer.className = 'sn-footer';
  footer.setAttribute('role', 'contentinfo');
  footer.innerHTML = `
    <div class="sn-footer-inner">
      <div class="sn-footer-top">
        <div class="sn-footer-brand">
          <img src="${root}mostanad-academy-logo.png" alt="Mostanad Academy"
            onerror="this.style.display='none'">
          <strong>Mostanad Academy</strong>
          <p>منصة تعليمية متخصصة في ضبط الوثائق وإدارة المشاريع الهندسية — تعليم مهني بأسلوب عملي.</p>
          <div class="sn-footer-social">
            <a href="${root}index.html#contact" aria-label="تواصل معنا">✉</a>
            <a href="https://wa.me/201156286464" target="_blank" rel="noopener noreferrer" aria-label="واتساب">💬</a>
          </div>
        </div>
        <div class="sn-footer-col">
          <h4>الصفحات</h4>
          <a href="${root}index.html">الصفحة الرئيسية</a>
          <a href="${root}courses.html">الكورسات</a>
          <a href="${root}about.html">عن الأكاديمية</a>
          <a href="${root}academy_index.html#login">منصة التعلّم</a>
        </div>
        <div class="sn-footer-col">
          <h4>الموارد</h4>
          <a href="${root}contact.html">تواصل معنا</a>
          <a href="${root}faq.html">الأسئلة الشائعة</a>
          <a href="${root}academy_index.html#login">تسجيل الدخول</a>
          <a href="${root}register.html">إنشاء حساب تجريبي</a>
          <a href="${root}faq.html">الأسئلة الشائعة</a>
        </div>
        <div class="sn-footer-col">
          <h4>قانوني</h4>
          <a href="${root}privacy-policy.html">سياسة الخصوصية</a>
          <a href="${root}terms-of-use.html">شروط الاستخدام</a>
          <a href="${root}sitemap.xml">خريطة الموقع</a>
          <a href="${root}404.html">صفحة الخطأ</a>
        </div>
      </div>
      <div class="sn-footer-bottom">
        <p>© ${new Date().getFullYear()} Mostanad Academy — جميع الحقوق محفوظة</p>
        <div class="sn-footer-bottom-links">
          <a href="${root}privacy-policy.html">الخصوصية</a>
          <a href="${root}terms-of-use.html">الشروط</a>
          <a href="${root}sitemap.xml">Sitemap</a>
        </div>
      </div>
    </div>`;

  /* ====== INJECT ====== */
  document.body.insertAdjacentElement('afterbegin', skip);
  document.body.insertAdjacentElement('afterbegin', mobile);
  document.body.insertAdjacentElement('afterbegin', bar);
  document.body.appendChild(footer);
  if (typeof window.renderNavAuth === 'function') window.renderNavAuth();

  /* ====== THEME LOGIC ====== */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    localStorage.setItem('mostanad-academy-theme', t);
    meta.content = t === 'dark' ? '#0d1722' : '#f5f7f9';
    themeBtn.textContent = t === 'dark' ? '☀' : '☾';
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي');
  }
  themeBtn.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  /* ====== HAMBURGER ====== */
  hamburger.addEventListener('click', () => {
    const open = mobile.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.textContent = open ? '✕' : '☰';
  });

  /* ====== CLOSE MOBILE ON OUTSIDE CLICK ====== */
  document.addEventListener('click', e => {
    if (!bar.contains(e.target) && !mobile.contains(e.target)) {
      mobile.classList.remove('open');
      hamburger.textContent = '☰';
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  /* ====== BREADCRUMB (اختياري) ====== */
  const bc = document.querySelector('[data-breadcrumb]');
  if (bc) {
    const current = pages.find(p => p.href.split('/').pop() === path);
    if (current) {
      bc.innerHTML = `<a href="${root}index.html">الرئيسية</a> › <span>${current.ar}</span>`;
    }
  }

})();
