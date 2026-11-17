import { createId, isoDate } from './storage.js';

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);

function goalIcon(name) {
  const value = name.toLowerCase();
  if (value.includes('viagem') || value.includes('viajar')) return '✈️';
  if (value.includes('carro') || value.includes('moto')) return '🚙';
  if (value.includes('computador') || value.includes('notebook')) return '💻';
  if (value.includes('celular') || value.includes('telefone')) return '📱';
  if (value.includes('reserva') || value.includes('emergência')) return '🛟';
  if (value.includes('casa') || value.includes('moradia')) return '🏡';
  return '🎯';
}

function formatDeadline(value) {
  if (!value) return 'Prazo não definido';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'Prazo não definido' : `Até ${new Intl.DateTimeFormat('pt-BR').format(date)}`;
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function renderGoals(state) {
  const goals = state.goals;
  const savedTotal = goals.reduce((sum, goal) => sum + Number(goal.saved || 0), 0);
  const targetTotal = goals.reduce((sum, goal) => sum + Number(goal.target || 0), 0);
  document.getElementById('activeGoalsCount').textContent = goals.filter(goal => Number(goal.saved) < Number(goal.target)).length;
  document.getElementById('goalsSavedTotal').textContent = money(savedTotal);
  document.getElementById('goalsTargetTotal').textContent = money(targetTotal);
  document.getElementById('goalsEmpty').hidden = goals.length > 0;

  document.getElementById('goalsGrid').innerHTML = [...goals].sort((a, b) => (a.deadline || '').localeCompare(b.deadline || '')).map(goal => {
    const target = Number(goal.target) || 0;
    const saved = Number(goal.saved) || 0;
    const percent = target > 0 ? Math.min(saved / target * 100, 100) : 0;
    const complete = saved >= target;
    const remaining = Math.max(target - saved, 0);
    return `<article class="goal-card">
      <div class="goal-card-top"><div class="goal-title-wrap"><span class="goal-emoji">${goalIcon(goal.name)}</span><div><h3>${escapeHTML(goal.name)}</h3><p>${formatDeadline(goal.deadline)}</p></div></div>
        <div class="goal-menu"><button type="button" data-edit-goal="${goal.id}" aria-label="Editar meta" title="Editar">✎</button><button type="button" data-delete-goal="${goal.id}" aria-label="Excluir meta" title="Excluir">×</button></div>
      </div>
      <div class="goal-card-progress"><div class="goal-progress-head"><strong>${money(saved)}</strong><span>${Math.round(percent)}% de ${money(target)}</span></div><div class="progress-track"><div class="progress-fill ${complete ? '' : percent >= 80 ? 'warning' : ''}" style="width:${percent}%"></div></div><div class="goal-card-foot"><span>${complete ? '<span class="goal-complete">✓ Objetivo alcançado</span>' : `Faltam <strong>${money(remaining)}</strong>`}</span><span>${money(target)} no total</span></div></div>
      <div class="goal-actions"><button class="button button-outline button-sm" type="button" data-contribute-goal="${goal.id}" ${complete ? 'disabled' : ''}>＋ Adicionar economia</button><button class="button button-quiet button-sm" type="button" data-edit-goal="${goal.id}">Editar meta</button></div>
    </article>`;
  }).join('');
}

export function initGoals({ getState, save, onChange, notify }) {
  const goalDialog = document.getElementById('goalDialog');
  const goalForm = document.getElementById('goalForm');
  const contributeDialog = document.getElementById('contributeDialog');
  const contributeForm = document.getElementById('contributeForm');

  function openNewGoal() {
    goalForm.reset();
    document.getElementById('goalId').value = '';
    document.getElementById('goalDialogTitle').textContent = 'Nova meta financeira';
    document.getElementById('goalSaved').value = '0';
    document.getElementById('goalDeadline').min = isoDate();
    goalDialog.showModal();
    document.getElementById('goalName').focus();
  }

  function editGoal(id) {
    const goal = getState().goals.find(item => item.id === id);
    if (!goal) return;
    document.getElementById('goalId').value = goal.id;
    document.getElementById('goalName').value = goal.name;
    document.getElementById('goalTarget').value = goal.target;
    document.getElementById('goalSaved').value = goal.saved;
    document.getElementById('goalDeadline').value = goal.deadline;
    document.getElementById('goalDeadline').min = '';
    document.getElementById('goalDialogTitle').textContent = 'Editar meta financeira';
    goalDialog.showModal();
  }

  function openContribution(id) {
    const goal = getState().goals.find(item => item.id === id);
    if (!goal) return;
    const remaining = Math.max(Number(goal.target) - Number(goal.saved), 0);
    document.getElementById('contributeGoalId').value = id;
    document.getElementById('contributeGoalName').textContent = `${goal.name} · faltam ${money(remaining)} para alcançar sua meta.`;
    document.getElementById('contributeAmount').value = '';
    document.getElementById('contributeAmount').max = remaining;
    contributeDialog.showModal();
    document.getElementById('contributeAmount').focus();
  }

  document.querySelectorAll('[data-open-goal]').forEach(button => button.addEventListener('click', openNewGoal));
  goalForm.addEventListener('submit', event => {
    event.preventDefault();
    const id = document.getElementById('goalId').value;
    const name = document.getElementById('goalName').value.trim();
    const target = Number(document.getElementById('goalTarget').value);
    const saved = Number(document.getElementById('goalSaved').value || 0);
    const deadline = document.getElementById('goalDeadline').value;
    if (!name || !deadline || !Number.isFinite(target) || target <= 0 || !Number.isFinite(saved) || saved < 0) {
      notify('Preencha a meta com nome, valores válidos e prazo.', 'error');
      return;
    }
    if (saved > target) {
      notify('O valor economizado não pode ser maior que o valor desejado.', 'error');
      return;
    }
    const state = getState();
    const goal = { id: id || createId(), name, target, saved, deadline, isDemo: false };
    if (id) state.goals = state.goals.map(item => item.id === id ? goal : item);
    else state.goals.push(goal);
    save(state);
    goalDialog.close();
    notify(id ? 'Meta atualizada com sucesso.' : 'Meta criada com sucesso.');
    onChange();
  });

  contributeForm.addEventListener('submit', event => {
    event.preventDefault();
    const id = document.getElementById('contributeGoalId').value;
    const amount = Number(document.getElementById('contributeAmount').value);
    const state = getState();
    const goal = state.goals.find(item => item.id === id);
    if (!goal || !Number.isFinite(amount) || amount <= 0) {
      notify('Informe um valor válido para adicionar.', 'error');
      return;
    }
    const remaining = Number(goal.target) - Number(goal.saved);
    if (amount > remaining) {
      notify(`O valor máximo para esta meta é ${money(remaining)}.`, 'error');
      return;
    }
    goal.saved = Number(goal.saved) + amount;
    goal.isDemo = false;
    save(state);
    contributeDialog.close();
    notify(goal.saved >= goal.target ? 'Parabéns! Você alcançou sua meta financeira!' : 'Economia adicionada à meta.');
    onChange();
  });

  document.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-goal]');
    const remove = event.target.closest('[data-delete-goal]');
    const contribute = event.target.closest('[data-contribute-goal]');
    if (edit) editGoal(edit.dataset.editGoal);
    if (contribute && !contribute.disabled) openContribution(contribute.dataset.contributeGoal);
    if (remove) {
      const id = remove.dataset.deleteGoal;
      const goal = getState().goals.find(item => item.id === id);
      if (!goal || !window.confirm(`Excluir a meta "${goal.name}"?`)) return;
      const state = getState();
      state.goals = state.goals.filter(item => item.id !== id);
      save(state);
      notify('Meta excluída.');
      onChange();
    }
  });

  renderGoals(getState());
}
