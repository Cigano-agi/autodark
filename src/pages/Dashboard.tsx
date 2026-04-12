import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChannels, Channel } from '@/hooks/useChannels';
import { formatNumber } from '@/lib/utils';
import { nicheOptions } from '@/lib/constants';
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
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, Folder, ShieldAlert, ArrowRight, CheckCircle2, Wand2, Zap, Sparkles, LayoutDashboard, Search } from 'lucide-react';
import { toast } from 'sonner';

import { ChannelFolder } from "@/components/ui/channel-folder";
import { GlobalQueueSection } from "@/components/Dashboard/GlobalQueueSection";
import { useGlobalQueue } from "@/hooks/useGlobalQueue";
import { SkeletonList } from "@/components/ui/skeleton-card";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, userName } = useAuth();
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

  // Search state
  const [searchTerm, setSearchFiltered] = useState('');

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

  const handleConfirmDelete = async () => {
    if (!deletingChannel) return;
    await deleteChannel.mutateAsync(deletingChannel.id);
    setDeleteDialogOpen(false);
    setDeletingChannel(null);
  };

  const handleChannelClick = (channelId: string) => {
    navigate(`/channel/${channelId}`);
  };

  const filteredChannels = channels?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.niche.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 w-full min-h-screen">
      <div className="max-w-7xl mx-auto space-y-16 animate-fade-in">
        
        {user && !user.email_confirmed_at && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] flex items-center gap-6 animate-pulse relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent pointer-events-none" />
            <div className="p-4 bg-red-500/20 rounded-2xl relative z-10">
              <ShieldAlert className="w-7 h-7 text-red-500" />
            </div>
            <div className="flex-1 relative z-10">
              <h4 className="text-base font-black uppercase tracking-[0.2em] text-red-400 italic">E-mail não verificado</h4>
              <p className="text-sm text-red-300/60 mt-1 font-medium">Verifique seu e-mail para desbloquear a criação de canais e o acesso completo à plataforma.</p>
            </div>
            <Button size="sm" variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 font-black uppercase text-[10px] tracking-[0.2em] h-12 px-6 rounded-xl relative z-10" onClick={() => window.location.reload()}>
              Verificar
            </Button>
          </div>
        )}

        {/* Hero / Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.4em] text-[10px] ml-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
              Rede de Canais · Ativa
            </div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white uppercase italic leading-[0.9]">
              {userName ? `Olá,` : 'Dashboard'}<br/>
              <span className="text-primary">{userName ? userName.split(' ')[0] : ''}</span>
            </h1>
            <p className="text-xl text-white/30 font-bold max-w-2xl leading-relaxed italic">
              Gerencie seus canais, acompanhe a produção e escale sua rede de conteúdo.
            </p>
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80 group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                placeholder="Buscar canal ou vídeo..."
                value={searchTerm}
                onChange={(e) => setSearchFiltered(e.target.value)}
                className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 text-xs font-black uppercase tracking-widest focus:border-primary/50 focus:ring-0 transition-all outline-none"
              />
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
                <Button size="lg" className="h-16 rounded-2xl px-10 bg-primary hover:bg-orange-600 text-white shadow-[0_20px_50px_rgba(var(--primary),0.4)] transition-all hover:scale-[1.05] active:scale-[0.95] relative overflow-hidden group border-0 shrink-0">
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <Plus className="w-6 h-6 mr-3 relative z-10" />
                  <span className="text-lg font-black uppercase italic tracking-tighter relative z-10">Adicionar Canal</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[650px] bg-[#08080a] border-white/5 shadow-[0_40px_120px_rgba(0,0,0,1)] rounded-[3rem] p-0 overflow-hidden border-t-primary/20">
                <div className="bg-gradient-to-b from-primary/10 to-transparent p-10 border-b border-white/5">
                  <DialogHeader>
                    <DialogTitle className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-4 text-white leading-none">
                      <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.5)]">
                        <Zap className="w-7 h-7 text-white fill-current" />
                      </div>
                      {createStep === 1 ? 'Adicionar Canal' : 'Configuração de IA'}
                    </DialogTitle>
                    <DialogDescription className="text-white/20 font-black uppercase tracking-[0.3em] text-[9px] pt-3 ml-1">
                      {createStep === 1
                        ? 'Preencha as informações básicas do canal.'
                        : 'Personalize o comportamento da IA para este canal.'}
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="p-10 space-y-10">
                  {createStep === 1 && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                      <div className="space-y-4">
                        <Label htmlFor="channel-name" className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 ml-1">Nome do Canal</Label>
                        <Input
                          id="channel-name"
                          placeholder="Ex: Curiosidades do Universo..."
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          className="h-16 bg-black/60 border-white/10 rounded-2xl focus:ring-primary/50 text-xl font-black uppercase tracking-tight p-6 placeholder:opacity-10"
                        />
                      </div>

                      <div className="space-y-5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 ml-1">Nicho do Canal</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {nicheOptions.slice(0, 8).map((niche) => (
                            <Button
                              key={niche.value}
                              type="button"
                              variant={!isCustomNiche && newChannelNiche === niche.value ? "default" : "outline"}
                              className={cn(
                                "h-14 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                                !isCustomNiche && newChannelNiche === niche.value 
                                  ? "bg-primary border-0 shadow-lg shadow-primary/30 text-white scale-105" 
                                  : "bg-white/[0.03] border-white/5 text-white/30 hover:bg-white/10 hover:text-white"
                              )}
                              onClick={() => {
                                setNewChannelNiche(niche.value);
                                setIsCustomNiche(false);
                              }}
                            >
                              {niche.label.split(' ')[1] || niche.label}
                            </Button>
                          ))}
                          <Button
                            type="button"
                            variant={isCustomNiche ? "default" : "outline"}
                            className={cn(
                              "h-14 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                              isCustomNiche 
                                ? "bg-primary border-0 shadow-lg shadow-primary/30 text-white scale-105" 
                                : "bg-white/[0.03] border-white/5 text-white/30 hover:bg-white/10 hover:text-white"
                            )}
                            onClick={() => {
                              setNewChannelNiche('');
                              setIsCustomNiche(true);
                            }}
                          >
                            Outro
                          </Button>
                        </div>
                        {isCustomNiche && (
                          <Input
                            autoFocus
                            placeholder="Digite o nicho personalizado..."
                            value={newChannelNiche}
                            onChange={(e) => setNewChannelNiche(e.target.value)}
                            className="h-14 bg-black/60 border-white/10 rounded-2xl focus:ring-primary/50 font-black uppercase p-6"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {createStep === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
                      <div className="p-8 bg-primary/5 border border-primary/20 rounded-[2.5rem] flex items-start gap-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                        <div className="p-4 bg-primary/20 rounded-2xl relative z-10">
                          <Wand2 className="w-7 h-7 text-primary" />
                        </div>
                        <div className="relative z-10">
                          <h4 className="text-base font-black uppercase tracking-widest text-primary italic">Configuração de IA</h4>
                          <p className="text-sm text-white/40 mt-2 font-medium leading-relaxed italic">A IA usará os melhores parâmetros de retenção por padrão. Os campos abaixo são opcionais para personalização avançada.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label htmlFor="tone-of-voice" className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 ml-1">Tom de Voz</Label>
                        <Input
                          id="tone-of-voice"
                          placeholder="Ex: Informativo, descontraído, direto..."
                          value={toneOfVoice}
                          onChange={(e) => setToneOfVoice(e.target.value)}
                          className="h-16 bg-black/60 border-white/10 rounded-2xl p-6 font-black uppercase tracking-tight focus:ring-primary/50"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-6 bg-red-500/[0.03] border border-red-500/10 rounded-[2rem] group hover:bg-red-500/5 transition-colors">
                        <div className="flex flex-col gap-1">
                          <Label className="flex items-center gap-3 text-red-500 font-black uppercase tracking-[0.2em] text-[11px]">
                            <ShieldAlert className="w-4 h-4 group-hover:animate-pulse" />
                            Revisão Obrigatória
                          </Label>
                          <span className="text-[9px] text-white/20 uppercase font-black tracking-widest mt-1 ml-7">
                            Exige aprovação manual antes de publicar.
                          </span>
                        </div>
                        <Switch
                          checked={requiresReview}
                          onCheckedChange={setRequiresReview}
                          className="data-[state=checked]:bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-10 bg-black/60 border-t border-white/5 flex gap-5">
                  {createStep === 2 ? (
                    <>
                      <Button variant="ghost" onClick={() => setCreateStep(1)} className="flex-1 h-16 rounded-2xl text-white/20 hover:text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all">
                        Voltar
                      </Button>
                      <Button
                        onClick={handleAddChannel}
                        className="flex-[2] h-16 rounded-2xl bg-primary hover:bg-orange-600 shadow-[0_15px_40px_rgba(var(--primary),0.4)] font-black uppercase italic tracking-tighter text-xl border-0 transition-all hover:scale-[1.02]"
                        disabled={createChannel.isPending}
                      >
                        {createChannel.isPending ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <CheckCircle2 className="w-6 h-6 mr-3" />}
                        Criar Canal
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => {
                        if (!newChannelName || !newChannelNiche) {
                          toast.error('Preencha os campos obrigatórios (Nome e Categoria)');
                          return;
                        }
                        setCreateStep(2);
                      }}
                      className="w-full h-16 rounded-2xl bg-primary hover:bg-orange-600 shadow-[0_15px_40px_rgba(var(--primary),0.4)] font-black uppercase italic tracking-tighter text-xl border-0 transition-all hover:scale-[1.02]"
                    >
                      Continuar <ArrowRight className="w-6 h-6 ml-3" />
                    </Button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Global Queue */}
        {!isLoading && queueItems.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <GlobalQueueSection items={queueItems} />
          </div>
        )}

        {/* Channels Grid */}
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-white/20 flex items-center gap-3 italic">
              <LayoutDashboard className="w-4 h-4" /> Rede de Canais <span className="text-primary font-mono not-italic tracking-normal">[{filteredChannels?.length || 0}]</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="py-12">
              <SkeletonList count={6} />
            </div>
          ) : filteredChannels?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 bg-white/[0.02] rounded-[4rem] border border-white/5 backdrop-blur-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[120px] group-hover:bg-primary/10 transition-colors duration-1000" />
              
              <div className="w-28 h-28 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8 border border-white/5 shadow-inner transition-transform group-hover:scale-110 duration-500">
                <Folder className="w-12 h-12 text-white/10" />
              </div>
              <h3 className="text-3xl font-black text-white uppercase italic tracking-tight mb-3 relative z-10">Nenhum Canal</h3>
              <p className="text-sm text-white/20 font-black uppercase tracking-[0.3em] mb-12 relative z-10">Crie seu primeiro canal para começar.</p>
              <Button onClick={() => setCreateDialogOpen(true)} className="h-16 rounded-2xl px-12 bg-primary text-white shadow-[0_20px_50px_rgba(var(--primary),0.3)] font-black uppercase italic tracking-tighter border-0 relative z-10 hover:scale-[1.05] transition-all">
                Adicionar Canal
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredChannels?.map((channel, index) => {
                const colors = ['blue', 'purple', 'green', 'red'];
                const color = colors[index % colors.length];
                const counts = channelCounts.find(c => c.channel_id === channel.id);

                return (
                  <div key={channel.id} className="animate-in fade-in zoom-in-95 duration-700 fill-mode-both" style={{ animationDelay: `${index * 100}ms` }}>
                    <ChannelFolder
                      name={channel.name}
                      niche={channel.niche}
                      subscribers={formatNumber(channel.subscribers || 0)}
                      videoCount={channel.youtube_total_videos || 0}
                      color={color}
                      pendingReview={counts?.pending_review}
                      inProduction={counts?.in_production}
                      onClick={() => handleChannelClick(channel.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-[#08080a] border border-white/5 rounded-[3rem] p-10 shadow-[0_40px_100px_rgba(0,0,0,1)]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-white">Excluir Canal?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/30 font-bold text-base leading-relaxed mt-4">
                Todos os dados e conteúdos do canal <strong className="text-white uppercase">[{deletingChannel?.name}]</strong> serão removidos permanentemente. Esta ação é irreversível.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="mt-12 flex gap-4">
              <AlertDialogCancel className="flex-1 h-16 rounded-2xl bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white font-black uppercase tracking-widest text-[10px] transition-all">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="flex-[1.5] h-16 rounded-2xl bg-red-600 text-white hover:bg-red-700 font-black uppercase italic tracking-tighter text-lg shadow-[0_15px_40px_rgba(220,38,38,0.3)] transition-all hover:scale-[1.02]"
              >
                Excluir
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}
