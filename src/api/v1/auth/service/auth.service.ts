import { Injectable } from '@nestjs/common';

import { AuthRepository } from '../repository/auth.repository';

@Injectable()
export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  login(login: string, password: string) {
    return this.authRepository.login(login, password);
  }
}
