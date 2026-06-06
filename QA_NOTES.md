# QA Notes

Date: 2026-06-04

## Verified

- Production build completes with `npm run build`.
- Local dev server responds at `http://127.0.0.1:5173`.
- Manifest responds at `/generated/f1-sequence/manifest.json`.
- Desktop frame sequence contains 144 WebP frames.
- Mobile frame sequence contains 144 WebP frames.
- Direct frame request responds successfully.
- Generated frame `frame_0001.webp` was visually inspected and is not blank or corrupt.
- Reduced-motion CSS fallback is present.

## Sequence Settings

- Source: `hero_f1_scroll_sequence.mp4`
- FPS: 8
- Desktop width: 1920
- Mobile width: 1080
- Scroll distance: 720vh

## Notes

- The production sequence was regenerated in HD at 1920px / 8fps with WebP quality 88 for sharper playback.
- Codex in-app browser failed to initialize in this Windows sandbox with `windows sandbox failed: spawn setup refresh`.
- Edge/Chrome headless commands completed without writing screenshot files, so visual QA screenshots could not be captured in this environment.
