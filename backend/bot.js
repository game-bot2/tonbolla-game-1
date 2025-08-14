require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const Game = require('./models/Game');

// تنظیمات
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 3000;

// اتصال به MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ایجاد ربات
const bot = new TelegramBot(TOKEN, { 
  polling: true
});

// برنامه‌ریزی بازی هر ساعت
schedule.scheduleJob('0 * * * *', async () => {
  try {
    const now = new Date();
    const gameId = `G${now.getFullYear()}${now.getMonth()+1}${now.getDate()}${now.getHours()}`;
    
    const game = new Game({
      gameId,
      startTime: now,
      status: 'active'
    });
    
    await game.save();
    
    console.log(`🚀 Game ${gameId} started at ${now.toISOString()}`);
    
    // اطلاع‌رسانی به کاربران
    const users = await User.find({});
    for (const user of users) {
      try {
        bot.sendMessage(
          user.chatId,
          '🎮 A new game is starting now! Join the game:',
          {
            reply_markup: {
              inline_keyboard: [
                [{
                  text: 'Play Now',
                  web_app: { url: `${WEBAPP_URL}?gameId=${gameId}&userId=${user.telegramId}` }
                }]
              ]
            }
          }
        );
      } catch (err) {
        console.error(`Failed to notify user ${user.telegramId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error starting new game:', err);
  }
});

// تولید کد دعوت
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// دستور /start
bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const username = msg.from.username || `${msg.from.first_name}${msg.from.last_name || ''}`;
    const firstName = msg.from.first_name;
    const lastName = msg.from.last_name || '';
    const referralCode = match && match[1] ? match[1] : null;
    
    // یافتن یا ایجاد کاربر
    let user = await User.findOne({ telegramId });
    if (!user) {
      user = new User({
        telegramId,
        username,
        firstName,
        lastName,
        inviteCode: generateInviteCode(),
        chatId
      });
      await user.save();
    }
    
    // پردازش دعوت
    if (referralCode) {
      const referrer = await User.findOne({ inviteCode: referralCode });
      if (referrer && referrer.telegramId !== telegramId) {
        referrer.invitedCount += 1;
        await referrer.save();
        
        bot.sendMessage(
          referrer.chatId,
          `🎉 ${firstName} ${lastName} joined using your invite link! You now have ${referrer.invitedCount} referrals.`
        );
      }
    }
    
    // ایجاد دکمه
    const keyboard = {
      inline_keyboard: [
        [{
          text: '🎮 Play Game',
          web_app: { url: `${WEBAPP_URL}?userId=${telegramId}` }
        }],
        [{
          text: '👥 Invite Friends',
          callback_data: 'invite'
        }],
        [{
          text: '🏆 My Stats',
          callback_data: 'stats'
        }]
      ]
    };
    
    // ارسال پیام با دکمه
    bot.sendMessage(
      chatId,
      `✨ Welcome to Tonbolla Game!\nYour invite code: ${user.inviteCode}`,
      { reply_markup: JSON.stringify(keyboard) }
    );
  } catch (err) {
    console.error('Error in /start command:', err);
  }
});

// مدیریت دکمه‌های اینلاین
bot.on('callback_query', async (query) => {
  try {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    
    if (query.data === 'invite') {
      await sendInviteOptions(chatId, userId);
    } else if (query.data === 'stats') {
      await sendUserStats(chatId, userId);
    }
  } catch (err) {
    console.error('Error handling callback query:', err);
  }
});

// ارسال گزینه‌های دعوت
async function sendInviteOptions(chatId, userId) {
  try {
    const user = await User.findOne({ telegramId: userId });
    if (!user) return;
    
    const inviteLink = `https://t.me/${bot.options.username}?start=${user.inviteCode}`;
    
    bot.sendMessage(
      chatId,
      `📣 Invite your friends and earn rewards!\n\n` +
      `Your personal invite link:\n${inviteLink}\n\n` +
      `You've invited ${user.invitedCount} friends so far.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{
              text: '📤 Share via Telegram',
              url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=Join%20Tonbolla%20Game!`
            }],
            [{
              text: '📋 Copy Link',
              callback_data: 'copy_invite'
            }],
            [{
              text: '🔙 Back',
              callback_data: 'back_to_main'
            }]
          ]
        }
      }
    );
  } catch (err) {
    console.error('Error sending invite options:', err);
  }
}

// ارسال آمار کاربر
async function sendUserStats(chatId, userId) {
  try {
    const user = await User.findOne({ telegramId: userId });
    if (!user) return;
    
    const gamesPlayed = await Game.countDocuments({ 
      'players.userId': user._id 
    });
    
    const gamesWon = await Game.countDocuments({ 
      winner: user._id 
    });
    
    bot.sendMessage(
      chatId,
      `📊 Your Game Stats:\n\n` +
      `👤 Invite Code: ${user.inviteCode}\n` +
      `👥 Friends Invited: ${user.invitedCount}\n` +
      `🎮 Games Played: ${gamesPlayed}\n` +
      `🏆 Games Won: ${gamesWon}\n\n` +
      `Keep playing to increase your stats!`,
      {
        reply_markup: {
          inline_keyboard: [
            [{
              text: '🔙 Back',
              callback_data: 'back_to_main'
            }]
          ]
        }
      }
    );
  } catch (err) {
    console.error('Error sending user stats:', err);
  }
}

// بازگشت به منوی اصلی
bot.on('callback_query', async (query) => {
  try {
    if (query.data === 'back_to_main' || query.data === 'copy_invite') {
      const chatId = query.message.chat.id;
      const userId = query.from.id;
      const user = await User.findOne({ telegramId: userId });
      
      if (query.data === 'copy_invite') {
        bot.answerCallbackQuery(query.id, {
          text: 'Invite link copied to clipboard!',
          show_alert: false
        });
      }
      
      if (user) {
        bot.sendMessage(
          chatId,
          `✨ Welcome back to Tonbolla Game!\nYour invite code: ${user.inviteCode}`,
          {
            reply_markup: {
              inline_keyboard: [
                [{
                  text: '🎮 Play Game',
                  web_app: { url: `${WEBAPP_URL}?userId=${userId}` }
                }],
                [{
                  text: '👥 Invite Friends',
                  callback_data: 'invite'
                }],
                [{
                  text: '🏆 My Stats',
                  callback_data: 'stats'
                }]
              ]
            }
          }
        );
      }
    }
  } catch (err) {
    console.error('Error handling back action:', err);
  }
});

// سرور ساده برای فعال نگه داشتن پروژه
const app = express();
app.use(express.json());
app.get('/', (req, res) => res.send('Tonbolla Bot is running!'));
app.listen(PORT, () => console.log(`✅ Bot activated on port ${PORT}...`));
