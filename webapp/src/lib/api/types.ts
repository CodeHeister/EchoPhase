// Shapes of the server's API, generated from its OpenAPI document into
// schema.d.ts (`npm run gen:api`); do not hand-write response types here.
import type { components, paths } from './schema';

type Schemas = components['schemas'];

export type User = Schemas['MeResponse'];

export type LoginCredentials = Schemas['LoginRequest'];

export type RegisterData = Schemas['RegisterRequest'];

export type ProfileUpdate = Schemas['UpdateProfileRequest'];

/** The API's error body. `field` names the input it is about. */
export type ErrorItem = Schemas['ErrorBody'];

/** Query of GET /api/v1/sessions (cursor pagination). */
export type CursorOptions = NonNullable<
    paths['/api/v1/sessions']['get']['parameters']['query']
>;

export type Session = Schemas['SessionResponse'];

export type SessionsResponse = Schemas['SessionResponseCursorPageResponse'];

export type CreateApiClientData = Schemas['CreateApiClientRequest'];

/**
 * An API client as listed. Not in the OpenAPI document: the controller
 * returns a projection (the entity's [Expose] fields, PascalCase).
 */
export interface ApiClient {
    Id: string;
    Name: string;
    ExpiresAt: string | null;
    LastUsedAt: string | null;
    SecretRotatedAt: string | null;
    CreatedAt: string;
}
