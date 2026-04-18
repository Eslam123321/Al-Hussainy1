/**
 * Authentication: Firebase Authentication + Session caching
 */

// We don't need manual hash functions anymore since Firebase handles passwords securely

function setSessionData(data) {
  setSession({
    ...data,
    expiresAt: Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000
  });
}

function clearSessionData() {
  clearSession();
}

function isSessionValid() {
  const s = getSession();
  if (!s || !s.expiresAt) return false;
  if (Date.now() > s.expiresAt) {
    clearSessionData();
    return false;
  }
  return true;
}

function getCurrentUser() {
  if (!isSessionValid()) return null;
  const s = getSession();
  return s ? s.user : null;
}

async function login(email, password, roleFilter) {
  const normalizedEmail = String(email).trim().toLowerCase();
  
  // Ensure we start with a clean state
  clearSessionData();
  
  try {
    // 1. Authenticate with Firebase securely
    const userCredential = await firebase.auth().signInWithEmailAndPassword(normalizedEmail, password);
    const firebaseUser = userCredential.user;

    // 2. Fetch user's role and details from Firestore 'users' collection
    const userDoc = await firebase.firestore().collection('users').doc(firebaseUser.uid).get();
    
    if (!userDoc.exists) {
      await firebase.auth().signOut();
      return { ok: false, message: 'هذا الحساب غير مسجل في النظام الداخلي' };
    }

    const userData = userDoc.data();

    if (userData.enabled === false) {
      await firebase.auth().signOut();
      return { ok: false, message: 'هذا الحساب معطل' };
    }

    if (roleFilter) {
      if (roleFilter === ROLES.WORKER && userData.role !== ROLES.WORKER) {
        await firebase.auth().signOut();
        return { ok: false, message: 'يرجى تسجيل الدخول كـ موظف' };
      }
      if (roleFilter === ROLES.ADMIN && userData.role !== ROLES.ADMIN && userData.role !== ROLES.SUPER_ADMIN) {
        await firebase.auth().signOut();
        return { ok: false, message: 'يرجى تسجيل الدخول كـ إدارة' };
      }
    }

    const sessionUser = {
      id: firebaseUser.uid,
      email: normalizedEmail,
      role: userData.role,
      name: userData.name || normalizedEmail
    };
    
    setSessionData({ user: sessionUser });
    return { ok: true, user: sessionUser };

  } catch (error) {
    console.error("Login error:", error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      return { ok: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
    }
    return { ok: false, message: 'حدث خطأ أثناء تسجيل الدخول: ' + error.message };
  }
}

function logout() {
  const user = getCurrentUser();
  clearSessionData();
  firebase.auth().signOut().catch(console.error);
  if (user && typeof logNotification === 'function') {
    logNotification('logout', user.email, {});
  }
}

function requireSuperAdminPassword(plainPassword) {
  const superPassword = 'super_ahfc_2025';
  return plainPassword === superPassword;
}

/** تغيير كلمة مرور مستخدم (باستخدام معرف المستخدم) - للمسؤول الرئيسي */
async function setUserPasswordById(userId, newPassword) {
  // NOTE: Firebase Auth doesn't allow changing another user's password directly from the client SDK (requires Admin SDK).
  // For client-side, we would normally use a password reset email or require the user to be logged in.
  // As a workaround, we return a message explaining this limitation.
  return { ok: false, message: 'لأسباب أمنية (Firebase Security)، لا يمكن تغيير كلمة مرور مستخدم آخر من لوحة التحكم مباشرة. يرجى حذف الحساب وإنشاؤه من جديد.' };
}
