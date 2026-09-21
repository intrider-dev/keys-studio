import { Bell, Bird, Drum, Helicopter, Mic, Music2, Phone, Radio, SlidersHorizontal, Sparkles, Users, Waves, Wind, Zap } from "lucide-react";
import { mdiGuitarAcoustic, mdiGuitarElectric, mdiPiano, mdiSaxophone, mdiTrumpet, mdiViolin } from "@mdi/js";

/** General MIDI programs are zero-based. Icons describe the sound family. */
export function InstrumentIcon({ program, className = "size-4 shrink-0" }: { program: number; className?: string }) {
  const family = Math.floor(program / 8);
  let path = [mdiPiano, null, mdiPiano, mdiGuitarAcoustic, mdiGuitarElectric, mdiViolin, mdiViolin, mdiTrumpet, mdiSaxophone][family];
  if (program >= 26 && program <= 31) path = mdiGuitarElectric;
  if (program === 104 || program === 105 || program === 106 || program === 107) path = mdiGuitarAcoustic;
  if (program === 110) path = mdiViolin;
  if (program === 47 || (program >= 68 && program <= 71)) path = null;
  if (program >= 52 && program <= 54) return <Users aria-hidden="true" className={className} />;
  if (path) return <svg aria-hidden="true" focusable="false" data-instrument-icon={program} viewBox="0 0 24 24" fill="currentColor" className={className}><path d={path} /></svg>;
  const special = { 47: Drum, 108: Bell, 109: Wind, 111: Wind, 120: Music2, 121: Wind, 122: Waves, 123: Bird, 124: Phone, 125: Helicopter, 126: Users, 127: Zap };
  const Icon = special[program as keyof typeof special] ?? [Music2, Bell, SlidersHorizontal, Music2, Music2, Music2, Users, Wind, Wind, Wind, Radio, Waves, Sparkles, Music2, Drum, Mic][family] ?? Music2;
  return <Icon aria-hidden="true" data-instrument-icon={program} className={className} />;
}
