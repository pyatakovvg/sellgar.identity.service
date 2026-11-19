import { RemoveSessionDto } from './dto/remove-session.dto';
import { VerifySessionDto } from './dto/verify-session.dto';
import { RenewSessionDto } from './dto/renew-session.dto';
import { SessionCreateDto } from '../service/dto/session-create.dto';

export abstract class SessionControllerInterface {
  abstract issue(dto: SessionCreateDto);
  abstract verify(dto: VerifySessionDto);
  abstract renew(dto: RenewSessionDto);
  abstract revoke(dto: RemoveSessionDto);
}
