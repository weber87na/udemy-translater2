import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../extension/', import.meta.url);
const index = JSON.parse(await readFile(new URL('data/index.json', root), 'utf8'));
const source = await Promise.all(['courses.js', 'core.js', 'content.js'].map(name => readFile(new URL(name, root), 'utf8')));
const flush = async () => {for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve));};

test('content script loads grouped subtitles across courses and clears unsupported pages', async () => {
  const entries = index.courses.slice(0, 2).map(c => index.lectures.find(e => e.courseId === c.courseId && e.status === 'complete'));
  const paths = entries.map(e => `data/${index.courses.find(c => c.courseId === e.courseId).slug}/${e.lectureId}.json`);
  const datasets = await Promise.all(paths.map(async name => JSON.parse(await readFile(new URL(name, root), 'utf8'))));
  const resources = new Map([['data/index.json', index], ...paths.map((p, i) => [p, datasets[i]])]);
  const requests = [];
  const element = () => ({style: {}, hidden: false, textContent: '', value: '', checked: false, type: '', attributes: new Map(),
    setAttribute(name, value) {this.attributes.set(name, value);}, removeAttribute(name) {this.attributes.delete(name);},
    addEventListener() {}, getBoundingClientRect: () => ({left: 0, top: 0, right: 1280, bottom: 720, width: 1280, height: 720})});
  const ui = Object.fromEntries(['tools','toggle','panel','status','name','enabled','bilingual','fontSize','sizeValue','offset','lift','subs','zh','en'].map(id => [id, element()]));
  const host = element(), shadow = {getElementById: id => ui[id]};
  host.attachShadow = () => shadow;
  ui.subs.getBoundingClientRect = () => ({height: 80});
  const body = {append(node) {node.parentElement = body;}};
  const html = element(), video = {...element(), currentTime: datasets[0].cues[0].start + .001, ended: false};
  let tick;
  const courseUrl = e => `https://www.udemy.com/course/${index.courses.find(c => c.courseId === e.courseId).slug}/learn/lecture/${e.lectureId}`;
  const location = {href: courseUrl(entries[0])};
  const context = vm.createContext({URL, console, location, innerWidth: 1280, innerHeight: 800,
    document: {getElementById: () => null, createElement: tag => tag === 'div' ? host : element(), head: {append() {}}, body, documentElement: html, fullscreenElement: null, querySelectorAll: () => [video]},
    chrome: {runtime: {getURL: path => path}, storage: {local: {get: async () => ({}), set: async () => {}}}},
    fetch: async path => {requests.push(path); const data = resources.get(path); return {ok: !!data, json: async () => data};},
    setInterval: callback => {tick = callback;}});
  for (const text of source) vm.runInContext(text, context);
  await flush();
  assert.deepEqual(requests, ['data/index.json', paths[0]]);
  assert.equal(ui.subs.hidden, false);
  assert.equal(ui.zh.textContent, context.UdemyZhCore.cueAt(datasets[0].cues, video.currentTime).zh);
  if (entries[1]) {
    const beforeWrongCourse = requests.length;
    // Changing only the course slug must clear a previously loaded lecture too.
    location.href = courseUrl(entries[1]).replace(entries[1].lectureId, entries[0].lectureId);
    tick(); await flush(); tick();
    assert.equal(requests.length, beforeWrongCourse);
    assert.equal(ui.subs.hidden, true);
    location.href = courseUrl(entries[1]); video.currentTime = datasets[1].cues[0].start + .001;
    tick(); await flush(); tick();
    assert.equal(requests.at(-1), paths[1]);
    assert.equal(ui.zh.textContent, context.UdemyZhCore.cueAt(datasets[1].cues, video.currentTime).zh);
    // An indexed lecture on the wrong course URL must not fetch another course's file.
    const before = requests.length;
    location.href = courseUrl(entries[1]).replace(entries[1].lectureId, entries[0].lectureId);
    tick(); await flush(); tick();
    assert.equal(requests.length, before);
    assert.equal(ui.subs.hidden, true);
    assert.equal(html.attributes.has('data-agent-zh-active'), false);
  }
  const article = index.lectures.find(e => e.status === 'article');
  if (article) {
    const before = requests.length;
    location.href = courseUrl(article); tick(); await flush();
    assert.equal(requests.length, before);
    assert.match(ui.status.textContent, /文章/);
  }
  location.href = 'https://www.udemy.com/course/not-supported/learn/lecture/123';
  tick(); await flush();
  assert.equal(ui.subs.hidden, true);
  assert.equal(ui.zh.textContent, '');
});
