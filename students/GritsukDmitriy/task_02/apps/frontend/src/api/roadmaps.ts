import { apiFetch } from './client';
import type { Roadmap, PaginatedResponse } from '../types';

interface RoadmapFilters {
  page?: number;
  limit?: number;
  category?: string;
  difficulty?: string;
  isPublished?: boolean;
}

interface RoadmapResponse {
  status: 'ok';
  data: {
    roadmap: Roadmap;
  };
}

// GET /roadmaps — returns new paginated format
async function getRoadmaps(filters: RoadmapFilters = {}): Promise<PaginatedResponse<Roadmap>> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.category) params.set('category', filters.category);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.isPublished !== undefined) params.set('isPublished', String(filters.isPublished));
  const qs = params.toString();
  return apiFetch<PaginatedResponse<Roadmap>>(`/roadmaps${qs ? `?${qs}` : ''}`);
}

// GET /roadmaps/:id — includes steps with resources
async function getRoadmap(id: string): Promise<Roadmap> {
  const res = await apiFetch<RoadmapResponse>(`/roadmaps/${id}`);
  return res.data.roadmap;
}

// POST /roadmaps
async function createRoadmap(data: {
  title: string;
  description?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  isPublished?: boolean;
}): Promise<Roadmap> {
  const res = await apiFetch<RoadmapResponse>('/roadmaps', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.data.roadmap;
}

// PUT /roadmaps/:id
async function updateRoadmap(id: string, data: Partial<{
  title: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isPublished: boolean;
}>): Promise<Roadmap> {
  const res = await apiFetch<RoadmapResponse>(`/roadmaps/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return res.data.roadmap;
}

// DELETE /roadmaps/:id (soft delete)
async function deleteRoadmap(id: string): Promise<void> {
  await apiFetch<{ status: 'ok' }>(`/roadmaps/${id}`, { method: 'DELETE' });
}

export const roadmapsApi = {
  getRoadmaps,
  getRoadmap,
  createRoadmap,
  updateRoadmap,
  deleteRoadmap,
};
