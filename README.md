# DM_Extension-

A lightweight, zero-lag, cross-browser dark mode extension built with vanilla HTML, CSS, and JS using Manifest V3.

## Features
- **Zero Lag:** Uses CSS filters (`invert` and `hue-rotate`) instead of heavy DOM-manipulating JavaScript to ensure zero performance hit.
- **Cross-Browser:** Compatible with Chrome, Edge, Firefox, Brave, and other modern browsers supporting Manifest V3.
- **Aesthetic Dark Gray:** Employs a hybrid CSS approach that tweaks brightness and contrast to avoid harsh pure blacks, producing a comfortable dark gray.
- **Media Preservation:** Specifically exempts images, videos, and SVGs from the filter so media retains its original colors.
- **Simple State Management:** Toggles instantly via the extension icon and saves your preference locally.

## Installation (Local/Developer Mode)
1. Clone this repository or download the source code.
2. Open your Chromium-based browser (Chrome, Edge, Brave) and navigate to the extensions page (`chrome://extensions` or `edge://extensions`).
3. Enable **Developer mode** (usually a toggle in the top right corner).
4. Click **Load unpacked** and select the folder containing this extension's files.
5. The extension will appear in your toolbar. Pin it for easy access!

## Usage
Simply click the extension icon in your toolbar to toggle dark mode on and off for the current website.

## Technical Details
- **Manifest V3:** Adheres to the latest extension standards.
- **CSS Strategy:** Injects a global `<style>` block that applies `filter: invert(100%) hue-rotate(180deg) brightness(105%) contrast(85%) !important;` to the `<html>` root.
