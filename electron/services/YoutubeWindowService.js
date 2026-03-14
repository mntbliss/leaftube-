import { resolve } from 'node:path'
import { runScriptInView } from '../helpers/view-helpers.js'
import { getTransparentFrameOptions, getWebPreferences } from '../helpers/window-helpers.js'
import { readNowPlaying, clickPlayerButton, clickPreviousSmart, seekPlayerToFraction, setMediaVolume, setMediaMuted, getMediaVolume } from './YoutubeHandler.js'

export class YoutubeWindowService {
    constructor({ BrowserWindow, BrowserView, appSettings, rootDirPath, youtubeDebloatCss }) {
        this.BrowserWindow = BrowserWindow
        this.BrowserView = BrowserView
        this.appSettings = appSettings
        this.rootDirPath = rootDirPath
        this.youtubeDebloatCss = youtubeDebloatCss
        this.isYoutubeDeveloperConsoleEnabled = Boolean(appSettings.developer?.isYoutubeDeveloperConsoleEnabled)
        this.isVideosInsteadOfPicture = Boolean(appSettings.youtubeMusic?.isVideosInsteadOfPicture)
        this.pollIntervalMs = Number(appSettings.youtubeMusic?.pollIntervalMs) || 800
        this.presenceUpdateIntervalMs = Number(appSettings.discordRichPresence?.presenceUpdateIntervalMs) || 5000

        this.youtubeWindow = undefined
        this.youtubeView = undefined
        this.barView = undefined
        this.barHeight = 40

        const volumeLevel = this.appSettings?.youtubeMusic?.volumeLevel
        const isMuted = this.appSettings?.youtubeMusic?.isMuted
        this.lastVolume = Number.isFinite(volumeLevel) ? Math.max(0, Math.min(1, volumeLevel)) : 1
        this.wasLastMuted = Boolean(isMuted)
    }

    ensureWindow(shouldShow = true) {
        if (this.youtubeWindow) {
            if (!shouldShow) return
            this.youtubeWindow.show()
            this.youtubeWindow.focus()
            this.resizeView()
            this.setContentVisible(true)
            return
        }

        const isAcrylic = Boolean(this.appSettings?.window?.isAcrylic)
        this.youtubeWindow = new this.BrowserWindow({
            show: false,
            resizable: true,
            ...getTransparentFrameOptions(isAcrylic),
            webPreferences: getWebPreferences(),
        })

        this.youtubeWindow.maximize()

        let restoredBounds = null
        const isPreloading = !shouldShow
        if (isPreloading) {
            restoredBounds = this.youtubeWindow.getBounds()
            this.youtubeWindow.setBounds({
                ...restoredBounds,
                x: -restoredBounds.width - 1000,
                y: -restoredBounds.height - 1000,
            })
            this.youtubeWindow.show()
        }

        const barPreloadPath = resolve(this.rootDirPath, 'electron', 'youtubeBarPreload.cjs')
        this.barView = new this.BrowserView({
            webPreferences: getWebPreferences({ preloadPath: barPreloadPath }),
        })

        this.youtubeView = new this.BrowserView({
            webPreferences: getWebPreferences({ partition: 'persist:youtube' }),
        })

        // no EventEmitter MaxListenersExceededWarning from 3rd party listeners
        // memory leak bad uh-uh
        this.youtubeView.webContents.setMaxListeners(20)

        this.youtubeWindow.setBrowserView(this.barView)
        this.youtubeWindow.addBrowserView(this.youtubeView)
        this.resizeView()

        this.barView.webContents.loadFile(resolve(this.rootDirPath, 'electron', 'youtubeBar.html'))
        this.youtubeView.webContents.loadURL(this.appSettings.youtubeMusic.url)

        if (isPreloading && restoredBounds) {
            this.youtubeView.webContents.once('did-finish-load', () => {
                try {
                    if (this.youtubeWindow && !this.youtubeWindow.isDestroyed()) {
                        this.youtubeWindow.hide()
                        this.youtubeWindow.setBounds(restoredBounds)
                        this.resizeView()
                    }
                } catch {}
            })
        }

        this.youtubeView.webContents.on('dom-ready', () => {
            this.injectDebloatCss()
            this.injectYoutubeDomScripts()
            if (this.isYoutubeDeveloperConsoleEnabled) this.youtubeView.webContents.openDevTools({ mode: 'detach' })
            this.setContentVisible(true)
        })

        this.youtubeWindow.on('closed', () => {
            this.youtubeWindow = undefined
            this.youtubeView = undefined
            this.barView = undefined
        })

        if (shouldShow) {
            this.youtubeWindow.show()
            this.youtubeWindow.focus()
        }
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

        this.setContentVisible(false)

        setTimeout(() => {
            try {
                if (this.youtubeWindow) this.youtubeWindow.hide()
            } catch {}
        }, 260)
    }

    setContentVisible(visible) {
        if (!this.youtubeView) return
        const script = visible
            ? "document && document.body && document.body.classList.add('leaf-content-visible');"
            : "document && document.body && document.body.classList.remove('leaf-content-visible');"
        runScriptInView(this.youtubeView, `(function(){ try { ${script} } catch(error){} })();`).catch(() => {})
    }

    injectDebloatCss() {
        if (!this.youtubeView) return
        if (!this.youtubeDebloatCss) return
        this.youtubeView.webContents.insertCSS(this.youtubeDebloatCss)
    }

    injectYoutubeDomScripts() {
        if (!this.youtubeView) return
        const guideScript = `(function() {
          document.body.classList.add('leaf-guide-hidden')
          function toggleGuide() { document.body.classList.toggle('leaf-guide-hidden') }
          function bindMenu() {
            var btn = document.querySelector('ytmusic-nav-bar [aria-label="Guide"], ytmusic-nav-bar button[aria-label*="enu"], ytmusic-nav-bar .left-content button, tp-yt-paper-icon-button.ytmusic-nav-bar')
            if (btn && !btn._leafBound) { btn._leafBound = true; btn.addEventListener('click', function() { setTimeout(toggleGuide, 50) }) }
          }
          bindMenu(); setTimeout(bindMenu, 800)
          new MutationObserver(bindMenu).observe(document.body, { childList: true, subtree: true })
        })()`
        runScriptInView(this.youtubeView, guideScript).catch(() => {})

        runScriptInView(this.youtubeView, `const signInLink = document.querySelector('.sign-in-link'); if (signInLink) signInLink.innerText = '🚪🍃'`).catch(
            () => {}
        )

        if (!this.isVideosInsteadOfPicture) return
        const videoModeScript = `(function() {
          function preferVideoMode() {
            if (document.body.classList.contains('video-mode')) return
            var selectors = ['ytmusic-player-page [role="tab"][aria-label*="Video"]','ytmusic-player-page tp-yt-paper-tab[tab-id="VIDEO"]','ytmusic-player-page button[aria-label*="Video"]']
            for (var i = 0; i < selectors.length; i++) {
              var el = document.querySelector(selectors[i])
              if (el) { el.click(); break }
            }
          }
          preferVideoMode(); setInterval(preferVideoMode, 3000)
        })()`
        runScriptInView(this.youtubeView, videoModeScript).catch(() => {})
    }

    startNowPlayingPolling({ onNowPlaying, onPresence }) {
        let lastPresenceSentAt = 0

        const poll = async () => {
            if (!this.youtubeView) return
            try {
                this.applyStoredVolume()
            } catch {}
            let nowPlaying
            let watchUrl
            try {
                nowPlaying = await readNowPlaying(this.youtubeView)
                watchUrl = this.youtubeView.webContents.getURL()
            } catch {
                return
            }
            if (!nowPlaying || typeof watchUrl !== 'string') {
                if (typeof onNowPlaying === 'function') onNowPlaying(nowPlaying)
                return
            }
            const videoIdMatch = watchUrl.match(/[?&]v=([^&]+)/)
            const videoId = videoIdMatch ? videoIdMatch[1] : null
            if (videoId) nowPlaying.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

            if (typeof onPresence === 'function') {
                const now = Date.now()
                const isTrackValid = nowPlaying && nowPlaying.title
                if (isTrackValid && now - lastPresenceSentAt >= this.presenceUpdateIntervalMs) {
                    onPresence(nowPlaying, watchUrl)
                    lastPresenceSentAt = now
                }
            }
            if (typeof onNowPlaying === 'function') onNowPlaying(nowPlaying)
        }

        setInterval(poll, this.pollIntervalMs)
    }

    async clickPlayer(action) {
        if (!this.youtubeView) return
        if (action === 'previous') await clickPreviousSmart(this.youtubeView)
        else await clickPlayerButton(this.youtubeView, action)
    }

    async seekToFraction(fraction) {
        if (!this.youtubeView) return
        await seekPlayerToFraction(this.youtubeView, fraction)
    }

    async setVolume(fraction) {
        if (!this.youtubeView) return
        this.lastVolume = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 1
        this.wasLastMuted = false
        await setMediaVolume(this.youtubeView, fraction)
    }

    async setMuted(isMuted) {
        if (!this.youtubeView) return
        this.wasLastMuted = Boolean(isMuted)
        await setMediaMuted(this.youtubeView, isMuted)
    }

    applyStoredVolume() {
        if (!this.youtubeView) return
        setMediaVolume(this.youtubeView, this.lastVolume).catch(() => {})
        setMediaMuted(this.youtubeView, this.wasLastMuted).catch(() => {})
    }

    async getVolume() {
        if (!this.youtubeView) return { volumeLevel: 1, isMuted: false }
        return getMediaVolume(this.youtubeView)
    }
}
