import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Code2, Image as ImageIcon, Heading1, Heading2, Heading3, Type, Trash2, X, AlertTriangle } from "lucide-react";
import { colors } from "../theme/tokens";
import { useStore } from "../store";
import * as api from "../api";
import { coerceDoc, emptyDoc, extractPreview, newBlockId, type Block, type BlockDoc } from "../editor/blocks";

interface Props {
  fileId: string;
  onBack: () => void;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function FileEditor({ fileId, onBack }: Props) {
  const { files, projects, reload } = useStore();
  const file = files.find((f) => f.id === fileId);

  const [doc, setDoc] = useState<BlockDoc | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [openCodeBlockId, setOpenCodeBlockId] = useState<string | null>(null);
  const [slashFor, setSlashFor] = useState<string | null>(null); // block id showing slash menu
  const saveTimer = useRef<number | null>(null);
  const focusBlockId = useRef<string | null>(null);

  const project = file?.projectId ? projects.find((p) => p.id === file.projectId) : undefined;

  // Load doc on mount / when fileId changes
  useEffect(() => {
    let cancelled = false;
    if (!api.runningInTauri) {
      // No backend → start with an empty doc
      setDoc(emptyDoc(fileId));
      return;
    }
    api.readFileDoc(fileId)
      .then((raw) => {
        if (cancelled) return;
        const d = coerceDoc(raw, fileId);
        setDoc(d);
      })
      .catch((e) => {
        if (cancelled) return;
        setSaveErr(`Failed to load: ${e}`);
        setDoc(emptyDoc(fileId));
      });
    return () => { cancelled = true; };
  }, [fileId]);

  // Debounced auto-save
  const scheduleSave = useCallback((next: BlockDoc) => {
    if (!api.runningInTauri) return;
    setSaveState("dirty");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        await api.saveFileDoc({ id: fileId, doc: next, preview: extractPreview(next) });
        setSaveState("saved");
        setSaveErr(null);
        // Refresh the file index (modifiedAt + preview) so other views update
        await reload();
        window.setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1200);
      } catch (e) {
        setSaveState("error");
        setSaveErr(String(e));
      }
    }, 600);
  }, [fileId, reload]);

  const updateDoc = useCallback((mut: (d: BlockDoc) => BlockDoc) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const next = mut(prev);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const updateBlock = useCallback((id: string, patch: Partial<Block>) => {
    updateDoc((d) => ({
      ...d,
      blocks: d.blocks.map((b) => b.id === id ? ({ ...b, ...patch } as Block) : b),
    }));
  }, [updateDoc]);

  const insertBlockAfter = useCallback((afterId: string | null, block: Block, focus = true) => {
    if (focus) focusBlockId.current = block.id;
    updateDoc((d) => {
      const idx = afterId ? d.blocks.findIndex((b) => b.id === afterId) : d.blocks.length - 1;
      const next = d.blocks.slice();
      next.splice(idx + 1, 0, block);
      return { ...d, blocks: next };
    });
  }, [updateDoc]);

  const deleteBlock = useCallback((id: string) => {
    updateDoc((d) => {
      if (d.blocks.length <= 1) return d;
      return { ...d, blocks: d.blocks.filter((b) => b.id !== id) };
    });
  }, [updateDoc]);

  const replaceBlock = useCallback((id: string, block: Block) => {
    focusBlockId.current = block.id;
    updateDoc((d) => ({
      ...d,
      blocks: d.blocks.map((b) => b.id === id ? block : b),
    }));
  }, [updateDoc]);

  // Paste handler: text → paragraphs; image → asset
  const handlePaste = useCallback(async (e: React.ClipboardEvent, atBlockId: string | null) => {
    const items = Array.from(e.clipboardData.items);
    const imgItem = items.find((it) => it.type.startsWith("image/"));
    if (imgItem) {
      e.preventDefault();
      const blob = imgItem.getAsFile();
      if (!blob) return;
      try {
        const buf = await blob.arrayBuffer();
        const base64 = arrayBufferToBase64(buf);
        const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
        const assetPath = api.runningInTauri
          ? await api.saveAsset({ projectId: file?.projectId, extension: ext, base64 })
          : `data:${blob.type};base64,${base64}`; // browser fallback embeds inline
        const block: Block = { id: newBlockId(), kind: "image", assetPath };
        insertBlockAfter(atBlockId, block, false);
      } catch (err) {
        setSaveErr(`Image paste failed: ${err}`);
      }
      return;
    }

    const text = e.clipboardData.getData("text/plain");
    if (text && text.includes("\n")) {
      e.preventDefault();
      const paragraphs = text.split(/\r?\n+/).map((t) => t.trim()).filter(Boolean);
      if (paragraphs.length === 0) return;
      let after = atBlockId;
      for (const p of paragraphs) {
        const b: Block = { id: newBlockId(), kind: "paragraph", text: p };
        insertBlockAfter(after, b, false);
        after = b.id;
      }
    }
    // Single-line text falls through to default contentEditable paste behaviour.
  }, [file?.projectId, insertBlockAfter]);

  if (!doc) {
    return (
      <div style={{ padding: 24, color: colors.textDim, fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  const openCodeBlock = openCodeBlockId
    ? (doc.blocks.find((b) => b.id === openCodeBlockId && b.kind === "code") as Extract<Block, { kind: "code" }> | undefined)
    : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <header style={{
        padding: "12px 24px", borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <button
          onClick={onBack}
          title="Back"
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 9px", borderRadius: 5,
            fontSize: 11, color: colors.textDim,
            border: `1px solid ${colors.border}`, backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = colors.textMain; e.currentTarget.style.backgroundColor = colors.bgCardHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = colors.textDim; e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          <ArrowLeft size={12} /> Back
        </button>
        <h1 style={{ flex: 1, fontSize: 16, fontWeight: 600, color: colors.textMain, padding: "4px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file?.name ?? "untitled"}
        </h1>
        {project && (
          <span style={{
            fontSize: 11, color: project.color,
            background: `${project.color}1a`, padding: "3px 8px", borderRadius: 3,
          }}>
            {project.name}
          </span>
        )}
        <SaveIndicator state={saveState} err={saveErr} />
      </header>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <div style={{ flex: 1, overflow: "auto", padding: "32px 0" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 32px", display: "flex", flexDirection: "column", gap: 6 }}>
            {doc.blocks.map((b) => (
              <BlockView
                key={b.id}
                block={b}
                slashOpen={slashFor === b.id}
                openSlash={() => setSlashFor(b.id)}
                closeSlash={() => setSlashFor((s) => s === b.id ? null : s)}
                shouldFocus={focusBlockId.current === b.id}
                clearFocus={() => { if (focusBlockId.current === b.id) focusBlockId.current = null; }}
                onChange={(patch) => updateBlock(b.id, patch)}
                onReplace={(block) => replaceBlock(b.id, block)}
                onDelete={() => deleteBlock(b.id)}
                onInsertAfter={(block) => insertBlockAfter(b.id, block)}
                onPaste={(e) => handlePaste(e, b.id)}
                onOpenCode={() => setOpenCodeBlockId(b.id)}
              />
            ))}
            <button
              onClick={() => insertBlockAfter(null, { id: newBlockId(), kind: "paragraph", text: "" })}
              style={{
                marginTop: 6, padding: "6px 0", textAlign: "left",
                color: colors.textFaint, fontSize: 12,
                borderTop: `1px dashed ${colors.border}`,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = colors.textDim)}
              onMouseLeave={(e) => (e.currentTarget.style.color = colors.textFaint)}
            >
              + click to add a block · paste anything
            </button>
          </div>
        </div>

        {/* Code side panel */}
        {openCodeBlock && (
          <CodeSidePanel
            block={openCodeBlock}
            onChange={(patch) => updateBlock(openCodeBlock.id, patch)}
            onClose={() => setOpenCodeBlockId(null)}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Block view ---------- */

interface BlockViewProps {
  block: Block;
  slashOpen: boolean;
  openSlash: () => void;
  closeSlash: () => void;
  shouldFocus: boolean;
  clearFocus: () => void;
  onChange: (patch: Partial<Block>) => void;
  onReplace: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: (block: Block) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onOpenCode: () => void;
}

function BlockView(p: BlockViewProps) {
  const { block } = p;
  if (block.kind === "image") return <ImageBlockView block={block} onDelete={p.onDelete} />;
  if (block.kind === "code") return <CodeChipView block={block} onOpen={p.onOpenCode} onDelete={p.onDelete} />;
  return <TextBlockView {...p} />;
}

function TextBlockView({
  block, slashOpen, openSlash, closeSlash, shouldFocus, clearFocus,
  onChange, onReplace, onDelete, onInsertAfter, onPaste,
}: BlockViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHeading = block.kind === "heading";
  const text = (block as Extract<Block, { kind: "paragraph" | "heading" }>).text;

  // Sync DOM only when external text changes; avoid clobbering caret while typing.
  useEffect(() => {
    if (ref.current && ref.current.innerText !== text) {
      ref.current.innerText = text;
    }
  }, [text]);

  useEffect(() => {
    if (shouldFocus && ref.current) {
      ref.current.focus();
      // Place caret at end
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      clearFocus();
    }
  }, [shouldFocus, clearFocus]);

  const onInput = () => {
    const t = ref.current?.innerText ?? "";
    if (t.startsWith("/") && !slashOpen) openSlash();
    if (!t.startsWith("/") && slashOpen) closeSlash();
    onChange({ text: t } as Partial<Block>);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onInsertAfter({ id: newBlockId(), kind: "paragraph", text: "" });
      return;
    }
    if (e.key === "Backspace" && (ref.current?.innerText ?? "") === "") {
      e.preventDefault();
      onDelete();
      return;
    }
    if (e.key === "Escape" && slashOpen) {
      e.preventDefault();
      closeSlash();
    }
  };

  const applySlashCommand = (kind: "p" | "h1" | "h2" | "h3" | "code" | "image") => {
    closeSlash();
    if (kind === "image") {
      // Just remove the slash marker — image insertion is via paste in this MVP.
      onChange({ text: "" } as Partial<Block>);
      if (ref.current) ref.current.innerText = "";
      return;
    }
    if (kind === "code") {
      onReplace({ id: block.id, kind: "code", language: "ts", code: "" });
      return;
    }
    if (kind === "p") {
      onReplace({ id: block.id, kind: "paragraph", text: "" });
      return;
    }
    const level = kind === "h1" ? 1 : kind === "h2" ? 2 : 3;
    onReplace({ id: block.id, kind: "heading", level: level as 1 | 2 | 3, text: "" });
  };

  const fontSize = isHeading
    ? ((block as Extract<Block, { kind: "heading" }>).level === 1 ? 26 : (block as Extract<Block, { kind: "heading" }>).level === 2 ? 20 : 16)
    : 14;
  const fontWeight = isHeading ? 600 : 400;

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        spellCheck
        data-placeholder={isHeading ? "Heading" : "Type / for commands, or paste anything"}
        style={{
          fontSize, fontWeight, color: colors.textMain, lineHeight: 1.55,
          outline: "none", padding: "3px 0", minHeight: fontSize + 8,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}
      />
      {slashOpen && <SlashMenu apply={applySlashCommand} />}
    </div>
  );
}

function SlashMenu({ apply }: { apply: (k: "p" | "h1" | "h2" | "h3" | "code" | "image") => void }) {
  const items: Array<{ key: "p" | "h1" | "h2" | "h3" | "code" | "image"; label: string; icon: React.ReactNode; hint: string }> = [
    { key: "p", label: "Paragraph", icon: <Type size={12} />, hint: "Plain text" },
    { key: "h1", label: "Heading 1", icon: <Heading1 size={12} />, hint: "Big" },
    { key: "h2", label: "Heading 2", icon: <Heading2 size={12} />, hint: "Medium" },
    { key: "h3", label: "Heading 3", icon: <Heading3 size={12} />, hint: "Small" },
    { key: "code", label: "Code cell", icon: <Code2 size={12} />, hint: "Compact chip + side panel" },
    { key: "image", label: "Image", icon: <ImageIcon size={12} />, hint: "Or just paste an image" },
  ];
  return (
    <div style={{
      position: "absolute", top: "100%", left: 0, marginTop: 4,
      minWidth: 240, padding: 4,
      background: colors.bgCard, border: `1px solid ${colors.borderStrong}`,
      borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      zIndex: 30,
    }}>
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => apply(it.key)}
          className="lm-hoverable"
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "6px 8px", borderRadius: 4,
            color: colors.textMain, fontSize: 12, textAlign: "left",
          }}
        >
          <span style={{ color: colors.textDim }}>{it.icon}</span>
          <span style={{ flex: 1 }}>{it.label}</span>
          <span style={{ fontSize: 10, color: colors.textFaint }}>{it.hint}</span>
        </button>
      ))}
    </div>
  );
}

function CodeChipView({ block, onOpen, onDelete }: { block: Extract<Block, { kind: "code" }>; onOpen: () => void; onDelete: () => void }) {
  const lines = block.code.split(/\r?\n/).length;
  return (
    <div className="lm-hoverable" style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", borderRadius: 5,
      border: `1px solid ${colors.border}`, background: colors.bgPanel,
    }}>
      <Code2 size={14} style={{ color: colors.statusEarly }} />
      <button onClick={onOpen} style={{ flex: 1, textAlign: "left", color: colors.textMain, fontSize: 12 }}>
        <span style={{ fontFamily: "var(--font-data)", color: colors.statusEarly, marginRight: 8 }}>{block.language}</span>
        <span style={{ color: colors.textDim }}>
          {block.code.trim() ? `${lines} line${lines === 1 ? "" : "s"} · click to open` : "empty code cell · click to open"}
        </span>
      </button>
      <button onClick={onDelete} title="Delete" style={{ color: colors.textFaint, padding: 3 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = colors.statusMissed)}
        onMouseLeave={(e) => (e.currentTarget.style.color = colors.textFaint)}>
        <Trash2 size={11} />
      </button>
    </div>
  );
}

function ImageBlockView({ block, onDelete }: { block: Extract<Block, { kind: "image" }>; onDelete: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (block.assetPath.startsWith("data:")) {
      setSrc(block.assetPath);
      return;
    }
    if (!api.runningInTauri) {
      setErr("Asset only readable in app mode");
      return;
    }
    api.readAsset(block.assetPath)
      .then((b64) => {
        if (cancelled) return;
        const ext = block.assetPath.split(".").pop()?.toLowerCase() ?? "png";
        const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
        setSrc(`data:${mime};base64,${b64}`);
      })
      .catch((e) => { if (!cancelled) setErr(String(e)); });
    return () => { cancelled = true; };
  }, [block.assetPath]);

  return (
    <div style={{ position: "relative", padding: "4px 0" }}>
      {err ? (
        <div style={{
          padding: 12, fontSize: 12, color: colors.statusMissed,
          border: `1px solid ${colors.statusMissed}33`, borderRadius: 5,
        }}>Image failed to load: {err}</div>
      ) : src ? (
        <img src={src} alt={block.alt ?? ""} style={{ maxWidth: "100%", borderRadius: 5, display: "block" }} />
      ) : (
        <div style={{ height: 80, background: colors.bgPanel, borderRadius: 5 }} />
      )}
      <button
        onClick={onDelete}
        title="Delete image"
        style={{
          position: "absolute", top: 8, right: 8,
          padding: 4, borderRadius: 3,
          background: "rgba(0,0,0,0.5)", color: colors.textMain,
        }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

/* ---------- Code side panel ---------- */

function CodeSidePanel({
  block, onChange, onClose,
}: {
  block: Extract<Block, { kind: "code" }>;
  onChange: (patch: Partial<Block>) => void;
  onClose: () => void;
}) {
  return (
    <div style={{
      width: 420, borderLeft: `1px solid ${colors.borderStrong}`,
      background: colors.bgCard, display: "flex", flexDirection: "column",
      flexShrink: 0,
    }}>
      <div style={{
        padding: "10px 14px", borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Code2 size={13} style={{ color: colors.statusEarly }} />
        <input
          value={block.language}
          onChange={(e) => onChange({ language: e.target.value } as Partial<Block>)}
          style={{
            flex: 1, fontSize: 12, fontFamily: "var(--font-data)",
            color: colors.statusEarly, background: "transparent",
            padding: "4px 6px", border: `1px solid ${colors.border}`, borderRadius: 3,
          }}
        />
        <button onClick={onClose} style={{ color: colors.textDim, padding: 3 }}>
          <X size={14} />
        </button>
      </div>
      <textarea
        value={block.code}
        onChange={(e) => onChange({ code: e.target.value } as Partial<Block>)}
        spellCheck={false}
        style={{
          flex: 1, padding: 14, resize: "none",
          background: colors.bgMain, color: colors.textMain,
          fontFamily: "var(--font-data)", fontSize: 12, lineHeight: 1.6,
          border: "none", outline: "none",
        }}
      />
      <div style={{
        padding: "8px 14px", borderTop: `1px solid ${colors.border}`,
        fontSize: 11, color: colors.textFaint,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <AlertTriangle size={11} />
        Run / output is not yet wired — Phase 4 next iteration.
      </div>
    </div>
  );
}

/* ---------- Save indicator ---------- */

function SaveIndicator({ state, err }: { state: SaveState; err: string | null }) {
  if (state === "error") {
    return <span title={err ?? ""} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: colors.statusMissed }}>
      <AlertTriangle size={11} /> failed
    </span>;
  }
  if (state === "saving") {
    return <span style={{ fontSize: 11, color: colors.textFaint }}>saving…</span>;
  }
  if (state === "saved") {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: colors.statusDone }}>
      <Check size={11} /> saved
    </span>;
  }
  if (state === "dirty") {
    return <span style={{ fontSize: 11, color: colors.textFaint }}>•</span>;
  }
  return null;
}

/* ---------- Helpers ---------- */

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}
