// lang: JavaScript (ESM), file: menu.js
// target: Node.js 18+
// full interactive menu — pairing code flow, emoji picker, fire

import enquirer from 'enquirer'
import chalk from 'chalk'
import cfg from './config.js'
import { EMOJI_CATEGORIES, ALL_EMOJIS, searchEmoji } from './emojis.js'
import { pairWhatsApp } from './platforms/whatsapp.js'

const { Select, MultiSelect, Input, Confirm } = enquirer

// ── BANNER ────────────────────────────────────────────────────────────────────

function banner() {
  console.clear()
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════╗
║       🔥  R E C T B O T T  🔥           ║
║      Reaction Bot — WA + Telegram        ║
╠══════════════════════════════════════════╣
║  💬 WhatsApp (pairing code)              ║
║  ✈️  Telegram  (OTP)                     ║
╚══════════════════════════════════════════╝
`))
}

// ── EMOJI PICKER ──────────────────────────────────────────────────────────────

async function emojiCategoryPicker() {
  const categories = Object.keys(EMOJI_CATEGORIES)

  const catChoice = await new Select({
    name: 'category',
    message: chalk.yellow('Pick emoji category'),
    choices: [
      ...categories.map(c => ({
        name: c,
        message: `${c}  (${EMOJI_CATEGORIES[c].length})`
      })),
      { name: '__search__', message: '🔍  Search by keyword' },
      { name: '__all__',    message: '🌐  Show all (first 60)' }
    ]
  }).run()

  let pool = []
  if (catChoice === '__search__') {
    const q = await new Input({ message: 'keyword' }).run()
    pool = searchEmoji(q)
  } else if (catChoice === '__all__') {
    pool = ALL_EMOJIS.slice(0, 60)
  } else {
    pool = EMOJI_CATEGORIES[catChoice]
  }

  return new Select({
    name: 'emoji',
    message: chalk.yellow('Pick emoji'),
    choices: pool.slice(0, 60).map(e => ({ name: e, message: e }))
  }).run()
}

// ── PLATFORM SELECT ───────────────────────────────────────────────────────────

async function platformMenu() {
  return new MultiSelect({
    name: 'platforms',
    message: chalk.yellow('Select platforms'),
    choices: [
      { name: 'whatsapp', message: '💬  WhatsApp', value: 'whatsapp' },
      { name: 'telegram', message: '✈️   Telegram', value: 'telegram' }
    ],
    indicator(state, choice) {
      return choice.enabled ? chalk.green(' ●') : chalk.gray(' ○')
    }
  }).run()
}

// ── CONFIG EDITOR ─────────────────────────────────────────────────────────────

async function configMenu(platforms) {
  const updates = {}

  for (const platform of platforms) {
    console.log(chalk.cyan(`\n── ${platform.toUpperCase()} CONFIG ──`))

    if (platform === 'whatsapp') {
      const jid = await new Input({
        message: 'Channel JID (@newsletter)',
        initial: cfg.whatsapp.targetJid
      }).run()

      const msgId = await new Input({
        message: 'Message ID',
        initial: cfg.whatsapp.targetMsgId
      }).run()

      const emoji = await emojiCategoryPicker()

      updates.whatsapp = { ...cfg.whatsapp, targetJid: jid, targetMsgId: msgId, emoji }
      console.log(chalk.green(`  emoji → ${emoji}`))
    }

    if (platform === 'telegram') {
      const channel = await new Input({
        message: 'Channel (@handle)',
        initial: cfg.telegram.channelUsername
      }).run()

      const msgId = await new Input({
        message: 'Message ID',
        initial: String(cfg.telegram.messageId)
      }).run()

      const reaction = await emojiCategoryPicker()

      updates.telegram = {
        ...cfg.telegram,
        channelUsername: channel,
        messageId: parseInt(msgId),
        reaction
      }
      console.log(chalk.green(`  emoji → ${reaction}`))
    }
  }

  return updates
}

// ── PREVIEW ───────────────────────────────────────────────────────────────────

function previewBox(platforms, overrides) {
  console.log(chalk.cyan('\n── PREVIEW ──'))
  for (const p of platforms) {
    const c = overrides[p] || cfg[p]
    if (p === 'whatsapp') {
      console.log(chalk.white(`
  💬 WhatsApp
     JID     : ${chalk.green(c.targetJid)}
     Msg ID  : ${chalk.green(c.targetMsgId)}
     Emoji   : ${chalk.green(c.emoji)}
`))
    }
    if (p === 'telegram') {
      console.log(chalk.white(`
  ✈️  Telegram
     Channel : ${chalk.green(c.channelUsername)}
     Msg ID  : ${chalk.green(c.messageId)}
     Emoji   : ${chalk.green(c.reaction)}
`))
    }
  }
}

// ── PAIRING MENU ──────────────────────────────────────────────────────────────

async function pairingMenu() {
  console.log(chalk.cyan('\n── LINK ACCOUNTS ──\n'))

  const choices = await new MultiSelect({
    name: 'pair',
    message: chalk.yellow('Which accounts to link?'),
    choices: [
      { name: 'whatsapp', message: '💬  WhatsApp (pairing code)' },
      { name: 'telegram', message: '✈️   Telegram (OTP on fire)' }
    ]
  }).run()

  if (choices.includes('whatsapp')) {
    console.log(chalk.cyan('\n── WHATSAPP LINK ──'))
    const ok = await pairWhatsApp(cfg.whatsapp.sessionDir)
    if (ok) console.log(chalk.green('WhatsApp linked ✓'))
    else console.log(chalk.red('WhatsApp link failed — retry from this menu'))
  }

  if (choices.includes('telegram')) {
    console.log(chalk.gray('\nTelegram OTP fires automatically when you hit "Fire reactions"'))
    console.log(chalk.gray('Session saves after first fire — no OTP on next run'))
  }
}

// ── MAIN MENU ─────────────────────────────────────────────────────────────────

async function mainMenu() {
  return new Select({
    name: 'action',
    message: chalk.yellow('What do you want to do?'),
    choices: [
      { name: 'fire',    message: '🚀  Fire reactions now'          },
      { name: 'pair',    message: '🔗  Link accounts (WA code / TG)' },
      { name: 'config',  message: '⚙️   Edit config + emoji'          },
      { name: 'preview', message: '👁️   Preview config'               },
      { name: 'emoji',   message: '😀  Pick emoji only'              },
      { name: 'exit',    message: '❌  Exit'                          }
    ]
  }).run()
}

// ── RUNNER ────────────────────────────────────────────────────────────────────

export async function runMenu(runner) {
  banner()

  let selectedPlatforms = ['whatsapp', 'telegram']
  let overrides = {}

  while (true) {
    banner()
    const action = await mainMenu()

    if (action === 'exit') {
      console.log(chalk.gray('\nbye.\n'))
      process.exit(0)
    }

    if (action === 'pair') {
      banner()
      await pairingMenu()
      await new Confirm({ message: 'back to menu' }).run().catch(() => {})
      continue
    }

    if (action === 'preview') {
      banner()
      previewBox(selectedPlatforms, overrides)
      await new Confirm({ message: 'back to menu' }).run().catch(() => {})
      continue
    }

    if (action === 'emoji') {
      banner()
      console.log(chalk.cyan('quick emoji pick — applies to all selected platforms\n'))
      const emoji = await emojiCategoryPicker()
      for (const p of selectedPlatforms) {
        const base = overrides[p] || cfg[p]
        overrides[p] = {
          ...base,
          ...(p === 'whatsapp' ? { emoji } : { reaction: emoji })
        }
      }
      console.log(chalk.green(`\n✓ emoji set to ${emoji}`))
      await new Confirm({ message: 'back' }).run().catch(() => {})
      continue
    }

    if (action === 'config') {
      banner()
      selectedPlatforms = await platformMenu()
      if (!selectedPlatforms.length) {
        console.log(chalk.red('pick at least one platform'))
        await new Confirm({ message: 'back' }).run().catch(() => {})
        continue
      }
      overrides = await configMenu(selectedPlatforms)
      continue
    }

    if (action === 'fire') {
      banner()
      previewBox(selectedPlatforms, overrides)

      const go = await new Confirm({
        message: chalk.red('fire reactions on selected platforms?'),
        initial: false
      }).run()

      if (!go) continue

      console.log(chalk.cyan('\n── FIRING ──\n'))

      const jobs = selectedPlatforms.map(p => runner(p, overrides[p] || cfg[p]))
      const results = await Promise.allSettled(jobs)

      for (const r of results) {
        if (r.status === 'rejected') {
          console.error(chalk.red('error:'), r.reason?.message || r.reason)
        }
      }

      console.log(chalk.green('\n✓ done.\n'))
      await new Confirm({ message: 'back to menu' }).run().catch(() => {})
    }
  }
}
