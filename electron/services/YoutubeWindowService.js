import { resolve } from 'node:path'
import { readNowPlaying, clickPlayerButton, seekPlayerToFraction } from './YoutubeHandler.js'

export class YoutubeWindowService {
    constructor({ BrowserWindow, BrowserView, appSettings, rootDirPath, youtubeDebloatCss }) {
        this.BrowserWindow = BrowserWindow
        this.BrowserView = BrowserView
        this.appSettings = appSettings
        this.rootDirPath = rootDirPath
        this.youtubeDebloatCss = youtubeDebloatCss
        this.enableYoutubeDeveloperConsole = Boolean(appSettings.developer?.enableYoutubeDeveloperConsole)
        this.useVideosInsteadOfPicture = Boolean(appSettings.youtubeMusic?.useVideosInsteadOfPicture)
        this.pollIntervalMs = Number(appSettings.youtubeMusic?.pollIntervalMs) || 800
        this.presenceUpdateIntervalMs = Number(appSettings.discordRichPresence?.presenceUpdateIntervalMs) || 5000

        this.youtubeWindow = undefined
        this.youtubeView = undefined
        this.barView = undefined
        this.barHeight = 40
    }

    ensureWindow() {
        if (this.youtubeWindow) {
            this.youtubeWindow.show()
            this.youtubeWindow.focus()
            this.resizeView()
            return
        }

        this.youtubeWindow = new this.BrowserWindow({
            frame: false,
            transparent: true,
            resizable: true,
            roundedCorners: false,
            backgroundColor: '#00000000',
            backgroundMaterial: 'none',
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
            },
        })

        this.youtubeWindow.maximize()

        this.barView = new this.BrowserView({
            webPreferences: {
                preload: resolve(this.rootDirPath, 'electron', 'youtubeBarPreload.cjs'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        })

        this.youtubeView = new this.BrowserView({
            webPreferences: {
                partition: 'persist:youtube',
                contextIsolation: true,
                nodeIntegration: false,
            },
        })

        // no EventEmitter MaxListenersExceededWarning from 3rd party listeners
        // memory leak bad uh-uh
        this.youtubeView.webContents.setMaxListeners(20)

        this.youtubeWindow.setBrowserView(this.barView)
        this.youtubeWindow.addBrowserView(this.youtubeView)
        this.resizeView()

        this.barView.webContents.loadFile(resolve(this.rootDirPath, 'electron', 'youtubeBar.html'))
        this.youtubeView.webContents.loadURL(this.appSettings.youtubeMusic.url)

        this.youtubeView.webContents.on('dom-ready', () => {
            this.injectDebloatCss()

            // sidebar: hidden by default; menu button click toggles display none/block
            this.youtubeView.webContents
                .executeJavaScript(
                    `
        (function() {
          document.body.classList.add('leaf-guide-hidden')
          function toggleGuide() {
            document.body.classList.toggle('leaf-guide-hidden')
          }
          function bindMenu() {
            var btn = document.querySelector('ytmusic-nav-bar [aria-label="Guide"], ytmusic-nav-bar button[aria-label*="enu"], ytmusic-nav-bar .left-content button, tp-yt-paper-icon-button.ytmusic-nav-bar')
            if (btn && !btn._leafBound) {
              btn._leafBound = true
              btn.addEventListener('click', function() { setTimeout(toggleGuide, 50) })
            }
          }
          bindMenu()
          setTimeout(bindMenu, 800)
          new MutationObserver(bindMenu).observe(document.body, { childList: true, subtree: true })
        })()
      `
                )
                .catch(() => {})

            // swap "Sign in" label for a leaf
            this.youtubeView.webContents
                .executeJavaScript(
                    `
        const signInLink = document.querySelector('.sign-in-link')
        if (signInLink) signInLink.innerText = '🍃'
      `
                )
                .catch(() => {})

            if (this.useVideosInsteadOfPicture) {
                this.youtubeView.webContents
                    .executeJavaScript(
                        `
          function preferVideoMode() {
            if (document.body.classList.contains('video-mode')) return

            const selectors = [
              'ytmusic-player-page [role="tab"][aria-label*="Video"]',
              'ytmusic-player-page tp-yt-paper-tab[tab-id="VIDEO"]',
              'ytmusic-player-page button[aria-label*="Video"]'
            ]

            for (const selector of selectors) {
              const el = document.querySelector(selector)
              if (el) {
                el.click()
                break
              }
            }
          }

          preferVideoMode()
          setInterval(preferVideoMode, 3000)
        `
                    )
                    .catch(() => {})
            }

            if (this.enableYoutubeDeveloperConsole) this.youtubeView.webContents.openDevTools({ mode: 'detach' })
        })

        this.youtubeWindow.on('closed', () => {
            this.youtubeWindow = undefined
            this.youtubeView = undefined
            this.barView = undefined
        })
    }

    resizeView() {
        if (!this.youtubeWindow || !this.youtubeView || !this.barView) return

        const windowBounds = this.youtubeWindow.getBounds()

        this.barView.setBounds({
            x: 0,
            y: 0,
            width: windowBounds.width,
            height: this.barHeight,
        })

        this.youtubeView.setBounds({
            x: 0,
            y: this.barHeight,
            width: windowBounds.width,
            height: windowBounds.height - this.barHeight,
        })
    }

    hideWindow() {
        if (!this.youtubeWindow) return
        this.youtubeWindow.hide()
    }

    injectDebloatCss() {
        if (!this.youtubeView) return
        if (!this.youtubeDebloatCss) return

        this.youtubeView.webContents.insertCSS(this.youtubeDebloatCss)
    }

    startNowPlayingPolling({ onNowPlaying, onPresence }) {
        let lastPresenceSentAt = 0

        const poll = async () => {
            if (!this.youtubeView) return

            try {
                const nowPlaying = await readNowPlaying(this.youtubeView)
                const watchUrl = this.youtubeView.webContents.getURL()

                if (nowPlaying && typeof watchUrl === 'string') {
                    const videoIdMatch = watchUrl.match(/[?&]v=([^&]+)/)
                    const videoId = videoIdMatch ? videoIdMatch[1] : null
                    if (videoId) {
                        nowPlaying.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
                    }
                }

                if (typeof onPresence === 'function') {
                    const now = Date.now()
                    const isTrackValid = nowPlaying && nowPlaying.title
                    const enoughTimePassed = now - lastPresenceSentAt >= this.presenceUpdateIntervalMs

                    if (isTrackValid && enoughTimePassed) {
                        onPresence(nowPlaying, watchUrl)
                        lastPresenceSentAt = now
                    }
                }
                if (typeof onNowPlaying === 'function' && nowPlaying) onNowPlaying(nowPlaying)
            } catch {}
        }

        setInterval(poll, this.pollIntervalMs)
    }

    async clickPlayer(action) {
        if (!this.youtubeView) return
        await clickPlayerButton(this.youtubeView, action)
    }

    async seekToFraction(fraction) {
        if (!this.youtubeView) return
        await seekPlayerToFraction(this.youtubeView, fraction)
    }
}
