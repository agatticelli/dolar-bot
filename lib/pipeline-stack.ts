import { GithubActionsIdentityProvider, GithubActionsRole } from "aws-cdk-github-oidc";
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const provider = new GithubActionsIdentityProvider(this, "GithubProvider");

    const deployRole = new GithubActionsRole(this, "UploadRole", {
      provider: provider,
      owner: "agatticelli",
      repo: "dolar-bot",
    });

    deployRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "sts:AssumeRole"
        ],
        resources: [
          "arn:aws:iam::*:role/cdk-*"
        ]
      })
    );

    new CfnOutput(this, "UploadRoleArn", {
      value: deployRole.roleArn,
    });
  }
}