/**
 * EduDiário • Lógica do Diário Escolar Eletrônico
 * Integração com Vercel Postgres e endpoints Serverless
 */

// Estado Global da Aplicação
const state = {
  currentUser: null,
  turmas: [],
  currentTurma: null,
  alunos: [],
  dataAula: new Date().toISOString().split('T')[0],
  isLiveDatabase: false
};

// ====================================================================
// INICIALIZAÇÃO
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  checkDatabaseStatus();
  checkSavedSession();
  
  // Define a data de hoje no input de aula
  const dateInput = document.getElementById('input-data-aula');
  if (dateInput) {
    dateInput.value = state.dataAula;
  }
});

// Helper de preenchimento rápido para demonstração
window.preencherLogin = function(nif, senha) {
  document.getElementById('input-nif').value = nif;
  document.getElementById('input-senha').value = senha;
};

// ====================================================================
// EVENT LISTENERS
// ====================================================================
function setupEventListeners() {
  // Formulário de Login
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', handleLogin);
  }

  // Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  }

  // Voltar para turmas
  const btnVoltar = document.getElementById('btn-voltar-turmas');
  if (btnVoltar) {
    btnVoltar.addEventListener('click', () => switchView('turmas'));
  }

  // Filtro de turmas
  const filterTurmas = document.getElementById('filter-turmas');
  if (filterTurmas) {
    filterTurmas.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = state.turmas.filter(t => 
        t.nome_curso.toLowerCase().includes(term) || 
        String(t.codigo).includes(term) ||
        (t.nome_empresa && t.nome_empresa.toLowerCase().includes(term))
      );
      renderTurmasGrid(filtered);
    });
  }

  // Filtro de alunos
  const filterAlunos = document.getElementById('filter-alunos');
  if (filterAlunos) {
    filterAlunos.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase();
      const filtered = state.alunos.filter(a => 
        a.nome.toLowerCase().includes(term) || 
        String(a.matricula).includes(term)
      );
      renderAlunosTable(filtered);
    });
  }

  // Troca de data da aula
  const inputDataAula = document.getElementById('input-data-aula');
  if (inputDataAula) {
    inputDataAula.addEventListener('change', (e) => {
      state.dataAula = e.target.value;
      if (state.currentTurma) {
        carregarDetalhesTurma(state.currentTurma.codigo, state.dataAula);
      }
    });
  }

  // Marcar todos presentes
  const btnTodosPresentes = document.getElementById('btn-marcar-todos-presentes');
  if (btnTodosPresentes) {
    btnTodosPresentes.addEventListener('click', marcarTodosPresentes);
  }

  // Salvar Diário
  const btnSalvar = document.getElementById('btn-salvar-diario');
  if (btnSalvar) {
    btnSalvar.addEventListener('click', salvarDiario);
  }

  // Modal de Sincronização SQL
  const btnSyncModal = document.getElementById('btn-sync-db');
  const modalSync = document.getElementById('modal-sync');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelSync = document.getElementById('btn-cancel-sync');
  const btnExecuteSync = document.getElementById('btn-execute-sync');

  if (btnSyncModal && modalSync) {
    btnSyncModal.addEventListener('click', () => {
      modalSync.classList.remove('hidden');
      atualizarInfoModalSync();
    });
  }

  if (btnCloseModal && modalSync) {
    btnCloseModal.addEventListener('click', () => modalSync.classList.add('hidden'));
  }
  if (btnCancelSync && modalSync) {
    btnCancelSync.addEventListener('click', () => modalSync.classList.add('hidden'));
  }
  if (btnExecuteSync) {
    btnExecuteSync.addEventListener('click', executarSincronizacaoSQL);
  }
}

// ====================================================================
// AUTENTICAÇÃO E SESSÃO
// ====================================================================
function checkSavedSession() {
  const saved = localStorage.getItem('edudiario_user');
  if (saved) {
    try {
      state.currentUser = JSON.parse(saved);
      atualizarInterfaceUsuario();
      switchView('turmas');
      carregarTurmas();
    } catch (_) {
      localStorage.removeItem('edudiario_user');
      switchView('login');
    }
  } else {
    switchView('login');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const alertBox = document.getElementById('login-alert');
  const btnSubmit = document.getElementById('btn-submit-login');
  alertBox.classList.add('hidden');

  const nif = document.getElementById('input-nif').value.trim();
  const senha = document.getElementById('input-senha').value;

  if (!nif || !senha) {
    alertBox.textContent = 'Por favor, preencha o NIF e a Senha.';
    alertBox.classList.remove('hidden');
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span>Verificando...</span>';

  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nif, senha })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Credenciais inválidas.');
    }

    state.currentUser = data.docente;
    state.isLiveDatabase = !!data.isLiveDatabase;
    localStorage.setItem('edudiario_user', JSON.stringify(data.docente));

    atualizarInterfaceUsuario();
    atualizarBadgeBanco(data.isLiveDatabase);
    showToast(`Bem-vindo, ${data.docente.nome}!`, 'success');

    switchView('turmas');
    carregarTurmas();
  } catch (err) {
    alertBox.textContent = err.message;
    alertBox.classList.remove('hidden');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `
      <span>Entrar no Diário</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    `;
  }
}

function handleLogout() {
  state.currentUser = null;
  state.turmas = [];
  state.currentTurma = null;
  state.alunos = [];
  localStorage.removeItem('edudiario_user');
  switchView('login');
  showToast('Sessão encerrada com sucesso.', 'info');
}

function atualizarInterfaceUsuario() {
  if (!state.currentUser) return;
  document.getElementById('user-display-name').textContent = state.currentUser.nome;
  document.getElementById('user-display-nif').textContent = `NIF: ${state.currentUser.nif}`;
  document.getElementById('banner-prof-nome').textContent = state.currentUser.nome.split(' ')[0] + ' ' + (state.currentUser.nome.split(' ')[1] || '');
  document.getElementById('user-avatar').textContent = state.currentUser.nome.charAt(0);
}

// ====================================================================
// NAVEGAÇÃO DE TELAS
// ====================================================================
function switchView(viewName) {
  const header = document.getElementById('global-header');
  const viewLogin = document.getElementById('view-login');
  const viewTurmas = document.getElementById('view-turmas');
  const viewDiario = document.getElementById('view-diario');

  viewLogin.classList.add('hidden');
  viewTurmas.classList.add('hidden');
  viewDiario.classList.add('hidden');

  if (viewName === 'login') {
    header.classList.add('hidden');
    viewLogin.classList.remove('hidden');
  } else if (viewName === 'turmas') {
    header.classList.remove('hidden');
    viewTurmas.classList.remove('hidden');
  } else if (viewName === 'diario') {
    header.classList.remove('hidden');
    viewDiario.classList.remove('hidden');
  }
}

// ====================================================================
// CARREGAMENTO E RENDERIZAÇÃO DAS TURMAS
// ====================================================================
async function carregarTurmas() {
  if (!state.currentUser) return;

  const turmasGrid = document.getElementById('turmas-grid');
  const emptyState = document.getElementById('turmas-empty');
  turmasGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">Carregando turmas...</div>';
  emptyState.classList.add('hidden');

  try {
    const res = await fetch(`/api/turmas?nif=${state.currentUser.nif}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Erro ao buscar turmas.');
    }

    state.turmas = data.turmas || [];
    state.isLiveDatabase = !!data.isLiveDatabase;
    atualizarBadgeBanco(data.isLiveDatabase);

    // Atualiza contadores do banner
    document.getElementById('stat-total-turmas').textContent = state.turmas.length;
    const totalAlunos = state.turmas.reduce((acc, t) => acc + (parseInt(t.total_alunos) || 0), 0);
    document.getElementById('stat-total-alunos').textContent = totalAlunos;
    const pendentes = state.turmas.filter(t => t.status_diario === 'Pendente').length;
    document.getElementById('stat-diarios-pendentes').textContent = pendentes;

    renderTurmasGrid(state.turmas);
  } catch (err) {
    turmasGrid.innerHTML = '';
    showToast(err.message, 'error');
  }
}

function renderTurmasGrid(turmasList) {
  const turmasGrid = document.getElementById('turmas-grid');
  const emptyState = document.getElementById('turmas-empty');

  if (turmasList.length === 0) {
    turmasGrid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  turmasGrid.innerHTML = turmasList.map(turma => {
    let statusClass = 'status-pendente';
    if (turma.status_diario === 'Em Dia') statusClass = 'status-em-dia';
    if (turma.status_diario === 'Em Andamento') statusClass = 'status-andamento';

    return `
      <div class="turma-card" onclick="abrirTurma(${turma.codigo})">
        <div>
          <div class="turma-card-top">
            <span class="turma-code-badge">Código #${turma.codigo}</span>
            <span class="turma-status-badge ${statusClass}">${turma.status_diario || 'Pendente'}</span>
          </div>

          <div class="turma-card-body">
            <h4>${turma.nome_curso}</h4>
            <div class="turma-card-meta">
              <div class="meta-row">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Turno: <strong>${turma.turno}</strong></span>
              </div>
              <div class="meta-row">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>${formatarData(turma.data_inicio)} até ${formatarData(turma.data_fim)}</span>
              </div>
              ${turma.empresa ? `
                <div class="company-badge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  <span>${turma.nome_empresa || 'Empresa Conveniada'}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="turma-card-footer">
          <span class="turma-capacity">Alunos: <strong>${turma.total_alunos || 0}</strong> / ${turma.quantidade_maxima}</span>
          <span class="btn-open-diario">
            Abrir Diário
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// ====================================================================
// DETALHES DA TURMA E DIÁRIO DE CLASSE (CHAMADA E NOTAS)
// ====================================================================
window.abrirTurma = function(codigo) {
  carregarDetalhesTurma(codigo, state.dataAula);
};

async function carregarDetalhesTurma(codigo, dataAula) {
  try {
    const res = await fetch(`/api/turma-detalhes?codigo=${codigo}&data=${dataAula}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Erro ao carregar dados da turma.');
    }

    state.currentTurma = data.turma;
    state.alunos = data.alunos || [];
    state.dataAula = data.dataAula;

    atualizarCabecalhoTurma(data.turma);
    renderAlunosTable(state.alunos);
    atualizarMetricasTurma();

    switchView('diario');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function atualizarCabecalhoTurma(turma) {
  document.getElementById('diario-turma-codigo').textContent = `Turma #${turma.codigo}`;
  document.getElementById('diario-turma-turno').textContent = `Turno: ${turma.turno}`;
  document.getElementById('diario-turma-nome').textContent = turma.nome_curso;
  document.getElementById('diario-turma-periodo').textContent = `Período: ${formatarData(turma.data_inicio)} a ${formatarData(turma.data_fim)}`;
  document.getElementById('diario-turma-capacidade').textContent = `Capacidade Máxima: ${turma.quantidade_maxima} alunos`;

  const tagEmpresa = document.getElementById('diario-turma-empresa');
  if (turma.empresa) {
    tagEmpresa.textContent = `Convênio: ${turma.nome_empresa || 'Empresa'}`;
    tagEmpresa.classList.remove('hidden');
  } else {
    tagEmpresa.classList.add('hidden');
  }
}

function renderAlunosTable(alunosList) {
  const tbody = document.getElementById('alunos-table-body');
  const emptyState = document.getElementById('alunos-empty');

  if (alunosList.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  tbody.innerHTML = alunosList.map(aluno => {
    const presencaBool = aluno.presenca !== false;
    const notaVal = aluno.nota !== null && aluno.nota !== undefined ? parseFloat(aluno.nota) : '';
    let notaClass = '';
    if (notaVal !== '') {
      notaClass = notaVal >= 6.0 ? 'nota-aprovado' : 'nota-recuperacao';
    }

    const initials = aluno.nome.split(' ').map(n => n[0]).slice(0, 2).join('');

    return `
      <tr data-matricula="${aluno.matricula}">
        <td>
          <span class="aluno-matricula-badge">#${aluno.matricula}</span>
        </td>
        <td>
          <div class="aluno-nome-cell">
            <div class="aluno-avatar-initials">${initials}</div>
            <strong>${aluno.nome}</strong>
          </div>
        </td>
        <td>
          <span class="aluno-status-badge">${aluno.status_final || 'Cursando'}</span>
        </td>
        <td style="text-align: center;">
          <div class="presence-switch-container">
            <button type="button" 
                    class="presence-btn-toggle ${presencaBool ? 'presente' : 'ausente'}" 
                    onclick="alternarPresenca(${aluno.matricula})">
              <span>${presencaBool ? '✓ Presente' : '✕ Ausente'}</span>
            </button>
          </div>
        </td>
        <td style="text-align: center;">
          <div class="input-nota-wrapper">
            <input type="number" 
                   step="0.1" 
                   min="0" 
                   max="10" 
                   class="input-nota ${notaClass}" 
                   value="${notaVal}" 
                   placeholder="--" 
                   oninput="atualizarNotaAluno(${aluno.matricula}, this)">
          </div>
        </td>
        <td style="text-align: center;">
          <span class="faltas-badge ${(aluno.total_faltas || 0) > 3 ? 'faltas-alta' : ''}">
            ${aluno.total_faltas || 0}
          </span>
        </td>
        <td>
          <input type="text" 
                 class="input-obs" 
                 placeholder="Observações da aula..." 
                 value="${aluno.observacao || ''}" 
                 onchange="atualizarObsAluno(${aluno.matricula}, this.value)">
        </td>
      </tr>
    `;
  }).join('');
}

// Alterna presença no clique
window.alternarPresenca = function(matricula) {
  const aluno = state.alunos.find(a => a.matricula === matricula);
  if (!aluno) return;

  aluno.presenca = !aluno.presenca;
  
  // Atualiza botão na DOM diretamente para alta responsividade
  const row = document.querySelector(`tr[data-matricula="${matricula}"]`);
  if (row) {
    const btn = row.querySelector('.presence-btn-toggle');
    if (aluno.presenca) {
      btn.className = 'presence-btn-toggle presente';
      btn.innerHTML = '<span>✓ Presente</span>';
    } else {
      btn.className = 'presence-btn-toggle ausente';
      btn.innerHTML = '<span>✕ Ausente</span>';
    }
  }

  atualizarMetricasTurma();
};

// Atualiza nota do aluno
window.atualizarNotaAluno = function(matricula, inputEl) {
  let val = inputEl.value.trim();
  const aluno = state.alunos.find(a => a.matricula === matricula);
  if (!aluno) return;

  if (val === '') {
    aluno.nota = null;
    inputEl.className = 'input-nota';
  } else {
    let num = parseFloat(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 10) num = 10;
    aluno.nota = num;

    if (num >= 6.0) {
      inputEl.className = 'input-nota nota-aprovado';
    } else {
      inputEl.className = 'input-nota nota-recuperacao';
    }
  }

  atualizarMetricasTurma();
};

window.atualizarObsAluno = function(matricula, val) {
  const aluno = state.alunos.find(a => a.matricula === matricula);
  if (aluno) {
    aluno.observacao = val;
  }
};

function marcarTodosPresentes() {
  state.alunos.forEach(a => a.presenca = true);
  renderAlunosTable(state.alunos);
  atualizarMetricasTurma();
  showToast('Todos os alunos foram marcados como presentes.', 'info');
}

function atualizarMetricasTurma() {
  if (state.alunos.length === 0) {
    document.getElementById('metric-media-turma').textContent = '0.0';
    document.getElementById('metric-taxa-presenca').textContent = '0%';
    return;
  }

  // Calcula Presença
  const presentes = state.alunos.filter(a => a.presenca !== false).length;
  const taxaPresenca = Math.round((presentes / state.alunos.length) * 100);
  document.getElementById('metric-taxa-presenca').textContent = `${taxaPresenca}%`;

  // Calcula Média
  const comNota = state.alunos.filter(a => a.nota !== null && a.nota !== undefined && !isNaN(a.nota));
  if (comNota.length > 0) {
    const soma = comNota.reduce((acc, a) => acc + parseFloat(a.nota), 0);
    const media = (soma / comNota.length).toFixed(1);
    document.getElementById('metric-media-turma').textContent = media;
  } else {
    document.getElementById('metric-media-turma').textContent = '--';
  }
}

// ====================================================================
// SALVAR DIÁRIO (PERSISTÊNCIA SQL NO VERCEL)
// ====================================================================
async function salvarDiario() {
  if (!state.currentTurma || !state.currentUser) return;

  const btnSalvar = document.getElementById('btn-salvar-diario');
  btnSalvar.disabled = true;
  btnSalvar.innerHTML = '<span>Salvando...</span>';

  const payload = {
    codigo_turma: state.currentTurma.codigo,
    nif_docente: state.currentUser.nif,
    data_aula: state.dataAula,
    status_diario: 'Em Dia',
    registros: state.alunos.map(a => ({
      matricula: a.matricula,
      presenca: a.presenca !== false,
      nota: a.nota,
      observacao: a.observacao || ''
    }))
  };

  try {
    const res = await fetch('/api/salvar-diario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Erro ao salvar o diário.');
    }

    state.isLiveDatabase = !!data.isLiveDatabase;
    atualizarBadgeBanco(data.isLiveDatabase);

    showToast(data.message || 'Presenças e notas salvas com sucesso!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      <span>Salvar Diário</span>
    `;
  }
}

// ====================================================================
// STATUS DO BANCO E SINCRONIZAÇÃO SQL (VERCEL POSTGRES)
// ====================================================================
async function checkDatabaseStatus() {
  try {
    const res = await fetch('/api/setup-db');
    const data = await res.json();
    atualizarBadgeBanco(data.isLiveDatabase);
    state.isLiveDatabase = !!data.isLiveDatabase;
  } catch (_) {
    atualizarBadgeBanco(false);
  }
}

function atualizarBadgeBanco(isLive) {
  const badge = document.getElementById('db-status-badge');
  if (!badge) return;

  badge.className = 'badge-status-db';
  if (isLive) {
    badge.classList.add('badge-live');
    badge.innerHTML = '<span class="status-dot"></span><span>Vercel Postgres Ativo</span>';
  } else {
    badge.classList.add('badge-demo');
    badge.innerHTML = '<span class="status-dot"></span><span>Modo Demonstração (Local)</span>';
  }
}

function atualizarInfoModalSync() {
  const infoEl = document.getElementById('modal-db-status-info');
  const feedbackEl = document.getElementById('modal-sync-feedback');
  feedbackEl.classList.add('hidden');

  if (state.isLiveDatabase) {
    infoEl.innerHTML = '<strong>Status:</strong> 🟢 Conectado ao Vercel Postgres via <code>POSTGRES_URL</code>. O script irá criar as tabelas e dados no banco remoto.';
  } else {
    infoEl.innerHTML = '<strong>Status:</strong> 🟡 Em modo local/memória. Para gravar diretamente no Vercel Postgres, ative a integração Storage no dashboard do projeto <code>nutriteste</code>.';
  }
}

async function executarSincronizacaoSQL() {
  const btn = document.getElementById('btn-execute-sync');
  const feedback = document.getElementById('modal-sync-feedback');

  btn.disabled = true;
  btn.innerHTML = '<span>Executando SQL...</span>';
  feedback.classList.add('hidden');

  try {
    const res = await fetch('/api/setup-db', { method: 'POST' });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Erro ao sincronizar tabelas.');
    }

    feedback.className = 'sync-feedback sync-success';
    feedback.innerHTML = `<strong>Sucesso:</strong> ${data.message}`;
    feedback.classList.remove('hidden');

    state.isLiveDatabase = !!data.isLiveDatabase;
    atualizarBadgeBanco(data.isLiveDatabase);

    showToast('Tabelas SQL sincronizadas com sucesso!', 'success');
  } catch (err) {
    feedback.className = 'sync-feedback sync-error';
    feedback.innerHTML = `<strong>Erro:</strong> ${err.message}`;
    feedback.classList.remove('hidden');
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Executar Criação das Tabelas SQL</span>';
  }
}

// ====================================================================
// NOTIFICAÇÕES TOAST
// ====================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';

  toast.innerHTML = `<span><strong>${icon}</strong> ${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function formatarData(dataIso) {
  if (!dataIso) return '--/--/----';
  const parts = dataIso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataIso;
}
