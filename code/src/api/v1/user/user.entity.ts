import { IsUUID, IsString, IsDate, IsBoolean } from 'class-validator';

export class UserEntity {
  @IsUUID()
  uuid: string;

  @IsString()
  login: string;

  @IsBoolean()
  isBlocked: boolean;

  roles: any[];

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}
