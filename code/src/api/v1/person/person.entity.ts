import { IsUUID, IsString, IsDate } from 'class-validator';

import { SexEnum } from './person.model';

export class PersonEntity {
  @IsUUID()
  uuid: string;

  @IsString()
  name: string;

  @IsString()
  surname: string;

  @IsString()
  patronymic: string;

  @IsDate()
  birthday: Date;

  @IsString()
  sex: SexEnum;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}
