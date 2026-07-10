import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  const corsOrigins = process.env.CORS_ORIGINS || '*';
  const parsedOrigins = corsOrigins.includes(',') 
    ? corsOrigins.split(',').map(o => o.trim()) 
    : corsOrigins;

  // Habilitar CORS para que el frontend pueda consumir la API
  app.enableCors({
    origin: parsedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Asegurar que exista la carpeta uploads/clientes
  const uploadDir = join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Servir archivos estáticos subidos desde la ruta /uploads
  app.use('/uploads', express.static(uploadDir));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`NexoProp API running on: http://localhost:${port}`);
}
bootstrap();
