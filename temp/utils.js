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
          if (!document.getElementById('map')) {
            window.location.href = 'alberta.html';
          }
          break;

        case 'forum':
  window.location.href = 'https://polimap.discourse.group';
  break;

        case 'judiciary':
          if (!window.location.pathname.includes('judiciary')) {
            window.location.href = 'judiciary.html';
          }
          break;

        case 'rcmp':
          if (!window.location.pathname.includes('rcmp')) {
            window.location.href = 'rcmp.html';
          }
          break;

        case 'gov':
          if (!window.location.pathname.includes('government')) {
            window.location.href = 'government.html';
          }
          break;

        case 'contribute':
          if (!window.location.pathname.includes('contribute')) {
            window.location.href = 'contribute.html';
          }
          break;

        case 'donate':
          if (!window.location.pathname.includes('donate')) {
            window.location.href = 'donate.html';
          }
          break;

        default:
          console.log('Unhandled banner action:', action);
      }
    });
  });
});


