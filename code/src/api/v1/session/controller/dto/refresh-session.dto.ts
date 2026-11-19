import { IsString } from 'class-validator';

export class RefreshSessionDto {
  @IsString()
  sessionUuid: string;

  @IsString()
  refreshToken: string;

  @IsString()
  fingerprint: string;
}
