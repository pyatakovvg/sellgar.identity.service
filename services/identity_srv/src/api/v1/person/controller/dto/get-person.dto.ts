import { IsUUID, IsOptional } from 'class-validator';

export class GetPersonDto {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @IsUUID()
  @IsOptional()
  userUuid?: string;
}
