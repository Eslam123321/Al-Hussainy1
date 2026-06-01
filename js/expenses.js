/**
 * Expenses CRUD - name, amount, authorizedBy, reason, createdAt
 */
function generateExpenseId() {
  return 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

function addExpense(data) {
  const expense = {
    id: generateExpenseId(),
    name: (data.name || '').trim(),
    amount: parseFloat(data.amount) || 0,
    authorizedBy: (data.authorizedBy || '').trim(),
    reason: (data.reason || '').trim(),
    createdAt: new Date().toISOString()
  };
  const list = getExpenses();
  list.push(expense);
  setExpenses(list);
  
  if (typeof logNotification === 'function') {
    const user = getCurrentUser();
    logNotification('expense_add', user && user.email, { expenseId: expense.id, name: expense.name, amount: expense.amount });
  }
  return expense;
}
