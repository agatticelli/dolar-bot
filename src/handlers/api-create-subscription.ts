import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  const { message: { from, text } } = JSON.parse(event.body!);
  if (text !== '/subscribe') {
    return {
      statusCode: 200,
      body: ''
    };
  }

  const { id, first_name, last_name, username, language_code } = from;

  const putItemInput: PutItemCommandInput = {
    TableName: process.env.TABLE_NAME!,
    Item: marshall({
      pk: 'SUBSCRIPTION',
      sk: `CHAT#${id}`,
      firstName: first_name,
      lastName: last_name,
      username,
      languageCode: language_code,
      createdAt: new Date().toISOString(),
    }, { removeUndefinedValues: true }),
  };

  await dynamoClient.send(new PutItemCommand(putItemInput));

  return {
    statusCode: 200,
    body: ''
  }
};