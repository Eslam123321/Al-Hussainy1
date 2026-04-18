/**
 * Financial dashboard: totals, pie/bar charts, upcoming payments
 */
function getFinancialSummary() {
  const players = getPlayers();
  const coaches = getCoaches();
  const employees = getEmployees();
  let totalPaidPlayers = 0, totalRemainingPlayers = 0;
  let totalPaidCoaches = 0, totalRemainingCoaches = 0;
  let totalPaidEmployees = 0, totalRemainingEmployees = 0;
  players.forEach(p => {
    totalPaidPlayers += Number(p.paid) || 0;
    totalRemainingPlayers += Number(p.remaining) || 0;
  });
  coaches.forEach(c => {
    totalPaidCoaches += Number(c.paid) || 0;
    totalRemainingCoaches += Number(c.remaining) || 0;
  });
  employees.forEach(e => {
    totalPaidEmployees += Number(e.paid) || 0;
    totalRemainingEmployees += Number(e.remaining) || 0;
  });
  const totalPaid = totalPaidPlayers;
  const totalRemaining = totalRemainingPlayers;
  return {
    totalPaid,
    totalRemaining,
    totalPaidPlayers,
    totalRemainingPlayers,
    totalPaidCoaches,
    totalRemainingCoaches,
    totalPaidEmployees,
    totalRemainingEmployees,
    grandTotal: totalPaid + totalRemaining
  };
}

function getFullyPaidPlayers() {
  return getPlayers().filter(p => p.contractValue > 0 && (Number(p.remaining) || 0) <= 0);
}

function getPendingPaymentsPlayers() {
  return getPlayers().filter(p => (Number(p.remaining) || 0) > 0);
}

function getFullyPaidCoaches() {
  return getCoaches().filter(c => c.salary > 0 && (Number(c.remaining) || 0) <= 0);
}

function getFullyPaidEmployees() {
  return getEmployees().filter(e => e.salary > 0 && (Number(e.remaining) || 0) <= 0);
}

function getUpcomingPayments() {
  const playerAlerts = getPlayerForPaymentAlert();
  const coachAlerts = getCoachPaymentAlert();
  const employeeAlerts = getEmployeePaymentAlert();
  const combined = [...playerAlerts, ...coachAlerts, ...employeeAlerts].sort((a, b) => a.daysUntil - b.daysUntil);
  return combined;
}

function renderFinancialCharts() {
  const sum = getFinancialSummary();
  const ctxPie = document.getElementById('chart-pie');
  const ctxBar = document.getElementById('chart-bar');
  if (!ctxPie && !ctxBar) return;

  // Destroy existing chart instances to prevent "Canvas already in use" error
  if (ctxPie) {
    const existing = Chart.getChart(ctxPie);
    if (existing) existing.destroy();
  }
  if (ctxBar) {
    const existing = Chart.getChart(ctxBar);
    if (existing) existing.destroy();
  }

  const pieData = {
    labels: ['إجمالي المدفوع', 'إجمالي المتبقي'],
    datasets: [{
      data: [sum.totalPaid, sum.totalRemaining],
      backgroundColor: ['#2e7d32', '#ed6c02'],
      borderWidth: 0
    }]
  };

  if (ctxPie) {
    new Chart(ctxPie, {
      type: 'pie',
      data: pieData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  const barData = {
    labels: ['مدفوع لاعبين', 'متبقي لاعبين', 'مدفوع كباتن', 'متبقي كباتن', 'مدفوع موظفين', 'متبقي موظفين'],
    datasets: [{
      label: 'المبلغ',
      data: [sum.totalPaidPlayers, sum.totalRemainingPlayers, sum.totalPaidCoaches, sum.totalRemainingCoaches, sum.totalPaidEmployees, sum.totalRemainingEmployees],
      backgroundColor: ['#2e7d32', '#ff9800', '#1976d2', '#ff5722', '#9c27b0', '#e91e63']
    }]
  };

  if (ctxBar) {
    new Chart(ctxBar, {
      type: 'bar',
      data: barData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
}

function animateValue(el, end, duration = 1000) {
  if (!el) return;
  const start = 0;
  const startTime = performance.now();
  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const v = Math.round(start + (end - start) * t);
    el.textContent = v.toLocaleString('ar-SA');
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
