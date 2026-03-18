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

})()

