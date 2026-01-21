import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Settings,
    Shield,
    Mail,
    Server,
    UserPlus,
    CheckCircle2,
    Clock,
    AlertTriangle,
    FileText,
    BookOpen,
    ListChecks,
    Play,
    RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { BeamsBackground } from "@/components/ui/beams-background";
import { DashboardHeader } from "@/components/ui/dashboard-header";

interface SOPStep {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    critical?: boolean;
}

interface SOP {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    color: string;
    estimatedTime: string;
    steps: SOPStep[];
}

const SOPS: SOP[] = [
    {
        id: 'email-creation',
        title: 'Criação de E-mails',
        description: 'Processo seguro para criar contas de e-mail para novos canais.',
        icon: Mail,
        color: 'text-blue-500 bg-blue-500/10',
        estimatedTime: '15-20 min',
        steps: [
            { id: '1', title: 'Ativar VPN/Proxy dedicado', description: 'Use IP residencial, nunca datacenter.', completed: false, critical: true },
            { id: '2', title: 'Limpar cookies e cache', description: 'Use navegador em modo privado ou perfil limpo.', completed: false },
            { id: '3', title: 'Acessar provedor de e-mail', description: 'Gmail, Outlook ou provedor alternativo.', completed: false },
            { id: '4', title: 'Usar dados realistas', description: 'Nome consistente com nicho, data de nascimento plausível.', completed: false },
            { id: '5', title: 'Verificação por telefone', description: 'Use número virtual se necessário. Aguarde cooldown.', completed: false, critical: true },
            { id: '6', title: 'Configurar recuperação', description: 'E-mail secundário ou telefone de backup.', completed: false },
            { id: '7', title: 'Documentar credenciais', description: 'Salvar no gerenciador de senhas seguro.', completed: false },
            { id: '8', title: 'Aguardar maturação', description: 'Deixar conta "descansar" por 24-48h antes de usar.', completed: false },
        ]
    },
    {
        id: 'channel-creation',
        title: 'Criação de Canal',
        description: 'Setup inicial de um novo canal YouTube seguindo boas práticas.',
        icon: UserPlus,
        color: 'text-red-500 bg-red-500/10',
        estimatedTime: '30-45 min',
        steps: [
            { id: '1', title: 'Login com e-mail maturado', description: 'Conta deve ter pelo menos 24h de criação.', completed: false, critical: true },
            { id: '2', title: 'Criar canal (não marca)', description: 'Optar por canal pessoal, não conta de marca inicialmente.', completed: false },
            { id: '3', title: 'Configurar foto de perfil', description: 'Imagem única, não genérica. Evitar IA óbvia.', completed: false },
            { id: '4', title: 'Configurar banner', description: 'Dimensões corretas: 2560x1440px.', completed: false },
            { id: '5', title: 'Escrever descrição', description: 'Bio natural, com palavras-chave do nicho.', completed: false },
            { id: '6', title: 'Configurar links', description: 'Redes sociais consistentes com persona.', completed: false },
            { id: '7', title: 'Ativar verificação 2FA', description: 'Segurança da conta.', completed: false, critical: true },
            { id: '8', title: 'Período de aquecimento', description: 'Assistir vídeos, se inscrever em canais do nicho por 3-5 dias.', completed: false, critical: true },
        ]
    },
    {
        id: 'proxy-setup',
        title: 'Setup de Proxy/IP',
        description: 'Configuração de infraestrutura de contingência.',
        icon: Server,
        color: 'text-purple-500 bg-purple-500/10',
        estimatedTime: '20-30 min',
        steps: [
            { id: '1', title: 'Adquirir proxy residencial', description: 'Provedores: Bright Data, Oxylabs, IPRoyal. Evitar proxies gratuitos.', completed: false, critical: true },
            { id: '2', title: 'Testar IP', description: 'Verificar blacklist, geolocalização correta.', completed: false },
            { id: '3', title: 'Configurar rotação', description: 'Se aplicável, configurar sticky sessions.', completed: false },
            { id: '4', title: 'Mapear IP por conta', description: 'Cada conta = 1 IP dedicado. Nunca misturar.', completed: false, critical: true },
            { id: '5', title: 'Documentar configuração', description: 'Hostname, porta, credenciais, país.', completed: false },
            { id: '6', title: 'Testar conectividade', description: 'Verificar acesso ao YouTube/Google.', completed: false },
        ]
    },
    {
        id: 'account-verification',
        title: 'Verificação de Contas',
        description: 'Processo para verificar e manter contas saudáveis.',
        icon: Shield,
        color: 'text-green-500 bg-green-500/10',
        estimatedTime: '10-15 min',
        steps: [
            { id: '1', title: 'Checar status da conta', description: 'YouTube Studio > Canal > Status e recursos.', completed: false },
            { id: '2', title: 'Verificar strikes/warnings', description: 'Nenhuma violação pendente.', completed: false, critical: true },
            { id: '3', title: 'Testar upload', description: 'Upload privado de teste (5 segundos de vídeo).', completed: false },
            { id: '4', title: 'Verificar monetização', description: 'Elegibilidade, políticas, AdSense conectado.', completed: false },
            { id: '5', title: 'Checar analytics', description: 'Métricas normais, sem anomalias.', completed: false },
            { id: '6', title: 'Atualizar documentação', description: 'Status atual no sistema.', completed: false },
        ]
    },
];

export default function OperationsPage() {
    const [sops, setSOPs] = useState<SOP[]>(SOPS);
    const [activeTab, setActiveTab] = useState('overview');
    const [activeSOP, setActiveSOP] = useState<SOP | null>(null);

    const toggleStep = (sopId: string, stepId: string) => {
        setSOPs(sops.map(sop => {
            if (sop.id === sopId) {
                return {
                    ...sop,
                    steps: sop.steps.map(step =>
                        step.id === stepId ? { ...step, completed: !step.completed } : step
                    )
                };
            }
            return sop;
        }));
    };

    const resetSOP = (sopId: string) => {
        setSOPs(sops.map(sop => {
            if (sop.id === sopId) {
                return {
                    ...sop,
                    steps: sop.steps.map(step => ({ ...step, completed: false }))
                };
            }
            return sop;
        }));
        toast.success('Checklist reiniciado');
    };

    const getSOPProgress = (sop: SOP) => {
        const completed = sop.steps.filter(s => s.completed).length;
        return Math.round((completed / sop.steps.length) * 100);
    };

    const startSOP = (sop: SOP) => {
        setActiveSOP(sop);
        setActiveTab('execute');
        toast.info(`Iniciando: ${sop.title}`);
    };

    return (
        <BeamsBackground intensity="medium" className="bg-background">
            <DashboardHeader />
            <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto min-h-screen relative z-10 text-foreground">
                <div className="space-y-8 animate-fade-in">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                            <Settings className="w-8 h-8 text-primary" />
                            Módulo Operacional
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Processos semi-manuais padronizados. Documentação, orquestração e boas práticas.
                        </p>
                    </div>

                    {/* Warning Banner */}
                    <Card className="bg-yellow-500/5 border-yellow-500/20 backdrop-blur-sm">
                        <CardContent className="p-4 flex items-start gap-4">
                            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-yellow-500">Atenção: Processos Semi-Manuais</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Estas operações <strong>não são automatizadas</strong> por design. Automação total nestes processos aumenta significativamente o risco de ban. Siga os checklists manualmente.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="bg-card/50 backdrop-blur border border-white/10 p-1">
                            <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <BookOpen className="w-4 h-4" /> Visão Geral
                            </TabsTrigger>
                            <TabsTrigger value="execute" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <ListChecks className="w-4 h-4" /> Executar SOP
                            </TabsTrigger>
                        </TabsList>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sops.map((sop) => {
                                    const progress = getSOPProgress(sop);
                                    const Icon = sop.icon;
                                    return (
                                        <Card key={sop.id} className="bg-card/30 backdrop-blur-md border-white/10 hover:border-primary/50 transition-all group">
                                            <CardHeader>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-12 rounded-xl ${sop.color} flex items-center justify-center`}>
                                                            <Icon className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <CardTitle className="text-lg text-white">{sop.title}</CardTitle>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className="text-xs bg-black/40 border-white/10 text-white/70">
                                                                    <Clock className="w-3 h-3 mr-1" />
                                                                    {sop.estimatedTime}
                                                                </Badge>
                                                                <Badge variant="outline" className="text-xs bg-black/40 border-white/10 text-white/70">
                                                                    {sop.steps.length} etapas
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <p className="text-sm text-muted-foreground">{sop.description}</p>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">Progresso</span>
                                                        <span className="font-medium text-white">{progress}%</span>
                                                    </div>
                                                    <Progress value={progress} className="h-2 bg-white/5" />
                                                </div>

                                                <Button
                                                    className="w-full gap-2 transition-all"
                                                    onClick={() => startSOP(sop)}
                                                    variant={progress > 0 ? "secondary" : "default"}
                                                >
                                                    {progress > 0 ? (
                                                        <>
                                                            <Play className="w-4 h-4" /> Continuar
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="w-4 h-4" /> Iniciar
                                                        </>
                                                    )}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </TabsContent>

                        {/* Execute Tab */}
                        <TabsContent value="execute" className="space-y-6">
                            {!activeSOP ? (
                                <Card className="bg-card/20 backdrop-blur border-dashed border-white/10">
                                    <CardContent className="flex flex-col items-center justify-center py-16">
                                        <ListChecks className="w-12 h-12 text-muted-foreground mb-4" />
                                        <p className="text-lg font-medium mb-2 text-white">Nenhum SOP selecionado</p>
                                        <p className="text-muted-foreground text-sm mb-4">
                                            Selecione um processo na aba "Visão Geral" para começar.
                                        </p>
                                        <Button variant="outline" onClick={() => setActiveTab('overview')} className="border-white/10 hover:bg-white/5 text-white">
                                            Ver Processos
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <>
                                    {/* SOP Header */}
                                    <Card className="bg-card/40 backdrop-blur border-white/10">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-14 h-14 rounded-xl ${activeSOP.color} flex items-center justify-center`}>
                                                        <activeSOP.icon className="w-7 h-7" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-2xl font-bold text-white">{activeSOP.title}</h2>
                                                        <p className="text-muted-foreground">{activeSOP.description}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-3xl font-bold text-primary">{getSOPProgress(activeSOP)}%</p>
                                                        <p className="text-xs text-muted-foreground">completo</p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => resetSOP(activeSOP.id)}
                                                        className="hover:bg-destructive/20 hover:text-destructive text-muted-foreground"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* SOP Steps */}
                                    <Card className="bg-card/30 backdrop-blur border-white/10">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-white">
                                                <FileText className="w-5 h-5" />
                                                Checklist de Execução
                                            </CardTitle>
                                            <CardDescription>
                                                Marque cada etapa conforme for completando. Etapas críticas estão destacadas.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {sops.find(s => s.id === activeSOP.id)?.steps.map((step, index) => (
                                                <div
                                                    key={step.id}
                                                    className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${step.completed
                                                        ? 'bg-primary/5 border-primary/20 opacity-60'
                                                        : step.critical
                                                            ? 'bg-yellow-500/5 border-yellow-500/20'
                                                            : 'bg-black/20 border-white/5 hover:border-white/20'
                                                        }`}
                                                >
                                                    <Checkbox
                                                        checked={step.completed}
                                                        onCheckedChange={() => toggleStep(activeSOP.id, step.id)}
                                                        className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-white/20"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                #{index + 1}
                                                            </span>
                                                            <p className={`font-medium ${step.completed ? 'line-through text-muted-foreground' : 'text-white'}`}>
                                                                {step.title}
                                                            </p>
                                                            {step.critical && !step.completed && (
                                                                <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 text-xs bg-yellow-500/5">
                                                                    Crítico
                                                                </Badge>
                                                            )}
                                                            {step.completed && (
                                                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {step.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>

                                    {getSOPProgress(activeSOP) === 100 && (
                                        <Card className="bg-green-500/10 border-green-500/20 backdrop-blur">
                                            <CardContent className="p-6 flex items-center gap-4">
                                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                                                <div>
                                                    <p className="font-semibold text-green-500 text-lg">SOP Concluído!</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Todas as etapas foram completadas. Documente o resultado no sistema.
                                                    </p>
                                                </div>
                                                <Button variant="outline" className="ml-auto border-green-500/20 hover:bg-green-500/10 text-green-500" onClick={() => setActiveTab('overview')}>
                                                    Voltar à Visão Geral
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    )}
                                </>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </BeamsBackground>
    );
}
