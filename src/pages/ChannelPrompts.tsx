import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useChannelPrompts } from "@/hooks/useChannelPrompts";
import { useChannels } from "@/hooks/useChannels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, Wand2, Plus, Trash2, Save, ChevronLeft, 
  Terminal, Sparkles, Zap, Shield, FileCode, Search
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ChannelPrompts() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { channels } = useChannels();
  const channel = channels?.find(c => c.id === id);
  const { prompts, isLoading, createPrompt, updatePrompt, deletePrompt } = useChannelPrompts(id);

  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptType, setNewPromptType] = useState("script");
  const [newPromptText, setNewPromptText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const handleCreate = async () => {
    if (!newPromptTitle || !newPromptText) {
      toast.error("Preencha o título e o template.");
      return;
    }
    await createPrompt.mutateAsync({
      channel_id: id!,
      name: newPromptTitle,
      content_type: newPromptType,
      prompt_template: newPromptText,
      is_active: true
    });
    setNewPromptTitle("");
    setNewPromptText("");
    toast.success("Prompt adicionado com sucesso.");
  };

  const filteredPrompts = prompts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.content_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!channel) return null;

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 w-full min-h-screen">
      <div className="max-w-7xl mx-auto space-y-12 animate-fade-in">
        
        {/* Tactical Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.4em] text-[10px] ml-1">
              <Terminal className="w-3 h-3" /> Neural Interface · Direct Access
            </div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white uppercase italic leading-[0.9]">
              Prompts <span className="text-primary">& IA</span>
            </h1>
            <p className="text-xl text-white/30 font-bold max-w-3xl leading-relaxed italic">
              "Override standard AI behaviors. Program custom narrative heuristics and visual directives for this unit."
            </p>
          </div>

          <div className="relative w-full lg:w-80 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="FILTER MODULES..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-16 bg-black/40 border border-white/5 rounded-2xl pl-12 pr-6 text-xs font-black uppercase tracking-widest focus:border-primary/50 outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* New Module Form */}
          <Card className="bg-[#0a0a0c] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl h-fit sticky top-32">
            <CardHeader className="bg-black/40 border-b border-white/5 p-8">
              <CardTitle className="text-xl font-black uppercase italic text-white flex items-center gap-3">
                <Plus className="w-5 h-5 text-primary" /> Inject New Module
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Module Name</Label>
                <Input 
                  value={newPromptTitle} 
                  onChange={e => setNewPromptTitle(e.target.value)}
                  placeholder="EX: VIRAL HOOK ENGINE"
                  className="h-12 bg-black/40 border-white/10 rounded-xl font-bold uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Logic Type</Label>
                <select 
                  value={newPromptType}
                  onChange={e => setNewPromptType(e.target.value)}
                  className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-primary/50"
                >
                  <option value="script">Script Heuristics</option>
                  <option value="image">Visual Directives</option>
                  <option value="system">Core Logic</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Directive Template</Label>
                <Textarea 
                  value={newPromptText}
                  onChange={e => setNewPromptText(e.target.value)}
                  placeholder="ENTER IA INSTRUCTIONS..."
                  className="min-h-[200px] bg-black/40 border-white/10 rounded-2xl p-5 text-sm font-medium leading-relaxed"
                />
              </div>
              <Button onClick={handleCreate} disabled={createPrompt.isPending} className="w-full h-14 rounded-2xl bg-primary hover:bg-orange-600 text-white font-black uppercase italic tracking-tighter shadow-xl border-0">
                {createPrompt.isPending ? <Loader2 className="animate-spin" /> : <Zap className="w-4 h-4 mr-2 fill-current" />}
                Deploy Module
              </Button>
            </CardContent>
          </Card>

          {/* Prompt List */}
          <div className="lg:col-span-2 space-y-6">
            {filteredPrompts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 bg-white/[0.02] rounded-[4rem] border border-white/5 text-center">
                <FileCode className="w-12 h-12 text-white/10 mb-6" />
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">No Active Overrides</h3>
                <p className="text-sm text-white/20 font-black uppercase tracking-[0.3em] mt-2">System is running on standard factory directives.</p>
              </div>
            ) : (
              filteredPrompts.map((prompt) => (
                <Card key={prompt.id} className="bg-[#0c0c0e] border-white/5 rounded-[2.5rem] overflow-hidden shadow-xl group hover:border-primary/20 transition-all">
                  <CardHeader className="p-8 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-black uppercase tracking-widest text-[8px] h-5">
                            {prompt.content_type}
                          </Badge>
                          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter group-hover:text-primary transition-colors">{prompt.name}</h3>
                        </div>
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">UID: {prompt.id.slice(0, 8)}...</p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl" onClick={() => deletePrompt.mutate(prompt.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 pt-0">
                    <div className="p-6 bg-black/40 border border-white/5 rounded-2xl relative overflow-hidden group/text">
                      <ScrollArea className="h-32">
                        <pre className="text-xs text-white/40 font-mono leading-relaxed italic whitespace-pre-wrap">{prompt.prompt_template}</pre>
                      </ScrollArea>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none opacity-0 group-hover/text:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
