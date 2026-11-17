import { EXPENSE_CATEGORIES, currentMonthKey } from './storage.js';
import { drawFallbackBar, drawFallbackDonut, drawFallbackLine } from './charts.js';

const charts = {};
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);

function parseMonth(key) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function labelMonth(date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '').replace(/^\w/, value => value.toUpperCase());
}

function totalsForMonth(transactions, key) {
  const list = transactions.filter(item => item.date?.startsWith(key));
  return {
    income: list.filter(item => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0),
    expense: list.filter(item => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0)
  };
}

function destroy(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function buildMonthlyData(transactions, selectedMonth) {
  const selectedDate = parseMonth(selectedMonth);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 5 + index, 1);
    const key = monthKey(date);
    return { key, label: labelMonth(date), ...totalsForMonth(transactions, key) };
  });
}

function createComparisonChart(transactions, selectedMonth) {
  const canvas = document.getElementById('reportCompareChart');
  destroy('compare');
  const data = buildMonthlyData(transactions, selectedMonth);
  if (!globalThis.Chart) {
    drawFallbackBar(canvas, data.map(item => item.label), [{ data: data.map(item => item.income), color: '#43b581' }, { data: data.map(item => item.expense), color: '#ed9a91' }]);
    return;
  }
  charts.compare = new Chart(canvas, {
    type: 'bar',
    data: { labels: data.map(item => item.label), datasets: [
      { label: 'Receitas', data: data.map(item => item.income), backgroundColor: '#43b581', borderRadius: 5, maxBarThickness: 21 },
      { label: 'Despesas', data: data.map(item => item.expense), backgroundColor: '#ed9a91', borderRadius: 5, maxBarThickness: 21 }
    ] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, color: '#89958e', font: { family: 'DM Sans', size: 9 }, padding: 17 } }, tooltip: { callbacks: { label: context => `${context.dataset.label}: ${money(context.raw)}` } } },
      scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9aa69f', font: { family: 'DM Sans', size: 9 } } }, y: { beginAtZero: true, grid: { color: '#eef2ef' }, border: { display: false }, ticks: { color: '#a2ada6', font: { family: 'DM Sans', size: 8 }, callback: value => value >= 1000 ? `R$${(value / 1000).toFixed(1)}k` : `R$${value}` } } }
    }
  });
}

function createCategoryReport(transactions, selectedMonth) {
  const canvas = document.getElementById('reportCategoryChart');
  destroy('category');
  const categories = EXPENSE_CATEGORIES.map(category => ({
    ...category,
    value: transactions.filter(item => item.type === 'expense' && item.category === category.name && item.date?.startsWith(selectedMonth)).reduce((sum, item) => sum + Number(item.amount), 0)
  })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  document.getElementById('reportCategoryLegend').innerHTML = categories.length ? categories.map(item => `<div class="legend-item"><span class="legend-dot" style="background:${item.color}"></span><span>${item.name}</span></div>`).join('') : '<span class="muted-small">Sem despesas neste período.</span>';
  if (!globalThis.Chart) {
    drawFallbackDonut(canvas, categories.map(item => item.value), categories.map(item => item.color));
    return;
  }
  charts.category = new Chart(canvas, {
    type: 'doughnut',
    data: { labels: categories.map(item => item.name), datasets: [{ data: categories.map(item => item.value), backgroundColor: categories.length ? categories.map(item => item.color) : ['#edf2ef'], borderWidth: 2, borderColor: '#fff', hoverOffset: 5 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `${context.label}: ${money(context.raw)}` } } } }
  });
}

function createEvolutionChart(transactions, selectedMonth) {
  const canvas = document.getElementById('evolutionChart');
  destroy('evolution');
  const data = buildMonthlyData(transactions, selectedMonth);
  if (!globalThis.Chart) {
    drawFallbackLine(canvas, data.map(item => item.label), data.map(item => item.income - item.expense));
    return;
  }
  charts.evolution = new Chart(canvas, {
    type: 'line',
    data: { labels: data.map(item => item.label), datasets: [{ label: 'Resultado mensal', data: data.map(item => item.income - item.expense), borderColor: '#26986a', backgroundColor: 'rgba(61, 177, 123, .12)', fill: true, tension: .34, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: '#26986a', borderWidth: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => `Resultado: ${money(context.raw)}` } } },
      scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#9aa69f', font: { family: 'DM Sans', size: 9 } } }, y: { grid: { color: '#eef2ef' }, border: { display: false }, ticks: { color: '#a2ada6', font: { family: 'DM Sans', size: 8 }, callback: value => value >= 1000 || value <= -1000 ? `R$${(value / 1000).toFixed(1)}k` : `R$${value}` } } }
    }
  });
}

export function renderReports(state) {
  const monthInput = document.getElementById('reportMonth');
  const selectedMonth = monthInput.value || currentMonthKey();
  if (!monthInput.value) monthInput.value = selectedMonth;
  const totals = totalsForMonth(state.transactions, selectedMonth);
  document.getElementById('reportIncome').textContent = money(totals.income);
  document.getElementById('reportExpense').textContent = money(totals.expense);
  const balance = document.getElementById('reportBalance');
  balance.textContent = money(totals.income - totals.expense);
  balance.classList.toggle('income-text', totals.income - totals.expense >= 0);
  balance.classList.toggle('expense-text', totals.income - totals.expense < 0);
  createComparisonChart(state.transactions, selectedMonth);
  createCategoryReport(state.transactions, selectedMonth);
  createEvolutionChart(state.transactions, selectedMonth);
}

export function initReports({ getState }) {
  document.getElementById('reportMonth').value = currentMonthKey();
  document.getElementById('reportMonth').addEventListener('change', () => renderReports(getState()));
}
