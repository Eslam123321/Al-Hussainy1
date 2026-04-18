/**
 * Employees (الموظفين) CRUD - salary, paid, remaining, payday
 */
function generateEmployeeId() {
  return 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

function getEmployeesList() {
  return getEmployees();
}

function addEmployee(data) {
  const salary = parseFloat(data.salary) || 0;
  const paid = parseFloat(data.paid) || 0;
  const remaining = Math.max(0, salary - paid);
  const employee = {
    id: generateEmployeeId(),
    name: (data.name || '').trim(),
    phone: (data.phone || '').trim(),
    branch: (data.branch || 'القاهرة').trim(),
    payday: (data.payday || '').trim(),
    salary,
    paid,
    remaining,
    createdAt: new Date().toISOString()
  };
  const list = getEmployees();
  list.unshift(employee);
  setEmployees(list);
  if (typeof logNotification === 'function') {
    const user = getCurrentUser();
    logNotification('employee_add', user && user.email, { employeeId: employee.id, name: employee.name });
  }
  return employee;
}

function updateEmployee(id, data) {
  const list = getEmployees();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return null;
  const salary = parseFloat(data.salary) || 0;
  const paid = parseFloat(data.paid) || 0;
  const prev = list[idx];
  list[idx] = {
    ...prev,
    name: (data.name || prev.name).trim(),
    phone: (data.phone || prev.phone).trim(),
    branch: (data.branch || prev.branch || 'القاهرة').trim(),
    payday: (data.payday || prev.payday).trim(),
    salary,
    paid,
    remaining: Math.max(0, salary - paid)
  };
  setEmployees(list);
  if (typeof logNotification === 'function') {
    const user = getCurrentUser();
    logNotification('employee_edit', user && user.email, { employeeId: id, name: list[idx].name });
  }
  return list[idx];
}

function deleteEmployee(id) {
  const list = getEmployees();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return false;
  const name = list[idx].name;
  list.splice(idx, 1);
  setEmployees(list);
  if (typeof logNotification === 'function') {
    const user = getCurrentUser();
    logNotification('employee_delete', user && user.email, { employeeId: id, name });
  }
  return true;
}

function getEmployeePaymentAlert() {
  const list = getEmployees();
  const today = new Date().getDate();
  const result = [];
  list.forEach(e => {
    const day = getPaydayDayNumber(e.payday);
    if (!day) return;
    const daysUntil = day - today;
    if (daysUntil >= -30 && daysUntil <= SALARY_ALERT_DAYS) {
      const now = new Date();
      const padDay = String(day).padStart(2, '0');
      const padMonth = String(now.getMonth() + 1).padStart(2, '0');
      const displayDate = `${now.getFullYear()}-${padMonth}-${padDay}`;
      result.push({ ...e, daysUntil, type: 'employee', contractEnd: displayDate, fullName: e.name, paydayDay: day });
    }
  });
  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}
