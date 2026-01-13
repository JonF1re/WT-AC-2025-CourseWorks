import { apiFetch } from './client';
import type { Step } from '../types';

interface StepsResponse {
  status: 'ok';
  data: {
    items: Step[];
    limit: number;
    offset: number;
  };
}

interface StepResponse {
  status: 'ok';
  data: {
    step: Step;
  };
}

// GET /steps?roadmap_id=...&limit=...&offset=...
async function getSteps(roadmapId: string, limit = 50, offset = 0): Promise<Step[]> {
  const res = await apiFetch<StepsResponse>(
    `/steps?roadmap_id=${roadmapId}&limit=${limit}&offset=${offset}`
  );
  return res.data.items;
}

// GET /steps/:id
async function getStep(stepId: string): Promise<Step> {
  const res = await apiFetch<StepResponse>(`/steps/${stepId}`);
  return res.data.step;
}

// POST /steps
async function createStep(data: {
  roadmapId: string;
  title: string;
  description?: string;
  order: number;
}): Promise<Step> {
  const res = await apiFetch<StepResponse>('/steps', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.data.step;
}

// PUT /steps/:id
async function updateStep(stepId: string, data: Partial<{
  title: string;
  description: string;
  order: number;
}>): Promise<Step> {
  const res = await apiFetch<StepResponse>(`/steps/${stepId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return res.data.step;
}

// DELETE /steps/:id
async function deleteStep(stepId: string): Promise<void> {
  await apiFetch<{ status: 'ok' }>(`/steps/${stepId}`, { method: 'DELETE' });
}

export const stepsApi = {
  getSteps,
  getStep,
  createStep,
  updateStep,
  deleteStep,
};
