import { IsString, IsOptional } from 'class-validator';

export class AuthLoginDto {
  @IsOptional()
  @IsString()
  sessionSecret?: string;

  @IsString()
  login: string;

  @IsString()
  password: string;

  @IsString()
  device: string;

  @IsString()
  fingerprint: string;

  @IsString()
  clientType: string;

  @IsString()
  gateway: string;
}
