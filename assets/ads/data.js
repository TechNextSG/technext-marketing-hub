/* TechNext Paid Ads Studio - data. Concepts, platforms, placements and specs live here; the page renders them.
   Claims come from the brand guide only (branding.html#words). No prices, never "Certified", Odoo badge on Odoo ads only.
   Headline accent: wrap one phrase in *stars*. A line break in a headline: \n. */
window.ADS = (function () {
  'use strict';

  /* Pose pack: rendered from the real 3D Nexi (tools in ~/ClaudeWork/qa/nexi-ads). w/h = PNG size, ax/ay = body anchor
     (same point for every pose, so poses swap without jumping), hx/hy = head centre. */
  var POSES = {"hello":{"w":1144,"h":1373,"ax":528,"ay":677,"hx":528,"hy":373},"present":{"w":1608,"h":1375,"ax":804,"ay":679,"hx":804,"hy":375},"point-right":{"w":1322,"h":1375,"ax":491,"ay":679,"hx":491,"hy":375},"point-left":{"w":1322,"h":1375,"ax":831,"ay":679,"hx":831,"hy":375},"celebrate":{"w":1376,"h":1374,"ax":688,"ay":779,"hx":688,"hy":377},"wow":{"w":902,"h":1374,"ax":451,"ay":779,"hx":451,"hy":377},"think":{"w":972,"h":1372,"ax":519,"ay":677,"hx":519,"hy":373},"love":{"w":872,"h":1373,"ax":436,"ay":677,"hx":436,"hy":373},"clap":{"w":902,"h":1375,"ax":451,"ay":679,"hx":451,"hy":375},"knock":{"w":979,"h":1375,"ax":528,"ay":679,"hx":528,"hy":375},"shrug":{"w":1476,"h":1373,"ax":738,"ay":677,"hx":738,"hy":373},"jump":{"w":1220,"h":1415,"ax":610,"ay":1000,"hx":610,"hy":365},"idle":{"w":1056,"h":1375,"ax":528,"ay":679,"hx":528,"hy":375},"turn-left":{"w":1419,"h":1375,"ax":681,"ay":679,"hx":681,"hy":375},"turn-right":{"w":1419,"h":1377,"ax":738,"ay":681,"hx":738,"hy":377}};
  var POSE_NAMES = { hello: 'Hello wave', present: 'Ta-da', 'point-left': 'Point left', 'point-right': 'Point right', celebrate: 'Celebrate',
    wow: 'Wow!', think: 'Thinking', love: 'Love it', clap: 'Clap', knock: 'Knock knock', shrug: 'Shrug', jump: 'Jump for joy',
    idle: 'Standing', 'turn-left': 'Turn left', 'turn-right': 'Turn right' };

  var BACKGROUNDS = [
    { id: 'daylight', name: 'Daylight', dark: false, note: 'Soft paper, arcs, flight path' },
    { id: 'modules', name: 'Modules', dark: false, note: 'Dot grid, app tiles' },
    { id: 'horizon', name: 'Horizon', dark: true, note: 'Brand blue, orbit rings' },
    { id: 'midnight', name: 'Midnight', dark: true, note: 'Navy, glowing flight paths' }
  ];

  var PROPS = [
    { id: 'chat', name: 'Chat bubbles' }, { id: 'sheets', name: 'Spreadsheets to one system' }, { id: 'apps', name: 'App tiles' },
    { id: 'checks', name: 'Checklist' }, { id: 'stats', name: 'Approved figures' }, { id: 'site', name: 'Website window' }, { id: 'none', name: 'None' }
  ];

  /* Six campaigns. creative = what is drawn; copy = what goes into each Ads Manager. */
  var CONCEPTS = [
    {
      id: 'ai-chatbots', name: 'AI chatbots', url: 'https://technext.asia/solutions/ai-chatbots',
      creative: {
        bg: 'daylight', pose: 'hello', pose2: 'present', bubble: "Hi! I'm Nexi.", bubble2: 'Ask me anything!',
        kicker: 'AI chatbots & assistants', headline: 'Let AI answer your customers *any hour*.',
        sub: 'AI chatbots for your website and WhatsApp, trained on your own content, with a clean hand-off to your team.',
        cta: 'See how it works', prop: 'chat', badge: false,
        items: ['Is my order ready?', 'Yes! It ships today. Want the tracking link?']
      },
      copy: {
        meta: { primary: 'Customers ask at 2 a.m. Your AI assistant answers from your own content, looks up orders and hands the rest to your team.', headline: 'AI chatbots for web & WhatsApp', desc: 'Built by TechNext, Singapore', cta: 'Learn more' },
        linkedin: { intro: 'Your customers do not keep office hours. TechNext builds AI chatbots for websites, WhatsApp and Odoo that answer from your own content.', headline: 'AI chatbots that answer from your own content', cta: 'Learn more' },
        tiktok: { text: 'Meet Nexi: an AI assistant that answers your customers any hour.', cta: 'Learn more' },
        x: { text: 'Customers ask at 2 a.m. Your AI assistant answers from your own content, looks up orders and hands the rest to your team. Meet Nexi.', headline: 'AI chatbots for web, WhatsApp and Odoo' },
        youtube: { headline: 'AI chatbots, trained on your content', long: 'Let AI answer your customers any hour, then hand over cleanly to your team.', desc: 'AI chatbots for websites, WhatsApp and Odoo, built by TechNext in Singapore.', cta: 'Learn more' }
      }
    },
    {
      id: 'one-system', name: 'Odoo: one system', url: 'https://technext.asia/solutions/odoo-erp',
      creative: {
        bg: 'modules', pose: 'wow', pose2: 'celebrate', bubble: 'Five spreadsheets?!', bubble2: 'One system. Nice!',
        kicker: 'Odoo 20 ERP', headline: 'Five spreadsheets?\nMake it *one system*.',
        sub: 'Sales, inventory, CRM and accounting in one place. Configured, migrated and supported by an Odoo Ready Partner.',
        cta: 'Book a discovery call', prop: 'sheets', badge: true,
        items: ['sales_FINAL_v3.xlsx', 'stock_count (2).xlsx', 'Odoo 20: one system']
      },
      copy: {
        meta: { primary: 'Sales in one sheet, stock in another, invoices somewhere else? Odoo 20 puts it all in one system, set up by an Odoo Partner.', headline: 'One system instead of five sheets', desc: 'Odoo 20, by TechNext', cta: 'Book now' },
        linkedin: { intro: 'When sales, stock and accounting live in separate sheets, every report is a project. TechNext implements Odoo 20 end to end as an Odoo Ready Partner.', headline: 'Odoo 20 ERP: sales, inventory, CRM and accounting in one place', cta: 'Request demo' },
        tiktok: { text: 'Five spreadsheets for one business? Make it one system with Odoo 20.', cta: 'Book now' },
        x: { text: 'Sales in one sheet, stock in another, invoices somewhere else. Odoo 20 puts them in one system, and TechNext, an Odoo Ready Partner, sets it up.', headline: 'Odoo 20 ERP implementation in Singapore' },
        youtube: { headline: 'Five spreadsheets? Make it one', long: 'Sales, inventory, CRM and accounting in one system with Odoo 20.', desc: 'Configured, migrated, trained and supported by TechNext, an Odoo Ready Partner.', cta: 'Book now' }
      }
    },
    {
      id: 'discovery', name: 'Odoo discovery call', url: 'https://technext.asia/odoo/discovery',
      creative: {
        bg: 'daylight', pose: 'point-left', pose2: 'hello', bubble: "Let's map it out!", bubble2: 'Book a call with us!',
        kicker: 'Odoo discovery', headline: 'Your business is growing. Your systems should *keep up*.',
        sub: 'We map how orders, stock and money move today, match each step to an Odoo app and hand you a written scope.',
        cta: 'Book a discovery call', prop: 'apps', badge: true,
        items: ['Sales', 'Inventory', 'Accounting', 'CRM']
      },
      copy: {
        meta: { primary: 'Before any software: we map how orders, stock and money move in your business, then hand you a written Odoo scope.', headline: 'Book an Odoo discovery call', desc: 'Odoo Ready Partner', cta: 'Book now' },
        linkedin: { intro: 'Growing past spreadsheets? TechNext maps how orders, stock and money move today and matches each step to an Odoo app, with a written scope.', headline: 'Odoo discovery: a written scope before any software', cta: 'Request demo' },
        tiktok: { text: 'Your business is growing. Your systems should keep up. Book an Odoo discovery call.', cta: 'Book now' },
        x: { text: 'Your business is growing. Your systems should keep up. We map how orders, stock and money move today and hand you a written Odoo scope.', headline: 'Odoo consultation and discovery' },
        youtube: { headline: 'Odoo discovery, done properly', long: 'We map your process, match each step to an Odoo app and hand you a written scope.', desc: 'TechNext is an Odoo Ready Partner in Singapore, with teams in the Philippines and Vietnam.', cta: 'Book now' }
      }
    },
    {
      id: 'automation', name: 'AI automation', url: 'https://technext.asia/solutions/ai-automation',
      creative: {
        bg: 'midnight', pose: 'think', pose2: 'celebrate', bubble: 'Still copy-pasting?', bubble2: 'Done for you!',
        kicker: 'AI automation', headline: 'Stop losing revenue to *manual work*.',
        sub: 'AI agents read, sort and prepare the busywork across email, Odoo and your tools, with your approval where money moves.',
        cta: 'Talk to us', prop: 'checks', badge: false,
        items: ['Emails sorted', 'Invoices prepared', 'Follow-ups drafted']
      },
      copy: {
        meta: { primary: 'Your team retypes the same data every day. AI agents can read, sort and prepare it, and ask for approval where money moves.', headline: 'Stop losing revenue to manual work', desc: 'AI automation by TechNext', cta: 'Contact us' },
        linkedin: { intro: 'Manual work costs revenue. TechNext builds AI agents that read, classify and prepare work across email, Odoo and your tools, with approval steps.', headline: 'AI workflow automation with approval where money moves', cta: 'Learn more' },
        tiktok: { text: 'Still copy-pasting between email and spreadsheets? Let AI agents do the busywork.', cta: 'Contact us' },
        x: { text: 'Stop losing revenue to manual work. AI agents read, sort and prepare the busywork across email, Odoo and your tools, with approval where money moves.', headline: 'AI workflow automation in Singapore' },
        youtube: { headline: 'Stop losing revenue to manual work', long: 'AI agents that read, sort and prepare the busywork across email, Odoo and your tools.', desc: 'Enterprise AI and Odoo ERP by TechNext. Approval steps wherever money moves.', cta: 'Contact us' }
      }
    },
    {
      id: 'why-technext', name: 'Why TechNext', url: 'https://technext.asia/company',
      creative: {
        bg: 'horizon', pose: 'celebrate', pose2: 'clap', bubble: 'Hello from Singapore!', bubble2: 'Nice to meet you!',
        kicker: 'Why TechNext', headline: '11+ enterprise clients. 10+ countries. *One team.*',
        sub: 'Odoo ERP and enterprise AI from Singapore, with hubs in Metro Manila and Ho Chi Minh City.',
        cta: 'Meet the team', prop: 'stats', badge: false,
        items: ['10+|countries', '11+|enterprise clients', '3|offices', '4|AI disciplines']
      },
      copy: {
        meta: { primary: 'Odoo ERP and enterprise AI from one team: HQ in Singapore, hubs in Manila and Ho Chi Minh City, clients in 10+ countries.', headline: '11+ enterprise clients, 10+ countries', desc: 'TechNext, Singapore', cta: 'Learn more' },
        linkedin: { intro: 'TechNext has transformed 11+ enterprise clients across 10+ countries with Odoo ERP and enterprise AI, from Singapore, Manila and Ho Chi Minh City.', headline: 'One team for Odoo ERP and enterprise AI', cta: 'Learn more' },
        tiktok: { text: 'One team for Odoo ERP and AI, from Singapore, Manila and Ho Chi Minh City.', cta: 'Learn more' },
        x: { text: '11+ enterprise clients. 10+ countries. One team for Odoo ERP and enterprise AI, from Singapore, Metro Manila and Ho Chi Minh City.', headline: 'Meet TechNext' },
        youtube: { headline: 'One team for Odoo ERP and AI', long: '11+ enterprise clients in 10+ countries, from Singapore, Manila and Ho Chi Minh City.', desc: 'TechNext: Odoo Ready Partner and enterprise AI consultancy, headquartered in Singapore.', cta: 'Learn more' }
      }
    },
    {
      id: 'websites', name: 'Websites + AI', url: 'https://technext.asia/solutions/website',
      creative: {
        bg: 'modules', pose: 'present', pose2: 'love', bubble: 'Ta-da! Your new site.', bubble2: 'Built to bring leads!',
        kicker: 'Websites + AI', headline: 'A website that *answers back*.',
        sub: 'Fast, clear company websites and online stores, with forms that reach your team. Add an AI assistant like me.',
        cta: 'Get a quote', prop: 'site', badge: false,
        items: ['Hi! How can I help?']
      },
      copy: {
        meta: { primary: 'A fast, clear website with forms that reach your team, and an AI assistant that answers visitors while you are busy.', headline: 'A website that answers back', desc: 'Web design by TechNext', cta: 'Get quote' },
        linkedin: { intro: 'TechNext designs and builds fast, clear company websites and online stores, with forms that reach your team and an optional AI assistant.', headline: 'Company websites with an AI assistant built for you', cta: 'Learn more' },
        tiktok: { text: 'Your website could answer customers while you sleep. We build it.', cta: 'Get quote' },
        x: { text: 'A website that answers back: fast, clear pages, forms that reach your team, and an AI assistant for your visitors. Built by TechNext.', headline: 'Web design and development in Singapore' },
        youtube: { headline: 'A website that answers back', long: 'Fast, clear company websites and online stores, with an AI assistant for your visitors.', desc: 'Designed, built and handed over by TechNext, with forms that reach your team.', cta: 'Get quote' }
      }
    }
  ];

  /* Every placement. size = the exported file; group = which copy set the Ads Manager uses; motion = offer a video. */
  var PLATFORMS = [
    { id: 'facebook', name: 'Facebook', group: 'meta', src: 'facebook', placements: [
      { id: 'feed-4x5', name: 'Feed', ratio: '4:5', w: 1080, h: 1350, mock: 'fb-feed', motion: true },
      { id: 'feed-1x1', name: 'Feed square', ratio: '1:1', w: 1080, h: 1080, mock: 'fb-feed', motion: true },
      { id: 'stories-9x16', name: 'Stories & Reels', ratio: '9:16', w: 1080, h: 1920, mock: 'story', motion: true },
      { id: 'link-191', name: 'Link ad', ratio: '1.91:1', w: 1200, h: 628, mock: 'fb-feed' }
    ] },
    { id: 'instagram', name: 'Instagram', group: 'meta', src: 'instagram', placements: [
      { id: 'feed-4x5', name: 'Feed', ratio: '4:5', w: 1080, h: 1350, mock: 'ig-feed', motion: true },
      { id: 'feed-1x1', name: 'Feed square', ratio: '1:1', w: 1080, h: 1080, mock: 'ig-feed', motion: true },
      { id: 'stories-9x16', name: 'Stories', ratio: '9:16', w: 1080, h: 1920, mock: 'story', motion: true },
      { id: 'reels-9x16', name: 'Reels', ratio: '9:16', w: 1080, h: 1920, mock: 'reel', motion: true }
    ] },
    { id: 'linkedin', name: 'LinkedIn', group: 'linkedin', src: 'linkedin', placements: [
      { id: 'single-191', name: 'Single image', ratio: '1.91:1', w: 1200, h: 627, mock: 'li-feed' },
      { id: 'single-1x1', name: 'Single image square', ratio: '1:1', w: 1200, h: 1200, mock: 'li-feed', motion: true }
    ] },
    { id: 'tiktok', name: 'TikTok', group: 'tiktok', src: 'tiktok', placements: [
      { id: 'infeed-9x16', name: 'In-feed', ratio: '9:16', w: 1080, h: 1920, mock: 'tiktok', motion: true }
    ] },
    { id: 'x', name: 'X', group: 'x', src: 'x', placements: [
      { id: 'image-1x1', name: 'Image ad', ratio: '1:1', w: 1200, h: 1200, mock: 'x-post', motion: true },
      { id: 'card-191', name: 'Website card', ratio: '1.91:1', w: 1200, h: 628, mock: 'x-post' }
    ] },
    { id: 'youtube', name: 'YouTube', group: 'youtube', src: 'youtube', medium: 'paid_video', placements: [
      { id: 'instream-16x9', name: 'In-stream', ratio: '16:9', w: 1920, h: 1080, mock: 'yt-player', motion: true },
      { id: 'shorts-9x16', name: 'Shorts', ratio: '9:16', w: 1080, h: 1920, mock: 'reel', motion: true }
    ] }
  ];

  /* Ads Manager fields per copy group: [key, label, recommended max, multiline]. Limits are the lengths that show without
     truncation, not the hard maximum. */
  var FIELDS = {
    meta: [['primary', 'Primary text', 125, 1], ['headline', 'Headline', 40], ['desc', 'Description', 30], ['cta', 'Call to action', 0, 0, 'Learn more|Book now|Contact us|Get quote|Sign up|Send message|Send WhatsApp message|Subscribe']],
    linkedin: [['intro', 'Introductory text', 150, 1], ['headline', 'Headline', 70], ['cta', 'Call to action', 0, 0, 'Learn more|Request demo|Register|Sign up|Download|View quote|Subscribe|Join|Attend|Apply']],
    tiktok: [['text', 'Ad text', 100, 1], ['cta', 'Call to action', 0, 0, 'Learn more|Book now|Contact us|Get quote|Sign up|Subscribe|Apply now|Download']],
    x: [['text', 'Post text', 280, 1], ['headline', 'Website card headline', 70]],
    youtube: [['headline', 'Headline', 40], ['long', 'Long headline', 90], ['desc', 'Description', 90, 1], ['cta', 'Call to action', 10]]
  };
  var GROUP_NAMES = { meta: 'Meta Ads Manager (Facebook + Instagram)', linkedin: 'LinkedIn Campaign Manager', tiktok: 'TikTok Ads Manager', x: 'X Ads', youtube: 'Google Ads (YouTube)' };

  /* Cheat sheet. Checked October 2026; each platform changes these, so re-check in the Ads Manager before a big launch. */
  var SPECS = [
    ['Facebook / Instagram feed', '1080 &times; 1350 (4:5) or 1080 &times; 1080', 'JPG or PNG; video MP4 (H.264), short works best', 'Primary text 125, headline 40, description 30', 'Keep key text off the bottom edge, where the CTA bar sits'],
    ['Facebook / Instagram Stories &amp; Reels', '1080 &times; 1920 (9:16)', 'MP4 (H.264) with sound; under 15 s works best', 'Primary text 125 (shown as the Reels caption)', 'Stories: keep the top and bottom 250 px free. Reels: top 14%, bottom 35% and the right edge free'],
    ['LinkedIn single image', '1200 &times; 627 (1.91:1) or 1200 &times; 1200', 'JPG, PNG or GIF up to 5 MB', 'Intro text 150 (600 max), headline 70 (200 max)', 'Square takes more of the mobile feed'],
    ['TikTok in-feed', '1080 &times; 1920 (9:16)', 'MP4 or MOV, 9 to 15 s works best; add sound in TikTok', 'Ad text up to 100, no emoji', 'Keep the right edge (buttons) and the bottom quarter (caption, CTA) clear'],
    ['X image ad / website card', '1200 &times; 1200 or 1200 &times; 628', 'PNG or JPG up to 5 MB; video MP4', 'Post 280, card headline 70', 'The card shows the domain over the image, bottom left'],
    ['YouTube in-stream / Shorts', '1920 &times; 1080 (16:9) / 1080 &times; 1920', 'Upload the video to YouTube first; skippable ads can be skipped after 5 s, so show brand and offer early', 'Headline 40, long headline 90, description 90', 'In-stream: CTA bottom left, skip button bottom right']
  ];

  return { POSES: POSES, POSE_NAMES: POSE_NAMES, BACKGROUNDS: BACKGROUNDS, PROPS: PROPS, CONCEPTS: CONCEPTS, PLATFORMS: PLATFORMS,
    FIELDS: FIELDS, GROUP_NAMES: GROUP_NAMES, SPECS: SPECS };
})();
