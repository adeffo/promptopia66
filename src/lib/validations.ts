import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse").max(255, "E-Mail zu lang"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein").max(100, "Passwort zu lang"),
});

export const promptSchema = z.object({
  title: z.string().trim().min(1, "Titel erforderlich").max(100, "Titel zu lang (max. 100 Zeichen)"),
  prompt_text: z.string().trim().min(10, "Prompt-Text muss mindestens 10 Zeichen lang sein").max(5000, "Prompt-Text zu lang (max. 5000 Zeichen)"),
  tags: z.array(z.string().trim().max(50, "Tag zu lang")).max(10, "Maximal 10 Tags erlaubt"),
  model_used: z.string().max(50, "Modellname zu lang").optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export const commentSchema = z.object({
  text: z.string().trim().min(1, "Kommentar darf nicht leer sein").max(1000, "Kommentar zu lang (max. 1000 Zeichen)"),
});

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Anzeigename erforderlich").max(50, "Anzeigename zu lang (max. 50 Zeichen)"),
});
