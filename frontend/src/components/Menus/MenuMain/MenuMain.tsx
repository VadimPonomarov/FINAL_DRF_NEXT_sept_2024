"use client";
import { FC, useEffect, useMemo, useState } from 'react';
// import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Activity, Menu as BurgerIcon, X as CloseIcon } from 'lucide-react';
import { useAuthProvider } from '@/contexts/AuthProviderContext';
import { AuthProvider } from '@/common/constants/constants';
import { IMenuItem } from '@/components/All/MenuComponent/menu.interfaces';
import MenuComponent from '@/components/All/MenuComponent/MenuComponent';
import { ThemeControls } from '@/components/ui/theme-controls';
import { FaBook, FaSignOutAlt, FaServer, FaDatabase, FaNetworkWired, FaCar } from 'react-icons/fa';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MagicBackButton } from '@/components/ui/magicBackButton';
import AuthBadge from '@/components/All/AuthBadge/AuthBadge';

export const MenuMain: FC = () => {
  const { provider } = useAuthProvider();
  // const router = useRouter();
  // const pathname = usePathname();
  const { data: session, status } = useSession();
  const [currentProvider, setCurrentProvider] = useState<AuthProvider>(provider);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        path: "/api/auth",
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
        path: "/redis-insight",
        label: (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group flex items-center gap-2">
                  <FaDatabase
                    size={18}
                    className="text-foreground group-hover:text-accent-foreground transition-colors"
                  />
                  <span className="text-sm">Redis</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Redis Insight</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        disabled: !isAuthenticated,
        index: 5,
        provider: AuthProvider.MyBackendDocs,
        tooltip: "Redis Insight"
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
        index: 6,
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
        index: 7,
        provider: AuthProvider.MyBackendDocs,
        tooltip: "AutoRia - система объявлений"
      }
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

    // Add logout button for authenticated users
    if (isAuthenticated) {
      allItems = [
        ...allItems,
        {
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
          cb: function() {
            console.log('Logout callback called');
            console.log('signOut type:', typeof signOut);
            console.log('signOut function:', signOut);
            try {
              if (typeof signOut === 'function') {
                console.log('Calling signOut...');
                signOut({ callbackUrl: "/api/auth/signin" });
              } else {
                console.error('signOut function is not available');
                // Fallback to manual logout
                window.location.href = '/api/auth/signout';
              }
            } catch (error) {
              console.error('Error during signOut:', error);
              // Fallback to manual logout
              window.location.href = '/api/auth/signout';
            }
          },
          index: 100,
          tooltip: "Sign out"
        }
      ];
    }

    console.log("Final menu items for provider", currentProvider, ":",
      allItems.map(item => typeof item.label === 'string' ? item.label : 'icon'));

    return allItems.sort((a, b) => a.index - b.index);
  }, [currentProvider, session]);

  return (
    <div className="relative mb-4">
      {/* Desktop menu */}
      <div className="hidden md:block">
        <MenuComponent items={menuItems} />
      </div>
      {/* Mobile burger + MagicBackButton */}
      <div className="md:hidden absolute left-4 top-1/2 -translate-y-1/2 translate-y-1 z-[1002] flex items-center gap-2">
        <MagicBackButton variant="ghost" className="w-5 h-5" />
        <button
          className="p-2 rounded focus:outline-none focus:ring-2 focus:ring-accent"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
        >
          {mobileMenuOpen ? <CloseIcon size={28} /> : <BurgerIcon size={28} />}
        </button>
      </div>
      {/* Выпадающее меню */}
      {mobileMenuOpen && (
        <>
          <div className="absolute left-0 top-12 z-50 w-screen bg-white dark:bg-zinc-900 shadow-lg border-b border-zinc-200 dark:border-zinc-800 animate-fade-in flex flex-col">
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
                  window.location.href = item.path;
                }
              };

              return (
                <a
                  key={item.path || `item-${item.index}`}
                  href={item.path || '#'}
                  className="px-6 py-4 text-lg border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  onClick={handleClick}
                >
                  {typeof item.label === 'string' ? item.label : <span className="flex items-center gap-2">{item.label}</span>}
                </a>
              );
            })}
          </div>
        </>
      )}

      {/* Theme Controls - позиционируем левее, чтобы не накладывались на другие элементы */}
      <div className="absolute right-[120px] top-1/2 -translate-y-1/2 z-[99999] flex items-center gap-2">
        <ThemeControls />
      </div>
    </div>
  );
};
