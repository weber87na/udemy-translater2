import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
const context={URL};
vm.runInNewContext(await readFile(new URL('../extension/core.js',import.meta.url),'utf8'),context);
const core=context.UdemyZhCore;
test('subtitle timing handles boundaries, gaps, seeking and overlaps',()=>{
  const cues=[{start:1,end:3,en:'A',zh:'甲'},{start:2,end:4,en:'B',zh:'乙'},{start:5,end:6,en:'C',zh:'丙'}];
  assert.equal(core.cueAt(cues,0),null);
  assert.equal(core.cueAt(cues,2).zh,'甲\n乙');
  assert.equal(core.cueAt(cues,3).zh,'乙');
  assert.equal(core.cueAt(cues,4),null);
  assert.equal(core.cueAt(cues,5).zh,'丙');
  assert.equal(core.cueAt(cues,1).zh,'甲');
});
test('only the two course URLs activate captions',()=>{
  assert.equal(core.lectureId('https://www.udemy.com/course/ai-in-c-sharp-using-the-microsoft-agent-framework/learn/lecture/54232363'),'54232363');
  assert.equal(core.lectureId('https://www.udemy.com/course/mastering-microsoft-agent-framework-in-c/learn/lecture/57108123'),'57108123');
  assert.equal(core.lectureId('https://example.com/course/mastering-microsoft-agent-framework-in-c/learn/lecture/57108123'),null);
});
test('all 173 lectures contain valid bilingual captions and matching VTT files',async()=>{
  const index=JSON.parse(await readFile(new URL('../extension/data/index.json',import.meta.url),'utf8'));
  const entries=index.lectures.filter(e=>e.status==='complete');
  assert.equal(entries.length,173);
  assert.equal(index.lectures.filter(e=>e.status==='pending').length,0);
  let total=0;
  for(const entry of entries){
    const data=core.validate(JSON.parse(await readFile(new URL(`../extension/data/${entry.lectureId}.json`,import.meta.url),'utf8')),entry.lectureId);
    assert.equal(data.cues.length,entry.cueCount);
    const vtt=await readFile(new URL(`../subtitles/${entry.lectureId}.zh-Hant.vtt`,import.meta.url),'utf8');
    assert.ok(vtt.startsWith('WEBVTT'));
    assert.equal((vtt.match(/ --> /g)||[]).length,data.cues.length);
    total+=data.cues.length;
  }
  assert.equal(total,18028);
  assert.equal((await readdir(new URL('../subtitles/',import.meta.url))).filter(f=>f.endsWith('.vtt')).length,173);
});
