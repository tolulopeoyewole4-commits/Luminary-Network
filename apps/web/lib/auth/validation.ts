export type AuthFieldErrors = {
  email?: string;
  password?: string;
  fullName?: string;
  confirmPassword?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return undefined;
}

export function validateLoginForm(input: {
  email: string;
  password: string;
}): AuthFieldErrors {
  return {
    email: validateEmail(input.email),
    password: validatePassword(input.password),
  };
}

export function validateRegisterForm(input: {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}): AuthFieldErrors {
  const errors: AuthFieldErrors = {
    email: validateEmail(input.email),
    password: validatePassword(input.password),
    fullName: input.fullName.trim() ? undefined : "Full name is required.",
  };

  if (!input.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function validateForgotPasswordForm(input: {
  email: string;
}): AuthFieldErrors {
  return {
    email: validateEmail(input.email),
  };
}

export function hasFieldErrors(errors: AuthFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
