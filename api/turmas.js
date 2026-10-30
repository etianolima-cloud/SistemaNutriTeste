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
    const nif = req.query.nif || (req.body && req.body.nif);
    if (!nif) {
      return res.status(400).json({ error: 'NIF do docente é obrigatório' });
    }

    const nifInt = parseInt(nif, 10);
    if (isNaN(nifInt)) {
      return res.status(400).json({ error: 'NIF inválido' });
    }

    if (db.pool) {
      try {
        const queryText = `
          SELECT 
            t.codigo,
            t.nome_curso,
            t.quantidade_maxima,
            t.empresa,
            t.nome_empresa,
            t.turno,
            TO_CHAR(t.data_inicio, 'YYYY-MM-DD') as data_inicio,
            TO_CHAR(t.data_fim, 'YYYY-MM-DD') as data_fim,
            pt.status_diario,
            COUNT(at.matricula_aluno)::int as total_alunos
          FROM Turma t
          INNER JOIN Professor_Turma pt ON pt.codigo_turma = t.codigo
          LEFT JOIN Aluno_Turma at ON at.codigo_turma_aluno = t.codigo
          WHERE pt.nif_docente = $1
          GROUP BY t.codigo, t.nome_curso, t.quantidade_maxima, t.empresa, t.nome_empresa, t.turno, t.data_inicio, t.data_fim, pt.status_diario
          ORDER BY t.codigo ASC
        `;
        const result = await db.pool.query(queryText, [nifInt]);

        return res.status(200).json({
          success: true,
          isLiveDatabase: true,
          turmas: result.rows
        });
      } catch (dbErr) {
        console.warn('Erro ao consultar turmas no Postgres:', dbErr.message);
      }
    }

    // Fallback em memória
    const vinculos = db.memory.professorTurma.filter(pt => pt.nif_docente === nifInt);
    const turmas = vinculos.map(v => {
      const turma = db.memory.turmas.find(t => t.codigo === v.codigo_turma);
      const totalAlunos = db.memory.alunoTurma.filter(at => at.codigo_turma_aluno === v.codigo_turma).length;
      return {
        ...turma,
        status_diario: v.status_diario,
        total_alunos: totalAlunos
      };
    }).filter(Boolean);

    return res.status(200).json({
      success: true,
      isLiveDatabase: false,
      turmas
    });

  } catch (err) {
    console.error('Erro ao buscar turmas:', err);
    return res.status(500).json({ error: 'Erro ao buscar turmas' });
  }
};
