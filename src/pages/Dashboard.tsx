import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChannels, Channel } from '@/hooks/useChannels';
import { formatNumber, getHealthColor, nicheOptions } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, Eye, TrendingUp, Zap, Loader2, MoreVertical, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { channels, isLoading, createChannel, updateChannel, deleteChannel } = useChannels();

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelNiche, setNewChannelNiche] = useState('');

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelNiche, setEditChannelNiche] = useState('');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingChannel, setDeletingChannel] = useState<Channel | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

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
  };

  const handleEditChannel = (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChannel(channel);
    setEditChannelName(channel.name);
    // Find niche value from label
    const nicheData = nicheOptions.find(n => n.label === channel.niche);
    setEditChannelNiche(nicheData?.value || '');
    setEditDialogOpen(true);
  };

  const handleUpdateChannel = async () => {
    if (!editingChannel || !editChannelName || !editChannelNiche) {
      toast.error('Preencha todos os campos');
      return;
    }

    const nicheData = nicheOptions.find(n => n.value === editChannelNiche);

    await updateChannel.mutateAsync({
      channelId: editingChannel.id,
      data: {
        name: editChannelName,
        niche: nicheData?.label || editChannelNiche,
        niche_color: nicheData?.color || 'bg-muted text-muted-foreground',
      },
    });

    setEditDialogOpen(false);
    setEditingChannel(null);
  };

  const handleDeleteClick = (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingChannel(channel);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingChannel) return;

    await deleteChannel.mutateAsync(deletingChannel.id);
    setDeleteDialogOpen(false);
    setDeletingChannel(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {/* Header removed - replaced by Sidebar */}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Meus Canais</h1>
            <p className="text-muted-foreground">
              Gerencie sua operação de canais
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Canal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Canal</DialogTitle>
                <DialogDescription>
                  Como você deseja iniciar este canal?
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="idea" className="w-full pt-4">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="idea">Ideia Própria</TabsTrigger>
                  <TabsTrigger value="research">Pesquisa de Mercado</TabsTrigger>
                </TabsList>

                <TabsContent value="idea" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="channel-name">Nome do Canal</Label>
                    <Input
                      id="channel-name"
                      placeholder="Ex: Curiosidades Terror"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channel-niche">Nicho</Label>
                    <Select value={newChannelNiche} onValueChange={setNewChannelNiche}>
                      <SelectTrigger>
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
                  <Button
                    onClick={handleAddChannel}
                    className="w-full"
                    disabled={createChannel.isPending}
                  >
                    {createChannel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Criar Canal
                  </Button>
                </TabsContent>

                <TabsContent value="research" className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground mb-4">
                    <p>Cole a URL de um canal existente para importar dados e estilo.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channel-url">URL do Canal (YouTube)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="channel-url"
                        placeholder="https://youtube.com/@Canal..."
                        disabled
                      />
                      <Button variant="outline" disabled>
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Integração API FY em breve.</p>
                  </div>
                  <Button disabled className="w-full">
                    Importar Canal
                  </Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Canais Ativos</p>
                <p className="text-2xl font-bold">{channels.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Inscritos</p>
                <p className="text-2xl font-bold">
                  {formatNumber(channels.reduce((acc, c) => acc + (c.subscribers || 0), 0))}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Views/Mês</p>
                <p className="text-2xl font-bold">
                  {formatNumber(channels.reduce((acc, c) => acc + (c.monthly_views || 0), 0))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && channels.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum canal criado</h3>
            <p className="text-muted-foreground mb-4">
              Comece adicionando seu primeiro canal
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Canal
            </Button>
          </div>
        )}

        {/* Channel Grid */}
        {!isLoading && channels.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((channel) => (
              <Card
                key={channel.id}
                className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => navigate(`/channel/${channel.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground">
                        {channel.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {channel.name}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${channel.niche_color}`}>
                          {channel.niche}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getHealthColor(channel.health)} animate-pulse-glow`} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => handleEditChannel(channel, e as any)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteClick(channel, e as any)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Inscritos</p>
                      <p className="text-lg font-semibold">{formatNumber(channel.subscribers || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Views/Mês</p>
                      <p className="text-lg font-semibold">{formatNumber(channel.monthly_views || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Channel Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Canal</DialogTitle>
              <DialogDescription>
                Atualize as informações do canal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-channel-name">Nome do Canal</Label>
                <Input
                  id="edit-channel-name"
                  placeholder="Ex: Curiosidades Terror"
                  value={editChannelName}
                  onChange={(e) => setEditChannelName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-channel-niche">Nicho</Label>
                <Select value={editChannelNiche} onValueChange={setEditChannelNiche}>
                  <SelectTrigger>
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateChannel}
                  disabled={updateChannel.isPending}
                >
                  {updateChannel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir canal?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o canal
                <strong> {deletingChannel?.name}</strong> e todos os seus dados associados
                (métricas, conteúdos, blueprints).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteChannel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
