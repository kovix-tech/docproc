import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization']
    if (!authHeader?.startsWith('Basic ')) {
      return this.deny(res)
    }
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8')
    const colonIdx = decoded.indexOf(':')
    const user = decoded.slice(0, colonIdx)
    const pass = decoded.slice(colonIdx + 1)
    if (user !== process.env.ADMIN_USER || pass !== process.env.ADMIN_PASSWORD) {
      return this.deny(res)
    }
    next()
  }

  private deny(res: Response) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin"')
    res.status(401).end()
  }
}
