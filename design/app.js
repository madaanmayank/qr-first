/* Stage 1 design board. One model per store; every change goes through dispatch(). */

const ic = {
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16v-5a6 6 0 1112 0v5l1.5 2h-15L6 16z"/><path d="M10 20.5a2 2 0 004 0"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M5 6h14v10h-9l-4 3v-3H5z"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M8 7l-4 4 4 4"/><path d="M4 11h10a5 5 0 010 10h-3"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  cards: '<svg viewBox="0 0 24 24"><rect x="5" y="7" width="11" height="14" rx="1.5"/><path d="M8 4h9.5A1.5 1.5 0 0119 5.5V17"/></svg>',
};

const PACC = { a: '#2E5744', b: '#F0563A', c: '#FFB400' };

const S = {
  dir: 'a', store: 'cafe', known: true, tab: 'features',
  sel: {}, veg: {}, cart: {}, pick: {}, play: {}, models: {}, hist: {},
  proposal: null, reply: '', text: '',
};

for (const k of Object.keys(STORES)) {
  const s = STORES[k];
  S.models[k] = { features: { ...DEFAULT_FEATURES, ...s.features }, guestLogin: 'optional', appearance: s.appearance, cats: structuredClone(s.cats) };
  S.hist[k] = []; S.cart[k] = {}; S.pick[k] = {}; S.play[k] = { i: 0, tray: [] }; S.veg[k] = false; S.sel[k] = s.customId;
}

/* ---------- helpers ---------- */
const st = () => STORES[S.store];
const model = () => S.models[S.store];
const allItems = m => m.cats.flatMap(c => c.items);
const item = (m, id) => allItems(m).find(i => i.id === id);
const rupee = n => '₹' + Number(n).toLocaleString('en-IN');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const photo = (h, cls = '') => `<span class="ph ${cls}" style="--h:${h}"></span>`;
const vm = v => `<span class="vm ${v ? '' : 'nv'}" title="${v ? 'Vegetarian' : 'Non-vegetarian'}"></span>`;
const featName = k => FEATURES.flatMap(g => g.items).find(x => x.k === k)?.n || k;
function onBrand(hex) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#141414' : '#ffffff';
}
function rule(g) {
  if (g.min === 1 && g.max === 1) return 'Choose 1';
  if (g.min === 0) return g.max === 1 ? 'Optional' : `Choose up to ${g.max}`;
  if (g.min === g.max) return `Choose ${g.min}`;
  return `Choose ${g.min} to ${g.max}`;
}
const knownGuest = m => S.known && m.guestLogin !== 'off';
const personal = m => knownGuest(m) && m.features.personalWelcome;
function getPick(m, id) {
  const k = S.store;
  if (!S.pick[k][id]) {
    const d = st().diner;
    S.pick[k][id] = personal(m) && d.usual.id === id ? structuredClone(d.usual.pick) : {};
  }
  return S.pick[k][id];
}
const priceOf = (it, pk) => it.p + (it.groups || []).reduce((a, g, gi) => a + (pk[gi] || []).reduce((x, oi) => x + (g.opts[oi]?.d || 0), 0), 0);
const scope = (m, inner) => { const s = st(); return `<div class="screen ds" data-mode="${m.appearance}" style="--brand:${s.accent};--onbrand:${onBrand(s.accent)}">${inner}</div>`; };
const off = msg => `<div class="screen ds" data-mode="light"><div class="off-note">${msg}</div></div>`;

/* ---------- commands ---------- */
function reduce(m, c) {
  m = structuredClone(m);
  const it = c.id ? item(m, c.id) : null;
  switch (c.type) {
    case 'feature.set': m.features[c.key] = c.on; break;
    case 'setting.set': m[c.key] = c.value; break;
    case 'item.setSoldOut': if (it) it.out = c.on; break;
    case 'choices.addGroup':
      if (it) {
        it.groups = it.groups || [];
        if (c.template === 'combo') {
          const src = m.cats.find(x => x.id !== 'combos' && !x.items.includes(it));
          it.groups.push({ name: 'Comes with', min: 1, max: 1, opts: src.items.slice(0, 3).map(i => ({ link: i.id })) });
          it.combo = true;
        } else it.groups.push(structuredClone(TEMPLATES[c.template]));
      }
      break;
    case 'choices.removeGroup':
      if (it && it.groups) { it.groups.splice(c.index, 1); if (!it.groups.length) { delete it.groups; delete it.combo; } }
      break;
    case 'combo.create': {
      const cat = m.cats.find(x => x.id === c.cat);
      if (cat && !item(m, c.item.id)) cat.items.push(structuredClone(c.item));
      break;
    }
  }
  return m;
}
function describe(c, m) {
  const it = c.id ? item(m, c.id) : null;
  switch (c.type) {
    case 'feature.set': return `Turn ${c.on ? 'on' : 'off'} ${featName(c.key).toLowerCase()}`;
    case 'setting.set': return c.key === 'guestLogin' ? `Set guest login to ${c.value}` : `Make the guest menu ${c.value}`;
    case 'item.setSoldOut': return c.on ? `Mark ${it.n} as sold out` : `Put ${it.n} back on sale`;
    case 'choices.addGroup': return c.template === 'combo' ? `Make ${it.n} a combo` : `Add ${TEMPLATES[c.template].name.toLowerCase()} choices to ${it.n}`;
    case 'choices.removeGroup': return `Remove ${it.groups[c.index].name.toLowerCase()} from ${it.n}`;
    case 'combo.create': return `Add the combo ${c.item.n} at ${rupee(c.item.p)}`;
  }
  return c.type;
}
function dispatch(cmds, actor) {
  const k = S.store, before = S.models[k];
  let m = before; const texts = [];
  for (const c of cmds) { texts.push(describe(c, m)); m = reduce(m, c); }
  S.models[k] = m; S.pick[k] = {};
  S.hist[k].push({ text: texts.join('; '), actor, before });
  const made = cmds.find(c => c.type === 'combo.create');
  if (made) { S.tab = 'menu'; S.sel[k] = made.item.id; }
}
function parse(text) {
  const t = text.toLowerCase(), m = model(), s = st(), cmds = [];
  if (/log ?in|sign ?in/.test(t)) {
    const v = /required|must|mandatory|force/.test(t) ? 'required' : /optional/.test(t) ? 'optional'
      : /(\boff\b|\bno\b|remove|without|disable)/.test(t) ? 'off' : /(\bon\b|enable|allow)/.test(t) ? 'optional' : null;
    if (v) cmds.push({ type: 'setting.set', key: 'guestLogin', value: v });
  } else if (/sold out|out of stock|back in stock|back on sale/.test(t)) {
    const it = allItems(m).find(i => t.includes(i.n.toLowerCase()));
    if (it) cmds.push({ type: 'item.setSoldOut', id: it.id, on: !/back/.test(t) });
  } else if (/\b(dark|light)\b/.test(t)) {
    cmds.push({ type: 'setting.set', key: 'appearance', value: /dark/.test(t) ? 'dark' : 'light' });
  } else if (/combo/.test(t) && /(add|create|make|new)/.test(t) && !/(turn|switch)/.test(t)) {
    cmds.push({ type: 'combo.create', cat: s.newCombo.cat, item: s.newCombo.item });
  } else {
    const on = /(turn|switch) on|enable|show|allow/.test(t), offw = /(turn|switch) off|disable|hide|remove|stop/.test(t);
    if (on || offw) for (const [k, ws] of Object.entries(FEATURE_WORDS)) if (ws.some(w => t.includes(w))) { cmds.push({ type: 'feature.set', key: k, on: on && !offw }); break; }
  }
  return cmds;
}
function propose(text) {
  S.proposal = null; S.reply = '';
  if (!text.trim()) return;
  const cmds = parse(text), m = model();
  if (!cmds.length) { S.reply = 'In this prototype I can change login, features, the look, sold out items and combos. Try one of the suggestions below.'; return; }
  let pm = m; const lines = [];
  for (const c of cmds) { lines.push(describe(c, pm)); pm = reduce(pm, c); }
  if (JSON.stringify(pm) === JSON.stringify(m)) { S.reply = 'That is already set this way. Nothing to change.'; return; }
  S.proposal = { cmds, lines };
}

/* ---------- guest screens ---------- */
function gMenu(m, key) {
  const s = st(), f = m.features, d = s.diner, per = personal(m), k = S.store;
  const veg = f.vegFilter && S.veg[k], canOrder = f.ordering;
  const addBtn = id => canOrder ? `<button class="add" data-act="add" data-id="${id}" aria-label="Add">${ic.plus}</button>` : '';
  let h = `<div class="scroll" data-scroll="${key}">`;
  h += `<div class="g-top"><div><div class="nm dsp">${esc(s.name)}</div><div class="sp">${s.spot}</div></div><div class="ic">${ic.search}<span class="lang">EN</span></div></div>`;
  h += photo(s.coverHue, 'cover wide');
  if (per) {
    const u = item(m, d.usual.id);
    h += `<div class="hello"><h2 class="dsp">Good evening, <em>${d.name}</em></h2><div class="sub">${d.visits}</div></div>`;
    if (u && !u.out) h += `<div class="usual">${photo(u.hue)}<div><div class="lab">Your usual</div><div class="t">${esc(u.n)}</div><div class="d">${f.choices ? d.usual.detail : 'Same as last time'}</div></div>${canOrder ? '<button class="btn" data-act="usual">Add again</button>' : ''}</div>`;
  } else {
    h += `<div class="note">${esc(s.note)}<span class="sig">${s.owner}, ${esc(s.name)}</span></div>`;
    if (m.guestLogin === 'optional' && !S.known) h += `<div class="signin">Been here before? <u>Sign in</u> to see your usual.</div>`;
  }
  const tools = [];
  if (f.vegFilter) tools.push(`<button class="chip ${veg ? 'on' : ''}" data-act="veg">${vm(true)}Veg only</button>`);
  if (f.playMode && canOrder) tools.push(`<button class="chip" data-act="noop">${ic.cards}Play to order</button>`);
  if (tools.length) h += `<div class="tools">${tools.join('')}</div>`;
  if (f.stories) h += `<div class="stories">${['Today', 'Kitchen', 'Team', 'New'].map((t, i) => `<div class="story">${photo(s.coverHue + i * 14)}${t}</div>`).join('')}</div>`;
  if (f.suggestions) {
    const list = (per ? d.picks : s.popular).map(p => ({ it: item(m, p.id), why: p.why })).filter(x => x.it && !x.it.out && (!veg || x.it.veg));
    if (list.length) h += `<div class="picks"><h3 class="sec-t dsp">${per ? 'Picked for you' : 'Popular here'}</h3>${list.map(x => `<div class="pick">${photo(x.it.hue)}<div><b>${esc(x.it.n)}</b><span class="why">${esc(x.why)}</span></div><span class="num">${rupee(x.it.p)}</span></div>`).join('')}</div>`;
  }
  for (const c of m.cats) {
    const its = c.items.filter(i => (!veg || i.veg) && (f.combos || !i.combo));
    if (!its.length) continue;
    h += `<div class="cat"><h3 class="cat-t dsp">${esc(c.name)}<i>${String(its.length).padStart(2, '0')}</i></h3><div class="items">` + its.map(i => `
      <div class="it ${i.out ? 'out' : ''}">
        <div><div class="n">${vm(i.veg)}<span>${esc(i.n)}</span></div>${i.hi ? `<div class="hi">${i.hi}</div>` : ''}<div class="dsx">${esc(i.ds)}</div>
        <div class="pr num">${rupee(i.p)}${i.out ? '<span class="tag">Sold out</span>' : (i.groups && (i.combo || f.choices) ? `<span class="tag">${i.combo ? 'Combo' : 'Customisable'}</span>` : '')}</div></div>
        <div class="side">${photo(i.hue)}${i.out ? '' : addBtn(i.id)}</div>
      </div>`).join('') + `</div></div>`;
  }
  h += `</div>`;
  const cart = Object.values(S.cart[k]), n = cart.reduce((a, b) => a + b.q, 0), tot = cart.reduce((a, b) => a + b.q * b.p, 0);
  let dock = '';
  if (f.menuAssistant) dock += `<button class="fab" title="Ask about the menu" aria-label="Ask about the menu">${ic.chat}</button>`;
  if (f.callWaiter && s.spot.startsWith('Table')) dock += `<button class="fab" title="Call waiter" aria-label="Call waiter">${ic.bell}</button>`;
  if (m.guestLogin === 'required' && !S.known) dock += `<button class="cartbar"><span>Sign in to order</span>${ic.arrow}</button>`;
  else if (canOrder && n) dock += `<button class="cartbar"><span>${n} item${n > 1 ? 's' : ''}</span><span class="num">View order · ${rupee(tot)}</span></button>`;
  return scope(m, h + `<div class="dock">${dock}</div>`);
}

function gSheet(m, id, key) {
  const s = st(), f = m.features, it = item(m, id);
  if (!it) return off('This item is not on the menu.');
  if (it.combo && !f.combos) return off('Combos are switched off for this store.');
  const showGroups = !!it.groups && (it.combo || f.choices);
  const pk = showGroups ? getPick(m, id) : {}, d = s.diner;
  let h = `<div class="sheet"><div class="scroll" data-scroll="${key}"><div class="sh-x"><span>${esc(s.name)}</span>${ic.close}</div>`;
  h += photo(it.hue, 'sh-ph' + (it.combo ? ' wide' : ''));
  h += `<div class="sh-h"><h3 class="dsp">${vm(it.veg)}<span>${esc(it.n)}</span></h3>${it.hi ? `<div class="hi">${it.hi}</div>` : ''}<p>${esc(it.ds)}</p></div>`;
  if (showGroups && personal(m) && d.usual.id === id) h += `<div class="like">Set like last time, ${d.name}: ${d.usual.detail.toLowerCase()}.</div>`;
  if (showGroups) it.groups.forEach((g, gi) => {
    const sel = pk[gi] || [], multi = g.max > 1, done = g.min > 0 && sel.length >= g.min;
    h += `<div class="grp"><div class="grp-h"><b>${esc(g.name)}</b><span class="${done ? 'ok' : ''}">${done ? 'Done' : rule(g)}</span></div>`;
    g.opts.forEach((o, oi) => {
      const li = o.link ? item(m, o.link) : null;
      if (o.link && !li) return;
      h += `<button class="opt ${multi ? 'multi' : ''} ${sel.includes(oi) ? 'sel' : ''} ${li ? 'lnk' : ''}" data-act="opt" data-id="${id}" data-g="${gi}" data-o="${oi}"><span class="mk"></span>${li ? photo(li.hue) : ''}<span>${esc(li ? li.n : o.n)}</span><span class="dl num">${o.d ? '+ ' + rupee(o.d) : ''}</span></button>`;
    });
    h += `</div>`;
  });
  if (f.kitchenNote && f.ordering) h += `<div class="kn">Add a note for the kitchen</div>`;
  h += `</div>`;
  if (f.ordering) {
    const ok = !showGroups || it.groups.every((g, gi) => (pk[gi] || []).length >= g.min);
    h += `<div class="sh-f"><div class="qty"><span>${ic.minus}</span>1<span>${ic.plus}</span></div><button class="btn big" style="${ok ? '' : 'opacity:.45'}"><span>${ok ? 'Add to order' : 'Choose first'}</span><span class="num">${rupee(priceOf(it, pk))}</span></button></div>`;
  }
  return scope(m, h + `</div>`);
}

function gPlay(m) {
  const s = st(), f = m.features, k = S.store;
  if (!f.ordering) return off('Ordering is off, so play to order is hidden.');
  if (!f.playMode) return off('Play to order is switched off for this store.');
  const veg = f.vegFilter && S.veg[k], per = personal(m);
  const deck = s.deck.map(c => ({ ...c, it: item(m, c.id) })).filter(c => c.it && !c.it.out && (!veg || c.it.veg));
  const courses = [...new Set(deck.map(c => c.course))], P = S.play[k];
  const tray = `<div class="tray">${courses.map(c => {
    const got = P.tray.filter(t => t.course === c), last = got[got.length - 1], li = last && item(m, last.id);
    return `<div class="slot ${got.length ? 'fill' : ''}"><div class="box">${li ? photo(li.hue) : ''}${got.length > 1 ? `<i>${got.length}</i>` : ''}</div>${c}</div>`;
  }).join('')}</div>`;
  let h = `<div class="play"><div class="pl-top"><b class="dsp">Play to order</b>${ic.close}</div>`;
  if (P.i >= deck.length) {
    const rows = P.tray.map(t => item(m, t.id)).filter(Boolean), tot = rows.reduce((a, i) => a + i.p, 0);
    h += `<div class="set"><h3 class="dsp">${rows.length ? 'Your table is set' : 'Nothing picked yet'}</h3><div class="pl-sub" style="padding:0 0 14px">${rows.length ? (per ? `Nicely chosen, ${s.diner.name}.` : 'Here is what you picked.') : 'Deal again and see what catches your eye.'}</div>${rows.map(i => `<div class="row"><span>${esc(i.n)}</span><span class="num">${rupee(i.p)}</span></div>`).join('')}</div>${tray}<div class="pl-act"><button class="btn ghost" data-act="redeal">Deal again</button><button class="btn" style="${rows.length ? '' : 'opacity:.45'}">${rows.length ? `Review order · ${rupee(tot)}` : 'Review order'}</button></div>`;
  } else {
    const c = deck[P.i];
    h += `<div class="pl-sub">Card ${P.i + 1} of ${deck.length}. Pass or add, and your table fills up.</div><div class="deck"><div class="deal">${photo(c.it.hue)}<div class="tx"><div class="course">${c.course}</div><h3 class="dsp">${vm(c.it.veg)}<span>${esc(c.it.n)}</span></h3><div class="why">${esc(per && c.per ? c.per : c.why)}</div><div class="pr num">${rupee(c.it.p)}</div></div></div></div><div class="pl-act"><button class="btn ghost" data-act="pass" data-id="${c.id}" data-course="${c.course}">Pass</button><button class="btn" data-act="take" data-id="${c.id}" data-course="${c.course}">Add to my table</button></div>${tray}`;
  }
  return scope(m, h + `</div>`);
}

/* ---------- dashboard ---------- */
function wFeatures(m) {
  const loginText = { off: 'Guests go straight to the menu. No one is recognised.', optional: 'Guests can order without signing in. Returning guests are recognised.', required: 'Guests sign in before they order.' };
  let h = `<div class="wh"><div><h1 class="dsp">Features</h1><p>Switch any part of the guest experience on or off. The preview shows the result as you go.</p></div></div>`;
  h += `<div class="fg" style="margin-top:0"><div class="fg-t">Sign-in</div><div class="fr"><div><b>Guest login</b><span>${loginText[m.guestLogin]}</span></div><div class="sg">${['off', 'optional', 'required'].map(v => `<button class="${m.guestLogin === v ? 'on' : ''}" data-act="login" data-id="${v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div></div></div>`;
  for (const g of FEATURES) {
    h += `<div class="fg"><div class="fg-t">${g.g}</div>` + g.items.map(x => {
      const blocked = x.needsLogin && m.guestLogin === 'off';
      return `<div class="fr"><div><b>${x.n}</b>${x.late ? `<span class="late">${x.late}</span>` : ''}<span class="${blocked ? 'need' : ''}">${blocked ? 'Needs guest login. Turn login on to use this.' : esc(x.e)}</span></div><button class="sw ${m.features[x.k] && !blocked ? 'on' : ''}" ${blocked ? 'disabled' : ''} data-act="feat" data-id="${x.k}" role="switch" aria-checked="${!!m.features[x.k]}" aria-label="${x.n}"></button></div>`;
    }).join('') + `</div>`;
  }
  return h;
}

function wMenu(m) {
  const sel = item(m, S.sel[S.store]) || allItems(m)[0];
  const list = m.cats.map(c => `<div class="mc">${esc(c.name)}</div>` + c.items.map(i => `<button class="mrow ${i.id === sel.id ? 'on' : ''} ${i.out ? 'out' : ''}" data-act="sel" data-id="${i.id}">${vm(i.veg)}${esc(i.n)}<span class="num">${rupee(i.p)}</span></button>`).join('')).join('');
  const groups = (sel.groups || []).map((g, gi) => `<div class="cg"><div class="cg-h"><b>${esc(g.name)}</b><span class="rule">${rule(g)}</span><button data-act="rmgroup" data-id="${gi}" aria-label="Remove ${esc(g.name)}">${ic.close}</button></div>${g.opts.map(o => { const li = o.link ? item(m, o.link) : null; return `<div class="cg-o"><span>${esc(li ? li.n : o.n)}</span><span class="num">${li ? 'From your menu' : (o.d ? '+ ' + rupee(o.d) : 'No extra')}</span></div>`; }).join('')}</div>`).join('');
  const starters = sel.combo ? '' : `<div class="starters">${[['sizes', 'Sizes'], ['half', 'Half or full'], ['addons', 'Add-ons'], ['spice', 'Spice level'], ['combo', 'Make it a combo']].map(([k, n]) => `<button data-act="starter" data-id="${k}">${ic.plus}${n}</button>`).join('')}</div>`;
  const count = (sel.groups || []).length;
  return `<div class="wh"><div><h1 class="dsp">Menu</h1><p>Pick an item to edit. Choices and combos are built here, and the preview shows the guest's view.</p></div><button class="btn">Publish</button></div>
  <div class="mgrid"><div class="mlist">${list}</div><div class="ed">
    <h3 class="dsp">${vm(sel.veg)}${esc(sel.n)}</h3>
    <div class="fld"><div class="inp"><small>Name</small>${esc(sel.n)}</div><div class="inp"><small>Price</small><span class="num">${rupee(sel.p)}</span></div></div>
    <div class="inp"><small>Description</small>${esc(sel.ds)}</div>
    <div class="fr" style="margin-top:12px"><div><b>Sold out</b><span>Guests see it greyed out, right away.</span></div><button class="sw ${sel.out ? 'on' : ''}" data-act="soldout" data-id="${sel.id}" role="switch" aria-checked="${!!sel.out}" aria-label="Sold out"></button></div>
    <div class="ch-t"><b>${sel.combo ? 'What is in this combo' : 'Choices'}</b><span>${count ? `${count} group${count > 1 ? 's' : ''}` : 'None yet'}</span></div>
    ${groups}${starters}
    <div class="hint">${sel.combo ? 'Each group picks from items already on your menu.' : 'Start from a common pattern, then rename and edit. Or tell the assistant what you want.'}</div>
  </div></div>`;
}

function wHome(m) {
  const s = st(), hm = s.home;
  return `<div class="wh"><div><h1 class="dsp">Good evening, ${s.owner}</h1><p>${hm.line}</p></div></div>
  <div class="stats">${hm.stats.map(([a, b]) => `<div class="stat"><span>${a} today</span><b class="num">${b}</b></div>`).join('')}</div>
  <div class="fg-t">Needs your attention</div>${hm.attention.map(([t, a]) => `<div class="att"><span>${esc(t)}</span><button>${a}</button></div>`).join('')}`;
}

function asst() {
  const s = st(), H = S.hist[S.store];
  let h = `<div class="asst">`;
  if (S.proposal) h += `<div class="prop"><div><small>The assistant will make ${S.proposal.cmds.length > 1 ? 'these changes' : 'this change'}. The preview shows the result.</small>${S.proposal.lines.map(l => `<b>${esc(l)}</b>`).join('<br>')}</div><div class="acts"><button class="btn ghost" data-act="cancel">Cancel</button><button class="btn" data-act="apply">Apply</button></div></div>`;
  else if (S.reply) h += `<div class="prop"><div><small>Assistant</small>${S.reply}</div><div class="acts"><button class="btn ghost" data-act="cancel">Close</button></div></div>`;
  h += `<form class="asst-in" data-form="asst"><input id="asst-input" placeholder="Tell the assistant what to change" value="${esc(S.text)}" autocomplete="off" aria-label="Tell the assistant what to change"><button class="btn" type="submit">Ask</button></form>`;
  h += `<div class="asst-chips">${s.chips.map(c => `<button data-act="chip" data-id="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
  if (H.length) { const last = H[H.length - 1]; h += `<div class="hist"><span>Last change: ${esc(last.text)}. By: ${last.actor}.</span><button data-act="undo">${ic.undo}Undo</button>${H.length > 1 ? `<span>${H.length - 1} earlier</span>` : ''}</div>`; }
  return h + `</div>`;
}

function dash(m) {
  const s = st(), k = S.store;
  const pm = S.proposal ? S.proposal.cmds.reduce(reduce, m) : m;
  const made = S.proposal && S.proposal.cmds.find(c => c.type === 'combo.create');
  const tabs = [['home', 'Home', 1], ['menu', 'Menu', 1], ['look', 'Look', 0], ['features', 'Features', 1], ['qr', 'QR', 0], ['reviews', 'Reviews', 0], ['money', 'Money', 0], ['settings', 'Settings', 0]];
  const nav = `<div class="nav"><div class="st"><i>${s.name[0]}</i><b>${esc(s.name)}<span>${s.kind}</span></b></div>${tabs.map(([t, n, live]) => `<button class="${S.tab === t ? 'on' : ''} ${live ? 'live' : ''}" ${live ? `data-act="tab" data-id="${t}"` : 'disabled title="Not part of this exploration"'}>${n}</button>`).join('')}</div>`;
  const work = S.tab === 'home' ? wHome(m) : S.tab === 'menu' ? wMenu(m) : wFeatures(m);
  const pv = made ? gSheet(pm, made.item.id, 'pv') : S.tab === 'menu' ? gSheet(pm, S.sel[k], 'pv') : gMenu(pm, 'pv');
  return `<div class="dash ds" data-mode="light" style="--brand:${PACC[S.dir]};--onbrand:${onBrand(PACC[S.dir])}">${nav}<div class="work"><div class="wscroll" data-scroll="work-${S.tab}">${work}</div>${asst()}</div><div class="pv"><div class="pv-h"><b>Live preview</b><span class="tag ${S.proposal ? 'prop-t' : ''}">${S.proposal ? 'Proposed' : 'Draft'}</span></div><div class="pv-fit">${pv}</div><div class="pv-f">The real guest app, on this store's data.</div></div></div>`;
}

/* ---------- page ---------- */
const seg = (name, opts, cur) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-act="set-${name}" data-id="${v}">${l}</button>`).join('')}</div>`;

function render() {
  const keep = {};
  document.querySelectorAll('[data-scroll]').forEach(e => { keep[e.dataset.scroll] = e.scrollTop; });
  const hadFocus = document.activeElement && document.activeElement.id === 'asst-input';
  const k = S.store, m = model(), s = st(), D = DIRECTIONS[S.dir];
  if (!item(m, S.sel[k])) S.sel[k] = s.customId;
  document.body.dataset.dir = S.dir;
  document.getElementById('ctl').innerHTML =
    seg('dir', [['a', 'A  Quiet Host'], ['b', 'B  Soft Day'], ['c', 'C  Ink Signal']], S.dir) +
    seg('store', Object.entries(STORES).map(([key, v]) => [key, v.label]), S.store) +
    seg('known', [['1', 'Returning guest'], ['0', 'First visit']], S.known ? '1' : '0');
  document.getElementById('app').innerHTML = `
  <section class="intro"><div><div class="k">Direction ${S.dir.toUpperCase()}</div><h1>${D.name}</h1><p>${D.line}</p></div><div class="facts">${D.facts.map(([a, b]) => `<div><b>${a}</b>${esc(b)}</div>`).join('')}</div></section>
  <div class="sec"><h2>What guests experience</h2><p>${esc(s.name)}, a ${s.kind.toLowerCase()}. ${S.known ? `Shown for ${s.diner.name}, a returning guest.` : 'Shown for a first-time guest.'} The veg switch, add buttons, choices and play cards all work.</p></div>
  <div class="phones">
    <div class="phone">${gMenu(m, 'g1')}<div class="cap"><b>Menu.</b> The first second after the scan.</div></div>
    <div class="phone">${gSheet(m, s.customId, 'g2')}<div class="cap"><b>Item with choices.</b> One sheet for every item.</div></div>
    <div class="phone">${gSheet(m, s.comboId, 'g3')}<div class="cap"><b>Combo.</b> The same sheet, picking from the menu.</div></div>
    <div class="phone">${gPlay(m)}<div class="cap"><b>Play to order.</b> Pass or add, one dish at a time.</div></div>
  </div>
  <div class="sec"><h2>What the restaurant uses</h2><p>A working dashboard. Flip a feature, build a choice or ask the assistant, and the preview changes. Each change is one command, so a person, the assistant or an approved AI agent can make it.</p></div>
  ${dash(m)}
  <div class="foot">
    <div><b>The same in all three</b>Screens, flows, features, words and data. Only the visual language changes, so the comparison is fair.</div>
    <div><b>What changes</b>Type, colour, shape, density and how warmth shows up. Each store keeps its own accent and light or dark mood inside every direction.</div>
    <div><b>Stand-ins</b>Photos are placeholders. The assistant is simulated with a few phrases. Restaurants, people and menus are invented.</div>
  </div>`;
  document.querySelectorAll('[data-scroll]').forEach(e => { if (keep[e.dataset.scroll]) e.scrollTop = keep[e.dataset.scroll]; });
  if (hadFocus) { const i = document.getElementById('asst-input'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const a = b.dataset.act, id = b.dataset.id, k = S.store, m = model();
  switch (a) {
    case 'set-dir': S.dir = id; break;
    case 'set-store': S.store = id; S.proposal = null; S.reply = ''; S.text = ''; break;
    case 'set-known': S.known = id === '1'; for (const key of Object.keys(STORES)) S.pick[key] = {}; break;
    case 'tab': S.tab = id; break;
    case 'veg': S.veg[k] = !S.veg[k]; break;
    case 'add': { const it = item(m, id); (S.cart[k][id] = S.cart[k][id] || { q: 0, p: it.p }).q++; break; }
    case 'usual': { const u = st().diner.usual, it = item(m, u.id), p = m.features.choices ? priceOf(it, u.pick) : it.p; (S.cart[k]['usual'] = S.cart[k]['usual'] || { q: 0, p }).q++; break; }
    case 'opt': {
      const it = item(m, id), gi = +b.dataset.g, oi = +b.dataset.o, g = it.groups[gi], pk = getPick(m, id);
      const sel = pk[gi] || (pk[gi] = []), at = sel.indexOf(oi);
      if (g.max === 1) pk[gi] = at >= 0 && g.min === 0 ? [] : [oi];
      else if (at >= 0) sel.splice(at, 1);
      else { if (sel.length >= g.max) sel.shift(); sel.push(oi); }
      break;
    }
    case 'feat': dispatch([{ type: 'feature.set', key: id, on: !m.features[id] }], 'you'); break;
    case 'login': if (m.guestLogin !== id) dispatch([{ type: 'setting.set', key: 'guestLogin', value: id }], 'you'); break;
    case 'sel': S.sel[k] = id; break;
    case 'soldout': dispatch([{ type: 'item.setSoldOut', id, on: !item(m, id).out }], 'you'); break;
    case 'starter': dispatch([{ type: 'choices.addGroup', id: S.sel[k], template: id }], 'you'); break;
    case 'rmgroup': dispatch([{ type: 'choices.removeGroup', id: S.sel[k], index: +id }], 'you'); break;
    case 'chip': S.text = id; propose(id); break;
    case 'apply': if (S.proposal) { dispatch(S.proposal.cmds, 'the assistant, at your request'); S.proposal = null; S.text = ''; } break;
    case 'cancel': S.proposal = null; S.reply = ''; break;
    case 'undo': { const last = S.hist[k].pop(); if (last) { S.models[k] = last.before; S.pick[k] = {}; } break; }
    case 'redeal': S.play[k] = { i: 0, tray: [] }; break;
    case 'pass': case 'take': {
      const card = b.closest('.play').querySelector('.deal');
      if (card) card.classList.add(a === 'take' ? 'go-add' : 'go-pass');
      setTimeout(() => { const P = S.play[k]; if (a === 'take') P.tray.push({ id, course: b.dataset.course }); P.i++; render(); }, 230);
      return;
    }
    default: return;
  }
  render();
});
document.addEventListener('input', e => { if (e.target.id === 'asst-input') S.text = e.target.value; });
document.addEventListener('submit', e => { e.preventDefault(); propose(S.text); render(); });

render();
