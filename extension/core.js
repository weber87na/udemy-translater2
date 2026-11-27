/* Shared subtitle timing logic, also exercised by the Node test runner. */
(() => {
  'use strict';
  const courses = globalThis.UdemyZhCourses || [];
  function lectureId(url) {
    try {
      const u = new URL(url);
      return u.origin === 'https://www.udemy.com' &&
        new RegExp(`^/course/(?:${courses.join('|')})/learn/lecture/([1-9]\\d*)/?$`).exec(u.pathname)?.[1] || null;
    } catch { return null; }
  }
  function dataPath(index, id, url) {
    if (lectureId(url) !== id) return null;
    const entry = index?.lectures?.find(item => item.lectureId === id);
    const course = index?.courses?.find(item => item.courseId === entry?.courseId);
    if (entry?.status !== 'complete' || !course || !courses.includes(course.slug) ||
        !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(course.slug) ||
        new URL(url).pathname.split('/')[2] !== course.slug) return null;
    return index.layout === 'by-course-slug' ? `data/${course.slug}/${id}.json` : `data/${id}.json`;
  }
  function validate(data, id, courseId) {
    if (data?.lectureId !== id || (courseId && data.courseId !== courseId) || data.language !== 'zh-Hant' || !Array.isArray(data.cues) || !data.cues.length) {
      throw new Error('字幕檔與本堂課不相符。');
    }
    let previous = -1;
    for (const cue of data.cues) {
      if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end <= cue.start ||
          cue.start < previous || typeof cue.zh !== 'string' || !cue.zh.trim() ||
          typeof cue.en !== 'string' || cue.zh.length > 5000 || cue.en.length > 5000) {
        throw new Error('字幕時間軸或文字格式錯誤。');
      }
      previous = cue.start;
    }
    return data;
  }
  function cueAt(cues, time) {
    if (!Number.isFinite(time)) return null;
    let lo = 0, hi = cues.length;
    while (lo < hi) {
      const middle = (lo + hi) >>> 1;
      if (cues[middle].start <= time) lo = middle + 1;
      else hi = middle;
    }
    // Subtitle cues may overlap. Return all currently active lines in source order.
    const active = [];
    for (let i = lo - 1; i >= 0; i--) {
      if (cues[i].start <= time && time < cues[i].end) active.unshift(cues[i]);
    }
    return active.length ? {zh: active.map(c => c.zh).join('\n'), en: active.map(c => c.en).join('\n')} : null;
  }
  function settings(value = {}) {
    return {
      enabled: value.enabled !== false,
      bilingual: value.bilingual !== false,
      fontSize: Math.min(44, Math.max(16, Number(value.fontSize) || 26)),
      offset: Math.min(30, Math.max(-30, Number(value.offset) || 0)),
      lift: Math.min(200, Math.max(40, Number(value.lift) || 80)),
    };
  }
  globalThis.UdemyZhCore = Object.freeze({lectureId, dataPath, validate, cueAt, settings});
})();
