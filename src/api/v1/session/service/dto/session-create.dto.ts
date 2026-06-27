import { IsString } from 'class-validator';

export class SessionCreateDto {
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
