import { readFile, mkdir, writeFile } from 'node:fs/promises';

const read = name => readFile(new URL(name, import.meta.url), 'utf8');
const [source, css, script] = await Promise.all([read('lessons.json'), read('course.css'), read('course.js')]);
const lessons = JSON.parse(source);
const output = new URL('./site/', import.meta.url);

if (!Array.isArray(lessons) || lessons.length !== 12) throw new Error('預期有 12 關教材。');
const slugs = new Set();
for (const lesson of lessons) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.slug) || slugs.has(lesson.slug)) {
    throw new Error('課程網址不合法或重複：' + lesson.slug);
  }
  slugs.add(lesson.slug);
  for (const field of ['title', 'group', 'intro', 'pass', 'skill', 'help']) {
    if (typeof lesson[field] !== 'string' || !lesson[field].trim()) throw new Error(lesson.slug + ' 缺少 ' + field);
  }
  for (const field of ['diagram', 'steps', 'prompts']) {
    if (!Array.isArray(lesson[field]) || !lesson[field].length) throw new Error(lesson.slug + ' 缺少 ' + field);
  }
  if (!lesson.prompts.every(item => typeof item.text === 'string' && item.text.trim() && item.label) ||
      !lesson.prompts.some(item => item.label.includes('貼給 Codex'))) {
    throw new Error(lesson.slug + ' 缺少可複製給 Codex 的指令');
  }
}

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
      list(item.steps, 'instructions') + '<p><strong>怎麼知道準備好了？</strong> ' +
      esc(item.ready) + '</p><p><a href="' + esc(item.url) + '">' +
      esc(item.source) + '</a></p></section>').join('') + '</details>';
}

function lessonMarkup(lesson, index) {
  const last = index === lessons.length - 1;
  return '<article class="card" id="' + lesson.slug + '" data-lesson hidden><span class="tag">第 ' + (index + 1) +
    ' 關 / ' + lessons.length + ' · ' + esc(lesson.group) + '</span><h2 tabindex="-1">' + esc(lesson.title) +
    '</h2><p>' + esc(lesson.intro) + '</p>' +
    list(lesson.diagram, 'diagram') + gearMarkup(lesson.gear) + lesson.prompts.map(promptMarkup).join('') +
    '<details><summary>想看更細的步驟？</summary>' + list(lesson.steps, 'instructions') + '</details>' +
    (lesson.coach ? '<details><summary>團隊流程與補充</summary><p>' + esc(lesson.coach) + '</p></details>' : '') +
    '<div class="result"><h3>做到這裡，就可以往下</h3><p>' + esc(lesson.pass) + '</p></div>' +
    '<div class="row"><button type="button" class="btn" data-action="complete">我做到了</button>' +
    '<button type="button" class="btn alt" data-action="help">我還沒做到</button></div>' +
    '<p class="recovery" hidden>' + esc(lesson.help) + '</p>' +
    '<div class="reward row" hidden>' + sprout((index + 1) % 3 === 0 || last) +
    '<div class="reward-copy"><h3>' + (last ? '12 關完成！' : '你練會了這一步') + '</h3><p>' +
    esc(lesson.skill) + '</p>' + (last ? '<p>想把自己的點子加進團隊系統？把工單草稿、修改前後的畫面與測試結果交給 Kevin，和團隊確認怎麼審查與合併。</p>' : '') +
    '</div><button type="button" class="btn reward-next" data-action="next">' +
    (last ? '回到闖關首頁' : '前往第 ' + (index + 2) + ' 關') + '</button></div></article>';
}

const map = '<details class="map-panel"><summary>看 12 關的路線</summary><ol class="map">' +
  lessons.map((lesson, index) => '<li><button type="button" data-level="' + index + '"><span>' + (index + 1) +
    ' 關</span>' + esc(lesson.title) + '</button></li>').join('') + '</ol></details>';
const cards = lessons.map(lessonMarkup).join('');
const welcome = '<section class="card welcome" id="welcome"><div><h1 tabindex="-1">把你想要的功能，做進系統</h1>' +
  '<p>你可能有過這種想法：「這個搜尋可以更好用嗎？」這 12 關會帶你把想法說清楚，請 Codex 幫你動手，自己試過，再把修改交給團隊一起看。</p>' +
  list(['說清楚想改什麼', '用 AI 做出一小版', '親手測試', '交給團隊審查'], 'route-line') +
  '<p>從練習資料夾開始，學會修問題、做小功能、和 Claude 分工。正式系統的修改，依團隊流程審查後再合併。</p>' +
  '<button type="button" class="btn" id="start">開始第 1 關</button></div>' + sprout(false) + '</section>';
const footer = '<footer><p>完成紀錄存在目前的瀏覽器。換裝置或清除瀏覽資料後，可以從第 1 關再練一次。</p>' +
  '<a href="https://github.com/Kevin-Yeh-egroup/ai-development-handbook">教材 GitHub repo</a>' +
  '<details><summary>工具的官方說明</summary><ul>' +
  '<li><a href="https://learn.chatgpt.com/docs/app">Codex 桌面 App</a></li>' +
  '<li><a href="https://learn.chatgpt.com/docs/agent-configuration/agents-md">AGENTS.md</a></li>' +
  '<li><a href="https://code.claude.com/docs/en/quickstart">Claude Code 入門</a></li>' +
  '<li><a href="https://docs.github.com/en/pull-requests/get-started/pull-request-quickstart">GitHub 審查流程</a></li>' +
  '</ul></details></footer>';

function render({ entry = '', offline = false } = {}) {
  return '<!doctype html><html lang="zh-Hant-TW"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>AI 協作開發｜12 關實作</title><style>\n' + css + '</style></head>' +
    '<body data-entry="' + entry + '"><a class="skip" href="#main">跳到課程內容</a><div class="wrap">' +
    '<header class="top"><strong>AI 協作開發｜12 關實作</strong><div class="row">' +
    '<button class="btn alt" type="button" id="back-home">闖關首頁</button>' +
    (offline ? '' : '<a href="handbook.html" download>下載離線版</a>') + '</div></header>' +
    '<main id="main" tabindex="-1">' + welcome +
    '<div class="row progress"><div class="progress-track" id="progress" role="progressbar" aria-label="完成關卡數" ' +
    'aria-valuemin="0" aria-valuemax="' + lessons.length + '" aria-valuenow="0"><i></i></div><b id="count"></b></div>' +
    map + cards + '</main><p class="sr" role="status" id="live"></p>' +
    '<noscript><p>啟用 JavaScript 後就能逐關完成並保存進度。下方仍可閱讀所有課程。</p>' +
    '<style>main article[data-lesson][hidden]{display:block!important}button,.reward{display:none!important}</style></noscript>' +
    footer + '</div><script>\n' + script + '</script></body></html>\n';
}

await mkdir(output, { recursive: true });
await Promise.all([
  writeFile(new URL('index.html', output), render()),
  writeFile(new URL('handbook.html', output), render({ offline: true })),
  ...lessons.map(lesson => writeFile(new URL(lesson.slug + '.html', output), render({ entry: lesson.slug })))
]);
console.log('已產出 12 關、既有分課連結及離線版。');
