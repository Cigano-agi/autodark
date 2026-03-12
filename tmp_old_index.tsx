
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // Added useLocation, useNavigate
import { useChannels } from "@/hooks/useChannels";
import { useBlueprint } from "@/hooks/useBlueprint";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, Play, Image as ImageIcon, FileText, CheckCircle, Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { BeamsBackground } from "@/components/ui/beams-background";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { KieGenerator } from "@/components/ui/kie-generator";

// Mock AI functions
const generateScriptMock = async (topic: string) => {
    return new Promise<string>((resolve) => {
        setTimeout(() => {
            resolve(`
# Roteiro: ${topic}

[ABERTURA]
(Cena rápida, música tensa)
Você sabia que ${topic} esconde um segredo que ninguém te contou?

[CORPO]
1. O início de tudo...
2. A reviravolta chocante...
3. O que os especialistas dizem...

[ENCERRAMENTO]
Se gostou, deixe o like e se inscreva. Até a próxima!
      `.trim());
        }, 2000);
    });
};

const generateAudioMock = async () => {
    return new Promise<void>((resolve) => setTimeout(resolve, 2000));
};

const generateThumbMock = async () => {
    return new Promise<void>((resolve) => setTimeout(resolve, 2000));
};

export default function ProductionWizard() {
    const { channels } = useChannels();
    const location = useLocation();
    const navigate = useNavigate();
    const [selectedChannelId, setSelectedChannelId] = useState<string>(location.state?.channelId || "");
    const { blueprint } = useBlueprint(selectedChannelId);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Generation States
    const [script, setScript] = useState("");
    const [audioReady, setAudioReady] = useState(false);
    const [thumbReady, setThumbReady] = useState(false);

    const handleChannelSelect = (id: string) => {
        setSelectedChannelId(id);
        // Reset states when changing channel
        setStep(1);
        setScript("");
        setAudioReady(false);
        setThumbReady(false);
    };

    const [statusMessage, setStatusMessage] = useState("");

    const simulateProgress = async (messages: string[]) => {
        for (const msg of messages) {
            setStatusMessage(msg);
            await new Promise(r => setTimeout(r, 800));
        }
        setStatusMessage("");
    };

    const handleGenerateScript = async () => {
        if (!blueprint?.topic) {
            toast.error("Este canal não tem um tópico definido no Blueprint.");
            return;
        }
        setLoading(true);
        try {
            await simulateProgress([
                "Analisando tendências do nicho...",
                "Estruturando roteiro viral...",
                "Criando ganchos de retenção...",
                "Finalizando script..."
            ]);
            const result = await generateScriptMock(blueprint.topic);
            setScript(result);
            setStep(2);
            toast.success("Roteiro gerado!");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAudio = async () => {
        setLoading(true);
        try {
            await simulateProgress([
                `Carregando voz: ${blueprint?.voice_name || "Padrão"}...`,
                "Sintetizando fala...",
                "Ajustando entonação e ritmo...",
                "Aplicando filtros de áudio..."
            ]);
            await generateAudioMock();
            setAudioReady(true);
            setStep(3);
            toast.success("Áudio gerado!");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateThumb = async () => {
        setLoading(true);
        try {
            await simulateProgress([
                "Analisando contexto do vídeo...",
                "Gerando composição visual...",
                "Ajustando contraste e saturação...",
                "Renderizando imagem 4K..."
            ]);
            await generateThumbMock();
            setThumbReady(true);
            setStep(4);
            toast.success("Thumbnail gerada!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <BeamsBackground intensity="medium" className="bg-background">
            <DashboardHeader />
            <main className="pt-28 pb-12 px-6 max-w-7xl mx-auto min-h-screen relative z-10 text-foreground">
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Assistente de Produção</h1>
                            <p className="text-muted-foreground">
                                Gere conteúdo do zero seguindo o Blueprint do seu canal.
                            </p>
                            {loading && statusMessage && (
                                <div className="mt-2 flex items-center gap-2 text-primary animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span className="text-sm font-mono">{statusMessage}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map((s) => (
                                <div key={s} className={`w-3 h-3 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-muted'}`} />
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Panel: Configuration */}
                        <Card className="md:col-span-1 bg-card/50 backdrop-blur-sm border-border h-fit">
                            <CardHeader>
                                <CardTitle className="text-lg text-white">Configuração</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-white">Selecione o Canal</Label>
                                    <Select onValueChange={handleChannelSelect} value={selectedChannelId}>
                                        <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                            <SelectValue placeholder="Escolha..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {channels.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedChannelId && blueprint && (
                                    <div className="p-3 bg-primary/10 rounded-lg text-sm space-y-2 border border-primary/20">
                                        <div className="flex items-center gap-2 font-medium text-primary">
                                            <Zap className="w-4 h-4" /> Blueprint Ativo
                                        </div>
                                        <ul className="space-y-1 text-muted-foreground text-xs">
                                            <li><span className="font-semibold text-white">Tópico:</span> {blueprint.topic || '-'}</li>
                                            <li><span className="font-semibold text-white">Voz:</span> {blueprint.voice_name || '-'}</li>
                                            <li><span className="font-semibold text-white">Estilo:</span> {blueprint.visual_style ? 'Definido' : '-'}</li>
                                        </ul>
                                    </div>
                                )}

                                <div className="mt-6">
                                    <KieGenerator channelId={selectedChannelId} topic={blueprint?.topic} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Right Panel: Wizard Steps */}
                        <div className="md:col-span-2 space-y-6">

                            {/* Step 1: Script */}
                            <Card className={`transition-all duration-300 bg-card/30 backdrop-blur border-white/10 ${step === 1 ? 'ring-2 ring-primary border-transparent' : ''}`}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-white">
                                        <FileText className="w-5 h-5 text-blue-500" /> 1. Roteiro (Script)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {!script ? (
                                        <div className="text-center py-8">
                                            <p className="text-muted-foreground mb-4">
                                                Clique para gerar um roteiro baseado no tópico <strong>{blueprint?.topic || "..."}</strong>
                                            </p>
                                            <Button
                                                onClick={handleGenerateScript}
                                                disabled={!selectedChannelId || loading}
                                                className="w-full sm:w-auto gap-2"
                                            >
                                                {loading && step === 1 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                                Gerar Roteiro com IA
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <Textarea value={script} readOnly className="h-[200px] font-mono text-sm bg-black/40 border-white/10 text-white" />
                                            <div className="flex justify-end">
                                                <span className="text-xs text-green-500 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Gerado com sucesso
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Step 2: Audio */}
                            {step >= 2 && (
                                <Card className={`transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/30 backdrop-blur border-white/10 ${step === 2 ? 'ring-2 ring-primary border-transparent' : ''}`}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-white">
                                            <Play className="w-5 h-5 text-purple-500" /> 2. Narração (Audio)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {!audioReady ? (
                                            <div className="flex flex-col items-center gap-4 py-4">
                                                <Button
                                                    onClick={handleGenerateAudio}
                                                    disabled={loading}
                                                    variant="secondary"
                                                    className="w-full gap-2"
                                                >
                                                    {loading && step === 2 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                                    Gerar Narração ({blueprint?.voice_name || "Padrão"})
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-secondary/50 rounded-lg flex items-center justify-between border border-border">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                                        <Play className="w-5 h-5 text-primary ml-1" />
                                                    </div>
                                                    <div className="text-sm">
                                                        <p className="font-medium text-white">Audio_Gerado_v1.mp3</p>
                                                        <p className="text-xs text-muted-foreground">02:14 • 4.2 MB</p>
                                                    </div>
                                                </div>
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 3: Thumbnail */}
                            {step >= 3 && (
                                <Card className={`transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 bg-card/30 backdrop-blur border-white/10 ${step === 3 ? 'ring-2 ring-primary border-transparent' : ''}`}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-white">
                                            <ImageIcon className="w-5 h-5 text-pink-500" /> 3. Thumbnail
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {!thumbReady ? (
                                            <div className="flex flex-col items-center gap-4 py-4">
                                                <Button
                                                    onClick={handleGenerateThumb}
                                                    disabled={loading}
                                                    variant="secondary"
                                                    className="w-full gap-2"
                                                >
                                                    {loading && step === 3 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                                    Gerar Thumbnail
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="relative aspect-video rounded-lg overflow-hidden bg-black/50 border border-border group">
                                                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                                    [IMAGEM GERADA PELA IA]
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                                                    <p className="text-white font-medium text-sm">Thumbnail_Final.png</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 4: Final */}
                            {step === 4 && (
                                <div className="flex justify-end animate-in fade-in slide-in-from-bottom-4">
                                    <Button
                                        size="lg"
                                        onClick={() => {
                                            toast.success("Vídeo enviado para produção! 🚀");
                                            setTimeout(() => navigate(`/channel/${selectedChannelId}`), 1000);
                                        }}
                                        className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
                                    >
                                        Enviar para Aprovação Final <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </main>
        </BeamsBackground>
    );
}
