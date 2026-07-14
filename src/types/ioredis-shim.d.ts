/**
 * Optional peer dependency shim so the package compiles without ioredis installed.
 * Host apps that enable Redis batching should install `ioredis`.
 */
declare module 'ioredis' {
  const Redis: any;
  export default Redis;
}
