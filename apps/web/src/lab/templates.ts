import { validateLab, type Lab } from '@pcybox/attackgraph-engine';
import activeDirectory from '../../../../content/templates/active-directory.attackgraph.json';
import smallOffice from '../../../../content/templates/small-office.attackgraph.json';
import webApplication from '../../../../content/templates/web-application.attackgraph.json';

function load(data: unknown): Lab {
  const result = validateLab(data);
  if (!result.ok) throw new Error(`Invalid built-in template:\n${result.errors.join('\n')}`);
  return result.lab;
}

/** Built-in labs, from the simplest to the most advanced. */
export const TEMPLATES: readonly Lab[] = [load(webApplication), load(smallOffice), load(activeDirectory)];

export const DEFAULT_LAB: Lab = TEMPLATES[0]!;
