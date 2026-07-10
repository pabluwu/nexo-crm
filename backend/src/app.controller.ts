import { 
  Controller, Get, Post, Put, Delete, Body, Param, Query, Headers,
  UseInterceptors, UploadedFile, BadRequestException, ForbiddenException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { AppService } from './app.service';
import { GoogleService } from './google.service';


@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly googleService: GoogleService
  ) {}


  // Obtener configuraciones del cliente dinámicamente en producción
  @Get('config')
  getConfig() {
    return {
      googleClientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
    };
  }


  // 1. Obtener listado de clientes
  @Get('clients')
  async getClients(@Headers('x-user-email') userEmail: string) {
    return this.appService.getClientsList(userEmail);
  }

  // 1.5. Obtener resumen de métricas analíticas
  @Get('analytics/summary')
  async getAnalyticsSummary(@Headers('x-user-email') userEmail: string) {
    if (userEmail) {
      const role = await this.appService.getUserRole(userEmail);
      if (role === 'Broker') {
        throw new ForbiddenException('Los Brokers no tienen acceso al panel de analíticas.');
      }
    }
    return this.appService.getAnalyticsSummary();
  }

  // 2. Crear nuevo cliente
  @Post('clients')
  async createClient(@Body() body: any, @Headers('x-user-email') userEmail: string) {
    const rut = body.personalData?.rut || body.rut;
    if (!rut) throw new BadRequestException('El RUT del cliente es obligatorio');
    if (userEmail) {
      body.createdBy = userEmail;
    }
    return this.appService.createClient(rut, body);
  }

  // 3. Obtener detalle de cliente por ID
  @Get('clients/:id')
  async getClient(@Param('id') id: string, @Headers('x-user-email') userEmail: string) {
    return this.appService.getClient(parseInt(id, 10), userEmail);
  }

  // 4. Actualizar etapa del pipeline
  @Put('clients/:id/state')
  async updateState(@Param('id') id: string, @Body('pipelineState') pipelineState: string) {
    if (!pipelineState) throw new BadRequestException('El estado pipelineState es requerido');
    return this.appService.updateClientState(parseInt(id, 10), pipelineState);
  }

  // 5. Cargar archivo (con Multer)
  @Post('clients/:id/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const id = req.params.id as string;
        const stage = (req.query.stage as string) || 'general';
        // Subidas/clientes/{id}/{stage}
        const uploadPath = join(__dirname, '..', 'uploads', 'clientes', id, stage);
        
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    })
  }))
  async uploadFile(
    @Param('id') id: string,
    @Query('stage') stage: string,
    @Query('fileType') fileType: string,
    @Headers('x-user-email') userEmail: string,
    @UploadedFile() file: any
  ) {
    if (!file) throw new BadRequestException('No se ha adjuntado ningún archivo.');
    if (!stage || !fileType) throw new BadRequestException('Los parámetros stage y fileType son requeridos.');
    
    return this.appService.saveClientDocument(parseInt(id, 10), stage, fileType, file, userEmail);
  }


  // 6. Limpiar etapa de documentación
  @Delete('clients/:id/documentation/clear')
  async clearDocumentation(@Param('id') id: string) {
    return this.appService.clearDocumentationStage(parseInt(id, 10));
  }

  // 7. Cierre / Cancelación de expediente
  @Post('clients/:id/cancel')
  async cancelFolder(@Param('id') id: string, @Body() body: any) {
    return this.appService.cancelClientFolder(parseInt(id, 10), body);
  }

  // 8. Crear/Actualizar evaluación de crédito
  @Post('clients/:id/evaluations')
  async setEvaluation(@Param('id') id: string, @Body() body: any) {
    return this.appService.setEvaluation(parseInt(id, 10), body);
  }

  // 9. Cargar documento adicional a evaluación
  @Post('clients/:id/evaluations/:entityId/history')
  async addEvaluationHistory(
    @Param('id') id: string,
    @Param('entityId') entityId: string,
    @Body() body: any
  ) {
    return this.appService.addEvaluationHistory(parseInt(id, 10), entityId, body);
  }

  // 10. Designar aprobador y avanzar
  @Post('clients/:id/evaluations/approve')
  async approveCredit(@Param('id') id: string, @Body() body: any) {
    return this.appService.selectApprovedEntity(parseInt(id, 10), body);
  }

  // 11. Agregar hito
  @Post('clients/:id/milestones')
  async addMilestone(@Param('id') id: string, @Body() body: any) {
    return this.appService.addMilestone(parseInt(id, 10), body);
  }

  // 12. Login/Autenticación con Google OAuth 2.0 (Gmail / Mock)
  @Post('auth/google')
  async authGoogle(@Body() body: any) {
    const { code, isMock, email, name, picture } = body;

    let userEmail = email;
    let userName = name || 'Usuario NexoProp';
    let userPicture = picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop';
    let googleId = '';
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let expiryDate: Date | null = null;

    if (isMock || !this.googleService.isConfigured()) {
      // Login simulado (fines de prueba local)
      if (!userEmail) {
        throw new BadRequestException('El correo es requerido para el login simulado');
      }
    } else {
      // Login real intercambiando el código de autorización
      if (!code) {
        throw new BadRequestException('El código de autorización es requerido');
      }
      try {
        const tokens = await this.googleService.getTokensFromCode(code);
        accessToken = tokens.access_token || null;
        refreshToken = tokens.refresh_token || null;
        expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

        if (accessToken) {
          const profile = (await this.googleService.getUserInfo(accessToken)) as any;
          userEmail = profile.email;
          userName = profile.name || userName;
          userPicture = profile.picture || userPicture;
          googleId = profile.id || profile.sub || '';
        }
      } catch (err) {
        console.error('Error en Google OAuth:', err);
        throw new BadRequestException('Error al autenticar con Google: ' + err.message);
      }
    }

    if (!userEmail) {
      throw new BadRequestException('No se pudo obtener el correo de Google');
    }

    // Buscar o crear usuario en la base de datos
    const users = await this.appService.getUserByEmail(userEmail);
    let user = users.length > 0 ? users[0] : null;

    if (!user) {
      // Determinar el rol por defecto
      const role = 'Broker';
      
      await this.appService.createUser({
        email: userEmail,
        name: userName,
        picture: userPicture,
        role: role,
        googleId,
        accessToken,
        refreshToken,
        expiryDate
      });

      user = { email: userEmail, name: userName, picture: userPicture, role };
    } else {
      // Actualizar tokens y perfil
      await this.appService.updateUserTokens(userEmail, {
        name: userName,
        picture: userPicture,
        googleId,
        accessToken,
        refreshToken,
        expiryDate
      });
      // Volver a obtener el perfil con el rol guardado en la base de datos
      const updatedUsers = await this.appService.getUserByEmail(userEmail);
      user = updatedUsers[0];
    }

    return { success: true, user };
  }

  // 13. Cambiar rol de usuario autenticado (fines de prueba/demo en el portal)
  @Post('auth/role')
  async changeRole(@Body() body: any) {
    const { email, role } = body;
    if (!email || !role) throw new BadRequestException('Email y rol son obligatorios');
    if (role !== 'Broker' && role !== 'Administrador') {
      throw new BadRequestException('Rol no válido');
    }
    await this.appService.updateUserRole(email, role);
    return { success: true, role };
  }
}

