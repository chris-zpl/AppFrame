import React, { useState } from 'react';
import { marked } from 'marked';
import { Card, Badge, Button, Input, Textarea, Tabs } from '../../../components/ui';
import type { SaveLegalSettingsDto, LegalDocumentsResponse } from '../types';

export interface AdminLegalTabProps {
  initialSettings?: LegalDocumentsResponse;
  legalForm?: SaveLegalSettingsDto;
  setLegalForm?: React.Dispatch<React.SetStateAction<SaveLegalSettingsDto>>;
  activeLegalDoc?: 'terms' | 'privacy';
  setActiveLegalDoc?: React.Dispatch<React.SetStateAction<'terms' | 'privacy'>>;
  activeTermsMode?: 'edit' | 'preview';
  setActiveTermsMode?: React.Dispatch<React.SetStateAction<'edit' | 'preview'>>;
  activePrivacyMode?: 'edit' | 'preview';
  setActivePrivacyMode?: React.Dispatch<React.SetStateAction<'edit' | 'preview'>>;
  isSavingLegal: boolean;
  isResettingLegal: boolean;
  onSaveLegal: ((e: React.FormEvent) => void) | ((data: SaveLegalSettingsDto) => void | Promise<any>);
  onResetLegal: () => void;
}

export const AdminLegalTab: React.FC<AdminLegalTabProps> = ({
  initialSettings,
  legalForm: controlledForm,
  setLegalForm: controlledSetForm,
  activeLegalDoc: controlledDoc,
  setActiveLegalDoc: controlledSetDoc,
  activeTermsMode: controlledTermsMode,
  setActiveTermsMode: controlledSetTermsMode,
  activePrivacyMode: controlledPrivacyMode,
  setActivePrivacyMode: controlledSetPrivacyMode,
  isSavingLegal,
  isResettingLegal,
  onSaveLegal,
  onResetLegal,
}) => {
  const [internalForm, setInternalForm] = useState<SaveLegalSettingsDto>(() => ({
    companyName: initialSettings?.variables?.companyName || '',
    contactEmail: initialSettings?.variables?.contactEmail || '',
    dpoEmail: initialSettings?.variables?.dpoEmail || '',
    websiteUrl: initialSettings?.variables?.websiteUrl || '',
    forumCity: initialSettings?.variables?.forumCity || '',
    retentionPeriod: initialSettings?.variables?.retentionPeriod || '',
    termsOfService: initialSettings?.terms?.raw || '',
    privacyPolicy: initialSettings?.privacy?.raw || '',
  }));

  const [internalActiveDoc, setInternalActiveDoc] = useState<'terms' | 'privacy'>('terms');
  const [internalTermsMode, setInternalTermsMode] = useState<'edit' | 'preview'>('edit');
  const [internalPrivacyMode, setInternalPrivacyMode] = useState<'edit' | 'preview'>('edit');

  const [prevInitialSettings, setPrevInitialSettings] = useState(initialSettings);
  if (initialSettings !== prevInitialSettings) {
    setPrevInitialSettings(initialSettings);
    if (initialSettings) {
      setInternalForm({
        companyName: initialSettings.variables?.companyName || '',
        contactEmail: initialSettings.variables?.contactEmail || '',
        dpoEmail: initialSettings.variables?.dpoEmail || '',
        websiteUrl: initialSettings.variables?.websiteUrl || '',
        forumCity: initialSettings.variables?.forumCity || '',
        retentionPeriod: initialSettings.variables?.retentionPeriod || '',
        termsOfService: initialSettings.terms?.raw || '',
        privacyPolicy: initialSettings.privacy?.raw || '',
      });
    }
  }

  const legalForm = controlledForm !== undefined ? controlledForm : internalForm;
  const setLegalForm = controlledSetForm ?? setInternalForm;
  const activeLegalDoc = controlledDoc !== undefined ? controlledDoc : internalActiveDoc;
  const setActiveLegalDoc = controlledSetDoc ?? setInternalActiveDoc;
  const activeTermsMode = controlledTermsMode !== undefined ? controlledTermsMode : internalTermsMode;
  const setActiveTermsMode = controlledSetTermsMode ?? setInternalTermsMode;
  const activePrivacyMode = controlledPrivacyMode !== undefined ? controlledPrivacyMode : internalPrivacyMode;
  const setActivePrivacyMode = controlledSetPrivacyMode ?? setInternalPrivacyMode;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (controlledForm !== undefined) {
      (onSaveLegal as (e: React.FormEvent) => void)(e);
    } else {
      (onSaveLegal as (data: SaveLegalSettingsDto) => void | Promise<any>)(legalForm);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Header da Aba Legal */}
      <Card className="p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 dark:bg-primary/10 border border-amber-600/30 dark:border-primary/20 flex items-center justify-center text-amber-700 dark:text-primary flex-shrink-0">
            <span className="material-symbols-outlined text-[28px]">gavel</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-title-lg font-bold text-neutral-900 dark:text-on-surface">
                Termos de Serviço & Política de Privacidade
              </h2>
              <Badge variant="primary">LGPD • Marco Civil</Badge>
            </div>
            <p className="text-body-sm text-neutral-600 dark:text-on-surface-variant max-w-2xl">
              Gerencie dinamicamente os textos dos Termos e da Política em Markdown. As alterações são refletidas instantaneamente nas páginas públicas, modais de cadastro e rodapé.
            </p>
          </div>
        </div>
      </Card>

      {/* Parâmetros Globais Dinâmicos */}
      <Card className="p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-surface-container-highest">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-amber-700 dark:text-primary">tune</span>
            <h3 className="text-title-md font-bold text-neutral-900 dark:text-on-surface">
              Variáveis Institucionais & Contrato
            </h3>
          </div>
          <span className="text-label-sm text-neutral-600 dark:text-on-surface-variant">
            Substituídas automaticamente nos textos entre colchetes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            id="legal-company-name"
            name="companyName"
            size="sm"
            label="Razão Social / Nome do Desenvolvedor"
            type="text"
            value={legalForm.companyName || ''}
            onChange={(e) => setLegalForm((prev) => ({ ...prev, companyName: e.target.value }))}
            placeholder="Ex: AppFrame Tecnologia Ltda"
          />

          <Input
            id="legal-contact-email"
            name="contactEmail"
            size="sm"
            label="E-mail de Suporte / Contato"
            type="email"
            value={legalForm.contactEmail || ''}
            onChange={(e) => setLegalForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
            placeholder="Ex: contato@appframe.io"
          />

          <Input
            id="legal-dpo-email"
            name="dpoEmail"
            size="sm"
            label="Canal DPO / Encarregado de Privacidade"
            type="email"
            value={legalForm.dpoEmail || ''}
            onChange={(e) => setLegalForm((prev) => ({ ...prev, dpoEmail: e.target.value }))}
            placeholder="Ex: privacidade@appframe.io"
          />

          <Input
            id="legal-forum-city"
            name="forumCity"
            size="sm"
            label="Cidade / Foro de Eleição Jurídico"
            type="text"
            value={legalForm.forumCity || ''}
            onChange={(e) => setLegalForm((prev) => ({ ...prev, forumCity: e.target.value }))}
            placeholder="Ex: Curitiba / PR"
          />

          <Input
            id="legal-retention-period"
            name="retentionPeriod"
            size="sm"
            label="Tempo de Retenção de Mídias"
            type="text"
            value={legalForm.retentionPeriod || ''}
            onChange={(e) => setLegalForm((prev) => ({ ...prev, retentionPeriod: e.target.value }))}
            placeholder="Ex: 24 horas"
          />

          <Input
            id="legal-website-url"
            name="websiteUrl"
            size="sm"
            label="URL Oficial da Plataforma"
            type="url"
            value={legalForm.websiteUrl || ''}
            onChange={(e) => setLegalForm((prev) => ({ ...prev, websiteUrl: e.target.value }))}
            placeholder="Ex: https://appframe.io"
          />
        </div>
        <div className="flex justify-end gap-2 flex-col sm:flex-row self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetLegal}
            isLoading={isResettingLegal}
            className="bg-red-500/20 dark:text-red-400 text-red-600 border-error/30 hover:bg-red-500 hover:border-error/50 order-2 sm:order-1"
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
            className="order-1 sm:order-2"
          >
            Salvar Documentos
          </Button>
        </div>
      </Card>

      {/* Card com Editor Markdown e Preview dos Documentos */}
      <Card className="p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest flex flex-col gap-4">
        {/* Barra de Seleção de Documento e Modo de Exibição */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-surface-container-highest">
          {/* Switcher Termos vs Privacidade */}
          <Tabs
            tabs={[
              { id: 'terms', label: 'Termos de Serviço', icon: 'gavel' },
              { id: 'privacy', label: 'Política de Privacidade', icon: 'verified_user' },
            ]}
            activeTab={activeLegalDoc}
            onChange={(id) => setActiveLegalDoc(id as 'terms' | 'privacy')}
            variant="segmented"
            ariaLabel="Alternar documento legal do sistema"
          />

          {/* Switcher Editor vs Preview */}
          <Tabs
            tabs={[
              { id: 'edit', label: 'Editor Markdown', icon: 'edit_note' },
              { id: 'preview', label: 'Visualização Prévia', icon: 'visibility' },
            ]}
            activeTab={activeLegalDoc === 'terms' ? activeTermsMode : activePrivacyMode}
            onChange={(id) => {
              const mode = id as 'edit' | 'preview';
              if (activeLegalDoc === 'terms') setActiveTermsMode(mode);
              else setActivePrivacyMode(mode);
            }}
            variant="segmented"
            size="sm"
            colorScheme="surface"
            ariaLabel="Alternar modo de edição ou visualização"
          />
        </div>

        {/* Área de Conteúdo (Editor ou Preview) */}
        {activeLegalDoc === 'terms' ? (
          activeTermsMode === 'edit' ? (
            <div className="flex flex-col gap-2">
              <Textarea
                id="legal-terms-text"
                name="termsOfService"
                aria-label="Conteúdo dos Termos de Serviço"
                value={legalForm.termsOfService || ''}
                onChange={(e) => setLegalForm((prev) => ({ ...prev, termsOfService: e.target.value }))}
                rows={24}
                placeholder="Insira o texto completo dos Termos de Serviço em Markdown..."
                className="font-mono text-body-sm leading-relaxed resize-y"
              />
              <div className="flex items-center justify-between text-label-sm text-neutral-600 dark:text-on-surface-variant px-1">
                <span>Suporta sintaxe Markdown completa (# títulos, listas, tabelas e links).</span>
                <span>{legalForm.termsOfService?.length || 0} caracteres</span>
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8 rounded-xl bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest max-h-[700px] overflow-y-auto">
              <div
                className="prose dark:prose-invert max-w-none text-body-md text-neutral-700 dark:text-on-surface-variant leading-relaxed [&_h1]:text-title-lg [&_h1]:font-bold [&_h1]:text-neutral-900 dark:[&_h1]:text-on-surface [&_h1]:mb-3 [&_h2]:text-title-md [&_h2]:font-bold [&_h2]:text-neutral-900 dark:[&_h2]:text-on-surface [&_h3]:text-title-sm [&_h3]:font-bold [&_h3]:text-neutral-900 dark:[&_h3]:text-on-surface [&_h4]:text-label-lg [&_h4]:font-bold [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_th]:bg-neutral-100 dark:[&_th]:bg-surface-container-high [&_th]:text-neutral-900 dark:[&_th]:text-on-surface [&_th]:p-3 [&_th]:border [&_th]:border-neutral-200 dark:[&_th]:border-surface-container-highest [&_td]:p-3 [&_td]:border [&_td]:border-neutral-200 dark:[&_td]:border-surface-container-highest"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(legalForm.termsOfService || '') as string,
                }}
              />
            </div>
          )
        ) : activePrivacyMode === 'edit' ? (
          <div className="flex flex-col gap-2">
            <Textarea
              id="legal-privacy-text"
              name="privacyPolicy"
              aria-label="Conteúdo da Política de Privacidade"
              value={legalForm.privacyPolicy || ''}
              onChange={(e) => setLegalForm((prev) => ({ ...prev, privacyPolicy: e.target.value }))}
              rows={24}
              placeholder="Insira o texto completo da Política de Privacidade em Markdown..."
              className="font-mono text-body-sm leading-relaxed resize-y"
            />
            <div className="flex items-center justify-between text-label-sm text-neutral-600 dark:text-on-surface-variant px-1">
              <span>Suporta sintaxe Markdown completa (# títulos, listas, tabelas e links).</span>
              <span>{legalForm.privacyPolicy?.length || 0} caracteres</span>
            </div>
          </div>
        ) : (
          <div className="p-6 sm:p-8 rounded-xl bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest max-h-[700px] overflow-y-auto">
            <div
              className="prose dark:prose-invert max-w-none text-body-md text-neutral-700 dark:text-on-surface-variant leading-relaxed [&_h1]:text-title-lg [&_h1]:font-bold [&_h1]:text-neutral-900 dark:[&_h1]:text-on-surface [&_h1]:mb-3 [&_h2]:text-title-md [&_h2]:font-bold [&_h2]:text-neutral-900 dark:[&_h2]:text-on-surface [&_h3]:text-title-sm [&_h3]:font-bold [&_h3]:text-neutral-900 dark:[&_h3]:text-on-surface [&_h4]:text-label-lg [&_h4]:font-bold [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_table]:w-full [&_table]:border-collapse [&_th]:bg-neutral-100 dark:[&_th]:bg-surface-container-high [&_th]:text-neutral-900 dark:[&_th]:text-on-surface [&_th]:p-3 [&_th]:border [&_th]:border-neutral-200 dark:[&_th]:border-surface-container-highest [&_td]:p-3 [&_td]:border [&_td]:border-neutral-200 dark:[&_td]:border-surface-container-highest"
              dangerouslySetInnerHTML={{
                __html: marked.parse(legalForm.privacyPolicy || '') as string,
              }}
            />
          </div>
        )}

        {/* Botões Finais de Salvar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-surface-container-highest">
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
