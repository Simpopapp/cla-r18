import { createContext, useContext } from "react";

export const PracticeModeContext = createContext<"practice" | "exam">("practice");
export const usePracticeMode = () => useContext(PracticeModeContext);
