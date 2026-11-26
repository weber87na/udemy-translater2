import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const json = async name => JSON.parse(await readFile(new URL(name, root), 'utf8'));
const index = await json('extension/data/index.json');
const coverage = await json('coverage.json');
const manifest = await json('extension/manifest.json');
const context = {URL};
vm.runInNewContext(await readFile(new URL('extension/courses.js', root), 'utf8'), context);
vm.runInNewContext(await readFile(new URL('extension/core.js', root), 'utf8'), context);
const core = context.UdemyZhCore;
const seconds = stamp => stamp.split(':').map(Number).reduce((n, part) => n * 60 + part, 0);
const decode = text => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
function parseExport(raw) {
  assert.match(raw, /^WEBVTT\r?\n/);
  return raw.replace(/\r/g, '').split(/\n\s*\n/).flatMap(block => {
    const lines = block.split('\n'), i = lines.findIndex(line => line.includes(' --> '));
    if (i < 0) return [];
    const m = /^(\S+)\s+-->\s+(\S+)/.exec(lines[i]);
    assert.ok(m);
    return [{start: seconds(m[1]), end: seconds(m[2]), zh: decode(lines.slice(i + 1).join(' ')).replace(/\s+/g, ' ').trim()}];
  });
}

test('subtitle timing handles boundaries, gaps, seeking and overlaps', () => {
  const cues = [{start: 1, end: 3, en: 'A', zh: '甲'}, {start: 2, end: 4, en: 'B', zh: '乙'}, {start: 5, end: 6, en: 'C', zh: '丙'}];
  assert.equal(core.cueAt(cues, 0), null);
  assert.equal(core.cueAt(cues, 2).zh, '甲\n乙');
  assert.equal(core.cueAt(cues, 3).zh, '乙');
  assert.equal(core.cueAt(cues, 4), null);
  assert.equal(core.cueAt(cues, 5).zh, '丙');
  assert.equal(core.cueAt(cues, 1).zh, '甲');
});

test('only indexed course URLs activate and manifest scope matches', () => {
  const matches = index.courses.map(c => `https://www.udemy.com/course/${c.slug}/*`);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.content_scripts[0].matches, matches);
  assert.deepEqual(manifest.content_scripts[0].js, ['courses.js', 'core.js', 'content.js']);
  assert.deepEqual(manifest.web_accessible_resources[0].matches, matches);
  for (const c of index.courses) {
    assert.equal(core.lectureId(`https://www.udemy.com/course/${c.slug}/learn/lecture/123?start=2`), '123');
    assert.equal(core.lectureId(`https://example.com/course/${c.slug}/learn/lecture/123`), null);
  }
  assert.equal(core.lectureId('https://www.udemy.com/course/unindexed-course/learn/lecture/123'), null);
});

test('every indexed video has matching bilingual data, VTT and complete course coverage', async () => {
  assert.equal(coverage.complete, true);
  assert.equal(coverage.errors.length, 0);
  assert.ok(index.lectures.every(e => ['complete', 'article'].includes(e.status)));
  assert.equal(new Set(index.courses.map(c => c.courseId)).size, index.courses.length);
  assert.equal(new Set(index.courses.map(c => c.slug)).size, index.courses.length);
  assert.equal(new Set(index.lectures.map(e => e.lectureId)).size, index.lectures.length);
  const entries = index.lectures.filter(e => e.status === 'complete');
  let total = 0;
  for (const entry of entries) {
    const data = core.validate(await json(`extension/data/${entry.lectureId}.json`), entry.lectureId);
    assert.equal(data.courseId, entry.courseId);
    assert.equal(data.cues.length, entry.cueCount);
    const vtt = parseExport(await readFile(new URL(`subtitles/${entry.lectureId}.zh-Hant.vtt`, root), 'utf8'));
    assert.equal(vtt.length, data.cues.length);
    vtt.forEach((cue, i) => {
      assert.ok(Math.abs(cue.start - data.cues[i].start) <= .001 && Math.abs(cue.end - data.cues[i].end) <= .001);
      assert.equal(cue.zh, data.cues[i].zh.replace(/\s+/g, ' ').trim());
    });
    total += data.cues.length;
  }
  for (const course of index.courses) {
    const report = coverage.courses.find(c => c.courseId === course.courseId);
    const items = entries.filter(e => e.courseId === course.courseId);
    assert.equal(report.videos, items.length);
    assert.equal(report.translated, items.length);
    assert.equal(report.articles, index.lectures.filter(e => e.courseId === course.courseId && e.status === 'article').length);
    assert.equal(report.cues, items.reduce((sum, e) => sum + e.cueCount, 0));
    assert.deepEqual(report.pending, []);
  }
  assert.equal(coverage.videos, entries.length);
  assert.equal(coverage.cues, total);
  assert.equal((await readdir(new URL('subtitles/', root))).length, entries.length);
  assert.equal((await readdir(new URL('extension/data/', root))).length, entries.length + 1);
});
