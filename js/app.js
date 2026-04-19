/**
 * Al Hussainy FC - Main app: login, sidebar, routing, access control
 */
(function () {
  // ── initDB() loads data from Firestore + seeds default admin ──

  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const contentArea = document.getElementById('content-area');
  const sidebarNav = document.getElementById('sidebar-nav');
  const userBadge = document.getElementById('user-badge');
  const pageTitle = document.getElementById('page-title');
  const btnLogout = document.getElementById('btn-logout');
  const themeToggle = document.getElementById('theme-toggle');
  const globalSearch = document.getElementById('global-search');
  const accessDeniedOverlay = document.getElementById('access-denied-overlay');
  const accessDeniedClose = document.getElementById('access-denied-close');

  let currentRoute = ROUTES.ADD_PLAYER;
  let currentListBranch = 'القاهرة';
  let attendanceCurrentBranch = null;
  let attendanceCurrentRole = null;
  let attendanceDate = new Date().toISOString().split('T')[0];

  function getRouteFromHash() {
    const hash = (location.hash || '').replace(/^#/, '');
    if (Object.values(ROUTES).includes(hash)) return hash;
    return null;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    setTheme(theme);
  }

  function initTheme() {
    const theme = getTheme();
    applyTheme(theme);
  }

  function showAccessDenied() {
    if (accessDeniedOverlay) accessDeniedOverlay.style.display = 'flex';
  }

  function hideAccessDenied() {
    if (accessDeniedOverlay) accessDeniedOverlay.style.display = 'none';
  }

  function canAccess(route) {
    const user = getCurrentUser();
    if (!user) return false;
    const allowed = ROLE_ROUTES[user.role] || [];
    return allowed.includes(route);
  }

  function navigateTo(route) {
    if (!canAccess(route)) {
      showAccessDenied();
      return;
    }
    currentRoute = route;
    try { location.hash = route; } catch (e) {}
    if (pageTitle) pageTitle.textContent = ROUTE_LABELS[route] || route;
    renderContent();
    updateSidebarActive();
  }

  function updateSidebarActive() {
    sidebarNav.querySelectorAll('a').forEach(a => {
      a.classList.toggle('active', a.dataset.route === currentRoute);
    });
  }

  function buildSidebar() {
    const user = getCurrentUser();
    if (!user) return;
    const allowed = ROLE_ROUTES[user.role] || [];
    let html = '';
    allowed.forEach(r => {
      const label = ROUTE_LABELS[r];
      html += `<a href="#" data-route="${r}">${label}</a>`;
    });
    sidebarNav.innerHTML = html;
    sidebarNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(a.dataset.route);
      });
    });
    updateSidebarActive();
  }

  function renderContent() {
    const user = getCurrentUser();
    const role = user ? user.role : null;
    const searchQ = globalSearch ? globalSearch.value.trim() : '';

    switch (currentRoute) {
      case ROUTES.DASHBOARD:
        contentArea.innerHTML = renderDashboard(role);
        if (typeof renderFinancialCharts === 'function') setTimeout(renderFinancialCharts, 100);
        bindUpcomingPayments(); // Added this line
        break;
      case ROUTES.ADD_PLAYER:
        contentArea.innerHTML = renderAddPlayerForm(role);
        bindPlayerForm();
        break;
      case ROUTES.ADD_COACH:
        contentArea.innerHTML = renderAddCoachForm(role);
        bindCoachForm();
        break;
      case ROUTES.PLAYERS_LIST:
        contentArea.innerHTML = renderPlayersList(role, searchQ);
        bindPlayersList(role);
        break;
      case ROUTES.COACHES_LIST:
        contentArea.innerHTML = renderCoachesList(role, searchQ);
        bindCoachesList(role);
        break;
      case ROUTES.ADD_EMPLOYEE:
        contentArea.innerHTML = renderAddEmployeeForm(role);
        bindEmployeeForm();
        break;
      case ROUTES.EMPLOYEES_LIST:
        contentArea.innerHTML = renderEmployeesList(role, searchQ);
        bindEmployeesList(role);
        break;
      case ROUTES.FINANCIAL:
        contentArea.innerHTML = renderFinancialDashboard();
        setTimeout(renderFinancialCharts, 100);
        document.getElementById('export-financial')?.addEventListener('click', exportFinancialSummaryToExcel);
        break;
      case ROUTES.UPCOMING_PAYMENTS:
        contentArea.innerHTML = renderUpcomingPayments();
        bindUpcomingPayments();
        break;
      case ROUTES.NOTIFICATIONS:
        contentArea.innerHTML = renderNotificationsPage(role, searchQ);
        bindNotificationsPage(role);
        break;
      case ROUTES.ACCOUNTS:
        contentArea.innerHTML = renderAccountsPage(searchQ);
        bindAccountsPage();
        break;
      case ROUTES.BACKUP:
        contentArea.innerHTML = renderBackupPage();
        bindBackupPage();
        break;
      case ROUTES.PASSWORDS:
        contentArea.innerHTML = renderPasswordsPage();
        bindPasswordsPage();
        break;
      case ROUTES.ATTENDANCE:
        contentArea.innerHTML = renderAttendancePage();
        bindAttendancePage();
        break;
      default:
        contentArea.innerHTML = '<div class="empty-state"><h2>الصفحة غير موجودة</h2></div>';
        break;
    }
  }

  // Expose renderContent globally so real-time Firebase listeners can update the UI
  window.triggerGlobalRender = renderContent;

  function renderDashboard(role) {
    if (!canViewFinancial(role)) {
      return '<div class="card"><p>مرحباً. استخدم القائمة لإضافة لاعب أو كابتن.</p></div>';
    }
    const sum = getFinancialSummary();
    const upcoming = getUpcomingPayments().slice(0, 5);
    let html = `
      <div class="stats-grid">
        <div class="stat-card success animate-in"><h4>إجمالي المدفوع للاعبين</h4><div class="value" data-value="${sum.totalPaidPlayers}">0</div></div>
        <div class="stat-card warning animate-in"><h4>إجمالي المتبقي للاعبين</h4><div class="value" data-value="${sum.totalRemainingPlayers}">0</div></div>
        <div class="stat-card animate-in"><h4>مدفوع الكباتن</h4><div class="value" data-value="${sum.totalPaidCoaches}">0</div></div>
        <div class="stat-card animate-in"><h4>متبقي الكباتن</h4><div class="value" data-value="${sum.totalRemainingCoaches}">0</div></div>
        <div class="stat-card animate-in"><h4>مدفوع الموظفين</h4><div class="value" data-value="${sum.totalPaidEmployees}">0</div></div>
        <div class="stat-card animate-in"><h4>متبقي الموظفين</h4><div class="value" data-value="${sum.totalRemainingEmployees}">0</div></div>
      </div>
      <div class="card">
        <h3 class="card-title">نظرة عامة</h3>
        <div class="chart-container"><canvas id="chart-pie"></canvas></div>
        <div class="chart-container"><canvas id="chart-bar"></canvas></div>
      </div>
      <div class="card">
        <h3 class="card-title">أقرب المدفوعات القادمة</h3>
        ${upcoming.length ? upcoming.map(u => `
          <p>${u.fullName || u.name} — ${u.daysUntil === 0 ? 'اليوم' : u.daysUntil === 1 ? 'غداً' : u.daysUntil + ' أيام'} — ${u.contractEnd}</p>
        `).join('') : '<p class="empty-state">لا توجد مدفوعات قادمة خلال 7 أيام</p>'}
      </div>
    `;
    setTimeout(() => {
      contentArea.querySelectorAll('.stat-card .value[data-value]').forEach(el => {
        const v = parseInt(el.dataset.value, 10);
        if (typeof animateValue === 'function') animateValue(el, v);
      });
    }, 50);
    return html;
  }

  function renderAddPlayerForm(role) {
    const positions = PLAYER_POSITIONS.map(p => `<option value="${p.value}">${p.label}</option>`).join('');
    return `
      <div class="card">
        <h3 class="card-title">إضافة لاعب</h3>
        <form id="form-player">
          <div class="form-row">
            <div class="form-group"><label>الاسم بالكامل</label><input type="text" name="fullName" required></div>
            <div class="form-group"><label>رقم الهاتف</label><input type="text" name="phone" inputmode="tel"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>تاريخ الميلاد</label><input type="date" name="dateOfBirth"></div>
            <div class="form-group"><label>مركز اللاعب</label><select name="position">${positions}</select></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>تاريخ بداية التعاقد</label><input type="date" name="contractStart"></div>
            <div class="form-group"><label>تاريخ انتهاء التعاقد</label><input type="date" name="contractEnd"></div>
            <div class="form-group">
              <label>الفرع</label>
              <select name="branch" required>
                <option value="القاهرة">القاهرة</option>
                <option value="الجيزة">الجيزة</option>
                <option value="سوهاج">سوهاج</option>
                <option value="الأقصر">الأقصر</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>قيمة العقد</label><input type="number" name="contractValue" min="0" step="0.01" value="0"></div>
            <div class="form-group"><label>المبلغ المدفوع</label><input type="number" name="paid" min="0" step="0.01" value="0"></div>
            <div class="form-group"><label>المبلغ المتبقي</label><input type="text" name="remaining" class="readonly" readonly placeholder="يُحسب تلقائياً"></div>
          </div>
          <button type="submit" class="btn btn-primary">إضافة اللاعب</button>
        </form>
      </div>
    `;
  }

  function bindPlayerForm() {
    const form = document.getElementById('form-player');
    if (!form) return;
    const contractValue = form.querySelector('[name="contractValue"]');
    const paid = form.querySelector('[name="paid"]');
    const remaining = form.querySelector('[name="remaining"]');
    function updateRemaining() {
      const v = parseFloat(contractValue.value) || 0;
      const p = parseFloat(paid.value) || 0;
      remaining.value = Math.max(0, v - p);
    }
    contractValue.addEventListener('input', updateRemaining);
    paid.addEventListener('input', updateRemaining);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      data.contractValue = fd.get('contractValue');
      data.paid = fd.get('paid');
      addPlayer(data);
      form.reset();
      updateRemaining();
      if (canAccess(ROUTES.PLAYERS_LIST)) navigateTo(ROUTES.PLAYERS_LIST);
    });
  }

  function renderAddCoachForm(role) {
    const showMoney = canViewFinancial(role);
    return `
      <div class="card">
        <h3 class="card-title">إضافة كابتن</h3>
        <form id="form-coach">
          <div class="form-row">
            <div class="form-group"><label>الاسم</label><input type="text" name="name" required></div>
            <div class="form-group"><label>رقم الهاتف</label><input type="text" name="phone" inputmode="tel"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>تاريخ بداية التعاقد</label><input type="date" name="contractStart"></div>
            <div class="form-group"><label>تاريخ انتهاء التعاقد</label><input type="date" name="contractEnd"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>يوم القبض (من الشهر)</label><input type="number" name="payday" min="1" max="31" placeholder="مثال: 15"></div>
            <div class="form-group">
              <label>الفرع</label>
              <select name="branch" required>
                <option value="القاهرة">القاهرة</option>
                <option value="الجيزة">الجيزة</option>
                <option value="سوهاج">سوهاج</option>
                <option value="الأقصر">الأقصر</option>
              </select>
            </div>
          </div>
          ${showMoney ? `
          <div class="form-row">
            <div class="form-group"><label>الراتب</label><input type="number" name="salary" min="0" step="0.01" value="0"></div>
            <div class="form-group"><label>المدفوع</label><input type="number" name="paid" min="0" step="0.01" value="0"></div>
            <div class="form-group"><label>المتبقي</label><input type="text" class="readonly" readonly placeholder="يُحسب تلقائياً" id="coach-remaining"></div>
          </div>
          ` : ''}
          <button type="submit" class="btn btn-primary">إضافة الكابتن</button>
        </form>
      </div>
    `;
  }

  function bindCoachForm() {
    const form = document.getElementById('form-coach');
    if (!form) return;
    const salary = form.querySelector('[name="salary"]');
    const paid = form.querySelector('[name="paid"]');
    const remaining = document.getElementById('coach-remaining');
    function updateRemaining() {
      if (!remaining) return;
      const s = salary ? (parseFloat(salary.value) || 0) : 0;
      const p = paid ? (parseFloat(paid.value) || 0) : 0;
      remaining.value = Math.max(0, s - p);
    }
    if (salary) salary.addEventListener('input', updateRemaining);
    if (paid) paid.addEventListener('input', updateRemaining);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      data.salary = fd.get('salary') || 0;
      data.paid = fd.get('paid') || 0;
      addCoach(data);
      form.reset();
      updateRemaining();
      if (canAccess(ROUTES.COACHES_LIST)) navigateTo(ROUTES.COACHES_LIST);
    });
  }

  function renderPlayersList(role, searchQ) {
    const canEdit = canEditPlayers(role);
    const filtered = filterPlayers(searchQ);
    const allFiltered = filtered.map(({ highlighted }) => highlighted);
    const list = allFiltered.filter(p => p.branch === currentListBranch || (!p.branch && currentListBranch === 'القاهرة'));
    const canExport = canViewFinancial(role);

    let html = `<div class="branch-tabs" style="display:flex; gap:10px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center;">
      <button type="button" class="btn ${currentListBranch === 'القاهرة' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="القاهرة">القاهرة</button>
      <button type="button" class="btn ${currentListBranch === 'الجيزة' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="الجيزة">الجيزة</button>
      <button type="button" class="btn ${currentListBranch === 'سوهاج' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="سوهاج">سوهاج</button>
      <button type="button" class="btn ${currentListBranch === 'الأقصر' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="الأقصر">الأقصر</button>
    </div>`;

    html += '<div class="export-bar">';
    html += `<button type="button" class="btn btn-primary btn-sm" id="print-players">طباعة</button>`;
    if (canExport) html += `<button type="button" class="btn btn-primary btn-sm" id="export-players">تصدير Excel</button>`;
    html += '</div>';
    html += `<div class="card printable-content"><h3 class="card-title">قائمة اللاعبين - فرع ${currentListBranch}</h3><div class="table-wrap"><table class="data-table"><thead><tr>
      <th>الاسم</th><th>الهاتف</th><th>تاريخ الميلاد</th><th>بداية التعاقد</th><th>انتهاء التعاقد</th><th>قيمة العقد</th><th>المدفوع</th><th>المتبقي</th><th>المركز</th>
      ${canEdit ? '<th>إجراءات</th>' : ''}
    </tr></thead><tbody>`;
    if (!list.length) html += '<tr><td colspan="' + (canEdit ? 10 : 9) + '">لا يوجد لاعبين</td></tr>';
    else list.forEach(p => {
      html += `<tr data-id="${p.id}">
        <td>${p.fullName || '—'}</td><td>${p.phone || '—'}</td><td>${p.dateOfBirth || '—'}</td>
        <td>${p.contractStart || '—'}</td><td>${p.contractEnd || '—'}</td>
        <td>${p.contractValue}</td><td>${p.paid}</td><td>${p.remaining}</td><td>${getPositionLabel(p.position)}</td>
        ${canEdit ? `<td><button type="button" class="btn btn-sm btn-edit-player" data-id="${p.id}">تعديل</button> <button type="button" class="btn btn-sm btn-danger btn-delete-player" data-id="${p.id}">حذف</button></td>` : ''}
      </tr>`;
    });
    html += '</tbody></table></div></div>';
    return html;
  }

  function bindPlayersList(role) {
    document.querySelectorAll('.btn-branch-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        currentListBranch = btn.dataset.branch;
        renderContent();
      });
    });

    const canEdit = canEditPlayers(role);
    document.querySelectorAll('.btn-edit-player').forEach(btn => {
      btn.addEventListener('click', () => openPlayerEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.btn-delete-player').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('حذف هذا اللاعب؟')) { deletePlayer(btn.dataset.id); renderContent(); }
      });
    });
    document.getElementById('print-players')?.addEventListener('click', () => printContentArea());
    const exp = document.getElementById('export-players');
    if (exp) exp.addEventListener('click', exportPlayersToExcel);
  }

  function openPlayerEditModal(id) {
    const list = getPlayers();
    const p = list.find(x => x.id === id);
    if (!p) return;
    const positions = PLAYER_POSITIONS.map(po => `<option value="${po.value}" ${po.value === p.position ? 'selected' : ''}>${po.label}</option>`).join('');
    const modal = document.createElement('div');
    modal.className = 'overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">تعديل لاعب</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="edit-player-form">
            <input type="hidden" name="id" value="${p.id}">
            <div class="form-row">
              <div class="form-group"><label>الاسم بالكامل</label><input type="text" name="fullName" value="${escapeAttr(p.fullName)}" required></div>
              <div class="form-group"><label>رقم الهاتف</label><input type="text" name="phone" value="${escapeAttr(p.phone)}"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>تاريخ الميلاد</label><input type="date" name="dateOfBirth" value="${p.dateOfBirth || ''}"></div>
              <div class="form-group"><label>مركز اللاعب</label><select name="position">${positions}</select></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>بداية التعاقد</label><input type="date" name="contractStart" value="${p.contractStart || ''}"></div>
              <div class="form-group"><label>انتهاء التعاقد</label><input type="date" name="contractEnd" value="${p.contractEnd || ''}"></div>
            </div>
            <div class="form-group">
              <label>الفرع</label>
              <select name="branch" required>
                <option value="القاهرة" ${p.branch === 'القاهرة' ? 'selected' : ''}>القاهرة</option>
                <option value="الجيزة" ${p.branch === 'الجيزة' ? 'selected' : ''}>الجيزة</option>
                <option value="سوهاج" ${p.branch === 'سوهاج' ? 'selected' : ''}>سوهاج</option>
                <option value="الأقصر" ${p.branch === 'الأقصر' ? 'selected' : ''}>الأقصر</option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group"><label>قيمة العقد</label><input type="number" name="contractValue" value="${p.contractValue}" min="0" step="0.01"></div>
              <div class="form-group"><label>المدفوع</label><input type="number" name="paid" value="${p.paid}" min="0" step="0.01"></div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
              <button type="button" class="btn btn-outline btn-cancel-edit">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#edit-player-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      updatePlayer(p.id, Object.fromEntries(fd.entries()));
      modal.remove();
      renderContent();
    });
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-cancel-edit').addEventListener('click', () => modal.remove());
  }

  function escapeAttr(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderCoachesList(role, searchQ) {
    const canEdit = canEditCoaches(role);
    const showMoney = canViewFinancial(role);
    const filtered = filterCoaches(searchQ);
    const allFiltered = filtered.map(({ highlighted }) => highlighted);
    const list = allFiltered.filter(c => c.branch === currentListBranch || (!c.branch && currentListBranch === 'القاهرة'));
    const canExport = canViewFinancial(role);

    let html = `<div class="branch-tabs" style="display:flex; gap:10px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center;">
      <button type="button" class="btn ${currentListBranch === 'القاهرة' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="القاهرة">القاهرة</button>
      <button type="button" class="btn ${currentListBranch === 'الجيزة' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="الجيزة">الجيزة</button>
      <button type="button" class="btn ${currentListBranch === 'سوهاج' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="سوهاج">سوهاج</button>
      <button type="button" class="btn ${currentListBranch === 'الأقصر' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="الأقصر">الأقصر</button>
    </div>`;

    html += '<div class="export-bar">';
    html += `<button type="button" class="btn btn-primary btn-sm" id="print-coaches">طباعة</button>`;
    if (canExport) html += `<button type="button" class="btn btn-primary btn-sm" id="export-coaches">تصدير Excel</button>`;
    html += '</div>';
    html += `<div class="card printable-content"><h3 class="card-title">قائمة الكباتن - فرع ${currentListBranch}</h3><div class="table-wrap"><table class="data-table"><thead><tr>
      <th>الاسم</th><th>الهاتف</th><th>يوم القبض</th><th>بداية التعاقد</th><th>انتهاء التعاقد</th>
      ${showMoney ? '<th>الراتب</th><th>المدفوع</th><th>المتبقي</th>' : ''}
      ${canEdit ? '<th>إجراءات</th>' : ''}
    </tr></thead><tbody>`;
    let cols = 5;
    if (showMoney) cols += 3;
    if (canEdit) cols += 1;
    if (!list.length) html += '<tr><td colspan="' + cols + '">لا يوجد كباتن</td></tr>';
    else list.forEach(c => {
      html += `<tr data-id="${c.id}">
        <td>${c.name || '—'}</td><td>${c.phone || '—'}</td>
        <td>${c.payday ? 'كل ' + getPaydayDayNumber(c.payday) + ' من الشهر' : '—'}</td>
        <td>${c.contractStart || '—'}</td><td>${c.contractEnd || '—'}</td>
        ${showMoney ? `<td>${c.salary}</td><td>${c.paid}</td><td>${c.remaining}</td>` : ''}
        ${canEdit ? `<td><button type="button" class="btn btn-sm btn-edit-coach" data-id="${c.id}">تعديل</button> <button type="button" class="btn btn-sm btn-danger btn-delete-coach" data-id="${c.id}">حذف</button></td>` : ''}
      </tr>`;
    });
    html += '</tbody></table></div></div>';
    return html;
  }

  function bindCoachesList(role) {
    document.querySelectorAll('.btn-branch-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        currentListBranch = btn.dataset.branch;
        renderContent();
      });
    });

    document.querySelectorAll('.btn-edit-coach').forEach(btn => {
      btn.addEventListener('click', () => openCoachEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.btn-delete-coach').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('حذف هذا الكابتن؟')) { deleteCoach(btn.dataset.id); renderContent(); }
      });
    });
    document.getElementById('print-coaches')?.addEventListener('click', () => printContentArea());
    const exp = document.getElementById('export-coaches');
    if (exp) exp.addEventListener('click', exportCoachesToExcel);
  }

  function printContentArea() {
    const area = document.getElementById('content-area');
    if (!area) return;
    const prevBg = document.body.style.background;
    const prevContent = document.body.innerHTML;
    document.body.style.background = '#fff';
    const printWindow = window.open('', '_blank');
    printWindow.document.write('<html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>نادي لشبونة</title><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:Tajawal,sans-serif;padding:20px;direction:rtl;} table{width:100%;border-collapse:collapse;} th,td{text-align:right;padding:8px;border:1px solid #ddd;}</style></head><body>' + area.innerHTML + '</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    document.body.style.background = prevBg;
  }

  function openCoachEditModal(id) {
    const list = getCoaches();
    const c = list.find(x => x.id === id);
    if (!c) return;
    const user = getCurrentUser();
    const showMoney = user ? canViewFinancial(user.role) : false;
    const modal = document.createElement('div');
    modal.className = 'overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">تعديل كابتن</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="edit-coach-form">
            <div class="form-group"><label>الاسم</label><input type="text" name="name" value="${escapeAttr(c.name)}" required></div>
            <div class="form-group"><label>الهاتف</label><input type="text" name="phone" value="${escapeAttr(c.phone)}"></div>
            <div class="form-row">
              <div class="form-group"><label>يوم القبض (من الشهر)</label><input type="number" name="payday" value="${c.payday || ''}" min="1" max="31" placeholder="مثال: 15"></div>
              <div class="form-group">
                <label>الفرع</label>
                <select name="branch" required>
                  <option value="القاهرة" ${c.branch === 'القاهرة' ? 'selected' : ''}>القاهرة</option>
                  <option value="الجيزة" ${c.branch === 'الجيزة' ? 'selected' : ''}>الجيزة</option>
                  <option value="سوهاج" ${c.branch === 'سوهاج' ? 'selected' : ''}>سوهاج</option>
                  <option value="الأقصر" ${c.branch === 'الأقصر' ? 'selected' : ''}>الأقصر</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>بداية التعاقد</label><input type="date" name="contractStart" value="${c.contractStart || ''}"></div>
              <div class="form-group"><label>انتهاء التعاقد</label><input type="date" name="contractEnd" value="${c.contractEnd || ''}"></div>
            </div>
            ${showMoney ? `
            <div class="form-row">
              <div class="form-group"><label>الراتب</label><input type="number" name="salary" value="${c.salary}" min="0" step="0.01"></div>
              <div class="form-group"><label>المدفوع</label><input type="number" name="paid" value="${c.paid}" min="0" step="0.01"></div>
            </div>
            ` : `
            <input type="hidden" name="salary" value="${c.salary}">
            <input type="hidden" name="paid" value="${c.paid}">
            `}
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
              <button type="button" class="btn btn-outline btn-cancel-edit">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#edit-coach-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      updateCoach(c.id, Object.fromEntries(fd.entries()));
      modal.remove();
      renderContent();
    });
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-cancel-edit').addEventListener('click', () => modal.remove());
  }

  function renderAddEmployeeForm(role) {
    return `
      <div class="card">
        <h3 class="card-title">إضافة موظف</h3>
        <form id="form-employee">
          <div class="form-row">
            <div class="form-group"><label>الاسم</label><input type="text" name="name" required></div>
            <div class="form-group"><label>رقم الهاتف</label><input type="text" name="phone" inputmode="tel"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>يوم القبض (من الشهر)</label><input type="number" name="payday" min="1" max="31" placeholder="مثال: 15" required></div>
            <div class="form-group">
              <label>الفرع</label>
              <select name="branch" required>
                <option value="القاهرة">القاهرة</option>
                <option value="الجيزة">الجيزة</option>
                <option value="سوهاج">سوهاج</option>
                <option value="الأقصر">الأقصر</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>الراتب</label><input type="number" name="salary" min="0" step="0.01" value="0"></div>
            <div class="form-group"><label>المدفوع</label><input type="number" name="paid" min="0" step="0.01" value="0"></div>
            <div class="form-group"><label>المتبقي</label><input type="text" class="readonly" readonly placeholder="يُحسب تلقائياً" id="employee-remaining"></div>
          </div>
          <button type="submit" class="btn btn-primary">إضافة الموظف</button>
        </form>
      </div>
    `;
  }

  function bindEmployeeForm() {
    const form = document.getElementById('form-employee');
    if (!form) return;
    const salary = form.querySelector('[name="salary"]');
    const paid = form.querySelector('[name="paid"]');
    const remaining = document.getElementById('employee-remaining');
    function updateRemaining() {
      if (!remaining) return;
      const s = salary ? (parseFloat(salary.value) || 0) : 0;
      const p = paid ? (parseFloat(paid.value) || 0) : 0;
      remaining.value = Math.max(0, s - p);
    }
    if (salary) salary.addEventListener('input', updateRemaining);
    if (paid) paid.addEventListener('input', updateRemaining);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      data.salary = fd.get('salary') || 0;
      data.paid = fd.get('paid') || 0;
      addEmployee(data);
      form.reset();
      updateRemaining();
      if (canAccess(ROUTES.EMPLOYEES_LIST)) navigateTo(ROUTES.EMPLOYEES_LIST);
    });
  }

  function renderEmployeesList(role, searchQ) {
    const canEdit = canEditEmployees(role);
    const users = getEmployees();
    const allFiltered = searchQ ? users.filter(e => (e.name || '').includes(searchQ) || (e.phone || '').includes(searchQ)) : users;
    const list = allFiltered.filter(e => e.branch === currentListBranch || (!e.branch && currentListBranch === 'القاهرة'));
    const canExport = canViewFinancial(role);

    let html = `<div class="branch-tabs" style="display:flex; gap:10px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center;">
      <button type="button" class="btn ${currentListBranch === 'القاهرة' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="القاهرة">القاهرة</button>
      <button type="button" class="btn ${currentListBranch === 'الجيزة' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="الجيزة">الجيزة</button>
      <button type="button" class="btn ${currentListBranch === 'سوهاج' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="سوهاج">سوهاج</button>
      <button type="button" class="btn ${currentListBranch === 'الأقصر' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="الأقصر">الأقصر</button>
    </div>`;

    html += '<div class="export-bar">';
    html += `<button type="button" class="btn btn-primary btn-sm" id="print-employees">طباعة</button>`;
    html += '</div>';
    html += `<div class="card printable-content"><h3 class="card-title">قائمة الموظفين - فرع ${currentListBranch}</h3><div class="table-wrap"><table class="data-table"><thead><tr>
      <th>الاسم</th><th>الهاتف</th><th>يوم القبض</th><th>الراتب</th><th>المدفوع</th><th>المتبقي</th>
      ${canEdit ? '<th>إجراءات</th>' : ''}
    </tr></thead><tbody>`;
    if (!list.length) html += '<tr><td colspan="' + (canEdit ? 7 : 6) + '">لا يوجد موظفين</td></tr>';
    else list.forEach(e => {
      html += `<tr data-id="${e.id}">
        <td>${e.name || '—'}</td><td>${e.phone || '—'}</td>
        <td>${e.payday ? 'كل ' + getPaydayDayNumber(e.payday) + ' من الشهر' : '—'}</td>
        <td>${e.salary}</td><td>${e.paid}</td><td>${e.remaining}</td>
        ${canEdit ? `<td><button type="button" class="btn btn-sm btn-edit-employee" data-id="${e.id}">تعديل</button> <button type="button" class="btn btn-sm btn-danger btn-delete-employee" data-id="${e.id}">حذف</button></td>` : ''}
      </tr>`;
    });
    html += '</tbody></table></div></div>';
    return html;
  }

  function bindEmployeesList(role) {
    document.querySelectorAll('.btn-branch-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        currentListBranch = btn.dataset.branch;
        renderContent();
      });
    });

    document.querySelectorAll('.btn-edit-employee').forEach(btn => {
      btn.addEventListener('click', () => openEmployeeEditModal(btn.dataset.id));
    });
    document.querySelectorAll('.btn-delete-employee').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('حذف هذا الموظف؟')) { deleteEmployee(btn.dataset.id); renderContent(); }
      });
    });
    document.getElementById('print-employees')?.addEventListener('click', () => printContentArea());
  }

  function openEmployeeEditModal(id) {
    const list = getEmployees();
    const e = list.find(x => x.id === id);
    if (!e) return;
    const modal = document.createElement('div');
    modal.className = 'overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">تعديل موظف</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="edit-employee-form">
            <div class="form-group"><label>الاسم</label><input type="text" name="name" value="${escapeAttr(e.name)}" required></div>
            <div class="form-group"><label>الهاتف</label><input type="text" name="phone" value="${escapeAttr(e.phone)}"></div>
            <div class="form-row">
              <div class="form-group"><label>يوم القبض (من الشهر)</label><input type="number" name="payday" value="${e.payday || ''}" min="1" max="31" placeholder="مثال: 15" required></div>
              <div class="form-group">
                <label>الفرع</label>
                <select name="branch" required>
                  <option value="القاهرة" ${e.branch === 'القاهرة' ? 'selected' : ''}>القاهرة</option>
                  <option value="الجيزة" ${e.branch === 'الجيزة' ? 'selected' : ''}>الجيزة</option>
                  <option value="سوهاج" ${e.branch === 'سوهاج' ? 'selected' : ''}>سوهاج</option>
                  <option value="الأقصر" ${e.branch === 'الأقصر' ? 'selected' : ''}>الأقصر</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>الراتب</label><input type="number" name="salary" value="${e.salary}" min="0" step="0.01"></div>
              <div class="form-group"><label>المدفوع</label><input type="number" name="paid" value="${e.paid}" min="0" step="0.01"></div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
              <button type="button" class="btn btn-outline btn-cancel-edit">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#edit-employee-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      updateEmployee(e.id, Object.fromEntries(fd.entries()));
      modal.remove();
      renderContent();
    });
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-cancel-edit').addEventListener('click', () => modal.remove());
  }

  function renderFinancialDashboard() {
    const sum = getFinancialSummary();
    const fullyPaidPlayers = getFullyPaidPlayers();
    const pendingPlayers = getPendingPaymentsPlayers();
    const fullyPaidCoaches = getFullyPaidCoaches();
    const fullyPaidEmployees = getFullyPaidEmployees();
    let html = `
      <div class="export-bar"><button type="button" class="btn btn-primary btn-sm" id="export-financial">تصدير ملخص مالي</button></div>
      <div class="stats-grid">
        <div class="stat-card success"><h4>إجمالي المدفوع للاعبين</h4><div class="value" data-value="${sum.totalPaidPlayers}">0</div></div>
        <div class="stat-card warning"><h4>إجمالي المتبقي للاعبين</h4><div class="value" data-value="${sum.totalRemainingPlayers}">0</div></div>
        <div class="stat-card"><h4>إجمالي المدفوع للكباتن</h4><div class="value" data-value="${sum.totalPaidCoaches}">0</div></div>
        <div class="stat-card"><h4>إجمالي المتبقي للكباتن</h4><div class="value" data-value="${sum.totalRemainingCoaches}">0</div></div>
        <div class="stat-card"><h4>إجمالي المدفوع للموظفين</h4><div class="value" data-value="${sum.totalPaidEmployees}">0</div></div>
        <div class="stat-card"><h4>إجمالي المتبقي للموظفين</h4><div class="value" data-value="${sum.totalRemainingEmployees}">0</div></div>
      </div>
      <div class="card">
        <h3 class="card-title">نظرة عامة</h3>
        <div class="chart-container"><canvas id="chart-pie"></canvas></div>
        <div class="chart-container"><canvas id="chart-bar"></canvas></div>
      </div>
      <div class="card">
        <h3 class="card-title">لاعبون مكتمل دفعهم</h3>
        ${fullyPaidPlayers.length ? '<ul>' + fullyPaidPlayers.map(p => `<li>${escapeHtml(p.fullName)} — ${p.contractValue}</li>`).join('') + '</ul>' : '<p class="empty-state">لا يوجد</p>'}
      </div>
      <div class="card">
        <h3 class="card-title">كباتن مكتمل دفعهم</h3>
        ${fullyPaidCoaches.length ? '<ul>' + fullyPaidCoaches.map(c => `<li>${escapeHtml(c.name)} — ${c.salary}</li>`).join('') + '</ul>' : '<p class="empty-state">لا يوجد</p>'}
      </div>
      <div class="card">
        <h3 class="card-title">موظفون مكتمل دفعهم</h3>
        ${fullyPaidEmployees.length ? '<ul>' + fullyPaidEmployees.map(e => `<li>${escapeHtml(e.name)} — ${e.salary}</li>`).join('') + '</ul>' : '<p class="empty-state">لا يوجد</p>'}
      </div>
      <div class="card">
        <h3 class="card-title">مدفوعات معلقة (لاعبين)</h3>
        ${pendingPlayers.length ? '<ul>' + pendingPlayers.map(p => `<li>${escapeHtml(p.fullName)} — متبقي: ${p.remaining}</li>`).join('') + '</ul>' : '<p class="empty-state">لا يوجد</p>'}
      </div>
    `;
    setTimeout(() => {
      contentArea.querySelectorAll('.stat-card .value[data-value]').forEach(el => {
        const v = parseInt(el.dataset.value, 10);
        if (typeof animateValue === 'function') animateValue(el, v);
      });
    }, 50);
    return html;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function renderUpcomingPayments() {
    let list = getUpcomingPayments();
    // Filter out those who have already confirmed this month
    list = list.filter(u => {
      // If payday hasn't been defined properly, keep them (or filter out depending on logic, but getUpcomingPayments handles this)
      if (!u.id) return false;
      const confirmed = isPaydayConfirmed(u.id);
      return !confirmed; // Only show unconfirmed!
    });

    const typeLabel = (t) => t === 'player' ? 'لاعب' : t === 'coach' ? 'كابتن' : 'موظف';
    let html = `<div class="card"><h3 class="card-title">المدفوعات القادمة (خلال ${SALARY_ALERT_DAYS} أيام)</h3>`;
    if (!list.length) {
      html += '<p class="empty-state">لا يوجد أشخاص مستحقين للدفع حالياً (أو تم تأكيد الدفع للجميع)</p>';
    } else {
      html += '<div class="table-wrap"><table class="data-table"><thead><tr><th>النوع</th><th>الاسم</th><th>يوم القبض</th><th>بعد (أيام)</th><th>تأكيد الدفع</th></tr></thead><tbody>';
      html += list.map(u => {
        const reached = u.daysUntil <= 0;
        const checkBtn = reached
          ? `<button type="button" class="btn-payday-check" data-id="${u.id}" title="تأكيد القبض" style="font-size:1.3rem;background:none;border:none;cursor:pointer;">⬜</button>`
          : `<span style="color:var(--text-muted);font-size:0.85rem;">—</span>`;
          
        return `<tr>
          <td>${typeLabel(u.type)}</td>
          <td>${escapeHtml(u.fullName || u.name)}</td>
          <td>كل ${u.paydayDay || getPaydayDayNumber(u.payday)} من الشهر</td>
          <td>${u.daysUntil === 0 ? 'اليوم' : u.daysUntil < 0 ? Math.abs(u.daysUntil) + ' مضى' : u.daysUntil}</td>
          <td style="text-align:center">${checkBtn}</td>
        </tr>`;
      }).join('');
      html += '</tbody></table></div>';
    }
    html += '</div>';
    return html;
  }

  function bindUpcomingPayments() {
    document.querySelectorAll('.btn-payday-check').forEach(btn => {
      btn.addEventListener('click', () => {
        // Toggle confirmation to true
        togglePaydayConfirmation(btn.dataset.id);
        // Re-render so the person disappears from the list
        renderContent();
      });
    });
  }

  function renderNotificationsPage(role, searchQ) {
    const list = getNotifications();
    const canDelete = canDeleteNotifications(role);
    let html = '<div class="card"><h3 class="card-title">الإشعارات</h3>';
    html += '<div class="export-bar"><button type="button" class="btn btn-primary btn-sm" id="export-notifications">تصدير Excel</button></div>';
    html += renderNotificationsList(list, searchQ, canDelete);
    html += '</div>';
    return html;
  }

  function bindNotificationsPage(role) {
    document.getElementById('export-notifications')?.addEventListener('click', exportNotificationsToExcel);
    const canDelete = canDeleteNotifications(role);
    if (!canDelete) return;
    document.querySelectorAll('.btn-delete-notif').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const list = getNotifications().filter(n => n.id !== id);
        setNotifications(list);
        renderContent();
      });
    });
  }

  function renderPasswordsPage() {
    const user = getCurrentUser();
    return `
      <div class="card">
        <h3 class="card-title">تغيير كلمة المرور الخاصة بي</h3>
        <p style="margin-bottom:1rem;color:var(--text-muted)">الحساب الحالي: ${escapeHtml(user.email)}</p>
        <form id="form-change-my-password">
          <div class="form-group"><label>كلمة المرور الحالية</label><input type="password" name="currentPassword" required></div>
          <div class="form-group"><label>كلمة المرور الجديدة</label><input type="password" name="newPassword" required minlength="4"></div>
          <div class="form-group"><label>تأكيد كلمة المرور الجديدة</label><input type="password" name="confirmPassword" required minlength="4"></div>
          <button type="submit" class="btn btn-primary">تغيير كلمة المرور</button>
        </form>
        <p id="password-my-msg" class="error-msg" style="display:none;margin-top:0.5rem"></p>
      </div>
    `;
  }

  function bindPasswordsPage() {
    const form = document.getElementById('form-change-my-password');
    const msgEl = document.getElementById('password-my-msg');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const current = form.querySelector('[name="currentPassword"]').value;
        const newP = form.querySelector('[name="newPassword"]').value;
        const confirmP = form.querySelector('[name="confirmPassword"]').value;
        
        if (newP !== confirmP) {
          if (msgEl) { msgEl.textContent = 'كلمة المرور الجديدة وتأكيدها غير متطابقتين'; msgEl.style.display = 'block'; }
          return;
        }
        
        const user = firebase.auth().currentUser;
        if (!user) {
          if (msgEl) { msgEl.textContent = 'المستخدم غير موجود'; msgEl.style.display = 'block'; }
          return;
        }

        try {
          // Re-authenticate user before changing password
          const cred = firebase.auth.EmailAuthProvider.credential(user.email, current);
          await user.reauthenticateWithCredential(cred);
          
          // Update password
          await user.updatePassword(newP);
          
          if (msgEl) { msgEl.style.display = 'none'; }
          form.reset();
          alert('تم تغيير كلمة المرور الخاصة بك بنجاح.');
        } catch (error) {
          console.error("Password change error:", error);
          if (msgEl) { 
            if(error.code === 'auth/wrong-password') msgEl.textContent = 'كلمة المرور الحالية غير صحيحة';
            else msgEl.textContent = 'حدث خطأ. حاول مرة أخرى أو تأكد من كلمة السر: ' + error.message; 
            msgEl.style.display = 'block'; 
          }
        }
      });
    }
  }

  function renderAccountsPage(searchQ) {
    const users = getUsers() || [];
    const filtered = searchQ ? filterUsers(searchQ).map(({ item }) => item) : users;
    let html = `
      <div class="card">
        <h3 class="card-title">إدارة الحسابات</h3>
        <button type="button" class="btn btn-primary" id="btn-create-account">إنشاء حساب</button>
        <div class="table-wrap" style="margin-top:1rem">
          <table class="data-table">
            <thead><tr><th>البريد</th><th>الاسم</th><th>الدور</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>
              ${filtered.map(u => `
                <tr>
                  <td>${escapeHtml(u.email)}</td>
                  <td>${escapeHtml(u.name || '—')}</td>
                  <td>${ROLE_LABELS[u.role] || u.role}</td>
                  <td>${u.enabled !== false ? 'مفعّل' : 'معطّل'}</td>
                  <td>
                  ${u.id !== getCurrentUser().id ? `
                    <button type="button" class="btn btn-sm ${u.enabled !== false ? 'btn-danger' : 'btn-primary'} btn-toggle-account" data-id="${u.id}">${u.enabled !== false ? 'تعطيل' : 'تفعيل'}</button>
                    <button type="button" class="btn btn-sm btn-danger btn-delete-account" data-id="${u.id}">حذف</button>
                  ` : '<span style="color:var(--text-muted);font-size:0.8rem">حسابي الحالي</span>'}
                </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    return html;
  }

  function bindAccountsPage() {
    document.getElementById('btn-create-account')?.addEventListener('click', openCreateAccountModal);
    document.querySelectorAll('.btn-toggle-account').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const users = getUsers();
        const u = users.find(x => x.id === id);
        if (!u || u.id === getCurrentUser().id) return;
        u.enabled = u.enabled === false;
        setUsers(users);
        logNotification(u.enabled ? 'account_enabled' : 'account_disabled', getCurrentUser().email, { targetEmail: u.email });
        renderContent();
      });
    });
    document.querySelectorAll('.btn-delete-account').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const users = getUsers();
        const u = users.find(x => x.id === id);
        if (!u || u.id === getCurrentUser().id) return;
        if (!confirm('حذف الحساب ' + u.email + '؟')) return;
        logNotification('account_deleted', getCurrentUser().email, { targetEmail: u.email });
        setUsers(users.filter(x => x.id !== id));
        renderContent();
      });
    });
  }

  async function openCreateAccountModal() {
    const modal = document.createElement('div');
    modal.className = 'overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">إنشاء حساب جديد</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-create-account">
            <div class="form-group"><label>البريد الإلكتروني</label><input type="email" name="email" required placeholder="example@lisbon.com"></div>
            <div class="form-group"><label>كلمة المرور</label><input type="password" name="password" required minlength="6"></div>
            <div class="form-group"><label>الاسم</label><input type="text" name="name" placeholder="اسم المستخدم"></div>
            <div class="form-group"><label>الدور</label><select name="role">
              <option value="${ROLES.SUPER_ADMIN}">${ROLE_LABELS[ROLES.SUPER_ADMIN]}</option>
              <option value="${ROLES.ADMIN}">${ROLE_LABELS[ROLES.ADMIN]}</option>
              <option value="${ROLES.WORKER}">${ROLE_LABELS[ROLES.WORKER]}</option>
            </select></div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">إنشاء الحساب الآن</button>
              <button type="button" class="btn btn-outline btn-cancel-create">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    const createForm = modal.querySelector('#form-create-account');
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const email = (fd.get('email') || '').trim().toLowerCase();
      const password = fd.get('password');
      const name = (fd.get('name') || '').trim();
      const role = fd.get('role');
      const users = getUsers() || [];
      
      if (users.some(u => u.email && u.email.toLowerCase() === email)) {
        alert('البريد الإلكتروني مستخدم مسبقاً');
        return;
      }

      // Show loading state
      const btn = createForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'جاري الإنشاء...';
      btn.disabled = true;

      try {
        // [FIX] Use a secondary Firebase app instance to create the user 
        // so that the primary Admin session is NOT swapped/logged out.
        const secondaryApp = firebase.initializeApp(firebaseConfig, 'secondary-' + Date.now());
        const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
        const firebaseUser = userCredential.user;

        // 2. Store additional user data (role, name) in Firestore using the PRIMARY app (Admin)
        const newUser = {
          id: firebaseUser.uid, 
          email: email.toLowerCase(),
          role,
          name: name || email,
          enabled: true,
          createdAt: new Date().toISOString()
        };
        
        await firebase.firestore().collection('users').doc(firebaseUser.uid).set(newUser);
        
        // Clean up secondary app
        await secondaryApp.delete();
        
        users.push(newUser);
        setUsers(users);
        
        logNotification('account_created', getCurrentUser().email, { targetEmail: email, role });
        modal.remove();
        renderContent();
      } catch (error) {
        console.error("Account creation error:", error);
        alert('فشل في إنشاء الحساب: ' + error.message);
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
    
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.btn-cancel-create').addEventListener('click', () => modal.remove());
  }

  function renderBackupPage() {
    return `
      <div class="card">
        <h3 class="card-title">نسخ احتياطي</h3>
        <p>تصدير جميع البيانات (لاعبين، كباتن، حسابات، إشعارات) كملف JSON.</p>
        <button type="button" class="btn btn-primary" id="btn-export-backup">تصدير النسخة الاحتياطية</button>
        <hr style="margin:1.5rem 0">
        <p>استيراد من ملف نسخ احتياطي (سيستبدل البيانات الحالية):</p>
        <input type="file" id="backup-file" accept=".json" style="margin-top:0.5rem">
        <button type="button" class="btn btn-primary" id="btn-import-backup" style="margin-top:0.5rem">استيراد</button>
      </div>
    `;
  }

  function bindBackupPage() {
    document.getElementById('btn-export-backup')?.addEventListener('click', () => {
      const data = exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ahfc_backup_' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });
    document.getElementById('btn-import-backup')?.addEventListener('click', () => {
      const input = document.getElementById('backup-file');
      if (!input || !input.files.length) { alert('اختر ملفاً'); return; }
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const data = JSON.parse(fr.result);
          importBackup(data, true);
          alert('تم الاستيراد');
          renderContent();
        } catch (e) {
          alert('ملف غير صالح');
        }
      };
      fr.readAsText(input.files[0]);
    });
  }

  function renderAttendancePage() {
    if (!attendanceCurrentBranch) {
      return `
        <div class="card">
          <h3 class="card-title">اختر الفرع</h3>
          <div style="display:flex; gap:15px; justify-content:center; flex-wrap:wrap; margin-top:20px;">
            <button type="button" class="btn btn-primary btn-attendance-branch" data-branch="القاهرة" style="padding:20px 40px; font-size:1.2rem;">القاهرة</button>
            <button type="button" class="btn btn-primary btn-attendance-branch" data-branch="الجيزة" style="padding:20px 40px; font-size:1.2rem;">الجيزة</button>
            <button type="button" class="btn btn-primary btn-attendance-branch" data-branch="سوهاج" style="padding:20px 40px; font-size:1.2rem;">سوهاج</button>
            <button type="button" class="btn btn-primary btn-attendance-branch" data-branch="الأقصر" style="padding:20px 40px; font-size:1.2rem;">الأقصر</button>
          </div>
        </div>
      `;
    }

    if (!attendanceCurrentRole) {
      return `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 class="card-title">فرع ${attendanceCurrentBranch} - اختر الفئة</h3>
            <button class="btn btn-outline btn-sm" id="btn-attendance-back-branch">رجوع</button>
          </div>
          <div style="display:flex; gap:15px; justify-content:center; flex-wrap:wrap; margin-top:20px;">
            <button type="button" class="btn btn-primary btn-attendance-role" data-role="coaches" style="padding:20px 40px; font-size:1.2rem;">الكباتن</button>
            <button type="button" class="btn btn-primary btn-attendance-role" data-role="employees" style="padding:20px 40px; font-size:1.2rem;">الموظفين</button>
          </div>
        </div>
      `;
    }

    let list = [];
    if (attendanceCurrentRole === 'coaches') {
      list = getCoaches().filter(c => c.branch === attendanceCurrentBranch || (!c.branch && attendanceCurrentBranch === 'القاهرة'));
    } else {
      list = getEmployees().filter(e => e.branch === attendanceCurrentBranch || (!e.branch && attendanceCurrentBranch === 'القاهرة'));
    }

    const records = getAttendanceRecords().filter(r => r.date === attendanceDate);

    let html = `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px;">
          <h3 class="card-title">الحضور والانصراف - فرع ${attendanceCurrentBranch} - ${attendanceCurrentRole === 'coaches' ? 'الكباتن' : 'الموظفين'}</h3>
          <div style="display:flex; align-items:center; gap:10px;">
            <input type="date" id="attendance-date-input" value="${attendanceDate}" style="padding: 5px; border-radius: 5px; border: 1px solid #ccc; font-family:inherit;">
            <button class="btn btn-outline btn-sm" id="btn-attendance-back-role">رجوع</button>
          </div>
        </div>
        <div class="table-wrap" style="margin-top:20px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>وقت الحضور</th>
                <th>وقت الانصراف</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (!list.length) {
      html += '<tr><td colspan="4">لا يوجد أشخاص في هذا الفرع والتصنيف</td></tr>';
    } else {
      list.forEach(p => {
        const record = records.find(r => r.personId === p.id);
        const checkInTime = record && record.checkIn ? new Date(record.checkIn).toLocaleTimeString('ar-EG') : '—';
        const checkOutTime = record && record.checkOut ? new Date(record.checkOut).toLocaleTimeString('ar-EG') : '—';
        
        let actions = '';
        if (!record || !record.checkIn) {
          actions = `<button class="btn btn-sm btn-primary btn-check-in" data-id="${p.id}">تسجيل حضور</button>`;
        } else if (!record.checkOut) {
          actions = `<button class="btn btn-sm btn-danger btn-check-out" data-id="${p.id}">تسجيل انصراف</button>`;
        } else {
          actions = `<span style="color:var(--text-muted)">مكتمل</span>`;
        }

        html += `<tr>
          <td>${escapeHtml(p.fullName || p.name || '—')}</td>
          <td style="color:#2e7d32; font-weight:bold;">${checkInTime}</td>
          <td style="color:#c62828; font-weight:bold;">${checkOutTime}</td>
          <td>${actions}</td>
        </tr>`;
      });
    }
    
    html += '</tbody></table></div></div>';
    return html;
  }

  function bindAttendancePage() {
    document.querySelectorAll('.btn-attendance-branch').forEach(btn => {
      btn.addEventListener('click', () => {
        attendanceCurrentBranch = btn.dataset.branch;
        renderContent();
      });
    });

    const backBranch = document.getElementById('btn-attendance-back-branch');
    if (backBranch) backBranch.addEventListener('click', () => {
      attendanceCurrentBranch = null;
      renderContent();
    });

    document.querySelectorAll('.btn-attendance-role').forEach(btn => {
      btn.addEventListener('click', () => {
        attendanceCurrentRole = btn.dataset.role;
        renderContent();
      });
    });

    const backRole = document.getElementById('btn-attendance-back-role');
    if (backRole) backRole.addEventListener('click', () => {
      attendanceCurrentRole = null;
      renderContent();
    });

    const dateInput = document.getElementById('attendance-date-input');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        attendanceDate = e.target.value || new Date().toISOString().split('T')[0];
        renderContent();
      });
    }

    document.querySelectorAll('.btn-check-in').forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.dataset.id;
        addAttendanceRecord({
          id: pId + '_' + attendanceDate,
          personId: pId,
          date: attendanceDate,
          checkIn: new Date().toISOString(),
          checkOut: null
        });
        renderContent();
      });
    });

    document.querySelectorAll('.btn-check-out').forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.dataset.id;
        const records = getAttendanceRecords();
        const r = records.find(x => x.personId === pId && x.date === attendanceDate);
        if (r) {
          r.checkOut = new Date().toISOString();
          setAttendanceRecords(records);
        }
        renderContent();
      });
    });
  }

  function showApp() {
    loginScreen.style.display = 'none';
    appShell.style.display = 'flex';
    const user = getCurrentUser();
    // Show role label + employee type badge
    const roleLabel = ROLE_LABELS[user.role] || user.role;
    userBadge.textContent = roleLabel;
    // Add a clear 'موظف' label under the sidebar header for workers
    const existingType = document.getElementById('user-type-label');
    if (existingType) existingType.remove();
    const typeLabel = document.createElement('div');
    typeLabel.id = 'user-type-label';
    typeLabel.textContent = (user.role === ROLES.WORKER) ? '👤 موظف' : (user.role === ROLES.ADMIN ? '🔑 إدارة' : '⚙️ مسؤول');
    typeLabel.style.cssText = 'font-size:0.85rem; padding:4px 12px; border-radius:20px; background:rgba(79, 142, 247, 0.15); color:var(--accent,#4f8ef7); border:1px solid rgba(79, 142, 247, 0.3);';
    const badgesContainer = document.getElementById('badges-container') || document.querySelector('.sidebar-header');
    if (badgesContainer) badgesContainer.appendChild(typeLabel);
    buildSidebar();
    const allowed = ROLE_ROUTES[user.role] || [];
    const firstRoute = allowed[0];
    const hashRoute = getRouteFromHash();
    const initialRoute = (hashRoute && canAccess(hashRoute)) ? hashRoute : firstRoute;
    currentRoute = initialRoute;
    try { location.hash = initialRoute; } catch (e) {}
    pageTitle.textContent = ROUTE_LABELS[initialRoute];
    renderContent();
    updateSidebarActive();
  }

  function showLogin() {
    appShell.style.display = 'none';
    loginScreen.style.display = 'flex';
    loginError.style.display = 'none';
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const roleInput = document.querySelector('input[name="login-role"]:checked');
    const roleFilter = roleInput ? roleInput.value : null;
    const roleMap = { worker: ROLES.WORKER, admin: ROLES.ADMIN };
    const filter = roleMap[roleFilter];
    const result = await login(email, password, filter);
    if (result.ok) {
      logNotification('login', result.user.email, { role: result.user.role });
      showApp();
    } else {
      loginError.textContent = result.message;
      loginError.style.display = 'block';
    }
  });

  btnLogout.addEventListener('click', () => {
    logout();
    showLogin();
  });

  accessDeniedClose.addEventListener('click', hideAccessDenied);

  themeToggle.addEventListener('click', () => {
    const theme = getTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
  });

  globalSearch.addEventListener('input', () => {
    renderContent();
  });

  const globalPrintBtn = document.getElementById('global-print');
  if (globalPrintBtn) {
    globalPrintBtn.addEventListener('click', () => {
      if (typeof printContentArea === 'function') printContentArea();
    });
  }

  const globalExportBtn = document.getElementById('global-export-excel');
  if (globalExportBtn) {
    globalExportBtn.addEventListener('click', () => {
      if (currentRoute === ROUTES.PLAYERS_LIST && typeof exportPlayersToExcel === 'function') exportPlayersToExcel();
      else if (currentRoute === ROUTES.COACHES_LIST && typeof exportCoachesToExcel === 'function') exportCoachesToExcel();
      else if (currentRoute === ROUTES.EMPLOYEES_LIST && typeof exportEmployeesToExcel === 'function') exportEmployeesToExcel();
      else if (currentRoute === ROUTES.FINANCIAL && typeof exportFinancialSummaryToExcel === 'function') exportFinancialSummaryToExcel();
      else if (currentRoute === ROUTES.NOTIFICATIONS && typeof exportNotificationsToExcel === 'function') exportNotificationsToExcel();
      else if (currentRoute === ROUTES.ATTENDANCE && typeof exportAttendanceToExcel === 'function') exportAttendanceToExcel();
      else alert('عذراً، التصدير غير متاح لهذه الصفحة أو قيد التطوير.');
    });
  }

  window.addEventListener('hashchange', () => {
    if (!isSessionValid()) return;
    const route = getRouteFromHash();
    if (route) navigateTo(route);
  });

  // ── Show loading spinner while Firebase loads ──
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'firebase-loading';
  loadingDiv.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg,#f5f7fa);z-index:9999;font-family:Tajawal,sans-serif;font-size:1.2rem;color:#0d47a1;gap:1rem;';
  loadingDiv.innerHTML = '<div style="width:48px;height:48px;border:5px solid #e3f2fd;border-top-color:#0d47a1;border-radius:50%;animation:spin 0.8s linear infinite"></div><span>جاري تحميل البيانات...</span>';
  const spinStyle = document.createElement('style');
  spinStyle.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(spinStyle);
  document.body.appendChild(loadingDiv);

  // ── Firebase Auth State Listener ──
  firebase.auth().onAuthStateChanged((firebaseUser) => {
    if (firebaseUser && isSessionValid()) {
      // User is logged in AND has a active app session
      initDB().then(() => {
        if (loadingDiv.parentNode) loadingDiv.remove();
        initTheme();
        showApp();
        const hashRoute = getRouteFromHash();
        if (hashRoute && canAccess(hashRoute)) {
            currentRoute = hashRoute;
            pageTitle.textContent = ROUTE_LABELS[hashRoute] || hashRoute;
            renderContent();
            updateSidebarActive();
        }
      }).catch(err => {
        console.error('initDB failed:', err);
        loadingDiv.innerHTML = '<span style="color:#c62828">⚠️ خطأ في تحميل البيانات. تأكد من اتصال الإنترنت أو الصلاحيات.</span>';
      });
    } else {
      // No active session or not logged in - Always show login
      if (loadingDiv.parentNode) loadingDiv.remove();
      initTheme();
      
      // We don't sign out automatically here to avoid loops, 
      // but we ensure the login screen is visible.
      showLogin();

      if (typeof initSeedData === 'function') initSeedData();
    }
  });

  setInterval(() => {
    if (!firebase.auth().currentUser && appShell.style.display === 'flex') {
      showLogin();
    }
  }, 60000);
})();
