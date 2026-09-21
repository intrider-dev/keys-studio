import { LoaderCircle, Pause, Play } from "lucide-react";

export function PlaybackIcon({
  loading,
  running,
}: {
  loading: boolean;
  running: boolean;
}) {
  if (loading)
    return <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />;
  const Icon = running ? Pause : Play;
  return <Icon aria-hidden="true" className="size-4" />;
}
