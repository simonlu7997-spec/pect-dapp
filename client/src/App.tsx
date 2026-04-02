import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { WalletProvider } from "./contexts/WalletContext";
import { WhitelistProvider } from "./contexts/WhitelistContext";
import Home from "./pages/Home";
import Buy from "./pages/Buy";
import Portfolio from "./pages/Portfolio";
import Stake from "./pages/Stake";
import Analytics from "./pages/Analytics";
import Whitelist from "./pages/Whitelist";
import Docs from "./pages/Docs";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import AdminKyc from "./pages/AdminKyc";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/buy"} component={Buy} />
      <Route path={"/portfolio"} component={Portfolio} />
      <Route path={"/stake"} component={Stake} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/whitelist"} component={Whitelist} />
      <Route path={"/docs"} component={Docs} />
      <Route path={"/faq"} component={FAQ} />
      <Route path={"/contact"} component={Contact} />
      <Route path={"/admin/kyc"} component={AdminKyc} />
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
          <WhitelistProvider>
            <TooltipProvider>
              <Toaster />
              <Navbar />
              <Router />
              <Footer />
            </TooltipProvider>
          </WhitelistProvider>
        </WalletProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
