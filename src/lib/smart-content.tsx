// Renders a single admin-entered string as whichever of the three formats it
// actually is: an image (if it's a URL ending in an image extension), LaTeX
// (if it contains $...$ or $$...$$ delimiters, mixed freely with plain
// text), or plain text otherwise. Used for question bodies, all four
// options, and solutions — anywhere the spec calls for "text OR image URL OR
// LaTeX" in one field.
import katex from "katex";
import "katex/dist/katex.min.css";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const MATH_PATTERN = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;

export function renderMixedLatexHtml(value: string): string {
  let html = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  MATH_PATTERN.lastIndex = 0;

  while ((match = MATH_PATTERN.exec(value)) !== null) {
    html += escapeHtml(value.slice(lastIndex, match.index));
    const isDisplay = match[1] !== undefined;
    const expr = (match[1] ?? match[2] ?? "").trim();
    try {
      html += katex.renderToString(expr, { throwOnError: false, displayMode: isDisplay });
    } catch {
      html += escapeHtml(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }
  html += escapeHtml(value.slice(lastIndex));
  return html;
}

const IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i;

export function isImageUrl(value: string): boolean {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) && IMAGE_EXTENSION_PATTERN.test(trimmed);
}

export function SmartContent({ value, className }: { value: string; className?: string }) {
  const trimmed = value.trim();

  if (!trimmed) {
    return <p className={`italic text-foreground/30 ${className ?? ""}`}>Empty</p>;
  }

  if (isImageUrl(trimmed)) {
    return (
      <img
        src={trimmed}
        alt="Question asset"
        className={`max-h-48 rounded-xl object-contain ${className ?? ""}`}
      />
    );
  }

  if (trimmed.includes("$")) {
    return (
      <div className={className} dangerouslySetInnerHTML={{ __html: renderMixedLatexHtml(trimmed) }} />
    );
  }

  return <p className={className}>{trimmed}</p>;
}