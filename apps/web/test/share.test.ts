import { withControl } from '@pcybox/attackgraph-engine';
import { compressToEncodedURIComponent } from 'lz-string';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LAB } from '../src/lab/templates.ts';
import { decodeShareHash, encodeShareHash } from '../src/lab/share.ts';

describe('share links', () => {
  it('round-trips a lab and its scenario', () => {
    const lab = withControl(DEFAULT_LAB, 'segmentation', true);
    const hash = encodeShareHash(lab, 'assumed-breach-web');
    expect(hash).not.toBeNull();
    const decoded = decodeShareHash(hash!);
    expect(decoded.status).toBe('ok');
    if (decoded.status !== 'ok') return;
    expect(decoded.lab).toEqual(lab);
    expect(decoded.scenario).toBe('assumed-breach-web');
  });

  it('keeps the template link short', () => {
    expect(encodeShareHash(DEFAULT_LAB, 'from-internet')!.length).toBeLessThan(4000);
  });

  it('ignores hashes without a lab', () => {
    expect(decodeShareHash('').status).toBe('none');
    expect(decodeShareHash('#section').status).toBe('none');
  });

  it('rejects corrupted or hostile payloads', () => {
    expect(decodeShareHash('#lab=%%%').status).toBe('invalid');
    expect(decodeShareHash(`#lab=${compressToEncodedURIComponent('{not json')}`).status).toBe('invalid');
    const hostile = { ...DEFAULT_LAB, nodes: [{ ...DEFAULT_LAB.nodes[0], zone: 'nowhere' }] };
    expect(decodeShareHash(`#lab=${compressToEncodedURIComponent(JSON.stringify(hostile))}`).status).toBe('invalid');
    expect(decodeShareHash(`#lab=${'A'.repeat(300_000)}`).status).toBe('invalid');
  });
});
