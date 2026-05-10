"use client";

import { useState, useRef, useCallback } from "react";
import { nanoid } from "nanoid";
import {
  card, label, input, CoverDrop, ImageDropzone, PromptFields,
  SubmitBtn, ErrBanner, SuccessCard, uploadFileToR2,
  type ImgCard,
} from "./shared";
import type { SDMetadata } from "@/lib/sdMetadata";
import { X } from "lucide-react";

export default function NewUploadForm({ knownLinks = {} }: { knownLinks?: Record<string, string> }) {
  // Album info
  const [animeName, setAnimeName] = useState("");
  const [charName,  setCharName]  = useState("");
  const [tags, setTags]           = useState<string[]>([]);
  const [tagInput, setTagInput]   = useState("");

  // Prompt fields
  const [posPrompt, setPosPrompt] = useState("");
  const [negPrompt, setNegPrompt] = useState("");
  const [cfgScale,  setCfgScale]  = useState("");
  const [steps,     setSteps]     = useState("");
  const [sampler,   setSampler]   = useState("");
  const [seed,      setSeed]      = useState("");
  const [checkpoints, setCheckpoints] = useState<{name: string; link: string}[]>([]);
  const [loras, setLoras]             = useState<{name: string; link: string}[]>([]);

  // Images & covers
  const [cards,       setCards]       = useState<ImgCard[]>([]);
  const [seriesCover, setSeriesCover] = useState<File | null>(null);
  const [charCover,   setCharCover]   = useState<File | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  // Status
  const [status, setStatus] = useState<"idle"|"uploading"|"done"|"error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const applyMeta = useCallback((meta: SDMetadata) => {
    if (meta.positive_prompt) setPosPrompt(p => p || meta.positive_prompt!);
    if (meta.negative_prompt) setNegPrompt(p => p || meta.negative_prompt!);
    if (meta.cfg_scale)       setCfgScale(p  => p || meta.cfg_scale!);
    if (meta.sampling_steps)  setSteps(p     => p || meta.sampling_steps!);
    if (meta.sampling_method) setSampler(p   => p || meta.sampling_method!);
    if (meta.seed)            setSeed(p      => p || meta.seed!);
    
    // Auto-fill Checkpoints
    if (meta.model) {
      setCheckpoints(prev => {
        if (prev.some(c => c.name === meta.model)) return prev;
        return [...prev, { name: meta.model!, link: knownLinks[meta.model!] || "" }];
      });
    }
    
    // Auto-fill LoRAs
    if (meta.loras && meta.loras.length > 0) {
      setLoras(prev => {
        const newLoras = [...prev];
        for (const l of meta.loras!) {
          if (!newLoras.some(x => x.name === l.name)) {
            newLoras.push({ name: l.name, link: knownLinks[l.name] || "" });
          }
        }
        return newLoras;
      });
    }
  }, [knownLinks]);

  const addTag = (v: string) => {
    const t = v.trim();
    if (t && !tags.includes(t)) setTags(p => [...p, t]);
    setTagInput("");
  };

  const reset = () => {
    setAnimeName(""); setCharName(""); setTags([]); setTagInput("");
    setPosPrompt(""); setNegPrompt(""); setCfgScale(""); setSteps("");
    setSampler(""); setSeed(""); setCheckpoints([]); setLoras([]);
    setCards([]); setSeriesCover(null); setCharCover(null);
    setStatus("idle"); setErrMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animeName || !charName || cards.length === 0) {
      setErrMsg("Anime, character, and at least one image are required.");
      return;
    }
    setStatus("uploading"); setErrMsg("");

    try {
      // Upload images
      const filenames: string[] = [];
      for (const c of cards) {
        setCards(prev => prev.map(x => x.id === c.id ? { ...x, uploading: true } : x));
        const actualFilename = await uploadFileToR2(c.file, c.filename);
        setCards(prev => prev.map(x => x.id === c.id ? { ...x, uploading: false, done: true, filename: actualFilename } : x));
        filenames.push(actualFilename);
      }

      // Upload covers
      let sCover = "", cCover = "";
      if (seriesCover) {
        const ext = seriesCover.name.split(".").pop()!;
        sCover = `cover_series_${nanoid(8)}.${ext}`;
        await uploadFileToR2(seriesCover, sCover);
      }
      if (charCover) {
        const ext = charCover.name.split(".").pop()!;
        cCover = `cover_char_${nanoid(8)}.${ext}`;
        await uploadFileToR2(charCover, cCover);
      }

      // Save metadata
      const id = nanoid(12);
      const payload = {
        id,
        title: `${charName} — ${animeName}`,
        tags: [charName.trim(), animeName.trim(), ...tags],
        positive_prompt: posPrompt || undefined,
        negative_prompt: negPrompt || undefined,
        cfg_scale:        cfgScale  || undefined,
        sampling_steps:   steps     || undefined,
        sampling_method:  sampler   || undefined,
        seed:             seed      || undefined,
        checkpoints:      checkpoints.filter(c => c.name.trim()),
        loras:            loras.filter(l => l.name.trim()),
        images: cards.map((c, i) => ({
          filename: filenames[i],
          metadata: c.meta ? {
            positive_prompt: c.meta.positive_prompt || undefined,
            negative_prompt: c.meta.negative_prompt || undefined,
            sampling_steps: c.meta.sampling_steps || undefined,
            sampling_method: c.meta.sampling_method || undefined,
            cfg_scale: c.meta.cfg_scale || undefined,
            seed: c.meta.seed || undefined,
            width: c.meta.width?.toString() || undefined,
            height: c.meta.height?.toString() || undefined,
            model: c.meta.model || undefined,
          } : undefined
        })),
        series_cover_image: sCover || undefined,
        char_cover_image:   cCover || undefined,
        created_at: Date.now(),
      };

      const res = await fetch("/api/save-metadata", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to save metadata");

      setStatus("done");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
    }
  };

  if (status === "done") return <SuccessCard onReset={reset} />;

  return (
    <form onSubmit={handleSubmit}>
      {/* Album info */}
      <div style={card}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", marginBottom: "var(--space-4)" }}>Album Info</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
          <div>
            <p style={label}>Anime / Series *</p>
            <input value={animeName} onChange={e => setAnimeName(e.target.value)} placeholder="e.g. Blend S" required style={input} />
          </div>
          <div>
            <p style={label}>Character *</p>
            <input value={charName} onChange={e => setCharName(e.target.value)} placeholder="e.g. Kaho Hinata" required style={input} />
          </div>
        </div>
        {/* Tags */}
        <div>
          <p style={label}>Extra Tags</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
            {tags.map(t => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "99px", background: "var(--accent-bg)", color: "var(--accent)", border: "1px solid var(--accent-border)" }}>
                {t}
                <button type="button" onClick={() => setTags(p => p.filter(x => x !== t))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", padding: 0 }}><X style={{ width: "9px" }} /></button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
              placeholder="Type tag + Enter" style={{ ...input, flex: 1 }} />
            <button type="button" onClick={() => addTag(tagInput)} style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-2)", cursor: "pointer", fontSize: "12px" }}>Add</button>
          </div>
        </div>
      </div>

      {/* Covers */}
      <div style={card}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>Custom Covers <span style={{ fontSize: "11px", fontWeight: 400, color: "var(--text-3)" }}>(optional)</span></p>
        <p style={{ fontSize: "11px", color: "var(--text-3)", marginBottom: "var(--space-3)" }}>Leave empty to use first uploaded image.</p>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-3)" }}>
          <div>
            <p style={label}>Series Cover 16:9</p>
            <CoverDrop ratio="16/9" value={seriesCover} onChange={setSeriesCover} />
          </div>
          <div>
            <p style={label}>Character 4:5</p>
            <CoverDrop ratio="4/5" value={charCover} onChange={setCharCover} />
          </div>
        </div>
      </div>

      {/* Images */}
      <div style={card}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>Images *</p>
        <p style={{ fontSize: "11px", color: "var(--text-3)", marginBottom: "var(--space-3)" }}>PNG/WebP with A1111/Forge metadata → auto-fills prompts. Images auto-converted to WebP.</p>
        <ImageDropzone cards={cards} setCards={setCards} imgRef={imgRef} applyMeta={applyMeta} />
      </div>

      {/* Prompt fields */}
      <div style={card}>
        <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>Prompt & Parameters</p>
        <p style={{ fontSize: "11px", color: "var(--text-3)", marginBottom: "var(--space-4)" }}>Auto-filled from image metadata. Edit freely.</p>
        <PromptFields {...{ posPrompt, setPosPrompt, negPrompt, setNegPrompt, cfgScale, setCfgScale, steps, setSteps, sampler, setSampler, seed, setSeed, checkpoints, setCheckpoints, loras, setLoras }} />
      </div>

      {errMsg && <ErrBanner msg={errMsg} />}
      <SubmitBtn loading={status === "uploading"} />
    </form>
  );
}
