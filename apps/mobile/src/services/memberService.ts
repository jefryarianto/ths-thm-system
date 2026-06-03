import apiClient from '../lib/api-client';

export async function uploadCsv(file: { uri: string; name: string; type?: string }) {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type || 'text/csv',
  } as any);

  const response = await apiClient.post('/members/import/csv', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
}