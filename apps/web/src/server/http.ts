/** Every API response is private, including errors. Prevent CDN caching of access decisions. */
export class PrivateResponse extends Response {
  constructor(body?: BodyInit | null, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    headers.set('Vary', 'Cookie');
    super(body, { ...init, headers });
  }
  static json(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    return new PrivateResponse(JSON.stringify(body), { ...init, headers });
  }
}
