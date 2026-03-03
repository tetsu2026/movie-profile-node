import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/test-utils';
import Login from '../Login';

describe('Login', () => {
  it('ログインフォームが表示される', () => {
    renderWithProviders(<Login />);

    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByText('パスワード')).toBeInTheDocument();
  });

  it('送信ボタンが存在する', () => {
    renderWithProviders(<Login />);

    const button = screen.getByRole('button', { name: 'ログイン' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('新規登録リンクが存在する', () => {
    renderWithProviders(<Login />);

    const link = screen.getByRole('link', { name: '新規登録' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/register');
  });

  it('パスワードリセットリンクが存在する', () => {
    renderWithProviders(<Login />);

    const link = screen.getByRole('link', { name: 'パスワードをお忘れですか？' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/forgot-password');
  });
});
