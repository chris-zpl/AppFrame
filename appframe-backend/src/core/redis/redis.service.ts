import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  // Fallback em memória para ambientes de testes unitários ou caso o Redis esteja temporariamente indisponível
  private inMemoryFallback = new Map<string, { value: string; expiresAt?: number }>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;

    try {
      this.client = new Redis({
        host,
        port,
        password,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn(`Tentativas de reconexão ao Redis esgotadas (${times}). Usando modo resiliente.`);
            return null;
          }
          return Math.min(times * 500, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Conectado ao Redis em ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Alerta de conexão Redis (${host}:${port}): ${err.message}. Operações chave/valor usarão fallback seguro.`);
      });

      await this.client.connect().catch((err) => {
        this.logger.warn(`Conexão inicial com Redis em ${host}:${port} não concluída: ${err.message}. Ativando fallback em memória.`);
      });
    } catch (err: any) {
      this.logger.warn(`Falha ao instanciar cliente Redis: ${err.message}. Ativando fallback em memória.`);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {}
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch (err: any) {
        this.logger.warn(`Erro no Redis GET ${key}: ${err.message}. Consultando fallback.`);
      }
    }

    const item = this.inMemoryFallback.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.inMemoryFallback.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: 'EX', ttlSeconds?: number): Promise<'OK'> {
    if (this.isConnected && this.client) {
      try {
        if (mode === 'EX' && ttlSeconds) {
          await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return 'OK';
      } catch (err: any) {
        this.logger.warn(`Erro no Redis SET ${key}: ${err.message}. Gravando no fallback.`);
      }
    }

    const expiresAt = mode === 'EX' && ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.inMemoryFallback.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    let deletedCount = 0;
    if (this.isConnected && this.client) {
      try {
        deletedCount = await this.client.del(key);
      } catch (err: any) {
        this.logger.warn(`Erro no Redis DEL ${key}: ${err.message}. Removendo do fallback.`);
      }
    }

    if (this.inMemoryFallback.delete(key)) {
      deletedCount = Math.max(deletedCount, 1);
    }
    return deletedCount;
  }
}
