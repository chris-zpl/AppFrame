import React from 'react';
import { marked } from 'marked';
import { Card, Badge, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import type { SaveLegalSettingsDto } from '../interfaces';

interface AdminLegalTabProps {
  legalForm: SaveLegalSettingsDto;
  setLegalForm: React.Dispatch<React.SetStateAction<SaveLegalSettingsDto>>;
  activeLegalDoc: 'terms' | 'privacy';
  setActiveLegalDoc: React.Dispatch<React.SetStateAction<'terms' | 'privacy'>>;
  activeTermsMode: 'edit' | 'preview';
  setActiveTermsMode: React.Dispatch<React.SetStateAction<'edit' | 'preview'>>;
  activePrivacyMode: 'edit' | 'preview';
  setActivePrivacyMode: React.Dispatch<React.SetStateAction<'edit' | 'preview'>>;
  isSavingLegal: boolean;
  isResettingLegal: boolean;
  onSaveLegal: (e: React.FormEvent) => void;
  onResetLegal: () => void;
}

export const AdminLegalTab: React.FC<AdminLegalTabProps> = ({
  legalForm,
  setLegalForm,
  activeLegalDoc,
  setActiveLegalDoc,
  activeTermsMode,
  setActiveTermsMode,
  activePrivacyMode,
  setActivePrivacyMode,
  isSavingLegal,
  isResettingLegal,
  onSaveLegal,
  onResetLegal,
}) => {
  return (
    <form onSubmit={onSaveLegal} className="flex flex-col gap-6">
      {/* Header da Aba Legal */}
      <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
            <span className="material-symbols-outlined text-[28px]">gavel</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-title-lg font-bold text-on-surface">
                Termos de Serviço & Política de Privacidade
              </h2>
              <Badge variant="primary">LGPD • Marco Civil</Badge>
            </div>
            <p className="text-body-sm text-on-surface-variant max-w-2xl">
              Gerencie dinamicamente os textos dos Termos e da Política em Markdown. As alterações são refletidas instantaneamente nas páginas públicas, modais de cadastro e rodapé.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetLegal}
            isLoading={isResettingLegal}
            className="text-error border-error/30 hover:bg-error/10 hover:border-error/50"
            leftIcon={<span className="material-symbols-outlined text-[18px]">restart_alt</span>}
          >
            Restaurar Padrão
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSavingLegal}
            leftIcon={<span className="material-symbols-outlined text-[18px]">save</span>}
          >
            Salvar Documentos
          </Button>
        </div>
      </Card>

      {/* Parâmetros Globais Dinâmicos */}
      <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container-highest">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">tune</span>
            <h3 className="text-title-md font-bold text-on-surface">
              Variáveis Institucionais & Contrato
            </h3>
          </div>
          <span className="text-label-sm text-on-surface-variant">
            Substituídas automaticamente nos textos entre colchetes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-semibold text-on-surface">
              Razão Social / Nome do Desenvolvedor
            </label>
            <input
              type="text"
              value={legalForm.companyName || ''}
              onChange={(e) => setLegalForm((prev) => ({ ...prev, companyName: e.target.value }))}
              placeholder="Ex: AppFrame Tecnologia Ltda"
              className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-semibold text-on-surface">
              E-mail de Suporte / Contato
            </label>
            <input
              type="email"
              value={legalForm.contactEmail || ''}
              onChange={(e) => setLegalForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
              placeholder="Ex: contato@appframe.io"
              className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-semibold text-on-surface">
              Canal DPO / Encarregado de Privacidade
            </label>
            <input
              type="email"
              value={legalForm.dpoEmail || ''}
              onChange={(e) => setLegalForm((prev) => ({ ...prev, dpoEmail: e.target.value }))}
              placeholder="Ex: privacidade@appframe.io"
              className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-semibold text-on-surface">
              Cidade / Foro de Eleição Jurídico
            </label>
            <input
              type="text"
              value={legalForm.forumCity || ''}
              onChange={(e) => setLegalForm((prev) => ({ ...prev, forumCity: e.target.value }))}
              placeholder="Ex: Curitiba / PR"
              className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-semibold text-on-surface">
              Tempo de Retenção de Mídias
            </label>
            <input
              type="text"
              value={legalForm.retentionPeriod || ''}
              onChange={(e) => setLegalForm((prev) => ({ ...prev, retentionPeriod: e.target.value }))}
              placeholder="Ex: 24 horas"
              className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-semibold text-on-surface">
              URL Oficial da Plataforma
            </label>
            <input
              type="url"
              value={legalForm.websiteUrl || ''}
              onChange={(e) => setLegalForm((prev) => ({ ...prev, websiteUrl: e.target.value }))}
              placeholder="Ex: https://appframe.io"
              className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface text-body-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      </Card>

      {/* Card com Editor Markdown e Preview dos Documentos */}
      <Card className="p-6 border-surface-container-highest bg-surface-container-lowest flex flex-col gap-4">
        {/* Barra de Seleção de Documento e Modo de Exibição */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container-highest">
          {/* Switcher Termos vs Privacidade */}
          <div className="flex items-center p-1 bg-surface-container rounded-xl border border-surface-container-highest">
            <button
              type="button"
              onClick={() => setActiveLegalDoc('terms')}
              className={cn(
                'px-4 py-2 rounded-lg text-label-md font-semibold transition-all cursor-pointer flex items-center gap-2',
                activeLegalDoc === 'terms'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              <span>Termos de Serviço</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLegalDoc('privacy')}
              className={cn(
                'px-4 py-2 rounded-lg text-label-md font-semibold transition-all cursor-pointer flex items-center gap-2',
                activeLegalDoc === 'privacy'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>Política de Privacidade</span>
            </button>
          </div>

          {/* Switcher Editor vs Preview */}
          <div className="flex items-center p-1 bg-surface-container rounded-xl border border-surface-container-highest self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                if (activeLegalDoc === 'terms') setActiveTermsMode('edit');
                else setActivePrivacyMode('edit');
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-label-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                (activeLegalDoc === 'terms' ? activeTermsMode : activePrivacyMode) === 'edit'
                  ? 'bg-surface-container-highest text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>Editor Markdown</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeLegalDoc === 'terms') setActiveTermsMode('preview');
                else setActivePrivacyMode('preview');
              }}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-label-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                (activeLegalDoc === 'terms' ? activeTermsMode : activePrivacyMode) === 'preview'
                  ? 'bg-surface-container-highest text-on-surface shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>Visualização Prévia</span>
            </button>
          </div>
        </div>

        {/* Área de Conteúdo (Editor ou Preview) */}
        {activeLegalDoc === 'terms' ? (
          activeTermsMode === 'edit' ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={legalForm.termsOfService || ''}
                onChange={(e) => setLegalForm((prev) => ({ ...prev, termsOfService: e.target.value }))}
                rows={24}
                placeholder="Insira o texto completo dos Termos de Serviço em Markdown..."
                className="w-full p-4 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface font-mono text-body-sm leading-relaxed focus:outline-none focus:border-primary transition-colors resize-y"
              />
              <div className="flex items-center justify-between text-label-sm text-on-surface-variant px-1">
                <span>Suporta sintaxe Markdown completa (# títulos, listas, tabelas e links).</span>
                <span>{legalForm.termsOfService?.length || 0} caracteres</span>
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8 rounded-xl bg-surface-container border border-surface-container-highest max-h-[700px] overflow-y-auto">
              <div
                className="prose prose-invert max-w-none text-body-md text-on-surface-variant leading-relaxed [&_h1]:text-title-lg [&_h1]:font-bold [&_h1]:text-on-surface [&_h1]:mb-3 [&_h2]:text-title-md [&_h2]:font-bold [&_h2]:text-on-surface [&_h3]:text-title-sm [&_h3]:font-bold [&_h3]:text-on-surface [&_h4]:text-label-lg [&_h4]:font-bold [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_th]:bg-surface-container-high [&_th]:p-3 [&_th]:border [&_th]:border-surface-container-highest [&_td]:p-3 [&_td]:border [&_td]:border-surface-container-highest"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(legalForm.termsOfService || '') as string,
                }}
              />
            </div>
          )
        ) : activePrivacyMode === 'edit' ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={legalForm.privacyPolicy || ''}
              onChange={(e) => setLegalForm((prev) => ({ ...prev, privacyPolicy: e.target.value }))}
              rows={24}
              placeholder="Insira o texto completo da Política de Privacidade em Markdown..."
              className="w-full p-4 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface font-mono text-body-sm leading-relaxed focus:outline-none focus:border-primary transition-colors resize-y"
            />
            <div className="flex items-center justify-between text-label-sm text-on-surface-variant px-1">
              <span>Suporta sintaxe Markdown completa (# títulos, listas, tabelas e links).</span>
              <span>{legalForm.privacyPolicy?.length || 0} caracteres</span>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 rounded-xl bg-surface-container border border-surface-container-highest max-h-[700px] overflow-y-auto">
            <div
              className="prose prose-invert max-w-none text-body-md text-on-surface-variant leading-relaxed [&_h1]:text-title-lg [&_h1]:font-bold [&_h1]:text-on-surface [&_h1]:mb-3 [&_h2]:text-title-md [&_h2]:font-bold [&_h2]:text-on-surface [&_h3]:text-title-sm [&_h3]:font-bold [&_h3]:text-on-surface [&_h4]:text-label-lg [&_h4]:font-bold [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_th]:bg-surface-container-high [&_th]:p-3 [&_th]:border [&_th]:border-surface-container-highest [&_td]:p-3 [&_td]:border [&_td]:border-surface-container-highest"
              dangerouslySetInnerHTML={{
                __html: marked.parse(legalForm.privacyPolicy || '') as string,
              }}
            />
          </div>
        )}

        {/* Botões Finais de Salvar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-highest">
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSavingLegal}
            leftIcon={<span className="material-symbols-outlined text-[18px]">save</span>}
          >
            Salvar Alterações
          </Button>
        </div>
      </Card>
    </form>
  );
};
