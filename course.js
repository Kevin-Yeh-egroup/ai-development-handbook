(() => {
  const cards = [...document.querySelectorAll('[data-lesson]')];
  const steps = [...document.querySelectorAll('[data-level]')];
  const start = document.querySelector('#start');
  const welcome = document.querySelector('#welcome');
  const key = 'kevin-ai-handbook-levels-v1';
  const done = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(saved)) {
      for (const card of cards) {
        if (!saved.includes(card.id)) break;
        done.add(card.id);
      }
    }
  } catch {
    // The current visit remains usable when browser storage is blocked.
  }

  let active = null;
  const isUnlocked = index => index === 0 || done.has(cards[index - 1].id);
  const nextUnfinished = () => Math.min(done.size, cards.length - 1);
  const report = message => { document.querySelector('#live').textContent = message; };

  function renderProgress() {
    const progress = document.querySelector('#progress');
    progress.setAttribute('aria-valuenow', done.size);
    progress.firstElementChild.style.width = done.size / cards.length * 100 + '%';
    document.querySelector('#count').textContent = done.size + ' / ' + cards.length + ' 關';
    start.textContent = done.size === cards.length ? '回看最後一關' :
      done.size ? '繼續第 ' + (nextUnfinished() + 1) + ' 關' : '開始第 1 關';
    steps.forEach((button, index) => {
      const learned = done.has(cards[index].id);
      const available = isUnlocked(index);
      button.toggleAttribute('data-done', learned);
      button.setAttribute('aria-disabled', String(!available));
      button.setAttribute('aria-current', String(index === active));
      button.firstElementChild.textContent = (learned ? '✓ ' : '') + (index + 1) + ' 關' + (cards[index].querySelector('.milestone') ? ' · 大魔王' : '') + (available ? '' : ' · 待解鎖');
      button.setAttribute('aria-label', button.textContent.trim() + (learned ? '，已完成' : available ? '' : '，待解鎖'));
    });
  }

  function renderLesson(card, celebrate = false) {
    const learned = done.has(card.id);
    const confirm = card.querySelector('[data-action=complete]');
    confirm.disabled = learned;
    confirm.textContent = learned ? '已確認 ✓' : '我做到了';
    card.querySelector('[data-action=help]').hidden = learned;
    const reward = card.querySelector('.reward');
    reward.hidden = !learned;
    reward.classList.toggle('celebrate', celebrate);
  }

  function show(index, { focus = false, historyMode = 'none' } = {}) {
    if (!isUnlocked(index)) {
      report('先完成前一關，就可以繼續。');
      return;
    }
    active = index;
    welcome.hidden = true;
    cards.forEach((card, cardIndex) => {
      card.hidden = cardIndex !== index;
      if (cardIndex === index) {
        card.querySelector('.recovery').hidden = true;
        renderLesson(card);
      }
    });
    renderProgress();
    if (historyMode !== 'none') {
      const fragment = '#' + cards[index].id;
      if (location.hash !== fragment) history[historyMode + 'State'](null, '', fragment);
    }
    if (focus) cards[index].querySelector('h2').focus();
  }

  function showWelcome(focus = false) {
    active = null;
    cards.forEach(card => { card.hidden = true; });
    welcome.hidden = false;
    renderProgress();
    if (focus) {
      history.pushState(null, '', location.pathname + location.search + '#home');
      welcome.querySelector('h1').focus();
    }
  }

  function followLocation() {
    const fragment = location.hash === '#main' ? '' : location.hash.slice(1);
    const hint = fragment || document.body.dataset.entry;
    const wanted = cards.findIndex(card => card.id === hint);
    if (wanted === -1) {
      showWelcome();
    } else if (isUnlocked(wanted)) {
      show(wanted);
    } else {
      show(nextUnfinished(), { historyMode: 'replace' });
      report('先從你目前能做的這一關開始。');
    }
  }

  async function copy(button) {
    const prompt = button.closest('.prompt');
    const content = prompt.querySelector('pre');
    const feedback = prompt.querySelector('.feedback');
    try {
      await navigator.clipboard.writeText(content.textContent);
      feedback.textContent = button.textContent.includes('Codex') ? '已複製，貼到 Codex 就可以開始。' : '已複製。';
    } catch {
      prompt.querySelector('details').open = true;
      const range = document.createRange();
      range.selectNodeContents(content);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      feedback.textContent = '已選取指令。請用瀏覽器的複製功能。';
    }
  }

  document.querySelector('.skip').addEventListener('click', event => {
    event.preventDefault();
    document.querySelector('#main').focus();
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button === start) {
      show(nextUnfinished(), { focus: true, historyMode: 'push' });
    } else if (button.id === 'back-home') {
      showWelcome(true);
    } else if (button.hasAttribute('data-level')) {
      show(Number(button.dataset.level), { focus: true, historyMode: 'push' });
    } else if (button.hasAttribute('data-copy')) {
      void copy(button);
    } else if (button.dataset.action === 'help') {
      button.closest('[data-lesson]').querySelector('.recovery').hidden = false;
      report('目前還沒記完成，可以照提示再試一次。');
    } else if (button.dataset.action === 'complete' && active !== null) {
      const card = cards[active];
      if (done.has(card.id) || !isUnlocked(active)) return;
      done.add(card.id);
      let saved = true;
      try { localStorage.setItem(key, JSON.stringify([...done])); } catch { saved = false; }
      card.querySelector('.recovery').hidden = true;
      renderProgress();
      renderLesson(card, true);
      card.querySelector('.reward button').focus();
      report('第 ' + (active + 1) + ' 關完成。' +
        (saved ? '' : '目前瀏覽器無法保存進度，這次仍可繼續。'));
    } else if (button.dataset.action === 'next' && active !== null) {
      if (active + 1 === cards.length) showWelcome(true);
      else show(active + 1, { focus: true, historyMode: 'push' });
    }
  });
  window.addEventListener('popstate', followLocation);
  window.addEventListener('hashchange', followLocation);
  followLocation();
})();
