import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class GoogleAdsAuthService {
  private oauth2Client;

  constructor(private readonly config: ConfigService) {
    this.oauth2Client = new google.auth.OAuth2(
      this.config.get('GOOGLE_CLIENT_ID'),
      this.config.get('GOOGLE_CLIENT_SECRET'),
      this.config.get('GOOGLE_REDIRECT_URI') || 'http://localhost:3000/api/v1/integrations/google-ads/callback',
    );
  }

  getAuthUrl(): string {
    const scopes = ['https://www.googleapis.com/auth/adwords'];
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  async getTokensFromCode(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      throw new BadRequestException('Invalid authorization code');
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      throw new BadRequestException('Failed to refresh access token');
    }
  }
}

