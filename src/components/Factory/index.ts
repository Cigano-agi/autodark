import { FactoryProvider } from "./FactoryContext";
import { Narrator } from "./Narrator";
import { Director } from "./Director";
import { Editor } from "./Editor";
import { Publisher } from "./Publisher";

export const Factory = Object.assign(FactoryProvider, {
  Narrator,
  Director,
  Editor,
  Publisher,
});

export { SceneCard } from "./SceneCard";
export type { SceneCardProps } from "./SceneCard";
