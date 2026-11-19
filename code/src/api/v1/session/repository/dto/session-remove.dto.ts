import { IsOptional, IsString, IsUUID } from 'class-validator';

export class SessionRemoveDto {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @IsString()
  @IsOptional()
  userUuid?: string;

  @IsString()
  @IsOptional()
  fingerprintHash?: string;

  @IsString()
  @IsOptional()
  secretHash?: string;

  @IsString()
  @IsOptional()
  clientType?: string;

  @IsString()
  @IsOptional()
  gateway?: string;

  @IsString()
  @IsOptional()
  revokeReason?: string;
}
