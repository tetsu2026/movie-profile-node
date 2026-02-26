import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEmail({}, { message: '有効なメールアドレスを入力してください' })
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8, { message: 'パスワードは8文字以上で入力してください' })
  password: string;

  @IsString()
  passwordConfirmation: string;
}
