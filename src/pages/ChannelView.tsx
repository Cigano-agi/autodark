import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChannel } from '@/hooks/useChannels';
import { useBlueprint } from '@/hooks/useBlueprint';
import { useContents } from '@/hooks/useContents';
import { useYouTubeMetrics } from '@/hooks/useYouTubeMetrics';
import { useChannelMetrics, useLatestMetric } from '@/hooks/useChannelMetrics';
import { formatNumber, getStatusBadge, voiceOptions, nicheOptions, uploadFrequencyOptions } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, BarChart3, Settings, FileText, TrendingUp, Users, DollarSign, Video, Save, Zap, Loader2, Youtube, RefreshCw, Unlink } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ConnectYouTubeModal } from '@/components/YouTube/ConnectYouTubeModal';

export default function ChannelView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showConnectModal, setShowConnectModal] = useState(false);

  const { data: channel, isLoading: channelLoading } = useChannel(id);
  const { blueprint, isLoading: blueprintLoading, updateBlueprint } = useBlueprint(id);
  const { contents, isLoading: contentsLoading } = useContents(id);
  const { connectWithApify, syncMetrics, disconnectYouTube } = useYouTubeMetrics();
  const { data: metricsHistory } = useChannelMetrics(id);
  const { data: latestMetric } = useLatestMetric(id);

  const handleConnectYouTube = async (youtubeUrl: string) => {
    if (!id) return;
    await connectWithApify.mutateAsync({ channelId: id, youtubeUrl });
  };

  const handleSyncMetrics = () => {
    if (!id || !channel?.youtube_channel_id) return;
    syncMetrics.mutate({ 
      channelId: id, 
      youtubeUrl: `https://www.youtube.com/channel/${channel.youtube_channel_id}` 
    });
  };

  const [localBlueprint, setLocalBlueprint] = useState({
    topic: '',
    voice_id: '',
    voice_name: '',
    script_rules: '',
    visual_style: '',
    upload_frequency: '',
  });

  // Sync blueprint data when loaded
  useEffect(() => {
    if (blueprint) {
      setLocalBlueprint({
        topic: blueprint.topic || '',
        voice_id: blueprint.voice_id || '',
        voice_name: blueprint.voice_name || '',
        script_rules: blueprint.script_rules || '',
        visual_style: blueprint.visual_style || '',
        upload_frequency: blueprint.upload_frequency || '',
      });
    }
  }, [blueprint]);

  const handleSaveBlueprint = async () => {
    const voiceData = voiceOptions.find(v => v.id === localBlueprint.voice_id);
    await updateBlueprint.mutateAsync({
      topic: localBlueprint.topic,
      voice_id: localBlueprint.voice_id,
      voice_name: voiceData?.name || localBlueprint.voice_name,
      script_rules: localBlueprint.script_rules,
      visual_style: localBlueprint.visual_style,
      upload_frequency: localBlueprint.upload_frequency,
    });
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold text-primary">
            {formatNumber(payload[0].value)} views
          </p>
        </div>
      );
    }
    return null;
  };

  // Get chart data from real metrics or generate placeholder
  const getChartData = () => {
    if (metricsHistory && metricsHistory.length > 0) {
      return metricsHistory.map(metric => ({
        date: new Date(metric.recorded_at).toISOString().split('T')[0],
        views: metric.views || 0,
      }));
    }
    
    // Generate placeholder data if no metrics
    const data = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        views: 0,
      });
    }
    return data;
  };

  const chartData = getChartData();

  if (channelLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Canal não encontrado</h1>
          <Button onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-xl">{channel.name}</h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${channel.niche_color}`}>
              {channel.niche}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="metrics" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="metrics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Métricas
            </TabsTrigger>
            <TabsTrigger value="blueprint" className="gap-2">
              <Settings className="w-4 h-4" />
              Blueprint
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2">
              <FileText className="w-4 h-4" />
              Conteúdos
            </TabsTrigger>
          </TabsList>

          {/* METRICS TAB */}
          <TabsContent value="metrics" className="space-y-6">
            {/* YouTube Connection Card */}
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {channel.youtube_channel_id && channel.avatar_url ? (
                      <Avatar className="w-12 h-12 border-2 border-red-500/20">
                        <AvatarImage src={channel.avatar_url} alt={channel.name} />
                        <AvatarFallback className="bg-red-500/10">
                          <Youtube className="w-5 h-5 text-red-500" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${channel.youtube_channel_id ? 'bg-red-500/10' : 'bg-muted'}`}>
                        <Youtube className={`w-6 h-6 ${channel.youtube_channel_id ? 'text-red-500' : 'text-muted-foreground'}`} />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-lg">
                        {channel.youtube_channel_id ? channel.name : 'Conectar YouTube'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {channel.youtube_channel_id
                          ? `${formatNumber(channel.subscribers || 0)} inscritos • ${formatNumber(channel.monthly_views || 0)} views/mês`
                          : 'Vincule seu canal para importar métricas reais'}
                      </p>
                      {channel.youtube_connected_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Conectado em {new Date(channel.youtube_connected_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {channel.youtube_channel_id ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={handleSyncMetrics}
                          disabled={syncMetrics.isPending}
                        >
                          {syncMetrics.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          Atualizar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => disconnectYouTube.mutate(id!)}
                          disabled={disconnectYouTube.isPending}
                        >
                          <Unlink className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-2 bg-red-500 hover:bg-red-600"
                        onClick={() => setShowConnectModal(true)}
                      >
                        <Youtube className="w-4 h-4" />
                        Conectar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">RPM</p>
                      <p className="text-2xl font-bold">
                        R$ {latestMetric?.rpm?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Inscritos</p>
                      <p className="text-2xl font-bold">{formatNumber(channel.subscribers || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Video className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Último Vídeo</p>
                      <p className="text-2xl font-bold">
                        {formatNumber(latestMetric?.last_video_views || 0)}
                      </p>
                      {latestMetric?.last_video_date && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(latestMetric.last_video_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Views/Mês</p>
                      <p className="text-2xl font-bold">{formatNumber(channel.monthly_views || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>Views - Últimos 30 dias</CardTitle>
                <CardDescription>Performance diária do canal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => formatNumber(value)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BLUEPRINT TAB */}
          <TabsContent value="blueprint" className="space-y-6">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>Identidade do Canal</CardTitle>
                <CardDescription>
                  Configure as regras e padrões que serão usados para gerar conteúdo automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {blueprintLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="niche">Nicho/Tópico</Label>
                        <Select
                          value={localBlueprint.topic}
                          onValueChange={(value) => setLocalBlueprint({ ...localBlueprint, topic: value })}
                        >
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

                      <div className="space-y-2">
                        <Label htmlFor="voice">Voz do Narrador</Label>
                        <Select
                          value={localBlueprint.voice_id}
                          onValueChange={(value) => setLocalBlueprint({ ...localBlueprint, voice_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a voz" />
                          </SelectTrigger>
                          <SelectContent>
                            {voiceOptions.map((voice) => (
                              <SelectItem key={voice.id} value={voice.id}>
                                {voice.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="frequency">Frequência de Upload</Label>
                        <Select
                          value={localBlueprint.upload_frequency}
                          onValueChange={(value) => setLocalBlueprint({ ...localBlueprint, upload_frequency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a frequência" />
                          </SelectTrigger>
                          <SelectContent>
                            {uploadFrequencyOptions.map((freq) => (
                              <SelectItem key={freq.value} value={freq.value}>
                                {freq.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="script-rules">Estrutura de Roteiro</Label>
                      <Textarea
                        id="script-rules"
                        placeholder="Defina as regras para geração de roteiros..."
                        className="min-h-[150px] font-mono text-sm"
                        value={localBlueprint.script_rules}
                        onChange={(e) => setLocalBlueprint({ ...localBlueprint, script_rules: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Estas regras serão usadas como base para gerar prompts de roteiro
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="visual-style">Estilo Visual (Thumbnails)</Label>
                      <Textarea
                        id="visual-style"
                        placeholder="Defina o estilo visual para thumbnails..."
                        className="min-h-[150px] font-mono text-sm"
                        value={localBlueprint.visual_style}
                        onChange={(e) => setLocalBlueprint({ ...localBlueprint, visual_style: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Estas instruções serão usadas para gerar prompts de imagem
                      </p>
                    </div>

                    <Button
                      onClick={handleSaveBlueprint}
                      className="gap-2"
                      disabled={updateBlueprint.isPending}
                    >
                      {updateBlueprint.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Salvar Blueprint
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONTENT TAB */}
          <TabsContent value="content" className="space-y-6">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>Lista de Conteúdos</CardTitle>
                <CardDescription>
                  Vídeos em produção e publicados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contents.map((content) => {
                        const statusBadge = getStatusBadge(content.status);
                        return (
                          <TableRow key={content.id}>
                            <TableCell className="font-medium">{content.title}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={statusBadge.className}>
                                {statusBadge.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {content.scheduled_date
                                ? new Date(content.scheduled_date).toLocaleDateString('pt-BR')
                                : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {contents.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            Nenhum conteúdo cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Connect YouTube Modal */}
      <ConnectYouTubeModal
        open={showConnectModal}
        onOpenChange={setShowConnectModal}
        onConnect={handleConnectYouTube}
        isConnecting={connectWithApify.isPending}
      />
    </div>
  );
}
