import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

import { DatabaseService } from './database.service';
import { GoogleService } from './google.service';
import * as fs from 'fs';


@Injectable()
export class AppService {
  constructor(
    private readonly db: DatabaseService,
    private readonly googleService: GoogleService
  ) {}


  // 1. Obtener listado de clientes reconstruyendo estructura básica
  async getClientsList(userEmail?: string) {
    if (userEmail) {
      const users = await this.db.query('SELECT role FROM users WHERE email = ?', [userEmail]);
      if (users.length > 0 && users[0].role === 'Broker') {
        const clients = await this.db.query(
          'SELECT * FROM clients WHERE created_by = ? ORDER BY updated_at DESC',
          [userEmail]
        );
        return clients.map(c => this.formatClientBasic(c));
      }
    }
    const clients = await this.db.query('SELECT * FROM clients ORDER BY updated_at DESC');
    return clients.map(c => this.formatClientBasic(c));
  }

  // 2. Obtener detalle completo de un cliente (evaluaciones, hitos, documentos, etapas) por ID
  async getClient(id: number, userEmail?: string) {
    const clients = await this.db.query('SELECT * FROM clients WHERE id = ?', [id]);
    
    if (clients.length === 0) {
      throw new NotFoundException(`Expediente con ID ${id} no encontrado`);
    }

    const client = clients[0];

    // Validar si el usuario es Broker y si tiene acceso a este expediente
    if (userEmail) {
      const users = await this.db.query('SELECT role FROM users WHERE email = ?', [userEmail]);
      if (users.length > 0 && users[0].role === 'Broker' && client.created_by !== userEmail) {
        throw new ForbiddenException(`No tienes permisos para acceder a este expediente.`);
      }
    }

    const clientId = client.id;


    // Obtener documentos cargados
    const docs = await this.db.query('SELECT * FROM client_documents WHERE client_id = ?', [clientId]);

    // Obtener evaluaciones bancarias / mutuarias
    const evals = await this.db.query('SELECT * FROM evaluations WHERE client_id = ?', [clientId]);
    
    // Obtener historial de evaluaciones
    let histories = [];
    if (evals.length > 0) {
      const evalIds = evals.map(e => e.id);
      histories = await this.db.query(
        `SELECT * FROM evaluation_history WHERE evaluation_id IN (${evalIds.join(',')})`
      );
    }

    // Obtener hitos (bitácora)
    const milestones = await this.db.query(
      'SELECT * FROM milestones WHERE client_id = ? ORDER BY date DESC',
      [clientId]
    );

    // Obtener historial de transiciones de etapas
    const stagesHistory = await this.db.query(
      'SELECT * FROM client_pipeline_stages WHERE client_id = ? ORDER BY entered_at ASC',
      [clientId]
    );

    return this.assembleClientDetail(client, docs, evals, histories, milestones, stagesHistory);
  }

  // 3. Crear nuevo cliente (permite múltiples carpetas por RUT)
  async createClient(rut: string, body: any) {
    const cleanRut = rut.trim().toLowerCase().replace(/\./g, '');
    const { firstName, lastName, email, phone, address } = body.personalData || body;
    const createdBy = body.createdBy || 'SYSTEM_USER';

    const insertRes = await this.db.query(
      `INSERT INTO clients (rut, first_name, last_name, email, phone, address, pipeline_state, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, 'reserva', ?, ?)`,
      [cleanRut, firstName, lastName, email, phone, address, createdBy, createdBy]
    );

    const clientId = insertRes.insertId;

    // Registrar etapa inicial en client_pipeline_stages
    await this.db.query(
      `INSERT INTO client_pipeline_stages (client_id, stage, entered_at) VALUES (?, 'reserva', NOW())`,
      [clientId]
    );

    return { success: true, id: clientId, rut: cleanRut };
  }

  // 4. Actualizar etapa del pipeline por ID
  async updateClientState(id: number, nextState: string) {
    const clients = await this.db.query('SELECT id, pipeline_state FROM clients WHERE id = ?', [id]);
    if (clients.length === 0) {
      throw new NotFoundException(`Expediente con ID ${id} no encontrado`);
    }

    const clientId = clients[0].id;
    const previousState = clients[0].pipeline_state;

    await this.db.query('UPDATE clients SET pipeline_state = ? WHERE id = ?', [nextState, clientId]);

    // Cerrar etapa anterior
    await this.db.query(
      `UPDATE client_pipeline_stages 
       SET exited_at = NOW(), completed_by = 'Ejecutivo'
       WHERE client_id = ? AND stage = ? AND exited_at IS NULL`,
      [clientId, previousState]
    );

    // Abrir nueva etapa
    await this.db.query(
      `INSERT INTO client_pipeline_stages (client_id, stage, entered_at)
       VALUES (?, ?, NOW())`,
      [clientId, nextState]
    );

    return { success: true };
  }

  // 5. Cargar documento (Multer integration) por ID
  async saveClientDocument(id: number, stage: string, fileType: string, file: any, userEmail?: string) {
    const clients = await this.db.query('SELECT id, first_name, last_name FROM clients WHERE id = ?', [id]);
    if (clients.length === 0) {
      throw new NotFoundException(`Expediente con ID ${id} no encontrado`);
    }

    const client = clients[0];
    const clientId = client.id;
    const clientName = `${client.first_name} ${client.last_name}`.trim();
    const fileUrl = `/uploads/clientes/${id}/${stage}/${file.filename}`;

    let driveFileId: string | null = null;
    let driveWebViewUrl: string | null = null;

    // Si viene el correo del usuario, buscar tokens de Google Drive
    if (userEmail) {
      const users = await this.db.query(
        'SELECT google_access_token, google_refresh_token FROM users WHERE email = ?',
        [userEmail]
      );
      if (users.length > 0 && users[0].google_access_token) {
        const user = users[0];
        try {
          const fileBuffer = fs.readFileSync(file.path);
          const driveResult = await this.googleService.uploadFile(
            clientName,
            file.originalname,
            fileBuffer,
            file.mimetype || 'application/octet-stream',
            {
              access_token: user.google_access_token,
              refresh_token: user.google_refresh_token,
            }
          );
          
          driveFileId = driveResult.driveFileId;
          driveWebViewUrl = driveResult.driveWebViewUrl;
        } catch (driveErr) {
          console.error('Error al subir archivo a Google Drive:', driveErr);
        }
      }
    }

    // Si es un campo único de documento (ej. informeCmf), eliminar el anterior de la base de datos
    const uniqueFields = ['fichaClienteUrl', 'fotoCarnetUrl', 'comprobanteReservaUrl', 'informeCmf', 'cotizacionesAfp', 'certificadoTitulo', 'cotizacionInmobiliariaUrl', 'approvedCreditDocumentUrl', 'promesaFirmadaUrl', 'escrituraFirmadaUrl'];
    
    if (uniqueFields.includes(fileType)) {
      await this.db.query(
        'DELETE FROM client_documents WHERE client_id = ? AND file_type = ?',
        [clientId, fileType]
      );
    }

    await this.db.query(
      `INSERT INTO client_documents (client_id, stage, file_type, file_name, file_url, drive_file_id, drive_web_view_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [clientId, stage, fileType, file.originalname, fileUrl, driveFileId, driveWebViewUrl]
    );

    return { 
      success: true, 
      url: driveWebViewUrl || fileUrl, 
      fileName: file.originalname,
      driveFileId,
      driveWebViewUrl
    };
  }


  // 6. Limpiar carpeta de etapa 2 por ID
  async clearDocumentationStage(id: number) {
    await this.db.query("DELETE FROM client_documents WHERE client_id = ? AND (stage = 'documentacion' OR stage LIKE 'etapa_2_documentacion%')", [id]);
    return { success: true };
  }

  // 7. Cierre/Cancelación de carpeta por ID
  async cancelClientFolder(id: number, body: any) {
    const { reason, stageAtCancelation, canceledBy } = body;

    // Actualizar cliente
    await this.db.query(
      `UPDATE clients 
       SET pipeline_state = 'cancelado', cancelation_reason = ?, cancelation_stage = ?, canceled_at = NOW(), canceled_by = ?
       WHERE id = ?`,
      [reason, stageAtCancelation, canceledBy, id]
    );

    // Cerrar etapa anterior activa
    await this.db.query(
      `UPDATE client_pipeline_stages 
       SET exited_at = NOW(), completed_by = ?
       WHERE client_id = ? AND stage = ? AND exited_at IS NULL`,
      [canceledBy, id, stageAtCancelation]
    );

    // Insertar etapa 'cancelado' como cerrada terminal
    await this.db.query(
      `INSERT INTO client_pipeline_stages (client_id, stage, entered_at, exited_at, completed_by)
       VALUES (?, 'cancelado', NOW(), NOW(), ?)`,
      [id, canceledBy]
    );

    // Agregar hito automático
    await this.addMilestone(id, {
      observation: `EXPEDIENTE DADO DE BAJA. Motivo: ${reason}`,
      registeredBy: canceledBy,
      registeredById: 'mock-uid',
      stage: 'cancelado'
    });

    return { success: true };
  }

  // 8. Crear o actualizar evaluación por ID de expediente
  async setEvaluation(id: number, body: any) {
    const { entityId, entityName, entityType, status } = body;

    // INSERT ... ON DUPLICATE KEY UPDATE
    await this.db.query(
      `INSERT INTO evaluations (client_id, entity_type, entity_id, entity_name, status, response_date)
       VALUES (?, ?, ?, ?, ?, IF(? <> 'pending', NOW(), NULL))
       ON DUPLICATE KEY UPDATE status = VALUES(status), response_date = VALUES(response_date)`,
      [id, entityType, entityId, entityName, status, status]
    );

    return { success: true };
  }

  // 9. Subir documento adicional a evaluación por ID de expediente
  async addEvaluationHistory(id: number, entityId: string, body: any) {
    const { requestedDocName, submittedDocUrl, observation } = body;

    // Buscar la evaluación correspondiente
    const evals = await this.db.query(
      'SELECT id FROM evaluations WHERE client_id = ? AND entity_id = ?',
      [id, entityId]
    );

    if (evals.length === 0) {
      throw new NotFoundException(`Evaluación para ${entityId} no encontrada`);
    }

    const evalId = evals[0].id;

    // Insertar en historial
    await this.db.query(
      `INSERT INTO evaluation_history (evaluation_id, requested_doc_name, submitted_doc_url, observation)
       VALUES (?, ?, ?, ?)`,
      [evalId, requestedDocName, submittedDocUrl, observation || '']
    );

    // Actualizar estado de evaluación a "more_documents"
    await this.db.query('UPDATE evaluations SET status = ? WHERE id = ?', ['more_documents', evalId]);

    return { success: true };
  }

  // 10. Seleccionar aprobador y avanzar etapa por ID de expediente
  async selectApprovedEntity(id: number, body: any) {
    const { approvedByType, approvedEntityId, updatedBy } = body;

    await this.db.query(
      `UPDATE clients 
       SET approval_type = ?, approved_entity_id = ?, approval_date = NOW(), pipeline_state = 'promesa_solicitud', updated_by = ?
       WHERE id = ?`,
      [approvedByType, approvedEntityId, updatedBy, id]
    );

    return { success: true };
  }

  // 11. Agregar hito por ID de expediente
  async addMilestone(id: number, body: any) {
    const { observation, registeredBy, registeredById, stage } = body;

    await this.db.query(
      `INSERT INTO milestones (client_id, observation, registered_by, registered_by_id, stage)
       VALUES (?, ?, ?, ?, ?)`,
      [id, observation, registeredBy, registeredById, stage]
    );

    return { success: true };
  }

  // Helpers de formateo para reconstruir el modelo de Firestore
  private formatClientBasic(c: any) {
    const cancelation = c.cancelation_reason ? {
      reason: c.cancelation_reason,
      stageAtCancelation: c.cancelation_stage,
      canceledAt: this.toTimestamp(c.canceled_at),
      canceledBy: c.canceled_by
    } : undefined;

    return {
      id: c.id, // ID del expediente único (CAP)
      personalData: {
        firstName: c.first_name,
        lastName: c.last_name,
        rut: c.rut,
        email: c.email,
        phone: c.phone,
        address: c.address
      },
      pipelineState: c.pipeline_state,
      createdAt: this.toTimestamp(c.created_at),
      updatedAt: this.toTimestamp(c.updated_at),
      createdBy: c.created_by,
      updatedBy: c.updated_by,
      cancelation
    };
  }

  private assembleClientDetail(c: any, docs: any[], evals: any[], histories: any[], milestones: any[], stagesHistory: any[]) {
    // 1. Formatear la reserva
    const docReserva = docs.filter(d => d.stage === 'reserva' || d.stage === 'etapa_1_reserva');
    const getDocUrl = (type: string) => {
      const fd = docReserva.find(d => d.file_type === type);
      if (!fd) return '';
      return fd.drive_web_view_url || fd.file_url;
    };
    
    const reservaStage = {
      fichaClienteUrl: getDocUrl('fichaClienteUrl'),
      fotoCarnetUrl: getDocUrl('fotoCarnetUrl'),
      comprobanteReservaUrl: getDocUrl('comprobanteReservaUrl'),
      completedAt: this.toTimestamp(c.created_at),
      completedBy: c.created_by
    };

    // 2. Formatear la documentación
    const docAcreditacion = docs.filter(d => d.stage === 'documentacion' || d.stage.startsWith('etapa_2_documentacion'));
    const getDocDetail = (type: string) => {
      const fd = docAcreditacion.find(d => d.file_type === type);
      return fd ? { url: fd.drive_web_view_url || fd.file_url, fileName: fd.file_name, uploadedAt: this.toTimestamp(fd.uploaded_at) } : undefined;
    };

    const liquidaciones = docAcreditacion
      .filter(d => d.file_type === 'liquidacion')
      .map(d => ({
        url: d.drive_web_view_url || d.file_url,
        fileName: d.file_name,
        uploadedAt: this.toTimestamp(d.uploaded_at)
      }));

    const documentacionStage = {
      liquidacionesSueldo: liquidaciones,
      informeCmf: getDocDetail('informeCmf'),
      cotizacionesAfp: getDocDetail('cotizacionesAfp'),
      certificadoTitulo: getDocDetail('certificadoTitulo'),
      semaphoreStatus: liquidaciones.length >= 6 && getDocDetail('informeCmf') && getDocDetail('cotizacionesAfp') ? 'green' : (liquidaciones.length === 0 && !getDocDetail('informeCmf') && !getDocDetail('cotizacionesAfp') ? 'red' : 'yellow')
    };

    // 3. Formatear solicitudes e hitos con mapeo de etapas
    const getStageDocUrl = (stageName: string, type: string) => {
      const stageMappings: Record<string, string[]> = {
        reserva: ['reserva', 'etapa_1_reserva'],
        documentacion: ['documentacion', 'etapa_2_documentacion'],
        promesa_solicitud: ['promesa_solicitud', 'etapa_5_promesa_solicitud'],
        promesa_firma: ['promesa_firma', 'etapa_6_promesa_firma'],
        escritura: ['escritura', 'etapa_8_escritura'],
        cbr: ['cbr', 'etapa_9_cbr'],
        entrega: ['entrega', 'etapa_10_entrega']
      };
      const possibleStages = stageMappings[stageName] || [stageName];
      const fd = docs.find(d => possibleStages.includes(d.stage) && d.file_type === type);
      if (!fd) return '';
      return fd.drive_web_view_url || fd.file_url;
    };
    
    const promesaSolicitud = {
      cotizacionInmobiliariaUrl: getStageDocUrl('promesa_solicitud', 'cotizacionInmobiliariaUrl'),
      approvedCreditDocumentUrl: getStageDocUrl('promesa_solicitud', 'approvedCreditDocumentUrl'),
      sentAt: this.toTimestamp(c.updated_at),
      sentBy: c.updated_by
    };

    const promesaFirma = {
      promesaFirmadaUrl: getStageDocUrl('promesa_firma', 'promesaFirmadaUrl'),
      signedAt: this.toTimestamp(c.updated_at),
      signedBy: c.updated_by
    };

    const escritura = {
      escrituraFirmadaUrl: getStageDocUrl('escritura', 'escrituraFirmadaUrl'),
      signedAt: this.toTimestamp(c.updated_at),
      signedBy: c.updated_by
    };

    const cbr = {
      cbrStatus: docs.find(d => (d.stage === 'cbr' || d.stage === 'etapa_9_cbr'))?.file_name || 'En trámite',
      completedAt: this.toTimestamp(c.updated_at)
    };

    const entrega = {
      notes: docs.find(d => (d.stage === 'entrega' || d.stage === 'etapa_10_entrega'))?.file_name || '',
      deliveredAt: this.toTimestamp(c.updated_at),
      deliveredBy: c.updated_by
    };

    // Aprobador final
    const approvalResolution = c.approval_type ? {
      approvedByType: c.approval_type,
      approvedEntityId: c.approved_entity_id,
      approvalDate: this.toTimestamp(c.approval_date)
    } : undefined;

    // Evaluaciones mapeadas por subcolecciones virtuales
    const mapEval = (e: any) => {
      const subHistory = histories
        .filter(h => h.evaluation_id === e.id)
        .map(h => ({
          requestedDocName: h.requested_doc_name,
          submittedDocUrl: h.submitted_doc_url,
          submittedAt: this.toTimestamp(h.submitted_at),
          observation: h.observation
        }));

      return {
        bankId: e.entity_id,
        bankName: e.entity_name,
        uploadedAt: this.toTimestamp(e.uploaded_at),
        status: e.status,
        responseDate: e.response_date ? this.toTimestamp(e.response_date) : null,
        history: subHistory
      };
    };

    const bankEvalsMapped = evals.filter(e => e.entity_type === 'bank').map(mapEval);
    const mutuariaEvalsMapped = evals.filter(e => e.entity_type === 'mutuaria').map(mapEval);

    // Mapear hitos de bitácora
    const milestonesMapped = milestones.map(m => ({
      date: this.toTimestamp(m.date),
      observation: m.observation,
      registeredBy: m.registered_by,
      registeredById: m.registered_by_id,
      stage: m.stage
    }));

    return {
      id: c.id, // ID del expediente único (CAP)
      clientRut: c.rut,
      client: {
        personalData: {
          firstName: c.first_name,
          lastName: c.last_name,
          rut: c.rut,
          email: c.email,
          phone: c.phone,
          address: c.address
        },
        pipelineState: c.pipeline_state,
        createdAt: this.toTimestamp(c.created_at),
        updatedAt: this.toTimestamp(c.updated_at),
        createdBy: c.created_by,
        updatedBy: c.updated_by,
        stages: {
          reserva: reservaStage,
          documentacion: documentacionStage,
          promesaSolicitud,
          promesaFirma,
          escritura,
          cbr,
          entrega
        },
        approvalResolution,
        cancelation: c.cancelation_reason ? {
          reason: c.cancelation_reason,
          stageAtCancelation: c.cancelation_stage,
          canceledAt: this.toTimestamp(c.canceled_at),
          canceledBy: c.canceled_by
        } : undefined
      },
      bankEvaluations: bankEvalsMapped,
      mutuariaEvaluations: mutuariaEvalsMapped,
      milestones: milestonesMapped,
      stagesHistory: stagesHistory.map(sh => ({
        stage: sh.stage,
        enteredAt: this.toTimestamp(sh.entered_at),
        exitedAt: sh.exited_at ? this.toTimestamp(sh.exited_at) : null,
        completedBy: sh.completed_by
      }))
    };
  }

  // Convertidor de fecha MariaDB a formato Timestamp de Firebase (segundos)
  private toTimestamp(dateStr: any) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return {
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0
    };
  }

  // 12. Obtener resumen analítico
  async getAnalyticsSummary() {
    // 1. Duración promedio creación -> entrega (en segundos)
    const avgCompletionRes = await this.db.query(`
      SELECT AVG(TIMESTAMPDIFF(SECOND, c.created_at, s.entered_at)) as avg_seconds
      FROM clients c
      JOIN client_pipeline_stages s ON c.id = s.client_id
      WHERE s.stage = 'entrega'
    `);
    const avgCompletionSeconds = avgCompletionRes[0]?.avg_seconds ? parseFloat(avgCompletionRes[0].avg_seconds) : null;

    // 2. Conteo de cierres/bajas por etapa y entregas
    const cancellations = await this.db.query(`
      SELECT cancelation_stage as stage, COUNT(*) as count
      FROM clients
      WHERE pipeline_state = 'cancelado' AND cancelation_stage IS NOT NULL
      GROUP BY cancelation_stage
    `);

    const deliveriesRes = await this.db.query(`
      SELECT COUNT(*) as count
      FROM clients
      WHERE pipeline_state = 'entrega'
    `);
    const deliveriesCount = deliveriesRes[0]?.count || 0;

    // Combinar cierres y entregas
    const stageClosures = cancellations.map((c: any) => ({
      stage: c.stage,
      count: parseInt(c.count, 10),
      type: 'cancelado'
    }));
    if (deliveriesCount > 0) {
      stageClosures.push({
        stage: 'entrega',
        count: parseInt(deliveriesCount, 10),
        type: 'entregado'
      });
    }

    // 3. Demora promedio por etapa
    const stageDurations = await this.db.query(`
      SELECT stage, AVG(TIMESTAMPDIFF(SECOND, entered_at, exited_at)) as avg_seconds, COUNT(*) as count
      FROM client_pipeline_stages
      WHERE exited_at IS NOT NULL
      GROUP BY stage
      ORDER BY avg_seconds DESC
    `);
    const avgStageDurations = stageDurations.map((s: any) => ({
      stage: s.stage,
      avgSeconds: parseFloat(s.avg_seconds),
      count: parseInt(s.count, 10)
    }));

    return {
      avgCompletionSeconds,
      stageClosures,
      avgStageDurations
    };
  }

  // Métodos auxiliares para manejo de usuarios
  async getUserByEmail(email: string) {
    return this.db.query('SELECT * FROM users WHERE email = ?', [email]);
  }

  async createUser(user: {
    email: string;
    name: string;
    picture: string;
    role: string;
    googleId: string;
    accessToken: string | null;
    refreshToken: string | null;
    expiryDate: Date | null;
  }) {
    return this.db.query(
      `INSERT INTO users (email, name, picture, role, google_id, google_access_token, google_refresh_token, google_token_expiry)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.email,
        user.name,
        user.picture,
        user.role,
        user.googleId,
        user.accessToken,
        user.refreshToken,
        user.expiryDate
      ]
    );
  }

  async updateUserTokens(email: string, updates: {
    name: string;
    picture: string;
    googleId: string;
    accessToken: string | null;
    refreshToken: string | null;
    expiryDate: Date | null;
  }) {
    // Si los tokens de Google son nulos, no sobreescribir si ya existían (mantener sesión de Drive si fue mock/login local)
    if (updates.accessToken) {
      return this.db.query(
        `UPDATE users 
         SET name = ?, picture = ?, google_id = ?, google_access_token = ?, google_refresh_token = ?, google_token_expiry = ?
         WHERE email = ?`,
        [
          updates.name,
          updates.picture,
          updates.googleId,
          updates.accessToken,
          updates.refreshToken,
          updates.expiryDate,
          email
        ]
      );
    } else {
      return this.db.query(
        `UPDATE users 
         SET name = ?, picture = ?
         WHERE email = ?`,
        [updates.name, updates.picture, email]
      );
    }
  }

  async updateUserRole(email: string, role: string) {
    return this.db.query('UPDATE users SET role = ? WHERE email = ?', [role, email]);
  }

  async getUserRole(email: string): Promise<string | null> {
    const users = await this.getUserByEmail(email);
    return users.length > 0 ? users[0].role : null;
  }
}

