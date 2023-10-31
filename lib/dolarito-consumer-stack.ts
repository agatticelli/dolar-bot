import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Architecture, FunctionUrlAuthType, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { EnvName, getResourceNameBuilder } from '../utils/get-resource-name';

interface DolaritoConsumerStackProps extends StackProps {
  envName: EnvName;
};

export class DolaritoConsumer extends Stack {
  constructor(scope: Construct, id: string, props: DolaritoConsumerStackProps) {
    super(scope, id, props);

    const getResourceName = getResourceNameBuilder(this);

    const botTokenParam = new StringParameter(this, getResourceName('TelegramBotToken'), {
      parameterName: `/${props.envName}/dolarito/telegram-bot`,
      stringValue: 'Complete this value in AWS console',
      description: 'Telegram Bot Token to send messages to subscribers',
    });

    const eventBus = new EventBus(this, getResourceName('EventBus'), {
      eventBusName: `${props.envName}-dolarito-event-bus`,
    });

    const table = new Table(this, getResourceName('Table'), {
      tableName: `${props.envName}-dolarito-table`,
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
    });

    // lambdas
    const cronPriceGet = new NodejsFunction(this, getResourceName('CronPriceGet'), {
      entry: `src/handlers/cron-price-get.ts`,
      functionName: `${props.envName}-do-cron-price-get`,
      handler: 'handler',
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(15),
      environment: {
        TABLE_NAME: table.tableName,
        BUS_NAME: eventBus.eventBusName,
      },
    });

    const eventQuotationCreated = new NodejsFunction(this, getResourceName('EventQuotationCreated'), {
      entry: `src/handlers/event-quotation-created.ts`,
      functionName: `${props.envName}-do-event-quotation-created`,
      handler: 'handler',
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.minutes(1),
      environment: {
        NODE_ENV: props.envName,
        TABLE_NAME: table.tableName,
        TELEGRAM_BOT_SECRET: botTokenParam.parameterName,
      },
    });

    const apiCreateSubscription = new NodejsFunction(this, getResourceName('ApiCreateSubscription'), {
      entry: `src/handlers/api-create-subscription.ts`,
      functionName: `${props.envName}-do-api-create-subscription`,
      handler: 'handler',
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      environment: {
        TABLE_NAME: table.tableName,

      },
    });
    const subscribeFunctionUrl = apiCreateSubscription.addFunctionUrl({ authType: FunctionUrlAuthType.NONE });

    // event bridge rules
    new Rule(this, getResourceName('CronPriceGetRule'), {
      schedule: Schedule.cron({
        weekDay: 'MON-FRI',
        hour: '13-21',
      }),
    }).addTarget(new LambdaFunction(cronPriceGet));

    new Rule(this, getResourceName('EventQuotationCreatedRule'), {
      eventBus,
      eventPattern: {
        source: ['dolarito-consumer'],
        detailType: ['quotation.created'],
      },
    }).addTarget(new LambdaFunction(eventQuotationCreated));

    // grants
    table.grantReadWriteData(cronPriceGet);
    table.grantReadData(eventQuotationCreated);
    table.grantWriteData(apiCreateSubscription);
    eventBus.grantPutEventsTo(cronPriceGet);
    botTokenParam.grantRead(eventQuotationCreated);

    // output
    new CfnOutput(this, getResourceName('SubscribeFn'), {
      value: subscribeFunctionUrl.url,
    });
  }
}