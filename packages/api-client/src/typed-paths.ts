/**
 * Compile-time helpers over the generated OpenAPI `paths` (schema.d.ts, `npm run gen`).
 * The spec types request bodies, query and path params; response `data` is documented only in the
 * backend's API.md, so responses are typed by hand in responses.ts.
 */
import type { paths } from './schema';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

type Op<P extends keyof paths, M extends Method> = NonNullable<paths[P][M]>;

/** Paths that support method M. */
export type PathsWith<M extends Method> = {
  [P in keyof paths]: paths[P][M] extends undefined | never ? never : P;
}[keyof paths];

export type JsonBody<P extends keyof paths, M extends Method> = Op<P, M> extends {
  requestBody?: { content: { 'application/json': infer B } };
}
  ? B
  : never;

export type QueryOf<P extends keyof paths, M extends Method> = Op<P, M> extends {
  parameters: { query?: infer Q };
}
  ? NonNullable<Q>
  : never;

export type PathParamsOf<P extends keyof paths, M extends Method> = Op<P, M> extends {
  parameters: { path?: infer A };
}
  ? NonNullable<A>
  : never;
