import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RefreshTokenController } from './controller/refresh-token.controller';
import { RefreshTokenService } from './service/refresh-token.service';
import { RefreshTokenRepository } from './repository/refresh-token.repository';

import { RefreshTokenModel } from './refresh-token.model';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshTokenModel])],
  controllers: [RefreshTokenController],
  providers: [RefreshTokenService, RefreshTokenRepository, JwtService],
  exports: [RefreshTokenService],
})
export class RefreshTokenModule {}
