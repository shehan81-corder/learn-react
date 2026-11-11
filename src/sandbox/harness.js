/* global __CONFIG__ */
// This file is injected verbatim into the sandbox iframe. It receives
// __CONFIG__ = { runId, mode, userCode, testCode, react: { react, domClient } }.
(function () {
  const cfg = __CONFIG__;
  const RUN_ID = cfg.runId;

  function post(msg) {
    try {
      parent.postMessage(Object.assign({ __lrt: true, runId: RUN_ID }, msg), '*');
    } catch (e) {
      /* ignore */
    }
  }

  // ---------- console capture ----------
  function fmt(v, depth) {
    depth = depth || 0;
    try {
      if (v === null) return 'null';
      if (v === undefined) return 'undefined';
      const t = typeof v;
      if (t === 'string') return depth ? JSON.stringify(v) : v;
      if (t === 'number' || t === 'boolean' || t === 'bigint') return String(v);
      if (t === 'symbol') return v.toString();
      if (t === 'function') return '[Function ' + (v.name || 'anonymous') + ']';
      if (v instanceof Error) return v.name + ': ' + v.message;
      if (v instanceof Element) return '<' + v.tagName.toLowerCase() + (v.id ? '#' + v.id : '') + '>';
      if (v instanceof Date) return v.toISOString();
      if (v instanceof RegExp) return v.toString();
      if (v instanceof Map) return 'Map(' + v.size + ') ' + fmt(Array.from(v.entries()), depth + 1);
      if (v instanceof Set) return 'Set(' + v.size + ') ' + fmt(Array.from(v.values()), depth + 1);
      if (v instanceof Promise) return 'Promise {<pending>}';
      if (depth > 3) return Array.isArray(v) ? '[Array]' : '{…}';
      if (Array.isArray(v)) return '[' + v.map((x) => fmt(x, depth + 1)).join(', ') + ']';
      const keys = Object.keys(v);
      if (!keys.length) return '{}';
      return '{ ' + keys.slice(0, 20).map((k) => k + ': ' + fmt(v[k], depth + 1)).join(', ') + (keys.length > 20 ? ', …' : '') + ' }';
    } catch (e) {
      return String(v);
    }
  }

  ['log', 'info', 'warn', 'error', 'debug'].forEach((level) => {
    const original = console[level].bind(console);
    console[level] = function () {
      const args = Array.prototype.slice.call(arguments);
      post({ type: 'console', level, text: args.map((a) => fmt(a)).join(' ') });
      original.apply(console, args);
    };
  });

  function cleanStack(stack) {
    if (!stack) return '';
    return String(stack)
      .split('\n')
      .map((l) => l.replace(/data:text\/javascript[^\s:]*/g, '<sandbox>'))
      .slice(0, 6)
      .join('\n');
  }

  window.addEventListener('error', (e) => {
    post({ type: 'error', message: e.message || String(e.error), stack: cleanStack(e.error && e.error.stack) });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    post({ type: 'error', message: (r && r.message) || String(r), stack: cleanStack(r && r.stack) });
  });

  // ---------- tiny test framework ----------
  const tests = [];
  function test(name, fn) {
    tests.push({ name: String(name), fn });
  }
  function deepEqual(a, b) {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false;
      for (const [k, v] of a) if (!b.has(k) || !deepEqual(v, b.get(k))) return false;
      return true;
    }
    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) return false;
      for (const v of a) if (!b.has(v)) return false;
      return true;
    }
    const ka = Object.keys(a).filter((k) => a[k] !== undefined);
    const kb = Object.keys(b).filter((k) => b[k] !== undefined);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }
  function show(v) {
    return fmt(v, 1);
  }
  class AssertionError extends Error {
    constructor(message) {
      super(message);
      this.name = 'AssertionError';
    }
  }
  function expect(actual) {
    function build(negate) {
      const check = (pass, msg) => {
        if (pass === negate) throw new AssertionError(negate ? msg.replace(/^Expected /, 'Did not expect ') : msg);
      };
      const m = {
        toBe: (exp) => check(Object.is(actual, exp), 'Expected ' + show(actual) + ' to be ' + show(exp)),
        toEqual: (exp) => check(deepEqual(actual, exp), 'Expected ' + show(actual) + ' to equal ' + show(exp)),
        toStrictEqual: (exp) => check(deepEqual(actual, exp), 'Expected ' + show(actual) + ' to strictly equal ' + show(exp)),
        toBeTruthy: () => check(!!actual, 'Expected ' + show(actual) + ' to be truthy'),
        toBeFalsy: () => check(!actual, 'Expected ' + show(actual) + ' to be falsy'),
        toBeNull: () => check(actual === null, 'Expected ' + show(actual) + ' to be null'),
        toBeUndefined: () => check(actual === undefined, 'Expected ' + show(actual) + ' to be undefined'),
        toBeDefined: () => check(actual !== undefined, 'Expected value to be defined'),
        toBeNaN: () => check(Number.isNaN(actual), 'Expected ' + show(actual) + ' to be NaN'),
        toBeTypeOf: (t) => check(typeof actual === t, 'Expected typeof ' + show(actual) + ' to be "' + t + '" but got "' + typeof actual + '"'),
        toBeInstanceOf: (C) => check(actual instanceof C, 'Expected value to be an instance of ' + (C && C.name)),
        toContain: (item) => {
          const ok = typeof actual === 'string' ? actual.includes(item) : Array.isArray(actual) ? actual.some((x) => deepEqual(x, item)) : actual && typeof actual.has === 'function' ? actual.has(item) : false;
          check(ok, 'Expected ' + show(actual) + ' to contain ' + show(item));
        },
        toContainEqual: (item) => check(Array.isArray(actual) && actual.some((x) => deepEqual(x, item)), 'Expected ' + show(actual) + ' to contain an item equal to ' + show(item)),
        toHaveLength: (n) => check(actual != null && actual.length === n, 'Expected length ' + n + ' but got ' + (actual == null ? actual : actual.length)),
        toHaveProperty: (path, value) => {
          const parts = String(path).split('.');
          let cur = actual;
          for (const p of parts) {
            if (cur == null || !(p in Object(cur))) return check(false, 'Expected object to have property "' + path + '"');
            cur = cur[p];
          }
          if (arguments.length > 1 && value !== undefined) check(deepEqual(cur, value), 'Expected property "' + path + '" to equal ' + show(value) + ' but got ' + show(cur));
          else check(true, '');
        },
        toBeGreaterThan: (n) => check(actual > n, 'Expected ' + show(actual) + ' to be greater than ' + n),
        toBeGreaterThanOrEqual: (n) => check(actual >= n, 'Expected ' + show(actual) + ' to be >= ' + n),
        toBeLessThan: (n) => check(actual < n, 'Expected ' + show(actual) + ' to be less than ' + n),
        toBeLessThanOrEqual: (n) => check(actual <= n, 'Expected ' + show(actual) + ' to be <= ' + n),
        toBeCloseTo: (n, digits) => {
          const d = digits === undefined ? 2 : digits;
          check(Math.abs(actual - n) < Math.pow(10, -d) / 2, 'Expected ' + show(actual) + ' to be close to ' + n);
        },
        toMatch: (re) => {
          const s = String(actual);
          const ok = re instanceof RegExp ? re.test(s) : s.includes(String(re));
          check(ok, 'Expected "' + s + '" to match ' + String(re));
        },
        toMatchObject: (exp) => {
          const sub = (a, b) => b && typeof b === 'object' ? Object.keys(b).every((k) => a != null && sub(a[k], b[k])) : deepEqual(a, b);
          check(sub(actual, exp), 'Expected ' + show(actual) + ' to match object ' + show(exp));
        },
        toThrow: (expected) => {
          let threw = false;
          let err;
          try {
            if (typeof actual !== 'function') throw new AssertionError('expect(...).toThrow needs a function, e.g. expect(() => fn()).toThrow()');
            actual();
          } catch (e) {
            if (e instanceof AssertionError && !negate) throw e;
            threw = true;
            err = e;
          }
          let ok = threw;
          if (threw && expected !== undefined) {
            const msg = err && err.message !== undefined ? String(err.message) : String(err);
            ok = expected instanceof RegExp ? expected.test(msg) : typeof expected === 'string' ? msg.includes(expected) : typeof expected === 'function' ? err instanceof expected : true;
          }
          check(ok, threw ? 'Expected error matching ' + show(expected) + ' but got "' + (err && err.message) + '"' : 'Expected function to throw');
        },
        toHaveBeenCalled: () => check(actual && actual.calls && actual.calls.length > 0, 'Expected mock function to have been called'),
        toHaveBeenCalledTimes: (n) => check(actual && actual.calls && actual.calls.length === n, 'Expected mock to be called ' + n + ' times but it was called ' + (actual && actual.calls ? actual.calls.length : 0) + ' times'),
        toHaveBeenCalledWith: function () {
          const args = Array.prototype.slice.call(arguments);
          check(actual && actual.calls && actual.calls.some((c) => deepEqual(c, args)), 'Expected mock to have been called with ' + show(args));
        },
      };
      return m;
    }
    const api = build(false);
    api.not = build(true);
    api.resolves = {
      toBe: async (e) => expect(await actual).toBe(e),
      toEqual: async (e) => expect(await actual).toEqual(e),
    };
    api.rejects = {
      toThrow: async (e) => {
        let threw = false;
        try {
          await actual;
        } catch (err) {
          threw = true;
          if (e !== undefined) expect(() => { throw err; }).toThrow(e);
        }
        if (!threw) throw new AssertionError('Expected promise to reject');
      },
    };
    return api;
  }
  function fn(impl) {
    const mock = function () {
      const args = Array.prototype.slice.call(arguments);
      mock.calls.push(args);
      return impl ? impl.apply(this, args) : undefined;
    };
    mock.calls = [];
    mock.mockClear = () => {
      mock.calls = [];
    };
    return mock;
  }

  // ---------- React testing helpers ----------
  // Capture the real timer functions: tests may replace the globals with fakes.
  const realSetTimeout = window.setTimeout.bind(window);
  const realClearTimeout = window.clearTimeout.bind(window);
  const realSetInterval = window.setInterval.bind(window);
  const RealDate = window.Date;
  const realClearInterval = window.clearInterval.bind(window);
  const sleep = (ms) => new Promise((r) => realSetTimeout(r, ms));

  // ---------- fake timers ----------
  // useFakeTimers() replaces setTimeout/setInterval so tests are deterministic
  // and are not slowed down by browsers throttling timers in hidden frames.
  // React's scheduler also schedules its work with setTimeout(0), so flush()
  // fires every fake timer that is already due (without moving the clock).
  let fake = null;
  function restoreTimers() {
    if (!fake) return;
    const state = fake;
    fake = null;
    window.setTimeout = realSetTimeout;
    window.clearTimeout = realClearTimeout;
    window.setInterval = realSetInterval;
    window.clearInterval = realClearInterval;
    window.Date = RealDate;
    // Hand still-pending timers back to the real clock. Libraries (React's scheduler
    // in particular) may be waiting on one of them; dropping it would wedge them forever.
    for (const t of state.timers.values()) {
      const remaining = Math.max(0, t.at - state.now);
      if (t.every) realSetTimeout(() => realSetInterval(() => t.fn(...t.args), t.every), remaining);
      else realSetTimeout(() => t.fn(...t.args), remaining);
    }
    state.timers.clear();
  }
  function useFakeTimers() {
    restoreTimers();
    // Fake ids live in their own range so a stray clearTimeout(fakeId) on a real clock is a no-op.
    const state = { now: 0, nextId: 1000000000, timers: new Map() };
    fake = state;
    const add = (fn, ms, args, every) => {
      const delay = Math.max(0, Number(ms) || 0);
      const t = { id: state.nextId++, at: state.now + delay, fn, args, every: every ? Math.max(1, delay) : 0 };
      state.timers.set(t.id, t);
      return t.id;
    };
    // Date follows the fake clock too (libraries such as TanStack Query decide freshness with Date.now()).
    const startMs = RealDate.now();
    const nowMs = () => startMs + state.now;
    function FakeDate(...args) {
      if (!new.target) return new RealDate(nowMs()).toString();
      return args.length === 0 ? new RealDate(nowMs()) : new RealDate(...args);
    }
    FakeDate.now = nowMs;
    FakeDate.parse = RealDate.parse;
    FakeDate.UTC = RealDate.UTC;
    FakeDate.prototype = RealDate.prototype;
    window.Date = FakeDate;
    window.setTimeout = (fn, ms, ...args) => add(fn, ms, args, false);
    window.setInterval = (fn, ms, ...args) => add(fn, ms, args, true);
    window.clearTimeout = window.clearInterval = (id) => {
      state.timers.delete(id);
    };
    // Fire the earliest timer that is due at or before `limit`. Returns false when none is due.
    const fireNext = (limit) => {
      const due = Array.from(state.timers.values())
        .filter((t) => t.at <= limit)
        .sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) return false;
      state.now = Math.max(state.now, due.at);
      if (due.every) due.at += due.every;
      else state.timers.delete(due.id);
      try {
        due.fn(...due.args);
      } catch (e) {
        reportError(e);
      }
      return true;
    };
    state.runDue = () => {
      for (let guard = 0; guard < 1000 && fireNext(state.now); guard++);
    };
    return {
      /** Move the fake clock forward, firing every timer that falls due, in order. */
      async advance(ms) {
        const target = state.now + ms;
        for (let guard = 0; guard < 10000 && fireNext(target); guard++) await flush();
        state.now = target;
        await flush();
      },
      /** How many timers are still scheduled. */
      pending: () => state.timers.size,
      now: () => state.now,
      restore: restoreTimers,
    };
  }

  // NOTE: do not use requestAnimationFrame here. Browsers pause it in hidden
  // iframes (the Preview tab is hidden while the Tests tab is showing), which
  // would make every React test hang. MessageChannel keeps ticking.
  const tick = () =>
    new Promise((r) => {
      const c = new MessageChannel();
      c.port1.onmessage = () => r();
      c.port2.postMessage(0);
    });
  // Timers are throttled (about 1 per second) in hidden iframes and background
  // tabs, so flush() deliberately uses only message-channel ticks. React's own
  // scheduler runs on MessageChannel, so a handful of ticks lets renders and
  // passive effects settle.
  async function flush() {
    for (let i = 0; i < 8; i++) {
      await tick();
      if (fake) fake.runDue();
    }
  }
  const mounted = [];
  let reactMods = null;
  async function loadReact() {
    if (!reactMods) {
      const [React, client] = await Promise.all([import(cfg.react.react), import(cfg.react.domClient)]);
      reactMods = { React, createRoot: client.createRoot };
    }
    return reactMods;
  }
  async function render(element) {
    const { createRoot } = await loadReact();
    const container = document.createElement('div');
    container.className = 'test-container';
    document.getElementById('test-root').appendChild(container);
    const root = createRoot(container);
    root.render(element);
    await flush();
    const api = {
      container,
      root,
      get text() {
        return container.textContent || '';
      },
      $: (sel) => container.querySelector(sel),
      $$: (sel) => Array.from(container.querySelectorAll(sel)),
      getByText: (txt) => {
        const all = Array.from(container.querySelectorAll('*'));
        const match = (el) => {
          const t = (el.textContent || '').trim();
          return typeof txt === 'string' ? t === txt : txt.test(t);
        };
        const leaf = all.filter((el) => match(el) && !Array.from(el.children).some(match));
        if (!leaf.length) throw new AssertionError('Could not find an element with text ' + show(txt) + '. Rendered text was: "' + (container.textContent || '').trim().slice(0, 200) + '"');
        return leaf[0];
      },
      queryByText: (txt) => {
        try {
          return api.getByText(txt);
        } catch (e) {
          return null;
        }
      },
      getByRole: (role, opts) => {
        const name = opts && opts.name;
        const roleSel = { button: 'button,[role=button]', textbox: 'input:not([type]),input[type=text],input[type=email],input[type=search],input[type=number],textarea,[role=textbox]', checkbox: 'input[type=checkbox]', link: 'a[href]', heading: 'h1,h2,h3,h4,h5,h6', list: 'ul,ol', listitem: 'li', combobox: 'select', option: 'option', img: 'img', table: 'table', row: 'tr' }[role] || '[role=' + role + ']';
        const els = Array.from(container.querySelectorAll(roleSel));
        // Text of a <label> without the form controls nested inside it (a select's options are not part of its name).
        const labelText = (label) => {
          const clone = label.cloneNode(true);
          clone.querySelectorAll('input,select,textarea,button').forEach((n) => n.remove());
          return clone.textContent.replace(/\s+/g, ' ');
        };
        const accName = (el) => (el.getAttribute('aria-label') || (el.labels && el.labels[0] && labelText(el.labels[0])) || el.getAttribute('placeholder') || el.textContent || el.getAttribute('alt') || '').trim();
        const found = name ? els.filter((el) => (name instanceof RegExp ? name.test(accName(el)) : accName(el) === name)) : els;
        if (!found.length) throw new AssertionError('Could not find a ' + role + (name ? ' named ' + show(name) : '') + '. Found: ' + els.map((e) => '"' + accName(e) + '"').join(', '));
        return found[0];
      },
      getAllByRole: (role) => api.$$({ button: 'button', listitem: 'li', row: 'tr', checkbox: 'input[type=checkbox]', textbox: 'input,textarea' }[role] || '[role=' + role + ']'),
      rerender: async (el) => {
        root.render(el);
        await flush();
      },
      unmount: () => {
        root.unmount();
        container.remove();
      },
    };
    mounted.push(api);
    return api;
  }
  function setNativeValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
  }
  async function click(el) {
    if (!el) throw new AssertionError('click(): element not found');
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await flush();
  }
  async function type(el, value) {
    if (!el) throw new AssertionError('type(): element not found');
    el.focus();
    setNativeValue(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
  }
  async function select(el, value) {
    return type(el, value);
  }
  async function check(el, checked) {
    if (!el) throw new AssertionError('check(): element not found');
    if (el.checked !== (checked === undefined ? !el.checked : checked)) el.click();
    await flush();
  }
  async function submit(form) {
    if (!form) throw new AssertionError('submit(): form not found');
    if (form.requestSubmit) form.requestSubmit();
    else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flush();
  }
  async function keyDown(el, key, extra) {
    el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key, bubbles: true, cancelable: true }, extra || {})));
    await flush();
  }
  async function cleanup() {
    // Unmount while fake timers are still installed, so effect cleanups clear the fake timers.
    while (mounted.length) {
      try {
        mounted.pop().unmount();
      } catch (e) {
        /* ignore */
      }
    }
    if (fake) await flush();
    restoreTimers();
  }

  Object.assign(globalThis, { test, it: test, expect, fn, render, flush, sleep, click, type, select, check, submit, keyDown, cleanup, useFakeTimers, AssertionError });

  // ---------- run ----------
  const toUrl = (code) => 'data:text/javascript;charset=utf-8,' + encodeURIComponent(code);
  const withTimeout = (p, ms, label) =>
    Promise.race([p, new Promise((_, rej) => realSetTimeout(() => rej(new Error(label + ' timed out after ' + ms / 1000 + 's')), ms))]);

  async function main() {
    post({ type: 'start' });
    // Load React (and its scheduler) BEFORE any test can install fake timers.
    // The scheduler captures setTimeout when it is first imported; if that
    // happened while fakes were installed it would keep a dead timer forever.
    if (cfg.mode === 'react') {
      try {
        await withTimeout(loadReact(), 20000, 'Loading React');
      } catch (e) {
        post({ type: 'error', phase: 'tests', message: 'Could not load React from the CDN. Check your connection. ' + ((e && e.message) || ''), stack: '' });
      }
    }
    let user = null;
    let userError = null;
    try {
      user = await withTimeout(import(toUrl(cfg.userCode)), 15000, 'Loading your code');
    } catch (e) {
      userError = e;
      post({ type: 'error', phase: 'user', message: (e && e.message) || String(e), stack: cleanStack(e && e.stack) });
    }
    // Expose the learner's module. Reading an export that does not exist throws a
    // helpful error instead of a vague "undefined is not a function".
    const mod = user || {};
    globalThis.user = new Proxy(mod, {
      get(target, prop) {
        if (typeof prop === 'symbol' || prop === 'then' || prop in target) return target[prop];
        throw new Error('Your code does not export "' + String(prop) + '". Add `export` in front of it (for example `export function ' + String(prop) + '(...)`) and keep the exact name.');
      },
      has(target, prop) {
        return prop in target;
      },
    });
    globalThis.userError = userError;

    // Auto-mount the default export (or `App`) in React mode when nothing rendered itself.
    // Only auto-mount the preview when no tests run: the preview's DOM would otherwise
    // share ids (label/for pairs) with the test containers and confuse queries.
    if (cfg.mode === 'react' && user && !userError && !cfg.testCode) {
      try {
        const root = document.getElementById('root');
        const Comp = typeof user.default === 'function' ? user.default : typeof user.App === 'function' ? user.App : null;
        await flush();
        if (Comp && root.childElementCount === 0) {
          const { React, createRoot } = await loadReact();
          createRoot(root).render(React.createElement(Comp));
          await flush();
        }
      } catch (e) {
        post({ type: 'error', phase: 'render', message: (e && e.message) || String(e), stack: cleanStack(e && e.stack) });
      }
    } else if (cfg.mode === 'script' && !cfg.testCode) {
      const root = document.getElementById('root');
      if (root && !root.childElementCount && !root.textContent.trim()) root.classList.add('empty');
    }

    if (cfg.testCode) {
      try {
        await withTimeout(import(toUrl(cfg.testCode)), 15000, 'Loading tests');
      } catch (e) {
        post({ type: 'error', phase: 'tests', message: 'The tests could not be loaded: ' + ((e && e.message) || String(e)), stack: cleanStack(e && e.stack) });
      }
      const results = [];
      for (const t of tests) {
        try {
          if (userError) throw new Error('Your code did not load: ' + (userError.message || String(userError)));
          await withTimeout(Promise.resolve().then(() => t.fn()), 5000, 'Test "' + t.name + '"');
          results.push({ name: t.name, status: 'pass' });
        } catch (e) {
          let message = (e && e.message) || String(e);
          if (e instanceof TypeError && /Cannot read propert(y|ies) of (null|undefined)/.test(message) && /reading '(textContent|className|value|click|getAttribute|querySelector|classList|disabled|checked|style|id|hidden|children|innerHTML|tagName|focus)'/.test(message)) {
            message += '\n\nHint: the test looked for an element on the page and did not find it. Check that your component renders the element the exercise asks for.';
          }
          results.push({ name: t.name, status: 'fail', message, stack: e instanceof AssertionError ? '' : cleanStack(e && e.stack) });
        } finally {
          await cleanup();
        }
        post({ type: 'progress', done: results.length, total: tests.length });
      }
      if (!tests.length) results.push({ name: 'No tests were registered', status: 'fail', message: 'The test file did not register any tests.' });
      post({ type: 'results', results });
    }
    post({ type: 'done' });
  }

  main().catch((e) => {
    post({ type: 'error', message: (e && e.message) || String(e), stack: cleanStack(e && e.stack) });
    post({ type: 'done' });
  });
})();
