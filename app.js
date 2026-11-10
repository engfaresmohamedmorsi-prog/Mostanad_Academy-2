import { academyConfig } from "./config.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
function hasSupabaseConfig() {
  try {
    const url = new URL(academyConfig.supabaseUrl);
    const key = String(academyConfig.supabaseAnonKey || "").trim();
    return ["https:", "http:"].includes(url.protocol)
      && Boolean(url.hostname)
      && !url.hostname.startsWith("your-project")
      && key.length >= 32
      && !/^your-public-anon-key/i.test(key);
  } catch {
    return false;
  }
}
const supabaseReady = hasSupabaseConfig();
let supabase = null;

const state = {
  user: null,
  loadedUserId: null,
  loadingUserId: null,
  profile: null,
  courses: [],
  enrollments: [],
  adminUsers: [],
  adminInvites: [],
  activeCourse: null,
  lessons: [],
  completedLessonIds: new Set(),
  activeLesson: null,
  assistantConversationId: null,
  siteAssistantConversationId: null,
  recoveringPassword: new URLSearchParams(location.hash.slice(1)).get("type") === "recovery",
  googleAccessToken: null,
  language: localStorage.getItem("mostanad-academy-language") === "en" ? "en" : "ar",
  toastTimer: null,
};

const copy = {
  ar: {
    login: "دخول آمن",
    signedOut: "تم تسجيل الخروج.", signedIn: "تم تسجيل الدخول بنجاح.",
    loading: "جارٍ التحميل…", genericError: "تعذّر إكمال العملية. حاول مرة أخرى.",
    configMissing: "التسجيل غير مفعّل بعد: إعدادات Supabase غير موجودة. أضف رابط المشروع والمفتاح العام في config.js، ثم أعد النشر.",
    accountUnavailable: "هذا البريد غير معتمد للأكاديمية أو أن الحساب موقوف. تواصل مع الإدارة.",
    inviteSent: "تم إرسال دعوة الدخول إلى البريد.",
    inviteFailed: "تعذّر إرسال الدعوة. تحقق من البريد وإعداد خدمة الرسائل.",
    inviteRoleStudent: "طالب",
    inviteRoleInstructor: "مدرّب",
    activeAccount: "نشط",
    suspendedAccount: "موقوف",
    invitationPending: "بانتظار قبول الدعوة",
    invitationAccepted: "تم تفعيل الحساب",
    invitationRevoked: "ملغاة",
    invitationFailed: "فشل الإرسال",
    invitationApproved: "معتمد",
    suspendAccount: "إيقاف الدخول",
    restoreAccount: "إعادة تفعيل",
    revokeInvitation: "إلغاء الدعوة",
    inviteRequired: "أدخل بريداً إلكترونياً صالحاً.",
    noCourses: "لا توجد دورات متاحة حالياً.", noEnrollments: "لم تسجّل في أي دورة بعد.",
    open: "فتح الدورة", start: "ابدأ التعلّم", enrolled: "مسجّل",
    enroll: "التسجيل في الدورة", enrollSuccess: "تم تسجيلك في الدورة.",
    enrollExists: "أنت مسجّل بالفعل في هذه الدورة.",
    courseFailed: "تعذّر تحميل الدورات.", selectCourse: "اختر الدورة",
    adminLoadFailed: "تعذّر تحميل إحصاءات المشرف.",
    roleStudent: "طالب", roleInstructor: "مدرّب", roleAdmin: "مدير",
    welcome: "أهلاً بعودتك.", courseCount: (n) => `${n} دورة`,
    lessonCount: (n) => `${n} درس`, min: (n) => `${n} دقيقة`,
    noLessons: "لم تتم إضافة دروس لهذه الدورة بعد.",
    chooseLesson: "اختر درساً للبدء.", completed: "مكتمل", manageCourse: "إدارة الدورة",
    enrollmentActive: "نشط", enrollmentCompleted: "مكتمل",
    alreadyComplete: "تم إكمال هذا الدرس.",
    passQuizToComplete: "اجتز اختبار الدرس لتسجيل إكماله.",
    quizRequiredToComplete: "أضف اختباراً لهذا الدرس لتسجيل الإكمال.",
    resource: "فتح الملف",
    videoUnavailable: "الفيديو غير متاح حالياً. تواصل مع المدرّب.",
    saveProfile: "تم تحديث الاسم الظاهر.", profileFailed: "تعذّر تحديث الاسم.",
    courseSaved: "تم حفظ الدورة.", lessonSaved: "تم حفظ الدرس.",
    accessDenied: "لا تملك صلاحية تنفيذ هذا الإجراء.",
    courseRequired: "اختر دورة أولاً.", fileLimit: "حجم الملف يتجاوز الحد المسموح (50 ميغابايت).",
    fileType: "نوع الملف غير مدعوم.", videoLimit: "حجم الفيديو يتجاوز الحد (500 ميغابايت).",
    videoSetup: "رفع الفيديو يحتاج إعداد خدمة Google Drive الخادمية. لم يتم رفع الملف.",
    resourceSaved: "تم حفظ الدرس والملف.", lessonFailed: "تعذّر حفظ الدرس.",
    quizUnavailable: "إنشاء الاختبارات يحتاج تفعيل دالة quiz-admin الخادمية. لم تُحفَظ الإجابات.",
    meetingSetup: "تحقق من إعداد صلاحيات Google Calendar وMeet في حساب الأكاديمية.",
    assistantSetup: "المساعد التعليمي يحتاج إعداد Gemini ودالة tutor الخادمية.",
    signedInRequired: "سجّل الدخول أولاً.", profileName: "الاسم الظاهر",
    meetCreated: "تم إنشاء جلسة Meet.",
    quizSaved: "تم حفظ الاختبار.", quizPassed: "اجتزت الاختبار!", quizFailed: "لم تجتز الاختبار هذه المرة.",
    correct: "صحيح", incorrect: "غير صحيح", submit: "إرسال", askAssistant: "إرسال السؤال",
    certificateIssued: "تم إصدار شهادة الإكمال.",
    certificateUnavailable: "أضف اختباراً لكل درس واجتز جميع الاختبارات قبل طلب الشهادة.",
    sendMessage: "اكتب سؤالك…", answerRequired: "أرسل سؤالاً أولاً.",
    passwordResetSent: "أرسلنا رابط الاستعادة إلى بريدك الإلكتروني.",
    newPassword: "أدخل كلمة مرور جديدة.",
    passwordUpdated: "تم تحديث كلمة المرور. سجّل الدخول للمتابعة.",
    confirmEmail: "إذا كان البريد مسجلاً، فستصلك رسالة استعادة قريباً.",
    selectAnswer: "أجب عن كل الأسئلة أولاً.", saving: "جارٍ الحفظ…",
    notEnrolled: "سجّل في الدورة للوصول إلى هذا المحتوى.",
  },
  en: {
    login: "Sign in securely",
    signedOut: "You have signed out.", signedIn: "Signed in successfully.",
    loading: "Loading…", genericError: "Could not complete this action. Please try again.",
    configMissing: "Sign-in is not enabled yet: Supabase settings are missing. Add the project URL and public key to config.js, then redeploy.",
    accountUnavailable: "This email is not approved for the academy or the account is suspended. Contact an administrator.",
    inviteSent: "A sign-in invitation was sent to the email address.",
    inviteFailed: "The invitation could not be sent. Check the email and mail-provider configuration.",
    inviteRoleStudent: "Student",
    inviteRoleInstructor: "Instructor",
    activeAccount: "Active",
    suspendedAccount: "Suspended",
    invitationPending: "Invitation pending",
    invitationAccepted: "Account activated",
    invitationRevoked: "Revoked",
    invitationFailed: "Delivery failed",
    invitationApproved: "Approved",
    suspendAccount: "Suspend sign-in",
    restoreAccount: "Restore access",
    revokeInvitation: "Revoke invite",
    inviteRequired: "Enter a valid email address.",
    noCourses: "There are no published courses yet.", noEnrollments: "You are not enrolled in any courses yet.",
    open: "Open course", start: "Start learning", enrolled: "Enrolled",
    enroll: "Enroll in course", enrollSuccess: "You are now enrolled.",
    enrollExists: "You are already enrolled in this course.",
    courseFailed: "Could not load courses.", selectCourse: "Select a course",
    adminLoadFailed: "Could not load administrator statistics.",
    roleStudent: "Student", roleInstructor: "Instructor", roleAdmin: "Admin",
    welcome: "Welcome back.", courseCount: (n) => `${n} courses`,
    lessonCount: (n) => `${n} lessons`, min: (n) => `${n} min`,
    noLessons: "No lessons have been added to this course yet.",
    chooseLesson: "Choose a lesson to get started.", completed: "Completed", manageCourse: "Manage course",
    enrollmentActive: "Active", enrollmentCompleted: "Completed",
    alreadyComplete: "This lesson is complete.",
    passQuizToComplete: "Pass the lesson quiz to record completion.",
    quizRequiredToComplete: "An instructor must add a quiz before this lesson can be completed.",
    resource: "Open resource",
    videoUnavailable: "Video is currently unavailable. Please contact your instructor.",
    saveProfile: "Display name updated.", profileFailed: "Could not update your name.",
    courseSaved: "Course saved.", lessonSaved: "Lesson saved.",
    accessDenied: "You do not have permission to do this.",
    courseRequired: "Select a course first.", fileLimit: "File exceeds the 50 MB limit.",
    fileType: "Unsupported file type.", videoLimit: "Video exceeds the 500 MB limit.",
    videoSetup: "Video upload requires a configured server-side Google Drive service. The file was not uploaded.",
    resourceSaved: "Lesson and resource saved.", lessonFailed: "Could not save the lesson.",
    quizUnavailable: "Quiz creation needs the server-side quiz-admin function. Answers were not saved.",
    meetingSetup: "Check the academy account's Google Calendar and Meet permissions.",
    assistantSetup: "The tutor requires Gemini and the server-side tutor function.",
    signedInRequired: "Please sign in first.", profileName: "Display name",
    meetCreated: "Meet session created.",
    quizSaved: "Quiz saved.", quizPassed: "You passed the quiz!", quizFailed: "You did not pass this time.",
    correct: "Correct", incorrect: "Incorrect", submit: "Submit", askAssistant: "Send question",
    certificateIssued: "Completion certificate issued.",
    certificateUnavailable: "Add a quiz to every lesson and pass every quiz before requesting a certificate.",
    sendMessage: "Type your question…", answerRequired: "Write a question first.",
    passwordResetSent: "Password reset link sent to your email.",
    newPassword: "Enter a new password.",
    passwordUpdated: "Password updated. Sign in to continue.",
    confirmEmail: "If the email is registered, a reset link will arrive shortly.",
    selectAnswer: "Answer every question first.", saving: "Saving…",
    notEnrolled: "Enroll in this course to access this content.",
  },
};

const t = (key, ...args) => {
  const value = copy[state.language][key] ?? copy.ar[key] ?? key;
  return typeof value === "function" ? value(...args) : value;
};

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function printCertificate() {
  document.body.classList.add("print-certificate");
  window.addEventListener("afterprint", () => document.body.classList.remove("print-certificate"), { once: true });
  window.print();
}

function safeMeetUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "meet.google.com" ? parsed.href : "";
  } catch {
    return "";
  }
}

function toast(message, isError = false) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.toggle("is-error", isError);
  element.hidden = false;
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => { element.hidden = true; }, 5000);
}

function errorMessage(error, fallback = t("genericError")) {
  if (error?.code === "23505") return t("enrollExists");
  if (error?.code === "42501" || error?.status === 403) return t("accessDenied");
  return error?.message || fallback;
}

function setBusy(form, busy) {
  const button = $("button[type=submit]", form);
  if (!button) return;
  if (busy) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.textContent = t("saving");
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }
}

async function invoke(name, body) {
  if (!supabase) throw new Error(t("configMissing"));
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      const failure = await error.context.clone().json().catch(() => null);
      if (typeof failure?.error === "string") message = failure.error;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

function showConfigurationState() {
  $("#configuration-notice").hidden = false;
  $("#auth-panel").hidden = false;
  $("#dashboard").hidden = true;
  $("#instructor-panel").hidden = true;
  $("#language-toggle").hidden = false;
  $("#auth-submit").disabled = true;
  $("#google-sign-in").disabled = true;
  $("#forgot-password").disabled = true;
  $("#auth-message").textContent = t("configMissing");
  $("#auth-message").classList.add("is-error");
}

function showClientLoadFailure(error) {
  console.error("Could not load the Supabase browser client:", error);
  $("#configuration-notice").hidden = false;
  $("#auth-panel").hidden = false;
  $("#dashboard").hidden = true;
  $("#instructor-panel").hidden = true;
  $("#language-toggle").hidden = false;
  $("#auth-submit").disabled = true;
  $("#google-sign-in").disabled = true;
  $("#forgot-password").disabled = true;
  $("#auth-message").textContent = state.language === "ar"
    ? "تعذّر تحميل مكتبة الاتصال الآمن. تحقق من الاتصال بالإنترنت أو إعداد استضافة المكتبة."
    : "The secure database client could not load. Check the network or configure the client library hosting.";
  $("#auth-message").classList.add("is-error");
}

async function getProfile(user) {
  const { data, error } = await supabase.from("profiles")
    .select("id,email,full_name,avatar_url,preferred_language,role,is_active")
    .eq("id", user.id).maybeSingle();
  if (error) throw error;
  return data;
}

function localizeStaticText() {
  const isEnglish = state.language === "en";
  document.documentElement.lang = state.language;
  document.documentElement.dir = isEnglish ? "ltr" : "rtl";
  document.body.lang = state.language;
  $("#language-toggle").textContent = isEnglish ? "العربية" : "English";
  $("#mobile-language-toggle").textContent = isEnglish ? "العربية" : "English";
  $(".portal-nav").setAttribute("aria-label", isEnglish ? "Navigation" : "التنقل");
  $$("#main .public-courses [data-ar][data-en], #main .portal-faq [data-ar][data-en], #main .portal-assistant-promo [data-ar][data-en], #dashboard [data-ar][data-en]").forEach((element) => {
    element.textContent = element.dataset[state.language];
  });
  $("#theme-toggle").setAttribute("aria-label", document.documentElement.dataset.theme === "dark"
    ? (isEnglish ? "Switch to light mode" : "تفعيل الوضع النهاري")
    : (isEnglish ? "Switch to dark mode" : "تفعيل الوضع الليلي"));
  const strings = new Map([
    ["تجاوز إلى المحتوى", "Skip to content"],
    ["الموقع الرئيسي ↗", "Main website ↗"], ["الموقع الرئيسي", "Main website"],
    ["الخدمات", "Services"], ["المكتبة المهنية", "Professional library"], ["لعبة Super DC", "Super DC game"],
    ["تسجيل الخروج", "Sign out"], ["القائمة", "Menu"],
    ["تعليم مهني · ممارسة واقعية", "Professional education · real-world practice"],
    ["مختبر التعلّم المهني", "Professional learning lab"],
    ["تعلّم كيف", "Learn how"], ["تُدار المشاريع.", "projects are managed."],
    ["تعلّم كيف تُدار المشاريع.", "Learn how projects are managed."],
    ["دورات عملية في ضبط الوثائق، وإدارة سجلات المشروع، وتدفّقات العمل الهندسية؛ تتعلّم بإيقاعك وتطبّق ما تعرفه.", "Practical courses in document control, project records, and engineering workflows. Learn at your pace and put your skills into practice."],
    ["المكتبة المهنية", "Professional library"], ["نماذج وسجلات جاهزة لمشاريعك", "Ready-to-use project templates and logs"],
    ["الدخول ودعوات الحسابات متوقفة إلى أن يُربط Supabase", "Sign-in and account invitations are unavailable until Supabase is configured"],
    ["ملف إعدادات المشروع الحالي فارغ، لذلك لا يمكن تسجيل الدخول أو إرسال دعوات الحسابات الآن. أضف رابط مشروع Supabase والمفتاح العام (publishable/anon) في", "Project settings are empty, so sign-in and account invitations are unavailable. Add the Supabase project URL and public (publishable/anon) key to"],
    ["، طبّق ترحيلات قاعدة البيانات، انشر وظائف الخادم، ثم أعد نشر الموقع. لا يوجد تسجيل عام؛ يعتمد الوصول على دعوات بريد معتمدة.", ", apply the database migrations, deploy the server functions, and redeploy the site. Public sign-up is disabled; access requires an approved email invitation."],
    ["على الموقع المنشور، أضف رابط", "For the published site, add"],
    ["ضمن عناوين إعادة التوجيه المسموح بها في Supabase Auth. تسجيل Google يحتاج كذلك إعداد مزوّد Google في Supabase.", "to the allowed redirect URLs in Supabase Auth. Google sign-in also requires configuring the Google provider in Supabase."],
    ["اقرأ خطوات إعداد Supabase والاستضافة", "Read the Supabase and hosting setup steps"],
    ["لا تضع مفتاح Service Role أو مفاتيح Gemini في ملفات المتصفح.", "Never put a Service Role key or Gemini keys in browser files."],
    ["ACCESS CONTROL", "ACCESS CONTROL"],
    ["دعوات الحسابات والموافقة على البريد", "Account invitations and email approvals"],
    ["لا يوجد تسجيل عام. أرسل دعوة إلى بريد معتمد، وحدد هل الحساب طالب أم مدرّب. يمكن إيقاف الدخول لاحقاً من قائمة الحسابات.", "Public sign-up is disabled. Invite an approved email as a student or instructor. You can later suspend sign-in from the account list."],
    ["البريد الإلكتروني", "Email address"], ["الاسم (اختياري)", "Name (optional)"],
    ["الصلاحية", "Role"], ["اعتماد البريد وإرسال الدعوة", "Approve email and send invite"],
    ["طالب", "Student"], ["مدرّب", "Instructor"],
    ["قائمة البريد المعتمد والدعوات", "Approved emails and invitations"], ["تحديث القائمة", "Refresh list"],
    ["مساحتك المهنية", "Your professional space"], ["مسارك يبدأ", "Your journey starts"],
    ["بخطوة.", "with one step."], ["مسارك يبدأ خطوة.", "Your next step starts here."],
    ["احفظ تقدّمك، ونظّم دروسك، واطلب المساعدة من المدرّب أو المساعد التعليمي عند الحاجة.", "Track your progress, organize your lessons, and ask your instructor or tutor for help."],
    ["دروس تطبيقية مرتبطة بحالات المشروع اليومية", "Practical lessons based on real project scenarios"],
    ["قوالب وأمثلة وملاحظات تحت حسابك", "Templates, examples, and notes in your account"],
    ["مجتمع مهني يتعلّم بالممارسة", "A professional community built around practice"],
    ["تسجيل الدخول", "Sign in"],
    ["يقتصر الدخول على الحسابات التي أنشأها مسؤول الأكاديمية.", "Sign-in is limited to accounts created by an academy administrator."],
    ["شروط الاستخدام", "Terms of use"],
    ["الاسم الكامل", "Full name"], ["البريد الإلكتروني", "Email address"],
    ["كلمة المرور", "Password"], ["دخول آمن ↗", "Sign in securely ↗"], ["دخول آمن", "Sign in securely"],
    ["المتابعة باستخدام Google", "Continue with Google"],
    ["نسيت كلمة المرور؟ أرسل رابط الاستعادة", "Forgot password? Send a reset link"],
    ["كلمة المرور الجديدة", "New password"], ["حفظ كلمة المرور ↗", "Save new password ↗"], ["حفظ كلمة المرور", "Save new password"],
    ["بإنشاء الحساب، توافق على", "By creating an account, you agree to the"],
    ["سياسة الخصوصية", "Privacy policy"], ["واستخدام المواد التعليمية لأغراض التعلّم.", "and use the learning materials for educational purposes."],
    ["لوحة التعلّم", "Learning dashboard"], ["أهلاً بعودتك.", "Welcome back."],
    ["هذا مسارك، خطوة بخطوة.", "Your learning path, step by step."],
    ["استكشف كل الدورات ↗", "Explore all courses ↗"], ["حفظ الاسم", "Save name"],
    ["مسارك", "Your path"], ["الدورات المسجّل فيها", "Your enrolled courses"],
    ["ابدأ هنا", "Start here"], ["الدورات المتاحة", "Available courses"],
    ["هذا الأسبوع", "This week"], ["الاسم الظاهر", "Display name"],
    ["الممارسة الصغيرة تصنع فرقاً.", "Small practice makes a difference."],
    ["اختر درساً واحداً، أكمِله، وطبّق فكرة منه في مشروعك القادم.", "Choose one lesson, finish it, and apply an idea to your next project."],
    ["جلسات مباشرة", "Live sessions"], ["لقاءات الأكاديمية", "Academy sessions"],
    ["ستظهر هنا الجلسات القادمة المسجّلة في دوراتك.", "Upcoming sessions for your courses will appear here."],
    ["مساحة المدرّب", "Instructor workspace"], ["أدر المحتوى وشارك الخبرة.", "Manage content and share your expertise."],
    ["إدارة الأكاديمية والمستخدمين", "Academy and user administration"],
    ["ملخص حسابات المستخدمين والمحتوى المسجل في قاعدة البيانات.", "Overview of registered user accounts and learning content."],
    ["إجمالي الحسابات", "Total accounts"], ["الطلاب", "Students"],
    ["تعديل الدورة", "Edit course"], ["تحديث الدورة", "Update course"],
    ["إلغاء التعديل", "Cancel editing"],
    ["المدرّبون", "Instructors"], ["الدورات", "Courses"],
    ["المشرفون", "Administrators"],
    ["التسجيلات", "Enrollments"], ["الدروس", "Lessons"],
    ["تسليمات الواجبات", "Assignment submissions"], ["الشهادات", "Certificates"],
    ["حسابات المستخدمين", "User accounts"],
    ["بيانات الحساب الأساسية فقط؛ لا يمكن لأي مشرف الاطلاع على كلمات المرور.", "Basic account details only; passwords are never visible to administrators."],
    ["ابحث بالاسم أو البريد أو الدور", "Search name, email, or role"],
    ["رمز دعوة المدير (يُستخدم مرة واحدة)", "Administrator invite code (one-time use)"],
    ["تفعيل صلاحية المدير", "Activate administrator access"],
    ["دورة جديدة", "New course"], ["أضف دورة تعليمية", "Add a course"],
    ["اسم الدورة بالعربية", "Course title in Arabic"], ["اسم الدورة بالإنجليزية", "Course title in English"],
    ["وصف مختصر", "Short description"], ["المستوى", "Level"],
    ["مدة الدورة بالساعات (اختياري)", "Course duration in hours (optional)"],
    ["السعر المعروض بالعربية (اختياري)", "Displayed price in Arabic (optional)"],
    ["المواعيد أو طريقة الدراسة (اختياري)", "Schedule or learning format (optional)"],
    ["يحددها مسؤول الأكاديمية", "Set by the academy administrator"],
    ["السعر للعرض والاستفسار فقط؛ لا تُعالج المنصة المدفوعات حالياً.", "Price is displayed for inquiries only; the platform does not process payments."],
    ["Course description (English)", "Course description (English)"],
    ["Lesson summary (English)", "Lesson summary (English)"],
    ["مشاركة الفيديو مع الطلاب المسجّلين حالياً (بريدهم في Google Drive)", "Share this video with currently enrolled students (using their Google account emails)"],
    ["مبتدئ", "Beginner"], ["متوسط", "Intermediate"], ["متقدم", "Advanced"],
    ["إتاحة الدورة للطلاب بعد الحفظ", "Publish this course after saving"], ["حفظ الدورة ↗", "Save course ↗"],
    ["درس جديد", "New lesson"], ["أضف درساً إلى إحدى دوراتك", "Add a lesson to one of your courses"],
    ["الدورة", "Course"], ["اختر الدورة", "Select a course"],
    ["الاسم بالعربية", "Title in Arabic"], ["ملخص الدرس", "Lesson summary"],
    ["مدة الدرس بالدقائق", "Duration (minutes)"], ["رقم الدرس", "Lesson number"],
    ["إتاحة الدرس كتجربة مجانية", "Make this lesson a free preview"],
    ["فيديو الدرس (Google Drive، حتى 500 ميغابايت)", "Lesson video (Google Drive, up to 500 MB)"],
    ["سيرفع الفيديو إلى Drive الخاص بحساب Google. بعد الرفع يمكنك مشاركة الملف مع طلاب الدورة من قائمة المسجّلين.", "Videos are uploaded to the Google account's Drive. After upload, share the file with enrolled students."],
    ["ملف إضافي للدرس (PDF أو Word أو Excel، حتى 50 ميغابايت)", "Lesson resource (PDF, Word, or Excel, up to 50 MB)"],
    ["إنشاء سؤال اختياري للدرس", "Add an optional quiz question"],
    ["السؤال بالعربية", "Question in Arabic"], ["الاختيارات (أدخل اختياراً في كل حقل)", "Options (enter one per field)"],
    ["الاختيار الأول", "First option"], ["الاختيار الثاني", "Second option"],
    ["الاختيار الثالث", "Third option"], ["الاختيار الرابع", "Fourth option"],
    ["اكتب سؤالك هنا...", "Write your question here..."],
    ["رقم الإجابة الصحيحة", "Correct answer"], ["الأولى", "First"], ["الثانية", "Second"],
    ["الثالثة", "Third"], ["الرابعة", "Fourth"], ["حفظ الدرس ↗", "Save lesson ↗"],
    ["جلسة مباشرة", "Live session"], ["احجز موعداً على Google Meet", "Schedule a Google Meet"],
    ["عنوان الجلسة", "Session title"], ["تاريخ ووقت البداية", "Start date and time"],
    ["المدة بالدقائق", "Duration (minutes)"], ["بريد المشاركين (اختياري، افصل بفواصل)", "Attendee emails (optional, comma-separated)"],
    ["إنشاء رابط Meet ↗", "Create Meet link ↗"], ["طلاب الدورات", "Course students"],
    ["ستظهر هنا الجلسات القادمة المسجّلة في دوراتك.", "Upcoming sessions for your courses will appear here."],
    ["الدورات والتسجيلات", "Courses and enrollments"], ["← لوحة التعلّم", "← Learning dashboard"],
    ["المقرر", "Course"], ["محتوى الدورة", "Course content"], ["الدروس", "Lessons"],
    ["إصدار شهادة الإكمال", "Issue completion certificate"],
    ["اختر درساً للبدء.", "Choose a lesson to begin."],
    ["تقدّم على مهل؛ كل درس يبني على ما تعلّمته قبله.", "Take your time; each lesson builds on the last."],
    ["تعلّم بالممارسة. اعمل بثقة.", "Learn by doing. Work with confidence."],
    ["الخصوصية", "Privacy"], ["تواصل مع الأكاديمية", "Contact the academy"],
    ["المكتبة المهنية", "Professional library"],
  ]);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const original = node.textContent.trim();
    if (isEnglish && strings.has(original)) node.textContent = node.textContent.replace(original, strings.get(original));
  }
  const placeholders = new Map([
    ["الاسم الكامل", "Full name"], ["٨ أحرف على الأقل", "At least 8 characters"],
    ["مثال: 12", "Example: 12"], ["مثال: تواصل للاستفسار", "Example: Contact us"],
    ["الاختيار الأول", "First option"], ["الاختيار الثاني", "Second option"],
    ["الاختيار الثالث", "Third option"], ["الاختيار الرابع", "Fourth option"],
  ]);
  $$("[placeholder]").forEach((input) => {
    if (isEnglish && placeholders.has(input.getAttribute("placeholder"))) {
      input.dataset.arPlaceholder ??= input.getAttribute("placeholder");
      input.setAttribute("placeholder", placeholders.get(input.dataset.arPlaceholder));
    } else if (!isEnglish && input.dataset.arPlaceholder) {
      input.setAttribute("placeholder", input.dataset.arPlaceholder);
    }
  });
}

function toggleLanguage() {
  state.language = state.language === "ar" ? "en" : "ar";
  localStorage.setItem("mostanad-academy-language", state.language);
  location.reload();
}

function setupNavigation() {
  const themeToggle = $("#theme-toggle");
  const setTheme = (theme, persist = true) => {
    const isDark = theme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]').content = isDark ? "#0d1722" : "#f5f7f9";
    if (persist) localStorage.setItem("mostanad-academy-theme", isDark ? "dark" : "light");
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", isDark
      ? (state.language === "en" ? "Switch to light mode" : "تفعيل الوضع النهاري")
      : (state.language === "en" ? "Switch to dark mode" : "تفعيل الوضع الليلي"));
    themeToggle.textContent = isDark ? "☀" : "☾";
  };
  setTheme(localStorage.getItem("mostanad-academy-theme") === "light" ? "light" : "dark", false);
  themeToggle.addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "mostanad-academy-theme") setTheme(event.newValue === "light" ? "light" : "dark", false);
  });
  $("#language-toggle").addEventListener("click", toggleLanguage);
  $("#mobile-language-toggle").addEventListener("click", toggleLanguage);
  $("#mobile-menu").addEventListener("click", () => {
    const menu = $("#portal-menu");
    menu.hidden = !menu.hidden;
    $("#mobile-menu").setAttribute("aria-expanded", String(!menu.hidden));
  });
  $("#sign-out").addEventListener("click", signOut);
  $("#mobile-sign-out").addEventListener("click", signOut);
  window.addEventListener("hashchange", focusAuthShortcut);
  $("#show-courses").addEventListener("click", () => $("#available-courses").scrollIntoView({ behavior: "smooth", block: "center" }));
  $("#back-to-dashboard").addEventListener("click", () => {
    $("#course-view").hidden = true;
    $("#dashboard").hidden = false;
    state.activeCourse = null;
    state.activeLesson = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $("#certificate-button").addEventListener("click", issueCertificate);
  $("#create-quiz").addEventListener("change", (event) => { $("#quiz-fields").hidden = !event.target.checked; });
}

function focusAuthShortcut() {
  const mode = location.hash.slice(1);
  if (!["login", "register"].includes(mode) || state.recoveringPassword || state.user) return;
  $("#auth-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  $("#email").focus({ preventScroll: true });
}

async function submitAuth(event) {
  event.preventDefault();
  if (!supabase) return;
  const email = $("#email").value.trim();
  const password = $("#password").value;
  const submit = $("#auth-submit");
  submit.disabled = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (error) {
    $("#auth-message").textContent = errorMessage(error);
    $("#auth-message").classList.add("is-error");
  } finally {
    submit.disabled = false;
  }
}

async function googleSignIn() {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: location.origin + location.pathname,
      scopes: "openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events",
    },
  });
  if (error) toast(errorMessage(error), true);
}

async function resetPassword() {
  if (!supabase) return;
  const email = $("#email").value.trim();
  if (!email) {
    $("#auth-message").textContent = state.language === "ar" ? "أدخل بريدك الإلكتروني أولاً." : "Enter your email address first.";
    $("#auth-message").classList.add("is-error");
    $("#email").focus();
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: location.origin + location.pathname,
  });
  $("#auth-message").textContent = error ? errorMessage(error) : t("confirmEmail");
  $("#auth-message").classList.toggle("is-error", Boolean(error));
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    toast(errorMessage(error), true);
    return;
  }
  state.user = null;
  state.recoveringPassword = false;
  state.loadedUserId = null;
  state.loadingUserId = null;
  state.googleAccessToken = null;
  state.profile = null;
  state.courses = [];
  state.enrollments = [];
  state.assistantConversationId = null;
  state.siteAssistantConversationId = null;
  $("#assistant-messages")?.replaceChildren();
  $("#site-assistant-messages").replaceChildren();
  state.activeCourse = null;
  $("#sign-out").hidden = true;
  $("#mobile-sign-out").hidden = true;
  $("#dashboard").hidden = true;
  $("#instructor-panel").hidden = true;
  $("#course-view").hidden = true;
  $("#auth-panel").hidden = false;
  $("#auth-form").hidden = false;
  $("#password-update-form").hidden = true;
  $("#google-sign-in").hidden = false;
  $("#forgot-password").hidden = false;
  $("#profile-tools").hidden = true;
  $("#portal-menu").hidden = true;
  toast(t("signedOut"));
}

function showPasswordUpdate(session) {
  state.recoveringPassword = true;
  if (session?.user) state.user = session.user;
  $("#auth-panel").hidden = false;
  $("#dashboard").hidden = true;
  $("#instructor-panel").hidden = true;
  $("#course-view").hidden = true;
  $("#auth-form").hidden = true;
  $("#password-update-form").hidden = false;
  $("#google-sign-in").hidden = true;
  $("#forgot-password").hidden = true;
  $("#auth-heading").textContent = state.language === "ar" ? "اختر كلمة مرور جديدة." : "Choose a new password.";
  $("#new-password").focus();
}

async function updatePassword(event) {
  event.preventDefault();
  const password = $("#new-password").value;
  if (password.length < 8) {
    $("#auth-message").textContent = t("newPassword");
    $("#auth-message").classList.add("is-error");
    return;
  }
  const button = $("button[type=submit]", event.currentTarget);
  button.disabled = true;
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    state.recoveringPassword = false;
    state.loadedUserId = null;
    history.replaceState(null, "", location.pathname + location.search);
    $("#password-update-form").reset();
    $("#password-update-form").hidden = true;
    $("#auth-form").hidden = false;
    $("#google-sign-in").hidden = false;
    $("#forgot-password").hidden = false;
    $("#auth-heading").textContent = state.language === "ar" ? "مسارك يبدأ بخطوة." : "Your next step starts here.";
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (session) await onAuthState({ session });
    else {
      $("#auth-message").textContent = t("passwordUpdated");
      $("#auth-message").classList.remove("is-error");
    }
  } catch (error) {
    $("#auth-message").textContent = errorMessage(error);
    $("#auth-message").classList.add("is-error");
  } finally {
    button.disabled = false;
  }
}

function updateSignedInUI() {
  $("#auth-panel").hidden = true;
  $("#configuration-notice").hidden = true;
  $("#dashboard").hidden = false;
  $("#language-toggle").hidden = false;
  $("#sign-out").hidden = false;
  $("#mobile-sign-out").hidden = false;
  $("#welcome-heading").textContent = `${state.language === "ar" ? "أهلاً" : "Hello"}, ${state.profile.full_name || state.user.email}`;
  $("#dashboard-subtitle").textContent = state.profile.email;
  $("#profile-name").value = state.profile.full_name || "";
  $("#role-badge").textContent = t(`role${state.profile.role[0].toUpperCase()}${state.profile.role.slice(1)}`);
  $("#admin-invite-form").hidden = state.profile.role !== "student";
  const canTeach = ["instructor", "admin"].includes(state.profile.role);
  $("#instructor-panel").hidden = !canTeach;
  $("#admin-dashboard").hidden = state.profile.role !== "admin";
  $("#profile-tools").hidden = false;
}

async function loadDashboard() {
  const [coursesResult, enrollmentsResult, sessionsResult] = await Promise.all([
    supabase.from("courses").select("id,slug,title_ar,title_en,description_ar,description_en,level,cover_url,duration_hours,price_ar,price_en,schedule_ar,schedule_en,instructor_id,is_published,created_at").order("created_at", { ascending: false }),
    supabase.from("enrollments").select("id,course_id,status,enrolled_at").eq("student_id", state.user.id),
    supabase.from("live_sessions").select("id,course_id,title,starts_at,ends_at,meet_url").gte("starts_at", new Date().toISOString()).order("starts_at").limit(5),
  ]);
  if (coursesResult.error) throw coursesResult.error;
  if (enrollmentsResult.error) throw enrollmentsResult.error;
  if (sessionsResult.error) toast(errorMessage(sessionsResult.error), true);
  state.courses = coursesResult.data || [];
  state.enrollments = enrollmentsResult.data || [];
  const courseIds = state.enrollments.filter((item) => ["active", "completed"].includes(item.status)).map((item) => item.course_id);
  const courseNames = new Map(state.courses.map((course) => [course.id, course]));
  const sessions = (sessionsResult.error ? [] : sessionsResult.data || []).filter((item) => courseIds.includes(item.course_id));
  renderCourses();
  renderSessions(sessions, courseNames);
  await loadSiteAssistantConversation();
  if (["instructor", "admin"].includes(state.profile.role)) {
    await loadInstructorCourses();
    fillCourseSelects();
  }
  if (state.profile.role === "admin") await loadAdminOverview();
}

async function loadAdminOverview() {
  const counters = [
    ["profiles", "metric-users"],
    ["courses", "metric-courses"],
    ["enrollments", "metric-enrollments"],
    ["lessons", "metric-lessons"],
    ["assignment_submissions", "metric-submissions"],
    ["certificates", "metric-certificates"],
  ];
  const results = await Promise.all(counters.map(async ([table, targetId]) => {
    const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
    if (error) throw error;
    $(`#${targetId}`).textContent = new Intl.NumberFormat(state.language).format(count || 0);
  }));
  void results;
  const users = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("profiles")
      .select("id,email,full_name,role,is_active,created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + 499);
    if (error) throw error;
    users.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  state.adminUsers = users;
  $("#metric-students").textContent = new Intl.NumberFormat(state.language).format(users.filter((user) => user.role === "student").length);
  $("#metric-instructors").textContent = new Intl.NumberFormat(state.language).format(users.filter((user) => user.role === "instructor").length);
  $("#metric-admins").textContent = new Intl.NumberFormat(state.language).format(users.filter((user) => user.role === "admin").length);
  renderAdminUsers();
  await loadAdminInvites();
}

function renderAdminUsers() {
  const term = $("#admin-user-search").value.trim().toLocaleLowerCase();
  const users = state.adminUsers.filter((user) => `${user.full_name} ${user.email} ${user.role}`.toLocaleLowerCase().includes(term));
  const locale = state.language === "ar" ? "ar" : "en";
  const roleNames = state.language === "ar"
    ? { admin: "مدير", instructor: "مدرّب", student: "طالب" }
    : { admin: "Admin", instructor: "Instructor", student: "Student" };
  const count = users.length;
  $("#admin-users-list").innerHTML = count
    ? users.map((user) => {
      const joined = user.created_at
        ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(user.created_at))
        : "—";
      const roleControl = user.role === "admin" || user.id === state.user.id
        ? `<span class="admin-user-role">${escapeHTML(roleNames[user.role] || user.role)}</span>`
        : `<select class="admin-user-role" data-user-role="${user.id}" aria-label="${state.language === "ar" ? "دور المستخدم" : "User role"}"><option value="student" ${user.role === "student" ? "selected" : ""}>${roleNames.student}</option><option value="instructor" ${user.role === "instructor" ? "selected" : ""}>${roleNames.instructor}</option></select>`;
      const active = user.is_active !== false;
      const accountStatus = active ? t("activeAccount") : t("suspendedAccount");
      const accessControl = user.role === "admin" || user.id === state.user.id ? ""
        : `<button class="admin-access-button" type="button" data-user-active="${user.id}" data-active="${active}">${active ? t("suspendAccount") : t("restoreAccount")}</button>`;
      return `<div class="admin-user-row"><strong>${escapeHTML(user.full_name || (state.language === "ar" ? "بدون اسم" : "No name"))}</strong><span>${escapeHTML(user.email)}</span>${roleControl}<small>${escapeHTML(joined)} · ${escapeHTML(accountStatus)}</small>${accessControl}</div>`;
    }).join("")
    : `<p class="empty-state">${state.language === "ar" ? "لا توجد حسابات مطابقة." : "No matching accounts."}</p>`;
  $$("[data-user-role]").forEach((select) => select.addEventListener("change", () => updateUserRole(select)));
  $$("[data-user-active]").forEach((button) => button.addEventListener("click", () => setUserActive(button)));
}

async function loadAdminInvites() {
  const result = await invoke("admin-users", { action: "list-invites" });
  state.adminInvites = Array.isArray(result.invites) ? result.invites : [];
  renderAdminInvites();
}

function renderAdminInvites() {
  const statusLabels = {
    approved: t("invitationApproved"),
    inviting: t("invitationPending"),
    invited: t("invitationPending"),
    active: t("invitationAccepted"),
    suspended: t("suspendedAccount"),
    revoked: t("invitationRevoked"),
    failed: t("invitationFailed"),
  };
  const roleLabels = { student: t("inviteRoleStudent"), instructor: t("inviteRoleInstructor"), admin: t("roleAdmin") };
  const locale = state.language === "ar" ? "ar" : "en";
  $("#admin-invites-list").innerHTML = state.adminInvites.length
    ? state.adminInvites.map((invite) => {
      const date = invite.invited_at
        ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(invite.invited_at))
        : "—";
      const canRevoke = ["approved", "inviting", "invited", "failed"].includes(invite.status);
      return `<div class="admin-invite-row"><strong>${escapeHTML(invite.email)}</strong><span>${escapeHTML(roleLabels[invite.role] || invite.role)}</span><small>${escapeHTML(statusLabels[invite.status] || invite.status)} · ${escapeHTML(date)}</small>${canRevoke ? `<button class="admin-access-button" type="button" data-revoke-invite="${invite.id}">${t("revokeInvitation")}</button>` : ""}</div>`;
    }).join("")
    : `<p class="empty-state">${state.language === "ar" ? "لا توجد دعوات أو رسائل معتمدة بعد." : "No approved emails or invitations yet."}</p>`;
  $$("[data-revoke-invite]").forEach((button) => button.addEventListener("click", () => revokeInvite(button)));
}

async function createAdminInvitation(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $('button[type="submit"]', form);
  const email = $("#invite-user-email").value.trim().toLowerCase();
  if (!email) return toast(t("inviteRequired"), true);
  setBusy(button, true);
  try {
    await invoke("admin-users", {
      action: "invite-user",
      email,
      full_name: $("#invite-user-name").value.trim(),
      role: $("#invite-user-role").value,
    });
    form.reset();
    toast(t("inviteSent"));
    try {
      await loadAdminOverview();
    } catch (error) {
      toast(`${t("inviteSent")} ${errorMessage(error)}`, true);
    }
  } catch (error) {
    toast(errorMessage(error, t("inviteFailed")), true);
  } finally {
    setBusy(button, false);
  }
}

async function setUserActive(button) {
  const user = state.adminUsers.find((entry) => entry.id === button.dataset.userActive);
  if (!user || user.role === "admin" || user.id === state.user.id) return toast(t("accessDenied"), true);
  const isActive = button.dataset.active !== "true";
  button.disabled = true;
  try {
    await invoke("admin-users", { action: "set-active", user_id: user.id, is_active: isActive });
    user.is_active = isActive;
    renderAdminUsers();
    await loadAdminInvites();
    toast(isActive
      ? (state.language === "ar" ? "تمت إعادة تفعيل الحساب." : "Account access restored.")
      : (state.language === "ar" ? "تم إيقاف الحساب." : "Account suspended."));
  } catch (error) {
    toast(errorMessage(error), true);
    button.disabled = false;
  }
}

async function revokeInvite(button) {
  button.disabled = true;
  try {
    await invoke("admin-users", { action: "revoke-invite", invite_id: button.dataset.revokeInvite });
    await loadAdminOverview();
    toast(state.language === "ar" ? "تم إلغاء الدعوة ومنع الحساب من الدخول." : "Invitation revoked and account access blocked.");
  } catch (error) {
    toast(errorMessage(error), true);
    button.disabled = false;
  }
}

async function updateUserRole(select) {
  const userId = select.dataset.userRole;
  const user = state.adminUsers.find((entry) => entry.id === userId);
  if (!user || user.role === "admin" || user.id === state.user.id) {
    renderAdminUsers();
    return toast(t("accessDenied"), true);
  }
  select.disabled = true;
  try {
    await invoke("admin-users", { action: "set-role", user_id: userId, role: select.value });
    user.role = select.value;
    renderAdminUsers();
    toast(state.language === "ar" ? "تم تحديث صلاحية المستخدم." : "User role updated.");
    $("#metric-students").textContent = new Intl.NumberFormat(state.language).format(state.adminUsers.filter((entry) => entry.role === "student").length);
    $("#metric-instructors").textContent = new Intl.NumberFormat(state.language).format(state.adminUsers.filter((entry) => entry.role === "instructor").length);
  } catch (error) {
    toast(errorMessage(error), true);
    renderAdminUsers();
  }
}

function courseText(course, key) {
  const suffix = state.language === "en" ? "en" : "ar";
  return course[`${key}_${suffix}`] || course[`${key}_ar`] || "";
}

function courseFactsMarkup(course) {
  const facts = [];
  if (course.duration_hours) {
    const duration = new Intl.NumberFormat(state.language).format(course.duration_hours);
    facts.push([state.language === "ar" ? "المدة" : "Duration", `${duration} ${state.language === "ar" ? "ساعة" : "hours"}`]);
  }
  const price = course[state.language === "en" ? "price_en" : "price_ar"] || "";
  if (price) facts.push([state.language === "ar" ? "السعر" : "Price", price]);
  const schedule = course[state.language === "en" ? "schedule_en" : "schedule_ar"] || "";
  if (schedule) facts.push([state.language === "ar" ? "المواعيد" : "Schedule", schedule]);
  if (!facts.length) return "";
  return `<dl class="course-facts">${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHTML(value)}</dd></div>`).join("")}</dl>`;
}

function courseCard(course, isEnrolled, isOwned = false) {
  const title = escapeHTML(courseText(course, "title"));
  const description = escapeHTML(courseText(course, "description"));
  const canOpen = isEnrolled || isOwned;
  const action = canOpen ? t("open") : t("enroll");
  const courseChip = state.profile.role === "admin" ? t("manageCourse")
    : isOwned ? (state.language === "ar" ? "دورتي" : "My course")
      : canOpen ? t("enrolled") : t("start");
  return `<article class="course-card">
    <div class="course-topline"><span class="course-level">${escapeHTML(course.level.toUpperCase())}</span><span class="course-chip">${escapeHTML(courseChip)}</span></div>
    <h4>${title}</h4><p>${description || "—"}</p>${courseFactsMarkup(course)}
    <div class="course-card-footer"><span class="course-meta"><span>${state.language === "ar" ? "تعلّم تطبيقي" : "Practical learning"}</span></span>
      <button class="course-action ${canOpen ? "is-enrolled" : ""}" type="button" data-course-action="${canOpen ? "open" : "enroll"}" data-course-id="${course.id}">${action} <span aria-hidden="true">↗</span></button>
    </div>
  </article>`;
}

async function renderCourses() {
  const enrollmentByCourse = new Map(state.enrollments.map((item) => [item.course_id, item]));
  const canTeach = ["instructor", "admin"].includes(state.profile.role);
  const isAdmin = state.profile.role === "admin";
  const enrolled = state.courses.filter((course) => isAdmin
    || (enrollmentByCourse.has(course.id) && ["active", "completed"].includes(enrollmentByCourse.get(course.id).status))
    || (canTeach && course.instructor_id === state.user.id));
  const available = state.courses.filter((course) => course.is_published
    && !enrollmentByCourse.has(course.id)
    && !(canTeach && course.instructor_id === state.user.id)
    && !isAdmin);
  $("#my-courses").innerHTML = enrolled.length ? enrolled.map((course) => {
    const isOwned = canTeach && (isAdmin || course.instructor_id === state.user.id);
    return courseCard(course, !isOwned, isOwned);
  }).join("") : `<p class="empty-state">${t("noEnrollments")}</p>`;
  $("#available-courses").innerHTML = available.length ? available.map((course) => courseCard(course, false)).join("") : `<p class="empty-state">${t("noCourses")}</p>`;
  $("#enrollment-count").textContent = t("courseCount", enrolled.length);
  $$("[data-course-action]").forEach((button) => button.addEventListener("click", () => {
    const course = state.courses.find((item) => item.id === button.dataset.courseId);
    if (!course) return;
    if (button.dataset.courseAction === "open") openCourse(course);
    else enrollCourse(course);
  }));
}

async function enrollCourse(course) {
  const { error } = await supabase.from("enrollments").insert({ course_id: course.id, student_id: state.user.id, status: "active" });
  if (error && error.code !== "23505") {
    toast(errorMessage(error), true);
    return;
  }
  if (error?.code === "23505") toast(t("enrollExists"));
  else toast(t("enrollSuccess"));
  const { data, error: refreshError } = await supabase.from("enrollments").select("id,course_id,status,enrolled_at").eq("student_id", state.user.id);
  if (refreshError) {
    toast(errorMessage(refreshError), true);
    return;
  }
  state.enrollments = data || [];
  await renderCourses();
  if (!error) await openCourse(course);
}

function renderSessions(sessions, courseNames) {
  const container = $("#upcoming-sessions");
  if (!sessions.length) {
    container.innerHTML = `<p class="empty-state">${state.language === "ar" ? "ستظهر هنا الجلسات القادمة المسجّلة في دوراتك." : "Upcoming sessions for your courses will appear here."}</p>`;
    return;
  }
  container.innerHTML = sessions.map((session) => {
    const course = courseNames.get(session.course_id);
    const date = new Intl.DateTimeFormat(state.language === "ar" ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.starts_at));
    const meetUrl = safeMeetUrl(session.meet_url);
    const join = meetUrl
      ? `<a href="${escapeHTML(meetUrl)}" target="_blank" rel="noopener noreferrer">${state.language === "ar" ? "انضم إلى اللقاء ↗" : "Join session ↗"}</a>`
      : `<small>${state.language === "ar" ? "رابط اللقاء غير متاح." : "Meeting link unavailable."}</small>`;
    return `<div class="session-item"><strong>${escapeHTML(session.title)}</strong><small>${escapeHTML(course ? courseText(course, "title") : "")} · ${escapeHTML(date)}</small>${join}</div>`;
  }).join("");
}

function fillCourseSelects() {
  const instructorCourses = state.courses.filter((course) => course.instructor_id === state.user.id || state.profile.role === "admin");
  ["lesson-course", "meeting-course"].forEach((id) => {
    const select = $(`#${id}`);
    select.innerHTML = `<option value="">${t("selectCourse")}</option>` + instructorCourses.map((course) => `<option value="${course.id}">${escapeHTML(courseText(course, "title"))}</option>`).join("");
  });
}

async function openCourse(course) {
  state.activeCourse = course;
  state.activeLesson = null;
  $("#certificate-card").hidden = true;
  const [lessonsResult, progressResult] = await Promise.all([
    supabase.from("lessons").select("id,course_id,position,title_ar,title_en,content_ar,content_en,video_provider,video_url,video_file_id,duration_minutes,is_preview").eq("course_id", course.id).order("position"),
    supabase.from("lesson_progress").select("lesson_id").eq("student_id", state.user.id).eq("verified_by_quiz", true),
  ]);
  if (lessonsResult.error) {
    toast(errorMessage(lessonsResult.error), true);
    return;
  }
  if (progressResult.error && progressResult.error.code !== "42501") {
    toast(errorMessage(progressResult.error), true);
    return;
  }
  state.lessons = lessonsResult.data || [];
  state.completedLessonIds = new Set((progressResult.data || []).map((item) => item.lesson_id));
  $("#dashboard").hidden = true;
  $("#instructor-panel").hidden = true;
  $("#course-view").hidden = false;
  $("#course-view-title").textContent = courseText(course, "title");
  $("#course-view-description").textContent = courseText(course, "description");
  $("#course-level-label").textContent = course.level;
  $("#course-view-facts").innerHTML = courseFactsMarkup(course);
  renderCourseProgress();
  renderLessonList();
  if (state.lessons.length) await openLesson(state.lessons[0]);
  else $("#lesson-detail").innerHTML = `<div class="lesson-placeholder"><span>◈</span><h3>${t("noLessons")}</h3></div>`;
  $("#course-view").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderCourseProgress() {
  const completed = state.lessons.filter((lesson) => state.completedLessonIds.has(lesson.id)).length;
  const percentage = state.lessons.length ? Math.round(completed / state.lessons.length * 100) : 0;
  $("#progress-number").textContent = `${percentage}%`;
  $(".progress-ring").style.setProperty("--progress", `${percentage}%`);
  $(".progress-ring").setAttribute("aria-label", `${percentage}%`);
  const isStudentEnrolled = state.profile.role === "student"
    && state.enrollments.some((item) => item.course_id === state.activeCourse?.id && ["active", "completed"].includes(item.status));
  $("#certificate-button").hidden = percentage !== 100 || !isStudentEnrolled;
}

async function issueCertificate() {
  if (!state.activeCourse) return;
  const button = $("#certificate-button");
  button.disabled = true;
  try {
    const result = await invoke("certificate-issue", { course_id: state.activeCourse.id });
    const courseTitle = state.language === "ar" ? result.course_title_ar : result.course_title_en;
    const card = $("#certificate-card");
    card.innerHTML = `<div class="certificate-topline">MOSTANAD ACADEMY · ${state.language === "ar" ? "شهادة إتمام" : "CERTIFICATE OF COMPLETION"}</div>
      <h2>${state.language === "ar" ? "شهادة إتمام دورة" : "Course completion certificate"}</h2>
      <p>${state.language === "ar" ? "تُمنح هذه الشهادة إلى" : "This certificate is awarded to"}</p>
      <strong class="certificate-name">${escapeHTML(result.student_name)}</strong>
      <p>${state.language === "ar" ? "لإتمام الدورة التدريبية" : "for completing the course"}</p>
      <strong class="certificate-course">${escapeHTML(courseTitle)}</strong>
      <div class="certificate-bottom"><span>${state.language === "ar" ? "رقم الشهادة" : "Certificate ID"}: ${escapeHTML(result.certificate_code)}</span><span>${escapeHTML(new Intl.DateTimeFormat(state.language === "ar" ? "ar" : "en", { dateStyle: "long" }).format(new Date(result.issued_at)))}</span></div>
      <button id="print-certificate" class="secondary-button" type="button">${state.language === "ar" ? "طباعة الشهادة" : "Print certificate"} <span>↗</span></button>`;
    card.hidden = false;
    $("#print-certificate").addEventListener("click", printCertificate);
    toast(t("certificateIssued"));
  } catch (error) {
    toast(errorMessage(error, t("certificateUnavailable")), true);
  } finally {
    button.disabled = false;
  }
}

function renderLessonList() {
  const container = $("#lesson-list");
  if (!state.lessons.length) {
    container.innerHTML = `<p class="empty-state">${t("noLessons")}</p>`;
    return;
  }
  container.innerHTML = state.lessons.map((lesson) => {
    const title = state.language === "en" ? lesson.title_en || lesson.title_ar : lesson.title_ar || lesson.title_en;
    const done = state.completedLessonIds.has(lesson.id);
    return `<button class="lesson-item ${done ? "is-done" : ""} ${state.activeLesson?.id === lesson.id ? "is-current" : ""}" type="button" data-lesson-id="${lesson.id}" aria-current="${state.activeLesson?.id === lesson.id ? "true" : "false"}"><span>${done ? "✓" : lesson.position}</span><span>${escapeHTML(title)}</span></button>`;
  }).join("");
  $$(".lesson-item", container).forEach((button) => button.addEventListener("click", () => {
    const lesson = state.lessons.find((item) => item.id === button.dataset.lessonId);
    if (lesson) openLesson(lesson);
  }));
}

async function openLesson(lesson) {
  state.activeLesson = lesson;
  renderLessonList();
  const [resourcesResult, quizResult] = await Promise.all([
    supabase.from("resources").select("id,title,storage_path,drive_file_id,mime_type,file_size").eq("lesson_id", lesson.id),
    supabase.from("quizzes").select("id,title_ar,title_en,passing_percent,quiz_questions(id,position,question_ar,question_en,options_ar,options_en)").eq("lesson_id", lesson.id).maybeSingle(),
  ]);
  if (resourcesResult.error && resourcesResult.error.code !== "42501") {
    toast(errorMessage(resourcesResult.error), true);
    return;
  }
  if (quizResult.error && quizResult.error.code !== "42501") {
    toast(errorMessage(quizResult.error), true);
    return;
  }
  const title = state.language === "en" ? lesson.title_en || lesson.title_ar : lesson.title_ar || lesson.title_en;
  const content = state.language === "en" ? lesson.content_en || lesson.content_ar : lesson.content_ar || lesson.content_en;
  const done = state.completedLessonIds.has(lesson.id);
  const videoUrl = safeMediaUrl(lesson.video_url);
  const video = videoUrl
    ? `<iframe class="lesson-video" src="${escapeHTML(videoUrl)}" title="${escapeHTML(title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
    : `<p class="lesson-video-note">${t("videoUnavailable")}</p>`;
  const resources = (resourcesResult.data || []).map((resource) => `
    <button type="button" class="resource-link" data-resource-id="${resource.id}" data-resource-path="${escapeHTML(resource.storage_path || "")}" data-resource-name="${escapeHTML(resource.title)}">⇩ ${escapeHTML(resource.title)} · ${t("resource")}</button>`).join("");
  const isInstructor = ["instructor", "admin"].includes(state.profile.role);
  const isEnrolled = state.enrollments.some((item) => item.course_id === lesson.course_id && ["active", "completed"].includes(item.status));
  const quiz = quizResult.data && !isInstructor ? renderQuiz(quizResult.data) : "";
  const assignmentSection = isInstructor
    ? `<section class="homework-box"><h4>${state.language === "ar" ? "تسليمات الطلاب" : "Student submissions"}</h4><div id="assignment-submissions" class="submission-list"></div></section>`
    : isEnrolled
      ? `<section class="homework-box"><h4>${state.language === "ar" ? "تسليم واجب" : "Submit assignment"}</h4><form id="assignment-form"><input type="file" name="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" required><textarea name="note" maxlength="2000" placeholder="${state.language === "ar" ? "ملاحظة للمدرّب (اختياري)" : "Note for your instructor (optional)"}"></textarea><button class="primary-button" type="submit">${state.language === "ar" ? "إرسال الواجب" : "Submit assignment"} <span>↗</span></button></form><div id="assignment-submissions" class="submission-list"></div></section>`
      : `<section class="homework-box"><h4>${state.language === "ar" ? "تسليم واجب" : "Submit assignment"}</h4><p class="field-hint">${t("notEnrolled")}</p></section>`;
  $("#lesson-detail").innerHTML = `
    ${video}<h3>${escapeHTML(title)}</h3><p class="lesson-content">${escapeHTML(content)}</p>
    ${isEnrolled && !isInstructor ? `<div class="lesson-actions"><p id="lesson-completion-status" role="status">${done ? t("alreadyComplete") : quiz ? t("passQuizToComplete") : t("quizRequiredToComplete")}</p></div>` : ""}
    ${resources ? `<div class="lesson-actions">${resources}</div>` : ""}
    ${quiz}
    ${assignmentSection}
    ${isEnrolled || (isInstructor && state.activeCourse.instructor_id === state.user.id) ? `<section class="assistant-box"><h4>${state.language === "ar" ? "مساعد التعلّم" : "Learning assistant"}</h4><div id="assistant-messages" class="assistant-messages"></div><form id="assistant-form" class="assistant-form"><textarea name="message" maxlength="2000" placeholder="${t("sendMessage")}" required></textarea><button class="primary-button" type="submit">${t("askAssistant")} <span>↗</span></button></form></section>` : ""}`;
  $$("[data-resource-id]").forEach((button) => button.addEventListener("click", () => downloadResource(button.dataset.resourcePath, button.dataset.resourceName)));
  $("#assignment-form")?.addEventListener("submit", submitAssignment);
  $("#assistant-form")?.addEventListener("submit", (event) => askTutor(event, lesson));
  $("#quiz-form")?.addEventListener("submit", submitQuiz);
  await loadAssignmentSubmissions(lesson);
  await loadAssistantConversation(lesson);
}

async function loadAssistantConversation(lesson) {
  state.assistantConversationId = null;
  $("#assistant-messages")?.replaceChildren();
  const { data: conversation, error } = await supabase.from("assistant_conversations")
    .select("id").eq("student_id", state.user.id).eq("lesson_id", lesson.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) {
    toast(errorMessage(error), true);
    return;
  }
  if (!conversation) return;
  state.assistantConversationId = conversation.id;
  await loadAssistantMessages(conversation.id, "#assistant-messages");
}

async function loadSiteAssistantConversation() {
  state.siteAssistantConversationId = null;
  $("#site-assistant-messages").replaceChildren();
  const { data: conversation, error } = await supabase.from("assistant_conversations")
    .select("id").eq("student_id", state.user.id).is("course_id", null).is("lesson_id", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) {
    toast(errorMessage(error), true);
    return;
  }
  if (!conversation) return;
  state.siteAssistantConversationId = conversation.id;
  await loadAssistantMessages(conversation.id, "#site-assistant-messages");
}

async function loadAssistantMessages(conversationId, selector) {
  const { data: messages, error: messagesError } = await supabase.from("assistant_messages")
    .select("role,content").eq("conversation_id", conversationId)
    .order("created_at", { ascending: true }).limit(20);
  if (messagesError) {
    toast(errorMessage(messagesError), true);
    return;
  }
  const container = $(selector);
  container.replaceChildren();
  for (const message of messages || []) {
    const bubble = document.createElement("div");
    bubble.className = `assistant-message${message.role === "user" ? " is-user" : ""}`;
    bubble.textContent = message.content;
    container.append(bubble);
  }
}

async function loadAssignmentSubmissions(lesson) {
  const container = $("#assignment-submissions");
  if (!container) return;
  let query = supabase.from("assignment_submissions")
    .select("id,student_id,storage_path,original_name,file_size,note,submitted_at,profiles(full_name,email)")
    .eq("lesson_id", lesson.id).order("submitted_at", { ascending: false }).limit(30);
  if (!["instructor", "admin"].includes(state.profile.role)) query = query.eq("student_id", state.user.id);
  const { data, error } = await query;
  if (error) {
    toast(errorMessage(error), true);
    return;
  }
  if (!data.length) {
    container.textContent = state.language === "ar" ? "لا توجد تسليمات بعد." : "No submissions yet.";
    return;
  }
  const links = await Promise.all(data.map(async (submission) => {
    const { data: signed, error: signedError } = await supabase.storage.from("academy-submissions").createSignedUrl(submission.storage_path, 60);
    if (signedError) return "";
    const who = ["instructor", "admin"].includes(state.profile.role)
      ? submission.profiles?.full_name || submission.profiles?.email || (state.language === "ar" ? "طالب" : "Student")
      : "";
    const date = new Intl.DateTimeFormat(state.language === "ar" ? "ar" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(submission.submitted_at));
    return `<div class="submission-item"><a href="${escapeHTML(signed.signedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(submission.original_name)}</a><small>${escapeHTML(who)} ${escapeHTML(date)}</small>${submission.note ? `<p>${escapeHTML(submission.note)}</p>` : ""}</div>`;
  }));
  container.innerHTML = links.filter(Boolean).join("") || (state.language === "ar" ? "تعذّر إنشاء روابط آمنة للتسليمات." : "Could not create secure download links.");
}

async function submitAssignment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const file = $('input[type="file"]', form).files[0];
  if (!file || !allowedResourceTypes.has(file.type)) {
    toast(t("fileType"), true);
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    toast(t("fileLimit"), true);
    return;
  }
  const lesson = state.activeLesson;
  const course = state.activeCourse;
  if (!lesson || !course || !state.enrollments.some((item) => item.course_id === course.id && ["active", "completed"].includes(item.status))) {
    toast(t("notEnrolled"), true);
    return;
  }
  setBusy(form, true);
  const path = `${course.id}/${state.user.id}/${lesson.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  try {
    const { error: uploadError } = await supabase.storage.from("academy-submissions").upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { error } = await supabase.from("assignment_submissions").insert({
      lesson_id: lesson.id,
      student_id: state.user.id,
      storage_path: path,
      original_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      note: $('textarea[name="note"]', form).value.trim(),
    });
    if (error) {
      const cleanup = await supabase.storage.from("academy-submissions").remove([path]);
      if (cleanup.error) {
        throw new Error(`${error.message} ${state.language === "ar" ? "تعذّر حذف الملف غير المرتبط من التخزين." : "Could not remove the unlinked file from storage."} ${cleanup.error.message}`);
      }
      throw error;
    }
    form.reset();
    await loadAssignmentSubmissions(lesson);
    toast(state.language === "ar" ? "تم إرسال الواجب بنجاح." : "Assignment submitted.");
  } catch (error) {
    toast(errorMessage(error), true);
  } finally {
    setBusy(form, false);
  }
}

function safeMediaUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return "";
    const hosts = ["drive.google.com", "www.youtube-nocookie.com", "player.vimeo.com"];
    if (!hosts.includes(parsed.hostname)) return "";
    return url;
  } catch {
    return "";
  }
}

function renderQuiz(quiz) {
  const questions = [...(quiz.quiz_questions || [])].sort((a, b) => a.position - b.position);
  if (!questions.length) return "";
  const title = state.language === "en" ? quiz.title_en : quiz.title_ar;
  return `<section class="quiz-box"><h4>${escapeHTML(title || (state.language === "ar" ? "اختبار قصير" : "Quick quiz"))}</h4><form id="quiz-form" data-quiz-id="${quiz.id}">
    ${questions.map((question, questionIndex) => {
      const prompt = state.language === "en" ? question.question_en || question.question_ar : question.question_ar || question.question_en;
      const options = state.language === "en" ? question.options_en : question.options_ar;
      return `<div class="quiz-question"><p>${questionIndex + 1}. ${escapeHTML(prompt)}</p>${(options || []).map((option, optionIndex) => `<label class="quiz-option-choice"><input type="radio" name="question-${question.id}" value="${optionIndex}" required><span>${escapeHTML(option)}</span></label>`).join("")}</div>`;
    }).join("")}<button class="primary-button" type="submit">${t("submit")} <span>↗</span></button><p class="form-message" id="quiz-result" role="status"></p></form></section>`;
}

async function downloadResource(path, name) {
  if (!path) {
    toast(state.language === "ar" ? "الملف موجود على Drive؛ اطلب الرابط من المدرّب." : "This file is hosted on Drive; ask your instructor for access.", true);
    return;
  }
  const { data, error } = await supabase.storage.from("academy-resources").createSignedUrl(path, 60);
  if (error) {
    toast(errorMessage(error), true);
    return;
  }
  const link = document.createElement("a");
  link.href = data.signedUrl;
  link.download = name;
  link.rel = "noopener noreferrer";
  link.click();
}

async function submitQuiz(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = [...new FormData(form).entries()].map(([key, value]) => ({
    question_id: key.replace("question-", ""),
    option_index: Number(value),
  }));
  if (!values.length) return;
  const result = $("#quiz-result", form);
  const submit = $("button[type=submit]", form);
  submit.disabled = true;
  try {
    const data = await invoke("quiz-submit", { quiz_id: form.dataset.quizId, answers: values });
    result.textContent = data.passed ? `${t("quizPassed")} (${data.score_percent}%)` : `${t("quizFailed")} (${data.score_percent}%)`;
    result.classList.toggle("is-error", !data.passed);
    if (data.passed && typeof data.lesson_id === "string" && state.lessons.some((lesson) => lesson.id === data.lesson_id)) {
      state.completedLessonIds.add(data.lesson_id);
      renderCourseProgress();
      const completionStatus = $("#lesson-completion-status");
      if (completionStatus) completionStatus.textContent = t("alreadyComplete");
    }
  } catch (error) {
    result.textContent = errorMessage(error);
    result.classList.add("is-error");
  } finally {
    submit.disabled = false;
  }
}

async function askTutor(event, lesson = null, isSiteAssistant = false) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = $("textarea", form);
  const message = input.value.trim();
  if (!message) return;
  const container = isSiteAssistant ? $("#site-assistant-messages") : $("#assistant-messages");
  const userMessage = document.createElement("div");
  userMessage.className = "assistant-message is-user";
  userMessage.textContent = message;
  container.append(userMessage);
  input.value = "";
  const button = $("button[type=submit]", form);
  button.disabled = true;
  try {
    const data = await invoke("tutor", {
      message,
      course_id: lesson?.course_id || null,
      lesson_id: lesson?.id || null,
      conversation_id: isSiteAssistant ? state.siteAssistantConversationId : state.assistantConversationId,
    });
    if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error(t("genericError"));
    if (isSiteAssistant) state.siteAssistantConversationId = data.conversation_id || state.siteAssistantConversationId;
    else state.assistantConversationId = data.conversation_id || state.assistantConversationId;
    const answer = document.createElement("div");
    answer.className = "assistant-message";
    answer.textContent = data.reply;
    container.append(answer);
    answer.scrollIntoView({ block: "nearest" });
  } catch (error) {
    toast(errorMessage(error, t("assistantSetup")), true);
  } finally {
    button.disabled = false;
  }
}

async function saveProfile() {
  const name = $("#profile-name").value.trim();
  if (!name || name.length > 100) {
    toast(state.language === "ar" ? "أدخل اسماً بين حرف واحد و100 حرف." : "Enter a name between 1 and 100 characters.", true);
    return;
  }
  const { data, error } = await supabase.from("profiles").update({ full_name: name }).eq("id", state.user.id).select("id,email,full_name,avatar_url,preferred_language,role").single();
  if (error) {
    toast(errorMessage(error, t("profileFailed")), true);
    return;
  }
  state.profile = data;
  $("#welcome-heading").textContent = `${state.language === "ar" ? "أهلاً" : "Hello"}, ${state.profile.full_name}`;
  toast(t("saveProfile"));
}

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

async function createCourse(event) {
  event.preventDefault();
  if (!["instructor", "admin"].includes(state.profile.role)) {
    toast(t("accessDenied"), true);
    return;
  }
  const form = event.currentTarget;
  const courseId = $("#editing-course-id").value;
  setBusy(form, true);
  try {
    const titleAr = $("#course-title-ar").value.trim();
    const titleEn = $("#course-title-en").value.trim();
    const slug = slugify(titleEn);
    if (!slug) throw new Error(state.language === "ar" ? "اكتب عنواناً إنجليزياً لاشتقاق رابط الدورة." : "Enter an English course title to create its URL.");
    const courseValues = {
      slug, title_ar: titleAr, title_en: titleEn,
      description_ar: $("#course-description-ar").value.trim(),
      description_en: $("#course-description-en").value.trim(),
      level: $("#course-level").value,
      duration_hours: $("#course-duration-hours").value ? Number($("#course-duration-hours").value) : null,
      price_ar: $("#course-price-ar").value.trim(),
      price_en: $("#course-price-en").value.trim(),
      schedule_ar: $("#course-schedule-ar").value.trim(),
      schedule_en: $("#course-schedule-en").value.trim(),
      is_published: $("#course-published").checked,
    };
    const query = courseId
      ? supabase.from("courses").update(courseValues).eq("id", courseId)
      : supabase.from("courses").insert({ ...courseValues, instructor_id: state.user.id });
    const { data, error } = await query.select().single();
    if (error) throw error;
    state.courses = courseId
      ? state.courses.map((course) => course.id === data.id ? data : course)
      : [data, ...state.courses];
    fillCourseSelects();
    await renderCourses();
    await loadInstructorCourses();
    resetCourseForm();
    toast(t("courseSaved"));
  } catch (error) {
    toast(errorMessage(error), true);
  } finally {
    setBusy(form, false);
  }
}

function resetCourseForm() {
  $("#course-form").reset();
  $("#editing-course-id").value = "";
  $("#course-form-mode").textContent = state.language === "ar" ? "دورة جديدة" : "New course";
  $("#course-form-title").textContent = state.language === "ar" ? "أضف دورة تعليمية" : "Add a course";
  $("#cancel-course-edit").hidden = true;
  $("#course-form").scrollIntoView({ behavior: "smooth", block: "center" });
}

function editCourse(courseId) {
  const course = state.courses.find((item) => item.id === courseId);
  if (!course) return toast(t("genericError"), true);
  $("#editing-course-id").value = course.id;
  $("#course-title-ar").value = course.title_ar;
  $("#course-title-en").value = course.title_en;
  $("#course-description-ar").value = course.description_ar || "";
  $("#course-description-en").value = course.description_en || "";
  $("#course-level").value = course.level;
  $("#course-duration-hours").value = course.duration_hours ?? "";
  $("#course-price-ar").value = course.price_ar || "";
  $("#course-price-en").value = course.price_en || "";
  $("#course-schedule-ar").value = course.schedule_ar || "";
  $("#course-schedule-en").value = course.schedule_en || "";
  $("#course-published").checked = course.is_published;
  $("#course-form-mode").textContent = state.language === "ar" ? "تعديل الدورة" : "Edit course";
  $("#course-form-title").textContent = courseText(course, "title");
  $("#cancel-course-edit").hidden = false;
  $("#course-form").scrollIntoView({ behavior: "smooth", block: "center" });
}

const allowedResourceTypes = new Set([
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv", "image/jpeg", "image/png",
]);

async function createLesson(event) {
  event.preventDefault();
  if (!["instructor", "admin"].includes(state.profile.role)) {
    toast(t("accessDenied"), true);
    return;
  }
  const form = event.currentTarget;
  const courseId = $("#lesson-course").value;
  const videoFile = $("#video-file").files[0];
  const resourceFile = $("#resource-file").files[0];
  if (!courseId) return toast(t("courseRequired"), true);
  if (resourceFile && resourceFile.size > 50 * 1024 * 1024) return toast(t("fileLimit"), true);
  if (resourceFile && !allowedResourceTypes.has(resourceFile.type)) return toast(t("fileType"), true);
  if (videoFile && videoFile.size > 500 * 1024 * 1024) return toast(t("videoLimit"), true);
  if (videoFile && !state.googleAccessToken) {
    return toast(state.language === "ar"
      ? "أعد تسجيل الدخول باستخدام Google لمنح إذن رفع الفيديو إلى Drive."
      : "Sign in with Google again to grant Drive upload access.", true);
  }
  setBusy(form, true);
  let lesson;
  let uploadedDriveFileId = null;
  try {
    const { data, error } = await supabase.from("lessons").insert({
      course_id: courseId,
      position: Number($("#lesson-position").value),
      title_ar: $("#lesson-title-ar").value.trim(),
      title_en: $("#lesson-title-en").value.trim(),
      content_ar: $("#lesson-content-ar").value.trim(),
      content_en: $("#lesson-content-en").value.trim(),
      duration_minutes: Number($("#lesson-duration").value),
      is_preview: $("#lesson-preview").checked,
    }).select().single();
    if (error) throw error;
    lesson = data;
    if (videoFile) {
      const result = await uploadVideoToDrive(videoFile, courseId, lesson.id, $("#share-video").checked);
      uploadedDriveFileId = result.video.video_file_id;
      const update = await supabase.from("lessons").update(result.video).eq("id", lesson.id);
      if (update.error) throw update.error;
      if (result.sharingWarning) toast(result.sharingWarning, true);
    }
    if (resourceFile) {
      const path = `${courseId}/${lesson.id}/${crypto.randomUUID()}-${resourceFile.name.replace(/[^\w.-]/g, "_")}`;
      const upload = await supabase.storage.from("academy-resources").upload(path, resourceFile, {
        contentType: resourceFile.type,
        upsert: false,
      });
      if (upload.error) throw upload.error;
      const resourceInsert = await supabase.from("resources").insert({
        lesson_id: lesson.id, title: resourceFile.name, storage_path: path,
        mime_type: resourceFile.type, file_size: resourceFile.size, created_by: state.user.id,
      });
      if (resourceInsert.error) {
        const cleanup = await supabase.storage.from("academy-resources").remove([path]);
        if (cleanup.error) {
          throw new Error(`${resourceInsert.error.message} ${state.language === "ar" ? "تعذّر حذف الملف غير المرتبط من التخزين." : "Could not remove the unlinked file from storage."} ${cleanup.error.message}`);
        }
        throw resourceInsert.error;
      }
    }
    if ($("#create-quiz").checked) {
      await createQuizForLesson(lesson.id);
    }
    form.reset();
    $("#quiz-fields").hidden = true;
    await renderCourses();
    await loadInstructorCourses();
    if (!videoFile || !$("#share-video").checked) toast(t(resourceFile ? "resourceSaved" : "lessonSaved"));
  } catch (error) {
    let rollbackWarning = "";
    if (uploadedDriveFileId && state.googleAccessToken) {
      const cleanup = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(uploadedDriveFileId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${state.googleAccessToken}` },
      });
      if (!cleanup.ok && cleanup.status !== 404) {
        rollbackWarning = state.language === "ar"
          ? "تعذّر حذف فيديو Drive بعد فشل حفظ الدرس؛ راجع مجلد الأكاديمية في Drive."
          : "The lesson save failed and its Drive video could not be removed. Check the academy folder in Drive.";
      }
    }
    if (lesson?.id) {
      const cleanup = await supabase.from("lessons").delete().eq("id", lesson.id);
      if (cleanup.error) {
        rollbackWarning = `${rollbackWarning} ${state.language === "ar" ? "تعذّر التراجع عن الدرس المؤقت." : "Could not remove the incomplete lesson."} ${cleanup.error.message}`;
      }
    }
    toast(`${errorMessage(error, t("lessonFailed"))}${rollbackWarning ? ` ${rollbackWarning}` : ""}`, true);
  } finally {
    setBusy(form, false);
  }
}

async function redeemAdminInvite(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const code = $("#admin-invite-code").value.trim();
  setBusy(form, true);
  try {
    await invoke("admin-invite", { code });
    form.reset();
    toast(state.language === "ar" ? "تم تفعيل صلاحية المدير. جارٍ تحديث الحساب." : "Administrator access activated. Refreshing your account.");
    window.setTimeout(() => location.reload(), 700);
  } catch (error) {
    toast(errorMessage(error), true);
  } finally {
    setBusy(form, false);
  }
}

async function createQuizForLesson(lessonId) {
  const options = $$(".quiz-option").map((input) => input.value.trim()).filter(Boolean);
  const question = $("#quiz-question").value.trim();
  if (!question || options.length < 2) throw new Error(state.language === "ar" ? "أدخل سؤالاً واختيارين على الأقل." : "Enter a question and at least two options.");
  if (Number($("#correct-option").value) >= options.length) throw new Error(state.language === "ar" ? "الإجابة الصحيحة تشير إلى اختيار غير موجود." : "The correct answer refers to a missing option.");
  const { data: quiz, error: quizError } = await supabase.from("quizzes").insert({ lesson_id: lessonId }).select("id").single();
  if (quizError) throw quizError;
  const { data: questionRow, error: questionError } = await supabase.from("quiz_questions").insert({
    quiz_id: quiz.id, position: 1, question_ar: question, question_en: question,
    options_ar: options, options_en: options,
  }).select("id").single();
  if (questionError) throw questionError;
  try {
    await invoke("quiz-admin", {
      action: "set-answer", quiz_id: quiz.id,
      question_id: questionRow.id, correct_option: Number($("#correct-option").value),
    });
  } catch (error) {
    await supabase.from("quizzes").delete().eq("id", quiz.id);
    throw new Error(errorMessage(error, t("quizUnavailable")));
  }
}

async function uploadVideoToDrive(file, courseId, lessonId, shareWithEnrolled) {
  if (!file || file.size > 500 * 1024 * 1024) throw new Error(t("videoLimit"));
  if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) throw new Error(t("fileType"));
  const metadata = {
    name: file.name,
    mimeType: file.type,
    appProperties: { academyCourseId: courseId, academyLessonId: lessonId },
    ...(academyConfig.googleDriveFolderId ? { parents: [academyConfig.googleDriveFolderId] } : {}),
  };
  let uploadUrl;
  try {
    const init = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,webViewLink", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${state.googleAccessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": file.type,
        "X-Upload-Content-Length": String(file.size),
      },
      body: JSON.stringify(metadata),
    });
    if (!init.ok) {
      const error = await init.json().catch(() => ({}));
      throw new Error(error.error?.message || t("videoSetup"));
    }
    uploadUrl = init.headers.get("Location");
    if (!uploadUrl) throw new Error(state.language === "ar" ? "لم يُرجع Google رابط رفع الفيديو." : "Google did not return a resumable upload URL.");
  } catch (error) {
    throw new Error(`${t("videoSetup")} ${error.message}`);
  }
  let result = null;
  const chunkSize = 8 * 1024 * 1024;
  for (let start = 0; start < file.size; start += chunkSize) {
    const end = Math.min(start + chunkSize, file.size) - 1;
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${state.googleAccessToken}`,
        "Content-Type": file.type,
        "Content-Range": `bytes ${start}-${end}/${file.size}`,
      },
      body: file.slice(start, end + 1),
    });
    if (response.status === 308) continue;
    if (response.ok && (response.status === 200 || response.status === 201)) {
      result = await response.json().catch(() => null);
      break;
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || t("videoSetup"));
  }
  if (!result?.id) throw new Error(t("videoSetup"));
  let sharingWarning = "";
  if (shareWithEnrolled) {
    const { data: enrollments, error: rosterError } = await supabase.from("enrollments")
      .select("profiles(email)").eq("course_id", courseId).eq("status", "active");
    if (rosterError) {
      sharingWarning = state.language === "ar"
        ? "تم رفع الفيديو، لكن تعذّر جلب قائمة الطلاب؛ شاركه يدوياً من Google Drive."
        : "Video uploaded, but the student list could not be loaded. Share it manually in Google Drive.";
    } else {
      const emails = [...new Set((enrollments || []).map((row) => row.profiles?.email).filter(Boolean))];
      const results = await Promise.all(emails.map(async (email) => {
        const permission = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(result.id)}/permissions?sendNotificationEmail=false`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${state.googleAccessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type: "user", role: "reader", emailAddress: email }),
        });
        return permission.ok;
      }));
      if (results.some((ok) => !ok)) {
        sharingWarning = state.language === "ar"
          ? "تم رفع الفيديو، لكن تعذّرت مشاركة الملف مع بعض الطلاب؛ راجع صلاحيات Drive."
          : "Video uploaded, but sharing failed for some learners. Check Drive permissions.";
      } else if (!emails.length) {
        sharingWarning = state.language === "ar"
          ? "تم رفع الفيديو؛ لا يوجد طلاب مسجّلون حالياً لمشاركته معهم."
          : "Video uploaded; there are no currently enrolled students to share it with.";
      }
    }
  }
  return {
    video: {
      video_url: `https://drive.google.com/file/d/${encodeURIComponent(result.id)}/preview`,
      video_file_id: result.id,
      video_provider: "google_drive",
    },
    sharingWarning,
  };
}

async function createMeeting(event) {
  event.preventDefault();
  if (!["instructor", "admin"].includes(state.profile.role)) return toast(t("accessDenied"), true);
  const form = event.currentTarget;
  setBusy(form, true);
  try {
    const startsAt = new Date($("#meeting-start").value);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      throw new Error(state.language === "ar" ? "اختر موعداً مستقبلياً صالحاً." : "Choose a valid future date and time.");
    }
    const emails = $("#meeting-attendees").value.split(",").map((email) => email.trim()).filter(Boolean);
    if (emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      throw new Error(state.language === "ar" ? "تحقق من عناوين البريد الإلكتروني." : "Check the attendee email addresses.");
    }
    const duration = Number($("#meeting-duration").value);
    if (!state.googleAccessToken) {
      throw new Error(state.language === "ar"
        ? "أعد تسجيل الدخول باستخدام Google لمنح إذن إنشاء جلسات Calendar وMeet."
        : "Sign in with Google again to grant Calendar and Meet permissions.");
    }
    const courseId = $("#meeting-course").value;
    const meetingTitle = $("#meeting-title").value.trim();
    const endsAt = new Date(startsAt.getTime() + duration * 60000);
    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all", {
      method: "POST",
      headers: { Authorization: `Bearer ${state.googleAccessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: meetingTitle,
        start: { dateTime: startsAt.toISOString() },
        end: { dateTime: endsAt.toISOString() },
        attendees: emails.map((email) => ({ email })),
        conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } },
      }),
    });
    const event = await response.json().catch(() => ({}));
    if (!response.ok || !event.id || !event.hangoutLink) {
      throw new Error(event.error?.message || t("meetingSetup"));
    }
    const { error: saveError } = await supabase.from("live_sessions").insert({
      course_id: courseId,
      instructor_id: state.user.id,
      title: meetingTitle,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      meet_url: event.hangoutLink,
      google_event_id: event.id,
    });
    if (saveError) {
      const cleanup = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(event.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${state.googleAccessToken}` },
      });
      if (!cleanup.ok && cleanup.status !== 404) {
        throw new Error(`${saveError.message} ${state.language === "ar" ? "تعذّر حذف حدث Calendar؛ احذفه يدوياً من تقويم Google." : "The Calendar event could not be removed; delete it manually from Google Calendar."}`);
      }
      throw saveError;
    }
    const result = $("#created-meet");
    result.replaceChildren();
    const link = document.createElement("a");
    link.href = safeMeetUrl(event.hangoutLink) || "https://meet.google.com/";
    link.textContent = state.language === "ar" ? "فتح جلسة Google Meet ↗" : "Open Google Meet ↗";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    result.append(link);
    result.hidden = false;
    form.reset();
    await loadDashboard();
    toast(t("meetCreated"));
  } catch (error) {
    toast(errorMessage(error, t("meetingSetup")), true);
  } finally {
    setBusy(form, false);
  }
}

async function loadInstructorCourses() {
  if (!["instructor", "admin"].includes(state.profile.role)) return;
  const courseIds = state.courses.filter((course) => course.instructor_id === state.user.id || state.profile.role === "admin").map((course) => course.id);
  if (!courseIds.length) {
    $("#instructor-courses").innerHTML = `<p class="empty-state">${t("noCourses")}</p>`;
    return;
  }
  const { data: enrollments, error } = await supabase.from("enrollments")
    .select("id,course_id,student_id,status,enrolled_at,profiles(full_name,email)")
    .in("course_id", courseIds);
  if (error) throw error;
  $("#instructor-courses").innerHTML = courseIds.map((courseId) => {
    const course = state.courses.find((item) => item.id === courseId);
    const roster = (enrollments || []).filter((item) => item.course_id === courseId);
    return `<article class="instructor-course"><div><strong>${escapeHTML(courseText(course, "title"))}</strong><small>${roster.length} ${state.language === "ar" ? "طالباً مسجّلاً" : "enrolled students"} · ${course.is_published ? "Published" : "Draft"}</small></div><div class="instructor-course-actions"><button class="course-action" type="button" data-edit-course="${course.id}">${t("تعديل الدورة")}</button><button class="course-action" type="button" data-publish-id="${course.id}" data-published="${course.is_published}">${course.is_published ? (state.language === "ar" ? "إلغاء النشر" : "Unpublish") : (state.language === "ar" ? "نشر" : "Publish")}</button></div>
      ${roster.length ? `<div class="roster">${roster.map((item) => `<label class="roster-item"><span>${escapeHTML(item.profiles?.full_name || item.profiles?.email || "Student")}</span><select data-enrollment-id="${item.id}" data-saved-status="${item.status}" aria-label="${state.language === "ar" ? "حالة التسجيل" : "Enrollment status"}"><option value="active" ${item.status === "active" ? "selected" : ""}>${t("enrollmentActive")}</option><option value="completed" ${item.status === "completed" ? "selected" : ""}>${t("enrollmentCompleted")}</option></select></label>`).join("")}</div>` : ""}</article>`;
  }).join("");
  $$("[data-edit-course]").forEach((button) => button.addEventListener("click", () => editCourse(button.dataset.editCourse)));
  $$("[data-publish-id]").forEach((button) => button.addEventListener("click", () => togglePublish(button.dataset.publishId, button.dataset.published === "true")));
  $$("[data-enrollment-id]").forEach((select) => select.addEventListener("change", () => updateEnrollmentStatus(select)));
}

async function updateEnrollmentStatus(select) {
  const status = select.value;
  if (!["active", "completed"].includes(status)) {
    select.value = select.dataset.savedStatus;
    return toast(t("genericError"), true);
  }
  select.disabled = true;
  const { error } = await supabase.from("enrollments").update({ status })
    .eq("id", select.dataset.enrollmentId);
  if (error) {
    toast(errorMessage(error), true);
    select.value = select.dataset.savedStatus;
    select.disabled = false;
    return;
  }
  select.dataset.savedStatus = status;
  select.disabled = false;
  toast(state.language === "ar" ? "تم تحديث حالة التسجيل." : "Enrollment status updated.");
}

async function togglePublish(courseId, currentValue) {
  const { data, error } = await supabase.from("courses").update({ is_published: !currentValue }).eq("id", courseId).select().single();
  if (error) {
    toast(errorMessage(error), true);
    return;
  }
  state.courses = state.courses.map((course) => course.id === data.id ? data : course);
  await renderCourses();
  await loadInstructorCourses();
}

async function onAuthState({ session }) {
  if (!session) {
    state.user = null;
    state.googleAccessToken = null;
    state.loadedUserId = null;
    state.loadingUserId = null;
    state.profile = null;
    $("#auth-panel").hidden = false;
    $("#dashboard").hidden = true;
    $("#instructor-panel").hidden = true;
    $("#course-view").hidden = true;
    $("#sign-out").hidden = true;
    $("#mobile-sign-out").hidden = true;
    $("#language-toggle").hidden = false;
    return;
  }
  state.user = session.user;
  state.googleAccessToken = session.provider_token || null;
  if (state.loadedUserId === session.user.id || state.loadingUserId === session.user.id) return;
  state.loadingUserId = session.user.id;
  try {
    state.profile = await getProfile(session.user);
    if (!state.profile) {
      state.profile = null;
      await supabase.auth.signOut();
      $("#auth-panel").hidden = false;
      $("#auth-message").textContent = t("accountUnavailable");
      $("#auth-message").classList.add("is-error");
      return;
    }
    updateSignedInUI();
    await loadDashboard();
    state.loadedUserId = session.user.id;
  } catch (error) {
    toast(errorMessage(error, state.profile?.role === "admin" ? t("adminLoadFailed") : t("genericError")), true);
  } finally {
    state.loadingUserId = null;
  }
}

function wireForms() {
  $("#auth-form").addEventListener("submit", submitAuth);
  $("#admin-invite-form").addEventListener("submit", redeemAdminInvite);
  $("#password-update-form").addEventListener("submit", updatePassword);
  $("#google-sign-in").addEventListener("click", googleSignIn);
  $("#forgot-password").addEventListener("click", resetPassword);
  $("#site-assistant-form").addEventListener("submit", (event) => askTutor(event, null, true));
  $("#save-profile").addEventListener("click", saveProfile);
  $("#course-form").addEventListener("submit", createCourse);
  $("#cancel-course-edit").addEventListener("click", resetCourseForm);
  $("#lesson-form").addEventListener("submit", createLesson);
  $("#meeting-form").addEventListener("submit", createMeeting);
  $("#admin-user-search").addEventListener("input", renderAdminUsers);
  $("#admin-invite-user-form").addEventListener("submit", createAdminInvitation);
  $("#refresh-admin-invites").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    setBusy(button, true);
    try {
      await loadAdminOverview();
    } catch (error) {
      toast(errorMessage(error), true);
    } finally {
      setBusy(button, false);
    }
  });
}

async function initialize() {
  setupNavigation();
  wireForms();
  localizeStaticText();
  if (location.hash === "#register") history.replaceState(null, "", `${location.pathname}${location.search}#login`);
  $("#configuration-notice").hidden = supabaseReady;
  if (!supabaseReady) {
    showConfigurationState();
    if (location.hash === "#register" || location.hash === "#login") focusAuthShortcut();
    return;
  }
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    supabase = createClient(academyConfig.supabaseUrl, academyConfig.supabaseAnonKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    });
  } catch (error) {
    showClientLoadFailure(error);
    return;
  }
  $("#auth-panel").hidden = true;
  $("#language-toggle").hidden = false;
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      queueMicrotask(() => showPasswordUpdate(session));
      return;
    }
    if (event === "SIGNED_OUT" || event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
      queueMicrotask(() => onAuthState({ session }));
    }
  });
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    toast(errorMessage(error), true);
    $("#auth-panel").hidden = false;
    return;
  }
  if (state.recoveringPassword) showPasswordUpdate(data.session);
  else {
    await onAuthState({ session: data.session });
    if (!data.session) focusAuthShortcut();
  }
}

initialize().catch((error) => {
  console.error("Academy portal initialization failed:", error);
  toast(errorMessage(error), true);
});
