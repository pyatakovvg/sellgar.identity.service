import { IsString, IsUUID } from 'class-validator';

export class RemoveSessionDto {
  @IsUUID()
  uuid: string;

  @IsString()
  userUuid: string;

  @IsString()
  fingerprint: string;
}
