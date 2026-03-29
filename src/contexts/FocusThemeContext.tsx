import * as React from "react";

export type FocusThemeMode = "light" | "dark";

const FocusThemeContext = React.createContext<FocusThemeMode>("dark");

export function FocusThemeProvider({
  value,
  children,
}: {
  value: FocusThemeMode;
  children: React.ReactNode;
}) {
  return (
    <FocusThemeContext.Provider value={value}>
      {children}
    </FocusThemeContext.Provider>
  );
}

export function useFocusTheme(): FocusThemeMode {
  return React.useContext(FocusThemeContext);
}
