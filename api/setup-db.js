const fs = require('fs');
const path = require('path');
const db = require('./db');

module.exports = async (req, res) => {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!db.pool) {
      return res.status(200).json({
        success: true,
        isLiveDatabase: false,
        message: 'Ambiente executando em modo de dados local/em memória. Para persistir no Vercel Postgres, vincule o Store no dashboard da Vercel para injetar a variável POSTGRES_URL.'
      });
    }

    const schemaPath = path.join(process.cwd(), 'schema.sql');
    let sql = '';
    if (fs.existsSync(schemaPath)) {
      sql = fs.readFileSync(schemaPath, 'utf8');
    } else {
      sql = `
        CREATE TABLE IF NOT EXISTS Docente (
            Nif INTEGER PRIMARY KEY,
            Nome VARCHAR(150) NOT NULL,
            Senha VARCHAR(255) NOT NULL DEFAULT '123456'
        );
        CREATE TABLE IF NOT EXISTS Aluno (
            Matricula INTEGER PRIMARY KEY,
            Nome VARCHAR(150) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS Turma (
            Codigo INTEGER PRIMARY KEY,
            Nome_Curso VARCHAR(150) NOT NULL,
            Quantidade_maxima INTEGER NOT NULL CHECK (Quantidade_maxima > 0),
            Empresa BOOLEAN NOT NULL DEFAULT FALSE,
            Nome_Empresa VARCHAR(150),
            Turno VARCHAR(20) NOT NULL,
            Data_Inicio DATE NOT NULL,
            Data_Fim DATE NOT NULL
        );
        CREATE TABLE IF NOT EXISTS Professor_Turma (
            ID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            Codigo_Turma INTEGER NOT NULL REFERENCES Turma(Codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
            Nif_Docente INTEGER NOT NULL REFERENCES Docente(Nif) ON UPDATE CASCADE ON DELETE RESTRICT,
            Status_Diario VARCHAR(50) NOT NULL DEFAULT 'Pendente',
            CONSTRAINT uq_professor_turma UNIQUE (Codigo_Turma, Nif_Docente)
        );
        CREATE TABLE IF NOT EXISTS Aluno_Turma (
            ID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            Codigo_Turma_Aluno INTEGER NOT NULL REFERENCES Turma(Codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
            Matricula_Aluno INTEGER NOT NULL REFERENCES Aluno(Matricula) ON UPDATE CASCADE ON DELETE RESTRICT,
            Status_Final VARCHAR(50) NOT NULL DEFAULT 'Cursando',
            Nota NUMERIC(4,2),
            Presenca BOOLEAN NOT NULL DEFAULT TRUE,
            Total_Faltas INTEGER NOT NULL DEFAULT 0,
            CONSTRAINT uq_aluno_turma UNIQUE (Codigo_Turma_Aluno, Matricula_Aluno)
        );
        CREATE TABLE IF NOT EXISTS Diario_Registro (
            ID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            Codigo_Turma INTEGER NOT NULL REFERENCES Turma(Codigo) ON DELETE CASCADE,
            Matricula_Aluno INTEGER NOT NULL REFERENCES Aluno(Matricula) ON DELETE CASCADE,
            Nif_Docente INTEGER NOT NULL REFERENCES Docente(Nif),
            Data_Aula DATE NOT NULL DEFAULT CURRENT_DATE,
            Presenca BOOLEAN NOT NULL DEFAULT TRUE,
            Nota NUMERIC(4,2),
            Observacao VARCHAR(255),
            Data_Registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_diario_aula_aluno UNIQUE (Codigo_Turma, Matricula_Aluno, Data_Aula)
        );
      `;
    }

    await db.pool.query(sql);

    return res.status(200).json({
      success: true,
      isLiveDatabase: true,
      message: 'Esquema de banco de dados executado e sincronizado com sucesso no Vercel Postgres!'
    });
  } catch (err) {
    console.error('Erro ao executar setup do banco:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
