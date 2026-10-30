const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const apiRoutes = {
  '/api/auth': require('./api/auth'),
  '/api/turmas': require('./api/turmas'),
  '/api/turma-detalhes': require('./api/turma-detalhes'),
  '/api/salvar-diario': require('./api/salvar-diario'),
  '/api/setup-db': require('./api/setup-db')
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = reqUrl.pathname;

  // Intercepta chamadas de API
  if (pathname.startsWith('/api/')) {
    const handler = apiRoutes[pathname];
    if (handler) {
      // Converte searchParams para objeto req.query
      req.query = Object.fromEntries(reqUrl.searchParams.entries());

      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', async () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        req.body = {};
        if (rawBody.trim()) {
          try {
            req.body = JSON.parse(rawBody);
          } catch (_) {
            req.body = rawBody;
          }
        }

        // Helpers estilo Vercel / Express
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(data));
        };

        try {
          await handler(req, res);
        } catch (err) {
          console.error(`Erro ao executar ${pathname}:`, err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    } else {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Rota de API não encontrada' }));
      return;
    }
  }

  // Servir arquivos estáticos (procura em public/ e depois na raiz)
  let filePath = pathname === '/' ? '/index.html' : pathname;
  let fullPath = path.join(__dirname, 'public', filePath);

  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(__dirname, filePath);
  }

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(fullPath).pipe(res);
  } else {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Página não encontrada');
    }
  }
});

server.listen(PORT, () => {
  console.log(`EduDiário rodando em http://localhost:${PORT}`);
});
