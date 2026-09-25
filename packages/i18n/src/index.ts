import type { Lab, Localized, Message, SimEvent } from '@pcybox/attackgraph-engine';

/** Formats one ICU message by id. The app passes react-intl, the command line tool passes intl-messageformat. */
export type Translate = (id: string, values?: Record<string, string | number>) => string;

/** Picks the best translation of a lab text, falling back to English, then to any language. */
export function pick(text: Localized | undefined, locale: string): string {
  if (!text) return '';
  return text[locale] ?? text[locale.split('-')[0] ?? ''] ?? text.en ?? Object.values(text)[0] ?? '';
}

/** Turns engine messages (ids and values) into localized sentences for a lab. */
export function createLabFormatter(lab: Lab, locale: string, t: Translate) {
  const byId = <T extends { id: string; label: Localized }>(items: T[]) => new Map(items.map((i) => [i.id, i]));
  const nodes = byId(lab.nodes);
  const zones = byId(lab.zones);
  const identities = byId(lab.identities);
  const assets = byId(lab.assets);
  const controls = byId(lab.controls);
  const listFormat = new Intl.ListFormat(locale, { type: 'conjunction' });

  const label = {
    node: (id: string) => pick(nodes.get(id)?.label, locale) || id,
    zone: (id: string) => pick(zones.get(id)?.label, locale) || id,
    identity: (id: string) => pick(identities.get(id)?.label, locale) || id,
    asset: (id: string) => pick(assets.get(id)?.label, locale) || id,
    control: (id: string) => pick(controls.get(id)?.label, locale) || id,
  };

  const resolve = (params: Record<string, string>): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      switch (key) {
        case 'node':
        case 'from':
        case 'to':
          out[key] = label.node(value);
          break;
        case 'zone':
        case 'fromZone':
        case 'toZone':
          out[key] = label.zone(value);
          break;
        case 'identity':
          out[key] = label.identity(value);
          break;
        case 'asset':
          out[key] = listFormat.format(value.split(',').map(label.asset));
          break;
        case 'control':
          out[key] = label.control(value);
          break;
        case 'weakness':
          out[key] = t(`weakness.${value}`);
          break;
        case 'level':
          out[key] = t(`level.${value}`);
          break;
        case 'kind':
          out[key] = t(`serviceKind.${value}`);
          break;
        default:
          out[key] = value;
      }
    }
    return out;
  };

  return {
    t,
    label,
    text: (value: Localized | undefined) => pick(value, locale),
    list: (items: string[]) => (items.length ? listFormat.format(items) : ''),
    message: (m: Message) => t(m.key, resolve(m.params)),
    event: (e: SimEvent) => t(`technique.${e.technique}.${e.result}`, resolve(e.params)),
  };
}

export type LabFormatter = ReturnType<typeof createLabFormatter>;
