import { CreateSessionDto } from './dto/create-session.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { RestoreSessionDto } from './dto/restore-session.dto';
import { RemoveSessionDto } from './dto/remove-session.dto';

import { SessionEntity } from '../session.entity';

export abstract class SessionControllerInterface {
  abstract create(dto: CreateSessionDto): Promise<SessionEntity>;
  abstract refresh(dto: RefreshSessionDto): Promise<SessionEntity>;
  abstract restore(dto: RestoreSessionDto): Promise<SessionEntity>;
  abstract remove(dto: RemoveSessionDto): Promise<SessionEntity>;
}
