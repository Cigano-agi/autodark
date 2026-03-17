
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp, ExternalLink } from "lucide-react";

const MOCK_TRENDS = [
    { id: 1, title: "Caso Diddy: Novas revelações chocam a internet", category: "News / Celebrity", growth: "+450%", source: "Twitter / Google Trends" },
    { id: 2, title: "Descoberta arqueológica no Egito muda tudo", category: "Curiosidades / História", growth: "+120%", source: "YouTube" },
    { id: 3, title: "Nova IA do Google supera GPT-4?", category: "Tech / AI", growth: "+85%", source: "TechCrunch" },
    { id: 4, title: "Fim do Mundo em 2026? A teoria viral", category: "Mistério / Conspiração", growth: "+300%", source: "TikTok" },
];

export function TrendMonitor() {
    return (
        <Card className="border-border bg-card/50 backdrop-blur-sm h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    Tendências em Alta
                </CardTitle>
                <CardDescription>
                    Tópicos quentes prontos para virar conteúdo.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {MOCK_TRENDS.map((trend) => (
                    <div key={trend.id} className="flex items-start justify-between p-4 rounded-lg bg-background/50 border border-border hover:border-primary/30 transition-colors">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase tracking-wider text-muted-foreground">
                                    {trend.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    de {trend.source}
                                </span>
                            </div>
                            <h4 className="font-semibold text-sm leading-tight group-hover:text-primary">
                                {trend.title}
                            </h4>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className="flex items-center text-green-500 text-xs font-bold bg-green-500/10 px-2 py-1 rounded">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                {trend.growth}
                            </span>
                            <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary cursor-pointer" />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
