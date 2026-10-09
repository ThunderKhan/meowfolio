// Summarize Lighthouse lab measurements without inventing or gating on a
// fragile score. CI hardware and network conditions are not real phones.
import { readFileSync, appendFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) throw new Error('Expected at least one Lighthouse JSON report.');
const rows = [];
for (const path of files) {
  const result = JSON.parse(readFileSync(path, 'utf8'));
  if (result.runtimeError) {
    throw new Error('Lighthouse failed: ' + result.runtimeError.message);
  }
  const category = (name) => {
    const value = result.categories?.[name]?.score;
    return typeof value === 'number' ? Math.round(value * 100) : 'n/a';
  };
  const audit = (id) => result.audits?.[id]?.displayValue ?? 'n/a';
  const mode = path.includes('desktop') ? 'Desktop' : 'Mobile';
  rows.push([
    mode, category('performance'), category('accessibility'),
    category('best-practices'), category('seo'),
    audit('first-contentful-paint'), audit('largest-contentful-paint'),
    audit('total-blocking-time'), audit('cumulative-layout-shift'),
  ]);
}

const head = '| Mode | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |';
const border = '| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |';
const summary = [
  '## Lighthouse lab baseline (Chromium, GitHub-hosted runner)',
  '',
  head, border,
  ...rows.map((values) => '| ' + values.join(' | ') + ' |'),
  '',
  'These are synthetic measurements, not verified real-Android field results.',
  'No artificial score threshold is used to block releases.',
  '',
].join('\n');
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
