import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UnauthorizedException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { OnboardingService } from "../services/onboarding.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";
import {
  CreateOnboardingSchema,
  type CreateOnboardingDto,
  type OnboardingCredentials,
  type OcrOnboardingDraft,
} from "@tiby/ts-shared";

@Controller("faskes")
@UseGuards(RolesGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  private extractUserId(req: AuthenticatedRequest): string {
    const userId = req.session?.user?.id ?? req.user?.id;
    if (!userId) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Nakes authentication session required",
      });
    }
    return userId;
  }

  @Post("onboarding")
  @Roles(["NAKES"])
  async onboard(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: CreateOnboardingSchema }) body: CreateOnboardingDto,
  ): Promise<OnboardingCredentials> {
    const nakesUserId = this.extractUserId(req);
    return this.onboardingService.createOnboarding(nakesUserId, body);
  }

  @Post("onboarding/ocr")
  @Roles(["NAKES"])
  @UseInterceptors(FileInterceptor("cardImage", { limits: { fileSize: 10 * 1024 * 1024 } }))
  async ocrExtract(
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|jpg|png|webp)$/,
            fallbackToMimetype: true,
          }),
        ],
      }),
    )
    file?: Express.Multer.File,
  ): Promise<OcrOnboardingDraft> {
    return this.onboardingService.extractOcr(file);
  }
}
