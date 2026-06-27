import { IsUUID, IsString } from 'class-validator';

export class VerifyRefreshTokenDto {
  @IsUUID()
  sessionUuid: string;

  @IsString()
  token: string;
}
