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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = [];
  
  list.forEach(e => {
    if (!e.payday) return;
    const str = String(e.payday).trim();
    let targetDate = null;
    let day = 0;
    
    if (/^\d{1,2}$/.test(str)) {
      day = parseInt(str, 10);
      if (day >= 1 && day <= 31) {
        // Construct date for current month
        targetDate = new Date(today.getFullYear(), today.getMonth(), day);
      }
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      targetDate = new Date(str);
      day = targetDate.getDate();
    }
    
    if (!targetDate || isNaN(targetDate.getTime())) return;
    
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (daysUntil >= -30 && daysUntil <= SALARY_ALERT_DAYS) {
      const padDay = String(day).padStart(2, '0');
      const padMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
      const displayDate = `${targetDate.getFullYear()}-${padMonth}-${padDay}`;
      
      result.push({ 
        ...e, 
        daysUntil, 
        type: 'employee', 
        contractEnd: displayDate, 
        fullName: e.name, 
        paydayDay: day 
      });
    }
  });
  
  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}
