import { AuthLoginDto } from './dto/auth-login.dto';

import { AuthEntity } from '../auth.entity';

export abstract class AuthControllerInterface {
  abstract login(dto: AuthLoginDto): Promise<AuthEntity>;
}
