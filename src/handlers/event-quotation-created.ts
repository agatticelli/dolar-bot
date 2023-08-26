import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Handler } from 'aws-lambda';
import TelegramBot from 'node-telegram-bot-api';
import { DBQuotation } from '../types/quotation';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const dynamoDBClient = new DynamoDBClient();
const ssmClient = new SSMClient();

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function chunk<T>(arr: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

const readSecret = async (secretName: string): Promise<string> => {
  const { Parameter } = await ssmClient.send(new GetParameterCommand({ Name: secretName }));
  if (!Parameter || !Parameter.Value) throw new Error('Secret not found');

  return Parameter.Value;
};