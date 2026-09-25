import { validateLab, type Lab } from '@pcybox/attackgraph-engine';

export const MAX_FILE_BYTES = 1_000_000;

export function downloadLab(lab: Lab): void {
  const blob = new Blob([`${JSON.stringify(lab, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${lab.id}.attackgraph.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ReadResult =
  | { ok: true; lab: Lab }
  | { ok: false; reason: 'tooLarge' | 'notJson' | 'invalid'; errors: string[] };

export async function readLabFile(file: File): Promise<ReadResult> {
  if (file.size > MAX_FILE_BYTES) return { ok: false, reason: 'tooLarge', errors: [] };
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { ok: false, reason: 'notJson', errors: [] };
  }
  const result = validateLab(data);
  return result.ok ? { ok: true, lab: result.lab } : { ok: false, reason: 'invalid', errors: result.errors };
}
