import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UserModule } from '../user/user.module';

import { AccessTokenController } from './controller/access-token.controller';
import { AccessTokenService } from './service/access-token.service';

@Module({
  imports: [UserModule],
  controllers: [AccessTokenController],
  providers: [AccessTokenService, JwtService],
  exports: [AccessTokenService],
})
export class AccessTokenModule {}
