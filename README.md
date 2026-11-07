# Tonight — Event-Based Social Discovery Web App

A mobile-first, browser-based social discovery web application built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

Designed for raves, music festivals, and parties so attendees can scan an event QR code, record a short live selfie video showing their **face, hairstyle, and tonight's outfit**, and discover nearby attendees in real time.

---

## Project Folder Structure

```text
event-social-discovery/
├── .env.example                                  # Environment variables template (Supabase, App URL)
├── next.config.ts                                # Next.js configuration
├── package.json                                  # Dependencies & scripts
├── postcss.config.mjs                            # PostCSS config for Tailwind CSS
├── tailwind.config.ts                            # Tailwind CSS theme & mobile-first utilities
├── tsconfig.json                                 # TypeScript configuration
└── src/
    ├── app/
    │   ├── globals.css                           # Global dark-mode styles & mobile safe-area helpers
    │   ├── layout.tsx                            # Mobile-first viewport container frame
    │   ├── page.tsx                              # Main Landing Page with QR Code / Event Code entry
    │   └── event/
    │       └── [eventCode]/
    │           ├── page.tsx                      # Direct QR Event Landing Page + Display Name step
    │           ├── record/
    │           │   └── page.tsx                  # Selfie Video Camera Recording Page
    │           └── discover/
    │               └── page.tsx                  # 4-Profile Nearby Discovery Grid Preview
    ├── components/
    │   ├── qr-entry-card.tsx                     # QR URL / Event Code input & camera QR photo decoder
    │   └── selfie-video-recorder.tsx             # Live front-camera 8s recorder with timed prompts
    ├── lib/
    │   ├── media.ts                              # Cross-browser iOS/Android MediaRecorder MIME helpers
    │   └── mock-events.ts                        # Demo events (NEON26, AFROFEST, ROOFTOP) & step config
    └── types/
        └── event.ts                              # Domain types (EventDetails, AttendeeProfile, ProximityBand)
```

---

## Getting Started

1. **Install Node.js** (v18.18+ or v20+ LTS recommended from [nodejs.org](https://nodejs.org/)).
2. **Open this project folder as your workspace**:
   ```bash
   cd C:/Users/User/.gemini/antigravity/scratch/event-social-discovery
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start the development server**:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` in your browser (or on your phone over local HTTPS/tunnel to test mobile camera permissions).
