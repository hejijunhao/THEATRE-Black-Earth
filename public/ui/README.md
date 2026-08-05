# Map-table UI material kit

Generated textures for the HUD’s furniture quality (v2-vision §7).
Colours: dark olive/charcoal fields, brass edge accents. No lettering.

| File | Use |
| --- | --- |
| `panel-field.png` | Tileable milled panel grain (CSS background) |
| `btn-plate.png` | Flat metal plate for menu / primary actions |
| `btn-deep.png` | Deeper recessed plate (optional / future) |
| `ornament-rule.png` | Title divider on main menu |
| `bar-frame.png` | Instrument bar trough (optional / future) |

Hover / pressed states are CSS filters on a single geometry so outlines stay
identical. Line icons remain inline SVG (`src/ui/icons.tsx`) so the
no-runtime-icon-asset property holds for the glyph set.
