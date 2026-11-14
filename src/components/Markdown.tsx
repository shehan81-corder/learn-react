import { createContext, memo, useContext, useState, type ComponentProps, type ComponentType, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

interface HastNode {
  type: string;
  value?: string;
  children?: HastNode[];
}

function toText(node: HastNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(toText).join('');
}

/**
 * Interactive widgets that lesson Markdown can embed with a fenced block:
 *
 *   ```widget
 *   vdom-diff
 *   ```
 *
 * Pages that use widgets provide the registry, so widget code is only bundled
 * with those pages.
 */
export const MarkdownWidgets = createContext<Record<string, ComponentType>>({});

function Pre(props: ComponentProps<'pre'> & { node?: HastNode }) {
  const widgets = useContext(MarkdownWidgets);
  const lang = /language-(\w+)/.exec(String((props.node?.children?.[0] as { properties?: { className?: string[] } } | undefined)?.properties?.className?.join(' ') ?? ''))?.[1];
  if (lang === 'widget') {
    const name = toText(props.node).trim();
    const Widget = widgets[name];
    return Widget ? <Widget /> : <p className="muted">[Interactive demo “{name}” is not available here.]</p>;
  }
  return <CodeBlock {...props} lang={lang} />;
}

function CodeBlock({ node, children, lang, ...rest }: ComponentProps<'pre'> & { node?: HastNode; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const text = toText(node);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="codeblock">
      <div className="codeblock-bar">
        <span className="codeblock-lang">{lang ?? 'code'}</span>
        <button type="button" className="btn btn-ghost btn-xs" onClick={copy} aria-label="Copy code">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre {...rest}>{children}</pre>
    </div>
  );
}

function Anchor({ href, children, ...rest }: ComponentProps<'a'>) {
  const external = !!href && /^https?:\/\//.test(href);
  return (
    <a href={href} {...rest} {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}>
      {children}
    </a>
  );
}

const components = {
  pre: Pre as unknown as (props: ComponentProps<'pre'>) => ReactNode,
  a: Anchor,
};

export const Markdown = memo(function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`md ${className ?? ''}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
});
