import { IsString } from 'class-validator';

export class AuthLoginDto {
  @IsString()
  login: string;

  @IsString()
  password: string;

  @IsString()
  device: string;

  @IsString()
  fingerprint: string;
}
