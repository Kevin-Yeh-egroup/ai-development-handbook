(() => {
  const viewer = document.querySelector('#shot-viewer');
  const title = viewer.querySelector('h2');
  const canvas = viewer.querySelector('.shot-viewer-canvas');
  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-shot-open]');
    if (!opener || viewer.open) return;
    const frame = opener.querySelector('.shot-frame').cloneNode(true);
    frame.querySelector('img').loading = 'eager';
    title.textContent = opener.closest('figure').querySelector('h3').textContent;
    canvas.replaceChildren(frame);
    viewer.showModal();
    canvas.scrollTo(0, 0);
  });
  viewer.addEventListener('close', () => { canvas.replaceChildren(); });
})();
