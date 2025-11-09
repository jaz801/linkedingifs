export type CanvasLikeContext = {
  save(): void;
  restore(): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  strokeStyle: string;
  lineWidth: number;
  lineCap?: string;
  fillStyle: string;
  fill(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  closePath(): void;
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void;
  globalAlpha?: number;
  clearRect?(x: number, y: number, width: number, height: number): void;
  drawImage?(
    image: { width: number; height: number },
    dx: number,
    dy: number,
    dWidth?: number,
    dHeight?: number,
  ): void;
};

