import { copyFile, mkdir, readFile } from 'node:fs/promises';

const catalog = new URL('./walkthrough.json', import.meta.url);
const assets = new URL('./screenshots/', import.meta.url);
const sourceLinks = {
  codex: 'https://learn.chatgpt.com/training/codex-lab/index.html?step=project',
  github: 'https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request'
};
const credit = {
  codex: 'OpenAI 官方 Codex 練習畫面',
  github: 'GitHub 官方操作畫面',
  output: '本機練習實跑輸出節錄',
  draft: '依本機練習結果寫成的草稿範例',
  browser: '本機練習網頁實際操作'
};
const esc = value => String(value).replace(/[&<>"']/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export async function loadWalkthrough(slugs) {
  const { shots, lessons } = JSON.parse((await readFile(catalog, 'utf8')).replace(/^\uFEFF/, ''));
  for (const slug of slugs) {
    if (!lessons[slug]?.length || lessons[slug].some(id => !shots[id])) {
      throw new Error('操作截圖不齊：' + slug);
    }
  }
  const media = new Map(await Promise.all(Object.entries(shots).map(async ([id, shot]) => {
    if (!/^[a-z0-9-]+$/.test(id) || !credit[shot.source]) throw new Error('操作截圖名稱或來源不正確：' + id);
    const filename = id + '.webp';
    const bytes = await readFile(new URL(filename, assets));
    return [id, { ...shot, filename, embedded: 'data:image/webp;base64,' + bytes.toString('base64') }];
  })));

  function figure(id, offline) {
    const shot = media.get(id);
    const uri = './screenshots/' + shot.filename;
    const hits = shot.points.map(({ x, y }, index) =>
      '<span class="shot-point" style="left:' + x + '%;top:' + y + '%">' + (index + 1) + '</span>').join('');
    const labels = shot.points.map(({ label }) => '<li>' + esc(label) + '</li>').join('');
    return '<figure class="walkthrough-shot"><figcaption><h3>' + esc(shot.title) + '</h3></figcaption>' +
      '<div class="shot-frame" style="--shot-width:' + shot.width + 'px">' +
      '<img src="' + (offline ? shot.embedded : uri) + '" width="' + shot.width + '" height="' + shot.height +
      '" loading="lazy" decoding="async" alt="' + esc(shot.alt) + '"><div aria-hidden="true">' + hits + '</div></div>' +
      '<ol class="instructions">' + labels + '</ol><p><strong>接著會看到</strong>　' + esc(shot.result) + '</p>' +
      '<p class="shot-source">' + (sourceLinks[shot.source] ? '<a href="' + sourceLinks[shot.source] + '">' + credit[shot.source] + '</a>' : credit[shot.source]) +
      (offline ? '' : ' · <a href="' + uri + '" target="_blank" rel="noopener">看大圖</a>') + '</p></figure>';
  }

  function markup(slug, offline) {
    const shotsForLesson = lessons[slug];
    const sourceNote = slug === 'setup' ? '<p>圖是 OpenAI 的官方練習畫面。你的來源資料夾請選剛建的 ai-practice，按鈕文字會隨版面或語言略有差異。</p>' :
      slug === 'codex-standing-prompt' ? '<p>用第 1 關同一個聊天。圖片裡是第一關的文字，這次貼第二關的指令。</p>' : '';
    return '<details class="walkthrough"><summary>看操作截圖（' + shotsForLesson.length + ' 張）</summary>' +
      sourceNote + shotsForLesson.map(id => figure(id, offline)).join('') + '</details>';
  }

  async function copyImages(output) {
    const destination = new URL('screenshots/', output);
    await mkdir(destination, { recursive: true });
    await Promise.all([...media.values()].map(({ filename }) =>
      copyFile(new URL(filename, assets), new URL(filename, destination))));
  }

  return { markup, copyImages };
}
