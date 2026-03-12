
const https = require('https');

const API_KEY = "sk_aykke6mp4owf9pjtv4k1xubga0t12gu7nljjm72bls8wwjhv";
const URL = "https://api.ai33.pro/v1/chat/completions";

console.log("--- DEBUG API AI33 ---");
console.log("Testando conexão direta via https do Node.js...");

const data = JSON.stringify({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "hi" }],
  max_tokens: 5
});

const options = {
  hostname: 'api.ai33.pro',
  port: 443,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Length': data.length
  },
  // Desabilitar verificação de SSL apenas se necessário (alguns ambientes Windows dão erro)
  rejectUnauthorized: false 
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);

  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error("ERRO:", e);
});

req.write(data);
req.end();
