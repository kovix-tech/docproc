import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegistryClient } from '../registry/registry.client';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly registryClient: RegistryClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawKey = request.headers['x-api-key'] as string;
    if (!rawKey) throw new UnauthorizedException('Missing X-Api-Key header');
    const tenant = await this.registryClient.resolveTenant(rawKey);
    if (!tenant) throw new UnauthorizedException('Invalid API key');
    (request as any).tenant = tenant;
    return true;
  }
}
