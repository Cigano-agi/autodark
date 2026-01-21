import { motion } from "framer-motion";
import { Folder, MoreVertical, Play, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ChannelFolderProps {
    name: string;
    subscribers?: string;
    videoCount?: number;
    color?: string;
    onClick?: () => void;
}

export function ChannelFolder({
    name,
    subscribers = "0",
    videoCount = 0,
    color = "blue",
    onClick
}: ChannelFolderProps) {

    const colorMap = {
        blue: "from-blue-500/20 to-blue-600/5 border-blue-500/20",
        purple: "from-purple-500/20 to-purple-600/5 border-purple-500/20",
        green: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
        red: "from-red-500/20 to-red-600/5 border-red-500/20",
    };

    const selectedColor = colorMap[color as keyof typeof colorMap] || colorMap.blue;

    return (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative cursor-pointer"
            onClick={onClick}
        >
            {/* 3D Depth Efffect Layers */}
            <div className={cn(
                "absolute inset-0 translate-y-2 rounded-2xl bg-gradient-to-br opacity-50 blur-lg transition-all duration-500 group-hover:translate-y-4 group-hover:opacity-70",
                selectedColor.split(' ')[0] // getting just the from-color for blur
            )} />

            {/* Main Card */}
            <div className={cn(
                "relative h-full overflow-hidden rounded-2xl border bg-gradient-to-br backdrop-blur-xl transition-all duration-300",
                "bg-card/50",
                selectedColor
            )}>

                {/* Folder Top Tab Visual */}
                <div className="absolute top-0 left-0 w-24 h-8 bg-white/5 rounded-br-2xl border-r border-b border-white/5" />

                <div className="p-6 flex flex-col h-full justify-between relative z-10">

                    {/* Checkbox / Menu */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/5 group-hover:bg-primary/20 group-hover:border-primary/30 transition-colors">
                            <Folder className="w-5 h-5 text-white/70 group-hover:text-primary transition-colors" />
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Details */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors line-clamp-1">
                                {name}
                            </h3>
                            <p className="text-xs text-white/40 font-medium uppercase tracking-wider">
                                YOUTUBE AUTOMATION
                            </p>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex items-center gap-2 text-white/60 text-sm">
                                <Users className="w-3.5 h-3.5" />
                                <span>{subscribers}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/60 text-sm">
                                <Play className="w-3.5 h-3.5" />
                                <span>{videoCount} vids</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hover Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
        </motion.div>
    );
}
