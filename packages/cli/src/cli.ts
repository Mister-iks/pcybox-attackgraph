#!/usr/bin/env node
/**
 * attackgraph: validate labs, simulate scenarios and compare controls from the command line.
 * Runs directly with Node.js 22.18+ (TypeScript type stripping), from the repository.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  simulate,
  validateLab,
  withControl,
  withoutControls,
  type Lab,
  type SimResult,
} from '@pcybox/attackgraph-engine';
import { createLabFormatter, type LabFormatter } from '@pcybox/attackgraph-i18n';
import en from '@pcybox/attackgraph-i18n/messages/en.json' with { type: 'json' };
import fr from '@pcybox/attackgraph-i18n/messages/fr.json' with { type: 'json' };
import { IntlMessageFormat } from 'intl-messageformat';

const MESSAGES: Record<string, Record<string, string>> = { en, fr };
const MAX_FILE_BYTES = 1_000_000;

export interface Io {
  out(line: string): void;
  err(line: string): void;
}

const USAGE = `Usage:
  attackgraph validate <lab.attackgraph.json | folder>...
  attackgraph list <lab>
  attackgraph simulate <lab> [--scenario <id>] [--enable <control,...>] [--all-controls]
                             [--format text|markdown|json] [--lang en|fr]
  attackgraph compare <lab> [--scenario <id>] [--enable <control,...>] [--all-controls] [--lang en|fr]

simulate uses the controls as saved in the lab, unless --enable or --all-controls is given.
compare shows the lab without any control next to the lab with the chosen controls.`;

class CliError extends Error {}

function readLab(path: string): Lab {
  let size: number;
  try {
    size = statSync(path).size;
  } catch {
    throw new CliError(`${path}: file not found`);
  }
  if (size > MAX_FILE_BYTES) throw new CliError(`${path}: file too large (1 MB maximum)`);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new CliError(`${path}: not valid JSON`);
  }
  const result = validateLab(data);
  if (!result.ok) throw new CliError(`${path}: invalid lab\n  ${result.errors.join('\n  ')}`);
  return result.lab;
}

function formatter(lab: Lab, lang: string): LabFormatter {
  const messages = MESSAGES[lang];
  if (!messages) throw new CliError(`unknown language "${lang}" (available: ${Object.keys(MESSAGES).join(', ')})`);
  const cache = new Map<string, IntlMessageFormat>();
  return createLabFormatter(lab, lang, (id, values) => {
    let format = cache.get(id);
    if (!format) {
      const source = messages[id] ?? en[id as keyof typeof en];
      if (source === undefined) return id;
      format = new IntlMessageFormat(source, lang);
      cache.set(id, format);
    }
    return String(format.format(values));
  });
}

function pickScenario(lab: Lab, id: string | undefined): string {
  if (id === undefined) return lab.scenarios[0]!.id;
  if (!lab.scenarios.some((s) => s.id === id)) {
    throw new CliError(`unknown scenario "${id}" (available: ${lab.scenarios.map((s) => s.id).join(', ')})`);
  }
  return id;
}

/** Applies --enable / --all-controls. Without them, the lab keeps its saved control states. */
function applyControls(lab: Lab, enable: string | undefined, all: boolean): Lab {
  if (all) return { ...lab, controls: lab.controls.map((c) => ({ ...c, enabled: true })) };
  if (enable === undefined) return lab;
  const ids = enable.split(',').map((s) => s.trim()).filter(Boolean);
  for (const id of ids) {
    if (!lab.controls.some((c) => c.id === id)) {
      throw new CliError(`unknown control "${id}" (available: ${lab.controls.map((c) => c.id).join(', ')})`);
    }
  }
  return ids.reduce((l, id) => withControl(l, id, true), withoutControls(lab));
}

function story(result: SimResult, f: LabFormatter, markdown: boolean): string[] {
  const lines: string[] = [];
  result.events.forEach((e, i) => {
    const mark = e.result === 'blocked' ? (markdown ? '**Blocked**' : '[blocked]') : '';
    const attack = `${e.attack.tacticName}, ${e.attack.technique}`;
    lines.push(markdown ? `${i + 1}. ${mark ? `${mark} ` : ''}${f.event(e)} _(${attack})_` : `${String(i + 1).padStart(2)}. ${mark ? `${mark} ` : ''}${f.event(e)} (${attack})`);
    const reasons = e.result === 'blocked' ? e.stoppedBy.map((b) => `${f.label.control(b.control)}: ${f.message(b.message)}`) : e.because.map(f.message);
    for (const r of reasons) lines.push(markdown ? `   - ${r}` : `      - ${r}`);
  });
  return lines;
}

function summary(result: SimResult, f: LabFormatter): string {
  let s = `${f.t(`outcome.${result.outcome}`)}: ${f.t('outcome.summary', {
    steps: result.metrics.steps,
    nodes: result.metrics.nodesCompromised,
    blocked: result.metrics.attemptsBlocked,
  })}`;
  if (result.containedAt.length > 0) s += `. ${f.t('outcome.containedAt', { nodes: f.list(result.containedAt.map(f.label.node)) })}`;
  return s;
}

/** Folders stand for every lab they contain, so no shell globbing is needed (Windows included). */
function expandFolders(paths: string[]): string[] {
  return paths.flatMap((p) => {
    try {
      if (!statSync(p).isDirectory()) return [p];
    } catch {
      return [p];
    }
    return readdirSync(p)
      .filter((f) => f.endsWith('.attackgraph.json'))
      .sort()
      .map((f) => join(p, f));
  });
}

function commandValidate(paths: string[], io: Io): number {
  const files = expandFolders(paths);
  if (files.length === 0) throw new CliError('validate needs at least one lab file or folder');
  let failed = 0;
  for (const file of files) {
    try {
      const lab = readLab(file);
      io.out(`ok  ${file} (${lab.nodes.length} elements, ${lab.scenarios.length} scenarios, ${lab.controls.length} controls)`);
    } catch (e) {
      if (!(e instanceof CliError)) throw e;
      failed++;
      io.err(`err ${e.message}`);
    }
  }
  return failed === 0 ? 0 : 1;
}

function commandList(lab: Lab, f: LabFormatter, io: Io): number {
  io.out(f.text(lab.meta.title));
  io.out('\nScenarios:');
  for (const s of lab.scenarios) io.out(`  ${s.id.padEnd(24)} ${f.text(s.label)}`);
  io.out('\nControls:');
  for (const c of lab.controls) io.out(`  ${c.id.padEnd(24)} ${c.enabled ? '[on] ' : '[off]'} ${f.text(c.label)}`);
  return 0;
}

function commandSimulate(lab: Lab, scenario: string, f: LabFormatter, format: string, io: Io): number {
  const result = simulate(lab, scenario);
  if (format === 'json') {
    io.out(JSON.stringify(result, null, 2));
    return 0;
  }
  const markdown = format === 'markdown';
  const s = lab.scenarios.find((x) => x.id === scenario)!;
  const enabled = lab.controls.filter((c) => c.enabled).map((c) => f.text(c.label));
  if (markdown) {
    io.out(`## ${f.text(lab.meta.title)}: ${f.text(s.label)}\n`);
    io.out(`**${summary(result, f)}**\n`);
    io.out(`${f.t('text.controls')}: ${enabled.length ? f.list(enabled) : '-'}\n`);
  } else {
    io.out(`${f.text(lab.meta.title)} / ${f.text(s.label)}`);
    io.out(`${f.t('text.controls')}: ${enabled.length ? f.list(enabled) : '-'}\n`);
  }
  for (const line of story(result, f, markdown)) io.out(line);
  if (!markdown) io.out(`\n${summary(result, f)}`);
  return 0;
}

function commandCompare(lab: Lab, scenario: string, f: LabFormatter, io: Io): number {
  const before = simulate(withoutControls(lab), scenario);
  const after = simulate(lab, scenario);
  const rows: [string, string, string][] = [
    [f.t('compare.outcome'), f.t(`outcome.${before.outcome}`), f.t(`outcome.${after.outcome}`)],
    [f.t('compare.steps'), String(before.metrics.steps), String(after.metrics.steps)],
    [f.t('compare.nodes'), String(before.metrics.nodesCompromised), String(after.metrics.nodesCompromised)],
    [f.t('compare.credentials'), String(before.metrics.credentialsStolen), String(after.metrics.credentialsStolen)],
    [f.t('compare.assets'), String(before.metrics.assetsReached), String(after.metrics.assetsReached)],
    [f.t('compare.blocked'), String(before.metrics.attemptsBlocked), String(after.metrics.attemptsBlocked)],
  ];
  const header: [string, string, string] = [f.t('compare.metric'), f.t('compare.before'), f.t('compare.after')];
  const widths = [0, 1, 2].map((i) => Math.max(...[header, ...rows].map((r) => r[i]!.length)));
  const line = (r: [string, string, string]) => r.map((c, i) => c.padEnd(widths[i]!)).join('   ');
  const enabled = lab.controls.filter((c) => c.enabled).map((c) => f.text(c.label));
  io.out(enabled.length ? f.t('compare.enabled', { controls: f.list(enabled) }) : f.t('compare.noneEnabled'));
  io.out('');
  io.out(line(header));
  for (const r of rows) io.out(line(r));
  return 0;
}

export function main(argv: string[], io: Io): number {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        scenario: { type: 'string', short: 's' },
        enable: { type: 'string', short: 'e' },
        'all-controls': { type: 'boolean' },
        format: { type: 'string', short: 'f', default: 'text' },
        lang: { type: 'string', short: 'l', default: 'en' },
        help: { type: 'boolean', short: 'h' },
      },
    });
    const [command, ...files] = positionals;
    if (values.help || !command) {
      io.out(USAGE);
      return values.help ? 0 : 2;
    }
    if (command === 'validate') return commandValidate(files, io);
    if (!['list', 'simulate', 'compare'].includes(command)) throw new CliError(`unknown command "${command}"\n\n${USAGE}`);
    if (files.length !== 1) throw new CliError(`${command} needs exactly one lab file`);
    if (!['text', 'markdown', 'json'].includes(values.format!)) throw new CliError(`unknown format "${values.format}"`);

    const saved = readLab(files[0]!);
    const f = formatter(saved, values.lang!);
    if (command === 'list') return commandList(saved, f, io);
    const lab = applyControls(saved, values.enable, values['all-controls'] ?? false);
    const scenario = pickScenario(lab, values.scenario);
    if (command === 'simulate') return commandSimulate(lab, scenario, formatter(lab, values.lang!), values.format!, io);
    return commandCompare(lab, scenario, formatter(lab, values.lang!), io);
  } catch (e) {
    if (e instanceof CliError || (e instanceof TypeError && 'code' in e)) {
      io.err(`attackgraph: ${e.message}`);
      return 2;
    }
    throw e;
  }
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2), {
    out: (l) => process.stdout.write(`${l}\n`),
    err: (l) => process.stderr.write(`${l}\n`),
  });
}
