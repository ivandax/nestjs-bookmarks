import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  signup() {
    return 'sign up from service!';
  }

  login() {
    return 'login from service!';
  }
}