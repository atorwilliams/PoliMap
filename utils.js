// utils.js – banner button handlers & future shared utilities

document.addEventListener('DOMContentLoaded', () => {
  const bannerButtons = document.querySelectorAll('.nav-btn');

  bannerButtons.forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (!action) return;

      bannerButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      switch (action) {
        case 'map':
          if (document.getElementById('map')) {
            closeAboutModal();
          } else {
            window.location.href = 'index.html';
          }
          break;

        case 'about':
          openAboutModal();
          break;

        case 'forum':
  window.location.href = 'https://polimap.discourse.group';
  break;

        case 'separatist':
          if (!window.location.pathname.includes('separatist')) {
            window.location.href = 'separatist.html';
          }
          break;

        case 'news':
          if (!window.location.pathname.includes('news')) {
            window.location.href = 'news.html';
          }
          break;

        case 'gov':
          window.open('https://www.alberta.ca', '_blank');
          break;

        case 'contribute':
          window.open('https://github.com/atorwilliams/polimap', '_blank');
          break;

        case 'donate':
          window.open('https://ko-fi.com/atorwilliams', '_blank');
          break;

        default:
          console.log('Unhandled banner action:', action);
      }
    });
  });
});

function closeAboutModal() {
  const overlay = document.getElementById('about-overlay');
  if (!overlay) return;

  overlay.classList.remove('open');
  overlay.addEventListener('transitionend', function handler(e) {
    if (e.propertyName === 'opacity') {
      overlay.removeEventListener('transitionend', handler);
      overlay.remove();
    }
  });
}

function openAboutModal() {
  closeAboutModal();

  const overlay = document.createElement('div');
  overlay.id = 'about-overlay';
  overlay.className = 'about-overlay';
  overlay.innerHTML = `
    <div class="about-content">
      <button id="about-close" aria-label="Close">&#x2715;</button>

      <div class="about-header">
        <h1>PoliMap</h1>
        <p class="about-tagline">Alberta Political Mapping Tool</p>
      </div>

      <p>A tool to visualize who actually represents Alberta — provincial MLAs and federal MPs — and how to reach them.</p>
      

      <blockquote>
        "They are ruled by people they do not know, whose names they do not know, whose faces they have never seen."
        <cite>— Unknown</cite>
      </blockquote>

      <div class="about-section">
        <h2>Built by</h2>
        <p>Arthur in Vienna.</p>
      </div>

      <div class="about-section">
        <h2>Support</h2>
        <p>If this helps you understand or share Alberta politics, consider supporting the project:</p>
        <a class="about-link-btn" href="https://ko-fi.com/yourusername" target="_blank">Buy me a coffee →</a>
      </div>

      <p class="about-footer">v0.1 · March 2026 · Built with open data and spite</p>
    </div>
  `;

  document.body.appendChild(overlay);

  // Double rAF forces a reflow so the transition actually fires
  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add('open'));
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.id === 'about-close') {
      closeAboutModal();
      // Restore Map View as active
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelector('.nav-btn[data-action="map"]')?.classList.add('active');
    }
  });
}

