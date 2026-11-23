import { Children, useMemo, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { safeMarkdownHref } from "@/lib/markdown";

export type MarkdownVariant = "compact" | "article";

interface MarkdownContentProps {
  content: string;
  variant?: MarkdownVariant;
  className?: string;
  /** Optional inline transformer applied only to prose text nodes (never code). */
  renderText?: (text: string) => ReactNode;
}

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

function mapTextChildren(
  children: ReactNode,
  renderText?: (text: string) => ReactNode,
): ReactNode {
  if (!renderText) return children;
  return Children.map(children, (child) =>
    typeof child === "string" ? renderText(child) : child,
  );
}

function buildComponents(
  variant: MarkdownVariant,
  renderText?: (text: string) => ReactNode,
): Components {
  const isArticle = variant === "article";
  const text = (children: ReactNode) => mapTextChildren(children, renderText);

  const h1Cls = isArticle
    ? "font-heading text-2xl font-bold text-tiby-ink mt-6 first:mt-0"
    : "font-heading text-base font-bold text-tiby-ink mt-3 first:mt-0";
  const h2Cls = isArticle
    ? "font-heading text-xl font-bold text-tiby-ink mt-6 first:mt-0"
    : "font-heading text-base font-semibold text-tiby-ink mt-3 first:mt-0";
  const h3Cls = isArticle
    ? "font-heading text-lg font-bold text-tiby-ink mt-5 first:mt-0"
    : "font-heading text-sm font-semibold text-tiby-ink mt-2.5 first:mt-0";
  const h4Cls = isArticle
    ? "font-heading text-base font-semibold text-tiby-ink mt-4 first:mt-0"
    : "font-heading text-sm font-semibold text-tiby-ink mt-2 first:mt-0";

  return {
    h1: ({ children }) => <h1 className={h1Cls}>{text(children)}</h1>,
    h2: ({ children }) => <h2 className={h2Cls}>{text(children)}</h2>,
    h3: ({ children }) => <h3 className={h3Cls}>{text(children)}</h3>,
    h4: ({ children }) => <h4 className={h4Cls}>{text(children)}</h4>,
    h5: ({ children }) => <h5 className={h4Cls}>{text(children)}</h5>,
    h6: ({ children }) => <h6 className={h4Cls}>{text(children)}</h6>,
    p: ({ children }) => <p className="leading-relaxed">{text(children)}</p>,
    strong: ({ children }) => (
      <strong className="font-semibold text-tiby-ink">{text(children)}</strong>
    ),
    em: ({ children }) => <em className="italic">{text(children)}</em>,
    del: ({ children }) => (
      <del className="line-through opacity-80">{text(children)}</del>
    ),
    ul: ({ children, className }) => {
      const isTaskList = className?.includes("contains-task-list");
      return (
        <ul
          className={
            isTaskList
              ? "list-none space-y-1 pl-0"
              : "list-disc space-y-1 pl-5 [&_ol]:mt-1 [&_ul]:mt-1"
          }
        >
          {children}
        </ul>
      );
    },
    ol: ({ children }) => (
      <ol className="list-decimal space-y-1 pl-5 [&_ol]:mt-1 [&_ul]:mt-1">
        {children}
      </ol>
    ),
    li: ({ children, className }) => {
      const isTaskItem = className?.includes("task-list-item");
      return (
        <li
          className={
            isTaskItem
              ? "list-none leading-relaxed [&>p]:my-0.5"
              : "leading-relaxed [&>p]:my-0.5"
          }
        >
          {text(children)}
        </li>
      );
    },
    blockquote: ({ children }) => (
      <blockquote className="rounded-r-xl border-l-2 border-tiby-teal-200 bg-tiby-teal-50/40 py-2 pl-3.5 pr-3 italic text-tiby-muted">
        {text(children)}
      </blockquote>
    ),
    hr: () => <hr className="my-3 border-gray-200" />,
    pre: ({ children }) => (
      <pre className="my-2 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-tiby-ink [&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">
        {children}
      </pre>
    ),
    code: ({ children }) => (
      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.85em] text-tiby-ink">
        {children}
      </code>
    ),
    table: ({ children }) => (
      <div className="my-2 overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full border-collapse text-left text-xs">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="border-b border-gray-200 bg-gray-50/80">
        {children}
      </thead>
    ),
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className="border-b border-gray-100 last:border-b-0">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 font-semibold text-tiby-ink">
        {text(children)}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 align-top">{text(children)}</td>
    ),
    a: ({ href, children }) => {
      const safeHref = safeMarkdownHref(href);
      if (!safeHref) return <span>{text(children)}</span>;
      const isExternal =
        safeHref.startsWith("https://") || safeHref.startsWith("http://");
      return (
        <a
          href={safeHref}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="font-medium text-tiby-teal-700 underline underline-offset-2 hover:text-tiby-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tiby-teal-600"
        >
          {text(children)}
        </a>
      );
    },
    img: ({ alt }) => (alt ? <span>{alt}</span> : null),
    input: ({ type, checked }) => {
      if (type !== "checkbox") return null;
      return (
        <input
          type="checkbox"
          checked={Boolean(checked)}
          readOnly
          disabled
          aria-label="Status item"
          className="mr-2 align-middle accent-tiby-teal-600"
        />
      );
    },
  };
}

/** XSS-safe CommonMark + GFM renderer (never interprets raw HTML). */
export default function MarkdownContent({
  content,
  variant = "compact",
  className = "",
  renderText,
}: MarkdownContentProps) {
  const components = useMemo(
    () => buildComponents(variant, renderText),
    [variant, renderText],
  );

  const rootCls =
    variant === "article"
      ? "space-y-4 text-base leading-relaxed text-tiby-muted"
      : "space-y-2.5 text-sm leading-relaxed text-tiby-ink";

  return (
    <div className={className ? `${rootCls} ${className}` : rootCls}>
      <Markdown remarkPlugins={REMARK_PLUGINS} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
