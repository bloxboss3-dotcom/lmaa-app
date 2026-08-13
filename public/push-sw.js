/**
 * Push handling for the LMAA Family App.
 *
 * This file is imported into the generated Workbox service worker (see the
 * `workbox.importScripts` option in vite.config.ts). It is kept separate and
 * hand-written so the notification behaviour is short enough to read and audit
 * in one sitting — this is the code that decides what a parent sees on their
 * lock screen.
 *
 * It is deliberately defensive: a service worker that throws inside a `push`
 * handler shows the browser's own "This site has been updated in the
 * background" notification instead, which would be baffling to a family.
 */

/** Falls back to something honest if the payload is missing or malformed. */
function readPayload(event) {
  const fallback = {
    title: "Lee's Martial Arts Academy",
    body: 'Open the app to see the latest.',
    url: '#/updates',
  }
  if (!event.data) return fallback
  try {
    const data = event.data.json()
    return {
      title: typeof data.title === 'string' && data.title ? data.title : fallback.title,
      body: typeof data.body === 'string' && data.body ? data.body : fallback.body,
      url: typeof data.url === 'string' && data.url ? data.url : fallback.url,
      topic: typeof data.topic === 'string' ? data.topic : undefined,
    }
  } catch {
    // Some senders deliver plain text rather than JSON.
    try {
      const text = event.data.text()
      return text ? { ...fallback, body: text } : fallback
    } catch {
      return fallback
    }
  }
}

self.addEventListener('push', (event) => {
  const payload = readPayload(event)

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: new URL('icons/icon-192.png', self.registration.scope).href,
      badge: new URL('icons/favicon-32.png', self.registration.scope).href,
      // Grouping by topic means a second schedule change replaces the first
      // rather than stacking two half-read notices on the lock screen.
      tag: payload.topic ? `lmaa-${payload.topic}` : 'lmaa',
      renotify: true,
      data: { url: payload.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const scope = self.registration.scope
  const hash = (event.notification.data && event.notification.data.url) || '#/updates'
  const target = new URL(hash.startsWith('#') ? hash : `#${hash}`, scope).href

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // Reuse a tab that already has the app open rather than piling up
      // windows every time a parent taps a notification.
      for (const client of clientList) {
        if (client.url.startsWith(scope)) {
          await client.focus()
          if ('navigate' in client) {
            try {
              await client.navigate(target)
            } catch {
              /* focusing is enough; some browsers refuse cross-hash navigate */
            }
          }
          return
        }
      }

      if (self.clients.openWindow) await self.clients.openWindow(target)
    })(),
  )
})
