# Lag-Free Dark Mode (Premium Edition)

A lightweight, zero-lag, highly-customizable, cross-browser dark mode extension built with vanilla HTML, CSS, and JS using Manifest V3.

## Features

- **Zero Lag:** Uses hardware-accelerated CSS filters (`invert` and `hue-rotate`) instead of heavy, laggy DOM-manipulating JavaScript, ensuring absolute zero performance impact.
- **Premium Glassmorphic UI:** A stunning, modern control center with beautiful micro-animations, styled sliders, and state toggles.
- **Dynamic Adjustments:** Control dark mode properties in real-time:
  - **Invert level** (50% - 100%): Customize from a soft gray to a deep pitch black.
  - **Brightness** (50% - 150%)
  - **Contrast** (50% - 150%)
  - **Grayscale** (0% - 100%)
- **Mathematical Media Preservation:** Reverses filters for images, videos, SVGs, canvases, iframes, and elements with CSS inline background-images. Restores dynamic range using a calculated contrast multiplier:
  $$\text{Media Contrast} = \frac{1}{|1 - 2 \times \text{InvertLevel}|}$$
- **Flexible Modes:**
  - **Manual:** Toggle dark mode globally on demand.
  - **System (Auto):** Automatically matches your OS/browser dark theme preferences.
  - **Schedule:** Activates during sunset/sunrise intervals (e.g., 20:00 to 07:00) with minute-precision local scheduling.
- **Per-Site Exclusions:** Turn dark mode on or off for individual websites. Manage your custom exception list directly from the popup.

## Installation (Local/Developer Mode)

1. Clone this repository or download the source code.
2. Open your Chromium-based browser (Chrome, Edge, Brave, Opera) and navigate to the extensions page (`chrome://extensions` or `edge://extensions`).
3. Enable **Developer mode** (usually a toggle in the top-right corner).
4. Click **Load unpacked** and select the folder containing this extension's files.
5. The extension will appear in your toolbar. Pin it for quick access!

## Technical details

- **Reactive State Management:** Content scripts listen directly to `chrome.storage.onChanged` for instant page style updates without complex message parsing or page reloads.
- **Formula-Driven Image Contrast:** Dynamically maintains crystal-clear image contrast across customizable invert strengths.
