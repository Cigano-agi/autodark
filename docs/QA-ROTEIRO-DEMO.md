# AUTODARK — Roteiro de QA para Demo
**Build:** `main @ 2459e47` · **Data:** 08/04/2026

---

## 1. LOGIN `/`
| # | Ação | Esperado | Status |
|---|---|---|---|
| 1 | Acessar URL raiz | Tela de login, sem branco | |
| 2 | Submit sem campos | Toast: "Preencha todos os campos" | |
| 3 | Login e-mail/senha válidos | Redireciona para `/dashboard` | |
| 4 | Login com Google | Redireciona para `/dashboard` | |
| 5 | Já logado, acessar `/` | Redireciona automático | |

## 2. DASHBOARD `/dashboard`
| # | Ação | Esperado | Status |
|---|---|---|---|
| 6 | Ver com canais | Grid aparece | |
| 7 | Ver sem canais | Empty state + botão "Adicionar Canal" | |
| 8 | Clicar "Adicionar Canal" | Modal Step 1 abre | |
| 9 | Avançar sem preencher | Toast de erro | |
| 10 | Preencher e "Continuar" | Step 2 aparece | |
| 11 | Clicar "Criar Canal" | Canal no grid + toast | |
| 12 | Buscar canal | Filtra em tempo real | |
| 13 | Clicar num canal | Navega para `/channel/:id` | |

## 3. CANAL `/channel/:id`
| # | Ação | Esperado | Status |
|---|---|---|---|
| 14 | Abrir canal | Header + tabs visíveis | |
| 15 | Navegar pelas tabs | Todas renderizam sem crash | |
| 16 | Sidebar: DNA do Canal | Navega para `/foundation` | |
| 17 | Sidebar: Production Factory | Navega para `/production` | |
| 18 | Sidebar: Cérebro IA | Navega para `/prompts` | |

## 4. PRODUÇÃO `/channel/:id/production`
| # | Ação | Esperado | Status |
|---|---|---|---|
| 19 | Abrir | "Esteira de Produção", sem termos militares | |
| 20 | "Iniciar Produção" sem tema | Botão desabilitado | |
| 21 | Preencher e iniciar | Pipeline começa | |
| 22 | Clicar "Voltar" | Retorna ao canal | |
| 23 | Clicar "Reiniciar" | Reseta estado | |

## 5. FILA GLOBAL `/pipeline`
| # | Ação | Esperado | Status |
|---|---|---|---|
| 24 | Abrir | 3 tabs: Monitor ao Vivo / Roteiros / Tópicos | |
| 25 | Monitor ao Vivo | Cards ou empty state correto | |
| 26 | Roteiros | Lista ou "Nenhum roteiro ainda" | |
| 27 | Tópicos | Lista ou "Nenhum tópico ainda" | |
| 28 | Aprovar tópico | Status muda | |
| 29 | Rejeitar tópico | Status muda | |
| 30 | "Ver roteiro" | Expande conteúdo | |

## 6. DNA DO CANAL `/channel/:id/foundation`
| # | Ação | Esperado | Status |
|---|---|---|---|
| 31 | Abrir | 5 módulos no topo | |
| 32 | Preencher Módulo A | Campos funcionam | |
| 33 | "Próximo Módulo" | Avança + salva | |
| 34 | "Salvar Rascunho" | Toast de sucesso | |
| 35 | No Módulo E, "Gerar Diretrizes" | Loader + diretrizes aparecem | |

## 7. MEDIA HUB `/hub`
| # | Ação | Esperado | Status |
|---|---|---|---|
| 36 | Abrir | Renderiza sem erro | |
| 37 | Trocar canal no select | Conteúdo atualiza | |

## 8. SIDEBAR
| # | Ação | Esperado | Status |
|---|---|---|---|
| 38 | Toggle sidebar | Abre/fecha com animação | |
| 39 | Logo | "Plataforma de Criação" (não "Command Center") | |
| 40 | Label principal | "Navegação" (não "Operações Estratégicas") | |
| 41 | Dentro de canal | "Configurações do Canal" visível | |
| 42 | Botão logout | Tooltip "Sair", faz logout | |

---
## CRITÉRIOS
- ✅ **PRONTO:** itens 1–13 passando
- ⚠️ **Aceitável:** itens 14–42 com ≤ 2 issues menores
- ❌ **Bloqueia:** tela branca, crash, ou criação de canal quebrada
