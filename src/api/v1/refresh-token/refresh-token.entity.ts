import { IsUUID, IsBoolean, IsString, IsDate } from 'class-validator';

export class RefreshTokenEntity {
  @IsUUID()
  uuid: string;

  @IsUUID()
  sessionUuid: string;

  @IsString()
  token: string;

  @IsBoolean()
  isRevoked: boolean;

  @IsDate()
  expiresAt: Date;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}
