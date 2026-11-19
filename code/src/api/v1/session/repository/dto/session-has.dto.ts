import { IsUUID, IsString, IsOptional } from 'class-validator';

export class SessionHasDto {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @IsString()
  @IsOptional()
  secretHash?: string;

  @IsUUID()
  @IsOptional()
  userUuid?: string;

  @IsString()
  @IsOptional()
  device?: string;

  @IsString()
  @IsOptional()
  fingerprintHash?: string;

  @IsString()
  @IsOptional()
  clientType?: string;

  @IsString()
  @IsOptional()
  gateway?: string;
}
