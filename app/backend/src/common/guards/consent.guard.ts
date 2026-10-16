import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

@Injectable()
export class ConsentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.session?.user ?? request.user;

    if (!user) {
      return true;
    }

    if (
      user.role === "PASIEN" &&
      (user.must_confirm_consent === true || user.mustConfirmConsent === true)
    ) {
      throw new ForbiddenException({
        code: "CONSENT_REQUIRED",
        message: "Patient must confirm consent before accessing clinical records",
      });
    }

    return true;
  }
}
