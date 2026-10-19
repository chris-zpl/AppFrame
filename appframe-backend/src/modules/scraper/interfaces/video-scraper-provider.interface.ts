import { ScrapedMediaItem } from './scraped-media-item.interface';

export interface IVideoScraperProvider {
  readonly providerName: string;

  /**
   * Verifica se o provider é capaz de processar a URL informada
   */
  canHandle(channelUrl: string): boolean;

  /**
   * Extrai vídeos recentes e Shorts do canal especificado
   */
  scanChannel(channelUrl: string): Promise<ScrapedMediaItem[]>;

  /**
   * Extrai próxima página/lote de mídias sob demanda (continuation InnerTube)
   */
  fetchMore?(
    channelUrl: string,
    type?: 'all' | 'long' | 'shorts',
  ): Promise<ScrapedMediaItem[]>;
}
