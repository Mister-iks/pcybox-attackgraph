import type { Localized, Message, SimEvent } from '@cslab/engine';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useApp } from '../store.ts';
import { pick } from './locales.ts';

/** Turns engine messages (ids and values) into localized sentences for the current lab. */
export function useFormat() {
  const intl = useIntl();
  const lab = useApp((s) => s.lab);
  const locale = intl.locale;

  return useMemo(() => {
    const byId = <T extends { id: string; label: Localized }>(items: T[]) => new Map(items.map((i) => [i.id, i]));
    const nodes = byId(lab.nodes);
    const zones = byId(lab.zones);
    const identities = byId(lab.identities);
    const assets = byId(lab.assets);
    const controls = byId(lab.controls);
    const listFormat = new Intl.ListFormat(locale, { type: 'conjunction' });
    const t = (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values);

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
  }, [intl, lab, locale]);
}

export type Formatter = ReturnType<typeof useFormat>;
