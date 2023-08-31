#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DolaritoConsumerStack } from '../lib/dolarito-consumer-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();
new PipelineStack(app, 'PipelineStack');
new DolaritoConsumerStack(app, 'DolaritoConsumerStack');
