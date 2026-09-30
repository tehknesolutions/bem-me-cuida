import { z } from 'zod';
export const moodValues = ['very_low', 'low', 'neutral', 'good', 'very_good'] as const;
export const sleepQualityValues = ['poor', 'partial', 'good'] as const;
export const checkInSchema = z.object({ id:z.uuid(), userId:z.uuid().nullable(), occurredAt:z.iso.datetime(), mood:z.enum(moodValues), anxiety:z.number().int().min(0).max(10), energy:z.number().int().min(0).max(10), irritability:z.number().int().min(0).max(10), agitation:z.number().int().min(0).max(10), impulsivity:z.number().int().min(0).max(10), concentration:z.number().int().min(0).max(10), craving:z.number().int().min(0).max(10), sleepQuality:z.enum(sleepQualityValues), sleepMinutes:z.number().int().min(0).max(1440).nullable(), note:z.string().trim().max(500).nullable(), createdAt:z.iso.datetime(), updatedAt:z.iso.datetime() });
export type CheckIn=z.infer<typeof checkInSchema>; export type MoodValue=(typeof moodValues)[number]; export type SleepQuality=(typeof sleepQualityValues)[number];
export const createCheckInInputSchema=checkInSchema.omit({id:true,userId:true,createdAt:true,updatedAt:true,occurredAt:true});
export type CreateCheckInInput=z.infer<typeof createCheckInInputSchema>;
