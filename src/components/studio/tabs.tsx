"use client";
import dynamic from "next/dynamic";
import { StrategyStatus } from "./strategy-status";
import { Spinner } from "../ui";

const loading = () => (
  <div className="grid place-items-center py-24 text-muted">
    <Spinner className="size-6" />
  </div>
);

const MAP: Record<string, React.ComponentType> = {
  pilote: dynamic(() => import("./tab-pilote"), { loading }),
  produit: dynamic(() => import("./tab-produit"), { loading }),
  strategie: dynamic(() => import("./tab-strategie"), { loading }),
  marque: dynamic(() => import("./tab-marque"), { loading }),
  boutique: dynamic(() => import("./tab-boutique"), { loading }),
  biens: dynamic(() => import("./tab-biens"), { loading }),
  images: dynamic(() => import("./tab-images"), { loading }),
  videos: dynamic(() => import("./tab-videos"), { loading }),
  prompts: dynamic(() => import("./tab-prompts"), { loading }),
  publications: dynamic(() => import("./tab-publications"), { loading }),
  blog: dynamic(() => import("./tab-blog"), { loading }),
  calendrier: dynamic(() => import("./tab-calendrier"), { loading }),
  publicites: dynamic(() => import("./tab-publicites"), { loading }),
  fichiers: dynamic(() => import("./tab-fichiers"), { loading }),
  connexions: dynamic(() => import("./tab-connexions"), { loading }),
};

export function TabView({ tab }: { tab: string }) {
  const C = MAP[tab];
  return C ? <>{tab!=="strategie"&&<StrategyStatus/>}<C /></> : null;
}
