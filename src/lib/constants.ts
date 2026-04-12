
export interface NicheOption {
  value: string;
  label: string;
  color: string;
  description?: string;
}

export const nicheOptions: NicheOption[] = [
  { value: 'terror', label: '🩸 Terror / Mistério', color: 'bg-red-500/20 text-red-400', description: 'Histórias assustadoras e lendas urbanas' },
  { value: 'sobrenatural', label: '👻 Sobrenatural / Paranormal', color: 'bg-orange-500/20 text-orange-400', description: 'Fantasmas, espíritos e o inexplicável' },
  { value: 'conspiracao', label: '🔺 Conspiração / Teorias', color: 'bg-amber-500/20 text-amber-400', description: 'Teorias da conspiração e segredos mundiais' },
  { value: 'biblico', label: '📜 Bíblico / Profético', color: 'bg-yellow-500/20 text-yellow-400', description: 'Histórias da bíblia e profecias' },
  { value: 'crimes', label: '🔪 True Crime / Casos Reais', color: 'bg-rose-500/20 text-rose-400', description: 'Investigações criminais e casos famosos' },
  { value: 'mitologia', label: '⚡ Mitologia / Lendas', color: 'bg-indigo-500/20 text-indigo-400', description: 'Deuses, heróis e mitos antigos' },
  { value: 'ciencia_obscura', label: '🧬 Ciência Obscura', color: 'bg-teal-500/20 text-teal-400', description: 'Fatos científicos bizarros e curiosos' },
  { value: 'historia_sombria', label: '⚔️ História Sombria', color: 'bg-stone-500/20 text-stone-400', description: 'O lado obscuro dos grandes eventos' },
  { value: 'espaco', label: '🌌 Espaço / Cosmos', color: 'bg-blue-500/20 text-blue-400', description: 'Mistérios do universo e exploração espacial' },
  { value: 'ocultismo', label: '🕯️ Ocultismo / Esoterismo', color: 'bg-fuchsia-500/20 text-fuchsia-400', description: 'Práticas ocultas e sociedades secretas' },
  { value: 'financas', label: '💰 Finanças / Investimentos', color: 'bg-emerald-500/20 text-emerald-400', description: 'Dicas de dinheiro e histórias de sucesso' },
  { value: 'psicologia', label: '🧠 Psicologia Dark', color: 'bg-cyan-500/20 text-cyan-400', description: 'Truques mentais e o subconsciente' },
  { value: 'tecnologia', label: '🤖 Tecnologia / IA', color: 'bg-sky-500/20 text-sky-400', description: 'Gadgets e inovações do futuro' },
  { value: 'curiosidades', label: '❓ Curiosidades / Top Lists', color: 'bg-violet-500/20 text-violet-400', description: 'Fatos interessantes e listas "Top 10"' },
  { value: 'custom', label: '🎯 Personalizado', color: 'bg-zinc-500/20 text-zinc-400', description: 'Crie seu próprio nicho' },
];

export const voiceOptions = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George - Grave, Suspense' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah - Profissional, Calma' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger - Autoritário, Sério' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura - Suave, Acolhedora' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam - Energético, Jovem' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel - Narrativo, Envolvente' },
];

export const uploadFrequencyOptions = [
  { value: 'daily', label: 'Diário' },
  { value: '3x_week', label: '3x por semana' },
  { value: '2x_week', label: '2x por semana' },
  { value: 'weekly', label: 'Semanal' },
];
