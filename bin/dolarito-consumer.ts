#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DolaritoConsumerStack } from '../lib/dolarito-consumer-stack';
import { PipelineStack } from '../lib/pipeline-stack';
import { Construct } from 'constructs';

// const app = new cdk.App();
// new PipelineStack(app, 'PipelineStack');
// new DolaritoConsumerStack(app, 'DolaritoConsumerStack');

interface DeployStageProps extends cdk.StageProps {
  envName: 'prod' | 'staging';
}

class DeployStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: DeployStageProps) {
    super(scope, id, props);

    new DolaritoConsumerStack(this, 'DolaritoConsumerStack', {
      env: props.env,
      envName: props.envName,
    });
  }
}

const app = new cdk.App();

new PipelineStack(app, 'PipelineStack');

new DeployStage(app, 'Staging', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  envName: 'staging',
});

new DeployStage(app, 'Prod', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
  envName: 'prod',
});

app.synth();