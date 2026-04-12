import React from "react";
import { useParams } from "react-router-dom";
import { Factory } from "@/components/Factory";
import { ProductionWizardContent } from "./Production/Index";
import { BeamsBackground } from "@/components/ui/beams-background";

/**
 * LongVideoStudio — Agora integrado ao ecossistema modular Factory.
 * Substitui a lógica monolítica anterior pelo protocolo DARK OPS.
 */
export default function LongVideoStudio() {
  const { id } = useParams();
  
  return (
    <BeamsBackground intensity="high" className="bg-[#020205]">
      <Factory channelId={id || ""}>
        <div className="relative z-20 pt-10 px-8 flex justify-center">
           <div className="bg-primary/20 text-primary border border-primary/30 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
             Studio de Longa Duração · Modo Experimental
           </div>
        </div>
        <ProductionWizardContent />
      </Factory>
    </BeamsBackground>
  );
}
