import type { Lab, SimResult } from '@cslab/engine';

export interface SimRequest {
  id: number;
  lab: Lab;
  scenario: string;
}

export type SimResponse =
  | { id: number; ok: true; result: SimResult; baseline: SimResult }
  | { id: number; ok: false; error: string };

export interface SimOutput {
  result: SimResult;
  baseline: SimResult;
}
