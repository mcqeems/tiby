import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AuditService } from "./audit.service.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<AuthenticatedRequest>();
    const method = req.method;

    // Log mutating HTTP methods for UU PDP audit trail
    const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

    return next.handle().pipe(
      tap(() => {
        if (isMutating) {
          const user = req.session?.user ?? req.user;
          const ip = req.ip || req.headers["x-forwarded-for"] || null;
          const path = req.path || req.url;
          const segments = (path || "").split("/").filter(Boolean);
          const afterApi = segments[0] === "api" ? segments.slice(1) : segments;

          this.auditService.log({
            actorUserId: user?.id ?? null,
            actorRole: user?.role ?? "ANONYMOUS",
            action: `${method} ${path}`,
            targetEntity: afterApi.slice(0, 2).join("/") || "unknown",
            targetId: req.params?.id || req.body?.id || "none",
            ipAddress: typeof ip === "string" ? ip : Array.isArray(ip) ? ip[0] : null,
            metadataJson: {
              statusCode: httpContext.getResponse().statusCode,
            },
          }).catch(() => {
            // Non-blocking logging failure
          });
        }
      }),
    );
  }
}
