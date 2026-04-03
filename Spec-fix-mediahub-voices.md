# Spec.md — Fix MediaHub: Vozes ElevenLabs + Botão Testar

**Data:** 2026-04-03
**Projeto:** AutoDark Studio
**Feature:** Corrigir carregamento de vozes ElevenLabs no MediaHub + botão de testar voz
**Prioridade:** P0
**Autor da decisão:** Usuário

---

## 1. CONTEXTO E PROBLEMA

### Erro atual
```
POST http://localhost:5173/.netlify/functions/list-tts-voices 404 (Not Found)
[MediaHub] Erro ao carregar vozes ElevenLabs: Error: HTTP 404
```

### Causa raiz
O Claude Code chamou `/.netlify/functions/list-tts-voices` mas o projeto usa
Supabase Edge Functions. A função também não foi deployada no Supabase.

### O que precisa funcionar
1. A Edge Function `list-tts-voices` deve existir no Supabase e ser chamada corretamente.
2. As vozes ElevenLabs devem aparecer no MediaHub com filtro por idioma (PT / EN / ES).
3. Cada voz deve ter botão "Testar" que toca o sample de áudio antes de salvar.
4. O comportamento deve ser idêntico ao TTS nativo que já funciona no MediaHub.

---

## 2. ARQUIVOS AFETADOS

### Criar
| Arquivo | Propósito |
|---------|-----------|
| `supabase/functions/list-tts-voices/index.ts` | Edge Function Deno que busca vozes ElevenLabs via AI33 e filtra por idioma. |

### Modificar
| Arquivo | O que muda |
|---------|------------|
| `src/pages/MediaHub/Index.tsx` (linha ~599) | Trocar URL `.netlify/functions/list-tts-voices` pela chamada correta ao Supabase. Adicionar botão Testar com `sample_audio_url`. |

---

## 3. COMPORTAMENTO ESPERADO

### 3.1 Edge Function `list-tts-voices`

```
1. Recebe: { language?: "pt" | "en" | "es" }
2. Chama: GET https://api.ai33.pro/v2/voices com header xi-api-key
3. Filtra vozes pelo prefixo de idioma se language foi passado
4. Retorna: { voices: TTSVoice[] }
```

### 3.2 MediaHub — carregamento de vozes

- Ao clicar em ElevenLabs, chamar a Edge Function via Supabase (não Netlify).
- Mostrar spinner enquanto carrega.
- Exibir vozes agrupadas por gênero (Female / Male).
- Filtro de idioma: Português / English / Español.
- Se a chamada falhar, exibir mensagem de erro via `toast.error(getFriendlyErrorMessage(...))`.

### 3.3 Botão Testar voz

- Cada voz na lista deve ter botão "Testar".
- Ao clicar, tocar o `sample_audio_url` retornado pela API.
- Se `sample_audio_url` não existir para aquela voz, o botão fica desabilitado.
- Apenas um sample toca por vez — se outro estiver tocando, pausar antes de iniciar.

---

## 4. REGRAS DE NEGÓCIO

- A chamada à Edge Function deve usar o cliente Supabase já configurado no projeto (`supabase.functions.invoke`) ou a URL correta `https://{ref}.supabase.co/functions/v1/list-tts-voices`.
- Nunca usar `.netlify/functions/` — o projeto não usa Netlify.
- `AI33_API_KEY` já está nos secrets do Supabase. Acessar via `Deno.env.get("AI33_API_KEY")`.
- Seguir padrão de erro do projeto: `getFriendlyErrorMessage` no frontend, `{ error: string }` no backend.
- CORS obrigatório na Edge Function (padrão do projeto).

---

## 5. CONTRATOS DE INTERFACE

### Edge Function `list-tts-voices` — Request
```json
{ "language": "pt" }
```

### Edge Function `list-tts-voices` — Response (sucesso)
```typescript
interface TTSVoice {
  voice_id: string;       // ID ElevenLabs
  name: string;           // Nome legível
  gender: "Female" | "Male";
  language: string;       // ex: "pt", "en", "es"
  sample_audio_url?: string; // URL para preview de áudio
}

{ "voices": TTSVoice[] }
```

### Edge Function `list-tts-voices` — Response (erro)
```json
{ "error": "Mensagem legível" }
```
Status: `500` se AI33 falhar.

---

## 6. CODE SNIPPETS DE REFERÊNCIA

### 6.1 Como chamar Edge Function Supabase no frontend (padrão do projeto)
```typescript
// Usar supabase.functions.invoke — NÃO usar fetch direto para /.netlify/functions/
const { data, error } = await supabase.functions.invoke('list-tts-voices', {
  body: { language: 'pt' }
});
if (error) throw error;
const { voices } = data;
```

### 6.2 Edge Function Deno — estrutura completa
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { language } = await req.json();
    const apiKey = Deno.env.get("AI33_API_KEY")!;

    const res = await fetch("https://api.ai33.pro/v2/voices", {
      headers: { "xi-api-key": apiKey }
    });
    const { voices } = await res.json();

    const filtered = language
      ? voices.filter((v: any) =>
          v.labels?.language?.toLowerCase().startsWith(language) ||
          v.name?.toLowerCase().includes(language)
        )
      : voices;

    const mapped = filtered.map((v: any) => ({
      voice_id: v.voice_id,
      name: v.name,
      gender: v.labels?.gender ?? "Female",
      language: language ?? "en",
      sample_audio_url: v.preview_url ?? null,
    }));

    return new Response(JSON.stringify({ voices: mapped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
```

### 6.3 Botão Testar voz no frontend
```typescript
const audioRef = useRef<HTMLAudioElement | null>(null);

const handleTestVoice = (sampleUrl: string) => {
  if (audioRef.current) {
    audioRef.current.pause();
  }
  const audio = new Audio(sampleUrl);
  audioRef.current = audio;
  audio.play();
};

// No JSX:
<button
  onClick={() => handleTestVoice(voice.sample_audio_url)}
  disabled={!voice.sample_audio_url}
>
  Testar
</button>
```

---

## 7. CRITÉRIOS DE ACEITE

- [ ] Clicar em ElevenLabs no MediaHub não gera erro 404 no console
- [ ] A lista de vozes aparece após clicar em ElevenLabs
- [ ] O filtro PT / EN / ES funciona e muda as vozes exibidas
- [ ] Botão Testar toca o sample de áudio da voz
- [ ] Apenas um sample toca por vez
- [ ] Se não houver `sample_audio_url`, botão Testar fica desabilitado
- [ ] Erros de API exibem toast com mensagem amigável
- [ ] Nenhuma chamada para `.netlify/functions/` no console

---

## 8. REGRAS DE EXECUÇÃO PARA A IA

### O que deve ser feito
- Criar a Edge Function em `supabase/functions/list-tts-voices/index.ts`.
- Corrigir apenas a linha que chama `.netlify/functions/list-tts-voices` no MediaHub.
- Adicionar o botão Testar reutilizando o padrão do TTS nativo já existente no MediaHub.
- Confirmar cada arquivo antes de passar para o próximo.

### O que não deve ser feito
- Não refatorar o MediaHub além das linhas relacionadas ao carregamento de vozes ElevenLabs.
- Não alterar o fluxo do TTS nativo que já funciona.
- Não criar novos componentes — usar o padrão visual já existente para o botão Testar.
- Não usar `.netlify/functions/` em nenhum ponto.
- Não tomar decisões não cobertas por esta spec — parar e perguntar.

### Se encontrar algo inesperado
- Se `supabase.functions.invoke` não estiver sendo usado em nenhum lugar do projeto: verificar como outras Edge Functions são chamadas no MediaHub e replicar o mesmo padrão.
- Se a API `/v2/voices` retornar estrutura diferente da documentada: adaptar apenas o mapeamento, não o contrato de retorno.
