const http = require('http');

const PORT = 80;
const TARGET_PORT = 3000;

const server = http.createServer((req, res) => {
  const host = (req.headers.host || '127.0.0.1').split(':')[0];
  const targetUrl = `http://${host}:${TARGET_PORT}${req.url}`;
  
  res.writeHead(302, {
    Location: targetUrl,
    'Content-Type': 'text/html; charset=utf-8',
  });
  res.end(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head><meta charset="utf-8"><title>تحويل إلى GymSaaS</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:40px;background:#0b0f17;color:#fff;">
        <h2>جارٍ توجيهك إلى تطبيق GymSaaS...</h2>
        <p><a style="color:#22c55e;" href="${targetUrl}">اضغط هنا إذا لم يتم تحويلك تلقائياً</a></p>
      </body>
    </html>
  `);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Redirector] Listening on http://0.0.0.0:${PORT} -> redirecting to port ${TARGET_PORT}`);
});

server.on('error', (err) => {
  console.error('[Redirector Error]:', err.message);
});
