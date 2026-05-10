"use client";

import { useState, useRef } from "react";
import { nanoid } from "nanoid";
import {
  ImageIcon, Upload, CheckCircle2, Loader2,
  ChevronDown, ChevronRight, GripVertical,
} from "lucide-react";

import type { SeriesAlbum as AlbumInfo } from "@/lib/types";

const R2 = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

// ── Single cover cell ─────────────────────────────────────────

function CoverCell({
  label,
  currentImage,
  ratio,
  onUpload,
}: {
  label: string;
  currentImage: string;
  ratio: "16/9" | "4/5";
  onUpload: (file: File) => Promise<void>;
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setStatus("uploading");
    await onUpload(file);
    setStatus("done");
    setTimeout(() => setStatus("idle"), 2500);
  };

  const currentUrl = currentImage ? `${R2}/images/${currentImage}` : null;
  const displayUrl = preview || currentUrl;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <p
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-3)",
        }}
      >
        {label}
      </p>

      <div
        onClick={() => status !== "uploading" && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) handle(f);
        }}
        style={{
          aspectRatio: ratio,
          borderRadius: "10px",
          border: `2px ${drag ? "solid" : "dashed"} ${drag ? "var(--accent)" : status === "done" ? "oklch(0.55 0.16 145)" : "var(--border)"}`,
          background: drag ? "var(--accent-bg)" : "var(--bg-subtle)",
          cursor: status === "uploading" ? "wait" : "pointer",
          position: "relative",
          overflow: "hidden",
          transition: "border-color 150ms ease, background 150ms ease",
        }}
      >
        {/* Current / preview image */}
        {displayUrl && (
          <img
            src={displayUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        )}

        {/* Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: displayUrl ? "oklch(0 0 0 / 0.45)" : "transparent",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            opacity: status !== "idle" || !displayUrl ? 1 : 0,
            transition: "opacity 200ms ease",
          }}
          className="cover-overlay"
        >
          {status === "uploading" && (
            <Loader2
              style={{ width: "20px", height: "20px", color: "white", animation: "spin 1s linear infinite" }}
            />
          )}
          {status === "done" && (
            <CheckCircle2 style={{ width: "20px", height: "20px", color: "oklch(0.75 0.16 145)" }} />
          )}
          {status === "idle" && (
            <>
              {displayUrl ? (
                <Upload style={{ width: "18px", height: "18px", color: "white" }} />
              ) : (
                <ImageIcon style={{ width: "20px", height: "20px", color: "var(--text-3)" }} />
              )}
              <span style={{ fontSize: "10px", color: displayUrl ? "white" : "var(--text-3)", fontWeight: 600 }}>
                {displayUrl ? "Change" : "Upload"}
              </span>
            </>
          )}
        </div>

        {/* Show overlay on hover via CSS */}
        <style>{`.cover-cell:hover .cover-overlay { opacity: 1 !important; }`}</style>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }}
      />
    </div>
  );
}

// ── Series row ────────────────────────────────────────────────

type CharInfo = AlbumInfo["characters"][number];

function SeriesRow({
  album,
  dragHandleProps,
  isDragging,
}: {
  album: AlbumInfo;
  dragHandleProps: React.HTMLAttributes<HTMLDivElement>;
  isDragging: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Local character list for drag-reorder
  const [chars, setChars] = useState<CharInfo[]>(album.characters);

  // Char drag state
  const charDragIdx  = useRef<number | null>(null);
  const [charDragOver,   setCharDragOver]   = useState<number | null>(null);
  const [charDraggingIdx, setCharDraggingIdx] = useState<number | null>(null);

  const uploadCover = async (
    file: File,
    type: "series" | "char",
    seriesName: string,
    characterName?: string
  ) => {
    const ext      = file.name.split(".").pop()!.toLowerCase();
    const filename = `cover_${type}_${nanoid(8)}.${ext}`;

    const form = new FormData();
    form.append("file", file);
    form.append("filename", filename);
    form.append("folder", "images");

    const uploadRes = await fetch("/api/upload-file", { method: "POST", body: form });
    if (!uploadRes.ok) throw new Error("Upload to R2 failed");

    const uploadData = await uploadRes.json();
    const storedFilename = (uploadData.filename as string) || filename;

    await fetch("/api/update-cover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: storedFilename, type, seriesName, characterName }),
    });
  };

  const saveCharOrder = async (ordered: CharInfo[]) => {
    await fetch("/api/reorder-chars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesSlug: album.slug,
        order: ordered.map(c => c.slug),
      }),
    });
  };

  const handleCharDragStart = (i: number) => {
    charDragIdx.current = i;
    setCharDraggingIdx(i);
  };

  const handleCharDragEnter = (i: number) => {
    if (charDragIdx.current === null || charDragIdx.current === i) return;
    setCharDragOver(i);
  };

  const handleCharDragEnd = () => {
    if (charDragIdx.current === null || charDragOver === null || charDragIdx.current === charDragOver) {
      charDragIdx.current = null;
      setCharDraggingIdx(null);
      setCharDragOver(null);
      return;
    }
    const next = [...chars];
    const [moved] = next.splice(charDragIdx.current, 1);
    next.splice(charDragOver, 0, moved);
    setChars(next);
    saveCharOrder(next);
    charDragIdx.current = null;
    setCharDraggingIdx(null);
    setCharDragOver(null);
  };

  return (
    <div
      style={{
        background: "var(--bg-raised)",
        border: `1px solid ${isDragging ? "var(--accent-border)" : "var(--border)"}`,
        borderRadius: "16px",
        overflow: "hidden",
        marginBottom: "var(--space-3)",
        opacity: isDragging ? 0.55 : 1,
        transition: "border-color 150ms ease, opacity 150ms ease",
        boxShadow: isDragging ? "0 0 0 2px var(--accent)" : "none",
      }}
    >
      {/* Series header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-4) var(--space-5)",
        }}
      >
        {/* Drag handle — series reorder */}
        <div
          {...dragHandleProps}
          title="Drag to reorder series"
          style={{
            cursor: "grab",
            color: "var(--border-hi)",
            display: "flex",
            alignItems: "center",
            padding: "4px 2px",
            borderRadius: "6px",
            transition: "color 150ms ease",
            userSelect: "none",
            touchAction: "none",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-3)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--border-hi)")}
        >
          <GripVertical style={{ width: "16px", height: "16px" }} />
        </div>

        {/* Series info + cover */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <button
            onClick={() => setOpen(!open)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 0, display: "flex", alignItems: "center", gap: "6px" }}
          >
            {open
              ? <ChevronDown style={{ width: "16px", height: "16px" }} />
              : <ChevronRight style={{ width: "16px", height: "16px" }} />}
          </button>

          {/* Tiny series cover preview */}
          <div
            style={{
              width: "72px",
              aspectRatio: "16/9",
              borderRadius: "6px",
              overflow: "hidden",
              background: "var(--bg-subtle)",
              flexShrink: 0,
            }}
          >
            {album.coverImage ? (
              <img
                src={`${R2}/images/${album.coverImage}`}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ImageIcon style={{ width: "14px", color: "var(--border-hi)" }} />
              </div>
            )}
          </div>

          <div>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "2px" }}>
              {album.series}
            </p>
            <p style={{ fontSize: "11px", color: "var(--text-3)" }}>
              {album.characters.length} character{album.characters.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Series cover upload (compact) */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{ width: "120px" }}>
            <CoverCell
              label="Series Cover 16:9"
              currentImage={album.coverImage}
              ratio="16/9"
              onUpload={(file) => uploadCover(file, "series", album.series)}
            />
          </div>
        </div>
      </div>

      {/* Characters — collapsible + draggable */}
      {open && (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "var(--space-4) var(--space-5) var(--space-5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-4)" }}>
            <p
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-3)",
                margin: 0,
              }}
            >
              Character Covers (4:5)
            </p>
            <span style={{ fontSize: "10px", color: "var(--border-hi)", display: "flex", alignItems: "center", gap: "3px" }}>
              <GripVertical style={{ width: "10px" }} /> drag to reorder
            </span>
          </div>

          {/* Draggable character grid — uses flex-wrap so drop targets work between cells */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            {chars.map((char, i) => (
              <div
                key={char.slug}
                draggable
                onDragStart={() => handleCharDragStart(i)}
                onDragEnter={() => handleCharDragEnter(i)}
                onDragOver={e => { e.preventDefault(); handleCharDragEnter(i); }}
                onDragEnd={handleCharDragEnd}
                className="cover-cell"
                style={{
                  position: "relative",
                  cursor: "grab",
                  opacity: charDraggingIdx === i ? 0.4 : 1,
                  outline: charDragOver === i && charDraggingIdx !== i
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                  outlineOffset: "3px",
                  borderRadius: "10px",
                  transition: "opacity 150ms ease, outline 150ms ease",
                }}
              >
                {/* Drag hint badge */}
                <div style={{
                  position: "absolute",
                  top: "4px",
                  right: "4px",
                  zIndex: 5,
                  background: "oklch(0 0 0 / 0.55)",
                  borderRadius: "6px",
                  padding: "2px 3px",
                  pointerEvents: "none",
                }}>
                  <GripVertical style={{ width: "10px", height: "10px", color: "white" }} />
                </div>
                <CoverCell
                  label={char.character}
                  currentImage={char.coverImage}
                  ratio="4/5"
                  onUpload={(file) =>
                    uploadCover(file, "char", album.series, char.character)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export default function CoverManager({ albums: initialAlbums }: { albums: AlbumInfo[] }) {
  const [albums, setAlbums] = useState<AlbumInfo[]>(initialAlbums);

  // ── Drag state
  const dragIndexRef  = useRef<number | null>(null);  // which row is being dragged
  const [dragOver, setDragOver] = useState<number | null>(null); // hover target index
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const saveOrder = async (ordered: AlbumInfo[]) => {
    await fetch("/api/reorder-series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: ordered.map(a => a.slug) }),
    });
  };

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
    setDraggingIdx(index);
  };

  const handleDragEnter = (index: number) => {
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;
    setDragOver(index);
  };

  const handleDragEnd = () => {
    if (dragIndexRef.current === null || dragOver === null || dragIndexRef.current === dragOver) {
      dragIndexRef.current = null;
      setDraggingIdx(null);
      setDragOver(null);
      return;
    }

    const next = [...albums];
    const [moved] = next.splice(dragIndexRef.current, 1);
    next.splice(dragOver, 0, moved);
    setAlbums(next);
    saveOrder(next);

    dragIndexRef.current = null;
    setDraggingIdx(null);
    setDragOver(null);
  };

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {albums.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-9)",
            color: "var(--text-3)",
            border: "2px dashed var(--border)",
            borderRadius: "16px",
          }}
        >
          <ImageIcon style={{ width: "32px", height: "32px", margin: "0 auto var(--space-3)" }} />
          <p style={{ fontSize: "14px" }}>No series found. Upload some generations first.</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: "11px", color: "var(--text-3)", marginBottom: "var(--space-4)" }}>
            <GripVertical style={{ width: "12px", display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
            Drag the handle on the left to reorder series.
          </p>
          {albums.map((album, i) => (
            <div
              key={album.slug}
              onDragOver={e => { e.preventDefault(); handleDragEnter(i); }}
              style={{
                position: "relative",
                transition: "transform 200ms ease",
              }}
            >
              {/* Drop indicator line above */}
              {dragOver === i && draggingIdx !== null && draggingIdx !== i && (
                <div style={{
                  position: "absolute",
                  top: -3,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background: "var(--accent)",
                  borderRadius: "99px",
                  zIndex: 10,
                  pointerEvents: "none",
                }} />
              )}
              <SeriesRow
                album={album}
                isDragging={draggingIdx === i}
                dragHandleProps={{
                  draggable: true,
                  onDragStart: () => handleDragStart(i),
                  onDragEnd: handleDragEnd,
                }}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
