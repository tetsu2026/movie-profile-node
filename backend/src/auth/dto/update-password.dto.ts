import { IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: '新しいパスワードは8文字以上で入力してください' })
  newPassword: string;
}
