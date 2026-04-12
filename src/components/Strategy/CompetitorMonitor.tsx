import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFriendlyErrorMessage } from "@/utils/errorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Eye,
    Plus,
    Users,
    TrendingUp,
    TrendingDown,
    ExternalLink,
    Trash2,
    RefreshCw,
    Youtube,
    Video,
    Bell,
    BellOff
} from 'lucide-react';
import { toast } from 'sonner';
import { useCompetitors } from '@/hooks/useCompetitors';

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
}

export function CompetitorMonitor({ channelId }: { channelId?: string }) {
    const { competitors, isLoading, addCompetitor, toggleTracking, removeCompetitor, syncCompetitors } = useCompetitors(channelId);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newChannelUrl, setNewChannelUrl] = useState('');
    const [newName, setNewName] = useState('');
    const [newHandle, setNewHandle] = useState('');

    const handleAddChannel = async () => {
        if (!newChannelUrl && (!newName || !newHandle)) {
            toast.error(getFriendlyErrorMessage(null, "Por favor, insira o arroba do canal"));
            return;
        }

        // Se o usuário colou URL no mock ele preenchia, vamos adaptar:
        const nameToSave = newName || 'Novo Canal';
        const handleToSave = newHandle || newChannelUrl.split('@')[1] || newChannelUrl || '@novocanal';

        await addCompetitor.mutateAsync({
            name: nameToSave,
            handle: handleToSave.startsWith('@') ? handleToSave : `@${handleToSave}`,
            youtube_url: newChannelUrl || undefined,
        });

        setNewName('');
        setNewHandle('');
        setNewChannelUrl('');
        setDialogOpen(false);
    };

    const handleToggleTracking = (id: string, current: boolean) => {
        toggleTracking.mutate({ id, tracking: !current });
    };

    const handleRemoveChannel = (id: string) => {
        removeCompetitor.mutate(id);
    };
    const trackedCount = competitors.filter(c => c.tracking).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Eye className="w-6 h-6 text-primary" />
                        Monitoramento de Concorrentes
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Acompanhe canais de referência e receba alertas de oportunidade.
                        {!channelId && " (Selecione um canal para ver a lista de concorrentes dele)"}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => syncCompetitors.mutate()}
                        disabled={syncCompetitors.isPending || competitors.length === 0}
                    >
                        <RefreshCw className={`w-4 h-4 ${syncCompetitors.isPending ? 'animate-spin' : ''}`} />
                        {syncCompetitors.isPending ? 'Sincronizando...' : 'Sincronizar'}
                    </Button>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Adicionar Canal
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Canal à Whitelist</DialogTitle>
                            <DialogDescription>
                                Cole a URL do canal do YouTube para começar a monitorar.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>URL do Canal</Label>
                                <Input
                                    placeholder="https://youtube.com/@canal"
                                    value={newChannelUrl}
                                    onChange={(e) => setNewChannelUrl(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nome</Label>
                                <Input
                                    placeholder="Nome do Canal"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Handle/Arroba</Label>
                                <Input
                                    placeholder="@canal"
                                    value={newHandle}
                                    onChange={(e) => setNewHandle(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleAddChannel} className="w-full" disabled={addCompetitor.isPending}>
                                {addCompetitor.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Youtube className="w-4 h-4 mr-2" />}
                                Buscar e Adicionar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-card/50 border-border">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Eye className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Canais Monitorados</p>
                            <p className="text-2xl font-bold">{competitors.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-border">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Com Alertas Ativos</p>
                            <p className="text-2xl font-bold">{trackedCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 border-border">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Video className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Vídeos Esta Semana</p>
                            <p className="text-2xl font-bold">12</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Competitor Table */}
            <Card className="bg-card/50 border-border">
                <CardHeader>
                    <CardTitle className="text-lg">Whitelist de Canais</CardTitle>
                    <CardDescription>
                        Canais de referência que você está monitorando para oportunidades.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Canal</TableHead>
                                <TableHead>Nicho</TableHead>
                                <TableHead className="text-right">Inscritos</TableHead>
                                <TableHead className="text-right">Média Views</TableHead>
                                <TableHead>Último Vídeo</TableHead>
                                <TableHead className="text-center">Crescimento</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {competitors.map((channel) => (
                                <TableRow key={channel.id} className="group">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                                <Youtube className="w-5 h-5 text-red-500" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{channel.name}</p>
                                                <p className="text-xs text-muted-foreground">{channel.handle}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                            {channel.niche || '—'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        <div className="flex items-center justify-end gap-1">
                                            <Users className="w-3 h-3 text-muted-foreground" />
                                            {channel.subscribers > 0 ? formatNumber(channel.subscribers) : 'Oculto'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {formatNumber(channel.avgViews)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[200px]">
                                            <p className="text-sm truncate">{channel.lastVideo}</p>
                                            <p className="text-xs text-muted-foreground">{channel.lastVideoDate}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {(() => {
                                            const isNegative = channel.growth.startsWith('-');
                                            const isZero = channel.growth === '+0%' || channel.growth === '0%';
                                            if (isNegative) return (
                                                <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                                                    <TrendingDown className="w-3 h-3 mr-1" />
                                                    {channel.growth}
                                                </Badge>
                                            );
                                            if (isZero) return (
                                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                                    {channel.growth}
                                                </Badge>
                                            );
                                            return (
                                                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                                    <TrendingUp className="w-3 h-3 mr-1" />
                                                    {channel.growth}
                                                </Badge>
                                            );
                                        })()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleToggleTracking(channel.id, channel.tracking)}
                                            >
                                                {channel.tracking ? (
                                                    <Bell className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <BellOff className="w-4 h-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                asChild
                                            >
                                                <a href={`https://youtube.com/${channel.handle}`} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                                </a>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleRemoveChannel(channel.id)}
                                            >
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    )}
                </CardContent>
            </Card>

            {/* Recent Activity Feed */}
            <Card className="bg-card/50 border-border">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Video className="w-5 h-5 text-primary" />
                        Atividade Recente
                    </CardTitle>
                    <CardDescription>
                        Últimos vídeos publicados pelos canais monitorados.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {competitors.slice(0, 4).map((channel) => (
                        <div key={channel.id} className="flex items-start gap-4 p-3 rounded-lg bg-background/50 border border-border hover:border-primary/30 transition-colors">
                            <div className="w-24 h-14 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                <Video className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{channel.lastVideo}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {channel.name} • {channel.lastVideoDate}
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-sm font-medium text-primary">{formatNumber(channel.avgViews)}</p>
                                <p className="text-xs text-muted-foreground">views est.</p>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
