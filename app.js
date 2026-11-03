(() => {
  'use strict';
  const media = window.PORTFOLIO_MEDIA || [];
  const grid = document.querySelector('#video-grid');
  const search = document.querySelector('#video-search');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const dialog = document.querySelector('#video-dialog');
  const player = document.querySelector('#player');
  let category = 'All';
  let visible = media;
  let playlist = media;
  let currentId;
  let opener;
  const duration = seconds => seconds < 2 ? `${seconds.toFixed(1)}s loop` : `${Math.floor(Math.round(seconds) / 60)}:${String(Math.round(seconds) % 60).padStart(2,'0')}`;
  function render() {
    const query = search.value.trim().toLowerCase();
    visible = media.filter(item => (category === 'All' || item.category === category) && `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(query));
    grid.replaceChildren(...visible.map(item => {
      const article = document.createElement('article');
      article.className = 'video-card';
      const button = document.createElement('button');
      button.className = 'thumbnail'; button.dataset.video = item.id;
      button.setAttribute('aria-label', `Play ${item.title}`);
      const image = document.createElement('img');
      image.src = item.poster; image.alt = ''; image.loading = 'lazy'; image.width = 960; image.height = 540;
      const play = document.createElement('span'); play.className = 'small-play'; play.textContent = '▶'; play.setAttribute('aria-hidden','true');
      const time = document.createElement('span'); time.className = 'duration'; time.textContent = duration(item.duration);
      button.append(image,play,time);
      const label = document.createElement('p'); label.className = 'kicker'; label.textContent = item.category;
      const title = document.createElement('h3'); title.textContent = item.title;
      const description = document.createElement('p'); description.textContent = item.description;
      article.append(button,label,title,description);
      return article;
    }));
    document.querySelector('#video-status').textContent = `${visible.length} video${visible.length === 1 ? '' : 's'}${category === 'All' ? '' : ` · ${category}`}${query ? ` matching “${search.value.trim()}”` : ''}`;
    document.querySelector('#no-results').hidden = visible.length > 0;
    filters.forEach(button => {
      const selected = button.dataset.filter === category;
      button.classList.toggle('active',selected); button.setAttribute('aria-pressed',String(selected));
    });
  }
  function showVideo(id) {
    const item = media.find(item => item.id === id);
    if (!item) return;
    currentId = id;
    player.pause(); player.src = item.src; player.poster = item.poster;
    player.loop = item.loop; player.muted = !item.audio;
    document.querySelector('#player-title').textContent = item.title;
    document.querySelector('#player-description').textContent = item.description;
    document.querySelector('#player-category').textContent = item.category;
    document.querySelector('#audio-note').textContent = item.audio ? 'Audio available · use the player volume control' : item.loop ? 'Silent research visualization · loops automatically' : 'Silent demonstration';
    document.querySelector('#playback-error').hidden = true;
    document.querySelector('#direct-video').href = item.src;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    player.play().catch(() => { /* Native controls remain available if autoplay is blocked. */ });
  }
  function move(offset) {
    const index = playlist.findIndex(item => item.id === currentId);
    if (playlist.length) showVideo(playlist[(index + offset + playlist.length) % playlist.length].id);
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-video]');
    if (trigger) {
      opener = trigger;
      playlist = trigger.closest('#video-grid') ? visible : media;
      showVideo(trigger.dataset.video);
    }
    const filter = event.target.closest('[data-filter]');
    if (filter) { category = filter.dataset.filter; render(); }
    const jump = event.target.closest('[data-category]');
    if (jump) { category = jump.dataset.category; search.value = ''; render(); document.querySelector('#videos').scrollIntoView(); }
  });
  search.addEventListener('input',render);
  document.querySelector('#close-player').addEventListener('click',() => dialog.close());
  document.querySelector('#previous-video').addEventListener('click',() => move(-1));
  document.querySelector('#next-video').addEventListener('click',() => move(1));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close',() => {
    player.pause(); player.removeAttribute('src'); player.load();
    document.body.style.overflow = '';
    if (opener && opener.isConnected) opener.focus({preventScroll:true});
  });
  player.addEventListener('error',() => {
    if (dialog.open && player.getAttribute('src')) document.querySelector('#playback-error').hidden = false;
  });
  render();
})();
