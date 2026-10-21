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
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.configService.get('REDIS_PORT', 6379));
    const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;

    this.cleanupTimer = setInterval(() => {
      this.evictExpiredMemoryKeys();
    }, 5 * 60 * 1000);
    this.cleanupTimer.unref?.();

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

      this.client.on('ready', () => {
        this.isConnected = true;
        this.logger.log(`Conectado ao Redis em ${host}:${port}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        this.isConnected = false;
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Alerta de conexão Redis (${host}:${port}): ${err.message}. Operações chave/valor usarão fallback seguro.`);
      });

      await this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`Conexão inicial com Redis em ${host}:${port} não concluída: ${err.message}. Ativando fallback em memória.`);
      });
    } catch (err: any) {
      this.logger.warn(`Falha ao instanciar cliente Redis: ${err.message}. Ativando fallback em memória.`);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
  }

  private evictExpiredMemoryKeys(): void {
    const now = Date.now();
    for (const [key, item] of this.inMemoryFallback.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.inMemoryFallback.delete(key);
      }
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

  async set(key: string, value: string, mode?: 'EX' | 'PX', duration?: number): Promise<'OK'> {
    if (this.isConnected && this.client) {
      try {
        if (mode === 'EX' && duration) {
          await this.client.set(key, value, 'EX', duration);
        } else if (mode === 'PX' && duration) {
          await this.client.set(key, value, 'PX', duration);
        } else {
          await this.client.set(key, value);
        }
        return 'OK';
      } catch (err: any) {
        this.logger.warn(`Erro no Redis SET ${key}: ${err.message}. Gravando no fallback.`);
      }
    }

    let expiresAt: number | undefined;
    if (mode === 'EX' && duration) {
      expiresAt = Date.now() + duration * 1000;
    } else if (mode === 'PX' && duration) {
      expiresAt = Date.now() + duration;
    }

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
