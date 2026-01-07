import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockChannels, formatNumber, getStatusBadge, voiceOptions, nicheOptions, uploadFrequencyOptions } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BarChart3, Settings, FileText, TrendingUp, Users, DollarSign, Video, Save, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ChannelView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const channel = useMemo(() => mockChannels.find(c => c.id === id), [id]);
  
  const [blueprint, setBlueprint] = useState({
    topic: channel?.blueprint?.topic || '',
    voiceId: channel?.blueprint?.voiceId || '',
    scriptRules: channel?.blueprint?.scriptRules || '',
    visualStyle: channel?.blueprint?.visualStyle || '',
    uploadFrequency: channel?.blueprint?.uploadFrequency || '',
  });

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

  const handleSaveBlueprint = () => {
    toast.success('Blueprint salvo com sucesso!');
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{channel.name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${channel.nicheColor}`}>
                {channel.niche}
              </span>
            </div>
          </div>
        </div>
      </header>

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
                      <p className="text-2xl font-bold">R$ {channel.metrics?.rpm.toFixed(2)}</p>
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
                      <p className="text-2xl font-bold">{formatNumber(channel.metrics?.totalSubs || 0)}</p>
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
                      <p className="text-2xl font-bold">{formatNumber(channel.metrics?.lastVideoViews || 0)}</p>
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
                      <p className="text-2xl font-bold">{formatNumber(channel.monthlyViews)}</p>
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
                    <LineChart data={channel.metrics?.viewsOverTime || []}>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="niche">Nicho/Tópico</Label>
                    <Select 
                      value={blueprint.topic} 
                      onValueChange={(value) => setBlueprint({ ...blueprint, topic: value })}
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
                      value={blueprint.voiceId} 
                      onValueChange={(value) => setBlueprint({ ...blueprint, voiceId: value })}
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
                      value={blueprint.uploadFrequency} 
                      onValueChange={(value) => setBlueprint({ ...blueprint, uploadFrequency: value })}
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
                    value={blueprint.scriptRules}
                    onChange={(e) => setBlueprint({ ...blueprint, scriptRules: e.target.value })}
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
                    value={blueprint.visualStyle}
                    onChange={(e) => setBlueprint({ ...blueprint, visualStyle: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Estas instruções serão usadas para gerar prompts de imagem
                  </p>
                </div>

                <Button onClick={handleSaveBlueprint} className="gap-2">
                  <Save className="w-4 h-4" />
                  Salvar Blueprint
                </Button>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {channel.contents?.map((content) => {
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
                            {new Date(content.date).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!channel.contents || channel.contents.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          Nenhum conteúdo cadastrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
