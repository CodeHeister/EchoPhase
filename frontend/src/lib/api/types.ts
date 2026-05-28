export interface User {
    id: string;
    username: string;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface RegisterData {
    name: string;
    username: string;
    password: string;
}

export interface ErrorItem {
    code: string;
    description: string;
}

export interface ErrorResponse {
    [key: string]: ErrorItem[];
}

export interface CursorOptions {
    cursor?: string;
    limit?: number;
}

export interface Session {
    Id: string;
    UserId: string;
    DeviceId: string;
    Scopes: string[];
    Intents: string[];
    Permissions: { Resource: string; Permissions: string[] }[];
}

export interface SessionsResponse {
    Data: Session[];
    NextCursor: string | null;
    HasMore: boolean;
}
