import { EXPENSE_CATEGORIES, currentMonthKey } from './storage.js';

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date());

function getCategorySpend(transactions, category) {
  return transactions.filter(item => item.type === 'expense' && item.category === category && item.date?.startsWith(currentMonthKey())).reduce((sum, item) => sum + Number(item.amount), 0);
}

function progressClass(percent) {
  if (percent >= 100) return 'danger';
  if (percent >= 80) return 'warning';
  return '';
}

export function renderBudget(state) {
  const totalLimit = Number(state.budget.total) || 0;
  const spent = state.transactions.filter(item => item.type === 'expense' && item.date?.startsWith(currentMonthKey())).reduce((sum, item) => sum + Number(item.amount), 0);
  const available = totalLimit - spent;
  const percent = totalLimit > 0 ? spent / totalLimit * 100 : 0;
  document.getElementById('budgetMonthLabel').textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  document.getElementById('budgetTotalInput').value = totalLimit || '';
  document.getElementById('budgetSpentMain').textContent = money(spent);
  document.getElementById('budgetLimitMain').textContent = money(totalLimit);
  document.getElementById('budgetPercentMain').textContent = `${Math.round(percent)}% utilizado`;
  document.getElementById('budgetAvailableMain').textContent = totalLimit > 0 ? `${money(Math.max(0, available))} disponível` : 'Defina seu limite';
  const progress = document.getElementById('budgetProgressMain');
  progress.style.width = `${Math.min(percent, 100)}%`;
  progress.className = `progress-fill ${progressClass(percent)}`.trim();
  document.getElementById('budgetInsightSpent').textContent = money(spent);
  document.getElementById('budgetInsightAvailable').textContent = totalLimit > 0 ? money(available) : '—';

  const alert = document.getElementById('budgetAlert');
  if (!totalLimit) {
    alert.hidden = false;
    alert.className = 'alert-inline';
    alert.textContent = 'Defina seu orçamento mensal para começar a acompanhar o limite disponível.';
  } else if (percent >= 100) {
    alert.hidden = false;
    alert.className = 'alert-inline danger';
    alert.textContent = `Atenção: você ultrapassou o orçamento em ${money(Math.abs(available))}. Considere revisar seus gastos.`;
  } else if (percent >= 80) {
    alert.hidden = false;
    alert.className = 'alert-inline';
    alert.textContent = `Você já utilizou ${Math.round(percent)}% do orçamento. Restam ${money(available)} para o mês.`;
  } else {
    alert.hidden = true;
  }

  document.getElementById('categoryBudgetList').innerHTML = EXPENSE_CATEGORIES.map(category => {
    const limit = Number(state.budget.categories?.[category.name]) || 0;
    const categorySpent = getCategorySpend(state.transactions, category.name);
    const categoryPercent = limit > 0 ? categorySpent / limit * 100 : 0;
    return `<div class="category-budget-item">
      <div class="category-budget-name"><span class="category-avatar">${category.icon}</span><span>${category.name}</span></div>
      <div class="category-budget-numbers"><strong>${money(categorySpent)}</strong><span>/</span><input type="number" min="0" step="0.01" value="${limit || ''}" placeholder="Limite R$" aria-label="Limite para ${category.name}" data-category-budget="${category.name}"></div>
      <div class="progress-track"><div class="progress-fill ${progressClass(categoryPercent)}" style="width:${Math.min(categoryPercent, 100)}%"></div></div>
    </div>`;
  }).join('');
}

export function initBudget({ getState, save, onChange, notify }) {
  document.getElementById('budgetForm').addEventListener('submit', event => {
    event.preventDefault();
    const value = Number(document.getElementById('budgetTotalInput').value);
    if (!Number.isFinite(value) || value < 0) {
      notify('Informe um limite mensal válido.', 'error');
      return;
    }
    const state = getState();
    state.budget.total = value;
    state.budget.isDemo = false;
    save(state);
    notify('Orçamento mensal atualizado.');
    onChange();
  });

  document.getElementById('categoryBudgetList').addEventListener('change', event => {
    const input = event.target.closest('[data-category-budget]');
    if (!input) return;
    const value = Number(input.value);
    if (!Number.isFinite(value) || value < 0) {
      notify('Informe um limite válido para a categoria.', 'error');
      renderBudget(getState());
      return;
    }
    const state = getState();
    state.budget.categories[input.dataset.categoryBudget] = value;
    state.budget.isDemo = false;
    save(state);
    notify(`Limite de ${input.dataset.categoryBudget} atualizado.`);
    onChange();
  });

  renderBudget(getState());
}
