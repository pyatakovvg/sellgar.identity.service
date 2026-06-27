import { IsString } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  userUuid: string;

  @IsString()
  device: string;

  @IsString()
  fingerprint: string;
}
