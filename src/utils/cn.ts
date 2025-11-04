/**
 * Utility function to conditionally combine classNames
 * Provides a simple way to merge CSS classes with conditional logic
 */

import clsx from 'clsx'

/**
 * Conditionally join classNames together
 * @param inputs - CSS class names or conditional objects
 * @returns Combined className string
 */
export function cn(...inputs: (string | undefined | null | boolean | { [key: string]: boolean })[]) {
  return clsx(inputs.filter(Boolean))
}

export default cn