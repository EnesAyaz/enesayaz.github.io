# Animation style guide

Rules for the interactive animations on this site. Every new animation follows them, and every existing one is
checked against them. The goal: each animation should look like a figure from a good textbook or a well-made lab
slide, drawn by someone who knows the physics. It should never look generated or decorative.

The guide is not published on the site (`docs/` is excluded from the build).

## 1. What an animation is for

- **One idea per animation.** If the idea does not fit in one sentence, it is two animations.
- **The reader must be able to break it.** Every animation has at least one control that changes the physics, not
  just the speed. Good controls lead to a surprise: an unbalanced current that turns a circle into an ellipse, a load
  step that loses synchronism.
- **No animation without a model.** Every moving thing comes from an equation that is written on the page. If a
  quantity is only illustrative, the page says so.

## 2. Physics and honesty

- Conventions follow the Manim scenes in `ManimAnimationPE/README.md`:
  phase axes a, b, c at 0°, 120°, 240° counterclockwise; currents are cos(θ − axis); positive current is a dot
  (out of the screen) on the positive conductor side and a cross on the other; the rotor d-axis follows the
  excitation flux and q leads d by 90°; the amplitude-invariant Park transform; p is the number of pole pairs.
- **Per-unit or stated units.** Every axis and readout has a unit or says "pu". No unlabelled numbers.
- **Sensible precision.** Two or three significant digits. Angles in whole degrees.
- **Check against a known result** before publishing (a textbook formula, a limit case, power balance) and note the
  check in the commit message.
- **Name the simplifications** in a short "Model" section: ideal windings, no saturation, sinusoidal distribution,
  lossless, normalized time, and so on.
- **Time scale is explicit.** If the motion is slowed down, the page says by how much.

## 3. Visual language

### Colour

Colour carries meaning, never decoration. The same quantity has the same colour on every page.

| Use | Colour | Hex |
| :-- | :-- | :-- |
| Phase a | red | `#d1495b` |
| Phase b | teal | `#2a9d8f` |
| Phase c | violet | `#8067d9` |
| Stator, primary side, high frequency, voltage | blue | `#2f7fd8` |
| Rotor, field, excitation, the quantity you control | orange | `#e07b1a` |
| Ink (text, main lines) | theme text colour | `currentColor` |
| Secondary lines, grid, iron outlines | `--anim-soft` | `#8a949c` / `#7d868d` dark |
| Iron, filled areas | `--anim-face` | `#e8ecef` / `#2c2f33` dark |

- At most **five colours in one panel**, including ink and grey.
- Colours come from these variables only. No new colours without adding them to this table.
- Both light and dark themes must work. Check every animation in both.
- Colour is never the only carrier of meaning: phases also have a, b, c labels, vectors have names.

### Lines and shapes

- Flat 2D, like a printed figure. **No gradients, glows, shadows, 3D effects, blur or textures.**
- Line widths: 1–1.4 px for grid and outlines, 1.8–2.6 px for signals, 3–4 px for the one vector that matters most.
- Iron is a flat grey fill with a thin outline. Windings are circles with a dot or cross. Arrows have solid
  triangular heads.
- Dashed lines only for references, limits and flux paths.
- Opacity is used for one thing only: showing magnitude (a weak current is a faint conductor).

### Text

- The theme font only. Canvas labels 12–14 px; panel titles 13.5 px semibold.
- **Sentence case** for titles and labels ("Stator current vector", not "Stator Current Vector").
- Symbols as on paper: i<sub>d</sub>, ψ<sub>f</sub>, δ, θ<sub>e</sub>. Use subscripts in canvas with a smaller
  font, not underscores.
- No exclamation marks, no emoji, no marketing words ("powerful", "stunning", "explore the magic").
- Labels sit next to the thing they name, never in a legend box if a direct label fits.

### Layout

- Main picture left, controls right on wide screens; stacked on phones. Plots below, two or three per row.
- Every panel has a short title in the top-left corner.
- Nothing overflows on a 375 px wide screen. Wide schematics scroll inside their own box.
- White space instead of borders. No cards inside cards.

## 4. Motion and interaction

- **Motion shows physics, not decoration.** Nothing moves unless the quantity it shows changes in time.
- Calm speeds: one electrical period takes 3–8 seconds on screen.
- Start playing, except when the visitor has asked for reduced motion: then start paused with a Play button.
- Pause when the animation is off-screen.
- **Direct manipulation first.** If the reader can drag the vector, they should not need a slider for it.
- At most **five controls** visible at once. Each control has a label, a value with unit, and a default that gives
  the textbook case.
- Every interactive animation has a **Reset** button.
- Changes take effect immediately. No "Apply" buttons, no spinners.

## 5. Page text

Each animation page has, in this order:

1. **One paragraph** saying what the reader sees and what to do first. Bold the first action ("**Drag the vector**").
2. The animation.
3. **Things to try**: three or four items, each a concrete action and what to notice. Short.
4. **Model**: the equations behind it, the simplifications and the time scale.
5. **Related papers**, when there are any.

Plain language, short sentences, no filler. The same voice as the rest of the site.

## 6. Accessibility

- Every canvas has an `aria-label` that describes the picture.
- Every control is a real `button` or `input` with a label, reachable by keyboard.
- Contrast: text and signals readable on both themes.
- The animation and its page work without hover.

## 7. Code

- Shared drawing and controls live in `assets/js/animations/core.js` (`PEAnim`). Animation files only hold the model
  and the drawing.
- One file per animation in `assets/js/animations/`, one page in `_animations/`.
- The model is a small object with `step(dt)`; drawing never changes the model.
- No external libraries. Each animation stays under about 15 KB.
- Each animation needs a small thumbnail view (`data-view`) for the cards.

## 8. Checklist before publishing

- [ ] One idea, stated in one sentence
- [ ] At least one control that changes the physics, and a Reset button
- [ ] Equations on the page match the code
- [ ] Checked against a known result
- [ ] Colours from the table only, five or fewer per panel
- [ ] Light and dark theme checked
- [ ] Phone width checked, nothing overflows
- [ ] Reduced motion starts paused
- [ ] No gradients, shadows, glows, emoji or marketing words
- [ ] All labels in sentence case with units
