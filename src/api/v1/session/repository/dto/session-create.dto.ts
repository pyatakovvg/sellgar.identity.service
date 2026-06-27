import { IsUUID, IsString } from 'class-validator';

export class SessionCreateDto {
  @IsUUID()
  userUuid: string;

  @IsString()
  device: string;

  @IsString()
  fingerprintHash: string;

  @IsString()
  secretHash: string;

  @IsString()
  clientType: string;

  @IsString()
  gateway: string;

  @IsString()
  authMethod: string;

  @IsString()
  assuranceLevel: string;

  renewRequiredAt: Date;

  expiresAt: Date;
}
