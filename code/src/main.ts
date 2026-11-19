import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { HealthService } from './api/health/health.service';

async function bootstrap() {
  const logger = new Logger();

  const app: NestExpressApplication = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const microservice = app.connectMicroservice<MicroserviceOptions>({
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

  const health = app.get(HealthService);
  microservice.status.subscribe((status) => {
    health.setBrokerConnected(status === 'connected' || status === 'unblocked');
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableShutdownHooks();
  await app.init();
  await app.startAllMicroservices();
  await app.listen(config.get<number>('PORT', 8080));

  logger.log('Service has been started.');
}

bootstrap();
