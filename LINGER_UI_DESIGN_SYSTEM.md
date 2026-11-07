# linger. — Design System & UI Reasoning Specification

> **Purpose of this file:** Feed this `.md` file directly to any AI coding assistant (or back to Gemini) whenever you want to recreate, extend, or build new pages in the exact **linger.** visual language.

---

## 1. Core Brand Philosophy & Why This UI Works

### 1.1 The "Anti-Neon" Nightlife Positioning
Most nightlife, party, and dating apps fall into the same cliché trap: pitch-black `#000000` backgrounds with loud neon purple, hot pink, and cyber-green gradients, paired with cluttered badges and gamified icons. That aesthetic feels cheap, juvenile, and overly "techy."

**linger.** takes the opposite approach—inspired by high-taste social and hospitality brands (Soho House, Raya, Partiful, Luma, and Apple's editorial interfaces):
- **Intimate, not clinical:** The app is used in dimly lit environments (raves, festivals, parties) when someone notices a person in the crowd and feels a spark of curiosity. Deep wine/oxblood **Burgundy** feels warm, nocturnal, romantic, and elevated without blinding the user's eyes in a dark room.
- **Editorial, not gamified:** Replacing standard bold sans-serif headings with an expressive **Display Serif (`Instrument Serif`)** turns functional instructions (*"Notice someone in the crowd? Don't let the moment pass."*) into an atmospheric statement.
- **High-Contrast Clarity (80% Burgundy / 20% Crisp White):** Instead of scattering 6 different accent colors for statuses, warnings, and buttons, **linger.** uses a strict two-tone hierarchy:
  1. **Deep Burgundy Canvas** for atmosphere, navigation, and secondary surfaces.
  2. **Crisp Pure White (`#FFFFFF`)** exclusively for the primary interactive focal card on each screen, primary action buttons, and active states.

---

## 2. Color System & Exact Hex Tokens

The entire application is restricted to the **Burgundy + White** palette. Never introduce random greens, yellows, blues, or neon pinks.

### 2.1 Primary Surfaces (Mostly Burgundy)
| Role | Hex / Tailwind Token | Usage |
| :--- | :--- | :--- |
| **Outer Desktop Backdrop** | `radial-gradient(ellipse_at_top, #541126 0%, #2b0712 55%, #160308 100%)` | Ambient glow behind the mobile frame on desktop screens |
| **Mobile App Canvas** | `bg-gradient-to-b from-[#420c1d] via-[#2b0712] to-[#1e040c]` | Main background of the `430px` mobile container |
| **Deepest Camera/Card Base** | `#160309` to `#24050f` | Camera viewport background and dark profile card base |
| **Brand Burgundy Primary** | `#541126` (`burgundy-900`) | Primary buttons inside white cards, monograms, active pills |
| **Brand Burgundy Hover** | `#691630` / `#781b37` (`burgundy-800`) | Hover states and secondary burgundy accents |
| **Translucent Glass Surface** | `bg-white/[0.06]` or `bg-white/10` | Secondary cards, pills, and navigation buttons on burgundy backgrounds |
| **Glass Hairline Border** | `border-white/12` or `border-white/15` | 1px subtle architectural borders on dark burgundy surfaces |

### 2.2 High-Contrast Focal Surfaces (White & Warm Ivory)
| Role | Hex / Tailwind Token | Usage |
| :--- | :--- | :--- |
| **Primary Focal Card** | `#FFFFFF` (`bg-white`) | The single main action card on Landing, Onboarding, and Preview screens |
| **Soft Tinted Input Fill** | `#F7EFF1` (`bg-[#f7eff1]`) | Input fields, secondary buttons, and step boxes inside white cards |
| **Subtle Inset Box Fill** | `#FAF5F6` (`bg-[#faf5f6]`) | Instructional callout boxes inside white cards |
| **Warm Hairline Border** | `#EADADD` (`border-[#eadadd]`) | 1px borders around inputs and mini-cards inside white surfaces |
| **Primary Ink on White** | `#2B0712` (`text-[#2b0712]`) | All primary headings and input text inside white cards (never pure `#000000`) |
| **Muted Ink on White** | `#6E4753` / `#9C7A84` | Supporting descriptions and input placeholders inside white cards |

### 2.3 Tailwind `burgundy` Scale (`tailwind.config.ts`)
```ts
colors: {
  burgundy: {
    50: "#fdf2f4",
    100: "#fbe6ea",
    200: "#f6d0d8",
    300: "#eea9b8",
    400: "#e27891",
    500: "#cf4b6d",
    600: "#b52f55",
    700: "#942143",
    800: "#781b37",
    900: "#541126",
    950: "#2b0712",
  },
}
```

---

## 3. Typography System

Loaded via `next/font/google` in `src/app/layout.tsx`:

1. **Editorial Display Serif — `Instrument Serif` (`--font-serif`)**
   - **Weights/Styles:** `400` normal and `400` italic.
   - **Where to use:**
     - The brand wordmark: `linger.` (always lowercase, `font-serif italic`, with a period or small white dot).
     - Main screen headlines (`text-[38px] leading-[1.06] tracking-tight`). Use *italic* (`text-white/85`) on the second half of a headline to create emotional cadence.
     - Editorial numerals (`01`, `02`, `03`, countdown `3, 2, 1`, and time ranges `0–3s`, `3–6s`, `6–8s`).
     - Attendee names on discovery cards (`font-serif text-2xl`).

2. **UI & Body Sans-Serif — `Plus Jakarta Sans` (`--font-sans`)**
   - **Weights:** `400`, `500`, `600`, `700`.
   - **Where to use:**
     - Micro-eyebrow labels (`text-[11px] font-semibold uppercase tracking-[0.16em]`).
     - Form inputs, buttons, badges, and body copy (`text-xs` or `text-sm leading-relaxed`).

---

## 4. Layout & Spatial Architecture

1. **Mobile-First Viewport Frame (`src/app/layout.tsx`):**
   - Centered `max-w-[430px]` container with `min-h-[100dvh]`, `flex flex-col justify-between`, and `px-5` or `px-6` horizontal breathing room.
   - On desktop, flanked by `sm:border-x sm:border-white/10` and a deep shadow (`shadow-[0_0_90px_rgba(0,0,0,0.75)]`) over the radial burgundy backdrop.
2. **Generous Corner Radii:**
   - Primary White Cards: `rounded-[28px]`
   - Camera Viewport Frame: `rounded-[32px]`
   - Discovery Grid Cards: `rounded-[26px]`
   - Inputs & Primary Buttons: `rounded-2xl` (`16px`)
   - Status & Navigation Pills: `rounded-full`
3. **One White Card Per Screen Rule:**
   - To preserve the "mostly burgundy" identity while keeping forms effortless to read, each screen has **at most one** solid white card (`bg-white text-[#2b0712]`). Everything else on the screen uses translucent white-on-burgundy (`bg-white/[0.06] border border-white/12`).

---

## 5. Component-by-Component Design Rules

### 5.1 Header & Wordmark
- Left or center: `<span className="font-serif italic text-2xl text-white">linger.</span>`
- Navigation back links use minimal translucent pills:
  `rounded-full bg-white/10 border border-white/15 px-3.5 py-2 text-xs font-medium text-white/80 hover:text-white`

### 5.2 Primary White Action Card (`QrEntryCard` & Onboarding Form)
- Container: `rounded-[28px] bg-white text-[#2b0712] p-6 shadow-[0_24px_60px_rgba(18,2,7,0.55)]`
- Eyebrow label: `text-[11px] font-semibold uppercase tracking-[0.16em] text-burgundy-700`
- Input field: `rounded-2xl bg-[#f7eff1] border border-[#eadadd] px-4 py-4 text-sm font-semibold text-[#2b0712] placeholder:text-[#9c7a84] focus:ring-2 focus:ring-burgundy-800 focus:bg-white`
- Primary CTA button inside a white card:
  - Full width, left-aligned label, right-aligned `ArrowUpRight` icon (`justify-between`).
  - `rounded-2xl bg-[#541126] hover:bg-[#691630] text-white font-semibold py-4 px-5 text-sm shadow-lg`

### 5.3 Camera Viewfinder (`SelfieVideoRecorder`)
- **No cartoon icons or bright colored dashed boxes.**
- Aspect ratio: `aspect-[9/14] max-h-[68dvh] rounded-[32px] overflow-hidden bg-[#160309] border border-white/15`
- **Top Segmented Progress Bar:**
  - `h-1.5 rounded-full bg-white/20` with a solid `bg-white` fill bar and two `2px` dark burgundy tick marks at `37.5%` (3s) and `75%` (6s).
- **Top Frosted Instruction Card:**
  - `rounded-2xl bg-[#2b0712]/80 backdrop-blur-md border border-white/15 px-4 py-3`
  - Uses `font-serif text-xl text-white` for the active step title (*"Show your face & hair"* → *"Tilt down to show your outfit"* → *"Back to your face"*).
- **Center Architectural Guide Frame:**
  - A single clean `w-48 h-60 rounded-[36px] border border-white/45` silhouette guide that smoothly shifts downward (`translate-y-3 border-white/90`) during seconds `3–6` with a crisp white floating pill (`bg-white text-[#2b0712] rounded-full px-3.5 py-1.5 text-xs font-bold`).

### 5.4 4-Profile Discovery Grid (`EventDiscoverPage`)
- `grid grid-cols-2 gap-3.5` of `aspect-[9/13] rounded-[26px]` cards.
- Card surface: `bg-gradient-to-b from-[#61152d] to-[#24050f] border border-white/15 p-3.5`
- Proximity badge (top-left): `rounded-full bg-white/15 backdrop-blur-md border border-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white` with a `1.5px` white dot.
- Attendee name (bottom): `font-serif text-2xl text-white leading-none`.
- Action button (bottom):
  - Default: `bg-white text-[#2b0712] rounded-xl py-2.5 px-3 text-xs font-semibold shadow-md`
  - Sent state: `bg-white/15 border border-white/30 text-white`

---

## 6. Copywriting & Terminology Rules

When generating new screens for **linger.**, always use these terms:
- Call events **"Rooms"** or **"Tonight's Room"** (e.g., *"Enter tonight's room"*, *"Active Rooms Tonight"*, *"In Room"*).
- Call the 8-second selfie video **"Tonight's Look"** or **"8-Second Look Check"** (e.g., *"Retake Look"*, *"See how they look tonight"*).
- Keep microcopy calm, confident, and human—avoid technical jargon like *"Blob URL"*, *"Geolocation coordinates"*, or *"Database record"*.
