import { IsUUID } from 'class-validator';

export class CheckSessionDto {
  @IsUUID()
  sessionUuid: string;
}
