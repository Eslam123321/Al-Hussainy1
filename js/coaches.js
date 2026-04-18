/**
 * Coaches (كباتن) CRUD - salary, paid, remaining
 */
function generateCoachId() {
  return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

function getCoachesList() {
  return getCoaches();
}

function addCoach(data) {
  const salary = parseFloat(data.salary) || 0;
  const paid = parseFloat(data.paid) || 0;
  const remaining = Math.max(0, salary - paid);
  const coach = {
    id: generateCoachId(),
    name: (data.name || '').trim(),
    phone: (data.phone || '').trim(),
    branch: (data.branch || 'القاهرة').trim(),
    payday: (data.payday || '').trim(),
    contractStart: (data.contractStart || '').trim(),
    contractEnd: (data.contractEnd || '').trim(),
    salary,
    paid,
    remaining,
    createdAt: new Date().toISOString()
  };
  const list = getCoaches();
  list.unshift(coach);
  setCoaches(list);
  if (typeof logNotification === 'function') {
    const user = getCurrentUser();
    logNotification('coach_add', user && user.email, { coachId: coach.id, name: coach.name });
  }
  return coach;
}

function updateCoach(id, data) {
  const list = getCoaches();
  const idx = list.findIndex(c => c.id === id);
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
    contractStart: (data.contractStart || prev.contractStart).trim(),
    contractEnd: (data.contractEnd || prev.contractEnd).trim(),
    salary,
    paid,
    remaining: Math.max(0, salary - paid)
  };
  setCoaches(list);
  if (typeof logNotification === 'function') {
    const user = getCurrentUser();
    logNotification('coach_edit', user && user.email, { coachId: id, name: list[idx].name });
  }
  return list[idx];
}

function deleteCoach(id) {
  const list = getCoaches();
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) return false;
  const name = list[idx].name;
  list.splice(idx, 1);
  setCoaches(list);
  if (typeof logNotification === 'function') {
    const user = getCurrentUser();
    logNotification('coach_delete', user && user.email, { coachId: id, name });
  }
  return true;
}

function getCoachPaymentAlert() {
  const list = getCoaches();
  const today = new Date().getDate();
  const result = [];
  list.forEach(c => {
    const day = getPaydayDayNumber(c.payday);
    if (!day) return;
    const daysUntil = day - today;
    if (daysUntil >= -30 && daysUntil <= SALARY_ALERT_DAYS) {
      const now = new Date();
      const padDay = String(day).padStart(2, '0');
      const padMonth = String(now.getMonth() + 1).padStart(2, '0');
      const displayDate = `${now.getFullYear()}-${padMonth}-${padDay}`;
      result.push({ ...c, daysUntil, type: 'coach', contractEnd: displayDate, fullName: c.name, paydayDay: day });
    }
  });
  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}
