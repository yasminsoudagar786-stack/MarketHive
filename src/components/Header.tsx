import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Home, LayoutDashboard, LogOut, Moon, Package, Search, ShoppingCart, Sun, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "./common";
import { SearchBox } from "./SearchBox";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { useAuth, homeFor } from "@/stores/auth";
import { useCartLines } from "@/hooks/use-cart-lines";
import { useCart } from "@/stores/cart";

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark; setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("mh-theme", next ? "dark" : "light");
  };
  return <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle dark mode">{dark ? <Sun /> : <Moon />}</Button>;
}

function useSignOut() {
  const qc = useQueryClient(); const navigate = useNavigate(); const logout = useAuth((s) => s.logout);
  return () => { qc.clear(); logout(); navigate({ to: "/login", replace: true }); };
}

export function Header() {
  const user = useAuth((s) => s.user);
  const { count } = useCartLines();
  const setDrawer = useCart((s) => s.setDrawer);
  const signOut = useSignOut();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Logo />
        <div className="hidden flex-1 md:block"><SearchBox /></div>
        <nav className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {user?.role !== "vendor" && user?.role !== "admin" && (
            <Button variant="ghost" size="icon" className="relative" aria-label={`Cart, ${count} items`} onClick={() => setDrawer(true)}>
              <ShoppingCart />
              {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber px-1 text-[10px] font-bold text-amber-foreground">{count}</span>}
            </Button>
          )}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2" aria-label="Account menu">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">{user.name[0]}</span>
                  <span className="hidden text-sm lg:inline">{user.name.split(" ")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="capitalize">{user.role} account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.role === "customer" ? (
                  <>
                    <DropdownMenuItem asChild><Link to="/orders"><Package /> My orders</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/profile"><User /> Profile</Link></DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild><Link to={homeFor(user.role)}><LayoutDashboard /> Dashboard</Link></DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="hero" size="sm" asChild><Link to="/login">Sign in</Link></Button>
          )}
        </nav>
      </div>
      <div className="px-4 pb-3 md:hidden"><SearchBox /></div>
    </header>
  );
}

export function MobileNav() {
  const user = useAuth((s) => s.user);
  const setDrawer = useCart((s) => s.setDrawer);
  const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground [&.active]:text-primary";
  return (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur md:hidden">
      <Link to="/" className={item} activeOptions={{ exact: true }}><Home className="h-5 w-5" />Home</Link>
      <Link to="/search" className={item}><Search className="h-5 w-5" />Search</Link>
      <button className={item} onClick={() => setDrawer(true)}><ShoppingCart className="h-5 w-5" />Cart</button>
      {user && user.role !== "customer"
        ? <Link to={homeFor(user.role)} className={item}><LayoutDashboard className="h-5 w-5" />Dashboard</Link>
        : <Link to={user ? "/orders" : "/login"} className={item}><User className="h-5 w-5" />Account</Link>}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t pb-20 md:pb-0">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground md:flex-row md:justify-between">
        <Logo />
        <p>© 2026 MarketHive. Secure payments · Easy returns · 12,000+ sellers</p>
      </div>
    </footer>
  );
}
