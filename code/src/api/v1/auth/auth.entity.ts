import { IsUUID } from 'class-validator';

export class AuthEntity {
  @IsUUID()
  uuid: string;
}
