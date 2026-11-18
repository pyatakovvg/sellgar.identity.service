import { IsUUID, IsString, IsOptional } from 'class-validator';

export class SessionCreateDto {
  @IsOptional()
  @IsUUID()
  userUuid: string | null;

  @IsUUID()
  ownerUuid: string;

  replacedSessionSecretHash?: string;

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
