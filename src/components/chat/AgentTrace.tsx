/**
 * @doc Browser-Use style activity trace for cloud agent tasks.
 *
 * While the agent works it shows a live, never-truncated list of what it thought
 * and what it actually did on the computer (opened, clicked, typed, read…),
 * plus a small Browser card with the current screen. When the task finishes the
 * whole history stays available behind a "Worked for …" toggle.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Globe, Loader2 } from "lucide-react";
import type { ComputerEvent } from "@/lib/computer/client";
import { cn } from "@/lib/utils";

interface Props {
  events: ComputerEvent[];
  running: boolean;
  status?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  liveUrl?: string | null;
  className?: string;
}

function formatDuration(ms: number): string {
  const total = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const isNoise = (line: string) =>
  !line ||
  line.length < 2 ||
  /^\s*[[{]/.test(line) ||
  /^(checkpoint|state|error|traceback)\b/i.test(line);

export default function AgentTrace({
  events,
  running,
  status,
  startedAt,
  endedAt,
  liveUrl,
  className,
}: Props) {
  const [open, setOpen] = useState(running);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (running) setOpen(true);
  }, [running]);

  // Auto-follow the newest line while the agent is working.
  useEffect(() => {
    if (!running || !open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [events.length, running, open]);

  const rows = useMemo(
    () => events.filter((e) => !isNoise((e.title ?? "").trim())),
    [events],
  );

  const elapsedMs = useMemo(() => {
    const start = startedAt ? new Date(startedAt).getTime() : NaN;
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    return end - start;
  }, [startedAt, endedAt]);

  const lastShot = useMemo(
    () => [...rows].reverse().find((e) => e.screenshot_url)?.screenshot_url || null,
    [rows],
  );
  const currentLine = status || rows.at(-1)?.title || "";

  if (rows.length === 0 && !running) return null;

  return (
    <div className={cn("my-3 w-full", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>
          {running
            ? "Working"
            : elapsedMs
              ? `Worked for ${formatDuration(elapsedMs)}`
              : "Worked"}
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        )}
      </button>

      {open && (
        <div
          ref={listRef}
          className="mt-2 max-h-[420px] overflow-y-auto border-s border-border/50 ps-3.5 [scrollbar-width:thin]"
        >
          <div className="space-y-1.5">
            {rows.map((e) => {
              const thought = (e.kind ?? "thought") === "thought";
              const dur = Number(e.duration ?? 0);
              return (
                <div key={e.id} className="space-y-1">
                  {thought && dur > 0 && (
                    <p className="text-[12px] text-muted-foreground/70">
                      Thought for {Math.round(dur)}s
                    </p>
                  )}
                  {thought ? (
                    <p className="text-[13px] italic leading-relaxed text-muted-foreground">
                      {e.title}
                    </p>
                  ) : (
                    <div className="flex items-start gap-1.5 text-[13px] leading-relaxed text-foreground/80">
                      <ChevronRight className="mt-[3px] h-3.5 w-3.5 shrink-0 text-muted-foreground/70 rtl:rotate-180" />
                      {e.url ? (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate hover:underline"
                        >
                          {e.title}
                        </a>
                      ) : (
                        <span className="min-w-0 break-words">{e.title}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {running && (
              <div className="flex items-center gap-1.5 pt-0.5 text-[13px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Thinking…</span>
              </div>
            )}
          </div>

          {running && (
            <div className="mt-3 overflow-hidden rounded-xl border border-border/50 bg-foreground/[0.03]">
              <div className="flex items-center gap-2 px-3 py-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12.5px] font-medium text-foreground/80">Browser</span>
                <span className="ms-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
              {lastShot ? (
                <img
                  src={lastShot}
                  alt="Agent screen"
                  loading="lazy"
                  className="max-h-48 w-full object-cover"
                />
              ) : liveUrl ? (
                <iframe
                  src={liveUrl}
                  title="Agent screen"
                  className="h-48 w-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : null}
              {currentLine && (
                <p className="truncate px-3 py-2 text-[12px] text-muted-foreground">{currentLine}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
