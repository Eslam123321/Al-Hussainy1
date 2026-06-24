/**
 * Storage layer: Firestore (primary) + in-memory cache
 * 
 * Strategy: in-memory cache for synchronous reads,
 * Firestore sync happens in the background on every write.
 * 
 * localStorage is only used for: session, theme, payday confirmations
 * (per-device settings that don't need to be shared).
 */

// ===== In-memory cache =====
const _cache = {
  players: [],
  coaches: [],
  employees: [],
  users: null,
  notifications: [],
  attendance_records: [],
  expenses: [],
  club_payments: [],
};

// ===== Firestore helpers =====

/**
 * Remove undefined values — Firestore doesn't accept them.
 */
function _sanitize(obj) {
  return JSON.parse(JSON.stringify(obj === undefined ? null : obj));
}

let _unsubscribers = {};

/**
 * Load all documents from a Firestore collection into an array using real-time listener.
 * This fixes the issue where data doesn't appear until a refresh (due to get() caching).
 */
function _loadCollection(name) {
  return new Promise((resolve) => {
    if (_unsubscribers[name]) {
      _unsubscribers[name]();
    }
    
    let isFirstLoad = true;
    _unsubscribers[name] = _firestoreDB.collection(name).onSnapshot((snap) => {
      const arr = snap.docs.map(d => ({ ...d.data() }));
      _cache[name] = arr;
      
      // Re-render UI magically when data changes remotely or after initial empty cache load
      if (!isFirstLoad && typeof window.triggerGlobalRender === 'function') {
        window.triggerGlobalRender();
      }
      
      if (isFirstLoad) {
        isFirstLoad = false;
        resolve(arr);
      }
    }, (e) => {
      console.error('Firestore snapshot error [' + name + ']:', e);
      if (isFirstLoad) {
        isFirstLoad = false;
        resolve([]);
      }
    });
  });
}

async function _syncCollection(name, arr, deleteOrphans = true) {
  console.warn(`_syncCollection called for ${name}. This massive sync is deprecated for performance reasons.`);
}

async function dbUpsert(collection, doc) {
  try {
    await _firestoreDB.collection(collection).doc(String(doc.id || doc._id)).set(_sanitize(doc), { merge: true });
  } catch (e) { console.error('Firestore upsert error:', e); }
}

async function dbDelete(collection, docId) {
  try {
    await _firestoreDB.collection(collection).doc(String(docId)).delete();
  } catch (e) { console.error('Firestore delete error:', e); }
}

// ===== Database initialization (call once at app start) =====

async function initDB() {
  try {
    const [players, coaches, employees, users, notifications, attendance_records, expenses, club_payments] = await Promise.all([
      _loadCollection('players'),
      _loadCollection('coaches'),
      _loadCollection('employees'),
      _loadCollection('users'),
      _loadCollection('notifications'),
      _loadCollection('attendance_records'),
      _loadCollection('expenses'),
      _loadCollection('club_payments'),
    ]);
    _cache.players            = players;
    _cache.coaches            = coaches;
    _cache.employees          = employees;
    _cache.users              = users || []; // Always prioritize array
    _cache.notifications      = notifications;
    _cache.attendance_records = attendance_records;
    _cache.expenses           = expenses;
    _cache.club_payments      = club_payments;

    // Create default super-admin ONLY if the users collection is truly empty 
    // (and we have permission to know it's empty)
    if (_cache.users.length === 0) {
       await initSeedData();
    }
  } catch (e) {
    console.error('initDB error:', e);
  }
}

// ===== Seed default data =====

async function initSeedData() {
  if (_cache.users !== null && _cache.users.length > 0) return;
  
  const defaultEmail = 'admin@lisbon.com';
  const defaultPass = 'admin123';
  
  try {
    // 1. Create super-admin in Firebase Auth
    const userCred = await firebase.auth().createUserWithEmailAndPassword(defaultEmail, defaultPass);
    const uid = userCred.user.uid;

    // 2. Add to Firestore users collection
    const superAdminUser = {
      id: uid,
      email: defaultEmail,
      role: ROLES.SUPER_ADMIN,
      name: 'المسؤول الرئيسي',
      enabled: true,
      createdAt: new Date().toISOString()
    };
    
    await firebase.firestore().collection('users').doc(uid).set(superAdminUser);
    
    _cache.users = [superAdminUser];
    console.log("تم إنشاء حساب المسؤول الافتراضي بنجاح");
  } catch (err) {
    console.error("خطأ أثناء إنشاء حساب المسؤول الافتراضي:", err);
    // If auth/email-already-in-use, we might just need to fetch it (handled previously by loadCollection)
  }
}

// ===== Players =====

function getPlayers() { return _cache.players; }

function setPlayers(arr) {
  _cache.players = arr;
}

// ===== Coaches =====

function getCoaches() { return _cache.coaches; }

function setCoaches(arr) {
  _cache.coaches = arr;
}

// ===== Employees =====

function getEmployees() { return _cache.employees; }

function setEmployees(arr) {
  _cache.employees = arr;
}

// ===== Users =====

function getUsers() { return _cache.users; }

function setUsers(arr) {
  _cache.users = arr;
}

// ===== Notifications =====

function getNotifications() { return _cache.notifications; }

function setNotifications(arr) {
  _cache.notifications = arr;
}

// ===== Attendance =====

function getAttendanceRecords() { return _cache.attendance_records; }

function setAttendanceRecords(arr) {
  _cache.attendance_records = arr;
}

// ===== Expenses =====

function getExpenses() { return _cache.expenses || []; }

function setExpenses(arr) {
  _cache.expenses = arr;
}

// ===== Club Payments =====

function getClubPayments() { return _cache.club_payments || []; }

function setClubPayments(arr) {
  _cache.club_payments = arr;
}

function addAttendanceRecord(record) {
  const list = getAttendanceRecords();
  list.push(record);
  setAttendanceRecords(list);
  dbUpsert('attendance_records', record);
}

// ===== Session (localStorage — per device) =====

const _LOCAL_KEYS = {
  SESSION:              'ahfc_session',
  THEME:                'ahfc_theme',
  PAYDAY_CONFIRMATIONS: 'ahfc_payday_confirmations'
};

function _getLocal(key, def = null) {
  try {
    // Always use localStorage for all keys including session — persists across browser restarts
    const raw = localStorage.getItem(key);
    if (raw == null) return def;
    return JSON.parse(raw);
  } catch { return def; }
}

function _setLocal(key, value) {
  try { 
    localStorage.setItem(key, JSON.stringify(value)); 
  } catch(e) {}
}

function getSession()        { return _getLocal(_LOCAL_KEYS.SESSION, null); }
function setSession(obj)     { _setLocal(_LOCAL_KEYS.SESSION, obj); }
function clearSession()      { 
  localStorage.removeItem(_LOCAL_KEYS.SESSION);
  sessionStorage.removeItem(_LOCAL_KEYS.SESSION); // Clean up legacy
}

function getTheme()          { return localStorage.getItem(_LOCAL_KEYS.THEME) || 'light'; }
function setTheme(theme)     { localStorage.setItem(_LOCAL_KEYS.THEME, theme); }

// ===== Backward-compatible aliases (used by auth.js) =====

/** Legacy STORAGE_KEYS used by auth.js */
const STORAGE_KEYS = {
  SESSION: _LOCAL_KEYS.SESSION,
  THEME:   _LOCAL_KEYS.THEME,
};

/** Legacy getItem / setItem used by auth.js */
function getItem(key, def = null) { return _getLocal(key, def); }
function setItem(key, value)      { _setLocal(key, value); return true; }

// ===== Payday Confirmations (localStorage — per device) =====

function getPaydayConfirmations()      { return _getLocal(_LOCAL_KEYS.PAYDAY_CONFIRMATIONS, {}); }
function setPaydayConfirmations(obj)   { _setLocal(_LOCAL_KEYS.PAYDAY_CONFIRMATIONS, obj); }

function getPaydayKey(id) {
  const now = new Date();
  const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  return id + '_' + ym;
}

/**
 * Extracts the day-of-month (1–31) from a payday value.
 * Handles both new format ("15") and old full-date format ("2026-03-15").
 */
function getPaydayDayNumber(payday) {
  if (!payday) return 0;
  const str = String(payday).trim();
  if (/^\d{1,2}$/.test(str)) {
    const d = parseInt(str, 10);
    return (d >= 1 && d <= 31) ? d : 0;
  }
  const parts = str.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    return (day >= 1 && day <= 31) ? day : 0;
  }
  return 0;
}

function addMonthToPayday(paydayVal) {
  if (!paydayVal) return '';
  const str = String(paydayVal).trim();
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-indexed
  let day = 15;
  
  if (/^\d{1,2}$/.test(str)) {
    day = parseInt(str, 10);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1; // 0-indexed
    day = parseInt(parts[2], 10);
  } else {
    return paydayVal; // fallback
  }
  
  // Add one month
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }
  
  // Safely get last day of next month if current day is e.g. 31 and next month has 30 days
  const lastDayOfNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
  const targetDay = Math.min(day, lastDayOfNextMonth);
  
  const nextDate = new Date(nextYear, nextMonth, targetDay);
  const padMonth = String(nextDate.getMonth() + 1).padStart(2, '0');
  const padDay = String(nextDate.getDate()).padStart(2, '0');
  return `${nextDate.getFullYear()}-${padMonth}-${padDay}`;
}


function isPaydayReached(payday) {
  const day = getPaydayDayNumber(payday);
  if (!day) return false;
  return new Date().getDate() >= day;
}

function togglePaydayConfirmation(id) {
  const confs = getPaydayConfirmations();
  const key = getPaydayKey(id);
  confs[key] = !confs[key];
  setPaydayConfirmations(confs);
  return confs[key];
}

function isPaydayConfirmed(id) {
  const confs = getPaydayConfirmations();
  return !!confs[getPaydayKey(id)];
}
