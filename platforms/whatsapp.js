// lang: JavaScript (ESM), file: platforms/whatsapp.js
// target: Node.js 18+, @whiskeysockets/baileys latest
// pairing code flow — enter phone number → get 8-digit code → link device

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  delay
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import pino from 'pino'
import chalk from 'chalk'
import enquirer from 'enquirer'

const { Input } = enquirer

export async function pairWhatsApp(sessionDir) {
  fs.mkdirSync(sessionDir, { recursive: true })
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

  // check if already paired
  if (state.creds?.registered) {
    console.log(chalk.green('[WhatsApp] already linked — skipping pairing'))
    return true
  }

  // ask for phone number
  const phone = await new Input({
    message: chalk.yellow('WhatsApp phone number (with country code, e.g. +2348012345678)'),
    validate: v => /^\+\d{7,15}$/.test(v.trim()) || 'format: +COUNTRYCODE NUMBER'
  }).run()

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false  // pairing code, not QR
  })

  sock.ev.on('creds.update', saveCreds)

  // request pairing code
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  await delay(2000) // wait for socket to be ready

  let code
  try {
    code = await sock.requestPairingCode(cleanPhone)
    console.log(chalk.cyan('\n── WHATSAPP PAIRING CODE ──'))
    console.log(chalk.white.bold(`  Code : `) + chalk.green.bold(code))
    console.log(chalk.gray(`  Open WhatsApp → Linked Devices → Link a Device → Enter code above\n`))
  } catch (e) {
    console.error(chalk.red('[WhatsApp] pairing code request failed:'), e.message)
    return false
  }

  // wait for connection
  return new Promise((resolve) => {
    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        console.log(chalk.green('[WhatsApp] ✓ linked successfully'))
        sock.end()
        resolve(true)
      }
      if (connection === 'close') {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode
        if (code === DisconnectReason.loggedOut) {
          console.log(chalk.red('[WhatsApp] pairing rejected or logged out'))
          resolve(false)
        }
      }
    })
  })
}

export async function runWhatsApp(cfg) {
  fs.mkdirSync(cfg.sessionDir, { recursive: true })
  const { state, saveCreds } = await useMultiFileAuthState(cfg.sessionDir)

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)

  await new Promise((resolve, reject) => {
    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        console.log(chalk.green('[WhatsApp] connected — firing reaction'))
        try {
          await sock.sendMessage(cfg.targetJid, {
            react: {
              text: cfg.emoji,
              key: {
                remoteJid: cfg.targetJid,
                id: cfg.targetMsgId,
                fromMe: false
              }
            }
          })
          console.log(chalk.green(`[WhatsApp] ✓ reacted with ${cfg.emoji}`))
        } catch (e) {
          console.error(chalk.red('[WhatsApp] react failed:'), e.message)
        }
        await delay(500)
        sock.end()
        resolve()
      }
      if (connection === 'close') {
        const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
        if (statusCode === DisconnectReason.loggedOut) {
          console.log(chalk.red('[WhatsApp] session expired — re-pair needed'))
          resolve()
        } else {
          runWhatsApp(cfg).then(resolve).catch(reject)
        }
      }
    })
  })
}
