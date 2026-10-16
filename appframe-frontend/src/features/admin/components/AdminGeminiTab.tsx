import React from 'react';
import { Card, Badge, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import type { GeminiStatus } from '../interfaces';

interface AdminGeminiTabProps {
  geminiStatus: GeminiStatus | undefined;
  geminiKeyInput: string;
  setGeminiKeyInput: (val: string) => void;
  showGeminiKey: boolean;
  setShowGeminiKey: React.Dispatch<React.SetStateAction<boolean>>;
  isSavingGemini: boolean;
  isTestingGemini: boolean;
  isDeletingGemini: boolean;
  onSaveGeminiKey: (e: React.FormEvent) => void;
  onTestGemini: () => void;
  onDeleteGemini: () => void;
}

export const AdminGeminiTab: React.FC<AdminGeminiTabProps> = ({
  geminiStatus,
  geminiKeyInput,
  setGeminiKeyInput,
  showGeminiKey,
  setShowGeminiKey,
  isSavingGemini,
  isTestingGemini,
  isDeletingGemini,
  onSaveGeminiKey,
  onTestGemini,
  onDeleteGemini,
}) => {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Status Atual */}
      <Card className="p-5 border-surface-container-highest bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-3 rounded-xl shrink-0',
              geminiStatus?.configured ? 'bg-emerald-500/15 text-emerald-400' : 'bg-outline/15 text-outline'
            )}
          >
            <span className="material-symbols-outlined text-[26px] block">
              {geminiStatus?.configured ? 'auto_awesome' : 'key_off'}
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-title-md font-bold text-on-surface">
                Chave Global do Google Gemini
              </h3>
              <Badge variant={geminiStatus?.configured ? 'status-completed' : 'neutral'}>
                {geminiStatus?.configured ? 'Configurada e Ativa' : 'Não Configurada'}
              </Badge>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              {geminiStatus?.configured
                ? `Chave ativa na plataforma: ${geminiStatus.maskedKey}. Todos os usuários usam este assistente transparente.`
                : 'Nenhuma chave configurada. Todos os recursos de legendas por IA estão suspensos.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onTestGemini}
            isLoading={isTestingGemini}
            leftIcon={<span className="material-symbols-outlined text-[16px]">sync</span>}
          >
            Testar Conexão
          </Button>

          {geminiStatus?.configured && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteGemini}
              isLoading={isDeletingGemini}
              className="text-error hover:text-error hover:bg-error/10"
              leftIcon={<span className="material-symbols-outlined text-[16px]">delete</span>}
            >
              Remover
            </Button>
          )}
        </div>
      </Card>

      {/* Configuração de Nova Chave */}
      <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-title-md font-bold text-on-surface">
            Definir Nova Chave do Google AI Studio
          </h3>
          <p className="text-body-sm text-on-surface-variant">
            Insira a chave obtida no portal do Google AI Studio. A chave será validada na API oficial e criptografada com AES-256-GCM antes de ser persistida.
          </p>
        </div>

        <form onSubmit={onSaveGeminiKey} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-bold text-outline uppercase tracking-wider">
              Chave de API do Gemini (AIzaSy...)
            </label>
            <div className="relative flex items-center">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder="Cole aqui a nova chave de API do Gemini..."
                className="w-full bg-surface-container border border-surface-container-highest rounded-xl pl-3.5 pr-10 py-2.5 text-body-md font-mono text-on-surface outline-none focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey((v) => !v)}
                className="absolute right-2.5 text-outline hover:text-on-surface cursor-pointer p-1"
                title={showGeminiKey ? 'Ocultar' : 'Mostrar'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showGeminiKey ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2.5">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSavingGemini}
              leftIcon={<span className="material-symbols-outlined text-[18px]">save</span>}
            >
              Validar e Salvar Chave Global
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
