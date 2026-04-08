import React from "react";
import { useFactory } from "./FactoryContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileAudio, Volume2, Loader2, Mic } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

export function Narrator() {
  const { state } = useFactory();
  const chapters = state.script?.chapters || [];

  if (state.stage === "generating_script" || state.stage === "generating_audio") {
    return (
      <Card className="bg-black/40 border-white/10 animate-pulse">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" /> 
            Gerando roteiro...
          </CardTitle>
          <CardDescription>Sintetizando roteiro e narração...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!state.script) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
          <FileAudio className="w-5 h-5 text-primary" /> Roteiro Interativo
        </h2>
        {state.stage === "generating_audio" && (
           <Badge variant="outline" className="animate-pulse bg-primary/10 text-primary border-primary/20">
             <Mic className="w-3 h-3 mr-1" /> Gravando...
           </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {chapters.map((ch, i) => (
          <motion.div
            key={ch.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-[2rem] border bg-white/[0.03] border-white/10"
          >
            <div className="flex items-center justify-between mb-4">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[10px]">
                Capítulo 0{i + 1}
              </Badge>
              {ch.audioUrl && <Volume2 className="w-4 h-4 text-emerald-400" />}
            </div>
            <h4 className="text-xl font-bold text-white mb-4">{ch.title}</h4>
            <div className="prose prose-invert max-w-none prose-p:text-white/40 prose-headings:text-white prose-headings:italic prose-headings:font-black text-sm leading-relaxed">
              <ReactMarkdown>{ch.script}</ReactMarkdown>
            </div>
            {ch.audioUrl && (
              <audio controls src={ch.audioUrl} className="w-full h-8 mt-6 opacity-60 hover:opacity-100 transition-opacity" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
