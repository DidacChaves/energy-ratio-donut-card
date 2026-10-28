# Energy Ratio Donut Card by [@DidacChaves](https://github.com/DidacChaves)

![Card Preview](https://github.com/DidacChaves/energy-ratio-donut-card/blob/master/docs/images/img.png?raw=true)

Interactive donut chart visualizing energy distribution between solar production and grid consumption in Home Assistant.

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE.md)
[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/custom-components/hacs)
![Project Maintenance][maintenance-shield]
[![GitHub Activity][commits-shield]][commits]
[![Community Forum][forum-shield]][forum]

## Features

- Dynamic donut chart showing energy distribution
- Two display modes:
  - Solar production vs self-consumption
  - Grid import vs consumption
- Real-time data from Home Assistant energy dashboard
- Automatic period synchronization
- Percentage breakdown calculations
- Multi-language support (EN/ES/CA/FR/DE/IT)

## Installation

### HACS (not distributed yet)
1. Open HACS in your Home Assistant
2. Go to "Frontend" section
3. Click "+ Explore & Download Repositories"
4. Search for "Energy Ratio Donut"
5. Click "Download" and restart HA

### HACS (Custom Repository)
1. Open HACS > Frontend
2. Click the 3-dot menu (top-right) > "Custom repositories"
3. Add repository URL:  
   `https://github.com/DidacChaves/energy-ratio-donut-card`
4. Set category: "Dashboard"
5. Click "Add"
6. Find the card in new repositories list
7. Click "Download" and restart HA

### Manual
1. Download `energy-ratio-donut-card.js` from the [latest release][releases]
2. Place it in your `config/www` directory
3. Add resource reference in Lovelace configuration:

```yaml
resources:
  - url: /local/energy-ratio-donut-card.js
    type: module
```

## Configuration

### Card Options

| Name             | Type    | Requirement    | Description                               | Default  |
|------------------|---------|----------------|-------------------------------------------|----------|
| `type`           | string  | **Required**   | `custom:energy-ratio-donut-card`          | -        |
| `name`           | string  | **Optional**   | Card name                                 | -        |
| `collection_key` | string  | **Optional**   | Energy dashboard collection key           | `energy` |
| `chart_type`     | string  | **Optional**   | `solar` or `consumption` display mode     | `solar`  |
| `show_date`      | boolean | **Optional**   | Show the selected period in the header    | `false`  |
| `tap_action`     | object  | **Optional**   | [Action](https://www.home-assistant.io/dashboards/actions/) on tap         | -        |
| `hold_action`    | object  | **Optional**   | Action on hold                            | -        |
| `double_tap_action` | object | **Optional**  | Action on double tap                      | -        |

> The card reads the period from the energy dashboard collection, so the same view must contain a
> `type: energy-date-selection` card (use `collection_key` if it has a custom one).

### Battery

If your energy dashboard has a battery, the card takes it into account automatically:

- **Solar view:** solar energy stored in the battery counts as self-consumption, not as exported.
- **Consumption view:** the energy discharged from the battery counts as self-supplied (not imported), and
  energy charged into the battery is not counted as home consumption. The battery is assumed to charge from
  solar first and from the grid for the rest.

Without a battery the numbers are the same as before.

## Examples

### Basic Solar View
```yaml
type: custom:energy-ratio-donut-card
```

### Grid Consumption View
```yaml
type: custom:energy-ratio-donut-card
name: Energy Consumption
chart_type: consumption
collection_key: energy_custom_selector
```

## Supported Languages

The following languages are supported:

| Language           | Yaml value | Supported | Translated by                                       |
|--------------------|------------|-----------|-----------------------------------------------------|
| English            | `en`       | v1.0.0    | [@DidacChaves](https://www.github.com/DidacChaves)  |
| Catalan (Català)   | `ca`       | v1.0.0    | [@DidacChaves](https://www.github.com/DidacChaves)  |
| Spanish (Español)  | `es`       | v1.0.0    | [@DidacChaves](https://www.github.com/DidacChaves)  |
| Italian (Italiano) | `it`       | v1.0.0    | [@DidacChaves](https://www.github.com/DidacChaves)  |
| German (Deutsch)   | `de`       | v1.0.0    | [@DidacChaves](https://www.github.com/DidacChaves)  |
| French (Français)  | `fr`       | v1.0.0    | [@DidacChaves](https://www.github.com/DidacChaves)  |

## Credits

Special thanks to:
- [@iantrich](https://github.com/iantrich) for the original template
- Home Assistant community contributors

[commits-shield]: https://img.shields.io/github/commit-activity/y/DidacChaves/energy-ratio-donut-card.svg?style=for-the-badge
[commits]: https://github.com/DidacChaves/energy-ratio-donut-card/commits/main
[forum-shield]: https://img.shields.io/badge/community-forum-brightgreen.svg?style=for-the-badge
[forum]: https://community.home-assistant.io/
[license-shield]: https://img.shields.io/github/license/DidacChaves/energy-ratio-donut-card.svg?style=for-the-badge
[maintenance-shield]: https://img.shields.io/maintenance/yes/2025.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/DidacChaves/energy-ratio-donut-card.svg?style=for-the-badge
[releases]: https://github.com/DidacChaves/energy-ratio-donut-card/releases
