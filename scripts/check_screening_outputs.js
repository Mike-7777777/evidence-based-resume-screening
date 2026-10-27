#!/usr/bin/env node
// Check a screening work directory against SKILL.md "Validation" and rubric.md section 3.
// Usage: node scripts/check_screening_outputs.js <workdir>
// Exit 0 when every candidate passes, 1 otherwise. Prints counts only, never candidate data.
'use strict';

const fs = require('fs');
const path = require('path');

const TIERS = ['强推', '可聊', '存疑', '信息不足', '偏弱', '不匹配'];
const RISKS = ['低', '中', '高', '未评'];
const GENERAL = ['fit', 'trajectory', 'breadth', 'communication', 'credibility', 'education',
  'fundamentals', 'experience', 'stability', 'references', 'motivation', 'character'];
const REQUIRED = ['id', 'display_name', 'tier', 'scores', 'profile', 'verification', 'headline',
  'inflation', 'red_flags', 'offer', 'tags', 'pros', 'cons', 'checks', 'evidence'];
const PROFILE = ['degree', 'program_type', 'school', 'school_tier', 'lab', 'available', 'location'];
const COUNTS = ['verified', 'mismatched', 'not_found', 'not_checked'];
const STATUSES = ['符', '不符', '未找到', '未查', '在投'];
const SHORT = { tags: [3, 6, 12], pros: [0, 3, 28], cons: [0, 3, 28], checks: [0, 3, 32] };
const SECTIONS = ['## 1 ', '## 2 ', '## 3 ', '## 4 ', '## 5 ', '## 6 ', '## 7 '];

function ruleTier(c) {
  const s = c.scores;
  const own = s.ownership;
  const dep = s.depth;
  let tier;
  if (s.credibility === 0) tier = '存疑';
  else if (own == null && dep == null) tier = '信息不足';
  else if (s.fit === 0) tier = '不匹配';
  else if (Math.max(own ?? -1, dep ?? -1) <= 1) tier = '偏弱';
  else if ((own ?? 0) >= 2 && (dep ?? 0) >= 2 && (s.fit == null || s.fit >= 2) && c.verification.primary >= 1) tier = '强推';
  else tier = '可聊';
  if (tier === '强推' && c.offer.risk === '高') tier = '可聊';
  return tier;
}

function checkCandidate(c, mdText) {
  const errs = REQUIRED.filter((k) => !(k in c)).map((k) => `missing ${k}`);
  if (errs.length) return errs;
  for (const k of ['ownership', 'depth', ...GENERAL]) {
    if (!(k in c.scores)) errs.push(`scores.${k} missing`);
  }
  for (const [k, v] of Object.entries(c.scores)) {
    if (v !== null && !(Number.isInteger(v) && v >= 0 && v <= 3)) errs.push(`scores.${k} must be 0-3 or null`);
  }
  for (const k of PROFILE) if (!(k in c.profile)) errs.push(`profile.${k} missing`);
  if (!TIERS.includes(c.tier)) errs.push(`tier ${c.tier} is not one of the six tiers`);
  if (!RISKS.includes(c.offer.risk)) errs.push(`offer.risk ${c.offer.risk} invalid`);
  const v = c.verification;
  const sum = COUNTS.reduce((a, k) => a + (v[k] ?? NaN), 0);
  if (sum !== v.claimed) errs.push(`verification counts sum to ${sum}, claimed is ${v.claimed}`);
  if (!(v.primary >= 0 && v.primary <= v.claimed)) errs.push('verification.primary must be within 0..claimed');
  for (const e of c.evidence) if (!STATUSES.includes(e.status)) errs.push(`evidence status ${e.status} invalid`);
  const ok = c.evidence.filter((e) => e.status === '符').length;
  if (ok !== v.verified) errs.push(`evidence has ${ok} 符 but verification.verified is ${v.verified}`);
  const expected = ruleTier(c);
  if (expected !== c.tier && !String(c.tier_override_reason || '').trim()) {
    errs.push(`tier ${c.tier} differs from rule result ${expected} without tier_override_reason`);
  }
  if (c.headline.length > 60) errs.push('headline over 60 chars');
  for (const [k, [min, max, len]] of Object.entries(SHORT)) {
    const a = c[k];
    if (!Array.isArray(a) || a.length < min || a.length > max) errs.push(`${k} must have ${min}-${max} items`);
    else if (a.some((x) => x.length > len)) errs.push(`${k} item over ${len} chars`);
  }
  if (mdText === null) errs.push('matching .md missing');
  else for (const h of SECTIONS) if (!mdText.includes(`\n${h}`)) errs.push(`md section "${h.trim()}" missing`);
  return errs;
}

function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: node scripts/check_screening_outputs.js <workdir>');
    return 2;
  }
  const candDir = path.join(dir, 'candidates');
  if (!fs.existsSync(candDir)) {
    console.error(`no candidates/ directory under ${dir}`);
    return 1;
  }
  const files = fs.readdirSync(candDir).filter((f) => f.endsWith('.json')).sort();
  const summaryPath = path.join(dir, 'summary.md');
  const summary = fs.existsSync(summaryPath) ? fs.readFileSync(summaryPath, 'utf8') : null;
  let failed = 0;
  for (const f of files) {
    const id = f.slice(0, -5);
    let errs;
    try {
      const c = JSON.parse(fs.readFileSync(path.join(candDir, f), 'utf8'));
      const mdPath = path.join(candDir, `${id}.md`);
      errs = checkCandidate(c, fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : null);
      if (summary !== null && !summary.includes(c.display_name) && !summary.includes(id)) errs.push('not listed in summary.md');
    } catch (e) {
      errs = [`unreadable json: ${e.message}`];
    }
    if (errs.length) {
      failed += 1;
      console.log(`FAIL ${id}: ${errs.join('; ')}`);
    }
  }
  if (summary === null) {
    console.log('FAIL summary.md missing');
    failed += 1;
  }
  if (!files.length) {
    console.log('FAIL no candidate json found');
    return 1;
  }
  console.log(failed ? `${failed} problem(s) across ${files.length} candidate(s)` : `OK ${files.length} candidate(s) checked`);
  return failed ? 1 : 0;
}

process.exitCode = main();
