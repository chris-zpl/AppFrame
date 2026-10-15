import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const options: any = {
      prompt: 'select_account',
      accessType: 'offline',
    };
    if (req.query?.state) {
      options.state = req.query.state;
    }
    return options;
  }
}

