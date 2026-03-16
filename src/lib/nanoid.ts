import { customAlphabet } from 'nanoid';

export const generateSlug = customAlphabet(
  '23456789abcdefghjkmnpqrstuvwxyz',
  8
);

export const generateToken = customAlphabet(
  '0123456789abcdefghijklmnopqrstuvwxyz',
  32
);
