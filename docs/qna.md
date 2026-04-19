<sub>✧ common issues (´・ω・\`) ✧</sub>

> [!CAUTION]
> If you have any trouble opening **RELEASE** app:
> - Delete previous versions (from windows apps, and then if left the packages locally)
> - Restart your PC (or just kill electron process) (Electron processes may still be running even if not visible)

## I highly suggest opening Github Issues and check for your Issue (it might be WIP already), if not - please create one! Here is the example of a ticket:
```
`OS:` Windows 11 (build 26200.8037)
`Node version (node -v):` v20.20.1
`Bug description:` Options are not opening after restart
`Steps to reproduce error:` Open app -> expand to youtube view -> shrink -> open settings
`Actual result:` not opening window (nothing happens)
`Wanted result:` settings popup opens up and visible
`Settings:` `(not needed)`
```


## ✦ app won’t start (from source code)

-   Make sure **Node.js** and **npm** are installed: `node -v` and `npm -v`
-   Run `npm install` in the project folder, then `npm run dev` again
-   On Windows: try running the terminal as administrator if you see permission errors

---

## ✦ blank / white window

-   Wait a few seconds for YouTube Music to load
-   Check **configs/settings.json** → **youtubeMusic.url** is valid
-   Try toggling **window → isAcrylic** off if you’re on Windows (transparency glitch)

---

## ✦ discord rich presence not showing

-   In app: open **settings** (gear) and turn **“Enabled by default”** on under Discord
-   Put your app’s **Application ID** from the [Discord Developer Portal](https://discord.com/developers/applications) into **discordRichPresence.applicationId**
-   Restart the app after changing settings

---

## 🌸 other

-   **Audio / playback:** comes from YouTube Music in the embedded view; if it doesn’t play, check the URL and your browser/network for that site
-   **Crashes:** try resetting settings (button in settings view) or deleting **configs/settings.json** (it will be recreated from defaults)

<sub>♡ still stuck? open an issue with those fields or dm in discord `@mntbliss`: ♡</sub>
