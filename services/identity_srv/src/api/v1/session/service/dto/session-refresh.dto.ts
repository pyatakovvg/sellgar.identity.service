import { IsUUID, IsString } from 'class-validator';

export class SessionRefreshDto {
  @IsUUID()
  sessionUuid: string;

  @IsString()
  refreshToken: string;

  @IsString()
  fingerprint: string;
}
