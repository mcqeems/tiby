import { Module, Global } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLog } from "./entities/audit-log.entity.js";
import { AuditService } from "./audit.service.js";
import { AuditInterceptor } from "./audit.interceptor.js";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [
    AuditService,
    AuditInterceptor,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
