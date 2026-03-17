import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WalletProvider } from "./contexts/WalletContext";
import Home from "./pages/Home";
import Buy from "./pages/Buy";
import Portfolio from "./pages/Portfolio";
import Stake from "./pages/Stake";
import Analytics from "./pages/Analytics";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/buy"} component={Buy} />
      <Route path={"/portfolio"} component={Portfolio} />
      <Route path={"/stake"} component={Stake} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <WalletProvider>
          <TooltipProvider>
            <Toaster />
            <Navbar />
            <Router />
            <Footer />
          </TooltipProvider>
        </WalletProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
