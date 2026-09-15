/** Terminal presentation. No dependencies — colour is just bytes. */

const useColour = process.env.NO_COLOR === undefined && process.stdout.isTTY !== false;

const code = (n: string) => (s: string) => (useColour ? `[${n}m${s}[0m` : s);

export const c = {
  bold: code('1'),
  dim: code('2'),
  italic: code('3'),
  underline: code('4'),
  red: code('31'),
  green: code('32'),
  yellow: code('33'),
  blue: code('34'),
  magenta: code('35'),
  cyan: code('36'),
  grey: code('90'),
  bgRed: code('41;97;1'),
  bgYellow: code('43;30;1'),
  bgGreen: code('42;30;1'),
  bgBlue: code('44;97;1'),
};

export const SYMBOL = {
  pass: '✔',
  fail: '✖',
  warn: '▲',
  info: '•',
  arrow: '→',
  bullet: '·',
};

export function statusBadge(status: string): string {
  switch (status) {
    case 'satisfied':
      return c.green(`${SYMBOL.pass} satisfied`);
    case 'partial':
      return c.yellow(`${SYMBOL.warn} partial  `);
    case 'needs_review':
      return c.yellow(`${SYMBOL.warn} review   `);
    case 'missing':
      return c.red(`${SYMBOL.fail} missing  `);
    default:
      return c.grey(`${SYMBOL.bullet} n/a      `);
  }
}

export function tierBanner(tier: string, summary: string): string {
  const label = ` ${tier.toUpperCase().replace('_', ' ')} `;
  switch (tier) {
    case 'prohibited':
      return `${c.bgRed(label)} ${c.bold(summary)}`;
    case 'high':
      return `${c.bgYellow(label)} ${c.bold(summary)}`;
    case 'transparency':
      return `${c.bgBlue(label)} ${summary}`;
    case 'minimal':
      return `${c.bgGreen(label)} ${summary}`;
    default:
      return `${c.grey(label)} ${summary}`;
  }
}

/** A score bar that reads at a glance and degrades to ASCII without colour. */
export function scoreBar(score: number, width = 28): string {
  const filled = Math.round((score / 100) * width);
  const bar = '█'.repeat(filled) + c.grey('░'.repeat(width - filled));
  const paint = score >= 80 ? c.green : score >= 50 ? c.yellow : c.red;
  return `${paint(bar)} ${c.bold(String(score).padStart(3))}${c.grey('/100')}`;
}

export function rule(width = 72): string {
  return c.grey('─'.repeat(width));
}

export function heading(text: string): string {
  return `\n${c.bold(text)}\n${rule(Math.max(text.length, 24))}`;
}

export function wrap(text: string, width = 76, indent = '  '): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width) {
      lines.push(line.trim());
      line = word;
    } else {
      line += ' ' + word;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.map((l) => indent + l).join('\n');
}

export function euro(n: number): string {
  return `€${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

/** Overwrite-in-place progress line, used while a scan streams. */
export function progress(label: string, done: number, total: number): void {
  if (!process.stderr.isTTY) return;
  const pct = Math.round((done / total) * 100);
  const width = 20;
  const filled = Math.round((pct / 100) * width);
  process.stderr.write(
    `\r${c.cyan('⠿')} ${label.padEnd(12)} ${'█'.repeat(filled)}${c.grey('░'.repeat(width - filled))} ${String(pct).padStart(3)}%   `,
  );
}

export function clearProgress(): void {
  if (process.stderr.isTTY) process.stderr.write('\r' + ' '.repeat(72) + '\r');
}
