# Screenshots for README and Marketplace

PNG screenshots for the README and Mattermost Marketplace listing.

Target size: **1280×800** (16:10, scaled from 2560×1600 captures).

## Captures

| File | What to show |
|------|----------------|
| `message-input-microphone.png` | Channel view with the microphone button visible next to the file upload icon |
| `recording-overlay.png` | Recording in progress (timer + level meter visible) |
| `review-dialog.png` | Review dialog with sample transcript, **Send** and **Discard** buttons |
| `plugin-settings.png` | System Console plugin configuration (Parakeet URL, etc.) |

These images are embedded in the root [README.md](../../README.md).

## Resize after capture

ImageMagick **6** (Ubuntu `imagemagick-6`) uses `convert` / `mogrify` — not `magick` (that is v7).

From the repository root:

```bash
mogrify -resize 1280x -strip docs/screenshots/*.png
```

Or use the helper script:

```bash
bash scripts/resize-screenshots.sh
```

Single file:

```bash
convert input.png -resize 1280x -strip output.png
```

## Marketplace web form

The [Marketplace submission form](https://developers.mattermost.com/integrate/marketplace-submissions/)
also asks for a **512×512** listing icon (PNG, JPG, or SVG). Export from
[`assets/icon.svg`](../../assets/icon.svg):

```bash
convert -background none assets/icon.svg -resize 512x512 docs/screenshots/marketplace-icon-512.png
```
