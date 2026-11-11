import { useEffect, useRef, useState } from 'react';
import { Download, Moon, RotateCcw, Sun, Upload, X } from 'lucide-react';
import { progress, useProgress } from '../state/progress.ts';
import { useTheme } from '../state/theme.ts';
import { download } from '../lib/format.ts';
import { REPO_URL } from '../config.ts';

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [theme, toggleTheme] = useTheme();
  const state = useProgress();
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setConfirmReset(false);
      setMessage(null);
    }
  }, [open]);

  const passed = Object.values(state.exercises).filter((e) => e.status === 'passed').length;

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const result = progress.import(text);
    setMessage(result.ok ? 'Progress imported.' : `Import failed: ${result.error}`);
  };

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="dialog-body">
        <header className="dialog-header">
          <h2>Settings</h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <section className="settings-section">
          <h3>Appearance</h3>
          <button type="button" className="btn" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            Switch to {theme === 'dark' ? 'light' : 'dark'} mode
          </button>
        </section>

        <section className="settings-section">
          <h3>Progress</h3>
          <p className="muted">
            Your progress, code drafts and notes are saved in this browser's local storage. Export a backup to move it to another browser or device.
            {passed > 0 ? ` You have passed ${passed} exercise${passed === 1 ? '' : 's'} so far.` : ''}
          </p>
          <div className="row gap">
            <button type="button" className="btn" onClick={() => download(`learn-react-progress-${new Date().toISOString().slice(0, 10)}.json`, progress.export())}>
              <Download size={16} /> Export progress
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Import progress
            </button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
          </div>
          {message && <p className="notice">{message}</p>}
        </section>

        <section className="settings-section">
          <h3>Danger zone</h3>
          {confirmReset ? (
            <div className="row gap">
              <span>Reset all progress, drafts and notes?</span>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  progress.reset();
                  setConfirmReset(false);
                  setMessage('Progress reset.');
                }}
              >
                Yes, reset everything
              </button>
              <button type="button" className="btn" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" className="btn" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={16} /> Reset progress
            </button>
          )}
        </section>

        <footer className="dialog-footer muted">
          <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
            Source on GitHub
          </a>
          <span> · </span>
          <a href="/api-docs">Mock CRM API docs</a>
        </footer>
      </div>
    </dialog>
  );
}
