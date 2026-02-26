import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/test-utils';
import Register from '../Register';

describe('Register', () => {
  it('登録フォームが表示される', () => {
    renderWithProviders(<Register />);

    expect(screen.getByRole('heading', { name: '新規登録' })).toBeInTheDocument();
    expect(screen.getByText('名前')).toBeInTheDocument();
    expect(screen.getByText('メールアドレス')).toBeInTheDocument();
    // 「パスワード」ラベルが2つあることを確認
    expect(screen.getByText(/^パスワード$/)).toBeInTheDocument();
    expect(screen.getByText('パスワード（確認）')).toBeInTheDocument();
  });

  it('パスワード不一致でエラーが表示される', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Register />);

    // input要素をtype属性で取得
    const inputs = screen.getAllByRole('textbox');
    const nameInput = inputs[0]; // 名前
    const emailInput = inputs[1]; // メール

    // password type の input は role="textbox" にならないため直接取得
    const passwordInputs = document.querySelectorAll('input[type="password"]');

    await user.type(nameInput, 'テスト');
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInputs[0] as HTMLElement, 'password123');
    await user.type(passwordInputs[1] as HTMLElement, 'different123');

    await user.click(screen.getByRole('button', { name: '新規登録' }));

    expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument();
  });

  it('ログインリンクが存在する', () => {
    renderWithProviders(<Register />);

    const link = screen.getByRole('link', { name: 'ログイン' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/login');
  });
});
