// lang: JavaScript (ESM), file: config.js
// target: Node.js 18+

export default {
  whatsapp: {
    sessionDir: './sessions/whatsapp',
    targetJid: 'CHANNEL_JID@newsletter',
    targetMsgId: 'MESSAGE_ID_HERE',
    emoji: '❤️'
  },
  telegram: {
    apiId: 123456,
    apiHash: 'YOUR_API_HASH',
    phone: '+1234567890',
    channelUsername: '@yourchannel',
    messageId: 12345,
    reaction: '❤'
  }
}
