/**
 * Al Hussainy FC - Roles & Permissions
 * 1 = Worker (الموظف)
 * 2 = Admin (الإدارة)
 * 3 = Super Admin (المسؤول الرئيسي)
 */
const ROLES = {
  WORKER: "worker",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

const ROLE_LABELS = {
  [ROLES.WORKER]: "الموظف",
  [ROLES.ADMIN]: "الإدارة",
  [ROLES.SUPER_ADMIN]: "المسؤول الرئيسي",
};

const ROUTES = {
  DASHBOARD: "dashboard",
  ADD_PLAYER: "add_player",
  ADD_COACH: "add_coach",
  ADD_EMPLOYEE: "add_employee",
  PLAYERS_LIST: "players_list",
  COACHES_LIST: "coaches_list",
  EMPLOYEES_LIST: "employees_list",
  FINANCIAL: "financial",
  UPCOMING_PAYMENTS: "upcoming_payments",
  NOTIFICATIONS: "notifications",
  ACCOUNTS: "accounts",
  PASSWORDS: "passwords",
  ATTENDANCE: "attendance"
};

const ROUTE_LABELS = {
  [ROUTES.DASHBOARD]: "لوحة التحكم",
  [ROUTES.ADD_PLAYER]: "إضافة لاعب",
  [ROUTES.ADD_COACH]: "إضافة كابتن",
  [ROUTES.ADD_EMPLOYEE]: "إضافة موظف",
  [ROUTES.PLAYERS_LIST]: "قائمة اللاعبين",
  [ROUTES.COACHES_LIST]: "قائمة الكباتن",
  [ROUTES.EMPLOYEES_LIST]: "قائمة الموظفين",
  [ROUTES.FINANCIAL]: "لوحة مالية",
  [ROUTES.UPCOMING_PAYMENTS]: "المدفوعات القادمة",
  [ROUTES.NOTIFICATIONS]: "الإشعارات",
  [ROUTES.ACCOUNTS]: "إدارة الحسابات",
  [ROUTES.PASSWORDS]: "كلمات المرور",
  [ROUTES.ATTENDANCE]: "الحضور والانصراف"
};

const PLAYER_POSITIONS = [
  { value: "goalkeeper", label: "حارس مرمى" },
  { value: "defender", label: "مدافع" },
  { value: "midfielder", label: "وسط" },
  { value: "striker", label: "مهاجم" },
];

/** Which routes each role can access */
const ROLE_ROUTES = {
  [ROLES.WORKER]: [
    ROUTES.ADD_PLAYER,
    ROUTES.ADD_COACH,
    ROUTES.PLAYERS_LIST,
    ROUTES.COACHES_LIST,
    ROUTES.ATTENDANCE,
  ],
  [ROLES.ADMIN]: [
    ROUTES.DASHBOARD,
    ROUTES.ADD_PLAYER,
    ROUTES.ADD_COACH,
    ROUTES.ADD_EMPLOYEE,
    ROUTES.PLAYERS_LIST,
    ROUTES.COACHES_LIST,
    ROUTES.EMPLOYEES_LIST,
    ROUTES.FINANCIAL,
    ROUTES.UPCOMING_PAYMENTS,
    ROUTES.NOTIFICATIONS,
    ROUTES.ATTENDANCE,
  ],
  [ROLES.SUPER_ADMIN]: [
    ROUTES.DASHBOARD,
    ROUTES.ADD_PLAYER,
    ROUTES.ADD_COACH,
    ROUTES.ADD_EMPLOYEE,
    ROUTES.PLAYERS_LIST,
    ROUTES.COACHES_LIST,
    ROUTES.EMPLOYEES_LIST,
    ROUTES.FINANCIAL,
    ROUTES.UPCOMING_PAYMENTS,
    ROUTES.NOTIFICATIONS,
    ROUTES.ACCOUNTS,
    ROUTES.PASSWORDS,
    ROUTES.ATTENDANCE
  ]
};

/** Can edit/delete players */
function canEditPlayers(role) {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

/** Can edit/delete coaches */
function canEditCoaches(role) {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

/** Can edit/delete employees */
function canEditEmployees(role) {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

/** Can view employees */
function canViewEmployees(role) {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

/** Can view financial dashboard */
function canViewFinancial(role) {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

/** Can view notifications */
function canViewNotifications(role) {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
}

/** Can delete notifications (Super Admin only) */
function canDeleteNotifications(role) {
  return role === ROLES.SUPER_ADMIN;
}

/** Can manage accounts (create/disable/delete) */
function canManageAccounts(role) {
  return role === ROLES.SUPER_ADMIN;
}

/** Can create Super Admin (nobody from UI - or only Super Admin for first seed) */
function canCreateSuperAdmin(role) {
  return role === ROLES.SUPER_ADMIN;
}

/** Session timeout minutes — 30 days so users stay logged in on mobile/tablet */
const SESSION_TIMEOUT_MINUTES = 43200; // 30 days

/** Days before due date to show salary alert */
const SALARY_ALERT_DAYS = 7;
