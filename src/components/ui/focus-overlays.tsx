import * as React from "react";
import { DialogContent } from "@/components/ui/dialog";
import { AlertDialogContent } from "@/components/ui/alert-dialog";
import { PopoverContent } from "@/components/ui/popover";
import { SelectContent } from "@/components/ui/select";
import {
  DropdownMenuContent,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useFocusTheme } from "@/contexts/FocusThemeContext";
import { cn } from "@/lib/utils";

export const FocusDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, ...props }, ref) => {
  const mode = useFocusTheme();
  return (
    <DialogContent
      ref={ref}
      className={cn(mode === "light" && "finance-theme", className)}
      {...props}
    />
  );
});
FocusDialogContent.displayName = "FocusDialogContent";

export const FocusAlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogContent>,
  React.ComponentPropsWithoutRef<typeof AlertDialogContent>
>(({ className, ...props }, ref) => {
  const mode = useFocusTheme();
  return (
    <AlertDialogContent
      ref={ref}
      className={cn(mode === "light" && "finance-theme", className)}
      {...props}
    />
  );
});
FocusAlertDialogContent.displayName = "FocusAlertDialogContent";

export const FocusPopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  React.ComponentPropsWithoutRef<typeof PopoverContent>
>(({ className, ...props }, ref) => {
  const mode = useFocusTheme();
  return (
    <PopoverContent
      ref={ref}
      className={cn(mode === "light" && "finance-theme", className)}
      {...props}
    />
  );
});
FocusPopoverContent.displayName = "FocusPopoverContent";

export const FocusSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectContent>,
  React.ComponentPropsWithoutRef<typeof SelectContent>
>(({ className, ...props }, ref) => {
  const mode = useFocusTheme();
  return (
    <SelectContent
      ref={ref}
      className={cn(mode === "light" && "finance-theme", className)}
      {...props}
    />
  );
});
FocusSelectContent.displayName = "FocusSelectContent";

export const FocusDropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuContent>
>(({ className, ...props }, ref) => {
  const mode = useFocusTheme();
  return (
    <DropdownMenuContent
      ref={ref}
      className={cn(mode === "light" && "finance-theme", className)}
      {...props}
    />
  );
});
FocusDropdownMenuContent.displayName = "FocusDropdownMenuContent";

export const FocusDropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuSubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuSubContent>
>(({ className, ...props }, ref) => {
  const mode = useFocusTheme();
  return (
    <DropdownMenuSubContent
      ref={ref}
      className={cn(mode === "light" && "finance-theme", className)}
      {...props}
    />
  );
});
FocusDropdownMenuSubContent.displayName = "FocusDropdownMenuSubContent";
