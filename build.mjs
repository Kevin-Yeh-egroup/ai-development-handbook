import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { glossaryMarkup } from './glossary.mjs';
import { loadWalkthrough } from './walkthrough.mjs';

const read = name => readFile(new URL(name, import.meta.url), 'utf8');
const [source, css, script] = await Promise.all([read('lessons.json'), read('course.css'), read('course.js')]);
const lessons = JSON.parse(source);
const [glossarySource, glossaryCss, glossaryScript] = await Promise.all([read('glossary.json'),read('glossary.css'),read('glossary.js')]);
const glossary = glossaryMarkup(JSON.parse(glossarySource.replace(/^\uFEFF/, '')));
const output = new URL('./site/', import.meta.url);

if (!Array.isArray(lessons) || lessons.length !== 12) throw new Error('預期有 12 關教材。');
const slugs = new Set();
for (const lesson of lessons) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.slug) || slugs.has(lesson.slug)) {
    throw new Error('課程網址不合法或重複：' + lesson.slug);
  }
  slugs.add(lesson.slug);
  for (const field of ['title', 'group', 'intro', 'pass', 'skill', 'help', 'boss', 'mission', 'lookup']) {
    if (typeof lesson[field] !== 'string' || !lesson[field].trim()) throw new Error(lesson.slug + ' 缺少 ' + field);
  }
  for (const field of ['diagram', 'steps', 'prompts']) {
    if (!Array.isArray(lesson[field]) || !lesson[field].length) throw new Error(lesson.slug + ' 缺少 ' + field);
  }
  if (!lesson.prompts.every(item => typeof item.text === 'string' && item.text.trim() && item.label &&
      Number.isInteger(item.step) && item.step >= 1 && item.step <= lesson.steps.length) ||
      !lesson.prompts.some(item => item.label.includes('貼給 Codex'))) {
    throw new Error(lesson.slug + ' 缺少可複製給 Codex 的指令');
  }
}

const walkthrough = await loadWalkthrough(lessons);
const shotViewerScript = await read('shot-viewer.js');
const esc = value => String(value).replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const list = (items, className) => '<ol class="' + className + '">' +
  items.map(item => '<li>' + esc(item) + '</li>').join('') + '</ol>';
const sprout = star => '<div class="sprout" aria-hidden="true"><i class="stem"></i><i class="leaf left"></i>' +
  '<i class="leaf right"></i><i class="soil"></i>' + (star ? '<span class="star">★</span>' : '') + '</div>';

function promptMarkup(prompt) {
  const isClaude = prompt.label.includes('Claude Code') && !prompt.label.includes('貼給 Codex');
  const isTemplate = !isClaude && !prompt.label.includes('貼給 Codex');
  const label = isClaude ? '複製給 Claude' : isTemplate ? '複製範本' : '複製給 Codex';
  return '<div class="prompt"><div class="row"><strong>' + esc(prompt.label) +
    '</strong><button type="button" class="btn alt" data-copy>' + label + '</button></div>' +
    '<p class="feedback" role="status"></p><details><summary>看完整內容</summary><pre tabindex="0">' +
    esc(prompt.text) + '</pre></details></div>';
}

function gearMarkup(gear) {
  if (!gear) return '';
  return '<details class="equipment"><summary>看準備與安裝教學</summary>' +
    gear.map(item => '<section><h3>' + esc(item.title) + '</h3>' +
      '<p><strong>為什麼要準備？</strong> ' + esc(item.why) + '</p>' +
      '<p><strong>哪一關會用到？</strong> ' + esc(item.when) + '</p>' +
      list(item.steps, 'instructions') + '<p><strong>怎麼知道準備好了？</strong> ' +
      esc(item.ready) + '</p><p><a href="' + esc(item.url) + '">' +
      esc(item.source) + '</a></p>' + (item.install ? '<p>' + esc(item.install.note) +
        '</p>' + promptMarkup(item.install) : '') + '</section>').join('') + '</details>';
}

function gameScene(index, milestone = false) {
  const shade = ['leaf-boss', 'pond-boss', 'sun-boss'][index % 3];
  return '<div class="stage game-scene" aria-hidden="true"><div class="hero-c"><div class="hair"></div>' +
    '<div class="hd"></div><div class="bd"></div><span class="ear l"></span><span class="ear r"></span>' +
    '<span class="keyb"></span></div><div class="boss ' + shade + (milestone ? ' crowned' : '') +
    '"><i></i>' + (milestone ? '<span class="crown"></span>' : '') + '</div></div>';
}

const outfit = '<fieldset class="gear-checks"><legend>把兩件裝備穿上</legend>' +
  '<label><input type="checkbox" data-self-check data-gear="ear">🎧 我已用團隊允許的帳號登入 Codex</label>' +
  '<label><input type="checkbox" data-self-check data-gear="key">🗝️ Codex 說出的練習資料夾名稱對得上</label></fieldset>';

const capstoneCheck = '<fieldset class="gear-checks"><legend>我的功能做到這裡了</legend>' +
  '<label><input type="checkbox" data-self-check>我做出一個可以打開試的小版本</label>' +
  '<label><input type="checkbox" data-self-check>我親手試過，留下隊友能再試一次的步驟和結果</label></fieldset>';

function lessonMarkup(lesson, index, offline) {
  const last = index === lessons.length - 1;
  const promptsAtStep = step => {
    const prompts = lesson.prompts.filter(prompt => prompt.step === step);
    const extra = prompts.filter(prompt => prompt.optional);
    return prompts.filter(prompt => !prompt.optional).map(promptMarkup).join('') +
      (extra.length ? '<details><summary>其他指令與範本</summary>' + extra.map(promptMarkup).join('') + '</details>' : '');
  };
  const milestone = lesson.milestone;
  const recap = milestone ? '<section class="recap"><h3>' + esc(milestone.title) + '</h3><p>打完這一段，你現在可以：</p>' +
    list(milestone.skills, 'instructions') + '<p>' + esc(milestone.next) + '</p></section>' : '';
  const fireworks = milestone ? '<div class="fireworks" aria-hidden="true">' +
    ['★','✦','★','✦','★'].map((star, i) => '<span style="--i:' + i + '">' + star + '</span>').join('') +
    '</div>' : '';
  return '<article class="card" id="' + lesson.slug + '" data-lesson hidden><span class="tag">第 ' + (index + 1) +
    ' 關 / ' + lessons.length + ' · ' + esc(lesson.group) + '</span><h2 tabindex="-1">' + esc(lesson.title) +
    '</h2>' + gameScene(index, Boolean(milestone)) + '<p><strong>' + (milestone ? '大魔王 · ' : '小魔王 · ') + esc(lesson.boss) + '</strong>　' + esc(lesson.mission) + '</p>' +
    '<button type="button" class="term-link" data-glossary-open="' + esc(lesson.lookup) + '">查小字典 · ' + esc(lesson.lookup) + '</button><p>' + esc(lesson.intro) + '</p>' +
    list(lesson.diagram, 'diagram') + gearMarkup(lesson.gear) +
    walkthrough.markup(lesson, offline, promptsAtStep) +
    (lesson.coach ? '<details><summary>團隊流程與補充</summary><p>' + esc(lesson.coach) + '</p></details>' : '') +
    '<div class="result"><h3>做到這裡，就可以往下</h3><p>' + esc(lesson.pass) + '</p></div>' + (index === 0 ? outfit : last ? capstoneCheck : '') +
    '<div class="row"><button type="button" class="btn" data-action="complete">我做到了</button>' +
    '<button type="button" class="btn alt" data-action="help">我還沒做到</button></div>' +
    '<p class="recovery" hidden>' + esc(lesson.help) + '</p>' +
    '<div class="reward row' + (milestone ? ' milestone' : '') + '" hidden>' + fireworks + sprout(Boolean(milestone)) +
    '<div class="reward-copy"><h3 tabindex="-1">' + (last ? '12 關完成！' : milestone ? '大魔王退場！' : '你練會了這一步') + '</h3><p>' +
    esc(lesson.skill) + '</p>' + recap + (last ? '<p>想把自己的點子加進團隊系統？把工單草稿、修改前後的畫面與測試結果交給 Kevin，和團隊確認怎麼審查與合併。</p>' : '') +
    '</div><button type="button" class="btn reward-next" data-action="next">' +
    (last ? '回到闖關首頁' : '前往第 ' + (index + 2) + ' 關') + '</button></div></article>';
}

const map = '<details class="map-panel"><summary>看四段闖關路線</summary>' +
  lessons.filter(lesson => lesson.milestone).map((boss, chapter) => {
    const offset = chapter * 3;
    return '<section class="map-chapter"><h3>' + esc(boss.milestone.title) + '</h3><ol class="map">' +
      lessons.slice(offset, offset + 3).map((lesson, index) =>
        '<li><button type="button" data-level="' + (offset + index) + '"' +
        (lesson.milestone ? ' data-big' : '') + '><span>' + (offset + index + 1) +
        ' 關' + (lesson.milestone ? ' · 大魔王' : '') + '</span>' + esc(lesson.title) + '</button></li>'
      ).join('') + '</ol></section>';
  }).join('') + '</details>';
const onlineCards = lessons.map((lesson, index) => lessonMarkup(lesson, index, false)).join('');
const offlineCards = lessons.map((lesson, index) => lessonMarkup(lesson, index, true)).join('');
const welcome = '<section class="card welcome" id="welcome"><div><h1 tabindex="-1">做一個你想用的功能</h1>' +
  '<p>想讓搜尋更好用，或加一個常用的按鈕？跟著這 12 關，把點子說給 AI 聽，做出一個可以親手試的小版本。</p>' +
  list(['說清楚想改什麼', '用 AI 做出一小版', '親手測試', '交給團隊審查'], 'route-line') +
  '<p>用電腦開啟 Codex，就可以先從空資料夾練習。最後帶上你自己的點子，和 Kevin 及隊友一起看怎麼加進團隊系統。</p>' +
  '<button type="button" class="btn" id="start">開始第 1 關</button></div>' + gameScene(1, true) + '</section>';
const footer = '<footer><p>完成紀錄存在目前的瀏覽器。換裝置或清除瀏覽資料後，可以從第 1 關再練一次。</p>' +
  '<a href="https://github.com/Kevin-Yeh-egroup/ai-development-handbook">教材 GitHub repo</a>' +
  '<details><summary>工具的官方說明</summary><ul>' +
  '<li><a href="https://learn.chatgpt.com/docs/app">Codex 桌面 App</a></li><li><a href="https://learn.chatgpt.com/docs/app/commands">開啟資料夾的快捷鍵</a></li>' +
  '<li><a href="https://learn.chatgpt.com/docs/agent-configuration/agents-md">AGENTS.md</a></li>' +
  '<li><a href="https://code.claude.com/docs/en/quickstart">Claude Code 入門</a></li>' +
  '<li><a href="https://docs.github.com/en/pull-requests/get-started/pull-request-quickstart">GitHub 審查流程</a></li>' +
  '</ul></details></footer>';

const shotViewer = '<dialog id="shot-viewer" class="shot-viewer" aria-labelledby="shot-viewer-title">' +
  '<div class="shot-viewer-header"><h2 id="shot-viewer-title">操作截圖</h2>' +
  '<form method="dialog"><button type="submit" class="btn alt" autofocus>關閉</button></form></div>' +
  '<div class="shot-viewer-canvas" tabindex="0" role="region" aria-label="放大的操作截圖"></div>' +
  '<p class="shot-viewer-hint">圖片超出畫面時，可以左右滑動。</p></dialog>';

function render({ entry = '', offline = false } = {}) {
  return '<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>AI 協作開發｜12 關實作</title><style>\n' + css + glossaryCss + '</style></head>' +
    '<body data-entry="' + entry + '"><a class="skip" href="#main">跳到課程內容</a><div class="wrap">' +
    '<header class="top"><strong>AI 協作開發｜12 關實作</strong><div class="row">' +
    '<button class="btn alt" type="button" id="back-home">闖關首頁</button>' +
    (offline ? '' : '<a href="handbook.html" download>下載離線版</a>') + '</div></header>' +
    '<main id="main" tabindex="-1">' + welcome + glossary +
    '<div class="row progress"><div class="progress-track" id="progress" role="progressbar" aria-label="完成關卡數" ' +
    'aria-valuemin="0" aria-valuemax="' + lessons.length + '" aria-valuenow="0"><i></i></div><b id="count"></b></div>' +
    map + (offline ? offlineCards : onlineCards) + '</main><p class="sr" role="status" id="live"></p>' +
    '<noscript><p>啟用 JavaScript 後就能逐關完成並保存進度。下方仍可閱讀所有課程。</p>' +
    '<style>main article[data-lesson][hidden]{display:block!important}button:not(.shot-open),.shot-open-label,.reward{display:none!important}</style></noscript>' +
    footer + '</div>' + shotViewer + '<script>\n' + script + glossaryScript + shotViewerScript + '</script></body></html>\n';
}

await mkdir(output, { recursive: true });
await walkthrough.copyImages(output);
await Promise.all([
  writeFile(new URL('index.html', output), render()),
  writeFile(new URL('handbook.html', output), render({ offline: true })),
  ...lessons.map(lesson => writeFile(new URL(lesson.slug + '.html', output), render({ entry: lesson.slug })))
]);
console.log('已產出 12 關、既有分課連結及離線版。');
