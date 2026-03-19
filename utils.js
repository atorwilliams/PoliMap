// utils.js – banner button handlers & future shared utilities

document.addEventListener('DOMContentLoaded', () => {
  const bannerButtons = document.querySelectorAll('.nav-btn');

  bannerButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const action = button.dataset.action;

      if (!action) return; // safety

      // Remove active from all buttons (optional – you can keep 'Map View' active if you want)
      bannerButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      switch (action) {
        case 'about':
          openAboutModal();
          break;

        case 'forum':
          window.open('https://your-discussion-forum-link.com', '_blank'); // replace with real link
          break;

        case 'separatist':
          openSeparatistInfo();
          break;

        case 'gov':
          window.open('https://www.alberta.ca', '_blank'); // or specific gov page
          break;

        case 'contribute':
          window.open('https://github.com/atorwilliams/polimap', '_blank');
          break;

        case 'donate':
          window.open('https://ko-fi.com/yourusername', '_blank'); // replace with real link
          break;

        default:
          console.log('Unhandled banner action:', action);
      }
    });
  });
});

// Simple About modal (overlay)
function openAboutModal() {
  let overlay = document.getElementById('about-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'about-overlay';
    overlay.className = 'about-overlay';
    overlay.innerHTML = `
      <div class="about-content">
        <button id="about-close">×</button>
        <h1>About PoliMap</h1>
        <p>A tool to visualize who actually represents Alberta — provincial MLAs and federal MPs.</p>
        <p>Goal: Make power visible. Who draws the lines? Who sits in them? Where does the money flow?</p>

        <blockquote>
          "The people are ruled by people they do not know, whose names they do not know, whose faces they have never seen."<br>
          — Arthur / PoliMap
        </blockquote>

        <h2>Built by</h2>
        <p>Arthur in Vienna, with Grok assistance.</p>

        <h2>Contact / Contribute</h2>
        <p>Found a bug? Got better data? Want to expand to BC or Saskatchewan?</p>
        <p><a href="https://github.com/atorwilliams/polimap" target="_blank">Fork on GitHub →</a></p>

        <h2>Donate</h2>
        <p>If this helps you understand or share Alberta politics, consider supporting:</p>
        <p><a href="https://ko-fi.com/yourusername" target="_blank">Buy me a coffee →</a></p>

        <p style="margin-top:40px; font-size:0.9em; color:#888;">
          v0.1 – March 2026 – Built with love, frustration, and open data
        </p>
      </div>
    `;
    document.body.appendChild(overlay);

    // Close on button or outside click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.id === 'about-close') {
        overlay.remove();
      }
    });
  }

  overlay.style.display = 'flex';
}

// Placeholder for Separatist Info (can be a modal or new section later)
function openSeparatistInfo() {
  alert('Separatist Information page coming soon.\n\nIn the meantime, check official sources or forums for Alberta/BC separation discussions.');
}