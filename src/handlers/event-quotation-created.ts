import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Handler } from 'aws-lambda';
import TelegramBot from 'node-telegram-bot-api';
import { DBQuotation } from '../types/quotation';
import { chunk, readSecret, sleep } from '../utils';

const dynamoDBClient = new DynamoDBClient();

export const handler: Handler = async (event) => {
  const { current, previous } = event.detail;

  const telegramBotToken = await readSecret(process.env.TELEGRAM_BOT_SECRET!);
  const bot = new TelegramBot(telegramBotToken);
  const { buy, sell } = current as DBQuotation;

  let msg = `Compra: *$${buy}*   \\|   Venta: *$${sell}*`;

  if (previous) {
    msg = `${previous.sell < sell ? '⬆️' : '⬇️'} ${msg}`;
  }

  const subscriptionParams = {
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'pk = :pk and begins_with(sk, :sk)',
    ExpressionAttributeValues: marshall({
      ':pk': 'SUBSCRIPTION',
      ':sk': 'CHAT#',
    })
  };

  const queryResult = await dynamoDBClient.send(new QueryCommand(subscriptionParams));
  const chatChunks = chunk(queryResult.Items!, 30);

  for (const chatChunk of chatChunks) {
    await Promise.all(chatChunk.map((chat) => {
      const chatId = chat.sk.S!.replace('CHAT#', '');
      return bot.sendMessage(chatId, msg, { parse_mode: 'MarkdownV2' });
    }));

    await sleep(1100);
  }
};