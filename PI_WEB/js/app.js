import { loadState, saveState, removeDemoData, clearFinancialData, hasDemoData } from './storage.js';
import { initTransactions, renderTransactions } from './transactions.js';
import { renderDashboard } from './dashboard.js';
import { initBudget, renderBudget } from './budget.js';
import { initReports, renderReports } from './reports.js';
import { initGoals, renderGoals } from './goals.js';

let state = loadState();
let activePage = 'dashboard';

const pageLabels = {
  dashboard: { title: 'Visão geral', eyebrow: 'SEU RESUMO FINANCEIRO' },
  transactions: { title: 'Movimentações', eyebrow: 'ENTRADAS E SAÍDAS' },
  budget: { title: 'Orçamento', eyebrow: 'PLANEJE SEUS GASTOS' },
  reports: { title: 'Relatórios', eyebrow: 'ANÁLISE FINANCEIRA' },
  goals: { title: 'Metas financeiras', eyebrow: 'SEUS PLANOS, SEU FUTURO' },
  settings: { title: 'Configurações', eyebrow: 'PREFERÊNCIAS DA CONTA' }
};

function getState() { return state; }
function persist(nextState = state) {
  state = nextState;
  const saved = saveState(state);
  if (!saved) notify('Não foi possível salvar no navegador. Verifique o espaço disponível.', 'error');
}

function notify(message, type = 'success') {
  if (!state.profile.notifications && type !== 'error') return;
  const region = document.getElementById('toastRegion');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  const icon = type === 'error' ? '!' : '✓';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${escapeHTML(message)}</span>`;
  region.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(5px)';
    window.setTimeout(() => toast.remove(), 220);
  }, 3400);
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function renderCurrentPage() {
  switch (activePage) {
    case 'dashboard': renderDashboard(state); break;
    case 'transactions': renderTransactions(state); break;
    case 'budget': renderBudget(state); break;
    case 'reports': renderReports(state); break;
    case 'goals': renderGoals(state); break;
    case 'settings': renderSettings(); break;
    default: renderDashboard(state);
  }
}

function renderAllVisible() {
  // Atualiza os módulos sem recriar gráficos que estejam em páginas ocultas.
  if (activePage === 'dashboard') renderDashboard(state);
  if (activePage === 'transactions') renderTransactions(state);
  if (activePage === 'budget') renderBudget(state);
  if (activePage === 'reports') renderReports(state);
  if (activePage === 'goals') renderGoals(state);
  if (activePage === 'settings') renderSettings();
  document.getElementById('demoIndicator').hidden = !hasDemoData(state);
}

function renderSettings() {
  document.getElementById('profileName').value = state.profile.name || '';
  document.getElementById('profileCurrency').value = state.profile.currency || 'BRL';
  document.getElementById('notificationsToggle').checked = state.profile.notifications !== false;
  const demoActive = hasDemoData(state);
  document.getElementById('demoStatus').textContent = demoActive ? 'Ativos' : 'Removidos';
  document.getElementById('removeDemoData').disabled = !demoActive;
  document.getElementById('removeDemoData').textContent = demoActive ? 'Remover dados de exemplo' : 'Nenhum exemplo ativo';
}

function navigate(page) {
  if (!pageLabels[page]) return;
  activePage = page;
  document.querySelectorAll('[data-section]').forEach(section => {
    const isActive = section.dataset.section === page;
    section.hidden = !isActive;
    section.classList.toggle('active', isActive);
  });
  document.querySelectorAll('.nav-item[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === page));
  document.getElementById('pageTitle').textContent = pageLabels[page].title;
  document.getElementById('topbarEyebrow').textContent = pageLabels[page].eyebrow;
  renderCurrentPage();
  closeSidebar();
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('visible');
  document.getElementById('menuToggle').setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('visible');
  document.getElementById('menuToggle').setAttribute('aria-expanded', 'false');
}

function setupNavigation() {
  document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.page)));
  document.querySelectorAll('[data-page-link]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    navigate(link.dataset.pageLink);
  }));
  document.querySelectorAll('[data-go-page]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.goPage)));
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.contains('open') ? closeSidebar() : openSidebar();
  });
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSidebar(); });
}

function setupSettings() {
  document.getElementById('profileForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = document.getElementById('profileName').value.trim();
    if (!name) {
      notify('Informe um nome para o perfil.', 'error');
      return;
    }
    state.profile.name = name;
    state.profile.currency = document.getElementById('profileCurrency').value;
    persist(state);
    notify('Perfil atualizado com sucesso.');
    renderAllVisible();
  });

  document.getElementById('notificationsToggle').addEventListener('change', event => {
    state.profile.notifications = event.target.checked;
    persist(state);
    if (event.target.checked) notify('Notificações visuais ativadas.');
  });

  document.getElementById('removeDemoData').addEventListener('click', () => {
    if (!hasDemoData(state)) return;
    const confirmed = window.confirm('Remover todos os dados de demonstração? Movimentações, metas e orçamento cadastrados por você serão preservados.');
    if (!confirmed) return;
    removeDemoData(state);
    notify('Dados de demonstração removidos.');
    renderAllVisible();
  });

  document.getElementById('clearAllData').addEventListener('click', () => {
    const confirmed = window.confirm('Tem certeza de que deseja apagar todas as movimentações, metas e informações de orçamento? Esta ação não pode ser desfeita.');
    if (!confirmed) return;
    clearFinancialData(state);
    notify('Dados financeiros removidos.');
    renderAllVisible();
  });
}

function updateDateLabel() {
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
  document.getElementById('todayDate').textContent = today.charAt(0).toUpperCase() + today.slice(1);
}

function setupDialogBackdrop() {
  document.querySelectorAll('.app-dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
  });
}

function initialize() {
  updateDateLabel();
  setupNavigation();
  setupDialogBackdrop();

  const shared = { getState, save: persist, onChange: renderAllVisible, notify };
  initTransactions(shared);
  initBudget(shared);
  initReports({ getState });
  initGoals(shared);
  setupSettings();
  renderSettings();
  renderDashboard(state);
  document.getElementById('demoIndicator').hidden = !hasDemoData(state);

  // Facilita a inspeção didática do estado sem expor dados fora do próprio navegador.
  window.gastoConsciente = Object.freeze({ version: 1, storageKey: 'gastoConsciente.v1' });
}

initialize();
