import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Roles } from "../decorators/roles.decorator.js";
import type { UserRole } from "@tiby/ts-shared";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>(Roles, context.getHandler()) ||
      this.reflector.get<UserRole[]>(Roles, context.getClass());

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userRole = request.session?.user?.role ?? request.user?.role;

    if (!userRole) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "No user session found or role undefined",
      });
    }

    // ADMIN has absolute authorization over everything
    if (userRole === "ADMIN") {
      return true;
    }

    const hasRole = requiredRoles.includes(userRole as UserRole);
    if (!hasRole) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: `Role ${userRole} does not have permission to access this resource`,
      });
    }

    return true;
  }
}
