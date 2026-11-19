import { IsUUID } from 'class-validator';

import { SessionCreateDto } from './session-create.dto';

export class SessionUpdateDto extends SessionCreateDto {
  @IsUUID()
  uuid: string;
}
