import { Type } from 'class-transformer';
import { ValidateNested, IsUUID, IsString, IsBoolean, IsDate, IsOptional } from 'class-validator';

import { RefreshTokenEntity } from '../refresh-token/refresh-token.entity';

export class SessionEntity {
  @IsUUID()
  uuid: string;

  @IsUUID()
  userUuid: string;

  @IsString()
  device: string;

  @IsString()
  fingerprint: string;

  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RefreshTokenEntity)
  refreshToken?: RefreshTokenEntity;

  @IsBoolean()
  isRevoked: boolean;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}
