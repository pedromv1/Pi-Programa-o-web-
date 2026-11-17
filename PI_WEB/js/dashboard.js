import { EXPENSE_CATEGORIES, currentMonthKey, shiftMonth } from './storage.js';
import { drawFallbackBar, drawFallbackDonut } from './charts.js';

const chartInstances = {};
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const monthLabel = date => new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '').replace(/^\w/, letter => letter.toUpperCase());

function monthTotals(transactions, monthKey) {
  const items = transactions.filter(item => item.date?.startsWith(monthKey));
  return {
    income: items.filter(item => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0),
    expense: items.filter(item => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0)
  };
}

function getRecentCategoryIcon(category) {
  return [...EXPENSE_CATEGORIES, { name: 'Salário', icon: '💼' }, { name: 'Freelance', icon: '💻' }, { name: 'Investimentos', icon: '📈' }, { name: 'Vendas', icon: '🛒' }].find(item => item.name === category)?.icon || '📦';
}

function destroyChart(key) {
  if (chartInstances[key]) {
    chartInstances[key].destroy();
    delete chartInstances[key];
  }
}

function createCashflowChart(transactions) {
  const canvas = document.getElementById('cashflowChart');
  if (!canvas) return;
  destroyChart('cashflow');
  const months = Array.from({ length: 6 }, (_, index) => shiftMonth(new Date(), index - 5));
  const labels = months.map(monthLabel);
  const income = months.map(month => monthTotals(transactions, `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`).income);
  const expense = months.map(month => monthTotals(transactions, `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`).expense);
  if (!globalThis.Chart) {
    drawFallbackBar(canvas, labels, [{ data: income, color: '#43b581' }, { data: expense, color: '#ed9a91' }]);
    return;
  }
  chartInstances.cashflow = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'Receitas', data: income, backgroundColor: '#43b581', borderRadius: 5, maxBarThickness: 18 },
      { label: 'Despesas', data: expense, backgroundColor: '#ed9a91', borderRadius: 5, maxBarThickness: 18 }
    ] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${context.dataset.label}: ${money(context.raw)}` } } },
      scales: {
        x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9aa69f', font: { family: 'DM Sans', size: 9 } } },
        y: { beginAtZero: true, grid: { color: '#eef2ef', drawBorder: false }, border: { display: false }, ticks: { color: '#a2ada6', font: { family: 'DM Sans', size: 8 }, callback: value => value >= 1000 ? `R$${(value / 1000).toFixed(1)}k` : `R$${value}` } }
      }
    }
  });
}

function createCategoryChart(transactions) {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  destroyChart('category');
  const month = currentMonthKey();
  const categories = EXPENSE_CATEGORIES.map(category => ({
    ...category,
    value: transactions.filter(item => item.type === 'expense' && item.category === category.name && item.date?.startsWith(month)).reduce((sum, item) => sum + Number(item.amount), 0)
  })).filter(category => category.value > 0).sort((a, b) => b.value - a.value);
  const legend = document.getElementById('categoryLegend');
  legend.innerHTML = categories.length ? categories.slice(0, 6).map(category => `<div class="legend-item"><span class="legend-dot" style="background:${category.color}"></span><span>${category.name}</span></div>`).join('') : '<span class="muted-small">Sem despesas neste mês.</span>';
  if (!globalThis.Chart) {
    drawFallbackDonut(canvas, categories.map(item => item.value), categories.map(item => item.color));
    return;
  }
  chartInstances.category = new Chart(canvas, {
    type: 'doughnut',
    data: { labels: categories.map(item => item.name), datasets: [{ data: categories.map(item => item.value), backgroundColor: categories.length ? categories.map(item => item.color) : ['#edf2ef'], borderWidth: 2, borderColor: '#fff', hoverOffset: 5 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '69%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${context.label}: ${money(context.raw)}` } } } }
  });
}

export function renderDashboard(state) {
  const month = currentMonthKey();
  const totals = monthTotals(state.transactions, month);
  const balance = state.transactions.reduce((sum, item) => sum + (item.type === 'income' ? Number(item.amount) : -Number(item.amount)), 0);
  const savings = totals.income - totals.expense;
  document.getElementById('statBalance').textContent = money(balance);
  document.getElementById('statIncome').textContent = money(totals.income);
  document.getElementById('statExpense').textContent = money(totals.expense);
  document.getElementById('statSavings').textContent = money(savings);
  document.getElementById('statBalance').classList.toggle('expense-text', balance < 0);
  document.getElementById('statBalance').classList.toggle('income-text', balance >= 0);
  document.getElementById('statSavings').classList.toggle('expense-text', savings < 0);
  document.getElementById('statSavings').classList.toggle('income-text', savings >= 0);

  const firstName = (state.profile.name || 'vamos cuidar do seu dinheiro?').trim().split(/\s+/)[0];
  document.getElementById('welcomeName').textContent = firstName === 'Visitante' ? 'vamos cuidar do seu dinheiro?' : `${firstName}, vamos cuidar do seu dinheiro?`;
  document.getElementById('sidebarUserName').textContent = state.profile.name || 'Meu perfil';
  document.getElementById('sidebarAvatar').textContent = (state.profile.name || 'GC').split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  document.getElementById('demoIndicator').hidden = !state.transactions.some(item => item.isDemo) && !state.goals.some(item => item.isDemo) && !state.budget.isDemo;

  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);
  document.getElementById('recentTransactions').innerHTML = recent.length ? recent.map(item => {
    const sign = item.type === 'income' ? '+' : '−';
    const color = item.type === 'income' ? 'income-text' : 'expense-text';
    const date = new Intl.DateTimeFormat('pt-BR').format(new Date(`${item.date}T12:00:00`));
    return `<div class="recent-item"><span class="category-avatar">${getRecentCategoryIcon(item.category)}</span><div class="recent-details"><strong>${escapeHTML(item.description)}</strong><span>${escapeHTML(item.category)} · ${date}</span></div><strong class="recent-amount ${color}">${sign}${money(item.amount)}</strong></div>`;
  }).join('') : '<div class="empty-state"><p>Suas movimentações aparecerão aqui.</p></div>';

  const budgetSpent = totals.expense;
  const budgetLimit = Number(state.budget.total) || 0;
  const percent = budgetLimit > 0 ? (budgetSpent / budgetLimit) * 100 : 0;
  const remaining = budgetLimit - budgetSpent;
  document.getElementById('dashboardBudgetSpent').textContent = money(budgetSpent);
  document.getElementById('dashboardBudgetLimit').textContent = money(budgetLimit);
  document.getElementById('dashboardBudgetPercent').textContent = `${Math.round(percent)}% utilizado`;
  document.getElementById('dashboardBudgetRemaining').textContent = budgetLimit > 0 ? `${money(Math.max(0, remaining))} disponível` : 'Defina um limite mensal';
  const progress = document.getElementById('dashboardBudgetProgress');
  progress.style.width = `${Math.min(percent, 100)}%`;
  progress.className = `progress-fill${percent >= 100 ? ' danger' : percent >= 80 ? ' warning' : ''}`;
  const tip = document.getElementById('dashboardBudgetTip');
  if (!budgetLimit) tip.innerHTML = '<span>✦</span><p>Defina um limite mensal para acompanhar seus gastos com mais clareza.</p>';
  else if (percent >= 100) tip.innerHTML = '<span>!</span><p>Você ultrapassou o limite mensal planejado. Revise suas despesas e ajuste o orçamento.</p>';
  else if (percent >= 80) tip.innerHTML = '<span>⚑</span><p>Atenção: você já utilizou pelo menos 80% do orçamento mensal.</p>';
  else tip.innerHTML = '<span>✦</span><p>Você está dentro do limite planejado. Continue acompanhando seus gastos.</p>';

  createCashflowChart(state.transactions);
  createCategoryChart(state.transactions);
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
