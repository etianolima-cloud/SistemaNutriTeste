const db = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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
    const { nif, senha } = body || {};

    if (!nif || !senha) {
      return res.status(400).json({ error: 'NIF e Senha são obrigatórios' });
    }

    const nifInt = parseInt(nif, 10);
    if (isNaN(nifInt)) {
      return res.status(400).json({ error: 'O NIF deve ser um número inteiro' });
    }

    // Tentativa de consulta no banco PostgreSQL
    if (db.pool) {
      try {
        const queryText = 'SELECT nif, nome, senha FROM Docente WHERE nif = $1 LIMIT 1';
        const result = await db.pool.query(queryText, [nifInt]);

        if (result.rows.length > 0) {
          const doc = result.rows[0];
          if (doc.senha === senha) {
            return res.status(200).json({
              success: true,
              isLiveDatabase: true,
              docente: {
                nif: doc.nif,
                nome: doc.nome
              }
            });
          } else {
            return res.status(401).json({ error: 'Senha incorreta' });
          }
        } else {
          return res.status(404).json({ error: 'Docente com este NIF não encontrado' });
        }
      } catch (dbErr) {
        console.warn('Erro ao consultar docente no Postgres:', dbErr.message);
        // Continua para o fallback caso as tabelas ainda não existam no Postgres
      }
    }

    // Fallback em memória
    const docMem = db.memory.docentes.find(d => d.nif === nifInt);
    if (!docMem) {
      return res.status(404).json({ error: 'Docente não encontrado com o NIF informado (ex: teste com 1001)' });
    }

    if (docMem.senha !== senha) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    return res.status(200).json({
      success: true,
      isLiveDatabase: false,
      docente: {
        nif: docMem.nif,
        nome: docMem.nome
      }
    });

  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};
