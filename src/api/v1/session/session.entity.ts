import { IsUUID, IsString, IsBoolean, IsDate, IsOptional } from 'class-validator';

export class SessionEntity {
  @IsUUID()
  uuid: string;

  @IsUUID()
  userUuid: string;

  @IsString()
  device: string;

  @IsString()
  fingerprintHash: string;

  @IsString()
  @IsOptional()
  sessionSecret?: string;

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

  @IsString()
  status: string;

  @IsBoolean()
  isRevoked: boolean;

  @IsDate()
  renewRequiredAt: Date;

  @IsDate()
  expiresAt: Date;

  @IsOptional()
  @IsDate()
  revokedAt?: Date;

  @IsOptional()
  @IsString()
  revokeReason?: string;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}
