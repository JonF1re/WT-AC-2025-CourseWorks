// User types
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  createdAt: string;
  _count?: {
    posts: number;
    followers: number;
    following: number;
  };
}

// Post types
export interface Post {
  id: string;
  text: string;
  authorId: string;
  author: User;
  createdAt: string;
  updatedAt: string;
  _count?: {
    likes: number;
    replies: number;
  };
  isLikedByMe?: boolean;
}

// Reply types
export interface Reply {
  id: string;
  text: string;
  authorId: string;
  author: User;
  replyToPostId: string;
  createdAt: string;
}

// Auth types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// Follow types
export interface Follow {
  id: number;
  followerId: number;
  follower: User;
  followingId: number;
  following: User;
  createdAt: string;
}

// Report types
export interface Report {
  id: number;
  reason: string;
  status: 'PENDING' | 'REVIEWED' | 'REJECTED';
  reporterId: number;
  reporter: User;
  postId: number;
  post: Post;
  createdAt: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}
