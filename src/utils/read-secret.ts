import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient();

export const readSecret = async (secretName: string): Promise<string> => {
  const { Parameter } = await ssmClient.send(new GetParameterCommand({ Name: secretName }));
  if (!Parameter || !Parameter.Value) throw new Error('Secret not found');

  return Parameter.Value;
};