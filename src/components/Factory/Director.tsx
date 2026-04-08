import React from "react";
import { useFactory } from "./FactoryContext";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Wand2, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function Director() {
  const { state } = useFactory();
  const chapters = state.script?.chapters || [];

  if (state.stage === "generating_visuals" || state.stage === "extracting_scenes") {
    return (
      <Card className="bg-black/40 border-white/10 animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" /> 
            Gerando visuais...
          </CardTitle>
          <CardDescription>Extraindo cenas e sintetizando visuais cinematográficos...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!state.script) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" /> Direção de Arte
        </h2>
        {state.stage === "generating_visuals" && (
          <Badge variant="outline" className="animate-pulse bg-primary/10 text-primary border-primary/20">
            <Sparkles className="w-3 h-3 mr-1" /> Pintando...
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {chapters.map((ch, i) => (
          <motion.div
            key={ch.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-[2rem] border bg-white/[0.03] border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[10px]">
                Visual Capítulo 0{i + 1}
              </Badge>
              {ch.scenes.length > 0 && <Sparkles className="w-4 h-4 text-emerald-400" />}
            </div>
            <h4 className="text-xl font-bold text-white mb-6">{ch.title}</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {ch.scenes.map((s, si) => (
                <div key={si} className="group relative aspect-square rounded-2xl bg-black/40 border border-white/10 overflow-hidden shadow-2xl hover:border-primary/50 transition-all">
                  {s.imageUrl ? (
                    <img src={s.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Cena" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-4 text-center transition-opacity">
                    <p className="text-[10px] font-black uppercase text-white/90 leading-tight mb-2">{s.title}</p>
                    <p className="text-[8px] text-white/40 line-clamp-2 italic">{s.visual_prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
