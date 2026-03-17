/**
 * injected into YT Music when isVideosInsteadOfPicture: switches to VIDEO tab on player page
 * runs once on dom-ready
 */
;(function () {
    setTimeout(function () {
        try {
            function switchToVideoTabIfNotActive() {
                if (document.body.classList.contains('video-mode')) return
                var videoTabSelectors = ['ytmusic-player-page tp-yt-paper-tab[tab-id="VIDEO"]', 'ytmusic-player-page [role="tab"][tab-id="VIDEO"]']
                for (var selectorIndex = 0; selectorIndex < videoTabSelectors.length; selectorIndex++) {
                    var videoTabElement = document.querySelector(videoTabSelectors[selectorIndex])
                    if (videoTabElement) {
                        videoTabElement.click()
                        break
                    }
                }
            }
            switchToVideoTabIfNotActive()
            setInterval(switchToVideoTabIfNotActive, 3000)
        } catch (caughtError) {}
    }, 0)
})()
