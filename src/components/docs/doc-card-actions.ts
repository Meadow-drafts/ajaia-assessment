export function getDocumentCardActions(isOwner: boolean) {
  return {
    showShare: isOwner,
    showExport: true,
  };
}
