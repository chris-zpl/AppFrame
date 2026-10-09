import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class Generate2faResponseDto {
  @Expose()
  secret: string;

  @Expose()
  qr_code_data_url: string;

  @Expose()
  recovery_codes: string[];
}
