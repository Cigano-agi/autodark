import { useState } from "react";
import { useContents } from "@/hooks/useContents";
import { useContentPipeline, getStatusInfo, type PipelineContent } from "@/hooks/useContentPipeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Loader2,
    Sparkles,
    FileText,
    Volume2,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Zap,
    Play,
    AlertTriangle,
    Clock,
} from "lucide-react";

interface ContentPipelineProps {
    channelId: string | undefined;
}

export function ContentPipeline({ channelId }: ContentPipelineProps) {
    const { contents, isLoading } = useContents(channelId);
    const pipeline = useContentPipeline(channelId);
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

    const toggleCard = (id: string) => {
        setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const pipelineContents = (contents as PipelineContent[]).filter(
        c => c.status && c.status !== 'draft'
    );

    const canGenerateScript = (status: string | null) =>
        status === 'idea_generated';

    const canProcessAudio = (status: string | null) =>
        status === 'script_generated' || status === 'pending_tts';

    const canRetry = (status: string | null) =>
        status === 'tts_failed' || status === 'audio_storage_failed';

    const isDone = (status: string | null) =>
        status === 'tts_done' || status === 'subtitle_generated' || status === 'published';

    return (
        <div className="space-y-6">
            {/* Header + Generate Ideas Button */}
            <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-950/30 to-black/40 backdrop-blur-md overflow-hidden relative">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
                <CardHeader>
                    <CardTitle className="text-indigo-300 flex items-center gap-2">
                        <Zap className="w-5 h-5" /> Pipeline de Conteúdo
                    </CardTitle>
                    <CardDescription className="text-indigo-200/60">
                        Gere ideias, roteiros, áudio e legendas automaticamente. Inspirado no N8N, 100% nativo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={() => pipeline.generateIdeas()}
                        disabled={pipeline.generatingIdeas || !channelId}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-md font-semibold shadow-lg shadow-indigo-500/20 gap-2"
                    >
                        {pipeline.generatingIdeas ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Sparkles className="w-5 h-5" />
                        )}
                        {pipeline.generatingIdeas ? "Gerando Ideias com IA..." : "Gerar Batch de Ideias"}
                    </Button>
                </CardContent>
            </Card>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
            )}

            {/* Status Summary */}
            {pipelineContents.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {['idea_generated', 'script_generated', 'tts_processing', 'tts_done', 'tts_failed'].map(status => {
                        const count = pipelineContents.filter(c => c.status === status).length;
                        if (count === 0) return null;
                        const info = getStatusInfo(status);
                        return (
                            <Badge key={status} className={`${info.color} border-none text-xs font-medium px-3 py-1`}>
                                {info.icon} {info.label}: {count}
                            </Badge>
                        );
                    })}
                </div>
            )}

            {/* Content Cards */}
            {pipelineContents.length === 0 && !isLoading && (
                <div className="text-center py-16 text-muted-foreground">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Nenhum conteúdo na pipeline</p>
                    <p className="text-sm mt-1">Clique em "Gerar Batch de Ideias" para começar</p>
                </div>
            )}

            <div className="space-y-3">
                {pipelineContents.map((content) => {
                    const status = content.status || 'draft';
                    const statusInfo = getStatusInfo(status);
                    const isExpanded = expandedCards[content.id];
                    const isScriptLoading = pipeline.generatingScript[content.id];
                    const isAudioLoading = pipeline.processingAudio[content.id];

                    return (
                        <Card
                            key={content.id}
                            className={`border-white/10 overflow-hidden transition-all duration-300 ${isDone(status) ? 'border-emerald-500/20' : ''
                                } ${canRetry(status) ? 'border-red-500/20' : ''}`}
                        >
                            {/* Compact Header */}
                            <div
                                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                                onClick={() => toggleCard(content.id)}
                            >
                                <Badge className={`${statusInfo.color} border-none text-[10px] font-medium shrink-0`}>
                                    {statusInfo.icon} {statusInfo.label}
                                </Badge>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white/90 truncate">
                                        {content.hook || content.title}
                                    </p>
                                    {content.topic && (
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {content.topic}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {content.audio_duration && (
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {content.audio_duration.toFixed(1)}s
                                        </span>
                                    )}

                                    {/* Action Buttons (inline) */}
                                    {canGenerateScript(status) && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-7 text-xs gap-1"
                                            onClick={(e) => { e.stopPropagation(); pipeline.generateScript(content.id); }}
                                            disabled={isScriptLoading}
                                        >
                                            {isScriptLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                                            Roteiro
                                        </Button>
                                    )}

                                    {canProcessAudio(status) && (
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                                            onClick={(e) => { e.stopPropagation(); pipeline.processAudioPipeline(content.id); }}
                                            disabled={isAudioLoading}
                                        >
                                            {isAudioLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                                            TTS + Legenda
                                        </Button>
                                    )}

                                    {canRetry(status) && (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="h-7 text-xs gap-1"
                                            onClick={(e) => { e.stopPropagation(); pipeline.retryFailed(content.id); }}
                                            disabled={isAudioLoading}
                                        >
                                            {isAudioLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                            Retry
                                        </Button>
                                    )}

                                    {isDone(status) && content.audio_path && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-400"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const url = pipeline.getAudioUrl(content.audio_path);
                                                if (url) window.open(url, '_blank');
                                            }}
                                        >
                                            <Play className="w-3 h-3" /> Ouvir
                                        </Button>
                                    )}

                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <CardContent className="border-t border-white/5 pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                    {/* Meta Info */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                        {content.character && (
                                            <div>
                                                <span className="text-muted-foreground">Personagem:</span>
                                                <p className="text-white/80 font-medium">{content.character}</p>
                                            </div>
                                        )}
                                        {content.reference && (
                                            <div>
                                                <span className="text-muted-foreground">Referência:</span>
                                                <p className="text-white/80 font-medium">{content.reference}</p>
                                            </div>
                                        )}
                                        {content.angle && (
                                            <div>
                                                <span className="text-muted-foreground">Ângulo:</span>
                                                <p className="text-white/80 font-medium">{content.angle}</p>
                                            </div>
                                        )}
                                        {content.nicho_slug && (
                                            <div>
                                                <span className="text-muted-foreground">Nicho:</span>
                                                <p className="text-white/80 font-medium">{content.nicho_slug}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Script */}
                                    {content.script && (
                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground flex items-center gap-1">
                                                <FileText className="w-3 h-3 text-indigo-400" /> Roteiro ({content.script.length} chars)
                                            </label>
                                            <Textarea
                                                readOnly
                                                value={content.script}
                                                className="min-h-[120px] bg-black/30 border-white/10 text-sm font-medium leading-relaxed resize-y"
                                            />
                                        </div>
                                    )}

                                    {/* Audio Player */}
                                    {content.audio_path && (
                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Volume2 className="w-3 h-3 text-emerald-400" /> Áudio ({content.audio_duration?.toFixed(1)}s)
                                            </label>
                                            <audio
                                                controls
                                                src={pipeline.getAudioUrl(content.audio_path) || undefined}
                                                className="w-full h-10"
                                            />
                                        </div>
                                    )}

                                    {/* Error Log */}
                                    {content.error_log && (
                                        <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-lg">
                                            <p className="text-xs text-red-400 flex items-center gap-1 mb-1">
                                                <AlertTriangle className="w-3 h-3" /> Último erro:
                                            </p>
                                            <pre className="text-[10px] text-red-300/70 whitespace-pre-wrap font-mono">
                                                {content.error_log}
                                            </pre>
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
