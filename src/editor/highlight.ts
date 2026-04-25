// Tiny regex-based syntax highlighter for the code-cell side panel.
//
// Avoids pulling Prism/Shiki/highlight.js. Returns spans with a CSS class so
// styling lives in index.css (`.lm-syn-*`). Unknown languages fall through
// to plain text.

export type Token = { kind: "kw" | "str" | "com" | "num" | "fn" | "type" | "txt"; text: string };

const PY_KW = /\b(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/;
const JS_KW = /\b(abstract|as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|from|function|if|implements|import|in|instanceof|interface|let|new|null|of|private|protected|public|return|static|super|switch|this|throw|true|try|type|typeof|undefined|var|void|while|with|yield)\b/;
const JAVA_KW = /\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|false|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|null|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|true|try|void|volatile|while|var|record|yield)\b/;
const SHELL_KW = /\b(if|then|else|elif|fi|for|in|do|done|while|until|case|esac|function|return|export|local|readonly|set|unset|alias|cd|pwd|echo|read|exit|trap)\b/;

const PATTERNS: Record<string, Array<{ kind: Token["kind"]; re: RegExp }>> = {
  python: [
    { kind: "com", re: /#.*$/m },
    { kind: "str", re: /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
    { kind: "kw",  re: PY_KW },
    { kind: "num", re: /\b\d+(?:\.\d+)?\b/ },
    { kind: "fn",  re: /\b[a-zA-Z_][\w]*(?=\()/ },
  ],
  javascript: [
    { kind: "com", re: /\/\/[^\n]*|\/\*[\s\S]*?\*\//m },
    { kind: "str", re: /`(?:\\.|\$\{[^}]*\}|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
    { kind: "kw",  re: JS_KW },
    { kind: "num", re: /\b\d+(?:\.\d+)?\b/ },
    { kind: "fn",  re: /\b[a-zA-Z_$][\w$]*(?=\()/ },
  ],
  java: [
    { kind: "com", re: /\/\/[^\n]*|\/\*[\s\S]*?\*\//m },
    { kind: "str", re: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
    { kind: "kw",  re: JAVA_KW },
    { kind: "type", re: /\b[A-Z][A-Za-z0-9_]*\b/ },
    { kind: "num", re: /\b\d+(?:\.\d+)?[fLdD]?\b/ },
    { kind: "fn",  re: /\b[a-zA-Z_$][\w$]*(?=\()/ },
  ],
  shell: [
    { kind: "com", re: /#[^\n]*/m },
    { kind: "str", re: /"(?:\\.|[^"\\])*"|'(?:[^'])*'/ },
    { kind: "kw",  re: SHELL_KW },
  ],
};

const ALIASES: Record<string, keyof typeof PATTERNS> = {
  py: "python", python: "python",
  js: "javascript", javascript: "javascript", node: "javascript", ts: "javascript", typescript: "javascript",
  java: "java",
  sh: "shell", bash: "shell", shell: "shell",
};

/**
 * Sniffs the most likely language for a code snippet using cheap regex
 * heuristics. Returns one of the highlighter's supported languages, or null
 * if confidence is low. Used by the editor to auto-switch the language tab
 * when the user types or pastes code that clearly doesn't match the current
 * tab. Tweak the WEIGHTED_RULES table below to bias detection.
 */
export function detectLanguage(source: string): keyof typeof PATTERNS | null {
  const s = source.trim();
  if (s.length < 10) return null; // too short to be confident

  // Each rule contributes a numeric score to a language. The language with
  // the highest score (above MIN_SCORE) wins; ties → null.
  const scores: Record<keyof typeof PATTERNS, number> = {
    python: 0, javascript: 0, java: 0, shell: 0,
  };
  const bump = (lang: keyof typeof PATTERNS, by: number) => { scores[lang] += by; };

  // Python signals
  if (/^\s*def\s+\w+\s*\(/m.test(s)) bump("python", 4);
  if (/^\s*import\s+\w+/m.test(s) || /^\s*from\s+\w+\s+import\b/m.test(s)) bump("python", 3);
  if (/\bprint\s*\(/.test(s)) bump("python", 1);
  if (/^\s*class\s+\w+(\([\w.,\s]*\))?\s*:/m.test(s)) bump("python", 3);
  if (/^\s*if\s+__name__\s*==\s*['"]__main__['"]\s*:/m.test(s)) bump("python", 5);
  if (/:\s*$/.test(s.split("\n")[0]) && /^[ \t]+\S/m.test(s)) bump("python", 2); // colon-then-indent
  if (/\bself\b/.test(s)) bump("python", 2);
  if (/\bNone\b|\bTrue\b|\bFalse\b/.test(s)) bump("python", 1);
  if (/\bf["']/.test(s)) bump("python", 2);

  // JavaScript / TypeScript signals
  if (/\bfunction\s+\w+\s*\(/.test(s) || /\bfunction\s*\(/.test(s)) bump("javascript", 3);
  if (/\b(?:const|let|var)\s+\w+\s*=/.test(s)) bump("javascript", 3);
  if (/=>\s*[{(]?/.test(s)) bump("javascript", 2);
  if (/\bconsole\.log\s*\(/.test(s)) bump("javascript", 4);
  if (/\brequire\s*\(\s*['"]/.test(s)) bump("javascript", 3);
  if (/\bimport\s+.*\s+from\s+['"]/.test(s)) bump("javascript", 3);
  if (/\bexport\s+(default\s+)?/.test(s)) bump("javascript", 2);
  if (/\bawait\s+/.test(s)) bump("javascript", 1);

  // Java signals
  if (/\bpublic\s+class\s+\w+/.test(s)) bump("java", 5);
  if (/\bpublic\s+static\s+void\s+main\s*\(\s*String/.test(s)) bump("java", 5);
  if (/\bSystem\.out\.println\s*\(/.test(s)) bump("java", 4);
  if (/\bnew\s+[A-Z]\w*\s*\(/.test(s)) bump("java", 1);
  if (/\b(int|String|boolean|long|double|float)\s+\w+\s*[=;]/.test(s)) bump("java", 2);
  if (/\bextends\s+[A-Z]\w*/.test(s)) bump("java", 2);
  if (/\bimport\s+java\./.test(s)) bump("java", 4);

  // Shell signals
  if (/^#!\/(?:bin|usr)\/.*sh/m.test(s)) bump("shell", 5);
  if (/^\s*(?:if|for|while)\s+\[\[?/m.test(s)) bump("shell", 3);
  if (/\$\(/.test(s) || /\$\{/.test(s)) bump("shell", 1);
  if (/\b(echo|cd|ls|pwd|grep|awk|sed|cat|chmod|export)\b/.test(s)) bump("shell", 1);
  if (/^\s*\w+\s*=\s*[^=\n]/m.test(s) && !/[;{}]/.test(s)) bump("shell", 1);

  const MIN_SCORE = 4;
  let best: keyof typeof PATTERNS | null = null;
  let bestScore = 0;
  let tie = false;
  for (const k of Object.keys(scores) as Array<keyof typeof PATTERNS>) {
    if (scores[k] > bestScore) {
      best = k; bestScore = scores[k]; tie = false;
    } else if (scores[k] === bestScore && bestScore > 0) {
      tie = true;
    }
  }
  if (!best || bestScore < MIN_SCORE || tie) return null;
  return best;
}

export function highlight(language: string, source: string): Token[] {
  const lang = ALIASES[language.trim().toLowerCase()];
  const rules = lang ? PATTERNS[lang] : null;
  if (!rules || !source) return [{ kind: "txt", text: source }];

  // Build a single combined regex with named groups so we tokenise in one pass.
  // Each rule contributes a group; the first match wins.
  const combined = new RegExp(
    rules.map((r, i) => `(?<g${i}>${r.re.source})`).join("|"),
    "gm",
  );

  const out: Token[] = [];
  let lastIndex = 0;
  for (const m of source.matchAll(combined)) {
    if (m.index === undefined) continue;
    if (m.index > lastIndex) {
      out.push({ kind: "txt", text: source.slice(lastIndex, m.index) });
    }
    let chosen: Token["kind"] = "txt";
    for (let i = 0; i < rules.length; i++) {
      if ((m.groups as Record<string, string | undefined> | undefined)?.[`g${i}`] !== undefined) {
        chosen = rules[i].kind;
        break;
      }
    }
    out.push({ kind: chosen, text: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < source.length) out.push({ kind: "txt", text: source.slice(lastIndex) });
  return out;
}
