/* Browser-only demo identity. This is intentionally not authentication or access control. */
(function (global) {
  const SESSION_KEY = "ma-demo-session";
  const USERS_KEY = "ma-demo-users";
  const DEMO_USERS = [
    { name: "مدير الأكاديمية", email: "admin@mostanad.academy", role: "admin", enrollments: [] },
    { name: "مدرّب الأكاديمية", email: "instructor@mostanad.academy", role: "instructor", enrollments: ["course-001"] },
    { name: "طالب تجريبي", email: "student@mostanad.academy", role: "student", enrollments: ["course-001"] },
  ];

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch (error) {
      console.error(`Could not read ${key}:`, error);
      return fallback;
    }
  }

  function getUsers() {
    return read(USERS_KEY, []);
  }

  function getUser() {
    const user = read(SESSION_KEY, null);
    return user && ["admin", "instructor", "student"].includes(user.role) ? user : null;
  }

  function saveSession(user) {
    const session = {
      name: String(user.name || "").slice(0, 100),
      email: String(user.email || "").toLowerCase().slice(0, 254),
      role: user.role,
      avatar: user.avatar || "",
      enrollments: Array.isArray(user.enrollments) ? user.enrollments : [],
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    global.dispatchEvent(new CustomEvent("demoauthchange", { detail: session }));
    return session;
  }

  function login(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const user = DEMO_USERS.find((item) => item.email === normalizedEmail)
      || getUsers().find((item) => item.email === normalizedEmail);
    if (!user) throw new Error("لم نعثر على هذا الحساب التجريبي. استخدم أحد الحسابات التجريبية أو أنشئ حساب طالب.");
    if (user.status === "suspended") throw new Error("هذا الحساب موقوف في بيانات المعاينة.");
    return saveSession(user);
  }

  function addUser({ name, email, role = "student" }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (DEMO_USERS.some((item) => item.email === normalizedEmail)
      || getUsers().some((item) => item.email === normalizedEmail)) {
      throw new Error("هذا البريد مسجّل بالفعل في هذه المعاينة.");
    }
    if (!["student", "instructor"].includes(role)) throw new Error("الدور المحدد غير متاح.");
    const user = {
      name: String(name || "").trim().slice(0, 100),
      email: normalizedEmail.slice(0, 254),
      role,
      enrollments: [],
      avatar: "",
      status: "active",
      verificationDemo: true,
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([...getUsers(), user]));
    return user;
  }

  function registerUser({ name, email }) {
    const user = addUser({ name, email, role: "student" });
    return saveSession(user);
  }

  function updateUser(changes) {
    const current = getUser();
    if (!current) throw new Error("سجّل الدخول أولاً.");
    const updated = { ...current, ...changes };
    saveSession(updated);
    const users = getUsers();
    const index = users.findIndex((user) => user.email === updated.email);
    if (index >= 0) {
      users[index] = { ...users[index], ...changes };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    return updated;
  }

  function dashboardFor(role) {
    if (role === "admin") return "admin-dashboard.html";
    if (role === "instructor") return "instructor-dashboard.html";
    return "dashboard.html";
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    global.dispatchEvent(new CustomEvent("demoauthchange"));
    location.href = "index.html";
  }

  function renderNavAuth() {
    const user = getUser();
    ["nav-auth-area", "nav-auth-area-mobile"].forEach((id) => {
      const area = document.getElementById(id);
      if (!area) return;
      area.replaceChildren();
      const link = document.createElement("a");
      link.href = user ? dashboardFor(user.role) : "academy_index.html#login";
      link.textContent = user ? user.name : "تسجيل الدخول";
      area.append(link);
      if (!user) {
        const register = document.createElement("a");
        register.href = "register.html";
        register.className = "portal-register-link";
        register.textContent = "إنشاء حساب تجريبي";
        area.append(register);
      }
    });
  }

  global.MAUTH = {
    demoUsers: DEMO_USERS.map(({ name, email, role }) => ({ name, email, role })),
    getUser,
    getUsers,
    saveSession,
    login,
    addUser,
    registerUser,
    updateUser,
    dashboardFor,
    logout,
    renderNavAuth,
  };
  global.getUser = getUser;
  global.logout = logout;
  global.renderNavAuth = renderNavAuth;
})(window);
