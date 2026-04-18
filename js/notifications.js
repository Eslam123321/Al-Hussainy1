/**
 * Notifications log: login, logout, CRUD actions
 */
function logNotification(action, email, meta = {}) {
  const list = getNotifications();
  const entry = {
    id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
    action,
    email: email || (getCurrentUser() && getCurrentUser().email) || '—',
    meta: { ...meta },
    at: new Date().toISOString()
  };
  list.unshift(entry);
  setNotifications(list.slice(0, 500));
}

function getActionLabel(action) {
  const labels = {
    login: 'تسجيل دخول',
    logout: 'تسجيل خروج',
    account_created: 'إنشاء حساب',
    account_disabled: 'تعطيل حساب',
    account_enabled: 'تفعيل حساب',
    account_deleted: 'حذف حساب',
    player_add: 'إضافة لاعب',
    player_edit: 'تعديل لاعب',
    player_delete: 'حذف لاعب',
    coach_add: 'إضافة كابتن',
    coach_edit: 'تعديل كابتن',
    coach_delete: 'حذف كابتن'
  };
  return labels[action] || action;
}

function renderNotificationsList(list, searchQuery, canDelete, onDelete) {
  const q = (searchQuery || '').trim().toLowerCase();
  const filtered = q ? list.filter(n => n.email && n.email.toLowerCase().includes(q)) : list;
  if (!filtered.length) {
    return '<div class="empty-state"><p>لا توجد إشعارات</p></div>';
  }
  let html = '<div class="notification-list">';
  filtered.forEach(n => {
    const emailMatch = q && n.email && n.email.toLowerCase().includes(q);
    const emailDisplay = q && emailMatch
      ? n.email.replace(new RegExp('(' + escapeRegex(q) + ')', 'gi'), '<mark>$1</mark>')
      : (n.email || '—');
    const actionLabel = getActionLabel(n.action);
    const time = new Date(n.at).toLocaleString('ar-SA');
    html += `<div class="item" data-id="${n.id}">
      <div>
        <strong>${actionLabel}</strong> — ${emailDisplay}
        <div class="text-muted" style="font-size:0.85rem;margin-top:0.25rem">${time}</div>
      </div>
      ${canDelete ? `<button type="button" class="btn btn-danger btn-sm btn-delete-notif" data-id="${n.id}">حذف</button>` : ''}
    </div>`;
  });
  html += '</div>';
  return html;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
