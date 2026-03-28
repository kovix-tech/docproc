import { JwtService } from '@nestjs/jwt';
import { JwtReviewService } from './jwt-review.service';

describe('JwtReviewService', () => {
  let service: JwtReviewService;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '15m' } });
    service = new JwtReviewService(jwtService);
  });

  it('sign returns a token with documentId, tenantId, jti', () => {
    const result = service.sign('doc-123', 'tenant-456');
    expect(result.token).toBeTruthy();
    expect(result.jti).toBeTruthy();
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('verify decodes a signed token and returns payload', () => {
    const { token, jti } = service.sign('doc-123', 'tenant-456');
    const payload = service.verify(token);
    expect(payload.documentId).toBe('doc-123');
    expect(payload.tenantId).toBe('tenant-456');
    expect(payload.jti).toBe(jti);
  });

  it('verify throws on tampered token', () => {
    const { token } = service.sign('doc-123', 'tenant-456');
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => service.verify(tampered)).toThrow();
  });

  it('sign generates unique jti each call', () => {
    const r1 = service.sign('doc-1', 'tenant-1');
    const r2 = service.sign('doc-1', 'tenant-1');
    expect(r1.jti).not.toBe(r2.jti);
  });
});
