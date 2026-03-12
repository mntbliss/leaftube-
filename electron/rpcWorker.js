import rpcLib from 'discord-rpc'

const clientId = process.env.DISCORD_CLIENT_ID ? String(process.env.DISCORD_CLIENT_ID) : ''

if (!clientId) {
  // eslint-disable-next-line no-console
  console.error('[rpcWorker] missing DISCORD_CLIENT_ID, exiting')
  process.exit(0)
}

// eslint-disable-next-line no-console
console.log('[rpcWorker] starting, clientId:', clientId)

const rpc = new rpcLib.Client({ transport: 'ipc' })

rpc.on('ready', () => {
  // eslint-disable-next-line no-console
  console.log('[rpcWorker] rpc ready')
})

rpc.on('error', (error) => {
  // eslint-disable-next-line no-console
  console.error('[rpcWorker] rpc error', error)
})

rpc.login({ clientId }).catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[rpcWorker] login failed', error)
})

process.on('message', (message) => {
  if (!message || message.type !== 'presence') return

  const { title, channel, isVideo, watchUrl, thumbnailUrl } = message.payload || {}
  const details = isVideo ? 'Watching' : 'Listening to'
  const template = 'https://img.youtube.com/vi/<ID_HERE>/maxresdefault.jpg'

  const idMatch = watchUrl.match(/[?&]v=([^&]+)/)
  const id = idMatch ? idMatch[1] : null
  const largeImageKey = id ? template.replace('<ID_HERE>', id) : 'leaf_listening'

  const activity = {
    details,
    state: title || 'YouTube Music',
    // try raw thumbnail URL as image key (experimental)
    largeImageKey: largeImageKey,
    largeImageText: channel || 'YouTube Music',
    startTimestamp: Math.floor(Date.now() / 1000)
  }

  if (watchUrl && typeof watchUrl === 'string' && watchUrl.includes('music.youtube.com')) {
    activity.buttons = [{
      label: isVideo ? 'Watch on YouTube Music' : 'Listen on YouTube Music',
      url: watchUrl
    }]
  }

  try {
    rpc.setActivity(activity)
    // eslint-disable-next-line no-console
    console.log('[rpcWorker] setActivity ok:', activity.state || '(no state)')
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[rpcWorker] setActivity failed', error)
  }
})
