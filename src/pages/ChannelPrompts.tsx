import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BeamsBackground } from '@/components/ui/beams-background';
import { DashboardHeader } from '@/components/ui/dashboard-header';
import { useChannels } from '@/hooks/useChannels';
import { useChannelPrompts } from '@/hooks/useChannelPrompts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, ArrowLeft, Terminal, Trash2, Edit, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ChannelPrompts() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { channels } = useChannels();
    const channel = channels?.find(c => c.id === id);
    const { prompts, isLoading, createPrompt, updatePrompt, deletePrompt } = useChannelPrompts(id);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [contentType, setContentType] = useState('video');
    const [promptTemplate, setPromptTemplate] = useState('');
    const [variables, setVariables] = useState('{"TEMA": "Exemplo", "TOM": "Engraçado"}');

    if (!channel) return null;

    const resetForm = () => {
        setName('');
        setContentType('video');
        setPromptTemplate('');
        setVariables('{"TEMA": "Exemplo", "TOM": "Engraçado"}');
        setEditingPromptId(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setCreateDialogOpen(true);
    };

    const handleOpenEdit = (prompt: any) => {
        setName(prompt.name);
        setContentType(prompt.content_type);
        setPromptTemplate(prompt.prompt_template);
        setVariables(prompt.variables ? JSON.stringify(prompt.variables, null, 2) : '{}');
        setEditingPromptId(prompt.id);
        setCreateDialogOpen(true);
    };

    const handleSave = async () => {
        if (!name || !promptTemplate) {
            toast.error('Nome e Template são obrigatórios');
            return;
        }

        let parsedVars = {};
        try {
            parsedVars = JSON.parse(variables);
        } catch (e) {
            toast.error('Variáveis devem ser um JSON válido');
            return;
        }

        try {
            if (editingPromptId) {
                await updatePrompt.mutateAsync({
                    id: editingPromptId,
                    updates: {
                        name,
                        content_type: contentType,
                        prompt_template: promptTemplate,
                        variables: parsedVars,
                    }
                });
            } else {
                await createPrompt.mutateAsync({
                    name,
                    content_type: contentType,
                    prompt_template: promptTemplate,
                    variables: parsedVars,
                    is_active: true,
                });
            }
            setCreateDialogOpen(false);
            resetForm();
        } catch (error) {
            // Error is handled in the mutation
        }
    };

    const toggleActive = async (id: string, currentActive: boolean | null) => {
        await updatePrompt.mutateAsync({
            id,
            updates: { is_active: !currentActive }
        });
    };

    return (
        <BeamsBackground intensity="medium" className="bg-background">
            <DashboardHeader />

            <main className="pt-28 pb-12 px-6 max-w-5xl mx-auto min-h-screen relative z-10 text-foreground">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <Button
                            variant="ghost"
                            className="mb-2 -ml-4 text-muted-foreground hover:text-white"
                            onClick={() => navigate(`/channel/${id}`)}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar para {channel.name}
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                            <Terminal className="w-8 h-8 text-primary" />
                            Prompts do Canal
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Gerencie os templates de inteligência artificial específicos para o canal {channel.name}.
                        </p>
                    </div>

                    <Dialog open={createDialogOpen} onOpenChange={(open) => {
                        setCreateDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={handleOpenCreate} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Prompt
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[700px] bg-card border-white/10">
                            <DialogHeader>
                                <DialogTitle>{editingPromptId ? 'Editar Prompt' : 'Novo Prompt'}</DialogTitle>
                                <DialogDescription>
                                    Defina um template de IA com variáveis dinâmicas. Use aspas e formato JSON para variáveis.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nome do Template</Label>
                                        <Input
                                            placeholder="Ex: Roteiro Documentário"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="bg-background/50 border-white/10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tipo de Conteúdo</Label>
                                        <Select value={contentType} onValueChange={setContentType}>
                                            <SelectTrigger className="bg-background/50 border-white/10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="video">Vídeo Longo</SelectItem>
                                                <SelectItem value="short">Short/Reels</SelectItem>
                                                <SelectItem value="community">Post Comunidade</SelectItem>
                                                <SelectItem value="strategy">Estratégia</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Template (Prompt)</Label>
                                        <span className="text-xs text-muted-foreground">Use [[VARIAVEL]] para inserir dados da UI.</span>
                                    </div>
                                    <Textarea
                                        placeholder="Escreva um roteiro sobre [[TEMA]] com tom [[TOM]]..."
                                        value={promptTemplate}
                                        onChange={e => setPromptTemplate(e.target.value)}
                                        className="min-h-[200px] bg-background/50 border-white/10 font-mono text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Variáveis Padrão (JSON)</Label>
                                    <Textarea
                                        placeholder='{"TEMA": "Buracos Negros"}'
                                        value={variables}
                                        onChange={e => setVariables(e.target.value)}
                                        className="min-h-[100px] bg-background/50 border-white/10 font-mono text-sm"
                                    />
                                </div>
                            </div>

                            <DialogFooter className="mt-6">
                                <Button
                                    onClick={handleSave}
                                    disabled={createPrompt.isPending || updatePrompt.isPending}
                                    className="w-full sm:w-auto"
                                >
                                    {(createPrompt.isPending || updatePrompt.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar Prompt
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : prompts.length === 0 ? (
                    <Card className="bg-card/60 border-dashed border-white/10 p-12 text-center">
                        <Terminal className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-white mb-2">Sem prompts configurados</h3>
                        <p className="text-muted-foreground mb-6">Crie seu primeiro template variável para automatizar a criação de conteúdo do canal.</p>
                        <Button onClick={handleOpenCreate} variant="outline" className="border-white/10">
                            Criar Primeiro Prompt
                        </Button>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {prompts.map(prompt => (
                            <Card key={prompt.id} className={`bg-card/80 border-white/10 transition-colors ${!prompt.is_active ? 'opacity-60 grayscale' : ''}`}>
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-3 text-lg text-white">
                                                {prompt.name}
                                                <Badge variant="secondary" className="bg-primary/20 text-primary uppercase text-[10px] tracking-wider">
                                                    {prompt.content_type}
                                                </Badge>
                                            </CardTitle>
                                            <CardDescription className="mt-1 line-clamp-1 opacity-70">
                                                {prompt.prompt_template}
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2 mr-2">
                                                <Label htmlFor={`active-${prompt.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                                    {prompt.is_active ? 'Ativo' : 'Inativo'}
                                                </Label>
                                                <Switch
                                                    id={`active-${prompt.id}`}
                                                    checked={!!prompt.is_active}
                                                    onCheckedChange={() => toggleActive(prompt.id, prompt.is_active)}
                                                />
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(prompt)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    if (window.confirm('Tem certeza que deseja excluir este prompt?')) {
                                                        deletePrompt.mutate(prompt.id);
                                                    }
                                                }}
                                                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs bg-black/40 p-3 rounded-md border border-white/5 font-mono text-white/60">
                                        <span className="text-primary/70">Variáveis mapeadas:</span>{' '}
                                        {prompt.variables ? Object.keys(prompt.variables).join(', ') : 'Nenhuma'}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

            </main>
        </BeamsBackground>
    );
}
