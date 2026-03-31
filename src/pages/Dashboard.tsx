import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChannels, Channel } from '@/hooks/useChannels';
import { formatNumber, nicheOptions } from '@/lib/mock-data';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, Search, Folder, ShieldAlert, ArrowRight, CheckCircle2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { getFriendlyErrorMessage } from "@/utils/errorHandler";

// Premium Components
import { BeamsBackground } from "@/components/ui/beams-background";

import { ChannelFolder } from "@/components/ui/channel-folder";
import { GlobalQueueSection } from "@/components/Dashboard/GlobalQueueSection";
import { useGlobalQueue } from "@/hooks/useGlobalQueue";

export default function Dashboard() {
  const navigate = useNavigate();
  const { userName } = useAuth();
  const { channels, isLoading, createChannel, deleteChannel } = useChannels();
  const { queueItems, channelCounts } = useGlobalQueue();

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelNiche, setNewChannelNiche] = useState('');
  const [isCustomNiche, setIsCustomNiche] = useState(false);
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [requiresReview, setRequiresReview] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingChannel, setDeletingChannel] = useState<Channel | null>(null);

  const handleAddChannel = async () => {
    if (!newChannelName || !newChannelNiche) {
      toast.error('Preencha os campos obrigatórios (Nome e Categoria)');
      return;
    }

    const nicheData = nicheOptions.find(n => n.value === newChannelNiche);

    await createChannel.mutateAsync({
      name: newChannelName,
      niche: isCustomNiche ? newChannelNiche : (nicheData?.label || newChannelNiche),
      niche_color: nicheData?.color || 'bg-muted text-muted-foreground',
      tone_of_voice: toneOfVoice,
      target_audience: targetAudience,
      requires_review: requiresReview,
    });

    setCreateDialogOpen(false);
    setCreateStep(1);
    setNewChannelName('');
    setNewChannelNiche('');
    setIsCustomNiche(false);
    setToneOfVoice('');
    setTargetAudience('');
    setRequiresReview(false);
    toast.success('Canal criado com sucesso!');
  };



  // Re-implementing delete confirmation for safety if needed later
  const handleConfirmDelete = async () => {
    if (!deletingChannel) return;
    await deleteChannel.mutateAsync(deletingChannel.id);
    setDeleteDialogOpen(false);
    setDeletingChannel(null);
  };

  const handleChannelClick = (channelId: string) => {
    navigate(`/channel/${channelId}`);
  };

  return (
    <BeamsBackground intensity="medium" className="bg-background">
      <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto min-h-screen relative z-10 text-foreground">

        {/* Hero / Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              {userName ? `Olá, ${userName.split(' ')[0]}` : 'Seus Canais'}
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Gerencie seus impérios de conteúdo. Selecione um canal para começar a produzir.
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setCreateStep(1);
              setNewChannelName('');
              setNewChannelNiche('');
              setIsCustomNiche(false);
              setToneOfVoice('');
              setTargetAudience('');
              setRequiresReview(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-full px-8 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Plus className="w-5 h-5 mr-2 relative z-10" />
                <span className="relative z-10">Novo Canal</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card border-white/10 shadow-2xl transition-all duration-300">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  {createStep === 1 ? '1. Estrutura do Canal' : '2. Cérebro da IA (Opcional)'}
                </DialogTitle>
                <DialogDescription>
                  {createStep === 1
                    ? 'Inicie sua jornada no YouTube. Configure a base do seu robô produtor.'
                    : 'Ajuste fino do comportamento do roteirista automático.'}
                </DialogDescription>
              </DialogHeader>

              {createStep === 1 && (
                <div className="space-y-6 mt-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="channel-name" className="text-white/90">Nome do Canal *</Label>
                    <Input
                      id="channel-name"
                      placeholder="Ex: Curiosidades Terror"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      className="bg-background/50 border-white/10 focus:ring-primary/50"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-white/90">Categoria *</Label>
                    <div className="flex flex-wrap gap-2">
                      {nicheOptions.map((niche) => (
                        <Button
                          key={niche.value}
                          type="button"
                          variant={!isCustomNiche && newChannelNiche === niche.value ? "default" : "outline"}
                          className={`rounded-full text-xs h-8 bg-background/50 border-white/10 border ${!isCustomNiche && newChannelNiche === niche.value ? 'bg-primary border-primary hover:bg-primary/90' : 'hover:bg-white/5'}`}
                          onClick={() => {
                            setNewChannelNiche(niche.value);
                            setIsCustomNiche(false);
                          }}
                        >
                          {niche.label}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant={isCustomNiche ? "default" : "outline"}
                        className={`rounded-full text-xs h-8 bg-background/50 border-white/10 border ${isCustomNiche ? 'bg-primary border-primary hover:bg-primary/90' : 'hover:bg-white/5'}`}
                        onClick={() => {
                          setNewChannelNiche('');
                          setIsCustomNiche(true);
                        }}
                      >
                        Outro (Personalizado)
                      </Button>
                    </div>
                    {isCustomNiche && (
                      <Input
                        autoFocus
                        placeholder="Digite a categoria do seu canal..."
                        value={newChannelNiche}
                        onChange={(e) => setNewChannelNiche(e.target.value)}
                        className="mt-3 bg-background/50 border-white/10 focus:ring-primary/50"
                      />
                    )}
                  </div>
                </div>
              )}

              {createStep === 2 && (
                <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-3">
                    <div className="p-2 bg-primary/20 rounded-full mt-0.5">
                      <Wand2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary">Predefinição Recomendada (Status Quo)</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">A IA já possui um perfil vencedor treinado para retenção. Você pode clicar em <strong>Criar Canal</strong> diretamente para usar as configs padrões de sucesso ou ajustar os detalhes manuais abaixo.</p>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="tone-of-voice" className="text-xs text-muted-foreground">Tom de Voz</Label>
                    <Input
                      id="tone-of-voice"
                      placeholder="Ex: Tenebroso, misterioso e objetivo..."
                      value={toneOfVoice}
                      onChange={(e) => setToneOfVoice(e.target.value)}
                      className="bg-background/20 h-9 border-white/5 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-audience" className="text-xs text-muted-foreground">Público Alvo / Restrições</Label>
                    <Input
                      id="target-audience"
                      placeholder="Ex: Family friendly, sem mencionar mortes explícitas..."
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="bg-background/20 h-9 border-white/5 text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex flex-col gap-1">
                      <Label className="flex items-center gap-2 text-red-500">
                        <ShieldAlert className="w-4 h-4" />
                        Requer Análise Estrita?
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        Evita shadowbans no YT para nichos Dark pesados (Terror, Tragédias).
                      </span>
                    </div>
                    <Switch
                      checked={requiresReview}
                      onCheckedChange={setRequiresReview}
                      className="data-[state=checked]:bg-red-500"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="pt-6 flex justify-between w-full sm:justify-between items-center mt-2 border-t border-white/5">
                {createStep === 2 ? (
                  <>
                    <Button variant="ghost" onClick={() => setCreateStep(1)} className="text-muted-foreground hover:text-white">
                      Voltar
                    </Button>
                    <Button
                      onClick={handleAddChannel}
                      className="h-10 px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                      disabled={createChannel.isPending}
                    >
                      {createChannel.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      {createChannel.isPending ? 'Criando...' : 'Criar Canal'}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      if (!newChannelName || !newChannelNiche) {
                        toast.error(getFriendlyErrorMessage(null, "Preencha os campos obrigatórios primeiro"));
                        return;
                      }
                      setCreateStep(2);
                    }}
                    className="w-full h-11 bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    Continuar Configuração <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Global Queue — pending review across all channels */}
        {!isLoading && queueItems.length > 0 && (
          <GlobalQueueSection items={queueItems} />
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && channels?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Folder className="w-12 h-12 text-white/20" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Nenhum canal encontrado</h3>
            <p className="text-muted-foreground mb-8">Crie seu primeiro canal para começar a automação.</p>
            <Button onClick={() => setCreateDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
              Criar meu primeiro canal
            </Button>
          </div>
        )}

        {/* Channels Grid */}
        {!isLoading && channels && channels.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((channel, index) => {
              const colors = ['blue', 'purple', 'green', 'red'];
              const color = colors[index % colors.length];
              const counts = channelCounts.find(c => c.channel_id === channel.id);

              return (
                <ChannelFolder
                  key={channel.id}
                  name={channel.name}
                  niche={channel.niche}
                  subscribers={formatNumber(channel.subscribers || 0)}
                  videoCount={channel.youtube_total_videos || 0}
                  color={color}
                  pendingReview={counts?.pending_review}
                  inProduction={counts?.in_production}
                  onClick={() => handleChannelClick(channel.id)}
                  onDelete={() => { setDeletingChannel(channel); setDeleteDialogOpen(true); }}
                />
              );
            })}
          </div>
        )}

        {/* Delete Dialog (Future Proofing) */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir canal?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação excluirá permanentemente o canal <strong>{deletingChannel?.name}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </main>
    </BeamsBackground>
  );
}
