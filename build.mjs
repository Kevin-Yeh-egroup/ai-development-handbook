import { readFile, mkdir, writeFile } from 'node:fs/promises';

const here = new URL('./', import.meta.url);
const out = new URL('site/', here);
const lessons = JSON.parse(await readFile(new URL('lessons.json', here), 'utf8'));
const design = await readFile(new URL('design.html', here), 'utf8');
const designCss = design.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i)?.[1];

if (!designCss || !Array.isArray(lessons) || lessons.length < 1) {
  throw new Error('需要 Claude 設計稿與課程內容。');
}
const slugs = new Set();
for (const lesson of lessons) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.slug) || slugs.has(lesson.slug)) {
    throw new Error('課程網址不合法或重複：' + lesson.slug);
  }
  slugs.add(lesson.slug);
  for (const field of ['title', 'group', 'intro', 'pass']) {
    if (typeof lesson[field] !== 'string' || !lesson[field].trim()) {
      throw new Error(lesson.slug + ' 缺少 ' + field);
    }
  }
  for (const field of ['diagram', 'steps', 'prompts']) {
    if (!Array.isArray(lesson[field]) || lesson[field].length === 0) {
      throw new Error(lesson.slug + ' 缺少 ' + field);
    }
  }
  if (!lesson.prompts.every(item => typeof item.text === 'string' && item.text.trim() && item.label)) {
    throw new Error(lesson.slug + ' 的指令不完整');
  }
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const srcRepo = 'https://github.com/Kevin-Yeh-egroup/ai-development-handbook';

const copyJs = async function () {
  document.addEventListener('click', async event => {
    const button = event.target.closest('button[data-copy]');
    if (!button) return;
    const box = button.closest('.prompt-box');
    const text = box.querySelector('pre').textContent;
    const details = box.querySelector('details');
    const feedback = box.querySelector('[role=status]');
    try {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const input = document.createElement('textarea');
        input.value = text;
        input.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none';
        document.body.append(input);
        try {
          input.select();
          if (!document.execCommand('copy')) throw new Error('copy unavailable');
        } finally {
          input.remove();
          button.focus();
        }
      }
      feedback.textContent = '已複製，可以貼到 Codex。';
    } catch {
      details.open = true;
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(box.querySelector('pre'));
      selection.removeAllRanges();
      selection.addRange(range);
      feedback.textContent = '已選取指令，請使用瀏覽器的複製功能。';
    }
  });
};

function lessonPath(lesson) {
  return lesson.slug + '.html';
}

function promptMarkup(prompt) {
  return '<div class="prompt-box"><div class="prompt-head"><strong>' + esc(prompt.label) +
    '</strong><button type="button" data-copy>複製指令</button></div><span role="status"></span>' +
    '<details><summary>看完整指令</summary><pre tabindex="0">' + esc(prompt.text) +
    '</pre></details></div>';
}

function diagram(items) {
  return '<ol class="diagram flow" aria-label="操作流程">' +
    items.map(item => '<li class="flow-node">' + esc(item) + '</li>').join('') + '</ol>';
}

function lessonMarkup(lesson, index, mode) {
  const anchor = mode === 'offline' ? '#' : '';
  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  const href = item => anchor ? anchor + item.slug : lessonPath(item);
  const coach = Array.isArray(lesson.coach) ? lesson.coach.join('\n') : lesson.coach;
  return '<article class="lesson card" id="' + esc(lesson.slug) + '">' +
    '<header class="lesson-heading"><p class="eyebrow">' + esc(lesson.group) + '</p>' +
    '<h2>' + esc(lesson.title) + '</h2><p>' + esc(lesson.intro) + '</p></header>' +
    diagram(lesson.diagram) +
    '<ol class="steps">' + lesson.steps.map(step => '<li>' + esc(step) + '</li>').join('') + '</ol>' +
    lesson.prompts.map(promptMarkup).join('') +
    '<p class="pass"><strong>過關畫面</strong> ' + esc(lesson.pass) + '</p>' +
    (coach ? '<details class="coach"><summary>帶教備註</summary><p>' + esc(coach) + '</p></details>' : '') +
    '<nav class="lesson-nav" aria-label="前後課程">' +
    (previous ? '<a href="' + href(previous) + '">← ' + esc(previous.title) + '</a>' : '<span></span>') +
    (next ? '<a href="' + href(next) + '">' + esc(next.title) + ' →</a>' : '<a href="' +
      (anchor ? '#top' : './') + '">回課程目錄</a>') + '</nav></article>';
}

function catalog(mode) {
  return '<section class="catalog"><h2>選一課開始</h2>' +
    [...new Set(lessons.map(item => item.group))].map(group =>
      '<div class="course-group"><h3>' + esc(group) + '</h3><ul>' +
      lessons.filter(item => item.group === group).map(item =>
        '<li><a href="' + (mode === 'offline' ? '#' + item.slug : lessonPath(item)) + '">' +
        esc(item.title) + '<span aria-hidden="true"> →</span></a></li>').join('') + '</ul></div>').join('') +
    '</section>';
}

const sources = [
  ['Codex 桌面 App', 'https://learn.chatgpt.com/docs/app'],
  ['AGENTS.md', 'https://learn.chatgpt.com/docs/agent-configuration/agents-md'],
  ['Claude Code 入門', 'https://code.claude.com/docs/en/quickstart'],
  ['GitHub 審查流程', 'https://docs.github.com/en/pull-requests/get-started/pull-request-quickstart']
];

function documentHtml(title, contents, single = false) {
  return '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(title) + '</title><style>' + designCss + '\n' + styles + '</style></head>' +
    '<body id="top"><a class="skip-link" href="#main">跳到課程內容</a><main id="main" class="course-shell">' +
    '<header class="course-header"><h1>' + esc(title) + '</h1><p>第一次用 AI 改程式？照順序做，每次只練一步。</p>' +
    '<nav aria-label="教材連結">' +
    (single ? '<a href="#catalog">跳到課程目錄</a>' : '<a href="./">課程目錄</a><a href="handbook.html" download>下載離線手冊</a>') +
    '</nav></header>' + contents + '<footer><a href="' + srcRepo + '">教材 GitHub repo</a>' +
    '<details><summary>工具的官方說明</summary><ul>' + sources.map(([label, url]) =>
      '<li><a href="' + url + '">' + esc(label) + '</a></li>').join('') +
    '</ul></details></footer></main><script>(' + copyJs.toString() + ')();</script></body></html>';
}

const styles = `
.course-shell{max-width:960px;margin:0 auto;padding:0 20px;--brand-ink:var(--go);--brand-tint:var(--go-bg)}
.course-header{padding:28px 0 16px}
.course-header p{margin:.55em 0}
.course-header nav,.lesson-nav{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
.course-header nav a,.lesson-nav a,.catalog a{display:inline-flex;align-items:center;min-height:44px}
.course-shell a{color:var(--brand-ink,var(--ink,#12343b));text-underline-offset:3px}
.course-shell section,.course-shell .lesson{margin-block:18px;min-width:0}
.course-shell .lesson,.catalog,.overview{border:1px solid var(--line,#ddd5c6);border-radius:16px;background:var(--card,#fff);padding:clamp(15px,3vw,28px)}
.course-shell .lesson{height:auto;box-shadow:var(--sh);border:2px solid var(--ink)}
.course-shell .diagram .flow-node::before{content:none}
.lesson-heading p:last-child{margin:.5rem 0}
.eyebrow{font-size:.9rem;font-weight:700;color:var(--brand-ink,#0a4a40)}
.course-shell .diagram{list-style:none;display:flex;align-items:stretch;gap:24px;flex-wrap:nowrap;margin:20px 0;padding:0}
.course-shell .diagram .flow-node{position:relative;flex:1;display:grid;place-items:center;min-width:0;padding:12px 8px;text-align:center;border:1px solid var(--line,#ddd5c6);background:var(--brand-tint,#e3f1ec);color:var(--brand-ink,#0a4a40);font-weight:700;border-radius:12px}
.course-shell .diagram .flow-node:not(:last-child)::after{content:"→";position:absolute;left:calc(100% + 4px);top:50%;transform:translateY(-50%);color:var(--brand-ink,#0a4a40)}
.steps{padding-inline-start:1.5em;margin-block:16px}
.steps li+li{margin-top:8px}
.prompt-box{background:var(--paper,#fbf7ef);border:1px solid var(--line,#ddd5c6);border-radius:12px;padding:12px;margin:12px 0}
.prompt-head{display:flex;flex-wrap:wrap;gap:8px 14px;justify-content:space-between;align-items:center}
[data-copy]{min-height:44px;cursor:pointer;border:0;border-radius:8px;padding:8px 16px;background:var(--brand-ink,#0a4a40);color:#fff;font:inherit;font-weight:700}
[role=status]:not(:empty){display:block;margin-top:6px}
.course-shell details{margin-top:4px}
.course-shell summary{cursor:pointer;min-height:44px;display:list-item;align-content:center}
.course-shell pre{white-space:pre-wrap;overflow-wrap:anywhere;max-width:100%;font:inherit;line-height:1.65;border-left:3px solid var(--brand-ink,#0a4a40);padding:8px 12px;margin:0;color:var(--ink,#12343b);background:var(--card,#fff)}
.course-shell .pass{border-radius:10px;background:var(--ok-tint,#e4f3e7);color:var(--ok,#17693a);padding:10px;margin-top:14px}
.course-shell .coach p{white-space:pre-line}
.lesson-nav{justify-content:space-between;margin-top:12px}
.catalog ul{list-style:none;margin:0;padding:0}
.catalog li:not(:last-child){border-bottom:1px solid var(--line,#ddd5c6)}
.catalog a{width:100%;justify-content:space-between}
.course-group{margin-top:16px}
.course-shell footer{padding:16px 0}
.skip-link{position:absolute;left:12px;top:-120px;z-index:9;background:#fff;padding:10px}
.skip-link:focus{top:4px}
:focus-visible{outline:3px solid #9c3e17;outline-offset:3px}
@media(max-width:600px){
 .course-shell{padding:0 14px}
 .course-shell .diagram{flex-direction:column}
 .course-shell .diagram .flow-node:not(:last-child)::after{content:"↓";top:100%;left:50%;transform:translateX(-50%)}
}
@media print{
 .course-shell .lesson{break-inside:auto}
 [data-copy],.skip-link,.course-header nav,.lesson-nav{display:none}
 .course-shell details:not([open])>pre{display:block}
}
`;

const outline = '<section class="overview"><h2>用圖看四段路</h2>' + diagram([
  '設定工具｜打開練習資料夾',
  '修改程式｜改一小步再親手驗證',
  '建立專案｜先做能運作的一小版',
  'Agent 分工｜交棒、複核、驗收'
]) + '</section>';

await mkdir(out, { recursive: true });
await writeFile(new URL('index.html', out),
  documentHtml('AI 協作開發教學手冊', lessonMarkup(lessons[0], 0, 'online') + outline + catalog('online')));
await Promise.all(lessons.map((lesson, index) => writeFile(new URL(lessonPath(lesson), out),
  documentHtml(lesson.title, lessonMarkup(lesson, index, 'online')))));
await writeFile(new URL('handbook.html', out),
  documentHtml('AI 協作開發教學手冊', lessonMarkup(lessons[0], 0, 'offline') + outline +
    '<div id="catalog">' + catalog('offline') + '</div>' +
    lessons.slice(1).map((lesson, index) => lessonMarkup(lesson, index + 1, 'offline')).join(''), true));
console.log('已產生 ' + lessons.length + ' 課、課程目錄與離線手冊。');
