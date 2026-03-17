# YouTube Music page injections

CSS and JS in this folder are injected into the YouTube Music webview (music.youtube.com).
Edit here, they are loaded at runtime

| File                | Purpose                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `debloat.css`       | Global styles: scrollbars, hide/show guide, nav bar, etc.                                       |
| `header-inject.css` | Moves YT nav bar to top. placeholders: `{{HEADER_HEIGHT}}`, `{{DRAG_WIDTH}}`, `{{RIGHT_WIDTH}}` |
| `header-inject.js`  | Drag handle + minimize/close buttons. same placeholders                                         |
| `video-mode.js`     | When "videos instead of picture" is on: switch player to VIDEO tab                              |
