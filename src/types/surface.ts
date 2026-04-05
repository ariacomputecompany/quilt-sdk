import type { components, paths } from "../generated/platform-contract";

export type QuiltComponents = components;
export type QuiltPaths = paths;

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "options" | "head";

export type StablePath = keyof paths;

export type StablePathForMethod<M extends HttpMethod> = {
  [P in StablePath]: M extends keyof paths[P] ? P : never;
}[StablePath];

type OperationFor<P extends StablePath, M extends HttpMethod> = M extends keyof paths[P]
  ? NonNullable<paths[P][M]>
  : never;

type ParamsFor<Op> = Op extends { parameters: infer T } ? T : never;

export type PathParams<P extends StablePath, M extends HttpMethod> = ParamsFor<
  OperationFor<P, M>
> extends { path: infer T }
  ? T
  : Record<string, never>;

export type QueryParams<P extends StablePath, M extends HttpMethod> = ParamsFor<
  OperationFor<P, M>
> extends { query: infer T }
  ? T
  : Record<string, never>;

export type HeaderParams<P extends StablePath, M extends HttpMethod> = ParamsFor<
  OperationFor<P, M>
> extends { header: infer T }
  ? T
  : Record<string, never>;

type RequestContentFor<Op> = Op extends {
  requestBody: { content: infer Content };
}
  ? Content
  : never;

export type JsonRequestBody<P extends StablePath, M extends HttpMethod> = RequestContentFor<
  OperationFor<P, M>
> extends {
  "application/json": infer Body;
}
  ? Body
  : never;

type ResponsesFor<Op> = Op extends { responses: infer Responses } ? Responses : never;

type ResponseForStatus<Op, Code extends number> = ResponsesFor<Op> extends Record<string, unknown>
  ? `${Code}` extends keyof ResponsesFor<Op>
    ? ResponsesFor<Op>[`${Code}`]
    : never
  : never;

type PayloadFromResponse<Resp> = Resp extends { content: infer Content }
  ? Content extends { "application/json": infer Json }
    ? Json
    : Content extends { "text/plain": infer Text }
      ? Text
      : Content extends { "application/x-ndjson": infer Ndjson }
        ? Ndjson
        : Content extends { "text/event-stream": infer Stream }
          ? Stream
          : unknown
  : undefined;

type SuccessPayloadsFor<Op> =
  | PayloadFromResponse<ResponseForStatus<Op, 200>>
  | PayloadFromResponse<ResponseForStatus<Op, 201>>
  | PayloadFromResponse<ResponseForStatus<Op, 202>>
  | PayloadFromResponse<ResponseForStatus<Op, 203>>
  | PayloadFromResponse<ResponseForStatus<Op, 204>>
  | PayloadFromResponse<ResponseForStatus<Op, 205>>
  | PayloadFromResponse<ResponseForStatus<Op, 206>>
  | PayloadFromResponse<ResponseForStatus<Op, 207>>
  | PayloadFromResponse<ResponseForStatus<Op, 208>>
  | PayloadFromResponse<ResponseForStatus<Op, 226>>;

type NonNever<T> = [T] extends [never] ? never : T;
type NonVoid<T> = Exclude<T, undefined>;

export type SuccessResponse<P extends StablePath, M extends HttpMethod> = NonVoid<
  NonNever<SuccessPayloadsFor<OperationFor<P, M>>>
> extends never
  ? undefined
  : NonVoid<NonNever<SuccessPayloadsFor<OperationFor<P, M>>>>;

export type StableRequestOptions<P extends StablePath, M extends HttpMethod> = {
  pathParams?: PathParams<P, M> | Record<string, unknown> | undefined;
  query?: QueryParams<P, M> | Record<string, unknown> | undefined;
  headers?: Partial<Record<string, string>> & HeaderParams<P, M>;
  body?: JsonRequestBody<P, M> | Record<string, unknown> | undefined;
  signal?: AbortSignal | undefined;
};
