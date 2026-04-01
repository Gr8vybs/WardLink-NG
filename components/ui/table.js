import { cn } from "@/lib/utils/cn";

export function Table({ className, children, ...props }) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className, children, ...props }) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props}>{children}</thead>;
}

export function TableBody({ className, children, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props}>{children}</tbody>;
}

export function TableRow({ className, children, ...props }) {
  return (
    <tr
      className={cn("border-b transition-colors hover:bg-gray-50", className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className, children, ...props }) {
  return (
    <th
      className={cn("h-12 px-4 text-left align-middle font-medium text-gray-500", className)}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }) {
  return (
    <td
      className={cn("p-4 align-middle", className)}
      {...props}
    >
      {children}
    </td>
  );
}
