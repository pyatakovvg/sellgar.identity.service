import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ApiV1Module } from './api/v1/api-v1.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: './.env',
      cache: true,
      isGlobal: true,
      validate: validateEnv,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.getOrThrow<string>('DATABASE_HOST'),
          port: configService.getOrThrow<number>('DATABASE_PORT'),
          username: configService.getOrThrow<string>('DATABASE_USERNAME'),
          password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
          database: configService.getOrThrow<string>('DATABASE_DATABASE_NAME'),
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),

    ApiV1Module,
  ],
})
export class AppModule {}
