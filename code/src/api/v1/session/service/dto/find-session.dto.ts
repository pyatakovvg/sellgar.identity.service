import { IsString } from 'class-validator';

export class FindSessionDto {
  @IsString()
  userUuid: string;

  @IsString()
  fingerprint: string;
}
