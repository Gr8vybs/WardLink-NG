import { cn } from "@/lib/utils/cn";

export function Label({ className, children, ...props }) {
  return (
    <label 
      className={cn("text-sm font-medium text-gray-300 mb-1.5 block", className)}
      {...props}
    >
      {children}
    </label>
  );
}
