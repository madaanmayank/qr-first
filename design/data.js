/* Seed data for the stage 1 design board. All stores, people and menus are invented. */

const DIRECTIONS = {
  a: {
    name: 'Quiet Host',
    line: 'Editorial and warm. Reads like a well-printed menu, speaks like a host.',
    facts: [
      ['Type', 'Fraunces for names and titles, Instrument Sans for reading. Hindi in Tiro Devanagari.'],
      ['Colour', 'Paper and ink. Colour comes from food and one store accent.'],
      ['Shape', 'Hairlines, small corners, text-led rows.'],
      ['Human', 'The host\'s note in their own words, signed. Reasons written as sentences.'],
    ],
  },
  b: {
    name: 'Soft Day',
    line: 'Friendly and airy. Feels like the calm everyday apps people already trust.',
    facts: [
      ['Type', 'Manrope throughout, with Noto Sans Devanagari.'],
      ['Colour', 'Light grey page, white cards, one store accent.'],
      ['Shape', 'Soft cards, round buttons, photo-led grid.'],
      ['Human', 'Photos first, short friendly lines, the usual as a card you can tap.'],
    ],
  },
  c: {
    name: 'Ink Signal',
    line: 'Bold and typographic. Big names, strong rules, very fast to scan.',
    facts: [
      ['Type', 'Anek Latin and Anek Devanagari: one family made for Indian scripts.'],
      ['Colour', 'Black and white. The store accent works as a marker.'],
      ['Shape', 'Square corners, heavy rules, no thumbnails in lists.'],
      ['Human', 'A large greeting by name. People and dishes set big.'],
    ],
  },
};

const FEATURES = [
  { g: 'Welcome', items: [
    { k: 'personalWelcome', n: 'Personal welcome', e: 'Greets returning guests by name and shows their usual.', needsLogin: true },
    { k: 'vegFilter', n: 'Vegetarian filter', e: 'A veg-only switch on the menu, remembered for each guest.' },
    { k: 'stories', n: 'Stories', e: 'Short photos and videos from your kitchen, above the menu.' },
  ]},
  { g: 'Choosing', items: [
    { k: 'suggestions', n: 'Personal suggestions', e: 'A few picks with a reason, from each guest\'s taste and your orders.' },
    { k: 'playMode', n: 'Play to order', e: 'A game-like way to choose a meal, one dish at a time.' },
    { k: 'menuAssistant', n: 'Menu assistant', e: 'Guests ask questions about the menu and get answers.' },
  ]},
  { g: 'Ordering', items: [
    { k: 'ordering', n: 'Order from the phone', e: 'Guests add items and send orders. Off shows the menu only.' },
    { k: 'choices', n: 'Customisation', e: 'Sizes, add-ons and other choices on items.' },
    { k: 'combos', n: 'Combos', e: 'Items made of other items, at one price.' },
    { k: 'kitchenNote', n: 'Notes to the kitchen', e: 'A short note with each item.' },
  ]},
  { g: 'At the table', items: [
    { k: 'callWaiter', n: 'Call waiter', e: 'Guests ask for water, the bill or help.' },
    { k: 'splitBill', n: 'Split the bill', e: 'Equal, by item or by amount.', late: 'Seen at payment' },
    { k: 'tips', n: 'Tips', e: 'Tip choices at payment.', late: 'Seen at payment' },
  ]},
  { g: 'After the meal', items: [
    { k: 'ratings', n: 'Ratings', e: 'One-tap rating after the visit.', late: 'Seen after paying' },
  ]},
];

const FEATURE_WORDS = {
  personalWelcome: ['personal welcome', 'welcome'],
  vegFilter: ['veg filter', 'vegetarian', 'veg only'],
  stories: ['stories', 'story'],
  suggestions: ['suggestion', 'recommend'],
  playMode: ['play'],
  menuAssistant: ['assistant', 'chat'],
  ordering: ['ordering', 'order from'],
  choices: ['customisation', 'customization', 'choices'],
  combos: ['combos', 'combo'],
  kitchenNote: ['note'],
  callWaiter: ['waiter'],
  splitBill: ['split'],
  tips: ['tip'],
  ratings: ['rating'],
};

const TEMPLATES = {
  sizes: { name: 'Size', min: 1, max: 1, opts: [{ n: 'Regular', d: 0 }, { n: 'Large', d: 40 }] },
  addons: { name: 'Add-ons', min: 0, max: 3, opts: [{ n: 'Extra cheese', d: 40 }, { n: 'Extra sauce', d: 20 }, { n: 'Extra butter', d: 20 }] },
  spice: { name: 'Spice level', min: 1, max: 1, opts: [{ n: 'Mild', d: 0 }, { n: 'Regular', d: 0 }, { n: 'Extra hot', d: 0 }] },
  half: { name: 'Portion', min: 1, max: 1, opts: [{ n: 'Half', d: 0 }, { n: 'Full', d: 180 }] },
};

const DEFAULT_FEATURES = {
  personalWelcome: true, vegFilter: true, stories: false,
  suggestions: true, playMode: true, menuAssistant: false,
  ordering: true, choices: true, combos: true, kitchenNote: true,
  callWaiter: true, splitBill: true, tips: true, ratings: true,
};

const STORES = {
  cafe: {
    label: 'Cafe',
    name: 'Kettle & Crumb', kind: 'Specialty coffee cafe', spot: 'Counter',
    owner: 'Asha', accent: '#4F6F52', appearance: 'light', coverHue: 34,
    note: 'We roast in small batches every Tuesday. Ask us what is fresh this week.',
    features: { callWaiter: false, splitBill: false, tips: false },
    diner: {
      name: 'Riya', visits: 'Your third visit this month.',
      usual: { id: 'flat', detail: 'Large, oat milk', pick: { 0: [1], 1: [1], 2: [] } },
      veg: false,
      picks: [
        { id: 'croissant', why: 'You have had it with your flat white twice.' },
        { id: 'pour', why: 'New beans this week. You rated the last pour over 5.' },
      ],
    },
    popular: [
      { id: 'flat', why: 'Most ordered this week.' },
      { id: 'croissant', why: 'Sells out by noon most days.' },
    ],
    customId: 'flat', comboId: 'coffeebake',
    cats: [
      { id: 'coffee', name: 'Coffee', items: [
        { id: 'flat', n: 'Flat White', ds: 'Double ristretto, steamed milk, a thin layer of foam.', p: 220, veg: true, hue: 28, groups: [
          { name: 'Size', min: 1, max: 1, opts: [{ n: 'Regular', d: 0 }, { n: 'Large', d: 40 }] },
          { name: 'Milk', min: 1, max: 1, opts: [{ n: 'Whole milk', d: 0 }, { n: 'Oat milk', d: 50 }, { n: 'Almond milk', d: 50 }] },
          { name: 'Extras', min: 0, max: 3, opts: [{ n: 'Extra shot', d: 60 }, { n: 'Vanilla', d: 30 }, { n: 'Hazelnut', d: 30 }] },
        ]},
        { id: 'pour', n: 'Pour Over', ds: 'Single origin from Chikmagalur, brewed by hand.', p: 280, veg: true, hue: 20 },
        { id: 'cold', n: 'Cold Brew', ds: 'Steeped for eighteen hours. Smooth and low on acid.', p: 240, veg: true, hue: 12 },
        { id: 'chai', n: 'Masala Chai', hi: 'मसाला चाय', ds: 'Assam leaf, ginger, cardamom, slow boiled.', p: 120, veg: true, hue: 24 },
      ]},
      { id: 'bakes', name: 'Bakes', items: [
        { id: 'croissant', n: 'Almond Croissant', ds: 'Twice baked with almond cream.', p: 190, veg: true, hue: 38 },
        { id: 'loaf', n: 'Banana Walnut Loaf', ds: 'A thick slice, warmed on request.', p: 160, veg: true, hue: 32 },
        { id: 'bun', n: 'Bun Maska', hi: 'बन मस्का', ds: 'Soft bun, salted butter. Best with chai.', p: 90, veg: true, hue: 44 },
        { id: 'puff', n: 'Chicken Puff', ds: 'Flaky pastry, peppery chicken filling.', p: 140, veg: false, hue: 30 },
      ]},
      { id: 'plates', name: 'Plates', items: [
        { id: 'avo', n: 'Avocado Toast', ds: 'Sourdough, smashed avocado, chilli oil, seeds.', p: 340, veg: true, hue: 95 },
        { id: 'chilli', n: 'Chilli Cheese Toast', ds: 'Amul cheese, green chilli, a Delhi classic.', p: 260, veg: true, hue: 48 },
        { id: 'akuri', n: 'Akuri on Toast', ds: 'Parsi-style spiced scrambled eggs.', p: 290, veg: false, hue: 50 },
      ]},
      { id: 'combos', name: 'Combos', items: [
        { id: 'coffeebake', n: 'Coffee and a bake', ds: 'Any coffee with any bake.', p: 360, veg: true, hue: 30, combo: true, groups: [
          { name: 'Pick your coffee', min: 1, max: 1, opts: [{ link: 'flat' }, { link: 'cold' }, { link: 'chai' }] },
          { name: 'Pick your bake', min: 1, max: 1, opts: [{ link: 'croissant' }, { link: 'loaf' }, { link: 'bun' }] },
        ]},
      ]},
    ],
    deck: [
      { id: 'cold', course: 'Drink', why: 'It is warm out. This is the lightest thing on the bar.' },
      { id: 'pour', course: 'Drink', why: 'If you like tasting the bean, this is the one.' },
      { id: 'croissant', course: 'Bake', why: 'Still warm. The batch came out twenty minutes ago.' },
      { id: 'bun', course: 'Bake', why: 'Simple and buttery. Goes with everything.' },
      { id: 'avo', course: 'Plate', why: 'The plate most regulars pair with a cold brew.' },
      { id: 'chilli', course: 'Plate', why: 'Comfort food, with a kick.' },
    ],
    newCombo: { cat: 'combos', item: { id: 'chaibun', n: 'Chai and bun maska', ds: 'Masala chai with a bun maska.', p: 180, veg: true, hue: 40, combo: true, groups: [
      { name: 'Your chai', min: 1, max: 1, opts: [{ link: 'chai' }] },
      { name: 'Your bake', min: 1, max: 1, opts: [{ link: 'bun' }, { link: 'loaf' }] },
    ]}},
    chips: ['Turn off guest login', 'Add a chai and bun maska combo at 180', 'Mark Almond Croissant sold out', 'Make the menu dark'],
    home: {
      line: 'A steady morning, a busy lunch. Flat whites led the day again.',
      stats: [['Scans', '214'], ['Orders', '168'], ['Sales', '₹48,620'], ['Rating', '4.7']],
      attention: [
        ['Almond Croissant sold out at 12:40 for the fourth day.', 'Bake more or raise the price'],
        ['One guest rated 2. "Waited 15 minutes for a pour over."', 'Reply'],
        ['6 items have no photo.', 'Add photos'],
      ],
    },
  },

  kebab: {
    label: 'Kebab house',
    name: 'Qissa Kebab House', kind: 'Kebab and Mughlai', spot: 'Table 6',
    owner: 'Imran', accent: '#8C2F1B', appearance: 'light', coverHue: 18,
    note: 'My grandfather lit this tandoor in 1962. The seekh recipe has not changed since.',
    features: {},
    diner: {
      name: 'Arjun', visits: 'Good to see you again. You were last here on Diwali weekend.',
      usual: { id: 'seekh', detail: 'Full, extra hot, with rumali roti', pick: { 0: [1], 1: [0], 2: [1] } },
      veg: false,
      picks: [
        { id: 'galouti', why: 'You liked the seekh. The galouti is its softer cousin.' },
        { id: 'tukda', why: 'You skipped dessert last time. Most tables end with this.' },
      ],
    },
    popular: [
      { id: 'seekh', why: 'The dish this kitchen is known for.' },
      { id: 'biryani', why: 'Most ordered at dinner.' },
    ],
    customId: 'seekh', comboId: 'platter',
    cats: [
      { id: 'kebabs', name: 'Kebabs', items: [
        { id: 'seekh', n: 'Seekh Kebab', hi: 'सीख कबाब', ds: 'Hand-minced mutton, charcoal grilled on the skewer.', p: 260, veg: false, hue: 14, groups: [
          { name: 'Portion', min: 1, max: 1, opts: [{ n: 'Half, 2 pieces', d: 0 }, { n: 'Full, 4 pieces', d: 220 }] },
          { name: 'Bread', min: 0, max: 2, opts: [{ n: 'Rumali roti', d: 30 }, { n: 'Khameeri roti', d: 40 }] },
          { name: 'Spice level', min: 1, max: 1, opts: [{ n: 'Regular', d: 0 }, { n: 'Extra hot', d: 0 }] },
        ]},
        { id: 'galouti', n: 'Galouti Kebab', hi: 'गलौटी कबाब', ds: 'So soft it was made for a toothless nawab.', p: 320, veg: false, hue: 20 },
        { id: 'malai', n: 'Chicken Malai Tikka', ds: 'Cream, cheese and white pepper marinade.', p: 340, veg: false, hue: 42 },
        { id: 'paneer', n: 'Paneer Tikka', hi: 'पनीर टिक्का', ds: 'Thick-cut paneer, mustard and curd.', p: 280, veg: true, hue: 36 },
      ]},
      { id: 'mains', name: 'Mains', items: [
        { id: 'korma', n: 'Mutton Korma', ds: 'Slow cooked in a brown onion gravy.', p: 420, veg: false, hue: 22 },
        { id: 'butter', n: 'Butter Chicken', ds: 'Tandoori chicken in tomato and butter.', p: 380, veg: false, hue: 16 },
        { id: 'dal', n: 'Dal Makhani', hi: 'दाल मखनी', ds: 'Black lentils, simmered overnight.', p: 260, veg: true, hue: 10 },
        { id: 'nihari', n: 'Nihari', ds: 'Shank stew, cooked from the night before.', p: 440, veg: false, hue: 24 },
      ]},
      { id: 'breads', name: 'Breads and rice', items: [
        { id: 'rumali', n: 'Rumali Roti', ds: 'Paper thin, folded like a handkerchief.', p: 30, veg: true, hue: 46 },
        { id: 'khameeri', n: 'Khameeri Roti', ds: 'Leavened, soft, baked in the tandoor.', p: 40, veg: true, hue: 40 },
        { id: 'biryani', n: 'Mutton Biryani', ds: 'Long-grain rice, layered and sealed.', p: 380, veg: false, hue: 44 },
      ]},
      { id: 'sweets', name: 'Sweets', items: [
        { id: 'tukda', n: 'Shahi Tukda', ds: 'Fried bread in saffron milk, with rabri.', p: 140, veg: true, hue: 40 },
        { id: 'phirni', n: 'Phirni', ds: 'Ground rice pudding, set in clay.', p: 110, veg: true, hue: 52 },
      ]},
      { id: 'combos', name: 'Combos', items: [
        { id: 'platter', n: 'Kebab platter for two', ds: 'Two kebabs, a bread basket and a sweet.', p: 780, veg: false, hue: 18, combo: true, groups: [
          { name: 'Choose 2 kebabs', min: 2, max: 2, opts: [{ link: 'seekh' }, { link: 'galouti' }, { link: 'malai' }, { link: 'paneer' }] },
          { name: 'Choose your bread', min: 1, max: 1, opts: [{ link: 'rumali' }, { link: 'khameeri' }] },
          { name: 'Choose a sweet', min: 1, max: 1, opts: [{ link: 'tukda' }, { link: 'phirni' }] },
        ]},
      ]},
    ],
    deck: [
      { id: 'galouti', course: 'Kebab', why: 'Soft enough to melt. The kebab people come back for.', per: 'Softer than the seekh you love. Try it once.' },
      { id: 'malai', course: 'Kebab', why: 'Mild and creamy, for a break from the heat.' },
      { id: 'nihari', course: 'Main', why: 'It is a cold evening. This is what the regulars order.' },
      { id: 'dal', course: 'Main', why: 'Every table should have one.' },
      { id: 'khameeri', course: 'Bread', why: 'Made to soak up the nihari.' },
      { id: 'tukda', course: 'Sweet', why: 'Most tables end with this.', per: 'You skipped dessert last time. Make up for it.' },
    ],
    newCombo: { cat: 'combos', item: { id: 'kormameal', n: 'Korma meal for one', ds: 'Mutton korma with bread and a sweet.', p: 520, veg: false, hue: 22, combo: true, groups: [
      { name: 'Your bread', min: 1, max: 1, opts: [{ link: 'rumali' }, { link: 'khameeri' }] },
      { name: 'Your sweet', min: 1, max: 1, opts: [{ link: 'tukda' }, { link: 'phirni' }] },
    ]}},
    chips: ['Make login required', 'Add a korma meal for one combo at 520', 'Mark Nihari sold out', 'Turn off call waiter'],
    home: {
      line: 'A full house from eight. Table 6 stayed two hours and ordered three rounds.',
      stats: [['Scans', '132'], ['Orders', '96'], ['Sales', '₹1,24,300'], ['Rating', '4.6']],
      attention: [
        ['Nihari ran out at 9:10 pm. Eleven guests looked at it after that.', 'Cook more on Fridays'],
        ['Table 4 called a waiter three times in ten minutes.', 'See what happened'],
        ['Service charge was removed on 9 of 41 bills.', 'Review'],
      ],
    },
  },

  bar: {
    label: 'Bar',
    name: 'Low Light', kind: 'Cocktail bar', spot: 'Table 11',
    owner: 'Meher', accent: '#E0A437', appearance: 'dark', coverHue: 26,
    note: 'Everything behind this bar is made in house, down to the ice. Tell us what you like and we will pour around it.',
    features: {},
    diner: {
      name: 'Kabir', visits: 'Friday again. That makes four in a row.',
      usual: { id: 'oldf', detail: 'Premium bourbon, less sweet', pick: { 0: [1], 1: [1], 2: [] } },
      veg: false,
      picks: [
        { id: 'negroni', why: 'Bitter and smoky, close to your usual.' },
        { id: 'fries', why: 'Your table ordered these on the last two visits.' },
      ],
    },
    popular: [
      { id: 'oldf', why: 'The house signature.' },
      { id: 'fries', why: 'On most tables by the second round.' },
    ],
    customId: 'oldf', comboId: 'bucket',
    cats: [
      { id: 'cocktails', name: 'Cocktails', items: [
        { id: 'oldf', n: 'Smoked Old Fashioned', ds: 'Bourbon, jaggery, bitters, applewood smoke.', p: 620, veg: true, hue: 26, groups: [
          { name: 'Spirit', min: 1, max: 1, opts: [{ n: 'House bourbon', d: 0 }, { n: 'Premium bourbon', d: 180 }] },
          { name: 'Sweetness', min: 1, max: 1, opts: [{ n: 'Classic', d: 0 }, { n: 'Less sweet', d: 0 }] },
          { name: 'Extras', min: 0, max: 1, opts: [{ n: 'Make it a double', d: 260 }] },
        ]},
        { id: 'sour', n: 'Tamarind Whisky Sour', ds: 'Whisky, tamarind, egg white foam.', p: 580, veg: false, hue: 30 },
        { id: 'negroni', n: 'Kokum Negroni', ds: 'Gin, kokum, bitter orange.', p: 600, veg: true, hue: 4 },
        { id: 'jamun', n: 'Jamun G and T', ds: 'Gin, black plum shrub, tonic.', p: 540, veg: true, hue: 285 },
      ]},
      { id: 'beer', name: 'Beer', items: [
        { id: 'wheat', n: 'Craft Wheat', ds: 'Hazy, citrus, brewed in the city.', p: 380, veg: true, hue: 46 },
        { id: 'lager', n: 'Lager Pint', ds: 'Crisp and cold.', p: 320, veg: true, hue: 50 },
      ]},
      { id: 'bites', name: 'Bar bites', items: [
        { id: 'fries', n: 'Truffle Fries', ds: 'Skin-on fries, truffle oil, parmesan.', p: 340, veg: true, hue: 48 },
        { id: 'bao', n: 'Chilli Chicken Bao', ds: 'Two soft bao, Indo-Chinese chilli chicken.', p: 380, veg: false, hue: 22 },
        { id: 'corn', n: 'Peri Peri Corn Ribs', ds: 'Charred corn, peri peri butter.', p: 300, veg: true, hue: 52 },
        { id: 'sliders', n: 'Lamb Sliders', ds: 'Three sliders, mint mayo.', p: 460, veg: false, hue: 16 },
      ]},
      { id: 'combos', name: 'Combos', items: [
        { id: 'bucket', n: 'Bucket and bites', ds: 'Four beers and two bar bites.', p: 1490, veg: false, hue: 44, combo: true, groups: [
          { name: 'Choose your beer', min: 1, max: 1, opts: [{ link: 'wheat' }, { link: 'lager' }] },
          { name: 'Choose 2 bites', min: 2, max: 2, opts: [{ link: 'fries' }, { link: 'bao' }, { link: 'corn' }, { link: 'sliders' }] },
        ]},
      ]},
    ],
    deck: [
      { id: 'negroni', course: 'Drink', why: 'Bitter, smoky and the bartender\'s own pick.', per: 'Bitter and smoky, close to your usual.' },
      { id: 'jamun', course: 'Drink', why: 'Something lighter to start the night.' },
      { id: 'fries', course: 'Bite', why: 'On most tables by the second round.', per: 'Your table has ordered these twice.' },
      { id: 'corn', course: 'Bite', why: 'Smoky, good with whisky.' },
      { id: 'sliders', course: 'Plate', why: 'If the night is going long.' },
      { id: 'bao', course: 'Plate', why: 'The kitchen\'s favourite.' },
    ],
    newCombo: { cat: 'combos', item: { id: 'ginbite', n: 'G and T with a bite', ds: 'A Jamun G and T with one bar bite.', p: 760, veg: true, hue: 285, combo: true, groups: [
      { name: 'Your drink', min: 1, max: 1, opts: [{ link: 'jamun' }] },
      { name: 'Your bite', min: 1, max: 1, opts: [{ link: 'fries' }, { link: 'corn' }] },
    ]}},
    chips: ['Turn off guest login', 'Add a G and T with a bite combo at 760', 'Mark Lamb Sliders sold out', 'Make the menu light'],
    home: {
      line: 'A slow start, then a full room by ten. The Old Fashioned outsold everything.',
      stats: [['Scans', '188'], ['Orders', '241'], ['Sales', '₹2,86,900'], ['Rating', '4.8']],
      attention: [
        ['Table 11 has had an open bill for three hours.', 'Open the bill'],
        ['Kokum Negroni was viewed 60 times and ordered 9.', 'Check the photo and price'],
        ['Two payments failed and were retried.', 'See details'],
      ],
    },
  },
};
