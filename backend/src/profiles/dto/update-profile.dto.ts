import {
  IsString,
  IsOptional,
  MaxLength,
  IsInt,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MaxLength(50, { message: '名前は50文字以内で入力してください' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: '経歴は1000文字以内で入力してください' })
  biography?: string;

  @IsOptional()
  @IsInt()
  thumbnailVideoId?: number;

  @IsOptional()
  @IsInt()
  popupVideoId?: number;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'テーマカラーの形式が正しくありません',
  })
  themeColor?: string;
}
