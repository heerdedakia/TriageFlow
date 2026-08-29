import Link from 'next/link';
import { loginUser } from '@/app/actions/auth';
import LoginFormClient from './LoginFormClient';
import styles from '@/styles/theme.module.css';

export default async function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoBug}>Bugzilla</span>
          <span className={styles.logoDtr}>DTR</span>
        </div>
        <h1 className={styles.title}>Sign in to your workspace</h1>
        <p className={styles.subtitle}>Enter your credentials or click a demo account below</p>

        <LoginFormClient loginAction={loginUser} />

        <p className={styles.footerLink}>
          {"Don't have an account?"} <Link href="/register" className={styles.link}>Create one now</Link>
        </p>
      </div>
    </div>
  );
}
