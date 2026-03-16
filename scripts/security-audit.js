#!/usr/bin/env node

/**
 * Security audit script — runs npm audit and outputs structured JSON report.
 * Usage: node scripts/security-audit.js
 */

import { execSync } from 'child_process';

try {
  const output = execSync('npm audit --json 2>/dev/null', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const audit = JSON.parse(output);

  const report = {
    timestamp: new Date().toISOString(),
    summary: audit.metadata?.vulnerabilities || {},
    totalDeps: audit.metadata?.dependencies?.total || 0,
    advisories: Object.values(audit.vulnerabilities || {}).map(v => ({
      name: v.name,
      severity: v.severity,
      via: Array.isArray(v.via) ? v.via.filter(x => typeof x === 'string') : [],
      fixAvailable: v.fixAvailable || false,
      range: v.range,
    })),
  };

  console.log(JSON.stringify(report, null, 2));
  // Exit with code 1 if critical/high vulnerabilities found
  const vulns = report.summary;
  if (vulns.critical > 0 || vulns.high > 0) {
    process.exit(1);
  }
} catch (err) {
  // npm audit exits with code 1 when vulnerabilities are found
  if (err.stdout) {
    try {
      const audit = JSON.parse(err.stdout);
      const report = {
        timestamp: new Date().toISOString(),
        summary: audit.metadata?.vulnerabilities || {},
        totalDeps: audit.metadata?.dependencies?.total || 0,
        advisories: Object.values(audit.vulnerabilities || {}).map(v => ({
          name: v.name,
          severity: v.severity,
          via: Array.isArray(v.via) ? v.via.filter(x => typeof x === 'string') : [],
          fixAvailable: v.fixAvailable || false,
          range: v.range,
        })),
      };
      console.log(JSON.stringify(report, null, 2));
      const vulns = report.summary;
      if (vulns.critical > 0 || vulns.high > 0) process.exit(1);
    } catch {
      console.error('Failed to parse npm audit output');
      process.exit(2);
    }
  } else {
    console.error('npm audit failed:', err.message);
    process.exit(2);
  }
}
