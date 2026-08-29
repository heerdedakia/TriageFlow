import React from 'react';
import styles from '@/styles/theme.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', ...props }) => {
  const variantClass = {
    primary: styles.link,
    secondary: styles.saveFilterCancelBtn,
    danger: styles.saveErrorText,
  }[variant];
  return <button className={`${variantClass} ${className}`} {...props} />;
};
