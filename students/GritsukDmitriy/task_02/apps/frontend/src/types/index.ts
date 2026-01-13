export type Role = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  status: 'ok';
  data: {
    accessToken: string;
    user: User;
  };
}

export interface RefreshResponse {
  status: 'ok';
  data: {
    accessToken: string;
  };
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type ResourceType = 'article' | 'video' | 'course';

export interface Roadmap {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: Difficulty | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  steps?: Step[];
  _count?: {
    steps: number;
  };
}

export interface Step {
  id: string;
  roadmapId: string;
  title: string;
  description: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  resources?: Resource[];
  roadmap?: Roadmap;
}

export interface Resource {
  id: string;
  stepId: string;
  title: string;
  url: string;
  type: ResourceType;
  createdAt: string;
  updatedAt: string;
}

export interface Progress {
  id: string;
  userId: string;
  stepId: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  step?: Step;
}

// Response from GET /progress?roadmap_id=
export interface ProgressResponse {
  completedSteps: string[];
  totalSteps: number;
  percentage: number;
}

export interface ApiError {
  status: 'error';
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

// Backend wraps most responses in { status: 'ok', data: {...} }
export interface ApiResponse<T> {
  status: 'ok';
  data: T;
}

// Paginated response from backend (old format: items/total/limit/offset)
export interface PaginatedResponseOld<T> {
  status: 'ok';
  data: {
    items: T[];
    total: number;
    limit: number;
    offset: number;
  };
}

// Paginated response for roadmaps (new format)
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
