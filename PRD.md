# Product Requirements Document: ZuluGrid

## 1. Overview

**ZuluGrid** is a digital recreation of the classic Geochron world clock, designed for always-on display in enterprise environments (offices, operations centers, conference rooms). The application tracks global teams, projects, and assets by showing real-time day/night conditions, sun position, and configurable location pins on a geopolitical Mercator world map.

### Target Platforms (Phase 1)
- **Raspberry Pi** — Chromium kiosk mode
- **Windows** — Standalone app (Electron) or browser-based

### Target Platforms (Phase 2)
- **Roku** — Requires separate BrightScript + SceneGraph codebase (see Section 12)

### Target Platforms (Deferred)
- **Amazon Fire Stick / Fire TV** — Deferred until Pi and Windows are stable

### Technology Stack
- **Core**: Web application (HTML5 Canvas / WebGL + CSS + TypeScript)
- **Rendering**: Hybrid approach — pre-rendered base map images per theme (performance) with dynamic overlay elements (borders, labels, terminator) rendered at runtime via Canvas/WebGL
- **Framework**: Lightweight or vanilla TS for minimal bundle size (consider Svelte if a reactive framework is needed)
- **Packaging**: Electron (Windows desktop), Chromium kiosk (Pi)
- **Backend**: Node.js + TypeScript API server with SQLite (MVP), migratable to PostgreSQL. Packaged as Docker container for cloud-agnostic deployment
- **Authentication**: Username/password for admin panel; JWT bearer tokens for device/API authentication
- **Security**: All client-backend communication over TLS (HTTPS + WSS). No unencrypted channels.

---

## 2. Core Geochron Features

These features replicate the functionality of a classic Geochron world clock.

### 2.1 Mercator World Map
- High-resolution **geopolitical** Mercator projection map as the base layer
- Map data sourced from **Natural Earth** (free, public domain, includes political boundaries and coastlines)
- **Three selectable color themes**:
  - **Classic Geochron**: Muted earth tones, tan/beige landmasses, blue oceans, thin white country borders — warm, vintage look
  - **Modern/vibrant**: Distinct colors per country/region (political atlas style), bright oceans, crisp borders
  - **Dark theme**: Dark navy/charcoal oceans, muted country colors — easy on eyes for 24/7 display
- Theme selectable per display via admin panel
- **Two map behaviors** (toggle in settings, default: static):
  - **Static map**: Map stays fixed, terminator line moves across it. Better for reading location pins.
  - **Scrolling map (classic Geochron)**: Map continuously scrolls left-to-right, terminator stays roughly centered. Faithful to the original.
- **Two map modes**:
  - **Classic static map** (default): Pre-rendered high-res geopolitical image on Canvas (works offline)
  - **Interactive map**: OpenStreetMap / Leaflet-based tile map with zoom and pan capability
- User can switch between modes via settings

### 2.2 Day/Night Terminator
- Real-time day/night boundary rendered as a smooth curve (sinh curve on Mercator projection)
- Illuminated (day) and dimmed (night) regions with smooth gradient transition at the terminator
- **Twilight bands**: Civil, nautical, and astronomical twilight zones rendered as gradual shading
- Updates continuously (at least once per minute)
- Seasonal variation: terminator shape changes throughout the year based on solar declination (±23.4°)

### 2.3 Sun Position & Analemma
- **Sub-solar point**: Marker on the map showing the point on Earth directly beneath the sun
- Sub-solar point traces the **analemma** (figure-8 pattern) over the course of the year
- Accounts for the **equation of time** (±16 minutes drift from mean solar time)

### 2.4 Time Zone Display
- All 24 major time zones displayed simultaneously
- Time zone boundaries visible on the map
- Fixed hour scale along the top or bottom edge
- Current time readable for any time zone at a glance
- **UTC / GMT** (Zulu time) always displayed prominently

### 2.5 Date & Time Readout
- Current date (day, month, year)
- Current UTC time
- Local time at the display's physical location
- Minute-level precision

### 2.6 Sunrise / Sunset Readability
- The terminator position allows reading approximate sunrise and sunset times for any location on the map
- Duration of daylight readable by the width of the illuminated band at any latitude

### 2.7 Time-Lapse / Demo Mode
- Accessible from settings or admin panel
- Speeds through a full year of day/night terminator changes
- **Adjustable speed**: 1 hour per second, 1 day per second, custom speed slider
- Useful for presentations, product demos, and verifying astronomical calculation accuracy
- Displays "DEMO MODE" indicator while active
- Exits back to real-time on any user interaction or after a configurable timeout

### 2.8 Branding
- **Configurable** via admin panel:
  - Upload a company logo (displayed in a corner of the screen)
  - Set a custom title text (e.g., company name or "Global Operations")
  - Option to hide both logo and title for a clean display
- "ZuluGrid" product watermark optional and toggleable

---

## 3. Location Pins & Tracking

### 3.1 Static Location Pins
- Admin-configurable pins for key cities, offices, or project sites
- Each pin displays:
  - Custom label (city name, office name, project name)
  - Current local time
  - Day/night status
  - Current weather conditions (temperature in °F default, switchable to °C; conditions icon)
- Support for at least 50 simultaneous pins

### 3.2 Dynamic Location Sources
Locations can be pulled automatically from multiple sources via a layered ingestion architecture. All integrations built as **generic configurable connectors** that can be enabled when accounts/credentials are available.

#### Layer 1: Webhook / REST API (Core)
- REST API endpoint that any device, app, or service can POST location data to
- Supports any GPS-capable device, MDM tool, IFTTT, custom scripts
- JSON payload with lat/lng, device ID, timestamp, optional metadata
- **Authentication**: JWT bearer token required for all submissions
- This is the universal ingestion point — all other sources can also feed through this

#### Layer 2: Existing Service Integrations
- **Google Location Sharing API** — pull shared locations
- **Apple FindMy** — where API access is available
- **Life360 API** — family/team location sharing
- Polled on configurable intervals (e.g., every 5 minutes)
- Each integration toggleable independently

#### Layer 3: Enterprise Directory
- **Azure AD / Entra ID** via Microsoft Graph API — pull user office locations
- Map users to their registered office locations
- Optional: pull user presence/status (available, in a meeting, etc.)

#### Layer 4: Project Management / CRM
- **Jira** — pull project locations from custom fields
- **Salesforce** — pull account/opportunity locations
- Custom databases via webhook or REST
- Each location source tagged with its origin for filtering

#### Future: Companion Mobile App (Not In Scope)
- A dedicated mobile app could report GPS coordinates to the webhook API
- Deferred indefinitely — GPS tracking handled via existing services (Life360, Google Location Sharing) or direct webhook integrations from MDM tools

### 3.3 Location Pin Appearance
- Differentiate pin types visually (people vs. devices vs. projects)
- Color-coding or icon system configurable by admin
- Pins should not obscure the map when many are clustered — implement clustering or scaling

### 3.4 Location History
- Configurable retention period set by admin (1 day, 7 days, 30 days, 90 days, or custom)
- Optional fading trail showing recent movement on the map
- Historical playback mode accessible from admin panel
- Auto-purge of data beyond retention period
- Privacy controls: opt-in per device/person, admin can configure which entities are tracked and for how long

---

## 4. Weather & Data Overlays

### 4.1 Weather on Location Pins
- Current temperature (°F default, configurable to °C) and conditions icon displayed on each pin
- **Pluggable weather provider**: abstracted behind a common interface, swappable via config
  - Default: **OpenWeatherMap** (free tier: ~1,000 calls/day; paid tiers available)
  - Alternatives: Open-Meteo (free, no API key), Tomorrow.io, Visual Crossing, WeatherAPI
- Cached and refreshed every 15–30 minutes per location

### 4.2 Weather Map Overlay
- Optional cloud cover / precipitation overlay on the map itself
- Togglable from settings — off by default to keep display clean
- Semi-transparent layer that doesn't obscure pins or terminator

### 4.3 ISS / Satellite Tracking Overlay
- Real-time International Space Station position, updated every few seconds
- ISS icon with orbital path line showing upcoming trajectory
- Data from public APIs (e.g., Open Notify ISS API, N2YO, CelesTrak TLE data)
- Togglable overlay — can be turned on/off from admin or display settings

### 4.4 Flight Tracking Overlay
- Real-time commercial flight positions shown on the map
- **Pluggable flight data provider**: abstracted behind a common interface, swappable via config
  - Default: **OpenSky Network** (free tier: 4,000 req/day registered)
  - Alternatives: ADS-B Exchange, FlightAware, Flightradar24
- **Configurable density**: Admin sets density level per display (light ~50-100 flights, medium ~200-500, dense ~all). Default: medium
- **Full filtering system**:
  - Filter by airline (e.g., show only Delta, United, British Airways)
  - Filter by origin/destination region (e.g., only flights to/from North America, Europe, Asia)
  - Pin specific flights by flight number (e.g., track AA100 daily)
  - All filters configurable per display via admin panel
- Aircraft icons with heading indicators
- Togglable overlay — off by default
- Note: higher-quality flight APIs may require paid subscriptions

### 4.5 Overlay Layering
- All overlays are independent and stackable
- Admin configures default overlay visibility per display
- Recommended display priority (bottom to top):
  1. Base map
  2. Weather overlay
  3. Day/night terminator + twilight bands
  4. Flight tracks
  5. ISS / satellite tracks
  6. Location pins (always on top)

---

## 5. Display Modes

### 5.1 Bright Mode
- Full brightness, high contrast
- Designed for well-lit offices and conference rooms
- Vivid colors on the map and overlays

### 5.2 Low-Light / Night Mode
- Reduced brightness, muted colors
- Dark background tones
- Reduced blue light where possible
- Location pins and text remain legible but dimmed

### 5.3 Mode Switching
Three switching mechanisms (all active simultaneously, with priority order):

1. **Manual override** (highest priority): Physical button, remote control, or web admin toggle
2. **Ambient light sensor** (medium priority): On Raspberry Pi, use a connected light sensor (e.g., TSL2561 via I2C). On other platforms, use device ambient light APIs where available
3. **Time-based schedule** (lowest priority): Configurable schedule (e.g., bright 7 AM–7 PM, dim otherwise) based on the display's physical location and local sunrise/sunset times

---

## 6. Alerting

### 6.1 Visual Alerts on Map
- Flash a pin or show a banner on the display when configured events trigger
- Alert types:
  - **Geofence enter/leave**: Alert when a tracked device/person enters or leaves a defined geographic zone
  - **Weather threshold**: Alert when weather at a pinned location exceeds configurable thresholds (e.g., temp > 100°F, severe storm warning)
  - **Device offline**: Alert when a tracked device stops reporting for a configurable period (e.g., no GPS update in 30 minutes)
- **Geofence definition**: Two methods available:
  - **Circle radius** (default): Define a radius around a pin (e.g., 1 mile around an office). Quick setup.
  - **Custom polygon**: Draw a polygon on the interactive map for complex areas (campuses, regions). Advanced option.
- Each alert type independently configurable per pin/device via admin panel
- Visual alerts: pin flashes, colored border pulse, or banner notification area on the display

### 6.2 Audio Alerts
- **Configurable** via admin panel: audio on/off toggle
- Short chime or tone when a visual alert fires
- Support for custom alert sounds uploaded via admin panel
- Mute button accessible from display or admin

---

## 7. Touch & Input

### 7.1 Touch Support
- When in interactive map mode, support touch gestures:
  - Pinch to zoom
  - Pan/drag to scroll
  - Tap a pin to show detail popup (local time, weather, status)
- **Auto-return**: After 60 seconds of inactivity, display automatically returns to the default passive view (full map, no zoom, no popups)
- Touch support useful for conference room displays and kiosks

### 7.2 Passive Display Mode
- Default mode: no touch input needed
- All configuration done via admin panel or remote control
- Display is view-only, auto-updating

---

## 8. Administration & Configuration

### 8.1 Admin Web Interface
- Accessible via browser on the local network or remotely (authenticated)
- Functions:
  - Add/edit/remove location pins
  - Configure location data sources and API credentials
  - Set display mode schedule and preferences
  - Switch between map themes (Classic, Modern, Dark)
  - Toggle scrolling vs. static map behavior
  - Switch between classic and interactive map modes
  - Configure which overlays are visible (per display or globally)
  - Configure flight tracking filters per display
  - Manage device registration via pairing codes
  - Set location history retention period
  - Configure weather API credentials
  - Configure alert rules (geofence, weather thresholds, device offline)
  - Upload custom alert sounds
  - Upload company logo and set custom title text
  - View system status and diagnostics

### 8.2 Configuration Storage
- Settings stored in SQLite database (MVP), migratable to PostgreSQL
- **Global + local model**: Global pin set visible on all displays, plus per-display local pins and display preferences
- Each display independently configurable for: map theme, map behavior (scrolling/static), visible overlays, flight filters, zoom/focus region, local pins, bright/dim schedule, alert rules
- Config changes applied in real-time without restart via WebSocket push

### 8.3 Authentication
- Username/password authentication for admin panel
- Role-based access: Admin (full control) vs. Viewer (display only)
- Default admin account created on first run, forced password change on first login

### 8.4 Device Registration
- **Pairing code flow**: Admin generates a pairing code in the admin panel. User enters the code on the display device to link it to the backend.
- Paired devices appear in admin panel for per-display configuration
- Devices authenticate subsequent connections with JWT tokens issued during pairing

---

## 9. Technical Requirements

### 9.1 Performance
- Smooth rendering at 30+ FPS on Raspberry Pi 4 (minimum target hardware)
- Terminator and sun position calculations updated at least once per minute
- Map and overlay rendering must not cause visible stutter or lag
- Memory usage under 512 MB on Pi

### 9.2 Reliability
- Application must run continuously 24/7 without memory leaks or crashes
- Auto-restart on crash (systemd on Pi, Windows service)
- Graceful handling of network outages (cached map data, queued location updates)
- Watchdog timer to detect and recover from hangs

### 9.3 Security
- **All client-backend communication encrypted**: HTTPS for REST, WSS for WebSocket
- **JWT bearer tokens** for device authentication and API access
- API keys rotatable from admin panel
- Location data encrypted at rest in the database
- Admin passwords hashed with bcrypt

### 9.4 Networking
- Location data fetched over HTTPS
- WebSocket (WSS) for real-time pin updates from the backend
- Offline mode: display continues with last-known data when network is unavailable
- Backend API rate limiting and caching for external data sources

### 9.5 Resolution Support
- **Primary target**: 1920x1080 (Full HD)
- Scale gracefully to 1280x720 (HD) and 3840x2160 (4K)
- Responsive layout that adapts to aspect ratio

### 9.6 Deployment
- Backend packaged as a Docker container for cloud-agnostic deployment
- Compatible with Azure App Service, AWS ECS/Lambda, or self-hosted Docker
- Hosting provider decision deferred to deployment time

### 9.7 Software Updates
- **Auto-update by default**: Displays check for updates automatically and apply during a configurable maintenance window (e.g., 3 AM local time)
- **Admin toggle**: Admin can switch to manual/approval-based updates from the admin panel
- **Force update**: Admin can trigger an immediate update to all or specific displays
- Update mechanism: display client polls backend for new version; backend serves the latest build artifacts

### 9.8 Internationalization (i18n)
- All UI text (display and admin panel) built with an i18n framework from the start
- Ship with **English** as the default and only language at launch
- Framework enables adding translations for additional languages without refactoring
- Date/time formatting respects locale settings

### 9.9 Default Content
- **First-run setup** offers selectable pin template sets:
  - "World Capitals" (~25 major capitals)
  - "US Major Cities"
  - "European Capitals"
  - "Start Blank"
- Templates pre-populate location pins with city name, coordinates, and time zone
- Admin can modify or remove any template pins after setup

---

## 10. Astronomical Calculations

All solar calculations must be accurate to within 1 minute of arc. Use established algorithms:

### Required Calculations
- **Solar declination**: Sun's north/south position (drives terminator shape)
- **Solar hour angle**: Sun's east/west position (drives terminator east/west position)
- **Equation of time**: Difference between apparent solar time and mean solar time
- **Sub-solar point**: Latitude and longitude where sun is directly overhead
- **Terminator curve**: Great circle boundary between day and night, projected onto Mercator
- **Twilight boundaries**: Civil (6° below horizon), nautical (12°), astronomical (18°)
- **Sunrise/sunset times**: Derivable from terminator position at any latitude

### Recommended Libraries / References
- NOAA Solar Calculator algorithms
- Jean Meeus, "Astronomical Algorithms" (standard reference)
- SunCalc.js (open-source JavaScript solar position library)

---

## 11. Data Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Display Clients                       │
│  (Pi / Windows)                                         │
│  - Renders map, terminator, pins, overlays              │
│  - All astro calculations run client-side               │
│  - Receives pin/config updates via WSS (encrypted)      │
│  - Caches data for offline resilience                   │
│  - Touch support with 60s auto-return                   │
└──────────────────────┬──────────────────────────────────┘
                       │ WSS / HTTPS (TLS encrypted)
┌──────────────────────▼──────────────────────────────────┐
│                 Backend API Server                       │
│  (Docker — Node.js + TypeScript + SQLite)               │
│  - Location data aggregation & history                  │
│  - Pin management (CRUD)                                │
│  - External API polling (GPS, Azure AD, Jira, weather)  │
│  - Admin auth (username/password, bcrypt)               │
│  - Device auth (JWT bearer tokens via pairing codes)    │
│  - Config storage (global + per-display)                │
│  - Alert engine (geofence, weather, device offline)     │
│  - Overlay data caching (weather, ISS, flights)         │
└──────────────────────┬──────────────────────────────────┘
                       │
    ┌──────────┬───────┼────────┬──────────────┐
    ▼          ▼       ▼        ▼              ▼
┌────────┐ ┌───────┐ ┌──────┐ ┌─────────┐ ┌──────────┐
│ GPS /  │ │ Azure │ │ Jira │ │ Weather │ │ ISS /    │
│ Webhook│ │ AD    │ │ SFDC │ │ API     │ │ Flight   │
│ API    │ │ Graph │ │ etc. │ │         │ │ APIs     │
└────────┘ └───────┘ └──────┘ └─────────┘ └──────────┘
```

---

## 12. Phased Delivery

### Phase 1A — Core Display (MVP)
- Geopolitical Mercator map (Natural Earth data) with day/night terminator
- Three selectable map color themes (Classic, Modern, Dark)
- Static + scrolling map behavior toggle
- Sun position indicator with analemma tracking
- Twilight bands (civil, nautical, astronomical)
- All 24 time zones displayed with current times
- UTC + local time readout
- Date display
- Bright / low-light mode with manual toggle
- Time-lapse / demo mode with adjustable speed
- Configurable branding (logo upload, custom title text)
- First-run pin template sets (World Capitals, US Cities, European Capitals, Blank)
- i18n framework in place (English only at launch)
- Runs in browser (Chromium on Pi, any browser on Windows)
- No backend required — standalone HTML/JS/Canvas app

### Phase 1B — Location Pins & Admin
- Backend API server (Node.js + TypeScript + SQLite, Docker container)
- Admin web interface with username/password auth
- Device registration via pairing codes
- Static location pins with local time display
- Global + per-display pin configuration
- WSS-based real-time updates to display clients (TLS encrypted)
- JWT authentication for all device/API communication
- Auto-dimming (time-based schedule + ambient sensor on Pi)
- Electron packaging for Windows

### Phase 1C — Dynamic Location Sources & Weather
- Webhook/REST API endpoint for GPS device location ingestion (JWT auth)
- Google Location Sharing / Life360 integration (configurable connectors)
- Azure AD / Microsoft Graph integration (configurable connector)
- Jira / Salesforce integration (configurable connectors)
- Weather data on pins (temperature °F/°C, conditions icon)
- Weather map overlay (cloud cover / precipitation)
- Pin clustering for dense areas
- Configurable location history retention + historical playback

### Phase 1D — Real-Time Overlays & Alerts
- ISS tracking overlay (real-time position + orbital path)
- Flight tracking overlay (configurable density, full filter system: airline, region, flight number)
- Overlay layer management and stacking controls
- Per-display overlay configuration
- Alert system: geofence enter/leave, weather thresholds, device offline detection
- Visual alerts on display (pin flash, banner)
- Configurable audio alerts (chime, custom sounds)

### Phase 1E — Interactive Map & Touch
- OpenStreetMap / Leaflet integration as alternative map mode
- Touch gestures: pinch zoom, pan, tap pin for details
- 60-second auto-return to passive view after inactivity
- Toggle between classic and interactive views
- All overlays compatible with both map modes

### Phase 2 — Roku
- Separate BrightScript + SceneGraph codebase
- Shares backend API with Phase 1 clients
- Roku Channel Store submission ($29 fee)
- Screensaver mode support via `RunScreenSaver()`
- Estimated separate effort: significant (full rewrite of rendering and UI in BrightScript)

---

## 13. Roku Channel Store Requirements (Phase 2 Reference)

For future planning:

| Item | Detail |
|------|--------|
| Language | BrightScript (proprietary, BASIC-like) |
| UI Framework | SceneGraph (XML-based) |
| Developer account | Free at developer.roku.com |
| Publishing fee | ~$29 one-time |
| Review timeline | ~5 business days |
| Resolution target | 1920x1080 (FHD), auto-scales to HD |
| Screensaver support | Native — `RunScreenSaver()` entry point |
| Always-on | `UpdateLastKeyPressTime()` API |
| Web tech support | None — no HTML/JS/CSS runtime |
| Shared code with web app | Backend API only — all UI/rendering rewritten |

---

## 14. External API Dependencies

| API | Purpose | Cost | Phase |
|-----|---------|------|-------|
| Natural Earth | Base map data | Free (public domain) | 1A |
| OpenStreetMap | Interactive map tiles | Free (with attribution) | 1E |
| OpenWeatherMap (default) | Weather on pins + overlay | Free tier: 1,000 calls/day; paid plans available. Pluggable — swappable to Open-Meteo, Tomorrow.io, etc. | 1C |
| Microsoft Graph | Azure AD user locations | Free with Azure AD tenant | 1C |
| Open Notify / CelesTrak | ISS position + TLE data | Free | 1D |
| OpenSky Network (default) | Flight tracking | Free tier: 4,000 req/day registered. Pluggable — swappable to ADS-B Exchange, FlightAware, etc. | 1D |
| Google Location Sharing | GPS device locations | Free (API access) | 1C |
| Life360 | GPS device locations | API access varies | 1C |

---

## 15. Resolved Decisions

All major product decisions have been made. This section documents key choices for reference.

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Product name | ZuluGrid | Low trademark risk. "Zulu" = UTC in NATO. Enterprise/ops resonance. |
| Map style | Geopolitical (3 themes) | Classic, Modern, Dark — all selectable per display |
| Map behavior | Static + scrolling toggle | Default static; classic Geochron scrolling mode available |
| Map rendering | Hybrid | Pre-rendered base images per theme + dynamic overlays at runtime |
| Backend stack | Node.js + TS + SQLite | Same language as frontend. SQLite for MVP, migratable to PostgreSQL |
| Database | SQLite (MVP) | Zero-config, file-based. Upgrade path to PostgreSQL documented |
| Device registration | Pairing codes | Admin generates code, user enters on display to link |
| API authentication | JWT bearer tokens | All device and API communication authenticated |
| Encryption | TLS everywhere | HTTPS + WSS. No unencrypted channels |
| Temperature units | °F default | Switchable to °C in settings |
| Flight filtering | Full system | By airline, region, and flight number. Configurable per display |
| Flight density | Configurable per display | Light/medium/dense options. Default: medium |
| Multi-display config | Global + local | Global pins on all displays + per-display local pins and preferences |
| Location history | Configurable retention | Admin sets 1–90 days. Auto-purge. Historical playback |
| Integrations | Generic connectors | All built as configurable plug-ins, enabled when credentials available |
| Alerts | Visual on map | Geofence, weather threshold, device offline. Configurable per pin |
| Audio | Configurable | On/off toggle. Custom sounds uploadable |
| Touch | Yes, with auto-return | Pinch, pan, tap in interactive mode. 60s auto-return to passive |
| Branding | Configurable | Logo upload + custom title, both optional |
| Hosting | Docker, decide later | Cloud-agnostic container. Azure, AWS, or self-hosted |
| Fire TV | Deferred | Focus on Pi + Windows first |
| Companion app | Deferred indefinitely | GPS tracking handled via existing services or webhook integrations |
| GPS privacy | Consent built into app | Opt-in flow in companion app + webhook registration. Privacy policy template shipped with project. Each deploying org responsible for legal review. |
| Weather API | Pluggable provider | Abstract behind interface. Ship with OpenWeatherMap as default. Swappable to Open-Meteo, Tomorrow.io, or Visual Crossing via config. |
| Flight API | Pluggable provider | Abstract behind interface. Ship with OpenSky Network as default. Swappable to FlightAware, ADS-B Exchange, or Flightradar24 via config. |
| Geofence shapes | Circle + polygon | Circle radius as default (quick setup), custom polygons for advanced use cases. |
| Demo mode | Yes, adjustable speed | Time-lapse through a full year. Speed: 1 hr/sec, 1 day/sec, or custom slider. |
| Software updates | Auto + admin control | Auto-update by default during maintenance window. Admin can switch to manual or force immediate update. |
| Default pins | Template sets | First-run offers "World Capitals", "US Major Cities", "European Capitals", or "Start Blank". |
| Localization | i18n from day one | Built with i18n framework. Ship English only, translations addable without refactoring. |

---

## 16. Future Considerations (Not In Scope)

These items are not planned for any current phase but may be revisited later.

- **Companion Mobile App**: React Native GPS reporting app (iOS + Android). Would report device location to the webhook API. Deferred indefinitely — GPS tracking can be handled via existing services (Life360, Google Location Sharing) or direct webhook integrations from MDM tools.
- **Amazon Fire TV / Fire Stick**: HTML5 hybrid app via Cordova + Amazon WebView. Deferred until Pi and Windows are stable.

---

## 17. No Open Questions

All product decisions have been resolved. This PRD is build-ready.
