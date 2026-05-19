# ORDINARY TECHNOLOGY

> **A next-generation, immersive web experience built as a fully operational sci-fi operating system ("Tentacle OS") — blending real-time 3D graphics, procedural shaders, generative audio, AI entities, and interactive games into a single monolithic HTML portal.**

[![Status](https://img.shields.io/badge/STATUS-ONLINE-00ffaa?style=for-the-badge)](#)
[![Engine](https://img.shields.io/badge/ENGINE-Three.js_r128%2Fr160-ff6b3f?style=for-the-badge)](#)
[![Audio](https://img.shields.io/badge/AUDIO-Tone.js-E89B6A?style=for-the-badge)](#)
[![AI](https://img.shields.io/badge/AI-YUKA.js-0088ff?style=for-the-badge)](#)
[![Deploy](https://img.shields.io/badge/DEPLOY-GitHub_Pages-333?style=for-the-badge)](#)

---

## 🏗️ Architecture Overview

ORDINARY TECHNOLOGY is a **single-page monolithic web application** (~315KB of HTML alone, ~9,450 lines) that functions as an art-meets-technology portal. It is structured as a simulated operating system called **Tentacle OS v2.0**, complete with a boot sequence, desktop environment, taskbar, start menu, and multiple embedded applications.

```
┌──────────────────────────────────────────────────────────────┐
│                    INTRO LOADER (Three.js)                    │
│         Voxel tree wither → PS2-style boot sequence          │
├──────────────────────────────────────────────────────────────┤
│                    TENTACLE OS v2.0                           │
│  ┌────────────┬─────────────────────────┬──────────────┐     │
│  │  HARDPOINT  │    TERMINAL FRAME       │  SIDEBAR AD  │     │
│  │  (Sidebar)  │  ┌───────────────────┐  │  (HANTU RAYA │     │
│  │  Navigation │  │   OS DESKTOP      │  │  Mini Truck) │     │
│  │  + HUD Data │  │  ┌──────────────┐ │  │              │     │
│  │             │  │  │ SDF SHADER   │ │  │              │     │
│  │             │  │  │ HEADER       │ │  │              │     │
│  │             │  │  ├──────────────┤ │  │              │     │
│  │             │  │  │ DESKTOP ICONS│ │  │              │     │
│  │             │  │  │ TOOL WINDOWS │ │  │              │     │
│  │             │  │  │ OS CONSOLE   │ │  │              │     │
│  │             │  │  │ NET GRAPH    │ │  │              │     │
│  │             │  │  └──────────────┘ │  │              │     │
│  │             │  │   TASKBAR + START │  │              │     │
│  │             │  └───────────────────┘  │              │     │
│  └────────────┴─────────────────────────┴──────────────┘     │
├──────────────────────────────────────────────────────────────┤
│              SCROLLABLE CONTENT SECTIONS                     │
│  • Interactive Showcase (News Cards)                         │
│  • Data Stream Archives (Tech Articles)                      │
│  • Sandstorm Particle System (WebGL)                         │
│  • Ordinary Recycling Game (iframe)                          │
│  • Neural Breach Game (Canvas 2D)                            │
│  • Transmission Hub (YouTube + SoundCloud embeds)            │
│  • Shader Playground (CodePen embeds)                        │
│  • Neural Hub 2026 (AI Tool Directory)                       │
│  • Aerospace Launchpad (Project Cards)                       │
├──────────────────────────────────────────────────────────────┤
│              OVERLAY SYSTEMS                                 │
│  • Procedural Entity Organisms (Canvas 2D)                   │
│  • Spatial Web (Three.js r160 Module)                        │
│  • Floating Particles (DOM)                                  │
│  • Mouse Light Follower                                      │
│  • Command Panel (Dev Tools)                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Core Runtime

| Technology | Version | Purpose |
|---|---|---|
| **Three.js** | r128 (global) + r160 (ESM) | 3D rendering engine — intro sequence, spatial web, shaders, sandstorm |
| **Tone.js** | 14.7.77 | Generative audio synthesis and music playback |
| **YUKA.js** | 0.7.2 | AI steering behaviors and entity intelligence |
| **TailwindCSS** | CDN (latest) | Utility-first CSS framework |
| **Web Audio API** | Native | Procedural sound effects (crumble, engine, haptic feedback) |
| **WebGL / GLSL** | Native | Custom fragment/vertex shaders (SDF raymarching) |
| **ES Modules** | Native | Module system for spatial-web.js and tentacle systems |

### Font & Design System

| Asset | Source |
|---|---|
| **Space Grotesk** (300/400/600) | Google Fonts — primary UI typeface |
| **Share Tech Mono** | Google Fonts — console/terminal typeface |
| **Oxanium** | Google Fonts — announcement banner |

### CSS Design Tokens

```css
--primary:     #D16847   /* Burnt Orange */
--secondary:   #E89B6A   /* Copper Orange */
--tertiary:    #FF6B3F   /* Hot Ember */
--background:  #050511   /* Deep Space Black */
--s2-neon:     #ff2020   /* HANTU RAYA Red */
```

The design system uses **glassmorphism** (`backdrop-filter: blur()`) extensively, with CSS custom properties for consistent theming across all components.

---

## 🎮 Interactive Systems

### 1. PS2 Voxel Wither Intro Sequence
A cinematic loading screen that uses **Three.js InstancedMesh** to render a voxel tree on a floating island in space. After a 3-second countdown, the tree "rots" — voxels fall with physics simulation, crumble sounds play via Web Audio API, and asteroids orbit in the background. Transitions into `intromessage.html` iframe, then fades to main site.

**Key Tech:** InstancedMesh rendering, procedural audio synthesis, asteroid orbiting, steam particle emission, exponential fog.

### 2. Tentacle OS Desktop Environment
A fully simulated OS with:
- **Boot Sequence** — animated terminal text during startup
- **Desktop Icons** — launch games, 3D spatial web, AI engine, legacy apps
- **Start Menu** — with categorized tool access
- **Taskbar** — real-time clock, quick-launch buttons
- **Right-Click Context Menu** — refresh, toggle narration, system info
- **Toast Notifications** — info/warn/error states with animations
- **Draggable Window Management** — via mouse event listeners

### 3. SDF Raymarching Shader Header
The OS header bar runs a **real-time GLSL raymarching shader** that cycles through 4 procedural scenes every 8 seconds with smooth blending transitions:

| Scene | Description |
|---|---|
| **Backrooms** | Infinite corridor with flickering fluorescent lights, mold growth, VHS post-processing |
| **Cyber Tunnel** | Rotating hexagonal tunnel with neon wireframe, scanlines |
| **Meat Matrix** | Organic cave with pulsing veins, wet specularity, flesh-colored lighting |
| **Fractal Glass** | Iterated fractal geometry with Fresnel reflections, chromatic aberration |

Each scene uses custom SDF primitives (`sdBox`, `sdSphere`), smooth-minimum blending (`smin`), and per-scene post-processing (VHS noise, scanlines, film grain).

### 4. Spatial Web (Three.js r160 ES Module)
An importable 3D environment (`spatial-web.js`, 33KB) providing:
- Full 3D scene with orbit controls
- YUKA.js-powered AI entity behaviors
- Tentacle orb system (GPU-animated vertex shaders)
- Post-processing pipeline (Unreal Bloom)
- Warp transition effects

### 5. Sandstorm Particle System
A **WebGL particle system** rendering 2,000 sand particles with:
- Wind dynamics driven by sinusoidal displacement
- Sand-colored palette from CSS custom properties
- Procedural noise texture overlay
- Contained within the `#particles` DOM element

### 6. Matrix Rain Shader
A toggleable full-screen WebGL overlay implementing a falling "Matrix rain" effect with:
- Column-based random speeds and offsets
- Tail fade with configurable length
- Bright head particles
- Color matched to the site's burnt orange palette (#D16847)

### 7. Neural Breach Game
A canvas-based puzzle/strategy game embedded in the page with:
- Game status bar (level, score, time)
- SVG game board with interactive nodes
- Ability system (Reveal, Boost, Breach)
- Start/restart overlay with game messages

### 8. Ordinary Recycling Game
An embedded iframe game (`ordinary-recycling/index.html`) — a drag-and-drop recycling training simulator.

---

## 🔧 Built-in OS Tools

The Tentacle OS taskbar and start menu provide access to these floating tool windows:

| Tool | ID | Description |
|---|---|---|
| **SYS_CLOCK** | `os-clock-tool` | Real-time digital clock with date display |
| **SECURE_NOTEPAD** | `os-notepad-tool` | Text editor with auto-save to `localStorage` |
| **COLOR_SPECTRUM** | `os-colorpick-tool` | Color picker showing HEX/RGB/HSL values |
| **ENTROPY_DICE** | `os-dice-tool` | D6/D8/D12/D20/D100 random dice with history |
| **MISSION_TIMER** | `os-timer-tool` | Countdown timer with start/stop/reset |
| **BASE64_ENCODER** | `os-base64-tool` | Encode/decode Base64 strings |
| **NET_ORIGIN** | `os-ip-tool` | Network trace display |
| **ARIA_COMM** | `os-chat-tool` | AI chat interface with "Aria" persona |
| **ATMO_SCAN** | `os-weather-tool` | Weather lookup by city name |
| **QUANTUM_CALC** | `os-calc-tool` | Calculator with grid layout |
| **FILE_SYS** | `os-files-tool` | Virtual file browser with directory navigation |

---

## 💻 Console Command System

Two independent console systems exist:

### Tentacle OS Console (`root@tentacle:~#`)
Internal OS terminal with commands: `help`, `ls`, `nav`, `theme`, `clear`, `date`, `whoami`, `echo`, `scan`, `matrix`, `sysinfo`, `shader`, plus **18 Easter Egg commands** (`ali3n`, `zombie1`, `valve2`, etc.) that navigate to hidden pages.

### Global Console (Bottom of Page)
Site-wide command line supporting navigation, theme switching, shader directives, and command history with arrow-key navigation.

---

## 🎵 Audio Systems

| System | Source | Description |
|---|---|---|
| **Background Music** | `bg.mp3` | Looping ambient music, triggered on first user click |
| **Warp Sound** | `warp_sound.mp3` | Plays during page transitions |
| **Procedural Crumble** | Web Audio API | Bandpass-filtered noise bursts during voxel wither |
| **Engine Hum** | Web Audio API | Square wave oscillator (35Hz) during intro |
| **Narrator (Aria)** | `narrator.js` | Text-to-speech narration system for UI actions |
| **Generative Music** | SoundCloud embed | Creator's generative music streams |

---

## 🧬 Entity & Organism System

A modular procedural entity system with dedicated rendering:

| Module | File | Purpose |
|---|---|---|
| **Entity Manager** | `entity.js` (26KB) | Core entity lifecycle, spawning, state management |
| **Entity Renderer** | `entity-renderer.js` (24KB) | Canvas 2D rendering pipeline with procedural visuals |
| **Entity Behaviors** | `entity-behaviors.js` (14KB) | AI behaviors: flocking, hunting, evasion, territorial |
| **Entity Abilities** | `entity-abilities.js` (12KB) | Special abilities: teleport, phase, split, merge |
| **Entity Voice** | `entity-voice.js` (8KB) | Sonic identity and audio feedback |
| **Entity Rescue** | `entity-rescue.js` (3KB) | Recovery and error handling |
| **Procedural Textures** | `procedural-textures.js` (7KB) | Runtime texture generation |
| **HGT-25 (Void Symbiote)** | `hgt25.js` (21KB) | Special entity with unique behaviors |

---

## 📂 Project Structure

```
ORDINARY-TECHNOLOGY/
├── index.html              # Main application (~315KB, monolithic)
├── spatial-web.js          # 3D spatial web environment (ES Module)
├── tentacle1.js            # Tentacle OS logic (ES Module)
├── tentacle_orb.js         # GPU-animated tentacle orb system
├── tentacle_orb_three.js   # Three.js tentacle orb integration
├── shader.js               # Background WebGL shader system
├── shader2.js              # Secondary shader effects
├── banner.js               # Announcement banner logic
├── narrator.js             # Aria voice narration system
├── effects.js              # Visual effects library
├── ordinary.js             # Core utility functions
├── script.js               # Legacy script utilities
├── entity*.js              # Entity/organism system (6 files)
├── hgt25.js                # Void Symbiote entity
├── procedural-textures.js  # Runtime texture generation
├── translator.js           # Localization system
├── typing.js               # Typing animation effects
├── cli.js                  # CLI utilities
├── background.js           # Background effects
├── mental.js               # Mental model system
│
├── style.css               # Core stylesheet
├── styles2.css             # Secondary styles
├── style3.css              # Tertiary styles
├── Wild.css                # Wild card styles
│
├── about.html              # About page
├── ai.html                 # AI / Reality Engine page
├── game.html               # Main game page
├── settings.html           # GPU Calibration / shader config
├── forum.html              # Weapon Lab page
├── videoPlayer.html        # Video player interface
├── liquidMusic.html        # Music player interface
├── dimension888.html       # Dimension 888 portal
├── hgt109.html             # HGT-109 project page
├── intromessage.html       # Intro message overlay
├── microlife.html          # Microlife bio-simulation
├── piano.html              # Piano application
├── void-awakening.html     # 2D action platformer game
├── stick-odyssey-apex.html # Neon platformer game
├── parasite.html           # Parasite experience
├── tentacle-terminal.html  # Standalone terminal interface
├── ohayou.html             # Easter egg overlay
├── entity-debug.html       # Entity system debugger
├── easteregg.html          # Easter egg page
├── egg[1-9].html           # Hidden easter egg pages
│
├── aerospace-piano/        # Haptic piano web app
├── beta1/                  # Project Escapism beta
├── celeritas 2/            # Celeritas project
├── micro-ascension/        # Micro Ascension game
├── micro-life-iso/         # Isometric micro-life sim
├── ordinary-recycling/     # Recycling training game
├── superguides/            # Guide documents
├── warzone-survivor/       # Warzone Survivor game
│
├── assets/                 # Images and media assets
├── textures/               # Texture files
├── videos/                 # Video content
├── js/                     # Additional JavaScript modules
│
├── *.mp3                   # Audio files (bg music, SFX, warp sounds)
├── *.glb                   # 3D model files (cursor, map)
├── *.jpg / *.png           # Image assets (adverts, thumbnails, news)
└── .env                    # Environment configuration
```

---

## 🎨 Visual Effects Pipeline

| Effect | Implementation | Performance |
|---|---|---|
| **Glassmorphism** | `backdrop-filter: blur(16px)` | GPU-accelerated |
| **Scroll Reveal** | IntersectionObserver API | Lazy, threshold-based |
| **Parallax Scrolling** | `scroll` event + `translateY` | Lightweight |
| **Glitch Text** | CSS `clip-path` + pseudo-elements | Zero JS cost |
| **Mouse Light** | Fixed radial gradient div following cursor | `mix-blend-mode: screen` |
| **Noise Overlay** | Base64-encoded PNG tiled at 2% opacity | Static, no repaint |
| **Floating Particles** | Absolute-positioned DOM divs | `will-change: transform` |
| **Warp Distortion** | CSS radial gradient + `scale()` animation | Keyframe-based |
| **Breathing Container** | CSS `scale(1) → scale(1.03)` | 6s infinite loop |
| **Binary Rain BG** | CSS `::before` content + `translateY` animation | Pure CSS |
| **Quantum Tab Engine** | Dynamic `document.title` + SVG favicon cycling | JS interval-based |
| **Reality Distortion** | Full-page RGB split, kaleidoscope, shake, invert | Toggleable chaos mode |
| **Matrix Rain** | Full-screen WebGL ShaderMaterial | GPU fragment shader |

---

## 🌐 Deployment

- **Hosted on:** GitHub Pages
- **URL:** `https://partlydecent.github.io/ORDINARY-TECHNOLOGY/`
- **SEO:** Full Open Graph + Twitter Card meta tags
- **Theme Color:** `#D16847`
- **No build step required** — pure HTML/CSS/JS served statically

---

## 🚀 Sub-Projects & Games

| Project | Type | Description |
|---|---|---|
| **Void Awakening** | 2D Platformer | Cyberpunk action game with physics-based gunplay |
| **Stick Odyssey: Apex** | 2D Platformer | Neon wall-jumping/dashing game with boss fight |
| **Project Escapism** | Isometric Survival | Procedural environment, viral threats, escape mechanics |
| **Ordinary Recycling** | Educational Game | Drag-and-drop recycling simulator |
| **Aerospace Piano** | Music App | Haptic feedback piano with aerospace theming |
| **Dimension 888** | Portal | Dimensional exploration experience |
| **Microlife** | Bio-Simulation | Digital petri dish with evolution/mutation |
| **Micro Ascension** | Game | Micro-scale ascension gameplay |
| **Warzone Survivor** | Game | Survival-themed experience |
| **Celeritas 2** | Project | Speed/light-themed project |
| **Neural Breach** | Puzzle Game | In-page canvas-based node puzzle |
| **Liquid Music** | Audio Player | Frequency-based music interface |

---

## 📡 External Integrations

| Service | Usage |
|---|---|
| **YouTube** | Embedded video player (SpaceX, tech content) |
| **SoundCloud** | Embedded audio streaming |
| **CodePen** | 8 embedded WebGL shader demonstrations |
| **eBay** | Store link (`ordinarytechnology`) |
| **Google Fonts** | Typography (Space Grotesk, Share Tech Mono, Oxanium) |
| **unpkg CDN** | Three.js r160, YUKA.js module delivery |
| **cdnjs** | Three.js r128, Tone.js delivery |

---

## 🧠 AI & Neural Hub Directory

The site includes a curated directory of AI tools organized by category:

- **AGI & Conversational** — ChatGPT, Claude, Gemini, DeepSeek, Llama, Groq
- **Generative Media** — Midjourney, Runway, FLUX, Haiper, Suno, Leonardo
- **Autonomous Coding** — Cursor, Codeium, Devin, Copilot, Qwen
- **Utilities & Workspace** — Perplexity, Notion AI, Gamma, ElevenLabs, Descript

---

## 📰 Data Archives / Content

The site functions as a tech news aggregator with articles covering:
- NVIDIA DLSS 5 (Generative Reconstruction)
- Unreal Engine 5.8 (Adaptive Topology / Nanite)
- All-Solid-State Batteries (BYD/MG SolidCore)
- F1 2026 Regulation Changes
- Quantum Error Correction (Harvard-MIT)
- Quantum Internet Prototype (Heriot-Watt)
- Cellular Aging Reversal (CRISPR)
- Quantum Entanglement Communication (CERN)
- Project Aquarium: Cross-Lingual AI Agents (DeepMind)
- Autonomous Vehicle Legislation (AB 1777)
- Artemis Program Lunar Operations

---

## ⚡ Key Technical Highlights

1. **Dual Three.js Strategy** — Uses r128 via global `<script>` for the intro sequence AND r160 via ES Module `importmap` for the spatial web, avoiding conflicts through scoped initialization.

2. **Inline GLSL Raymarcher** — A full SDF raymarching engine runs inside an inline `<script>` tag with 4 blended scenes, each with unique geometry, lighting, and post-processing.

3. **Web Audio API Synthesis** — Procedural sound generation (crumble effects, engine hum) without any audio file dependencies.

4. **Quantum Tab Engine** — A custom `QuantumTabEngine` class that continuously mutates the browser tab title and favicon through multiple "phases" with probabilistic state mutations and quantum superposition effects.

5. **Zero-Build Deployment** — The entire application runs without bundlers, transpilers, or package managers. Pure HTML/CSS/JS served from GitHub Pages.

6. **Modular Entity AI** — The organism system uses Reynolds' boids algorithm, personality-driven behaviors, and cooldown-managed special abilities, all rendered on a dedicated `<canvas>` overlay.

---

## 📜 License

This project is maintained by **@partlydecent** (Damion Richter). See the repository for licensing details.

---

*Built with obsession. Powered by WebGL. Deployed to the void.*
