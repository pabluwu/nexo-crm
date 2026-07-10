import { Controller, Get, Query, Res, BadRequestException } from '@nestjs/common';
import { AppService } from './app.service';
import { GoogleService } from './google.service';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly appService: AppService,
    private readonly googleService: GoogleService
  ) {}

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Res() res: Response
  ) {
    if (!code) {
      throw new BadRequestException('El código de autorización es requerido');
    }

    try {
      // Intercambiar código usando el redirect_uri exacto
      const tokens = await this.googleService.getTokensFromCodeWithUri(code, 'http://localhost:3000/auth/google/callback');
      const accessToken = tokens.access_token || null;
      const refreshToken = tokens.refresh_token || null;
      const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

      if (!accessToken) {
        throw new Error('No se obtuvo el access_token de Google');
      }

      // Obtener información del perfil
      const profile = (await this.googleService.getUserInfo(accessToken)) as any;
      const userEmail = profile.email;
      const userName = profile.name || 'Usuario NexoProp';
      const userPicture = profile.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop';
      const googleId = profile.id || profile.sub || '';

      if (!userEmail) {
        throw new Error('No se pudo obtener el correo de Google');
      }

      // Buscar o crear usuario en base de datos
      const users = await this.appService.getUserByEmail(userEmail);
      let user = users.length > 0 ? users[0] : null;

      if (!user) {
        const role = 'Broker';
        await this.appService.createUser({
          email: userEmail,
          name: userName,
          picture: userPicture,
          role,
          googleId,
          accessToken,
          refreshToken,
          expiryDate
        });
        user = { email: userEmail, name: userName, picture: userPicture, role };
      } else {
        await this.appService.updateUserTokens(userEmail, {
          name: userName,
          picture: userPicture,
          googleId,
          accessToken,
          refreshToken,
          expiryDate
        });
        const updatedUsers = await this.appService.getUserByEmail(userEmail);
        user = updatedUsers[0];
      }

      // Redireccionar al frontend local
      const frontendUrl = 'http://localhost:5173';
      const userStr = Buffer.from(JSON.stringify(user)).toString('base64');
      
      return res.redirect(`${frontendUrl}/login?session=${userStr}`);
    } catch (err: any) {
      console.error('Error en callback de autenticación Google:', err);
      return res.redirect(`http://localhost:5173/login?error=${encodeURIComponent(err.message || 'Error desconocido')}`);
    }
  }
}
