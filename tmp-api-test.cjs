
const API_URL = "https://api.ai33.pro/v1/chat/completions";
const API_KEY = "sk_aykke6mp4owf9pjtv4k1xubga0t12gu7nljjm72bls8wwjhv";

async function testAPI() {
    console.log("--- Testando Conexão Direta com AI33.pro ---");
    console.log(`URL: ${API_URL}`);
    console.log(`Chave: ${API_KEY.slice(0, 6)}...${API_KEY.slice(-4)}`);
    console.log("Modelo: gpt-4o-mini");
    
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: "Say hello." }
                ],
                max_tokens: 10
            })
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        
        const text = await response.text();
        console.log("Corpo da Resposta:");
        try {
            const json = JSON.parse(text);
            console.log(JSON.stringify(json, null, 2));
        } catch {
            console.log(text);
        }

        if (response.status === 401) {
            console.log("\n[ERRO 401] A chave de API parece ser inválida ou não tem permissão para este modelo.");
        } else if (response.ok) {
            console.log("\n[SUCESSO] A chave e o modelo estão funcionando corretamente.");
        }

    } catch (err) {
        console.error("\n[FALHA NO FETCH]:", err.message);
    }
}

testAPI();
