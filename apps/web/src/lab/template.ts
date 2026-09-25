import { validateLab, type Lab } from '@pcybox/attackgraph-engine';
import raw from '../../../../content/templates/web-application.attackgraph.json';

function load(data: unknown): Lab {
  const result = validateLab(data);
  if (!result.ok) throw new Error(`Invalid built-in template:\n${result.errors.join('\n')}`);
  return result.lab;
}

export const DEFAULT_LAB: Lab = load(raw);
