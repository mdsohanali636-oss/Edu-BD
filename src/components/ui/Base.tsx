import * as React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  key?: React.Key;
}

export const Card = ({ children, className = '', onClick, ...props }: CardProps) => (
  <motion.div
    whileHover={onClick ? { y: -4, transition: { duration: 0.3, ease: "easeOut" } } : {}}
    onClick={onClick}
    className={`glass-card rounded-[32px] overflow-hidden transition-all duration-300 cursor-pointer ${className}`}
    {...(props as any)}
  >
    {children}
  </motion.div>
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: 'submit' | 'reset' | 'button';
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className = '',
  onClick,
  disabled,
  ...props
}: ButtonProps) => {
  const variants = {
    primary: 'bg-primary-palette text-white hover:opacity-90 shadow-[0_4px_14px_0_rgba(155,142,199,0.39)]',
    secondary: 'bg-brand-cream text-zinc-900 hover:opacity-80 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
    outline: 'border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
    ghost: 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-[0_4px_14px_0_rgba(239,68,68,0.39)]',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
    icon: 'p-2.5',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...(props as any)}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 18} className="pointer-events-none" strokeWidth={2.5} />}
      {children && <span className="pointer-events-none whitespace-nowrap">{children}</span>}
    </motion.button>
  );
};

export const Badge = ({ children, className = '', ...props }: { children: React.ReactNode; className?: string; key?: React.Key }) => (
  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${className}`} {...props}>
    {children}
  </span>
);
