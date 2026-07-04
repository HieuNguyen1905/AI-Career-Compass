import { Fragment, ReactNode } from "react";

// Renderer Markdown tối giản, an toàn (React tự escape text) cho output của AI Coach:
// hỗ trợ in đậm **...**, inline `code`, link, danh sách, bảng, tiêu đề # và đoạn văn.

function shortUrlLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.length > 42 ? `${url.slice(0, 39)}...` : url;
  }
}

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function shouldAutoLinkDomain(domain: string, path: string): boolean {
  const normalized = domain.toLowerCase();
  if (["tp.hcm", "tp.hn"].includes(normalized)) {
    return false;
  }
  if (!path && domain === domain.toUpperCase()) {
    return false;
  }
  return true;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|(https?:\/\/[^\s)]+)|\b((?:[a-z0-9-]+\.)+[a-z]{2,})(\/[^\s)]*)?/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<Fragment key={`${keyPrefix}-t${i}`}>{text.slice(last, match.index)}</Fragment>);
    }
    if (match[1] !== undefined && match[2] !== undefined) {
      nodes.push(
        <a
          key={`${keyPrefix}-a${i}`}
          href={match[2]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-teal-700 underline decoration-teal-300 underline-offset-2 transition-colors hover:text-teal-900"
        >
          {match[1]}
        </a>
      );
    } else if (match[3] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-semibold text-slate-900">
          {match[3]}
        </strong>
      );
    } else if (match[4] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${i}`}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-violet-700"
        >
          {match[4]}
        </code>
      );
    } else if (match[5] !== undefined) {
      const url = match[5].replace(/[.,;:!?]+$/, "");
      nodes.push(
        <a
          key={`${keyPrefix}-u${i}`}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-teal-700 underline decoration-teal-300 underline-offset-2 transition-colors hover:text-teal-900"
        >
          {shortUrlLabel(url)}
        </a>
      );
    } else if (match[6] !== undefined) {
      const domain = match[6];
      const path = match[7] ?? "";
      if (shouldAutoLinkDomain(domain, path)) {
        const href = normalizeUrl(`${domain}${path}`);
        nodes.push(
          <a
            key={`${keyPrefix}-d${i}`}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-teal-700 underline decoration-teal-300 underline-offset-2 transition-colors hover:text-teal-900"
          >
            {domain}
          </a>
        );
      } else {
        nodes.push(<Fragment key={`${keyPrefix}-d${i}`}>{domain}</Fragment>);
      }
    }
    last = regex.lastIndex;
    i += 1;
  }
  if (last < text.length) {
    nodes.push(<Fragment key={`${keyPrefix}-t${i}`}>{text.slice(last)}</Fragment>);
  }
  return nodes;
}

type Block =
  | { type: "p"; lines: string[] }
  | { type: "ol"; items: { number: number; text: string }[] }
  | { type: "ul"; items: string[] }
  | { type: "h"; text: string }
  | { type: "hr" }
  | { type: "table"; headers: string[]; rows: string[][] };

function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.includes("|") && !isTableSeparator(trimmed);
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let para: string[] = [];
  let orderedCounter = 0;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "p", lines: para });
      para = [];
      orderedCounter = 0;
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      continue;
    }

    const ordered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
    const bullet = trimmed.match(/^[-*•]\s+(.*)$/);
    const heading = trimmed.match(/^#{1,4}\s+(.*)$/);
    const next = lines[index + 1]?.trim() ?? "";

    if (/^---+$/.test(trimmed)) {
      flushPara();
      orderedCounter = 0;
      blocks.push({ type: "hr" });
      continue;
    }

    if (isTableRow(trimmed) && isTableSeparator(next)) {
      flushPara();
      orderedCounter = 0;
      const headers = splitTableRow(trimmed);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && isTableRow(lines[index])) {
        const row = splitTableRow(lines[index]);
        rows.push(headers.map((_, cellIndex) => row[cellIndex] ?? ""));
        index += 1;
      }
      index -= 1;
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (heading) {
      flushPara();
      orderedCounter = 0;
      blocks.push({ type: "h", text: heading[1] });
    } else if (ordered) {
      flushPara();
      orderedCounter += 1;
      const prev = blocks[blocks.length - 1];
      const item = { number: orderedCounter, text: ordered[2] };
      if (prev && prev.type === "ol") prev.items.push(item);
      else blocks.push({ type: "ol", items: [item] });
    } else if (bullet) {
      flushPara();
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === "ul") prev.items.push(bullet[1]);
      else blocks.push({ type: "ul", items: [bullet[1]] });
    } else {
      para.push(trimmed);
    }
  }
  flushPara();
  return blocks;
}

export function MarkdownLite({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-2.5">
      {blocks.map((block, idx) => {
        if (block.type === "h") {
          return (
            <p key={idx} className="pt-1 font-display text-[15px] font-semibold text-slate-900">
              {renderInline(block.text, `h${idx}`)}
            </p>
          );
        }
        if (block.type === "hr") {
          return <hr key={idx} className="border-slate-200" />;
        }
        if (block.type === "table") {
          return (
            <div key={idx} className="my-3 max-w-full overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full border-collapse bg-white text-left text-[13px]">
                <thead className="bg-slate-50 text-[12px] uppercase text-slate-500">
                  <tr>
                    {block.headers.map((header, i) => (
                      <th key={i} className="border-b border-slate-200 px-3 py-2 font-bold">
                        {renderInline(header, `th${idx}-${i}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="align-top odd:bg-white even:bg-slate-50/60">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border-b border-slate-100 px-3 py-2 last:border-b-0">
                          {renderInline(cell, `td${idx}-${rowIndex}-${cellIndex}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === "ol") {
          return (
            <ol
              key={idx}
              start={block.items[0]?.number ?? 1}
              className="ml-1 list-inside list-decimal space-y-1 marker:font-semibold marker:text-violet-500"
            >
              {block.items.map((item, i) => (
                <li key={i} value={item.number}>
                  {renderInline(item.text, `ol${idx}-${i}`)}
                </li>
              ))}
            </ol>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={idx} className="ml-1 list-inside list-disc space-y-1 marker:text-violet-500">
              {block.items.map((item, i) => (
                <li key={i}>{renderInline(item, `ul${idx}-${i}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="leading-relaxed">
            {block.lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 ? <br /> : null}
                {renderInline(line, `p${idx}-${i}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
