import { BasicAuthMiddleware } from './basic-auth.middleware'

describe('BasicAuthMiddleware', () => {
  let middleware: BasicAuthMiddleware

  beforeEach(() => {
    process.env.ADMIN_USER = 'admin'
    process.env.ADMIN_PASSWORD = 'secret'
    middleware = new BasicAuthMiddleware()
  })

  function makeRes() {
    return {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
    } as any
  }

  it('calls next() with valid credentials', () => {
    const token = Buffer.from('admin:secret').toString('base64')
    const req = { headers: { authorization: `Basic ${token}` } } as any
    const res = makeRes()
    const next = jest.fn()
    middleware.use(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 401 when no Authorization header', () => {
    const req = { headers: {} } as any
    const res = makeRes()
    const next = jest.fn()
    middleware.use(req, res, next)
    expect(res.setHeader).toHaveBeenCalledWith('WWW-Authenticate', 'Basic realm="Admin"')
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.end).toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 with wrong credentials', () => {
    const token = Buffer.from('admin:wrong').toString('base64')
    const req = { headers: { authorization: `Basic ${token}` } } as any
    const res = makeRes()
    const next = jest.fn()
    middleware.use(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('handles passwords with colons', () => {
    process.env.ADMIN_PASSWORD = 'p:a:s:s'
    const token = Buffer.from('admin:p:a:s:s').toString('base64')
    const req = { headers: { authorization: `Basic ${token}` } } as any
    const res = makeRes()
    const next = jest.fn()
    middleware.use(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('returns 401 when Authorization header has non-Basic scheme', () => {
    const req = { headers: { authorization: 'Bearer sometoken' } } as any
    const res = makeRes()
    const next = jest.fn()
    middleware.use(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when credentials contain no colon', () => {
    const token = Buffer.from('nocolon').toString('base64')
    const req = { headers: { authorization: `Basic ${token}` } } as any
    const res = makeRes()
    const next = jest.fn()
    middleware.use(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})
