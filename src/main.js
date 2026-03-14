import { createApp } from 'vue'

import App from './App.vue'
import * as LoggerService from './services/LoggerService.js'

import './styles/theme.css'
import './styles/global.css'

window.onerror = message => {
    const shortMessage = String(message)
    LoggerService.error('[renderer]', shortMessage)
    if (window.desktopBridge?.logs?.reportError) {
        window.desktopBridge.logs.reportError(shortMessage).catch(() => {})
    }
    return true
}

window.onunhandledrejection = event => {
    const reason = event.reason
    const shortMessage = reason instanceof Error ? reason.message : String(reason)
    LoggerService.error('[renderer] unhandled rejection', shortMessage)
    if (window.desktopBridge?.logs?.reportError) {
        window.desktopBridge.logs.reportError(shortMessage).catch(() => {})
    }
    event.preventDefault()
}

createApp(App).mount('#app')
