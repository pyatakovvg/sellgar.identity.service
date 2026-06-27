import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger();

  const app: NestExpressApplication = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        {
          port: config.getOrThrow<number>('AMQP_PORT'),
          hostname: config.getOrThrow<string>('AMQP_HOSTNAME'),
          username: config.getOrThrow<string>('AMQP_USERNAME'),
          password: config.getOrThrow<string>('AMQP_PASSWORD'),
        },
      ],
      persistent: true,
      queue: config.getOrThrow<string>('AMQP_IDENTITY_SRV_COMMAND_QUEUE'),
      queueOptions: {
        durable: true,
      },
    },
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.startAllMicroservices();

  logger.log('Service has been started.');
}

bootstrap();
