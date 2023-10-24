import axios from 'axios';
import { load } from 'cheerio';
import { DynamoDBClient, PutItemCommand, PutItemCommandInput, QueryCommand, QueryCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { EventBridgeClient, PutEventsCommand, PutEventsCommandInput } from '@aws-sdk/client-eventbridge';
import { DBQuotation } from '../types/quotation';

const dynamoClient = new DynamoDBClient({});
const eventBridgeClient = new EventBridgeClient({});

export async function handler(): Promise<void> {
  const dolaritoResponse = await axios.get('https://dolarito.ar/');
  const $ = load(dolaritoResponse.data);
  const text = $('script#__NEXT_DATA__').text();
  const { buy, sell, variation, timestamp } = JSON.parse(text).props.pageProps.realTimeQuotations.quotations.informal;

  const previousQuotation = await getPreviousQuotation(timestamp);
  if (previousQuotation?.buy === buy && previousQuotation?.sell === sell) return;

  const quotation = {
    pk: 'QUOTATION#informal',
    sk: timestamp.toString(),
    buy,
    sell,
    variation,
  };
  const putItemInput: PutItemCommandInput = {
    TableName: process.env.TABLE_NAME!,
    Item: marshall(quotation),
  };

  await dynamoClient.send(new PutItemCommand(putItemInput));

  const putEventsInput: PutEventsCommandInput = {
    Entries: [
      {
        Source: 'dolarito-consumer',
        DetailType: 'quotation.created',
        Detail: JSON.stringify({
          current: quotation,
          previous: previousQuotation,
        }),
        EventBusName: process.env.BUS_NAME!,
      },
    ],
  };

  await eventBridgeClient.send(new PutEventsCommand(putEventsInput));
}

const getPreviousQuotation = async (timestamp: number): Promise<DBQuotation | void> => {
  const params: QueryCommandInput = {
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'pk = :pk and sk <= :sk',
    ExpressionAttributeValues: marshall({
      ':pk': 'QUOTATION#informal',
      ':sk': timestamp.toString(),
    }),
    ScanIndexForward: false,
    Limit: 1,
  };
  const result = await dynamoClient.send(new QueryCommand(params));

  if (result.Items?.length) return unmarshall(result.Items[0]) as DBQuotation;
};
