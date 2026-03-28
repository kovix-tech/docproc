import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = request.headers['x-internal-secret'];
    if (secret !== process.env.INTERNAL_SECRET) {
      throw new UnauthorizedException('Invalid internal secret');
    }
    return true;
  }
}
