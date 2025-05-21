const menu = document.getElementById('hamburger-menu');
const toggle = document.getElementById('hamburger-toggle');

// Hamburger toggle logic
toggle.addEventListener('click', () => {
    menu.classList.toggle('open');
});