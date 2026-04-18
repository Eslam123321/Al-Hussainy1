/**
 * Real-time search with highlight
 */
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query) {
  if (!query || !text) return text;
  const q = escapeRegex(query.trim());
  if (!q) return text;
  const re = new RegExp('(' + q + ')', 'gi');
  return String(text).replace(re, '<mark>$1</mark>');
}

function filterAndHighlightList(items, query, fields) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return items.map(item => ({ item, highlighted: item }));
  const filtered = items.filter(item => {
    return fields.some(f => {
      const v = item[f];
      return v && String(v).toLowerCase().includes(q);
    });
  });
  return filtered.map(item => {
    const highlighted = { ...item };
    fields.forEach(f => {
      if (highlighted[f]) highlighted[f] = highlightText(highlighted[f], query);
    });
    return { item, highlighted };
  });
}

function filterPlayers(query) {
  return filterAndHighlightList(getPlayers(), query, ['fullName', 'phone', 'position']);
}

function filterCoaches(query) {
  return filterAndHighlightList(getCoaches(), query, ['name', 'phone']);
}

function filterNotifications(query) {
  const list = getNotifications();
  const q = (query || '').trim().toLowerCase();
  if (!q) return list.map(n => ({ ...n, emailDisplay: n.email }));
  return list
    .filter(n => n.email && n.email.toLowerCase().includes(q))
    .map(n => ({ ...n, emailDisplay: n.email.replace(new RegExp('(' + escapeRegex(q) + ')', 'gi'), '<mark>$1</mark>') }));
}

function filterUsers(query) {
  const list = getUsers() || [];
  return filterAndHighlightList(list, query, ['email', 'name']);
}
