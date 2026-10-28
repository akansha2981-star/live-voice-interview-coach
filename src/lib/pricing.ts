export const INTERVIEW_PRICE_INR = 99;
export const GDPI_COURSE_PRICE_INR = 799;
export const RESUME_REVIEW_PRICE_INR = 0;
export const FREE_SOP_CREDITS = 2;
export const NMIMS_RESERVED_SOP_CREDITS = 1;
export function interviewPackPrice(credits: number) { return credits * INTERVIEW_PRICE_INR; }