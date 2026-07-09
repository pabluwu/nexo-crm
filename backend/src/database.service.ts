import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: mysql.Pool;

  async onModuleInit() {
    console.log('Initializing MariaDB Connection Pool...');
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'nexopropuser',
      password: process.env.DB_PASSWORD || 'nexoproppassword',
      database: process.env.DB_NAME || 'nexoprop',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    
    // Probar conexión básica
    try {
      const conn = await this.pool.getConnection();
      console.log('Successfully connected to MariaDB!');
      conn.release();
    } catch (err) {
      console.error('Failed to connect to MariaDB. Check configurations.', err);
    }
  }

  async onModuleDestroy() {
    console.log('Closing MariaDB Connection Pool...');
    await this.pool.end();
  }

  // Método auxiliar para realizar consultas SQL
  async query<T = any>(sql: string, params?: any[]): Promise<T> {
    const [results] = await this.pool.execute(sql, params);
    return results as T;
  }
}
