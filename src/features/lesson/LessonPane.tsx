import { useEffect, useRef, useState } from 'react';
import { BookMarked, CheckSquare, ExternalLink, NotebookPen, Square, Target } from 'lucide-react';
import type { Day } from '../../content/types.ts';
import { Markdown } from '../../components/Markdown.tsx';
import { progress, useProgress } from '../../state/progress.ts';
import { useDebouncedCallback } from '../../lib/hooks.ts';
import { CRM_NAME } from '../../config.ts';

export function LessonPane({ day }: { day: Day }) {
  const state = useProgress();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string>(day.sections[0]?.id ?? '');
  const checklist = state.crm[String(day.id)] ?? [];
  const noteSaved = state.notes[String(day.id)] ?? '';
  const [note, setNote] = useState(noteSaved);
  const saveNote = useDebouncedCallback((text: string) => progress.setNote(day.id, text), 500);

  useEffect(() => {
    setNote(state.notes[String(day.id)] ?? '');
    setActive(day.sections[0]?.id ?? '');
    scrollRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.id]);

  // Highlight the section currently in view.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const headings = Array.from(root.querySelectorAll<HTMLElement>('[data-section]'));
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive((visible[0].target as HTMLElement).dataset.section ?? '');
      },
      { root, rootMargin: '0px 0px -70% 0px', threshold: 0 },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [day.id]);

  const jump = (id: string) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-section="${id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
  };

  const navItems = [
    ...day.sections.map((s) => ({ id: s.id, title: s.title })),
    ...(day.crm ? [{ id: 'crm-step', title: `${CRM_NAME} step` }] : []),
    { id: 'references', title: 'References' },
    { id: 'notes', title: 'My notes' },
  ];

  return (
    <div className="lesson">
      <div className="lesson-nav" role="tablist" aria-label="Lesson sections">
        {navItems.map((item) => (
          <button key={item.id} type="button" className={`pill ${active === item.id ? 'is-active' : ''}`} onClick={() => jump(item.id)}>
            {item.title}
          </button>
        ))}
      </div>

      <div className="lesson-scroll" ref={scrollRef}>
        <section className="lesson-objectives">
          <h2 className="lesson-h2">
            <Target size={18} /> Today you will learn to
          </h2>
          <ul className="objectives">
            {day.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </section>

        {day.sections.map((section) => (
          <section key={section.id} className="lesson-section" data-section={section.id}>
            <h2 className="lesson-h2">{section.title}</h2>
            <Markdown>{section.markdown}</Markdown>
          </section>
        ))}

        {day.crm && (
          <section className="lesson-section crm-step" data-section="crm-step">
            <h2 className="lesson-h2">
              <span className="crm-badge">{CRM_NAME}</span> {day.crm.title}
            </h2>
            <Markdown>{day.crm.markdown}</Markdown>
            {day.crm.checklist.length > 0 && (
              <ul className="checklist">
                {day.crm.checklist.map((item, i) => {
                  const done = !!checklist[i];
                  return (
                    <li key={item}>
                      <button type="button" className={`check-item ${done ? 'is-done' : ''}`} onClick={() => progress.toggleCrmItem(day.id, i, day.crm!.checklist.length)} aria-pressed={done}>
                        {done ? <CheckSquare size={18} /> : <Square size={18} />}
                        <span>{item}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <section className="lesson-section" data-section="references">
          <h2 className="lesson-h2">
            <BookMarked size={18} /> Read more
          </h2>
          <p className="muted">Formal references for today's topics. Skim them now, or bookmark for when you get stuck.</p>
          <ul className="references">
            {day.references.map((ref) => (
              <li key={ref.url}>
                <a href={ref.url} target="_blank" rel="noreferrer noopener">
                  {ref.title} <ExternalLink size={12} />
                </a>
                {ref.note && <span className="muted"> — {ref.note}</span>}
              </li>
            ))}
          </ul>
        </section>

        <section className="lesson-section" data-section="notes">
          <h2 className="lesson-h2">
            <NotebookPen size={18} /> My notes
          </h2>
          <textarea
            className="notes"
            placeholder="Write what clicked, what confused you, or questions to look up later. Saved automatically in this browser."
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              saveNote(e.target.value);
            }}
            rows={6}
          />
        </section>
      </div>
    </div>
  );
}
