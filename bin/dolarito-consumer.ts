#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DolaritoConsumerStack } from '../lib/dolarito-consumer-stack';

const app = new cdk.App();
new DolaritoConsumerStack(app, 'DolaritoConsumerStack');
