import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Gauge,
  RotateCcw,
  RotateCw,
} from "lucide-react";

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

// Direct-playable sources: raw file extensions or an HLS manifest. Anything
// else (a bare Cloudflare Stream/YouTube/Bunny "player page" URL) can't be
// attached to a native <video> element, so the caller should fall back to
// an iframe for those instead of rendering this component.
export function isDirectPlayableUrl(url: string): boolean {
  const clean = url.split("?")[0].toLowerCase();
  return clean.endsWith(".mp4") || clean.endsWith(".webm") || clean.endsWith(".m3u8") || clean.endsWith(".mov");
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ClayVideoPlayer({
  src,
  poster,
  autoPlay = false,
}: {
  src: string;
  poster?: string;
  autoPlay?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("progress", onProgress);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
    };
  }, [src]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }

  function seekTo(fraction: number) {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = fraction * duration;
  }

  function skip(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), duration);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function changeVolume(v: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = v;
    video.muted = v === 0;
    setVolume(v);
    setMuted(v === 0);
  }

  function changeSpeed(s: (typeof SPEED_OPTIONS)[number]) {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = s;
    setSpeed(s);
    setShowSpeedMenu(false);
  }

  function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen();
  }

  function handleMouseMove() {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (playing) {
      hideControlsTimer.current = setTimeout(() => setControlsVisible(false), 2500);
    }
  }

  const progressFraction = duration > 0 ? currentTime / duration : 0;
  const bufferedFraction = duration > 0 ? buffered / duration : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => playing && setControlsVisible(false)}
      className="clay-inset group relative aspect-video w-full overflow-hidden rounded-2xl bg-black"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        onClick={togglePlay}
        className="h-full w-full cursor-pointer object-contain"
      />

      {isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {!playing && !isLoading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity hover:bg-black/30"
          aria-label="Play"
        >
          <span className="clay-btn flex h-16 w-16 items-center justify-center rounded-full">
            <Play className="ml-1 h-6 w-6 fill-white text-white" />
          </span>
        </button>
      )}

      {/* ── Control bar ─────────────────────────────────────────────── */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2.5 pt-6 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Seek bar */}
        <div
          className="group/seek relative h-1.5 w-full cursor-pointer rounded-full bg-white/25"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo((e.clientX - rect.left) / rect.width);
          }}
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/40" style={{ width: `${bufferedFraction * 100}%` }} />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--sky-deep)]"
            style={{ width: `${progressFraction * 100}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/seek:opacity-100"
            style={{ left: `calc(${progressFraction * 100}% - 6px)` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button onClick={togglePlay} className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10">
              {playing ? <Pause className="h-4 w-4 fill-white" /> : <Play className="ml-0.5 h-4 w-4 fill-white" />}
            </button>
            <button onClick={() => skip(-10)} className="hidden h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10 sm:flex" aria-label="Back 10 seconds">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => skip(10)} className="hidden h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10 sm:flex" aria-label="Forward 10 seconds">
              <RotateCw className="h-3.5 w-3.5" />
            </button>

            <div className="group/vol flex items-center gap-1.5">
              <button onClick={toggleMute} className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10">
                {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                className="hidden w-16 accent-[var(--sky-deep)] sm:block"
              />
            </div>

            <span className="ml-1 hidden text-xs font-medium text-white/80 sm:inline">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu((v) => !v)}
                className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
              >
                <Gauge className="h-3.5 w-3.5" />
                {speed}x
              </button>
              {showSpeedMenu && (
                <div className="clay absolute bottom-full right-0 mb-2 p-1">
                  {SPEED_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`block w-full rounded-xl px-3 py-1.5 text-left text-xs font-semibold ${
                        s === speed ? "bg-[var(--sky-soft)] text-foreground" : "text-foreground/70 hover:bg-foreground/5"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={toggleFullscreen} className="flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/10">
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Falls back to an iframe when the URL isn't a direct-playable file/manifest
// (e.g. a Cloudflare Stream/Bunny "player page" embed link rather than its
// raw .m3u8/.mp4 asset URL). Keeps every existing saved lectureUrl working
// even before mentors switch to pasting direct manifest links.
export function VideoPlayer({ src, poster }: { src: string; poster?: string }) {
  if (isDirectPlayableUrl(src)) {
    return <ClayVideoPlayer src={src} poster={poster} />;
  }
  return (
    <div className="clay-inset aspect-video w-full overflow-hidden rounded-2xl">
      <iframe src={src} allow="autoplay; fullscreen" allowFullScreen className="h-full w-full border-0" title="Video player" />
    </div>
  );
}