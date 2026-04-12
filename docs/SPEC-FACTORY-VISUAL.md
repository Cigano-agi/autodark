# 📑 SPEC: FACTORY VISUAL (Production Conveyor Belt)
**Status:** DRAFT
**Agent:** `@frontend-specialist`

## 1. Metáfora Visual
A tela de produção deve ser envolta em um container que simula uma **sala de controle blindada**.
- **Background**: `bg-[#050508]` com grid sutil.
- **Conveyor Belt**: Uma linha animada (framer-motion) que transporta "blocos de dados" de um estágio para o outro.
- **Glass Protection**: Uso intensivo de `backdrop-blur-md` e bordas `border-white/10` para simular painéis de vidro.

## 2. Real-time Generation Text
O texto gerado pela IA (Roteiro e Headlines) não deve apenas aparecer.
- **Efeito Faded**: O texto novo aparece com opacidade progressiva.
- **Markdown Core**: O componente deve interpretar `#`, `**` e `>` para criar hierarquia visual imediata durante a geração.
- **Headlines de Impacto**: Títulos de capítulos devem usar fontes `Display` (ex: Russo One ou Syne) com `italic` e `font-black`.

## 3. Localização (Dark Ops)
Substituir todos os termos genéricos:
- `Dashboard` -> **Quartel General**
- `Media Hub` -> **Arsenal de Ativos**
- `Production Wizard` -> **Esteira de Produção**
- `Channels` -> **Canais da Rede**
- `Intelligence Directive` -> **Pauta do Vídeo**

## 4. Correção de Contraste
- **PROIBIDO**: `text-black`, `text-neutral-900`.
- **PADRÃO**: `text-white` para títulos, `text-white/60` para descrições, `text-primary` (Amber/Orange) para destaques operacionais.
