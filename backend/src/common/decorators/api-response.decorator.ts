import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const API_TAG_KEY = 'apiTag';
export const ApiTag = (tag: string) => SetMetadata(API_TAG_KEY, tag);

