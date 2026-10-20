import { ExecutionContext, Injectable, Optional } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(@Optional() private readonly authService?: AuthService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const options: any = {
      prompt: 'select_account',
      accessType: 'offline',
    };
    if (req.query?.state) {
      options.state = req.query.state;
    } else {
      const rememberMe = req.query?.rememberMe === 'true';
      if (this.authService) {
        options.state = this.authService.signGoogleLoginState(rememberMe);
      } else {
        options.state = JSON.stringify({ purpose: 'google_login', rememberMe });
      }
    }
    return options;
  }
}

