"use client";

import { useState, useRef, useCallback } from "react";
import { nanoid } from "nanoid";
import { extractSDMetadata, type SDMetadata } from "@/lib/sdMetadata";
import {
  Upload, X, Plus, CheckCircle2, Loader2, AlertCircle, ChevronDown, ChevronUp, ImageIcon,
} from "lucide-react";

// ── Shared styles ─────────────────────────────────────────────

export const input: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-subtle)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "9px 13px",
  fontSize: "13px",
  color: "var(--text)",
  outline: "none",
  fontFamily: "var(--font-body)",
  transition: "border-color 150ms ease",
};

export const textarea: React.CSSProperties = {
  ...input,
  resize: "vertical" as const,
  minHeight: "80px",
  lineHeight: 1.6,
};

export const label: React.CSSProperties = {
  display: "block",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--text-3)",
  marginBottom: "5px",
};

export const card: React.CSSProperties = {
  background: "var(--bg-raised)",
  border: "1px solid var(--border)",
  borderRadius: "14px",
  padding: "var(--space-5)",
  marginBottom: "var(--space-4)",
};

// ── Cover dropzone ────────────────────────────────────────────

export function CoverDrop({
  ratio, value, onChange, size = "full",
}: {
  ratio: "16/9" | "4/5";
  value: File | null;
  onChange: (f: File) => void;
  size?: "full" | "compact";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const preview = value ? URL.createObjectURL(value) : null;

  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onChange(f); }}
      style={{
        aspectRatio: ratio,
        borderRadius: "10px",
        border: `2px dashed ${drag ? "var(--accent)" : "var(--border)"}`,
        background: drag ? "var(--accent-bg)" : "var(--bg-subtle)",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 150ms ease, background 150ms ease",
      }}
    >
      {preview
        ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", color: "var(--text-3)" }}>
            <ImageIcon style={{ width: size === "compact" ? "16px" : "22px", height: size === "compact" ? "16px" : "22px" }} />
            <span style={{ fontSize: "10px" }}>{ratio}</span>
          </div>
        )}
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ""; }} />
    </div>
  );
}

// ── Image card ────────────────────────────────────────────────

export interface ImgCard {
  id: string;
  file: File;
  preview: string;
  meta: SDMetadata | null;
  uploading: boolean;
  done: boolean;
  filename: string;
}

export function ImageCard({ card, onRemove }: { card: ImgCard; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "6px", overflow: "hidden", flexShrink: 0 }}>
          <img src={card.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.file.name}</p>
          <p style={{ fontSize: "10px", color: card.meta ? "oklch(0.72 0.16 145)" : "var(--text-3)" }}>
            {card.meta ? "✓ SD metadata" : "No metadata"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {card.done && <CheckCircle2 style={{ width: "15px", color: "oklch(0.72 0.16 145)" }} />}
          {card.uploading && <Loader2 style={{ width: "15px", color: "var(--accent)", animation: "spin 1s linear infinite" }} />}
          {card.meta && (
            <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 0 }}>
              {open ? <ChevronUp style={{ width: "14px" }} /> : <ChevronDown style={{ width: "14px" }} />}
            </button>
          )}
          <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 0 }}>
            <X style={{ width: "14px" }} />
          </button>
        </div>
      </div>
      {open && card.meta && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "8px 10px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px 12px", fontSize: "10px", color: "var(--text-2)" }}>
          {card.meta.sampling_steps && <span>Steps: <b>{card.meta.sampling_steps}</b></span>}
          {card.meta.sampling_method && <span>Sampler: <b>{card.meta.sampling_method}</b></span>}
          {card.meta.cfg_scale && <span>CFG: <b>{card.meta.cfg_scale}</b></span>}
          {card.meta.seed && <span>Seed: <b>{card.meta.seed}</b></span>}
          {card.meta.width && <span>Size: <b>{card.meta.width}×{card.meta.height}</b></span>}
          {card.meta.model && <span style={{ gridColumn: "1/-1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Model: <b>{card.meta.model}</b></span>}
        </div>
      )}
    </div>
  );
}

// ── Image dropzone ────────────────────────────────────────────

export function ImageDropzone({ cards, setCards, imgRef, applyMeta }: {
  cards: ImgCard[];
  setCards: React.Dispatch<React.SetStateAction<ImgCard[]>>;
  imgRef: React.RefObject<HTMLInputElement | null>;
  applyMeta?: (meta: SDMetadata) => void;
}) {
  const addImages = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()!.toLowerCase();
      const id = nanoid(10);
      const filename = `${id}.${ext}`;
      const meta = await extractSDMetadata(file);
      if (meta && applyMeta) applyMeta(meta);
      setCards(prev => [...prev, { id, file, filename, preview: URL.createObjectURL(file), meta, uploading: false, done: false }]);
    }
  }, [applyMeta, setCards]);

  return (
    <div>
      <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={(e) => { if (e.target.files) addImages(e.target.files); e.target.value = ""; }} />
      {cards.length === 0 ? (
        <div
          onClick={() => imgRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) addImages(e.dataTransfer.files); }}
          style={{ border: "2px dashed var(--border)", borderRadius: "10px", padding: "32px", textAlign: "center", cursor: "pointer", color: "var(--text-3)" }}
        >
          <Upload style={{ width: "24px", height: "24px", margin: "0 auto 8px" }} />
          <p style={{ fontSize: "13px" }}>Drop images or click to browse</p>
          <p style={{ fontSize: "10px", marginTop: "3px" }}>PNG · WebP · JPG — SD metadata auto-detected</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {cards.map(c => <ImageCard key={c.id} card={c} onRemove={() => setCards(prev => prev.filter(x => x.id !== c.id))} />)}
          <button type="button" onClick={() => imgRef.current?.click()}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "9px", borderRadius: "8px", border: "1px dashed var(--border)", background: "transparent", color: "var(--text-3)", cursor: "pointer", fontSize: "12px" }}>
            <Plus style={{ width: "13px" }} /> Add more
          </button>
        </div>
      )}
    </div>
  );
}

export function PromptFields({
  posPrompt, setPosPrompt,
  negPrompt, setNegPrompt,
  cfgScale, setCfgScale,
  steps, setSteps,
  sampler, setSampler,
  seed, setSeed,
  checkpoints, setCheckpoints,
  loras, setLoras,
}: {
  posPrompt: string; setPosPrompt: (v: string) => void;
  negPrompt: string; setNegPrompt: (v: string) => void;
  cfgScale: string;  setCfgScale:  (v: string) => void;
  steps: string;     setSteps:     (v: string) => void;
  sampler: string;   setSampler:   (v: string) => void;
  seed: string;      setSeed:      (v: string) => void;
  checkpoints: { name: string; link: string }[]; setCheckpoints: (v: { name: string; link: string }[]) => void;
  loras: { name: string; link: string }[]; setLoras: (v: { name: string; link: string }[]) => void;
}) {
  const [showAdv, setShowAdv] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div>
        <p style={label}>Positive Prompt</p>
        <textarea value={posPrompt} onChange={e => setPosPrompt(e.target.value)} placeholder="masterpiece, best quality, 1girl …" style={textarea} />
      </div>
      <div>
        <p style={label}>Negative Prompt</p>
        <textarea value={negPrompt} onChange={e => setNegPrompt(e.target.value)} placeholder="ugly, worst quality, blurry …" style={{ ...textarea, minHeight: "60px" }} />
      </div>

      {/* Quick params — always visible */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)" }}>
        <div><p style={label}>Steps</p><input value={steps} onChange={e => setSteps(e.target.value)} placeholder="28" style={input} /></div>
        <div><p style={label}>CFG Scale</p><input value={cfgScale} onChange={e => setCfgScale(e.target.value)} placeholder="7" style={input} /></div>
        <div><p style={label}>Sampler</p><input value={sampler} onChange={e => setSampler(e.target.value)} placeholder="DPM++ 2M" style={input} /></div>
      </div>

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdv(!showAdv)}
        style={{ display: "flex", alignItems: "center", gap: "5px", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: "11px", fontWeight: 600, padding: 0, width: "fit-content" }}
      >
        {showAdv ? <ChevronUp style={{ width: "13px" }} /> : <ChevronDown style={{ width: "13px" }} />}
        Advanced (Seed, Models, LoRAs)
      </button>

      {showAdv && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div><p style={label}>Seed</p><input value={seed} onChange={e => setSeed(e.target.value)} placeholder="-1" style={input} /></div>
          
          {/* Checkpoints */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <p style={{...label, marginBottom: 0}}>Checkpoints</p>
              <button type="button" onClick={() => setCheckpoints([...checkpoints, { name: "", link: "" }])} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "10px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}><Plus style={{ width: "10px" }} /> Add</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {checkpoints.map((c, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "6px", alignItems: "center" }}>
                  <input value={c.name} onChange={e => { const a = [...checkpoints]; a[i].name = e.target.value; setCheckpoints(a); }} placeholder="Name (e.g. Anime Pastel)" style={input} />
                  <input value={c.link} onChange={e => { const a = [...checkpoints]; a[i].link = e.target.value; setCheckpoints(a); }} placeholder="Link (Civitai, etc.)" style={input} />
                  <button type="button" onClick={() => setCheckpoints(checkpoints.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", padding: "4px" }}><X style={{ width: "14px" }} /></button>
                </div>
              ))}
              {checkpoints.length === 0 && <p style={{ fontSize: "11px", color: "var(--text-3)" }}>No checkpoints added.</p>}
            </div>
          </div>

          {/* LoRAs */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <p style={{...label, marginBottom: 0}}>LoRAs</p>
              <button type="button" onClick={() => setLoras([...loras, { name: "", link: "" }])} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "10px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}><Plus style={{ width: "10px" }} /> Add</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {loras.map((l, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "6px", alignItems: "center" }}>
                  <input value={l.name} onChange={e => { const a = [...loras]; a[i].name = e.target.value; setLoras(a); }} placeholder="Name" style={input} />
                  <input value={l.link} onChange={e => { const a = [...loras]; a[i].link = e.target.value; setLoras(a); }} placeholder="Link" style={input} />
                  <button type="button" onClick={() => setLoras(loras.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", padding: "4px" }}><X style={{ width: "14px" }} /></button>
                </div>
              ))}
              {loras.length === 0 && <p style={{ fontSize: "11px", color: "var(--text-3)" }}>No LoRAs added.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Upload proxy helper ───────────────────────────────────────

export async function uploadFileToR2(file: File, filename: string, folder = "images") {
  const form = new FormData();
  form.append("file", file);
  form.append("filename", filename);
  form.append("folder", folder);
  const res = await fetch("/api/upload-file", { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  const data = await res.json();
  // Server may convert PNG→WebP, return the actual stored filename
  return (data.filename as string) || filename;
}

// ── Success state ─────────────────────────────────────────────

export function SuccessCard({ onReset }: { onReset: () => void }) {
  return (
    <div style={{ ...card, textAlign: "center", padding: "var(--space-8)" }}>
      <CheckCircle2 style={{ width: "44px", height: "44px", color: "oklch(0.72 0.16 145)", margin: "0 auto 12px" }} />
      <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>Done!</h2>
      <p style={{ fontSize: "13px", color: "var(--text-3)", marginBottom: "var(--space-5)" }}>Saved to gallery.</p>
      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <a href="/" style={{ padding: "7px 18px", borderRadius: "99px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-2)", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}>View Gallery</a>
        <button onClick={onReset} style={{ padding: "7px 18px", borderRadius: "99px", border: "1px solid var(--accent-border)", background: "var(--accent-bg)", color: "var(--accent)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Upload More</button>
      </div>
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────

export function ErrBanner({ msg }: { msg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "9px", background: "oklch(0.18 0.06 25 / 0.3)", border: "1px solid oklch(0.35 0.12 25)", color: "oklch(0.75 0.15 25)", fontSize: "12px", marginBottom: "var(--space-3)" }}>
      <AlertCircle style={{ width: "15px", flexShrink: 0 }} />{msg}
    </div>
  );
}

// ── Submit button ─────────────────────────────────────────────

export function SubmitBtn({ loading, label: lbl = "Upload to Gallery" }: { loading: boolean; label?: string }) {
  return (
    <>
      <button type="submit" disabled={loading}
        style={{ width: "100%", padding: "11px", borderRadius: "11px", border: "none", background: loading ? "var(--bg-subtle)" : "var(--accent)", color: "white", fontSize: "13px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", opacity: loading ? 0.65 : 1 }}>
        {loading ? <><Loader2 style={{ width: "15px", animation: "spin 1s linear infinite" }} />Uploading…</> : <><Upload style={{ width: "15px" }} />{lbl}</>}
      </button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
