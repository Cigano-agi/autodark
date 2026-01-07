// Mock data for YouTube Dark Ops Platform

export type HealthStatus = 'green' | 'yellow' | 'red';
export type ContentStatus = 'draft' | 'scripting' | 'audio' | 'done';

export interface Channel {
  id: string;
  name: string;
  niche: string;
  nicheColor: string;
  subscribers: number;
  monthlyViews: number;
  health: HealthStatus;
  avatar?: string;
  blueprint?: ChannelBlueprint;
  metrics?: ChannelMetrics;
  contents?: ContentItem[];
}

export interface ChannelBlueprint {
  topic: string;
  voiceId: string;
  voiceName: string;
  scriptRules: string;
  visualStyle: string;
  uploadFrequency: string;
}

export interface ChannelMetrics {
  rpm: number;
  totalSubs: number;
  lastVideoViews: number;
  lastVideoDate: string;
  viewsOverTime: { date: string; views: number }[];
}

export interface ContentItem {
  id: string;
  title: string;
  status: ContentStatus;
  date: string;
}

// Voice options (ElevenLabs)
export const voiceOptions = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George - Grave, Suspense' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah - Profissional, Calma' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger - Autoritário, Sério' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura - Suave, Acolhedora' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam - Energético, Jovem' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel - Narrativo, Envolvente' },
];

// Niche options
export const nicheOptions = [
  { value: 'terror', label: 'Terror/Mistério', color: 'bg-red-500/20 text-red-400' },
  { value: 'financas', label: 'Finanças/Investimentos', color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'espiritualidade', label: 'Espiritualidade', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'saude', label: 'Saúde/Bem-estar', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'noticias', label: 'Notícias/Atualidades', color: 'bg-orange-500/20 text-orange-400' },
  { value: 'tecnologia', label: 'Tecnologia', color: 'bg-cyan-500/20 text-cyan-400' },
];

export const uploadFrequencyOptions = [
  { value: 'daily', label: 'Diário' },
  { value: '3x_week', label: '3x por semana' },
  { value: '2x_week', label: '2x por semana' },
  { value: 'weekly', label: 'Semanal' },
];

// Generate views data for last 30 days
const generateViewsData = (baseViews: number, volatility: number = 0.3) => {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const randomFactor = 1 + (Math.random() - 0.5) * volatility;
    const views = Math.floor(baseViews * randomFactor);
    data.push({
      date: date.toISOString().split('T')[0],
      views,
    });
  }
  return data;
};

// Mock channels data
export const mockChannels: Channel[] = [
  {
    id: 'ch_1',
    name: 'Curiosidades Terror',
    niche: 'Terror/Mistério',
    nicheColor: 'bg-red-500/20 text-red-400',
    subscribers: 45000,
    monthlyViews: 1200000,
    health: 'green',
    blueprint: {
      topic: 'terror',
      voiceId: 'JBFqnCBsd6RMkjVDRZzb',
      voiceName: 'George - Grave, Suspense',
      scriptRules: `- Sempre começar com um gancho misterioso
- Usar frases curtas e pausas dramáticas
- Incluir pelo menos 3 momentos de tensão
- Finalizar com cliffhanger ou revelação impactante
- Tom: Grave, envolvente, como se contasse um segredo`,
      visualStyle: `Thumbnails escuras com:
- Sombras profundas e iluminação dramática
- Rostos com expressões de medo/choque
- Texto em vermelho ou branco com contorno
- Elementos de mistério (olhos, sombras, névoa)`,
      uploadFrequency: 'daily',
    },
    metrics: {
      rpm: 4.50,
      totalSubs: 45000,
      lastVideoViews: 85000,
      lastVideoDate: '2024-01-05',
      viewsOverTime: generateViewsData(40000, 0.4),
    },
    contents: [
      { id: 'c1', title: 'A Casa que NINGUÉM consegue dormir', status: 'done', date: '2024-01-05' },
      { id: 'c2', title: '5 Casos reais que a polícia NUNCA explicou', status: 'audio', date: '2024-01-06' },
      { id: 'c3', title: 'O mistério do prédio abandonado', status: 'scripting', date: '2024-01-07' },
      { id: 'c4', title: 'Histórias de enfermeiros do turno da noite', status: 'draft', date: '2024-01-08' },
    ],
  },
  {
    id: 'ch_2',
    name: 'Dinheiro Inteligente',
    niche: 'Finanças/Investimentos',
    nicheColor: 'bg-emerald-500/20 text-emerald-400',
    subscribers: 12000,
    monthlyViews: 380000,
    health: 'yellow',
    blueprint: {
      topic: 'financas',
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      voiceName: 'Sarah - Profissional, Calma',
      scriptRules: `- Começar com dado ou estatística impactante
- Explicar conceitos de forma simples
- Usar exemplos práticos do dia a dia
- Incluir chamada para ação clara
- Tom: Confiante, educativo, acessível`,
      visualStyle: `Thumbnails profissionais com:
- Fundo escuro com elementos verdes/dourados
- Gráficos ou ícones de dinheiro
- Números grandes em destaque
- Expressão facial séria/confiante`,
      uploadFrequency: '3x_week',
    },
    metrics: {
      rpm: 8.20,
      totalSubs: 12000,
      lastVideoViews: 15000,
      lastVideoDate: '2024-01-04',
      viewsOverTime: generateViewsData(12000, 0.5),
    },
    contents: [
      { id: 'c5', title: '5 investimentos para iniciantes em 2024', status: 'done', date: '2024-01-04' },
      { id: 'c6', title: 'Como economizar R$500 por mês', status: 'done', date: '2024-01-02' },
      { id: 'c7', title: 'Renda passiva: mitos e verdades', status: 'scripting', date: '2024-01-07' },
    ],
  },
  {
    id: 'ch_3',
    name: 'Conexão Espiritual',
    niche: 'Espiritualidade',
    nicheColor: 'bg-purple-500/20 text-purple-400',
    subscribers: 28000,
    monthlyViews: 650000,
    health: 'green',
    blueprint: {
      topic: 'espiritualidade',
      voiceId: 'FGY2WhTYpPnrIDTdsKH5',
      voiceName: 'Laura - Suave, Acolhedora',
      scriptRules: `- Começar com afirmação positiva ou reflexão
- Manter tom calmo e reconfortante
- Incluir momentos de pausa para reflexão
- Usar metáforas e linguagem poética
- Tom: Sereno, inspirador, acolhedor`,
      visualStyle: `Thumbnails místicas com:
- Cores suaves (roxo, azul, dourado)
- Elementos celestiais (luz, estrelas, nuvens)
- Símbolos espirituais sutis
- Atmosfera de paz e serenidade`,
      uploadFrequency: '2x_week',
    },
    metrics: {
      rpm: 3.80,
      totalSubs: 28000,
      lastVideoViews: 42000,
      lastVideoDate: '2024-01-05',
      viewsOverTime: generateViewsData(22000, 0.25),
    },
    contents: [
      { id: 'c8', title: 'Mensagem do universo para você hoje', status: 'done', date: '2024-01-05' },
      { id: 'c9', title: 'Sinais que sua vida vai mudar', status: 'audio', date: '2024-01-07' },
    ],
  },
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

export const getHealthColor = (health: HealthStatus): string => {
  switch (health) {
    case 'green':
      return 'bg-health-green';
    case 'yellow':
      return 'bg-health-yellow';
    case 'red':
      return 'bg-health-red';
  }
};

export const getStatusBadge = (status: ContentStatus): { label: string; className: string } => {
  switch (status) {
    case 'draft':
      return { label: 'Rascunho', className: 'bg-muted text-muted-foreground' };
    case 'scripting':
      return { label: 'Roteiro', className: 'bg-info/20 text-info' };
    case 'audio':
      return { label: 'Áudio', className: 'bg-warning/20 text-warning' };
    case 'done':
      return { label: 'Pronto', className: 'bg-success/20 text-success' };
  }
};
