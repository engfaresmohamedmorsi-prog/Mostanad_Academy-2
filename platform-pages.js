(function () {
  "use strict";

  const main = document.querySelector("[data-page]");
  if (!main) return;

  const page = main.dataset.page;
  const pageTitles = {
    login: "تسجيل الدخول",
    register: "إنشاء حساب طالب",
    "forgot-password": "استعادة كلمة المرور",
    courses: "الدورات التدريبية",
    course: "تفاصيل الدورة",
    dashboard: "لوحة الطالب",
    player: "مشغل الدورة",
    quiz: "الاختبار",
    certificates: "الشهادات",
    profile: "الملف الشخصي",
    instructor: "لوحة المدرّب",
    admin: "إدارة الأكاديمية",
    about: "عن الأكاديمية",
    contact: "تواصل معنا",
    faq: "الأسئلة الشائعة",
  };
  const user = () => window.MAUTH?.getUser() || null;
  const courseList = () => window.MAcourses?.getCourses() || [];
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const safeId = (value) => /^[a-zA-Z0-9_-]{1,100}$/.test(String(value || "")) ? String(value) : "";
  const courseName = (course) => course?.title || course?.titleEn || "دورة تدريبية";
  const routeFor = (role) => ({
    student: "dashboard.html",
    instructor: "instructor-dashboard.html",
    admin: "admin-dashboard.html",
  })[role] || "dashboard.html";
  const courseLink = (course, pageName = "course-detail.html") =>
    `${pageName}?id=${encodeURIComponent(course.id)}`;
  const demoNotice = `<aside class="platform-demo-notice" role="note"><strong>نسخة معاينة محلية</strong><span>الحسابات والتقدّم والملاحظات هنا محفوظة في هذا المتصفح فقط. هذه الواجهة لا توفّر مصادقة أو صلاحيات أو دفعاً آمناً؛ استخدم <a href="academy_index.html#login">بوابة الأكاديمية المتصلة بالخادم</a> عند إعداد Supabase.</span></aside>`;
  const pageHero = (label, title, description = "") => `
    <header class="page-hero">
      <span class="section-label">${escapeHTML(label)}</span>
      <h1>${escapeHTML(title)}</h1>
      ${description ? `<p>${escapeHTML(description)}</p>` : ""}
    </header>`;
  const statusArea = `<p id="platform-status" class="form-message" role="status" aria-live="polite"></p>`;

  function getCourse(id) {
    const courseId = safeId(id);
    if (!courseId) return null;
    return courseList().find((course) => course.id === courseId) || null;
  }

  function getProgress() {
    try {
      const progress = JSON.parse(localStorage.getItem("ma-demo-progress") || "{}");
      const email = user()?.email;
      return email && progress[email] && typeof progress[email] === "object" ? progress[email] : {};
    } catch (error) {
      console.error("Could not read local learning progress:", error);
      return {};
    }
  }

  function saveProgress(progress) {
    const currentUser = user();
    if (!currentUser) throw new Error("سجّل الدخول أولاً.");
    let allProgress;
    try {
      allProgress = JSON.parse(localStorage.getItem("ma-demo-progress") || "{}");
    } catch (error) {
      console.error("Could not read local learning progress:", error);
      allProgress = {};
    }
    allProgress[currentUser.email] = progress;
    localStorage.setItem("ma-demo-progress", JSON.stringify(allProgress));
  }

  function routeToAccount() {
    window.location.href = "academy_index.html#login";
  }

  function demoLogin() {
    const currentUser = user();
    if (currentUser) return `<section class="info-card"><h2>أنت مسجّل في المعاينة</h2><p>${escapeHTML(currentUser.name)} · ${escapeHTML(currentUser.role)}</p><a class="primary-button" href="${routeFor(currentUser.role)}">الانتقال إلى مساحتك <span>↗</span></a></section>`;
    const accounts = window.MAUTH?.demoUsers || [];
    return `<section class="auth-layout platform-auth-layout">
      <div class="auth-story"><span class="section-label">MOSTANAD ACADEMY</span><h2>مسارك يبدأ <em>بخطوة.</em></h2><p>اختر حساباً تجريبياً لعرض واجهات الطالب أو المدرّب أو الإدارة. لا يُطلب منك إدخال كلمة مرور حقيقية.</p>
        <p class="story-note">لتسجيل دخول حقيقي أو إرسال رابط استعادة، يلزم إعداد Supabase من مالك الموقع.</p>
      </div>
      <div class="auth-card"><h2>الدخول إلى المعاينة</h2>
        <form id="demo-login-form">
          <label for="demo-email">البريد الإلكتروني للحساب التجريبي</label>
          <input id="demo-email" name="email" type="email" autocomplete="email" required placeholder="student@mostanad.academy">
          <button class="primary-button form-submit" type="submit">متابعة المعاينة <span>↗</span></button>
        </form>
        <div class="demo-account-list"><strong>حسابات العرض</strong>${accounts.map((account) => `
          <button class="demo-account" type="button" data-action="demo-login" data-email="${escapeHTML(account.email)}">
            <span>${escapeHTML(account.name)}</span><small>${escapeHTML(account.role)} · ${escapeHTML(account.email)}</small>
          </button>`).join("")}
        </div>
        ${statusArea}
        <p class="auth-consent">هذه الهوية محلية ويمكن تجاوزها بتعديل المتصفح. <a href="academy_index.html#login">فتح بوابة الدخول المرتبطة بالخادم</a></p>
      </div>
    </section>`;
  }

  function renderCourseCard(course) {
    const lessonCount = Array.isArray(course.lessons) ? course.lessons.length : 0;
    const price = course.price === 0 ? "مجاني" : (course.priceLabel || `${course.price} ر.س`);
    return `<article class="public-course-card" data-course-id="${escapeHTML(course.id)}">
      <div class="public-course-meta"><span>${escapeHTML(course.thumbnail || "◈")}</span><span>${escapeHTML(course.level || "تدريب عملي")}</span></div>
      <h3>${escapeHTML(courseName(course))}</h3>
      <p>${escapeHTML(course.description || "مسار تدريبي تطبيقي من الأكاديمية.")}</p>
      <p class="course-card-facts"><span>${escapeHTML(course.category || "مهارات مهنية")}</span><span>${lessonCount} دروس</span><span>${escapeHTML(price)}</span></p>
      <a class="course-join-link" href="${courseLink(course)}"><span>عرض تفاصيل الدورة</span><span aria-hidden="true">↗</span></a>
    </article>`;
  }

  function renderCourses() {
    const courses = courseList().filter((course) => course.status === "published");
    const categories = [...new Set(courses.map((course) => course.category || "أخرى"))];
    return `${pageHero("LEARNING PATHS", "الدورات التدريبية", "ابحث في المسارات العملية واختر الدورة المناسبة لمستواك.")}
      <section class="platform-content">
        <div class="filter-bar">
          <label class="sr-only" for="course-search">ابحث في الدورات</label>
          <input id="course-search" type="search" placeholder="ابحث باسم الدورة أو المهارة..." autocomplete="off">
          <button class="filter-chip is-active" type="button" data-category="all">كل الدورات</button>
          ${categories.map((category) => `<button class="filter-chip" type="button" data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join("")}
        </div>
        <p id="course-count" class="field-hint" aria-live="polite"></p>
        <div class="public-course-grid" id="course-results">${courses.map(renderCourseCard).join("") || `<p class="empty-state">لا توجد دورات منشورة حالياً.</p>`}</div>
      </section>`;
  }

  function renderCourseDetail() {
    const course = getCourse(new URLSearchParams(location.search).get("id"));
    if (!course) return `${pageHero("COURSE", "لم نعثر على الدورة", "تحقق من الرابط أو استعرض الدورات المتاحة.")}<a class="primary-button" href="courses.html">استعراض الدورات <span>↗</span></a>`;
    const lessons = Array.isArray(course.lessons) ? course.lessons : [];
    return `${pageHero("COURSE DETAILS", courseName(course), course.description || "")}
      <section class="platform-content">
        ${demoNotice}
        <div class="detail-layout">
          <div class="info-card">
            <span class="section-label">ماذا ستتعلّم</span>
            <h2>من المفاهيم إلى التطبيق</h2>
            <ul class="course-outcomes">${(course.outcomes || []).map((item) => `<li>${escapeHTML(item)}</li>`).join("") || "<li>مهارات عملية مرتبطة بموضوع الدورة.</li>"}</ul>
            <h3>خطة الدروس</h3>
            <ol class="lesson-overview">${lessons.map((lesson) => `<li><span>${escapeHTML(lesson.title)}</span><small>${Number(lesson.duration) || 0} دقيقة</small></li>`).join("") || "<li>سيتم إضافة الدروس لاحقاً.</li>"}</ol>
          </div>
          <aside class="price-card">
            <span class="course-detail-label">${escapeHTML(course.level || "مستوى تدريبي")}</span>
            <h2>${course.price === 0 ? "مجاني" : escapeHTML(course.priceLabel || `${course.price} ر.س`)}</h2>
            <p>المدة: ${escapeHTML(course.duration || "—")} ساعة</p>
            <p>المدرّب: ${escapeHTML(course.instructor_name || "فريق الأكاديمية")}</p>
            <p class="checkout-box">السعر المعروض معلوماتي فقط؛ لا توجد عملية دفع إلكترونية.</p>
            <button class="primary-button" type="button" data-action="enroll" data-course="${escapeHTML(course.id)}">سجّل في الدورة <span>↗</span></button>
            <p id="platform-status" class="form-message" role="status"></p>
          </aside>
        </div>
      </section>`;
  }

  function renderDashboard() {
    const currentUser = user();
    if (!currentUser) return `${pageHero("STUDENT AREA", "لوحة الطالب")}<section class="platform-content">${demoNotice}<p>سجّل الدخول إلى المعاينة لعرض الدورات والتقدّم.</p><a class="primary-button" href="login.html">تسجيل الدخول <span>↗</span></a></section>`;
    if (currentUser.role !== "student") {
      return `${pageHero("LEARNING PORTAL", "مرحباً، " + currentUser.name)}<section class="platform-content">${demoNotice}<p>المساحة المرتبطة بحسابك: ${escapeHTML(currentUser.role)}.</p><a class="primary-button" href="${routeFor(currentUser.role)}">فتح لوحة التحكم <span>↗</span></a></section>`;
    }
    const courses = courseList().filter((course) => (currentUser.enrollments || []).includes(course.id));
    const progress = getProgress();
    const cards = courses.map((course) => {
      const lessons = Array.isArray(course.lessons) ? course.lessons : [];
      const done = (progress[course.id] || {}).completed || [];
      const percent = lessons.length ? Math.round((done.length / lessons.length) * 100) : 0;
      return `<article class="info-card dashboard-course"><span class="section-label">${escapeHTML(course.level || "مسار تدريبي")}</span><h3>${escapeHTML(courseName(course))}</h3><p>${escapeHTML(course.description || "")}</p><div class="progress-bar" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100" aria-label="التقدم في الدورة"><i style="--p:${percent}%"></i></div><p>${percent}% مكتمل · ${done.length} من ${lessons.length} دروس</p><a class="primary-button" href="${courseLink(course, "course-player.html")}">متابعة التعلّم <span>↗</span></a></article>`;
    }).join("");
    const total = courses.reduce((sum, course) => sum + (((progress[course.id] || {}).completed || []).length), 0);
    return `${pageHero("STUDENT DASHBOARD", `أهلاً بعودتك، ${currentUser.name}`, "تابع دوراتك واحتفظ بتقدّمك وملاحظاتك في هذه المعاينة.")}
      <section class="platform-content">${demoNotice}
        <div class="stats-row"><div class="stat-block"><strong>${courses.length}</strong><span>دورات مسجّلة</span></div><div class="stat-block"><strong>${total}</strong><span>دروس مكتملة</span></div><div class="stat-block"><strong><a href="certificates.html">الشهادات ↗</a></strong><span>معاينة الإكمال</span></div></div>
        <div class="section-title-row"><h2>دوراتي</h2><a href="courses.html">استكشف الدورات ↗</a></div>
        <div class="platform-card-grid">${cards || `<div class="info-card"><p>لم تسجّل في دورة بعد.</p><a href="courses.html">استعرض الدورات</a></div>`}</div>
        <nav class="workspace-links" aria-label="روابط الطالب"><a href="profile.html">إعدادات الحساب</a><a href="certificates.html">شهاداتي</a><a href="academy_index.html#login">بوابة الأكاديمية المتصلة بالخادم</a></nav>
      </section>`;
  }

  function renderPlayer() {
    const currentUser = user();
    const course = getCourse(new URLSearchParams(location.search).get("id"));
    if (!currentUser) return `${pageHero("COURSE PLAYER", "سجّل الدخول لمتابعة الدروس")}<section class="platform-content">${demoNotice}<a class="primary-button" href="login.html">تسجيل دخول المعاينة <span>↗</span></a></section>`;
    if (!course) return `${pageHero("COURSE PLAYER", "لم نعثر على الدورة")}<a href="courses.html">العودة إلى الدورات</a>`;
    const lessons = Array.isArray(course.lessons) ? course.lessons : [];
    const lessonId = safeId(new URLSearchParams(location.search).get("lesson")) || lessons[0]?.id;
    const lesson = lessons.find((item) => item.id === lessonId) || lessons[0];
    const progress = getProgress();
    const completed = (progress[course.id] || {}).completed || [];
    const isStudent = currentUser.role === "student";
    const enrolled = (currentUser.enrollments || []).includes(course.id);
    if (isStudent && !enrolled) return `${pageHero("COURSE PLAYER", "هذه الدورة غير مسجّلة في حسابك")}<section class="platform-content">${demoNotice}<a class="primary-button" href="${courseLink(course)}">عرض تفاصيل الدورة <span>↗</span></a></section>`;
    if (!lesson) return `${pageHero("COURSE PLAYER", courseName(course))}<section class="platform-content"><p>لم تتم إضافة دروس إلى هذه الدورة.</p></section>`;
    const lessonDone = completed.includes(lesson.id);
    return `${pageHero("LEARNING", courseName(course), "مساحة درس تجريبية؛ الفيديو والملفات الخاصة تتطلب إعداد التخزين الآمن.")}
      <section class="platform-content">${demoNotice}
        <div class="lesson-layout">
          <aside class="lesson-sidebar"><h2>محتوى الدورة</h2><div class="lesson-list">${lessons.map((item, index) => `<a class="lesson-item ${item.id === lesson.id ? "is-current" : ""} ${completed.includes(item.id) ? "is-done" : ""}" href="${courseLink(course, "course-player.html")}&lesson=${encodeURIComponent(item.id)}"><span>${completed.includes(item.id) ? "✓" : index + 1}</span><span>${escapeHTML(item.title)}</span></a>`).join("")}</div></aside>
          <article class="lesson-detail">
            <div class="lesson-placeholder"><span aria-hidden="true">▶</span><h2>${escapeHTML(lesson.title)}</h2><p>لا يوجد فيديو مرفوع لهذا الدرس في المعاينة.</p></div>
            <p class="lesson-content">${escapeHTML(lesson.desc || "ابدأ بمراجعة المفهوم ثم جرّبه على مستند أو سجل تدريبي.")}</p>
            <div class="lesson-actions"><a class="resource-link" href="quiz.html?id=${encodeURIComponent(course.id)}&lesson=${encodeURIComponent(lesson.id)}">افتح الاختبار التدريبي ↗</a>${isStudent ? `<button class="secondary-button" type="button" data-action="complete-lesson" data-course="${escapeHTML(course.id)}" data-lesson="${escapeHTML(lesson.id)}">${lessonDone ? "تم إكمال الدرس" : "تحديد الدرس كمكتمل"}</button>` : ""}</div>
            <section class="lesson-notes"><h3>ملاحظاتي</h3><form id="lesson-note-form" data-course="${escapeHTML(course.id)}" data-lesson="${escapeHTML(lesson.id)}"><label for="lesson-note">ملاحظة شخصية (محفوظة في هذا المتصفح)</label><textarea id="lesson-note" rows="4" maxlength="2000" placeholder="اكتب ملاحظة لهذا الدرس..."></textarea><button class="primary-button" type="submit">حفظ الملاحظة <span>↗</span></button></form></section>
            <section class="lesson-notes"><h3>مشاركة ملاحظة عامة</h3><p class="field-hint">التعليقات مشتركة مع مستخدمي هذا المتصفح فقط، وليست مرئية للمدرّب.</p><form id="lesson-comment-form" data-course="${escapeHTML(course.id)}" data-lesson="${escapeHTML(lesson.id)}"><label for="lesson-comment">تعليق</label><textarea id="lesson-comment" rows="3" maxlength="500" required></textarea><button class="secondary-button" type="submit">إضافة تعليق</button></form><div id="lesson-comments">${renderComments(course.id, lesson.id)}</div></section>
            ${statusArea}
          </article>
        </div>
      </section>`;
  }

  function commentsKey(courseId, lessonId) {
    return `ma-demo-comments:${courseId}:${lessonId}`;
  }

  function renderComments(courseId, lessonId) {
    let comments = [];
    try {
      const value = JSON.parse(localStorage.getItem(commentsKey(courseId, lessonId)) || "[]");
      if (Array.isArray(value)) comments = value;
    } catch (error) {
      console.error("Could not read local lesson comments:", error);
    }
    return comments.map((comment) => `<p class="lesson-comment"><strong>${escapeHTML(comment.name || "متعلّم")}</strong><span>${escapeHTML(comment.text)}</span></p>`).join("") || `<p class="empty-state">لا توجد تعليقات في هذه المعاينة.</p>`;
  }

  function renderQuiz() {
    const currentUser = user();
    if (!currentUser) return `${pageHero("QUIZ", "سجّل الدخول إلى المعاينة")}<section class="platform-content">${demoNotice}<a class="primary-button" href="login.html">تسجيل الدخول <span>↗</span></a></section>`;
    const course = getCourse(new URLSearchParams(location.search).get("id"));
    if (!course) return `${pageHero("QUIZ", "اختبار تدريبي")}<section class="platform-content"><p>اختر دورة أولاً لتجربة الاختبار.</p><a href="courses.html">الدورات</a></section>`;
    if (currentUser.role === "student" && !(currentUser.enrollments || []).includes(course.id)) {
      return `${pageHero("QUIZ", "سجّل في الدورة أولاً")}<section class="platform-content">${demoNotice}<p>يظهر الاختبار التجريبي بعد التسجيل في الدورة.</p><a class="primary-button" href="${courseLink(course)}">عرض تفاصيل الدورة <span>↗</span></a></section>`;
    }
    const lessonId = safeId(new URLSearchParams(location.search).get("lesson"));
    const lesson = (course.lessons || []).find((item) => item.id === lessonId) || course.lessons?.[0];
    const options = ["رقم الإصدار وحالة المراجعة", "اسم الملف فقط", "لون المجلد", "عدد صفحات المستند"];
    return `${pageHero("PRACTICE QUIZ", "اختبار تدريبي", courseName(course))}
      <section class="platform-content">${demoNotice}
        <article class="info-card quiz-preview"><p class="field-hint">سؤال معاينة للتعلّم فقط؛ التصحيح هنا يعمل في المتصفح ويمكن تعديله، ولا يعتمد نتيجة رسمية.</p>
          <form id="practice-quiz-form" data-course="${escapeHTML(course.id)}" data-lesson="${escapeHTML(lesson?.id || "")}">
            <fieldset><legend>ما المعلومة الأهم للتحقق منها عند مراجعة إصدار مستند؟</legend>
              ${options.map((option, index) => `<label class="quiz-option-choice"><input type="radio" name="answer" value="${index}" required><span>${escapeHTML(option)}</span></label>`).join("")}
            </fieldset>
            <button class="primary-button" type="submit">إظهار النتيجة <span>↗</span></button>
          </form>
          <p id="quiz-result" class="form-message" role="status" aria-live="polite"></p>
        </article>
      </section>`;
  }

  function renderCertificates() {
    const currentUser = user();
    if (!currentUser) return `${pageHero("CERTIFICATES", "شهاداتي")}<section class="platform-content">${demoNotice}<a class="primary-button" href="login.html">تسجيل دخول المعاينة <span>↗</span></a></section>`;
    const progress = getProgress();
    const completedCourses = courseList().filter((course) => {
      const done = (progress[course.id] || {}).completed || [];
      return course.lessons?.length && done.length >= course.lessons.length;
    });
    const cards = completedCourses.map((course) => `<article class="info-card"><span class="section-label">LOCAL PREVIEW</span><h2>${escapeHTML(courseName(course))}</h2><p>اكتملت دروس المعاينة. هذا ليس اعتماداً أو شهادة قابلة للتحقق.</p><button class="secondary-button" type="button" data-action="print-preview" data-course="${escapeHTML(course.id)}">طباعة ملخص المعاينة</button></article>`).join("");
    return `${pageHero("CERTIFICATES", "شهاداتي", "الشهادات الرسمية تتطلب تحقق الإكمال وإصداراً من الخادم.")}
      <section class="platform-content">${demoNotice}<div class="platform-card-grid">${cards || `<div class="info-card"><p>لا توجد دورة مكتملة في بيانات المعاينة بعد.</p><a href="dashboard.html">متابعة التعلّم</a></div>`}</div><div id="certificate-print-area" hidden></div></section>`;
  }

  function renderProfile() {
    const currentUser = user();
    if (!currentUser) return `${pageHero("ACCOUNT", "إعدادات الملف")}<section class="platform-content">${demoNotice}<a class="primary-button" href="login.html">تسجيل الدخول للمعاينة <span>↗</span></a></section>`;
    return `${pageHero("ACCOUNT SETTINGS", "الملف الشخصي", "تُحفظ هذه التعديلات محلياً في هذه المعاينة فقط.")}
      <section class="platform-content">${demoNotice}<form id="profile-form" class="contact-form">
        <label for="profile-name">الاسم الظاهر</label><input id="profile-name" name="name" maxlength="100" required value="${escapeHTML(currentUser.name)}">
        <label for="profile-email">البريد الإلكتروني</label><input id="profile-email" type="email" value="${escapeHTML(currentUser.email)}" disabled>
        <label for="profile-avatar">رابط صورة الملف الشخصي</label><input id="profile-avatar" name="avatar" type="url" maxlength="500" value="${escapeHTML(currentUser.avatar || "")}" placeholder="https://...">
        <p class="field-hint">لا ترفع صورة شخصية أو بيانات حساسة إلى هذه النسخة المحلية.</p>
        <button class="primary-button" type="submit">حفظ التغييرات <span>↗</span></button>
        <button class="danger-button" type="button" data-action="logout">تسجيل الخروج</button>
      </form>${statusArea}<p class="field-hint">تغيير كلمة المرور واستعادة الحساب غير متاحين هنا. استخدم <a href="academy_index.html#login">بوابة الأكاديمية عند إعداد Supabase</a>.</p></section>`;
  }

  function renderInstructor() {
    const currentUser = user();
    if (!currentUser) return `${pageHero("INSTRUCTOR AREA", "مساحة المدرّب")}<section class="platform-content">${demoNotice}<a class="primary-button" href="login.html">تسجيل الدخول للمعاينة <span>↗</span></a></section>`;
    if (!["instructor", "admin"].includes(currentUser.role)) return `${pageHero("INSTRUCTOR AREA", "هذه المساحة للمدرّبين")}<section class="platform-content">${demoNotice}<a href="dashboard.html">العودة إلى لوحة الطالب</a></section>`;
    const owned = courseList().filter((course) => course.instructor_id === currentUser.email || course.instructor_name === currentUser.name);
    const cards = owned.map((course) => `<article class="info-card"><span class="section-label">${escapeHTML(course.status || "draft")}</span><h3>${escapeHTML(courseName(course))}</h3><p>${escapeHTML(course.description || "")}</p><p>${(course.lessons || []).length} دروس · ${(currentUser.enrollments || []).includes(course.id) ? 1 : 0} تسجيل محلي</p>${currentUser.role === "admin" ? `<button class="secondary-button" type="button" data-action="publish-course" data-course="${escapeHTML(course.id)}" data-published="${course.status === "published"}">${course.status === "published" ? "إيقاف النشر" : "نشر الدورة"}</button>` : ""}</article>`).join("");
    return `${pageHero("INSTRUCTOR WORKSPACE", `مرحباً، ${currentUser.name}`, "أنشئ مسودات دورات محلية لمعاينة سير العمل.")}
      <section class="platform-content">${demoNotice}
        <div class="stats-row"><div class="stat-block"><strong>${owned.length}</strong><span>دورات محلية</span></div><div class="stat-block"><strong>${owned.reduce((sum, item) => sum + (item.lessons || []).length, 0)}</strong><span>دروس</span></div><div class="stat-block"><strong>—</strong><span>الأرباح (الدفع غير مفعّل)</span></div></div>
        <div class="platform-card-grid">${cards || `<p class="empty-state">لا توجد دورات أنشأتها في هذه المعاينة.</p>`}</div>
        <form id="create-course-form" class="contact-form">
          <h2>إنشاء مسودة دورة</h2>
          <label for="new-course-title">اسم الدورة</label><input id="new-course-title" name="title" maxlength="120" required>
          <label for="new-course-description">وصف مختصر</label><textarea id="new-course-description" name="description" rows="3" maxlength="700" required></textarea>
          <label for="new-course-category">الفئة</label><input id="new-course-category" name="category" maxlength="80" required>
          <label for="new-course-level">المستوى</label><select id="new-course-level" name="level"><option>مبتدئ</option><option>متوسط</option><option>متقدم</option></select>
          <button class="primary-button" type="submit">حفظ كمسودة <span>↗</span></button>
        </form>${statusArea}
        <p class="field-hint">رفع الفيديوهات والملفات الخاصة، وإدارة الطلاب، والنشر الحقيقي تحتاج صلاحيات خادمية وتخزيناً خاصاً.</p>
      </section>`;
  }

  function renderAdmin() {
    const currentUser = user();
    if (!currentUser) return `${pageHero("ADMINISTRATION", "لوحة الإدارة")}<section class="platform-content">${demoNotice}<a class="primary-button" href="login.html">تسجيل دخول المعاينة <span>↗</span></a></section>`;
    if (currentUser.role !== "admin") return `${pageHero("ADMINISTRATION", "صلاحية المدير مطلوبة")}<section class="platform-content">${demoNotice}<a href="${routeFor(currentUser.role)}">العودة إلى مساحتك</a></section>`;
    const courses = courseList();
    const users = window.MAUTH?.getUsers() || [];
    return `${pageHero("ADMIN DASHBOARD", "إدارة الأكاديمية", "مؤشرات محلية للمعاينة فقط؛ لا تمثل بيانات إنتاجية.")}
      <section class="platform-content">${demoNotice}
        <div class="stats-row"><div class="stat-block"><strong>${users.length + (window.MAUTH?.demoUsers || []).length}</strong><span>حسابات معاينة</span></div><div class="stat-block"><strong>${courses.length}</strong><span>دورات</span></div><div class="stat-block"><strong>${courses.reduce((sum, item) => sum + (item.lessons || []).length, 0)}</strong><span>دروس</span></div><div class="stat-block"><strong>—</strong><span>مدفوعات (غير متصلة)</span></div></div>
        <h2>إدارة الدورات</h2><div class="platform-card-grid">${courses.map((course) => `<article class="info-card"><span class="section-label">${escapeHTML(course.status || "draft")}</span><h3>${escapeHTML(courseName(course))}</h3><p>${escapeHTML(course.category || "دون فئة")} · ${(course.lessons || []).length} دروس</p><button class="secondary-button" type="button" data-action="publish-course" data-course="${escapeHTML(course.id)}" data-published="${course.status === "published"}">${course.status === "published" ? "إلغاء النشر محلياً" : "نشر محلياً"}</button></article>`).join("")}</div>
        <h2>مستخدمو المعاينة</h2><div class="admin-user-list">${[...(window.MAUTH?.demoUsers || []), ...users].map((account) => `<p><strong>${escapeHTML(account.name)}</strong><span>${escapeHTML(account.email)} · ${escapeHTML(account.role)}</span></p>`).join("")}</div>
        <p class="field-hint">إدارة الحسابات والصلاحيات الحقيقية يجب أن تتم عبر وظائف الإدارة المحمية في Supabase. لا تُجرِ تغييرات حقيقية على الحسابات من هذه الصفحة.</p>
      </section>`;
  }

  function renderAbout() {
    return `${pageHero("ABOUT US", "نتعلّم من واقع المشاريع", "Mostanad Academy منصة عربية للتعلّم المهني في ضبط الوثائق وإدارة المشاريع الهندسية.")}
      <section class="platform-content">${demoNotice}
        <div class="about-grid"><div class="about-mark"><img src="mostanad-academy-logo.png" alt="شعار Mostanad Academy" width="160" height="160"></div><div class="info-card"><h2>تعلّم واضح، وتطبيق عملي</h2><p>نبني مسارات تدريبية تربط المفاهيم اليومية بممارسة المشروع: تنظيم المستندات، متابعة المراجعات، تنسيق التقديمات، وإنشاء سجلات قابلة للاستخدام.</p><p>المكتبة والنماذج المتاحة عبر الموقع موارد مساندة؛ راجع متطلبات مشروعك قبل استخدامها.</p><a class="primary-button" href="courses.html">استكشف الدورات <span>↗</span></a></div></div>
        <div class="values-grid"><article class="value-card"><h3>خطوات عملية</h3><p>أمثلة ومهارات يمكن تطبيقها مباشرة.</p></article><article class="value-card"><h3>تعلّم مرن</h3><p>مسارات مصممة للمبتدئ والممارس.</p></article><article class="value-card"><h3>محتوى مسؤول</h3><p>لا نعرض سعراً أو اعتماداً على أنه عملية دفع أو شهادة رسمية.</p></article></div>
      </section>`;
  }

  function renderContact() {
    return `${pageHero("CONTACT", "تواصل مع الأكاديمية", "للاستفسارات عن الدورات أو المكتبة، أرسل رسالة عبر قناة التواصل.")}
      <section class="platform-content">${demoNotice}
        <div class="contact-grid"><div><div class="contact-item"><span>✉</span><div><strong>الدورات والاشتراكات</strong><p>أرسل استفسارك عبر واتساب وسيتم الرد حسب التوفر.</p></div></div><a class="primary-button" href="https://wa.me/201156286464" target="_blank" rel="noopener noreferrer">فتح واتساب <span>↗</span></a></div>
        <form id="contact-form" class="contact-form"><label for="contact-name">الاسم</label><input id="contact-name" name="name" maxlength="100" required><label for="contact-message">رسالتك</label><textarea id="contact-message" name="message" rows="5" maxlength="2000" required></textarea><button class="primary-button" type="submit">متابعة إلى واتساب <span>↗</span></button><p class="field-hint">لن تُرسل بياناتك تلقائياً؛ سيفتح واتساب لمراجعة الرسالة وإرسالها يدوياً.</p></form></div>
      </section>`;
  }

  function renderFAQ() {
    const questions = [
      ["كيف أحصل على حساب حقيقي؟", "يجب إعداد بوابة Supabase ودعوة الحساب من مسؤول الأكاديمية. التسجيل في هذه الصفحة ينشئ حساب معاينة محلياً فقط."],
      ["هل يمكن الدفع عبر الموقع؟", "لا. الأسعار المعروضة للتعريف فقط، ولا تُدخل بيانات بطاقة أو تحوّل أموالاً عبر هذه النسخة."],
      ["هل يمكن تنزيل الدروس أو مشاهدة الفيديو؟", "تحتاج الفيديوهات والموارد إلى رفعها على مساحة خاصة وإعداد سياسات وصول الخادم. هذه النسخة لا تحتوي ملفات فيديو للدروس."],
      ["كيف تصدر الشهادة؟", "تُصدر الشهادة المعتمدة فقط عبر وظيفة خادمية بعد التحقق من الاختبارات والإكمال. ملخص المعاينة القابل للطباعة ليس شهادة رسمية."],
      ["هل بيانات لوحة التحكم خاصة؟", "بيانات المعاينة محفوظة في localStorage ويمكن تعديلها من المتصفح؛ لا تعتبرها بيانات خاصة أو صلاحيات آمنة."],
    ];
    return `${pageHero("FAQ", "الأسئلة الشائعة", "إجابات حول الدورات والحسابات والميزات المتاحة.")}
      <section class="platform-content">${demoNotice}<div class="portal-faq-grid">${questions.map(([question, answer]) => `<details class="faq-item"><summary>${escapeHTML(question)}</summary><p>${escapeHTML(answer)}</p></details>`).join("")}</div><p><a href="contact.html">لم تجد إجابتك؟ تواصل معنا ↗</a></p></section>`;
  }

  function renderForgotPassword() {
    return `${pageHero("ACCOUNT RECOVERY", "استعادة كلمة المرور", "استعادة كلمة المرور تتطلب مزوّد هوية متصلاً.")}
      <section class="platform-content">${demoNotice}<article class="info-card"><h2>لا تُدخل كلمة مرورك في نموذج معاينة</h2><p>لا تخزّن هذه الصفحة كلمات المرور ولا ترسل رسائل بريد. عند إعداد Supabase، افتح بوابة الدخول المتصلة لطلب رابط استعادة آمن.</p><a class="primary-button" href="academy_index.html#login">فتح بوابة الأكاديمية <span>↗</span></a></article></section>`;
  }

  function renderRegister() {
    return `${pageHero("CREATE ACCOUNT", "إنشاء حساب طالب", "إنشاء حساب حقيقي والتحقق من البريد غير متاحين حتى إعداد خدمة الهوية.")}
      <section class="platform-content">${demoNotice}<div class="auth-layout platform-auth-layout"><div class="auth-story"><h2>ابدأ رحلتك <em>التعليمية.</em></h2><p>استخدم النموذج لإنشاء هوية تجريبية محفوظة على هذا الجهاز فقط. لا يتم إرسال بريد تحقق.</p><a href="academy_index.html#login">بوابة الدخول الحقيقية عند تفعيلها ↗</a></div>
        <form id="demo-register-form" class="auth-card"><label for="register-name">الاسم</label><input id="register-name" name="name" autocomplete="name" maxlength="100" required><label for="register-email">البريد الإلكتروني</label><input id="register-email" name="email" type="email" autocomplete="email" maxlength="254" required><button class="primary-button form-submit" type="submit">إنشاء حساب معاينة <span>↗</span></button>${statusArea}<p class="auth-consent">لا تضع كلمة مرور أو معلومات حساسة هنا. <a href="privacy-policy.html">سياسة الخصوصية</a></p></form>
      </div></section>`;
  }

  function renderLogin() {
    return `${pageHero("LEARNING PORTAL", "تسجيل الدخول", "اختر تجربة محلية أو افتح البوابة المتصلة بالخادم.")}
      <section class="platform-content">${demoNotice}${demoLogin()}
        <article class="info-card provider-link"><h2>للحسابات الفعلية</h2><p>تسجيل الدخول بالبريد وكلمة المرور، Google، التحقق من البريد، واستعادة الحساب لا تعمل إلا بعد إعداد Supabase.</p><a class="primary-button" href="academy_index.html#login">فتح بوابة الحسابات الفعلية <span>↗</span></a></article>
      </section>`;
  }

  function render() {
    const renderers = {
      login: renderLogin,
      register: renderRegister,
      "forgot-password": renderForgotPassword,
      courses: renderCourses,
      course: renderCourseDetail,
      dashboard: renderDashboard,
      player: renderPlayer,
      quiz: renderQuiz,
      certificates: renderCertificates,
      profile: renderProfile,
      instructor: renderInstructor,
      admin: renderAdmin,
      about: renderAbout,
      contact: renderContact,
      faq: renderFAQ,
    };
    document.title = `${pageTitles[page] || "Mostanad Academy"} | Mostanad Academy`;
    if (renderers[page]) main.innerHTML = renderers[page]();
    bindPageEvents();
    if (page === "courses") filterCourses();
    if (page === "player") loadNote();
  }

  function announce(message, isError = false) {
    const target = document.querySelector("#platform-status");
    if (!target) return;
    target.textContent = message;
    target.classList.toggle("is-error", isError);
  }

  function redirectToDashboard(account) {
    window.location.href = routeFor(account.role);
  }

  function login(email) {
    try {
      const account = window.MAUTH.login(email);
      redirectToDashboard(account);
    } catch (error) {
      announce(error.message || "تعذّر تسجيل الدخول إلى المعاينة.", true);
    }
  }

  function bindPageEvents() {
    main.querySelectorAll("[data-action='demo-login']").forEach((button) => {
      button.addEventListener("click", () => login(button.dataset.email));
    });
    main.querySelectorAll("[data-action='enroll']").forEach((button) => {
      button.addEventListener("click", () => {
        const account = user();
        if (!account) {
          window.location.href = "login.html";
          return;
        }
        if (account.role !== "student") {
          announce("التسجيل في الدورات متاح للطالب في هذه المعاينة فقط.", true);
          return;
        }
        const course = getCourse(button.dataset.course);
        if (!course) return announce("تعذّر العثور على الدورة.", true);
        const enrollments = [...new Set([...(account.enrollments || []), course.id])];
        window.MAUTH.updateUser({ enrollments });
        window.location.href = courseLink(course, "course-player.html");
      });
    });
    main.querySelectorAll("[data-action='complete-lesson']").forEach((button) => {
      button.addEventListener("click", () => {
        const current = getProgress();
        const courseId = safeId(button.dataset.course);
        const lessonId = safeId(button.dataset.lesson);
        if (!courseId || !lessonId) return announce("تعذّر حفظ التقدّم.", true);
        const courseProgress = current[courseId] || { completed: [] };
        courseProgress.completed = [...new Set([...(courseProgress.completed || []), lessonId])];
        current[courseId] = courseProgress;
        try {
          saveProgress(current);
          render();
        } catch (error) {
          announce(error.message || "تعذّر حفظ التقدّم.", true);
        }
      });
    });
    main.querySelectorAll("[data-action='publish-course']").forEach((button) => {
      button.addEventListener("click", () => {
        if (user()?.role !== "admin") return announce("هذه العملية للمدير فقط.", true);
        const courseId = safeId(button.dataset.course);
        const published = button.dataset.published !== "true";
        if (!courseId || !window.MAcourses.updateCourseInLib(courseId, { status: published ? "published" : "draft" })) {
          return announce("تعذّر تحديث حالة الدورة.", true);
        }
        render();
      });
    });
    main.querySelector("#demo-login-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      login(new FormData(event.currentTarget).get("email"));
    });
    main.querySelector("#demo-register-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      try {
        const account = window.MAUTH.registerUser({
          name: new FormData(form).get("name"),
          email: new FormData(form).get("email"),
        });
        redirectToDashboard(account);
      } catch (error) {
        announce(error.message || "تعذّر إنشاء حساب المعاينة.", true);
      }
    });
    main.querySelector("#profile-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      try {
        window.MAUTH.updateUser({ name: String(values.get("name") || "").trim(), avatar: String(values.get("avatar") || "").trim() });
        announce("تم حفظ الملف في بيانات المعاينة.");
      } catch (error) {
        announce(error.message || "تعذّر حفظ الملف.", true);
      }
    });
    main.querySelector("#create-course-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const account = user();
      if (!account || !["instructor", "admin"].includes(account.role)) return announce("لا تملك صلاحية إنشاء دورة.", true);
      const values = new FormData(event.currentTarget);
      const id = `demo-${Date.now().toString(36)}`;
      try {
        window.MAcourses.saveCourseToLib({
          id,
          title: String(values.get("title") || "").trim(),
          titleEn: String(values.get("title") || "").trim(),
          description: String(values.get("description") || "").trim(),
          descriptionEn: String(values.get("description") || "").trim(),
          category: String(values.get("category") || "").trim(),
          level: String(values.get("level") || "مبتدئ"),
          levelEn: "",
          duration: 0,
          price: 0,
          priceLabel: "للاستفسار",
          thumbnail: "◈",
          status: "draft",
          instructor_id: account.email,
          instructor_name: account.name,
          outcomes: [],
          lessons: [],
        });
        render();
        announce("حُفظت الدورة كمسودة محلية.");
      } catch (error) {
        announce(error.message || "تعذّر حفظ الدورة.", true);
      }
    });
    main.querySelector("#lesson-note-form")?.addEventListener("submit", saveNote);
    main.querySelector("#lesson-comment-form")?.addEventListener("submit", addComment);
    main.querySelector("#practice-quiz-form")?.addEventListener("submit", gradeQuiz);
    main.querySelector("#contact-form")?.addEventListener("submit", openContactMessage);
    main.querySelectorAll("[data-action='print-preview']").forEach((button) => {
      button.addEventListener("click", () => printPreview(button.dataset.course));
    });
    main.querySelector("#course-search")?.addEventListener("input", filterCourses);
    main.querySelectorAll("[data-category]").forEach((button) => {
      button.addEventListener("click", () => {
        main.querySelectorAll("[data-category]").forEach((chip) => chip.classList.toggle("is-active", chip === button));
        filterCourses();
      });
    });
    main.querySelector("[data-action='logout']")?.addEventListener("click", () => window.MAUTH.logout());
  }

  function filterCourses() {
    const search = (main.querySelector("#course-search")?.value || "").trim().toLocaleLowerCase();
    const category = main.querySelector(".filter-chip.is-active")?.dataset.category || "all";
    let visible = 0;
    main.querySelectorAll("#course-results .public-course-card").forEach((card) => {
      const course = courseList().find((item) => item.id === card.querySelector("[data-course-id]")?.dataset.courseId)
        || courseList().find((item) => item.title && card.textContent.includes(item.title));
      const text = card.textContent.toLocaleLowerCase();
      const matches = (!search || text.includes(search)) && (category === "all" || course?.category === category);
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    const count = main.querySelector("#course-count");
    if (count) count.textContent = `${visible} دورة`;
  }

  function noteKey(courseId, lessonId) {
    const email = user()?.email || "anonymous";
    return `ma-demo-note:${email}:${courseId}:${lessonId}`;
  }

  function loadNote() {
    const form = main.querySelector("#lesson-note-form");
    if (!form) return;
    try {
      main.querySelector("#lesson-note").value = localStorage.getItem(noteKey(form.dataset.course, form.dataset.lesson)) || "";
    } catch (error) {
      console.error("Could not load local lesson note:", error);
    }
  }

  function saveNote(event) {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      localStorage.setItem(noteKey(form.dataset.course, form.dataset.lesson), main.querySelector("#lesson-note").value.slice(0, 2000));
      announce("تم حفظ الملاحظة في هذا المتصفح.");
    } catch (error) {
      announce("تعذّر حفظ الملاحظة في التخزين المحلي.", true);
      console.error("Could not save local lesson note:", error);
    }
  }

  function addComment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const text = main.querySelector("#lesson-comment").value.trim();
    if (!text) return;
    const key = commentsKey(form.dataset.course, form.dataset.lesson);
    try {
      const comments = JSON.parse(localStorage.getItem(key) || "[]");
      const safeComments = Array.isArray(comments) ? comments : [];
      safeComments.push({ name: user()?.name || "متعلّم", text: text.slice(0, 500) });
      localStorage.setItem(key, JSON.stringify(safeComments.slice(-50)));
      render();
      announce("أُضيف التعليق إلى معاينة هذا المتصفح.");
    } catch (error) {
      announce("تعذّر حفظ التعليق في التخزين المحلي.", true);
      console.error("Could not save local lesson comment:", error);
    }
  }

  function gradeQuiz(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const answer = new FormData(form).get("answer");
    const result = main.querySelector("#quiz-result");
    const passed = answer === "0";
    if (passed && user()?.role === "student") {
      const current = getProgress();
      const courseId = safeId(form.dataset.course);
      const lessonId = safeId(form.dataset.lesson);
      if (courseId && lessonId) {
        const courseProgress = current[courseId] || { completed: [] };
        courseProgress.completed = [...new Set([...(courseProgress.completed || []), lessonId])];
        current[courseId] = courseProgress;
        try {
          saveProgress(current);
        } catch (error) {
          console.error("Could not save demo quiz progress:", error);
        }
      }
    }
    result.textContent = passed
      ? "إجابة صحيحة في اختبار المعاينة. لا تُعدّ نتيجة معتمدة."
      : "ليست الإجابة الصحيحة في هذا السؤال التدريبي. حاول مرة أخرى.";
    result.classList.toggle("is-error", !passed);
  }

  function printPreview(courseId) {
    const course = getCourse(courseId);
    const currentUser = user();
    if (!course || !currentUser) return;
    const printArea = main.querySelector("#certificate-print-area");
    printArea.innerHTML = `<article class="certificate-card"><span class="certificate-topline">MOSTANAD ACADEMY · LOCAL PREVIEW</span><h2>ملخص إكمال تدريبي</h2><p>هذا مستند معاينة محلي، وليس شهادة رسمية أو قابلة للتحقق.</p><strong class="certificate-name">${escapeHTML(currentUser.name)}</strong><span class="certificate-course">${escapeHTML(courseName(course))}</span><p>${new Date().toLocaleDateString("ar")}</p></article>`;
    printArea.hidden = false;
    document.body.classList.add("print-certificate");
    window.print();
    window.setTimeout(() => {
      document.body.classList.remove("print-certificate");
      printArea.hidden = true;
    }, 500);
  }

  function openContactMessage(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const text = `مرحباً، أنا ${String(values.get("name") || "").trim()}. ${String(values.get("message") || "").trim()}`;
    window.open(`https://wa.me/201156286464?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  render();
})();
