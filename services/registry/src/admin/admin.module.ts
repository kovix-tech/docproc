import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { BasicAuthMiddleware } from './basic-auth.middleware'

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'admin', 'out'),
      serveRoot: '/admin',
      exclude: ['/tenants(.*)', '/document-types(.*)', '/internal(.*)'],
    }),
  ],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BasicAuthMiddleware).forRoutes('/admin')
  }
}
