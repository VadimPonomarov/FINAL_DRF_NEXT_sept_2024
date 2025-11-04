import Joi from "joi";
import { IRegistration } from "@/shared/types/auth.interfaces";

export const schema = Joi.object<IRegistration>({
  email: Joi.string()
    .email({ tlds: { allow: false } }) // Disable TLD validation
    .required()
    .messages({
      "string.email": "Invalid email format",
      "string.empty": "Email is required",
      "any.required": "Email is required",
    }),
  password: Joi.string().required().min(8).messages({
    "any.required": "Password is required",
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters",
  }),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords must match",
    "string.empty": "Password confirmation is required",
    "any.required": "Password confirmation is required",
  }),
});
