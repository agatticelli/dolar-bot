import { GithubActionsIdentityProvider } from "aws-cdk-github-oidc";
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GithubActionsRole } from "aws-cdk-github-oidc";

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const provider = new GithubActionsIdentityProvider(this, "GithubProvider");

    const uploadRole = new GithubActionsRole(this, "UploadRole", {
      provider: provider,
      owner: "agatticelli",
      repo: "dolar-bot",
    });

    new CfnOutput(this, "UploadRoleArn", {
      value: uploadRole.roleArn,
    });
  }
}