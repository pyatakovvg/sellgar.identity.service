import { IsUUID, IsString, IsOptional } from 'class-validator';

export class SessionHasDto {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @IsUUID()
  @IsOptional()
  userUuid?: string;

  @IsString()
  @IsOptional()
  device?: string;

  @IsString()
  fingerprint: string;
}
