import { IsString } from 'class-validator';

export class RestoreSessionDto {
  @IsString()
  sessionUuid: string;

  @IsString()
  fingerprint: string;
}
