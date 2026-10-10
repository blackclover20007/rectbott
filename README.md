# 🔥 RECTBOTT — Reaction Bot

WhatsApp + Telegram reaction bot with interactive menu.

## Setup

```bash
npm install
node index.js
```

## First run — link accounts

1. From the menu → **🔗 Link accounts**
2. **WhatsApp** — enter your phone number → get 8-digit pairing code → open WhatsApp → Linked Devices → Link a Device → enter code
3. **Telegram** — OTP fires automatically on first "Fire reactions" → enters your phone → sends code to Telegram app → session saved after

## Config

Edit `config.js` before running — set:
- `targetJid` — WhatsApp channel JID (`XXXXXXXX@newsletter`)
- `targetMsgId` — message ID to react to
- `channelUsername` — Telegram channel (@handle)
- `messageId` — Telegram message ID
- `apiId` / `apiHash` — from https://my.telegram.org

Or edit everything live from the menu → **⚙️ Edit config + emoji**

## Menu

```
🚀 Fire reactions now
🔗 Link accounts (WA code / TG)
⚙️  Edit config + emoji
👁️  Preview config
😀 Pick emoji only
❌ Exit
```

## Sessions

Stored in `./sessions/` — keep out of git. Delete to force re-login.
