# 🔧 ROADMAP DE FIXES PRIORITÁRIOS

**Status Geral:** 🔴 **BLOQUEADO EM STEP 3**

---

## 🚨 P0 — CRÍTICO (Bloqueia tudo)

### [P0-1] Debugar erro silencioso em "Gerar Roteiros"

**O Problema:**
```
User: Clica "Gerar Roteiros (3 capítulos)"
Sistema: Silenciosamente falha
Result: Step permanece em 2, nenhum feedback
```

**Causa Provável:**
A função `handleGenerateAllScripts()` em `src/pages/Production/Index.tsx:535` está capturando erros mas **não reportando** ao usuário.

**Passos para Debugar:**

1. **Abrir DevTools → Console**
   - Ir para `http://localhost:5176/channel/{id}/production`
   - Completar Step 1-2 (gerar sumário)
   - Abrir Console (F12)
   - Limpar console

2. **Clicar "Gerar Roteiros" e observar logs**
   - Procurar por mensagens de erro
   - Procurar por requisições falhadas (Network tab)

3. **Verificar `/api-ai` endpoint**
   ```bash
   # No terminal, testar se endpoint responde
   curl -X POST http://localhost:5176/api-ai/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer sk_e3hc1sz4put0gp25lqjk5kffpnp1sz3k6by0p5bkvyqjhoyh" \
     -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"test"}]}'
   ```

4. **Verificar logs do Vite**
   ```bash
   # No terminal onde rodou 'npm run dev'
   # Procurar por erro de proxy ou timeout
   ```

5. **Se `/api-ai` está down:**
   - A chamada vai pro OpenRouter (fallback)
   - Verificar se OPENROUTER_API_KEY está válida:
     ```bash
     curl -X POST https://openrouter.ai/api/v1/chat/completions \
       -H "Content-Type: application/json" \
       -H "Authorization: Bearer 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" \
       -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"test"}]}'
     ```

**FIX Sugerido:** Adicionar try-catch com toast error visível

```typescript
// Em src/pages/Production/Index.tsx, função handleGenerateAllScripts

const handleGenerateAllScripts = async () => {
  setLoading(true);
  try {
    for (const chapter of chapters) {
      if (chapter.script.trim()) continue;
      setStatusMessage(`Escrevendo cap. "${chapter.title}"...`);
      setGeneratingChapter(chapter.id);
      const script = await generateChapterScript(chapter);
      setChapters(prev => prev.map(ch =>
        ch.id === chapter.id ? { ...ch, script } : ch
      ));
    }
    setStep(3);
    toast.success("Todos os roteiros gerados!");
  } catch (e: unknown) {
    // ← ADD THIS
    const errorMsg = e instanceof Error ? e.message : "Erro desconhecido ao gerar roteiros";
    toast.error(errorMsg);
    console.error("[DEBUG] generateAllScripts failed:", e);
    // ← END ADD
  } finally {
    setLoading(false);
    setStatusMessage("");
  }
};
```

**Estimativa:** 15 min de debug + 5 min de fix

---

### [P0-2] Implementar Timeout com Retry

**Problema:** Se API ficar lenta, sistema trava sem feedback

**Fix:**
```typescript
// Adicionar timeout helper em callClaude() - src/pages/Production/Index.tsx:135

const withTimeout = (promise: Promise<string>, ms: number) => {
  return Promise.race([
    promise,
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout após ${ms}ms`)), ms)
    ),
  ]);
};

// Usar em handleGenerateAllScripts:
const script = await withTimeout(
  generateChapterScript(chapter),
  30000 // 30 segundos timeout
);
```

**Estimativa:** 10 min

**Priority:** 🔴 HOJE (antes de próximo teste)

---

## 🟡 P1 — IMPORTANTE (Afeta UX)

### [P1-1] Adicionar Loading Spinner durante Step 3-7

**Problema:** Usuário não sabe que sistema está processando

**Fix:** Mostrar progress bar enquanto gera scripts
```typescript
{loading && (
  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
    <div className="flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <span className="text-sm text-white">{statusMessage}</span>
    </div>
  </div>
)}
```

**Estimativa:** 20 min

---

### [P1-2] Validação antes de avançar

**Problema:** User pode clicar "Gerar Narração" antes de ter scripts

**Fix:** Desabilitar botão até todos os scripts estarem presentes
```typescript
{step === 3 && allChaptersHaveScripts && (
  <Button onClick={handleGenerateAllAudio} disabled={loading}>
    ...
  </Button>
)}
```

**Estimativa:** 10 min

---

## 🟢 P2 — IMPORTANTE (MVP)

### [P2-1] Implementar Onboarding Tour

**O quê:** Tour interativo dos 8 steps

**Onde:** Adicionar quando usuário chega em `/production` primeira vez

**Exemplo:**
```
Step 1/8: "Aqui você configura o vídeo (idioma, duração, tópico)"
  → Highlight language selector
  → Show estimated cost

Step 2/8: "Sistema gera sumário automático"
  → Show chapters generated
  → Destaque botão "Gerar Roteiros"

...

Step 8/8: "Seu vídeo está pronto! Clique Finalizar para salvar"
```

**Lib sugerida:** `react-joyride` ou `driver.js`

**Estimativa:** 1-2 horas

---

### [P2-2] Documentação dentro da app

**O quê:** Tooltips em botões principais

**Exemplo:**
```html
<Button title="Gera título, hook e divisão em capítulos via IA">
  Gerar Sumário e Capítulos
</Button>
```

**Estimativa:** 30 min

---

## 📊 TIMELINE PROPOSTO

```
HOJE (2h):
  ✓ [P0-1] Debug + fix erro silencioso (20 min)
  ✓ [P0-2] Timeout com retry (10 min)
  ✓ [P1-1] Loading spinner (20 min)
  ✓ Testar novo vídeo de 1 minuto (10 min)

AMANHÃ (3h):
  ✓ [P1-2] Validação before advance (10 min)
  ✓ [P2-1] Onboarding tour (60 min)
  ✓ [P2-2] Tooltips (30 min)
  ✓ Teste final com user real (30 min)

DEPOIS (1h):
  ✓ Documentação "Getting Started"
  ✓ Vídeo tutorial 5 min
  ✓ FAQ do wizard
```

---

## 🧪 COMO TESTAR CADA FIX

### Teste P0-1: Erro visível
```
1. Step 1: Topic = "test", Duration = 8 min
2. Step 2: Gerar Sumário ✅
3. Step 3: Gerar Roteiros
   → Esperado: Toast error aparecer (se API falhar)
   → Não esperado: Silêncio
```

### Teste P0-2: Timeout
```
1. [Simular timeout: desligar WiFi ou bloquear /api-ai]
2. Step 3: Gerar Roteiros
   → Esperado: Após 30s, erro "Timeout" aparece
   → Não esperado: Trava infinita
```

### Teste P1-1: Loading UI
```
1. Step 3: Gerar Roteiros
   → Esperado: Loading spinner + "Escrevendo cap. X..."
   → Não esperado: Botão static
```

---

## 📝 CHECKLIST BEFORE MVP

- [ ] P0-1 e P0-2 consertados
- [ ] Novo vídeo de 1 minuto gerado com sucesso
- [ ] Todos os 8 steps completam sem erro
- [ ] MP4 exporta e toca no player
- [ ] Conteúdo salva em Supabase
- [ ] Onboarding implementado
- [ ] Documentação pronta
- [ ] Teste com user real (não dev)

---

## 🎯 META: "READY FOR CLIENT"

- ✅ Sistema gera vídeos completos (roteiro + áudio + slides + montagem)
- ✅ Erro handling visível (toast errors)
- ✅ User guidance (onboarding tour)
- ✅ Documentação clara
- ✅ Pronto para produção (sem debug logs, sem console.errors)

---

**Responsável:** Ops/Dev
**Deadline:** Antes de soltar pro cliente
**Risk:** 🔴 CRÍTICO — Bloqueia MVP
