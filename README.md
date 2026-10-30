# Sistema de Gestão Escolar - Esquema de Banco de Dados (Vercel Postgres)

Este projeto contém o esquema relacional SQL estruturado para o ambiente **Vercel Postgres** (PostgreSQL / Neon).

## 🗄️ Modelo Entidade-Relacionamento

### 1. `Docente`
- **Nif** (`INTEGER` - PK): Identificador único do docente.
- **Nome** (`VARCHAR(150)`): Nome completo do docente.

### 2. `Aluno`
- **Matricula** (`INTEGER` - PK): Identificador único do aluno.
- **Nome** (`VARCHAR(150)`): Nome completo do aluno.

### 3. `Turma`
- **Codigo** (`INTEGER` - PK): Identificador numérico da turma.
- **Nome_Curso** (`VARCHAR(150)`): Nome do curso/disciplina.
- **Quantidade_maxima** (`INTEGER`): Capacidade máxima de alunos.
- **Empresa** (`BOOLEAN`): Indicador se é turma conveniada/in-company.
- **Nome_Empresa** (`VARCHAR(150)`): Nome da empresa vinculada (se aplicável).
- **Turno** (`VARCHAR(20)`): Turno da turma (`Manhã`, `Tarde`, `Noite`, `Integral`).
- **Data_Inicio** (`DATE`): Data de início das aulas.
- **Data_Fim** (`DATE`): Data de encerramento das aulas.

---

### Tabelas de Relacionamento (Associativas)

### 4. `Professor_Turma` (Relacionamento Docente ⟷ Turma)
- **ID** (`INTEGER` - PK com auto-incremento): Identificador do vínculo.
- **Codigo_Turma** (`INTEGER` - FK -> `Turma.Codigo`): Turma associada.
- **Nif_Docente** (`INTEGER` - FK -> `Docente.Nif`): Docente associado.
- **Status_Diario** (`VARCHAR(50)`): Situação do preenchimento/diário de classe.

### 5. `Aluno_Turma` (Relacionamento Aluno ⟷ Turma)
- **ID** (`INTEGER` - PK com auto-incremento): Identificador da matrícula na turma.
- **Codigo_Turma_Aluno** (`INTEGER` - FK -> `Turma.Codigo`): Turma matriculada.
- **Matricula_Aluno** (`INTEGER` - FK -> `Aluno.Matricula`): Aluno matriculado.
- **Status_Final** (`VARCHAR(50)`): Situação acadêmica (ex: Cursando, Aprovado, Reprovado).

---

## 🚀 Como executar no Vercel

1. Acesse o painel da sua conta na [Vercel](https://vercel.com).
2. Abra o projeto **`nutriteste`** e vá até a aba **Storage**.
3. Crie ou selecione o banco **Postgres** (Neon / Marketplace).
4. Clique na aba **Query** (ou SQL Editor) no painel do banco.
5. Copie e cole o conteúdo de [schema.sql](./schema.sql) e clique em **Run Query**.
