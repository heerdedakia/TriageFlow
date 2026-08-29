import Link from 'next/link';
import { registerUser } from '@/app/actions/auth';
import RegisterFormClient from './RegisterFormClient';
import styles from '@/styles/theme.module.css';

export default async function RegisterPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoBug}>Bugzilla</span>
          <span className={styles.logoDtr}>DTR</span>
        </div>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Get started with your custom issue tracking workspace</p>

        <RegisterFormClient registerAction={registerUser} />

        <p className={styles.footerLink}>
          Already have an account? <Link href="/login" className={styles.link}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
