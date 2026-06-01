/**
 * Club Payments CRUD - branch, clubName, amount, remaining, dueDate, createdAt
 */
function generateClubPaymentId() {
  return 'cp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

function addClubPayment(data) {
  const payment = {
    id: generateClubPaymentId(),
    branch: (data.branch || 'القاهرة').trim(),
    clubName: (data.clubName || '').trim(),
    amount: parseFloat(data.amount) || 0,
    remaining: parseFloat(data.remaining) || 0,
    dueDate: (data.dueDate || '').trim(),
    createdAt: new Date().toISOString()
  };
  const list = getClubPayments();
  list.push(payment);
  setClubPayments(list);
  
  if (typeof logNotification === 'function') {
    const user = getCurrentUser();
    logNotification('club_payment_add', user && user.email, { paymentId: payment.id, clubName: payment.clubName, amount: payment.amount });
  }
  return payment;
}
