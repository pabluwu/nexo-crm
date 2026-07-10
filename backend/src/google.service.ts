import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { Readable } from 'stream';

@Injectable()
export class GoogleService {
  private clientId = process.env.GOOGLE_CLIENT_ID;
  private clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  private redirectUri = 'postmessage'; // Standard para GIS popup code flow

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  // Obtener cliente OAuth2
  private getOAuth2Client(tokens?: { access_token?: string; refresh_token?: string }) {
    if (!this.isConfigured()) {
      return null;
    }
    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
    if (tokens) {
      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });
    }
    return oauth2Client;
  }

  // Intercambiar código de autorización por tokens
  async getTokensFromCode(code: string) {
    if (!this.isConfigured()) {
      // Mock tokens para desarrollo
      return {
        access_token: 'mock-access-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
        expiry_date: Date.now() + 3600 * 1000,
      };
    }

    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }

  // Intercambiar código usando una URI de redirección específica
  async getTokensFromCodeWithUri(code: string, redirectUri: string) {
    if (!this.isConfigured()) {
      return {
        access_token: 'mock-access-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
        expiry_date: Date.now() + 3600 * 1000,
      };
    }

    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      redirectUri
    );
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  }


  // Obtener perfil del usuario desde Google
  async getUserInfo(accessToken: string, code?: string) {
    if (!this.isConfigured()) {
      // Si estamos en modo simulado, mockeamos la respuesta usando datos de demo
      const email = code === 'mock_admin_code' ? 'admin@nexoprop.com' : 'broker@nexoprop.com';
      const name = code === 'mock_admin_code' ? 'Administrador NexoProp' : 'Juan Broker';
      return {
        email,
        name,
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop',
        sub: 'mock-google-id-' + email,
      };
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return data;
  }

  // Crear o buscar carpeta NexoProp y una subcarpeta para el cliente
  async getOrCreateClientFolder(driveClient: any, clientName: string): Promise<string> {
    try {
      // 1. Buscar o crear carpeta principal "NexoProp CRM"
      let rootFolderId = '';
      const rootSearch = await driveClient.files.list({
        q: "name = 'NexoProp CRM' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id)',
        spaces: 'drive',
      });

      if (rootSearch.data.files && rootSearch.data.files.length > 0) {
        rootFolderId = rootSearch.data.files[0].id;
      } else {
        const rootMetadata = {
          name: 'NexoProp CRM',
          mimeType: 'application/vnd.google-apps.folder',
        };
        const rootFolder = await driveClient.files.create({
          resource: rootMetadata,
          fields: 'id',
        });
        rootFolderId = rootFolder.data.id;
      }

      // 2. Buscar o crear subcarpeta para el cliente dentro de "NexoProp CRM"
      let clientFolderId = '';
      const clientFolderSearch = await driveClient.files.list({
        q: `name = '${clientName}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
        spaces: 'drive',
      });

      if (clientFolderSearch.data.files && clientFolderSearch.data.files.length > 0) {
        clientFolderId = clientFolderSearch.data.files[0].id;
      } else {
        const clientMetadata = {
          name: clientName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId],
        };
        const clientFolder = await driveClient.files.create({
          resource: clientMetadata,
          fields: 'id',
        });
        clientFolderId = clientFolder.data.id;
      }

      return clientFolderId;
    } catch (err) {
      console.error('Error creando/buscando carpetas en Drive:', err);
      throw err;
    }
  }

  // Cargar archivo en Google Drive
  async uploadFile(
    clientName: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string,
    tokens: { access_token: string; refresh_token: string }
  ) {
    if (!this.isConfigured()) {
      // Retornar link simulado en modo de pruebas local
      const mockId = 'mock-drive-id-' + Math.random().toString(36).substring(7);
      return {
        driveFileId: mockId,
        driveWebViewUrl: `https://drive.google.com/file/d/${mockId}/view?usp=drivesdk`,
      };
    }

    try {
      const oauth2Client = this.getOAuth2Client(tokens);
      const drive = google.drive({ version: 'v3', auth: oauth2Client });

      // 1. Obtener la carpeta del cliente
      const folderId = await this.getOrCreateClientFolder(drive, clientName);

      // 2. Subir el archivo dentro de esa carpeta
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };
      
      const media = {
        mimeType: mimeType,
        body: Readable.from(fileBuffer),
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
      });

      // 3. Hacer el archivo visible mediante lectura rápida para cualquiera con el link (opcional, para visualización directa)
      try {
        await drive.permissions.create({
          fileId: file.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      } catch (permError) {
        console.warn('No se pudo establecer permisos públicos al archivo en Drive:', permError);
      }

      return {
        driveFileId: file.data.id,
        driveWebViewUrl: file.data.webViewLink,
      };
    } catch (err) {
      console.error('Error al subir archivo a Google Drive:', err);
      // Retornar error controlado
      return {
        driveFileId: null,
        driveWebViewUrl: null,
      };
    }
  }
}
