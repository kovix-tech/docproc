import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { timingSafeEqual } from 'crypto'

@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
  constructor() {
    if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) {
      throw new Error('ADMIN_USER and ADMIN_PASSWORD must be set')
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization']
    if (!authHeader?.startsWith('Basic ')) {
      return this.deny(res)
    }
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8')
    const colonIdx = decoded.indexOf(':')
    if (colonIdx === -1) return this.deny(res)
    const user = decoded.slice(0, colonIdx)
    const pass = decoded.slice(colonIdx + 1)

    const expectedUser = process.env.ADMIN_USER ?? ''
    const expectedPass = process.env.ADMIN_PASSWORD ?? ''

    const userMatch = user.length === expectedUser.length &&
      timingSafeEqual(Buffer.from(user), Buffer.from(expectedUser))
    const passMatch = pass.length === expectedPass.length &&
      timingSafeEqual(Buffer.from(pass), Buffer.from(expectedPass))

    if (!userMatch || !passMatch) {
      return this.deny(res)
    }
    next()
  }

  private deny(res: Response) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin"')
    res.status(401).end()
  }
}
