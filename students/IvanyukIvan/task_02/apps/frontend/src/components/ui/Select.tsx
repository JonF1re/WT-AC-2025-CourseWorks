import { SelectHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import '../../styles.css';

type Props = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, Props>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={clsx('input', className)} {...props} />;
});
