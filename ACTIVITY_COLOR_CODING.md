# Activity Color Coding Review

Current activity colors are grouped into clear families:

- Flight: standalone muted red for visibility
- Travel: Transit
- Lodging: Hotel
- Plans: Activity, Family Visit, Meal, Reminder, and Custom

Colors are used as the left border on calendar item pills and list/day timeline cards.

## Palette Tokens

| Token | Color | Current use |
| --- | --- | --- |
| `--type-flight` | `#B84A4A` | Flight |
| `--type-travel` | `#D9A441` | Reserved travel gold |
| `--type-travel-muted` | `#B88A2D` | Transit |
| `--type-hotel` | `#2563EB` | Hotel |
| `--type-plan` | `#2F6F73` | Activity, Reminder, Custom |
| `--type-plan-muted` | `#4D7C8A` | Family Visit, Meal |
| `--warning` | `#B45309` | Warning states only |
| `--error` | `#B42318` | Delete/error states |

## Activity Type Colors

| Activity type | Family | Color | Notes |
| --- | --- | --- | --- |
| Flight | Flight | `#B84A4A` | Muted red chosen to stand out without clashing. |
| Transit | Travel | `#B88A2D` | Gold travel family. |
| Hotel | Lodging | `#2563EB` | Bright blue so lodging stands out clearly. |
| Activity | Plans | `#2F6F73` | Main general planning color. |
| Family Visit | Plans | `#4D7C8A` | Same family as Activity, slightly cooler. |
| Meal | Plans | `#4D7C8A` | Same family as Activity/Family Visit. |
| Reminder | Plans | `#2F6F73` | Uses plan color; warning color is reserved for actual warnings. |
| Custom | Plans | `#2F6F73` | Uses default plan color. |

## Current CSS Rules

```css
:root {
  --type-travel: #d9a441;
  --type-travel-muted: #b88a2d;
  --type-flight: #b84a4a;
  --type-hotel: #2563eb;
  --type-plan: #2f6f73;
  --type-plan-muted: #4d7c8a;
}

.item-pill,
.timeline-card {
  border-left: 4px solid var(--type-plan);
}

.item-pill[data-type="Flight"],
.timeline-card[data-type="Flight"] {
  border-left-color: var(--type-flight);
}

.item-pill[data-type="Transit"],
.timeline-card[data-type="Transit"] {
  border-left-color: var(--type-travel-muted);
}

.item-pill[data-type="Hotel"],
.timeline-card[data-type="Hotel"] {
  border-left-color: var(--type-hotel);
}

.item-pill[data-type="Meal"],
.item-pill[data-type="Family Visit"],
.timeline-card[data-type="Meal"],
.timeline-card[data-type="Family Visit"] {
  border-left-color: var(--type-plan-muted);
}

.item-pill[data-type="Reminder"],
.timeline-card[data-type="Reminder"] {
  border-left-color: var(--type-plan);
}
```

## Review Notes

- Flight now uses a muted red so it stands out as a major travel anchor.
- Transit stays in the gold travel family.
- Hotel uses bright blue and is clearly separated from Flight, Transit, and general plans.
- Activity and the remaining non-travel, non-lodging types stay in one teal plan family.
- Warning orange is now reserved for actual warnings, not the Reminder activity type.
