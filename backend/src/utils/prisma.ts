import { Prisma } from '@prisma/client';

export async function runWithDuplicateHandling<T>(operation: () => Promise<T>): Promise<{ duplicate: boolean; result?: T }> {
  try {
    return { duplicate: false, result: await operation() };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { duplicate: true };
    }
    throw error;
  }
}
