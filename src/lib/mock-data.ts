// Utility data for YouTube Dark Ops Platform

export type HealthStatus = 'green' | 'yellow' | 'red';
export type ContentStatus = 'draft' | 'scripting' | 'audio' | 'done';

// Voice options (ElevenLabs / TTS providers)
export const voiceOptions = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George - Grave, Suspense' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah - Profissional, Calma' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger - Autoritário, Sério' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura - Suave, Acolhedora' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam - Energético, Jovem' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel - Narrativo, Envolvente' },
];

// Niche/Category options for dark channels
export const nicheOptions = [
  { value: 'terror', label: '🩸 Terror / Mistério', color: 'bg-red-500/20 text-red-400' },
  { value: 'sobrenatural', label: '👻 Sobrenatural / Paranormal', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'conspiracao', label: '🔺 Conspiração / Teorias', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'biblico', label: '📜 Bíblico / Profético', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'crimes', label: '🔪 True Crime / Casos Reais', color: 'bg-rose-500/20 text-rose-400' },
  { value: 'mitologia', label: '⚡ Mitologia / Lendas', color: 'bg-indigo-500/20 text-indigo-400' },
  { value: 'ciencia_obscura', label: '🧬 Ciência Obscura', color: 'bg-teal-500/20 text-teal-400' },
  { value: 'historia_sombria', label: '⚔️ História Sombria', color: 'bg-stone-500/20 text-stone-400' },
  { value: 'espaco', label: '🌌 Espaço / Cosmos', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'ocultismo', label: '🕯️ Ocultismo / Esoterismo', color: 'bg-fuchsia-500/20 text-fuchsia-400' },
  { value: 'financas', label: '💰 Finanças / Investimentos', color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'psicologia', label: '🧠 Psicologia Dark', color: 'bg-cyan-500/20 text-cyan-400' },
  { value: 'tecnologia', label: '🤖 Tecnologia / IA', color: 'bg-sky-500/20 text-sky-400' },
  { value: 'curiosidades', label: '❓ Curiosidades / Top Lists', color: 'bg-violet-500/20 text-violet-400' },
  { value: 'custom', label: '🎯 Personalizado', color: 'bg-zinc-500/20 text-zinc-400' },
];

export const uploadFrequencyOptions = [
  { value: 'daily', label: 'Diário' },
  { value: '3x_week', label: '3x por semana' },
  { value: '2x_week', label: '2x por semana' },
  { value: 'weekly', label: 'Semanal' },
];

// Helper functions
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const getHealthColor = (health: string): string => {
  switch (health) {
    case 'green':
      return 'bg-health-green';
    case 'yellow':
      return 'bg-health-yellow';
    case 'red':
      return 'bg-health-red';
    default:
      return 'bg-health-green';
  }
};

export const getStatusBadge = (status: string): { label: string; className: string } => {
  switch (status) {
    case 'draft':
      return { label: 'Rascunho', className: 'bg-muted text-muted-foreground' };
    case 'scripting':
      return { label: 'Roteiro', className: 'bg-info/20 text-info' };
    case 'audio':
      return { label: 'Áudio', className: 'bg-warning/20 text-warning' };
    case 'done':
      return { label: 'Pronto', className: 'bg-success/20 text-success' };
    default:
      return { label: status, className: 'bg-muted text-muted-foreground' };
  }
};
