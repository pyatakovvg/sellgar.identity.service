import { IsUUID, IsString } from 'class-validator';

export class SessionRemoveDto {
  @IsUUID()
  uuid: string;

  @IsString()
  userUuid: string;

  @IsString()
  fingerprint: string;
}
