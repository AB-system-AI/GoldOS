export interface PaginationMeta {
  page: number;
  perPage: number;
  totalPages: number;
  totalCount: number;
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    requestId: string;
    pagination?: PaginationMeta;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: {
      field: string;
      code: string;
      message: string;
    }[];
    requestId: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    requestId: string;
    pagination: PaginationMeta;
  };
}
