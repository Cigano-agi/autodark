import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getFriendlyErrorMessage } from "@/utils/errorHandler";
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Blueprint {
  id: string;
  channel_id: string;
  topic: string | null;
  voice_id: string | null;
  voice_name: string | null;
  script_rules: string | null;
  visual_style: string | null;
  upload_frequency: string | null;
  persona_prompt: string | null;
  target_audience: string | null;
  character_description: string | null;
  style_reference_url: string | null;
  character_consistency: boolean;
  scenes_image_ratio: number;
  scenes_video_ratio: number;
  custom_music_url: string | null;
  char_limit: number | null;
  cta: string | null;
  reference: string | null;
  videos_per_batch: number | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateBlueprintData {
  topic?: string | null;
  voice_id?: string | null;
  voice_name?: string | null;
  script_rules?: string | null;
  visual_style?: string | null;
  upload_frequency?: string | null;
  persona_prompt?: string | null;
  target_audience?: string | null;
  character_description?: string | null;
  style_reference_url?: string | null;
  character_consistency?: boolean | null;
  scenes_image_ratio?: number | null;
  scenes_video_ratio?: number | null;
  custom_music_url?: string | null;
  char_limit?: number | null;
  cta?: string | null;
  reference?: string | null;
  videos_per_batch?: number | null;
}

export const VISUAL_STYLE_OPTIONS = [
  // ── Estilos genéricos (qualquer nicho) ──────────────────────────────────────
  { value: 'cinematografico',   label: '🎬 Cinematográfico — Qualquer nicho, qualidade de filme' },
  { value: '3d-hiper',          label: '🌌 3D Hiper-realista — Ciência, tech, sci-fi, mistério' },
  { value: 'documental',        label: '📷 Documental fotográfico — Jornalismo, true crime, história' },
  { value: '2d-luminoso',       label: '✨ 2D Animado Luminoso — Espiritual, motivacional, infantil' },
  { value: 'dark-atmosferico',  label: '🖤 Dark Atmosférico — Terror, psicologia, mistério, filosofia' },
  { value: 'microscopico',      label: '🔬 Microscópico / Macro — Ciência, saúde, natureza, biologia' },
  { value: 'minimalista',       label: '⬜ Minimalista Clean — Negócios, tech, finanças, produtividade' },
  { value: 'urbano',            label: '🏙️ Urbano Cultural — Lifestyle, música, viagem, cultura' },

  // ── Estilos n8n (Específicos do Pipeline) ──────────────────────────────────
  { value: 'biblico-n8n',       label: '📜 Bíblico (Estilo n8n) — 2D animado, luminoso, quente' },
  { value: 'darkside-n8n',      label: '👽 Darkside (Estilo n8n) — 3D hiper-realista, dramático' },
  { value: 'terror-n8n',        label: '🏚️ Terror (Estilo n8n) — Fotografia true crime, documental' },
  { value: 'jazz-n8n',          label: '🎷 Jazz with J (Estilo n8n) — Noir, clássico, elegante' },
];

// Maps preset value → rich image generation prompt used in scene generation.
// Inspired by production-grade n8n pipeline prompts — work for any topic within each style.
export const VISUAL_STYLE_PROMPTS: Record<string, string> = {

  'biblico-n8n': `
2D stylized illustration, luminous and warm aesthetic. Character design inspired by biblical or historical epics.
Lighting: soft radiant golden glow, divine rays of light, aura effects, warm sunset tones.
Colors: rich amber, golden yellow, sky blue, soft white, earthy terracotta.
Style: clean lines, expressive and symbolic shapes, painterly textures.
Composition: epic and meaningful, metaphorical representation of faith, hope or ancient history.
No text, no modern objects, no logos. No realistic human faces (stylized 2D).
High resolution illustration, 4K sharp, ethereal atmosphere.
`.trim(),

  'darkside-n8n': `
3D hyper-realistic render, dramatic alien or sci-fi lighting.
Lighting: high contrast, directional beams, neon blue or toxic green localized glows.
Deep black shadows, volumetric particles, floating space debris.
Colors: charcoal grey, deep navy, vibrant electric cyan and neon violet accents.
Elements: futuristic technology, unknown scientific phenomena, alien structures, deep space void.
Style: cinematic 3D CGI, Unreal Engine 5 quality, Octane Render, 8K ultra detailed.
No text, no human elements, no common objects. Surreal and dark.
`.trim(),

  'terror-n8n': `
Hyper-realistic true crime photography. Investigative documentary style.
Lighting: low-key, desaturated, high contrast. Flashlight effects, partial illumination of dark spaces.
Atmosphere: psychologically unsettling, isolated, abandoned.
Colors: desaturated blacks, cold greys, muted blues and browns. Minimal warm light.
Elements: evidence bags, tape, empty dark corridors, abandoned rural structures, grainy security footage feel.
No explicit violence, no bodies. Purely atmospheric psychological horror.
Shot on 35mm film, grainy texture, natural depth of field, sharp focus on unsettling details.
`.trim(),

  'jazz-n8n': `
Classic noir photography style. Elegant and moody jazz club aesthetic.
Lighting: high contrast black and white (or very desaturated). Rim lighting on musical instruments.
Atmosphere: smokey, intimate, sophisticated, timeless.
Colors: monochrome or deep sepia with gold accents.
Elements: shadows of musical instruments, smoke patterns, classic urban nightlife details, stage lighting.
No faces, no text. Evocative of golden era jazz and noir cinema.
Film noir aesthetic, cinematic grain, soft bokeh, sharp contrast.
`.trim(),

  cinematografico: `
Cinematic photography, anamorphic lens flare, dramatic directional lighting, deep shadows,
high contrast, rich color grading. Atmosphere: epic, immersive, emotionally charged.
Colors: deep blacks, saturated midtones, golden highlights or cold steel tones depending on mood.
Composition: rule of thirds, depth of field, foreground elements framing the subject.
No text, no logos, no watermarks. No human faces. Purely visual and cinematic.
Style: feature film still, shot on ARRI Alexa, 4K, ultra sharp.
`.trim(),

  '3d-hiper': `
3D hyper-realistic render, physically plausible yet surreal subject matter.
Lighting: dramatic, directional, high contrast with deep shadows and localized bright spots.
Volumetric light visible in particles, fog or translucent materials. Emissive glow on surfaces.
Colors: deep black base, dark blue, purple, with electric cyan, neon blue or toxic green accents.
Elements: floating structures, fragmented matter, suspended particles, impossible geometries,
molecular or cosmic scale, isolated in deep void or infinite dark space.
No human faces, no text, no everyday objects. No motivational or generic aesthetics.
Unreal Engine quality, Octane render, ultra detailed, 8K.
`.trim(),

  documental: `
Hyper-realistic documentary photography. Style: investigative journalism, reportage, true crime.
The image must look like a real photograph taken by a camera, not CGI or illustration.
Lighting: low-key, dramatic, cold or neutral light, street lamps, flashlights, partial illumination.
Shadows dominate the composition. Only part of the scene is revealed.
Colors: desaturated palette — deep black, dark grey, cold blue, muted brown. Minimal warm accents.
Elements: empty environments, closed doors, dark corridors, abandoned spaces, urban or rural isolation.
Objects left behind suggesting something happened. No bodies, no violence, no explicit content.
No faces, no text, no logos. Feels psychologically unsettling, not graphically explicit.
Shot on full-frame camera, photojournalism aesthetic, grain texture, natural depth of field.
`.trim(),

  '2d-luminoso': `
2D stylized illustration, semi-flat or painterly. Atmosphere: luminous, warm, hopeful, uplifting.
Lighting: soft radiant light, golden glow, aura effects, divine or natural light sources.
Colors: vibrant warm tones — golden yellow, amber, sky blue, soft white, coral. No dark or cold tones.
Style: animated illustration, clean lines, expressive shapes, symbolic and metaphorical scenes.
Elements: symbolic figures in meaningful situations, natural or celestial environments,
metaphors of transformation, growth, peace, hope or inspiration. No realistic human faces.
No text, no letters, no logos. Evokes positive emotion through pure visual composition.
Suitable for: motivational, spiritual, self-help, educational, children's content of any topic.
`.trim(),

  'dark-atmosferico': `
Dark atmospheric digital art. Atmosphere: mysterious, psychological, unsettling, philosophical.
Lighting: almost entirely shadows, single cold or colored light source creating dramatic silhouettes.
Deep vignette. Fog, smoke or mist enhancing depth and mystery. Colors: near-black base,
dark navy, deep purple, charcoal grey. Accent colors: pale blue, dim red, sickly green or amber.
Elements: empty spaces, symbolic objects, surreal environments, architectural isolation,
distorted or fragmented forms suggesting inner conflict or hidden knowledge.
Style: dark surrealism, noir illustration, conceptual art. No explicit horror, no gore, no violence.
Psychologically atmospheric, not graphically disturbing. No text, no faces.
`.trim(),

  microscopico: `
Extreme macro or microscopic photography / 3D scientific visualization.
Scale: cellular, molecular, biological, or natural macro — things invisible to the naked eye made monumental.
Lighting: backlit specimens, bioluminescence, fluorescence, lab lighting, point-light sources inside structures.
Colors: teal, electric blue, cyan, bright orange, magenta on dark background — or natural specimen colors
dramatically lit against black void.
Elements: neurons, synapses, DNA strands, crystals, insect parts, plant cells, water droplets,
fungal networks, coral structures, mineral formations — at impossible scale.
Style: scientific beauty, nature documentary macro, Nikon Small World aesthetic.
No text, no logos, no human elements. Pure natural or biological form.
`.trim(),

  minimalista: `
Minimal clean digital composition. Atmosphere: precise, confident, modern, professional.
Lighting: soft even studio light or geometric abstract light. No harsh shadows.
Colors: predominantly white, light grey or off-white background. One accent color — brand color or
electric blue, emerald green, warm gold — used sparingly on the focal element.
Elements: isolated objects, abstract geometric shapes, clean lines, negative space as design tool,
single focused subject with no visual noise. Metaphorical representations of concepts
(growth, connection, security, efficiency) through simple pure forms.
Style: product photography meets conceptual art. Swiss design influence.
No text, no clutter, no organic textures. Ultra clean, 4K sharp.
`.trim(),

  urbano: `
Urban cultural photography or stylized illustration. Atmosphere: vibrant, alive, culturally rich.
Lighting: city lights at dusk or night — warm neon signs, streetlights, bokeh background,
golden hour reflections on wet pavement. Or high-contrast daylight in dynamic urban environments.
Colors: warm amber and neon accents against dark urban backgrounds. Or saturated street art palette.
Elements: city architecture, cultural spaces, artistic environments, atmospheric urban textures,
abstract street details — without showing recognizable people or faces.
Depth and layers: foreground / subject / bokeh background creating cinematic urban feel.
Style: editorial street photography, lifestyle magazine, cultural documentary.
No text, no logos. No human faces. Purely atmospheric and evocative.
`.trim(),

};

export function useBlueprint(channelId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const blueprintQuery = useQuery({
    queryKey: ['blueprint', channelId],
    queryFn: async () => {
      if (!channelId) return null;

      const { data, error } = await supabase
        .from('channel_blueprints')
        .select('*')
        .eq('channel_id', channelId)
        .maybeSingle();

      if (error) throw error;
      return data as Blueprint | null;
    },
    enabled: !!user && !!channelId,
  });

  const updateBlueprint = useMutation({
    mutationFn: async (updates: UpdateBlueprintData) => {
      if (!channelId) throw new Error('Channel ID required');

      const { error } = await supabase
        .from('channel_blueprints')
        .upsert({ channel_id: channelId, ...updates }, { onConflict: 'channel_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blueprint', channelId] });
      toast.success('Blueprint salvo! As configurações do canal foram atualizadas.');
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error, "ao salvar blueprint"));
    },
  });

  return {
    blueprint: blueprintQuery.data,
    isLoading: blueprintQuery.isLoading,
    error: blueprintQuery.error,
    updateBlueprint,
  };
}
