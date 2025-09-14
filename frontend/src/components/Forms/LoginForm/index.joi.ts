import Joi from "joi";
import { IDummyAuth } from "@/common/interfaces/dummy.interfaces";
import { IBackendAuthCredentials } from "@/common/interfaces/auth.interfaces";

export const dummySchema = Joi.object<IDummyAuth>({
    username: Joi.string()
        .required()
        .messages({
            "string.empty": "Username is required",
            "any.required": "Username is required"
        }),
    password: Joi.string()
        .required()
        .messages({
            "string.empty": "Password is required",
            "any.required": "Password is required"
        }),
    expiresInMins: Joi.number()
        .default(30)
        .valid(30, 60)
        .messages({
            "any.only": "Session duration must be either 30 or 60 minutes"
        })
});

export const backendSchema = Joi.object<IBackendAuthCredentials>({
    email: Joi.string()
        .email({ tlds: { allow: false } }) // Disable TLD validation
        .required()
        .messages({
            "string.email": "Invalid email format",
            "string.empty": "Email is required",
            "any.required": "Email is required"
        }),
    password: Joi.string()
        .required()
        .min(8)
        .messages({
            "any.required": "Password is required",
            "string.empty": "Password is required",
            "string.min": "Password must be at least 8 characters",
        }),
});
