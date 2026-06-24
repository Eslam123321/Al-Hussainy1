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
  let dashboardBranchFilter = 'all';
  let playersPaymentFilter = 'all';

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

  const ROUTE_ICONS = {
    [ROUTES.DASHBOARD]:        '📊',
    [ROUTES.ADD_PLAYER]:       '⚽',
    [ROUTES.ADD_COACH]:        '🏋️',
    [ROUTES.ADD_EMPLOYEE]:     '👤',
    [ROUTES.PLAYERS_LIST]:     '📋',
    [ROUTES.COACHES_LIST]:     '🎽',
    [ROUTES.EMPLOYEES_LIST]:   '🗂️',
    [ROUTES.FINANCIAL]:        '💰',
    [ROUTES.UPCOMING_PAYMENTS]:'📅',
    [ROUTES.NOTIFICATIONS]:    '🔔',
    [ROUTES.ACCOUNTS]:         '🔑',
    [ROUTES.PASSWORDS]:        '🔒',
    [ROUTES.ATTENDANCE]:       '✅',
    [ROUTES.BACKUP]:           '💾',
    [ROUTES.EXPENSES]:         '💸',
    [ROUTES.CLUB_PAYMENTS]:    '🏢',
  };

  function buildSidebar() {
    const user = getCurrentUser();
    if (!user) return;
    const allowed = ROLE_ROUTES[user.role] || [];
    let html = '';
    allowed.forEach(r => {
      const label = ROUTE_LABELS[r];
      const icon  = ROUTE_ICONS[r] || '•';
      html += `<a href="#" data-route="${r}"><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span></a>`;
    });
    sidebarNav.innerHTML = html;
    sidebarNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(a.dataset.route);
        // Close any open mobile scroll snapping
        sidebarNav.scrollTo({ left: a.offsetLeft - 20, behavior: 'smooth' });
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
        if (typeof renderFinancialCharts === 'function') setTimeout(() => renderFinancialCharts(dashboardBranchFilter), 100);
        bindUpcomingPayments(); // Added this line
        bindDashboardFilter(role);
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
        if (typeof renderFinancialCharts === 'function') setTimeout(() => renderFinancialCharts(dashboardBranchFilter), 100);
        document.getElementById('export-financial')?.addEventListener('click', exportFinancialSummaryToExcel);
        bindDashboardFilter(role);
        bindFinancialResetActions();
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
      case ROUTES.EXPENSES:
        contentArea.innerHTML = renderExpensesPage();
        bindExpensesPage();
        break;
      case ROUTES.CLUB_PAYMENTS:
        contentArea.innerHTML = renderClubPaymentsPage();
        bindClubPaymentsPage();
        break;
      default:
        contentArea.innerHTML = '<div class="empty-state"><h2>الصفحة غير موجودة</h2></div>';
        break;
    }
  }

  // Expose renderContent globally so real-time Firebase listeners can update the UI
  window.triggerGlobalRender = renderContent;

  function renderBranchBreakdown(breakdownObj) {
    const branches = ['القاهرة', 'الجيزة', 'سوهاج', 'الأقصر'];
    return `
      <div class="branch-breakdown">
        ${branches.map(b => `
          <span class="branch-item">
            <span class="branch-name">${b}:</span>
            <span class="branch-val">${(breakdownObj[b] || 0).toLocaleString('ar-SA')}</span>
          </span>
        `).join('')}
      </div>
    `;
  }

  function bindDashboardFilter(role) {
    const filterSelect = document.getElementById('branch-dashboard-filter');
    if (filterSelect) {
      filterSelect.value = dashboardBranchFilter;
      filterSelect.addEventListener('change', (e) => {
        dashboardBranchFilter = e.target.value;
        renderContent();
      });
    }
  }

  function renderDashboard(role) {
    if (!canViewFinancial(role)) {
      return '<div class="card"><p>مرحباً. استخدم القائمة لإضافة لاعب أو كابتن.</p></div>';
    }
    const sum = getFinancialSummary(dashboardBranchFilter);
    const upcoming = getUpcomingPayments().slice(0, 5);
    let html = `
      <div class="stats-grid">
        <div class="stat-card success animate-in">
          <h4>إجمالي المدفوع للاعبين</h4>
          <div class="value" data-value="${sum.totalPaidPlayers}">0</div>
          ${renderBranchBreakdown(sum.breakdown.totalPaidPlayers)}
        </div>
        <div class="stat-card warning animate-in">
          <h4>إجمالي المتبقي للاعبين</h4>
          <div class="value" data-value="${sum.totalRemainingPlayers}">0</div>
          ${renderBranchBreakdown(sum.breakdown.totalRemainingPlayers)}
        </div>
        <div class="stat-card animate-in">
          <h4>مدفوع الكباتن</h4>
          <div class="value" data-value="${sum.totalPaidCoaches}">0</div>
          ${renderBranchBreakdown(sum.breakdown.totalPaidCoaches)}
        </div>
        <div class="stat-card animate-in">
          <h4>متبقي الكباتن</h4>
          <div class="value" data-value="${sum.totalRemainingCoaches}">0</div>
          ${renderBranchBreakdown(sum.breakdown.totalRemainingCoaches)}
        </div>
        <div class="stat-card animate-in">
          <h4>مدفوع الموظفين</h4>
          <div class="value" data-value="${sum.totalPaidEmployees}">0</div>
          ${renderBranchBreakdown(sum.breakdown.totalPaidEmployees)}
        </div>
        <div class="stat-card animate-in">
          <h4>متبقي الموظفين</h4>
          <div class="value" data-value="${sum.totalRemainingEmployees}">0</div>
          ${renderBranchBreakdown(sum.breakdown.totalRemainingEmployees)}
        </div>
      </div>
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:0.75rem; margin-bottom:1rem; flex-wrap:wrap; gap:10px;">
          <h3 style="margin:0; font-size:1.15rem; font-weight:700;">نظرة عامة</h3>
          <select id="branch-dashboard-filter" class="form-control" style="width:160px; padding:5px 10px; border-radius:6px; border:1px solid var(--border); font-family:inherit; font-size:0.9rem; background:var(--bg-card); color:var(--text); cursor:pointer;">
            <option value="all">كل الفروع</option>
            <option value="القاهرة">القاهرة</option>
            <option value="الجيزة">الجيزة</option>
            <option value="سوهاج">سوهاج</option>
            <option value="الأقصر">الأقصر</option>
          </select>
        </div>
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
    let list = allFiltered.filter(p => p.branch === currentListBranch || (!p.branch && currentListBranch === 'القاهرة'));
    const canExport = canViewFinancial(role);

    // Apply financial filter (cash / installment)
    if (playersPaymentFilter === 'cash') {
      list = list.filter(p => (Number(p.remaining) || 0) <= 0);
    } else if (playersPaymentFilter === 'installment') {
      list = list.filter(p => (Number(p.remaining) || 0) > 0);
    }

    let html = `<div class="branch-tabs" style="display:flex; gap:10px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center;">
      <button type="button" class="btn ${currentListBranch === 'القاهرة' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="القاهرة">القاهرة</button>
      <button type="button" class="btn ${currentListBranch === 'الجيزة' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="الجيزة">الجيزة</button>
      <button type="button" class="btn ${currentListBranch === 'سوهاج' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="سوهاج">سوهاج</button>
      <button type="button" class="btn ${currentListBranch === 'الأقصر' ? 'btn-primary' : 'btn-outline'} btn-branch-tab" data-branch="الأقصر">الأقصر</button>
    </div>`;

    html += '<div class="export-bar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:1.5rem;">';
    html += '<div style="display:flex; gap:8px;">';
    html += `<button type="button" class="btn btn-primary btn-sm" id="print-players">طباعة</button>`;
    if (canExport) html += `<button type="button" class="btn btn-primary btn-sm" id="export-players">تصدير Excel</button>`;
    html += '</div>';
    html += '<div style="display:flex; gap:8px;">';
    html += `<button type="button" class="btn btn-sm ${playersPaymentFilter === 'all' ? 'btn-primary' : 'btn-outline'} btn-payment-filter" data-filter="all">الكل</button>`;
    html += `<button type="button" class="btn btn-sm ${playersPaymentFilter === 'cash' ? 'btn-primary' : 'btn-outline'} btn-payment-filter" data-filter="cash">كاش</button>`;
    html += `<button type="button" class="btn btn-sm ${playersPaymentFilter === 'installment' ? 'btn-primary' : 'btn-outline'} btn-payment-filter" data-filter="installment">قسط</button>`;
    html += '</div>';
    html += '</div>';

    html += `<div class="card printable-content"><h3 class="card-title">قائمة اللاعبين - فرع ${currentListBranch}</h3>
    <div class="count-box">إجمالي السجلات: <span class="count-badge">${list.length}</span></div>
    <div class="table-wrap"><table class="data-table"><thead><tr>
      <th style="width: 50px;">م</th><th>الاسم</th><th>الهاتف</th><th>تاريخ الميلاد</th><th>بداية التعاقد</th><th>انتهاء التعاقد</th><th>قيمة العقد</th><th>المدفوع</th><th>المتبقي</th><th>المركز</th>
      ${canEdit ? '<th>إجراءات</th>' : ''}
    </tr></thead><tbody>`;
    if (!list.length) html += '<tr><td colspan="' + (canEdit ? 11 : 10) + '">لا يوجد لاعبين</td></tr>';
    else list.forEach((p, idx) => {
      html += `<tr data-id="${p.id}">
        <td>${idx + 1}</td>
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

    document.querySelectorAll('.btn-payment-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        playersPaymentFilter = btn.dataset.filter;
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
    openModal(modal);
    modal.querySelector('#edit-player-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      updatePlayer(p.id, Object.fromEntries(fd.entries()));
      closeModal(modal);
      renderContent();
    });
    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
    modal.querySelector('.btn-cancel-edit').addEventListener('click', () => closeModal(modal));
  }

  function escapeAttr(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Open a modal element and lock body scroll on mobile */
  function openModal(el) {
    document.body.appendChild(el);
    document.body.classList.add('modal-open');
    // Allow tapping backdrop to close
    el.addEventListener('click', (e) => {
      if (e.target === el) closeModal(el);
    });
  }

  /** Close a modal element and restore body scroll */
  function closeModal(el) {
    el.remove();
    // Only release lock if no other modals open
    if (!document.querySelector('.overlay')) {
      document.body.classList.remove('modal-open');
    }
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
    html += `<div class="card printable-content"><h3 class="card-title">قائمة الكباتن - فرع ${currentListBranch}</h3>
    <div class="count-box">إجمالي السجلات: <span class="count-badge">${list.length}</span></div>
    <div class="table-wrap"><table class="data-table"><thead><tr>
      <th style="width: 50px;">م</th><th>الاسم</th><th>الهاتف</th><th>يوم القبض</th><th>بداية التعاقد</th><th>انتهاء التعاقد</th>
      ${showMoney ? '<th>الراتب</th><th>المدفوع</th><th>المتبقي</th>' : ''}
      ${canEdit ? '<th>إجراءات</th>' : ''}
    </tr></thead><tbody>`;
    let cols = 6;
    if (showMoney) cols += 3;
    if (canEdit) cols += 1;
    if (!list.length) html += '<tr><td colspan="' + cols + '">لا يوجد كباتن</td></tr>';
    else list.forEach((c, idx) => {
      html += `<tr data-id="${c.id}">
        <td>${idx + 1}</td>
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
    
    // Check if there is any selected row in the area
    const hasSelection = area.querySelector('.table-row-selected') !== null;
    
    const prevBg = document.body.style.background;
    document.body.style.background = '#fff';
    
    const printWindow = window.open('', '_blank');
    let extraStyle = '';
    let bodyClass = '';
    
    if (hasSelection) {
      bodyClass = 'class="has-selection"';
      extraStyle += `
        body.has-selection tbody tr:not(.table-row-selected) {
          display: none !important;
        }
      `;
    }
    
    extraStyle += `
      .export-bar, .branch-tabs, button, .btn, .count-box { display: none !important; }
      /* Hide column if it contains action buttons */
      th:last-child:has(button), td:last-child:has(button) { display: none !important; }
    `;
    
    printWindow.document.write(`<html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>نادي لشبونة</title><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:Tajawal,sans-serif;padding:20px;direction:rtl;} table{width:100%;border-collapse:collapse;} th,td{text-align:right;padding:8px;border:1px solid #ddd;} ${extraStyle}</style></head><body ${bodyClass}>` + area.innerHTML + '</body></html>');
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
              <div class="form-group"><label>يوم القبض (من الشهر)</label><input type="number" name="payday" value="${getPaydayDayNumber(c.payday) || ''}" min="1" max="31" placeholder="مثال: 15"></div>
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
    openModal(modal);
    modal.querySelector('#edit-coach-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      updateCoach(c.id, Object.fromEntries(fd.entries()));
      closeModal(modal);
      renderContent();
    });
    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
    modal.querySelector('.btn-cancel-edit').addEventListener('click', () => closeModal(modal));
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
    html += `<div class="card printable-content"><h3 class="card-title">قائمة الموظفين - فرع ${currentListBranch}</h3>
    <div class="count-box">إجمالي السجلات: <span class="count-badge">${list.length}</span></div>
    <div class="table-wrap"><table class="data-table"><thead><tr>
      <th style="width: 50px;">م</th><th>الاسم</th><th>الهاتف</th><th>يوم القبض</th><th>الراتب</th><th>المدفوع</th><th>المتبقي</th>
      ${canEdit ? '<th>إجراءات</th>' : ''}
    </tr></thead><tbody>`;
    if (!list.length) html += '<tr><td colspan="' + (canEdit ? 8 : 7) + '">لا يوجد موظفين</td></tr>';
    else list.forEach((e, idx) => {
      html += `<tr data-id="${e.id}">
        <td>${idx + 1}</td>
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
              <div class="form-group"><label>يوم القبض (من الشهر)</label><input type="number" name="payday" value="${getPaydayDayNumber(e.payday) || ''}" min="1" max="31" placeholder="مثال: 15" required></div>
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
    openModal(modal);
    modal.querySelector('#edit-employee-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      updateEmployee(e.id, Object.fromEntries(fd.entries()));
      closeModal(modal);
      renderContent();
    });
    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
    modal.querySelector('.btn-cancel-edit').addEventListener('click', () => closeModal(modal));
  }

  function bindFinancialResetActions() {
    document.querySelectorAll('.btn-reset-coach-payment').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const coaches = getCoaches();
        const c = coaches.find(x => x.id === id);
        if (!c) return;
        if (confirm(`هل أنت متأكد من ترحيل الكابتن ${c.name} لموعد القبض القادم؟ سيتم تصفير المبلغ المدفوع له.`)) {
          c.paid = 0;
          c.remaining = c.salary;
          
          // Clear confirmation state for this month
          const confs = getPaydayConfirmations();
          const key = getPaydayKey(id);
          if (confs[key]) {
            delete confs[key];
            setPaydayConfirmations(confs);
          }
          
          setCoaches(coaches);
          renderContent();
        }
      });
    });

    document.querySelectorAll('.btn-reset-employee-payment').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const employees = getEmployees();
        const e = employees.find(x => x.id === id);
        if (!e) return;
        if (confirm(`هل أنت متأكد من ترحيل الموظف ${e.name} لموعد القبض القادم؟ سيتم تصفير المبلغ المدفوع له.`)) {
          e.paid = 0;
          e.remaining = e.salary;
          
          // Clear confirmation state for this month
          const confs = getPaydayConfirmations();
          const key = getPaydayKey(id);
          if (confs[key]) {
            delete confs[key];
            setPaydayConfirmations(confs);
          }
          
          setEmployees(employees);
          renderContent();
        }
      });
    });
  }

  function renderFinancialDashboard() {
    const sum = getFinancialSummary(dashboardBranchFilter);
    
    const activeBranch = dashboardBranchFilter;
    const filterByBranch = (item) => {
      if (!activeBranch || activeBranch === 'all') return true;
      return (item.branch || 'القاهرة') === activeBranch;
    };

    const fullyPaidPlayers = getFullyPaidPlayers().filter(filterByBranch);
    const fullyPaidCoaches = getFullyPaidCoaches().filter(filterByBranch);
    const fullyPaidEmployees = getFullyPaidEmployees().filter(filterByBranch);

    const sortedPaidPlayers = [...fullyPaidPlayers].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'ar'));
    const sortedPaidCoaches = [...fullyPaidCoaches].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    const sortedPaidEmployees = [...fullyPaidEmployees].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

    let html = `
      <div class="export-bar"><button type="button" class="btn btn-primary btn-sm" id="export-financial">تصدير ملخص مالي</button></div>
      <div class="stats-grid">
        <div class="stat-card success">
          <h4>إجمالي المدفوع للاعبين</h4>
          <div class="value" data-value="${sum.totalPaidPlayers}">0</div>
          ${renderBranchBreakdown(sum.breakdown.totalPaidPlayers)}
        </div>
        <div class="stat-card warning">
          <h4>إجمالي المتبقي للاعبين</h4>
          <div class="value" data-value="${sum.totalRemainingPlayers}">0</div>
          ${renderBranchBreakdown(sum.breakdown.totalRemainingPlayers)}
        </div>
        <div class="stat-card">
          <h4>إجمالي المدفوع للكباتن</h4>
          <div class="value" data-value="${sum.totalPaidCoaches}">0</div>
          ${renderBranchBreakdown(sum.breakdown.totalPaidCoaches)}
        </div>
        <div class="stat-card">
          <h4>إجمالي المتبقي للكباتن</h4>
          <div class="value" data-value="${sum.totalRemainingCoaches}">0</div>
          ${renderBranchBreakdown(sum.breakdown.totalRemainingCoaches)}
        </div>
        <div class="stat-card">
          <h4>إجمالي المدفوع للموظفين</h4>
          <div class="value" data-value="${sum.totalPaidEmployees}">0</div>
          ${renderBranchBreakdown(sum.breakdown.totalPaidEmployees)}
        </div>
        <div class="stat-card">
          <h4>إجمالي المتبقي للموظفين</h4>
          <div class="value" data-value="${sum.totalRemainingEmployees}">0</div>
          ${renderBranchBreakdown(sum.breakdown.totalRemainingEmployees)}
        </div>
      </div>
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:0.75rem; margin-bottom:1rem; flex-wrap:wrap; gap:10px;">
          <h3 style="margin:0; font-size:1.15rem; font-weight:700;">نظرة عامة</h3>
          <select id="branch-dashboard-filter" class="form-control" style="width:160px; padding:5px 10px; border-radius:6px; border:1px solid var(--border); font-family:inherit; font-size:0.9rem; background:var(--bg-card); color:var(--text); cursor:pointer;">
            <option value="all">كل الفروع</option>
            <option value="القاهرة">القاهرة</option>
            <option value="الجيزة">الجيزة</option>
            <option value="سوهاج">سوهاج</option>
            <option value="الأقصر">الأقصر</option>
          </select>
        </div>
        <div class="chart-container"><canvas id="chart-pie"></canvas></div>
        <div class="chart-container"><canvas id="chart-bar"></canvas></div>
      </div>
      <div class="card">
        <h3 class="card-title">لاعبون مكتمل دفعهم</h3>
        ${fullyPaidPlayers.length ? `
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 50px;">م</th>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>الفرع</th>
                  <th>المركز</th>
                  <th>قيمة العقد</th>
                  <th>المدفوع</th>
                </tr>
              </thead>
              <tbody>
                ${sortedPaidPlayers.map((p, idx) => `
                  <tr data-id="${p.id}">
                    <td>${idx + 1}</td>
                    <td>${escapeHtml(p.fullName || '—')}</td>
                    <td>${escapeHtml(p.phone || '—')}</td>
                    <td>${escapeHtml(p.branch || 'القاهرة')}</td>
                    <td>${getPositionLabel(p.position)}</td>
                    <td>${p.contractValue}</td>
                    <td>${p.paid}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="empty-state">لا يوجد</p>'}
      </div>
      <div class="card">
        <h3 class="card-title">كباتن مكتمل دفعهم</h3>
        ${fullyPaidCoaches.length ? `
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 50px;">م</th>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>الفرع</th>
                  <th>الراتب</th>
                  <th>يوم القبض</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                ${sortedPaidCoaches.map((c, idx) => `
                  <tr data-id="${c.id}">
                    <td>${idx + 1}</td>
                    <td>${escapeHtml(c.name || '—')}</td>
                    <td>${escapeHtml(c.phone || '—')}</td>
                    <td>${escapeHtml(c.branch || 'القاهرة')}</td>
                    <td>${c.salary}</td>
                    <td>كل ${getPaydayDayNumber(c.payday)} من الشهر</td>
                    <td>
                      <button type="button" class="btn btn-sm btn-success btn-reset-coach-payment" data-id="${c.id}" title="ترحيل لموعد القبض القادم">✔️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="empty-state">لا يوجد</p>'}
      </div>
      <div class="card">
        <h3 class="card-title">موظفون مكتمل دفعهم</h3>
        ${fullyPaidEmployees.length ? `
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 50px;">م</th>
                  <th>الاسم</th>
                  <th>الهاتف</th>
                  <th>الفرع</th>
                  <th>الراتب</th>
                  <th>يوم القبض</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                ${sortedPaidEmployees.map((e, idx) => `
                  <tr data-id="${e.id}">
                    <td>${idx + 1}</td>
                    <td>${escapeHtml(e.name || '—')}</td>
                    <td>${escapeHtml(e.phone || '—')}</td>
                    <td>${escapeHtml(e.branch || 'القاهرة')}</td>
                    <td>${e.salary}</td>
                    <td>كل ${getPaydayDayNumber(e.payday)} من الشهر</td>
                    <td>
                      <button type="button" class="btn btn-sm btn-success btn-reset-employee-payment" data-id="${e.id}" title="ترحيل لموعد القبض القادم">✔️</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="empty-state">لا يوجد</p>'}
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
    // Filter out players (and those with invalid IDs, just in case)
    const upcomingStaff = list.filter(u => (u.type === 'coach' || u.type === 'employee') && u.id);

    const branches = ['القاهرة', 'الجيزة', 'سوهاج', 'الأقصر'];
    const typeLabel = (t) => t === 'coach' ? 'كابتن' : 'موظف';

    let html = '';

    branches.forEach((branch, idx) => {
      const branchList = upcomingStaff.filter(u => (u.branch || 'القاهرة') === branch);
      const ordinalWords = ['الأول', 'الثاني', 'الثالث', 'الرابع'];
      const sectionName = `القسم ${ordinalWords[idx] || (idx + 1)}: المدفوعات القادمة - فرع ${branch} (خلال ${SALARY_ALERT_DAYS} أيام)`;

      html += `
        <div class="card animate-in">
          <h3 class="card-title">${sectionName}</h3>
      `;

      if (!branchList.length) {
        html += '<p class="empty-state">لا توجد مدفوعات قادمة لهذا الفرع خلال 7 أيام</p>';
      } else {
        html += `
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الوظيفة</th>
                  <th>المبلغ المستحق</th>
                  <th>تاريخ الاستحقاق</th>
                  <th style="text-align:center">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                ${branchList.map(u => {
                  const amountDue = u.remaining !== undefined ? u.remaining : (u.salary || 0);
                  return `
                    <tr data-id="${u.id}">
                      <td><strong>${escapeHtml(u.name || u.fullName)}</strong></td>
                      <td><span class="badge ${u.type === 'coach' ? 'badge-coach' : 'badge-employee'}">${typeLabel(u.type)}</span></td>
                      <td style="color: var(--warning); font-weight: bold;">${Number(amountDue).toLocaleString('ar-SA')} ج.م</td>
                      <td>${u.contractEnd || '—'}</td>
                      <td style="text-align:center">
                        <button type="button" class="btn btn-sm btn-success btn-payday-confirm" data-id="${u.id}" data-type="${u.type}">
                          تم صرف الراتب / الدفع
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
      html += '</div>';
    });

    return html;
  }

  function bindUpcomingPayments() {
    document.querySelectorAll('.btn-payday-confirm').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const type = btn.dataset.type;
        
        let name = '';
        if (type === 'coach') {
          const coaches = getCoaches();
          const coach = coaches.find(x => x.id === id);
          name = coach ? coach.name : '';
        } else if (type === 'employee') {
          const employees = getEmployees();
          const emp = employees.find(x => x.id === id);
          name = emp ? emp.name : '';
        }

        if (confirm(`تأكيد صرف الراتب / الدفع وتأجيله للشهر القادم لـ: ${name}؟`)) {
          if (type === 'coach') {
            const coaches = getCoaches();
            const idx = coaches.findIndex(c => c.id === id);
            if (idx !== -1) {
              const c = coaches[idx];
              c.paid = c.salary;
              c.remaining = 0;
              c.payday = addMonthToPayday(c.payday);
              setCoaches(coaches);
              if (typeof logNotification === 'function') {
                logNotification('coach_payment_confirm', null, { coachId: id, name: c.name, amount: c.salary });
              }
            }
          } else if (type === 'employee') {
            const employees = getEmployees();
            const idx = employees.findIndex(e => e.id === id);
            if (idx !== -1) {
              const e = employees[idx];
              e.paid = e.salary;
              e.remaining = 0;
              e.payday = addMonthToPayday(e.payday);
              setEmployees(employees);
              if (typeof logNotification === 'function') {
                logNotification('employee_payment_confirm', null, { employeeId: id, name: e.name, amount: e.salary });
              }
            }
          }
          // Re-render to show updated lists immediately
          renderContent();
        }
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

    // ── تعطيل / تفعيل حساب ──────────────────────────────────────────────
    document.querySelectorAll('.btn-toggle-account').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const users = getUsers();
        const u = users.find(x => x.id === id);
        if (!u || u.id === getCurrentUser().id) return;

        const newEnabled = (u.enabled === false); // قلب الحالة
        btn.disabled = true;

        try {
          // تحديث حقل enabled مباشرةً في Firestore باستخدام الـ UID كـ Document ID
          await _firestoreDB.collection('users').doc(id).update({ enabled: newEnabled });

          // تحديث الـ cache المحلي بعد نجاح السيرفر
          u.enabled = newEnabled;
          _cache.users = users;

          logNotification(
            newEnabled ? 'account_enabled' : 'account_disabled',
            getCurrentUser().email,
            { targetEmail: u.email }
          );
          renderContent();
        } catch (error) {
          console.error('[Toggle Account] Firestore error:', error);
          alert('فشل تعديل الحساب: ' + error.message);
          btn.disabled = false;
        }
      });
    });

    // ── حذف حساب ────────────────────────────────────────────────────────
    document.querySelectorAll('.btn-delete-account').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const users = getUsers();
        const u = users.find(x => x.id === id);
        if (!u || u.id === getCurrentUser().id) return;
        if (!confirm('حذف الحساب ' + u.email + '؟')) return;

        btn.disabled = true;
        btn.textContent = 'جاري الحذف...';

        try {
          // حذف الـ Document مباشرةً من Firestore باستخدام الـ UID
          await _firestoreDB.collection('users').doc(id).delete();

          // تحديث الـ cache المحلي بعد نجاح السيرفر فقط
          _cache.users = users.filter(x => x.id !== id);

          logNotification('account_deleted', getCurrentUser().email, { targetEmail: u.email });
          renderContent();
        } catch (error) {
          console.error('[Delete Account] Firestore error:', error);
          alert('فشل حذف الحساب: ' + error.message);
          btn.disabled = false;
          btn.textContent = 'حذف';
        }
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
    openModal(modal);
    
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
        closeModal(modal);
        renderContent();
      } catch (error) {
        console.error("Account creation error:", error);
        alert('فشل في إنشاء الحساب: ' + error.message);
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
    
    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
    modal.querySelector('.btn-cancel-create').addEventListener('click', () => closeModal(modal));
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

  function renderExpensesPage() {
    const list = getExpenses() || [];
    let html = `
      <div class="card animate-in">
        <h3 class="card-title">تسجيل مصاريف جديدة</h3>
        <form id="form-expense">
          <div class="form-row">
            <div class="form-group">
              <label>الاسم</label>
              <input type="text" name="name" required placeholder="اسم الشخص الذي أخذ المال">
            </div>
            <div class="form-group">
              <label>المبلغ المأخوذ (ج.م)</label>
              <input type="number" name="amount" min="0.01" step="0.01" required placeholder="المبلغ بالجنيه">
            </div>
            <div class="form-group">
              <label>المصرّح بأخذ المبلغ</label>
              <input type="text" name="authorizedBy" required placeholder="اسم المسؤول المصرّح">
            </div>
          </div>
          <div class="form-group">
            <label>سبب أخذ المال</label>
            <textarea name="reason" rows="3" required placeholder="تفاصيل وسبب الصرف..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary">إضافة مصروف</button>
        </form>
      </div>
      
      <div class="card printable-content animate-in">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:0.75rem; margin-bottom:1rem; flex-wrap:wrap; gap:10px;">
          <h3 style="margin:0; font-size:1.15rem; font-weight:700; border:none; padding:0;">جدول المصاريف</h3>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-primary btn-sm" id="print-expenses">طباعة</button>
            <button type="button" class="btn btn-primary btn-sm" id="export-expenses">تصدير Excel</button>
          </div>
        </div>
        <div class="count-box">إجمالي السجلات: <span class="count-badge" id="expenses-count-badge">${list.length}</span></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px;">م</th>
                <th>الاسم</th>
                <th>المبلغ</th>
                <th>المصرّح بالصرف</th>
                <th>سبب أخذ المال</th>
                <th>التاريخ</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody id="expenses-table-body">
    `;
    
    if (!list.length) {
      html += `<tr><td colspan="7" style="text-align:center;">لا توجد مصاريف مسجلة بعد</td></tr>`;
    } else {
      html += renderExpensesRows(list);
    }
    
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    return html;
  }

  function renderExpensesRows(list) {
    return list.map((e, idx) => {
      const at = e.createdAt ? new Date(e.createdAt) : new Date();
      const dateStr = at.toLocaleDateString('ar-EG');
      const timeStr = at.toLocaleTimeString('ar-EG');
      return `
        <tr data-id="${e.id}">
          <td>${idx + 1}</td>
          <td><strong>${escapeHtml(e.name)}</strong></td>
          <td style="color:var(--danger); font-weight:bold;">${Number(e.amount).toLocaleString('ar-SA')} ج.م</td>
          <td>${escapeHtml(e.authorizedBy)}</td>
          <td>${escapeHtml(e.reason)}</td>
          <td>${dateStr}</td>
          <td>${timeStr}</td>
        </tr>
      `;
    }).join('');
  }

  function bindExpensesPage() {
    const form = document.getElementById('form-expense');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = {
          name: fd.get('name').trim(),
          amount: parseFloat(fd.get('amount')) || 0,
          authorizedBy: fd.get('authorizedBy').trim(),
          reason: fd.get('reason').trim()
        };
        
        addExpense(data);
        form.reset();
        
        // Update table live without reloading page
        const tableBody = document.getElementById('expenses-table-body');
        const list = getExpenses();
        if (tableBody) {
          tableBody.innerHTML = renderExpensesRows(list);
        }
        
        const countBadge = document.getElementById('expenses-count-badge');
        if (countBadge) {
          countBadge.textContent = list.length;
        }
      });
    }
    
    document.getElementById('print-expenses')?.addEventListener('click', () => printContentArea());
    document.getElementById('export-expenses')?.addEventListener('click', () => {
      if (typeof exportExpensesToExcel === 'function') {
        exportExpensesToExcel();
      }
    });
  }

  let clubPaymentsBranchFilter = 'all';

  function renderClubPaymentsPage() {
    const list = getClubPayments() || [];
    const filteredList = clubPaymentsBranchFilter === 'all' 
      ? list 
      : list.filter(p => p.branch === clubPaymentsBranchFilter);

    let html = `
      <div class="card animate-in">
        <h3 class="card-title">تسجيل موعد سداد جديد للأندية</h3>
        <form id="form-club-payment">
          <div class="form-row">
            <div class="form-group">
              <label>الفرع</label>
              <select name="branch" required>
                <option value="القاهرة">القاهرة</option>
                <option value="الجيزة">الجيزة</option>
                <option value="سوهاج">سوهاج</option>
                <option value="الأقصر">الأقصر</option>
              </select>
            </div>
            <div class="form-group">
              <label>اسم النادي</label>
              <input type="text" name="clubName" required placeholder="اسم النادي المستحق">
            </div>
            <div class="form-group">
              <label>المبلغ (ج.م)</label>
              <input type="number" name="amount" min="0.01" step="0.01" required placeholder="المبلغ الإجمالي">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>المتبقي (ج.م)</label>
              <input type="number" name="remaining" min="0" step="0.01" required placeholder="المبلغ المتبقي">
            </div>
            <div class="form-group">
              <label>تاريخ السداد</label>
              <input type="date" name="dueDate" required>
            </div>
          </div>
          <button type="submit" class="btn btn-primary">إضافة موعد سداد</button>
        </form>
      </div>
      
      <div class="card printable-content animate-in">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:0.75rem; margin-bottom:1rem; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
            <h3 style="margin:0; font-size:1.15rem; font-weight:700; border:none; padding:0;">شيت سداد الأندية</h3>
            <select id="club-payment-branch-filter" class="form-control" style="width:160px; padding:5px 10px; border-radius:6px; border:1px solid var(--border); font-family:inherit; font-size:0.9rem; background:var(--bg-card); color:var(--text); cursor:pointer;">
              <option value="all">كل الفروع</option>
              <option value="القاهرة">القاهرة</option>
              <option value="الجيزة">الجيزة</option>
              <option value="سوهاج">سوهاج</option>
              <option value="الأقصر">الأقصر</option>
            </select>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-primary btn-sm" id="print-club-payments">طباعة</button>
            <button type="button" class="btn btn-primary btn-sm" id="export-club-payments">تصدير Excel</button>
          </div>
        </div>
        <div class="count-box">إجمالي السجلات: <span class="count-badge" id="club-payments-count-badge">${filteredList.length}</span></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px;">م</th>
                <th>الفرع</th>
                <th>اسم النادي</th>
                <th>المبلغ</th>
                <th>المتبقي</th>
                <th>تاريخ السداد</th>
                <th>تاريخ ووقت الإدخال</th>
              </tr>
            </thead>
            <tbody id="club-payments-table-body">
    `;
    
    if (!filteredList.length) {
      html += `<tr><td colspan="7" style="text-align:center;">لا توجد مواعيد سداد مسجلة لهذه الفلترة</td></tr>`;
    } else {
      html += renderClubPaymentsRows(filteredList);
    }
    
    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    return html;
  }

  function renderClubPaymentsRows(list) {
    return list.map((p, idx) => {
      const at = p.createdAt ? new Date(p.createdAt) : new Date();
      const dateTimeStr = at.toLocaleDateString('ar-EG') + ' ' + at.toLocaleTimeString('ar-EG');
      return `
        <tr data-id="${p.id}">
          <td>${idx + 1}</td>
          <td><span class="badge badge-coach">${escapeHtml(p.branch)}</span></td>
          <td><strong>${escapeHtml(p.clubName)}</strong></td>
          <td style="font-weight:bold;">${Number(p.amount).toLocaleString('ar-SA')} ج.م</td>
          <td style="color:var(--warning); font-weight:bold;">${Number(p.remaining).toLocaleString('ar-SA')} ج.م</td>
          <td style="color:var(--danger); font-weight:bold;">${p.dueDate}</td>
          <td>${dateTimeStr}</td>
        </tr>
      `;
    }).join('');
  }

  function bindClubPaymentsPage() {
    const form = document.getElementById('form-club-payment');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = {
          branch: fd.get('branch').trim(),
          clubName: fd.get('clubName').trim(),
          amount: parseFloat(fd.get('amount')) || 0,
          remaining: parseFloat(fd.get('remaining')) || 0,
          dueDate: fd.get('dueDate').trim()
        };
        
        addClubPayment(data);
        form.reset();
        
        const tableBody = document.getElementById('club-payments-table-body');
        if (tableBody) {
          const list = getClubPayments() || [];
          const filteredList = clubPaymentsBranchFilter === 'all' 
            ? list 
            : list.filter(x => x.branch === clubPaymentsBranchFilter);
          tableBody.innerHTML = renderClubPaymentsRows(filteredList);
          
          const countBadge = document.getElementById('club-payments-count-badge');
          if (countBadge) {
            countBadge.textContent = filteredList.length;
          }
        }
      });
    }

    const filterSelect = document.getElementById('club-payment-branch-filter');
    if (filterSelect) {
      filterSelect.value = clubPaymentsBranchFilter;
      filterSelect.addEventListener('change', (e) => {
        clubPaymentsBranchFilter = e.target.value;
        const tableBody = document.getElementById('club-payments-table-body');
        if (tableBody) {
          const list = getClubPayments() || [];
          const filteredList = clubPaymentsBranchFilter === 'all' 
            ? list 
            : list.filter(x => x.branch === clubPaymentsBranchFilter);
          if (!filteredList.length) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">لا توجد مواعيد سداد مسجلة لهذه الفلترة</td></tr>`;
          } else {
            tableBody.innerHTML = renderClubPaymentsRows(filteredList);
          }
          
          const countBadge = document.getElementById('club-payments-count-badge');
          if (countBadge) {
            countBadge.textContent = filteredList.length;
          }
        }
      });
    }
    
    document.getElementById('print-club-payments')?.addEventListener('click', () => printContentArea());
    document.getElementById('export-club-payments')?.addEventListener('click', () => {
      if (typeof exportClubPaymentsToExcel === 'function') {
        exportClubPaymentsToExcel();
      }
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

  // Double click event delegation for row selection
  contentArea.addEventListener('dblclick', (e) => {
    const tr = e.target.closest('.data-table tbody tr');
    if (tr) {
      tr.classList.toggle('table-row-selected');
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
      else if (currentRoute === ROUTES.EXPENSES && typeof exportExpensesToExcel === 'function') exportExpensesToExcel();
      else if (currentRoute === ROUTES.CLUB_PAYMENTS && typeof exportClubPaymentsToExcel === 'function') exportClubPaymentsToExcel();
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
  firebase.auth().onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      // Firebase remembers the user — check if we have a valid local session
      if (!isSessionValid()) {
        // Session expired or missing (new device/tab open) — auto-restore from Firestore
        try {
          const userDoc = await firebase.firestore().collection('users').doc(firebaseUser.uid).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.enabled !== false) {
              // Rebuild session automatically — user doesn't need to log in again
              const sessionUser = {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                role: userData.role,
                name: userData.name || firebaseUser.email
              };
              setSessionData({ user: sessionUser });
            } else {
              // Account disabled — sign out
              await firebase.auth().signOut();
              if (loadingDiv.parentNode) loadingDiv.remove();
              initTheme();
              showLogin();
              return;
            }
          } else {
            // No Firestore record — sign out
            await firebase.auth().signOut();
            if (loadingDiv.parentNode) loadingDiv.remove();
            initTheme();
            showLogin();
            return;
          }
        } catch (err) {
          console.error('Auto-restore session error:', err);
          if (loadingDiv.parentNode) loadingDiv.remove();
          initTheme();
          showLogin();
          return;
        }
      }

      // Now we have a valid session — load data and show app
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
      // No Firebase user at all — always show login
      if (loadingDiv.parentNode) loadingDiv.remove();
      initTheme();
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
