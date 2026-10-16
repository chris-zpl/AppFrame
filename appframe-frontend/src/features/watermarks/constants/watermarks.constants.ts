export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 KB';
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
};
