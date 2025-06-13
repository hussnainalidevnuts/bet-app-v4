"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useRouter } from "next/navigation"
import LoginDialog from "./LoginDialog"

// Zod validation schema
const signupSchema = z.object({
    firstName: z.string().min(1, "First name is required").min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(1, "Last name is required").min(2, "Last name must be at least 2 characters"),
    email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
    phoneNumber: z.string()
        .min(1, "Phone number is required")
        .regex(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"),
    password: z.string()
        .min(1, "Password is required")
        .min(8, "Password must be at least 8 characters")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            "Password must contain at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character"),
    dateOfBirth: z.object({
        day: z.string().min(1, "Day is required"),
        month: z.string().min(1, "Month is required"),
        year: z.string().min(1, "Year is required"),
    }).refine((data) => {
        const day = parseInt(data.day);
        const month = parseInt(data.month);
        const year = parseInt(data.year);

        // Check if date is valid
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            return false;
        }

        // Check if user is at least 18 years old
        const today = new Date();
        const age = today.getFullYear() - year;
        const monthDiff = today.getMonth() - (month - 1);
        const dayDiff = today.getDate() - day;

        if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && dayDiff < 0)) {
            return false;
        }

        return true;
    }, "You must be at least 18 years old"),
    gender: z.string().min(1, "Gender is required"),
})

const SignupPage = () => {
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    const form = useForm({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phoneNumber: "",
            password: "",
            dateOfBirth: {
                day: "",
                month: "",
                year: "",
            },
            gender: "",
        },
    })

    const onSubmit = (data) => {
        console.log("Signup data:", data)
        // Handle signup logic here
        // After successful signup, redirect to login or dashboard
        router.push('/')
    }

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword)
    }

    // Generate arrays for dropdowns
    const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString())
    const months = [
        { value: "1", label: "January" },
        { value: "2", label: "February" },
        { value: "3", label: "March" },
        { value: "4", label: "April" },
        { value: "5", label: "May" },
        { value: "6", label: "June" },
        { value: "7", label: "July" },
        { value: "8", label: "August" },
        { value: "9", label: "September" },
        { value: "10", label: "October" },
        { value: "11", label: "November" },
        { value: "12", label: "December" },
    ]
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString())

    const genders = [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "other", label: "Other" },
        { value: "prefer-not-to-say", label: "Prefer not to say" },
    ]

    return (
        <div className="bg-gray-50 min-h-full flex items-center justify-center p-4 lg:p-6">
            <div className="w-full max-w-lg">
                <div className="bg-white px-4 py-6 shadow sm:rounded-lg sm:px-10">
                    {/* Header */}
                    <div className="mb-6">
                        <h2 className="text-center text-2xl font-bold text-gray-900">
                            Create your account
                        </h2>
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Join us and start betting today
                        </p>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* Name Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium text-gray-700">
                                                First name <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    placeholder="First name"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium text-gray-700">
                                                Last name <span className="text-red-500">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="text"
                                                    placeholder="Last name"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Email Field */}
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium text-gray-700">
                                            Email <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="your@email.com"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />

                            {/* Phone Number Field */}
                            <FormField
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium text-gray-700">
                                            Phone Number <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="tel"
                                                placeholder="+1234567890"
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
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium text-gray-700">
                                            Password <span className="text-red-500">*</span>
                                        </FormLabel>
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
                                        <div className="text-xs text-gray-500 mt-1">
                                            Please enter minimum 8 characters, including at least 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character.
                                        </div>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />

                            {/* Date of Birth Fields */}
                            <FormLabel className="text-sm font-medium text-gray-700 mb-3 block">
                                Date of birth <span className="text-red-500">*</span>
                            </FormLabel>
                            <div className="grid grid-cols-3 gap-3">
                                <FormField
                                    control={form.control}
                                    name="dateOfBirth.day"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Day" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {days.map((day) => (
                                                            <SelectItem key={day} value={day}>
                                                                {day}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="dateOfBirth.month"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Month" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {months.map((month) => (
                                                            <SelectItem key={month.value} value={month.value}>
                                                                {month.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="dateOfBirth.year"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Year" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {years.map((year) => (
                                                            <SelectItem key={year} value={year}>
                                                                {year}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            {(form.formState.errors.dateOfBirth?.root || form.formState.errors.dateOfBirth) && (
                                <div className="text-xs text-red-500 mt-1">
                                    {form.formState.errors.dateOfBirth?.root?.message ||
                                        form.formState.errors.dateOfBirth?.message ||
                                        "Please provide a valid date of birth"}
                                </div>
                            )}

                            {/* Gender Field */}
                            <FormField
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-sm font-medium text-gray-700">
                                            Gender <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a gender" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {genders.map((gender) => (
                                                        <SelectItem key={gender.value} value={gender.value}>
                                                            {gender.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                )}
                            />

                            {/* Signup Button */}
                            <Button
                                type="submit"
                                className="w-full h-10 bg-warning text-black font-medium hover:bg-warning-dark"
                            >
                                CREATE ACCOUNT
                            </Button>
                        </form>
                    </Form>

                    {/* Login Section */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Already have an account?</span>
                            <LoginDialog>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-base hover:text-base-dark"
                                >
                                    Sign In
                                </Button>
                            </LoginDialog>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SignupPage