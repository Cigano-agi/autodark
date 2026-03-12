
const https = require('https');

const API_KEY = "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";
const URL = "https://openrouter.ai/api/v1/chat/completions";

console.log("--- DEBUG OPENROUTER ---");
console.log("Testando chave do OpenRouter encontrada no seu .env...");

const data = JSON.stringify({
  model: "openai/gpt-4o-mini",
  messages: [{ role: "user", content: "Say hello briefly." }],
  max_tokens: 10
});

const options = {
  hostname: 'openrouter.ai',
  port: 443,
  path: '/api/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'HTTP-Referer': 'http://localhost:5173',
    'X-Title': 'AutoDark Debug',
    'Content-Length': data.length
  },
  rejectUnauthorized: false 
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let responseData = '';

  res.on('data', (d) => {
    responseData += d;
  });

  res.on('end', () => {
    console.log("RESPOSTA:");
    try {
        console.log(JSON.stringify(JSON.parse(responseData), null, 2));
    } catch {
        console.log(responseData);
    }
  });
});

req.on('error', (e) => {
  console.error("ERRO:", e);
});

req.write(data);
req.end();
