import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChannels, Channel } from '@/hooks/useChannels';
import { formatNumber, nicheOptions } from '@/lib/mock-data';
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
import { Plus, Loader2, Search, Folder } from 'lucide-react';
import { toast } from 'sonner';

// Premium Components
import { BeamsBackground } from "@/components/ui/beams-background";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { ChannelFolder } from "@/components/ui/channel-folder";

export default function Dashboard() {
  const navigate = useNavigate();
  const { } = useAuth(); // Cleaned up unused user
  const { channels, isLoading, createChannel, deleteChannel } = useChannels(); // Cleaned up updateChannel

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelNiche, setNewChannelNiche] = useState('');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingChannel, setDeletingChannel] = useState<Channel | null>(null);

  const handleAddChannel = async () => {
    if (!newChannelName || !newChannelNiche) {
      toast.error('Preencha todos os campos');
      return;
    }

    const nicheData = nicheOptions.find(n => n.value === newChannelNiche);

    await createChannel.mutateAsync({
      name: newChannelName,
      niche: nicheData?.label || newChannelNiche,
      niche_color: nicheData?.color || 'bg-muted text-muted-foreground',
    });

    setCreateDialogOpen(false);
    setNewChannelName('');
    setNewChannelNiche('');
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
      <DashboardHeader />

      <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto min-h-screen relative z-10 text-foreground">

        {/* Hero / Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
              Seus Canais
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              Gerencie seus impérios de conteúdo. Selecione um canal para começar a produzir.
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-full px-8 shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Plus className="w-5 h-5 mr-2 relative z-10" />
                <span className="relative z-10">Novo Canal</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Criar Novo Canal</DialogTitle>
                <DialogDescription>
                  Escolha como deseja iniciar sua jornada no YouTube.
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="idea" className="w-full mt-6">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
                  <TabsTrigger value="idea">Ideia Própria</TabsTrigger>
                  <TabsTrigger value="research">Pesquisa de Mercado</TabsTrigger>
                </TabsList>

                <TabsContent value="idea" className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="channel-name">Nome do Canal</Label>
                      <Input
                        id="channel-name"
                        placeholder="Ex: Curiosidades Terror"
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        className="bg-background/50 border-white/10 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="channel-niche">Nicho</Label>
                      <Select value={newChannelNiche} onValueChange={setNewChannelNiche}>
                        <SelectTrigger className="bg-background/50 border-white/10">
                          <SelectValue placeholder="Selecione o nicho" />
                        </SelectTrigger>
                        <SelectContent>
                          {nicheOptions.map((niche) => (
                            <SelectItem key={niche.value} value={niche.value}>
                              {niche.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleAddChannel}
                      className="w-full h-11"
                      disabled={createChannel.isPending}
                    >
                      {createChannel.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        'Criar Canal'
                      )}
                    </Button>
                  </DialogFooter>
                </TabsContent>

                <TabsContent value="research" className="space-y-6">
                  <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 border rounded-xl bg-muted/10 border-dashed border-white/10">
                    <div className="bg-primary/10 p-4 rounded-full">
                      <Search className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">Importar Dados</h3>
                      <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                        Cole a URL de um canal existente para nossa IA clonar a estratégia de sucesso.
                      </p>
                    </div>
                    <div className="w-full max-w-sm flex gap-2 pt-2">
                      <Input
                        placeholder="https://youtube.com/@CanalInspiracao"
                        className="bg-background/30 border-white/10"
                        onChange={(e) => setNewChannelNiche(e.target.value)}
                      />
                      <Button
                        onClick={async () => {
                          if (!newChannelNiche) {
                            toast.error("Cole uma URL válida");
                            return;
                          }
                          toast.info("Analisando canal...");
                          await new Promise(r => setTimeout(r, 1500));
                          await createChannel.mutateAsync({
                            name: "Canal Importado (Demo)",
                            niche: "Curiosidades",
                            niche_color: "bg-purple-500 text-white"
                          });
                          setCreateDialogOpen(false);
                          setNewChannelNiche("");
                          toast.success("Estratégia importada com sucesso!");
                        }}
                        className="bg-primary text-white"
                      >
                        Importar
                      </Button>
                    </div>
                    <span className="text-xs text-primary/60 font-medium bg-primary/5 px-2 py-1 rounded">
                      Demo: Simula a importação de métricas
                    </span>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

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
              // Assign consistent colors based on index for visual variety
              const colors = ['blue', 'purple', 'green', 'red'];
              const color = colors[index % colors.length];

              return (
                <ChannelFolder
                  key={channel.id}
                  name={channel.name}
                  subscribers={formatNumber(channel.subscribers || 0)}
                  videoCount={channel.videos?.length || 0}
                  color={color}
                  onClick={() => handleChannelClick(channel.id)}
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
