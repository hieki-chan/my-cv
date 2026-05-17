import type { ReactNode } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type MarkdownRendererProps = {
  assetBase?: string;
  markdown: string;
};

type InlineToken =
  | { type: "code"; value: string }
  | { type: "link"; href: string; text: string }
  | { type: "strong"; value: string }
  | { type: "em"; value: string }
  | { type: "text"; value: string };

SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("ts", typescript);

const codeTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: "transparent",
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: "transparent",
    textShadow: "none",
  },
} as typeof oneDark;

function resolveMarkdownAsset(path: string, assetBase = "") {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("/") || path.startsWith("#")) {
    return path;
  }

  if (!assetBase) {
    return path;
  }

  return `${assetBase}/${path}`.replace(/\/{2,}/g, "/");
}

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const match = remaining.match(/(`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/);

    if (!match || match.index === undefined) {
      tokens.push({ type: "text", value: remaining });
      break;
    }

    if (match.index > 0) {
      tokens.push({ type: "text", value: remaining.slice(0, match.index) });
    }

    const value = match[0];

    if (value.startsWith("`")) {
      tokens.push({ type: "code", value: value.slice(1, -1) });
    } else if (value.startsWith("[")) {
      const linkMatch = value.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        tokens.push({ type: "link", text: linkMatch[1], href: linkMatch[2] });
      }
    } else if (value.startsWith("**")) {
      tokens.push({ type: "strong", value: value.slice(2, -2) });
    } else {
      tokens.push({ type: "em", value: value.slice(1, -1) });
    }

    remaining = remaining.slice(match.index + value.length);
  }

  return tokens;
}

function renderInline(text: string, assetBase?: string): ReactNode[] {
  return tokenizeInline(text).map((token, index) => {
    const key = `${token.type}-${index}`;

    if (token.type === "code") {
      return <code key={key}>{token.value}</code>;
    }

    if (token.type === "link") {
      return (
        <a
          href={resolveMarkdownAsset(token.href, assetBase)}
          key={key}
          rel="noreferrer"
          target={token.href.startsWith("#") ? undefined : "_blank"}
        >
          {token.text}
        </a>
      );
    }

    if (token.type === "strong") {
      return <strong key={key}>{token.value}</strong>;
    }

    if (token.type === "em") {
      return <em key={key}>{token.value}</em>;
    }

    return token.value;
  });
}

export default function MarkdownRenderer({ assetBase, markdown }: MarkdownRendererProps) {
  const blocks: ReactNode[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push(
        <SyntaxHighlighter
          className="markdown-code"
          codeTagProps={{
            style: {
              background: "transparent",
              border: 0,
              fontFamily: "var(--mono)",
              padding: 0,
              textShadow: "none",
            },
          }}
          customStyle={{
            background: "rgba(2, 3, 5, 0.86)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: 0,
            boxShadow: "none",
            fontFamily: "var(--mono)",
            fontSize: "0.9em",
            margin: "0 0 22px",
            padding: "18px",
          }}
          key={`code-${index}`}
          language={language || "text"}
          PreTag="div"
          style={codeTheme}
          wrapLongLines
        >
          {codeLines.join("\n")}
        </SyntaxHighlighter>,
      );
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
      blocks.push(<Tag key={`heading-${index}`}>{renderInline(heading[2], assetBase)}</Tag>);
      index += 1;
      continue;
    }

    const media = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (media) {
      const alt = media[1];
      const src = resolveMarkdownAsset(media[2], assetBase);
      const isVideo = /\.(mp4|webm|mov)$/i.test(src);

      blocks.push(
        <figure className="markdown-media" key={`media-${index}`}>
          {isVideo ? (
            <video controls playsInline src={src} />
          ) : (
            <img alt={alt} src={src} />
          )}
          {alt ? <figcaption>{alt}</figcaption> : null}
        </figure>,
      );
      index += 1;
      continue;
    }

    if (trimmed === "---") {
      blocks.push(<hr key={`hr-${index}`} />);
      index += 1;
      continue;
    }

    if (/^>\s+/.test(trimmed)) {
      const quoteLines: string[] = [];

      while (index < lines.length && /^>\s+/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s+/, ""));
        index += 1;
      }

      blocks.push(<blockquote key={`quote-${index}`}>{renderInline(quoteLines.join(" "), assetBase)}</blockquote>);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }

      blocks.push(
        <ul key={`ul-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{renderInline(item, assetBase)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }

      blocks.push(
        <ol key={`ol-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{renderInline(item, assetBase)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index].trim();

      if (
        !nextLine ||
        nextLine.startsWith("```") ||
        /^(#{1,6})\s+/.test(nextLine) ||
        /^!\[[^\]]*\]\([^)]+\)$/.test(nextLine) ||
        /^[-*]\s+/.test(nextLine) ||
        /^\d+\.\s+/.test(nextLine) ||
        /^>\s+/.test(nextLine) ||
        nextLine === "---"
      ) {
        break;
      }

      paragraphLines.push(nextLine);
      index += 1;
    }

    blocks.push(<p key={`p-${index}`}>{renderInline(paragraphLines.join(" "), assetBase)}</p>);
  }

  return <div className="markdown-body">{blocks}</div>;
}
