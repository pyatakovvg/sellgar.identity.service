import { IsUUID, IsString } from 'class-validator';

export class SessionCreateDto {
  @IsUUID()
  userUuid: string;

  @IsString()
  device: string;

  @IsString()
  fingerprint: string;
}
