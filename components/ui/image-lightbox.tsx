"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, ExternalLink, FileImage, Download } from "lucide-react";

export interface LightboxImage {
  url: string;
  name?: string;
  caption?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  /** Index of the image to start on. Reset by re-mounting or passing key. */
  initialIndex?: number;
  onClose: () => void;
}

export function ImageLightbox({ images, initialIndex = 0, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(Math.min(initialIndex, Math.max(images.length - 1, 0)));
  const canPrev = images.length > 1;
  const canNext = images.length > 1;

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setIndex((i) => (images.length > 1 ? (i - 1 + images.length) % images.length : i));
      } else if (e.key === "ArrowRight") {
        setIndex((i) => (images.length > 1 ? (i + 1) % images.length : i));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, images.length]);

  if (images.length === 0) return null;

  const current = images[index];

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150 flex flex-col"
      onClick={close}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 text-slate-300 min-w-0">
          <FileImage className="w-4 h-4 shrink-0" />
          <p className="text-xs font-medium truncate">{current.name || "Image preview"}</p>
          {images.length > 1 && (
            <span className="text-[10px] text-slate-500 shrink-0">
              {index + 1} / {images.length}
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          aria-label="Close preview"
          className="p-1.5 rounded-[4px] text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center px-4">
        {canPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i - 1 + images.length) % images.length);
            }}
            aria-label="Previous image"
            className="absolute left-3 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors cursor-pointer shadow"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.name || "Preview"}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain rounded-[4px] shadow-2xl"
        />
        {canNext && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i + 1) % images.length);
            }}
            aria-label="Next image"
            className="absolute right-3 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/25 transition-colors cursor-pointer shadow"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom bar */}
      {current.caption && (
        <p className="text-center text-[11px] text-slate-400 px-6 pb-1 truncate">{current.caption}</p>
      )}
      <div className="flex items-center justify-center gap-2 px-4 py-3 shrink-0">
        <a
          href={current.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-200 bg-white/10 hover:bg-white/20 rounded-[4px] transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in new tab
        </a>
        <a
          href={current.url}
          download={current.name || true}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-200 bg-white/10 hover:bg-white/20 rounded-[4px] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </a>
        <span className="hidden sm:inline text-[10px] text-slate-500 ml-1">
          Esc to close
        </span>
      </div>
    </div>
  );
}
