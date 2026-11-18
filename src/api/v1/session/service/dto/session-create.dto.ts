import { IsString, IsOptional } from 'class-validator';

export class SessionCreateDto {
  @IsOptional()
  @IsString()
  sessionSecret?: string;

  @IsString()
  userUuid: string;

  @IsString()
  device: string;

  @IsString()
  fingerprint: string;

  @IsString()
  clientType: string;

  @IsString()
  gateway: string;

  @IsString()
  authMethod: string;

  @IsString()
  assuranceLevel: string;
}
