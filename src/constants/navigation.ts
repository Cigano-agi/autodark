import { 
  LayoutDashboard, 
  Tv, 
  Database, 
  Cpu, 
  PlayCircle,
  FileCode,
  Zap,
  Wand2,
  Film,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: any;
  exact?: boolean;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    exact: true
  },
  {
    label: "Fila Global",
    path: "/pipeline",
    icon: Zap,
  },
  {
    label: "Media Hub",
    path: "/hub",
    icon: Database,
  }
];

export const CHANNEL_NAV_ITEMS: NavItem[] = [
  {
    label: "Visão Geral",
    path: "/channel/:id",
    icon: Tv,
    exact: true
  },
  {
    label: "DNA do Canal",
    path: "/channel/:id/foundation",
    icon: Cpu,
  },
  {
    label: "Esteira de Produção",
    path: "/channel/:id/production",
    icon: PlayCircle,
  },
  {
    label: "Vídeos",
    path: "/channel/:id/videos",
    icon: Film,
  },
  {
    label: "Prompts de IA",
    path: "/channel/:id/prompts",
    icon: FileCode,
  }
];
