import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { watermarksService } from '../services';
import { validateWatermarkFile } from '../utils';

export const useWatermarks = () => {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [defaultWatermarkId, setDefaultWatermarkId] = useState<string | null>(() => {
    return localStorage.getItem('appframe_default_watermark_id');
  });

  const {
    data: watermarks = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['watermarks'],
    queryFn: () => watermarksService.list(),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => watermarksService.upload(file),
    onSuccess: (newWm) => {
      queryClient.invalidateQueries({ queryKey: ['watermarks'] });
      setErrorMessage(null);
      toast.success("Marca d'água enviada com sucesso!");
      if (!defaultWatermarkId) {
        setDefaultWatermarkId(newWm.id);
        localStorage.setItem('appframe_default_watermark_id', newWm.id);
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao fazer upload da marca d’água.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => watermarksService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watermarks'] });
      setDeleteConfirmId(null);
      toast.success("Marca d'água removida.");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao excluir a marca d’água.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const handleSelectDefault = (id: string) => {
    setDefaultWatermarkId(id);
    localStorage.setItem('appframe_default_watermark_id', id);
    toast.success('Marca d’água padrão para novos cortes atualizada.');
  };

  const uploadFile = (file: File) => {
    const validation = validateWatermarkFile(file);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Arquivo inválido.');
      return;
    }
    setErrorMessage(null);
    uploadMutation.mutate(file);
  };

  const deleteWatermark = (id: string) => {
    deleteMutation.mutate(id);
  };

  return {
    watermarks,
    isLoading,
    errorMessage,
    setErrorMessage,
    deleteConfirmId,
    setDeleteConfirmId,
    defaultWatermarkId,
    handleSelectDefault,
    uploadFile,
    deleteWatermark,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch,
  };
};
