import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateUserStatusDto {
  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class SaveSmtpDto {
  @IsString()
  @IsNotEmpty()
  host: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsString()
  @IsOptional()
  user: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsString()
  @IsOptional()
  fromName: string;

  @IsString()
  @IsOptional()
  fromEmail: string;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @IsOptional()
  @IsBoolean()
  hasPassword?: boolean;
}

export class SaveGeminiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(15)
  apiKey: string;

  @IsOptional()
  @IsString()
  model?: string;
}

export class TestSmtpDto {
  @IsEmail()
  toEmail: string;
}
