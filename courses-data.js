/**
 * courses-data.js — Mostanad Academy
 * نظام إدارة الكورسات بـ localStorage
 * يعمل بدون Supabase — يُحمَّل في academy_index.html و admin.html
 */

/* ====== الكورسات الافتراضية ====== */
const DEFAULT_COURSES = [
  {
    id: 'course-001',
    title: 'أساسيات ضبط الوثائق',
    titleEn: 'Document Control Fundamentals',
    category: 'ضبط الوثائق',
    level: 'مبتدئ',
    levelEn: 'Foundation',
    duration: 8,
    price: 0,
    priceLabel: 'مجاني',
    thumbnail: '📋',
    color: '#dbeafe',
    status: 'published',
    description: 'ابدأ بدورة حياة المستندات، الترقيم، المراجعات، وسجلات التتبّع.',
    descriptionEn: 'Start with document lifecycles, numbering, revisions, and tracking registers.',
    outcomes: [
      'شرح دورة حياة المستند ومسؤوليات ضبطه',
      'قراءة أرقام المستندات وحالات المراجعة',
      'إنشاء سجل أولي ومتابعة المواعيد',
    ],
    prereq: 'لا يوجد خبرة سابقة مطلوبة',
    students: 128,
    lessons: [
      { id: 'l-001-1', title: 'مقدمة في ضبط الوثائق', duration: 20, free: true, desc: 'تعرّف على دور مسؤول ضبط الوثائق ومسار المستند داخل المشروع.' },
      { id: 'l-001-2', title: 'دورة حياة المستند', duration: 25, free: false, desc: 'من الإنشاء إلى الاعتماد والأرشفة — كيف تتحرك الوثيقة بين الفرق.' },
      { id: 'l-001-3', title: 'أنظمة الترقيم والمراجعات', duration: 30, free: false, desc: 'قراءة أرقام المستندات وحالات المراجعة دون لبس.' },
      { id: 'l-001-4', title: 'إنشاء سجل المستندات', duration: 35, free: false, isQuiz: true, desc: 'ابنِ سجلاً أولياً ثم اختبر فهمك في اختبار قصير.' },
    ],
    date: '2024-01-01',
  },
  {
    id: 'course-002',
    title: 'نماذج IR وSD وDS وRFA وRFI',
    titleEn: 'IR, SD, DS, RFA & RFI Forms',
    category: 'نماذج المشروع',
    level: 'متوسط',
    levelEn: 'Intermediate',
    duration: 10,
    price: 199,
    priceLabel: '199 ر.س',
    thumbnail: '📝',
    color: '#d1fae5',
    status: 'published',
    description: 'احترف تعبئة وإرسال وتتبّع نماذج المشروع الأساسية بأسلوب عملي.',
    descriptionEn: 'Master filling, submitting, and tracking essential project forms professionally.',
    outcomes: [
      'إعداد طلب فحص IR بشكل صحيح',
      'تقديم الرسومات التنفيذية SD مع التتبع',
      'إنشاء RFA وRFI باحترافية',
      'متابعة الردود والتعليقات',
    ],
    prereq: 'إكمال دورة الأساسيات',
    students: 86,
    lessons: [
      { id: 'l-002-1', title: 'طلب الفحص (IR)', duration: 25, free: true, desc: 'إعداد طلب فحص صحيح ومتابعته حتى الإغلاق.' },
      { id: 'l-002-2', title: 'الرسومات التنفيذية (SD)', duration: 30, free: false, desc: 'تتبع إصدارات الرسومات التنفيذية والتعليقات.' },
      { id: 'l-002-3', title: 'تقديم المستندات (DS)', duration: 25, free: false, desc: 'تجميع حزمة التقديم ومراجعة بياناتها.' },
      { id: 'l-002-4', title: 'طلب الموافقة (RFA)', duration: 30, free: false, desc: 'صياغة طلب موافقة واضح وقابل للتتبع.' },
      { id: 'l-002-5', title: 'طلب المعلومات (RFI)', duration: 25, free: false, isQuiz: true, desc: 'اختبر قدرتك على إدارة RFI حتى الرد النهائي.' },
    ],
    date: '2024-02-01',
  },
  {
    id: 'course-003',
    title: 'Excel وسجلات المشروع',
    titleEn: 'Excel & Project Registers',
    category: 'Excel وأتمتة',
    level: 'متوسط',
    levelEn: 'Intermediate',
    duration: 12,
    price: 249,
    priceLabel: '249 ر.س',
    thumbnail: '📊',
    color: '#fef3c7',
    status: 'published',
    description: 'أنشئ سجلات تتبع احترافية لـ IR وSD وRFI ولوحات متابعة بـ Excel.',
    descriptionEn: 'Build professional tracking registers for IR, SD, RFI and Excel dashboards.',
    outcomes: [
      'إنشاء سجل IR متكامل بـ Excel',
      'بناء لوحة متابعة تلقائية',
      'استخدام دوال VLOOKUP وCOUNTIF',
      'طباعة تقارير احترافية',
    ],
    prereq: 'معرفة أساسية بـ Excel',
    students: 74,
    lessons: [
      { id: 'l-003-1', title: 'هيكل سجل IR في Excel', duration: 35, free: true, desc: 'ابنِ أعمدة السجل الأساسية وصِيغ الحالة.' },
      { id: 'l-003-2', title: 'سجل SD والرسومات', duration: 30, free: false, desc: 'اربط الرسومات بالمراجعات ومواعيد الرد.' },
      { id: 'l-003-3', title: 'لوحة المتابعة التلقائية', duration: 40, free: false, desc: 'لوحة مؤشرات بسيطة من بيانات السجل.' },
      { id: 'l-003-4', title: 'الدوال المتقدمة والتقارير', duration: 35, free: false, isQuiz: true, desc: 'VLOOKUP وCOUNTIF ثم اختبار قصير.' },
    ],
    date: '2024-03-01',
  },
  {
    id: 'course-004',
    title: 'نظام الأرشفة الرقمي',
    titleEn: 'Digital Archiving System',
    category: 'أرشفة',
    level: 'متوسط',
    levelEn: 'Intermediate',
    duration: 8,
    price: 179,
    priceLabel: '179 ر.س',
    thumbnail: '🗂️',
    color: '#ede9fe',
    status: 'published',
    description: 'بناء نظام أرشفة رقمي منظم يدعم كل مراحل المشروع من البداية للتسليم.',
    descriptionEn: 'Build an organized digital archiving system supporting all project phases.',
    outcomes: [
      'تصميم هيكل أرشيف رقمي احترافي',
      'تصنيف المستندات حسب الفئة والمرحلة',
      'إنشاء سياسة تسمية الملفات',
      'التسليم النهائي للمشروع',
    ],
    prereq: 'أساسيات ضبط الوثائق',
    students: 61,
    lessons: [
      { id: 'l-004-1', title: 'مبادئ الأرشفة الرقمية', duration: 25, free: true, desc: 'لماذا يفشل الأرشيف العشوائي وكيف تبني أساساً واضحاً.' },
      { id: 'l-004-2', title: 'هيكل المجلدات وسياسة التسمية', duration: 30, free: false, desc: 'قواعد تسمية قابلة للتوسع عبر فرق المشروع.' },
      { id: 'l-004-3', title: 'الأرشفة حسب مراحل المشروع', duration: 30, free: false, desc: 'اربط المجلدات بمراحل التصميم والتنفيذ والتسليم.' },
      { id: 'l-004-4', title: 'التسليم النهائي والـ Closeout', duration: 25, free: false, isQuiz: true, desc: 'حزمة التسليم النهائية واختبار الإكمال.' },
    ],
    date: '2024-04-01',
  },
  {
    id: 'course-005',
    title: 'إدارة المشاريع لمسؤول ضبط الوثائق',
    titleEn: 'Project Management for Document Controllers',
    category: 'إدارة المشاريع',
    level: 'متقدم',
    levelEn: 'Advanced',
    duration: 15,
    price: 349,
    priceLabel: '349 ر.س',
    thumbnail: '🏗️',
    color: '#ccfbf1',
    status: 'published',
    description: 'فهم دور الـ DC في سياق إدارة المشاريع الكاملة — من التخطيط للتسليم.',
    descriptionEn: 'Understand the DC role in full project management context from planning to handover.',
    outcomes: [
      'فهم مراحل المشروع الهندسي',
      'التنسيق مع فرق المشروع المختلفة',
      'إدارة التوزيع والاعتمادات',
      'إعداد خطة ضبط الوثائق',
    ],
    prereq: 'إكمال دورتَي الأساسيات والنماذج',
    students: 42,
    lessons: [
      { id: 'l-005-1', title: 'دور DC في دورة حياة المشروع', duration: 30, free: true, desc: 'موضع ضبط الوثائق داخل التخطيط والتنفيذ والإغلاق.' },
      { id: 'l-005-2', title: 'التنسيق مع الاستشاري والمقاول', duration: 35, free: false, desc: 'قنوات التواصل الرسمية وتوثيق الردود.' },
      { id: 'l-005-3', title: 'إدارة التوزيع والاعتمادات', duration: 40, free: false, desc: 'مصفوفة التوزيع وتتبع الاعتماد.' },
      { id: 'l-005-4', title: 'خطة ضبط الوثائق DCP', duration: 40, free: false, desc: 'عناصر خطة ضبط الوثائق العملية.' },
      { id: 'l-005-5', title: 'التسليم والـ As-Built', duration: 35, free: false, isQuiz: true, desc: 'إغلاق المشروع واختبار شامل للدورة.' },
    ],
    date: '2024-05-01',
  },
];

/* ====== CRUD Functions ====== */

/**
 * جلب كل الكورسات (الافتراضية + المضافة من الأدمن)
 */
function getCourses(filterStatus) {
  const stored = JSON.parse(localStorage.getItem('ma_courses') || '[]');
  // دمج الكورسات الافتراضية مع المضافة — نتجنب التكرار بالـ id
  const storedIds = new Set(stored.map(c => c.id));
  const defaults = DEFAULT_COURSES.filter(c => !storedIds.has(c.id));
  const all = [...defaults, ...stored];
  if (filterStatus) return all.filter(c => c.status === filterStatus);
  return all;
}

/**
 * جلب كورس واحد بالـ id
 */
function getCourseById(id) {
  return getCourses().find(c => c.id === id) || null;
}

/**
 * حفظ كورس جديد
 */
function saveCourseToLib(courseData) {
  const stored = JSON.parse(localStorage.getItem('ma_courses') || '[]');
  const existing = stored.findIndex(c => c.id === courseData.id);
  if (existing >= 0) {
    stored[existing] = { ...stored[existing], ...courseData };
  } else {
    stored.push({
      id: courseData.id || 'course-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      status: 'published',
      ...courseData,
    });
  }
  localStorage.setItem('ma_courses', JSON.stringify(stored));
}

/**
 * حذف كورس (فقط من المضافة — الافتراضية لا تُحذف)
 */
function deleteCourseFromLib(id) {
  const stored = JSON.parse(localStorage.getItem('ma_courses') || '[]');
  localStorage.setItem('ma_courses', JSON.stringify(stored.filter(c => c.id !== id)));
}

/**
 * تحديث كورس
 */
function updateCourseInLib(id, data) {
  const stored = JSON.parse(localStorage.getItem('ma_courses') || '[]');
  const idx = stored.findIndex(c => c.id === id);
  if (idx >= 0) {
    stored[idx] = { ...stored[idx], ...data };
    localStorage.setItem('ma_courses', JSON.stringify(stored));
    return true;
  }
  // إذا كان افتراضياً، أضفه للـ stored محدَّثاً
  const def = DEFAULT_COURSES.find(c => c.id === id);
  if (def) {
    stored.push({ ...def, ...data });
    localStorage.setItem('ma_courses', JSON.stringify(stored));
    return true;
  }
  return false;
}

/**
 * إنشاء بطاقة كورس HTML بنفس تصميم .public-course-card
 */
function renderCourseCard(course, lang) {
  const ar = lang !== 'en';
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
  const title = escape(ar ? course.title : (course.titleEn || course.title));
  const desc  = escape(ar ? course.description : (course.descriptionEn || course.description));
  const level = escape(ar ? course.level : (course.levelEn || course.level));
  const price = course.price === 0
    ? `<span style="color:#059669;font-weight:700">${ar ? 'مجاني' : 'Free'}</span>`
    : `<span>${escape(course.priceLabel || course.price)}</span>`;

  const outcomes = (course.outcomes || []).slice(0, 3)
    .map(o => `<li>${escape(o)}</li>`).join('');
  const courseId = escape(course.id);
  const courseHref = `course-detail.html?id=${encodeURIComponent(course.id)}`;

  return `
    <article class="public-course-card" id="${courseId}" data-course-id="${courseId}">
      <div class="public-course-meta">
        <span style="font-size:1.6rem">${escape(course.thumbnail || '📋')}</span>
        <span>${level}</span>
      </div>
      <h3>${title}</h3>
      <p>${desc}</p>
      <details class="course-syllabus">
        <summary>${ar ? 'استعراض موضوعات الدورة' : 'Preview course topics'}</summary>
        <ul class="course-outcomes">${outcomes}</ul>
        ${course.prereq ? `<p class="course-detail-label">${ar ? 'المتطلبات: ' : 'Prerequisites: '}${escape(course.prereq)}</p>` : ''}
        <p class="course-detail-label" style="color:#2469a4;font-weight:600">
          ⏱ ${escape(course.duration || '?')} ${ar ? 'ساعة' : 'hrs'} &nbsp;|&nbsp; 
          🎬 ${(course.lessons || []).length} ${ar ? 'درس' : 'lessons'}
        </p>
      </details>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid #e4e9ed">
        ${price}
        <a class="course-join-link" href="${courseHref}">
          <span>${ar ? 'عرض التفاصيل' : 'View details'}</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>`;
}

/**
 * رسم قسم الكورسات الإضافية في academy_index.html
 */
function renderPublicCourses(containerId, lang) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const courses = getCourses('published');
  // تجاهل الكورسات الثلاثة الموجودة بالـ HTML
  const existing = ['course-fundamentals', 'course-edms'];
  const extra = courses.filter(c => !existing.includes(c.id));
  if (!extra.length) { container.innerHTML = ''; return; }
  container.innerHTML = extra.map(c => renderCourseCard(c, lang)).join('');
}

/* تصدير للاستخدام في HTML */
window.MAcourses = {
  getCourses,
  getCourseById,
  saveCourseToLib,
  deleteCourseFromLib,
  updateCourseInLib,
  renderCourseCard,
  renderPublicCourses,
  DEFAULT_COURSES,
};
