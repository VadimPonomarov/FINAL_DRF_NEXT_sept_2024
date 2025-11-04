"use client";

import React, {ReactNode} from 'react';
import AutoRiaHeader from './AutoRiaHeader';
import FixedLanguageSwitch from './FixedLanguageSwitch';
import { RedisAuthProvider } from '@/contexts/RedisAuthContext';
import { AlertDialogProvider } from '@/components/ui/alert-dialog-helper';
import { useCurrentPage } from '@/modules/autoria/layout/useCurrentPage';

interface AutoRiaLayoutProps {
    children: ReactNode;
}

const AutoRiaLayout: React.FC<AutoRiaLayoutProps> = ({children}) => {
    const currentPage = useCurrentPage();

    return (
        <RedisAuthProvider>
            <AlertDialogProvider>
                <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 flex flex-col overflow-hidden">
                    <div className="flex-1 w-full overflow-auto">
                        <div className="max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 flex flex-col space-y-6">
                            <div className="flex-shrink-0 w-full">
                                <AutoRiaHeader currentPage={currentPage}/>
                            </div>
                            <main className="flex-1 w-full min-h-0">
                                <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 overflow-hidden">
                                    <div className="max-w-full overflow-x-auto">
                                        {children}
                                    </div>
                                </div>
                            </main>
                        </div>
                    </div>
                    <FixedLanguageSwitch />
                </div>
            </AlertDialogProvider>
        </RedisAuthProvider>
    );
};

export default AutoRiaLayout;
