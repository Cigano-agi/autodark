import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Lightbulb, Target } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AiStrategyCardProps {
    strategy?: string;
    isLoading: boolean;
}

export function AiStrategyCard({ strategy, isLoading }: AiStrategyCardProps) {
    if (!strategy && !isLoading) return null;

    return (
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                <CardTitle className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                    Head Agent Analysis
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
                        <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                        <div className="h-4 w-5/6 bg-white/5 rounded animate-pulse" />
                    </div>
                ) : (
                    <ScrollArea className="h-[200px] w-full rounded-md border border-white/5 p-4 bg-black/20">
                        <div className="prose prose-invert prose-sm max-w-none">
                            <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-blue-100/90">
                                {strategy}
                            </div>
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
