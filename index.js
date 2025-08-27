const { 
  Client, 
  GatewayIntentBits, 
  Events, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  ChannelType, 
  PermissionsBitField 
} = require('discord.js');
const https = require('https');
require('dotenv').config();

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let cachedServerTime = new Date();
let localSystemTime = new Date();

function updateServerTimeFromNaver() {
  const options = {
    method: 'HEAD',
    host: 'www.naver.com'
  };

  const req = https.request(options, res => {
    const serverDateHeader = res.headers.date;
    if (serverDateHeader) {
      cachedServerTime = new Date(serverDateHeader);
      localSystemTime = new Date();
      console.log(`[서버 시각 동기화] ${cachedServerTime.toLocaleString()}`);
    }
  });

  req.on('error', error => {
    console.error('⛔ 네이버 시간 요청 실패:', error);
  });

  req.end();
}

function getCurrentServerTime() {
  const now = new Date();
  const delta = now - localSystemTime;
  return new Date(cachedServerTime.getTime() + delta);
}

updateServerTimeFromNaver();
setInterval(updateServerTimeFromNaver, 60 * 60 * 1000);

const commands = [
  new SlashCommandBuilder()
    .setName('타이머')
    .setDescription('분 단위로 타이머를 설정할게요!')
    .addIntegerOption(option =>
      option.setName('분')
        .setDescription('타이머 시간 (분)')
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('알림')
    .setDescription('원하는 시각에 알림을 받아요!')
    .addIntegerOption(option =>
      option.setName('시')
        .setDescription('몇 시에 알림을 받을까요? (0~23)')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('분')
        .setDescription('몇 분에 알림을 받을까요? (0~59)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('채널이름')
        .setDescription('알림을 보낼 채널 이름 (예: 일반)')
        .setRequired(true)
    )
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ 슬래시 명령어 등록 완료');
  } catch (error) {
    console.error('❌ 슬래시 명령어 등록 실패:', error);
  }

  setInterval(() => {
    const currentTime = getCurrentServerTime();
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();

    if (hours === 12 && minutes === 0) {
      const channel = client.channels.cache.get(process.env.CHANNEL_ID);
      if (channel) {
        channel.send('점심시간이에요! 오늘은 아루지가 좋아하는 음식으로 준비했어요. 🍚 ');
      }
    }
  }, 60 * 1000);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === '타이머') {
    const minutes = interaction.options.getInteger('분');
    const milliseconds = minutes * 60 * 1000;

    await interaction.reply(`⏰ ${minutes}분 동안 타이머를 시작할게요. 아루지, 힘내세요!`);

    setTimeout(() => {
      interaction.followUp('✅ 시간이 끝났어요! 잠시 숨을 돌리시는 건 어떠실까요?');
    }, milliseconds);
  }

  else if (interaction.commandName === '알림') {
    const targetHour = interaction.options.getInteger('시');
    const targetMinute = interaction.options.getInteger('분');
    const channelName = interaction.options.getString('채널이름');

    const targetChannel = interaction.guild.channels.cache.find(
      ch => ch.name === channelName && ch.type === ChannelType.GuildText
    );

    if (!targetChannel) {
      return interaction.reply({
        content: `⚠️ '${channelName}'이라는 이름의 텍스트 채널을 찾을 수 없어요.`,
        ephemeral: true
      });
    }

    const permissions = targetChannel.permissionsFor(client.user);
    if (!permissions || !permissions.has(PermissionsBitField.Flags.SendMessages)) {
      return interaction.reply({
        content: `⚠️ '${channelName}' 채널에 메시지를 보낼 권한이 없어요.`,
        ephemeral: true
      });
    }

    await interaction.reply(`✅ ${targetHour}시 ${targetMinute}분에 **#${channelName}** 채널에 알림을 드릴게요!`);

    const checkInterval = setInterval(async () => {
      const now = getCurrentServerTime();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (currentHour === targetHour && currentMinute === targetMinute) {
        clearInterval(checkInterval);
        try {
          await targetChannel.send('요청하신 시간이에요! 🕒');
        } catch (error) {
          console.error('[알림] 알림 전송 실패:', error);
        }
      }
    }, 10 * 1000);
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === 'horikawa') {
    await message.channel.send('✨ 아루지가 부르셨어요? 무슨 일이신가요?');
  }
});

client.login(process.env.TOKEN);

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("✅ Discord bot is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server is running on port ${PORT}`);
});
