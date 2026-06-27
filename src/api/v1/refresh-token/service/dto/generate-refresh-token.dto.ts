import { IsUUID, IsString } from 'class-validator';

export class GenerateRefreshTokenDto {
  @IsUUID()
  sessionUuid: string;

  @IsString()
  fingerprint: string;
}
