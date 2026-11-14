import { useEffect, useRef, useState } from 'react';
import { transform } from 'sucrase';
import { Braces } from 'lucide-react';

const SAMPLE = `<ul className="contacts">
  <li key="ava">Ava Lee</li>
  <li key="ben">
    Ben <Badge tone="vip" />
  </li>
</ul>`;

/**
 * Compiles a JSX expression with Sucrase (classic runtime, so the output shows
 * React.createElement calls), then evaluates it in a throwaway sandboxed
 * iframe with a fake createElement that returns plain objects. Learner code
 * never runs in the app's own page.
 */
function compile(jsx: string): { code: string } | { error: string } {
  try {
    const out = transform(`const element = (\n${jsx}\n);`, { transforms: ['jsx'], jsxRuntime: 'classic', production: true }).code;
    return { code: out.trim() };
  } catch (e) {
    return { error: (e as Error).message.replace(/\s*\(\d+:\d+\)$/, '') };
  }
}

function evaluatorDoc(code: string, components: string[]): string {
  const script = `
    const React = {
      createElement(type, config, ...children) {
        const { key = null, ...props } = config || {};
        if (children.length === 1) props.children = children[0];
        else if (children.length > 1) props.children = children;
        return { type, key, props };
      },
    };
    ${components.map((c) => `function ${c}() {}`).join('\n')}
    try {
      ${code}
      const json = JSON.stringify(element, (k, v) => (typeof v === 'function' ? 'ƒ ' + v.name : v), 2);
      parent.postMessage({ __jsxWidget: true, json }, '*');
    } catch (e) {
      parent.postMessage({ __jsxWidget: true, error: String(e && e.message || e) }, '*');
    }`;
  return `<!doctype html><script>${script.replace(/<\/script/gi, '<\\/script')}</script>`;
}

export function JsxWidget() {
  const [jsx, setJsx] = useState(SAMPLE);
  const [result, setResult] = useState<{ json?: string; error?: string }>({});
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const compiled = compile(jsx);
  const code = 'code' in compiled ? compiled.code : null;

  useEffect(() => {
    if (!code) return;
    const timer = setTimeout(() => {
      const components = [...new Set([...code.matchAll(/createElement\(([A-Z][\w$]*)/g)].map((m) => m[1]))];
      frameRef.current?.remove();
      const frame = document.createElement('iframe');
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.style.display = 'none';
      frame.srcdoc = evaluatorDoc(code, components);
      document.body.appendChild(frame);
      frameRef.current = frame;
    }, 250);
    return () => clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow || !e.data?.__jsxWidget) return;
      setResult({ json: e.data.json, error: e.data.error });
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      frameRef.current?.remove();
    };
  }, []);

  return (
    <figure className="widget">
      <figcaption className="widget-title">
        <Braces size={16} /> Try it: JSX → createElement → plain object
      </figcaption>
      <p className="widget-note">
        Edit the JSX (one expression). The middle panel is what the compiler produces; the right panel is the object those calls return. That object is a
        &ldquo;virtual DOM&rdquo; node. Capitalised tags such as <code>Badge</code> become a reference to a function, not a string.
      </p>
      <div className="jsx-widget">
        <div>
          <div className="widget-label">1. JSX you write</div>
          <textarea className="widget-code" value={jsx} onChange={(e) => setJsx(e.target.value)} spellCheck={false} aria-label="JSX source" rows={9} />
        </div>
        <div>
          <div className="widget-label">2. What the compiler outputs</div>
          <pre className="widget-out">{'error' in compiled ? `Syntax error: ${compiled.error}` : compiled.code}</pre>
        </div>
        <div>
          <div className="widget-label">3. The object it creates</div>
          <pre className="widget-out">{'error' in compiled ? '' : result.error ? `Error: ${result.error}` : result.json ?? '…'}</pre>
        </div>
      </div>
    </figure>
  );
}
