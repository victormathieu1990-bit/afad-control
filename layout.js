import "./globals.css";

export const metadata = {
  title: "AFAD · Refugio de perros y gatos",
  description: "AFAD · Refugio de perros y gatos"
};

export default function RootLayout({ children }) {
  return <html lang="es"><body>{children}</body></html>;
}