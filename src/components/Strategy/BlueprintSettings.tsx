import { useState, useEffect } from 'react';
import { useBlueprint, UpdateBlueprintData } from '@/hooks/useBlueprint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, Settings, Users, FileText, Mic, Pencil, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { TTSVoice } from '@/types/tts';
import { toast } from 'sonner';

interface BlueprintSettingsProps {
  channelId: string;
}

function buildFormData(blueprint: NonNullable<ReturnType<typeof useBlueprint>['blueprint']>): UpdateBlueprintData {
  return {
    topic: blueprint.topic || '',
    persona_prompt: blueprint.persona_prompt || '',
    target_audience: blueprint.target_audience || '',
    script_rules: blueprint.script_rules || '',
    upload_frequency: blueprint.upload_frequency || '',
    videos_per_batch: blueprint.videos_per_batch || 4,
    visual_style: blueprint.visual_style || '',
    cta: blueprint.cta || '',
    voice_id: blueprint.voice_id || '',
    voice_name: blueprint.voice_name || '',
    reference: blueprint.reference || '',
    char_limit: blueprint.char_limit || 2000,
  };
}

export function BlueprintSettings({ channelId }: BlueprintSettingsProps) {
  const { blueprint, isLoading, updateBlueprint } = useBlueprint(channelId);
  const [formData, setFormData] = useState<UpdateBlueprintData>({});
  const [isEditing, setIsEditing] = useState(false);
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'pt' | 'en' | 'es'>('pt');

  // Busca vozes ao abrir modo de edição
  useEffect(() => {
    if (isEditing && voices.length === 0) {
      fetchVoices('pt');
    }
  }, [isEditing]);

  const fetchVoices = async (language: 'pt' | 'en' | 'es') => {
    setLoadingVoices(true);
    try {
      const res = await fetch('/.netlify/functions/list-tts-voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });

      if (!res.ok) throw new Error(`Falha ao buscar vozes: ${res.status}`);
      const data = await res.json();
      setVoices(data.voices || []);
      setSelectedLanguage(language);
    } catch (err) {
      toast.error('Erro ao carregar vozes do ElevenLabs');
      console.error('[BlueprintSettings] fetchVoices error:', err);
    } finally {
      setLoadingVoices(false);
    }
  };

  const handleVoiceSelect = (voiceId: string) => {
    const selected = voices.find(v => v.voice_id === voiceId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        voice_id: voiceId,
        voice_name: selected.name,
      }));
    }
  };

  useEffect(() => {
    if (blueprint) {
      setFormData(buildFormData(blueprint));
    }
  }, [blueprint]);

  const handleChange = (field: keyof UpdateBlueprintData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateBlueprint.mutate(formData, {
      onSuccess: () => setIsEditing(false),
    });
  };

  const handleCancel = () => {
    if (blueprint) setFormData(buildFormData(blueprint));
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const ro = !isEditing; // shorthand for readOnly

  const inputClass = ro
    ? 'bg-transparent border-transparent text-muted-foreground cursor-default select-none pointer-events-none'
    : 'bg-background/50';

  const textareaClass = ro
    ? 'bg-transparent border-transparent text-muted-foreground cursor-default select-none pointer-events-none resize-none'
    : 'bg-background/50';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> Blueprint do Canal
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure a identidade, voz e regras base para a inteligência artificial gerar conteúdo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="ghost" onClick={handleCancel} disabled={updateBlueprint.isPending}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={updateBlueprint.isPending}>
                {updateBlueprint.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posicionamento */}
        <Card className="p-5 bg-card/50 border-white/5 space-y-4">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <Users className="w-4 h-4" />
            <h4 className="font-semibold text-sm">Posicionamento</h4>
          </div>

          <div className="space-y-2">
            <Label>Tópico / Nicho Principal</Label>
            <Input
              readOnly={ro}
              value={formData.topic || ''}
              onChange={(e) => handleChange('topic', e.target.value)}
              placeholder="Ex: Finanças para jovens, Motivação diária..."
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Público-Alvo</Label>
            <Input
              readOnly={ro}
              value={formData.target_audience || ''}
              onChange={(e) => handleChange('target_audience', e.target.value)}
              placeholder="Ex: Jovens de 18-25 anos interessados em empreendedorismo"
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <Label>Persona / Comportamento da IA</Label>
            <Textarea
              readOnly={ro}
              value={formData.persona_prompt || ''}
              onChange={(e) => handleChange('persona_prompt', e.target.value)}
              placeholder="Descreva a personalidade (ex: Seja direto, irônico, use gírias...)"
              className={`min-h-[100px] ${textareaClass}`}
            />
          </div>

          <div className="space-y-2">
            <Label>Referências / Inspirações</Label>
            <Textarea
              readOnly={ro}
              value={formData.reference || ''}
              onChange={(e) => handleChange('reference', e.target.value)}
              placeholder="Estilo parecido com canal X, ritmo do canal Y..."
              className={`min-h-[80px] ${textareaClass}`}
            />
          </div>
        </Card>

        {/* Regras Editoriais */}
        <Card className="p-5 bg-card/50 border-white/5 space-y-4">
          <div className="flex items-center gap-2 mb-2 text-emerald-400">
            <FileText className="w-4 h-4" />
            <h4 className="font-semibold text-sm">Regras Editoriais e Roteiro</h4>
          </div>

          <div className="space-y-2">
            <Label>Regras de Roteiro (Do's e Don'ts)</Label>
            <Textarea
              readOnly={ro}
              value={formData.script_rules || ''}
              onChange={(e) => handleChange('script_rules', e.target.value)}
              placeholder="Ex: Não use saudações formais. Evite palavras complexas. Comece sempre com um gancho forte."
              className={`min-h-[120px] ${textareaClass}`}
            />
          </div>

          <div className="space-y-2">
            <Label>Call to Action (CTA) Padrão</Label>
            <Input
              readOnly={ro}
              value={formData.cta || ''}
              onChange={(e) => handleChange('cta', e.target.value)}
              placeholder="Ex: Se inscreva no canal para mais vídeos como este!"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Limite de Caracteres</Label>
              <Input
                type="number"
                readOnly={ro}
                value={formData.char_limit || ''}
                onChange={(e) => handleChange('char_limit', Number(e.target.value))}
                placeholder="Ex: 2000"
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label>Vídeos por Lote</Label>
              <Input
                type="number"
                readOnly={ro}
                value={formData.videos_per_batch || ''}
                onChange={(e) => handleChange('videos_per_batch', Number(e.target.value))}
                placeholder="Ex: 4"
                className={inputClass}
              />
            </div>
          </div>
        </Card>

        {/* Produção */}
        <Card className="p-5 bg-card/50 border-white/5 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-2 text-purple-400">
            <Mic className="w-4 h-4" />
            <h4 className="font-semibold text-sm">Produção (Audio & Visual)</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Filtro de Idioma para Vozes */}
              {isEditing && (
                <div className="space-y-2">
                  <Label>Idioma da Voz</Label>
                  <Select
                    value={selectedLanguage}
                    onValueChange={(lang) => fetchVoices(lang as 'pt' | 'en' | 'es')}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">Português (PT)</SelectItem>
                      <SelectItem value="en">English (EN)</SelectItem>
                      <SelectItem value="es">Español (ES)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Seletor de Voz */}
              <div className="space-y-2">
                <Label>Voz do ElevenLabs</Label>
                {ro ? (
                  <Input
                    readOnly
                    value={formData.voice_name || ''}
                    placeholder="—"
                    className={inputClass}
                  />
                ) : (
                  <Select value={formData.voice_id || ''} onValueChange={handleVoiceSelect}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder={loadingVoices ? "Carregando vozes..." : "Selecione uma voz"} />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.voice_id} value={voice.voice_id}>
                          {voice.name} ({voice.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Frequência de Postagem</Label>
                {ro ? (
                  <Input
                    readOnly
                    value={formData.upload_frequency || ''}
                    placeholder="—"
                    className={inputClass}
                  />
                ) : (
                  <Select
                    value={formData.upload_frequency || ''}
                    onValueChange={(val) => handleChange('upload_frequency', val)}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário (1x ao dia)</SelectItem>
                      <SelectItem value="twice_daily">2x ao dia</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quinzenal</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estilo Visual (B-Rolls / Geração de Imagem)</Label>
              <Textarea
                readOnly={ro}
                value={formData.visual_style || ''}
                onChange={(e) => handleChange('visual_style', e.target.value)}
                placeholder="Ex: Cinematic, dark lighting, cyberpunk themes. Evite mostrar rostos de pessoas..."
                className={`min-h-[140px] ${textareaClass}`}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
