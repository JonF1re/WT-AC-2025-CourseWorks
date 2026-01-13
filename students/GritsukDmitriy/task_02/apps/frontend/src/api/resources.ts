import { apiFetch } from './client';
import type { Resource, ResourceType } from '../types';

interface ResourceResponse {
  status: 'ok';
  data: {
    resource: Resource;
  };
}

// POST /resources
async function createResource(data: {
  stepId: string;
  title: string;
  url: string;
  type: ResourceType;
}): Promise<Resource> {
  const res = await apiFetch<ResourceResponse>('/resources', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.data.resource;
}

// PUT /resources/:id
async function updateResource(resourceId: string, data: Partial<{
  title: string;
  url: string;
  type: ResourceType;
}>): Promise<Resource> {
  const res = await apiFetch<ResourceResponse>(`/resources/${resourceId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return res.data.resource;
}

// DELETE /resources/:id
async function deleteResource(resourceId: string): Promise<void> {
  await apiFetch<{ status: 'ok' }>(`/resources/${resourceId}`, { method: 'DELETE' });
}

export const resourcesApi = {
  createResource,
  updateResource,
  deleteResource,
};
