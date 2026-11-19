import { IsString } from 'class-validator';

export class RenewSessionDto {
  @IsString()
  sessionSecret: string;

  @IsString()
  fingerprint: string;

  @IsString()
  clientType: string;

  @IsString()
  gateway: string;
}
