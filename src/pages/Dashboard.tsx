import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useChannels } from '@/hooks/useChannels';
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
} from '@/components/ui/dialog';
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
import { Plus, Users, Eye, TrendingUp, LogOut, User, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { channels, isLoading, createChannel } = useChannels();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelNiche, setNewChannelNiche] = useState('');

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

    setDialogOpen(false);
    setNewChannelName('');
    setNewChannelNiche('');
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

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Canal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Canal</DialogTitle>
                <DialogDescription>
                  Configure as informações básicas do canal
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
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
              </div>
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
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
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
                    <div className={`w-3 h-3 rounded-full ${getHealthColor(channel.health)} animate-pulse-glow`} />
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
      </main>
    </div>
  );
}
