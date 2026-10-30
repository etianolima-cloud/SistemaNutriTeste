const db = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) {}
    }

    const { codigo_turma, nif_docente, data_aula, registros, status_diario } = body || {};

    if (!codigo_turma || !registros || !Array.isArray(registros)) {
      return res.status(400).json({ error: 'Código da turma e lista de registros são obrigatórios' });
    }

    const codigoInt = parseInt(codigo_turma, 10);
    const nifInt = nif_docente ? parseInt(nif_docente, 10) : 1001;
    const dataValida = data_aula || new Date().toISOString().split('T')[0];

    if (db.pool) {
      try {
        const client = await db.pool.connect();
        try {
          await client.query('BEGIN');

          for (const reg of registros) {
            const matInt = parseInt(reg.matricula, 10);
            const presencaBool = !!reg.presenca;
            const notaVal = (reg.nota !== null && reg.nota !== undefined && reg.nota !== '') 
              ? parseFloat(reg.nota) 
              : null;
            const obs = reg.observacao || '';

            // 1. Atualiza ou insere no histórico Diario_Registro
            const upsertDiario = `
              INSERT INTO Diario_Registro (codigo_turma, matricula_aluno, nif_docente, data_aula, presenca, nota, observacao)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (codigo_turma, matricula_aluno, data_aula)
              DO UPDATE SET
                presenca = EXCLUDED.presenca,
                nota = EXCLUDED.nota,
                observacao = EXCLUDED.observacao,
                data_registro = CURRENT_TIMESTAMP
            `;
            await client.query(upsertDiario, [codigoInt, matInt, nifInt, dataValida, presencaBool, notaVal, obs]);

            // 2. Atualiza a tabela Aluno_Turma com a nota consolidada e presença mais recente
            const updateAlunoTurma = `
              UPDATE Aluno_Turma
              SET 
                nota = COALESCE($1, nota),
                presenca = $2,
                total_faltas = CASE 
                  WHEN $2 = FALSE THEN total_faltas + 1 
                  ELSE total_faltas 
                END
              WHERE codigo_turma_aluno = $3 AND matricula_aluno = $4
            `;
            await client.query(updateAlunoTurma, [notaVal, presencaBool, codigoInt, matInt]);
          }

          // 3. Atualiza o status do diário do professor
          if (nifInt) {
            const novoStatus = status_diario || 'Em Dia';
            await client.query(
              `UPDATE Professor_Turma SET status_diario = $1 WHERE codigo_turma = $2 AND nif_docente = $3`,
              [novoStatus, codigoInt, nifInt]
            );
          }

          await client.query('COMMIT');

          return res.status(200).json({
            success: true,
            isLiveDatabase: true,
            message: 'Presenças e notas salvas com sucesso no Vercel Postgres!'
          });
        } catch (trxErr) {
          await client.query('ROLLBACK');
          throw trxErr;
        } finally {
          client.release();
        }
      } catch (dbErr) {
        console.warn('Erro ao salvar no Postgres:', dbErr.message);
      }
    }

    // Fallback em memória
    for (const reg of registros) {
      const matInt = parseInt(reg.matricula, 10);
      const presencaBool = !!reg.presenca;
      const notaVal = (reg.nota !== null && reg.nota !== undefined && reg.nota !== '') 
        ? parseFloat(reg.nota) 
        : null;

      // Atualiza Aluno_Turma
      const at = db.memory.alunoTurma.find(item => item.codigo_turma_aluno === codigoInt && item.matricula_aluno === matInt);
      if (at) {
        if (notaVal !== null) at.nota = notaVal;
        at.presenca = presencaBool;
        if (!presencaBool) at.total_faltas += 1;
      }

      // Atualiza ou insere Diario_Registro
      const drIdx = db.memory.diarioRegistro.findIndex(
        item => item.codigo_turma === codigoInt && item.matricula_aluno === matInt && item.data_aula === dataValida
      );
      if (drIdx >= 0) {
        db.memory.diarioRegistro[drIdx].presenca = presencaBool;
        db.memory.diarioRegistro[drIdx].nota = notaVal;
        db.memory.diarioRegistro[drIdx].observacao = reg.observacao || '';
      } else {
        db.memory.diarioRegistro.push({
          id: db.memory.diarioRegistro.length + 1,
          codigo_turma: codigoInt,
          matricula_aluno: matInt,
          nif_docente: nifInt,
          data_aula: dataValida,
          presenca: presencaBool,
          nota: notaVal,
          observacao: reg.observacao || ''
        });
      }
    }

    // Atualiza status do professor
    const profTurma = db.memory.professorTurma.find(pt => pt.codigo_turma === codigoInt && pt.nif_docente === nifInt);
    if (profTurma) {
      profTurma.status_diario = status_diario || 'Em Dia';
    }

    return res.status(200).json({
      success: true,
      isLiveDatabase: false,
      message: 'Presenças e notas atualizadas com sucesso!'
    });

  } catch (err) {
    console.error('Erro ao salvar diário:', err);
    return res.status(500).json({ error: 'Erro ao salvar alterações no diário' });
  }
};
