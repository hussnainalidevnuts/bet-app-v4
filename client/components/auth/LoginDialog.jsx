"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Eye, EyeOff, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import Link from "next/link"
import { useRouter } from "next/navigation"
// Zod validation schema
const loginSchema = z.object({
    email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required").min(6, "Password must be at least 6 characters"),
})

const LoginDialog = ({ children, ...props }) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()

    const form = useForm({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    const onSubmit = (data) => {
        console.log("Login data:", data)
        // Handle login logic here
        setIsOpen(false)
    }

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword)
    }

    return (<Dialog open={isOpen} onOpenChange={setIsOpen} {...props}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-md w-full max-w-[90%] p-0 gap-0 rounded-lg overflow-hidden border-0 shadow-lg" showCloseButton={false}>
            {/* Header */}
            <DialogHeader className="bg-white border-b p-5 relative">
                <div className="absolute right-4 top-4">
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setIsOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex flex-col items-center justify-center mb-8">
                    <div className="text-3xl font-bold text-black">BETTING</div>
                    <div className="flex gap-1  mt-[1px]">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="w-3 h-3 rounded-full bg-base" />
                        ))}
                    </div>
                </div>
                <DialogTitle className="text-center text-xl font-semibold text-black">LOG IN</DialogTitle>
            </DialogHeader>

            {/* Form Content */}
            <div className="p-8 py-8 bg-white">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Email Field */}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="">
                                    <FormLabel className="text-sm font-medium text-gray-700">Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="your@email.com"
                                            className=""
                                            {...field}
                                        />

                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />

                        {/* Password Field */}
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem className="">
                                    <FormLabel className="text-sm font-medium text-gray-700">Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"

                                                {...field}
                                            />
                                            <button
                                                type="button"
                                                onClick={togglePasswordVisibility}
                                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                                                <span className="text-xs">Show</span>
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />

                        {/* Forgot Password Link */}
                        <div className="flex justify-end">

                            <Link href={"#"} className="text-xs text-base hover:text-base-dark underline">
                                Forgotten password
                            </Link>
                        </div>


                        {/* Login Button */}
                        <Button
                            type="submit"
                            className="w-full h-10 bg-warning text-black font-medium hover:bg-warning-dark"
                        >
                            LOG IN
                        </Button>
                    </form>
                </Form>

                {/* Register Section */}
                <div className="mt-5 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Don't have an account?</span>                            <Button
                            variant="default"
                            size="sm"
                            className="bg-base text-white hover:bg-base-dark transition-colors px-4 py-1 h-8"
                            onClick={() => {
                                setIsOpen(false)
                                router.push('/signup')
                            }}
                        >
                            Register now
                        </Button>
                    </div>
                </div>
            </div>
        </DialogContent>
    </Dialog>
    )
}

export default LoginDialog
