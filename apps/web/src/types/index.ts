import { 
  Role as SharedRole, 
  User as SharedUser,
  Tokens as SharedTokens,
  AuthResponse as SharedAuthResponse,
  PaginatedResponse as SharedPaginatedResponse,
  SingleResponse as SharedSingleResponse,
  ApiError as SharedApiError,
  Member as SharedMember,
  Candidate as SharedCandidate,
  Ranting as SharedRanting,
  Wilayah as SharedWilayah,
  Distrik as SharedDistrik
} from '@ths-thm/shared-types';

export type Role = SharedRole;
export type User = SharedUser;
export type Tokens = SharedTokens;
export type AuthResponse = SharedAuthResponse;
export type PaginatedResponse<T> = SharedPaginatedResponse<T>;
export type SingleResponse<T> = SharedSingleResponse<T>;
export type ApiError = SharedApiError;
export type Member = SharedMember;
export type Candidate = SharedCandidate;
export type Ranting = SharedRanting;
export type Wilayah = SharedWilayah;
export type Distrik = SharedDistrik;
