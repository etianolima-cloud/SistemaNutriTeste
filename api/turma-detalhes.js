const db = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const codigo = req.query.codigo;
    const dataAula = req.query.data || new Date().toISOString().split('T')[0];

    if (!codigo) {
      return res.status(400).json({ error: 'Código da turma é obrigatório' });
    }

    const codigoInt = parseInt(codigo, 10);
    if (isNaN(codigoInt)) {
      return res.status(400).json({ error: 'Código de turma inválido' });
    }

    if (db.pool) {
      try {
        // Busca dados da Turma
        const turmaRes = await db.pool.query(
          `SELECT 
            codigo, 
            nome_curso, 
            quantidade_maxima, 
            empresa, 
            nome_empresa, 
            turno, 
            TO_CHAR(data_inicio, 'YYYY-MM-DD') as data_inicio, 
            TO_CHAR(data_fim, 'YYYY-MM-DD') as data_fim 
           FROM Turma WHERE codigo = $1`,
          [codigoInt]
        );

        if (turmaRes.rows.length === 0) {
          return res.status(404).json({ error: 'Turma não encontrada' });
        }

        const turma = turmaRes.rows[0];

        // Busca alunos associados e seus registros de diário para a data
        const alunosQuery = `
          SELECT 
            a.matricula,
            a.nome,
            at.status_final,
            COALESCE(dr.nota, at.nota) as nota,
            COALESCE(dr.presenca, at.presenca) as presenca,
            at.total_faltas,
            dr.observacao
          FROM Aluno_Turma at
          INNER JOIN Aluno a ON a.matricula = at.matricula_aluno
          LEFT JOIN Diario_Registro dr ON dr.codigo_turma = at.codigo_turma_aluno 
                                      AND dr.matricula_aluno = at.matricula_aluno 
                                      AND dr.data_aula = $2::date
          WHERE at.codigo_turma_aluno = $1
          ORDER BY a.nome ASC
        `;
        const alunosRes = await db.pool.query(alunosQuery, [codigoInt, dataAula]);

        return res.status(200).json({
          success: true,
          isLiveDatabase: true,
          turma,
          dataAula,
          alunos: alunosRes.rows
        });
      } catch (dbErr) {
        console.warn('Erro ao consultar detalhes da turma no Postgres:', dbErr.message);
      }
    }

    // Fallback em memória
    const turmaMem = db.memory.turmas.find(t => t.codigo === codigoInt);
    if (!turmaMem) {
      return res.status(404).json({ error: 'Turma não encontrada' });
    }

    const alunosTurmaMem = db.memory.alunoTurma.filter(at => at.codigo_turma_aluno === codigoInt);
    const alunos = alunosTurmaMem.map(at => {
      const aluno = db.memory.alunos.find(a => a.matricula === at.matricula_aluno);
      const reg = db.memory.diarioRegistro.find(
        dr => dr.codigo_turma === codigoInt && dr.matricula_aluno === at.matricula_aluno && dr.data_aula === dataAula
      );

      return {
        matricula: at.matricula_aluno,
        nome: aluno ? aluno.nome : `Aluno ${at.matricula_aluno}`,
        status_final: at.status_final,
        nota: reg ? reg.nota : at.nota,
        presenca: reg ? reg.presenca : at.presenca,
        total_faltas: at.total_faltas,
        observacao: reg ? reg.observacao : ''
      };
    }).sort((a, b) => a.nome.localeCompare(b.nome));

    return res.status(200).json({
      success: true,
      isLiveDatabase: false,
      turma: turmaMem,
      dataAula,
      alunos
    });

  } catch (err) {
    console.error('Erro ao buscar detalhes da turma:', err);
    return res.status(500).json({ error: 'Erro ao buscar dados da turma' });
  }
};
