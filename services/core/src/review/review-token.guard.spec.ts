import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ReviewTokenGuard } from './review-token.guard';
import { JwtReviewService } from './jwt-review.service';

function makeContext(query: Record<string, string>, params: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ query, params }),
    }),
  } as unknown as ExecutionContext;
}

describe('ReviewTokenGuard', () => {
  let guard: ReviewTokenGuard;
  let jwtReviewService: JwtReviewService;
  let mockDocModel: { findByPk: jest.Mock };

  beforeEach(() => {
    process.env.REVIEW_JWT_SECRET = 'test-secret';
    const jwtService = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '15m' } });
    jwtReviewService = new JwtReviewService(jwtService);
    mockDocModel = { findByPk: jest.fn() };
    guard = new ReviewTokenGuard(jwtReviewService, mockDocModel as any);
  });

  it('throws UnauthorizedException if no token in query', async () => {
    const ctx = makeContext({}, { id: 'doc-123' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException if token is invalid', async () => {
    const ctx = makeContext({ token: 'bad.token.here' }, { id: 'doc-123' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException if path id does not match JWT documentId', async () => {
    const { token } = jwtReviewService.sign('doc-123', 'tenant-456');
    const ctx = makeContext({ token }, { id: 'different-doc' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException if document not found', async () => {
    const { token } = jwtReviewService.sign('doc-123', 'tenant-456');
    mockDocModel.findByPk.mockResolvedValue(null);
    const ctx = makeContext({ token }, { id: 'doc-123' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException if jti does not match (revoked)', async () => {
    const { token } = jwtReviewService.sign('doc-123', 'tenant-456');
    mockDocModel.findByPk.mockResolvedValue({ reviewTokenJti: 'different-jti' });
    const ctx = makeContext({ token }, { id: 'doc-123' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('returns true and attaches reviewDocument to request when valid', async () => {
    const { token, jti } = jwtReviewService.sign('doc-123', 'tenant-456');
    const fakeDoc = { id: 'doc-123', reviewTokenJti: jti };
    mockDocModel.findByPk.mockResolvedValue(fakeDoc);
    const req: any = { query: { token }, params: { id: 'doc-123' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.reviewDocument).toBe(fakeDoc);
    expect(req.reviewTokenPayload).toMatchObject({ documentId: 'doc-123', tenantId: 'tenant-456', jti });
  });
});
