import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, rename, access, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const json = async file => JSON.parse(await readFile(file, 'utf8'));
const exists = async file => {try {await access(file); return true;} catch (e) {if (e.code === 'ENOENT') return false; throw e;}};
const cell = text => String(text).replace(/\|/g, '\\|').replace(/[\r\n]/g, ' ');
const digest = data => createHash('sha256').update(data).digest('hex');

// Accept both the original flat delivery and an already-organized delivery.
// All rename targets are validated beneath the explicitly selected repository.
export async function organizeCourses(directory) {
  const root = await realpath(directory);
  const file = relative => {
    const target = path.resolve(root, relative), rel = path.relative(root, target);
    assert.ok(rel && !rel.startsWith('..') && !path.isAbsolute(rel), 'Path must stay within repository');
    return target;
  };
  const index = await json(file('extension/data/index.json'));
  const coverage = await json(file('coverage.json'));
  const courses = new Map(index.courses.map(c => [c.courseId, c]));
  for (const course of courses.values()) assert.match(course.slug, /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/);
  const proofs = [];
  for (const entry of index.lectures.filter(e => e.status === 'complete')) {
    assert.match(entry.lectureId, /^[1-9]\d*$/);
    const course = courses.get(entry.courseId);
    assert.ok(course, 'Missing course');
    for (const [flat, grouped] of [
      [`subtitles/${entry.lectureId}.zh-Hant.vtt`, `subtitles/${course.slug}/${entry.lectureId}.zh-Hant.vtt`],
      [`extension/data/${entry.lectureId}.json`, `extension/data/${course.slug}/${entry.lectureId}.json`],
    ]) {
      const source = file(flat), target = file(grouped);
      const hasSource = await exists(source), hasTarget = await exists(target);
      assert.notEqual(hasSource, hasTarget, `Expected exactly one copy of ${entry.lectureId}: ${flat}`);
      const before = await readFile(hasSource ? source : target);
      if (hasSource) {
        await mkdir(path.dirname(target), {recursive: true});
        await rename(source, target);
      }
      assert.equal(digest(await readFile(target)), digest(before), `Subtitle bytes changed: ${grouped}`);
      proofs.push({path: grouped, sha256: digest(before)});
    }
  }
  index.layout = 'by-course-slug';
  await writeFile(file('extension/data/index.json'), JSON.stringify(index, null, 2) + '\n');
  const directoryLines = ['# 繁體中文字幕目錄', '', '字幕依課程資料夾分類；點課程名稱可瀏覽該課完整講座索引。', ''];
  for (const course of courses.values()) {
    const entries = index.lectures.filter(e => e.courseId === course.courseId);
    const report = coverage.courses.find(c => c.courseId === course.courseId);
    const rows = entries.map(e => `| ${e.section} | ${cell(e.title)} | ${e.status === 'article' ? '文章，無影片字幕' : `[VTT](${e.lectureId}.zh-Hant.vtt)`} |`);
    const title = `# ${course.title}\n\n[Udemy 課程](https://www.udemy.com/course/${course.slug}/) · [全部課程](../../字幕目錄.md)\n\n${report.videos} 支影片，${report.cues.toLocaleString('en-US')} 句繁中字幕。\n\n`;
    await mkdir(file(`subtitles/${course.slug}`), {recursive: true});
    await writeFile(file(`subtitles/${course.slug}/README.md`), title + ['| 章節 | 講座 | 繁中字幕 |', '| --- | --- | --- |', ...rows, ''].join('\n'));
    directoryLines.push(`## [${course.title}](subtitles/${course.slug}/)`, '', '| 章節 | 講座 | 繁中字幕 |', '| --- | --- | --- |');
    for (const e of entries) directoryLines.push(`| ${e.section} | ${cell(e.title)} | ${e.status === 'article' ? '文章，無影片字幕' : `[VTT](subtitles/${course.slug}/${e.lectureId}.zh-Hant.vtt)`} |`);
    directoryLines.push('');
  }
  await writeFile(file('字幕目錄.md'), directoryLines.join('\n'));
  const readmePath = file('README.md');
  let readme = await readFile(readmePath, 'utf8');
  const rows = [...courses.values()].map(c => {
    const r = coverage.courses.find(r => r.courseId === c.courseId);
    return `| [${cell(c.title)}](https://www.udemy.com/course/${c.slug}/) | ${r.videos} | ${r.cues.toLocaleString('en-US')} | [字幕資料夾](subtitles/${c.slug}/) |`;
  });
  readme = readme.replace(/\| 課程 \| 影片 \| 字幕段數 \|[^\n]*\n[\s\S]*?\| 合計 \|[^\n]*/, [
    '| 課程 | 影片 | 字幕段數 | 字幕 |', '| --- | ---: | ---: | --- |', ...rows,
    `| 合計 | **${coverage.videos}** | **${coverage.cues.toLocaleString('en-US')}** | |`,
  ].join('\n'));
  readme = readme.replace('subtitles/<lectureId>.zh-Hant.vtt', 'subtitles/<course-slug>/<lectureId>.zh-Hant.vtt')
    .replace('extension/data/<lectureId>.json', 'extension/data/<course-slug>/<lectureId>.json');
  readme = readme.replace('- subtitles/<course-slug>/<lectureId>.zh-Hant.vtt：', '- `subtitles/<course-slug>/<lectureId>.zh-Hant.vtt`：')
    .replace('- extension/data/<course-slug>/<lectureId>.json：', '- `extension/data/<course-slug>/<lectureId>.json`：');
  if (!readme.includes('[校譯註記](extension/review-notes/)')) readme += '\n[校譯註記](extension/review-notes/)\n';
  await writeFile(readmePath, readme);
  return {courses: courses.size, videos: proofs.length / 2, proofs};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] || fileURLToPath(new URL('../', import.meta.url));
  organizeCourses(root).then(({courses, videos}) => console.log(JSON.stringify({courses, videos, layout: 'by-course-slug'})))
    .catch(error => {console.error(error); process.exitCode = 1;});
}
