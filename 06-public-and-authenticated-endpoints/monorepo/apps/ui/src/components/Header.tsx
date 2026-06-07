import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { Moon, Sun, User } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  const { dark, setDark } = useTheme();
  const { isLoggedIn, login, logout } = useAuth();

  return (
    <header className="w-full max-w-5xl mx-auto flex items-center pr-4">
      <Button className="m-1 ml-4" asChild variant="ghost">
        <Link to="/">Home</Link>
      </Button>
      <Button className="m-1" asChild variant="ghost">
        <Link to="/upload">Upload</Link>
      </Button>
      <Button className="m-1" asChild variant="ghost">
        <Link to="/profile">Profile</Link>
      </Button>
      <Button
        className="m-1  ml-auto"
        variant="ghost"
        size="icon"
        onClick={() => {
          setDark(!dark);
        }}
      >
        {dark ? <Sun /> : <Moon />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <User />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
          {isLoggedIn ? (
            <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={login}>Login</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default Header;
