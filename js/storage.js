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
};

// ===== Firestore helpers =====

/**
 * Remove undefined values — Firestore doesn't accept them.
 */
function _sanitize(obj) {
  return JSON.parse(JSON.stringify(obj === undefined ? null : obj));
}

/**
 * Load all documents from a Firestore collection into an array.
 */
async function _loadCollection(name) {
  try {
    const snap = await _firestoreDB.collection(name).get();
    return snap.docs.map(d => ({ ...d.data() }));
  } catch (e) {
    console.error('Firestore load error [' + name + ']:', e);
    return [];
  }
}

/**
 * Overwrite an entire Firestore collection with the given array.
 * Uses batched writes (max 500 ops). Each item's `id` becomes the doc ID.
 */
/**
 * Synchronize a local array with a Firestore collection safely.
 * Logic: Upsert all items in the array. 
 * Optional: Delete remote items NOT in the local array (standard sync).
 */
async function _syncCollection(name, arr, deleteOrphans = true) {
  try {
    const colRef = _firestoreDB.collection(name);
    const CHUNK = 400; // Safe batch size

    // 1. Upsert all items from local array
    for (let i = 0; i < arr.length; i += CHUNK) {
      const batch = _firestoreDB.batch();
      arr.slice(i, i + CHUNK).forEach((item, idx) => {
        const docId = String(item.id || item._id || (name + '_' + (i + idx)));
        batch.set(colRef.doc(docId), _sanitize(item), { merge: true });
      });
      await batch.commit();
    }

    // 2. [Optional] Delete orphan documents from Firestore
    // For 'users' collection, we NEVER delete orphans automatically for safety.
    if (deleteOrphans && name !== 'users') {
      const snap = await colRef.get();
      const localIds = new Set(arr.map(item => String(item.id || item._id)));
      
      const toDelete = snap.docs.filter(doc => !localIds.has(doc.id));
      if (toDelete.length > 0) {
        for (let i = 0; i < toDelete.length; i += CHUNK) {
          const batch = _firestoreDB.batch();
          toDelete.slice(i, i + CHUNK).forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        }
      }
    }
  } catch (e) {
    console.error('Firestore sync error [' + name + ']:', e);
  }
}

// ===== Database initialization (call once at app start) =====

async function initDB() {
  try {
    const [players, coaches, employees, users, notifications, attendance_records] = await Promise.all([
      _loadCollection('players'),
      _loadCollection('coaches'),
      _loadCollection('employees'),
      _loadCollection('users'),
      _loadCollection('notifications'),
      _loadCollection('attendance_records'),
    ]);
    _cache.players            = players;
    _cache.coaches            = coaches;
    _cache.employees          = employees;
    _cache.users              = users || []; // Always prioritize array
    _cache.notifications      = notifications;
    _cache.attendance_records = attendance_records;

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
  _syncCollection('players', arr);
}

// ===== Coaches =====

function getCoaches() { return _cache.coaches; }

function setCoaches(arr) {
  _cache.coaches = arr;
  _syncCollection('coaches', arr);
}

// ===== Employees =====

function getEmployees() { return _cache.employees; }

function setEmployees(arr) {
  _cache.employees = arr;
  _syncCollection('employees', arr);
}

// ===== Users =====

function getUsers() { return _cache.users; }

function setUsers(arr) {
  _cache.users = arr;
  _syncCollection('users', arr);
}

// ===== Notifications =====

function getNotifications() { return _cache.notifications; }

function setNotifications(arr) {
  _cache.notifications = arr;
  _syncCollection('notifications', arr);
}

// ===== Attendance =====

function getAttendanceRecords() { return _cache.attendance_records; }

function setAttendanceRecords(arr) {
  _cache.attendance_records = arr;
  _syncCollection('attendance_records', arr, false);
}

function addAttendanceRecord(record) {
  const list = getAttendanceRecords();
  list.push(record);
  setAttendanceRecords(list);
}

// ===== Session (localStorage — per device) =====

const _LOCAL_KEYS = {
  SESSION:              'ahfc_session',
  THEME:                'ahfc_theme',
  PAYDAY_CONFIRMATIONS: 'ahfc_payday_confirmations'
};

function _getLocal(key, def = null) {
  try {
    const storage = key === _LOCAL_KEYS.SESSION ? sessionStorage : localStorage;
    const raw = storage.getItem(key);
    if (raw == null) return def;
    return JSON.parse(raw);
  } catch { return def; }
}

function _setLocal(key, value) {
  try { 
    const storage = key === _LOCAL_KEYS.SESSION ? sessionStorage : localStorage;
    storage.setItem(key, JSON.stringify(value)); 
  } catch(e) {}
}

function getSession()        { return _getLocal(_LOCAL_KEYS.SESSION, null); }
function setSession(obj)     { _setLocal(_LOCAL_KEYS.SESSION, obj); }
function clearSession()      { 
  sessionStorage.removeItem(_LOCAL_KEYS.SESSION); 
  localStorage.removeItem(_LOCAL_KEYS.SESSION); // Clean up legacy
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
