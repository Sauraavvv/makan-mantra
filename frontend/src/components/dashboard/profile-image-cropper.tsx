"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Minus, Plus, X } from "lucide-react";

type Point = { x: number; y: number };

const OUTPUT_SIZE = 512;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function ProfileImageCropper({
  sourceUrl,
  fileName,
  onCancel,
  onConfirm,
}: {
  sourceUrl: string;
  fileName: string;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void>;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const cropAreaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; start: Point; offset: Point } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState(320);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const node = cropAreaRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setViewportSize(entry.contentRect.width || 320);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !processing) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onCancel, processing]);

  const baseScale = useMemo(() => {
    if (!dimensions.width || !dimensions.height) return 1;
    return Math.max(viewportSize / dimensions.width, viewportSize / dimensions.height);
  }, [dimensions, viewportSize]);

  const constrainOffset = useCallback(
    (next: Point, nextZoom = zoom) => {
      const displayedWidth = dimensions.width * baseScale * nextZoom;
      const displayedHeight = dimensions.height * baseScale * nextZoom;
      const maxX = Math.max(0, (displayedWidth - viewportSize) / 2);
      const maxY = Math.max(0, (displayedHeight - viewportSize) / 2);
      return {
        x: clamp(next.x, -maxX, maxX),
        y: clamp(next.y, -maxY, maxY),
      };
    },
    [baseScale, dimensions, viewportSize, zoom],
  );

  const changeZoom = (nextZoom: number) => {
    const value = clamp(nextZoom, 1, 3);
    setZoom(value);
    setOffset((current) => constrainOffset(current, value));
  };

  const createCroppedFile = async () => {
    const image = imageRef.current;
    if (!image || !dimensions.width || !dimensions.height) return;

    setProcessing(true);
    try {
      const renderedScale = baseScale * zoom;
      const sourceSize = viewportSize / renderedScale;
      const sourceX = (dimensions.width - sourceSize) / 2 - offset.x / renderedScale;
      const sourceY = (dimensions.height - sourceSize) / 2 - offset.y / renderedScale;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image crop is unavailable");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error("Could not crop image"))),
          "image/jpeg",
          0.9,
        );
      });
      const baseName = fileName.replace(/\.[^.]+$/, "") || "profile";
      await onConfirm(new File([blob], `${baseName}-cropped.jpg`, { type: "image/jpeg" }));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-crop-title"
      className="fixed inset-0 z-[100] grid place-items-center bg-[#071a33]/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-[480px] overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
        <header className="flex h-14 items-center gap-3 border-b border-border px-4">
          <h2 id="profile-crop-title" className="min-w-0 flex-1 text-base font-bold text-foreground">
            Crop profile photo
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            aria-label="Close crop dialog"
            className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="p-4 sm:p-5">
          <div
            ref={cropAreaRef}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = {
                pointerId: event.pointerId,
                start: { x: event.clientX, y: event.clientY },
                offset,
              };
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;
              setOffset(
                constrainOffset({
                  x: drag.offset.x + event.clientX - drag.start.x,
                  y: drag.offset.y + event.clientY - drag.start.y,
                }),
              );
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            className="relative mx-auto aspect-square w-full max-w-[360px] touch-none cursor-grab overflow-hidden rounded-lg bg-[#0a1527] active:cursor-grabbing"
          >
            {/* A blob URL is required here because this is the local file before upload. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={sourceUrl}
              alt="Crop preview"
              draggable={false}
              onLoad={(event) => {
                setDimensions({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
                setOffset({ x: 0, y: 0 });
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: dimensions.width ? dimensions.width * baseScale : "auto",
                height: dimensions.height ? dimensions.height * baseScale : "auto",
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-white shadow-[0_0_0_999px_rgba(7,26,51,0.52)]" />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Minus className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => changeZoom(Number(event.target.value))}
              aria-label="Crop zoom"
              className="h-1.5 w-full cursor-pointer accent-saffron"
            />
            <Plus className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="h-10 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-muted/50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void createCroppedFile()}
            disabled={processing || !dimensions.width}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-saffron px-4 text-sm font-semibold text-saffron-foreground hover:opacity-90 disabled:opacity-60"
          >
            {processing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Apply crop
          </button>
        </footer>
      </div>
    </div>
  );
}
