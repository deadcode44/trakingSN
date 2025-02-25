const TelegramBot = require("node-telegram-bot-api");
const fs = require('fs'); // Untuk ekspor CSV
require("dotenv").config();

// Gantilah dengan token bot Anda
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const history = []; // Menyimpan riwayat permintaan pengguna

// 📌 Perintah untuk mendapatkan serial secara berurutan
bot.onText(/\/sn (\d+) (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const start = parseInt(match[1]);
    const end = parseInt(match[2]);

    if (end - start > 100) {
        return bot.sendMessage(chatId, "⚠️ Batas maksimum hanya 100 angka!");
    }

    let serials = [];
    for (let i = start; i <= end; i++) {
        serials.push(i.toString());
    }

    // Simpan ke riwayat
    const record = { user: msg.from.username, date: new Date().toISOString(), serials };
    history.push(record);

    // Kirim hasil
    bot.sendMessage(chatId, `✅ **Serial Number:**\n${serials.join("\n")}`);
});

// 📌 Perintah untuk mendapatkan serial berdasarkan input manual (dengan prefix)
bot.onText(/\/sn (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const inputSerials = match[1].split(",").map(num => num.trim());
    let serials = [];

    if (inputSerials.length === 0) {
        return bot.sendMessage(chatId, "⚠️ Mohon masukkan angka yang valid!");
    }

    // Angka pertama dianggap sebagai "prefix" jika cukup panjang
    let prefix = inputSerials[0].length > 4 ? inputSerials[0].slice(0, -4) : "";

    inputSerials.forEach(num => {
        if (num.length <= 4 && prefix) {
            serials.push(`${prefix}${num.padStart(4, "0")}`);
        } else {
            serials.push(num);
        }
    });

    if (serials.length > 50) {
        return bot.sendMessage(chatId, "⚠️ Maksimal hanya bisa 50 angka!");
    }

    // Simpan ke riwayat
    const record = { user: msg.from.username, date: new Date().toISOString(), serials };
    history.push(record);

    // Kirim hasil
    bot.sendMessage(chatId, `✅ **Serial Number:**\n${serials.join("\n")}`);
});

// 📌 Perintah untuk melihat daftar riwayat
bot.onText(/\/history/, (msg) => {
    const chatId = msg.chat.id;

    if (history.length === 0) {
        return bot.sendMessage(chatId, "📌 Belum ada riwayat tersedia.");
    }

    // Buat daftar tombol untuk setiap riwayat
    const options = {
        reply_markup: {
            inline_keyboard: history.map((record, index) => [
                {
                    text: `📌 ${record.serials[0]} → ${record.serials[record.serials.length - 1]} (🕒 ${formatDate(record.date)})`,
                    callback_data: `history_${index}`
                }
            ])
        }
    };

    bot.sendMessage(chatId, "📜 **Riwayat Serial Number:**", options);
});

// 📌 Fungsi untuk menampilkan detail saat tombol riwayat ditekan
bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith("history_")) {
        const index = parseInt(data.split("_")[1]);
        if (history[index]) {
            const record = history[index];
            const serialsList = record.serials.join("\n");
            bot.sendMessage(chatId, `✅ **Detail Serial Number:**\n${serialsList}`);
        } else {
            bot.sendMessage(chatId, "⚠️ Riwayat tidak ditemukan.");
        }
    }
});

// 📌 Fungsi untuk mengelompokkan riwayat berdasarkan tanggal
function formatHistory(histories) {
    let result = "";
    let currentDate = new Date().toISOString().split("T")[0]; // Tanggal hari ini
    let groupedByDate = {};

    histories.forEach(({ date, serials }) => {
        let recordDate = date.split("T")[0]; // Ambil bagian tanggal saja
        let time = date.split("T")[1].split(".")[0]; // Ambil jam, menit, detik

        if (!groupedByDate[recordDate]) {
            groupedByDate[recordDate] = [];
        }
        groupedByDate[recordDate].push(`📌 ${serials[0]} → ${serials[serials.length - 1]} (🕒 ${time})`);
    });

    Object.keys(groupedByDate).forEach((date) => {
        if (date !== currentDate) {
            result += `🗓 ${date}\n`; // Tambahkan tanggal jika beda hari
        }
        result += groupedByDate[date].join("\n") + "\n";
    });

    return result.trim();
}

// 📌 Fungsi untuk memformat tanggal agar lebih mudah dibaca
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${("0" + (date.getMonth() + 1)).slice(-2)}-${("0" + date.getDate()).slice(-2)} ` +
           `${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}:${("0" + date.getSeconds()).slice(-2)}`;
}
