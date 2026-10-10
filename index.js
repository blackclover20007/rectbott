// lang: JavaScript (ESM), file: index.js
// target: Node.js 18+

import { runMenu } from './menu.js'
import { runWhatsApp } from './platforms/whatsapp.js'
import { runTelegram } from './platforms/telegram.js'

async function platformRunner(platform, cfg) {
  if (platform === 'whatsapp') return runWhatsApp(cfg)
  if (platform === 'telegram') return runTelegram(cfg)
  throw new Error(`unknown platform: ${platform}`)
}

runMenu(platformRunner)
