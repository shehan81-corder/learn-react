import { useState } from 'react';
import { KeyRound, RotateCcw } from 'lucide-react';

interface Person {
  id: string;
  name: string;
}

const INITIAL: Person[] = [
  { id: 'ava', name: 'Ava' },
  { id: 'ben', name: 'Ben' },
  { id: 'cy', name: 'Cy' },
];
const EXTRA = ['Dee', 'Eli', 'Fay', 'Gus'];

/** A row with its own uncontrolled input, so it has state React must keep somewhere. */
function Row({ person }: { person: Person }) {
  return (
    <li className="keys-row">
      <span className="keys-name">{person.name}</span>
      <input placeholder={`Note for ${person.name}`} aria-label={`Note for ${person.name}`} />
    </li>
  );
}

/**
 * Live React: the same list rendered twice, once keyed by index and once by
 * id. Type notes, then add or shuffle, and watch which list keeps them.
 */
export function KeysWidget() {
  const [people, setPeople] = useState(INITIAL);
  const [version, setVersion] = useState(0);

  const addTop = () => {
    const name = EXTRA[(people.length - INITIAL.length) % EXTRA.length];
    setPeople((p) => [{ id: `${name.toLowerCase()}-${p.length}`, name }, ...p]);
  };
  const reverse = () => setPeople((p) => [...p].reverse());
  const removeFirst = () => setPeople((p) => p.slice(1));
  const reset = () => {
    setPeople(INITIAL);
    setVersion((v) => v + 1);
  };

  return (
    <figure className="widget">
      <figcaption className="widget-title">
        <KeyRound size={16} /> Try it: index keys vs id keys (this is real React)
      </figcaption>
      <p className="widget-note">
        Type a different note next to each name in <strong>both</strong> lists. Then press <em>Add to top</em> or <em>Reverse</em>. With index keys the
        notes stay in place while the names move, so notes end up next to the wrong person.
      </p>
      <div className="row gap-sm wrap">
        <button type="button" className="btn btn-sm" onClick={addTop}>
          Add to top
        </button>
        <button type="button" className="btn btn-sm" onClick={reverse}>
          Reverse
        </button>
        <button type="button" className="btn btn-sm" onClick={removeFirst} disabled={people.length === 0}>
          Remove first
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={reset}>
          <RotateCcw size={14} /> Reset
        </button>
      </div>
      <div className="keys-columns" key={version}>
        <div>
          <div className="widget-label">
            <code>key={'{index}'}</code> <span className="badge badge-danger">buggy</span>
          </div>
          <ul className="keys-list">
            {people.map((p, index) => (
              <Row key={index} person={p} />
            ))}
          </ul>
        </div>
        <div>
          <div className="widget-label">
            <code>key={'{person.id}'}</code> <span className="badge badge-success">correct</span>
          </div>
          <ul className="keys-list">
            {people.map((p) => (
              <Row key={p.id} person={p} />
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}
