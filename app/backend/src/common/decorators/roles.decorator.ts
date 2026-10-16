import { Reflector } from "@nestjs/core";
import type { UserRole } from "@tiby/ts-shared";

export const Roles = Reflector.createDecorator<UserRole[]>();
