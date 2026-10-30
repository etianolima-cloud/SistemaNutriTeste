-- ====================================================================
-- ESQUEMA DE BANCO DE DADOS: SISTEMA DE GESTÃO ESCOLAR (DIÁRIO ELETRÔNICO)
-- Ambiente / Dialeto: Vercel Postgres (PostgreSQL)
-- ====================================================================

-- 1. TABELA: Docente
-- Identificador: Nif (INTEIRO)
-- Adicionado: Senha para autenticação do docente
CREATE TABLE IF NOT EXISTS Docente (
    Nif INTEGER PRIMARY KEY,
    Nome VARCHAR(150) NOT NULL,
    Senha VARCHAR(255) NOT NULL DEFAULT '123456'
);

-- 2. TABELA: Aluno
-- Identificador: Matricula (INTEIRO)
CREATE TABLE IF NOT EXISTS Aluno (
    Matricula INTEGER PRIMARY KEY,
    Nome VARCHAR(150) NOT NULL
);

-- 3. TABELA: Turma
-- Identificador: Codigo (INTEIRO)
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
-- Relaciona Docente e Turma (N:N)
-- Identificador: ID (INTEIRO com auto-incremento)
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
-- Relaciona Aluno e Turma (N:N)
-- Identificador: ID (INTEIRO com auto-incremento)
-- Adaptada para conter Nota e Presença acumuladas do Aluno na Turma
CREATE TABLE IF NOT EXISTS Aluno_Turma (
    ID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Codigo_Turma_Aluno INTEGER NOT NULL,
    Matricula_Aluno INTEGER NOT NULL,
    Status_Final VARCHAR(50) NOT NULL DEFAULT 'Cursando',
    Nota NUMERIC(4,2) DEFAULT NULL CHECK (Nota IS NULL OR (Nota >= 0 AND Nota <= 10)),
    Presenca BOOLEAN NOT NULL DEFAULT TRUE,
    Total_Faltas INTEGER NOT NULL DEFAULT 0 CHECK (Total_Faltas >= 0),
    CONSTRAINT fk_aluno_turma_turma FOREIGN KEY (Codigo_Turma_Aluno) 
        REFERENCES Turma(Codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_aluno_turma_aluno FOREIGN KEY (Matricula_Aluno) 
        REFERENCES Aluno(Matricula) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_aluno_turma UNIQUE (Codigo_Turma_Aluno, Matricula_Aluno)
);

-- 6. TABELA: Diario_Registro (Histórico de Presenças e Notas por Aula)
-- Permite lançar a chamada e notas por data de aula
CREATE TABLE IF NOT EXISTS Diario_Registro (
    ID INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Codigo_Turma INTEGER NOT NULL REFERENCES Turma(Codigo) ON UPDATE CASCADE ON DELETE CASCADE,
    Matricula_Aluno INTEGER NOT NULL REFERENCES Aluno(Matricula) ON UPDATE CASCADE ON DELETE CASCADE,
    Nif_Docente INTEGER NOT NULL REFERENCES Docente(Nif) ON UPDATE CASCADE ON DELETE RESTRICT,
    Data_Aula DATE NOT NULL DEFAULT CURRENT_DATE,
    Presenca BOOLEAN NOT NULL DEFAULT TRUE,
    Nota NUMERIC(4,2) DEFAULT NULL CHECK (Nota IS NULL OR (Nota >= 0 AND Nota <= 10)),
    Observacao VARCHAR(255),
    Data_Registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_diario_aula_aluno UNIQUE (Codigo_Turma, Matricula_Aluno, Data_Aula)
);

-- ====================================================================
-- ÍNDICES PARA OTIMIZAÇÃO DE BUSCAS E JOINS
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_professor_turma_turma ON Professor_Turma(Codigo_Turma);
CREATE INDEX IF NOT EXISTS idx_professor_turma_docente ON Professor_Turma(Nif_Docente);
CREATE INDEX IF NOT EXISTS idx_aluno_turma_turma ON Aluno_Turma(Codigo_Turma_Aluno);
CREATE INDEX IF NOT EXISTS idx_aluno_turma_aluno ON Aluno_Turma(Matricula_Aluno);
CREATE INDEX IF NOT EXISTS idx_diario_registro_turma ON Diario_Registro(Codigo_Turma);
CREATE INDEX IF NOT EXISTS idx_diario_registro_aluno ON Diario_Registro(Matricula_Aluno);

-- ====================================================================
-- DADOS INICIAIS (SEED) PARA DEMONSTRAÇÃO E TESTE IMEDIATO
-- ====================================================================

-- Inserir Docentes
INSERT INTO Docente (Nif, Nome, Senha) VALUES
    (1001, 'Prof. Carlos Eduardo Silva', '123456'),
    (1002, 'Profa. Mariana Costa Oliveira', '123456'),
    (1003, 'Prof. Roberto Fernandes', '123456')
ON CONFLICT (Nif) DO UPDATE SET Senha = EXCLUDED.Senha, Nome = EXCLUDED.Nome;

-- Inserir Alunos
INSERT INTO Aluno (Matricula, Nome) VALUES
    (202401, 'Ana Beatriz Santos'),
    (202402, 'Bruno Henrique Lima'),
    (202403, 'Camila Rodrigues Alves'),
    (202404, 'Daniel Martins Pereira'),
    (202405, 'Eduardo Souza Gomes'),
    (202406, 'Fernanda Ribeiro Castro'),
    (202407, 'Gabriel Almeida Costa'),
    (202408, 'Helena Carvalho Duarte')
ON CONFLICT (Matricula) DO UPDATE SET Nome = EXCLUDED.Nome;

-- Inserir Turmas
INSERT INTO Turma (Codigo, Nome_Curso, Quantidade_maxima, Empresa, Nome_Empresa, Turno, Data_Inicio, Data_Fim) VALUES
    (101, 'Desenvolvimento Web Full Stack', 30, FALSE, NULL, 'Noite', '2026-02-01', '2026-12-15'),
    (102, 'Banco de Dados & Cloud Computing', 25, TRUE, 'TechCorp Soluções', 'Manhã', '2026-03-01', '2026-08-30'),
    (103, 'Inteligência Artificial Aplicada', 20, FALSE, NULL, 'Tarde', '2026-04-01', '2026-11-20')
ON CONFLICT (Codigo) DO UPDATE SET Nome_Curso = EXCLUDED.Nome_Curso;

-- Vincular Professor Carlos Silva (Nif 1001) às turmas 101 e 102
INSERT INTO Professor_Turma (Codigo_Turma, Nif_Docente, Status_Diario) VALUES
    (101, 1001, 'Em Andamento'),
    (102, 1001, 'Pendente'),
    (103, 1002, 'Pendente')
ON CONFLICT (Codigo_Turma, Nif_Docente) DO NOTHING;

-- Matricular Alunos na Turma 101
INSERT INTO Aluno_Turma (Codigo_Turma_Aluno, Matricula_Aluno, Status_Final, Nota, Presenca, Total_Faltas) VALUES
    (101, 202401, 'Cursando', 9.5, TRUE, 0),
    (101, 202402, 'Cursando', 8.0, TRUE, 1),
    (101, 202403, 'Cursando', 7.5, TRUE, 2),
    (101, 202404, 'Cursando', 5.0, FALSE, 4),
    (101, 202405, 'Cursando', 8.5, TRUE, 1)
ON CONFLICT (Codigo_Turma_Aluno, Matricula_Aluno) DO NOTHING;

-- Matricular Alunos na Turma 102
INSERT INTO Aluno_Turma (Codigo_Turma_Aluno, Matricula_Aluno, Status_Final, Nota, Presenca, Total_Faltas) VALUES
    (102, 202406, 'Cursando', 9.0, TRUE, 0),
    (102, 202407, 'Cursando', 6.5, TRUE, 2),
    (102, 202408, 'Cursando', 8.0, TRUE, 1)
ON CONFLICT (Codigo_Turma_Aluno, Matricula_Aluno) DO NOTHING;
