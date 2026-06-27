import { IsUUID } from 'class-validator';

export class GenerateAccessTokenDto {
  @IsUUID()
  uuid: string;

  @IsUUID()
  userUuid: string;
}
