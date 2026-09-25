import { validateLab, type Lab } from '@cslab/engine';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

/** Links stay short enough for chat apps and QR codes. Bigger labs are shared as files. */
export const MAX_LINK_PAYLOAD = 8000;
/** Hard limits when reading untrusted links. */
const MAX_READ_PAYLOAD = 200_000;
const MAX_JSON = 1_000_000;

export function encodeShareHash(lab: Lab, scenario: string): string | null {
  const payload = compressToEncodedURIComponent(JSON.stringify(lab));
  if (payload.length > MAX_LINK_PAYLOAD) return null;
  return `#lab=${payload}&s=${encodeURIComponent(scenario)}`;
}

export type DecodedShare =
  | { status: 'none' }
  | { status: 'invalid'; errors: string[] }
  | { status: 'ok'; lab: Lab; scenario: string | undefined };

/** Reads a lab from a URL fragment. The fragment never reaches any server. */
export function decodeShareHash(hash: string): DecodedShare {
  // Parsed by hand: URLSearchParams would turn the "+" of the compressed payload into spaces.
  const parts = new Map<string, string>();
  for (const part of hash.replace(/^#/, '').split('&')) {
    const i = part.indexOf('=');
    if (i > 0) parts.set(part.slice(0, i), part.slice(i + 1));
  }
  const payload = parts.get('lab');
  if (!payload) return { status: 'none' };
  if (payload.length > MAX_READ_PAYLOAD) return { status: 'invalid', errors: ['link too large'] };

  let json: string | null;
  try {
    json = decompressFromEncodedURIComponent(payload);
  } catch {
    json = null;
  }
  if (!json || json.length > MAX_JSON) return { status: 'invalid', errors: ['cannot read link'] };

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return { status: 'invalid', errors: ['not JSON'] };
  }
  const result = validateLab(data);
  if (!result.ok) return { status: 'invalid', errors: result.errors };

  let scenario: string | undefined;
  try {
    const s = parts.get('s');
    scenario = s === undefined ? undefined : decodeURIComponent(s);
  } catch {
    scenario = undefined;
  }
  return { status: 'ok', lab: result.lab, scenario };
}
