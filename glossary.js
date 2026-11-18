(() => {
  const dictionary = document.querySelector('.glossary');
  const search = dictionary.querySelector('input[type=search]');
  const entries = [...dictionary.querySelectorAll('[data-term]')];
  const status = dictionary.querySelector('[data-glossary-status]');
  const back = dictionary.querySelector('[data-glossary-return]');
  let opener;
  back.addEventListener('click', () => {
    dictionary.open = false;
    back.hidden = true;
    opener?.focus();
  });
  search.addEventListener('input', () => {
    const query = search.value.trim().toLocaleLowerCase('zh-TW');
    let found = 0;
    for (const entry of entries) {
      entry.hidden = !entry.firstElementChild.textContent.toLocaleLowerCase('zh-TW').includes(query);
      if (!entry.hidden) found += 1;
    }
    status.textContent = query ? found ? '找到 ' + found + ' 個名詞。' : '沒找到。試試看縮寫或另一個詞。' : '';
  });
  document.querySelectorAll('[data-glossary-open]').forEach(button => {
    button.addEventListener('click', () => {
      opener = button;
      back.hidden = false;
      dictionary.open = true;
      search.value = button.dataset.glossaryOpen;
      search.dispatchEvent(new Event('input'));
      search.focus();
    });
  });
})();
