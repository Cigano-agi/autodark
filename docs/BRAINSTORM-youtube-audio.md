## 🧠 Brainstorm: Estratégia de Áudio & Clonagem (Vídeos Longos)

### Contexto
O MVP do motor de renderização nativo (FFmpeg Client-Side) e de roteiros longos (ai33.pro) já está funcional. Agora precisamos orquestrar a **fase de Áudio** do AutoDark. Você fez o upload de 3 arquivos de áudio. Como Product Manager e Product Owner, vejo que esses arquivos podem ser usados para **Clonagem de Voz** ou como **Trilhas Sonoras (BGM)** para garantir a retenção do público em documentários longos.

Temos 3 caminhos para arquitetar essa pipeline de áudio no backend (Edge Functions):

---

### Option A: Voice Cloning Premium (ElevenLabs) + Whisper SRT
Usamos os 3 arquivos de áudio que você enviou para treinar um modelo de clonagem de voz no **ElevenLabs**, criando o "Apresentador Oficial" do canal. A narração gerada passa pela API do OpenAI Whisper para gerar a legenda `.srt` exata com o tempo de cada palavra.
✅ **Pros:**
- Retenção máxima: A voz clonada gera altíssima conexão com o público no YouTube.
- Exclusividade: A voz do seu canal dark será única, evitando o padrão "robô do TikTok".
❌ **Cons:**
- Custo elevado: ElevenLabs cobra por caractere, e vídeos de 15+ minutos ficarão caros em escala.
- Whisper adiciona uma requisição a mais de API (tempo e custo).
📊 **Effort:** Médio

---

### Option B: TTS Nativo Otimizado (Google Cloud TTS / OpenAI TTS) + BGM Fixa
Não clonamos voz. Usamos as opções nativas de Cloud TTS (vozes Journey/Neural do Google ou as vozes da OpenAI via ai33.pro se suportado) que são incrivelmente realistas e mais baratas. Os 3 áudios que você enviou serão configurados como as **Trilhas Sonoras de Fundo (BGM)** padrão daquele perfil de canal, tocando em loop por trás da narração para dar clima de "documentário".
✅ **Pros:**
- Custo de escala baixíssimo (ou quase zero dependendo da cota do Google Cloud).
- Extremamente rápido para gerar o áudio.
❌ **Cons:**
- Vozes conhecidas pelo público, sem a "exclusividade" da clonagem.
- Para gerar legendas animadas palavra por palavra, ainda dependemos do Whisper ou dos 'Marks' nativos do Google TTS.
📊 **Effort:** Baixo

---

### Option C: Modelo Híbrido (Edge TTS + Whisper Local/Groq)
Usamos a API não-oficial e gratuita do Microsoft Edge TTS para narração realista custo-zero, mixamos com os seus 3 áudios (BGM), e passamos num modelo Whisper ultra-rápido (ex: Groq) para pegar as legendas.
✅ **Pros:**
- Custo absoluto ZERO na narração.
- Altamente viável para quem quer floodar o YouTube com 3 vídeos longos por dia.
❌ **Cons:**
- API do Edge TTS é não-oficial (shadow API), sujeita a instabilidades.
📊 **Effort:** Alto (exige integrações não-convencionais).

---

## 💡 Recommendation

Recomendação do **Product Owner**: A **Option B** é a mais sólida para começarmos o MVP real da geração de áudio. Ela tem custo previsível e não quebra a arquitetura serverless. Podemos usar os 3 áudios que você enviou para compor o "Sound Design" (Background Music) personalizado pelo Canal.

### 🛑 SOCRATIC GATE (Product Manager)
Antes de seguir pro `/plan` final e orquestrar as tarefas de código:
1. Os 3 áudios que você enviou são amostras de voz para eu clonar (ElevenLabs/Option A), ou são trilhas sonoras/BGM para dar clima aos vídeos (Option B)?
2. Qual das 3 opções de arquitetura (A, B ou C) devemos firmar no planejamento?
