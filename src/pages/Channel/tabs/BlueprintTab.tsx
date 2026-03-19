import { useState, useEffect } from "react";
import { useBlueprint, VISUAL_STYLE_OPTIONS } from "@/hooks/useBlueprint";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Wand2, Check, Loader2 } from "lucide-react";

interface BlueprintTabProps {
  channelId: string;
}

export function BlueprintTab({ channelId }: BlueprintTabProps) {
  const { blueprint, updateBlueprint } = useBlueprint(channelId);

  const [bpTopic, setBpTopic] = useState('');
  const [bpPersona, setBpPersona] = useState('');
  const [bpTargetAudience, setBpTargetAudience] = useState('');
  const [bpScriptRules, setBpScriptRules] = useState('');
  const [bpVisualStyle, setBpVisualStyle] = useState('realistic');
  const [bpCharacterConsistency, setBpCharacterConsistency] = useState(false);
  const [bpCharacterDescription, setBpCharacterDescription] = useState('');
  const [bpStyleReferenceUrl, setBpStyleReferenceUrl] = useState('');
  const [bpImageRatio, setBpImageRatio] = useState(70);
  const [bpVideoRatio, setBpVideoRatio] = useState(30);
  const [bpCustomMusicUrl, setBpCustomMusicUrl] = useState('');

  useEffect(() => {
    if (!blueprint) return;
    setBpTopic(blueprint.topic || '');
    setBpPersona(blueprint.persona_prompt || '');
    setBpTargetAudience(blueprint.target_audience || '');
    setBpScriptRules(blueprint.script_rules || '');
    setBpVisualStyle(blueprint.visual_style || 'realistic');
    setBpCharacterConsistency(blueprint.character_consistency ?? false);
    setBpCharacterDescription(blueprint.character_description || '');
    setBpStyleReferenceUrl(blueprint.style_reference_url || '');
    setBpImageRatio(blueprint.scenes_image_ratio ?? 70);
    setBpVideoRatio(blueprint.scenes_video_ratio ?? 30);
    setBpCustomMusicUrl(blueprint.custom_music_url || '');
  }, [blueprint?.id]);

  const handleSaveBlueprint = () => {
    updateBlueprint.mutate({
      topic: bpTopic,
      persona_prompt: bpPersona,
      target_audience: bpTargetAudience,
      script_rules: bpScriptRules,
      visual_style: bpVisualStyle,
      character_consistency: bpCharacterConsistency,
      character_description: bpCharacterDescription,
      style_reference_url: bpStyleReferenceUrl,
      scenes_image_ratio: bpImageRatio,
      scenes_video_ratio: bpVideoRatio,
      custom_music_url: bpCustomMusicUrl,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" /> Blueprint do Canal
        </h2>
        <Button
          onClick={handleSaveBlueprint}
          disabled={updateBlueprint.isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
        >
          {updateBlueprint.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Salvar Blueprint
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna esquerda — Conteúdo e Persona */}
        <div className="space-y-5">
          <Card className="bg-card/30 backdrop-blur border-white/10 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Conteúdo e Persona</h3>

            <div className="space-y-2">
              <Label className="text-white/80">Tópico Principal do Canal</Label>
              <Input
                value={bpTopic}
                onChange={e => setBpTopic(e.target.value)}
                placeholder="Ex: Histórias bíblicas para crianças"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Persona / Prompt do Canal</Label>
              <Textarea
                value={bpPersona}
                onChange={e => setBpPersona(e.target.value)}
                placeholder="Ex: Você é um narrador inspirador de histórias bíblicas, com voz calorosa e didática..."
                rows={4}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Público-Alvo</Label>
              <Input
                value={bpTargetAudience}
                onChange={e => setBpTargetAudience(e.target.value)}
                placeholder="Ex: Cristãos evangélicos, 25-45 anos, Brasil"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Regras de Roteiro</Label>
              <Textarea
                value={bpScriptRules}
                onChange={e => setBpScriptRules(e.target.value)}
                placeholder="Ex: Sempre começar com uma pergunta. Máximo 500 caracteres. Terminar com CTA para inscrição."
                rows={3}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
              />
            </div>
          </Card>
        </div>

        {/* Coluna direita — Estilo Visual */}
        <div className="space-y-5">
          <Card className="bg-card/30 backdrop-blur border-white/10 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Estilo Visual</h3>

            <div className="space-y-2">
              <Label className="text-white/80">Estilo de Imagem</Label>
              <Select value={bpVisualStyle} onValueChange={setBpVisualStyle}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  {VISUAL_STYLE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-white focus:bg-white/10">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="text-white/80">Consistência de Personagem</Label>
                <p className="text-xs text-white/40 mt-0.5">Mantém o mesmo personagem em todas as cenas</p>
              </div>
              <Switch
                checked={bpCharacterConsistency}
                onCheckedChange={setBpCharacterConsistency}
              />
            </div>

            {bpCharacterConsistency && (
              <div className="space-y-3 border-t border-white/10 pt-4">
                <div className="space-y-2">
                  <Label className="text-white/80">Descrição do Personagem</Label>
                  <Textarea
                    value={bpCharacterDescription}
                    onChange={e => setBpCharacterDescription(e.target.value)}
                    placeholder="Ex: Homem idoso com barba branca, túnica azul, expressão sábia e serena"
                    rows={3}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">URL de Imagem de Referência (opcional)</Label>
                  <Input
                    value={bpStyleReferenceUrl}
                    onChange={e => setBpStyleReferenceUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
            )}
          </Card>

          <Card className="bg-card/30 backdrop-blur border-white/10 p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Composição do Vídeo</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white/80">Imagens estáticas</Label>
                <span className="text-primary font-bold text-sm">{bpImageRatio}%</span>
              </div>
              <Slider
                value={[bpImageRatio]}
                min={0} max={100} step={10}
                onValueChange={([v]) => { setBpImageRatio(v); setBpVideoRatio(100 - v); }}
                className="w-full"
              />
              <div className="flex items-center justify-between">
                <Label className="text-white/80">Vídeos VO3 (10s/cena)</Label>
                <span className="text-emerald-400 font-bold text-sm">{bpVideoRatio}%</span>
              </div>
              <p className="text-xs text-white/30">Soma sempre 100%. VO3 mantém mais movimento mas custa mais.</p>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-4">
              <Label className="text-white/80">Música de Fundo (URL do arquivo)</Label>
              <Input
                value={bpCustomMusicUrl}
                onChange={e => setBpCustomMusicUrl(e.target.value)}
                placeholder="https://... (MP3 público)"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <p className="text-xs text-white/30">Deixe vazio para sem música. Volume automático em 20%.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
