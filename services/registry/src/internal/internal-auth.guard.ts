import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedSecret = process.env.INTERNAL_SECRET;
    if (!expectedSecret) {
      throw new UnauthorizedException('INTERNAL_SECRET not configured');
    }
    const request = context.switchToHttp().getRequest();
    const secret = request.headers['x-internal-secret'];
    if (secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid internal secret');
    }
    return true;
  }
}
