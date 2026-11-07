# linger. — Competitive Intelligence & Strategic Differentiation Report

> **Purpose of this report:** Independently verify the current status, onboarding mechanics, profile formats, proximity models, interest visibility, and business models of the 10 direct and adjacent competitors identified in Section 11 of the Product Brief—and critically evaluate **linger.**'s differentiation hypothesis.

---

## 1. Executive Comparison Matrix

| Product | Access Format | Entry Mechanism | Profile Media Format | Shows Tonight's Outfit? | Interest Visibility | Proximity Ranking | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **linger. (Our Product)** | **Mobile Browser Web App** | **Venue QR Code / Room Code** | **8s Live Selfie Video (0–3s Face/Hair, 3–6s Outfit)** | **Yes (Mandatory Guided Tilt)** | **Identified (Recipient sees sender's 8s video)** | **Real-Time Bands (Very Nearby → Nearby → In Room)** | **MVP Built** |
| **Spark** (`joinspark.me`) | Mobile Browser Web App | Venue QR Code / Code | Static Selfie / Photo | No (Headshot / standard photo) | Anonymous until mutual match | Venue-level check-in only | Active |
| **Letsee Crush** (`letsee.app/crush`) | Mobile Browser Web App | Event QR Code / Link | Static Photo Upload | Unstructured (Often gallery or headshot) | Anonymous ("Secret Like") until mutual | Event-level check-in only | Active (LatAm & Global Weddings/Parties) |
| **HookedIRL** | Native App (iOS & Android) | Event QR Code Scan | Static Photo + Bio/Age | No | Standard swipe / like | Event-level check-in | Active (Low adoption outside hosted mixers) |
| **MateUp** (`mateup.org`) | Native App (iOS & Android) | GPS + Venue QR Check-In | Static Photos + Pre-event profile | No | Mutual "Vibes" | Venue geofence + Pin drop in chat | Active |
| **FirstMove** (`firstmove.live`) | Native App (iOS & Android) | Geofenced "VibeZones" | Static Photo Profile | No | **Anonymous** ("3-Way Handshake" knock) | Geofenced VibeZone map | Active (UK/EU focus) |
| **Partiful** (Crush feature) | Native App + Web RSVP | Event RSVP Graph ("Mutuals") | Curated Profile Photo | No (Post-event usage) | **Anonymous** ("Someone at [Event] crushed you") | None (Post-event social graph) | Active (High Gen-Z adoption) |
| **Afterhi** (`afterhi.app`) | Mobile Web / App | Table / Venue QR Code | Static Photo + Status | No | Mutual / Open table chat | Venue-level (Bars & Cafes) | Active (Early stage) |
| **Flind** | Native App Concept | Event Check-In | Static Photos | No | Standard swipe | Event-level | Minimal / Dormant |
| **Turn Up** (`turn-up.app`) | Native App (iOS & Android) | Spotify/Deezer + "Going To" | Curated Photos + Music Prompts | No | Standard dating swipe (Paywalled likes) | City-level + Pre-event RSVP | Active (~3.9★ rating) |
| **IRL** (`irl.com`) | Native App (Shut Down) | Event Calendar / Groups | Static Profile | No | Group/Event chat | City/Event | **Shut Down (June 2023)** |

---

## 2. Deep-Dive Analysis: Direct Competitors

### 2.1 Spark (`joinspark.me`)
* **Verified Facts:**
  * **Platform & Onboarding:** Browser-based mobile web app (no app store download required). Attendees scan a venue QR code or enter a short code, enter their name, and take/upload a single photo.
  * **Ephemeral Lifecycle:** Profiles, matches, and messages are automatically deleted when the night/event ends ("no trace, no data stored").
  * **Distribution & Business Model:** Free for attendees; relies on venue partnerships and student/nightlife ambassador programs.
* **Product Weaknesses & Gaps vs. linger.:**
  * Relies on a single static photo/selfie. In a dark, crowded rave or festival, a tight face selfie rarely helps you recognise the person who just walked past you in a distinctive outfit or hairstyle.
  * Does not rank attendees by real-time sub-venue proximity (`Very Nearby` vs. `In Room`).

### 2.2 Letsee Crush (`letsee.app/crush`, formerly *veamoslasfotos.app*)
* **Verified Facts:**
  * **Platform & Onboarding:** Browser-based web platform heavily used at weddings, private parties, and corporate/nightlife events. Guests scan a QR code on tables or screens with zero app download.
  * **Profile & Matching:** Guests upload a photo to join the event's shared digital album and can opt into **Crush®**, where they send "Secret Likes" to other guests. Mutual likes trigger a match.
  * **Pricing & Business Model (Verified):** B2B organiser-paid packages ranging from **$153 to $320+ USD per event**, bundling live screen photo projection, digital albums, trivia/polls, and capacity tiers (e.g., up to 500 or 1,000 Crush profiles).
* **Product Weaknesses & Gaps vs. linger.:**
  * Built primarily as a wedding/party photo-booth and projection tool where "Crush" is an add-on game.
  * Uses **secret/anonymous likes**, which forces recipients to guess who liked them by swiping through hundreds of guests rather than directly inspecting the sender's profile (**Identified Interest**).

### 2.3 HookedIRL (Hooked Social Inc.)
* **Verified Facts:**
  * **Platform & Onboarding:** Requires downloading a native iOS or Android app from the App Store / Google Play before scanning the event QR code.
  * **Profile Creation:** Official store listing states: *"Share what matters—your name, age, interests, and a photo. Profiles are visible only during the event you're attending."*
* **Product Weaknesses & Gaps vs. linger.:**
  * **Fatal App-Store Friction at the Door:** Asking attendees at a rave or festival entrance (often with poor cell reception and low patience) to download a 60MB native app from the App Store, create an account, and verify an email/phone number causes massive drop-off before entry.

### 2.4 MateUp (`mateup.org`)
* **Verified Facts:**
  * **Platform & Mechanics:** Native iOS/Android app targeting clubs, parties, and festivals. Features a **"Pre-Arrival Mode"** (4–8 hours before the event starts) where users browse guest lists and send early "Vibes."
  * **In-Person Meetup Prompts:** Uses **"Vibe Badges"** (*"Shots?"*, *"Next round on me?"*, *"Chill talk"*) and pin-drops (bar, DJ booth) to move matches from chat to face-to-face meeting quickly.
  * **Expiration:** Chats and vibes auto-delete when the venue closes.
* **Product Weaknesses & Gaps vs. linger.:**
  * Native app download barrier.
  * Because users set up profiles hours *before* arriving ("Pre-Arrival Mode") using existing gallery photos, the profile does not reliably reflect how they actually look or what they are wearing at the venue tonight.

### 2.5 FirstMove (`firstmove.live`)
* **Verified Facts:**
  * **Platform & Mechanics:** Native iOS/Android app built around geofenced **"VibeZones"** (festival fields, clubs, rooftops).
  * **Interest Model ("3-Way Handshake"):** Explicitly **anonymous**. If User A "knocks" on User B's profile, User B is **never notified** unless User B independently knocks on User A too.
  * **Pricing & Business Model (Verified):**
    * **B2B Organiser SaaS + Ticketing:** Free tier (6% + £0.30/ticket), **Room Tier (£49/mo)** for 1 VibeZone, **Circuit Tier (£249/mo)** for 5 VibeZones and reduced ticketing fees (2.5% + £0.30).
    * **B2C Microtransactions:** Sells in-app "Coins" to send digital gifts (Rose, Cocktail) inside chats.
* **Product Weaknesses & Gaps vs. linger.:**
  * **The Anonymous "Double-Blind" Trap:** Because FirstMove never notifies User B when User A knocks, two people only match if *both* happen to browse the entire room and tap each other independently. In a rave of 150+ people, double-blind matching yields very low match rates compared to **Identified Interest** (where User B sees that User A noticed them and can watch User A's 8-second look to decide).

---

## 3. Deep-Dive Analysis: Adjacent Products

### 3.1 Partiful ("Crush" & "Mutuals")
* **Verified Facts:**
  * Partiful is a dominant party RSVP web/mobile platform. Its **Mutuals** graph tracks people you have attended events with.
  * **Crush Mechanics:** Users can select up to 10 crushes per month from past events. The recipient gets an **anonymous** notification (*"Someone from [Event Name] has a crush on you"*), hiding the event name if the guest list was too small.
* **Key Lesson for linger.:**
  * Partiful proved that **event context removes the stigma of expressing interest**. However, Partiful's Crush works *retrospectively* (after the party is over, or only if you know the person's name on the RSVP list). It does **not** solve the problem of noticing a stranger across the dancefloor whose name you don't know and who didn't RSVP on Partiful.

### 3.2 IRL — Actually Interacting (`irl.com`)
* **Verified Facts:**
  * Raised nearly $200M at a $1.17B valuation as an event-based social discovery network, then **permanently shut down on June 27, 2023** after an internal board investigation revealed that **95% of its claimed 20 million users were automated bots**.
* **Key Lesson for linger.:**
  * Vanity download/registration numbers mean nothing in event social discovery. Only **single-venue participant density** and **real-world in-event conversions** matter.

### 3.3 Afterhi (`afterhi.app`), Flind & Turn Up (`turn-up.app`)
* **Afterhi:** Uses table QR codes in bars/cafes for immediate room check-in, validating low-friction QR table/venue entry.
* **Turn Up:** Connects music/festival lovers via Spotify/Deezer integration and "Going To" concert badges (~3.8–4.0★ rating). **Top user complaints:** empty local rooms outside major hubs, and aggressive paywalls hiding who liked you.

---

## 4. Answering the 10 Critical Competitor Questions (Section 11)

1. **Has anyone already combined live selfie video, face/hair/outfit visibility, proximity-ranked discovery, identified interest, and event-specific browser access?**
   * **No.** While browser QR check-in (`Spark`, `Letsee Crush`) and temporary event profiles (`HookedIRL`, `MateUp`, `FirstMove`) already exist, **no verified competitor combines a live in-browser selfie video specifically guided to show face, hairstyle, and tonight's outfit (`0–3s Face & Hair` → `3–6s Outfit`) with identified interest and nearby-first ranking.**
2. **Which features are already common?**
   * Venue QR check-in, temporary profiles that expire after the night ends, and mutual-opt-in chat. You should **not** market "QR code event dating" alone as unique—those mechanics are already used by `Spark` and `Letsee Crush`.
3. **Which features are poorly executed by competitors?**
   * **Visual Recognition in the Crowd:** Every competitor relies on a static photo (either an old gallery photo or a tight face selfie in bad club lighting). In a crowded rave or festival, people recognise passersby by a combination of **hairstyle + outfit + face**.
   * **Anonymous / Double-Blind Likes:** Competitors like `FirstMove`, `Letsee Crush`, and `Partiful` hide who sent the like, forcing users to swipe through the entire venue list to guess who noticed them. **linger.**'s **Identified Interest** (where the recipient sees the sender's 8s video and can match back or pass privately) dramatically reduces time spent staring at a phone.
4. **How do competitors solve the cold-start problem of getting enough attendees at the same event?**
   * Successful deployments (`Letsee`, `Partiful`) bundle the social feature into something the organiser *already* promotes (the entrance check-in, welcome drink QR, DJ request screen, or event photo wall) rather than pitching it purely as a "singles corner."
5. **What business models have been attempted?**
   * **B2B Event Packages (`Letsee`):** $150–$320 per event paid by the organiser/host.
   * **B2B Venue SaaS + Ticketing Fee Reduction (`FirstMove`):** £49–£249/month for promoters.
   * **B2C Paywalled Likes / Coins (`Turn Up`, `FirstMove`):** Consistently criticised by users in app reviews because paywalling likes in a small room kills match liquidity.

---

## 5. Biggest Risks for linger. & Cheapest Ways to Test Them

* **Risk 1: Camera Self-Consciousness at the Venue Entrance**
  * Recording an 8-second selfie video in public at a party entrance takes more courage than snapping a static photo. If the entrance is dark or crowded, some attendees may hesitate.
  * **Cheapest Test:** At your first Lagos pilot event, place a dedicated **"linger. Look Check Mirror / Lighting Spot"** near the entrance or restroom lounge with warm burgundy lighting and the QR poster. Measure the exact conversion rate from `/event/[code]` landing → completed `/record` upload.
* **Risk 2: Room Density (The Cold-Start Threshold)**
  * If only 6 people join a room over a 5-hour party, the 4-profile grid feels static.
  * **Cheapest Test:** Do not launch at a massive 2,000-person festival first. Run your first pilot at a single contained 80–150 person house party, rooftop event, or warehouse rave where promoters actively direct guests to scan the entrance QR code upon arrival.
