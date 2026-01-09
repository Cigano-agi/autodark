import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Zap,
    BarChart3,
    Brain,
    Shield,
    Rocket,
    Target,
    TrendingUp,
    Video,
    Sparkles,
    ArrowRight,
    CheckCircle,
    Play,
    ChevronDown
} from 'lucide-react';

const FEATURES = [
    {
        icon: Brain,
        title: "Inteligência Estratégica",
        description: "IA que amplifica expertise humana, não substitui. Decisões baseadas em dados reais, não achismos.",
        gradient: "from-purple-500 to-pink-500"
    },
    {
        icon: Target,
        title: "Pesquisa de Nichos",
        description: "Identifique oportunidades lucrativas antes da concorrência. Análise de CPM, tendências e potencial viral.",
        gradient: "from-blue-500 to-cyan-500"
    },
    {
        icon: Video,
        title: "Produção Automatizada",
        description: "Do roteiro à thumbnail em minutos. Geração de scripts, narração e artes seguindo seu Blueprint.",
        gradient: "from-green-500 to-emerald-500"
    },
    {
        icon: Shield,
        title: "Segurança Operacional",
        description: "Automação consciente de risco. Humanização em pontos críticos para evitar detecção.",
        gradient: "from-orange-500 to-red-500"
    },
    {
        icon: BarChart3,
        title: "Monitoramento em Tempo Real",
        description: "Acompanhe performance, identifique quedas de hype e receba alertas de ajustes estratégicos.",
        gradient: "from-yellow-500 to-orange-500"
    },
    {
        icon: Rocket,
        title: "Escala Replicável",
        description: "Blueprints padronizados por nicho. Clone estratégias vencedoras em novos canais.",
        gradient: "from-indigo-500 to-purple-500"
    }
];

const STATS = [
    { value: "10x", label: "Mais Rápido" },
    { value: "85%", label: "Menos Trabalho Manual" },
    { value: "3x", label: "Mais Canais Gerenciados" },
];

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
            {/* Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-border' : 'bg-transparent'}`}>
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-primary/25">
                            <Zap className="w-5 h-5 text-black" />
                        </div>
                        <span className="font-bold text-2xl tracking-tight">AutoDark</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
                        <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">Como Funciona</a>
                        <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Planos</a>
                    </div>
                    <Link to="/login">
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-lg shadow-primary/25">
                            Acessar Plataforma
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center pt-20">
                {/* Background Effects */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <Badge variant="outline" className="mb-6 px-4 py-2 text-sm border-primary/30 text-primary bg-primary/5">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Plataforma de Automação Estratégica
                        </Badge>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
                            Escale operações de
                            <span className="block bg-gradient-to-r from-primary via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                YouTube Dark
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                            Centralize estratégia, produção e monitoramento em uma única plataforma.
                            <span className="text-foreground font-medium"> IA que pensa como você, só que mais rápido.</span>
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                            <Link to="/login">
                                <Button size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 group">
                                    Começar Agora
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                            <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-border hover:bg-card group">
                                <Play className="mr-2 w-5 h-5" />
                                Ver Demonstração
                            </Button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
                            {STATS.map((stat, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Scroll Indicator */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
                        <ChevronDown className="w-8 h-8 text-muted-foreground" />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-32 relative">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Funcionalidades</Badge>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">Tudo que você precisa para escalar</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            Uma máquina de decisão + produção + validação para canais Dark.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((feature, i) => (
                            <Card key={i} className="bg-card/50 border-border hover:border-primary/30 transition-all duration-300 group overflow-hidden">
                                <CardContent className="p-8">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                                        <feature.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">{feature.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-32 bg-card/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

                <div className="container mx-auto px-6 relative z-10">
                    <div className="text-center mb-20">
                        <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Como Funciona</Badge>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">Simples. Estratégico. Escalável.</h2>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                        {[
                            { step: "01", title: "Defina o Blueprint", desc: "Configure tom, estilo e regras do canal" },
                            { step: "02", title: "Pesquise Nichos", desc: "IA analisa oportunidades em tempo real" },
                            { step: "03", title: "Produza Conteúdo", desc: "Gere scripts, áudio e thumbnails" },
                            { step: "04", title: "Monitore & Escale", desc: "Acompanhe métricas e replique o sucesso" },
                        ].map((item, i) => (
                            <div key={i} className="text-center group">
                                <div className="relative mb-6">
                                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 group-hover:border-primary/50 transition-colors">
                                        <span className="text-2xl font-bold text-primary">{item.step}</span>
                                    </div>
                                    {i < 3 && (
                                        <div className="hidden md:block absolute top-1/2 left-full w-full h-px bg-gradient-to-r from-primary/30 to-transparent" />
                                    )}
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                                <p className="text-muted-foreground text-sm">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-32">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Planos</Badge>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">Invista em escala real</h2>
                        <p className="text-xl text-muted-foreground">Acesso exclusivo para operações sérias.</p>
                    </div>

                    <div className="max-w-lg mx-auto">
                        <Card className="bg-gradient-to-b from-card to-card/50 border-primary/30 overflow-hidden relative">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-emerald-400 to-cyan-400" />
                            <CardContent className="p-10 text-center">
                                <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">Acesso Interno</Badge>
                                <div className="mb-6">
                                    <span className="text-5xl font-bold">Sob Consulta</span>
                                </div>
                                <ul className="text-left space-y-4 mb-8">
                                    {[
                                        "Acesso completo a todos os módulos",
                                        "Pesquisa de nichos ilimitada",
                                        "Produção automatizada de conteúdo",
                                        "Monitoramento em tempo real",
                                        "Suporte prioritário",
                                        "Blueprints personalizados"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                                            <span className="text-muted-foreground">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Button size="lg" className="w-full py-6 text-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
                                    Solicitar Acesso
                                </Button>
                                <p className="text-xs text-muted-foreground mt-4">
                                    Plataforma de uso interno. Não é SaaS público.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            Pronto para escalar?
                        </h2>
                        <p className="text-xl text-muted-foreground mb-10">
                            Pare de criar "água". Comece a criar "suco" — conteúdo estratégico que monetiza.
                        </p>
                        <Link to="/login">
                            <Button size="lg" className="text-lg px-10 py-6 bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30">
                                Acessar AutoDark
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-border">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-semibold">AutoDark</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            © 2026 AutoDark. Plataforma de uso interno.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
