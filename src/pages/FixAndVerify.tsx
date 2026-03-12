import { useState } from "react";

const PROMPT_SCRAPER = `Você é o Antigravity. Preciso que você corrija a Edge Function \`scrape-youtube-channel\` para que ela salve o \`youtube_channel_id\` na tabela \`channels\` após o scrape.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 CONTEXTO DO PROBLEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Tabela \`channels\` tem 3 registros com \`youtube_channel_id = NULL\`
- A Edge Function existe e roda via Apify (scrape-youtube-channel)
- O scrape executa mas não persiste o ID no banco
- Sem o ID salvo, a sync-youtube-metrics não funciona

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 O QUE PRECISO QUE VOCÊ FAÇA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Abra o código atual da Edge Function scrape-youtube-channel
2. Identifique qual campo do retorno da Apify contém o channel ID
   (pode ser: channelId, id, externalId, ucid — confirme no payload real)
3. Adicione ou corrija o UPDATE/UPSERT para salvar esse valor em:
   channels.youtube_channel_id WHERE id = <channel_uuid>
4. Mostre o código corrigido completo da função
5. Mostre o SQL para reprocessar os 3 canais existentes manualmente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 ENTREGÁVEIS ESPERADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A) Código corrigido da Edge Function (arquivo completo)
B) Qual campo exato do Apify é o channel ID
C) SQL ou comando para reprocessar os 3 canais (Mundo Soturno, PATRIOTA SINCERO, Curiosidades Terror)
D) Como confirmar que o fix funcionou (query de validação)

Seja direto. Mostre o código, não apenas a explicação.`;

const verifySteps = [
  {
    id: "A",
    color: "#38bdf8",
    title: "Verificar se o ID foi salvo",
    context: "Rode no Supabase SQL Editor — Table Editor > SQL",
    commands: [
      {
        label: "Checar os 3 canais",
        code: `SELECT id, name, youtube_channel_id, updated_at
FROM channels
ORDER BY updated_at DESC;`,
        expect: "youtube_channel_id deve estar preenchido (ex: UCxxxxxxxx) — não NULL"
      }
    ]
  },
  {
    id: "B",
    color: "#a78bfa",
    title: "Disparar sincronização manual",
    context: "No terminal, com Supabase CLI",
    commands: [
      {
        label: "Invocar re-scrape via CLI",
        code: `supabase functions invoke scrape-youtube-channel \\
  --body '{"channel_id": "<ID>", "youtube_url": "<URL>"}'`,
        expect: "Resposta 200 OK com metrics_imported"
      }
    ]
  },
  {
    id: "C",
    color: "#34d399",
    title: "Confirmar métricas na tabela",
    context: "De volta ao SQL Editor",
    commands: [
      {
        label: "Checar se channel_metrics foi populado",
        code: `SELECT 
  c.name,
  cm.views,
  cm.rpm,
  cm.estimated_revenue,
  cm.video_title,
  cm.recorded_at
FROM channel_metrics cm
JOIN channels c ON c.id = cm.channel_id
ORDER BY cm.recorded_at DESC
LIMIT 20;`,
        expect: "Deve retornar rows com títulos de vídeos e dados reais"
      },
      {
        label: "Contagem rápida",
        code: `SELECT count(*) as total_rows, 
       max(recorded_at) as ultima_sync 
FROM channel_metrics;`,
        expect: "total_rows > 0 ✓"
      }
    ]
  },
  {
    id: "D",
    color: "#fb923c",
    title: "Ver logs do scraper",
    context: "Debugar via CLI",
    commands: [
      {
        label: "Logs do unificado",
        code: `supabase functions logs scrape-youtube-channel --tail 50`,
        expect: "Confirme o fluxo de persistência no log"
      }
    ]
  }
];

export default function FixAndVerify() {
  const [promptCopied, setPromptCopied] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState<string | null>("A");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const copyPrompt = () => {
    navigator.clipboard.writeText(PROMPT_SCRAPER);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const copyCmd = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 1800);
  };

  const toggleCheck = (key: string) => setChecked(c => ({ ...c, [key]: !c[key] }));
  const totalChecks = Object.values(checked).filter(Boolean).length;
  const totalItems = verifySteps.reduce((a, s) => a + s.commands.length, 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#040608",
      color: "#e2e8f0",
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      padding: "28px 16px"
    }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: "#4c1d95", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
            Autodark · Fix Pipeline
          </div>
          <h1 style={{
            margin: "0 0 6px", fontSize: 24, fontWeight: 900, letterSpacing: "-0.5px",
            background: "linear-gradient(135deg, #fff 40%, #a78bfa)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            Desbloqueio do Scraper
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "#475569", fontFamily: "sans-serif" }}>
            Passo 1: envie o prompt ao Antigravity → Passo 2: verifique manualmente
          </p>
        </div>

        {/* STEP 1 — Prompt */}
        <div style={{
          background: "#07030f", border: "1px solid #4c1d95",
          borderRadius: 10, marginBottom: 24, overflow: "hidden"
        }}>
          <div style={{
            padding: "12px 18px", borderBottom: "1px solid #1e0a3c",
            display: "flex", alignItems: "center", gap: 10
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "#4c1d95", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, flexShrink: 0
            }}>1</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>
              Prompt para o Antigravity corrigir o scraper
            </span>
          </div>

          <pre style={{
            margin: 0, padding: "16px 18px",
            fontSize: 11, color: "#64748b", whiteSpace: "pre-wrap",
            lineHeight: 1.8, maxHeight: 200, overflow: "auto",
            background: "#020309"
          }}>{PROMPT_SCRAPER}</pre>

          <div style={{ padding: "12px 18px", borderTop: "1px solid #0f0520" }}>
            <button onClick={copyPrompt} style={{
              width: "100%", padding: "11px",
              background: promptCopied
                ? "linear-gradient(135deg, #15803d, #166534)"
                : "linear-gradient(135deg, #4c1d95, #6d28d9)",
              border: "none", borderRadius: 8,
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "monospace", letterSpacing: 1,
              transition: "all 0.3s"
            }}>
              {promptCopied ? "✓  COPIADO — COLE NO ANTIGRAVITY" : "⬡  COPIAR PROMPT DO SCRAPER"}
            </button>
          </div>
        </div>

        {/* STEP 2 — Verificação manual */}
        <div style={{
          background: "#030a08", border: "1px solid #14532d",
          borderRadius: 10, overflow: "hidden", marginBottom: 24
        }}>
          <div style={{
            padding: "12px 18px", borderBottom: "1px solid #052e16",
            display: "flex", alignItems: "center", gap: 10
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "#15803d", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, flexShrink: 0
            }}>2</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>
              Verificação manual — confirmar que funcionou
            </span>
            <span style={{
              marginLeft: "auto", fontSize: 11, color: "#166534",
              background: "#052e16", padding: "2px 8px", borderRadius: 4
            }}>{totalChecks}/{totalItems} checados</span>
          </div>

          {/* Progress */}
          <div style={{ height: 3, background: "#052e16" }}>
            <div style={{
              height: "100%", background: "linear-gradient(90deg, #15803d, #34d399)",
              width: `${(totalChecks / totalItems) * 100}%`, transition: "width 0.4s"
            }} />
          </div>

          {/* Verify steps */}
          <div style={{ padding: "12px" }}>
            {verifySteps.map((step) => {
              const isOpen = openStep === step.id;
              return (
                <div key={step.id} style={{
                  marginBottom: 8, borderRadius: 8, overflow: "hidden",
                  border: `1px solid ${isOpen ? step.color + "33" : "#0f172a"}`,
                  background: isOpen ? step.color + "06" : "#050a0d"
                }}>
                  <div
                    onClick={() => setOpenStep(isOpen ? null : step.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "11px 14px", cursor: "pointer"
                    }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: 4,
                      background: step.color + "22", color: step.color,
                      fontSize: 11, fontWeight: 800, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>{step.id}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, flex: 1, color: "#e2e8f0" }}>
                      {step.title}
                    </span>
                    <span style={{ fontSize: 10, color: "#334155", fontFamily: "sans-serif" }}>
                      {step.commands.length} cmd{step.commands.length > 1 ? "s" : ""}
                    </span>
                    <span style={{ color: "#334155", fontSize: 11 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>

                  {isOpen && (
                    <div style={{ padding: "0 14px 14px" }}>
                      <div style={{
                        fontSize: 10, color: "#334155", fontFamily: "sans-serif",
                        marginBottom: 10, paddingLeft: 30
                      }}>📍 {step.context}</div>

                      {step.commands.map((cmd, ci) => {
                        const ck = `${step.id}-${ci}`;
                        return (
                          <div key={ci} style={{ marginBottom: 12, paddingLeft: 30 }}>
                            <div style={{
                              display: "flex", alignItems: "center", gap: 8, marginBottom: 6
                            }}>
                              <input
                                type="checkbox"
                                checked={!!checked[ck]}
                                onChange={() => toggleCheck(ck)}
                                style={{ accentColor: step.color, cursor: "pointer", width: 14, height: 14 }}
                              />
                              <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "sans-serif" }}>
                                {cmd.label}
                              </span>
                            </div>

                            <div style={{
                              background: "#020409", border: "1px solid #111827",
                              borderRadius: 6, padding: "10px 12px", position: "relative"
                            }}>
                              <pre style={{
                                margin: 0, fontSize: 11, color: "#86efac",
                                whiteSpace: "pre-wrap", lineHeight: 1.7,
                                paddingRight: 60
                              }}>{cmd.code}</pre>
                              <button
                                onClick={() => copyCmd(ck, cmd.code)}
                                style={{
                                  position: "absolute", top: 7, right: 7,
                                  background: copiedCmd === ck ? "#15803d" : "#1e293b",
                                  border: "none", color: "#94a3b8",
                                  borderRadius: 4, padding: "2px 8px",
                                  fontSize: 10, cursor: "pointer", transition: "background 0.2s"
                                }}
                              >{copiedCmd === ck ? "✓" : "copiar"}</button>
                            </div>

                            <div style={{
                              fontSize: 10, color: "#475569", fontFamily: "sans-serif",
                              marginTop: 5, paddingLeft: 4
                            }}>
                              <span style={{ color: step.color }}>✓ Esperado: </span>{cmd.expect}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Success */}
        {totalChecks === totalItems && (
          <div style={{
            padding: 20, borderRadius: 10, textAlign: "center",
            background: "rgba(21,128,61,0.1)", border: "1px solid #15803d"
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#22c55e" }}>Pipeline funcionando!</div>
            <div style={{ fontSize: 12, color: "#86efac", marginTop: 4, fontFamily: "sans-serif" }}>
              channel_metrics populado · Autodark com combustível · próximo: ativar pg_cron
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 10, color: "#1e293b", marginTop: 16, fontFamily: "sans-serif" }}>
          Após confirmar tudo · volte aqui para configurar o pg_cron automático
        </p>
      </div>
    </div>
  );
}
