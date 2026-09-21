/** Pose is derived from the transport beat, so pauses and tempo changes cannot drift. */
export function dancePose(beat: number) {
  const cycle = ((beat % 4) + 4) % 4;
  const pulse = cycle * Math.PI * 2;
  const alternate = Math.sin(cycle * Math.PI);
  return {
    bounce: (1 - Math.cos(pulse)) * 0.12,
    sway: alternate * 0.13,
    turn: Math.sin((cycle * Math.PI) / 2) * 0.32,
    head: alternate * 0.15,
    leftArm: -0.65 - alternate * 0.65,
    rightArm: 0.65 - alternate * 0.65,
    leftLeg: alternate * 0.28,
    rightLeg: -alternate * 0.28,
  };
}

export const clampPosition = (value: number) => Math.max(0, Math.min(1, value));
