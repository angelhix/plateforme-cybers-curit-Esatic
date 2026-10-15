import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, type SessionUser } from './auth';

export type AdminUser = SessionUser & { role: 'ADMIN' };

export async function requireAdmin(): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/connexion?next=%2Fadmin');
  if (user.role !== 'ADMIN') notFound();
  return { ...user, role: 'ADMIN' as const };
}
