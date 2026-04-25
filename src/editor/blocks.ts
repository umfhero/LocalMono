// Block-document model for the unified note editor (Phase 4).
//
// A document is `{ id, blocks: Block[] }` written verbatim to
// `<data_dir>/files/<id>.json` by Rust. Add a new block kind by:
//   1. add a variant to `Block`,
//   2. handle it in pages/FileEditor.tsx renderBlock,
//   3. (if it has searchable text) include it in `extractPreview` below.

export type Block =
  | { id: string; kind: "paragraph"; text: string }
  | { id: string; kind: "heading"; level: 1 | 2 | 3; text: string }
  | { id: string; kind: "image"; assetPath: string; alt?: string }
  | { id: string; kind: "code"; language: string; code: string };

export interface BlockDoc {
  id: string;
  blocks: Block[];
}

export function newBlockId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyDoc(id: string): BlockDoc {
  return { id, blocks: [{ id: newBlockId(), kind: "paragraph", text: "" }] };
}

/** Validates and migrates a JSON value read from disk into a BlockDoc. */
export function coerceDoc(raw: unknown, fileId: string): BlockDoc {
  if (!raw || typeof raw !== "object") return emptyDoc(fileId);
  const obj = raw as Record<string, unknown>;
  const blocks = Array.isArray(obj.blocks) ? obj.blocks : [];
  const out: Block[] = [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    const block = b as Record<string, unknown>;
    const id = typeof block.id === "string" ? block.id : newBlockId();
    if (block.kind === "paragraph" && typeof block.text === "string") {
      out.push({ id, kind: "paragraph", text: block.text });
    } else if (block.kind === "heading" && typeof block.text === "string") {
      const level = block.level === 1 || block.level === 2 || block.level === 3 ? block.level : 2;
      out.push({ id, kind: "heading", level, text: block.text });
    } else if (block.kind === "image" && typeof block.assetPath === "string") {
      out.push({
        id, kind: "image", assetPath: block.assetPath,
        alt: typeof block.alt === "string" ? block.alt : undefined,
      });
    } else if (block.kind === "code" && typeof block.code === "string") {
      out.push({
        id, kind: "code",
        language: typeof block.language === "string" ? block.language : "text",
        code: block.code,
      });
    }
  }
  if (out.length === 0) out.push({ id: newBlockId(), kind: "paragraph", text: "" });
  return { id: fileId, blocks: out };
}

/** First non-empty text snippet, used for the file index `preview` field. */
export function extractPreview(doc: BlockDoc, max = 120): string {
  for (const b of doc.blocks) {
    if (b.kind === "paragraph" || b.kind === "heading") {
      const t = b.text.trim();
      if (t) return t.slice(0, max);
    }
    if (b.kind === "code") {
      const t = b.code.trim();
      if (t) return `<code> ${t.slice(0, max - 7)}`;
    }
  }
  return "";
}
