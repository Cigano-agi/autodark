import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, Eye } from "lucide-react";
import { NicheResearch } from "@/components/Strategy/NicheResearch";
import { TrendMonitor } from "@/components/Strategy/TrendMonitor";
import { CompetitorMonitor } from "@/components/Strategy/CompetitorMonitor";

export default function StrategyDashboard() {
    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Estratégia</h1>
                <p className="text-muted-foreground mt-2">
                    Pesquisa de nichos, tendências e monitoramento de concorrentes.
                </p>
            </div>

            <Tabs defaultValue="research" className="space-y-6">
                <TabsList className="bg-card border border-border p-1">
                    <TabsTrigger value="research" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Search className="w-4 h-4" /> Pesquisa
                    </TabsTrigger>
                    <TabsTrigger value="trends" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <TrendingUp className="w-4 h-4" /> Tendências
                    </TabsTrigger>
                    <TabsTrigger value="competitors" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Eye className="w-4 h-4" /> Concorrentes
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="research" className="space-y-4 focus-visible:outline-none">
                    <NicheResearch />
                </TabsContent>

                <TabsContent value="trends" className="space-y-4 focus-visible:outline-none">
                    <TrendMonitor />
                </TabsContent>

                <TabsContent value="competitors" className="space-y-4 focus-visible:outline-none">
                    <CompetitorMonitor />
                </TabsContent>

            </Tabs>
        </div>
    );
}

