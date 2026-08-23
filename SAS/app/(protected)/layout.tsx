import SessionTimeoutGuard from '@/components/shared/SessionTimeoutGuard';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <SessionTimeoutGuard>{children}</SessionTimeoutGuard>;
}
