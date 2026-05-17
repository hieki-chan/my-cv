# Kieu Minh Hieu

Unity developer focused on gameplay systems, clean UI flows, and practical tools that help small teams move faster.

This portfolio page is intentionally longer than the final content should be. It is a test bed for scroll pacing, reveal timing, markdown rendering, and the feeling of moving through a site that has actual rhythm instead of just stacked cards.

## Selected Work

### Personal Website

Personal website with a custom PDF surface, markdown portfolio page, RSS feed, animated visual identity, and a portfolio page designed to feel more like an interactive title site than a static resume.

- React and Vite frontend
- PDF rendering with `pdfjs-dist`
- Motion-powered entrance animation
- Markdown content loading from `public/portfolio.md`
- RSS feed for updates
- Responsive layout for desktop and mobile

### Gameplay Systems

Production-oriented Unity work across player controls, UI, data-driven configuration, and iteration tooling.

- C# gameplay architecture
- Scene and prefab workflow cleanup
- Lightweight editor utilities for repeatable tasks
- Clear boundaries between input, state, presentation, and content data

### UI and Player Flow

Menus and HUDs are not just screens. They are repeated actions, feedback loops, and small moments where the player either feels oriented or slowly gets tired.

- Inventory and detail panels
- Start, pause, settings, and result flows
- State-safe navigation
- Readable visual hierarchy for action-heavy moments

## Systems Notes

The best systems are boring in the right places. They make common actions predictable, make edge cases visible, and make future changes less scary.

> A good Unity feature should survive the second version of the idea, not only the first demo.

I usually start by naming the player-facing promise. After that, I map the smallest working loop, identify which states can overlap, and keep the data shape plain enough that designers or future-me can read it without a detective board.

### A Typical Feature Loop

1. Define the player action.
2. Build the smallest playable prototype.
3. Separate state from presentation.
4. Add readable debug output.
5. Polish feedback after behavior is stable.
6. Write the setup notes before the details fade from memory.

## Implementation Taste

I like systems that are practical, local, and honest about their constraints. A feature does not need a grand abstraction on day one, but it should leave enough structure for day two.

```ts
type FeatureShape = {
  playerPromise: string;
  stateBoundary: string;
  repeatedAction: string;
  debugSurface: string;
};
```

The point is not the exact type. The point is thinking in boundaries before the project turns into a pile of special cases.

## Production Habits

- Keep prefabs tidy enough that a teammate can scan them.
- Prefer data tables or config assets when tuning is expected.
- Avoid hiding important state changes inside visual-only scripts.
- Leave small notes where setup order matters.
- Test the repeated path, not just the happy path.

### What I Watch For

I pay attention to animation timing, UI density, input buffering, naming, and the tiny friction that appears when a player repeats an action fifty times.

I also care about the human side of development: how easy it is to review a change, how fast someone can understand a scene, and whether a system invites careful iteration instead of panic edits.

## Frontend Work

This website is also a playground for motion direction. The current version uses a dark visual language, hard cuts, grid masks, and scroll reveals inspired by animated media sites while keeping the implementation manageable inside a small Vite app.

### Motion Goals

- Make section changes feel intentional.
- Avoid motion that changes layout after it finishes.
- Use reveal timing to guide attention.
- Keep the content readable after the visual moment passes.

## Contact

Use the CV section for the latest PDF versions, or subscribe to the [RSS feed](/rss.xml) for portfolio updates.

## Extra Test Content

This paragraph is here so the markdown panel has enough weight for scroll testing. The final page can be much shorter, but a longer draft exposes awkward spacing, reveal timing problems, mobile overflow, and whether headings still feel good when there is a lot of content.

### More Notes

Readable interfaces usually come from subtraction. The hard part is deciding what deserves to remain visible and what should wait until the player asks for it.

### More Systems

When a gameplay system becomes complicated, I try to make the invisible parts inspectable. Debug labels, predictable events, and small test scenes save more time than they cost.

### More Polish

Polish is timing, feedback, contrast, and restraint. It is also knowing when a feature needs a sharper sound, a faster transition, or simply fewer competing elements on screen.
