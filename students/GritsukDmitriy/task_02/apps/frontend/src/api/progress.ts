import { apiFetch } from './client';
import type { ProgressResponse, Progress } from '../types';

interface ProgressApiResponse {
  status: 'ok';
  data: ProgressResponse;
}

interface ProgressCreateResponse {
  status: 'ok';
  data: {
    progress: Progress;
  };
}

// GET /progress?roadmap_id=...
async function getProgress(roadmapId: string): Promise<ProgressResponse> {
  const res = await apiFetch<ProgressApiResponse>(`/progress?roadmap_id=${roadmapId}`);
  return res.data;
}

// POST /progress - mark step as completed
async function markStep(stepId: string): Promise<Progress> {
  const res = await apiFetch<ProgressCreateResponse>('/progress', {
    method: 'POST',
    body: JSON.stringify({ stepId })
  });
  return res.data.progress;
}

// DELETE /progress/step/:stepId - unmark step by stepId
async function unmarkStep(stepId: string): Promise<void> {
  await apiFetch<{ status: 'ok' }>(`/progress/step/${stepId}`, { method: 'DELETE' });
}

// DELETE /progress/:id - unmark step by progress record ID
async function unmarkProgress(progressId: string): Promise<void> {
  await apiFetch<{ status: 'ok' }>(`/progress/${progressId}`, { method: 'DELETE' });
}

export const progressApi = {
  getProgress,
  markStep,
  unmarkStep,
  unmarkProgress,
};
