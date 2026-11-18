export function glossaryMarkup(terms, id = 'glossary') {
  const esc = value => value.replace(/[&<>"']/g, char =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  return '<details class="glossary" id="' + id + '"><summary>卡在一個名詞？翻小字典</summary>' +
    '<p>想到哪個就查哪個。可以打中文，也可以直接貼上看到的英文字。</p>' +
    '<label>查名詞 <input type="search" placeholder="例如 PR、分支、Node.js"></label>' +
    '<button type="button" class="term-link" data-glossary-return hidden>回到剛才的關卡</button>' +
    '<p role="status" data-glossary-status></p><dl>' +
    terms.map(([term, meaning, example]) => '<div data-term><dt>' + esc(term) +
      '</dt><dd>' + esc(meaning) + '<br><strong>舉個例子：</strong>' +
      esc(example) + '</dd></div>').join('') + '</dl></details>';
}
