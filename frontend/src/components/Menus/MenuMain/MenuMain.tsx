"use client";
import { FC, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
// import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cleanupAuth } from '@/lib/auth/cleanupAuth';
import { Activity, Menu as BurgerIcon, X as CloseIcon, Shield, ChevronDown, User, Globe2 } from 'lucide-react';
import { useAuthProvider } from '@/contexts/AuthProviderContext';
import { AuthProvider } from '@/shared/constants/constants';
import { IMenuItem } from '@/components/All/MenuComponent/menu.interfaces';
import MenuComponent from '@/components/All/MenuComponent/MenuComponent';
import { ThemeControls } from '@/components/ui/theme-controls';
import { FaBook, FaSignOutAlt, FaNetworkWired, FaCar } from 'react-icons/fa';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MagicBackButton } from '@/components/ui/magicBackButton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const MenuMain: FC = () => {
  const { provider } = useAuthProvider();
  const router = useRouter();
  // const router = useRouter();
  // const pathname = usePathname();
  const { data: session, status } = useSession();
  const [currentProvider, setCurrentProvider] = useState<AuthProvider>(provider);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const menuTimeoutRef = useRef<NodeJS.Timeout>();

  // Сервисы, которые не поддерживают iframe из-за CORS ограничений
  const iframeBlockedServices: string[] = [];

  // Debug logging (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_MENU === 'true') {
      console.log('MenuMain - Session status:', status);
      console.log('MenuMain - Session data:', session);
      console.log('MenuMain - signOut function:', typeof signOut);
    }
  }, [session, status]);

  // Update currentProvider when provider changes
  useEffect(() => {
    setCurrentProvider(provider);
  }, [provider]);

  // Handle scroll behavior for mobile menu
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide menu when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-close menu on scroll
  useEffect(() => {
    const handleScrollAutoClose = () => {
      if (mobileMenuOpen) {
        // Clear existing timeout
        if (menuTimeoutRef.current) {
          clearTimeout(menuTimeoutRef.current);
        }
        
        // Set new timeout to close menu
        menuTimeoutRef.current = setTimeout(() => {
          setMobileMenuOpen(false);
        }, 1500); // Close after 1.5 seconds of scroll inactivity
      }
    };

    if (mobileMenuOpen) {
      window.addEventListener('scroll', handleScrollAutoClose, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScrollAutoClose);
      if (menuTimeoutRef.current) {
        clearTimeout(menuTimeoutRef.current);
      }
    };
  }, [mobileMenuOpen]);

  // Listen for auth provider changes
  useEffect(() => {
    const handleAuthProviderChanged = (event: CustomEvent) => {
      setCurrentProvider(event.detail.provider);
    };

    window.addEventListener('authProviderChanged', handleAuthProviderChanged as EventListener);

    return () => {
      window.removeEventListener('authProviderChanged', handleAuthProviderChanged as EventListener);
    };
  }, []);

  const menuItems = useMemo(() => {
    const isAuthenticated = !!session;
    const hasSelectedProvider = currentProvider !== AuthProvider.Select;

    console.log("Menu rendering with provider:", currentProvider);

    // Basic common menu items available for all providers
    const commonItems: IMenuItem[] = [
      {
        path: "/",
        label: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-2 ml-4 -mt-2">
                  <span className="text-sm">Home</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Home page</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        disabled: false,
        index: 0,
        tooltip: "Home page"
      },

      {
        path: "/login",
        label: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-2 ml-4 -mt-2">
                  <span className="text-sm">Login</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Login page</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        disabled: false,
        index: 98,
        tooltip: "Sign in"
      }
    ];

    // Add Auth item only for non-authenticated users
    if (!isAuthenticated) {
      commonItems.push({
        path: "/api/auth/signin",
        label: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-2 ml-4">
                  <span className="text-sm">Auth</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Authentication</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        disabled: false,
        index: 99,
        tooltip: "Authentication"
      });
    }

    // If no provider is selected, show only basic common items
    if (!hasSelectedProvider) {
      return commonItems.sort((a, b) => a.index - b.index);
    }

    // Menu items for MyBackendDocs provider
    const myBackendDocsItems: IMenuItem[] = [
      {
        path: '/docs',
        label: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-2">
                  <FaBook
                    size={18}
                    className="text-foreground group-hover:text-accent-foreground transition-colors"
                  />
                  <span className="text-sm">Docs</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Documentation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        disabled: !isAuthenticated,
        index: 3,
        provider: AuthProvider.MyBackendDocs,
        tooltip: "Documentation"
      },
      // Backend monitoring tools - only for MyBackendDocs provider
      {
        path: "/flower",
        label: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-2">
                  <Activity
                    size={18}
                    className="text-foreground group-hover:text-accent-foreground transition-colors"
                  />
                  <span className="text-sm">Flower</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Flower monitoring</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        disabled: !isAuthenticated,
        index: 4,
        provider: AuthProvider.MyBackendDocs,
        tooltip: "Flower monitoring"
      },
      {
        path: "/rabbitmq",
        label: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-2">
                  <FaNetworkWired
                    size={18}
                    className="text-foreground group-hover:text-accent-foreground transition-colors"
                  />
                  <span className="text-sm">RabbitMQ</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>RabbitMQ</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        disabled: !isAuthenticated,
        index: 5,
        provider: AuthProvider.MyBackendDocs,
        tooltip: "RabbitMQ"
      },
      {
        path: "/autoria",
        label: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-2">
                  <FaCar
                    size={18}
                    className="text-foreground group-hover:text-accent-foreground transition-colors"
                  />
                  <span className="text-sm">AutoRia</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Система объявлений автомобилей</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        disabled: !isAuthenticated,
        index: 6,
        provider: AuthProvider.MyBackendDocs,
        tooltip: "AutoRia - система объявлений"
      },
    ];

    // Menu items for Dummy provider
    const dummyItems: IMenuItem[] = [
      {
        path: "/users",
        label: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-2 ml-4">
                  <span className="text-sm">Users</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Users</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        disabled: !isAuthenticated,
        index: 1,
        provider: AuthProvider.Dummy,
        tooltip: "Users"
      },
      {
        path: "/recipes",
        label: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-2 ml-4">
                  <span className="text-sm">Recipes</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Recipes</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        disabled: !isAuthenticated,
        index: 2,
        provider: AuthProvider.Dummy,
        tooltip: "Recipes"
      }
    ];

    // Combine items based on the selected provider
    let allItems = [
      ...commonItems,
      ...(currentProvider === AuthProvider.MyBackendDocs ? myBackendDocsItems : []),
      ...(currentProvider === AuthProvider.Dummy ? dummyItems : [])
    ];

    // Add user profile and logout for authenticated users
    if (isAuthenticated) {
      // Add user profile item
      allItems.push({
        path: "/profile",
        label: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center justify-center">
                  <User
                    size={18}
                    className="text-foreground group-hover:text-accent-foreground transition-colors"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Profile</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        disabled: false,
        index: 100,
        tooltip: "User Profile"
      });

      // Add logout button
      allItems.push({
        path: "#",
        label: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center justify-center">
                  <FaSignOutAlt
                    size={18}
                    className="text-foreground group-hover:text-accent-foreground transition-colors"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sign out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        disabled: false,
        index: 101,
        cb: async function() {
          console.log('Logout callback called');
            try {
              console.log('Calling full cleanupAuth (Redis + NextAuth + storage)');
              await cleanupAuth('/api/auth/signin');
            } catch (error) {
              console.error('Error during cleanupAuth, fallback redirect to signin:', error);
              window.location.href = '/api/auth/signin';
            }
          },
          tooltip: "Sign out"
        }
      ];
    }

    console.log("Final menu items for provider", currentProvider, ":",
      allItems.map(item => typeof item.label === 'string' ? item.label : 'icon'));

    return allItems.sort((a, b) => a.index - b.index);
  }, [currentProvider, session]);

  return (
    <div className="relative mb-8">
      {/* Desktop menu */}
      <div className="hidden md:block">
        <MenuComponent items={menuItems} />
      </div>
      
      {/* Language Selector - Desktop - Bottom Left */}
      <div className="hidden md:block absolute left-4 bottom-4 z-[99999]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Globe2 className="h-4 w-4" />
              <span className="text-xs">🌍</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>English</DropdownMenuItem>
            <DropdownMenuItem>Українська</DropdownMenuItem>
            <DropdownMenuItem>Русский</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Mobile burger - Fixed positioned on the right */}
      <div className={`md:hidden fixed right-4 top-4 z-[1002] transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-20'}`}>
        <button
          className="relative p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:shadow-xl transition-all duration-200 group"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
        >
          {mobileMenuOpen ? (
            <CloseIcon size={24} className="text-gray-700 dark:text-gray-300 group-hover:text-red-500 transition-colors" />
          ) : (
            <div className="relative">
              <FaCar size={20} className="text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
              <ChevronDown size={12} className="absolute -bottom-1 -right-1 text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </div>
          )}
        </button>
      </div>
      {/* Выпадающее меню - More ergonomic for mobile */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Menu content */}
          <div className="md:hidden fixed right-4 top-20 z-50 w-72 max-w-[80vw] bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-lg animate-fade-in flex flex-col max-h-[70vh] overflow-hidden">
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 px-3 py-1">Меню</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {menuItems.map((item) => {
                if (item.disabled) return null;
                
                const handleClick = (e: React.MouseEvent) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);

                  if (item.cb) {
                    try {
                      if (typeof item.cb === 'function') {
                        item.cb();
                      } else {
                        console.error('Mobile menu callback is not a function:', item.cb);
                      }
                    } catch (error) {
                      console.error('Error executing mobile menu callback:', error);
                    }
                  } else if (item.path) {
                    if (iframeBlockedServices.includes(item.path)) {
                      // Сервисы, открываемые в новой вкладке из-за CORS ограничений
                      window.open(item.path, '_blank', 'noopener,noreferrer');
                    } else {
                      // Другие сервисы - используем Next.js роутинг для iframe
                      router.push(item.path);
                    }
                  }
                };

                return (
                  <a
                    key={item.path || `item-${item.index}`}
                    href={iframeBlockedServices.includes(item.path) ? item.path : '#'}
                    className="flex items-center gap-3 px-4 py-3 text-sm border-b border-gray-100 dark:border-gray-700 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 last:border-b-0"
                    onClick={handleClick}
                  >
                    {typeof item.label === 'string' ? (
                      <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                    ) : (
                      <span className="flex items-center gap-3 text-gray-700 dark:text-gray-300">{item.label}</span>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Mobile MagicBackButton - Fixed positioned on the left */}
      <div className="md:hidden fixed left-4 top-4 z-[1001]">
        <MagicBackButton variant="ghost" className="w-8 h-8 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700" />
      </div>
    </div>
  );
};
