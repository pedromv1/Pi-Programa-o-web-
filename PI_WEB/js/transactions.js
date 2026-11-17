import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, createId, isoDate } from './storage.js';

const allCategoryOptions = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES.filter(item => item.name !== 'Outros')];

function categoryInfo(name) {
  return allCategoryOptions.find(item => item.name === name) || { icon: '📦', color: '#9ba69f' };
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
}

function formatDate(date) {
  if (!date) return '—';
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR').format(parsed);
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function updateCategorySelect(type, selected = '') {
  const select = document.getElementById('transactionCategory');
  if (!select) return;
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  select.innerHTML = '<option value="">Selecione uma categoria</option>' + categories.map(item => `<option value="${item.name}">${item.icon} ${item.name}</option>`).join('');
  if (categories.some(item => item.name === selected)) select.value = selected;
}

function updateCategoryFilter(state) {
  const select = document.getElementById('filterCategory');
  if (!select) return;
  const current = select.value;
  const categories = [...new Set(state.transactions.map(item => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  select.innerHTML = '<option value="all">Todas</option>' + categories.map(name => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('');
  if (categories.includes(current)) select.value = current;
}

function filterTransactions(transactions) {
  const type = document.getElementById('filterType')?.value || 'all';
  const category = document.getElementById('filterCategory')?.value || 'all';
  const month = document.getElementById('filterMonth')?.value || '';
  const from = document.getElementById('filterFrom')?.value || '';
  const to = document.getElementById('filterTo')?.value || '';
  return transactions.filter(item => {
    if (type !== 'all' && item.type !== type) return false;
    if (category !== 'all' && item.category !== category) return false;
    if (month && !item.date?.startsWith(month)) return false;
    if (from && item.date < from) return false;
    if (to && item.date > to) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function renderTransactions(state) {
  updateCategoryFilter(state);
  const filtered = filterTransactions(state.transactions);
  const body = document.getElementById('transactionsTableBody');
  const mobile = document.getElementById('mobileTransactionsList');
  const empty = document.getElementById('transactionsEmpty');
  const count = document.getElementById('transactionCount');
  const income = filtered.filter(item => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = filtered.filter(item => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);

  document.getElementById('filteredIncome').textContent = formatCurrency(income);
  document.getElementById('filteredExpense').textContent = formatCurrency(expense);
  const balanceElement = document.getElementById('filteredBalance');
  balanceElement.textContent = formatCurrency(income - expense);
  balanceElement.classList.toggle('income-text', income - expense >= 0);
  balanceElement.classList.toggle('expense-text', income - expense < 0);
  count.textContent = `${filtered.length} ${filtered.length === 1 ? 'registro' : 'registros'}`;

  if (!filtered.length) {
    body.innerHTML = '';
    mobile.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  body.innerHTML = filtered.map(item => {
    const icon = categoryInfo(item.category).icon;
    const sign = item.type === 'income' ? '+' : '−';
    const description = escapeHTML(item.description);
    return `<tr>
      <td><div class="transaction-title-cell"><span class="category-avatar">${icon}</span><div><strong>${description}</strong>${item.notes ? `<small>${escapeHTML(item.notes)}</small>` : ''}</div></div></td>
      <td><span class="category-pill">${escapeHTML(item.category)}</span></td>
      <td>${formatDate(item.date)}</td>
      <td><span class="type-pill ${item.type}">${item.type === 'income' ? '↙ Receita' : '↗ Despesa'}</span></td>
      <td class="align-right"><strong class="${item.type === 'income' ? 'income-text' : 'expense-text'}">${sign} ${formatCurrency(item.amount)}</strong></td>
      <td><div class="row-actions"><button class="row-action" type="button" data-edit-transaction="${item.id}" aria-label="Editar ${description}" title="Editar">✎</button><button class="row-action delete" type="button" data-delete-transaction="${item.id}" aria-label="Excluir ${description}" title="Excluir">×</button></div></td>
    </tr>`;
  }).join('');

  mobile.innerHTML = filtered.map(item => {
    const icon = categoryInfo(item.category).icon;
    const sign = item.type === 'income' ? '+' : '−';
    return `<div class="mobile-transaction-card"><span class="category-avatar">${icon}</span><div class="recent-details"><strong>${escapeHTML(item.description)}</strong><span>${escapeHTML(item.category)} · ${formatDate(item.date)}</span></div><div class="mobile-amount"><strong class="${item.type === 'income' ? 'income-text' : 'expense-text'}">${sign}${formatCurrency(item.amount)}</strong><div class="row-actions" style="margin-top:5px"><button class="row-action" type="button" data-edit-transaction="${item.id}" aria-label="Editar movimentação">✎</button><button class="row-action delete" type="button" data-delete-transaction="${item.id}" aria-label="Excluir movimentação">×</button></div></div></div>`;
  }).join('');
}

export function initTransactions({ getState, save, onChange, notify }) {
  const dialog = document.getElementById('transactionDialog');
  const form = document.getElementById('transactionForm');
  const typeInput = document.getElementById('transactionType');

  function openNewTransaction() {
    form.reset();
    document.getElementById('transactionId').value = '';
    document.getElementById('transactionDialogTitle').textContent = 'Nova movimentação';
    document.getElementById('transactionDate').value = isoDate();
    document.getElementById('transactionAmount').value = '';
    document.getElementById('transactionNotes').value = '';
    setType('expense');
    dialog.showModal();
    document.getElementById('transactionDescription').focus();
  }

  function setType(type, category = '') {
    typeInput.value = type;
    document.querySelectorAll('[data-transaction-type]').forEach(button => {
      button.classList.toggle('active', button.dataset.transactionType === type);
    });
    updateCategorySelect(type, category);
  }

  function editTransaction(id) {
    const item = getState().transactions.find(transaction => transaction.id === id);
    if (!item) return;
    form.reset();
    document.getElementById('transactionId').value = item.id;
    document.getElementById('transactionDialogTitle').textContent = 'Editar movimentação';
    document.getElementById('transactionDescription').value = item.description;
    document.getElementById('transactionAmount').value = item.amount;
    document.getElementById('transactionDate').value = item.date;
    document.getElementById('transactionNotes').value = item.notes || '';
    setType(item.type, item.category);
    dialog.showModal();
  }

  document.querySelectorAll('[data-open-transaction]').forEach(button => button.addEventListener('click', openNewTransaction));
  document.querySelectorAll('[data-transaction-type]').forEach(button => button.addEventListener('click', () => setType(button.dataset.transactionType)));

  document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => document.getElementById(button.dataset.closeDialog)?.close());
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const id = document.getElementById('transactionId').value;
    const description = document.getElementById('transactionDescription').value.trim();
    const amount = Number(document.getElementById('transactionAmount').value);
    const type = typeInput.value;
    const category = document.getElementById('transactionCategory').value;
    const date = document.getElementById('transactionDate').value;
    const notes = document.getElementById('transactionNotes').value.trim();

    if (!description || !category || !date || !Number.isFinite(amount) || amount <= 0) {
      notify('Preencha os campos obrigatórios com valores válidos.', 'error');
      return;
    }
    const state = getState();
    const previous = id ? state.transactions.find(item => item.id === id) : null;
    const transaction = { id: id || createId(), type, description, amount, category, date, notes, isDemo: false, createdAt: previous?.createdAt || new Date().toISOString() };
    if (id) {
      state.transactions = state.transactions.map(item => item.id === id ? transaction : item);
    } else {
      state.transactions.push(transaction);
    }
    save(state);
    dialog.close();
    notify(id ? 'Movimentação atualizada com sucesso.' : 'Movimentação cadastrada com sucesso.');
    onChange();
  });

  document.addEventListener('click', event => {
    const editButton = event.target.closest('[data-edit-transaction]');
    const deleteButton = event.target.closest('[data-delete-transaction]');
    if (editButton) editTransaction(editButton.dataset.editTransaction);
    if (deleteButton) {
      const id = deleteButton.dataset.deleteTransaction;
      const state = getState();
      const item = state.transactions.find(transaction => transaction.id === id);
      if (!item) return;
      if (!window.confirm(`Excluir a movimentação "${item.description}"?`)) return;
      state.transactions = state.transactions.filter(transaction => transaction.id !== id);
      save(state);
      notify('Movimentação excluída.');
      onChange();
    }
  });

  ['filterType', 'filterCategory', 'filterMonth', 'filterFrom', 'filterTo'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => renderTransactions(getState()));
  });
  document.getElementById('clearFilters').addEventListener('click', () => {
    ['filterType', 'filterCategory'].forEach(id => { document.getElementById(id).value = 'all'; });
    ['filterMonth', 'filterFrom', 'filterTo'].forEach(id => { document.getElementById(id).value = ''; });
    renderTransactions(getState());
  });

  renderTransactions(getState());
}
