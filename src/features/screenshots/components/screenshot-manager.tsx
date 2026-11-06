"use client";
/* eslint-disable @next/next/no-img-element -- signed URLs from private storage; next/image would need a remote pattern per project */

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import imageCompression from "browser-image-compression";
import { ChevronLeft, ChevronRight, Columns2, ImagePlus, Loader2, Maximize2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { ScreenshotKind } from "@/types/database";
import { addScreenshot, deleteScreenshot, updateScreenshotCaption } from "../actions";
import { MAX_PER_KIND, MAX_UPLOAD_BYTES, SCREENSHOT_BUCKET } from "../constants";
import type { ScreenshotView } from "../queries";

const KINDS: { kind: ScreenshotKind; title: string; hint: string }[] = [
  { kind: "before", title: "Before", hint: "Your chart at entry — the plan" },
  { kind: "after", title: "After", hint: "How the trade played out" },
];

async function prepare(file: File) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1920,
    maxSizeMB: 1.5,
    fileType: "image/webp",
    initialQuality: 0.85,
    useWebWorker: true,
  });
  if (compressed.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is too large even after compression.`);
  const bitmap = await createImageBitmap(compressed);
  const dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return { blob: compressed, ...dims };
}

function UploadZone({ kind, title, hint, count, onFiles, busy }: {
  kind: ScreenshotKind; title: string; hint: string; count: number; busy: boolean; onFiles: (files: File[]) => void;
}) {
  const [over, setOver] = useState(false);
  const full = count >= MAX_PER_KIND;
  return (
    <label
      tabIndex={0}
      aria-label={`Add ${kind} screenshots`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]); }}
      onPaste={(e) => { const files = [...e.clipboardData.files]; if (files.length) { e.preventDefault(); onFiles(files); } }}
      className={cn(
        "flex aspect-video cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-background/40 p-3 text-center text-xs text-muted-foreground transition-colors outline-none",
        "hover:border-primary/50 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring",
        over && "border-primary bg-primary/10 text-foreground",
        (full || busy) && "pointer-events-none opacity-50",
      )}
    >
      {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
      <span className="font-medium">{busy ? "Uploading…" : full ? `Limit of ${MAX_PER_KIND} reached` : `Add ${title.toLowerCase()} image`}</span>
      <span className="text-[11px]">{hint}<br />Click, drop, or paste (Ctrl+V)</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" disabled={full || busy}
        data-testid={`upload-${kind}`}
        onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
    </label>
  );
}

export function ScreenshotManager({ tradeId, userId, shots }: { tradeId: string; userId: string; shots: ScreenshotView[] }) {
  const [busyKind, setBusyKind] = useState<ScreenshotKind | null>(null);
  const [viewer, setViewer] = useState<{ kind: ScreenshotKind; index: number } | null>(null);
  const [compare, setCompare] = useState(false);
  const [pick, setPick] = useState<{ before: number; after: number }>({ before: 0, after: 0 });
  const [pending, start] = useTransition();

  const byKind = useMemo(() => ({ before: shots.filter((s) => s.kind === "before"), after: shots.filter((s) => s.kind === "after") }), [shots]);

  const upload = useCallback(async (kind: ScreenshotKind, files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return void toast.error("Choose PNG, JPEG or WebP images.");
    const room = MAX_PER_KIND - byKind[kind].length;
    if (images.length > room) toast.warning(`Only ${room} more ${kind} image${room === 1 ? "" : "s"} can be added.`);
    setBusyKind(kind);
    const supabase = createClient();
    let done = 0;
    for (const file of images.slice(0, Math.max(0, room))) {
      try {
        const { blob, width, height } = await prepare(file);
        const path = `${userId}/${tradeId}/${crypto.randomUUID()}.webp`;
        const { error } = await supabase.storage.from(SCREENSHOT_BUCKET).upload(path, await blob.arrayBuffer(), { contentType: "image/webp", upsert: false });
        if (error) throw new Error(error.message);
        const res = await addScreenshot({ trade_id: tradeId, kind, storage_path: path, width, height, size_bytes: blob.size });
        if (!res.ok) throw new Error(res.error);
        done++;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed.");
      }
    }
    setBusyKind(null);
    if (done) toast.success(`${done} screenshot${done === 1 ? "" : "s"} uploaded`);
  }, [tradeId, userId, byKind]);

  const remove = (id: string) =>
    start(async () => {
      const r = await deleteScreenshot(id);
      if (r.ok) { toast.success("Screenshot deleted"); setViewer(null); }
      else toast.error(r.error);
    });

  const current = viewer ? byKind[viewer.kind][viewer.index] : null;
  const step = useCallback((d: number) => setViewer((v) => {
    if (!v) return v;
    const list = v.kind === "before" ? byKind.before : byKind.after;
    return { ...v, index: (v.index + d + list.length) % list.length };
  }), [byKind.before, byKind.after]);

  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer, step]);

  const canCompare = byKind.before.length > 0 && byKind.after.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Screenshots</CardTitle>
        <Button variant="outline" size="sm" disabled={!canCompare} onClick={() => { setPick({ before: 0, after: 0 }); setCompare(true); }}
          title={canCompare ? undefined : "Add at least one before and one after image"}>
          <Columns2 /> Compare before / after
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {KINDS.map(({ kind, title, hint }) => (
          <section key={kind} aria-label={`${title} screenshots`} className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title} <span className="num">({byKind[kind].length})</span></h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {byKind[kind].map((s, i) => (
                <button key={s.id} type="button" onClick={() => setViewer({ kind, index: i })}
                  className="group relative aspect-video overflow-hidden rounded-md border border-border bg-black outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
                  aria-label={`Open ${kind} screenshot ${i + 1}${s.caption ? `: ${s.caption}` : ""}`} data-testid={`shot-${kind}`}>
                  {s.url ? <img src={s.url} alt={s.caption ?? `${title} screenshot ${i + 1}`} className="size-full object-cover transition-transform group-hover:scale-105" loading="lazy" /> : <span className="text-xs text-muted-foreground">Unavailable</span>}
                  <Maximize2 className="absolute top-1.5 right-1.5 size-3.5 text-white opacity-0 drop-shadow group-hover:opacity-100" />
                </button>
              ))}
              <UploadZone kind={kind} title={title} hint={hint} count={byKind[kind].length} busy={busyKind === kind} onFiles={(f) => void upload(kind, f)} />
            </div>
          </section>
        ))}
      </CardContent>

      {/* Full-size viewer */}
      <Dialog open={!!current} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-[min(96vw,1400px)] gap-3 p-4">
          {current && viewer && (
            <>
              <DialogTitle className="text-sm">{viewer.kind === "before" ? "Before" : "After"} · {viewer.index + 1} of {byKind[viewer.kind].length}</DialogTitle>
              <DialogDescription className="sr-only">Full-size screenshot. Use the arrow keys to move between images.</DialogDescription>
              <div className="relative flex max-h-[75svh] items-center justify-center overflow-auto rounded-md bg-black">
                {current.url && <img src={current.url} alt={current.caption ?? "Screenshot"} className="max-h-[75svh] w-auto max-w-full object-contain" data-testid="viewer-image" />}
                {byKind[viewer.kind].length > 1 && (
                  <>
                    <Button variant="secondary" size="icon" className="absolute left-2 opacity-80" onClick={() => step(-1)} aria-label="Previous image"><ChevronLeft /></Button>
                    <Button variant="secondary" size="icon" className="absolute right-2 opacity-80" onClick={() => step(1)} aria-label="Next image"><ChevronRight /></Button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form className="flex flex-1 gap-2" onSubmit={(e) => {
                  e.preventDefault();
                  const caption = String(new FormData(e.currentTarget).get("caption") ?? "");
                  start(async () => { const r = await updateScreenshotCaption(current.id, caption); if (r.ok) toast.success("Caption saved"); else toast.error(r.error); });
                }}>
                  <Input key={current.id} name="caption" aria-label="Caption" placeholder="Add a caption…" defaultValue={current.caption ?? ""} className="h-8" maxLength={200} />
                  <Button type="submit" size="sm" variant="secondary" disabled={pending}>Save</Button>
                </form>
                <span className="num text-[11px] text-muted-foreground">{current.width}×{current.height} · {current.size_bytes ? `${Math.round(current.size_bytes / 1024)} KB` : ""}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={pending}><Trash2 /> Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this screenshot?</AlertDialogTitle>
                      <AlertDialogDescription>The image file is removed from storage permanently.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(current.id)}>Delete screenshot</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Side-by-side comparison */}
      <Dialog open={compare} onOpenChange={setCompare}>
        <DialogContent className="max-w-[min(98vw,1800px)] gap-3 p-4">
          <DialogTitle className="text-sm">Before vs after</DialogTitle>
          <DialogDescription className="sr-only">The selected before and after screenshots side by side.</DialogDescription>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {(["before", "after"] as const).map((kind) => {
              const list = byKind[kind];
              const s = list[pick[kind]];
              return (
                <div key={kind} className="flex min-w-0 flex-col gap-2" data-testid={`compare-${kind}`}>
                  <p className="text-xs font-medium text-muted-foreground uppercase">{kind}{s?.caption ? ` · ${s.caption}` : ""}</p>
                  <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-black">
                    {s?.url && <img src={s.url} alt={`${kind} screenshot`} className="max-h-full max-w-full object-contain" />}
                  </div>
                  {list.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label={`Choose ${kind} image`}>
                      {list.map((x, i) => (
                        <button key={x.id} type="button" aria-pressed={pick[kind] === i} onClick={() => setPick((p) => ({ ...p, [kind]: i }))}
                          className={cn("h-12 w-20 shrink-0 overflow-hidden rounded border", pick[kind] === i ? "border-primary" : "border-border opacity-60 hover:opacity-100")}>
                          {x.url && <img src={x.url} alt={`${kind} ${i + 1}`} className="size-full object-cover" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
