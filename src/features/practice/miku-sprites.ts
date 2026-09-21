import type { MikuEmotion } from "./miku-emotion";
export const SPRITE_FRAMES = 48,
  SPRITE_COLUMNS = 8,
  SPRITE_WIDTH = 192,
  SPRITE_HEIGHT = 256;
export async function createMikuSprites(host: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.width = SPRITE_WIDTH;
  canvas.height = SPRITE_HEIGHT;
  canvas.style.cssText = "width:100%;height:100%;display:block";
  const images = new Map<MikuEmotion, HTMLImageElement>();
  await Promise.all(
    (["neutral", "happy", "wink", "surprised", "sad"] as const).map(
      async (emotion) => {
        const image = new Image();
        image.src = `/characters/miku-${emotion}.png`;
        await image.decode();
        images.set(emotion, image);
      },
    ),
  );
  host.append(canvas);
  const context = canvas.getContext("2d")!;
  let lastFrame = -1;
  let lastEmotion: MikuEmotion | undefined;
  return {
    render(beat: number, emotion: MikuEmotion) {
      const frame =
        Math.floor(((((beat % 4) + 4) % 4) / 4) * SPRITE_FRAMES) %
        SPRITE_FRAMES;
      if (frame === lastFrame && emotion === lastEmotion) return;
      lastFrame = frame;
      lastEmotion = emotion;
      context.clearRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);
      context.drawImage(
        images.get(emotion)!,
        (frame % SPRITE_COLUMNS) * SPRITE_WIDTH,
        Math.floor(frame / SPRITE_COLUMNS) * SPRITE_HEIGHT,
        SPRITE_WIDTH,
        SPRITE_HEIGHT,
        0,
        0,
        SPRITE_WIDTH,
        SPRITE_HEIGHT,
      );
    },
    dispose() {
      canvas.remove();
      images.clear();
    },
  };
}
