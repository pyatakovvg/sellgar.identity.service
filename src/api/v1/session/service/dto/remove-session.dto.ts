import { IsString } from 'class-validator';

export class RemoveSessionDto {
  @IsString()
  sessionSecret: string;

  @IsString()
  fingerprint: string;

  @IsString()
  clientType: string;

  @IsString()
  gateway: string;
}
