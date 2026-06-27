import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { AuthModule } from './auth/auth.module';
import { SessionModule } from './session/session.module';
import { PersonModule } from './person/person.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    AuthModule,
    SessionModule,
    PersonModule,
    UserModule,

    ClientsModule.registerAsync({
      isGlobal: true,
      clients: [
        {
          name: 'IDENTITY_EVENT_SERVICE',
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            return {
              urls: [
                {
                  port: config.get('AMQP_PORT'),
                  hostname: config.get('AMQP_HOSTNAME'),
                  username: config.get('AMQP_USERNAME'),
                  password: config.get('AMQP_PASSWORD'),
                },
              ],
              transport: Transport.RMQ,
              options: {
                wildcards: true,
                persistent: true,
                queue: '',
                queueOptions: {
                  durable: false,
                  exclusive: true,
                  autoDelete: true,
                },
                exchange: config.get('AMQP_EVENTS_EXCHANGE'),
                exchangeType: 'topic',
              },
            };
          },
        },
      ],
    }),
  ],
})
export class ApiV1Module {}
