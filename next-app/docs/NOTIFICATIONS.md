# Web Push notifications

All customer and staff notifications are delivered through **Web Push** plus
in-app notifications. There is no SMTP or object-storage dependency.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `VAPID_PUBLIC_KEY` | Server | Public VAPID key used to sign push messages |
| `VAPID_PRIVATE_KEY` | Server | Private VAPID key (never expose to the browser) |
| `VAPID_SUBJECT` | Server | Contact used by VAPID, e.g. `mailto:admin@travelisland.app` |
| `PUSH_ENABLED` | Server | `true` to enable push delivery, `false` to disable |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Browser | Same public key, exposed to the client bundle |
| `NEXT_PUBLIC_PUSH_ENABLED` | Browser | Hides the opt-in prompt when push is disabled |

Generate a key pair once:

```bash
npx web-push generate-vapid-keys
```

Copy the output into `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` and the public key
into `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

## How it works

1. `public/sw.js` is the service worker. It renders the system notification and
   focuses the app when the notification is clicked.
2. `src/components/PushPrompt.tsx` registers the worker, asks for permission and
   posts the subscription to `POST /api/push/subscribe/`.
3. `src/lib/push/index.ts` stores subscriptions in PostgreSQL and sends messages
   with `web-push`. Expired subscriptions (404/410) are removed automatically.
4. Booking events trigger notifications:
   - a new booking notifies staff and the customer,
   - a status change notifies the customer and staff.
5. `GET /api/notifications/` returns the in-app notification list for the
   signed-in user; `PATCH /api/notifications/` marks them as read.

## API

| Endpoint | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/push/key/` | GET | Public | Returns the VAPID public key |
| `/api/push/subscribe/` | POST | User | Stores a push subscription |
| `/api/push/subscribe/` | DELETE | User | Removes a push subscription |
| `/api/notifications/` | GET | User | In-app notifications (`?unread=true`) |
| `/api/notifications/` | PATCH | User | Mark one (`id`) or all (`all`) as read |
| `/api/cron/cleanup/` | GET/POST | `CRON_SECRET` | Removes stale subscriptions, notifications and visits |

## Notes

- iOS requires the site to be installed as a PWA before push works; the service
  worker is served from `/sw.js`.
- Notifications are only sent for users who opted in; bookings are still stored
  and visible in the dashboard either way.
