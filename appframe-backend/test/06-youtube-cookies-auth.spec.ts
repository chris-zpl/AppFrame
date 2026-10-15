import { ConfigService } from '@nestjs/config';
import { DownloadService } from '../src/modules/media/services/download.service';
import * as fs from 'fs';
import * as path from 'path';

describe('6. Gestão de Cookies e Autenticação do YouTube (DownloadService)', () => {
  let service: DownloadService;
  const testStorageDir = path.resolve(process.cwd(), 'storage');
  const testCookiesPath = path.resolve(testStorageDir, 'cookies.txt');

  const configServiceMock = {
    get: jest.fn((key: string, def?: any) => {
      if (key === 'YTDLP_PATH') return 'yt-dlp';
      if (key === 'TEMP_DIR') return 'storage/temp';
      return def;
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    service = new DownloadService(configServiceMock);
  });

  afterEach(() => {
    if (fs.existsSync(testCookiesPath)) {
      try {
        fs.unlinkSync(testCookiesPath);
      } catch {}
    }
  });

  it('deve salvar cookies no formato Netscape com permissões e cabeçalho adequado', () => {
    const rawNetscape = '.youtube.com\tTRUE\t/\tTRUE\t1800000000\tLOGIN_INFO\tafsdf123';
    const res = service.saveCookies(rawNetscape);

    expect(res.success).toBe(true);
    expect(fs.existsSync(testCookiesPath)).toBe(true);

    const savedContent = fs.readFileSync(testCookiesPath, 'utf-8');
    expect(savedContent).toContain('# Netscape HTTP Cookie File');
    expect(savedContent).toContain('.youtube.com\tTRUE\t/\tTRUE\t1800000000\tLOGIN_INFO\tafsdf123');

    const status = service.getCookiesStatus();
    expect(status.configured).toBe(true);
    expect(status.path).toBe(testCookiesPath);
    expect(status.updatedAt).toBeDefined();
  });

  it('deve converter automaticamente cookies colados em formato JSON para formato Netscape', () => {
    const jsonCookies = JSON.stringify([
      {
        domain: '.youtube.com',
        name: 'LOGIN_INFO',
        value: 'json_token_value',
        secure: true,
        expirationDate: 1900000000,
      },
      {
        domain: '.youtube.com',
        name: 'SAPISID',
        value: 'sapisid_value',
        secure: true,
      },
    ]);

    const res = service.saveCookies(jsonCookies);
    expect(res.success).toBe(true);

    const savedContent = fs.readFileSync(testCookiesPath, 'utf-8');
    expect(savedContent).toContain('# Netscape HTTP Cookie File');
    expect(savedContent).toContain('LOGIN_INFO\tjson_token_value');
    expect(savedContent).toContain('SAPISID\tsapisid_value');
  });

  it('deve aceitar um array de objetos de cookies retornado por extensão nativa (chrome.cookies.getAll)', () => {
    const cookieArray = [
      {
        domain: '.youtube.com',
        name: 'LOGIN_INFO',
        value: 'extension_cookie_token',
        secure: true,
        expirationDate: 1950000000,
      },
    ];

    const res = service.saveCookies(cookieArray);
    expect(res.success).toBe(true);

    const savedContent = fs.readFileSync(testCookiesPath, 'utf-8');
    expect(savedContent).toContain('# Netscape HTTP Cookie File');
    expect(savedContent).toContain('LOGIN_INFO\textension_cookie_token');
  });

  it('deve remover cookies com deleteCookies', () => {
    service.saveCookies('.youtube.com\tTRUE\t/\tTRUE\t1800000000\tLOGIN_INFO\tval');
    expect(fs.existsSync(testCookiesPath)).toBe(true);

    const delRes = service.deleteCookies();
    expect(delRes.success).toBe(true);
    expect(fs.existsSync(testCookiesPath)).toBe(false);

    const status = service.getCookiesStatus();
    expect(status.configured).toBe(false);
    expect(status.path).toBeNull();
  });
});
