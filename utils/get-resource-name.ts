import { Stack } from 'aws-cdk-lib';

export type EnvName = 'prod' | 'staging';

const getResourceName = (stack: Stack, resourceName: string): string => {
  return `${stack.stackName}-${resourceName}`;
};

type GetResourceNameType = ReturnType<typeof getResourceName>;

export const getResourceNameBuilder = (stack: Stack): (name: string) => GetResourceNameType => {
  return (resourceName: string): string => getResourceName(stack, resourceName);
};
