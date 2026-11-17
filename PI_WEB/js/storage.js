const STORAGE_KEY = 'gastoConsciente.v1';
let memoryFallback = null;

export const EXPENSE_CATEGORIES = [
  { name: 'Alimentação', icon: '🥗', color: '#5ab58a' },
  { name: 'Transporte', icon: '🚗', color: '#6f9fe0' },
  { name: 'Moradia', icon: '🏠', color: '#b18bd8' },
  { name: 'Saúde', icon: '💚', color: '#e28b83' },
  { name: 'Educação', icon: '📚', color: '#d7aa58' },
  { name: 'Lazer', icon: '🎟️', color: '#e59a59' },
  { name: 'Compras', icon: '🛍️', color: '#d989b4' },
  { name: 'Contas', icon: '🧾', color: '#7a9da4' },
  { name: 'Outros', icon: '📦', color: '#9ba69f' }
];

export const INCOME_CATEGORIES = [
  { name: 'Salário', icon: '💼', color: '#5ab58a' },
  { name: 'Freelance', icon: '💻', color: '#6f9fe0' },
  { name: 'Investimentos', icon: '📈', color: '#b18bd8' },
  { name: 'Vendas', icon: '🛒', color: '#d7aa58' },
  { name: 'Outros', icon: '💰', color: '#9ba69f' }
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES.filter(item => item.name !== 'Outros')];

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftMonth(date, offset) {
  const result = new Date(date.getFullYear(), date.getMonth() + offset, 1);
  return result;
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return isoDate(date);
}

function makeDemoState() {
  const transactions = [
    { id: createId(), type: 'income', description: 'Salário', amount: 4200, category: 'Salário', date: dateDaysAgo(16), notes: 'Pagamento mensal', isDemo: true },
    { id: createId(), type: 'expense', description: 'Mercado da semana', amount: 385.70, category: 'Alimentação', date: dateDaysAgo(15), notes: 'Compras para casa', isDemo: true },
    { id: createId(), type: 'expense', description: 'Conta de energia', amount: 168.40, category: 'Contas', date: dateDaysAgo(13), notes: '', isDemo: true },
    { id: createId(), type: 'expense', description: 'Combustível', amount: 210, category: 'Transporte', date: dateDaysAgo(11), notes: '', isDemo: true },
    { id: createId(), type: 'income', description: 'Projeto freelance', amount: 650, category: 'Freelance', date: dateDaysAgo(8), notes: 'Trabalho extra', isDemo: true },
    { id: createId(), type: 'expense', description: 'Cinema e jantar', amount: 142.90, category: 'Lazer', date: dateDaysAgo(6), notes: 'Fim de semana', isDemo: true },
    { id: createId(), type: 'expense', description: 'Farmácia', amount: 76.50, category: 'Saúde', date: dateDaysAgo(3), notes: '', isDemo: true },
    { id: createId(), type: 'expense', description: 'Internet residencial', amount: 119.90, category: 'Contas', date: dateDaysAgo(2), notes: '', isDemo: true },
    { id: createId(), type: 'expense', description: 'Curso online', amount: 89.90, category: 'Educação', date: dateDaysAgo(36), notes: 'Competência do mês anterior', isDemo: true },
    { id: createId(), type: 'income', description: 'Venda de item usado', amount: 180, category: 'Vendas', date: dateDaysAgo(42), notes: '', isDemo: true }
  ];

  return {
    version: 1,
    profile: { name: 'Visitante', currency: 'BRL', notifications: true },
    transactions,
    budget: {
      total: 2500,
      categories: {
        'Alimentação': 600, 'Transporte': 350, 'Moradia': 600, 'Saúde': 150,
        'Educação': 100, 'Lazer': 200, 'Compras': 150, 'Contas': 250, 'Outros': 100
      },
      isDemo: true
    },
    goals: [
      { id: createId(), name: 'Reserva de emergência', target: 6000, saved: 1850, deadline: `${new Date().getFullYear()}-12-31`, isDemo: true },
      { id: createId(), name: 'Novo computador', target: 4500, saved: 2100, deadline: `${new Date().getFullYear() + 1}-05-30`, isDemo: true },
      { id: createId(), name: 'Viagem de férias', target: 3200, saved: 760, deadline: `${new Date().getFullYear() + 1}-10-15`, isDemo: true }
    ]
  };
}

function normalizeState(state) {
  const defaults = {
    version: 1,
    profile: { name: 'Visitante', currency: 'BRL', notifications: true },
    transactions: [],
    budget: { total: 0, categories: {}, isDemo: false },
    goals: []
  };
  return {
    ...defaults,
    ...state,
    profile: { ...defaults.profile, ...(state.profile || {}) },
    transactions: Array.isArray(state.transactions) ? state.transactions : [],
    budget: { ...defaults.budget, ...(state.budget || {}), categories: { ...(state.budget?.categories || {}) } },
    goals: Array.isArray(state.goals) ? state.goals : []
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = makeDemoState();
      saveState(initial);
      return initial;
    }
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    console.warn('Não foi possível ler o LocalStorage. Usando memória temporária.', error);
    if (!memoryFallback) memoryFallback = makeDemoState();
    return normalizeState(memoryFallback);
  }
}

export function saveState(state) {
  const normalized = normalizeState(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.warn('Não foi possível persistir os dados no LocalStorage.', error);
    memoryFallback = normalized;
    return false;
  }
  memoryFallback = normalized;
  return true;
}

export function hasDemoData(state) {
  return Boolean(
    state.transactions.some(item => item.isDemo) ||
    state.goals.some(item => item.isDemo) ||
    state.budget.isDemo
  );
}

export function removeDemoData(state) {
  state.transactions = state.transactions.filter(item => !item.isDemo);
  state.goals = state.goals.filter(item => !item.isDemo);
  if (state.budget.isDemo) {
    state.budget = { total: 0, categories: {}, isDemo: false };
  }
  saveState(state);
  return state;
}

export function clearFinancialData(state) {
  state.transactions = [];
  state.goals = [];
  state.budget = { total: 0, categories: {}, isDemo: false };
  saveState(state);
  return state;
}

export function createId() {
  return globalThis.crypto?.randomUUID?.() || `gc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
