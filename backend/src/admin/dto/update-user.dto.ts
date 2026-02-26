import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  biography?: string;

  @IsEnum(['admin', 'user'], { message: '権限はadminまたはuserを指定してください' })
  role: 'admin' | 'user';

  @IsOptional()
  @IsInt()
  thumbnailVideoId?: number;
}
