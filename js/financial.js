/**
 * Financial dashboard: totals, pie/bar charts, upcoming payments
 */
function getFinancialSummary(branchFilter = null) {
  const players = getPlayers();
  const coaches = getCoaches();
  const employees = getEmployees();

  const isAll = !branchFilter || branchFilter === 'all';

  let totalPaidPlayers = 0, totalRemainingPlayers = 0;
  let totalPaidCoaches = 0, totalRemainingCoaches = 0;
  let totalPaidEmployees = 0, totalRemainingEmployees = 0;

  players.forEach(p => {
    const b = p.branch || 'القاهرة';
    if (isAll || b === branchFilter) {
      totalPaidPlayers += Number(p.paid) || 0;
      totalRemainingPlayers += Number(p.remaining) || 0;
    }
  });
  coaches.forEach(c => {
    const b = c.branch || 'القاهرة';
    if (isAll || b === branchFilter) {
      totalPaidCoaches += Number(c.paid) || 0;
      totalRemainingCoaches += Number(c.remaining) || 0;
    }
  });
  employees.forEach(e => {
    const b = e.branch || 'القاهرة';
    if (isAll || b === branchFilter) {
      totalPaidEmployees += Number(e.paid) || 0;
      totalRemainingEmployees += Number(e.remaining) || 0;
    }
  });

  const totalPaid = totalPaidPlayers;
  const totalRemaining = totalRemainingPlayers;

  // Initialize breakdown for each of the 6 metrics
  const branches = ['القاهرة', 'الجيزة', 'سوهاج', 'الأقصر'];
  const breakdown = {
    totalPaidPlayers: {},
    totalRemainingPlayers: {},
    totalPaidCoaches: {},
    totalRemainingCoaches: {},
    totalPaidEmployees: {},
    totalRemainingEmployees: {}
  };

  branches.forEach(b => {
    breakdown.totalPaidPlayers[b] = 0;
    breakdown.totalRemainingPlayers[b] = 0;
    breakdown.totalPaidCoaches[b] = 0;
    breakdown.totalRemainingCoaches[b] = 0;
    breakdown.totalPaidEmployees[b] = 0;
    breakdown.totalRemainingEmployees[b] = 0;
  });

  // Populate breakdown
  players.forEach(p => {
    const b = p.branch || 'القاهرة';
    if (breakdown.totalPaidPlayers[b] !== undefined) {
      breakdown.totalPaidPlayers[b] += Number(p.paid) || 0;
      breakdown.totalRemainingPlayers[b] += Number(p.remaining) || 0;
    }
  });
  coaches.forEach(c => {
    const b = c.branch || 'القاهرة';
    if (breakdown.totalPaidCoaches[b] !== undefined) {
      breakdown.totalPaidCoaches[b] += Number(c.paid) || 0;
      breakdown.totalRemainingCoaches[b] += Number(c.remaining) || 0;
    }
  });
  employees.forEach(e => {
    const b = e.branch || 'القاهرة';
    if (breakdown.totalPaidEmployees[b] !== undefined) {
      breakdown.totalPaidEmployees[b] += Number(e.paid) || 0;
      breakdown.totalRemainingEmployees[b] += Number(e.remaining) || 0;
    }
  });

  return {
    totalPaid,
    totalRemaining,
    totalPaidPlayers,
    totalRemainingPlayers,
    totalPaidCoaches,
    totalRemainingCoaches,
    totalPaidEmployees,
    totalRemainingEmployees,
    grandTotal: totalPaid + totalRemaining,
    breakdown
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
  const coachAlerts = getCoachPaymentAlert();
  const employeeAlerts = getEmployeePaymentAlert();
  const combined = [...coachAlerts, ...employeeAlerts].sort((a, b) => a.daysUntil - b.daysUntil);
  return combined;
}

function renderFinancialCharts(branchFilter = 'all') {
  const sum = getFinancialSummary(branchFilter);
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
        plugins: { 
          legend: { 
            position: 'bottom',
            labels: {
              font: {
                family: 'Tajawal'
              }
            }
          } 
        }
      }
    });
  }

  const activeBranches = (branchFilter === 'all' || !branchFilter)
    ? ['القاهرة', 'الجيزة', 'سوهاج', 'الأقصر']
    : [branchFilter];

  const players = getPlayers();
  const coaches = getCoaches();
  const employees = getEmployees();

  const branchPaid = {};
  const branchRemaining = {};

  activeBranches.forEach(b => {
    branchPaid[b] = 0;
    branchRemaining[b] = 0;
  });

  players.forEach(p => {
    const b = p.branch || 'القاهرة';
    if (branchPaid[b] !== undefined) {
      branchPaid[b] += Number(p.paid) || 0;
      branchRemaining[b] += Number(p.remaining) || 0;
    }
  });

  coaches.forEach(c => {
    const b = c.branch || 'القاهرة';
    if (branchPaid[b] !== undefined) {
      branchPaid[b] += Number(c.paid) || 0;
      branchRemaining[b] += Number(c.remaining) || 0;
    }
  });

  employees.forEach(e => {
    const b = e.branch || 'القاهرة';
    if (branchPaid[b] !== undefined) {
      branchPaid[b] += Number(e.paid) || 0;
      branchRemaining[b] += Number(e.remaining) || 0;
    }
  });

  const barData = {
    labels: activeBranches,
    datasets: [
      {
        label: 'إجمالي المدفوع',
        data: activeBranches.map(b => branchPaid[b]),
        backgroundColor: '#2e7d32'
      },
      {
        label: 'إجمالي المتبقي',
        data: activeBranches.map(b => branchRemaining[b]),
        backgroundColor: '#ed6c02'
      }
    ]
  };

  if (ctxBar) {
    new Chart(ctxBar, {
      type: 'bar',
      data: barData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { 
            display: true, 
            position: 'bottom',
            labels: {
              font: {
                family: 'Tajawal'
              }
            }
          } 
        },
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
