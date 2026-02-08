import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  BarChart3, 
  FlaskConical, 
  BookOpen, 
  Menu, 
  X, 
  Github, 
  Layers,
  Presentation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NavItem = ({ to, icon: Icon, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
        isActive 
          ? "bg-muted text-primary" 
          : "text-muted-foreground"
      )
    }
  >
    <Icon className="h-4 w-4" />
    {label}
  </NavLink>
);

export default function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      {/* Mobile Header - Fixed at top on mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm">SASB</span>
          <span>Air Quality</span>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleMenu}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixed on desktop, slide-in on mobile */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 lg:w-72 flex flex-col border-r bg-card transition-transform duration-300 ease-in-out",
          // Mobile: slide in from left
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible
          "lg:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center border-b px-6 lg:h-[60px]">
          <div className="flex items-center gap-2 font-bold">
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm">SASB</span>
            <span>Air Quality</span>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={toggleMenu}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="grid items-start px-4 text-sm font-medium gap-1">
            <NavItem to="/" icon={BarChart3} label="Insights Dashboard" onClick={() => setIsMobileMenuOpen(false)} />
            <NavItem to="/analysis" icon={Layers} label="Clustering Analysis" onClick={() => setIsMobileMenuOpen(false)} />
            <NavItem to="/policy" icon={FlaskConical} label="Policy Lab" onClick={() => setIsMobileMenuOpen(false)} />
            <NavItem to="/resources" icon={BookOpen} label="Research Hub" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="my-4 border-t" />
            <NavItem to="/process" icon={Presentation} label="Our Process" onClick={() => setIsMobileMenuOpen(false)} />
          </nav>
        </div>

        <div className="mt-auto p-4 border-t">
          <Button variant="outline" className="w-full gap-2" asChild>
            <a href="https://github.com/Yash121l/SASB" target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </Button>
        </div>
      </aside>

      {/* Main Content - Offset by sidebar width on desktop, with top padding on mobile */}
      <main className="lg:ml-72 min-h-screen">
        {/* Mobile header spacer */}
        <div className="h-14 lg:hidden" />
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
