// Типы данных, синхронизированные с backend DTO

export type Role = 'admin' | 'moderator' | 'user';

export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Status {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  order: number | null;
  isFinal: boolean;
  createdAt: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'date' | 'select' | 'checkbox';
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface Form {
  id: string;
  name: string;
  description: string | null;
  fields: FormField[];
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryItem {
  id: string;
  fromStatus: Status | null;
  toStatus: Status;
  changedBy: Pick<User, 'id' | 'username'>;
  comment: string | null;
  changedAt: string;
}

export interface Attachment {
  id: string;
  applicationId: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  uploadedAt: string;
}

export interface Application {
  id: string;
  formId: string;
  userId: string;
  statusId: string;
  data: Record<string, unknown>;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  form?: Form;
  status?: Status;
  user?: User;
  attachments?: Attachment[];
  history?: StatusHistoryItem[];
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// DTO для создания/обновления
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
}

export interface ApplicationCreateDto {
  formId: string;
  data: Record<string, unknown>;
  comment?: string | null;
}

export interface ApplicationUpdateDto {
  data?: Record<string, unknown>;
  comment?: string | null;
}

export interface ApplicationStatusChangeDto {
  statusId: string;
  comment?: string | null;
}

export interface FormCreateDto {
  name: string;
  description?: string | null;
  fields: FormField[];
  isActive?: boolean;
}

export interface FormUpdateDto {
  name?: string;
  description?: string | null;
  fields?: FormField[];
  isActive?: boolean;
}

export interface StatusCreateDto {
  name: string;
  description?: string | null;
  color?: string | null;
  order?: number;
  isFinal?: boolean;
}

export interface StatusUpdateDto {
  name?: string;
  description?: string | null;
  color?: string | null;
  order?: number;
  isFinal?: boolean;
}

export interface AttachmentCreateDto {
  applicationId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
}
