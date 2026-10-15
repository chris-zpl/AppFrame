import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const clientId = configService.get<string>('GOOGLE_CLIENT_ID') || 'dummy-google-client-id';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || 'dummy-google-client-secret';
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/api/v1/auth/google/callback';

    super({
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: callbackURL,
      scope: ['email', 'profile'],
    });
  }

  authorizationParams(options: any): any {
    const params: any = {
      prompt: 'select_account',
      access_type: 'offline',
    };
    if (options.prompt) params.prompt = options.prompt;
    if (options.loginHint) params.login_hint = options.loginHint;
    if (options.state) params.state = options.state;
    return params;
  }


  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, displayName, emails } = profile;
    const user: GoogleProfile = {
      googleId: id,
      email: emails && emails[0] ? emails[0].value : '',
      name: displayName || 'Usuário Google',
    };
    done(null, user);
  }
}
