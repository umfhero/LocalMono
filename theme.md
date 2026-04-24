# Design System: Terminal-Flat

This design system prioritises high-density information, strict alignment, and a "mechanical" utility feel, drawing inspiration from VS Code and professional IDEs rather than traditional consumer SaaS apps.

---

## 1. Core Colour Palette (The "Industrial" Scheme)
The focus is on low-contrast backgrounds to reduce eye strain, with high-contrast functional highlights for utility.

| Element | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Crust** | `#161616` | Main app background & sidebar |
| **Mantle** | `#1C1C1C` | Dashboard cards & God File blocks |
| **Border** | `#333333` | 1px flat borders (no shadows) |
| **Text (Primary)** | `#E0E0E0` | Main content readability |
| **Text (Muted)** | `#858585` | Metadata & labels |
| **Accent** | `#007ACC` | IDE-style blue for active states/links |
| **Urgent** | `#F44747` | Overdue highlighting (VS Code Error Red) |

---

## 2. Layout & Anatomy
Everything is governed by a strict **4px grid** to ensure the "flat" look remains tidy and functional.

### Dashboard Widgets
* **Flat Cards**: No drop shadows. Use a 1px border (`#333333`) to separate widgets.
* **Information Density**: Padding is minimised to surface more data. Use `11px` muted text for timestamps and labels.
* **Progress Bars**: Minimalist 2px lines at the very bottom of a card, rather than chunky rounded bars.

### The God File (Notes)
* **Block Handles**: On hover, show a small drag-and-drop icon to the left of a block, mimicking a code editor's gutter.
* **Monospace Integration**: Use a monospace font for table data and time spans to ensure columns align perfectly.

---

## 3. Iconography Over Text
To keep the UI "quick" and readable at a glance, labels are replaced with a consistent, minimalist icon set.

* **Status Indicators**: Use a single red `!` icon for overdue items instead of text labels.
* **Core Actions**:
    * `+` : Quick Add
    * `⌗` : God File / Note
    * `◔` : In Progress / Time Span
    * `Pin Icon` : Header toggle for "Sticky" mode

---

## 4. Interaction Logic
* **No Spring Animations**: Replace "bouncy" animations with linear 80ms transitions or instant state changes for a "terminal" feel.
* **Active States**: Use a 2px vertical "Active Bar" on the left side of a dashboard item or sidebar link to indicate focus.
* **Sticky Note Overlay**: Zero transparency. Use a solid `#161616` window with a thin accent border to ensure readability over any wallpaper.

---

## 5. Typography
* **Primary UI**: *Inter* or *Outfit* (Medium weight for headers, Regular for body).
* **Data/Numerical**: *JetBrains Mono* or *Roboto Mono* for event lists and table UI modes.

---

## 6. Implementation (CSS Variables)
```css
:root {
  --bg-main: #161616;
  --bg-card: #1c1c1c;
  --border-std: 1px solid #333333;
  --text-main: #e0e0e0;
  --text-dim: #858585;
  --accent: #007acc;
  --font-ui: 'Inter', sans-serif;
  --font-data: 'JetBrains Mono', monospace;
  --transition-fast: 80ms linear;
}