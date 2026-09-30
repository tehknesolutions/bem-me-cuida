import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(254);
export const passwordSchema = z.string().min(10, 'Use pelo menos 10 caracteres.').max(128);
export const signInInputSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Informe sua senha.').max(128) });
export const signUpInputSchema = z.object({ email: emailSchema, password: passwordSchema, passwordConfirmation: z.string() }).refine((value) => value.password === value.passwordConfirmation, { path: ['passwordConfirmation'], message: 'As senhas não coincidem.' });
export const resetPasswordInputSchema = z.object({ password: passwordSchema, passwordConfirmation: z.string() }).refine((value) => value.password === value.passwordConfirmation, { path: ['passwordConfirmation'], message: 'As senhas não coincidem.' });
export type SignInInput = z.infer<typeof signInInputSchema>;
export type SignUpInput = z.infer<typeof signUpInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
