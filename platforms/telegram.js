// lang: JavaScript (ESM), file: platforms/telegram.js
// target: Node.js 18+, gramjs latest
// OTP flow — phone → code → session saved, reacts to channel message

import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions/index.js'
import { Api } from 'telegram/tl/index.js'
import chalk from 'chalk'
import enquirer from 'enquirer'
import fs from 'fs'

const { Input } = enquirer
const SESSION_FILE = './sessions/telegram.session'

async function getClient(cfg) {
  const savedSession = fs.existsSync(SESSION_FILE)
    ? fs.readFileSync(SESSION_FILE, 'utf8').trim()
    : ''

  const client = new TelegramClient(
    new StringSession(savedSession),
    cfg.apiId,
    cfg.apiHash,
    { connectionRetries: 5 }
  )

  await client.start({
    phoneNumber: async () => {
      if (cfg.phone && cfg.phone !== '+1234567890') return cfg.phone
      return await new Input({
        message: chalk.yellow('Telegram phone number (with country code, e.g. +2348012345678)')
      }).run()
    },
    password: async () => {
      console.log(chalk.gray('[Telegram] 2FA enabled — enter password'))
      return await new Input({ message: '2FA password', type: 'password' }).run()
    },
    phoneCode: async () => {
      console.log(chalk.cyan('\n── TELEGRAM OTP ──'))
      console.log(chalk.gray('  Code sent to your Telegram app / SMS'))
      return await new Input({ message: chalk.yellow('Enter OTP code') }).run()
    },
    onError: (e) => console.error(chalk.red('[Telegram] auth error:'), e.message)
  })

  // persist session
  fs.mkdirSync('./sessions', { recursive: true })
  fs.writeFileSync(SESSION_FILE, client.session.save())
  console.log(chalk.green('[Telegram] ✓ session saved'))

  return client
}

export async function runTelegram(cfg) {
  let client
  try {
    client = await getClient(cfg)
    const entity = await client.getEntity(cfg.channelUsername)

    await client.invoke(new Api.messages.SendReaction({
      peer: entity,
      msgId: cfg.messageId,
      reaction: [new Api.ReactionEmoji({ emoticon: cfg.reaction })]
    }))

    console.log(chalk.green(`[Telegram] ✓ reacted with ${cfg.reaction}`))
  } catch (e) {
    console.error(chalk.red('[Telegram] react failed:'), e.message)
  } finally {
    if (client) await client.disconnect()
  }
}
