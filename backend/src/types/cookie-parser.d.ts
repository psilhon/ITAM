declare module 'cookie-parser' {
  import { RequestHandler } from 'express'
  function cookieParser(secret?: string | Array<string>): RequestHandler
  namespace cookieParser {}
  export = cookieParser
}

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production'
    PORT?: string
    HOST?: string
    ACCESS_PASSWORD?: string
  }
}
