-- ====================================================================
-- ESQUEMA DE BANCO DE DADOS: SISTEMA DE GESTÃO ESCOLAR
-- Dialeto / Ambiente: Vercel Postgres (PostgreSQL)
-- ====================================================================

-- 1. TABELA: Docente
-- Identificador principal: Nif (INTEIRO)
CREATE TABLE IF NOT EXISTS Docente (
    Nif INTEGER PRIMARY KEY,
    Nome VARCHAR(150) NOT NULL
);

-- 2. TABELA: Aluno
-- Identificador principal: Matricula (INTEIRO)
CREATE TABLE IF NOT EXISTS Aluno (
    Matricula INTEGER PRIMARY KEY,
    Nome VARCHAR(150) NOT NULL
);

-- 3. TABELA: Turma
-- Identificador principal: Codigo (INTEIRO)
CREATE TABLE IF NOT EXISTS Turma (
    Codigo INTEGER PRIMARY KEY,
    Nome_Curso VARCHAR(150) NOT NULL,
    Quantidade_maxima INTEGER NOT NULL CHECK (Quantidade_maxima > 0),
    Empresa BOOLEAN NOT NULL DEFAULT FALSE,
    Nome_Empresa VARCHAR(150),
    Turno VARCHAR(20) NOT NULL CHECK (Turno IN ('Manhã', 'Tarde', 'Noite', 'Integral')),
    Data_Inicio DATE NOT NULL,
    Data_Fim DATE NOT NULL CHECK (Data_Fim >= Data_Inicio)
);

-- 4. TABELA ASSOCIATIVA: Professor_Turma (turma_docente)
-- Relaciona Docente e Turma
-- Identificador primário: ID (INTEIRO com auto-incremento)
CREATE TABLE IF NOT EXISTS Professor_Turma (
    ID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Codigo_Turma INTEGER NOT NULL,
    Nif_Docente INTEGER NOT NULL,
    Status_Diario VARCHAR(50) NOT NULL DEFAULT 'Pendente',
    CONSTRAINT fk_professor_turma_turma FOREIGN KEY (Codigo_Turma) 
        REFERENCES Turma(Codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_professor_turma_docente FOREIGN KEY (Nif_Docente) 
        REFERENCES Docente(Nif) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_professor_turma UNIQUE (Codigo_Turma, Nif_Docente)
);

-- 5. TABELA ASSOCIATIVA: Aluno_Turma (turma_aluno)
-- Relaciona Aluno e Turma
-- Identificador primário: ID (INTEIRO com auto-incremento)
CREATE TABLE IF NOT EXISTS Aluno_Turma (
    ID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Codigo_Turma_Aluno INTEGER NOT NULL,
    Matricula_Aluno INTEGER NOT NULL,
    Status_Final VARCHAR(50) NOT NULL DEFAULT 'Cursando',
    CONSTRAINT fk_aluno_turma_turma FOREIGN KEY (Codigo_Turma_Aluno) 
        REFERENCES Turma(Codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_aluno_turma_aluno FOREIGN KEY (Matricula_Aluno) 
        REFERENCES Aluno(Matricula) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_aluno_turma UNIQUE (Codigo_Turma_Aluno, Matricula_Aluno)
);

-- ====================================================================
-- ÍNDICES PARA OTIMIZAÇÃO DE BUSCAS E JOINS
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_professor_turma_turma ON Professor_Turma(Codigo_Turma);
CREATE INDEX IF NOT EXISTS idx_professor_turma_docente ON Professor_Turma(Nif_Docente);
CREATE INDEX IF NOT EXISTS idx_aluno_turma_turma ON Aluno_Turma(Codigo_Turma_Aluno);
CREATE INDEX IF NOT EXISTS idx_aluno_turma_aluno ON Aluno_Turma(Matricula_Aluno);
