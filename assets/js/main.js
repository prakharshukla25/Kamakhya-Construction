import { company } from './company.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// Theme follows the OS until a visitor makes a choice. Storage is optional.
const themeButton = $('.theme-toggle');
const colorScheme = matchMedia('(prefers-color-scheme: dark)');
function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.title = `Switch to ${dark ? 'light' : 'dark'} theme`;
  $('meta[name="theme-color"]').content = dark ? '#18251f' : '#f7f5ef';
}
themeButton.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('kamkhaya-theme', next); } catch { /* Private browsing can block storage. */ }
  syncThemeButton();
});
colorScheme.addEventListener('change', event => {
  let saved;
  try { saved = localStorage.getItem('kamkhaya-theme'); } catch { /* Follow the OS. */ }
  if (saved !== 'dark' && saved !== 'light') {
    document.documentElement.dataset.theme = event.matches ? 'dark' : 'light';
    syncThemeButton();
  }
});
syncThemeButton();

// Mobile navigation remains keyboard accessible and never traps focus.
const menuButton = $('.menu-toggle');
const mobileNav = $('#mobile-nav');
function closeMenu() {
  mobileNav.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  mobileNav.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', `${open ? 'Close' : 'Open'} navigation`);
});
$$('a', mobileNav).forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); }
});
matchMedia('(min-width: 701px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

const navLinks = $$('.desktop-nav a');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      navLinks.forEach(link => {
        const active = link.hash === `#${entry.target.id}`;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-20% 0px -60% 0px' });
  $$('main section[id]').forEach(section => observer.observe(section));
}

// Each photograph keeps its description with its markup, so additions do not
// depend on a second array staying in the same order.
const projectCards = $$('.project-card');
const projects = projectCards.map(card => ({
  image: $('img', card).getAttribute('src'),
  alt: $('img', card).alt,
  title: $('.project-title', card).textContent,
  category: $('.project-pill', card).textContent,
  description: card.dataset.description,
  filter: card.dataset.category,
}));
let activeFilter = 'all';
let currentProject = 0;
const galleryPageSize = 6;
let visibleLimit = galleryPageSize;
const loadMoreButton = $('#load-more-projects');
const projectDialog = $('#project-dialog');

function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('modal-open');
}
$$('dialog').forEach(dialog => {
  $('.dialog-close', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { if (!$('dialog[open]')) document.body.classList.remove('modal-open'); });
});
function filteredIndices() { return projects.flatMap((project, index) => activeFilter === 'all' || project.filter === activeFilter ? [index] : []); }
function displayProject(index) {
  currentProject = index;
  const project = projects[index];
  const image = $('#dialog-project-image');
  image.src = project.image;
  image.alt = project.alt;
  $('#dialog-project-title').textContent = project.title;
  $('#dialog-project-category').textContent = project.category;
  $('#dialog-project-description').textContent = project.description;
  const indices = filteredIndices();
  $('#gallery-counter').textContent = `${indices.indexOf(index) + 1} / ${indices.length}`;
  $('#prev-project').disabled = $('#next-project').disabled = indices.length < 2;
}
projectCards.forEach((card, index) => card.addEventListener('click', () => { displayProject(index); openDialog(projectDialog); }));
function moveProject(direction) {
  const indices = filteredIndices();
  displayProject(indices[(indices.indexOf(currentProject) + direction + indices.length) % indices.length]);
}
$('#prev-project').addEventListener('click', () => moveProject(-1));
$('#next-project').addEventListener('click', () => moveProject(1));
projectDialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') { event.preventDefault(); moveProject(1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); moveProject(-1); }
});
$('.dialog-contact').addEventListener('click', () => projectDialog.close());
function updateGallery(announce = true) {
  const indices = filteredIndices();
  const shown = indices.slice(0, visibleLimit);
  const visible = new Set(shown);
  projectCards.forEach((card, index) => { card.hidden = !visible.has(index); });
  loadMoreButton.hidden = shown.length >= indices.length;
  const remaining = Math.min(galleryPageSize, indices.length - shown.length);
  $('.load-more-label', loadMoreButton).textContent = `Explore ${remaining} more ${remaining === 1 ? 'view' : 'views'}`;
  const status = `Showing ${shown.length} of ${indices.length} photographs`;
  $('#gallery-count').textContent = status;
  if (announce) $('#filter-status').textContent = `${status}.`;
}
$$('[data-filter-count]').forEach(element => {
  const count = element.dataset.filterCount === 'all' ? projects.length : projects.filter(project => project.filter === element.dataset.filterCount).length;
  element.textContent = String(count).padStart(2, '0');
});
$$('.filter').forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  visibleLimit = galleryPageSize;
  $$('.filter').forEach(filter => {
    const active = filter === button;
    filter.classList.toggle('active', active);
    filter.setAttribute('aria-pressed', String(active));
  });
  updateGallery();
}));
loadMoreButton.addEventListener('click', () => {
  const indices = filteredIndices();
  const firstNewIndex = indices[visibleLimit];
  visibleLimit += galleryPageSize;
  updateGallery();
  if (firstNewIndex !== undefined) {
    projectCards[firstNewIndex].focus({ preventScroll: true });
    projectCards[firstNewIndex].scrollIntoView({ block: 'start' });
  }
});
updateGallery(false);

// Only a real address becomes an email action. The requested preview address stays labelled.
const phoneDigits = company.phone.replace(/[^+\d]/g, '');
$$('[data-company-phone]').forEach(link => { link.href = `tel:${phoneDigits}`; });
$$('[data-phone-text]').forEach(element => { element.textContent = company.phone; });
$('#email-text').textContent = company.email;
const realEmail = !company.emailIsPlaceholder && !/\.(example|invalid|test)$/i.test(company.email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.email);
if (realEmail) {
  $('#email-badge').hidden = true;
  const emailLink = document.createElement('a');
  emailLink.href = `mailto:${company.email}`;
  emailLink.textContent = company.email;
  $('#email-text').replaceChildren(emailLink);
}
$('#location-text').textContent = company.location === 'All cities' ? 'Available for projects in all cities' : company.location;
const whatsappNumber = company.whatsapp.replace(/\D/g, '');
$$('[data-whatsapp]').forEach(link => { link.href = `https://wa.me/${whatsappNumber}`; });
$('#year').textContent = new Date().getFullYear();
$$('[data-service]').forEach(link => link.addEventListener('click', () => { $('#service').value = link.dataset.service; }));

// The static form prepares an enquiry; only a visitor can send it in WhatsApp.
const form = $('#enquiry-form');
$('.form-submit', form).disabled = false;
let enquiry = '';
form.addEventListener('submit', event => {
  event.preventDefault();
  const name = $('#name');
  const message = $('#message');
  const phone = $('#phone');
  name.setCustomValidity(name.value.trim() ? '' : 'Please enter your name.');
  message.setCustomValidity(message.value.trim().length >= 10 ? '' : 'Please tell us a little more about your project (at least 10 characters).');
  phone.setCustomValidity(phone.value.replace(/\D/g, '').length >= 7 ? '' : 'Please enter a contact number with at least 7 digits.');
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const lines = [
    `Hello ${company.name},`,
    'I’d like to discuss a project.',
    '',
    `Name: ${String(data.get('name')).trim()}`,
    `Phone: ${String(data.get('phone')).trim()}`,
    ...(String(data.get('email')).trim() ? [`Email: ${String(data.get('email')).trim()}`] : []),
    `Service: ${data.get('service')}`,
    '',
    String(data.get('message')).trim(),
  ];
  enquiry = lines.join('\n');
  $('#enquiry-preview').textContent = enquiry;
  $('#send-whatsapp').href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(enquiry)}`;
  $('#copy-status').textContent = '';
  openDialog($('#enquiry-dialog'));
});
['name', 'message', 'phone'].forEach(id => $(`#${id}`).addEventListener('input', event => event.target.setCustomValidity('')));
$('#copy-enquiry').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(enquiry);
    $('#copy-status').textContent = 'Message copied.';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents($('#enquiry-preview'));
    selection.removeAllRanges();
    selection.addRange(range);
    $('#copy-status').textContent = 'Message selected. Use your device’s Copy action.';
  }
});

// Keep playback deliberate and stop videos when a visitor collapses a card.
$$('.walkthrough').forEach(details => {
  const video = $('video', details);
  details.addEventListener('toggle', () => { if (!details.open) video?.pause(); });
  video?.addEventListener('play', () => {
    $$('video').forEach(other => { if (other !== video) other.pause(); });
  });
});
