export interface VisualStation {
  label: string;
  eoat: string;
  cycle: string;
  automation: "full" | "semi";
  model: string;
  payload: string;
  reach: string;
}

export interface VisualMotionProps {
  playing: boolean;
  speed: "0.5" | "1" | "2";
  active?: boolean;
}