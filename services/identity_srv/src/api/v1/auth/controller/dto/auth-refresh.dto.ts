import { IsUUID, IsString } from 'class-validator';

export class AuthRefreshDto {
  @IsUUID()
  userUuid: string;

  @IsString()
  fingerprint: string;
}
