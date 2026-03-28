import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';

export interface ReviewTokenPayload {
  documentId: string;
  tenantId: string;
  jti: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtReviewService {
  constructor(private readonly jwtService: JwtService) {}

  sign(documentId: string, tenantId: string): { token: string; jti: string; expiresAt: Date } {
    const jti = uuidv4();
    const token = this.jwtService.sign({ documentId, tenantId, jti });
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    return { token, jti, expiresAt };
  }

  verify(token: string): ReviewTokenPayload {
    return this.jwtService.verify<ReviewTokenPayload>(token);
  }
}
