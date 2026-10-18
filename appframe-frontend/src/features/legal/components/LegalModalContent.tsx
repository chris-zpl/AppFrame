import React from 'react';

export interface LegalModalContentProps {
  isLoading: boolean;
  parsedHtml: string;
}

export const LegalModalContent: React.FC<LegalModalContentProps> = ({
  isLoading,
  parsedHtml,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 text-on-surface selection:bg-primary/20 selection:text-primary">
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-body-sm text-on-surface-variant font-medium">
            Carregando documento legal oficial...
          </p>
        </div>
      ) : (
        <div
          className="legal-content prose prose-invert max-w-none text-body-md text-on-surface-variant leading-relaxed [&_h1]:text-title-lg [&_h1]:font-bold [&_h1]:text-on-surface [&_h1]:mb-3 [&_h1]:mt-0 [&_h2]:text-title-md [&_h2]:font-bold [&_h2]:text-on-surface [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-title-sm [&_h3]:font-bold [&_h3]:text-on-surface [&_h3]:mt-6 [&_h3]:mb-2 [&_h4]:text-label-lg [&_h4]:font-bold [&_h4]:text-on-surface [&_h4]:mt-4 [&_h4]:mb-1 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1.5 [&_li]:leading-relaxed [&_hr]:border-surface-container-high [&_hr]:my-6 [&_strong]:text-on-surface [&_strong]:font-semibold [&_em]:text-on-surface-variant [&_a]:text-primary [&_a]:underline [&_a]:hover:opacity-85 [&_table]:w-full [&_table]:border-collapse [&_table]:my-6 [&_th]:bg-surface-container-high [&_th]:text-on-surface [&_th]:font-semibold [&_th]:p-3 [&_th]:text-left [&_th]:border [&_th]:border-surface-container-highest [&_td]:p-3 [&_td]:border [&_td]:border-surface-container-highest [&_td]:text-body-sm [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:italic [&_code]:font-mono [&_code]:text-primary [&_code]:bg-surface-container-highest [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded"
          dangerouslySetInnerHTML={{ __html: parsedHtml }}
        />
      )}
    </div>
  );
};
