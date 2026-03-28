import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Request } from 'express';
import { Document } from '../database/models/document.model';
import { JwtReviewService } from './jwt-review.service';

@Injectable()
export class ReviewTokenGuard implements CanActivate {
  constructor(
    private readonly jwtReviewService: JwtReviewService,
    @InjectModel(Document) private readonly docModel: typeof Document,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.query['token'] as string | undefined;
    if (!token) throw new UnauthorizedException('Missing token');

    let payload: ReturnType<JwtReviewService['verify']>;
    try {
      payload = this.jwtReviewService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Validate path param matches JWT documentId (if :id param present)
    const pathId = request.params['id'];
    if (pathId && pathId !== payload.documentId) {
      throw new UnauthorizedException('Token does not match this document');
    }

    // Verify document exists and jti is active (not revoked)
    const doc = await this.docModel.findByPk(payload.documentId);
    if (!doc || doc.reviewTokenJti !== payload.jti) {
      throw new UnauthorizedException('Token has been revoked or document does not exist');
    }

    (request as any).reviewDocument = doc;
    (request as any).reviewTokenPayload = payload;
    return true;
  }
}
