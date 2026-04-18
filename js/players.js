/**
 * Players CRUD - contract value, paid, remaining (auto)
 */
function generateId() {
  return 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

function getPlayersList() {
  return getPlayers();
}

function addPlayer(data) {
  const contractValue = parseFloat(data.contractValue) || 0;
  const paid = parseFloat(data.paid) || 0;
  const remaining = Math.max(0, contractValue - paid);
  const player = {
    id: generateId(),
    fullName: (data.fullName || '').trim(),
    phone: (data.phone || '').trim(),
    dateOfBirth: (data.dateOfBirth || '').trim(),
    branch: (data.branch || 'القاهرة').trim(),
    contractStart: (data.contractStart || '').trim(),
    contractEnd: (data.contractEnd || '').trim(),
    contractValue,
    paid,
    remaining,
    position: data.position || 'midfielder',
    createdAt: new Date().toISOString()
  };
  const list = getPlayers();
  list.unshift(player);
  setPlayers(list);
  if (typeof logNotification === 'function') {
    const user = getCurrentUser();
    logNotification('player_add', user && user.email, { playerId: player.id, name: player.fullName });
  }
  return player;
}

function updatePlayer(id, data) {
  const list = getPlayers();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const contractValue = parseFloat(data.contractValue) || 0;
  const paid = parseFloat(data.paid) || 0;
  const prev = list[idx];
  list[idx] = {
    ...prev,
    fullName: (data.fullName || prev.fullName).trim(),
    phone: (data.phone || prev.phone).trim(),
    dateOfBirth: (data.dateOfBirth || prev.dateOfBirth).trim(),
    branch: (data.branch || prev.branch || 'القاهرة').trim(),
    contractStart: (data.contractStart || prev.contractStart).trim(),
    contractEnd: (data.contractEnd || prev.contractEnd).trim(),
    contractValue,
    paid,
    remaining: Math.max(0, contractValue - paid),
    position: data.position || prev.position
  };
  setPlayers(list);
  if (typeof logNotification === 'function') {
    const user = getCurrentUser();
    logNotification('player_edit', user && user.email, { playerId: id, name: list[idx].fullName });
  }
  return list[idx];
}

function deletePlayer(id) {
  const list = getPlayers();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return false;
  const name = list[idx].fullName;
  list.splice(idx, 1);
  setPlayers(list);
  if (typeof logNotification === 'function') {
    const user = getCurrentUser();
    logNotification('player_delete', user && user.email, { playerId: id, name });
  }
  return true;
}

function getPositionLabel(value) {
  const p = PLAYER_POSITIONS.find(x => x.value === value);
  return p ? p.label : value;
}

function getPlayerForPaymentAlert() {
  const list = getPlayers();
  const today = new Date().getDate(); // day of month (1-31)
  const result = [];
  list.forEach(p => {
    const day = getPaydayDayNumber(p.payday);
    if (!day) return;
    const daysUntil = day - today;
    if (daysUntil >= -30 && daysUntil <= SALARY_ALERT_DAYS) {
      // Build a display date string for current month
      const now = new Date();
      const padDay = String(day).padStart(2, '0');
      const padMonth = String(now.getMonth() + 1).padStart(2, '0');
      const displayDate = `${now.getFullYear()}-${padMonth}-${padDay}`;
      result.push({ ...p, daysUntil, type: 'player', contractEnd: displayDate, paydayDay: day });
    }
  });
  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}

