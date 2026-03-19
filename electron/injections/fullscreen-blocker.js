// Blocks HTML fullscreen requests inside YT Music page.
// Goal: prevent “ytmusic-app covers entire screen and breaks UI” cases.
(function () {
    'use strict'

    // Avoid installing multiple times (YT can reinject scripts and re-render).
    if (window.__leafFullscreenBlockerInstalled) return
    window.__leafFullscreenBlockerInstalled = true

    function safeExitFullscreen() {
        try {
            if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
                document.exitFullscreen().catch(() => {})
            }
        } catch {}
    }

    function installRequestFullscreenBlocker() {
        try {
            const noop = () => Promise.resolve()

            if (typeof Element !== 'undefined' && Element.prototype) {
                if (typeof Element.prototype.requestFullscreen === 'function') {
                    Element.prototype.requestFullscreen = function () {
                        // Prevent fullscreen entry. Return resolved promise to keep callers happy.
                        return noop()
                    }
                }
                // Legacy webkit variants
                if (typeof Element.prototype.webkitRequestFullscreen === 'function') {
                    Element.prototype.webkitRequestFullscreen = function () {
                        return noop()
                    }
                }
                // IE/old variants
                if (typeof Element.prototype.msRequestFullscreen === 'function') {
                    Element.prototype.msRequestFullscreen = function () {
                        return noop()
                    }
                }
            }

            // Also patch document element fullscreen calls (some apps route here).
            if (document && document.documentElement && typeof document.documentElement.requestFullscreen === 'function') {
                document.documentElement.requestFullscreen = function () {
                    return noop()
                }
            }
        } catch {}
    }

    // Block fullscreen API attempts.
    installRequestFullscreenBlocker()

    // If something still flips us into fullscreen, immediately clean.
    try {
        document.addEventListener('fullscreenchange', () => {
            // Let DOM settle then exit (no class/DOM massaging).
            setTimeout(safeExitFullscreen, 0)
        }, true)
    } catch {}

    // keep YT Music "active" and auto-dismiss "Continue watching?" interruptions
    function pokeUserActivity() {
        try {
            const target = document.body || document.documentElement || window
            if (!target || typeof target.dispatchEvent !== 'function') return
            const now = Date.now()
            target.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: now % 200, clientY: now % 120 }))
            target.dispatchEvent(new Event('pointermove', { bubbles: true, cancelable: true }))
        } catch {}
    }

    function isVisibleElement(el) {
        try {
            if (!el) return false
            if (el.hidden) return false
            if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return false
            const style = window.getComputedStyle ? window.getComputedStyle(el) : null
            if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) return false
            return !!(el.getClientRects && el.getClientRects().length)
        } catch {
            return false
        }
    }

    function clickPreferredButton(container) {
        try {
            if (!container || typeof container.querySelectorAll !== 'function') return false
            const buttons = container.querySelectorAll('tp-yt-paper-button, yt-button-renderer button, button')
            if (!buttons || !buttons.length) return false

            // usually the confirm action is rightmost/last in YT dialogs
            for (let i = buttons.length - 1; i >= 0; i--) {
                const btn = buttons[i]
                if (!btn || btn.disabled || btn.getAttribute?.('aria-disabled') === 'true') continue
                if (!isVisibleElement(btn)) continue
                try {
                    btn.click()
                    return true
                } catch {}
            }
        } catch {}
        return false
    }

    function maybeConfirmContinueWatching() {
        try {
            // match YT Music dedicated inactivity component
            const prompts = document.querySelectorAll('ytmusic-you-there-renderer')
            if (!prompts || !prompts.length) return false

            for (let i = 0; i < prompts.length; i++) {
                const prompt = prompts[i]
                if (!isVisibleElement(prompt)) continue
                if (clickPreferredButton(prompt)) return true
            }
        } catch {}
        return false
    }

    function installContinueWatchingGuard() {
        try {
            if (window.__leafContinueWatchingGuardInstalled) return
            window.__leafContinueWatchingGuardInstalled = true

            setInterval(() => {
                pokeUserActivity()
                maybeConfirmContinueWatching()
            }, 20000)

            if (window.MutationObserver) {
                const observer = new MutationObserver(() => {
                    maybeConfirmContinueWatching()
                })
                observer.observe(document.documentElement || document.body, { childList: true, subtree: true })
            }
        } catch {}
    }

    installContinueWatchingGuard()

})()

