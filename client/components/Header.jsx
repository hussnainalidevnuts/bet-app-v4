'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import LoginDialog from '@/components/auth/LoginDialog';
import { useCustomSidebar } from '@/contexts/SidebarContext.js';

const Header = () => {
    const { toggleMobileSidebar } = useCustomSidebar();

    return (
        <header className="bg-base text-white">
            {/* Top navigation bar */}
            <div className="bg-base-dark px-4 py-2 hidden md:block">
                <div className="flex justify-end items-center space-x-4 text-sm">
                    <Link href="#" className="hover:underline">Community</Link>
                    <span className="hidden lg:inline">|</span>
                    <Link href="#" className="hover:underline hidden lg:inline">Help</Link>
                    <span className="hidden lg:inline">|</span>
                    <Link href="#" className="hover:underline">Responsible Gaming</Link>
                    <span className="hidden xl:inline">|</span>
                    <Link href="#" className="hover:underline hidden xl:inline">About Us</Link>
                    <span className="hidden xl:inline">|</span>
                    <Link href="#" className="hover:underline hidden xl:inline">Blog</Link>
                    <span className="hidden xl:inline">|</span>
                    <Link href="#" className="hover:underline">Apps</Link>
                </div>
            </div>

            {/* Main header */}
            <div className="px-4 py-3">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 md:space-x-4 lg:space-x-8">


                        <button
                            className="md:hidden p-2 hover:bg-green-500 rounded"
                            onClick={toggleMobileSidebar}
                        >
                            <span className="text-lg">☰</span>
                        </button>
                        <div className="text-xl lg:text-2xl font-bold">
                            BETTING
                            <div className="text-xs text-green-200">KINDRED</div>
                        </div>

                        {/* Mobile menu button */}

                    </div>                    <div className="flex items-center space-x-2 lg:space-x-3">
                        <LoginDialog>
                            <Button variant="outline" className="text-black border-white  hover:bg-gray-100 transition-all text-xs lg:text-sm px-2 lg:px-4 py-1 lg:py-2">
                                Log in
                            </Button>
                        </LoginDialog>
                        <Link href={"/signup"} className="active:scale-[0.98]
                        transition-all  bg-warning text-black hover:bg-warning-dark text-xs lg:text-sm px-2 lg:px-4 py-1 lg:py-2 font-semibold ">

                            Register

                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
