//@note helper function cn that combines and merges CSS class names => used in all TailwindCSS projects
//Cleaner Code: You can pass conditional class names without manually resolving conflicts.
//Handles Conflicts: Automatically resolves conflicting TailwindCSS classes.

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge" //merge conflicting TailwindCSS classes (e.g., p-2 and p-4 → resolves to p-4

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

type PaymentMethod = "USDC" | "LOOT" | "ETH"

export function calculatePrice({
    basePriceUsd,
    quantity,
    paymentMethod,
    ethPriceUsd,
}: {
    basePriceUsd: number
    quantity: number
    paymentMethod: PaymentMethod
    ethPriceUsd?: number
}) {
    let unitPrice = basePriceUsd

    // Convert to other currencies
    if (paymentMethod === "LOOT") {
        unitPrice /= 2 // 1 LOOT = 2 USD
    } else if (paymentMethod === "ETH" && ethPriceUsd) {
        unitPrice /= ethPriceUsd
    }

    const totalPrice = unitPrice * quantity

    // Base discount
    let discount = quantity >= 5 ? 0.1 : quantity >= 3 ? 0.05 : 0

    // Extra LOOT discount
    if (paymentMethod === "LOOT") {
        discount += 0.1
    }

    const discountedPrice = totalPrice * (1 - discount)

    return {
        unitPrice,
        totalPrice,
        discount,
        discountedPrice,
    }
}
