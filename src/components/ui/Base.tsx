import * as React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card = ({ children, className = '', onClick }: CardProps) => (
  <motion.div
    whileHover={onClick ? { y: -4, transition: { duration: 0.3, ease: "easeOut" } } : {}}
    onClick={onClick}
    className={`bg-white dark:bg-zinc-900/50 dark:backdrop-blur-xl rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer ${className}`}
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
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)]',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
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
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 18} className="pointer-events-none" strokeWidth={2.5} />}
      {children && <span className="pointer-events-none">{children}</span>}
    </motion.button>
  );
};

export const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${className}`}>
    {children}
  </span>
);
