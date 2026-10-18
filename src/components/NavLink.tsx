import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type NavLinkRenderProps = {
  isActive: boolean;
  isPending: boolean;
  isTransitioning: boolean;
};

interface NavLinkCompatProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href" | "children"> {
  to: string;
  end?: boolean;
  caseSensitive?: boolean;
  className?: string | ((props: NavLinkRenderProps) => string | undefined);
  activeClassName?: string;
  pendingClassName?: string;
  children?: ReactNode | ((props: NavLinkRenderProps) => ReactNode);
}

// Misma regla de coincidencia que el NavLink de React Router v6.
function matchesPath(pathname: string, to: string, end: boolean, caseSensitive: boolean) {
  let locationPathname = pathname;
  let toPathname = to.split(/[?#]/)[0] || "/";
  if (!caseSensitive) {
    locationPathname = locationPathname.toLowerCase();
    toPathname = toPathname.toLowerCase();
  }
  const endSlashPosition =
    toPathname !== "/" && toPathname.endsWith("/") ? toPathname.length - 1 : toPathname.length;
  return (
    locationPathname === toPathname ||
    (!end &&
      locationPathname.startsWith(toPathname) &&
      locationPathname.charAt(endSlashPosition) === "/")
  );
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  (
    { className, activeClassName, pendingClassName, to, end = false, caseSensitive = false, children, ...props },
    ref,
  ) => {
    const pathname = usePathname() ?? "";
    const renderProps: NavLinkRenderProps = {
      isActive: matchesPath(pathname, to, end, caseSensitive),
      isPending: false,
      isTransitioning: false,
    };

    const resolvedClassName =
      typeof className === "function"
        ? className(renderProps)
        : cn(className, renderProps.isActive && activeClassName, renderProps.isPending && pendingClassName);

    return (
      <Link
        ref={ref}
        href={to}
        aria-current={renderProps.isActive ? "page" : undefined}
        className={resolvedClassName}
        {...props}
      >
        {typeof children === "function" ? children(renderProps) : children}
      </Link>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
