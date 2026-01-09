
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search } from "lucide-react";

const MOCK_NICHES = [
    { id: 1, name: "Mistérios Criminais (True Crime)", competition: "Alta", potential: "Muito Alto", cpm: "$4 - $8" },
    { id: 2, name: "Estoicismo & Filosofia", competition: "Média", potential: "Alto", cpm: "$5 - $12" },
    { id: 3, name: "Curiosidades Científicas", competition: "Alta", potential: "Estável", cpm: "$3 - $6" },
    { id: 4, name: "Histórias de Terror", competition: "Muito Alta", potential: "Alto", cpm: "$2 - $5" },
    { id: 5, name: "Notícias de Futebol", competition: "Média", potential: "Viral", cpm: "$2 - $4" },
];

export function NicheResearch() {
    return (
        <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5 text-primary" />
                            Pesquisa Automatizada
                        </CardTitle>
                        <CardDescription>
                            Nichos analisados com base em CPM, concorrência e potencial viral.
                        </CardDescription>
                    </div>
                    <Button variant="outline">Nova Análise</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead>Nicho</TableHead>
                            <TableHead>Concorrência</TableHead>
                            <TableHead>Potencial</TableHead>
                            <TableHead>CPM Est.</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {MOCK_NICHES.map((niche) => (
                            <TableRow key={niche.id} className="group">
                                <TableCell className="font-medium text-foreground">{niche.name}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className={
                                        niche.competition === "Alta" ? "bg-red-500/10 text-red-400" :
                                            niche.competition === "Média" ? "bg-yellow-500/10 text-yellow-400" :
                                                "bg-green-500/10 text-green-400"
                                    }>
                                        {niche.competition}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="border-primary/30 text-primary">
                                        {niche.potential}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{niche.cpm}</TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        Ver Detalhes <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
