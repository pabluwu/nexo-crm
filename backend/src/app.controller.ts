import { 
  Controller, Get, Post, Put, Delete, Body, Param, Query, 
  UseInterceptors, UploadedFile, BadRequestException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { AppService } from './app.service';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  // 1. Obtener listado de clientes
  @Get('clients')
  async getClients() {
    return this.appService.getClientsList();
  }

  // 1.5. Obtener resumen de métricas analíticas
  @Get('analytics/summary')
  async getAnalyticsSummary() {
    return this.appService.getAnalyticsSummary();
  }

  // 2. Crear nuevo cliente
  @Post('clients')
  async createClient(@Body() body: any) {
    const rut = body.personalData?.rut || body.rut;
    if (!rut) throw new BadRequestException('El RUT del cliente es obligatorio');
    return this.appService.createClient(rut, body);
  }

  // 3. Obtener detalle de cliente por ID
  @Get('clients/:id')
  async getClient(@Param('id') id: string) {
    return this.appService.getClient(parseInt(id, 10));
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
    @UploadedFile() file: any
  ) {
    if (!file) throw new BadRequestException('No se ha adjuntado ningún archivo.');
    if (!stage || !fileType) throw new BadRequestException('Los parámetros stage y fileType son requeridos.');
    
    return this.appService.saveClientDocument(parseInt(id, 10), stage, fileType, file);
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
}
