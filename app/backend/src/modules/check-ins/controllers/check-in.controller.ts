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
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CheckInService } from "../services/check-in.service.js";
import { RolesGuard } from "../../../common/guards/roles.guard.js";
import { ConsentGuard } from "../../../common/guards/consent.guard.js";
import { Roles } from "../../../common/decorators/roles.decorator.js";
import type { AuthenticatedRequest } from "../../../common/types/auth-request.type.js";
import {
  SubmitCheckInSchema,
  TextExtractRequestSchema,
  type SubmitCheckInDto,
  type TextExtractRequest,
  type AiAudioExtractionResponse,
  type CheckInVerdictResponse,
  type UserRole,
} from "@tiby/ts-shared";

@Controller("check-ins")
@UseGuards(RolesGuard, ConsentGuard)
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  private extractUser(req: AuthenticatedRequest): { userId: string; role: UserRole } {
    const user = req.session?.user ?? req.user;
    if (!user?.id) {
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Authentication session required",
      });
    }
    return { userId: user.id, role: user.role };
  }

  @Post("audio-extract")
  @Roles(["PASIEN", "PMO"])
  @UseInterceptors(
    FileInterceptor("audio", {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async extractAudio(
    @Req() req: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          // Accept video/webm too: supertest maps .webm → video/webm,
          // browsers send audio/webm for voice recordings.
          // fallbackToMimetype: magic-number check first, mimetype string
          // fallback for buffers without detectable signatures (tests).
          new FileTypeValidator({
            fileType: /^(audio|video)\/(webm|wav|ogg|mp4|mpeg)$/,
            fallbackToMimetype: true,
          }),
        ],
      }),
    )
    file?: Express.Multer.File,
    @Body("treatmentPlanId") treatmentPlanId?: string,
  ): Promise<AiAudioExtractionResponse> {
    if (!file) {
      throw new BadRequestException({
        code: "BAD_REQUEST",
        message: "Audio file is required in 'audio' form-data field",
      });
    }
    const { userId, role } = this.extractUser(req);
    return this.checkInService.extractAudioPreview(userId, role, file, treatmentPlanId);
  }

  @Post("text-extract")
  @Roles(["PASIEN", "PMO"])
  async extractText(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: TextExtractRequestSchema }) body: TextExtractRequest,
  ): Promise<AiAudioExtractionResponse> {
    const { userId, role } = this.extractUser(req);
    return this.checkInService.extractTextPreview(userId, role, body);
  }

  @Post()
  @Roles(["PASIEN", "PMO"])
  async submitCheckIn(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: SubmitCheckInSchema }) body: SubmitCheckInDto,
  ): Promise<CheckInVerdictResponse> {
    const { userId, role } = this.extractUser(req);
    return this.checkInService.submitCheckIn(userId, role, body);
  }
}
