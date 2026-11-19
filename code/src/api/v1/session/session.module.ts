import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { IDENTITY_EVENTS, SessionLifecycleService } from './service/session-lifecycle.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SessionController } from './controller/session.controller';
import { SessionService } from './service/session.service';
import { SessionRepository } from './repository/repository.repository';

import { SessionModel } from './session.model';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionModel]),
    ClientsModule.registerAsync({
      clients: [
        {
          name: IDENTITY_EVENTS,
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            transport: Transport.RMQ,
            options: {
              urls: [
                {
                  hostname: config.getOrThrow('AMQP_HOSTNAME'),
                  port: Number(config.get('AMQP_PORT')),
                  username: config.getOrThrow('AMQP_USERNAME'),
                  password: config.getOrThrow('AMQP_PASSWORD'),
                },
              ],
              queue: '',
              queueOptions: { durable: false, autoDelete: true },
              persistent: true,
              exchange: config.getOrThrow<string>('AMQP_EVENTS_EXCHANGE'),
              exchangeType: 'topic',
              wildcards: true,
            },
          }),
        },
      ],
    }),
  ],
  controllers: [SessionController],
  providers: [SessionService, SessionRepository, SessionLifecycleService],
  exports: [SessionService, SessionRepository],
})
export class SessionModule {}
