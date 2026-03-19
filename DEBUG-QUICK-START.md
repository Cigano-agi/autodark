# 🎯 QUICK START — Como Consertar o Bug

**Tempo estimado:** 30-45 min total

---

## 🔍 Passo 1: Reproduzir o Bug (5 min)

```bash
# Terminal 1: Rodar dev server
npm run dev

# Terminal 2: Abrir DevTools
# Browser: http://localhost:5176/channel/458bced2-7465-4573-951f-3342bd353c72/production
# F12 → Console
```

**Steps para reproduzir:**
1. Clicar "Novo" (reset wizard)
2. Step 1: Topic = "5 dicas para dormir melhor", Duration = 8 min
3. Clicar "Gerar Sumário e Capítulos" → ✅ Funciona (3 capítulos gerados)
4. Clicar "Gerar Roteiros (3 capítulos)" → ❌ FALHA SILENCIOSA

**Esperado:** Step 3 com roteiros
**Observado:** Permanece em Step 2, sem feedback

---

## 🐛 Passo 2: Investigar a Causa (10 min)

### Opção A: Console Logging

Abrir: `src/pages/Production/Index.tsx:535`

Procurar função:
```typescript
const handleGenerateAllScripts = async () => {
  setLoading(true);
  try {
    // ... loop sobre capítulos
    setStep(3); // ← Isso nunca é chamado
  } catch (e: unknown) {
    // ← Erro é capturado mas silenciosamente ignorado
  }
}
```

**Problema:** `catch` não faz nada! Precisa adicionar:
```typescript
catch (e: unknown) {
  console.error("[BUG] generateAllScripts failed:", e); // ← ADD THIS
  toast.error(e instanceof Error ? e.message : "Erro ao gerar roteiros"); // ← ADD THIS
}
```

### Opção B: Verificar API

**Terminal:**
```bash
# Testar /api-ai endpoint
curl -X POST http://localhost:5176/api-ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_e3hc1sz4put0gp25lqjk5kffpnp1sz3k6by0p5bkvyqjhoyh" \
  -d '{
    "model":"gpt-4o-mini",
    "messages":[{"role":"user","content":"escreva um roteiro sobre dormir bem"}]
  }'
```

**Se retornar erro:** `/api-ai` proxy está down, precisa checar `vite.config.ts`
**Se timeout:** API de IA está lenta, precisa implementar timeout

---

## 🔧 Passo 3: Implementar FIX (20 min)

### FIX 1: Adicionar Error Handling Visível

**Arquivo:** `src/pages/Production/Index.tsx`
**Linha:** ~535 (função `handleGenerateAllScripts`)

**Antes:**
```typescript
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
    toast.error(e instanceof Error ? e.message : "Erro ao gerar roteiros.");
  }
};
```

**Depois (add console log + timeout):**
```typescript
const handleGenerateAllScripts = async () => {
  setLoading(true);
  try {
    for (const chapter of chapters) {
      if (chapter.script.trim()) continue;
      setStatusMessage(`Escrevendo cap. "${chapter.title}"...`);
      setGeneratingChapter(chapter.id);

      // ADD TIMEOUT
      const scriptPromise = generateChapterScript(chapter);
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout (30s) gerando roteiro")), 30000)
      );
      const script = await Promise.race([scriptPromise, timeoutPromise]);

      setChapters(prev => prev.map(ch =>
        ch.id === chapter.id ? { ...ch, script } : ch
      ));
    }
    setStep(3);
    toast.success("Todos os roteiros gerados!");
  } catch (e: unknown) {
    // IMPROVE ERROR HANDLING
    const errorMsg = e instanceof Error ? e.message : "Erro desconhecido ao gerar roteiros";
    toast.error(errorMsg);
    console.error("[DEBUG] handleGenerateAllScripts failed:", { error: e, chapters });
  } finally {
    setLoading(false);
    setStatusMessage("");
  }
};
```

### FIX 2: Adicionar Loading UI Feedback

**Arquivo:** `src/pages/Production/Index.tsx`
**Onde:** Render durante Step 2 quando `loading === true`

**Procurar por:**
```typescript
{step === 2 && (
  <Button
    onClick={handleGenerateAllScripts}
    disabled={loading || chapters.length === 0}
  >
    Gerar Roteiros
  </Button>
)}
```

**Adicionar antes:**
```typescript
{step === 2 && loading && (
  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
    <div className="flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <span className="text-sm text-white font-medium">{statusMessage}</span>
    </div>
    <Progress value={50} className="mt-2 h-1.5" />
  </div>
)}
```

---

## ✅ Passo 4: Testar o Fix (10 min)

```bash
# 1. Salvar arquivos
# 2. Vite auto-reload (check se não teve erro de TypeScript)
# 3. Voltar ao browser
# 4. Clicar "Novo"
# 5. Repetir Steps 1-2 (gerar sumário)
# 6. Clicar "Gerar Roteiros"
# 7. Esperar 30 segundos
```

**Esperado:**
- ✅ Toast "Todos os roteiros gerados!"
- ✅ Step muda para "Passo 3 de 8"
- ✅ Step 3 card aparece com roteiros
- ✅ Console sem errors

**Se ainda falhar:**
- Abrir DevTools → Console
- Copiar error message
- Procurar na Google: "[error message]"
- Pode ser API key inválida ou `/api-ai` proxy quebrado

---

## 🎬 Passo 5: Full Test (após fix)

Depois de consertar, fazer teste completo:

```
1. Reset wizard (botão "Novo") ✅
2. Step 1: 8 min, "5 dicas dormir melhor" ✅
3. "Gerar Sumário" → 3 capítulos ✅
4. "Gerar Roteiros" → Roteiros em cada capítulo ✅
5. "Gerar Narração" → Áudio (browser TTS) ✅
6. "Extrair Cenas" → Cenas extraídas ✅
7. "Gerar Imagens" → Imagens (placeholder) ✅
8. "Gerar Thumbnail" → Thumbnail gerado ✅
9. Video assembla e toca no player ✅
10. "Finalizar Conteúdo" → Salva em Supabase ✅
```

Se tudo passar: **PRONTO PARA CLIENTE! 🚀**

---

## 📋 Files a Mexer

| File | O quê | Linha |
|------|-------|-------|
| `src/pages/Production/Index.tsx` | Fix error handling + timeout | 535 |
| `src/pages/Production/Index.tsx` | Add loading UI | ~1210 |

---

## 🚨 Se Você Ficar Preso

**Sintoma 1:** "TypeScript error after changes"
→ Verificar sintaxe (colchetes, vírgulas, async/await)

**Sintoma 2:** "Toast not appearing"
→ Verificar se `toast` é importado no topo do arquivo
→ Verificar se `<Toaster />` está em `App.tsx`

**Sintoma 3:** "API ainda falhando"
→ Verificar `.env` tem VITE_AI33_API_KEY válida
→ Verificar se OpenRouter key funciona (curl test)
→ Verificar se `/api-ai` proxy está em `vite.config.ts`

---

## ⏱️ Timeline

```
[ 5 min] Reproduzir bug
[ 10 min] Investigar causa (console + API)
[ 20 min] Implementar fixes
[ 10 min] Testar
────────
[ 45 min] TOTAL
```

**Depois de consertar:**
- [ ] Commit + push
- [ ] Deploy para staging
- [ ] Cliente testa
- [ ] Deploy para prod

---

## 💾 Commit Message

```
fix: add error handling and timeout to script generation

- Add visible toast error when generateAllScripts fails
- Implement 30s timeout for API calls to prevent infinite hangs
- Add console logging for debugging
- Improve user feedback with loading spinner

Fixes: #[issue-number]
```

---

**Boa sorte! Você consegue!** 💪
