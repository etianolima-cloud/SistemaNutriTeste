const { Pool } = require('pg');
require('dotenv').config();

// Obtém a URL de conexão do PostgreSQL (Vercel Postgres, Neon ou DATABASE_URL)
const connectionString = 
  process.env.POSTGRES_URL || 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.POSTGRES_URL_NON_POOLING || 
  process.env.DATABASE_URL;

let pool = null;
let isConnectedToPostgres = false;

if (connectionString) {
  try {
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    isConnectedToPostgres = true;
  } catch (err) {
    console.error('Erro ao configurar Pool PostgreSQL:', err);
  }
}

// ====================================================================
// BASE DE DADOS EM MEMÓRIA (FALLBACK RESILIENTE CASO AINDA NÃO TENHA POSTGRES_URL CONFIGURADO)
// Permite que o sistema execute sem erros no primeiro deploy enquanto o usuário ativa o banco
// ====================================================================
let memoryDocentes = [
  { nif: 1001, nome: 'Prof. Carlos Eduardo Silva', senha: '123456' },
  { nif: 1002, nome: 'Profa. Mariana Costa Oliveira', senha: '123456' },
  { nif: 1003, nome: 'Prof. Roberto Fernandes', senha: '123456' }
];

let memoryAlunos = [
  { matricula: 202401, nome: 'Ana Beatriz Santos' },
  { matricula: 202402, nome: 'Bruno Henrique Lima' },
  { matricula: 202403, nome: 'Camila Rodrigues Alves' },
  { matricula: 202404, nome: 'Daniel Martins Pereira' },
  { matricula: 202405, nome: 'Eduardo Souza Gomes' },
  { matricula: 202406, nome: 'Fernanda Ribeiro Castro' },
  { matricula: 202407, nome: 'Gabriel Almeida Costa' },
  { matricula: 202408, nome: 'Helena Carvalho Duarte' }
];

let memoryTurmas = [
  {
    codigo: 101,
    nome_curso: 'Desenvolvimento Web Full Stack',
    quantidade_maxima: 30,
    empresa: false,
    nome_empresa: null,
    turno: 'Noite',
    data_inicio: '2026-02-01',
    data_fim: '2026-12-15'
  },
  {
    codigo: 102,
    nome_curso: 'Banco de Dados & Cloud Computing',
    quantidade_maxima: 25,
    empresa: true,
    nome_empresa: 'TechCorp Soluções',
    turno: 'Manhã',
    data_inicio: '2026-03-01',
    data_fim: '2026-08-30'
  },
  {
    codigo: 103,
    nome_curso: 'Inteligência Artificial Aplicada',
    quantidade_maxima: 20,
    empresa: false,
    nome_empresa: null,
    turno: 'Tarde',
    data_inicio: '2026-04-01',
    data_fim: '2026-11-20'
  }
];

let memoryProfessorTurma = [
  { id: 1, codigo_turma: 101, nif_docente: 1001, status_diario: 'Em Andamento' },
  { id: 2, codigo_turma: 102, nif_docente: 1001, status_diario: 'Pendente' },
  { id: 3, codigo_turma: 103, nif_docente: 1002, status_diario: 'Pendente' }
];

let memoryAlunoTurma = [
  { id: 1, codigo_turma_aluno: 101, matricula_aluno: 202401, status_final: 'Cursando', nota: 9.5, presenca: true, total_faltas: 0 },
  { id: 2, codigo_turma_aluno: 101, matricula_aluno: 202402, status_final: 'Cursando', nota: 8.0, presenca: true, total_faltas: 1 },
  { id: 3, codigo_turma_aluno: 101, matricula_aluno: 202403, status_final: 'Cursando', nota: 7.5, presenca: true, total_faltas: 2 },
  { id: 4, codigo_turma_aluno: 101, matricula_aluno: 202404, status_final: 'Cursando', nota: 5.0, presenca: false, total_faltas: 4 },
  { id: 5, codigo_turma_aluno: 101, matricula_aluno: 202405, status_final: 'Cursando', nota: 8.5, presenca: true, total_faltas: 1 },
  { id: 6, codigo_turma_aluno: 102, matricula_aluno: 202406, status_final: 'Cursando', nota: 9.0, presenca: true, total_faltas: 0 },
  { id: 7, codigo_turma_aluno: 102, matricula_aluno: 202407, status_final: 'Cursando', nota: 6.5, presenca: true, total_faltas: 2 },
  { id: 8, codigo_turma_aluno: 102, matricula_aluno: 202408, status_final: 'Cursando', nota: 8.0, presenca: true, total_faltas: 1 }
];

let memoryDiarioRegistro = [];

/**
 * Executa uma consulta SQL no Postgres real ou no banco em memória caso desconectado
 */
async function query(text, params = []) {
  if (pool) {
    try {
      const res = await pool.query(text, params);
      return res;
    } catch (err) {
      console.warn('Falha na query PostgreSQL, avaliando fallback...', err.message);
      // Se a tabela ainda não foi criada, não explode a aplicação
      throw err;
    }
  }

  // Se não houver pool de conexão configurada
  return null;
}

module.exports = {
  pool,
  query,
  isLiveDatabase: !!connectionString,
  memory: {
    docentes: memoryDocentes,
    alunos: memoryAlunos,
    turmas: memoryTurmas,
    professorTurma: memoryProfessorTurma,
    alunoTurma: memoryAlunoTurma,
    diarioRegistro: memoryDiarioRegistro
  }
};
