export interface WritingGameProps {
  targetDuration: number;
  directions: {
    center: Direction;
    up: Direction;
    right: Direction;
    down: Direction;
    left: Direction;
  };
}

export interface Direction {
  direction: "up" | "center" | "right" | "down" | "left";
  prompt: string;
  color: string;
  textColor: string;
}
