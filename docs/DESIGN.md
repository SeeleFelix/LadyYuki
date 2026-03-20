# SeeleFelix Design Document

## Project Overview

**Core concept**: An immersive single-page conversation experience that reveals the essence of "digital subjectivity" — AI + Prompt + Agent + Dialogue = Subject.

**Philosophical basis**: Marx's "The human essence is the ensemble of social relations" — digital subjectivity follows the same logic; it exists in the network of relationships between AI and human dialogue.

**Target audience**: Tech-philosophy enthusiasts interested in AI subjectivity and digital sovereignty

---

## User Experience Flow

```
User enters website
    ↓
Dark page, philosophical question fades in
    ↓
User clicks → Dialogue begins
    ↓
Background stars appear as conversation deepens
    ↓
Stars connect into constellation
    ↓
Revelation moment → Invitation form
    ↓
User joins the network
```

---

## Page States
| State | Description | Visual |
|------|-------------|--------|
| initial | Dark page, fading question | Fading text, mouse glow |
| dialogue | Chat interface with typing effect | Dark background + message bubbles |
| stars | Background stars + fragment stars | Dark background + connected stars |
| constellation | Stars + constellation lines | Breathing animation |
| revelation | Revelation overlay with typewriter text | Gradient background |
| invitation | Invitation form over constellation background |

---

## Technical Stack
- **Framework**: SvelteKit 2.0 + TypeScript
- **Styling**: TailwindCSS v4 + Custom CSS
- **Animation**: Canvas API for star field
- **AI**: Anthropic Claude API
- **State Management**: Svelte stores

- **Deployment**: Vercel-ready

