import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Code2, Image as ImageIcon, Heading1, Heading2, Heading3, Type, Trash2, X, AlertTriangle, Play, Square, Columns2, PanelRight, Loader2, GripVertical, Copy } from "lucide-react";
import { colors } from "../theme/tokens";
import { useStore } from "../store";
import * as api from "../api";
import { coerceDoc, emptyDoc, extractPreview, newBlockId, type Block, type BlockDoc } from "../editor/blocks";
import { highlight, detectLanguage } from "../editor/highlight";

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
  const [codePanelMode, setCodePanelMode] = useState<"side" | "split">("side");
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

  // Drag-to-reorder: `dragId` is the block being dragged, `dragOverId` is the
  // block currently under the cursor (used to render the drop indicator).
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const moveBlock = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    updateDoc((d) => {
      const blocks = d.blocks.slice();
      const fromIdx = blocks.findIndex((b) => b.id === sourceId);
      if (fromIdx < 0) return d;
      const [moved] = blocks.splice(fromIdx, 1);
      const toIdx = blocks.findIndex((b) => b.id === targetId);
      if (toIdx < 0) { blocks.push(moved); return { ...d, blocks }; }
      blocks.splice(toIdx, 0, moved);
      return { ...d, blocks };
    });
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
        <div style={{
          flex: codePanelMode === "split" && openCodeBlock ? "1 1 50%" : 1,
          minWidth: 0, overflow: "auto", padding: "24px 0",
        }}>
          <div style={{
            maxWidth: codePanelMode === "split" && openCodeBlock ? "100%" : 1100,
            margin: "0 auto",
            padding: "0 36px", display: "flex", flexDirection: "column", gap: 6,
          }}>
            {doc.blocks.map((b) => (
              <BlockRow
                key={b.id}
                blockId={b.id}
                isDragOver={dragOverId === b.id && dragId !== null && dragId !== b.id}
                onDragStart={() => setDragId(b.id)}
                onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                onDragOver={() => setDragOverId(b.id)}
                onDrop={() => {
                  if (dragId && dragId !== b.id) moveBlock(dragId, b.id);
                  setDragId(null); setDragOverId(null);
                }}
              >
                <BlockView
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
                  onDuplicate={(block) => insertBlockAfter(b.id, block)}
                />
              </BlockRow>
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
            mode={codePanelMode}
            onModeChange={setCodePanelMode}
            onChange={(patch) => updateBlock(openCodeBlock.id, patch)}
            onClose={() => setOpenCodeBlockId(null)}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Block row wrapper (drag handle + drop indicator) ---------- */

interface BlockRowProps {
  blockId: string;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  children: React.ReactNode;
}

function BlockRow({ isDragOver, onDragStart, onDragEnd, onDragOver, onDrop, children }: BlockRowProps) {
  // dataTransfer.types is `string[]` in modern browsers but `DOMStringList` in
  // some older ones — normalise via Array.from for safety.
  const isMonoBlockDrag = (dt: DataTransfer) => Array.from(dt.types).includes("application/x-mono-block");
  return (
    <div
      onDragOver={(e) => {
        if (isMonoBlockDrag(e.dataTransfer)) {
          // Allowing drop requires preventDefault here.
          e.preventDefault();
          onDragOver();
        }
      }}
      onDrop={(e) => {
        if (isMonoBlockDrag(e.dataTransfer)) {
          e.preventDefault();
          onDrop();
        }
      }}
      data-drag-over={isDragOver ? "true" : "false"}
      style={{
        position: "relative",
        display: "flex", alignItems: "flex-start",
        gap: 4,
      }}
      className="lm-block-row"
    >
      <button
        draggable
        onDragStart={(e) => {
          // Use a custom type so we don't conflict with image / file drags coming from outside.
          e.dataTransfer.setData("application/x-mono-block", "1");
          e.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        title="Drag to reorder"
        // No inline opacity — that beats the CSS :hover rule. Opacity is set in
        // index.css under `.lm-block-handle` (faint by default, full on hover).
        style={{
          flexShrink: 0,
          width: 22, height: 26,
          display: "grid", placeItems: "center",
          color: colors.textFaint,
          cursor: "grab",
          transition: "opacity 100ms, color 100ms",
          marginTop: 6,
          background: "transparent",
          touchAction: "none",
        }}
        className="lm-block-handle"
      >
        <GripVertical size={14} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
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
  onDuplicate: (block: Block) => void;
}

function BlockView(p: BlockViewProps) {
  const { block } = p;
  if (block.kind === "image") {
    return <ImageBlockView
      block={block}
      onChange={(patch) => p.onChange(patch)}
      onDelete={p.onDelete}
      onDuplicate={() => p.onDuplicate({ ...block, id: newBlockId() })}
    />;
  }
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
      onReplace({ id: block.id, kind: "code", language: "python", code: "" });
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

function ImageBlockView({ block, onChange, onDelete, onDuplicate }: {
  block: Extract<Block, { kind: "image" }>;
  onChange: (patch: Partial<Block>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const widthPct = block.widthPct ?? 100;

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

  // Drag the bottom-right corner to resize the image as a percentage of the editor column.
  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wrap = wrapperRef.current;
    if (!wrap) return;
    const parent = wrap.parentElement; // editor column
    if (!parent) return;
    const parentWidth = parent.getBoundingClientRect().width;
    const startX = e.clientX;
    const startPct = widthPct;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const next = Math.max(20, Math.min(100, startPct + (dx / parentWidth) * 100));
      onChange({ widthPct: Math.round(next) } as Partial<Block>);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <>
      <div
        ref={wrapperRef}
        style={{
          position: "relative", padding: "4px 0",
          width: `${widthPct}%`,
        }}
      >
        {err ? (
          <div style={{
            padding: 12, fontSize: 12, color: colors.statusMissed,
            border: `1px solid ${colors.statusMissed}33`, borderRadius: 5,
          }}>Image failed to load: {err}</div>
        ) : src ? (
          <img
            src={src}
            alt={block.alt ?? ""}
            onClick={() => setLightbox(true)}
            style={{
              width: "100%", borderRadius: 5, display: "block",
              cursor: "zoom-in",
            }}
          />
        ) : (
          <div style={{ height: 80, background: colors.bgPanel, borderRadius: 5 }} />
        )}
        <div style={{
          position: "absolute", top: 8, right: 8,
          display: "flex", gap: 4,
        }}>
          <button
            onClick={onDuplicate}
            title="Duplicate (keeps size)"
            style={{
              padding: 4, borderRadius: 3,
              background: "rgba(0,0,0,0.5)", color: colors.textMain,
            }}
          >
            <Copy size={12} />
          </button>
          <button
            onClick={onDelete}
            title="Delete image"
            style={{
              padding: 4, borderRadius: 3,
              background: "rgba(0,0,0,0.5)", color: colors.textMain,
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
        {/* Resize handle (bottom-right corner). Visible on hover via the wrapper class. */}
        <div
          onPointerDown={onResizeStart}
          title="Drag to resize"
          style={{
            position: "absolute", right: 0, bottom: 4,
            width: 14, height: 14,
            borderRight: `3px solid ${colors.borderStrong}`,
            borderBottom: `3px solid ${colors.borderStrong}`,
            cursor: "nwse-resize",
            opacity: 0.6,
          }}
        />
        <span style={{
          position: "absolute", left: 8, bottom: 8,
          padding: "1px 6px", borderRadius: 3,
          background: "rgba(0,0,0,0.55)", color: colors.textDim,
          fontSize: 9, fontFamily: "var(--font-data)",
          pointerEvents: "none",
        }}>
          {widthPct}%
        </span>
      </div>

      {lightbox && src && (
        <Lightbox src={src} alt={block.alt ?? ""} onClose={() => setLightbox(false)} />
      )}
    </>
  );
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.85)",
        display: "grid", placeItems: "center",
        padding: 32, cursor: "zoom-out",
      }}
    >
      <img
        src={src} alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "100%", maxHeight: "100%",
          borderRadius: 6, boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
          cursor: "default",
        }}
      />
      <button
        onClick={onClose}
        title="Close (Esc)"
        style={{
          position: "absolute", top: 18, right: 18,
          padding: 6, borderRadius: 4,
          background: "rgba(0,0,0,0.5)", color: colors.textMain,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

/* ---------- Code side panel (toolbar + highlighted editor + run + output) ---------- */

const PRESET_LANGS: Array<{ key: string; label: string }> = [
  { key: "python", label: "Python" },
  { key: "javascript", label: "JavaScript" },
  { key: "java", label: "Java" },
  { key: "shell", label: "Shell" },
];

interface CodeSidePanelProps {
  block: Extract<Block, { kind: "code" }>;
  mode: "side" | "split";
  onModeChange: (m: "side" | "split") => void;
  onChange: (patch: Partial<Block>) => void;
  onClose: () => void;
}

function CodeSidePanel({ block, mode, onModeChange, onChange, onClose }: CodeSidePanelProps) {
  const [run, setRun] = useState<{ status: "idle" | "running" | "ok" | "fail"; output?: api.RunOutput; err?: string }>({ status: "idle" });
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  // When the user types into the language tab manually, freeze auto-detection
  // for this cell — they explicitly picked something, don't second-guess.
  const userPickedLang = useRef(false);
  const detectTimer = useRef<number | null>(null);

  // Auto-detect language as the code changes. Debounced 400ms so we don't
  // thrash mid-keystroke. Skips when the user has manually picked a language.
  useEffect(() => {
    if (userPickedLang.current) return;
    if (detectTimer.current) window.clearTimeout(detectTimer.current);
    detectTimer.current = window.setTimeout(() => {
      const guess = detectLanguage(block.code);
      if (guess && guess !== block.language.trim().toLowerCase()) {
        onChange({ language: guess } as Partial<Block>);
      }
    }, 400);
    return () => { if (detectTimer.current) window.clearTimeout(detectTimer.current); };
  }, [block.code, block.language, onChange]);

  // Keep the highlighting overlay scrolled in sync with the textarea.
  const onScroll = () => {
    if (taRef.current && preRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  const onTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab inserts two spaces instead of changing focus.
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart, end = ta.selectionEnd;
      const next = block.code.slice(0, start) + "  " + block.code.slice(end);
      onChange({ code: next } as Partial<Block>);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
    }
  };

  const doRun = async () => {
    setRun({ status: "running" });
    try {
      // Browser fallback for JS so it works without Tauri / node installed.
      const langKey = block.language.trim().toLowerCase();
      if (!api.runningInTauri && (langKey === "javascript" || langKey === "js" || langKey === "node")) {
        const result = await runJsInBrowser(block.code);
        setRun({ status: result.exitCode === 0 ? "ok" : "fail", output: result });
        return;
      }
      if (!api.runningInTauri) {
        setRun({ status: "fail", err: "Code execution requires the desktop app (Tauri)." });
        return;
      }
      const out = await api.runCode({ language: block.language, source: block.code });
      setRun({ status: out.exitCode === 0 ? "ok" : "fail", output: out });
    } catch (e) {
      setRun({ status: "fail", err: String(e) });
    }
  };

  // The CSS class used by `<pre>` lines; matches the keys in highlight.ts → Token.kind.
  const tokens = highlight(block.language, block.code + "\n"); // trailing \n keeps overlay aligned

  // Width: side mode keeps a fixed pane on the right; split mode lets the panel share the width.
  const panelStyle: React.CSSProperties = mode === "split"
    ? { flex: "1 1 50%", minWidth: 0 }
    : { width: 480, flexShrink: 0 };

  return (
    <div style={{
      ...panelStyle,
      borderLeft: `1px solid ${colors.borderStrong}`,
      background: colors.bgCard,
      display: "flex", flexDirection: "column",
    }}>
      {/* Toolbar */}
      <div style={{
        padding: "8px 12px", borderBottom: `1px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
      }}>
        <Code2 size={13} style={{ color: colors.statusEarly, flexShrink: 0 }} />
        {/* Language tabs */}
        <div style={{ display: "inline-flex", gap: 2 }}>
          {PRESET_LANGS.map((l) => {
            const active = l.key === block.language.trim().toLowerCase();
            return (
              <button
                key={l.key}
                onClick={() => { userPickedLang.current = true; onChange({ language: l.key } as Partial<Block>); }}
                style={{
                  padding: "3px 9px", fontSize: 11, fontWeight: 500,
                  borderRadius: 3,
                  color: active ? colors.textMain : colors.textDim,
                  background: active ? colors.bgElev : "transparent",
                  border: `1px solid ${active ? colors.borderStrong : "transparent"}`,
                }}
              >
                {l.label}
              </button>
            );
          })}
          {/* Custom-language indicator when none of the presets match */}
          <input
            value={block.language}
            onChange={(e) => { userPickedLang.current = true; onChange({ language: e.target.value } as Partial<Block>); }}
            title="Language (auto-detected; type here to override)"
            style={{
              width: 72, marginLeft: 4,
              padding: "3px 6px", fontSize: 11,
              fontFamily: "var(--font-data)",
              color: colors.statusEarly,
              background: colors.bgPanel, border: `1px solid ${colors.border}`, borderRadius: 3,
            }}
          />
        </div>
        <span style={{ flex: 1 }} />
        {/* Run */}
        <button
          onClick={doRun}
          disabled={run.status === "running"}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 10px", fontSize: 11, fontWeight: 500, borderRadius: 4,
            color: colors.bgMain, background: colors.statusDone,
            opacity: run.status === "running" ? 0.6 : 1,
          }}
        >
          {run.status === "running" ? <Loader2 size={11} style={{ animation: "lm-spin 1s linear infinite" }} /> : <Play size={11} />}
          Run
        </button>
        {/* Layout toggle */}
        <button
          onClick={() => onModeChange(mode === "side" ? "split" : "side")}
          title={mode === "side" ? "Split screen" : "Dock to right"}
          style={{ padding: 4, color: colors.textDim, borderRadius: 3 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = colors.textMain)}
          onMouseLeave={(e) => (e.currentTarget.style.color = colors.textDim)}
        >
          {mode === "side" ? <Columns2 size={14} /> : <PanelRight size={14} />}
        </button>
        <button onClick={onClose} title="Close" style={{ padding: 4, color: colors.textDim, borderRadius: 3 }}>
          <X size={14} />
        </button>
      </div>

      {/* Editor (textarea + highlighted overlay) */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", background: colors.bgMain }}>
        <pre
          ref={preRef}
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            margin: 0, padding: 14,
            overflow: "auto",
            whiteSpace: "pre", fontFamily: "var(--font-data)", fontSize: 12, lineHeight: 1.6,
            pointerEvents: "none",
          }}
        >
          {tokens.map((t, i) => (
            <span key={i} className={`lm-syn-${t.kind}`}>{t.text}</span>
          ))}
        </pre>
        <textarea
          ref={taRef}
          value={block.code}
          onChange={(e) => onChange({ code: e.target.value } as Partial<Block>)}
          onKeyDown={onTextareaKeyDown}
          onScroll={onScroll}
          spellCheck={false}
          style={{
            position: "absolute", inset: 0,
            padding: 14, resize: "none",
            background: "transparent",
            color: "transparent", caretColor: colors.textMain,
            fontFamily: "var(--font-data)", fontSize: 12, lineHeight: 1.6,
            border: "none", outline: "none",
            whiteSpace: "pre",
          }}
        />
      </div>

      {/* Output */}
      <div style={{ borderTop: `1px solid ${colors.border}`, maxHeight: "40%", overflow: "auto" }}>
        {run.status === "idle" && (
          <div style={{ padding: "8px 14px", fontSize: 11, color: colors.textFaint, display: "flex", alignItems: "center", gap: 6 }}>
            <Square size={11} /> Press Run to execute. Requires the relevant runtime on your PATH (python3 / node / javac+java).
          </div>
        )}
        {run.status !== "idle" && run.output && (
          <RunOutputView output={run.output} status={run.status} />
        )}
        {run.status === "fail" && run.err && (
          <div style={{ padding: "8px 14px", fontSize: 11, color: colors.statusMissed, display: "flex", alignItems: "flex-start", gap: 6 }}>
            <AlertTriangle size={11} style={{ marginTop: 2 }} /> {run.err}
          </div>
        )}
      </div>
    </div>
  );
}

function RunOutputView({ output, status }: { output: api.RunOutput; status: "running" | "ok" | "fail" }) {
  const exit = output.exitCode ?? "?";
  return (
    <div style={{ padding: "8px 14px", fontFamily: "var(--font-data)", fontSize: 11, lineHeight: 1.5 }}>
      <div style={{
        display: "flex", gap: 12, fontSize: 10,
        color: status === "ok" ? colors.statusDone : status === "fail" ? colors.statusMissed : colors.textDim,
        marginBottom: 4,
      }}>
        <span>exit {exit}</span>
        <span>{output.durationMs}ms</span>
      </div>
      {output.stdout && (
        <pre style={{ whiteSpace: "pre-wrap", color: colors.textMain, margin: 0 }}>{output.stdout}</pre>
      )}
      {output.stderr && (
        <pre style={{ whiteSpace: "pre-wrap", color: colors.statusMissed, margin: 0, marginTop: output.stdout ? 6 : 0 }}>{output.stderr}</pre>
      )}
      {!output.stdout && !output.stderr && (
        <span style={{ color: colors.textFaint }}>(no output)</span>
      )}
    </div>
  );
}

// Browser fallback for JS — runs in an iframe sandbox, captures console.log + errors.
async function runJsInBrowser(source: string): Promise<api.RunOutput> {
  const started = performance.now();
  const out: string[] = [];
  const err: string[] = [];
  try {
    const fn = new Function("console", source);
    const proxyConsole = {
      log: (...a: unknown[]) => out.push(a.map(String).join(" ")),
      error: (...a: unknown[]) => err.push(a.map(String).join(" ")),
      warn: (...a: unknown[]) => err.push(a.map(String).join(" ")),
      info: (...a: unknown[]) => out.push(a.map(String).join(" ")),
    };
    const result = fn(proxyConsole);
    if (result !== undefined) out.push(String(result));
  } catch (e) {
    err.push(String(e));
  }
  return {
    stdout: out.join("\n"),
    stderr: err.join("\n"),
    exitCode: err.length ? 1 : 0,
    durationMs: Math.round(performance.now() - started),
  };
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
