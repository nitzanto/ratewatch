// Writes the wiki's load test results page from the last run's Artillery JSON (load-report.json).
// Run by the `load` and `load-report` targets, so the page always shows the latest run.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const pagePath = path.join(
  __dirname,
  '../docs/src/content/docs/architecture/load-test-results.md',
);

/** The pass/fail limits, read from load.yml's `ensure` thresholds so they're written in one place. */
const parseThresholds = () =>
  Object.fromEntries(
    [
      ...fs
        .readFileSync(path.join(__dirname, 'load.yml'), 'utf8')
        .matchAll(/^\s*- ([\w.]+): (\d+)$/gm),
    ].map(([, metric, limit]) => [metric, Number(limit)]),
  );

const readReport = (fileName) => {
  const filePath = path.join(__dirname, fileName);

  return fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
    : null;
};

const formatDate = (report) =>
  new Date(report.intermediate[0].firstMetricAt)
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ') + ' UTC';

const formatNumber = (value) => Math.round(value ?? 0).toLocaleString('en-US');

const buildMachineLine = () => {
  const cpus = os.cpus();

  return `${cpus[0].model.trim()}, ${cpus.length} threads, ${Math.round(os.totalmem() / 1024 ** 3)} GB memory, ${os.type()}, Node ${process.version}`;
};

const buildLoadSection = (report, thresholds) => {
  if (!report) {
    return 'No run yet: run `pnpm nx load traffic`.';
  }

  const { counters, summaries } = report.aggregate;
  const peakRate = Math.max(
    ...report.intermediate.map(
      (period) => period.rates['http.request_rate'] ?? 0,
    ),
  );
  const durationSeconds =
    (report.aggregate.lastMetricAt - report.aggregate.firstMetricAt) / 1000;

  // Step 1: each percentile next to its limit, marked when a limit is broken.
  const buildPercentileRow = (label, metric) => {
    const summary = summaries[metric] ?? {};
    const cells = ['p50', 'p90', 'p95', 'p99'].map((percentile) => {
      const limit = thresholds[`${metric}.${percentile}`];
      const value = `${formatNumber(summary[percentile])} ms`;

      if (limit === undefined) {
        return value;
      }

      return summary[percentile] < limit
        ? `${value} ✅ (< ${limit})`
        : `**${value} ❌ (< ${limit})**`;
    });

    return `| ${label} | ${cells.join(' | ')} |`;
  };

  // Step 2: what the users did and what the limiter answered.
  const failedUsers = counters['vusers.failed'] ?? 0;

  return [
    `Ran ${formatDate(report)}, for ${Math.round(durationSeconds)} seconds. **${failedUsers === 0 ? 'Passed' : 'Failed'}.**`,
    '',
    '| Time | p50 | p90 | p95 | p99 |',
    '| --- | --- | --- | --- | --- |',
    buildPercentileRow('Response time', 'http.response_time'),
    buildPercentileRow('Request to its `rate:update`', 'load.admin.update_lag'),
    '',
    '| Count | Value |',
    '| --- | --- |',
    `| Requests | ${formatNumber(counters['http.requests'])}, ${formatNumber(counters['http.requests'] / durationSeconds)} a second on average, ${formatNumber(peakRate)} at peak |`,
    `| Users, admins included | ${formatNumber(counters['vusers.created'])} |`,
    `| Users who broke a rule | ${formatNumber(failedUsers)} ${failedUsers === 0 ? '✅' : '❌'} |`,
    `| Clicks allowed | ${formatNumber(counters['plugins.metrics-by-endpoint./api/clicks.codes.200'])} |`,
    `| Refused for the hour | ${formatNumber(counters['load.refused.hourly'])} |`,
    `| Refused by the burst limit | ${formatNumber(counters['load.refused.burst'])} |`,
    `| Live events to admins (\`rate:update\`, \`rate:limit_exceeded\`, \`rate:summary\`) | ${['update', 'limitExceeded', 'summary'].map((name) => formatNumber(counters[`load.admin.events.${name}`])).join(', ')} |`,
  ].join('\n');
};

const buildPage = () => {
  const thresholds = parseThresholds();

  return `---
title: Load test results
description: The latest load test, written by the run itself.
sidebar:
  order: 4
---

The load test writes this page; don't edit it by hand. How to run it is in [Running locally](../../guides/running-locally/#load-test). It ran against the Docker Compose stack, on the same machine as the load generator: ${buildMachineLine()}. So the numbers show how the design behaves, not what a production cluster serves. Finding the real capacity takes a ramp test on production-like hardware, with Redis on its own machine.

## Load test

About 550 users for one minute: most reach their limit, some stay under it, some send bursts, and admins watch live. It passes when no user breaks a rule (exact \`x-count\`, never more than the limit, no errors) and every time stays under its limit.

${buildLoadSection(readReport('load-report.json'), thresholds)}

`;
};

fs.writeFileSync(pagePath, buildPage());
console.log(`Wrote ${path.relative(process.cwd(), pagePath)}`);
