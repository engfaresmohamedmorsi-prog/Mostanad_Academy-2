(() => {
  const body = document.body;
  if (!body || body.classList.contains("shared-layout-skip")) return;
  body.classList.add("academy-page");

  const scriptUrl = document.currentScript?.src;
  const rootPath = new URL(scriptUrl ? "./" : "../", scriptUrl || location.href).pathname;
  const routes = [
    ["Home", "الرئيسية", `${rootPath}index.html`],
    ["Services", "الخدمات", `${rootPath}index.html#services`],
    ["Learning path", "مسار التعلّم", `${rootPath}index.html#roadmap`],
    ["Document library", "مكتبة المستندات", `${rootPath}courses.html`],
    ["Learning portal", "منصة التعلّم", `${rootPath}academy_index.html`],
    ["Contact", "تواصل معنا", `${rootPath}index.html#contact`],
  ];
  const isArabic = document.documentElement.lang === "ar";
  const storedTheme = localStorage.getItem("mostanad-academy-theme");
  const initialTheme = storedTheme === "light" ? "light" : "dark";
  const applyTheme = (theme) => {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    themeMeta.content = isDark ? "#0d1722" : "#f5f7f9";
    const button = header.querySelector(".shared-theme-toggle");
    if (button) {
      button.setAttribute("aria-pressed", String(isDark));
      button.setAttribute("aria-label", isDark
        ? (isArabic ? "تفعيل الوضع النهاري" : "Switch to light mode")
        : (isArabic ? "تفعيل الوضع الليلي" : "Switch to dark mode"));
      button.textContent = isDark ? "☀" : "☾";
    }
  };
  const themeMeta = document.querySelector('meta[name="theme-color"]') || document.head.appendChild(Object.assign(document.createElement("meta"), { name: "theme-color" }));
  document.documentElement.dataset.theme = initialTheme;
  themeMeta.content = initialTheme === "dark" ? "#0d1722" : "#f5f7f9";

  const skip = document.createElement("a");
  skip.className = "shared-skip-link";
  skip.href = "#shared-content";
  skip.textContent = isArabic ? "تجاوز إلى المحتوى" : "Skip to content";

  const header = document.createElement("header");
  header.className = "shared-site-header";
  header.innerHTML = `<nav class="shared-site-nav" aria-label="Mostanad Academy">
    <a class="shared-brand" href="${rootPath}index.html" aria-label="Mostanad Academy">
      <img class="shared-brand-logo" src="${rootPath}IMG/mostanad-academy-logo.png" alt="" width="52" height="52">
      <span class="shared-brand-copy"><strong>Mostanad Academy</strong><small>مستند أكاديمي · PROFESSIONAL LEARNING</small></span>
    </a>
    <div class="shared-nav-links">${routes.map((route) => `<a${route[0] === "Learning portal" ? ' class="shared-portal-link"' : ""} href="${route[2]}">${isArabic ? route[1] : route[0]}</a>`).join("")}</div>
    <button class="shared-theme-toggle" type="button" aria-pressed="${initialTheme === "dark"}" aria-label="${initialTheme === "dark" ? (isArabic ? "تفعيل الوضع النهاري" : "Switch to light mode") : (isArabic ? "تفعيل الوضع الليلي" : "Switch to dark mode")}">${initialTheme === "dark" ? "☀" : "☾"}</button>
    <button class="shared-menu-button" type="button" aria-expanded="false" aria-controls="shared-menu" aria-label="${isArabic ? "فتح القائمة" : "Open menu"}">☰</button>
    <div id="shared-menu" class="shared-menu-panel">${routes.map((route) => `<a href="${route[2]}">${isArabic ? route[1] : route[0]}</a>`).join("")}</div>
  </nav>`;

  body.prepend(header);
  body.prepend(skip);

  const main = document.querySelector("main") || [...body.children].find((element) =>
    !["SCRIPT", "STYLE", "HEADER", "FOOTER", "NAV"].includes(element.tagName)
    && !element.classList.contains("shared-skip-link"));
  if (main) {
    main.id ||= "shared-content";
    main.setAttribute("tabindex", "-1");
  }

  document.querySelectorAll("body > nav.navbar, body > nav[aria-label], body > header.legacy-header").forEach((navigation) => {
    navigation.classList.add("legacy-site-navigation");
    navigation.setAttribute("aria-hidden", "true");
  });

  if (!document.querySelector("footer,.modern-footer,.contact-section")) {
    const footer = document.createElement("footer");
    footer.className = "shared-site-footer";
    footer.innerHTML = `<div class="shared-footer-inner">
      <div><a class="shared-footer-brand" href="${rootPath}index.html">Mostanad Academy · مستند أكاديمي</a><p>${isArabic ? "تعلّم بالممارسة. اعمل بثقة." : "Learn by doing. Work with confidence."}</p></div>
      <nav class="shared-footer-links" aria-label="${isArabic ? "روابط التذييل" : "Footer links"}">
        <a href="${rootPath}privacy-policy.html">${isArabic ? "الخصوصية" : "Privacy"}</a>
        <a href="mailto:aragad477@gmail.com">${isArabic ? "تواصل معنا" : "Contact"}</a>
        <a href="https://www.linkedin.com/in/ahmed-khalaf-dc/" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
        <a href="https://wa.me/201156286464" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
      </nav>
      <small>Ahmed Khalaf © Khalaf_DC | Mostanad Academy</small>
    </div>`;
    body.append(footer);
  }

  const toggle = header.querySelector(".shared-menu-button");
  const themeToggle = header.querySelector(".shared-theme-toggle");
  themeToggle.addEventListener("click", () => {
    const isDark = document.documentElement.dataset.theme !== "dark";
    localStorage.setItem("mostanad-academy-theme", isDark ? "dark" : "light");
    applyTheme(isDark ? "dark" : "light");
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "mostanad-academy-theme") applyTheme(event.newValue === "light" ? "light" : "dark");
  });
  toggle?.addEventListener("click", () => {
    const panel = header.querySelector("#shared-menu");
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? (isArabic ? "إغلاق القائمة" : "Close menu") : (isArabic ? "فتح القائمة" : "Open menu")); 
    
    panel.classList.toggle("is-open", open);
  });
  header.querySelectorAll("#shared-menu a").forEach((link) => link.addEventListener("click", () => {
    header.querySelector("#shared-menu").classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", isArabic ? "فتح القائمة" : "Open menu");
  }));
})();
