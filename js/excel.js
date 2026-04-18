/**
 * Export to Excel (CSV with BOM for Arabic)
 */
function downloadCSV(filename, rows, headers) {
  const BOM = '\uFEFF';
  const escape = (v) => {
    const s = String(v == null ? '' : v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const line = (arr) => arr.map(escape).join(',');
  const content = BOM + line(headers) + '\n' + rows.map(r => line(r)).join('\n');
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportPlayersToExcel() {
  const list = getPlayers();
  const headers = ['الاسم بالكامل', 'رقم الهاتف', 'الفرع', 'تاريخ الميلاد', 'بداية التعاقد', 'انتهاء التعاقد', 'قيمة العقد', 'المدفوع', 'المتبقي', 'المركز'];
  const rows = list.map(p => [
    p.fullName,
    p.phone,
    p.branch || 'القاهرة',
    p.dateOfBirth,
    p.contractStart,
    p.contractEnd,
    p.contractValue,
    p.paid,
    p.remaining,
    getPositionLabel(p.position)
  ]);
  downloadCSV('لاعبين_لشبونة', rows, headers);
}

function exportCoachesToExcel() {
  const list = getCoaches();
  const headers = ['الاسم', 'رقم الهاتف', 'الفرع', 'بداية التعاقد', 'انتهاء التعاقد', 'الراتب', 'المدفوع', 'المتبقي'];
  const rows = list.map(c => [c.name, c.phone, c.branch || 'القاهرة', c.contractStart, c.contractEnd, c.salary, c.paid, c.remaining]);
  downloadCSV('كباتن_لشبونة', rows, headers);
}

function exportNotificationsToExcel() {
  const list = getNotifications();
  const headers = ['الإجراء', 'البريد الإلكتروني', 'التاريخ'];
  const rows = list.map(n => [getActionLabel(n.action), n.email, new Date(n.at).toLocaleString('ar-SA')]);
  downloadCSV('إشعارات_لشبونة', rows, headers);
}

function exportFinancialSummaryToExcel() {
  const sum = getFinancialSummary();
  const headers = ['البند', 'المبلغ'];
  const rows = [
    ['إجمالي المدفوع', sum.totalPaid],
    ['إجمالي المتبقي', sum.totalRemaining],
    ['إجمالي المدفوع للاعبين', sum.totalPaidPlayers],
    ['إجمالي المتبقي للاعبين', sum.totalRemainingPlayers],
    ['إجمالي المدفوع للكباتن', sum.totalPaidCoaches],
    ['إجمالي المتبقي للكباتن', sum.totalRemainingCoaches]
  ];
  downloadCSV('ملخص_مالي_لشبونة', rows, headers);
}

function exportEmployeesToExcel() {
  const list = getEmployees();
  const headers = ['الاسم', 'رقم الهاتف', 'الراتب', 'المدفوع', 'المتبقي', 'الفرع'];
  const rows = list.map(e => [e.name, e.phone, e.salary, e.paid, e.remaining, e.branch || 'القاهرة']);
  downloadCSV('موظفين_لشبونة', rows, headers);
}

function exportAttendanceToExcel() {
  const records = getAttendanceRecords();
  if (!records.length) {
    alert("لا توجد سجلات حضور لتصديرها.");
    return;
  }
  const headers = ['التاريخ', 'الفرع', 'الفئة', 'الاسم', 'وقت الحضور', 'وقت الانصراف'];
  
  const coaches = getCoaches();
  const employees = getEmployees();
  
  const getPersonInfo = (id) => {
    let p = coaches.find(c => c.id === id);
    if (p) return { name: p.name, branch: p.branch || 'القاهرة', role: 'كابتن' };
    p = employees.find(e => e.id === id);
    if (p) return { name: p.name, branch: p.branch || 'القاهرة', role: 'موظف' };
    return { name: 'مجهول', branch: 'مجهول', role: 'مجهول' };
  };

  const rows = records.map(r => {
    const info = getPersonInfo(r.personId);
    const checkIn = r.checkIn ? new Date(r.checkIn).toLocaleTimeString('ar-EG') : '—';
    const checkOut = r.checkOut ? new Date(r.checkOut).toLocaleTimeString('ar-EG') : '—';
    return [r.date, info.branch, info.role, info.name, checkIn, checkOut];
  });
  
  downloadCSV('حضور_انصراف_لشبونة', rows, headers);
}
