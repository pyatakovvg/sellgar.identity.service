import { IsString } from 'class-validator';

export class RestoreSessionDto {
  @IsString()
  sessionUuid: string;

  @IsString()
  refreshToken: string;

  @IsString()
  fingerprint: string;
}
