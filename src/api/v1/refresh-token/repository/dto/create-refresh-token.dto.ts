import { IsUUID, IsString, IsDate } from 'class-validator';

export class CreateRefreshTokenDto {
  @IsUUID()
  sessionUuid: string;

  @IsString()
  token: string;

  @IsDate()
  expiresAt: Date;
}
