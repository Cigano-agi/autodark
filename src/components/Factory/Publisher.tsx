import React from "react";
import { useFactory } from "./FactoryContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Share2, Sparkles, Globe, Tag } from "lucide-react";
import { motion } from "framer-motion";

export function Publisher() {
  const { state } = useFactory();
  const seo = state.seo;

  if (state.stage === "generating_seo" || state.stage === "saving") {
    return (
      <Card className="bg-black/40 border-white/10 animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
             <Globe className="w-5 h-5 animate-spin" /> Otimizando SEO...
          </CardTitle>
          <CardDescription>Sintetizando SEO e metadados de alto impacto...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!seo) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" /> Central de Publicação
        </h2>
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-black uppercase tracking-widest text-[9px]">
           Pronto para publicar
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-white/[0.03] border-white/10 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" /> Título e Hook
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <h3 className="text-2xl font-black tracking-tighter text-white">{seo.title}</h3>
            <div className="p-6 rounded-2xl bg-black/40 border border-white/5 italic text-white/40 leading-relaxed">
              {state.script?.hook}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/10 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" /> Otimização SEO
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="flex flex-wrap gap-2">
              {seo.tags.map(tag => (
                <Badge key={tag} variant="outline" className="border-white/10 bg-white/5 text-[10px] uppercase font-black tracking-widest px-3 py-1">
                  #{tag}
                </Badge>
              ))}
            </div>
            
            <div className="space-y-4 pt-4 border-t border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Capítulos Automáticos</p>
              <div className="space-y-2">
                {seo.chapters.map(c => (
                  <div key={c.time} className="flex items-center gap-3 text-sm group">
                    <span className="font-mono text-primary font-bold">{c.time}</span>
                    <span className="text-white/40 group-hover:text-white transition-colors">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
