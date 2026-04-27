import type { ReactNode } from 'react';
import '@/styles/AdminStyles/AdminLayout.css';

type Props = {
  children: ReactNode;
};

export default function AdminShipmentsLayout({ children }: Props) {
  return <>{children}</>;
}