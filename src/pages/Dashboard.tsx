import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { mockChannels, formatNumber, getHealthColor, Channel, nicheOptions } from '@/lib/mock-data';
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
import { Plus, Users, Eye, TrendingUp, LogOut, User, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [channels, setChannels] = useState<Channel[]>(mockChannels);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelNiche, setNewChannelNiche] = useState('');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleAddChannel = () => {
    if (!newChannelName || !newChannelNiche) {
      toast.error('Preencha todos os campos');
      return;
    }

    const nicheData = nicheOptions.find(n => n.value === newChannelNiche);
    const newChannel: Channel = {
      id: `ch_${Date.now()}`,
      name: newChannelName,
      niche: nicheData?.label || newChannelNiche,
      nicheColor: nicheData?.color || 'bg-muted text-muted-foreground',
      subscribers: 0,
      monthlyViews: 0,
      health: 'yellow',
    };

    setChannels([...channels, newChannel]);
    setDialogOpen(false);
    setNewChannelName('');
    setNewChannelNiche('');
    toast.success('Canal criado com sucesso!');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-lg">Dark Ops</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden sm:inline text-sm">
                  {user?.email?.split('@')[0]}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {user?.email}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

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
                <Button onClick={handleAddChannel} className="w-full">
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
                  {formatNumber(channels.reduce((acc, c) => acc + c.subscribers, 0))}
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
                  {formatNumber(channels.reduce((acc, c) => acc + c.monthlyViews, 0))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Channel Grid */}
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${channel.nicheColor}`}>
                        {channel.niche}
                      </span>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${getHealthColor(channel.health)} animate-pulse-glow`} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Inscritos</p>
                    <p className="text-lg font-semibold">{formatNumber(channel.subscribers)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Views/Mês</p>
                    <p className="text-lg font-semibold">{formatNumber(channel.monthlyViews)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
