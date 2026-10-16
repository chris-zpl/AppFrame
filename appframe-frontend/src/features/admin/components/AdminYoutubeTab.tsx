import React from 'react';
import { Card, Badge, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import type { YouTubeCookiesStatus } from '../interfaces';

interface AdminYoutubeTabProps {
  ytStatus: YouTubeCookiesStatus | undefined;
  cookiesInput: string;
  setCookiesInput: (val: string) => void;
  isSavingCookies: boolean;
  isDeletingCookies: boolean;
  onSaveCookies: (e: React.FormEvent) => void;
  onDeleteCookies: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AdminYoutubeTab: React.FC<AdminYoutubeTabProps> = ({
  ytStatus,
  cookiesInput,
  setCookiesInput,
  isSavingCookies,
  isDeletingCookies,
  onSaveCookies,
  onDeleteCookies,
  onFileUpload,
}) => {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Status Atual */}
      <Card className="p-5 border-surface-container-highest bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-3 rounded-xl shrink-0',
              ytStatus?.hasCookies ? 'bg-emerald-500/15 text-emerald-400' : 'bg-outline/15 text-outline'
            )}
          >
            <span className="material-symbols-outlined text-[26px] block">
              {ytStatus?.hasCookies ? 'verified' : 'cookie'}
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-title-md font-bold text-on-surface">
                Cookies Globais do YouTube
              </h3>
              <Badge variant={ytStatus?.hasCookies ? 'status-completed' : 'neutral'}>
                {ytStatus?.hasCookies ? 'Ativos e Prontos' : 'Não Configurado'}
              </Badge>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              {ytStatus?.hasCookies
                ? `Arquivo cookies.txt ativo (${ytStatus.sizeBytes} bytes). Atualizado em: ${ytStatus.updatedAt ? new Date(ytStatus.updatedAt).toLocaleString('pt-BR') : 'recente'}.`
                : 'Nenhum cookie global configurado. Vídeos com restrição de idade ou login podem falhar.'}
            </p>
          </div>
        </div>

        {ytStatus?.hasCookies && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteCookies}
            isLoading={isDeletingCookies}
            className="text-error hover:text-error hover:bg-error/10 shrink-0"
            leftIcon={<span className="material-symbols-outlined text-[16px]">delete</span>}
          >
            Remover Cookies
          </Button>
        )}
      </Card>

      {/* Formulário de Configuração */}
      <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-title-md font-bold text-on-surface">
            Atualizar Cookies Globais do YouTube
          </h3>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            Para que o AppFrame consiga baixar vídeos protegidos por restrição de idade ou que exigem login oficial,
            cole aqui o conteúdo completo do seu arquivo <strong className="text-on-surface">cookies.txt</strong> (formato padrão Netscape exportado por extensões ou pelo navegador)
            ou selecione o arquivo do seu computador.
          </p>
        </div>

        <form onSubmit={onSaveCookies} className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container border border-surface-container-highest">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">
                upload_file
              </span>
              <span className="text-body-sm font-semibold text-on-surface">
                Carregar arquivo cookies.txt
              </span>
            </div>
            <label className="cursor-pointer">
              <span className="px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-primary hover:text-on-primary text-xs font-bold transition-colors">
                Selecionar Arquivo
              </span>
              <input
                type="file"
                accept=".txt"
                onChange={onFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-bold text-outline uppercase tracking-wider">
              Ou cole o texto dos Cookies (formato Netscape)
            </label>
            <textarea
              value={cookiesInput}
              onChange={(e) => setCookiesInput(e.target.value)}
              rows={8}
              placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#9;TRUE&#9;/&#9;TRUE&#9;1740000000&#9;VISITOR_INFO1_LIVE&#9;xyz..."
              className="w-full bg-surface-container border border-surface-container-highest rounded-xl p-3 text-xs font-mono text-on-surface outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingCookies}
              leftIcon={<span className="material-symbols-outlined text-[18px]">save</span>}
            >
              Salvar Cookies no Servidor
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
