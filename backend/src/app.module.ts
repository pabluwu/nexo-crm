import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { AppController } from './app.controller';
import { AuthController } from './auth.controller';
import { AppService } from './app.service';
import { GoogleService } from './google.service';

@Module({
  imports: [],
  controllers: [AppController, AuthController],
  providers: [DatabaseService, AppService, GoogleService],
})
export class AppModule {}


