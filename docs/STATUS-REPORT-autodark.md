# Relatório de Status: AutoDark (Março 2026)

Este relatório reflete a situação técnica atual da aplicação AutoDark, separando o que está em produção (funcionando com dados reais), o que ainda utiliza dados simulados (mockados) e o que está pendente de implementação.

---

## 🟢 1. O Que Está Funcionando (Produção / Real)

A infraestrutura base e o fluxo principal de dados já estão conectados ao Supabase e operando com dados reais.

- **Autenticação (Login/Cadastro)**: Funcional via Supabase Auth.
  - O sistema de login está operando e protege as rotas internas. Usuários ("Grilo" ou qualquer membro da equipe interna) podem acessar e visualizar apenas os seus canais.
- **Banco de Dados (Supabase)**: Schemas aplicados com RLS (Row Level Security) garantindo segurança. Funcionalidades de CRUD ativas para:
  - Canais (`channels`)
  - Blueprints / Personas (`channel_blueprints`)
  - Métricas (`channel_metrics`)
  - Conteúdos (`channel_contents`)
  - Ideias de Conteúdo (`content_ideas`)
  - Prompts de Canal (`channel_prompts`)
- **Edge Functions (IA & Scrapers)**:
  - `scrape-youtube-channel`: Importa canais inteiros do YouTube usando Apify (URL real), preenchendo o banco de dados do AutoDark com as estatísticas do canal e últimos vídeos.
  - `generate-strategy`: Integrado com OpenRouter (Head Agent), gerando estratégias e roteiros em formato JSON e salvando automaticamente na aba "Ideias AI".
  - `sync-youtube-metrics`: Sincroniza métricas recorrentes do YouTube.
- **Rotas e Separação por Canal**: 
  - A interface agora navega corretamente dentro do escopo de um canal específico (`/channel/:id/strategy`, `/channel/:id/prompts`, etc).
- **Gerenciador de Prompts**: 
  - Interface real e funcional para cadastrar e editar templates de variáveis que serão enviados para as IAs (ex: `[[TEMA]]`).

---

## 🟡 2. O Que Está Pendente do Fluxo N8N e Motor de Vídeo Longo

Com a remoção da Kie.ai, a criação de canal e a edição agora se tornam nativas na plataforma. 

1. **Pipeline de Edição de Vídeo Longo (Client-Side com FFmpeg.wasm)**:
   - Substituição oficial do N8N na esteira final.
   - **Necessidade**: Refinar a interface de estúdio (`LongVideoStudio.tsx`) onde o usuário pode ler o roteiro da API `ai33.pro`, escolher áudios de background (que já foram providenciados no repositório) e mandar renderizar localmente.
2. **Setup do Roteiro Avançado (Blueprint Variables)**:
   - **Necessidade**: Adicionar as variáveis injetáveis (Tom de voz, restrições algorítmicas, etc) para a IA criar o `prompt` exato para a esteira de imagens.
3. **Injeção Automática de Diretrizes YouTube**:
   - Para impedir desmonetização, o prompt system do AutoDark precisa enviar regras pesadas de "Family Friendly" ao LLM em cada chamada da pipeline do N8N refeita, bloqueando narrativas restritas.

---

**Resumo da Ópera**: O motor do banco de dados está redondo, os usuários reais com divisão por RLS estão criados e as categorias para Dark Channels já rodam dinâmicas. O próximo salto é integrar as etapas reconstruídas do seu N8N (Geração de Roteiro -> Separação de Cenas -> Áudio BGM -> Renderização com FFmpeg) na UI Studio!
