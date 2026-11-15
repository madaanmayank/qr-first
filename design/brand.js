/* Brand layer for the design pages. Qissa Kebab House is an invented brand.
   Replaces photo placeholders with real images, fills logo marks and the brand header. */
const BRAND = {
  name: 'Qissa Kebab House',
  tag: 'Kebabs since 1962 · Old Delhi',
  owner: 'Imran',
  story: 'My grandfather lit this tandoor in Old Delhi in 1962. The seekh recipe has not changed since.',
  logo: '<svg viewBox="0 0 40 40" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 30V19a8 8 0 0116 0v11"/><path d="M9 30h22"/><path d="M20 25c-2.4-2.2-2.4-4.6 0-7 2.4 2.4 2.4 4.8 0 7z" fill="#fff" stroke="none"/></svg>',
  // placeholder hue -> image file
  imgs: { 14: 'seekh', 20: 'galouti', 42: 'malai', 36: 'paneer', 22: 'nihari', 10: 'dal', 46: 'rumali', 40: 'tukda', 52: 'phirni', 18: 'platter' },
};

function brandHead(table) {
  return `<div class="bh">
    <div class="cv"><div class="ic"><button class="ib" aria-label="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg></button><span class="lang">EN</span></div></div>
    <div class="bid"><span class="av lg">${BRAND.logo}</span><div><div class="bn">${BRAND.name}</div><div class="bt">${BRAND.tag}</div></div></div>
    <div class="binfo"><span class="tg grey">${table}</span><span class="tg green">Open till 11 pm</span></div>
  </div>`;
}
const brandStory = () => `<div class="bs"><b>Our story</b><p>${BRAND.story}</p><span>${BRAND.owner}, third generation</span></div>`;

function applyBrand(root = document) {
  root.querySelectorAll('.ph[style*="--h:"]:not([data-img])').forEach(el => {
    const m = /--h:\s*(\d+)/.exec(el.getAttribute('style')); const f = m && BRAND.imgs[+m[1]];
    if (f) { el.dataset.img = f; el.style.background = `url(img/${f}.jpg) center/cover no-repeat, #EEE`; }
  });
  root.querySelectorAll('[data-brand-head]').forEach(el => { el.outerHTML = brandHead(el.dataset.table || 'Table 6'); });
  root.querySelectorAll('[data-brand-story]').forEach(el => { el.outerHTML = brandStory(); });
  root.querySelectorAll('.av:not([data-logo])').forEach(el => { el.dataset.logo = 1; el.innerHTML = BRAND.logo; });
}
new MutationObserver(() => applyBrand()).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('DOMContentLoaded', () => applyBrand());
