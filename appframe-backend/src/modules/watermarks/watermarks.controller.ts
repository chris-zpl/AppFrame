import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { WatermarksService } from './watermarks.service';
import { WatermarkResponseDto } from './dto/response/watermark-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../users/enums/user-role.enum';


@Controller('watermarks')
@UseInterceptors(ClassSerializerInterceptor)
export class WatermarksController {
  constructor(private readonly watermarksService: WatermarksService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async listMine(
    @CurrentUser('userId') userId: string,
  ): Promise<WatermarkResponseDto[]> {
    return this.watermarksService.findByUser(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<WatermarkResponseDto> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    if (file.mimetype !== 'image/png' && !file.originalname.toLowerCase().endsWith('.png')) {
      throw new BadRequestException('Apenas arquivos PNG com canal alfa transparente são suportados.');
    }
    return this.watermarksService.upload(userId, file);
  }

  @Get(':id/file')
  async serveFile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const filePath = await this.watermarksService.getFilePath(id);
    return res.sendFile(filePath);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getByIdDirect(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<WatermarkResponseDto> {
    return this.watermarksService.findById(id, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteDirect(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser('userId') userId: string,
  ): Promise<{ deleted: boolean }> {
    const deleted = await this.watermarksService.delete(id, userId);
    return { deleted };
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async listByUser(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<WatermarkResponseDto[]> {
    const isOwner = currentUser.userId === userId;
    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
    if (!isOwner && !isSuperAdmin) {
      throw new ForbiddenException('Acesso negado aos recursos de outro usuário.');
    }
    return this.watermarksService.findByUser(userId);
  }

  @Get(':id/user/:userId')
  @UseGuards(JwtAuthGuard)
  async getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<WatermarkResponseDto> {
    const isOwner = currentUser.userId === userId;
    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
    if (!isOwner && !isSuperAdmin) {
      throw new ForbiddenException('Acesso negado aos recursos de outro usuário.');
    }
    return this.watermarksService.findById(id, userId);
  }

  @Delete(':id/user/:userId')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<{ deleted: boolean }> {
    const isOwner = currentUser.userId === userId;
    const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
    if (!isOwner && !isSuperAdmin) {
      throw new ForbiddenException('Acesso negado para remover recursos de outro usuário.');
    }
    const deleted = await this.watermarksService.delete(id, userId);
    return { deleted };
  }
}
