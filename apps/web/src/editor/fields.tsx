import type { Localized } from '@pcybox/attackgraph-engine';
import { Plus, Trash2 } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { pick } from '../i18n/locales.ts';
import { useApp } from '../store.ts';

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field${wide ? ' field-wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  if (props.multiline) {
    return (
      <textarea
        className="input"
        rows={3}
        maxLength={500}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      className="input"
      maxLength={500}
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

/** Edits the text of the current language; other translations are kept. */
export function LocalizedInput(props: { value: Localized | undefined; onChange: (v: Localized) => void; multiline?: boolean }) {
  const locale = useApp((s) => s.locale);
  const current = props.value?.[locale] ?? '';
  return (
    <TextInput
      value={current}
      placeholder={pick(props.value, locale)}
      multiline={props.multiline}
      onChange={(v) => props.onChange({ ...(props.value ?? {}), [locale]: v })}
    />
  );
}

export function Select<T extends string>(props: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <select className="input" value={props.value} disabled={props.disabled} onChange={(e) => props.onChange(e.target.value as T)}>
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function NumberInput(props: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <input
      className="input input-number"
      type="number"
      inputMode="numeric"
      min={props.min}
      max={props.max}
      value={props.value}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isInteger(n) && n >= props.min && n <= props.max) props.onChange(n);
      }}
    />
  );
}

export function CheckList<T extends string>(props: {
  legend: string;
  options: readonly { value: T; label: string }[];
  values: readonly T[];
  onChange: (v: T[]) => void;
}) {
  const id = useId();
  return (
    <fieldset className="checklist" aria-labelledby={id}>
      <legend id={id} className="field-label">
        {props.legend}
      </legend>
      {props.options.map((o) => (
        <label key={o.value} className="check">
          <input
            type="checkbox"
            checked={props.values.includes(o.value)}
            onChange={(e) =>
              props.onChange(e.target.checked ? [...props.values, o.value] : props.values.filter((v) => v !== o.value))
            }
          />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="editor-section">
      <header className="editor-section-head">
        <h3>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

export function AddButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="btn btn-small" onClick={onClick} disabled={disabled}>
      <Plus size={14} aria-hidden="true" />
      {label}
    </button>
  );
}

export function RemoveButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="icon-btn icon-btn-small" onClick={onClick} aria-label={label} title={label} disabled={disabled}>
      <Trash2 size={14} />
    </button>
  );
}
