# iOS App + Website Launch Checklist & Guide (Expanded Edition)

A step-by-step, fully itemized guide covering everything needed to plan, build, and launch an iOS app with a companion website. Every primary task is broken into the sub-steps required to actually check it off. Cost estimates are in USD as of mid-2026 — verify current pricing before purchasing.

---

## Phase 1: Planning & Validation

- [x] **Define the core problem your app solves**
  - [x] Write down the problem in one sentence, from the user's perspective
  - [x] Write your one-sentence value proposition ("X helps Y do Z without W")
  - [x] List 3 ways people solve this problem today (including "they don't")
  - [x] Explain in one paragraph why your solution is better/faster/cheaper
  - [ ] Test the pitch on 5 people outside your circle; note whether they "get it" in under 10 seconds

- [x] **Identify your target audience**
  - [x] Define 1–2 primary user personas (age, occupation, tech comfort, motivation)
  - [ ] Identify where they congregate online (subreddits, Discords, Facebook groups, forums)
  - [ ] Estimate market size (how many people have this problem?)
  - [x] Determine willingness to pay — look at what they already pay for adjacent solutions
  - [ ] Interview or survey 5–10 potential users about the problem (not your solution)

- [x] **Competitive research**
  - [ ] Search the App Store for 5+ keywords a user would type; list the top results
  - [ ] Download and use the top 3–5 competitors for at least 15 minutes each
  - [ ] Read their 1-star and 3-star reviews — this is a free list of user pain points
  - [ ] Note each competitor's pricing model
  - [x] Write down 2–3 gaps you'll exploit (features, UX, price, niche)
  - [ ] Save competitor screenshots for design reference

- [x] **Define MVP feature set**
  - [x] Brainstorm every feature you can imagine (no filtering yet)
  - [x] Sort into three buckets: Must-have (v1), Should-have (v1.x), Someday
  - [x] Apply the test: "Can the app deliver its core value without this?" If yes — cut from v1
  - [x] Target 3–5 must-have features maximum
  - [x] Write a one-line "definition of done" for each must-have feature
  - [ ] Get the list in front of 2–3 potential users and ask what's missing/unnecessary

- [x] **Choose monetization model**
  - [ ] Review what competitors charge and how (subscription vs. one-time vs. free+ads)
  - [x] Decide: free, paid up front, freemium, subscription, ads, or in-app purchases
  - [x] If subscription: pick tiers and price points (check App Store price tiers)
  - [x] If freemium: define exactly which features are free vs. paid
  - [x] Factor in Apple's 15–30% commission when setting prices
  - [ ] Decide whether to offer a free trial and its length

- [x] **Sketch user flows**
  - [x] List every screen the MVP needs (login, home, settings, paywall, etc.)
  - [x] Draw the "happy path" — from app open to core value delivered — in as few steps as possible
  - [x] Map onboarding flow (first launch → signed up → first success moment)
  - [x] Map edge flows: forgot password, empty states, no internet, purchase failure
  - [x] Number the screens and draw arrows between them (paper or Figma/FigJam)

- [x] **Name the app**
  - [ ] Brainstorm 10–20 candidate names
  - [ ] Search the App Store for each — eliminate exact matches and confusingly similar names
  - [ ] Check .com (or .app) domain availability for finalists
  - [ ] Search USPTO.gov trademark database (TESS) for conflicts in software classes (Class 9/42)
  - [ ] Google each finalist — check for negative associations or established brands
  - [ ] Say it out loud; make sure it's spellable when heard
  - [x] Pick the winner and a backup

- [ ] **Reserve social media handles**
  - [ ] Register the name on X/Twitter, Instagram, TikTok, YouTube, and Reddit (even if unused)
  - [ ] Use a consistent handle format across all platforms
  - [ ] Store all credentials in a password manager
  - [ ] Register the domain(s) now, even before building (they're cheap; losing the name isn't)

**Costs (Phase 1):**
| Item | Cost |
|---|---|
| Market research tools (optional) | $0–100 |
| Trademark search (DIY via USPTO) | Free |
| Trademark registration (optional, per class) | ~$350 USPTO fee; $500–2,000 with attorney |
| Domain reservation (do it now) | $10–15/yr |

---

## Phase 2: Legal & Business Setup

- [ ] **Form a business entity (LLC recommended)**
  - [ ] Decide entity type: sole proprietorship (simplest) vs. LLC (liability protection) vs. corp
  - [ ] Choose formation state (your home state is usually correct; Delaware rarely helps small apps)
  - [ ] Check name availability on your state's Secretary of State website
  - [ ] File Articles of Organization (online in most states)
  - [ ] Designate a registered agent (yourself, or a service for privacy)
  - [ ] Draft/adopt an operating agreement (required in some states, wise everywhere)
  - [ ] Calendar any annual report/franchise tax deadlines (e.g., CA's $800/yr franchise tax)

- [ ] **Get an EIN**
  - [ ] Apply free at IRS.gov (takes ~10 minutes online; issued immediately)
  - [ ] Never pay a third-party site for this — it's always free direct from the IRS
  - [ ] Store the EIN confirmation letter (CP 575) somewhere safe — banks will ask for it

- [ ] **Open a business bank account**
  - [ ] Gather: EIN letter, Articles of Organization, operating agreement, ID
  - [ ] Compare options: Mercury/Relay (online, startup-friendly, free) vs. local bank
  - [ ] Open the account and deposit initial funds
  - [ ] Get a business debit/credit card for all app expenses
  - [ ] From day one: never mix personal and business spending (protects the LLC veil)
  - [ ] Set up simple bookkeeping (spreadsheet or Wave — free)

- [ ] **Draft a Privacy Policy** *(required by Apple)*
  - [ ] Inventory every piece of data the app/website will collect (email, analytics, crash logs, IDFA, etc.)
  - [ ] List every third-party SDK/service that receives data (Firebase, analytics, payment processors)
  - [ ] Generate the policy with Termly/iubenda/PrivacyPolicies.com, or have an attorney draft it
  - [ ] Include: what's collected, why, who it's shared with, retention, deletion rights, contact info
  - [ ] Publish it at a stable public URL on your website (Apple requires this URL at submission)

- [ ] **Draft Terms of Service**
  - [ ] Cover: acceptable use, account termination, subscription/refund terms, liability limits, IP ownership, governing law
  - [ ] If subscriptions: state billing frequency, cancellation method, and refund policy clearly
  - [ ] Publish at a stable URL alongside the privacy policy
  - [ ] Link both documents from the app's sign-up screen and settings

- [x] **Check compliance needs**
  - [ ] COPPA: if children under 13 could use the app, you need parental consent mechanisms — decide your age gate strategy
  - [ ] GDPR (EU users): confirm lawful basis for data processing, provide data export/deletion, add consent for non-essential tracking
  - [ ] CCPA/CPRA (California): add "do not sell/share" disclosures if applicable
  - [x] HIPAA: only if handling protected health info on behalf of covered entities — most consumer health apps aren't, but verify
  - [ ] App Tracking Transparency: if you track users across apps/sites, you must show Apple's ATT prompt

**Costs (Phase 2):**
| Item | Cost |
|---|---|
| LLC state filing fee | $50–500 (CA: $70 + $800/yr franchise tax) |
| Registered agent service (optional) | $0–150/yr |
| EIN | Free |
| Business bank account (Mercury/Relay) | Free |
| Privacy Policy / ToS generator | $0–200/yr |
| Attorney-drafted docs (optional) | $500–3,000 |

---

## Phase 3: Design

- [x] **Wireframes**
  - [ ] Set up a free Figma account and create a project
  - [x] Create a frame for every screen from your Phase 1 flow map
  - [x] Lay out each screen with boxes and placeholder text only — no colors, no polish
  - [ ] Link frames into a clickable prototype (Figma prototype mode)
  - [ ] Walk through the happy path yourself; fix dead ends
  - [ ] Have 2–3 people click through and narrate what they expect each tap to do

- [ ] **High-fidelity mockups**
  - [ ] Define a design system first: color palette (primary, secondary, semantic), type scale, spacing grid, corner radii
  - [ ] Consider starting from an iOS UI kit (Apple publishes official Figma libraries)
  - [ ] Design every wireframed screen at full fidelity for iPhone (390×844pt baseline)
  - [ ] Design all states: loading, empty, error, success — not just the happy state
  - [ ] Design the onboarding and paywall screens with extra care (they drive conversion)
  - [ ] Update the clickable prototype and re-test with users

- [ ] **App icon**
  - [ ] Sketch 3–5 concepts; icons should be one simple, recognizable shape
  - [ ] Design the master at 1024×1024px, no transparency, no rounded corners (iOS applies the mask)
  - [ ] Test legibility at 60×60px — if it's mush at small size, simplify
  - [ ] Preview it on a real home screen next to popular apps
  - [ ] Avoid text in the icon and avoid mimicking Apple's own app icons
  - [ ] Export the master PNG; Xcode generates the size variants

- [x] **Follow Apple's Human Interface Guidelines (HIG)**
  - [ ] Read the HIG sections for navigation, modality, and your app's main patterns
  - [x] Use standard iOS components (tab bars, navigation stacks, sheets) unless you have a strong reason not to
  - [ ] Respect safe areas (notch/Dynamic Island, home indicator)
  - [ ] Minimum tap target: 44×44pt
  - [ ] Use SF Symbols for iconography where possible (free, consistent, accessible)

- [ ] **Design for multiple devices**
  - [ ] Verify layouts on smallest (iPhone SE, 375pt) and largest (Pro Max, 440pt) widths
  - [ ] Decide now: iPad support yes/no (if no, set "iPhone only" in Xcode — a stretched iPhone app on iPad looks bad but is allowed)
  - [ ] Test with larger Dynamic Type sizes — text must not truncate or overlap
  - [ ] Check landscape behavior or lock to portrait deliberately

- [ ] **Dark mode support**
  - [ ] Duplicate key screens in Figma with a dark palette
  - [ ] Define semantic colors (background, surface, label) rather than hard-coded hex values
  - [ ] Verify contrast ratios in both modes (4.5:1 for body text)
  - [ ] Check images/illustrations look right on dark backgrounds

- [x] **Website design**
  - [ ] Mock up the landing page: hero (value prop + screenshot), features section, social proof, download CTA
  - [ ] Reuse the app's colors, fonts, and iconography exactly
  - [ ] Design mobile-first (most App Store traffic comes from phones)
  - [ ] Create an Open Graph share image (1200×630px) for link previews
  - [x] Mock simple layouts for privacy, terms, and support pages

**Costs (Phase 3):**
| Item | Cost |
|---|---|
| Figma | Free tier; Pro ~$15–20/seat/mo |
| Apple's official Figma UI kits, SF Symbols | Free |
| App icon design (outsourced) | $50–500 |
| Full UI/UX design (freelancer) | $1,000–10,000+ |
| DIY with UI kits/templates | $0–200 |

---

## Phase 4: iOS App Development

### Setup

- [ ] **Get a Mac**
  - [ ] Verify it can run the current macOS (Xcode requires a recent version)
  - [ ] Cheapest new option: Mac mini (M4); used M1/M2 Macs work fine
  - [ ] Ensure 256GB+ storage (Xcode + simulators eat ~50GB)

- [ ] **Install Xcode**
  - [ ] Download from the Mac App Store (free, ~10GB)
  - [ ] Launch once to install additional components and accept the license
  - [ ] Install the iOS simulator runtime when prompted
  - [ ] Create a new project and run the blank template in the simulator to confirm the toolchain works

- [ ] **Enroll in the Apple Developer Program ($99/yr)**
  - [ ] Create/verify an Apple ID with two-factor authentication
  - [ ] Decide: enroll as Individual (your legal name shows as seller) or Organization (requires D-U-N-S number for your LLC — free but takes days to weeks)
  - [ ] Enroll at developer.apple.com; pay the $99
  - [ ] Wait for approval (usually 24–48h; Organization can take longer)
  - [ ] Sign in to App Store Connect once approved
  - [ ] Add your Apple ID to Xcode (Settings → Accounts) so signing works

- [x] **Choose your tech stack**
  - [x] Native Swift + SwiftUI if: iOS-only for now, want best performance and fastest access to new iOS features
  - [ ] Flutter or React Native if: Android version is definitely coming and you want one codebase
  - [x] Decide your minimum iOS version (supporting the last 2 major versions covers ~90%+ of devices)
  - [x] Pick your architecture pattern up front (e.g., MVVM) and stick to it

### Build

- [x] **Set up version control**
  - [x] Initialize a Git repo in the project; add a Swift/Xcode .gitignore
  - [x] Create a private GitHub/GitLab repo and push
  - [x] Commit small and often with descriptive messages
  - [x] Never commit secrets (API keys) — use a gitignored config file or environment values
  - [ ] Optional: set up a CI pipeline (GitHub Actions/Xcode Cloud) to build on every push

- [x] **Build core MVP features**
  - [x] Break each must-have feature into tasks in a tracker (GitHub Issues, Linear, Trello)
  - [x] Build the app skeleton first: navigation structure + empty screens matching your designs
  - [ ] Implement features one at a time to "definition of done" before starting the next
  - [ ] Handle all the unglamorous states: loading spinners, empty states, error messages, offline behavior
  - [ ] Do a weekly self-review on a real device, not just the simulator

- [x] **Implement authentication**
  - [ ] Decide whether you need accounts at all in v1 (skipping auth is a legitimate MVP simplification)
  - [x] Choose provider: Sign in with Apple, email/password, Google, etc. (Firebase Auth/Supabase Auth handle the plumbing)
  - [ ] **Rule:** if you offer ANY third-party login (Google, Facebook), Apple requires Sign in with Apple as an option
  - [ ] Implement session persistence (user stays logged in across launches)
  - [ ] Implement password reset / account recovery
  - [ ] Implement account deletion **in the app** — Apple requires this if the app supports account creation
  - [ ] Store tokens in the Keychain, never UserDefaults

- [ ] **Implement in-app purchases / subscriptions (StoreKit)**
  - [ ] Create products in App Store Connect (IDs, prices, subscription group)
  - [ ] Implement with StoreKit 2, or use RevenueCat (free up to $2.5k/mo revenue) to simplify receipts and cross-platform later
  - [ ] Build the paywall UI with clear pricing, terms, and restore-purchases button (required)
  - [ ] Handle: purchase success, cancellation, pending (Ask to Buy), failure, and restoration
  - [ ] Gate premium features correctly, including after reinstall
  - [ ] Test end-to-end in the sandbox environment with a sandbox tester account
  - [ ] Enroll in the App Store Small Business Program (15% commission instead of 30% under $1M/yr) — it's opt-in, not automatic

- [ ] **Add analytics**
  - [ ] Choose: Firebase Analytics (free) or privacy-focused TelemetryDeck/Mixpanel
  - [ ] Define 5–10 key events before instrumenting (signup, core action completed, paywall viewed, purchase)
  - [ ] Add the SDK and log those events
  - [ ] Record what the SDK collects for your privacy label and policy
  - [ ] Verify events arrive in the dashboard from a test device

- [ ] **Add crash reporting**
  - [ ] Add Firebase Crashlytics (free) or Sentry
  - [ ] Upload dSYM symbol files so crash reports are readable (automate in build settings)
  - [ ] Force a test crash and confirm it appears in the dashboard
  - [ ] Set up email/Slack alerts for new crash types

- [ ] **Push notifications setup** *(skip if v1 doesn't need them)*
  - [ ] Enable Push Notifications capability in Xcode and App Store Connect
  - [ ] Create an APNs authentication key in the developer portal
  - [ ] Choose delivery: raw APNs (free) or Firebase Cloud Messaging/OneSignal for campaign tooling
  - [ ] Request permission at a contextual moment, never on first launch
  - [ ] Handle: permission denied, foreground notifications, and notification taps deep-linking correctly
  - [ ] Test on a physical device (simulators have limited push support)

- [ ] **Accessibility**
  - [ ] Turn on VoiceOver and navigate the whole app; add labels to unlabeled buttons/images
  - [ ] Support Dynamic Type — test at the largest accessibility sizes
  - [ ] Verify color contrast (4.5:1 body text) and never use color as the only signal
  - [ ] Respect Reduce Motion for animations
  - [ ] Run Xcode's Accessibility Inspector audit on each screen

- [ ] **App Privacy "nutrition label" data**
  - [ ] List every data type collected by your code AND every third-party SDK
  - [ ] Check each SDK's published privacy manifest/disclosure docs
  - [ ] Categorize per Apple's taxonomy: contact info, identifiers, usage data, diagnostics, etc.
  - [ ] Note whether each is linked to identity and/or used for tracking
  - [ ] Ensure required privacy manifest files (PrivacyInfo.xcprivacy) are present for applicable SDKs
  - [ ] Keep this inventory — you'll enter it in App Store Connect and it must match your privacy policy

### Test

- [ ] **Unit tests for core logic**
  - [ ] Add a test target if the project doesn't have one
  - [ ] Write tests for business logic: calculations, data transforms, purchase gating, validation
  - [ ] Don't chase 100% coverage — cover the logic that would embarrass you if broken
  - [ ] Run tests before every TestFlight build (or automate in CI)

- [ ] **Test on real devices**
  - [ ] Test on at least one physical iPhone (oldest model/OS you support if possible)
  - [ ] Test real-world conditions: cellular data, low battery, low storage, interrupted network
  - [ ] Test interruptions: incoming call mid-flow, backgrounding during a purchase
  - [ ] Test a fresh install (delete + reinstall) and an upgrade install

- [ ] **TestFlight beta**
  - [ ] Archive a build in Xcode and upload to App Store Connect
  - [ ] Fill in export compliance (standard HTTPS = exempt encryption, answer accordingly)
  - [ ] Add internal testers (your team, instant) then external testers (requires a lightweight beta review)
  - [ ] Write "what to test" notes for each build
  - [ ] Recruit 10–50 external testers from your waitlist/communities
  - [ ] Set up a feedback channel (TestFlight feedback, email, or a Discord)

- [ ] **Collect and act on beta feedback**
  - [ ] Triage everything into: bug / confusion / feature request
  - [ ] Fix all crashes and blocking bugs before launch — feature requests can wait
  - [ ] Watch where testers get confused; that's a design problem, not a user problem
  - [ ] Ship at least 2–3 beta iterations before submitting for release
  - [ ] Ask your happiest testers to be day-one reviewers

**Costs (Phase 4):**
| Item | Cost |
|---|---|
| Mac (if needed) | $600–2,500 |
| Apple Developer Program | $99/yr |
| Xcode, Git, TestFlight, SF Symbols | Free |
| Test iPhone (used is fine) | $0–500 |
| RevenueCat (optional) | Free under $2.5k/mo revenue |
| Freelance iOS developer | $5,000–50,000+ (typical simple MVP $10k–25k) |
| Dev agency | $30,000–150,000+ |

---

## Phase 5: Backend & Servers (if your app needs one)

- [x] **Decide if you need a backend at all**
  - [x] No accounts, no sync, no shared data — you may not need one (store locally / iCloud)
  - [x] Need auth, sync, or server logic — pick Option A or B below

### Option A: Backend-as-a-Service (recommended for most first launches)

- [ ] **Set up Firebase or Supabase**
  - [ ] Create the project; enable Auth, Database (Firestore/Postgres), and Storage as needed
  - [ ] Add the iOS SDK and connect the app
  - [ ] Design your data model/collections before writing code
  - [ ] Write security rules / row-level security policies — **default rules are often wide open; lock them down**
  - [ ] Test rules: verify a user cannot read/write another user's data
  - [ ] Set up a second project as a dev/staging environment
  - [ ] Set a billing alert so a bug can't run up a surprise bill
  - [ ] Enable/verify automatic backups

### Option B: Self-managed servers

- [ ] **Choose a host**
  - [ ] Compare: DigitalOcean/Hetzner (VPS, cheap), Railway/Render/Fly.io (managed, easiest), AWS (powerful, complex)
  - [ ] Start small — a $5–12/mo instance handles thousands of early users
  - [ ] Create the account with 2FA and a strong password

- [ ] **Set up the database**
  - [x] Default to PostgreSQL unless you have a specific reason not to
  - [ ] Use a managed database if budget allows (host handles patches/backups)
  - [x] Create separate dev and production databases
  - [ ] Restrict network access to your app servers only; strong credentials in a secrets manager

- [x] **Build the API**
  - [x] Pick a framework you already know (Node/Express, Python/FastAPI, Go, etc.)
  - [x] Define endpoints from your app's actual screens — don't build speculative endpoints
  - [x] Implement auth middleware (JWT validation) on every protected route
  - [x] Validate all input server-side; never trust the client
  - [x] Add rate limiting on auth and expensive endpoints
  - [ ] Version the API (/v1/) so future changes don't break shipped apps
  - [x] Write basic API docs, even just a README

- [ ] **Set up automated backups**
  - [ ] Enable daily database backups with 7–30 day retention
  - [ ] Store at least one backup copy off the primary host
  - [ ] **Actually test a restore once** — an untested backup is a hope, not a backup

- [ ] **Configure SSL/TLS**
  - [ ] Point your API subdomain (api.yourapp.com) at the server
  - [ ] Install a Let's Encrypt cert (Caddy does this automatically; certbot for nginx)
  - [ ] Verify auto-renewal is scheduled
  - [ ] Enforce HTTPS-only; iOS App Transport Security requires it anyway

- [x] **Set up monitoring/alerts**
  - [ ] Add uptime monitoring (UptimeRobot free tier) with email/phone alerts
  - [x] Add a /health endpoint the monitor can hit
  - [ ] Set up log retention and error alerting (host dashboards, or Sentry for the API)
  - [ ] Add disk/memory alerts on VPS instances

- [x] **Plan for scaling (lightly)**
  - [x] Keep the app server stateless (sessions in the DB/token, files in object storage) so you can add servers later
  - [x] Add database indexes for your common queries
  - [x] Write down your "if we get popular" plan in one paragraph — then stop; don't build it yet

**Costs (Phase 5, monthly):**
| Item | Cost |
|---|---|
| Firebase / Supabase free tier | $0 |
| Firebase Blaze / Supabase Pro | ~$25/mo + usage |
| DigitalOcean / Hetzner VPS | $4–12/mo small; $24–48/mo mid |
| Railway / Render / Fly.io | $5–25/mo |
| Managed PostgreSQL | $15–60/mo |
| UptimeRobot / Let's Encrypt | Free |
| **Realistic early-stage total** | **$0–50/mo** |

---

## Phase 6: Website

- [ ] **Register a domain**
  - [ ] Buy from Namecheap, Cloudflare Registrar, or Porkbun (avoid GoDaddy upsells)
  - [ ] Prefer .com; .app is a good fallback (note: .app forces HTTPS)
  - [ ] Enable WHOIS privacy (usually free) and auto-renew
  - [ ] Turn on registrar 2FA — domain theft is real
  - [ ] Point DNS at your hosting provider (or manage DNS via Cloudflare, free)

- [x] **Choose how to build it**
  - [ ] No-code (Framer/Webflow/Carrd) if you want fast and visual; code (Next.js/Astro on Vercel/Netlify/Cloudflare Pages) if you want free hosting and full control
  - [x] Set up the project/site and connect your custom domain
  - [ ] Verify the site deploys and loads at your domain before building pages

- [ ] **Build required pages**
  - [ ] **Landing page:**
    - [ ] Hero: app name, one-sentence value prop, hero screenshot, download button
    - [ ] Use Apple's official "Download on the App Store" badge (free from Apple's marketing resources; follow their usage rules)
    - [ ] 3–5 feature highlights with screenshots
    - [ ] Social proof section (beta tester quotes at launch; reviews later)
    - [ ] Footer with links to privacy, terms, support, and socials
    - [ ] Pre-launch: email capture form instead of download button
  - [ ] **Privacy Policy page** — paste the policy from Phase 2 at a permanent URL (e.g., /privacy)
  - [ ] **Support/contact page** — support email or form, plus a short FAQ (Apple requires this URL)
  - [ ] **Terms of Service page** — permanent URL (e.g., /terms)

- [ ] **Set up SSL**
  - [ ] Automatic and free on Vercel/Netlify/Cloudflare Pages — just verify the padlock appears
  - [ ] Confirm http:// redirects to https://

- [ ] **Set up email**
  - [ ] Create hello@ or support@yourdomain (Zoho Mail free tier, or Google Workspace ~$7/user/mo)
  - [ ] Add MX records; send and receive a test email
  - [ ] Set up SPF, DKIM, and DMARC records so your mail doesn't land in spam
  - [ ] Use this address everywhere: App Store support, privacy policy, website

- [ ] **Basic SEO**
  - [ ] Unique title tag and meta description on every page
  - [ ] Add the Open Graph image and tags (test with a link-preview checker)
  - [ ] Add a favicon (reuse the app icon)
  - [ ] Submit the site to Google Search Console; submit the sitemap
  - [ ] Check Lighthouse/PageSpeed scores; compress oversized images

- [ ] **Website analytics**
  - [ ] Install Plausible/Fathom (paid, no cookie banner needed) or Google Analytics (free)
  - [ ] Track the download-button click as a conversion event
  - [ ] Verify data flows in before launch day

- [ ] **Smart App Banner**
  - [ ] After the app is approved, add `<meta name="apple-itunes-app" content="app-id=YOURID">` to the site
  - [ ] Verify the banner appears when visiting in iOS Safari

- [ ] **Universal links** *(only if the app opens web links)*
  - [ ] Host the apple-app-site-association file at /.well-known/ (served as JSON, no redirect)
  - [ ] Add the Associated Domains capability in Xcode with your domain
  - [ ] Test that tapping a link on a device opens the app

**Costs (Phase 6):**
| Item | Cost |
|---|---|
| Domain (.com) | $10–15/yr |
| Hosting (Vercel/Netlify/CF Pages free tier) | $0/mo |
| Framer/Webflow | $10–25/mo |
| Email: Zoho free tier / Google Workspace | $0 / ~$7/user/mo |
| Plausible/Fathom (or GA free) | $9–15/mo ($0) |
| **Realistic total** | **$1–3/mo DIY to ~$30/mo no-code** |

---

## Phase 7: App Store Preparation

- [ ] **Create the App Store Connect listing**
  - [ ] Register the bundle ID in the developer portal (must match Xcode)
  - [ ] Create the app record: name, primary language, bundle ID, SKU
  - [ ] Choose primary and secondary categories deliberately (affects charts and discovery)

- [ ] **App name and subtitle**
  - [ ] Name: ≤30 characters; ideally brand + one keyword ("AppName: Habit Tracker")
  - [ ] Subtitle: ≤30 characters; describe the benefit, don't repeat name keywords
  - [ ] Keywords in name/subtitle carry the most ASO weight — spend them wisely

- [ ] **Keywords field (100 characters)**
  - [ ] Brainstorm every term a user would search
  - [ ] Separate with commas, no spaces, no plurals needed (Apple matches them)
  - [ ] Don't repeat words already in your name/subtitle (wasted characters)
  - [ ] Don't use competitor names (rejection risk)
  - [ ] Optional: validate volume with an ASO tool (AppFigures, Astro)

- [ ] **Description**
  - [ ] First 3 lines are visible before "more" — lead with the strongest benefit
  - [ ] Follow with feature bullets using short lines
  - [ ] Include subscription terms if applicable (Apple checks this)
  - [ ] Write promotional text (170 chars, editable without app review — use for announcements)

- [ ] **Screenshots**
  - [ ] Capture from the required sizes (6.9" class covers modern iPhones; check current requirements in App Store Connect)
  - [ ] Add caption frames — a short benefit statement above each screenshot (tools: AppMockUp, Screenshots Pro)
  - [ ] Order matters: the first 2–3 screenshots drive the install decision
  - [ ] Show the app's core value in screenshot #1, not the login screen
  - [ ] Prepare iPad screenshots if you support iPad

- [ ] **App preview video (optional)**
  - [ ] 15–30 seconds of actual screen recording (Apple requires real app footage)
  - [ ] Capture with the simulator or QuickTime + device
  - [ ] Show the core action in the first 5 seconds; most viewers watch muted

- [ ] **Age rating questionnaire**
  - [ ] Answer Apple's content questions honestly (violence, gambling, user-generated content, etc.)
  - [ ] Note: unfiltered web access or UGC raises the rating and adds moderation requirements

- [ ] **Privacy nutrition label**
  - [ ] Enter the data inventory from Phase 4 into App Store Connect
  - [ ] Ensure it matches your privacy policy exactly — mismatches cause rejections and trust issues

- [ ] **Support URL and Privacy Policy URL**
  - [ ] Paste the live URLs from Phase 6; click both to verify they load
  - [ ] These being dead links is one of the most common rejection reasons

- [ ] **Set pricing / configure in-app purchases**
  - [ ] Set app price (or Free) and confirm territory availability
  - [ ] Finish IAP/subscription products: reference names, localized display names, prices, review screenshot for each
  - [ ] Attach the IAPs to the version submission (new IAPs must be submitted with a build)
  - [ ] Complete the Paid Applications Agreement, banking, and tax forms in App Store Connect — **payouts are blocked until this is done**

- [ ] **Review Apple's App Review Guidelines**
  - [ ] Read guideline sections 2 (Performance), 3 (Business), 4 (Design), 5 (Legal)
  - [ ] Self-check the top rejection causes: crashes, placeholder content, broken links, missing Sign in with Apple, missing account deletion, undisclosed data collection, misleading screenshots
  - [ ] Prepare demo account credentials for the review team if login is required
  - [ ] Fill in review notes explaining anything non-obvious

- [ ] **Submit for review**
  - [ ] Upload the final build; select it for the version
  - [ ] Set release option to **Manual release** (so approval ≠ surprise launch)
  - [ ] Submit; typical review is 24–48 hours
  - [ ] If rejected: read the reason, fix or respond via Resolution Center, resubmit (budget a week for cycles)

**Costs (Phase 7):**
| Item | Cost |
|---|---|
| Listing / review | Included in $99/yr |
| Screenshot design tool | $0–100 one-time |
| ASO keyword tool (optional) | $0–50/mo |
| Apple's commission | 15% (Small Business Program) or 30% |

---

## Phase 8: Marketing & Launch

### Pre-launch

- [ ] **Build a waitlist/email list**
  - [ ] Add the email form to your landing page (Mailchimp, Buttondown, ConvertKit free tiers)
  - [ ] Offer an incentive: beta access, launch discount, or early-bird pricing
  - [ ] Send at least one warm-up email before launch so subscribers remember you
  - [ ] Drive traffic: share build progress on X/Reddit/TikTok ("build in public" works)

- [ ] **Prepare a press kit**
  - [ ] Assemble on a /press page or shared folder: app icon (hi-res), 5+ screenshots, logo files, 100-word and 300-word descriptions, founder bio + photo, contact email
  - [ ] Include 2–3 ready-to-quote sentences about why the app exists
  - [ ] Add App Store link placeholder to swap in at launch

- [ ] **Line up launch channels**
  - [ ] Product Hunt: create the account weeks early (account age matters), prepare gallery images and first comment, schedule for 12:01am PT on a Tue–Thu
  - [ ] Reddit: identify 3–5 relevant subreddits; read each one's self-promotion rules; participate genuinely for weeks beforehand
  - [ ] X/Twitter: draft the launch thread with video/GIF of the app in action
  - [ ] Hacker News (if dev/productivity-focused): prepare a Show HN post
  - [ ] Draft all posts in advance — launch day is chaos

- [ ] **Reach out to niche newsletters/blogs/YouTubers**
  - [ ] Build a list of 10–30 outlets that cover your category
  - [ ] Send short, personalized pitches 1–2 weeks pre-launch with press kit + TestFlight/promo codes
  - [ ] Offer App Store promo codes (you get 100 per version, free in App Store Connect)
  - [ ] Track outreach in a spreadsheet; one polite follow-up after a week

- [ ] **Set a launch date**
  - [ ] Pick a Tuesday–Thursday; avoid holidays, Apple event days, and major news cycles
  - [ ] Work backward: app must be *approved* at least a few days before (manual release lets you hold it)
  - [ ] Block the entire launch day on your calendar — you'll be busy

### Launch day

- [ ] **Release the app**
  - [ ] Hit "Release this version" in App Store Connect
  - [ ] Wait for propagation (can take 1–24 hours to appear in all regions)
  - [ ] Install from the App Store yourself and smoke-test the live build, including purchases

- [ ] **Publish website updates**
  - [ ] Swap email capture for the live App Store download badge/link
  - [ ] Add the Smart App Banner meta tag with your live app ID
  - [ ] Verify analytics is tracking download clicks

- [ ] **Post on all channels**
  - [ ] Publish the Product Hunt launch and post your first comment immediately
  - [ ] Post the prepared X thread, Reddit posts, and Show HN
  - [ ] Personally reply to every comment and question all day — engagement drives ranking
  - [ ] Ask friends/testers to share (never to fake-upvote — platforms detect rings)

- [ ] **Email your waitlist**
  - [ ] Send the launch email in the morning with a direct App Store link
  - [ ] Include any launch-week discount and ask explicitly for reviews/shares

- [ ] **Monitor closely for 72 hours**
  - [ ] Watch Crashlytics for new crash clusters; hotfix anything severe immediately
  - [ ] Read every App Store review and support email
  - [ ] Watch server load/costs if you have a backend
  - [ ] Keep an expedited-review request in your back pocket for critical bugs (Apple grants these sparingly)

### Post-launch

- [ ] **Respond to App Store reviews**
  - [ ] Reply publicly to negative reviews with fixes/workarounds — reviewers can update their rating
  - [ ] Thank detailed positive reviewers
  - [ ] Mine reviews for the v1.1 priority list

- [ ] **Prompt happy users for ratings**
  - [ ] Trigger SKStoreReviewController only after a success moment (task completed, streak hit)
  - [ ] Never on first launch, never after an error
  - [ ] Apple caps the prompt at 3 times per year per user — spend them wisely

- [ ] **Ship v1.1 fast (within 2–4 weeks)**
  - [ ] Fix the top crashes and top 3 complaints from reviews/support
  - [ ] Write real release notes (users and Apple's editors read them)
  - [ ] A quick update signals the app is alive — it measurably helps trust and rankings

- [ ] **Track metrics**
  - [ ] Set up a simple weekly dashboard: downloads, D1/D7/D30 retention, conversion to paid, crash-free rate
  - [ ] Compare against your Phase 1 assumptions; adjust the roadmap based on what users actually do
  - [ ] Review App Store Connect's App Analytics for impression → download conversion (screenshot/ASO health)

- [ ] **Consider Apple Search Ads**
  - [ ] Start with a small Basic/Advanced campaign ($5–20/day) on your own brand name + top category keywords
  - [ ] Track cost per install against your revenue per user before scaling
  - [ ] Kill keywords that don't convert; double down on ones that do

**Costs (Phase 8):**
| Item | Cost |
|---|---|
| Email list tool | $0–20/mo |
| Product Hunt / Reddit / HN / promo codes | Free |
| Apple Search Ads (optional) | $50–1,000+/mo (you set budget) |
| Paid placements (optional) | $100–5,000+ |

---

## Total Cost Summary

### Bare-minimum bootstrap (DIY everything)
| Category | Cost |
|---|---|
| Apple Developer Program | $99/yr |
| Domain | ~$12/yr |
| Hosting (free tiers) | $0/mo |
| LLC (optional at first) | $0–150 |
| Legal doc generator | $0–100 |
| **Year 1 total** | **~$120–500** *(assumes you own a Mac)* |

### Typical solo/indie launch
| Category | Cost |
|---|---|
| Developer fee + domain | ~$115/yr |
| Design help (icon, screenshots) | $200–800 |
| Backend + website hosting | $10–50/mo |
| LLC + legal | $200–800 |
| Modest marketing | $100–500 |
| **Year 1 total** | **~$1,000–3,500** |

### Hiring out development
| Category | Cost |
|---|---|
| Freelance MVP build | $10,000–25,000 |
| Design | $2,000–8,000 |
| Everything above | $1,000–3,000 |
| **Year 1 total** | **~$15,000–40,000+** |

---

## Suggested Timeline (solo developer, part-time)

| Weeks | Phase |
|---|---|
| 1–2 | Planning, validation, naming |
| 2–3 | Legal setup, domain, developer account |
| 3–6 | Design (wireframes → mockups) |
| 6–16 | Development + backend |
| 12–16 | Website build (parallel with dev) |
| 16–18 | TestFlight beta + fixes |
| 18–19 | App Store prep + submission |
| 20 | Launch 🚀 |

---

## Common Pitfalls to Avoid

1. **Building too much before launch** — ship the smallest useful version
2. **Skipping the beta** — real users find bugs you won't
3. **Ignoring App Review Guidelines** — read them *before* building, not after rejection
4. **No privacy policy URL / dead support URL** — instant rejection
5. **Missing Sign in with Apple or in-app account deletion** — two of the most common rejections for apps with accounts
6. **Paying for servers you don't need** — free tiers handle thousands of early users
7. **Launching silently** — marketing prep starts weeks before, not day-of
8. **Forgetting Apple's cut** — price knowing 15–30% goes to Apple (and opt into the Small Business Program!)
9. **Skipping the tax/banking forms in App Store Connect** — no payouts until they're done
10. **Untested backups and wide-open database rules** — the two backend mistakes that end projects
