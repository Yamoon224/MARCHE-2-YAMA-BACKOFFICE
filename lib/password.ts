export type PasswordProblem = "short" | "letter" | "digit" | "mismatch";

/** Mêmes règles que le serveur : 8 caractères minimum, au moins une lettre et un chiffre. */
export function passwordProblem(password: string, confirmation: string): PasswordProblem | null {
  if (password.length < 8) return "short";
  if (!/\p{L}/u.test(password)) return "letter";
  if (!/\p{N}/u.test(password)) return "digit";
  if (password !== confirmation) return "mismatch";

  return null;
}

export const PASSWORD_PROBLEM_TEXT: Record<PasswordProblem, string> = {
  short: "Le mot de passe doit faire au moins 8 caractères.",
  letter: "Le mot de passe doit contenir au moins une lettre.",
  digit: "Le mot de passe doit contenir au moins un chiffre.",
  mismatch: "Les deux mots de passe ne sont pas identiques.",
};
